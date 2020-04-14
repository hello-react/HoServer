/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/7/15
 * author: Jack Zhang
 **/

const _ = require('lodash')
const BaseHelper = require('../base/helpers/base-helper')
const Constants = require('../base/constants/constants')
const mongoose = require('mongoose')

/**
 * 跨 Collection 关联查询表数据，通过 in 查询提升性能
 *
 * 如果指定了 targetQuery，会在查询 target 表时额外增加相应的参数
 * 如果设置了 childField，会将结果放在 src 的 childField 属性中
 *
 * is_recursive 代表是否递归关联，最多支持 2 层，否则会影响性能
 */
const fillRelationData = async (srcData, srcProp, targetObj, targetProp, selectFields, targetQuery, outField, isRecursive = false) => {
    if (!targetObj.modelName) {
        throw new Error('BAD targetObj: ', targetObj)
    }

    let { srcDocs, result } = _prepareResult(srcData)
    const count = srcDocs.length
    if (count === 0) {
        return result
    }

    // 构造关联表查询条件，如果属性是嵌套子节点，直接提取出来，如果有数组还要递归，
    // 尽量避免这种场景，记录多的时候影响性能
    if (srcProp.indexOf('.') > 0) {
        const srcFields = srcProp.split('.')
        const subSrcDocs = []

        // e.g. students.id_list
        _traverseSubProperties(subSrcDocs, srcDocs, srcFields, 0)

        srcDocs = subSrcDocs
        // 最后一个属性接下来直接读取
        srcProp = srcFields[srcFields.length - 1]
    }

    let srcPropArr = []
    for (let i = 0; i < srcDocs.length; i++) {
        const item = srcDocs[i]
        const p = item[srcProp]
        if (p instanceof Array) {
            srcPropArr.push(...p)
        } else {
            srcPropArr.push(p)
        }
    }

    srcPropArr = _.uniq(srcPropArr, srcProp)

    const multiResult = !!(srcPropArr.length > 1)
    const queryOptions = {}

    queryOptions[targetProp] = multiResult ? { $in: srcPropArr } : srcPropArr[0]
    if (targetQuery) {
        Object.assign(queryOptions, targetQuery)
    }

    let targetResult = null
    if (selectFields) {
        if (typeof selectFields === 'string') {
            selectFields = selectFields.split(' ')
        }

        let findTargetProp = false
        const targetPropPathSegs = targetProp.split('.')
        let propPath = ''
        for (const seg of targetPropPathSegs) {
            propPath = propPath ? propPath + '.' + seg : seg

            if (selectFields.indexOf(propPath) > -1) {
                findTargetProp = true
                break
            }
        }

        if (!findTargetProp) {
            selectFields.push(targetProp)
        }

        const selFieldsQuery = {}
        for (let i = 0; i < selectFields.length; i++) {
            let f = selectFields[i]
            if (f.startsWith('-')) {
                f = f.substr(1)
                selFieldsQuery[f] = 0
            } else {
                selFieldsQuery[f] = 1
            }
        }

        // prettier-ignore
        targetResult = multiResult ? await targetObj.find(queryOptions).select(selFieldsQuery).lean() : await targetObj.findOne(queryOptions).select(selFieldsQuery).lean()
    } else {
        targetResult = multiResult ? await targetObj.find(queryOptions).lean() : await targetObj.findOne(queryOptions).lean()
    }

    // 关联查询结果有可能还要再关联，定义model时应尽量避免这种场景
    if (isRecursive) {
        const targetModel = BaseHelper.getContainer().getModel(targetObj.modelName)
        if (targetModel) {
            const defSelFields = []

            // 只扫描第一层属性
            for (const prop of targetModel.properties) {
                if (prop.relations && prop.relations.rel_type && prop.output_flag === 1) {
                    const relType = prop.relations.rel_type / 1

                    // -- 对象忽略不查了
                    /*
                    if (relType === 1) {
                        const relField = {
                            name: prop.name + '_rel',
                            is_recursive: false,
                            rel_fields: [],
                        };

                        const relModel = BaseHelper.getContainer().getModel(prop.relations.name);
                        if (!relModel) {
                            logger.error('fillRelationData, modelMeta not found: ' + prop.relations.name);
                            continue;
                        }

                        // 如果未设置 def_sel_fields，默认填充所有一级字段
                        if (!relModel.def_sel_fields) {
                            for (const relProp of relModel.properties) {
                                relField.rel_fields.push(relProp.name);
                            }
                        }

                        defSelFields.push(relField);
                    }
                    */

                    if ([2, 3, 4].indexOf(relType) > -1) {
                        defSelFields.push({
                            name: prop.name,
                            rel_fields: [prop.relations.name]
                        })
                    }
                }
            }

            targetResult = await fillRelationFields(targetResult, targetModel, defSelFields, false /* 不再继续递归 */)
        }
    }

    // 填充查询结果到源数据中
    for (const srcItem of srcDocs) {
        const p = srcItem[srcProp]
        let relationItem = null
        if (p instanceof Array) {
            relationItem = !multiResult
                ? targetResult
                : targetResult.filter(item => {
                      const targetPropVal = _getJsonPropVal(item, targetProp)
                      if (typeof targetPropVal === 'object' && targetPropVal.equals) {
                          return p.findIndex(r => r.equals(targetPropVal)) > -1
                      } else {
                          return p.indexOf(targetPropVal) > -1
                      }
                  })

            if (relationItem) {
                var concatItems = relationItem._doc || relationItem
                if (!(concatItems instanceof Array)) {
                    concatItems = [concatItems]
                }

                const resultItem = srcItem instanceof mongoose.Model ? srcItem._doc : srcItem
                if (outField) {
                    if (!resultItem[outField]) {
                        resultItem[outField] = []
                    }

                    for (const item of concatItems) {
                        resultItem[outField].push(item)
                    }
                } else {
                    if (!resultItem[srcProp + '_rel']) {
                        resultItem[srcProp + '_rel'] = []
                    }
                    for (const item of concatItems) {
                        resultItem[srcProp + '_rel'].push(item)
                    }
                }
            }
        } else {
            relationItem = !multiResult
                ? targetResult
                : targetResult.find(item => {
                      const targetPropVal = _getJsonPropVal(item, targetProp)
                      if (typeof targetPropVal === 'object' && targetPropVal.equals) {
                          return targetPropVal.equals(srcItem[srcProp])
                      } else {
                          return targetPropVal === srcItem[srcProp]
                      }
                  })

            if (relationItem) {
                const resultItem = srcItem instanceof mongoose.Model ? srcItem._doc : srcItem
                if (outField) {
                    resultItem[outField] = relationItem._doc || relationItem
                } else {
                    resultItem[srcProp + '_rel'] = relationItem._doc || relationItem
                }
            }
        }
    }

    return result
}

