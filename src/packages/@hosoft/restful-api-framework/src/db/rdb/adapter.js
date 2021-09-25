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
const QueryConverter = require('./query-converter')
const { Sequelize } = require('sequelize')

const JSON_TYPES = [
    Constants.API_FIELD_TYPE.array,
    Constants.API_FIELD_TYPE.mix,
    Constants.API_FIELD_TYPE.object,
    Constants.API_FIELD_TYPE['array-of-object'],
    Constants.API_FIELD_TYPE['array-of-boolean'],
    Constants.API_FIELD_TYPE['array-of-char'],
    Constants.API_FIELD_TYPE['array-of-number'],
    Constants.API_FIELD_TYPE['array-of-objectId']
]

/**
 * adapter for relation database
 */
class RdbAdapter extends Model {
    constructor(modelMeta, nativeModel) {
        super(modelMeta, nativeModel)

        /**
         * check and convert id
         * @param id
         */
        this.getObjectId = (id) => {
            if (!id) {
                return String(mongoose.Types.ObjectId())
            }

            if (typeof id === 'object') {
                return String(id)
            }

            return id
        }

        /**
         * count model
         */
        this.count = async (query, groupBy) => {
            let result

            const dbQuery = this._makeDbQuery(query)
            const queryOptions = {
                where: dbQuery
            }

            if (groupBy) {
                queryOptions.group = groupBy instanceof Array ? groupBy : [groupBy]
                queryOptions.attributes = []
                if (groupBy instanceof Array) {
                    queryOptions.attributes = _.concat(queryOptions.attributes, groupBy)
                } else {
                    queryOptions.attributes.push(groupBy)
                }
                queryOptions.attributes.push([Sequelize.fn('count', Sequelize.col('*')), 'count'])
                queryOptions.raw = true
                result = await nativeModel.findAll(queryOptions)
            } else {
                result = await nativeModel.count(queryOptions)
            }

            return result
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

            const dbQuery = this._makeDbQuery(query)
            const queryOptions = {
                where: dbQuery,
                attributes: QueryConverter.convertOutputFields(selectFields)
            }

            if (options.distinct) {
                let dictinctFields = options.distinct
                if (typeof dictinctFields === 'string') {
                    dictinctFields = [dictinctFields]
                }

                if (!queryOptions.attributes) {
                    queryOptions.attributes = []
                }

                for (const f of dictinctFields) {
                    queryOptions.attributes.push([Sequelize.fn('DISTINCT', Sequelize.col(f)), f])
                }
            }

            if (options.sort) {
                queryOptions.order = QueryConverter.convertOrder(options.sort)
            }
            // keep compatible
            if (options.order) {
                queryOptions.order = QueryConverter.convertOrder(options.order)
            }

            const limit = options.limit
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

            if (limit) {
                queryOptions.limit = limit
            }

            if (skip) {
                queryOptions.offset = skip
            }

            let groupBy = options.group_by
            if (groupBy) {
                const prop = this.getProperty(groupBy)
                if (prop && prop.prop_type === 'date') {
                    groupBy = Sequelize.fn('date_trunc', 'day', Sequelize.col(groupBy))
                }

                queryOptions.group = groupBy
            }

            if (_.get(options, 'lean') !== false) {
                queryOptions.raw = true
            }

            if (options.paginate || options.page) {
                const dbResult = await nativeModel.findAndCountAll(queryOptions)

                const total = dbResult.count
                const pageSize = options.limit || Constants.PAGE_SIZE
                const current = options.page || 1
                const pages = Math.ceil(total / pageSize)

                const dataList = dbResult.rows
                if (dataList && dataList.length > 0) {
                    for (const row of dataList) {
                        this._removeUnwantedFields(row, this.meta)
                    }
                }

                result = {
                    pagination: {
                        total: total,
                        pageSize: pageSize,
                        pages: pages,
                        current: current,
                        prev: current > 1 ? current - 1 : undefined,
                        next: current + 1 <= pages ? current + 1 : undefined
                    },
                    list: dataList
                }
            } else {
                result = await nativeModel.findAll(queryOptions)
                if (result && result.length > 0) {
                    for (const row of result) {
                        this._removeUnwantedFields(row, this.meta)
                    }
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
                const queryOptions = {
                    where: dbQuery,
                    attributes: QueryConverter.convertOutputFields(selectFields)
                }

                if (_.get(options, 'lean') !== false) {
                    queryOptions.raw = true
                }

                result = await nativeModel.findOne(queryOptions)
            } catch (ex) {
                logger.error('findOne exception: ' + ex.message + ', ' + ex.stack)
                return Promise.reject({ message: ex.message || ex.toString(), code: ErrorCodes.GENERAL_ERR_QUERY_FAIL })
            }

            if (result) {
                this._removeUnwantedFields(result, this.meta)
            }

            return result
        }

        /**
         * create model
         * @param inputData object data
         */
        this.create = async (inputData, options) => {
            try {
                this.makeId(inputData, '', true)
                const newModel = await this.nativeModel.create(inputData, options)
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

        this.createSub = async (propName, query, inputData, options) => {
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

            // equals for objectId
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
                existRecord.changed(propPath.split('.')[0], true)
                await existRecord.save(options)
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
        this.update = async (query, inputData, options) => {
            if (_.isEmpty(query) && !_.get(options, 'force')) {
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
                    let result = await existRecord.save(options)
                    result = _.get(result, '_changed') || {}

                    const { name } = this.getIdField('')
                    return { [name]: existRecord[name], result }
                } else {
                    const dbQuery = this._makeDbQuery(query)
                    const updatedCount = await this.nativeModel.update(inputData, { where: dbQuery }, options)
                    return { nModified: updatedCount[0] }
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
        this.updateSub = async (propName, query, inputData, options) => {
            try {
                const records = await this.find(query, { lean: false })
                if (records.length === 0) {
                    return Promise.reject({
                        message: 'record not find:' + this.name,
                        code: ErrorCodes.GENERAL_ERR_NOT_FOUND
                    })
                } else if (records.length > 1) {
                    return Promise.reject({
                        message: 'find more than one matched records, please check query condition',
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

                existRecord.changed(propPath.split('.')[0], true)
                await existRecord.save(options)

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
         * TODO: update 和 updateMany 这块不清楚，update 还做了更新多个的事情
         */
        this.updateMany = async (dataList, options) => {
            const idField = this.getIdField('')
            if (!idField) {
                return Promise.reject({
                    message: 'model has no id field: ' + this.name,
                    code: ErrorCodes.GENERAL_ERR_UPDATE_FAIL
                })
            }

            const result = []
            const { name } = idField

            for (const row of dataList) {
                if (!(row[name] && row.data)) {
                    logger.warn('updateMany, invalid data: ' + JSON.stringify(row))
                    continue
                }

                this.nativeModel.update(row.data, { where: { [name]: row[name] } }, options)
                result.push(row[name])
            }

            return result
        }

        /**
         * delete model
         */
        this.delete = async (query, options) => {
            try {
                const { name } = this.getIdField('')
                if (!(name && query[name])) {
                    return Promise.reject({ message: 'invalid input', code: ErrorCodes.GENERAL_ERR_PARAM })
                }

                const dbQuery = this._makeDbQuery(query)
                const deletedCount = await nativeModel.destroy({ where: dbQuery }, options)
                return { [name]: query[name], deletedCount }
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
        this.deleteSub = async (subModel, query, options) => {
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
            const { name } = this.getIdField(propPath)
            const subId = query[`${propPath}.${name}`]

            _.remove(subRecord, (p) => (p[name].equals ? p[name].equals(subId) : p[name] === subId))

            try {
                existRecord.changed(propPath.split('.')[0], true)
                await existRecord.save(options)

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
        this.deleteMany = async (query, options) => {
            try {
                if (_.isEmpty(query) && !_.get(options, 'force')) {
                    return Promise.reject({
                        message: 'unsafe delete, please set force=true if you really want',
                        code: ErrorCodes.GENERAL_ERR_DELETE_FAIL
                    })
                }

                const dbQuery = this._makeDbQuery(query)
                const deletedCount = await nativeModel.destroy({ where: dbQuery }, options)
                return { query: query, deletedCount }
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
         * sync model with database after model schema updated by admin
         * @param query
         * @returns {Promise<void>}
         */
        this.sync = async (query) => {
            return nativeModel.sync({ force: false, alter: true })
        }

        /**
         * 2 is for rdb
         */
        this.getDbType = () => 2
    }

    _removeUnwantedFields(result, modelMeta) {
        for (const prop of modelMeta.properties) {
            const propVal = result[prop.name]
            if (propVal == undefined) {
                continue
            }

            if (!prop.output_flag_mod) {
                delete result[prop.name]
            } else if (prop.properties && prop.properties.length > 0) {
                if (propVal instanceof Array) {
                    for (const v of propVal) {
                        if (v && typeof propVal !== 'object') {
                            break
                        }
                        this._removeUnwantedFields(v, prop)
                    }
                } else if (typeof propVal === 'object') {
                    this._removeUnwantedFields(propVal, prop)
                }
            }
        }
    }

    _makeDbQuery(query) {
        if (!query) {
            return {}
        }

        const dbQuery = {}
        for (const propPath in this._propertyList) {
            if (query[propPath] !== undefined) {
                const parts = propPath.split('.')

                let hasArray = false
                let curPath = parts[0]
                let prop = this._propertyList[curPath]

                if (JSON_TYPES.includes(prop.prop_type)) {
                    let queryPath = curPath + '->"$'
                    if (prop.prop_type.indexOf('array') > -1) {
                        queryPath += '[*]'
                        hasArray = true
                    }

                    for (let i = 1; i < parts.length; i++) {
                        curPath += '.' + parts[i]
                        prop = this._propertyList[curPath]
                        queryPath += '.' + prop.name
                        if (prop.prop_type.indexOf('array') > -1) {
                            queryPath += '[*]'
                            hasArray = true
                        }
                    }

                    queryPath += '"'

                    // now is last prop
                    if (!dbQuery.$and) {
                        dbQuery.$and = []
                    }

                    const queryData = InputConverter.convertData(query[propPath], prop.prop_type)
                    if (prop.prop_type.indexOf('array') > -1) {
                        dbQuery.$and.push(
                            Sequelize.literal(`json_contains(${queryPath}, '${queryData.replace("'", "\\'")}')`)
                        )
                    } else if (hasArray) {
                        dbQuery.$and.push(
                            Sequelize.literal(
                                `json_search(${queryPath}, 'one', '${queryData.replace("'", "\\'")}') is not null`
                            )
                        )
                    } else if (
                        prop.prop_type === Constants.API_FIELD_TYPE.number ||
                        prop.prop_type === Constants.API_FIELD_TYPE.boolean
                    ) {
                        dbQuery.$and.push(Sequelize.literal(`${queryPath} = ${queryData}`))
                    } else {
                        dbQuery.$and.push(Sequelize.literal(`${queryPath} = '${queryData.replace("'", "\\'")}'`))
                    }
                } else {
                    dbQuery[propPath] = InputConverter.convertData(query[propPath], prop.prop_type)
                }
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

module.exports = RdbAdapter
