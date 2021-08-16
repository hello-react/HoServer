import {Constants, request} from '@hosoft/hos-admin-common'
import {message} from "antd"

/**
 * 启用/禁用插件
 */
export async function enablePlugin(plugin, enabled) {
    const rep = await request(`${Constants.API_PREFIX}/system/plugins/enable`, {
        method: 'POST',
        data: {
            name: plugin.name,
            enabled,
            package_info: plugin.packages
        }
    })

    if (rep.code / 1 !== 200) {
        message.error(`${enabled ? '启用' : '禁用'}插件出错:  ${rep.message || '接口异常'}`)
        return false
    }

    return true
}
