/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/15
 * author: Jack Zhang
 **/

const SysUserService = require('../services/user/SysUserService')
const { Role, Permission } = require('../../models')

/**
 * 资源服务，提供对资源、课件相关功能的接口
 */
class UserController {
    // prettier-ignore
    initRoutes(container, router) {
        // 获取省份、城市、区县列表相关路由
        router.get('/user/area/provinces', '获取省份列表', async () => {
            return SysUserService.getProvinces()
        }, { permissions: [], cache: true })

        router.get('/user/area/:province_code/cities', '获取城市列表', async context => {
            return SysUserService.getCities(context.req.params.province_code)
        }, { permissions: [], cache: true })

        router.get('/user/area/:city_code/districts', '获取区县列表', async context => {
            return SysUserService.getDistricts(context.req.params.city_code)
        }, { permissions: [], cache: true })

        router.get('/user/area/:district_code/sub_districts', '获取街道列表', async context => {
            return SysUserService.getSubDistricts(context.req.params.district_code)
        }, { permissions: [], cache: true })

        // 权限角色相关路由
        router.get('/user/roles/categories', '获取权限角色分类列表', async context => {
            return this._getRolePermCategories()
        }, { model: 'Role', public: false })

        router.def('Permission')
        router.def('Role')
    }

    /**
     * 获取角色权限分类名称
     */
    async _getRolePermCategories() {
        const roleCats = await Role.distinct('category_name')
        const permCats = await Permission.distinct('category_name')

        for (const cat of permCats) {
            if (!roleCats.includes(cat)) {
                roleCats.push(cat)
            }
        }

        return roleCats
    }
}

module.exports = new UserController()
