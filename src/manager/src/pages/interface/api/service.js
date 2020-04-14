import {message} from "antd"

import Constants from "@/utils/constants"
import request from '@/utils/request'

const wrapper = {}

/**
 * 获取 Api 详情
 */
wrapper.getApiDetail = async function (id) {
    const rep = await request(`${Constants.API_PREFIX}/api/apis/${id}`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取 Api 详情失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 强制 Api 返回 Mock 结果
 */
wrapper.forceMockResult = async (id, mockResult) => {
    const rep = await request(`${Constants.API_PREFIX }/api/apis/${id}`, {
        method: 'POST',
        data: { mock_result: mockResult }
    })

    if (rep.code / 1 !== 200) {
        message.error(`修改 Api 信息失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 启用/禁用 Api
 */
wrapper.enableApi = async (id, enable) => {
    const rep = await request(`${Constants.API_PREFIX }/api/apis/${id}`, {
        method: 'POST',
        data: { disabled: !enable }
    })

    if (rep.code / 1 !== 200) {
        message.error(`修改 Api 信息失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 更新 Api 信息
 */
wrapper.updateApi = async (id, apiInfo) => {
    const rep = await request(`${Constants.API_PREFIX }/api/apis/${id}`, {
        method: 'POST',
        data: apiInfo
    })

    if (rep.code / 1 !== 200) {
        message.error(`修改 Api 信息失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 修改 Api 名称
 */
wrapper.setApiName = async (id, name) => {
    const rep = await request(`${Constants.API_PREFIX }/api/apis/${id}`, {
        method: 'POST',
        data: { name }
    })

    if (rep.code / 1 !== 200) {
        message.error(`修改 Api 信息失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

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

/**
 * 获取当前服务端文档版本信息 (文档 / Postman)
 */
wrapper.getApiDocInfo = async () => {
    const rep = await request(`${Constants.API_PREFIX }/api/doc/info`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取文档版本信息失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 生成 Api 接口文档
 */
wrapper.generateApiDoc = async () => {
    const rep = await request(`${Constants.API_PREFIX }/api/doc`, {
        method: 'POST'
    })

    if (rep.code / 1 !== 200) {
        message.error(`生成 Api 接口文档失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 生成 Postman 集合
 */
wrapper.generatePostman = async () => {
    const rep = await request(`${Constants.API_PREFIX }/api/postman`, {
        method: 'POST'
    })

    if (rep.code / 1 !== 200) {
        message.error(`生成 Postman 集合失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

export default wrapper
