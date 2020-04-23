/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: Jack Zhang
 **/

const _ = require('lodash')
const CommUtils = require('../../utils/common')
const mongoose = require('mongoose')
const pluralize = require('pluralize')
const { Constants, ErrorCodes, BaseHelper, InputValidator } = require('../../base')
const { fillRelationFields } = require('../../db/db-helper')
const { getDateQueries } = require('../../utils/date-utils')

// eslint-disable-next-line prettier/prettier
const generalArrayTypes = [
    Constants.API_FIELD_TYPE['array-of-boolean'],
    Constants.API_FIELD_TYPE['array-of-char'],
    Constants.API_FIELD_TYPE['array-of-number'],
    Constants.API_FIELD_TYPE['array-of-objectId']
]

/**
 * 默认系统 RBAC API 请求处理类
 */
class DefaultApiHandler {
    /**
     * create default routes for targer modelMeta RBAC operate
     */
    createDefaultRoutes(modelPath, actions, recursive) {
        const model = BaseHelper.getContainer().getModel(modelPath)
        if (!model) {
            logger.error('createDefaultRoutes modelMeta not found: ' + modelPath)
            return null
        }

        const route = BaseHelper.getModelRoutePath(model)
        if (!route) return null

        const newApis = []
        this._createRbacRoute(newApis, route.routeName, model.name, model.dis_name, '', model.properties, null, route.path, actions, [], [])

        let result
        if (recursive) {
            result = newApis.filter(api => api.model.indexOf(modelPath) === 0)
        } else {
            result = newApis.filter(api => api.model === modelPath)
        }

        // logger.info(`createDefaultRoutes, ${result.length} api routes created for ${modelPath} [${actions.join(', ')}] ${recursive ? 'with sub properties routes' : ''}`)
        return result
    }

    /**
     * 计数查询
     */
    async count(query, context, model) {
        const countQuery = [{ $match: query }]
        const groupBy = context.query.group_by
        const groupByQuery = { _id: 1, count: { $sum: 1 } }

        let propModel = null
        if (groupBy) {
            let subProperty = model
            let curPath = ''
            const routePaths = groupBy.split('.')

            for (let i = 0; i < routePaths.length; i++) {
                if (curPath) {
                    curPath += '.'
                }

                subProperty = subProperty.properties.find(item => item.name === routePaths[i])
                if (subProperty.prop_type.startsWith('array-of')) {
                    countQuery.push({ $unwind: '$' + curPath + subProperty.name })
                }

                curPath += subProperty.name
            }

            propModel = subProperty
            groupByQuery._id = '$' + groupBy
        }

        countQuery.push({ $group: groupByQuery })

        if (propModel) {
            const outField = { $project: { _id: 0, count: 1 } }
            outField.$project[propModel.name] = '$_id'
            countQuery.push(outField)

            const result = await model.instance.aggregate(countQuery)
            const modelNames = groupBy.split('.')
            return this._fillRelationField(result, propModel, modelNames[modelNames.length - 1], propModel.name + '_rel')
        } else {
            return model.instance.aggregate(countQuery)
        }
    }

    /*
     * 获取列表
     */
    async list(context, api) {
        if (!api) api = context.apiRoute.api
        const modelNames = api.model.split('.')
        const model = BaseHelper.getContainer().models[modelNames[0]]
        if (!model) {
            logger.error('list request modelMeta not found: ' + api.model)
            return Promise.reject({ message: '参数错误', code: ErrorCodes.API_MODEL_NOTFOUND })
        }

        modelNames.splice(0, 1)
        const queryModelPath = modelNames.join('.')

        // create query params
        const dbQuery = await this.getRouteQueryParams(context, api)
        const { query } = context

        // 列表查询参数
        this.getRequestInParams(context, dbQuery, api, queryModelPath)

        // deleted, enabled, disabled 参数，设置默认值
        if (!context.isAdmin()) {
            for (const prop of model.properties) {
                if (prop.name === 'enabled' && query.enabled === undefined) {
                    dbQuery.enabled = true
                } else if (prop.name === 'deleted' && query.deleted === undefined) {
                    dbQuery.deleted = false
                } else if (prop.name === 'disabled' && query.disabled === undefined) {
                    dbQuery.disabled = false
                }
            }
        }

        // 统计查询
        if (query.count_only) {
            if ((await BaseHelper.getContainer().executeHook('beforeDbProcess', context, api, dbQuery)) === Constants.API_RESULT.RETURN) {
                return
            }

            return this.count(dbQuery, context, model)
        }

        var result

        let { selectFields, arrayField } = this.getSelectFields(api, dbQuery)
        if (_.get(query, 'select')) {
            const selFields = query.select.split(/[\s,]/)
            const keys = Object.keys(selectFields)
            for (const k of keys) {
                if (selFields.indexOf(k) < 0) {
                    delete selectFields[k]
                }
            }

            delete dbQuery.select
        }

        if (_.isEmpty(selectFields)) {
            selectFields = { _id: 0, __v: 0 }
        }

        // 聚合查询
        if (query.aggregate_query) {
            const dataAggregate = []

            if (query) {
                if (query.sort) {
                    dataAggregate.push({ $sort: query.sort })
                }

                const limit = query.page_size || Constants.PAGE_SIZE
                let skip = 0
                if (query.page) {
                    if (query.offset) {
                        skip = query.offset
                    } else {
                        skip = (query.page - 1) * limit
                    }
                } else if (query.offset) {
                    skip = query.offset
                }

                dataAggregate.push({ $limit: skip + limit })
                dataAggregate.push({ $skip: skip })
            }

            const aggregateQuery = [{ $match: dbQuery }, { $project: selectFields }]
            let groupBy = query.group_by

            if (groupBy) {
                // TODO: 更多统计方法
                const outFields = { _id: 0, count: '$count' }
                outFields[groupBy] = '$_id'

                const prop = BaseHelper.getSubProperty(model, groupBy)
                if (prop && prop.prop_type === 'date') {
                    groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$' + groupBy } }
                }

                aggregateQuery.push({
                    $group: {
                        _id: typeof groupBy === 'string' ? '$' + groupBy : groupBy,
                        count: { $sum: 1 }
                    }
                })
                aggregateQuery.push({
                    $project: outFields
                })
            }

            aggregateQuery.push({
                $facet: {
                    list: dataAggregate,
                    pagination: [{ $count: 'total' }]
                }
            })

            if ((await BaseHelper.getContainer().executeHook('beforeDbProcess', context, api, aggregateQuery)) === Constants.API_RESULT.RETURN) {
                return
            }

            result = (await model.instance.aggregate(aggregateQuery))[0]
            if (!result || result.list.length === 0) {
                return result
            }

            const total = result.pagination[0].total
            const pageSize = query.page_size || Constants.PAGE_SIZE
            const current = query.page || 1
            const pages = Math.ceil(total / pageSize)

            result.pagination = {
                total: total,
                pageSize: pageSize,
                pages: pages,
                current: current,
                next: Math.min(current + 1, pages)
            }
        } else {
            const options = { select: selectFields }
            if (query) {
                options.lean = query.lean !== false
                options.page = query.page || 1
                options.limit = query.page_size || Constants.PAGE_SIZE

                if (query.sort) {
                    options.sort = query.sort
                }

                if (query.offset) {
                    options.offset = query.offset
                }
            }

            // beforeDbProcess hook
            if ((await BaseHelper.getContainer().executeHook('beforeDbProcess', context, api, dbQuery, options)) === Constants.API_RESULT.RETURN) {
                return
            }

            // query DB
            result = await model.instance.paginate(dbQuery, options)
            if (!result || result.list.length === 0) {
                return result
            }
        }

        // fillRelationField hook
        result = await fillRelationFields(result, model, api.out_fields, true)

        // 对于数组查询，如果输出只有数组字段，简化结果
        var propValue = null
        let onlyReturnArray = true
        if (arrayField && result.list.length === 1) {
            for (const field of api.out_fields) {
                if (field.name.indexOf(arrayField) < 0) {
                    onlyReturnArray = false
                    break
                }
            }

            if (onlyReturnArray) {
                propValue = result.list[0]
                if (propValue.toObject) {
                    propValue = propValue.toObject()
                }

                const fields = arrayField.split('.')
                for (let i = fields.length - 1; i >= 0; i--) {
                    const f = fields[i]
                    const subProp = propValue[f]
                    if (subProp) {
                        propValue = subProp
                    } else {
                        propValue = null
                        break
                    }
                }

                if (propValue) {
                    result.list = propValue
                }
            }
        }

        // check for relation fields
        return result
    }

