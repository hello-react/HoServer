module.exports = {
    extends: [
        "standard",
        "plugin:prettier/recommended",
        "prettier/standard"
    ],
    plugins: ["sort-requires"],
    env: {
        browser: false,
        node: true,
        es6: true,
        mocha: true,
        jasmine: true,
    },
    globals: {
        "APP_PATH": "readonly",
        "logger": "readonly",
        "__DEV__": "readonly",
        "global": "readonly",
        "require": "readonly",
        "console": "readonly",
        "module": "readonly",
        "process": "readonly"
    },
    rules: {
        "camelcase": 0,
        "eqeqeq": [0, "smart"],
        "indent": [0, 4],
        'linebreak-style': 0,
        'max-len': ["error", { "code": 150 }],
        "no-plusplus": 0,
        "prefer-promise-reject-errors": 0,
        "prettier/prettier": ["error", {
            "printWidth": 150,
            "semi": false,
            "tabWidth": 4,
            "singleQuote": true
        }],
        "sort-requires/sort-requires": 2,
        "valid-jsdoc": [0, {
            "requireParamDescription": false,
            "requireReturn": false,
            "requireReturnDescription": false,
        }]
    },
    settings: {
        polyfills: ['fetch', 'promises', 'url'],
    },
};
