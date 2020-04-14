import {message} from "antd"

import InterfaceService from "@/services/interface"
import Constants from '@/utils/constants'
import request from '@/utils/request'

/**
 * 创建对象模型
 */
export async function createModel(record) {
    const rep = await request(`${Constants.API_PREFIX}/api/models`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`创建对象模型失败:  ${rep.message || '接口异常'}`)
        return null
    }

    InterfaceService.resetCache('model')
    return rep.data
}

/**
 * 更新对象模型
 */
export async function updateModel(name, record) {
    const rep = await request(`${Constants.API_PREFIX}/api/models/${name}`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`更新对象模型失败:  ${rep.message || '接口异常'}`)
        return null
    }

    InterfaceService.resetCache('model')
    return rep.data
}

/**
 * 删除对象模型，需确保对象模型没有被其他模型引用
 */
export async function deleteModel(name) {
    const rep = await request(`${Constants.API_PREFIX}/api/models/${name}`, {
        method: 'DELETE'
    })

    if (rep.code / 1 !== 200) {
        message.error(`删除对象模型失败:  ${rep.message || '接口异常'}`)
        return null
    }

    InterfaceService.resetCache('model')
    return rep.data
}

/**
 * 批量删除对象模型
 */
export async function batchDeleteModel(records) {
    const rep = await request(`${Constants.API_PREFIX}/api/models/batch`, {
        method: 'DELETE',
        data: {name: records.map(r => r.name)}
    })

    if (rep.code / 1 !== 200) {
        message.error(`批量删除对象模型失败:  ${rep.message || '接口异常'}`)
        return null
    }

    InterfaceService.resetCache('model')
    return rep.data
}
