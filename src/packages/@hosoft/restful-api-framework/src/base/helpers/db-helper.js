/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/7/15
 **/

const _ = require('lodash')
const BaseHelper = require('./base-helper')
const mongoose = require('mongoose')

/**
 * fill list data field with relation table records
 *
 * if set targetQuery，will add the query condition when query target table
 * if set outField，will put the relation records to outField, by default use [field]_rel
 *
 * is_recursive if recursive to set the relation fields for relation table
 */
const populateData = async (
    srcData,
    srcProp,
    targetModel,
    targetProp,
    outFieldName,
    selectFields,
    targetQuery,
    isRecursive = false
) => {
    let { srcDocs, result } = _prepareResult(srcData)
    const count = srcDocs.length
    if (count === 0) {
        return result
    }

    // to improve the performance for read sub property data
    if (srcProp.indexOf('.') > 0) {
        const srcFields = srcProp.split('.')
        const subSrcDocs = []

        // e.g. students.id_list
        _traverseSubProperties(subSrcDocs, srcDocs, srcFields, 0)

        srcDocs = subSrcDocs
        srcProp = srcFields[srcFields.length - 1]
    }

    let srcPropArr = []
    for (let i = 0; i < srcDocs.length; i++) {
        const item = srcDocs[i]
        const p = item[srcProp]
        if (p instanceof Array) {
            srcPropArr.push(...p)
        } else if (p) {
            srcPropArr.push(p)
        }
    }

    if (srcPropArr.length === 0) {
        return result
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
        targetResult = multiResult
            ? await targetModel.find(queryOptions, null, selFieldsQuery)
            : await targetModel.findOne(queryOptions, null, selFieldsQuery)
    } else {
        const defOutFields = targetModel.getDefaultOutFields()

        // prettier-ignore
        targetResult = multiResult
            ? await targetModel.find(queryOptions, null, defOutFields)
            : await targetModel.findOne(queryOptions, null, defOutFields)
    }

    // it's better to avoid recursive to improve performance
    if (isRecursive) {
        const defSelFields = {}

        // only scan first layer
        for (const prop of targetModel.properties) {
            if (prop.relations && prop.relations.rel_type && (prop.output_flag === 1 || prop.output_flag === 4)) {
                const relType = prop.relations.rel_type / 1

                // ignore object relation field
                /*
                if (relType === 1) {
                    const relField = {
                        name: prop.name + '_rel',
                        is_recursive: false,
                        rel_fields: [],
                    };

                    defSelFields.push(relField);
                }
                */

                if ([2, 3].indexOf(relType) > -1) {
                    defSelFields[prop.name] = 1
                }
            }

            targetResult = await populateModel(targetResult, targetModel, defSelFields, false /* don't recursive */)
        }
    }

    // fill data
    for (const srcItem of srcDocs) {
        const p = srcItem[srcProp]
        let relationItem = null
        if (p instanceof Array) {
            relationItem = !multiResult
                ? targetResult
                : targetResult.filter((item) => {
                      const targetPropVal = _getJsonPropVal(item, targetProp)
                      if (typeof targetPropVal === 'object' && targetPropVal.equals) {
                          return p.findIndex((r) => r.equals(targetPropVal)) > -1
                      } else {
                          return p.indexOf(targetPropVal) > -1
                      }
                  })

            if (relationItem) {
                let concatItems = relationItem._doc || relationItem
                if (!(concatItems instanceof Array)) {
                    concatItems = [concatItems]
                }

                const resultItem = srcItem instanceof mongoose.Model ? srcItem._doc : srcItem
                if (outFieldName) {
                    if (!resultItem[outFieldName]) {
                        resultItem[outFieldName] = []
                    }

                    for (const item of concatItems) {
                        delete item._id
                        resultItem[outFieldName].push(item)
                    }
                } else {
                    if (!resultItem[srcProp + '_rel']) {
                        resultItem[srcProp + '_rel'] = []
                    }

                    for (const item of concatItems) {
                        delete item._id
                        resultItem[srcProp + '_rel'].push(item)
                    }
                }
            }
        } else {
            relationItem = !multiResult
                ? targetResult
                : targetResult.find((item) => {
                      const targetPropVal = _getJsonPropVal(item, targetProp)
                      if (typeof targetPropVal === 'object' && targetPropVal.equals) {
                          return targetPropVal.equals(srcItem[srcProp])
                      } else {
                          return targetPropVal === srcItem[srcProp]
                      }
                  })

            if (relationItem) {
                delete relationItem._id
                const resultItem = srcItem instanceof mongoose.Model ? srcItem._doc : srcItem
                if (outFieldName) {
                    resultItem[outFieldName] = relationItem._doc || relationItem
                } else {
                    resultItem[srcProp + '_rel'] = relationItem._doc || relationItem
                }
            }
        }
    }

    return result
}

