/* eslint-disable no-prototype-builtins */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/03/12
 **/
const _ = require('lodash')
const { ApiService } = require('../../default-app/services')

/**
 * this middleware is used to auto generate api input & putput example
 * for api document
 */
const before = async (context) => {
    // put to after
}

const after = async (context) => {
    const { req, apiRoute } = context
    const { api } = apiRoute

    // in dev mode always use last result
    if (!context.error && context.result) {
        if (api.input_example === undefined || (!api.modified && context.isDevMode)) {
            let input = api.method === 'GET' || api.method === 'DELETE' ? req.query : req.body
            input = JSON.parse(JSON.stringify(input))
            const simpleInput = simplifyArray(input)
            api.input_example = isEmpty(simpleInput) ? '' : JSON.stringify(simpleInput, null, 4)
            // update api
            await ApiService.updateApi(api.id, { input_example: api.input_example })
        }

        if (
            api.output_example === undefined ||
            (!api.modified && context.isDevMode) ||
            !(api.out_fields && api.out_fields.length > 0)
        ) {
            // remove un-needed runtime properties
            const result = JSON.parse(JSON.stringify(context.result))

            const updateFields = {}
            // array only leave one element
            if (api.output_example === undefined) {
                const simpleOutput = simplifyArray(result)
                api.output_example = isEmpty(simpleOutput) ? '' : JSON.stringify(simpleOutput, null, 4)
                updateFields.output_example = api.output_example
            }

            if (!(api.out_fields && api.out_fields.length > 0)) {
                if (!api.out_fields) {
                    api.out_fields = []
                }

                fillObjectFields(api.out_fields, '', result)
                updateFields.out_fields = api.out_fields
            }

            // update api
            await ApiService.updateApi(api.id, updateFields)
        }
    }

    // in_params updated
    if (context.apiModified) {
        await ApiService.updateApi(api.id, { in_params: api.in_params })
    }
}

function fillObjectFields(fields, key, obj) {
    const resultType = typeof obj
    if (resultType !== 'object') {
        if (!key) {
            fields.push({
                name: 'result',
                type: resultType === 'string' ? 'char' : resultType,
                description: tf('apiResult')
            })
        } else {
            fields.push({ name: key, type: resultType === 'string' ? 'char' : resultType, description: '' })
        }
    } else {
        if (obj instanceof Array) {
            if (obj.length > 0) {
                const arrayType = typeof obj[0]
                if (key) {
                    fields.push({
                        name: key,
                        type: 'array-of-' + (arrayType === 'string' ? 'char' : arrayType),
                        description: ''
                    })
                }

                if (arrayType !== 'object') {
                    return
                }

                obj = obj[0]
            }
        } else if (key) {
            fields.push({ name: key, type: 'object', description: '' })
        }

        if (key) key += '.'

        const keys = _.keys(obj)
        for (const k of keys) {
            fillObjectFields(fields, key + k, obj[k])
        }
    }
}

function isEmpty(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) return false
    }

    return true
}

const simplifyArray = (obj, level = 0) => {
    if (obj instanceof Array && obj.length > 0) {
        const result = simplifyArray(obj[0])
        return [result]
    } else if (typeof obj === 'object') {
        const result = {}

        for (const key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue
            }

            if (level === 0 && (key === 'token' || key === 'extra')) {
                continue
            }

            const prop = obj[key]
            if (typeof prop === 'object') {
                result[key] = simplifyArray(prop, level++)
            } else {
                result[key] = prop
            }
        }

        return result
    } else {
        return obj
    }
}

module.exports = {
    before: before,
    after: after
}
