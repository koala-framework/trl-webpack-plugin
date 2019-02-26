import * as fs from "fs";
// @ts-ignore
import * as gettextParser from "gettext-parser";

export interface ITranslation {
    msgid: string;
    msgid_plural?: string;
    msgstr: string | string[];
    msgctxt?: string;
}

export interface ITranslations {
    [languageCode: string]: {
        [context: string]: {
            [msgid: string]: ITranslation;
        };
    };
}

export default (filenames: string[], languages: string[]): ITranslations => {
    const translations: ITranslations = {};

    filenames.forEach(f => {
        languages.forEach(language => {
            const filename = f.replace("[language]", language);
            if (fs.existsSync(filename)) {
                const po = gettextParser.po.parse(fs.readFileSync(filename, "utf-8"));

                if (!translations[language]) translations[language] = {};
                Object.keys(po.translations).forEach(context => {
                    if (!translations[language][context]) translations[language][context] = {};
                    Object.keys(po.translations[context]).forEach(msgid => {
                        if (!translations[language][context][msgid]) {
                            translations[language][context][msgid] = po.translations[context][msgid];
                        }
                    });
                });
            }
        });
    });

    return translations;
};
