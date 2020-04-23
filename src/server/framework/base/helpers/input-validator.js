/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: Jack Zhang
 **/
const BaseHelper = require('./base-helper')
const Constants = require('../constants/constants')
const moment = require('moment')
const mongoose = require('mongoose')

/**
 * 对象属性输入合法性验证工具类，仅针对 create、update 等写接口
 */
const wrapper = {
    validateInputFields: async (context, model, api, inputObj, existRecord) => {
        const invalidFields = { result: true } // key: 原因 (1: 类型错误, 2: 长度错误, 3: 字典 key 错误),

        const checkRequire = !(api.action === 'update' || api.action === 'batch_update')
        if (!(await wrapper.validatePropInput(context, invalidFields, model, inputObj, '', checkRequire))) {
            return invalidFields
        }

        if (model.instance) {
            const dupRecord = await wrapper.checkUniqueField(api.model, model, '', inputObj)
            if (dupRecord !== false) {
                return wrapper.getDuplicateField(model, inputObj, dupRecord, existRecord, 0)
            }
        }

        return true
    },

    /**
     * 字段唯一性检查，唯一字段检查不超过 2 层，并且忽略数组字段
     */
    checkUniqueField: async (modelFullName, model, parentName, inputObj) => {
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

        const existRecord = await model.instance.findOne({ $or: uniqueQueries })
        if (!existRecord) {
            return false
        }

        return existRecord
    },

    /**
     * 获取重复的字段
     * @param property 对象属性模型
     * @param inputObj 输入对象（客户端以 json 对象形式提交）
     * @param dupRecord 根据 unique 字段输入值查询结果得到的已存在的记录
     * @param currentRecord 对于 update，如果指定值和 currentRecord 对应属性值相同，则不是重复记录, currentRecord 用于
     *   标识当前 update 的 modelMeta
     * @returns {*}
     */
    getDuplicateField: (property, inputObj, dupRecord, currentRecord, nestLevel = 0) => {
        let result = true
        for (const prop of property.properties) {
            if (prop.properties && prop.properties.length > 0) {
                if (nestLevel < 2 && prop.prop_type.indexOf('array') < 0 && !(prop instanceof Array)) {
                    dupRecord = dupRecord[prop.name]
                    if (currentRecord) {
                        currentRecord = currentRecord[prop.name]
                    }
                    nestLevel++
                    result = wrapper.getDuplicateField(prop, inputObj[prop.name], dupRecord, currentRecord, nestLevel)
                }
            } else if (prop.unique) {
                const inputVal = inputObj[prop.name]
                if (inputVal === dupRecord[prop.name]) {
                    // 该属性重复
                    // !== 判断针对上面说的 update 的条件
                    if (!currentRecord || (currentRecord && inputVal !== currentRecord[prop.name])) {
                        result = { exist: { prop: prop.name, name: prop.dis_name, val: inputVal } }
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
     * 验证输入类型、数据长度、字典key等
     * @param parentName 记录属性路径用户提示用户输入错误
     */
    validatePropInput: async (context, invalidFields, property, inputObj, parentName, checkRequire) => {
        for (const prop of property.properties) {
            if (parentName) {
                parentName = parentName + '.'
            }

            // array-of-object, object
            if (prop.properties && prop.properties.length > 0) {
                const subInputObj = inputObj[prop.name]
                if (subInputObj) {
                    if (subInputObj instanceof Array) {
                        // 遍历数组验证数组元素
                        for (const subObj of subInputObj) {
                            await wrapper.validatePropInput(context, invalidFields, prop, subObj, parentName + prop.name, checkRequire)
                        }
                    } else {
                        await wrapper.validatePropInput(context, invalidFields, prop, subInputObj, parentName + prop.name, checkRequire)
                    }
                }

                continue
            }

            // 检查属性类型及宽度
            wrapper.validatePropType(invalidFields, prop, inputObj, checkRequire)

            // 检查字典key
            await wrapper.validateDictKey(invalidFields, prop, inputObj)
        }

        return invalidFields.result !== false
    },

    // 检查字典key
    validateDictKey: async (invalidFields, prop, inputObj) => {
        if (prop.relations && (prop.relations.rel_type == 2 || prop.relations.rel_type == 3)) {
            const val = inputObj[prop.name]
            if (val) {
                if (prop.relations.rel_type == 2) {
                    const enumObj = BaseHelper.getPropertyEnum(prop)
                    if (enumObj && !enumObj[val]) {
                        logger.info('validateDictKey failed: ', enumObj)
                        wrapper._makeError(invalidFields, 'dict', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                } else if (prop.relations.rel_type == 3) {
                    const enumObj = await BaseHelper.getSystemDictItem(prop.relations.name)
                    if (enumObj && !enumObj[val]) {
                        logger.info('validateDictKey failed, dict name:', prop.relations.name)
                        wrapper._makeError(invalidFields, 'dict', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                }
            }
        }

        return true
    },

    validatePropType: (invalidFields, prop, inputObj, checkRequire) => {
        const val = inputObj[prop.name]
        if (val === undefined || val === null) {
            if (checkRequire && prop.input_flag === 2 && !prop.auto_increment /* && prop.name !== 'id' */) {
                wrapper._makeError(invalidFields, 'require', { prop: prop.name, name: prop.dis_name })
                return false
            }

            return true
        }

        let dt
        let isArray = -1 // -1: 不确定, 0: 不是, 1: 是
        switch (prop.prop_type) {
            case Constants.API_FIELD_TYPE.boolean:
                isArray = 0
                if (val === true || val === false) {
                    return true
                }

                if (val === 'true') {
                    inputObj[prop.name] = true
                    return true
                } else if (val === 'false') {
                    inputObj[prop.name] = false
                    return true
                } else {
                    wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }
            case Constants.API_FIELD_TYPE.char:
                isArray = 0
                if (typeof val !== 'string' && typeof val !== 'number') {
                    wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                if (prop.width && val.length > prop.width) {
                    wrapper._makeError(invalidFields, 'width', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }
                break
            case Constants.API_FIELD_TYPE.date:
                isArray = 0
                dt = moment(val)
                if (!dt.isValid()) {
                    wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }
                // 直接修改 inputObj 的值：
                inputObj[prop.name] = dt.toDate()
                break
            case Constants.API_FIELD_TYPE.number:
                isArray = 0
                if (isNaN(val / 1)) {
                    wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                if (prop.width && String(val).length > prop.width) {
                    wrapper._makeError(invalidFields, 'width', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                break
            case Constants.API_FIELD_TYPE.objectId:
                isArray = 0
                if (typeof val === 'string' && val.trim().length === 24) {
                    inputObj[prop.name] = mongoose.Types.ObjectId(val.trim())
                } else if (!mongoose.Types.ObjectId.isValid(val)) {
                    wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }
                break
            case Constants.API_FIELD_TYPE['array-of-boolean']:
                isArray = 1
                if (!(val instanceof Array)) {
                    wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                for (let i = 0; i < val.length; i++) {
                    const v = val[i]
                    if (v === 'true') {
                        val[i] = true
                    } else if (v === 'false') {
                        val[i] = false
                    }

                    if (!(v === true || v === false)) {
                        wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                }
                break
            case Constants.API_FIELD_TYPE['array-of-char']:
                isArray = 1
                if (!(val instanceof Array)) {
                    wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }
                for (const v of val) {
                    if (typeof v !== 'string' && typeof v !== 'number') {
                        wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }

                    if (prop.width > 0 && v.length > prop.width) {
                        wrapper._makeError(invalidFields, 'width', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                }
                break
            case Constants.API_FIELD_TYPE['array-of-number']:
                isArray = 1
                if (!(val instanceof Array)) {
                    wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                for (const v of val) {
                    if (isNaN(v / 1)) {
                        wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                }
                break
            case Constants.API_FIELD_TYPE['array-of-objectId']:
                isArray = 1
                if (!(val instanceof Array)) {
                    wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                    return false
                }

                for (let i = 0; i < val.length; i++) {
                    const v = val[i]
                    if (typeof v === 'string' && v.length === 24) {
                        val[i] = mongoose.Types.ObjectId(v)
                    } else if (!mongoose.Types.ObjectId.isValid(v)) {
                        wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
                        return false
                    }
                }
                break
            default:
                break
        }

        if (isArray === 0 && inputObj[prop.name] && inputObj[prop.name] instanceof Array) {
            wrapper._makeError(invalidFields, 'type', { prop: prop.name, name: prop.dis_name, val: val })
            return false
        }

        return true
    },

    getInvalidFieldmessage: invalidFields => {
        const errmessages = []

        for (const tp in invalidFields) {
            const fields = invalidFields[tp]
            if (!(fields && fields instanceof Array)) {
                continue
            }

            for (const field of fields) {
                switch (tp) {
                    case 'type':
                        errmessages.push(`${field.name}[${field.prop}]输入类型错误`)
                        break
                    case 'width':
                        errmessages.push(`${field.name}[${field.prop}]超出字段定义长度`)
                        break
                    case 'dict':
                        errmessages.push(`${field.name}[${field.prop}]为${field.val}不在字典取值范围内`)
                        break
                    case 'require':
                        errmessages.push(`${field.name}[${field.prop}]必须输入`)
                        break
                    case 'exist':
                        errmessages.push(`${field.name}[${field.prop}]为${field.val}的记录已存在`)
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
        invalidFields.result = false
    }
}

module.exports = wrapper
