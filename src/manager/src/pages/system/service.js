import {message} from "antd"
import _ from 'lodash'

import Constants from '@/utils/constants'
import request from '@/utils/request'

const wrapper = {}

/**
 * 获取公告内容
 */
wrapper.getAnnounce = async function() {
    const rep = await request(`${Constants.API_PREFIX}/system/announce`, {
        method: 'GET',
        params: {enabled: true, limit: 1}
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取系统公告失败:  ${rep.message || '接口异常'}`)
        return {}
    }

    return _.get(rep, 'data', [])
}

/**
 * 发布系统公告
 */
wrapper.setAnnounce = async function(id, enabled, title, content) {
    const rep = await request(`${Constants.API_PREFIX}/system/announce`, {
        method: 'POST',
        data: {id, enabled, title, content}
    })

    if (rep.code / 1 !== 200) {
        message.error(`设置系统公告失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return _.get(rep, 'data')
}

/**
 * 获取系统维护信息
 */
wrapper.getSiteMaintainInfo = async function() {
    const rep = await request(`${Constants.API_PREFIX}/system/maintain`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取系统维护信息失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return _.get(rep, 'data')
}

/**
 * 设置系统维护信息
 */
wrapper.setSiteMaintainInfo = async function(id, args) {
    const rep = await request(`${Constants.API_PREFIX}/system/maintain`, {
        method: 'POST',
        data: {id, ...args}
    })

    if (rep.code / 1 !== 200) {
        message.error(`设置系统维护信息失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return _.get(rep, 'data')
}

/**
 * 获取系统配置列表
 */
wrapper.getSystemConfig = async function() {
    const rep = await request(`${Constants.API_PREFIX}/system/configs`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取系统配置失败:  ${rep.message || '接口异常'}`)
        return []
    }

    const configs = _.get(rep, 'data', {})

    const processResult = items => {
        const result = []

        for (const seg in items) {
            const segConfigs = items[seg]
            if (segConfigs.value !== undefined || typeof segConfigs !== 'object') {
                if (seg !== 'dis_name' && seg !== 'desc') {
                    result.push({seg, config: segConfigs})
                }
            } else {
                const segResult = processResult(segConfigs)
                result.push({seg, configs: segResult, config: { dis_name: segConfigs.dis_name, desc: segConfigs.desc } })
            }
        }

        return result
    }

    return processResult(configs)
}

export default wrapper
