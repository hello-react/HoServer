/* eslint-disable no-underscore-dangle,default-case */
import {message} from "antd"
import _ from "lodash"

import Constants from "@/utils/constants"
import request from '@/utils/request'

let serviceList = null
let modelList = null
let dictList = null
let categoryList = null
let dataTypes = null

const wrapper = {}

// 用于刷新缓存
wrapper.resetCache = type => {
    if (!type) {
        serviceList = null
        modelList = null
        dictList = null
        categoryList = null
    }

    switch (type) {
    case 'service':
        serviceList = null
        break
    case 'model':
        modelList = null
        break
    case 'dict':
        dictList = null
        categoryList = null
        break
    }
}

/**
 * 对象数据类型列表，枚举和自动增长应用层特殊处理
 */
wrapper.getDataTypes = () => {
    if (!dataTypes) {
        dataTypes = []
        for (const key in Constants.API_FIELD_TYPE) {
            const value = Constants.API_FIELD_TYPE[key]
            dataTypes.push({text: value, value: key})
        }

        dataTypes.splice(4, 0, {text: 'enum (枚举)', value: 'enum'})
        dataTypes.splice(7, 0, {text: 'number (自动增长)', value: 'auto'})
    }

    return dataTypes
}

/**
 * 获取服务列表，全局缓存
 */
wrapper.getServiceList = async () => {
    if (serviceList === null) {
        const rep = await request(`${Constants.API_PREFIX}/api/services`, {
            method: 'GET'
        })

        if (rep.code / 1 !== 200) {
            message.error(`获取服务列表失败:  ${rep.message || '接口异常'}`)
            serviceList = []
        } else {
            serviceList = _.get(rep, ['data', 'list'], [])
        }
    }

    return serviceList
}

/**
 * 获取对象列表
 */
wrapper.getModelList = async () => {
    if (modelList === null) {
        const rep = await request(`${Constants.API_PREFIX}/api/models`, {
            method: 'GET',
            params: {limit: 9999, select: 'category_name name dis_name', sort: 'name'}
        })

        if (rep.code / 1 !== 200) {
            message.error(`获取对象列表失败:  ${rep.message || '接口异常'}`)
            modelList = []
        } else {
            modelList = _.get(rep, ['data', 'list'], [])
        }
    }

    return modelList
}

/**
 * 获取系统字典列表
 */
wrapper.getDictionaryList = async () => {
    if (dictList === null) {
        const rep = await request(`${Constants.API_PREFIX}/api/dictionaries`, {
            method: 'GET',
            params: {limit: 9999, select: 'name dis_name category_name', sort: 'name'}
        })

        if (rep.code / 1 !== 200) {
            message.error(`获取系统字典列表失败:  ${rep.message || '接口异常'}`)
            dictList = []
        } else {
            dictList = _.get(rep, ['data', 'list'], [])
        }
    }

    return dictList
}

/**
 * 获取分类列表
 */
wrapper.getCategoryList = async () => {
    if (categoryList === null) {
        const rep = await request(`${Constants.API_PREFIX}/api/dictionaries/sys_category`, {
            method: 'GET'
        })

        if (rep.code / 1 !== 200) {
            message.error(`获取分类列表失败:  ${rep.message || '接口异常'}`)
            categoryList = []
        } else {
            categoryList = _.get(rep, ['data', 'values'], [])
        }
    }

    return categoryList
}

/**
 * 修改分类显示名称（用于系统服务、对象、API 分类）
 */
wrapper.setCategoryDisName = async (category, categoryDisName) => {
    const rep = await request(`${Constants.API_PREFIX}/api/sys_category`, {
        method: 'POST',
        data: {key: category, value: categoryDisName}
    })

    if (rep.code / 1 !== 200) {
        message.error(`修改分类名称失败:  ${rep.message || '接口异常'}`)
        return null
    }

    wrapper.resetCache()
    return true
}

export default wrapper
