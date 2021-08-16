/* eslint-disable */
/**
 * HoAppBase Client Ver 1.0
 * Copyright http://hab.helloreact.cn
 *
 * create: 2020/01/10
**/

import axios from 'axios'
import _ from 'lodash'

// ajax request
const request = async (urlObj = {}, args = {}, cancelObj) => {
    // console.log('request:', urlObj, args)

    try {
        const instance = axios.create()
        const CancelToken = axios.CancelToken

        // cancel
        const config = {
            cancelToken: new CancelToken(function executor(c) {
                if (cancelObj && typeof cancelObj === 'object') {
                    cancelObj.cancel = c
                }
            })
        }

        // header
        if (!_.isEmpty(urlObj.headers) && _.isObject(urlObj.headers)) {
            for (const key in urlObj.headers) {
                if (urlObj.headers.hasOwnProperty(key)) {
                    instance.defaults.headers.common[key] = urlObj.headers[key]
                }
            }
        }

        // merge args
        if (urlObj.args) {
            args = Object.assign(urlObj.args, args)
        }

        // url params replace
        let uri = urlObj.url
        if (uri.indexOf(':') > -1) {
            uri = uri
                .split('/')
                .map(p => {
                    if (p.startsWith(':')) {
                        const key = p.substr(1)
                        if (args[key]) {
                            p = args[key]
                            delete args[key]
                        }
                    }

                    return p
                })
                .join('/')
        }

        // now submit request
        let res = null

        console.log('====> request args: ', urlObj.method, uri, JSON.stringify(args))
        if (urlObj.method.toLowerCase() === 'get') {
            config.params = args
            res = await instance.get(uri, config)
        } else {
            config.method = urlObj.method
            config.url = uri
            config.data = args
            res = await instance.request(config)
        }

        console.log('<==== response data: ', urlObj.method, uri, res.data)

        return res.data
    } catch (e) {
        console.error('<==== error happens: ', e)

        if (e.message) {
            return { code: -1, message: e.message }
        } else {
            return { code: -1, message: 'network error' }
        }
    }
}

export default request