/**
 * 填充单个字段
 */
const fillRelationField = async (result, propModel, propFullName, outPropName, relFields, is_recursive = false) => {
    const relType = propModel.relations.rel_type / 1
    if (relType === 1 && propModel.relations.name) {
        if (propModel.relations.field) {
            const targetModel = BaseHelper.getContainer().getModel(propModel.relations.name)
            if (!targetModel) {
                logger.error('getListQuery relations target modelMeta not found: ' + propModel.relations.name)
            } else {
                // 如果未设置则使用默认选择字段
                if (!relFields || relFields.length === 0) {
                    relFields = []
                    const allFields = []
                    for (const prop of targetModel.properties) {
                        if (prop.output_flag_mod !== 0) {
                            allFields.push(prop.name)
                        }

                        if (prop.output_flag_mod === 1) {
                            relFields.push(prop.name)
                        }
                    }

                    if (allFields.length === 0) {
                        relFields = null
                    } else if (relFields.length === 0) {
                        relFields = allFields
                    }
                }

                result = await fillRelationData(result, propFullName, targetModel.instance, propModel.relations.field, relFields, propModel.relations.rel_query, outPropName, is_recursive)
            }
        }
    } else if (relType === 2) {
        const enumObj = BaseHelper.getPropertyEnum(propModel)
        if (enumObj) {
            result = fillDictData(result, propFullName, enumObj)
        }
    } else if (relType === 3) {
        const enumObj = await BaseHelper.getSystemDictItem(propModel.relations.name)
        result = fillDictData(result, propFullName, enumObj)
    } else if (relType === 4) {
        result = fillLocationData(result, propFullName)
    }

    return result
}

// 填充关联字段数据，不用 populate，in 查询性能也很好，可灵活控制
// 如没有缓存，同一输出结果关联字段一般不要有多个，否则会影响性能
// 首次调用 is_recursive 为 true
const fillRelationFields = async (srcData, model, modelOutFields, is_recursive = false) => {
    if (!srcData) return

    if (typeof model === 'string') {
        model = BaseHelper.getModel(model)
    }

    for (const field of modelOutFields) {
        if (!field.rel_fields) {
            continue
        }

        const propNames = field.name.split('.')
        let propPath = ''
        let outPropName = field.name
        if (propNames.length > 0) {
            propPath = field.name.substring(0, field.name.lastIndexOf('.') + 1)
            outPropName = field.name.substring(field.name.lastIndexOf('.') + 1)
        }

        let propModel = model
        while (propNames.length > 0) {
            let propName = propNames[0]
            propNames.splice(0, 1)

            // _rel 去除
            if (propName.endsWith('_rel')) {
                propName = propName.substr(0, propName.length - 4)
            }

            if (propName.startsWith('-')) {
                propName = propName.substr(1)
            }

            if (propName !== '$') {
                propModel = propModel.properties.find(p => p.name === propName)
            }
        }

        if (!propModel) {
            logger.error('find modelMeta property fail, please check your outout settings: ', field.name)
        }

        if (!(propModel.relations && propModel.relations.rel_type)) {
            continue
        }

        srcData = await fillRelationField(srcData, propModel, propPath + propModel.name, outPropName, field.rel_fields, field.is_recursive)
    }

    return srcData
}

