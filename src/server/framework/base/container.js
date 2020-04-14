/* eslint-disable no-eval */
/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: Jack Zhang
 **/

const _ = require('lodash')
const BaseHelper = require('./helpers/base-helper')
const CommUtils = require('../utils/common')
const config = require('config')
const Constants = require('./constants/constants')
const Context = require('./context')
const DefaultApiHandler = require('./default-api')
const ErrorCodes = require('./constants/error-codes')
const express = require('express')
const Model = require('../models/Model')
const nlp = require('compromise')
const path = require('path')
const pluralize = require('pluralize')
const RouteProxy = require('./route-proxy')
const router = require('express').Router()
const RouterHelper = require('./helpers/route-helper')
const shortid = require('shortid')
const SystemRoutes = require('../default-app/routes')

// prettier-ignore
const apiEditableFields = [
    'name', 'category_name', 'model', 'disabled', 'form_data_type',
    'in_params', 'out_fields', 'input_example', 'output_example',
    'cache', 'description', 'mock_result', 'public', 'permissions'
]

const allActions = [...Constants.API_DEF_ROUTE_ACTIONS, 'batch_update']
const systemModels = ['Api', 'Model', 'Service']
const unPublicModels = [...systemModels, 'Role', 'Permission', 'ServerLog', 'UserLog', 'ClientLog']

// container instance
let containerInstance = null

/**
 * 容器类，原则上所有中间件、能力组件、服务都是无状态的
 */
class Container {
    constructor() {
        this.hasInit = false

        this.models = []
        this.middlewares = { before: [], after: [] }
        this.beans = []
        this.services = {}
        this.controllers = {}

        this.modifiedApiList = []
        this.apiRoutes = []
        this.contextApiHooks = {}
        this.siteManitainInfo = null
    }

    // get container instance
    static getInstance() {
        if (containerInstance == null) {
            containerInstance = new Container()
        }

        return containerInstance
    }

    routeCreator(controllerName) {
        return {
            def: (modelPath, actions, options) => {
                if (!actions) {
                    actions = Constants.API_DEF_ROUTE_ACTIONS
                } else if (typeof actions === 'string') {
                    actions = [actions]
                }

                if (!(actions instanceof Array)) {
                    throw new Error('actions 必须是数组')
                }

                if (_.intersection(allActions, actions).length < actions.length) {
                    throw new Error('actions 必须是 list, detail, create, update, delete 中的一个或多个')
                }

                return this.createDefaultRouteProxy(controllerName, modelPath, actions, options)
            },

            // path: Api 路由，会自动在路由前加上类似于 /api/v1 的前缀
            // disName: Api 显示名称
            // func: 对应函数
            // options: 定制 Api 参数
            get: (path, disName, func, options) => {
                return this.createRouteProxy(controllerName, Constants.API_HTTP_METHOD.GET, path, disName, func, options)
            },

            post: (path, disName, func, options) => {
                return this.createRouteProxy(controllerName, Constants.API_HTTP_METHOD.POST, path, disName, func, options)
            },

            delete: (path, disName, func, options) => {
                return this.createRouteProxy(controllerName, Constants.API_HTTP_METHOD.DELETE, path, disName, func, options)
            }
        }
    }

    /**
     * initialize all models, routers and components.
     * @param app
     * @param callback
     */
    async initialize(app, callback) {
        await this.loadModels()
        await this.loadComponents(app)
        await this.loadServices()
        await this.loadControllers()

        this.executeHook('initialize', null, null)

        this.modifiedApiList = await BaseHelper.getAllModifiedApis(false)

        if (app) {
            await this.initRouter(app)
        } else {
            logger.warn('Container initialize, app undefined!')
        }

        this.hasInit = true
        if (callback) setTimeout(() => callback(), 3000)
    }

