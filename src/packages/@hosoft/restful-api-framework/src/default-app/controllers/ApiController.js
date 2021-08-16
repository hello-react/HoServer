/* eslint-disable no-async-promise-executor,max-len */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/02/01
 **/

const _ = require('lodash')

const ApiService = require('../services/api/ApiService')

const Model = require('../../models/Model')
const { Constants, BaseHelper, ErrorCodes } = require('../../base')
// const { processModel } = require('../../models')

/**
 * Api related route
 */
class ApiController {
    // prettier-ignore
    initRoutes(container, router) {
        router.post('/api/sys_category', tf('setSysCategoryName'), async ctx => ApiService.setSysCategoryName(ctx.body), { model: 'Api' })

        // Model related api
        router.def('Model', 'detail', { permission: [] }).beforeProcess(this._getServiceMeta).afterProcess(async ctx => this._fillModeldetail(_.get(ctx, 'result')))
        router.def('Model', 'list')
            .beforeDbProcess(async (ctx, query) => this._sortAndRemoveUnpublic(ctx, query))
            .afterProcess(async ctx => this._fillModelRelInfo(_.get(ctx, ['result', 'list'])))

        router.def('Model', ['create', 'update']).afterProcess(async ctx => this._syncRdbModel(ctx))
        router.def('Model', ['delete', 'batch_delete']).beforeProcess(async ctx => this._checkReference(ctx, 1))
        router.def('Model.properties')

        // dictionary related api
        router.get('/api/dictionaries/categories', tf('getDictCategories'), async ctx => ApiService.getDictCategories(), { private: true, type: 1 })
        router.def('Dictionary', ['detail'])
        router.def('Dictionary', ['create', 'update', 'list'], { private: true })
        router.def('Dictionary', ['delete', 'batch_delete'], { private: true }).beforeProcess(async ctx => this._checkReference(ctx, 3))

        // Api related
        router.get('/api/apis', tf('getApiList'), async ctx => ApiService.getApiList(ctx.query, ctx.isSuperadmin()), { model: 'Api' })
        router.get('/api/apis/:id', tf('getApiDetailt'), async ctx => ApiService.getApiDetailt(ctx.req.params.id), { model: 'Api' })
        router.post('/api/apis/:id', tf('updateApi'), async ctx => ApiService.updateApi(ctx.req.params.id, ctx.body), { model: 'Api' })

        // Service related api
        router.get('/api/services', tf('getServiceList'), async ctx => ApiService.getServiceList(ctx.query), { category: 'system', type: 1 })
    }

    async _syncRdbModel(ctx) {
        if (!ctx.error) {
            const model = await BaseHelper.getDB('default').getModel(ctx.body)
            await model.sync()
        }
    }

    async _getServiceMeta(ctx) {
        // Service model hardcoded in BaseHelper
        if (_.get(ctx.req, ['params', 'name']) === 'Service') {
            ctx.setResult(BaseHelper.getModel('Service'))
            return Constants.HOOK_RESULT.RETURN
        }
    }

    async _fillModelRelInfo(models) {
        if (!models) return
        if (!(models instanceof Array)) {
            models = [models]
        }

        for (const model of models) {
            await this._setSubModel(model)

            const modelInst = BaseHelper.getModel(model.name)
            if (!modelInst) continue

            const schema = this._processSchemaType(modelInst.nativeModel.schema.obj)
            if (!schema) continue

            model.schema = schema
        }

        await ApiService.fillCategoryInfo(models)
    }

    async _fillModeldetail(model) {
        Model.setOutputFlag(model)
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
                        if (modelMeta) {
                            modelMeta = _.clone(modelMeta.meta)
                            delete modelMeta.instance
                            prop.relations.rel_model = modelMeta
                        } else {
                            logger.warn('relation model not exist: ' + prop.relations.name)
                        }
                        break
                    // case 3:
                    //     modelMeta = await BaseHelper.getSystemDict(prop.relations.name)
                    //     prop.relations.rel_model = modelMeta // dict may too big
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

    _sortAndRemoveUnpublic(ctx, query) {
        if (!query.sort) {
            query.sort = { type: 1, category_name: 1 }
        }

        if (ctx.isSuperadmin()) {
            return
        }

        const unpublicModels = BaseHelper.getContainer().getUnPublicModelNames()
        if (query.name) {
            query.$and = [{ name: query.name }, { name: { $nin: unpublicModels } }]
            delete query.name
        } else {
            query.name = { $nin: unpublicModels }
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
                if (
                    prop.relations &&
                    prop.relations.rel_type / 1 === type &&
                    modelNames.indexOf(prop.relations.name) > -1
                ) {
                    message = tf('errPropRefModel', {
                        model: model.meta.dis_name,
                        prop: prop.name,
                        ref_field: prop.relations.name
                    })
                    break
                }
            }

            if (message) break
        }

        if (message) {
            return Promise.reject({ message, code: ErrorCodes.API_ERR_REFERENCE })
        }
    }

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
            } else if (typeof prop === 'object') {
                schemObj[propName] = this._processSchemaType(prop)
            }
        }

        return schemObj
    }
}

module.exports = new ApiController()
