/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 **/
const PluginManager = require('../../../base/plugin-manager')

/**
 * default system service
 */
class SystemService {
    /**
     * get installed plugins
     * @param args
     */
    async installedPlugins(args) {
        return PluginManager.getInstalledPlugins()
    }

    /**
     * enable or disable plugin
     * @param args
     * @returns {Promise<void>}
     */
    async enablePlugin(args) {
        const { name, enabled, package_info } = args
        return await PluginManager.enablePlugin(name, enabled, package_info)
    }
}

module.exports = new SystemService()
