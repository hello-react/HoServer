import {Constants, request} from '@hosoft/hos-admin-common'
import {message} from 'antd'

/**
 * 获取服务端启用插件列表，大部分管理平台插件需要服务端插件接口支持
 */
export async function queryServerPlugins() {
    const rep = await request(`${Constants.API_PREFIX}/system/plugins/installed`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取服务端插件列表:  ${rep.message || '接口异常'}`)
    } else {
        return rep.data
    }
}
