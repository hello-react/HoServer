/* eslint-disable no-eval */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/

const _ = require('lodash')
const CommUtils = require('../utils/common')
const config = require('@hosoft/config')
const Constants = require('./constants/constants')
const Context = require('./context')
const DefaultApiHandler = require('./default-api')
const ErrorCodes = require('./constants/error-codes')
const express = require('express')
const fs = require('fs')
const GlobalModels = require('../models/index')
const nlp = require('compromise')
const path = require('path')
const PluginManager = require('./plugin-manager')
const RouteProxy = require('./router/route-proxy')
const router = require('express').Router()
const RouterHelper = require('./router/route-helper')
const shortid = require('shortid')
const SystemRoutes = require('../default-app/routes')

// prettier-ignore
const apiEditableFields = [
    'name', 'category_name', 'model', 'disabled', 'form_data_type',
    'in_params', 'out_fields', 'input_example', 'output_example',
    'cache', 'description', 'mock_result', 'private', 'permissions'
]

const allActions = [...Constants.API_DEF_ROUTE_ACTIONS, 'batch_update', 'batch_delete']
const systemModels = ['Api', 'Model', 'Service', 'Plugin']
const unPublicModels = [...systemModels, 'ServerLog', 'ClientLog', 'SiteMaintain']

// container instance
let containerInstance = null

/**
 * Container for all models, api routes、services, controllers
 */
