/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/03/09
 **/
const moment = require('moment')
const { Constants, ErrorCodes } = require('../../base')

const excludeDemoRoutes = ['/api/models/export']

/**
 * check api disabled, api mock result, site maintain, demo site
 */
const before = async context => {
    const { apiRoute } = context
    const { api } = apiRoute

    // check if api has been disabled
    if (api.disabled && !((api.permissions || []).includes('anonymous') || context.hasPermission('api:manage'))) {
        return Promise.reject({ message: `Api 已禁用: ${api.method} ${api.path}`, code: ErrorCodes.GENERAL_ERR_PARAM })
    }

    // check site maintain
    const { siteManitainInfo } = context.container
    // prettier-ignore
    if (siteManitainInfo && siteManitainInfo.enabled && !((api.permissions || []).includes('anonymous') || context.hasPermission('api:manage'))) {
        let isMaintain = true
        if ((siteManitainInfo.start_time && moment().diff(siteManitainInfo.start_time) < 0)
            || (siteManitainInfo.end_time && moment().diff(siteManitainInfo.end_time) > 0)){
            isMaintain = false
        }

        if (isMaintain) {
            return Promise.reject({ message: siteManitainInfo.description, code: ErrorCodes.SYSTEM_ERR_MAINTAIN })
        }
    }

    // check api mock result
    if (api.mock_result) {
        context.setResult(api.mock_result)
        logger.info(`executeApi, force mock result: ${api.method} ${api.path}`)
        return Constants.API_RESULT.RETURN
    }

    // demo site not allow post
    const apiPermissions = api.permissions || ['site:access']
    if (Constants.IS_DEMO_SITE && apiPermissions.length > 0 && api.method === Constants.API_HTTP_METHOD.POST) {
        for (const route of excludeDemoRoutes) {
            if (api.path.match(route)) {
                return null
            }
        }

        context.error = { message: '演示站点不允许写入操作', code: ErrorCodes.GENERAL_ERR_READONLY }
        return Constants.API_RESULT.RETURN
    }
}

module.exports = {
    before: before
}
