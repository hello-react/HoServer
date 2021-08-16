const { v4: uuidV4 } = require('uuid')

const wrapper = {
    capitalizeFirstLetter(str) {
        if (!str) return ''
        return str.charAt(0).toUpperCase() + str.slice(1)
    },
    getTempFile() {
        return uuidV4() + '.tmp'
    }
}

module.exports = wrapper
