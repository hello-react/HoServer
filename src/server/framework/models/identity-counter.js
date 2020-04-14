/**
 * SWOOP Model Server Ver 1.0
 * create: 2018/11/2
 * author: Jack Zhang
 **/
const mongoose = require('mongoose')

/**
 * 对象定义
 */
let counterSchema
let IdentityCounter

try {
    IdentityCounter = mongoose.connection.model('IdentityCounter')
} catch (ex) {
    if (ex.name === 'MissingSchemaError') {
        // Create new counter schema.
        counterSchema = new mongoose.Schema({
            model: { type: String, require: true },
            field: { type: String, require: true },
            count: { type: Number, default: 0 }
        })

        // Create a unique index using the "field" and "modelMeta" fields.
        counterSchema.index({ field: 1, model: 1 }, { unique: true, required: true, index: -1 })

        // Create modelMeta using new schema.
        IdentityCounter = mongoose.connection.model('IdentityCounter', counterSchema)
    } else {
        throw ex
    }
}

module.exports = IdentityCounter