    // all requests entrance
    async initRouter(app) {
        // static route
        app.use('/public', express.static(path.join(global.APP_PATH, 'public')))

        // all requests entrance
        app.use(this.createContext)

        // system default routes
        SystemRoutes.init(app, this, this.routeCreator(''))

        // register manual router if needed
        for (const controllerName in this.controllers) {
            const controller = this.controllers[controllerName]
            if (!controller.instance) {
                logger.error('initRouter, controller instance is null: ' + controllerName)
                continue
            }

            if (controller.instance.initRoutes) {
                const routeCreator = this.routeCreator(controllerName)
                controller.instance.initRoutes(this, routeCreator, app)
            }
        }

        // initRoutes 只是先初始化路由列表，createApiRoutes 真正创建 express 路由
        app.use('/', await this.createApiRoutes())

        // error handler
        this.initErrRoutes(app)
    }

    /**
     * 创建默认路由代理
     * @param controllerName
     * @param modelPath
     * @param actions
     */
    createDefaultRouteProxy(controller, modelPath, actions, options) {
        const defApis = DefaultApiHandler.createDefaultRoutes(modelPath, actions, false)
        if (!defApis) {
            throw new Error('createDefaultRouteProxy failed!')
        }

        const routeProxies = []
        for (let i = 0; i < defApis.length; i++) {
            const defApi = defApis[i]
            const existRouteProxy = this.apiRoutes.find(r => r.api.method === defApi.method && r.api.path === defApi.path)
            if (existRouteProxy) {
                routeProxies.push(existRouteProxy)
                // console.info('api already registered，skip：' + defApi.path)
                continue
            }

            const modifiedApi = this.modifiedApiList.find(r => r.method === defApi.method && r.path === defApi.path)
            if (modifiedApi) {
                defApi.id = modifiedApi.id
                for (const field of apiEditableFields) {
                    if (modifiedApi[field] instanceof Array) {
                        if (modifiedApi[field].length > 0) {
                            defApi[field] = modifiedApi[field]
                        }
                    } else if (modifiedApi[field]) {
                        defApi[field] = modifiedApi[field]
                    }
                }
            }

            var func = defApi.func
            if (typeof func === 'string') {
                func = eval(func)
            }

            var routeProxy = new RouteProxy(this, defApi, defApi.method, defApi.path, defApi.dis_name, defApi.func, options)
            this.apiRoutes.push(routeProxy)

            routeProxies.push(routeProxy)
        }

        if (routeProxies.length === 1) {
            return routeProxies[0]
        }

        return {
            beforeProcess() {
                routeProxies.forEach(rp => {
                    rp.beforeProcess(arguments[0])
                })
            },
            afterProcess() {
                routeProxies.forEach(rp => {
                    rp.afterProcess(arguments[0])
                })
            },
            beforeDbProcess() {
                routeProxies.forEach(rp => {
                    rp.beforeDbProcess(arguments[0])
                })
            },
            outFields() {
                routeProxies.forEach(rp => {
                    rp.outFields(arguments[0], arguments[1])
                })
            }
        }
    }

    /**
     * 创建路由代理
     * @param method 请求 Http 方法
     * @param path 路由 Api 路径
     * @param disName Api 显示名称
     * @param func 处理函数
     * @param options 可设置更多 Api 参数，详情参考 Api 对象定义
     */
    createRouteProxy(controller, method, path, disName, func, options) {
        method = method.toUpperCase()
        path = path.toLowerCase()

        if (!path.startsWith(Constants.API_PREFIX)) {
            path = Constants.API_PREFIX + path
        }

        if (typeof disName === 'function') {
            throw new Error('显示名称参数错误，请传入字符串')
        }

        const existRouteProxy = this.apiRoutes.find(r => r.method === method && r.path === path)
        if (existRouteProxy) {
            console.error('API 路径已经注册：' + path)
            return existRouteProxy
        }

        let apiInfo = null
        const modifiedApi = this.modifiedApiList.find(r => r.method === method && r.path === path)
        if (modifiedApi) {
            apiInfo = {}
            apiInfo.id = modifiedApi.id
            for (const field of apiEditableFields) {
                if (modifiedApi[field] instanceof Array) {
                    if (modifiedApi[field].length > 0) {
                        apiInfo[field] = modifiedApi[field]
                    }
                } else if (modifiedApi[field]) {
                    apiInfo[field] = modifiedApi[field]
                }
            }
        }

        var routeProxy = new RouteProxy(this, apiInfo, method, path, disName, func, options)
        this.apiRoutes.push(routeProxy)

        return routeProxy
    }

