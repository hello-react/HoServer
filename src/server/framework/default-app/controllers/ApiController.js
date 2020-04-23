/* eslint-disable no-async-promise-executor */
/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/02/01
 * author: Jack Zhang
 **/

const _ = require('lodash')

const ApiService = require('../services/api/ApiService')

const { Constants, BaseHelper, ErrorCodes } = require('../../base')
const { processModel } = require('../../models')

/**
 * 资源服务，提供对资源、课件相关功能的接口
 */
class ApiController {
    // prettier-ignore
    initRoutes(container, router) {
        router.post('/api/sys_category', '修改分类名称(服务、Api等)', async ctx => ApiService.setSysCategoryName(ctx.body), { model: 'Api' })

        // Model 相关路由
        router.def('Model', 'detail').beforeProcess(this._getServiceMeta).afterProcess(async ctx => this._fillModeldetail(_.get(ctx, 'result')))
        router.def('Model', 'list')
            .beforeDbProcess(async (_, query) => this._removeUnpublicModel(query))
            .afterProcess(async ctx => this._fillModelRelInfo(_.get(ctx, ['result', 'list'])))

        router.def('Model', ['create', 'update']).beforeDbProcess(async (_, inputObj) => processModel(inputObj))
        router.def('Model', ['delete', 'batch_delete']).beforeProcess(async ctx => this._checkReference(ctx, 1))

        // 字典相关路由
        router.get('/api/dictionaries/categories', '获取词典分类列表', async ctx => ApiService.getDictCategories(), { public: false })
        router.def('Dictionary', ['detail'])
        router.def('Dictionary', ['create', 'update', 'list'], { public: false })
        router.def('Dictionary', ['delete', 'batch_delete'], { public: false }).beforeProcess(async ctx => this._checkReference(ctx, 3))

        // Api 相关路由
        router.get('/api/apis', '获取 API 列表', async ctx => ApiService.getApiList(ctx.query), { model: 'Api' })
        router.get('/api/apis/:id', '获取 API 详情', async ctx => ApiService.getApiDetailt(ctx.req.params.id), { model: 'Api' })
        router.post('/api/apis/:id', '更新 API 信息', async ctx => ApiService.updateApi(ctx.req.params.id, ctx.body), { model: 'Api' })

        // Service 路由
        router.get('/api/services', '获取服务列表', async ctx => ApiService.getServiceList(ctx.query), { model: 'Service' })

    }

    async _getServiceMeta(ctx) {
        // Service model hardcoded in BaseHelper
        if (_.get(ctx.req, ['params', 'name']) === 'Service') {
            ctx.setResult(BaseHelper.getModel('Service'))
            return Constants.API_RESULT.RETURN
        }
    }

    async _fillModelRelInfo(models) {
        if (!models) return
        if (!(models instanceof Array)) {
            models = [models]
        }

        for (const model of models) {
            await this._setSubModel(model)

            const schema = _.get(BaseHelper.getModel(model.name), 'schema')
            if (schema) {
                model.schema = schema
            }
        }

        await ApiService.fillCategoryInfo(models)
    }

    async _fillModeldetail(model) {
        processModel(model)
        await this._fillModelRelInfo(model)
    }

    async _setSubModel(model) {
        if (!model.properties) {
            return
        }

        for (const prop of model.properties) {
            if (prop.relations && prop.relations.rel_type) {
                let modelMeta
                const relType = prop.relations.rel_type / 1
                switch (relType) {
                    case 1:
                        modelMeta = await BaseHelper.getModel(prop.relations.name)
                        modelMeta = _.clone(modelMeta)
                        delete modelMeta.instance
                        prop.relations.rel_model = modelMeta
                        break
                    // case 3:
                    //     modelMeta = await BaseHelper.getSystemDictItem(prop.relations.name)
                    //     prop.relations.rel_model = modelMeta // 字典有可能太大了
                    //     break
                    default:
                        break
                }
            }

            if (prop && prop.properties) {
                await this._setSubModel(prop)
            }
        }
    }

    _removeUnpublicModel(query) {
        if (query.name) {
            query.$and = [{ name: query.name }, { name: { $nin: ['Model'] } }]
            delete query.name
        } else {
            query.name = { $nin: ['Model'] }
        }
    }

    async _checkReference(ctx, type) {
        let modelNames = ctx.$('name')
        if (!(modelNames instanceof Array)) {
            modelNames = [modelNames]
        }

        const models = BaseHelper.getContainer().getAllModels()
        const keys = _.keys(models)
        let message = null

        for (const key of keys) {
            const model = models[key]
            for (const prop of model.properties) {
                if (prop.relations && prop.relations.rel_type / 1 === type && modelNames.indexOf(prop.relations.name) > -1) {
                    message = `对象 "${model.dis_name}" 属性 ${prop.name} 引用了 ${prop.relations.name}，请先解除引用后再删除`
                    break
                }
            }

            if (message) break
        }

        if (message) {
            return Promise.reject({ message, code: ErrorCodes.API_ERR_REFERENCE })
        }
    }

}

module.exports = new ApiController()
