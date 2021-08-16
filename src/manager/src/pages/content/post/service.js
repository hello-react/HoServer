import {Constants, request} from '@hosoft/hos-admin-common'
import {message} from "antd"
import _ from "lodash"

const wrapper = {}

/**
 * 获取内容分类列表
 */
wrapper.getContentCategories = async function() {
    const rep = await request(`${Constants.API_PREFIX}/api/dictionaries/content_category`, {
        method: 'GET'
    })

    let categoryList
    if (rep.code / 1 !== 200) {
        message.error(`获取内容分类列表失败:  ${rep.message || '接口异常'}`)
        categoryList = []
    } else {
        categoryList = _.get(rep, ['data', 'values'], [])
    }

    return _.sortBy(categoryList, 'order')
}

/**
 * 获取内容列表
 */
wrapper.getContentList = async function(params) {
    const rep = await request(`${Constants.API_PREFIX }/content/contents`, {
        method: 'GET',
        params
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取内容列表失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 获取内容详情
 */
wrapper.getContentDetail = async function(id) {
    const rep = await request(`${Constants.API_PREFIX }/content/contents/${id}`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取内容详情失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 创建内容
 */
wrapper.createContent = async function(record) {
    const rep = await request(`${Constants.API_PREFIX }/content/contents`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`创建内容失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 更新内容
 */
wrapper.updateContent = async function(id, record) {
    const rep = await request(`${Constants.API_PREFIX}/content/contents/${id}`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`更新内容失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 删除内容
 */
wrapper.deleteContent = async function(id) {
    const rep = await request(`${Constants.API_PREFIX}/content/contents/${id}`, {
        method: 'DELETE'
    })

    if (rep.code / 1 !== 200) {
        message.error(`删除内容失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 批量删除内容
 */
wrapper.batchDeleteContent = async function(records) {
    const rep = await request(`${Constants.API_PREFIX}/content/contents/batch`, {
        method: 'DELETE',
        data: {id: records.map(r => r.id)}
    })

    if (rep.code / 1 !== 200) {
        message.error(`批量删除内容失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 批量更新
 */
wrapper.batchUpdateContent = async function(ids, contentInfo) {
    const rep = await request(`${Constants.API_PREFIX}/content/contents/batch`, {
        method: 'POST',
        data: {id: ids, list: contentInfo}
    })

    if (rep.code / 1 !== 200) {
        message.error(`批量更新内容失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

export default wrapper