class Container {
    constructor() {
        this.hasInit = false

        this.models = GlobalModels
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

    /**
     * initialize all models, routers and components.
     * @param app
     * @param callback
     */
    async initialize(app, callback) {
        // load user modified apis
        this.modifiedApiList = await this.getModel('Api').find({ sort: 'order', lean: true })

        await this.loadMiddlewares(app)
        await this.loadPlugins(app)
        await this.loadServices()
        await this.loadControllers()

        this.executeHook('initialize', null, null)

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
        SystemRoutes.init(this, this.routeCreator(''), app)

        // register manual router if needed
        for (const controllerName in this.controllers) {
            const controller = this.controllers[controllerName]
            if (!controller.instance) {
                logger.error('initRouter, controller instance is null: ' + controllerName)
                continue
            }

            if (controller.instance.initRoutes) {
                const routeCreator = this.routeCreator(controllerName)
                await controller.instance.initRoutes(this, routeCreator, app)
            }
        }

        // createApiRoutes will create all express routes
        app.use('/', await this.createApiRoutes())

        // error handler
        this.initErrRoutes(app)
    }

    routeCreator(controllerName, apiType) {
        const setApiType = (options) => {
            if (apiType) {
                if (!options) {
                    options = {}
                }
                options.type = apiType
            }

            return options
        }

        return {
            def: (modelPath, actions, options) => {
                if (!actions) {
                    actions = Constants.API_DEF_ROUTE_ACTIONS
                } else if (typeof actions === 'string') {
                    actions = [actions]
                }

                if (!(actions instanceof Array)) {
                    throw new Error('actions must be array')
                }

                if (_.intersection(allActions, actions).length < actions.length) {
                    throw new Error('actions must be one or more of list, detail, create, update, delete')
                }

                options = setApiType(options)
                return this.createDefaultRouteProxy(controllerName, modelPath, actions, options)
            },

            // path: Api route，will auto add /api/v1 prefix
            // disName: Api display name
            // func: api execute function
            // options: custom options
            get: (path, disName, func, options) => {
                options = setApiType(options)
                return this.createRouteProxy(
                    controllerName,
                    Constants.API_HTTP_METHOD.GET,
                    path,
                    disName,
                    func,
                    options
                )
            },

            post: (path, disName, func, options) => {
                options = setApiType(options)
                return this.createRouteProxy(
                    controllerName,
                    Constants.API_HTTP_METHOD.POST,
                    path,
                    disName,
                    func,
                    options
                )
            },

            delete: (path, disName, func, options) => {
                options = setApiType(options)
                return this.createRouteProxy(
                    controllerName,
                    Constants.API_HTTP_METHOD.DELETE,
                    path,
                    disName,
                    func,
                    options
                )
            }
        }
    }

    createDefaultRouteProxy(controller, modelPath, actions, options) {
        const defApis = DefaultApiHandler.createDefaultRoutes(modelPath, actions)
        if (!defApis) {
            throw new Error('createDefaultRouteProxy failed!')
        }

        const routeProxies = []
        for (let i = 0; i < defApis.length; i++) {
            const defApi = defApis[i]
            const existRouteProxy = this.apiRoutes.find(
                (r) => r.api.method === defApi.method && r.api.path === defApi.path
            )
            if (existRouteProxy) {
                routeProxies.push(existRouteProxy)
                // console.info('api already registered，skip：' + defApi.path)
                continue
            }

            const modifiedApi = this.modifiedApiList.find((r) => r.method === defApi.method && r.path === defApi.path)
            if (modifiedApi) {
                defApi.id = modifiedApi.id
                for (const field of apiEditableFields) {
                    if (modifiedApi[field] instanceof Array) {
                        if (modifiedApi[field].length > 0) {
                            _.merge(defApi[field], modifiedApi[field])
                        }
                    } else if (modifiedApi[field]) {
                        _.merge(defApi[field], modifiedApi[field])
                    }
                }
            }

            let func = defApi.func
            if (typeof func === 'string') {
                func = eval(func)
            }

            const routeProxy = new RouteProxy(
                this,
                defApi,
                defApi.method,
                defApi.path,
                defApi.dis_name,
                defApi.func,
                options
            )
            this.apiRoutes.push(routeProxy)

            routeProxies.push(routeProxy)
        }

        if (routeProxies.length === 1) {
            return routeProxies[0]
        }

        return {
            beforeProcess() {
                routeProxies.forEach((rp) => {
                    rp.beforeProcess(arguments[0])
                })
            },
            afterProcess() {
                routeProxies.forEach((rp) => {
                    rp.afterProcess(arguments[0])
                })
            },
            beforeDbProcess() {
                routeProxies.forEach((rp) => {
                    rp.beforeDbProcess(arguments[0])
                })
            },
            outFields() {
                routeProxies.forEach((rp) => {
                    rp.outFields(arguments[0], arguments[1])
                })
            }
        }
    }

    createRouteProxy(controller, method, path, disName, func, options) {
        method = method.toUpperCase()
        path = path.toLowerCase()

        if (!path.startsWith(Constants.API_PREFIX)) {
            path = Constants.API_PREFIX + path
        }

        if (typeof disName === 'function') {
            throw new Error('wrong parameter, please set display name')
        }

        const existRouteProxy = this.apiRoutes.find((r) => r.method === method && r.path === path)
        if (existRouteProxy) {
            console.error(`api route with path ${path} has already been registered`)
            return existRouteProxy
        }

        let apiInfo = null
        const modifiedApi = this.modifiedApiList.find((r) => r.method === method && r.path === path)
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

        const routeProxy = new RouteProxy(this, apiInfo, method, path, disName, func, options)
        this.apiRoutes.push(routeProxy)

        return routeProxy
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
                if (executeResult === Constants.HOOK_RESULT.STOP_OTHER_HOOK) {
                    break
                } else if (executeResult === Constants.HOOK_RESULT.RETURN) {
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
                if (executeResult === Constants.HOOK_RESULT.STOP_OTHER_HOOK) {
                    break
                } else if (executeResult === Constants.HOOK_RESULT.RETURN) {
                    continueExecute = false
                    break
                }
            }
        }

        return continueExecute
    }

    /**
     * set api hook function
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
     * execute api hook function
     * @param context
     * @param hookName
     */
    async executeHook(hookName, context, api, ...args) {
        let routePath = ''
        if (!api && context) {
            api = _.get(context, ['apiRoute', 'api'])
        }

        if (api) {
            routePath = api.path
        } else if (context && context.req) {
            routePath = context.req.route.path
        }

        const method = api ? api.method : ''
        // const hookPath = routePath.substr(Constants.API_PREFIX.length)

        const hookKey = hookName + `${method ? ':' + method : ''}`
        const hooks = this.contextApiHooks[hookKey] || this.contextApiHooks[hookName]
        if (hooks) {
            for (let i = 0; i < hooks.length; i++) {
                const hookItem = hooks[i]
                if (
                    !routePath ||
                    !hookItem.route ||
                    (hookItem.route &&
                        ((hookItem.route instanceof RegExp && hookItem.route.test(routePath)) ||
                            hookItem.route === routePath))
                ) {
                    const hookResult = await this.executeHookFunc(context, hookItem, ...args)
                    if (hookResult === Constants.HOOK_RESULT.STOP_OTHER_HOOK) {
                        break
                    }

                    if (hookResult === Constants.HOOK_RESULT.RETURN) {
                        return hookResult
                    }
                }
            }
        }

        return Constants.HOOK_RESULT.CONTINUE
    }

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
                    message: 'execute api hook function error: ' + hook.func,
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
            await apiRoute.fillCategoryName()

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