    /**
     * 设置 API 钩子函数，主要用来提供Service业务代码对系统默认处理逻辑进行补充，
     *   除默认的 beforeExeute，afterExecute 外，可修改代码支持更多插入点，
     *   业务Service也可以根据需要在代码中插入对钩子函数的支持。
     */
    setHook(hookName, hookFunc, routePath = '', method = '', order = -1) {
        method = method.toUpperCase()
        if (method && !Constants.API_HTTP_METHOD[method]) {
            throw new Error('invalid param: method')
        }

        if (!hookName) {
            throw new Error('invalid param: hookName')
        }

        const hookKey = hookName + (method ? ':' + method : '')

        if (!this.contextApiHooks[hookKey]) {
            this.contextApiHooks[hookKey] = []
        }

        if (order > -1) {
            this.contextApiHooks[hookKey].splice(order, 0, {
                obj: null, // hookObj,
                route: routePath,
                func: hookFunc
            })
        } else {
            this.contextApiHooks[hookKey].push({
                obj: null, // hookObj,
                route: routePath,
                func: hookFunc
            })
        }
    }

    /**
     * init creation of call context
     * @param req
     * @param res
     * @param next
     * @returns {Promise<void>}
     */
    createContext(req, res, next) {
        const container = Container.getInstance()

        const httpContext = new Context(container, req, res)
        httpContext.apiHooks = container.contextApiHooks

        res._context = httpContext
        next()
    }

    /**
     * execution before call service interface
     * @param context
     */
    async beforeExecute(context) {
        let continueExecute = true

        for (let i = 0; i < this.middlewares.before.length; i++) {
            const middleware = this.middlewares.before[i]
            if (middleware.before) {
                const executeResult = await middleware.before(context)
                if (executeResult === Constants.API_RESULT.STOP_OTHER_HOOK) {
                    break
                } else if (executeResult === Constants.API_RESULT.RETURN) {
                    continueExecute = false
                    break
                }
            }
        }

        return continueExecute
    }

    /**
     * execution after call service interface
     * @param context
     */
    async afterExecute(context) {
        let continueExecute = true

        for (let i = 0; i < this.middlewares.after.length; i++) {
            const middleware = this.middlewares.after[i]
            if (middleware.after) {
                const executeResult = await middleware.after(context)
                if (executeResult === Constants.API_RESULT.STOP_OTHER_HOOK) {
                    break
                } else if (executeResult === Constants.API_RESULT.RETURN) {
                    continueExecute = false
                    break
                }
            }
        }

        return continueExecute
    }

    /**
     * 根据指定 key 执行钩子函数
     * @param context
     * @param hookName
     */
    async executeHook(hookName, context, api, ...args) {
        let routePath = ''
        if (api) {
            routePath = api.path
        } else if (context && context.req) {
            routePath = context.req.route.path
        }

        const method = api ? api.method : ''
        // const hookPath = routePath.substr(Constants.API_PREFIX.length)

        const hookKey = hookName + `${method ? ':' + method : ''}`
        const hooks = this.contextApiHooks[hookKey] // context.apiHooks[hookKey]
        if (hooks) {
            for (let i = 0; i < hooks.length; i++) {
                const hookItem = hooks[i]
                if ((hookItem.route instanceof RegExp && hookItem.route.test(routePath)) || hookItem.route === routePath) {
                    const hookResult = await this.executeHookFunc(context, hookItem, ...args)
                    if (hookResult === Constants.API_RESULT.STOP_OTHER_HOOK) {
                        break
                    }

                    if (hookResult === Constants.API_RESULT.RETURN) {
                        return hookResult
                    }
                }
            }
        }

        return Constants.API_RESULT.CONTINUE
    }

