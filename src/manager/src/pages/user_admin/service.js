import {message} from "antd"
import _ from 'lodash'

import Constants from '@/utils/constants'
import request from '@/utils/request'

let roleList = null
let permissionList = null
let rolePermCategories = null

const wrapper = {}

/**
 * 获取角色权限分类
 */
wrapper.getRolePermCategories = async function() {
    if (!rolePermCategories) {
        const rep = await request(`${Constants.API_PREFIX}/user/roles/categories`, {
            method: 'GET'
        })

        if (rep.code / 1 !== 200) {
            rolePermCategories = []
            message.error(`获取角色权限分类失败:  ${rep.message || '接口异常'}`)
        } else {
            rolePermCategories = rep.data
        }
    }

    return rolePermCategories
}

/**
 * 获取角色列表
 */
wrapper.listRole = async function () {
    if (!roleList) {
        const rep = await request(`${Constants.API_PREFIX}/user/roles?page_size=9999`, {
            method: 'GET'
        })

        roleList = []
        if (rep.code / 1 !== 200) {
            message.error(`获取角色列表失败:  ${rep.message || '接口异常'}`)
        } else {
            const data = _.get(rep, ['data', 'list'])

            for (let i = 0; i < data.length; i++) {
                const role = data[i]
                roleList.push({key: role.name, title: role.dis_name})
            }
        }
    }

    return roleList
}

/**
 * 创建角色
 */
wrapper.createRole = async function (record) {
    const rep = await request(`${Constants.API_PREFIX}/user/roles`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`创建角色失败:  ${rep.message || '接口异常'}`)
        return null
    }

    roleList = null
    return rep.data
}

/**
 * 更新角色
 */
wrapper.updateRole = async function (name, record) {
    const rep = await request(`${Constants.API_PREFIX}/user/roles/${name}`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`更新角色失败:  ${rep.message || '接口异常'}`)
        return null
    }

    roleList = null
    return rep.data
}

/**
 * 删除角色，需确保角色没有被其他模型引用
 */
wrapper.deleteRole = async function (name) {
    const rep = await request(`${Constants.API_PREFIX}/user/roles/${name}`, {
        method: 'DELETE'
    })

    if (rep.code / 1 !== 200) {
        message.error(`删除角色失败:  ${rep.message || '接口异常'}`)
        return null
    }

    roleList = null
    return rep.data
}

/**
 * 获取权限列表
 */
wrapper.listPermission = async function () {
    if (!permissionList) {
        const rep = await request(`${Constants.API_PREFIX}/user/permissions?page_size=9999`, {
            method: 'GET'
        })

        permissionList = []

        if (rep.code / 1 !== 200) {
            message.error(`获取角色列表失败:  ${rep.message || '接口异常'}`)
        } else {
            const data = _.get(rep, ['data', 'list'])

            for (let i = 0; i < data.length; i++) {
                const permission = data[i]
                permissionList.push({key: permission.name, title: permission.dis_name})
            }
        }
    }

    return permissionList
}

/**
 * 创建权限
 */
wrapper.createPermission = async function (record) {
    const rep = await request(`${Constants.API_PREFIX}/user/permissions`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`创建权限失败:  ${rep.message || '接口异常'}`)
        return null
    }

    permissionList = null
    return rep.data
}

/**
 * 更新权限
 */
wrapper.updatePermission = async function (name, record) {
    const rep = await request(`${Constants.API_PREFIX}/user/permissions/${name}`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`更新权限失败:  ${rep.message || '接口异常'}`)
        return null
    }

    permissionList = null
    return rep.data
}

/**
 * 删除权限，需确保权限没有被其他模型引用
 */
wrapper.deletePermission = async function (name) {
    const rep = await request(`${Constants.API_PREFIX}/user/permissions/${name}`, {
        method: 'DELETE'
    })

    if (rep.code / 1 !== 200) {
        message.error(`删除权限失败:  ${rep.message || '接口异常'}`)
        return null
    }

    permissionList = null
    return rep.data
}

/**
 * 获取用户详情
 */
wrapper.getUserDetail = async function (userId) {
    const rep = await request(`${Constants.API_PREFIX}/user/users/${userId}`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取用户详情失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 创建用户
 */
wrapper.createUser = async function (record) {
    const rep = await request(`${Constants.API_PREFIX}/user/users`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`创建用户失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 更新用户
 */
wrapper.updateUser = async function (userId, record) {
    const rep = await request(`${Constants.API_PREFIX}/user/users/${userId}`, {
        method: 'POST',
        data: record
    })

    if (rep.code / 1 !== 200) {
        message.error(`更新用户失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 批量更新用户信息
 */
wrapper.batchUpdateUser = async (userIds, userInfos) => {
    const rep = await request(`${Constants.API_PREFIX}/user/batch_update`, {
        method: 'POST',
        data: {
            user_id: userIds,
            list: userInfos
        }
    })

    if (rep.code / 1 !== 200) {
        message.error(`更新用户信息失败:  ${rep.message || '接口异常'}`)
    }

    return rep.data
}

export default wrapper
