import {Constants, getToken, request} from '@hosoft/hos-admin-common'
import {message} from 'antd'

/**
 * 获取当前用户
 */
export async function queryCurrent() {
    const token = getToken()
    if (!token) {
        return null
    }

    const rep = await request(`${Constants.API_PREFIX}/user/current`, {
        method: 'GET',
        params: { token }
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取当前用户信息失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 用户登录
 */
export async function userLogin(args) {
    const url = args.type === 'mobile' ? `${Constants.API_PREFIX}/user/login/mobile` : `${Constants.API_PREFIX}/user/login`
    const rep = await request(url, {
        method: 'POST',
        data: args
    })

    if (rep.code / 1 !== 200) {
        message.error(`登录失败:  ${rep.message || '接口异常'}`)
        return {
            status: 'error',
            type: args.type,
            currentAuthority: 'guest',
        }
    }

    const permissions = (rep.data.permissions || []).map(p => p.name)
    if (rep.data.is_admin) {
        permissions.push('admin') // for menu authority
    }

    return {
        status: 'ok',
        type: args.type,
        autoLogin: args.autoLogin,
        currentAuthority: permissions,
        ...rep.data
    }
}
