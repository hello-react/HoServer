/* eslint-disable prefer-regex-literals */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2019/8/6
 **/
const _ = require('lodash')
const pluralize = require('pluralize')

const BaseHelper = require('../helpers/base-helper')
const CacheManager = require('../memory-cache/cache-manager')
const Constants = require('../constants/constants')
const DefaultApiHandler = require('../default-api')

const rReturnFunc = new RegExp(/return.*?Service\.(.*?)\(/)
const rFunc = new RegExp(/Service\.(.*?)\(/)

/**
 * Route proxy
 */
class RouteProxy {
    constructor(container, apiInfo, method, path, disName, func, options) {
        this.container = container

        const api = {}
        api.method = method
        api.path = path
        api.dis_name = disName
        if (options) {
            if (options.permissions && typeof options.permissions === 'string') {
                options.permissions = [options.permissions]
            }

            if (options.cache && typeof options.cache === 'boolean') {
                options.cache = { enabled: options.cache }
            }

            _.merge(api, options)
        }

        if (apiInfo) {
            _.merge(api, apiInfo)
        }

        if (!api.name) {
            const functionCode = func.toString ? func.toString() : ''
            let match = functionCode.match(rReturnFunc)
            if (match && match[1]) {
                api.name = match[1]
            } else {
                match = functionCode.match(rFunc)
                if (match && match[1]) {
                    api.name = match[1]
                }
            }
        }

        if (!api.type) {
            if (api.model) {
                const model = BaseHelper.getModel(api.model)
                api.type = model ? model.meta.type || 3 : 3 // by default user defined
            } else {
                api.type = 3
            }
        }

        if (!api.in_params) {
            api.in_params = []
        }

        if (!api.out_fields) {
            api.out_fields = []
        }

        this.api = api
        this.func = func

        // this.fillCategoryName() // async
    }

    beforeDbProcess(func) {
        this.beforeQueryFunc = func
        this.container.setHook('beforeDbProcess', func, this.api.path, this.api.method)
        return this
    }

    beforeProcess(func) {
        this.container.setHook('beforeProcess', func, this.api.path, this.api.method)
        return this
    }

    afterProcess(func) {
        this.container.setHook('afterProcess', func, this.api.path, this.api.method)
        return this
    }

    outFields(addFields, removeFields) {
        if (!(this.api.out_fields && this.api.out_fields.length > 0)) {
            logger.error("api hasn't set out_fields: " + this.api.name)
            return this
        }

        if (addFields) {
            addFields = typeof addFields === 'string' ? addFields.split(/[\s|,，]/gi) : addFields
            if (!(addFields instanceof Array)) {
                throw new Error('addFields param type error')
            }

            let model = null
            let defOutFields = null

            if (this.api.model) {
                defOutFields = []
                model = BaseHelper.getModel(this.api.model)
                DefaultApiHandler.getModelOutFields(defOutFields, model.properties, '', true)
            }

            for (const field of addFields) {
                if (this.api.out_fields.findIndex((f) => f.name === field) > -1) {
                    continue
                }

                let index = defOutFields.findIndex((f) => f.name === field)
                if (index > -1) {
                    this.api.out_fields.push({ ...defOutFields[index] })

                    const relField = field + '_rel'
                    index = defOutFields.findIndex((f) => f.name === relField)
                    if (index > -1) {
                        this.api.out_fields.push({ ...defOutFields[index] })
                    }
                } else {
                    this.api.out_fields.push({
                        name: field,
                        description: ''
                    })
                }
            }
        }

        if (removeFields) {
            removeFields = typeof removeFields === 'string' ? removeFields.split(/[|,，]/gi) : removeFields
            if (!(removeFields instanceof Array)) {
                throw new Error('removeFields param type error')
            }

            for (const field of removeFields) {
                let index = this.api.out_fields.findIndex((f) => f.name === field)
                if (index > -1) {
                    this.api.out_fields.splice(index, 1)

                    const relField = field + '_rel'
                    index = this.api.out_fields.findIndex((f) => f.name === relField)
                    if (index > -1) {
                        this.api.out_fields.splice(index, 1)
                    }
                }
            }
        }

        return this
    }

    async fillCategoryName() {
        const api = this.api

        const categoryNameDict = await BaseHelper.getSystemDict('sys_category')
        const modelNameMap = await this._getModelNameMap()
        const modelRouteMap = await this._getModelRouteMap()

        const getCategoryDisName = (categoryName, mustExists) => {
            if (categoryName === '_default') {
                return tf('defaultCategory')
            }

            let disName = categoryNameDict[categoryName]
            if (!disName) {
                const model = modelNameMap[categoryName]
                disName = model ? model.disName : ''
            }
            return mustExists ? disName || categoryName : disName
        }

        let mainCategory = api.category
        let secondCategory = ''

        let routePath = ''
        const pos = api.path.indexOf(Constants.API_PREFIX)
        if (pos > -1) {
            routePath = api.path.substr(pos + Constants.API_PREFIX.length + 1)
            if (routePath.startsWith('/')) {
                routePath = routePath.substr(1)
            }
        }

        const parts = routePath.split('/')
        if (parts.length > 2) {
            routePath = `${parts[0]}/${parts[1]}`
        }

        // check model
        if (!mainCategory) {
            if (api.model) {
                const model = BaseHelper.getModel(api.model)
                mainCategory = model ? model.meta.category_name : ''
                secondCategory = api.model
            } else if (routePath) {
                const modelName = modelRouteMap[routePath]
                if (modelName) {
                    const model = BaseHelper.getModel(modelName)
                    mainCategory = model ? model.meta.category_name : ''
                    secondCategory = modelName
                }
            }
        }

        if (routePath) {
            if (parts.length > 0) {
                // const part1 = pluralize(parts[0], 1) // sns has problem
                const part0 = categoryNameDict[parts[0]] ? parts[0] : pluralize(parts[0], 1)
                const part1 =
                    parts.length === 1 ? (categoryNameDict[parts[0]] ? pluralize(parts[0], 1) : parts[0]) : parts[1]
                // ex: /api/v1/payment/prepay/wx, make same category as Payment model
                if (!mainCategory && modelNameMap[part1]) {
                    const routeModel = BaseHelper.getModel(modelNameMap[part1].name)
                    mainCategory = routeModel ? routeModel.meta.category_name : ''
                }

                if (mainCategory) {
                    api.main_cat = mainCategory
                    api.main_catname = getCategoryDisName(api.main_cat, true)
                } else {
                    api.main_cat = part0 || '_default'
                    api.main_catname = getCategoryDisName(part0, true)
                }

                if (!secondCategory) {
                    if (parts.length > 1) {
                        secondCategory = categoryNameDict[parts[1]] ? pluralize(parts[1], 1) : parts[1]
                    } else {
                        secondCategory = part1
                    }
                }

                api.second_catname = getCategoryDisName(secondCategory || '_default')

                // ex: app/active_code, when active_code is not in dict
                if (!api.second_catname) {
                    api.second_catname = tf('defaultCategory')
                    api.second_cat = '_default'
                } else {
                    api.second_cat = secondCategory
                }

                api.category_name = api.main_cat + (api.second_cat ? '/' + api.second_cat : '')
            }
        }

        if (!api.category_name) {
            api.main_cat = '_default'
            api.main_catname = tf('defaultCategory')
            api.second_cat = '_default'
            api.second_catname = tf('defaultCategory')
            api.category_name = '_default'
        }
    }

    async _getModelRouteMap() {
        let modelRouteMap = await CacheManager.getCache('', 'ModelRouteMap')
        if (!modelRouteMap) {
            modelRouteMap = {}

            const models = BaseHelper.getContainer().getAllModels()
            const keys = _.keys(models)
            for (const modelName of keys) {
                const routePath = models[modelName].getRoutePath()
                modelRouteMap[routePath.routeName] = modelName
            }

            await CacheManager.setCache('', 'ModelRouteMap', modelRouteMap)
        }

        return modelRouteMap
    }

    async _getModelNameMap() {
        let modelNameMap = await CacheManager.getCache('', 'ModelNameMap')
        if (!modelNameMap) {
            modelNameMap = {}

            const models = BaseHelper.getContainer().getAllModels()
            const modelNames = _.keys(models)
            for (const modelName of modelNames) {
                const dictItem = { name: modelName, disName: models[modelName].meta.dis_name }
                modelNameMap[modelName] = dictItem
                modelNameMap[modelName.toLowerCase()] = dictItem
                if (pluralize.isPlural(modelName)) {
                    modelNameMap[pluralize(modelName, 1)] = dictItem
                    modelNameMap[pluralize(modelName.toLowerCase(), 1)] = dictItem
                } else {
                    modelNameMap[pluralize(modelName.toLowerCase())] = dictItem
                }
            }

            await CacheManager.setCache('', 'ModelNameMap', modelNameMap)
        }

        return modelNameMap
    }
}

module.exports = RouteProxy
