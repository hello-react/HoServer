/**
 * request 网络请求工具
 * 更详细的 api 文档: https://github.com/umijs/umi-request
 */
import {notification} from 'antd'
import {extend} from 'umi-request'

import {getToken} from './authority'

/**
 * 异常处理程序
 */
const errorHandler = error => {
    const {response} = error

    if (!response) {
        notification.error({
            description: '您的网络发生异常，无法连接服务器',
            message: '网络异常',
        })
    }

    return response
}

/**
 * 配置request请求时的默认参数
 */

const request = extend({
    errorHandler,
    // 默认错误处理
    credentials: 'include', // 默认请求是否带上cookie
})

// 拦截 request, 添加 token.
request.interceptors.request.use(async (url, options) => {
    const token = getToken()
    if (token) {
        const headers = {
            'token': token
        }

        return {
            url,
            options: {...options, headers}
        }
    }

    return {
        url,
        options: {...options},
    }
})

export default request
