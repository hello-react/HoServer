/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2021/02/02
 **/
const _ = require('lodash')

/**
 * by default we use mongoose query syntax,
 * we need convert to sequelize style for mysql
 */
class QueryConverter {
    convertOutputFields(selectFields) {
        if (!selectFields || selectFields.length === 0) {
            return undefined
        }

        const newSelFields = []
        let fields
        let isObject = false
        if (selectFields instanceof Array) {
            fields = selectFields
        } else if (typeof selectFields === 'object') {
            fields = _.keys(selectFields)
            isObject = true
        } else if (typeof selectFields === 'string') {
            fields = selectFields.split(/[\s,]/)
        }

        for (const k of fields) {
            const pos = k.indexOf('.')
            let key = k
            if (pos > 0) {
                key = k.substr(0, pos)
                if (newSelFields.indexOf(key) > -1) {
                    continue
                }
            }

            if (!k.endsWith('_rel') && !k.startsWith('-') && (!isObject || selectFields[k])) {
                newSelFields.push(key)
            }
        }

        if (newSelFields.length == 0) {
            return undefined
        }

        return newSelFields
    }

    convertOrder(orderFields) {
        const newOrder = []
        if (typeof orderFields === 'string') {
            const fields = orderFields.split(/[\s,]/)
            for (const f of fields) {
                if (f.startsWith('-')) {
                    newOrder.push([f.substr(1), 'DESC'])
                } else {
                    newOrder.push([f])
                }
            }
        } else if (typeof orderFields === 'object') {
            const keys = _.keys(orderFields)
            for (const k of keys) {
                if (orderFields[k] == -1) {
                    newOrder.push([k, 'DESC'])
                } else {
                    newOrder.push([k])
                }
            }
        }

        return newOrder
    }
}

module.exports = new QueryConverter()
