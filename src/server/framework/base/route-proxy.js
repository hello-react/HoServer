/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2019/8/6
 * author: Jack Zhang
 **/
const _ = require('lodash')
const pluralize = require('pluralize')

const BaseHelper = require('./helpers/base-helper')
const CacheManager = require('./memory-cache/cache-manager')
const Constants = require('./constants/constants')
const DefaultApiHandler = require('./default-api')

/**
 * RouteProxy 用来处理 Controller initRoutes 中初始化的路由列表
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

        if (!api.in_params) {
            api.in_params = []
        }

        if (!api.out_fields) {
            api.out_fields = []
        }

        this.api = api
        this.func = func

        this.fillCategoryName()
    }

    /**
     * 在默认路由处理函数执行数据库操作前修改数据库操作参数
     */
    beforeDbProcess(func) {
        this.beforeQueryFunc = func
        this.container.setHook('beforeDbProcess', func, this.api.path, this.api.method)
        return this
    }

    /**
     * 在默认路由处理函数执行前，对参数进行检查
     */
    beforeProcess(func) {
        this.container.setHook('beforeProcess', func, this.api.path, this.api.method)
        return this
    }

    /**
     * 在默认路由处理函数执行完毕后，在结果输出前对结果进行处理
     */
    afterProcess(func) {
        this.container.setHook('afterProcess', func, this.api.path, this.api.method)
        return this
    }

    /**
     * 设置 API 输出字段列表，主要针对默认 Api 请求
     *
     * @param modelName 对象模型名称
     * @param fields    fields 支持在Model默认输出字段列表基础上通过 +- 增减相应的字段
     * @returns {RouteProxy}
     */
    outFields(addFields, removeFields) {
        if (!(this.api.out_fields && this.api.out_fields.length > 0)) {
            logger.error('setOutputFields, api 未设置 out_fields', this.api)
            return this
        }

        if (addFields) {
            addFields = typeof addFields === 'string' ? addFields.split(/[\s|,，]/gi) : addFields
            if (!(addFields instanceof Array)) {
                throw new Error('outFields, addFields 参数类型错误')
            }

            let model = null
            let defOutFields = null

            if (this.api.model) {
                defOutFields = []
                model = BaseHelper.getModel(this.api.model)
                DefaultApiHandler.getApiOutFields(defOutFields, model.properties, '', true)
            }

            for (const field of addFields) {
                if (this.api.out_fields.findIndex(f => f.name === field) > -1) {
                    continue
                }

                let index = defOutFields.findIndex(f => f.name === field)
                if (index > -1) {
                    this.api.out_fields.push({ ...defOutFields[index] })

                    const relField = field + '_rel'
                    index = defOutFields.findIndex(f => f.name === relField)
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
                throw new Error('outFields, removeFields 参数类型错误')
            }

            for (const field of removeFields) {
                let index = this.api.out_fields.findIndex(f => f.name === field)
                if (index > -1) {
                    this.api.out_fields.splice(index, 1)

                    const relField = field + '_rel'
                    index = this.api.out_fields.findIndex(f => f.name === relField)
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

        const categoryNameDict = await BaseHelper.getSystemDictItem('sys_category')
        const modelNameMap = await this._getModelNameMap()

        const getCategoryDisName = (categoryName, mustExists) => {
            const disName = categoryNameDict[categoryName] || modelNameMap[categoryName]
            return mustExists ? disName || categoryName : disName
        }

        // 默认取两级分类
        const path = api.path
        const pos = path.indexOf(Constants.API_PREFIX)
        if (pos > -1) {
            let routePath = path.substr(pos + Constants.API_PREFIX.length + 1)
            if (routePath.startsWith('/')) {
                routePath = routePath.substr(1)
            }

            const parts = routePath.split('/')
            if (parts.length > 1) {
                const part1 = pluralize(parts[0], 1)
                const part2 = pluralize(parts[1], 1)
                const mainCatDis = getCategoryDisName(part1, true)
                const secondCatDis = getCategoryDisName(part2)

                api.main_category = part1
                api.main_category_disname = mainCatDis
                api.second_category = secondCatDis ? part2 : api.main_category // 如: /api/v1/user/login, second_category login 不合适
                api.second_category_disname = secondCatDis || '默认分类'
                api.category_name = part1 + (api.second_category ? '/' + api.second_category : '')
                api.category_disname = mainCatDis + (secondCatDis ? '/' + secondCatDis : '')
            }
        }

        if (!api.category_name) {
            api.main_category = 'default'
            api.main_category_disname = '默认分类'
            api.second_category = 'default'
            api.second_category_disname = '默认分类'
            api.category_name = 'default'
            api.category_disname = '默认分类'
        }

        if (!api.main_category) {
            api.main_category = api.category_name.split('/')[0]
        }
    }

    async _getModelNameMap() {
        let modelNameMap = await CacheManager.getCache('', 'ModelNameMap')
        if (!modelNameMap) {
            modelNameMap = {}

            const models = BaseHelper.getContainer().getAllModels()
            const modelNames = _.keys(models)
            for (const modelName of modelNames) {
                const modelDisName = models[modelName].dis_name
                modelNameMap[modelName] = modelDisName
                modelNameMap[modelName.toLowerCase()] = modelDisName
                modelNameMap[pluralize(modelName.toLowerCase())] = modelDisName
            }

            await CacheManager.setCache('', 'ModelNameMap', modelNameMap)
        }

        return modelNameMap
    }
}

module.exports = RouteProxy
