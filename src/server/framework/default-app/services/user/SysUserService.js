/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 * author: Jack Zhang
 **/
const { Area, Role } = require('../../../models')
const { BaseHelper } = require('../../../base')

/**
 * 用户服务系统内置函数
 */
class SysUserService {
    // 获取省份列表
    async getProvinces() {
        return BaseHelper.getSystemDictItem('area_province')
    }

    // 获取省份城市列表
    async getCities(provinceCode) {
        const result = await Area.find({ prov_code: provinceCode })
            .select('city city_code')
            .lean()

        return result.map(d => {
            return {
                city: d.city,
                code: d.city_code
            }
        })
    }

    // 获取城市区县列表
    async getDistricts(cityCode) {
        const result = await Area.findOne({ city_code: cityCode })
            .select('districts')
            .lean()

        return result.districts.map(d => {
            return {
                district: d.district,
                code: d.code
            }
        })
    }

    // 获取区县街道列博鳌
    async getSubDistricts(districtCode) {
        const result = await Area.findOne({ 'districts.code': districtCode })
            .select('districts')
            .lean()

        const district = result.districts.find(d => d.code === districtCode)
        return district.subdistricts.map(d => {
            return {
                subdistrict: d.subdistrict,
                code: d.code
            }
        })
    }

    /**
     * 通过角色名获取角色信息
     * @param roleName
     */
    async getRoleByName(roleName) {
        return Role.findOne({ name: roleName }).lean()
    }

    /**
     * 设置用户默认权限角色
     * @param userInfo
     */
    async setUserRolePermission(userInfo) {
        // 获取角色权限
        const permissions = userInfo.permissions || []
        if (permissions.findIndex(p => p.name === 'site:access') < 0) {
            permissions.push({ name: 'site:access', scope: null })
        }

        if (userInfo.roles && userInfo.roles.length > 0) {
            for (const roleName of userInfo.roles) {
                const role = await this.getRoleByName(roleName)
                if (role && role.permissions) {
                    for (const permission of role.permissions) {
                        const existPerm = permissions.find(p => p.name === permission.name)
                        if (!existPerm) {
                            permissions.push(permission)
                        }
                    }
                }
            } // END: for
        }

        const roles = userInfo.roles || []
        if (roles.indexOf('user') < 0) {
            roles.push('user')
        }

        userInfo.permissions = permissions
        userInfo.roles = roles
    }
}

module.exports = new SysUserService()
