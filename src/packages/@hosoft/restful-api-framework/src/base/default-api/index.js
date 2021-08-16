/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/

const _ = require('lodash')
const CommUtils = require('../../utils/common')
const pluralize = require('pluralize')
const { BaseHelper, DbHelper, InputValidator } = require('../../base/helpers')
const { Constants, ErrorCodes } = require('../../base')

const queryOptionsKeys = ['sort', 'group_by', 'aggregate_query', 'select', 'lean']
const paginateKeys = ['page', 'page_size', 'limit', 'offset']

/**
 * default CRUD api generator
 */
class DefaultApiHandler {
    /**
     * create default routes for model CRUD operate
     */
    createDefaultRoutes(modelPath, actions) {
        const model = BaseHelper.getContainer().getModel(modelPath)
        if (!model) {
            logger.error('createDefaultRoutes model object definition not found: ' + modelPath)
            process.exit()
        }

        const route = model.getRoutePath(model)
        if (!route) return null

        const newApis = []
        this._createCrudRoute(
            newApis,
            route.routeName,
            model.name,
            model.meta.dis_name,
            '',
            [],
            model,
            model.properties,
            route.path,
            actions,
            modelPath
        )

        return newApis.filter((api) => api.model === modelPath)
    }

    getCommonQueryKeys() {
        return [...queryOptionsKeys, ...paginateKeys]
    }

