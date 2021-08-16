import { Constants, request } from "@hosoft/hos-admin-common"
import {message} from "antd"

const wrapper = {}

/**
 * 获取当前服务端 Sdk 版本信息 (所有支持的语言)
 */
wrapper.getClientSdkInfo = async () => {
    const rep = await request(`${Constants.API_PREFIX }/api/sdk/info`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取 SDK 版本信息失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 重新生成客户端 Sdk
 */
wrapper.generateClientSdk = async (language) => {
    const rep = await request(`${Constants.API_PREFIX }/api/sdk`, {
        method: 'POST',
        data: { language }
    })

    if (rep.code / 1 !== 200) {
        message.error(`生成客户端 Sdk失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 打包下载客户端 Sdk
 */
wrapper.downloadClientSdk = async (language) => {
    const rep = await request(`${Constants.API_PREFIX }/api/sdk/download`, {
        method: 'POST',
        data: { language }
    })

    if (rep.code / 1 !== 200) {
        message.error(`下载客户端 Sdk失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

export default wrapper