    /**
     * 调用 API 钩子函数
     */
    async executeHookFunc(context, hook, ...args) {
        if (typeof hook.func === 'function') {
            return hook.func(context, ...args)
        }

        if (typeof hook.func === 'string') {
            try {
                const func = hook.func

                if (func && hook.obj && typeof hook.obj[func] === 'function') {
                    if (args instanceof Array) {
                        return await hook.obj[hook.func](context, ...args)
                    } else {
                        return await hook.obj[hook.func](context, args)
                    }
                } else {
                    // try eval
                    return eval(hook.func)
                }
            } catch (e) {
                return Promise.reject({
                    message: '调用 API hook 函数出错: ' + hook.func,
                    code: ErrorCodes.API_ERR_EXECUTE
                })
            }
        }
    }

    /**
     * create routes to all apis, which were defined through manager web
     *   by system admin
     */
    async createApiRoutes() {
        let order = 1
        for (let i = 0; i < this.apiRoutes.length; i++) {
            const apiRoute = this.apiRoutes[i]
            // check Api service & func exists
            const api = apiRoute.api
            if (!api.id) {
                api.id = shortid.generate()
            }
            if (!api.name) {
                api.name = this._guessApiName(api)
                api.is_auto_name = true
            }
            api.order = order++

            if (api.model) {
                const model = this.getModel(api.model)
                if (!model) {
                    logger.error('createApiRoutes, Api modelMeta not found!', apiRoute)
                    process.exit()
                }
            }

            switch (api.method) {
                case Constants.API_HTTP_METHOD.GET:
                    router.get(api.path, (req, res, next) => {
                        RouterHelper(this.executeApi(apiRoute, res._context), res, next)
                    })
                    break
                case Constants.API_HTTP_METHOD.POST:
                    router.post(api.path, (req, res, next) => {
                        RouterHelper(this.executeApi(apiRoute, res._context), res, next)
                    })
                    break
                case Constants.API_HTTP_METHOD.DELETE:
                    router.delete(api.path, (req, res, next) => {
                        RouterHelper(this.executeApi(apiRoute, res._context), res, next)
                    })
                    break
            }

            if (unPublicModels.includes(api.model) && !api.permissions) {
                api.public = false
                api.permissions = ['system:manage', 'api:manage']
            } else if (api.public !== true) {
                logger.debug(`api route created: ${api.method.toUpperCase()} ${api.path}`)
            }
        }

        logger.debug(`createApiRoutes, total ${this.apiRoutes.length} api route loaded.`)
        return router
    }

    /**
     * the 404 error handle should put to the end of the route tables
     * @param app
     */
    initErrRoutes(app) {
        // catch 404 and forward to error handler
        app.use(function(req, res, next) {
            const err = new Error('Not Found')
            err.status = 404
            next(err)
        })

        // development error handler
        // will print stacktrace
        if (app.get('env') === 'development') {
            app.use(function(err, req, res, next) {
                res.status(err.status || 500)
                res.json({
                    status: err.status || 500,
                    message: err.message,
                    stack: err.stack
                })
            })
        } else {
            app.use(function(err, req, res, next) {
                res.status(err.status || 500)
                res.json({
                    status: err.status || 500,
                    message: err.message
                })
            })
        }
    }

    /**
     * 根据接口路由定义执行中间件及服务代码
     * @param apiRoute
     * @param context the http context
     */
    async executeApi(apiRoute, context) {
        if (context.result) {
            logger.info('executeApi, route already handled by other functions, please check route order')
            return null
        }

        context.apiRoute = apiRoute
        const container = context.container

        // before execute
        try {
            const continueExecute = await container.beforeExecute(context)
            if (continueExecute !== true) {
                logger.debug('executeApi, a middleware stopped api execution')
                return null
            }
        } catch (err) {
            logger.error(`beforeExecute error: ${typeof err === 'string' ? err : err.stack || err.message}`)
            context.error = err
            return null
        }

        try {
            const hookResult = await container.executeHook('beforeProcess', context, context.apiRoute.api, context)
            if (hookResult === Constants.API_RESULT.RETURN) {
                logger.debug('executeApi, api execution stopped by beforeProcess hook')
                return null
            }
        } catch (err) {
            logger.error(`beforeProcess executeHook error: ${typeof err === 'string' ? err : err.stack || err.message}`)
            context.error = err
            return null
        }

        // execute
        try {
            const apiFunc = apiRoute.func
            const result = await apiFunc(context, apiRoute.api)
            if (result && context.result === null) {
                context.setResult(result)
            }
        } catch (err) {
            logger.error(`executeApi error: ${typeof err === 'string' ? err : err.stack || err.message}`)
            context.error = err
        }
    }

