/* eslint-disable camelcase */
/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: Jack Zhang
 **/
const _ = require('lodash')

/**
 * Call context, 对于每一个 http 请求，对应一个唯一的 Context 对象，
 * 保存所有操作上下文信息
 */
class Context {
    constructor(container, req, res) {
        // 上下文变量
        this.container = container
        this.apiRoute = null
        this.apiHooks = {}

        this.currentUser = {}
        this.currentUserId = null

        this.res = res
        this.req = req
        this.body = null
        this.query = null
        this.params = null
        this.result = null
        this.extraInfo = {}
        this.error = null
        this.finished = false
    }

    /**
     * get GET or POST params
     */
    $(param, defVal) {
        if (this.query && this.query[param]) {
            return this.query[param]
        } else if (this.body && this.body[param]) {
            return this.body[param]
        } else if (this.params && this.params[param]) {
            return this.params[param]
        }

        return defVal
    }

    /**
     * merge params
     * @param args
     */
    mergeParams(args) {
        _.merge(this.params, args)
    }

    /**
     * set result data
     */
    setResult(data, replace = false) {
        if (!this.result || replace === true) {
            this.result = data
        } else {
            this.result = _.merge(this.result, data)
        }
    }

    isAdmin() {
        return _.get(this.currentUser, 'is_admin', false)
    }

    parseCommonParam(val) {
        if (val === 'current_user_id') {
            return this.currentUserId
        } else if (val === 'now') {
            return Date.now()
        }

        return val
    }

    /**
     * 用户是否是指定的角色
     */
    hasRole(role, userInfo) {
        if (!userInfo) {
            userInfo = this.currentUser
        }

        if (!userInfo) {
            return false
        }

        return _.get(userInfo, 'roles', []).includes(role)
    }

    /**
     * 用户是否有指定的权限
     */
    hasPermission(permission, userInfo) {
        if (!userInfo) {
            userInfo = this.currentUser
        }

        if (!userInfo) {
            return false
        }

        const permissions = _.get(userInfo, 'permissions', [])
        return permissions.find(p => p.name === permission)
    }
}

module.exports = Context
