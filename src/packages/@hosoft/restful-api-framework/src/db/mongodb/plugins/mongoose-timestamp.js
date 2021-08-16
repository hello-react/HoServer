/* eslint-disable no-prototype-builtins */
/* !
 * Mongoose Timestamps Plugin
 * Copyright(c) 2012 Nicholas Penree <nick@penree.com>
 * Original work Copyright(c) 2012 Brian Noguchi
 * MIT Licensed
 */

const defaults = require('defaults')

/**
 * mongoose timestamp plugin
 */
function timestampsPlugin(schema, options) {
    let updatedAt = 'updated_at'
    let createdAt = 'created_at'
    let updatedAtOpts = Date
    let createdAtOpts = Date
    const dataObj = {}

    if (typeof options === 'object') {
        if (typeof options.updatedAt === 'string') {
            updatedAt = options.updatedAt
        } else if (typeof options.updatedAt === 'object') {
            updatedAtOpts = defaults(options.updatedAt, {
                name: updatedAt,
                type: Date
            })
            updatedAt = updatedAtOpts.name
        }

        if (typeof options.createdAt === 'string') {
            createdAt = options.createdAt
        } else if (typeof options.createdAt === 'object') {
            createdAtOpts = defaults(options.createdAt, {
                name: createdAt,
                type: Date
            })
            createdAt = createdAtOpts.name
        }
    }

    if (!schema.path(updatedAt) && updatedAt) {
        dataObj[updatedAt] = updatedAtOpts
    }

    if (schema.path(createdAt)) {
        if (!schema.path(updatedAt) && updatedAt) {
            schema.add(dataObj)
        }
        if (schema.virtual(createdAt).get) {
            schema.virtual(createdAt).get(function () {
                if (this['_' + createdAt]) return this['_' + createdAt]
                return (this['_' + createdAt] = this._id.getTimestamp())
            })
        }
        schema.pre('save', function (next) {
            if (this.isNew) {
                const newDate = new Date()
                if (createdAt) this[createdAt] = newDate
                if (updatedAt) this[updatedAt] = newDate
            } else if (this.isModified() && updatedAt) {
                this[updatedAt] = new Date()
            }
            next()
        })
    } else {
        if (createdAt) {
            dataObj[createdAt] = createdAtOpts
        }
        if (dataObj[createdAt] || dataObj[updatedAt]) {
            schema.add(dataObj)
        }
        schema.pre('save', function (next) {
            if (!this[createdAt]) {
                const newDate = new Date()
                if (createdAt) this[createdAt] = newDate
                if (updatedAt) this[updatedAt] = newDate
            } else if (this.isModified() && updatedAt) {
                this[updatedAt] = new Date()
            }
            next()
        })
    }

    schema.pre('findOneAndUpdate', function (next) {
        if (this.op === 'findOneAndUpdate') {
            const newDate = new Date()
            this._update = this._update || {}
            if (createdAt) {
                if (this._update[createdAt]) {
                    delete this._update[createdAt]
                }

                this._update.$setOnInsert = this._update.$setOnInsert || {}
                this._update.$setOnInsert[createdAt] = newDate
            }
            if (updatedAt) {
                this._update[updatedAt] = newDate
            }
        }
        next()
    })

    schema.pre('update', function (next) {
        if (this.op === 'update') {
            const newDate = new Date()
            this._update = this._update || {}
            if (createdAt) {
                if (this._update[createdAt]) {
                    delete this._update[createdAt]
                }

                this._update.$setOnInsert = this._update.$setOnInsert || {}
                this._update.$setOnInsert[createdAt] = newDate
            }
            if (updatedAt) {
                this._update[updatedAt] = newDate
            }
        }
        next()
    })

    if (!schema.methods.hasOwnProperty('touch') && updatedAt) {
        schema.methods.touch = function (callback) {
            this[updatedAt] = new Date()
            this.save(callback)
        }
    }
}

module.exports = timestampsPlugin
