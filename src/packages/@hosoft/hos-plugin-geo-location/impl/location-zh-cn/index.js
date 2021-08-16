/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
**/

const AreaService = require('./service')

/**
 * Area query api for China all provinces/cities/districts/sub districts
 * lat update date 2018/12
 */
class AreaChina {
    // prettier-ignore
    init(container, router, app) {
        // init location cache at start
        AreaService.initLocationCache().then(() => {
            logger.debug('location cache init success')
        })

        // 获取省份、城市、区县列表相关路由
        router.get('/system/area/provinces', '获取省份列表', async () => {
            return AreaService.getProvinces()
        }, { open: true, cache: true })

        router.get('/system/area/:province_code/cities', '获取城市列表', async context => {
            return AreaService.getCities(context.req.params.province_code)
        }, { open: true, cache: true })

        router.get('/system/area/:city_code/districts', '获取区县列表', async context => {
            return AreaService.getDistricts(context.req.params.city_code)
        }, { open: true, cache: true })

        router.get('/system/area/:district_code/sub_districts', '获取街道列表', async context => {
            return AreaService.getSubDistricts(context.req.params.district_code)
        }, { open: true, cache: true })
    }
}

module.exports = new AreaChina()
