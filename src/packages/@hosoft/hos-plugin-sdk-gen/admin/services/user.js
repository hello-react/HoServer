import { Constants, request } from '@hosoft/hos-admin-common'
import { message } from "antd"
import _ from 'lodash'

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

export default wrapper
