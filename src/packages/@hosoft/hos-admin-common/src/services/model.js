/* eslint-disable no-underscore-dangle,default-case */
import {message} from "antd"
import _ from "lodash";
import Constants from '../common/constants'
import request from '../common/request'
import pluralize from 'pluralize'

const MODEL_CACHE = {}
const MODEL_KEY_CACHE = {}

const wrapper = {}

/**
 * 获取对象路由、id 字段等，需和服务端保持一致
 */
wrapper.getModelRoutePath = (name, route, categoryName) => {
    if (!name) {
        return ''
    }

    // service
    const categoryRoute = categoryName ? categoryName.toLowerCase() : ''

    // modelMeta
    let customRouteName = false
    let routeName = name.toLowerCase()
    if (route) {
        routeName = route.toLowerCase()
        customRouteName = true
    } else {
        routeName = name.toLowerCase()
    }

    // 转成复数形式
    let modelRoute = customRouteName ? routeName : pluralize(routeName)
    routeName = pluralize(routeName, 1) // 需要单数

    if (categoryRoute && !customRouteName) {
        modelRoute = `${categoryRoute}/${modelRoute}`
    }

    return `${Constants.API_PREFIX}/${modelRoute}`
}

wrapper.getModelIdField = modelMeta => {
    if (!(modelMeta && modelMeta.properties)) {
        return 'id'
    }

    let idField
    for (let i=0; i<modelMeta.properties.length; i++) {
        const property = modelMeta.properties[i]
        if (property && property.unique) {
            idField = property.name
            if (idField !== 'id') {
                break
            }
        }
    }

    return idField || 'id'
}

wrapper.getModelTableRowKey = modelMeta => {
    if (MODEL_KEY_CACHE[modelMeta.name]) {
        return MODEL_KEY_CACHE[modelMeta.name]
    }

    let key
    for (let i=0; i<modelMeta.properties.length; i++) {
        const prop = modelMeta.properties[i]
        if(prop.unique && prop.output_flag !== 0) {
            key = prop.name
            break
        }
    }

    if (!key) {
        key = 'id'
    }

    MODEL_KEY_CACHE[modelMeta.name] = key
    return key
}

wrapper.getModelMeta = async modelName => {
    if (MODEL_CACHE[modelName]) {
        return MODEL_CACHE[modelName]
    }

    const rep = await request.get(`${Constants.API_PREFIX}/api/models/${modelName}`)
    if (rep.code / 1 === 200) {
        const modelMeta = rep.data

        modelMeta.row_key = wrapper.getModelTableRowKey(modelMeta)
        MODEL_CACHE[modelName] = modelMeta
    } else {
        message.error(`获取${modelName}对象定义失败: ${rep.message || '接口异常'}`)
        return null
    }

    return MODEL_CACHE[modelName]
}

wrapper.createModelData = async (modelMeta, newInstance) => {
    const apiPath = wrapper.getModelRoutePath(modelMeta.name, modelMeta.route_name, modelMeta.category_name)
    const rep = await request(`${apiPath}`, {
        method: 'POST',
        data: newInstance
    })

    if (rep.code / 1 !== 200) {
        message.error(`创建${modelMeta.dis_name}失败: ${rep.message || '接口异常'}`)
        return null
    }

    return _.get(rep, 'data')
}

wrapper.updateModelData = async (modelMeta, id, newInstance) => {
    const apiPath = wrapper.getModelRoutePath(modelMeta.name, modelMeta.route_name, modelMeta.category_name)
    const rep = await request(`${apiPath}/${id}`, {
        method: 'POST',
        data: newInstance
    })

    if (rep.code / 1 !== 200) {
        message.error(`更新${modelMeta.dis_name}失败: ${rep.message || '接口异常'}`)
        return null
    }

    return _.get(rep, 'data')
}

wrapper.getModelDataList = async (modelMeta, params) => {
    const apiPath = wrapper.getModelRoutePath(modelMeta.name, modelMeta.route_name, modelMeta.category_name)
    const rep = await request.get(`${apiPath}`, {params})
    if (rep.code / 1 !== 200) {
        message.error(`获取${modelMeta.dis_name}数据失败: ${rep.message || '接口异常'}`)
        return null
    }

    return _.get(rep, 'data')
}

wrapper.deleteModelData = async (modelMeta, id) => {
    const apiPath = wrapper.getModelRoutePath(modelMeta.name, modelMeta.route_name, modelMeta.category_name)
    const rep = await request(`${apiPath}/${id}`, {
        method: 'DELETE'
    })

    if (rep.code / 1 !== 200) {
        message.error(`删除${modelMeta.dis_name}失败: ${rep.message || '接口异常'}`)
        return null
    }

    return _.get(rep, 'data')
}

wrapper.batchDeleteModelData = async (modelMeta, ids) => {
    const apiPath = wrapper.getModelRoutePath(modelMeta.name, modelMeta.route_name, modelMeta.category_name)
    const rep = await request(`${apiPath}/batch`, {
        method: 'DELETE',
        [modelMeta.row_key]: ids
    })

    if (rep.code / 1 !== 200) {
        message.error(`批量删除${modelMeta.dis_name}失败: ${rep.message || '接口异常'}`)
        return null
    }

    return _.get(rep, 'data')
}

wrapper.getModelDataListTable = async (modelName, params) => {
    let data = []

    const modelMeta = await wrapper.getModelMeta(modelName)
    const result = await wrapper.getModelDataList(modelMeta, params)
    data = _.get(result, 'list', [])
    if (!data) {
        return {
            data, pagination: {total: 0}, success: false
        }
    }

    if (modelMeta.row_key === '_index') {
        for (let i=0; i<data.length; i++) {
            data[i]._index = i + 1
        }
    }

    return {
        success: true,
        data,
        pagination: _.get(result, 'pagination')
    }
}

export default wrapper
