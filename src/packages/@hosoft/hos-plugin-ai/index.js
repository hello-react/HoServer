/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/
const path = require('path')

/**
 * Plugin for AI capability
 */
class AiPlugin {
    async init(container, router, app, pluginManager) {
        const dir = path.join(__dirname, 'impl')
        await pluginManager.initImplClass(dir, container, router, app)
    }
}

module.exports = new AiPlugin()