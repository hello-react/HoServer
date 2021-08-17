/* eslint-disable camelcase */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/
const _ = require('lodash')
const DefaultApiHandler = require('./default-api')

/**
 * Call context, for each http request，create individual Context object,
 * to save api execute related info
 */
class Context {
    constructor(container, req, res) {
        this.container = container
        this.apiRoute = null
        this.apiHooks = {}

        this.currentUser = {}
        this.currentUserId = null

        this._body = null
        this._query = null
        this._params = null

        this.res = res
        this.req = req
        this.result = null
        this.extraInfo = {}
        this.error = null
        this.finished = false

        this.isDevMode = /(default|dev)/i.test(process.env.NODE_ENV || 'default')
        this.apiParamSetter = {
            get: (target, prop) => this.checkGenApiInParam(target, prop),
            set: (target, prop, value) => {
                this.checkGenApiInParam(target, prop)
                target[prop] = value
                return true
            }
        }
        this.apiModified = false
    }

    set body(bodyObj) {
        if (this.isDevMode) {
            this._body = new Proxy({ ...bodyObj }, this.apiParamSetter)
        } else {
            this._body = bodyObj
        }
    }

    get body() {
        return this._body
    }

    set query(queryObj) {
        if (this.isDevMode) {
            this._query = new Proxy({ ...queryObj }, this.apiParamSetter)
        } else {
            this._query = queryObj
        }
    }

    get query() {
        return this._query
    }

    set params(paramsObj) {
        if (this.isDevMode) {
            this._params = new Proxy({ ...paramsObj }, this.apiParamSetter)
        } else {
            this._params = paramsObj
        }
    }

    get params() {
        return this._params
    }

    /**
     * auto add api in params in develop mode
     */
    checkGenApiInParam(target, prop) {
        if (DefaultApiHandler.getCommonQueryKeys().indexOf(prop) > -1) {
            return target[prop]
        }

        const api = this.apiRoute.api
        if (api) {
            if (!api.in_params.find((p) => p.name === prop)) {
                if (!api.in_params) {
                    api.in_params = []
                }

                api.in_params.push({
                    name: prop,
                    type: '',
                    description: tf('autoGen')
                })

                this.apiModified = true
            }
        }

        return target[prop]
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
     * set result data
     */
    setResult(data, replace = false) {
        if (!this.result || replace === true) {
            this.result = data
        } else {
            this.result = _.merge(this.result, data)
        }
    }

    isSuperadmin() {
        return _.get(this.currentUser, 'user_name') == 'superadmin'
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
     * check if user has specified role
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
     * check if user has specified permission
     */
    hasPermission(permission, userInfo) {
        if (!userInfo) {
            userInfo = this.currentUser
        }

        if (!userInfo) {
            return false
        }

        const permissions = _.get(userInfo, 'permissions', [])
        return permissions.find((p) => p.name === permission)
    }
}

module.exports = Context
