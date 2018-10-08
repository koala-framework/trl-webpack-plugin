import { CallExpression } from "estree";
import * as webpack from "webpack";
// @ts-ignore
import * as ConstDependency from "webpack/lib/dependencies/ConstDependency";
// @ts-ignore
import * as NullFactory from "webpack/lib/NullFactory";
// @ts-ignore
import * as Parser from "webpack/lib/Parser";
// @ts-ignore
import * as ParserHelpers from "webpack/lib/ParserHelpers";
import { ITranslations } from "./loadTranslations";
import parseTrlCalls from "./parseTrlCalls";

class TrlPlugin {
    private readonly languages: string[];
    private readonly webCodeLanguage: string;
    private readonly translations: {
        [source: string]: ITranslations;
    };
    private readonly uniquePrefix: string;
    private readonly pluginName = "TrlPlugin";
    private readonly functionNames = ["__trl", "__trlc", "__trlp", "__trlcp", "__trlKwf", "__trlcKwf", "__trlpKwf", "__trlcpKwf"];
    private readonly oldFunctionNames = ["trl", "trlc", "trlp", "trlcp", "trlKwf", "trlcKwf", "trlpKwf", "trlcpKwf"];
    private scriptLoaderResources: any = [];

    constructor(options: webpack.ParserOptions) {
        this.languages = options.languages;
        this.webCodeLanguage = options.webCodeLanguage;
        this.translations = options.translations;
        this.uniquePrefix = options.uniquePrefix;
    }

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(
            this.pluginName,
            (compilation: webpack.compilation.Compilation, params: { normalModuleFactory: webpack.compilation.NormalModuleFactory }) => {
                compilation.dependencyFactories.set(ConstDependency, new NullFactory());
                compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
            },
        );

