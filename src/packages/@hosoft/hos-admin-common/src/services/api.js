import {message} from "antd"
import Constants from '../common/constants'
import request from '../common/request'

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

export default wrapper