    /**
     * get all models
     */
    getAllModels() {
        return this.models
    }

    /**
     * get modelMeta with schema by modelMeta class name
     */
    getModel(modelName) {
        if (!this.models) {
            throw new Error('modelMeta has not init')
        }

        if (!modelName) {
            return null
        }

        const pos = modelName.indexOf('.')
        if (pos > -1) {
            modelName = modelName.substr(0, pos)
        }

        return this.models[modelName]
    }

    /**
     * get api editable fields
     */
    getApiEditableFields() {
        return apiEditableFields
    }

    /**
     * get api detail
     * @param id
     * @returns {Promise<void>}
     */
    async getApi(id) {
        const apiRoute = this.apiRoutes.find(r => r.api.id === id)
        if (apiRoute) {
            await apiRoute.fillCategoryName()
        }

        return apiRoute ? apiRoute.api : null
    }

    /**
     * Get API list (in memory)
     */
    async getApiList(publicOnly) {
        for (let i = 0; i < this.apiRoutes.length; i++) {
            const api = this.apiRoutes[i]
            await api.fillCategoryName()
        }

        const result = this.apiRoutes.map(r => r.api)
        if (publicOnly) {
            return result.filter(api => api.public !== false)
        }

        return result.filter(api => !(api.model && systemModels.includes(api.model)))
    }

    /**
     * get service list
     */
    getServiceList() {
        return this.services
    }

    /**
     * get modelMeta with schema by modelMeta class name
     */
    getServiceInst(serviceName) {
        const service = this.getService(serviceName)
        if (!service) {
            return null
        }

        return service.instance
    }

    /**
     * get service modelMeta
     * @param serviceName
     * @returns {String|WebAssembly.Instance|null}
     */
    getService(serviceName) {
        const service = this.services[serviceName]
        if (!service) {
            return null
        }

        return service
    }

    /**
     * load route controllers
     * @returns {Promise<void>}
     */
    async loadControllers() {
        this.controllers = {}

        const controllers = await BaseHelper.getAllControllers()
        for (const controller of controllers) {
            const key = controller.category_name + controller.name
            if (!this.controllers[key]) {
                controller.instance = require(controller.file)
                this.controllers[key] = controller
            }
        }

        logger.debug(`loadControllers, total: ${Object.keys(this.services).length} of ${controllers.length} loaded`)
    }

    /**
     * load all services from database
     * @returns {Promise<void>}
     */
    async loadServices() {
        if (this.services) {
            delete this.services
        }

        this.services = {}

        const services = await BaseHelper.getAllServices()
        for (const service of services) {
            if (this.services[service.name]) {
                throw new Error(`${service.name}Service 已经存在，请修改服务文件名`)
            }

            // load service apis
            service.instance = require(service.file)
            // if (service.instance.getServiceDesc) {
            //     const serviceDesc = service.instance.getServiceDesc() || {}
            //     service.description = serviceDesc.description || ''
            // }

            this.services[service.name] = service
        }

        logger.debug(`loadServices, total: ${Object.keys(this.services).length} of ${services.length} loaded`)
    }

    // load all components from database
    async loadComponents(app) {
        const enabledCache = config.get('server.enableCache')

        const apiAuth = require('../middlewares/api-auth')
        const docExampleGen = require('../middlewares/doc-example-gen')
        const promMetrics = require('../middlewares/prom-metrics')
        const requestParser = require('../middlewares/request-parser')
        const statusCheck = require('../middlewares/status-check')

        promMetrics.init(app)

        // 注意先后顺序
        this.middlewares.before = [promMetrics, requestParser, statusCheck, apiAuth, docExampleGen]
        this.middlewares.after = [requestParser, docExampleGen, promMetrics]

        // Api 缓存，默认启用
        if (enabledCache) {
            const apiCache = require('../middlewares/api-cache')

            this.middlewares.before.splice(this.middlewares.before.indexOf(docExampleGen), 0, apiCache)
            this.middlewares.after.splice(this.middlewares.after.indexOf(docExampleGen), 0, apiCache)
        }
    }