        compiler.hooks.compilation.tap(this.pluginName, this.compilation);
        compiler.hooks.emit.tapAsync(this.pluginName, this.emit);
    }

    private compilation = (
        compilation: webpack.compilation.Compilation,
        params: { normalModuleFactory: webpack.compilation.NormalModuleFactory },
    ) => {
        const parserHook = params.normalModuleFactory.hooks.parser;
        const parserFn = this.trlParser.bind(this, compilation);
        parserHook.for("javascript/auto").tap(this.pluginName, parserFn);
        parserHook.for("javascript/dynamic").tap(this.pluginName, parserFn);
        parserHook.for("javascript/esm").tap(this.pluginName, parserFn);

        this.scriptLoaderResources = [];
        compilation.hooks.buildModule.tap(this.pluginName, this.findRawResources);
    };

    private emit = (compilation: webpack.compilation.Compilation, callback: () => void) => {
        const asyncChunks: any[] = [];
        for (const chunkGroup of compilation.chunkGroups) {
            for (const chunk of chunkGroup.chunks) {
                Array.from(chunk.modulesIterable, (module: any) => {
                    module.blocks.forEach((block: any) => {
                        if (block.chunkGroup.chunks) {
                            block.chunkGroup.chunks.forEach((c: any) => {
                                asyncChunks.push(c);
                            });
                        }
                    });
                });
            }
        }

        if (compilation.chunkGroups) {
            for (const chunkGroup of compilation.chunkGroups) {
                for (const chunk of chunkGroup.chunks) {
                    if (asyncChunks.indexOf(chunk) === -1) {
                        this.languages.forEach(lang => {
                            const trlDataPrefix = this.uniquePrefix ? `${this.uniquePrefix}-` : "";

                            let html = "";
                            ["web", "kwf"].forEach(source => {
                                const data = this.extractTrlDataFromChunk(chunk, lang, source);
                                if (Object.keys(data).length) {
                                    html += `window["${trlDataPrefix}kwfTrlData"].push({source: ${JSON.stringify(source)}, data: ${JSON.stringify(
                                        data,
                                    )}});\n`;
                                }
                            });

                            if (html) {
                                html = `window["${trlDataPrefix}kwfTrlData"] = window["${trlDataPrefix}kwfTrlData"] || [];\n${html}`;
                                const chunkFile = chunk.files[chunk.files.findIndex((file: string) => file.substr(-2) === "js")];
                                compilation.assets[`${lang}.${chunkFile}`] = {
                                    source: () => html,
                                    size: () => html.length,
                                };
                            }
                        });
                    }
                }
            }
        }

        callback();
    };

    private trlParser = (compilation: webpack.compilation.Compilation, parser: any, options: any) => {
        this.functionNames.concat(this.oldFunctionNames).forEach(name => {
            parser.hooks.call.for(name).tap(this.pluginName, (expr: CallExpression) => {
                const trlStrings = parseTrlCalls(expr, parser);
                if (trlStrings) {
                    if (!parser.state.module.__kwfTrlStrings) parser.state.module.__kwfTrlStrings = [];
                    parser.state.module.__kwfTrlStrings = parser.state.module.__kwfTrlStrings.concat(trlStrings);

                    if (this.functionNames.includes(name)) {
                        // @ts-ignore
                        const trlFunction = expr.callee.name.substr(2);

                        // replace function call
                        const dep = new ConstDependency(`__kwfTrl.${trlFunction}`, expr.callee.range);
                        dep.loc = expr.callee.loc;
                        parser.state.current.addDependency(dep);

                        const expression = "require('kwf/commonjs/trl')";
                        const nameIdentifier = "__kwfTrl";
                        ParserHelpers.addParsedVariableToModule(parser, nameIdentifier, expression);
                    }
                }
            });
        });

        // this.addRawSourceToModule(parser);
        this.reParseRawSource(compilation, parser);
    };

    private findRawResources = (module: any) => {
        if (module.rawRequest && module.rawRequest.match(/^script-loader!/)) {
            this.scriptLoaderResources.push(module.resource);
        }
        if (module.rawRequest && module.rawRequest.match(/^!![^!]*raw-loader[^!]*!/) && this.scriptLoaderResources.indexOf(module.resource) !== -1) {
            module.kwfParseRaw = true;
        }
    };

    private reParseRawSource = (compilation: webpack.compilation.Compilation, parser: any) => {
        compilation.hooks.succeedModule.tap(this.pluginName, (module: any) => {
            if (module.kwfParseRaw) {
                const kwfRawSource = Parser.parse(module.originalSource().source());
                parser.parse(kwfRawSource.body[0].expression.right.value, {
                    current: module,
                    module,
                    compilation,
                    options: {},
                });
            }
        });
    };

    private extractTrlDataFromChunk = (chunk: any, language: string, source: string) => {
        const data: {
            [key: string]: string;
        } = {};
        if (source === "kwf" && language === "en") {
            return data;
        }
        if (source === "web" && language === this.webCodeLanguage) {
            return data;
        }
        Array.from(chunk.modulesIterable, (module: any) => {
            if (module.__kwfTrlStrings) {
                module.__kwfTrlStrings.forEach((i: any) => {
                    if (i.source === source) {
                        const translated = this.lookupTranslation(source, language, i);
                        if (translated) {
                            let index = i.context ? `${i.context}__${i.text}` : i.text;
                            if (i.plural) index += `--${i.plural}`;
                            data[index] = translated;
                        }
                    }
                });
            }

            module.blocks.forEach((block: any) => {
                if (block.chunkGroup.chunks) {
                    block.chunkGroup.chunks.forEach((c: any) => {
                        const blockData = this.extractTrlDataFromChunk(c, language, source);
                        Object.assign(data, blockData);
                    });
                }
            });
        });
        return data;
    };

    private lookupTranslation = (source: string, lang: string, trl: any) => {
        const { context, plural, text } = trl;
        if (!this.translations[source] || !this.translations[source][lang] || !this.translations[source][lang][context]) return null;

        const translation = Object.values(this.translations[source][lang][context]).find(t => {
            if (plural) {
                if (t.msgid === text && t.msgid_plural === plural) {
                    return true;
                }
            } else {
                if (t.msgid === text) {
                    return true;
                }
            }

            return false;
        });
        if (!translation) return null;

        return Array.isArray(translation.msgstr) ? translation.msgstr.join("\n") : translation.msgstr;
    };
}

export default TrlPlugin;
