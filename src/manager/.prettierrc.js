const fabric = require('@umijs/fabric')

module.exports = {
    ...fabric.prettier,
    printWidth: 150,
    semi: false,
    tabWidth: 4,
    singleQuote: true,
    trailingComma: "none"
}