    /*
     * 获取单条记录详情
     */
    async detail(context, api) {
        if (!api) api = context.apiRoute.api
        if (!api.model) {
            return Promise.reject({ message: '参数错误', code: ErrorCodes.API_MODEL_NOTFOUND })
        }

        const modelNames = api.model.split('.')
        const model = BaseHelper.getContainer().models[modelNames[0]]
        if (!model) {
            logger.error('detail modelMeta not found: ' + modelNames[0])
            return Promise.reject({ message: '参数错误', code: ErrorCodes.API_MODEL_NOTFOUND })
        }

        // create query params
        const query = this.getRouteQueryParams(context, api)
        if ((await BaseHelper.getContainer().executeHook('beforeDbProcess', context, api, query)) === Constants.API_RESULT.RETURN) {
            return
        }

        modelNames.splice(0, 1)
        const queryModelPath = modelNames.join('.')
        this.getRequestInParams(context, query, api, queryModelPath)

        const { selectFields } = this.getSelectFields(api, query, queryModelPath)
        const lean = context.query.lean

        let resultFunc
        if (!_.isEmpty(selectFields)) {
            resultFunc = model.instance.findOne(query).select(selectFields)
        } else {
            resultFunc = model.instance.findOne(query).select({ _id: 0, __v: 0 })
        }

        let result = await (String(lean) !== 'false' ? resultFunc.lean() : resultFunc())
        if (!result) {
            return Promise.reject({ message: '查询无记录', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        result = await fillRelationFields(result, model, api.out_fields)

        if (this._isSubModel(api.model)) {
            result = this._getObjectChild(result, model, modelNames, query)

            const subProperty = BaseHelper.getSubProperty(model, api.model)
            if (subProperty.prop_type.indexOf('array') > -1 && subProperty.properties && subProperty.properties.length > 0) {
                const { idField, propType } = BaseHelper.getModelIdField(subProperty)
                const inputId = query[`${modelNames.join('.')}.${idField}`]
                if (inputId) {
                    if (propType === Constants.API_FIELD_TYPE.objectId) {
                        result = result.find(sr => sr[idField].equals(inputId))
                    } else {
                        result = result.find(sr => sr[idField] == inputId)
                    }
                }
            }
        }

        return result
    }

    /*
     * 创建记录
     */
    async create(context, api) {
        if (!api) api = context.apiRoute.api

        // check the property
        const query = this.getRouteQueryParams(context, api)

        let result
        if (this._isSubModel(api.model)) {
            const model = BaseHelper.getContainer().getModel(api.model)
            const existRecord = await model.instance.findOne(query)
            if (!existRecord) {
                return Promise.reject({ message: '查询无记录', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
            }

            const subModelMeta = BaseHelper.getSubProperty(model, api.model)
            result = await this._createArraySubModel(subModelMeta, existRecord, context, api)
        } else {
            result = await this._createModel(context, api)
        }

        await this._checkClearCache(api, context)
        return result
    }

    /*
     * 更新记录
     */
    async update(context, api) {
        const inputObj = context.body
        if (!(inputObj && typeof inputObj === 'object')) {
            return Promise.reject({ message: '参数错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const model = BaseHelper.getContainer().getModel(api.model)
        if (!model) {
            logger.error('update request modelMeta not found: ' + api.model)
            return Promise.reject({ message: '对象模型未找到: ' + api.model, code: ErrorCodes.API_MODEL_NOTFOUND })
        }

        const query = await this.getRouteQueryParams(context, api)
        const keyLength = Object.keys(query).length
        if (keyLength === 0) {
            return Promise.reject({ message: 'url参数错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        // const modelNames = api.model.split('.')
        const records = await model.instance.find(query)
        if (records.length === 0) {
            return Promise.reject({ message: '对象未找到: ' + api.model, code: ErrorCodes.API_MODEL_NOTFOUND })
        } else if (records.length > 1) {
            return Promise.reject({ message: '找到多个匹配记录，请检查查询条件: ' + api.model, code: ErrorCodes.GENERAL_ERR_UPDATE_FAIL })
        }

        // 设置属性值
        const existRecord = records[0]

        let targetProperty = model
        let targetRecord = existRecord
        if (this._isSubModel(api.model)) {
            const modelNames = api.model.split('.')
            modelNames.splice(0, 1)

            targetProperty = BaseHelper.getSubProperty(model, api.model)
            targetRecord = this._getObjectChild(existRecord, model, modelNames, query)
            if (targetProperty.prop_type.indexOf('array') > -1 && targetProperty.properties && targetProperty.properties.length > 0) {
                const { idField } = BaseHelper.getModelIdField(targetProperty)
                const inputId = query[`${modelNames.join('.')}.${idField}`] + ''
                targetRecord = targetRecord.find(sr => String(sr[idField]) == inputId)
            }
        }

        // 设置属性值
        this._setModelProperties('', targetProperty, targetRecord, inputObj, inputObj.replace || false)

        // 输入检查
        const inputModel = _.clone(existRecord)
        const invalidFields = await InputValidator.validateInputFields(context, model, api, inputModel, existRecord)
        if (invalidFields !== true && invalidFields !== null) {
            const errmessage = InputValidator.getInvalidFieldmessage(invalidFields)
            return Promise.reject({
                message: '更新对象出错：' + errmessage.join('\r\n'),
                code: ErrorCodes.GENERAL_ERR_PARAM
            })
        }

        try {
            if ((await BaseHelper.getContainer().executeHook('beforeDbProcess', context, api, existRecord)) === Constants.API_RESULT.RETURN) {
                return 'hooked'
            }

            await existRecord.save()
            await this._checkClearCache(api, context)

            const { idField } = BaseHelper.getModelIdField(model)
            logger.info(`update request ${api.model} updated: ${existRecord[idField]}`)

            return 'success'
        } catch (ex) {
            return Promise.reject({
                message: '更新对象出错：' + (ex.message || ex.toString()),
                code: ErrorCodes.GENERAL_ERR_CREATE_FAIL
            })
        }
    }

    /**
     * 批量更新
     * @param context
     * @param api
     * @returns {Promise<void>}
     */
    async batchUpdate(context, api) {
        const model = BaseHelper.getContainer().getModel(api.model)
        if (!model) {
            return Promise.reject({ message: '对象模型未找到: ' + api.model, code: ErrorCodes.API_MODEL_NOTFOUND })
        }

        const inputData = _.get(context, ['body', 'data'])
        if (typeof inputData !== 'object') {
            return Promise.reject({ message: '参数错误[data]', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        // id 字段是可选参数
        const { idField, propType } = BaseHelper.getModelIdField(model)
        const idsList = context.body[idField]

        const batchUpdateRecordsWithSameInfo = async (ids, idPropType, inputObj) => {
            if (inputObj instanceof Array) {
                if (inputObj.length === 0) {
                    return Promise.reject({ message: `未设置更新数据`, code: ErrorCodes.GENERAL_ERR_PARAM })
                }
                inputObj = inputObj[0]
            }

            const bulkOperate = model.instance.collection.initializeOrderedBulkOp()

            const body = _.clone(inputObj)
            delete body[idField]

            const invalidFields = await InputValidator.validateInputFields(context, model, api, body, null)
            if (invalidFields !== true) {
                const errmessages = InputValidator.getInvalidFieldmessage(invalidFields)
                return Promise.reject({
                    message: '更新对象出错：' + errmessages.join('\r\n'),
                    code: ErrorCodes.GENERAL_ERR_PARAM
                })
            }

            for (const id of ids) {
                if (!id) {
                    logger.warn(`batchUpdate, got empty ${idField}`)
                    continue
                }

                const query = { [idField]: this._convertType(id, idPropType) }
                bulkOperate.find(query).updateOne({ $set: body })
            }

            const result = await bulkOperate.execute()
            await this._checkClearCache(api, context)
            return result
        }

        const batchUpdateRecords = async (idField, idPropType, inputObjs) => {
            if (!(inputObjs instanceof Array && inputObjs.length > 0)) {
                return Promise.reject({ message: `更新数据必须是数组，并且每条数据都必须包含 ${idField} 属性`, code: ErrorCodes.GENERAL_ERR_PARAM })
            }

            for (let i = 0; i < inputObjs.length; i++) {
                if (!inputObjs[i][idField]) {
                    return Promise.reject({ message: `第${i + 1}条记录未指定 ${idField}`, code: ErrorCodes.GENERAL_ERR_PARAM })
                }
            }

            const bulkOperate = model.instance.collection.initializeOrderedBulkOp()

            for (const inputObj of inputObjs) {
                const query = {}
                query[idField] = idPropType === Constants.API_FIELD_TYPE.objectId ? mongoose.Types.ObjectId(inputObj[idField]) : inputObj[idField]

                const body = _.clone(inputObj)
                delete body[idField]

                const existRecord = await model.instance.findOne({ [idField]: query[idField] }).lean()
                const invalidFields = await InputValidator.validateInputFields(context, model, api, body, existRecord)
                if (invalidFields !== true) {
                    const errmessages = InputValidator.getInvalidFieldmessage(invalidFields)
                    return Promise.reject({
                        message: '更新对象出错：' + errmessages.join('\r\n'),
                        code: ErrorCodes.GENERAL_ERR_PARAM
                    })
                }

                bulkOperate.find(query).updateOne({ $set: body })
            }

            const result = await bulkOperate.execute()
            await this._checkClearCache(api, context)
            return result
        }

        if (idsList && idsList instanceof Array && idsList.length > 0) {
            return batchUpdateRecordsWithSameInfo(idsList, propType, inputData)
        } else {
            return batchUpdateRecords(idField, propType, inputData)
        }
    }

    /*
     * 删除记录，目前只允许删除一个
     */
    async delete(context, api) {
        if (!api) api = context.api

        const query = await this.getRouteQueryParams(context, api)
        const model = BaseHelper.getContainer().getModel(api.model)
        if (!model) {
            logger.error('delete request modelMeta not found: ' + api.model)
            return Promise.reject({ message: '对象模型未找到: ' + api.model, code: ErrorCodes.API_MODEL_NOTFOUND })
        }

        const keyLength = Object.keys(query).length
        if (keyLength === 0) {
            return Promise.reject({ message: '未设置查询错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        let result
        if (this._isSubModel(api.model)) {
            const existRecord = await model.instance.findOne(query)
            result = await this._deleteArraySubModel(existRecord, query, api)
        } else {
            if ((await BaseHelper.getContainer().executeHook('beforeDbProcess', context, api, query)) === Constants.API_RESULT.RETURN) {
                return 'hooked'
            }

            try {
                await model.instance.deleteOne(query)
                result = 'success'
            } catch (ex) {
                logger.error('delete request failed: ' + ex.message)
                return Promise.reject({
                    message: '删除对象出错：' + (ex.message || ex.toString()),
                    code: ErrorCodes.GENERAL_ERR_CREATE_FAIL
                })
            }
        }

        await this._checkClearCache(api, context)
        return result
    }

    /**
     * 批量删除
     */
    async batchDelete(context, api) {
        if (!api) api = context.api

        const model = BaseHelper.getContainer().getModel(api.model)
        if (!model) {
            logger.error('batchDelete request modelMeta not found: ' + api.model)
            return Promise.reject({ message: '对象模型未找到: ' + api.model, code: ErrorCodes.API_MODEL_NOTFOUND })
        }

        const { idField, propType } = BaseHelper.getModelIdField(model)
        if (!idField) {
            return Promise.reject({ message: `${model.dis_name} 不支持批量删除`, code: ErrorCodes.GENERAL_ERR_NOT_SUPPORT })
        }

        const idsList = context.body[idField]
        if (!(idsList instanceof Array)) {
            return Promise.reject({ message: '参数错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const query = await this.getRouteQueryParams(context, api)
        this.getRequestInParams(context, query, api, '')

        // id 字段必须设置
        if (idsList.length.length === 0) {
            return Promise.reject({ message: `${idField} 参数错误`, code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        query[idField] = this._convertType(idsList, propType)

        try {
            const result = await model.instance.deleteMany(query)
            await this._checkClearCache(api, context)

            return result
        } catch (ex) {
            logger.error('batchDelete request failed: ' + ex.message)
            return Promise.reject({
                message: '批量删除对象出错：' + (ex.message || ex.toString()),
                code: ErrorCodes.GENERAL_ERR_CREATE_FAIL
            })
        }
    }

    /**
     * get query params from http request (it's not saved in params)
     */
    getRouteQueryParams(context, api) {
        const query = {}
        // const modelMeta = BaseHelper.getContainer().getModel(api.modelMeta);
        // const route = BaseHelper.getModelRoutePath(modelMeta);

        this._getRouteQueryParamsInner(context, api, query)
        return query
    }

    /**
     * fill request params according in_params setting
     */
    getRequestInParams(context, query, api, queryModelPath) {
        const params = context.query || {}

        for (const param of api.in_params) {
            const queryKey = queryModelPath + param.name

            const paramVal = params[param.name]
            if (paramVal) {
                switch (param.flag) {
                    case Constants.API_IN_PARAM_FLAG.REGEX:
                        query[queryKey] = new RegExp(paramVal.replace(/\*/g, '.*'), 'i')
                        break

                    case Constants.API_IN_PARAM_FLAG.ANY:
                    case Constants.API_IN_PARAM_FLAG.ALL:
                        var values = paramVal
                        if (!(values instanceof Array)) {
                            values = (values + '').split(/[,|]/)
                        }

                        if (param.flag === Constants.API_IN_PARAM_FLAG.ANY) {
                            query[queryKey] = this._convertType(values, param.type)
                        } else {
                            const matchValues = this._convertType(values, param.type)
                            query[queryKey] = { $all: matchValues.$in || matchValues }
                        }

                        break

                    default:
                        if (param.flag !== Constants.API_IN_PARAM_FLAG.NONE || context.isAdmin()) {
                            query[queryKey] = this._convertType(paramVal, param.type)
                        }

                        break
                } // END: switch
            }
        }
    }

    /**
     * 根据 api 输出字段构造查询参数
     */
    getSelectFields(api, query) {
        const selectFields = {}
        const arrayFields = {}

        const queryKeys = Object.keys(query)
        for (let i = api.out_fields.length - 1; i > -1; i--) {
            const f = api.out_fields[i]
            if (f.name.endsWith('.$')) {
                const aryFieldName = f.name.substr(0, f.name.length - 2)
                arrayFields[aryFieldName] = 0

                const arrayPath = aryFieldName + '.'
                if (queryKeys.find(q => q.indexOf(arrayPath) > -1)) {
                    arrayFields[aryFieldName] = 1
                }
            }
        }

        // 到这里 arrayFields 只有一个，mongo不允许多个array查询
        let arrayField = ''
        for (const f in arrayFields) {
            if (arrayFields[f] === 1) {
                selectFields[f + '.$'] = 1
                arrayField = f
                break
            }
        }

        // const arrayKeys = Object.keys(arrayFields);
        for (const f of api.out_fields) {
            if (f.name.endsWith('.$')) {
                continue // 上一步已经处理过了
            }

            // 对于数组，如果不在查询参数中，就没必要加 $ 了
            const isRemove = f.name.startsWith('-')
            const fieldName = isRemove ? f.name.substr(1) : f.name

            if (arrayField !== fieldName) {
                selectFields[fieldName] = isRemove ? 0 : 1
            }
        }

        return { selectFields: selectFields, arrayField: arrayField }
    }

    /**
     * get default route config for property
     */
    getDefaultRouteActions(property) {
        if (property.prop_type === Constants.API_FIELD_TYPE['array-of-object']) {
            return ['list', 'detail', 'create', 'update', 'delete']
        } else if (property.prop_type === Constants.API_FIELD_TYPE.object) {
            return ['detail', 'update']
        }

        return []
    }

    /**
     * get api params for GET requests
     */
    getQueryApiInParams(inParams, properties, parentName = '') {
        if (parentName) {
            parentName += '.'
        }

        for (const prop of properties) {
            if ((prop.properties || []).length === 0 && ![Constants.API_FIELD_TYPE.object, Constants.API_FIELD_TYPE['array-of-object']].includes(prop.prop_type)) {
                let paramFlag = Constants.API_IN_PARAM_FLAG.MATCH

                // any of array element
                if (prop.search_flag === 0) {
                    // not allow to query
                    paramFlag = Constants.API_IN_PARAM_FLAG.NONE
                } else if (prop.search_flag === 3) {
                    paramFlag = Constants.API_IN_PARAM_FLAG.DEFAULT
                } else if (generalArrayTypes.includes(prop.prop_type)) {
                    paramFlag = Constants.API_IN_PARAM_FLAG.ANY
                } else if (prop.search_flag === 2) {
                    paramFlag = Constants.API_IN_PARAM_FLAG.REGEX
                }

                const require = 0 // prop.require ? 1 : 0 // 列表查询应该都是可选的
                const param = {
                    name: parentName + prop.name.toLowerCase(),
                    type: prop.prop_type,
                    flag: paramFlag,
                    require: require,
                    default_val: prop.default_val,
                    description: prop.dis_name + (prop.description ? ', ' + prop.description : '')
                }

                inParams.push(param)
            }

            // recursive check sub properties
            if (prop.properties && prop.properties.length > 0) {
                this.getQueryApiInParams(inParams, prop.properties, parentName + prop.name)
            }
        }
    }

    /**
     * get api params for POST requests
     */
    getPostApiInParams(inParams, properties, parentName = '') {
        if (parentName) {
            parentName += '.'
        }

        for (const prop of properties) {
            if ((prop.properties || []).length === 0 && ![Constants.API_FIELD_TYPE.object, Constants.API_FIELD_TYPE['array-of-object']].includes(prop.prop_type)) {
                let paramFlag = ''

                if (prop.input_flag === 0) {
                    paramFlag = Constants.API_IN_PARAM_FLAG.NONE
                } else if (prop.input_flag === 3) {
                    paramFlag = Constants.API_IN_PARAM_FLAG.DEFAULT
                }

                const require = prop.input_flag === 2 // 2: 必须输入
                const param = {
                    name: parentName + prop.name.toLowerCase(),
                    type: prop.prop_type,
                    flag: paramFlag,
                    require: require,
                    default_val: prop.default_val,
                    description: prop.dis_name + (prop.description ? ', ' + prop.description : '')
                }

                inParams.push(param)
            }

            // recursive check sub properties
            if (prop.properties && prop.properties.length > 0) {
                this.getQueryApiInParams(inParams, prop.properties, parentName + prop.name)
            }
        }
    }

    /**
     * output_flag，提取默认输出字段列表，
     * 提取规则为从当前属性递归所有子属性，提取所有 output_flag 为 1 的字段
     *
     * @param outFields - 存储输出字段列表，输出字段必须是完整的路径，从Model 对象根属性节点开始
     * @param parentFullPath - 从Model 对象根属性节点开始的节点路径列表，parentFullPath "general.book_version"
     */
    getApiOutFields(outFields, properties, parentFullPath, selectedAll, objArrayLevel = 0) {
        if (parentFullPath) {
            parentFullPath = parentFullPath + '.'
        }

        let hasUnique = false

        // 同级节点多个对象数组不需要增加 objArrayLevel
        let parentObjArrayLevel = objArrayLevel

        for (const prop of properties) {
            if (!prop || prop.output_flag_mod === 0) {
                continue
            }

            if (prop.unique) {
                hasUnique = true
            }

            let relField = null
            const field = {
                name: parentFullPath + prop.name,
                type: prop.prop_type,
                description: prop.dis_name + (prop.description ? ', ' + prop.description : '')
            }

            if (parentObjArrayLevel > 0) {
                if (parentObjArrayLevel === 1 && parentFullPath) {
                    outFields.push({ name: parentFullPath + '$' })
                    parentObjArrayLevel++

                    // break; // 不能 break，子属性中减去字段设置还需要
                }
            } else if (prop.relations) {
                const relType = prop.relations.rel_type / 1
                if (relType === 1) {
                    relField = {
                        name: field.name + '_rel',
                        description: prop.dis_name + '关联数据',
                        is_recursive: prop.relations.is_recursive || false,
                        rel_fields: []
                    }

                    const relModel = BaseHelper.getContainer().getModel(prop.relations.name)
                    if (!relModel) {
                        logger.error('getOutFieldsList, modelMeta not found: ' + prop.relations.name)
                        continue
                    }

                    // here needn't loop to get all sub properties
                    for (const relProp of relModel.properties) {
                        if (relProp.output_flag_mod === 1 || relProp.output_flag_mod === 4) {
                            relField.rel_fields.push(relProp.name)
                        }
                    }

                    field.rel_fields = null // 数据填充到 xxx_rel, 原字段不再填充
                } else if ([2, 3, 4].indexOf(relType) > -1) {
                    field.rel_fields = [prop.relations.name]
                }
            }

            // 对于查询详情，默认输出全部字段
            const isOutput = selectedAll ? prop.output_flag_mod !== 0 : prop.output_flag_mod === 1 || prop.output_flag_mod === 4
            if (prop.properties && prop.properties.length > 0 && prop.output_flag_mod !== 4) {
                const isObjArray = prop.prop_type === Constants.API_FIELD_TYPE['array-of-object']
                if ((isObjArray || prop.prop_type === Constants.API_FIELD_TYPE.object) && isOutput) {
                    if (isObjArray) {
                        parentObjArrayLevel++
                    }

                    this.getApiOutFields(outFields, prop.properties, parentFullPath + prop.name, selectedAll, parentObjArrayLevel)
                }
            } else {
                if (isOutput) {
                    outFields.push(field)
                    if (relField) {
                        outFields.push(relField)
                    }
                }
            }
        } // END: for

        if (!hasUnique) {
            outFields.push({ name: parentFullPath + 'id' })
        }
    }

    /************************************************
     * below private functions
     * **********************************************/

    _getObjectChild(record, model, modelNames, query) {
        let subRecord = record
        let subModel = model
        let modelPath = ''
        for (let i = 0; i < modelNames.length; i++) {
            if (modelPath) {
                modelPath += '.'
            }

            modelPath += modelNames[i]
            subModel = subModel.properties.find(p => p.name === modelNames[i])
            subRecord = subRecord[modelNames[i]]

            if (subRecord instanceof Array && i < modelNames.length - 1) {
                const { idField, propType } = BaseHelper.getModelIdField(subModel)
                const inputId = query[`${modelPath}.${idField}`]
                if (inputId) {
                    if (propType === Constants.API_FIELD_TYPE.objectId) {
                        subRecord = subRecord.find(sr => sr[idField].equals(inputId))
                    } else {
                        subRecord = subRecord.find(sr => sr[idField] == inputId)
                    }
                }
            }
        }

        return subRecord
    }

    _getDefFuncName(modelName) {
        const parts = modelName.split('.')
        if (parts.length > 3) {
            const lastPart = parts[parts.length - 1]
            return `${parts[0]}${CommUtils.capitalizeFirstLetter(parts[1])}${CommUtils.capitalizeFirstLetter(lastPart)}`
        } else {
            return `${parts[0]}${CommUtils.capitalizeFirstLetter(parts[1])}${CommUtils.capitalizeFirstLetter(parts[2])}`
        }
    }

    // get query params from http request
    _getRouteQueryParamsInner(context, api, query) {
        if (!context.req.route) {
            return
        }

        const model = BaseHelper.getContainer().getModel(api.model)

        // 类似于这样的路由：
        // /api/v1/user/areas/:area_province/cities/:city_idx/districts/:district_idx/subdistricts
        // /api/v1/user/classes/:class_id/students/:_id
        // /api/v1/users/:user_id/teacher/classes/:_id
        //
        let routePath = context.req.route.path

        const modelRoute = BaseHelper.getModelRoutePath(model)
        const modelRoutePath = (modelRoute || {}).path || ''
        const pos = routePath.indexOf(modelRoutePath)
        if (pos < 0) {
            logger.warn(`api path did not match model: ${api.path} <-> ${modelRoutePath}`)
            return
        }

        routePath = routePath.substr(pos + modelRoutePath.length + 1)

        let selectPath = ''
        let subProperty = model
        let lastProp = (modelRoutePath || {}).routeName || ''

        const pathSegs = routePath.split('/')
        for (const pathSeg of pathSegs) {
            if (!pathSeg) continue

            let propName = pathSeg
            if (pathSeg.startsWith(':')) {
                propName = propName.substr(1)
                let queryField = propName
                if (propName.indexOf('_') > 0) {
                    const lastPropOdd = lastProp ? pluralize(lastProp, 1).toLowerCase() : ''
                    const pos = queryField.indexOf(lastPropOdd + '_')
                    if (pos > -1) {
                        queryField = queryField.substr(pos + lastPropOdd.length + 1)
                    }
                }

                var prop = subProperty.properties.find(p => p.name.toLowerCase() === queryField)
                if (!prop) {
                    prop = subProperty.properties.find(p => p.name.toLowerCase() === propName)
                }

                if (!prop) {
                    if (queryField !== 'id' && queryField !== '_id') queryField = ''
                } else {
                    queryField = prop.name
                }

                const requestVal = _.get(context.req, ['params', propName])
                if (requestVal && queryField) {
                    query[selectPath ? `${selectPath}.${queryField}` : queryField] = prop ? this._convertType(requestVal, prop.prop_type) : requestVal
                }
            } else {
                selectPath += selectPath ? `.${propName}` : propName
                subProperty = subProperty.properties.find(p => p.name.toLowerCase() === propName)
                if (!subProperty) {
                    break
                }

                lastProp = propName
            }
        }

        return query
    }

    async _createArraySubModel(subModel, existRecord, context, api) {
        const modelNames = api.model.split('.')

        // create modelMeta property
        let subRecord = existRecord
        for (let i = 1; i < modelNames.length; i++) {
            subRecord = subRecord[modelNames[i]]
        }

        if (!(subRecord instanceof Array)) {
            return Promise.reject({ message: `属性${api.model}不是数组`, code: ErrorCodes.API_MODEL_BAD_TYPE })
        }

        const inputObj = context.body
        const { idField, propType } = BaseHelper.getModelIdField(subModel)
        if (propType === Constants.API_FIELD_TYPE.objectId) {
            if (!inputObj[idField]) {
                inputObj[idField] = mongoose.Types.ObjectId()
            } else if (subRecord.find(r => r[idField].equals(inputObj[idField]))) {
                return Promise.reject({ message: `${idField}为${inputObj[idField]}的记录已存在`, code: ErrorCodes.GENERAL_ERR_EXIST })
            }
        }

        const invalidFields = await InputValidator.validateInputFields(context, subModel, api, inputObj, null)
        if (invalidFields !== true) {
            const errmessages = InputValidator.getInvalidFieldmessage(invalidFields)
            return Promise.reject({ message: '创建数组元素出错：' + errmessages.join('\r\n'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        if (subRecord.find(r => r[idField] == inputObj[idField])) {
            return Promise.reject({ message: `${idField}为${inputObj[idField]}的记录已存在`, code: ErrorCodes.GENERAL_ERR_EXIST })
        }

        // push new child to the array
        subRecord.push(inputObj)

        if ((await BaseHelper.getContainer().executeHook('beforeDbProcess', context, api, existRecord)) === Constants.API_RESULT.RETURN) {
            return 'hooked'
        }

        try {
            await existRecord.save()

            logger.info(`_createSubModel new ${api.model} created:` + inputObj[idField])
            return inputObj[idField]
        } catch (ex) {
            logger.error('_createArraySubModel failed: ' + ex.message)
            return Promise.reject({
                message: '创建子对象出错：' + (ex.message || ex.toString()),
                code: ErrorCodes.GENERAL_ERR_CREATE_FAIL
            })
        }
    }

    async _createModel(context, api) {
        const model = BaseHelper.getContainer().getModel(api.model)
        if (!model) {
            logger.error('_createModel modelMeta not found: ' + api.model)
            return Promise.reject({
                message: '对象模型未找到: ' + api.model,
                code: ErrorCodes.API_MODEL_NOTFOUND
            })
        }

        const inputObj = context.body

        // 填充 id 字段
        const { idField, propType } = BaseHelper.getModelIdField(model)
        if (propType === Constants.API_FIELD_TYPE.objectId) {
            if (!inputObj[idField]) {
                inputObj[idField] = mongoose.Types.ObjectId()
            }

            inputObj._id = inputObj[idField]
        }

        // 检查 unique 字段，字典 key，数据类型，数据宽度等
        const invalidFields = await InputValidator.validateInputFields(context, model, api, inputObj, null)
        if (invalidFields !== true) {
            const errmessages = InputValidator.getInvalidFieldmessage(invalidFields)
            return Promise.reject({
                message: '创建对象出错：' + errmessages.join('\r\n'),
                code: ErrorCodes.GENERAL_ERR_PARAM
            })
        }

        if ((await BaseHelper.getContainer().executeHook('beforeDbProcess', context, api, inputObj)) === Constants.API_RESULT.RETURN) {
            return
        }

        try {
            if (model.timestamp === true) {
                inputObj.created_at = new Date()
            }
            const newModel = await model.instance.create(inputObj)
            logger.info(`_createModel new ${api.model} created:`, newModel[idField])
            return newModel[idField]
        } catch (ex) {
            logger.error('_createModel failed: ' + ex.message)
            return Promise.reject({
                message: '创建对象出错：' + (ex.message || ex.toString()),
                code: ErrorCodes.GENERAL_ERR_CREATE_FAIL
            })
        }
    }

    _setModelProperties(parentName, property, existRecord, inputObj, replace) {
        if (!inputObj) return

        for (const prop of property.properties) {
            const queryKey = prop.name // parentName ? parentName + '.' + prop.name : prop.name

            // 数组检查 id
            if (prop.prop_type.indexOf('array') > -1 && prop.properties && prop.properties.length > 0 && inputObj[queryKey] instanceof Array) {
                const { idField, propType } = BaseHelper.getModelIdField(prop)
                if (propType === Constants.API_FIELD_TYPE.objectId) {
                    for (const row of inputObj[queryKey]) {
                        if (!row[idField]) {
                            row[idField] = mongoose.Types.ObjectId()
                        }
                    }
                }
            }

            if (replace === true) {
                // 子属性忽略 unique
                if ((prop.input_flag !== 2 || inputObj[queryKey]) && (!prop.unique || (parentName && inputObj[queryKey]))) {
                    existRecord[prop.name] = inputObj[queryKey]
                }
            } else if (prop.properties && prop.properties.length > 0 && prop.prop_type.indexOf('array') < 0) {
                const subModel = existRecord[prop.name]
                if (subModel) {
                    this._setModelProperties(queryKey, prop, subModel, inputObj[queryKey], replace)
                }
            } else if (inputObj[queryKey] !== undefined) {
                if (prop.prop_type.indexOf('array') < 0 || inputObj[queryKey] instanceof Array) {
                    existRecord[prop.name] = inputObj[queryKey]
                }
            }
        }
    }

    async _deleteArraySubModel(existRecord, query, api) {
        const model = BaseHelper.getContainer().getModel(api.model)
        if (!model) {
            logger.error('_deleteArraySubModel modelMeta not found: ' + api.model)
            return Promise.reject({
                message: '对象模型未找到: ' + api.model,
                code: ErrorCodes.API_MODEL_NOTFOUND
            })
        }

        const modelNames = api.model.split('.')

        // create modelMeta property
        let subRecord = existRecord
        let subModel = model
        let modelPath = ''
        for (let i = 1; i < modelNames.length; i++) {
            if (modelPath) {
                modelPath += '.'
            }
            modelPath += modelNames[i]
            subModel = subModel.properties.find(p => p.name === modelNames[i])
            subRecord = subRecord[modelNames[i]]

            if (subRecord instanceof Array && i < modelNames.length - 1 && query[modelPath]) {
                const { idField } = BaseHelper.getModelIdField(subModel)
                subRecord = subRecord.find(r => String(r[idField]) == query[modelPath])
            }
        }

        const { idField, propType } = BaseHelper.getModelIdField(subModel)
        const id = query[`${modelPath}.${idField}`]

        if (propType === Constants.API_FIELD_TYPE.objectId) {
            _.remove(subRecord, p => p[idField].equals(id))
        } else {
            _.remove(subRecord, p => p[idField] === id)
        }

        if ((await BaseHelper.getContainer().executeHook('beforeDbProcess', context, api, existRecord)) === Constants.API_RESULT.RETURN) {
            return 'hooked'
        }

        try {
            existRecord.markModified(modelPath)
            await existRecord.save()
            logger.info(`_deleteArraySubModel ${api.model} with id ${id} deleted`)
            return 'success'
        } catch (ex) {
            logger.error('_deleteArraySubModel failed: ' + ex.message)
            return Promise.reject({
                message: '删除子对象出错：' + (ex.message || ex.toString()),
                code: ErrorCodes.GENERAL_ERR_DELETE_FAIL
            })
        }
    }

    /**
     * create the default RBAC route
     *
     * @param result 输出结果
     * @param parentRouteName 路由名称受model name以及route_name等参数影响，不能完全使用model名称
     * @param parentModelName 上一级对象模型名称
     * @param parentDisName 显示名称
     * @param outFieldParentName 输出字段 不需要 User.location.这样，只要 location.
     * @param properties
     * @param parentProp 父级属性节点
     * @param routePath 上层路由路径
     * @param actionsList 路由配置，包含 'list', 'detail', 'create', 'update', 'delete' 等
     * @param arrayLevel 数组层级，2层级以上受 mongodb 查询限制将不生成路由
     * @param order 路由顺序，express 路由顺序会前后影响，应尽量将短路由放在前面
     * @param recursive 是否递归创建子属性路由
     * @returns {Promise<*>}
     * @private
     */
    _createRbacRoute(result = [], parentRouteName, parentModelName, parentDisName, outFieldParentName, properties, parentProp, routePath, actionsList, arrayLevel, parentOutFields) {
        // if properties have one unique field, will use it as path param
        let parIdField = null
        let parIdProp = null
        const parIsObjArray = !!(parentProp && parentProp.prop_type === Constants.API_FIELD_TYPE['array-of-object'])
        for (const property of properties) {
            if (property && property.unique) {
                parIdField = property.name
                parIdProp = property
                // 如果有不是 id 的unique 字段，优先使用
                if (parIdField !== 'id') {
                    break
                }
            }
        }

        if (!parIdField) {
            // sub object needn't
            if (parentProp === null || parIsObjArray) {
                parIdField = 'id'
            }
        }

        if (!outFieldParentName) {
            parentOutFields = []
        }

        // 数组 id 输出来，便于在查询子对象列表和详情时按 id 获取到子对象
        if (parIdField && parIsObjArray && parentProp.output_flag_mod !== 0) {
            let parentHasOutput = false
            let parentField = outFieldParentName

            while (parentField) {
                if (parentOutFields.find(p => p.name === parentField)) {
                    parentHasOutput = true
                    break
                }

                const pos = parentField.lastIndexOf('.')
                if (pos < 0) {
                    break
                }
                parentField = parentField.substring(0, pos)
            }

            if (!parentHasOutput) {
                parentOutFields.push({
                    name: outFieldParentName ? `${outFieldParentName}.${parIdField}` : parIdField,
                    type: parentProp ? parIdProp.prop_type : Constants.API_FIELD_TYPE.objectId,
                    description: parIdProp ? parIdProp.description || '' : ''
                })
            }
        }

        for (const property of properties) {
            if (/* recursive */ property && property.properties && property.properties.length > 0 && property.name) {
                let subArrayLevel = arrayLevel
                const isObjArray = !!(property.prop_type === Constants.API_FIELD_TYPE['array-of-object'])
                if (isObjArray) {
                    subArrayLevel++
                    if (subArrayLevel > 1) {
                        // logger.info(`[${parentModelName}.${property.name}] NESTED array prop, will not support generate default route`)
                        continue
                    }
                }

                const subRouteActions = this.getDefaultRouteActions(property)
                // 子属性必须配置了 route_conf 或属性数 > 0
                const hasSubRoute = !!(subRouteActions && subRouteActions.length > 0)

                // no unique field, will not create any route
                let hasUniqueField = false
                if (!hasSubRoute) {
                    for (const p of property.properties) {
                        if (p && p.unique) {
                            hasUniqueField = true
                            break
                        }
                    }
                }

                if (hasSubRoute || hasUniqueField || isObjArray || property.prop_type === Constants.API_FIELD_TYPE.object) {
                    let parRoutePath = routePath
                    if (!parRoutePath.endsWith('/')) {
                        parRoutePath += '/'
                    }

                    if (parIdField) {
                        // avoid user-user_id
                        // if (parIdField.indexOf('_') > 0) {
                        //     const idFields = parIdField.split('_')
                        //     const lastRouteName = _.last(parentRouteName.split('_'))
                        //     if (lastRouteName === idFields[0]) {
                        //         parIdField = idFields[1]
                        //     }
                        // }

                        if (parentRouteName.toLowerCase() === parIdField) {
                            parRoutePath += `:${parIdField}/`
                        } else {
                            parRoutePath += `:${parentRouteName.toLowerCase()}_${parIdField}/`
                        }
                    }

                    const subRoutePath = parRoutePath + property.name.toLowerCase()

                    // only array type has create route for sub property
                    if (property.prop_type.indexOf('array') !== 0) {
                        _.remove(subRouteActions, r => r === 'create' || r === 'delete')
                    }

                    // route name
                    let routeName = property.name.toLowerCase()
                    if (property.route_name) {
                        routeName = property.route_name.toLowerCase()
                    }
                    routeName = pluralize(routeName, 1)

                    // out field name
                    const outFieldName = outFieldParentName ? `${outFieldParentName}.${property.name}` : property.name

                    // prettier-ignore
                    this._createRbacRoute(result, routeName, parentModelName + '.' + property.name, parentDisName + property.dis_name,
                        outFieldName,
                        property.properties,
                        property,
                        subRoutePath,
                        subRouteActions,
                        subArrayLevel,
                        _.clone(parentOutFields)
                    )
                }
            }
        }

        // get one
        if (actionsList.includes('detail')) {
            const detailOutFields = [...parentOutFields]
            this.getApiOutFields(detailOutFields, properties, outFieldParentName, true /* 全部输出 */, parIsObjArray ? 1 : 0)

            result.push({
                name: `get${this._getDefFuncName(parentModelName)}Detail`,
                dis_name: `获取${parentDisName}详情`,
                method: Constants.API_HTTP_METHOD.GET,
                path: routePath + (parIdField ? '/:' + parIdField : ''),
                model: parentModelName,
                action: 'detail',
                func: this.detail.bind(this),
                form_data_type: Constants.API_FORM_DATA.NONE,
                in_params: [],
                out_fields: detailOutFields,
                description: '系统默认接口'
            })
        }

        // batch update
        if (actionsList.includes('batch_update') && !parentProp) {
            const idFieldType = parIdProp ? parIdProp.prop_type : Constants.API_FIELD_TYPE.objectId
            const inParams = [
                {
                    name: parIdField,
                    type: `array-of-${idFieldType}`,
                    require: false,
                    description: `如指定了 ${parIdField}，则将 ${parIdField} 关联的所有记录批量更新为 list 参数设置的内容`
                },
                {
                    name: 'data',
                    type: Constants.API_FIELD_TYPE['array-of-object'],
                    require: true,
                    description: `${parentDisName} 对象更新数据列表, 如指定了 ${parIdField}, data 中只需要一个元素，数组元素参数参考${parentDisName} 更新接口`
                }
            ]

            result.push({
                name: `batchUpdate${this._getDefFuncName(parentModelName)}`,
                dis_name: `批量更新${parentDisName}`,
                method: Constants.API_HTTP_METHOD.POST,
                path: routePath + '/batch',
                model: parentModelName,
                action: 'batch_update',
                func: this.batchUpdate.bind(this),
                form_data_type: Constants.API_FORM_DATA['FORM-DATA'],
                in_params: inParams,
                out_fields: [],
                description: '系统默认接口'
            })
        }

        // update
        if (actionsList.includes('update')) {
            const inParams = []
            this.getPostApiInParams(inParams, properties)
            inParams.push({
                name: 'replace',
                type: 'boolean',
                require: false,
                description: 'replace=true 时直接用输入对象替换现有对象，等于false时则合并相关属性(数组除外)，默认为 false'
            })

            result.push({
                name: `update${this._getDefFuncName(parentModelName)}`,
                dis_name: `更新${parentDisName}`,
                method: Constants.API_HTTP_METHOD.POST,
                path: routePath + (parIdField ? '/:' + parIdField : ''),
                model: parentModelName,
                action: 'update',
                func: this.update.bind(this),
                form_data_type: Constants.API_FORM_DATA.JSON,
                in_params: inParams,
                out_fields: [],
                description: '系统默认接口'
            })
        }

        // batch delete
        if (actionsList.includes('batch_delete') && !parentProp) {
            const idFieldType = parIdProp ? parIdProp.prop_type : Constants.API_FIELD_TYPE.objectId
            const inParams = [
                {
                    name: parIdField,
                    type: `array-of-${idFieldType}`,
                    require: true,
                    description: `待删除 ${parIdField} 列表`
                }
            ]

            result.push({
                name: `batchDelete${this._getDefFuncName(parentModelName)}`,
                dis_name: `批量删除${parentDisName}`,
                method: Constants.API_HTTP_METHOD.DELETE,
                path: routePath + '/batch',
                model: parentModelName,
                action: 'batch_delete',
                func: this.batchDelete.bind(this),
                form_data_type: Constants.API_FORM_DATA['FORM-DATA'],
                in_params: inParams,
                out_fields: [],
                description: '系统默认接口'
            })
        }

        // delete
        if (actionsList.includes('delete') && parIdField) {
            result.push({
                name: `delete${this._getDefFuncName(parentModelName)}`,
                dis_name: `删除${parentDisName}`,
                method: Constants.API_HTTP_METHOD.DELETE,
                path: routePath + '/:' + parIdField,
                model: parentModelName,
                action: 'delete',
                func: this.delete.bind(this),
                form_data_type: Constants.API_FORM_DATA['FORM-DATA'],
                in_params: [],
                out_fields: [],
                description: '系统默认接口'
            })
        }

        // create
        if (actionsList.includes('create')) {
            const inParams = []
            this.getPostApiInParams(inParams, properties)
            inParams.forEach(p => {
                p.require = false
            })

            result.push({
                name: `create${this._getDefFuncName(parentModelName)}`,
                dis_name: `创建${parentDisName}`,
                method: Constants.API_HTTP_METHOD.POST,
                path: routePath,
                model: parentModelName,
                action: 'create',
                func: this.create.bind(this),
                form_data_type: Constants.API_FORM_DATA.JSON,
                in_params: inParams,
                out_fields: [],
                description: '系统默认接口'
                // order: order,
            })
        }

        // list many
        if (actionsList.includes('list')) {
            const inParams = []
            this.getQueryApiInParams(inParams, properties)

            // inParams.push({
            //     name: 'select',
            //     type: 'char',
            //     require: false,
            //     description: '指定输出字段，多个字段以空格或逗号间隔，指定字段必须在对象输出字段列表范围内'
            // })

            const listOutFields = [...parentOutFields]
            this.getApiOutFields(listOutFields, properties, outFieldParentName, false, parIsObjArray ? 1 : 0)

            result.push({
                name: `get${this._getDefFuncName(parentModelName)}List`,
                dis_name: `获取${parentDisName}列表`,
                method: Constants.API_HTTP_METHOD.GET,
                path: routePath,
                model: parentModelName,
                action: 'list',
                func: parIsObjArray ? this.detail.bind(this) : this.list.bind(this), // 子对象数组列表查询是查的详情
                form_data_type: Constants.API_FORM_DATA.NONE,
                in_params: inParams,
                out_fields: listOutFields,
                description: '系统默认接口'
            })
        }
    }

    _isSubModel(modelName) {
        return modelName.indexOf('.') > 0
    }

    _convertType(val, propType) {
        if (typeof val === 'string') {
            if (propType && propType !== Constants.API_FIELD_TYPE.char && /[,|]/.test(val)) {
                val = val.split(/[,|]/)
            } else if (val.indexOf('|') > -1) {
                val = val.split('|')
            }
        }

        const isArray = val instanceof Array
        switch (propType) {
            case Constants.API_FIELD_TYPE.date:
                return getDateQueries(val)
            case Constants.API_FIELD_TYPE.number:
                return isArray ? { $in: val.map(v => v / 1) } : val / 1
            case Constants.API_FIELD_TYPE.boolean:
                return val + '' === true
            case Constants.API_FIELD_TYPE.objectId:
                return isArray ? { $in: val.map(v => mongoose.Types.ObjectId(v)) } : mongoose.Types.ObjectId(val)
        }

        return isArray ? { $in: val } : val
    }

    async _checkClearCache(api, context) {
        if (api.model === 'Model') {
            const modelName = _.get(context, ['body', 'name']) || _.get(context, ['req', 'params', 'name'])
            if (modelName) {
                BaseHelper.clearCache('Model', 'Model', modelName)
                logger.info('_checkClearCache, Model cache cleared: ' + modelName)
            }
        } else if (api.model === 'Dictionary') {
            const dictName = _.get(context.params, 'name')
            if (dictName) {
                BaseHelper.clearCache('Dictionary', dictName)
                logger.info('_checkClearCache, dict cache cleared: ' + dictName)
            }
        } else {
            BaseHelper.clearCache('Model', api.model)
        }
    }
}

module.exports = new DefaultApiHandler()
