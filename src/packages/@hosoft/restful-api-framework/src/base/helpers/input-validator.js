/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/
const BaseHelper = require('./base-helper')
const Constants = require('../constants/constants')
const moment = require('moment')
const mongoose = require('mongoose')

/**
 * validate client input data according model meta data,
 * used in system default create / update api
 */
const wrapper = {
    validateInputFields: async (model, inputObj, checkRequire, compareRecord) => {
        const result = { hasError: false }

        if (!(await wrapper.validatePropInput(result, model, inputObj, '', checkRequire))) {
            return result
        }

        // sub property has no nativeModel
        if (model.nativeModel) {
            const existRecord = await wrapper.checkUniqueField(model, '', inputObj)
            if (existRecord !== false) {
                if (compareRecord) {
                    result.exist = wrapper.getDuplicateField(model, inputObj, existRecord, compareRecord, 0)
                } else {
                    result.exist_record = existRecord
                }
            }
        }

        return result
    },

    /**
     * check unique field, array field will ignored
     * TODO: check sub model unique field
     */
    checkUniqueField: async (model, parentName, inputObj) => {
        const uniqueQueries = []

        const checkUniqueProperty = (parentPath, prop, subInputObj, nestLevel = 0) => {
            // Api, Api.in_params
            // const modelNames = modelFullName.split('.').splice(0, 1)

            for (const subProp of prop.properties) {
                if (parentPath) {
                    parentPath = parentPath + '.'
                }

                const queryKey = parentPath + subProp.name

                if (subProp.properties && subProp.properties.length > 0) {
                    if (nestLevel < 2 && subProp.prop_type.indexOf('array') < 0 && !(subInputObj instanceof Array)) {
                        // modelNames.splice(0, 1)
                        const subPropInputObj = subInputObj[subProp.name]
                        nestLevel++
                        if (subPropInputObj) {
                            checkUniqueProperty(queryKey, subProp, subPropInputObj, nestLevel)
                        }
                    }
                } else if (subProp.unique) {
                    const query = {}
                    const inputVal = subInputObj[subProp.name]
                    if (inputVal) {
                        query[queryKey] = inputVal
                        uniqueQueries.push(query)
                    }
                }
            }
        }

        checkUniqueProperty(parentName, model, inputObj, 0)

        if (uniqueQueries.length === 0) {
            return false
        }

        const existRecord = await model.findOne({ $or: uniqueQueries })
        if (!existRecord) {
            return false
        }

        return existRecord
    },

    /**
     * get duplicate records
     * @param property model property
     * @param inputObj client input json object
     * @param existRecord exist record according input unique field value
     * @param compareRecord for update operation, will skipped currentRecord when check duplicate records
     * @returns {*}
     */
    getDuplicateField: (property, inputObj, existRecord, compareRecord, nestLevel = 0) => {
        if (!existRecord) {
            return null
        }

        let result = null
        for (const prop of property.properties) {
            if (prop.properties && prop.properties.length > 0) {
                if (nestLevel < 2 && prop.prop_type.indexOf('array') < 0 && !(prop instanceof Array)) {
                    nestLevel++
                    result = wrapper.getDuplicateField(
                        prop,
                        inputObj[prop.name],
                        existRecord[prop.name],
                        compareRecord ? compareRecord[prop.name] : null,
                        nestLevel
                    )
                }
            } else if (prop.unique) {
                const inputVal = inputObj[prop.name]
                if (inputVal === existRecord[prop.name]) {
                    // property duplicate
                    if (!compareRecord || (compareRecord && inputVal !== compareRecord[prop.name])) {
                        result = { prop: prop.name, name: prop.dis_name, val: inputVal }
                        break
                    }
                }
            }

            if (result) {
                break
            }
        }

        return result
    },

    /**
     * validate input data type, length, dictionary key etc.
     * @param parentName used for record property path to display in error message
     */
    validatePropInput: async (result, property, inputObj, parentName, checkRequire) => {
        if (!property.properties) return

        for (const prop of property.properties) {
            if (parentName) {
                parentName = parentName + '.'
            }

            // array-of-object, object
            if (prop.properties && prop.properties.length > 0) {
                const subInputObj = inputObj[prop.name]
                if (subInputObj) {
                    if (subInputObj instanceof Array) {
                        // loop array
                        for (const subObj of subInputObj) {
                            await wrapper.validatePropInput(result, prop, subObj, parentName + prop.name, checkRequire)
                        }
                    } else {
                        await wrapper.validatePropInput(result, prop, subInputObj, parentName + prop.name, checkRequire)
                    }
                }

                continue
            }

            // validate type and length
            wrapper.validatePropType(result, prop, inputObj, checkRequire)

            // validate dictionary key
            await wrapper.validateDictKey(result, prop, inputObj)
        }

        return !result.hasError
    },

    validateDictKey: async (result, prop, inputObj) => {
        if (prop.relations && (prop.relations.rel_type == 2 || prop.relations.rel_type == 3)) {
            const val = inputObj[prop.name]
            if (val) {
                if (prop.relations.rel_type == 2) {
                    const enumObj = BaseHelper.getPropertyEnum(prop)
                    if (enumObj && !enumObj[val]) {
                        logger.info('validateDictKey failed: ', enumObj)
                        wrapper._makeError(result, 'dict', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                } else if (prop.relations.rel_type == 3) {
                    const enumObj = await BaseHelper.getSystemDict(prop.relations.name)
                    if (enumObj && !enumObj[val]) {
                        logger.info('validateDictKey failed, dict name:', prop.relations.name)
                        wrapper._makeError(result, 'dict', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                }
            }
        }

        return true
    },

    validatePropType: (result, prop, inputObj, checkRequire) => {
        const val = inputObj[prop.name]
        if (val === undefined || val === null) {
            const isIdField =
                prop.auto_increment ||
                ((prop.name === 'id' || prop.unique) && prop.prop_type === Constants.API_FIELD_TYPE.objectId)
            if (checkRequire && prop.input_flag === 2 && !isIdField) {
                wrapper._makeError(result, 'require', { prop: prop.name, name: prop.dis_name })
                return false
            }

            return true
        }

        let dt
        let isArray = -1 // -1: not sure, 0: no, 1: yes
        switch (prop.prop_type) {
            case Constants.API_FIELD_TYPE.boolean:
                isArray = 0
                if (val === true || val === false) {
                    return true
                }

                if (val === 'true' || val == 1) {
                    inputObj[prop.name] = true
                    return true
                } else if (val === 'false' || !val) {
                    inputObj[prop.name] = false
                    return true
                } else {
                    wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }
            case Constants.API_FIELD_TYPE.char:
                isArray = 0
                if (typeof val !== 'string' && typeof val !== 'number') {
                    wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                if (prop.width && val.length > prop.width) {
                    wrapper._makeError(result, 'width', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }
                break
            case Constants.API_FIELD_TYPE.date:
                isArray = 0
                dt = moment(val)
                if (!dt.isValid()) {
                    wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                inputObj[prop.name] = dt.toDate()
                break
            case Constants.API_FIELD_TYPE.number:
                isArray = 0
                if (isNaN(val / 1)) {
                    wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                if (prop.width && String(val).length > prop.width) {
                    wrapper._makeError(result, 'width', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                break
            case Constants.API_FIELD_TYPE.objectId:
                isArray = 0
                if (typeof val === 'string') {
                    if (val.trim().length !== 24 || !mongoose.Types.ObjectId.isValid(val)) {
                        wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                } else if (val instanceof mongoose.Types.ObjectId) {
                    if (!mongoose.Types.ObjectId.isValid(val)) {
                        wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                } else {
                    wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                break
            case Constants.API_FIELD_TYPE['array-of-boolean']:
                isArray = 1
                if (!(val instanceof Array)) {
                    wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                for (let i = 0; i < val.length; i++) {
                    const v = val[i]
                    if (v === 'true' || v == 1) {
                        val[i] = true
                    } else if (v === 'false' || !v) {
                        val[i] = false
                    } else {
                        wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                }
                break
            case Constants.API_FIELD_TYPE['array-of-char']:
                isArray = 1
                if (!(val instanceof Array)) {
                    wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }
                for (const v of val) {
                    if (typeof v !== 'string' && typeof v !== 'number') {
                        wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }

                    if (prop.width > 0 && v.length > prop.width) {
                        wrapper._makeError(result, 'width', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                }
                break
            case Constants.API_FIELD_TYPE['array-of-number']:
                isArray = 1
                if (!(val instanceof Array)) {
                    wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                for (const v of val) {
                    if (isNaN(v / 1)) {
                        wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                }
                break
            case Constants.API_FIELD_TYPE['array-of-objectId']:
                isArray = 1
                if (!(val instanceof Array)) {
                    wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                for (let i = 0; i < val.length; i++) {
                    const v = val[i]
                    if (
                        (v instanceof mongoose.Types.ObjectId && !mongoose.Types.ObjectId(v)) ||
                        !mongoose.Types.ObjectId.isValid(String(v))
                    ) {
                        wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                }
                break
            default:
                break
        }

        if (isArray === 0 && inputObj[prop.name] && inputObj[prop.name] instanceof Array) {
            wrapper._makeError(result, 'type', { prop: prop.name, name: prop.dis_name, val: val })
            return false
        }

        return true
    },

    getInvalidFieldmessage: (invalidFields) => {
        const errmessages = []

        for (const tp in invalidFields) {
            const fields = invalidFields[tp]
            if (!(fields && fields instanceof Array)) {
                continue
            }

            for (const field of fields) {
                switch (tp) {
                    case 'type':
                        errmessages.push(tf('errInputType', { name: field.name, prop: field.prop }))
                        break
                    case 'width':
                        errmessages.push(tf('errInputWidth', { name: field.name, prop: field.prop }))
                        break
                    case 'dict':
                        errmessages.push(tf('errInputDict', { name: field.name, prop: field.prop, val: field.val }))
                        break
                    case 'require':
                        errmessages.push(tf('errInputRequire', { name: field.name, prop: field.prop }))
                        break
                    case 'exist':
                        errmessages.push(tf('errInputExist', { name: field.name, prop: field.prop }))
                        break
                }
            }
        }

        return errmessages
    },

    _makeError: (invalidFields, type, error) => {
        if (!invalidFields[type]) {
            invalidFields[type] = []
        }

        invalidFields[type].push(error)
        invalidFields.hasError = true
    }
}

module.exports = wrapper