    /**
     * model default list api
     */
    async list(context) {
        const api = context.apiRoute.api
        const model = BaseHelper.getModel(api.model)
        if (!model) {
            logger.error('DAH list, model not found: ' + api.model)
            return Promise.reject({ message: `invalid model ${api.model}`, code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        // get query options
        const options = { paginate: true }
        for (const key of queryOptionsKeys) {
            if (context.query[key]) {
                options[key] = context.query[key]
                delete context.query[key]
            }
        }

        for (const key of paginateKeys) {
            if (context.query[key]) {
                options[key === 'page_size' ? 'limit' : key] = context.query[key] / 1
                delete context.query[key]
            }
        }

        // get route params
        const query = await this.getRouteQueryParams(context, api)
        const params = context.query || {}
        const dbQuery = { ...query }

        for (const param of api.in_params) {
            if (params[param.name]) {
                if (param.flag === Constants.API_IN_PARAM_FLAG.FUZZY && params[param.name]) {
                    dbQuery[param.name] = new RegExp((params[param.name] + '').replace(/\*/g, '.*'), 'i')
                } else {
                    dbQuery[param.name] = this._convertValue(params[param.name])
                }
            }
        }

        // hook api
        const container = BaseHelper.getContainer()
        if (dbQuery.count_only) {
            if (
                (await container.executeHook('beforeDbProcess', context, api, dbQuery, options)) ===
                Constants.HOOK_RESULT.RETURN
            ) {
                return 'hooked'
            }

            return model.count(api, dbQuery)
        }

        const outFields = _.transform(api.out_fields, (obj, f) => (obj[f.name] = 1), {})
        const selectFields = model.getOutFields(options, outFields)

        if (
            (await container.executeHook('beforeDbProcess', context, api, dbQuery, options, selectFields)) ===
            Constants.HOOK_RESULT.RETURN
        ) {
            return 'hooked'
        }

        const populateFields = []
        for (const selField in selectFields) {
            if (!selField.startsWith('_') && selectFields[selField] === 1) {
                populateFields.push(selField)
            }
        }

        const result = await model.find(dbQuery, options, selectFields)
        return await DbHelper.populateModel(result, model, populateFields)
    }

    /*
     * model default api to get a record detail
     */
    async detail(context) {
        const api = context.apiRoute.api
        const model = BaseHelper.getModel(api.model)
        if (!model) {
            logger.error('DAH detail, model not found: ' + api.model)
            return Promise.reject({ message: `invalid model ${api.model}`, code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        // get route params
        const query = await this.getRouteQueryParams(context, api)
        const dbQuery = { ...context.query, ...query }
        const outFields = _.transform(api.out_fields, (obj, f) => (obj[f.name] = 1), {})
        const selectFields = model.getOutFields(context.query, outFields)

        const container = BaseHelper.getContainer()
        if (
            (await container.executeHook('beforeDbProcess', context, api, dbQuery, selectFields)) ===
            Constants.HOOK_RESULT.RETURN
        ) {
            return 'hooked'
        }

        let result = await model.findOne(dbQuery, null, selectFields)
        if (!result) return null

        const populateFields = []
        for (const selField in selectFields) {
            if (!selField.startsWith('_') && selectFields[selField] === 1) {
                populateFields.push(selField)
            }
        }

        result = await DbHelper.populateModel(result, model, populateFields)

        // sub model
        if (this._isSubModel(api.model)) {
            result = model.getObjectProp(result, api.model, dbQuery)
        }

        return result
    }

    /*
     * model default create api
     */
    async create(context) {
        const api = context.apiRoute.api
        const model = BaseHelper.getModel(api.model)
        if (!model) {
            logger.error('DAH create, model not found: ' + api.model)
            return Promise.reject({ message: `invalid model ${api.model}`, code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const query = await this.getRouteQueryParams(context, api)
        const dbQuery = { ...context.query, ...query }
        const container = BaseHelper.getContainer()

        let result
        if (this._isSubModel(api.model)) {
            const inputObj = context.body
            const subModel = model.getProperty(api.model)

            const validateResult = await InputValidator.validateInputFields(subModel, inputObj, true)
            if (validateResult.hasError) {
                const errMessages = InputValidator.getInvalidFieldmessage(validateResult)
                return Promise.reject({
                    message: 'create model array element error: ' + errMessages.join('\r\n'),
                    code: ErrorCodes.GENERAL_ERR_PARAM
                })
            }

            if (
                (await container.executeHook('beforeDbProcess', context, api, dbQuery, inputObj)) ===
                Constants.HOOK_RESULT.RETURN
            ) {
                return 'hooked'
            }

            result = await model.createSub(api.model, dbQuery, inputObj)
        } else {
            const inputObj = context.body

            // validate input data
            const validateResult = await InputValidator.validateInputFields(model, inputObj, true)
            if (validateResult.hasError) {
                const errmessages = InputValidator.getInvalidFieldmessage(validateResult)
                return Promise.reject({
                    message: 'create record failed: ' + errmessages.join('\r\n'),
                    code: ErrorCodes.GENERAL_ERR_PARAM
                })
            }

            if (
                (await container.executeHook('beforeDbProcess', context, api, dbQuery, inputObj)) ===
                Constants.HOOK_RESULT.RETURN
            ) {
                return 'hooked'
            }

            if (model.meta.timestamp === true) {
                inputObj.created_at = new Date()
            }

            // fill id field
            result = await model.create(inputObj)
        }

        if (!api.model.toLowerCase().endsWith('log')) {
            logger.persist(`DAH create, new record created ${api.model} [${JSON.stringify(result)}]`)
        }

        await this._checkClearCache(api, context)
        return result
    }

    /*
     * model default update api
     */
    async update(context) {
        const api = context.apiRoute.api
        const inputObj = context.body
        if (!(inputObj && typeof inputObj === 'object')) {
            return Promise.reject({ message: 'invalid input data', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const model = BaseHelper.getModel(api.model)
        if (!model) {
            logger.error('DAH update, model not found: ' + api.model)
            return Promise.reject({ message: `invalid model ${api.model}`, code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const query = await this.getRouteQueryParams(context, api)
        const dbQuery = { ...context.query, ...query }
        if (Object.keys(dbQuery).length === 0) {
            return Promise.reject({ message: 'invalid request', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        let result
        const container = BaseHelper.getContainer()

        if (this._isSubModel(api.model)) {
            const subModel = model.getProperty(api.model)

            // for update action, will not check require fields
            const validateResult = await InputValidator.validateInputFields(subModel, inputObj, false)
            if (validateResult.hasError) {
                const errMessages = InputValidator.getInvalidFieldmessage(validateResult)
                return Promise.reject({ message: errMessages.join('\r\n'), code: ErrorCodes.GENERAL_ERR_PARAM })
            }

            if (
                (await container.executeHook('beforeDbProcess', context, api, dbQuery, inputObj)) ===
                Constants.HOOK_RESULT.RETURN
            ) {
                return 'hooked'
            }

            result = await model.updateSub(api.model, dbQuery, inputObj)
        } else {
            const validateResult = await InputValidator.validateInputFields(model, inputObj, false)
            if (validateResult.exist_record) {
                validateResult.exist = InputValidator.getDuplicateField(
                    model,
                    inputObj,
                    validateResult.exist_record,
                    inputObj,
                    0
                )
                validateResult.hasError = validateResult.exist !== null
            }

            if (validateResult.hasError) {
                const errMessages = InputValidator.getInvalidFieldmessage(validateResult)
                return Promise.reject({ message: errMessages.join('\r\n'), code: ErrorCodes.GENERAL_ERR_PARAM })
            }

            if (
                (await container.executeHook('beforeDbProcess', context, api, dbQuery, inputObj)) ===
                Constants.HOOK_RESULT.RETURN
            ) {
                return 'hooked'
            }

            result = await model.update(dbQuery, inputObj)
        }

        if (!api.model.toLowerCase().endsWith('log')) {
            logger.persist(`DAH update, record updated ${api.model} [${JSON.stringify(result)}]`)
        }

        await this._checkClearCache(api, context)
        return result
    }

    /**
     * model default batch update api, batch update api support
     *   both update multiple documents properties with same input data,
     *   or batch update more than one individual documents.
     */
    async batchUpdate(context) {
        const api = context.apiRoute.api
        const model = BaseHelper.getModel(api.model)
        if (!model) {
            logger.error('DAH batch update, model not found: ' + api.model)
            return Promise.reject({ message: `invalid model ${api.model}`, code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const inputData = _.get(context, ['body', 'data'])
        if (typeof inputData !== 'object') {
            return Promise.reject({ message: 'invalid input data', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const { name } = model.getIdField('')
        const idsList = context.body[name]
        const container = BaseHelper.getContainer()

        const batchUpdateRecordsWithSameInfo = async (ids, inputObj) => {
            if (inputObj instanceof Array) {
                if (inputObj.length === 0) {
                    return Promise.reject({ message: `data not set`, code: ErrorCodes.GENERAL_ERR_PARAM })
                }
                inputObj = inputObj[0]
            }

            delete inputObj[name]

            // const checkRequire = !(api.action === 'update' || api.action === 'batch_update')
            const validateResult = await InputValidator.validateInputFields(model, inputObj, false)
            if (validateResult.hasError) {
                const errMessages = InputValidator.getInvalidFieldmessage(validateResult)
                return Promise.reject({ message: errMessages.join('\r\n'), code: ErrorCodes.GENERAL_ERR_PARAM })
            }

            if (
                (await container.executeHook('beforeDbProcess', context, api, inputObj)) ===
                Constants.HOOK_RESULT.RETURN
            ) {
                return 'hooked'
            }

            const result = await model.update({ [name]: ids }, inputObj)
            if (!api.model.toLowerCase().endsWith('log')) {
                logger.persist(`DAH batch update, ${api.model} [${JSON.stringify(result)}]`)
            }

            await this._checkClearCache(api, context)
            return result
        }

        const batchUpdateRecords = async (idField, inputObjs) => {
            if (!(inputObjs instanceof Array && inputObjs.length > 0)) {
                return Promise.reject({
                    message: `the update data must be an array`,
                    code: ErrorCodes.GENERAL_ERR_PARAM
                })
            }

            const updateRecords = []
            const ids = inputObjs.map((obj) => {
                model.makeId(obj, '', false)
                return obj[idField]
            })

            const existRecords = await model.find({ [idField]: ids })

            for (let i = 0; i < inputObjs.length; i++) {
                const inputObj = inputObjs[i]
                if (!inputObj[idField]) {
                    return Promise.reject({
                        message: `element ${i + 1} doesn't contain ${idField}`,
                        code: ErrorCodes.GENERAL_ERR_PARAM
                    })
                }

                const existRecord = existRecords.find((r) =>
                    r[idField].equals ? r[idField].equals(inputObj[idField]) : r[idField] == inputObj[idField]
                )

                const validateResult = await InputValidator.validateInputFields(model, inputObj, false, existRecord)
                if (validateResult.hasError) {
                    const errMessages = InputValidator.getInvalidFieldmessage(validateResult)
                    return Promise.reject({ message: errMessages.join('\r\n'), code: ErrorCodes.GENERAL_ERR_PARAM })
                }

                updateRecords.push({ id: inputObj[idField], data: inputObj })
            }

            if (
                (await container.executeHook('beforeDbProcess', context, api, updateRecords)) ===
                Constants.HOOK_RESULT.RETURN
            ) {
                return 'hooked'
            }

            const result = await model.updateMany(updateRecords)
            if (!api.model.toLowerCase().endsWith('log')) {
                logger.persist(`DAH batch update, ${api.model} [${JSON.stringify(result)}]`)
            }

            await this._checkClearCache(api, context)
            return result
        }

        if (idsList && idsList instanceof Array && idsList.length > 0) {
            return batchUpdateRecordsWithSameInfo(idsList, inputData)
        } else {
            return batchUpdateRecords(name, inputData)
        }
    }

    /*
     * model default delete api
     */
    async delete(context) {
        const api = context.apiRoute.api
        const model = BaseHelper.getModel(api.model)
        if (!model) {
            logger.error('DAH delete, model not found: ' + api.model)
            return Promise.reject({ message: `invalid model ${api.model}`, code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const query = await this.getRouteQueryParams(context, api)
        const dbQuery = { ...context.query, ...query }
        if (Object.keys(dbQuery).length === 0) {
            return Promise.reject({ message: 'invalid request', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const container = BaseHelper.getContainer()

        let result
        if (this._isSubModel(api.model)) {
            if (
                (await container.executeHook('beforeDbProcess', context, api, dbQuery)) === Constants.HOOK_RESULT.RETURN
            ) {
                return 'hooked'
            }

            result = await model.deleteSub(api.model, dbQuery)
        } else {
            if (
                (await container.executeHook('beforeDbProcess', context, api, dbQuery)) === Constants.HOOK_RESULT.RETURN
            ) {
                return 'hooked'
            }

            result = await model.delete(dbQuery)
        }

        if (!api.model.toLowerCase().endsWith('log')) {
            logger.persist(`DAH delete, ${api.model} [${JSON.stringify(result)}]`)
        }

        await this._checkClearCache(api, context)
        return result
    }

    /**
     * model default batch delete api
     */
    async batchDelete(context) {
        const api = context.apiRoute.api
        const model = BaseHelper.getModel(api.model)
        if (!model) {
            logger.error('DAH batch delete, model not found: ' + api.model)
            return Promise.reject({ message: `invalid model ${api.model}`, code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const { name } = model.getIdField('')
        if (!name) {
            return Promise.reject({
                message: `${model.dis_name} don't support batch delete`,
                code: ErrorCodes.GENERAL_ERR_NOT_SUPPORT
            })
        }

        const idsList = context.$(name)
        if (!(idsList && idsList.length > 0)) {
            return Promise.reject({ message: 'invalid id', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const query = await this.getRouteQueryParams(context, api)
        query[name] = idsList

        if (Object.keys(query).length === 0) {
            return Promise.reject({ message: 'invalid request', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const container = BaseHelper.getContainer()
        if ((await container.executeHook('beforeDbProcess', context, api, query)) === Constants.HOOK_RESULT.RETURN) {
            return 'hooked'
        }

        const result = await model.deleteMany(query)
        if (!api.model.toLowerCase().endsWith('log')) {
            logger.persist(`DAH delete, ${api.model} [${JSON.stringify(result)}]`)
        }

        await this._checkClearCache(api, context)
        return result
    }

    /**
     * get query params from http request
     */
    getRouteQueryParams(context, api) {
        const query = {}
        this._getRouteQueryParamsInner(context, api, query)
        return query
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
            if (
                (prop.properties || []).length === 0 &&
                ![Constants.API_FIELD_TYPE.object, Constants.API_FIELD_TYPE['array-of-object']].includes(prop.prop_type)
            ) {
                let paramFlag = Constants.API_IN_PARAM_FLAG.EXACT

                // any of array element
                if (prop.search_flag === 0) {
                    // not allow to query
                    paramFlag = Constants.API_IN_PARAM_FLAG.NONE
                } else if (prop.search_flag === 3) {
                    paramFlag = Constants.API_IN_PARAM_FLAG.DEFAULT
                } else if (prop.search_flag === 2) {
                    paramFlag = Constants.API_IN_PARAM_FLAG.FUZZY
                }

                const require = 0 // prop.require ? 1 : 0 // optional for list query
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
            if (prop.search_flag !== 0 && prop.properties && prop.properties.length > 0) {
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
            if (
                (prop.properties || []).length === 0 &&
                ![Constants.API_FIELD_TYPE.object, Constants.API_FIELD_TYPE['array-of-object']].includes(prop.prop_type)
            ) {
                let paramFlag = ''

                if (prop.input_flag === 0) {
                    paramFlag = Constants.API_IN_PARAM_FLAG.NONE
                } else if (prop.input_flag === 3) {
                    paramFlag = Constants.API_IN_PARAM_FLAG.DEFAULT
                }

                const require = prop.input_flag === 2 // 2: must input
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
                this.getPostApiInParams(inParams, prop.properties, parentName + prop.name)
            }
        }
    }

    /**
     * get model default output fields according model output_flag setting,
     * the function recursive loop all properties and add all fields which output_flag is 1 or 4.
     *
     * @param parentPath - parent property path like: "general.book_version"
     */
    getModelOutFields(outFields, properties, parentFullPath, selectedAll) {
        if (parentFullPath) {
            parentFullPath = parentFullPath + '.'
        }

        for (const prop of properties) {
            if (!prop || prop.output_flag_mod === 0) {
                continue
            }

            let relField = null

            // TODO: add required, default_val
            const field = {
                name: parentFullPath + prop.name,
                type: prop.prop_type,
                description: prop.dis_name + (prop.description ? ', ' + prop.description : '')
            }

            if (prop.array_level > 0) {
                if (prop.array_level > 1 && parentFullPath) {
                    // TODO: mongo special
                    outFields.push({ name: parentFullPath + '$' })
                    // break; // don't break, need it when subtract fields in sub properties
                }
            } else if (prop.relations) {
                const relType = prop.relations.rel_type / 1
                if (relType === 1) {
                    relField = {
                        name: field.name + '_rel',
                        description: tf('relationData', { dis_name: prop.dis_name }),
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

                    field.rel_fields = null // data set to xxx_rel, original field has no use
                } else if ([2, 3, 4].indexOf(relType) > -1) {
                    field.rel_fields = [prop.relations.name]
                }
            }

            const isOutput = selectedAll
                ? prop.output_flag_mod !== 0
                : prop.output_flag_mod === 1 || prop.output_flag_mod === 4
            if (prop.properties && prop.properties.length > 0 && prop.output_flag_mod !== 4) {
                const isObjArray = prop.prop_type === Constants.API_FIELD_TYPE['array-of-object']
                if ((isObjArray || prop.prop_type === Constants.API_FIELD_TYPE.object) && isOutput) {
                    this.getModelOutFields(outFields, prop.properties, parentFullPath + prop.name, selectedAll)
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
    }

    /************************************************
     * below private functions
     * **********************************************/

    _convertValue(val, type) {
        switch (type) {
            case Constants.API_FIELD_TYPE.char:
                if (typeof val !== 'string') {
                    val = String(val)
                }
                break
            case Constants.API_FIELD_TYPE.number:
                val = val / 1
                break
            case Constants.API_FIELD_TYPE.boolean:
                val = val + '' === 'false' ? false : !!(val + '')
                break
            // let adapter convert it
            // case Constants.API_FIELD_TYPE.date:
            // case Constants.API_FIELD_TYPE.objectId:
        }

        return val
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

    _isSubModel(modelName) {
        return modelName.indexOf('.') > 0
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

    // get query params from http request
    _getRouteQueryParamsInner(context, api, query) {
        const model = BaseHelper.getContainer().getModel(api.model)

        // routes like below:
        // /api/v1/system/areas/:area_province/cities/:city_idx/districts/:district_idx/subdistricts
        // /api/v1/user/classes/:class_id/students/:_id
        // /api/v1/users/:user_id/teacher/classes/:_id
        //
        let routePath = api.path

        const modelRoute = model.getRoutePath(model)
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

                let prop = subProperty.properties.find((p) => p.name.toLowerCase() === queryField)
                if (!prop) {
                    prop = subProperty.properties.find((p) => p.name.toLowerCase() === propName)
                }

                if (!prop) {
                    if (queryField !== 'id') queryField = ''
                } else {
                    queryField = prop.name
                }

                const requestVal = _.get(context.req, ['params', propName])
                if (requestVal && queryField) {
                    query[selectPath ? `${selectPath}.${queryField}` : queryField] = requestVal
                }
            } else {
                selectPath += selectPath ? `.${propName}` : propName
                subProperty = subProperty.properties.find((p) => p.name.toLowerCase() === propName)
                if (!subProperty) {
                    break
                }

                lastProp = propName
            }
        }

        return query
    }

    /**
     * create the default CRUD route
     *
     * @param result array to store generated routes
     * @param modelRouteName the route name is affected by model name and route_name and other parameters
     * @param modelFullName parent model name
     * @param modelDisName parent model display name
     * @param outFieldPrefix e.g. User.location, only need location.
     * @param properties model properties
     * @param model object model
     * @param routePath parent route path
     * @param actionsList route actions，include 'list', 'detail', 'create', 'update', 'delete' etc.
     * @param parentOutFields parent output fields, parent may have fields which now allow to output
     */
    _createCrudRoute(
        result = [],
        modelRouteName,
        modelFullName,
        modelDisName,
        outFieldPrefix,
        parentOutFields,
        model,
        properties,
        routePath,
        actionsList,
        endPath
    ) {
        // if properties have one unique field, will use it as path param
        let idField = null
        let idProp = null

        const parentPropPath =
            outFieldPrefix.indexOf('.') > 0 ? outFieldPrefix.substr(0, outFieldPrefix.lastIndexOf('.')) : ''
        const parentProp = outFieldPrefix ? (parentPropPath ? model.getProperty(parentPropPath) : model) : null

        const parIsObjArray = !!(parentProp && parentProp.prop_type === Constants.API_FIELD_TYPE['array-of-object'])
        for (const property of properties) {
            if (property && property.unique) {
                idField = property.name
                idProp = property
                // if there is a unique field other than id，use it in priory
                if (idField !== 'id') {
                    break
                }
            }
        }

        // sub object needn't, only for array
        const parIdField = model.getIdField(parentPropPath)
        if (parIsObjArray && parentProp && !parIdField) {
            throw new Error('_createCrudRoute, ' + modelRouteName + ' has no unique field')
        }

        if (!outFieldPrefix) {
            parentOutFields = []
        }

        // output array id, when query sub object list or detail, we need it
        if (parIsObjArray && parentProp.output_flag_mod !== 0) {
            let parentHasOutput = false
            let parentField = parentPropPath

            while (parentField) {
                if (parentOutFields.find((p) => p.name === parentField)) {
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
                    name: parentPropPath ? `${parentPropPath}.${parIdField.name}` : parIdField.name,
                    type: parIdField.type,
                    description: ''
                })
            }
        }

        for (const prop of properties) {
            if (/* recursive */ prop && prop.properties && prop.properties.length > 0 && prop.name) {
                const isObjArray = !!(prop.prop_type === Constants.API_FIELD_TYPE['array-of-object'])
                if (isObjArray && prop.array_level > 1) {
                    logger.info(
                        `[${modelFullName}.${prop.name}] NESTED array prop, will not support generate default route`
                    )
                    continue
                }

                const subRouteActions = this.getDefaultRouteActions(prop)
                const hasSubRoute = !!(subRouteActions && subRouteActions.length > 0)

                // no unique field, will not create any route
                let hasUniqueField = false
                if (!hasSubRoute) {
                    for (const p of prop.properties) {
                        if (p && p.unique) {
                            hasUniqueField = true
                            break
                        }
                    }
                }

                if (hasSubRoute || hasUniqueField || isObjArray || prop.prop_type === Constants.API_FIELD_TYPE.object) {
                    let parRoutePath = routePath
                    if (!parRoutePath.endsWith('/')) {
                        parRoutePath += '/'
                    }

                    if (idField) {
                        // avoid user-user_id
                        // if (parIdField.indexOf('_') > 0) {
                        //     const idFields = parIdField.split('_')
                        //     const lastRouteName = _.last(modelRouteName.split('_'))
                        //     if (lastRouteName === idFields[0]) {
                        //         parIdField = idFields[1]
                        //     }
                        // }

                        if (modelRouteName.toLowerCase() === idField) {
                            parRoutePath += `:${idField}/`
                        } else {
                            parRoutePath += `:${modelRouteName.toLowerCase()}_${idField}/`
                        }
                    }

                    const subRoutePath = parRoutePath + prop.name.toLowerCase()

                    // only array type has create route for sub property
                    if (prop.prop_type.indexOf('array') !== 0) {
                        _.remove(subRouteActions, (r) => r === 'create' || r === 'delete')
                    }

                    // route name
                    let routeName = prop.name.toLowerCase()
                    if (prop.route_name) {
                        routeName = prop.route_name.toLowerCase()
                    }
                    routeName = pluralize(routeName, 1)

                    // out field name
                    const outFieldName = outFieldPrefix ? `${outFieldPrefix}.${prop.name}` : prop.name
                    const subModelPath = modelFullName + '.' + prop.name

                    if (endPath && endPath.indexOf(subModelPath) > -1) {
                        this._createCrudRoute(
                            result,
                            routeName,
                            subModelPath,
                            modelDisName + prop.dis_name,
                            outFieldName,
                            _.clone(parentOutFields),
                            model,
                            prop.properties,
                            subRoutePath,
                            subRouteActions,
                            endPath
                        )
                    }
                }
            }
        }

        // batch update, only support first level object
        if (actionsList.includes('batch_update') && !parentProp) {
            const idFieldType = idProp ? idProp.prop_type : Constants.API_FIELD_TYPE.objectId
            const inParams = [
                {
                    name: idField,
                    type: `array-of-${idFieldType}`,
                    require: false,
                    description: tf('batchUpdateIdDesc', { field: idField })
                },
                {
                    name: 'data',
                    type: Constants.API_FIELD_TYPE['array-of-object'],
                    require: true,
                    description: tf('batchUpdateDataDesc', { parent_disname: modelDisName, field: idField })
                }
            ]

            result.push({
                name: `batchUpdate${this._getDefFuncName(modelFullName)}`,
                dis_name: tf('defFuncBatchUpdate', { parent_disname: modelDisName }),
                method: Constants.API_HTTP_METHOD.POST,
                path: routePath + '/batch',
                model: modelFullName,
                action: 'batch_update',
                func: this.batchUpdate.bind(this),
                form_data_type: Constants.API_FORM_DATA['FORM-DATA'],
                in_params: inParams,
                out_fields: [],
                description: tf('defaultApi')
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
                description: tf('updateReplaceDesc')
            })

            result.push({
                name: `update${this._getDefFuncName(modelFullName)}`,
                dis_name: tf('defFuncUpdate', { parent_disname: modelDisName }),
                method: Constants.API_HTTP_METHOD.POST,
                path: routePath + (idField ? '/:' + idField : ''),
                model: modelFullName,
                action: 'update',
                func: this.update.bind(this),
                form_data_type: Constants.API_FORM_DATA.JSON,
                in_params: inParams,
                out_fields: [],
                description: tf('defaultApi')
            })
        }

        // batch delete, only support first level object
        if (actionsList.includes('batch_delete') && !parentProp) {
            const idFieldType = idProp ? idProp.prop_type : Constants.API_FIELD_TYPE.objectId
            const inParams = [
                {
                    name: idField,
                    type: `array-of-${idFieldType}`,
                    require: true,
                    description: tf('batchDeleteIdDesc', { field: idField })
                }
            ]

            result.push({
                name: `batchDelete${this._getDefFuncName(modelFullName)}`,
                dis_name: tf('defFuncBatchDelete', { parent_disname: modelDisName }),
                method: Constants.API_HTTP_METHOD.DELETE,
                path: routePath + '/batch',
                model: modelFullName,
                action: 'batch_delete',
                func: this.batchDelete.bind(this),
                form_data_type: Constants.API_FORM_DATA['FORM-DATA'],
                in_params: inParams,
                out_fields: [],
                description: tf('defaultApi')
            })
        }

        // delete
        if (actionsList.includes('delete') && idField) {
            result.push({
                name: `delete${this._getDefFuncName(modelFullName)}`,
                dis_name: tf('defFuncDelete', { parent_disname: modelDisName }),
                method: Constants.API_HTTP_METHOD.DELETE,
                path: routePath + '/:' + idField,
                model: modelFullName,
                action: 'delete',
                func: this.delete.bind(this),
                form_data_type: Constants.API_FORM_DATA['FORM-DATA'],
                in_params: [],
                out_fields: [],
                description: tf('defaultApi')
            })
        }

        // create
        if (actionsList.includes('create')) {
            const inParams = []
            this.getPostApiInParams(inParams, properties)
            inParams.forEach((p) => {
                p.require = false
            })

            result.push({
                name: `create${this._getDefFuncName(modelFullName)}`,
                dis_name: tf('defFuncCreate', { parent_disname: modelDisName }),
                method: Constants.API_HTTP_METHOD.POST,
                path: routePath,
                model: modelFullName,
                action: 'create',
                func: this.create.bind(this),
                form_data_type: Constants.API_FORM_DATA.JSON,
                in_params: inParams,
                out_fields: [],
                description: tf('defaultApi')
                // order: order,
            })
        }

        // get one
        if (actionsList.includes('detail')) {
            const detailOutFields = [...parentOutFields]
            this.getModelOutFields(detailOutFields, properties, outFieldPrefix, true /* detail api output all */)

            result.push({
                name: `get${this._getDefFuncName(modelFullName)}Detail`,
                dis_name: tf('defFuncDetail', { parent_disname: modelDisName }),
                method: Constants.API_HTTP_METHOD.GET,
                path: routePath + (idField ? '/:' + idField : ''),
                model: modelFullName,
                action: 'detail',
                func: this.detail.bind(this),
                form_data_type: Constants.API_FORM_DATA.NONE,
                in_params: [],
                out_fields: detailOutFields,
                description: tf('defaultApi')
            })
        }

        // list many
        if (actionsList.includes('list')) {
            const inParams = []
            this.getQueryApiInParams(inParams, properties)

            inParams.push({
                name: 'select',
                type: 'char',
                require: false,
                description: tf('listSelectDesc')
            })

            const listOutFields = [...parentOutFields]
            this.getModelOutFields(listOutFields, properties, outFieldPrefix, false)

            result.push({
                name: `get${this._getDefFuncName(modelFullName)}List`,
                dis_name: tf('defFuncList', { parent_disname: modelDisName }),
                method: Constants.API_HTTP_METHOD.GET,
                path: routePath,
                model: modelFullName,
                action: 'list',
                func: parentProp ? this.detail.bind(this) : this.list.bind(this), // for sub array just query detail
                form_data_type: Constants.API_FORM_DATA.NONE,
                in_params: inParams,
                out_fields: listOutFields,
                description: tf('defaultApi')
            })
        }
    }
}

module.exports = new DefaultApiHandler()
