module.exports = {
    extends: ['standard', 'plugin:prettier/recommended'],
    plugins: ['sort-requires'],
    env: {
        browser: false,
        node: true,
        es6: true,
        mocha: true,
        jasmine: true
    },
    globals: {
        t: 'readonly',
        tf: 'readonly',
        __DEV__: 'readonly',
        APP_PATH: 'readonly',
        sequelize: 'readonly',
        logger: 'readonly',
        global: 'readonly',
        require: 'readonly',
        console: 'readonly',
        module: 'readonly',
        process: 'readonly'
    },
    rules: {
        camelcase: 0,
        eqeqeq: [0, 'smart'],
        indent: [0, 4],
        'linebreak-style': 0,
        'max-len': ['error', { code: 120 }],
        'no-plusplus': 0,
        'node/no-callback-literal': 0,
        'standard/no-callback-literal': 0,
        'prefer-promise-reject-errors': 0,
        'prettier/prettier': [
            'error',
            {
                printWidth: 120,
                semi: false,
                tabWidth: 4,
                singleQuote: true,
                trailingComma: 'none'
            }
        ],
        'sort-requires/sort-requires': 2,
        'valid-jsdoc': [
            0,
            {
                requireParamDescription: false,
                requireReturn: false,
                requireReturnDescription: false
            }
        ]
    },
    settings: {
        polyfills: ['fetch', 'promises', 'url']
    }
}
