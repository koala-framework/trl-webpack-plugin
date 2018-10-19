# trl-plugin

## Usage
Add Plugin in `webpack.config.js`

    const vendorPoFiles = [];
    glob.sync(path.resolve(__dirname, '../vendor/*/*/trl/en.po')).forEach(i => {
        vendorPoFiles.push(i.replace(/\/en\.po$/, '/[language].po'));
    });
    const languages = ['de'];
    
    plugins: [
        ...
        new TrlPlugin.default({
            uniquePrefix,
            languages,
            webCodeLanguage: 'de',
            translations: {
                web: TrlPlugin.loadTranslations(['../trl/[language].po'], languages),
                kwf: TrlPlugin.loadTranslations(vendorPoFiles, languages),
            }
        })
        ...
    ]

also add uniquePrefix to define plugin, this is used as prefix for trl functions

    new webpack.DefinePlugin({
        UNIQUE_PREFIX: JSON.stringify(uniquePrefix ? uniquePrefix + "-" : "")
    })
