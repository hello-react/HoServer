import {message} from "antd"

import InterfaceService from '@/services/interface'
import Constants from "@/utils/constants"
import request from '@/utils/request'

let dictCategories = null

/**
 * 获取字典分类列表
 */
export async function getDictCategories() {
    if (!dictCategories) {
        const rep = await request(`${Constants.API_PREFIX}/api/dictionaries/categories`, {
            method: 'GET'
        })

        if (rep.code / 1 !== 200) {
            dictCategories = []
            message.error(`获取字典分类错误:  ${rep.message || '接口异常'}`)
        } else {
            dictCategories = rep.data
        }
    }

    return dictCategories
}

/**
 * 获取字典详情
 */
export async function getDictionaryDetail(name) {
    const rep = await request(`${Constants.API_PREFIX }/api/dictionaries/${name}`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取字典详情失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 创建字典
 */
export async function createDictionary(record) {
    const rep = await request(`${Constants.API_PREFIX }/api/dictionaries`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`创建字典失败:  ${rep.message || '接口异常'}`)
        return null
    }

    InterfaceService.resetCache('dict')
    return rep.data
}

/**
 * 更新字典
 */
export async function updateDictionary(name, record) {
    const rep = await request(`${Constants.API_PREFIX}/api/dictionaries/${name}`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`更新字典失败:  ${rep.message || '接口异常'}`)
        return null
    }

    InterfaceService.resetCache('dict')
    return rep.data
}

/**
 * 删除字典，需确保字典没有被其他模型引用
 */
export async function deleteDictionary(name) {
    const rep = await request(`${Constants.API_PREFIX}/api/dictionaries/${name}`, {
        method: 'DELETE'
    })

    if (rep.code / 1 !== 200) {
        message.error(`删除字典失败:  ${rep.message || '接口异常'}`)
        return null
    }

    InterfaceService.resetCache('dict')
    return rep.data
}

/**
 * 批量删除字典
 */
export async function batchDeleteDictionary(records) {
    const rep = await request(`${Constants.API_PREFIX}/api/dictionaries/batch`, {
        method: 'DELETE',
        data: {name: records.map(r => r.name)}
    })

    if (rep.code / 1 !== 200) {
        message.error(`批量删除字典失败:  ${rep.message || '接口异常'}`)
        return null
    }

    InterfaceService.resetCache('dict')
    return rep.data
}
