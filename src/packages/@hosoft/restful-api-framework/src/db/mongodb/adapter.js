/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/07/01
 **/
const _ = require('lodash')
const Constants = require('../../base/constants/constants')
const ErrorCodes = require('../../base/constants/error-codes')
const InputConverter = require('../common/input-converter')
const Model = require('../../models/Model')
const mongoose = require('mongoose')

/**
 * mongoose adapter
 */
class MongoAdapter extends Model {
    constructor(modelMeta, nativeModel) {
        super(modelMeta, nativeModel)

        /**
         * check and convert id
         * @param id
         */
        this.getObjectId = (id) => {
            if (id) {
                return typeof id === 'string' ? mongoose.Types.ObjectId(id) : id
            } else {
                return mongoose.Types.ObjectId()
            }
        }

        /**
         * count model
         */
        this.count = async (query) => {
            const countQuery = [{ $match: query }]
            const groupByQuery = { _id: 1, count: { $sum: 1 } }
            const groupBy = query.group_by

            let propModel = null
            if (groupBy) {
                delete query.group_by

                let subProperty = modelMeta
                let curPath = ''
                const routePaths = groupBy.split('.')

                for (let i = 0; i < routePaths.length; i++) {
                    if (curPath) {
                        curPath += '.'
                    }

                    subProperty = subProperty.properties.find((item) => item.name === routePaths[i])
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
                // TODO: sub model count
                const outField = { $project: { _id: 0, count: 1 } }
                outField.$project[propModel.name] = '$_id'
                countQuery.push(outField)

                return nativeModel.aggregate(countQuery)
            } else {
                const data = await nativeModel.aggregate(countQuery)
                return data.length > 0 ? data[0].count : 0
            }
        }

        /**
         * find model list by given query condition
         * @param query
         */
        this.find = async (query, options, selectFields) => {
            let result

            if (!options) {
                options = {}
            }

            if (!selectFields) {
                selectFields = {}
            }

            const dbQuery = this._makeDbQuery(query)

            // aggregate query
            if (options.aggregate_query) {
                const dataAggregate = []

                if (options.sort) {
                    dataAggregate.push({ $sort: options.sort })
                }

                const limit = options.limit || Constants.PAGE_SIZE
                let skip = 0
                if (options.page) {
                    if (options.offset) {
                        skip = options.offset
                    } else {
                        skip = (options.page - 1) * limit
                    }
                } else if (options.offset) {
                    skip = options.offset
                }

                dataAggregate.push({ $limit: skip + limit })
                dataAggregate.push({ $skip: skip })

                const aggregateQuery = [{ $match: dbQuery }, { $project: selectFields }]
                let groupBy = options.group_by

                if (groupBy) {
                    // TODO: 更多统计方法
                    const outFields = { _id: 0, count: '$count' }
                    outFields[groupBy] = '$_id'

                    const prop = this.getProperty(groupBy)
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

                result = (await nativeModel.aggregate(aggregateQuery))[0]
                if (!result || result.list.length === 0) {
                    return result
                }

                const total = result.pagination[0].total
                const pageSize = options.limit || Constants.PAGE_SIZE
                const current = options.page || 1
                const pages = Math.ceil(total / pageSize)

                result.pagination = {
                    total: total,
                    pageSize: pageSize,
                    pages: pages,
                    current: current,
                    next: Math.min(current + 1, pages)
                }
            } else if (options.paginate || options.page) {
                const dbOptions = { ...options, select: selectFields }
                dbOptions.lean = dbOptions.lean !== false

                // query DB
                result = await nativeModel.paginate(dbQuery, dbOptions)
                if (!result || result.list.length === 0) {
                    return result
                }
            } else {
                if (options.distinct) {
                    result = nativeModel.distinct(options.distinct, dbQuery)
                } else {
                    result = nativeModel.find(dbQuery, selectFields)
                }

                if (options.limit) {
                    result = result.limit(options.limit)
                }

                if (options.sort) {
                    result = result.sort(options.sort)
                }

                if (options.lean !== false) {
                    result = result.lean()
                }
            }

            return result
        }

        /**
         * find model detail
         */
        this.findOne = async (query, options, selectFields) => {
            let result = null

            try {
                const dbQuery = this._makeDbQuery(query)

                if (!options) {
                    options = {}
                }

                if (!selectFields) {
                    selectFields = {}
                }

                if (options.lean !== false) {
                    result = await nativeModel.findOne(dbQuery, selectFields).lean()
                } else {
                    result = await nativeModel.findOne(dbQuery, selectFields)
                }
            } catch (ex) {
                logger.error('findOne exception: ' + ex.message + ', ' + ex.stack)
                return Promise.reject({ message: ex.message || ex.toString(), code: ErrorCodes.GENERAL_ERR_QUERY_FAIL })
            }

            return result
        }

        /**
         * create model
         * @param inputData object data
         */
        this.create = async (inputData) => {
            try {
                this.makeId(inputData, '', true)
                const newModel = await this.nativeModel.create(inputData)
                const { name } = this.getIdField('')

                return { [name]: newModel[name] }
            } catch (ex) {
                logger.error('create exception: ' + ex.message + ', ' + ex.stack)
                return Promise.reject({
                    message: ex.message || ex.toString(),
                    code: ErrorCodes.GENERAL_ERR_CREATE_FAIL
                })
            }
        }

        this.createSub = async (propName, query, inputData) => {
            const existRecord = await this.findOne(query, { lean: false })
            if (!existRecord) {
                return Promise.reject({ message: 'record not found', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
            }

            const subModel = this.getProperty(propName)
            this.makeId(inputData, subModel, true)

            const idField = this.getIdField('')
            if (!(idField && existRecord[idField.name])) {
                return Promise.reject({ message: 'invalid input', code: ErrorCodes.GENERAL_ERR_PARAM })
            }

            const modelNames = propName.split('.')
            const propPath = propName.substr(this.name.length + 1)

            // create modelMeta property
            let subRecord = existRecord
            for (let i = 1; i < modelNames.length; i++) {
                subRecord = subRecord[modelNames[i]]
            }

            if (!(subRecord instanceof Array)) {
                return Promise.reject({ message: 'property is not an array', code: ErrorCodes.GENERAL_ERR_PARAM })
            }

            const { name } = this.getIdField(propPath)

            // TODO: object id equals
            if (
                subRecord.find((r) => (r[name].equals ? r[name].equals(inputData[name]) : r[name] === inputData[name]))
            ) {
                return Promise.reject({
                    message: `${name} with ${inputData[name]} already exist`,
                    code: ErrorCodes.GENERAL_ERR_EXIST
                })
            }

            // push new child to the array
            subRecord.push(inputData)

            try {
                await existRecord.save()
                return {
                    [idField.name]: existRecord[idField.name],
                    [`${propPath}.${name}`]: inputData[name]
                }
            } catch (ex) {
                logger.error('createSub exception: ' + ex.message + ', ' + ex.stack)
                return Promise.reject({
                    message: ex.message || ex.toString(),
                    code: ErrorCodes.GENERAL_ERR_CREATE_FAIL
                })
            }
        }

        /**
         * update model record
         */
        this.update = async (query, inputData, force) => {
            if (_.isEmpty(query) && !force) {
                return Promise.reject({
                    message: 'unsafe update, please set force=true if you really want',
                    code: ErrorCodes.GENERAL_ERR_DELETE_FAIL
                })
            }

            try {
                const replace = query.replace || inputData.replace
                delete query.replace
                delete inputData.replace

                if (replace) {
                    const existRecord = await this.findOne(query, { lean: false })
                    if (!existRecord) {
                        return Promise.reject({
                            message: 'record not find:' + this.name,
                            code: ErrorCodes.GENERAL_ERR_NOT_FOUND
                        })
                    }

                    this._setObjectProps(this, existRecord, inputData, true)
                    const result = await existRecord.save()

                    const { name } = this.getIdField('')
                    return { [name]: existRecord[name], result }
                } else {
                    return this.nativeModel.updateMany(query, { $set: inputData })
                }
            } catch (ex) {
                logger.error('update exception: ' + ex.message + ', ' + ex.stack)
                return Promise.reject({
                    message: ex.message || ex.toString(),
                    code: ErrorCodes.GENERAL_ERR_UPDATE_FAIL
                })
            }
        }

        /**
         * update model sub record
         */
        this.updateSub = async (propName, query, inputData) => {
            try {
                const records = await this.find(query, { lean: false })
                if (records.length === 0) {
                    return Promise.reject({
                        message: 'record not find:' + this.name,
                        code: ErrorCodes.GENERAL_ERR_NOT_FOUND
                    })
                } else if (records.length > 1) {
                    return Promise.reject({
                        message: 'find more than one match records, please check query condition: ' + this.name,
                        code: ErrorCodes.GENERAL_ERR_UPDATE_FAIL
                    })
                }

                const existRecord = records[0]
                const idField = this.getIdField('')
                if (!(idField && existRecord[idField.name])) {
                    return Promise.reject({ message: 'invalid input', code: ErrorCodes.GENERAL_ERR_PARAM })
                }

                const propPath = propName.substr(this.name.length + 1)
                const property = this.getProperty(propPath)
                const replace = query.replace !== undefined ? !!query.replace : !!inputData.replace
                delete inputData.replace

                const subRecord = this.getObjectProp(existRecord, propName, query)
                this._setObjectProps(property, subRecord, inputData, replace)
                await existRecord.save()

                // const { name } = this.getIdField(propPath)
                // const subIdName = name ? `${propPath}.${name}` : propPath

                return {
                    [idField.name]: existRecord[idField.name],
                    ...query
                }
            } catch (ex) {
                logger.error('updateSub exception: ' + ex.message + ', ' + ex.stack)
                return Promise.reject({
                    message: ex.message || ex.toString(),
                    code: ErrorCodes.GENERAL_ERR_UPDATE_FAIL
                })
            }
        }

        /**
         * batch update model records
         */
        this.updateMany = async (dataList) => {
            const bulkOperate = this._native.collection.initializeOrderedBulkOp()
            const idField = this.getIdField('')
            if (!idField) {
                return Promise.reject({
                    message: 'model has no id field: ' + this.name,
                    code: ErrorCodes.GENERAL_ERR_UPDATE_FAIL
                })
            }

            const result = []
            const { name, type } = idField

            for (const row of dataList) {
                if (!(row[name] && row.data)) {
                    logger.warn('updateMany, invalid data: ' + JSON.stringify(row))
                    continue
                }

                const query = { [name]: InputConverter.convertData(row[name], type, true) }
                bulkOperate.find(query).updateOne({ $set: row.data })
                result.push(row[name])
            }

            await bulkOperate.execute()
            return result
        }

        /**
         * delete model
         */
        this.delete = async (query) => {
            try {
                const { name } = this.getIdField('')
                if (!(name && query[name])) {
                    return Promise.reject({ message: 'invalid input', code: ErrorCodes.GENERAL_ERR_PARAM })
                }

                const result = await nativeModel.deleteOne(query)
                return { [name]: query[name], ...result }
            } catch (ex) {
                logger.error('delete exception: ' + ex.message + ', ' + ex.stack)
                return Promise.reject({
                    message: ex.message || ex.toString(),
                    code: ErrorCodes.GENERAL_ERR_DELETE_FAIL
                })
            }
        }

        /**
         * delete model sub record
         */
        this.deleteSub = async (subModel, query) => {
            const existRecord = await this.findOne(query, { lean: false })
            if (!existRecord) {
                return Promise.reject({ message: 'record not found', code: ErrorCodes.GENERAL_ERR_DELETE_FAIL })
            }

            const idField = this.getIdField('')
            if (!(idField && existRecord[idField.name])) {
                return Promise.reject({ message: 'invalid input', code: ErrorCodes.GENERAL_ERR_PARAM })
            }

            let propPath = subModel

            const modelNamePrefix = `${this._meta.name}.`
            if (propPath.indexOf(modelNamePrefix) === 0) {
                propPath = propPath.substr(modelNamePrefix.length)
            }

            const subRecord = this.getObjectProp(existRecord, propPath)
            const { name, type } = this.getIdField(propPath)
            const subId = query[`${propPath}.${name}`]

            // TODO: object id equals
            if (type === Constants.API_FIELD_TYPE.objectId) {
                _.remove(subRecord, (p) => p[name].equals(subId))
            } else {
                _.remove(subRecord, (p) => p[name] === subId)
            }

            try {
                existRecord.markModified(propPath)
                await existRecord.save()

                return {
                    [idField.name]: existRecord[idField.name],
                    [`${propPath}.${name}`]: subId
                }
            } catch (ex) {
                logger.error('deleteSub exception: ' + ex.message + ', ' + ex.stack)
                return Promise.reject({
                    message: ex.message || ex.toString(),
                    code: ErrorCodes.GENERAL_ERR_DELETE_FAIL
                })
            }
        }

        /**
         * batch delete model
         */
        this.deleteMany = async (query, force) => {
            try {
                if (_.isEmpty(query) && !force) {
                    return Promise.reject({
                        message: 'unsafe delete, please set force=true if you really want',
                        code: ErrorCodes.GENERAL_ERR_DELETE_FAIL
                    })
                }

                const result = await nativeModel.deleteMany(query)
                return { query: query, ...result }
            } catch (ex) {
                logger.error('deleteMany exception: ' + ex.message + ', ' + ex.stack)
                return Promise.reject({
                    message: ex.message || ex.toString(),
                    code: ErrorCodes.GENERAL_ERR_DELETE_FAIL
                })
            }
        }

        /**
         * aggregate query
         * @param query
         * @returns {Promise<void>}
         */
        this.aggregate = async (query) => {
            return nativeModel.aggregate(query)
        }

        /**
         * 1 is for mongodb
         */
        this.getDbType = () => 1
    }

    _makeDbQuery(query) {
        if (!query) {
            return {}
        }

        const dbQuery = {}
        for (const propPath in this._propertyList) {
            if (query[propPath] !== undefined) {
                const prop = this._propertyList[propPath]
                dbQuery[propPath] = InputConverter.convertData(query[propPath], prop.prop_type, true)
            }
        }

        return dbQuery
    }

    _setObjectProps(subModel, recordObj, inputObj, replace) {
        if (!inputObj) return

        for (const prop of subModel.properties) {
            const queryKey = prop.name // parentName ? parentName + '.' + prop.name : prop.name

            if (replace === true) {
                // sub prop ignore unique
                if (
                    (prop.input_flag !== 2 || inputObj[queryKey]) &&
                    (!prop.unique || (prop.array_level > 0 && inputObj[queryKey]))
                ) {
                    recordObj[prop.name] = inputObj[queryKey]
                }
            } else if (prop.properties && prop.properties.length > 0 && prop.prop_type.indexOf('array') < 0) {
                const subModel = recordObj[prop.name]
                if (subModel) {
                    this._setObjectProps(prop, subModel, inputObj[queryKey], replace)
                }
            } else if (inputObj[queryKey] !== undefined) {
                if (prop.prop_type.indexOf('array') < 0 || inputObj[queryKey] instanceof Array) {
                    recordObj[prop.name] = inputObj[queryKey]
                }
            }
        }
    }
}

module.exports = MongoAdapter
