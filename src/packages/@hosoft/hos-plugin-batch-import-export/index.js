/* eslint-disable no-async-promise-executor */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
**/

const ImportExportService = require('./service')
const { BaseHelper } = require('@hosoft/restful-api-framework/helpers')
const { ErrorCodes } = require('@hosoft/restful-api-framework/base')

/**
 * Plugin for batch export and import data
 */
class BatchImportExportPlugin {
    init(container, router, app) {
        router.get('/api/models/import/template', tp('downloadModelTemplate'), this._createModelTemplate, { model: 'Model' })
        router.post('/api/models/import/prepare', tp('prepareImportModelData'), async ctx => ImportExportService.prepareImportModelData(ctx.body), {
            model: 'Model'
        })
        router.post('/api/models/import', tp('importModelData'), async ctx => ImportExportService.importModelData(ctx.body, true), { model: 'Model' })
        router.post('/api/models/export', tp('exportModelData'), async ctx => this._exportModelData(ctx), { model: 'Model' })
    }

    _createModelTemplate(ctx) {
        const { model_name } = ctx.query
        const model = BaseHelper.getModel(model_name)
        if (!model) {
            return Promise.reject({ message: tp('errModelNotFound', { name: model_name }), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        return new Promise(async (resolve, reject) => {
            const result = await ImportExportService.exportModelData({
                model_name,
                scope: 2,
                fields: {},
                data: [],
                format: 'xlsx'
            })

            ctx.res.download(result.file, model.dis_name + '_import_template.xlsx', err => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    async _exportModelData(ctx) {
        const result = await ImportExportService.exportModelData(ctx.body)
        return result.url
    }
}

module.exports = new BatchImportExportPlugin()
