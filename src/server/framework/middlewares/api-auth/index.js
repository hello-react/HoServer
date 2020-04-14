/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/03/09
 **/
const _ = require('lodash')
const { Constants, ErrorCodes } = require('../../base')

/**
 * this middleware is used to check user role,
 * and also set default values for api input
 */
const before = async context => {
    const { req, apiRoute } = context
    const { body, query } = req
    const { api } = apiRoute

    // 检查角色权限
    const apiPermissions = api.permissions || ['site:access'] // 默认必须是站点合法用户才能调用
    if (apiPermissions.length > 0) {
        const userPermissions = _.get(context.currentUser, 'permissions', [])
        if (_.intersectionBy(apiPermissions, userPermissions, p => p.name || p).length === 0) {
            return Promise.reject({ message: '无访问权限', code: ErrorCodes.GENERAL_ERR_UNAUTHORIZED })
        }
    }

    const inParams = api.in_params || []

    // prettier-ignore
    for (let i = 0; i < inParams.length; i++) {
        const param = inParams[i]

        // 默认值
        if (!param.default_val) {
            continue
        }

        // 查询时除非强制，否则不使用默认值
        if (api.method === 'GET' || api.method === 'DELETE') {
            if (!context.isAdmin() && param.flag === Constants.API_IN_PARAM_FLAG.DEFAULT) {
                query[param.name] = context.parseCommonParam(param.default_val)
            }
        } else {
            if (!body[param.name] || (!context.isAdmin() && param.flag === Constants.API_IN_PARAM_FLAG.DEFAULT)) {
                let obj = body

                const names = param.name.split('.')
                const lastName = names[names.length - 1]
                for (let i = 0; i < names.length - 1; i++) {
                    obj = obj[names[i]]
                    if (!obj) {
                        break
                    }
                }

                if (obj) {
                    obj[lastName] = context.parseCommonParam(param.default_val)
                }
            }
        }
    }
}

module.exports = {
    before: before
}