/**
 * fill a single field
 */
const populateField = async (srcData, propModel, propFullName, outPropName, relFields, is_recursive = false) => {
    const relType = propModel.relations.rel_type / 1
    if (relType === 1 && propModel.relations.name) {
        if (propModel.relations.field) {
            const targetModel = BaseHelper.getModel(propModel.relations.name)
            if (!targetModel) {
                logger.error('getListQuery relations target modelMeta not found: ' + propModel.relations.name)
            } else {
                // if relation fields not set, use default output fields
                if (!relFields || relFields.length === 0) {
                    relFields = targetModel.getDefaultOutFields()
                    if (relFields.length === 0) {
                        relFields = null
                    }
                }

                srcData = await populateData(
                    srcData,
                    propFullName,
                    targetModel,
                    propModel.relations.field,
                    '',
                    relFields,
                    propModel.relations.rel_query,
                    is_recursive
                )
            }
        }
    } else if (relType === 2) {
        const enumObj = BaseHelper.getPropertyEnum(propModel)
        if (enumObj) {
            srcData = fillDictData(srcData, propFullName, enumObj)
        }
    } else if (relType === 3) {
        const enumObj = await BaseHelper.getSystemDict(propModel.relations.name)
        srcData = fillDictData(srcData, propFullName, enumObj)
    }

    return srcData
}

/**
 * fill model relation table
 * @param srcData source record list
 * @param model the object model for source record
 * @param populateFields which fields to populate
 */
const populateModel = async (srcData, model, populateFields, is_recursive = false) => {
    if (!srcData) return

    if (typeof model === 'string') {
        model = BaseHelper.getModel(model)
    }

    if (!(populateFields && populateFields.length > 0)) {
        populateFields = model.getDefaultOutFields()
    }

    for (const field of populateFields) {
        const propNames = field.split('.')
        let propPath = ''
        let outPropName = field
        if (propNames.length > 0) {
            propPath = field.substring(0, field.lastIndexOf('.') + 1)
            outPropName = field.substring(field.lastIndexOf('.') + 1)
        }

        let propModel = model
        while (propNames.length > 0) {
            let propName = propNames[0]
            propNames.splice(0, 1)

            // remove _rel
            if (propName.endsWith('_rel')) {
                propName = propName.substr(0, propName.length - 4)
            }

            if (propName.startsWith('-')) {
                propName = propName.substr(1)
            }

            // TODO: $ is mongoose specialized
            if (propName !== '$') {
                propModel = propModel.properties.find((p) => p.name === propName)
            } else {
                console.log('populate array field')
            }
        }

        if (!propModel) {
            logger.error('find modelMeta property fail, please check your output settings: ', field)
        }

        if (!(propModel.relations && propModel.relations.rel_type)) {
            continue
        }

        srcData = await populateField(srcData, propModel, propPath + propModel.name, outPropName, null, false)
    }

    return srcData
}

/**
 * fill dict item text, for client render
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

/************************************************
 * below private functions
 * **********************************************/

const _prepareResult = (srcData) => {
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
 * Get sub properties from result list. used for later fill relation data.
 * e.g. students.id_list, will get sub prop students，then append students to result,
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
    const pathArray = propPath.split('.')
    for (let i = 0, n = pathArray.length; i < n; ++i) {
        const key = pathArray[i]
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
    populateModel,
    populateField,
    populateData,
    fillDictData
}
