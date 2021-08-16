/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
**/

const AreaService = require('./impl/location-zh-cn/service')
const path = require('path')

/**
 * area locations plugin
 */
class AreaPlugin {
    async init(container, router, app, pluginManager) {
        const dir = path.join(__dirname, 'impl')
        await pluginManager.initImplClass(dir, container, router, app)
    }

    getService(impl) {
        return AreaService
    }
}

module.exports = new AreaPlugin()