            if (api.model && api.model !== 'Service') {
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

            if (this.getUnPublicModelNames().includes(api.model)) {
                api.private = true
                api.permissions = ['system:manage', 'api:manage']
            } else {
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
        app.use(function (req, res, next) {
            const err = new Error('Not Found')
            err.status = 404
            next(err)
        })

        // development error handler
        // will print stacktrace
        if (app.get('env') === 'development') {
            app.use(function (err, req, res, next) {
                res.status(err.status || 500)
                res.json({
                    status: err.status || 500,
                    message: err.message,
                    stack: err.stack
                })
            })
        } else {
            app.use(function (err, req, res, next) {
                res.status(err.status || 500)
                res.json({
                    status: err.status || 500,
                    message: err.message
                })
            })
        }
    }

    /**
     * execute api
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
            if (hookResult === Constants.HOOK_RESULT.RETURN) {
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
     * get un-public model's name
     */
    getUnPublicModelNames() {
        return unPublicModels
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
    async getRouteById(id) {
        const apiRoute = this.apiRoutes.find((r) => r.api.id === id)
        if (apiRoute) {
            await apiRoute.fillCategoryName()
        }

        return apiRoute ? apiRoute.api : null
    }

    /**
     * get api by path
     * @param path
     * @param method
     */
    async getRoute(path, method = 'GET') {
        let fullPath = ''
        if (path.indexOf(Constants.API_PREFIX) < 0) {
            fullPath = Constants.API_PREFIX + path
        }

        const routes = this.apiRoutes.filter((r) => r.api.method === method)
        const apiRoute = routes.find((r) => r.api.path === path || r.api.path === fullPath)
        if (apiRoute) {
            await apiRoute.fillCategoryName()
        }

        return apiRoute
    }

    /**
     * Get API list (in memory)
     */
    async getRouteList(publicOnly, keepSysModels) {
        for (let i = 0; i < this.apiRoutes.length; i++) {
            const api = this.apiRoutes[i]
            await api.fillCategoryName()
        }

        let result = this.apiRoutes.map((r) => r.api)
        if (!keepSysModels) {
            result = result.filter((api) => {
                const modelName = this.getModelName(api.model)
                return !(api.model && unPublicModels.includes(modelName))
            })
        }

        if (publicOnly) {
            return result.filter((api) => api.private !== true)
        }

        return result
    }

    /**
     * register middleware
     */
    registerMiddleware(isBefore, isAfter, middlewareFile) {
        if (!fs.existsSync(middlewareFile)) {
            logger.error('middlewareFile not exist: ' + middlewareFile)
            return
        }

        if (isBefore) {
            this.middlewares.before.splice(this.middlewares.length - 1, 0, require(middlewareFile))
        }

        if (isAfter) {
            this.middlewares.after.splice(this.middlewares.length - 2, 0, require(middlewareFile))
        }
    }

    /**
     * get all models
     */
    getAllModels() {
        return this.models
    }

    /**
     * get model name
     * @param modelName
     */
    getModelName(modelName) {
        if (!modelName) {
            return ''
        }

        const pos = modelName.indexOf('.')
        if (pos > -1) {
            modelName = modelName.substr(0, pos)
        }

        return modelName
    }

    /**
     * get modelMeta with schema by modelMeta class name
     */
    getModel(modelName) {
        if (!this.models) {
            throw new Error('db models has not init')
        }

        modelName = this.getModelName(modelName)
        if (!modelName) {
            return null
        }

        return this.models[modelName]
    }

    /**
     * get service list
     */
    getAllServices() {
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

        const controllers = await this._scanLocalControllers()
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

        const services = await this._scanLocalServices()
        for (const service of services) {
            if (this.services[service.name]) {
                throw new Error(`${service.name}Service has already exist, please modify service file name`)
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

    // init plugins
    async loadPlugins(app) {
        await PluginManager.initPlugins(this, this.routeCreator('', 2 /* plugin */), app)
    }

    async loadMiddlewares(app) {
        const enabledCache = config.get('server.enableCache')

        const apiAuth = require('../middlewares/api-auth')
        const docExampleGen = require('../middlewares/doc-example-gen')
        const promMetrics = require('../middlewares/prom-metrics')
        const requestParser = require('../middlewares/request-parser')
        const statusCheck = require('../middlewares/status-check')

        promMetrics.init(app)

        // pay attention to the middlewares order
        this.middlewares.before = [
            promMetrics,
            requestParser,
            statusCheck,
            apiAuth,
            ...this.middlewares.before,
            docExampleGen
        ]
        this.middlewares.after = [requestParser, docExampleGen, ...this.middlewares.after, promMetrics]

        // api cache
        if (enabledCache) {
            const apiCache = require('../middlewares/api-cache')

            this.middlewares.before.splice(this.middlewares.before.indexOf(docExampleGen), 0, apiCache)
            this.middlewares.after.splice(this.middlewares.after.indexOf(docExampleGen), 0, apiCache)
        }
    }

    /**
     * set site maintain info //TODO: plugin
     */
    async enableMaintainInfo(args) {
        this.siteManitainInfo = args
    }

    /**
     * load all services from database
     * @returns {Promise<*>}
     */
    async _scanLocalServices() {
        const serviceFiles = []

        const loopServiceDir = (dir, category) => {
            const pa = fs.readdirSync(dir)
            pa.forEach((ele, index) => {
                const info = fs.statSync(dir + '/' + ele)
                if (info.isDirectory()) {
                    loopServiceDir(dir + '/' + ele, category ? `${category}/${ele}` : ele)
                } else {
                    const fileName = ele.endsWith('.jsc') ? path.basename(ele, '.jsc') : path.basename(ele, '.js')
                    if (fileName.endsWith('Service')) {
                        serviceFiles.push({
                            name: fileName.substr(0, fileName.lastIndexOf('Service')),
                            category_name: category,
                            file: dir + '/' + ele
                        })
                    }
                }
            })
        }

        // system default app services
        loopServiceDir(path.join(__dirname, '..', 'default-app', 'services'), 'default')
        loopServiceDir(path.join(global.APP_PATH, 'services'), '')
        return serviceFiles
    }

    /**
     * loop controoler diorectory and load all controllers
     * @returns {Promise<*>}
     */
    async _scanLocalControllers() {
        const controllerFiles = []

        const loopControllerDir = (dir, category) => {
            const pa = fs.readdirSync(dir)
            pa.forEach((ele, index) => {
                const info = fs.statSync(dir + '/' + ele)
                if (info.isDirectory()) {
                    loopControllerDir(dir + '/' + ele, category ? `${category}/${ele}` : ele)
                } else {
                    const fileName = ele.endsWith('.jsc') ? path.basename(ele, '.jsc') : path.basename(ele, '.js')
                    if (fileName.endsWith('Controller')) {
                        controllerFiles.push({
                            name: fileName.substr(0, fileName.lastIndexOf('Controller')),
                            category_name: category,
                            file: dir + '/' + ele
                        })
                    }
                }
            })
        }

        loopControllerDir(path.join(__dirname, '..', 'default-app', 'controllers'), 'default')
        loopControllerDir(path.join(global.APP_PATH, 'controllers'), '')
        return controllerFiles
    }

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

        // at most check two words
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
                    p.split('_').forEach((p1) => routeWords.push(p1))
                } else if (index === parts.length - 1) {
                    isUpdate = true
                }
            })

            _.reverse(routeWords)

            const taggedWords = nlp(routeWords.join(' ')).json()
            if (taggedWords.length > 0) {
                const tagTerms = taggedWords[0].terms
                tagTerms[tagTerms.length - 1].tags.forEach((t) => {
                    // put verb in front
                    if (t.startsWith('V')) {
                        isVerb = true
                        firstWord = tagTerms[tagTerms.length - 1].text
                    }
                })
            }
        }

        const getParts = (name, isLast) => {
            let names = ''
            name.split('_').forEach((n) => {
                names += CommUtils.capitalizeFirstLetter(n)
                // if (isLast) {
                //     names += CommUtils.capitalizeFirstLetter(n)
                // } else {
                //     names += CommUtils.capitalizeFirstLetter(pluralize(n, 1))
                // }
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
