/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/03/09
 **/
const _ = require('lodash')
const { Constants, ErrorCodes } = require('../../base')

/**
 * this middleware is used to check user role, permissions,
 * and also set default values for api input
 */
const before = async (context) => {
    const { apiRoute, body, query } = context
    const { api } = apiRoute

    if (api.open !== true) {
        const apiPermissions = api.permissions === undefined ? ['site:access'] : api.permissions
        if (apiPermissions && apiPermissions.length > 0) {
            const userPermissions = _.get(context.currentUser, 'permissions', [])
            if (_.intersectionBy(apiPermissions, userPermissions, (p) => p.name || p).length === 0) {
                return Promise.reject({ message: tf('errAccessDenied'), code: ErrorCodes.GENERAL_ERR_UNAUTHORIZED })
            }
        }
    }

    const inParams = api.in_params || []

    // prettier-ignore
    for (let i = 0; i < inParams.length; i++) {
        const param = inParams[i]

        // default value
        if (!param.default_val) {
            continue
        }

        // for query, delete use default value only when force to use
        if (api.method === 'GET' || api.method === 'DELETE') {
            if (!context.isAdmin() && param.flag === Constants.API_IN_PARAM_FLAG.DEFAULT) {
                query[param.name] = context.parseCommonParam(param.default_val)
            }
        } else {
            if (body[param.name] === undefined
                || (!context.isAdmin() && param.flag === Constants.API_IN_PARAM_FLAG.DEFAULT)) {
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
