/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/
const _ = require('lodash')
const config = require('@hosoft/config')
const jwt = require('jsonwebtoken')
const { BaseHelper, CacheManager, ErrorCodes } = require('../../base')
const { User } = require('../../models')

// const paginationKeys = ['page', 'page_size', 'offset', 'sort']

/**
 * parse the http request, save all POST/GET parameters to context
 */
const before = async (context) => {
    const req = context.req

    const body = req.body
    const query = req.query

    if (query.limit) {
        query.page_size = query.limit
    }

    if (query.page) {
        query.page = query.page / 1
    }

    if (query.offset) {
        query.offset = query.offset / 1
    }

    if (query.page_size) {
        query.page_size = query.page_size / 1
    }

    context.body = body
    context.query = query
    context.params = req.params

    // parse user info from token
    const token = req.body.token || req.query.token || req.headers.token
    if (token && token !== 'undefined') {
        try {
            const decoded = await jwt.verify(token, config.get('jwt.secret'))
            context.currentUserId = decoded.id
            let userInfo = await CacheManager.getCache('UserInfo', decoded.id)
            if (!userInfo) {
                userInfo = await User.findOne({ user_id: context.currentUserId })
                await BaseHelper.getServiceInst('User').setUserRolePermission(userInfo)
                await CacheManager.setCache('UserInfo', decoded.id, userInfo, 600) // expire after 10 minutes
            }

            context.currentUser = userInfo
        } catch (err) {
            logger.error('decode user token error: ' + token, err)

            /*
            {
                name: 'TokenExpiredError',
                message: 'jwt expired',
                expiredAt: 1408621000
            } */
            const api = _.get(context, ['apiRoute', 'api'])
            if (err instanceof jwt.JsonWebTokenError && api.open !== true) {
                return Promise.reject({ message: tf('errTokenExpire'), code: ErrorCodes.USER_ERR_TOKEN_EXPIRE })
            }
        }
    }
}

module.exports = {
    before: before
}