    /**
     * load all models
     * @returns {Promise<void>}
     */
    async loadModels() {
        this.models = {}

        const models = await BaseHelper.getAllModels() // Db Models
        for (const model of models) {
            if (!this.models[model.name]) {
                if (model.name === 'Model') {
                    model.instance = Model // mongodb modelMeta schema
                } else {
                    // const service = Object.values(this.services).find(s => s.name === model.service)
                    // if (!service) {
                    //     logger.warn('modelMeta service lost: ' + model.name)
                    // }

                    model.instance = await BaseHelper.getClassByName('model', '', model.name)
                    if (model.instance) {
                        model.schema = this._processSchemaType(model.instance.schema.obj)
                    }
                }

                this.models[model.name] = model
            }
        }

        logger.debug(`loadModels, total: ${Object.keys(this.models).length} of ${models.length} loaded`)
    }

    /**
     * 设置站点维护信息
     */
    async enableMaintainInfo(args) {
        this.siteManitainInfo = args
    }

    /**
     * 处理 Schema type 便于客户端显示
     */
    _processSchemaType(schemaModel) {
        const schemObj = {}
        const keys = _.keys(schemaModel)
        for (const propName of keys) {
            const prop = schemaModel[propName]
            if (prop instanceof Array) {
                const newProp = []
                for (const subModel of prop) {
                    const newSubModel = this._processSchemaType(subModel.obj)
                    newProp.push(newSubModel)
                }

                schemObj[propName] = newProp
            } else if (prop.type) {
                schemObj[propName] = { ...prop }
                schemObj[propName].type = _.get(prop, ['type', 'schemaName'])
            } else {
                schemObj[propName] = this._processSchemaType(prop)
            }
        }

        return schemObj
    }

    /**
     * 根据路由生成 Api 名称
     */
    _guessApiName(api) {
        const path = api.path
        const pos = path.indexOf(Constants.API_PREFIX)
        if (pos < 0) return ''

        let routePath = path.substr(pos + Constants.API_PREFIX.length + 1)
        if (routePath.startsWith('/')) {
            routePath = routePath.substr(1)
        }

        const parts = routePath.split('/')
        if (!(parts.length > 0 && routePath[0])) {
            return ''
        }

        // 最多只看2个单词
        if (parts.length > 2) {
            parts.splice(0, parts.length - 2)
        }

        let isVerb = false
        let isUpdate = false
        let firstWord

        if (api.method === 'POST') {
            const routeWords = []
            parts.forEach((p, index) => {
                if (!p.startsWith(':')) {
                    p.split('_').forEach(p1 => routeWords.push(p1))
                } else if (index === parts.length - 1) {
                    isUpdate = true
                }
            })

            _.reverse(routeWords)

            const taggedWords = nlp(routeWords.join(' ')).json()
            if (taggedWords.length > 0) {
                const tagTerms = taggedWords[0].terms
                tagTerms[tagTerms.length - 1].tags.forEach(t => {
                    // 动词放到前面
                    if (t.startsWith('V')) {
                        isVerb = true
                        firstWord = tagTerms[tagTerms.length - 1].text
                    }
                })
            }
        }

        const getParts = (name, isLast) => {
            let names = ''
            name.split('_').forEach(n => {
                if (isLast) {
                    names += CommUtils.capitalizeFirstLetter(n)
                } else {
                    names += CommUtils.capitalizeFirstLetter(pluralize(n, 1))
                }
            })

            return names
        }

        let apiName = ''
        let len = parts.length
        if (isVerb) {
            apiName = firstWord.toLowerCase()
            len--
        } else if (api.method === 'POST') {
            apiName = isUpdate ? 'update' : 'set'
        } else {
            apiName = api.method.toLowerCase()
        }

        for (let i = 0; i < len; i++) {
            if (!parts[i].startsWith(':')) {
                apiName += CommUtils.capitalizeFirstLetter(getParts(parts[i], i === len - 1))
            }
        }

        return apiName.replace(/[^a-zA-Z0-9_\\-]/g, '')
    }
}

module.exports = Container