/**
 * 填充字典及枚举信息，便于客户端处理
 */
const fillDictData = (srcData, srcProp, dictObj, outField) => {
    let { srcDocs, result } = _prepareResult(srcData)
    if (!srcDocs || (srcDocs instanceof Array && srcDocs.length === 0)) {
        return result
    }

    if (srcProp.indexOf('.') > 0) {
        const srcFields = srcProp.split('.')
        const subSrcDocs = []

        _traverseSubProperties(subSrcDocs, srcDocs, srcFields, 0)
        srcDocs = subSrcDocs
        srcProp = srcFields[srcFields.length - 1]
    }

    for (const srcItem of srcDocs) {
        const p = srcItem[srcProp]
        const item = srcItem._doc || srcItem

        if (dictObj[p]) {
            if (outField) {
                item[outField] = dictObj[p]
            } else {
                item[srcProp + '_rel'] = dictObj[p]
            }
        }
    }

    return result
}

/**
 * 用于对于区域编码字段填充关联的区域名称
 */
const fillLocationData = (srcData, srcProp, outField) => {
    let { srcDocs, result } = _prepareResult(srcData)
    if (!srcDocs || (srcDocs instanceof Array && srcDocs.length === 0)) {
        return result
    }

    if (srcProp.indexOf('.') > 0) {
        const srcFields = srcProp.split('.')
        const subSrcDocs = []

        _traverseSubProperties(subSrcDocs, srcDocs, srcFields, 0)
        srcDocs = subSrcDocs
        srcProp = srcFields[srcFields.length - 1]
    }

    for (const srcItem of srcDocs) {
        const p = srcItem[srcProp]
        const propName = srcProp.toUpperCase()

        if (Constants.AREA_LOCATION_NAMES[propName] === 'location' && typeof p === 'object') {
            const relLocation = BaseHelper.getLocation(p)

            if (relLocation) {
                const resultItem = srcItem instanceof mongoose.Model ? srcItem._doc : srcItem
                if (outField) {
                    resultItem[outField] = relLocation
                } else {
                    resultItem[srcProp + '_rel'] = relLocation
                }
            }
        } else if (Constants.AREA_LOCATION_NAMES[propName] && p) {
            const param = {}
            param[srcProp] = p
            const relVal = BaseHelper.getLocation(param)[srcProp]

            if (relVal) {
                const resultItem = srcItem instanceof mongoose.Model ? srcItem._doc : srcItem

                if (outField) {
                    resultItem[outField] = relVal
                } else {
                    resultItem[srcProp + '_rel'] = relVal
                }
            }
        }
    }

    return result
}

/************************************************
 * below private functions
 * **********************************************/

const _prepareResult = srcData => {
    let srcDocs = srcData
    let result = null

    if (srcData.docs) {
        srcDocs = srcData.docs
        result = srcDocs
    } else if (srcData.list) {
        srcDocs = srcData.list
        result = srcData
    } else {
        result = srcDocs
        if (!(srcDocs instanceof Array)) {
            srcDocs = [srcDocs]
        }
    }

    return { srcDocs, result }
}

/**
 * Get sub properties from result list connection.
 *
 *   如：students.id_list，取到 students 截止，然后将 students 存入 result，
 *   便于后面进行关联数据的填充。
 */
const _traverseSubProperties = (result, docs, subProps, subPropIndex = 0) => {
    for (const doc of docs) {
        let item = doc._doc || doc

        for (let i = subPropIndex; i < subProps.length - 1; i++) {
            const f = subProps[i]
            if (!item[f]) {
                item[f] = {}
            }
            item = item[f]
            if (item instanceof Array) {
                _traverseSubProperties(result, item, subProps, i + 1)
            }
        }

        if (!(item instanceof Array)) {
            result.push(item)
        }
    }
}

const _getJsonPropVal = (jsonData, propPath) => {
    if (!(jsonData instanceof Object) || typeof propPath === 'undefined') {
        return null
    }

    propPath = propPath.replace(/\[(\w+)\]/g, '.$1') // convert indexes to properties
    propPath = propPath.replace(/^\./, '') // strip a leading dot

    let result = jsonData
    var pathArray = propPath.split('.')
    for (var i = 0, n = pathArray.length; i < n; ++i) {
        var key = pathArray[i]
        if (key in result) {
            result = result[key]
        } else {
            result = null
            break
        }
    }

    return result
}

module.exports = {
    fillRelationFields,
    fillRelationField,
    fillRelationData,
    fillDictData,
    fillLocationData
}
