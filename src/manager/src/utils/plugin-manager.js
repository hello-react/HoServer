import {Common, Constants, request} from "@hosoft/hos-admin-common"

import pluginList from '@/.plugin-list'


/**
 * plugin manager
 */
class PluginManager {
    constructor() {
        this.serverSidePlugins = null
        this.renderHooks = {}
    }

    async initPlugins() {
        Common.pluginManager(this)

        await this.loadServerPlugins()
        if (!this.serverSidePlugins) {
            return
        }

        for (const plugin of pluginList) {
            const serverPlugin = this.serverSidePlugins.find(p => p.name === plugin.name)
            if (serverPlugin && serverPlugin.enabled) {
                plugin.instance.init && plugin.instance.init(this)
            }
        }
    }

    async loadServerPlugins(args) {
        const rep = await request(`${Constants.API_PREFIX}/system/plugins/installed`, {
            method: 'GET',
            data: args
        })

        if (rep.code / 1 === 200) {
            this.serverSidePlugins = rep.data
            for (const plugin of this.serverSidePlugins) {
                plugin.location = 'server'
            }
        } else {
            console.error(`get server plugins error: ${rep.message}`)
        }
    }

    async getServerPlugins() {
        if (this.serverSidePlugins == null) {
            await this.loadServerPlugins()
        }

        return this.serverSidePlugins
    }

    getInstalledPlugins() {
        return pluginList
    }

    async getPluginList() {
        const result = []
        const serverSidePlugins = await this.getServerPlugins()
        const pluginNames = {}
        for (const plugin of serverSidePlugins) {
            const existPlugin = pluginList.find(p => p.name === plugin.name)
            // if manager plugin not exist in local, ignore it
            let hasRemoved = false
            if (!existPlugin) {
                const packageInfo = plugin.packages.find(p => p.type === 'server')
                if (!packageInfo) {
                    hasRemoved = true
                }
            } else {
                const packageInfo = plugin.packages.find(p => p.type === 'manager')
                if (!packageInfo) {
                    plugin.packages.push({
                        dir: existPlugin.dir,
                        dis_name: existPlugin.dis_name,
                        type: existPlugin.type,
                        version: existPlugin.version
                    })
                }
            }

            if (!hasRemoved) {
                result.push(plugin)
                pluginNames[plugin.name] = plugin.enabled || false
            }
        }

        for (const plugin of pluginList) {
            if (!(plugin.name in pluginNames)) {
                result.push({
                    name: plugin.name,
                    version: plugin.version,
                    enabled: false,
                    packages: [{
                        dir: plugin.dir,
                        dis_name: plugin.dis_name,
                        type: plugin.type,
                        version: plugin.version
                    }]
                })
            }
        }

        return result
    }

    getLocalPlugin(pluginName) {
        return pluginList.find(p => p.name === pluginName)
    }

    getDefaultImpl(pluginName) {
        const plugin = this.serverSidePlugins.find(p => p.name === pluginName)
        if (!plugin) {
            return ''
        }

        return plugin.default_impl || ''
    }

    async isPluginEnabled(pluginName) {
        const plugins = await this.getServerPlugins()
        const plugin = plugins.find(p => p.name === pluginName)
        if (plugin) {
            return plugin.enabled
        }

        const localPlugin = pluginList.find(p => p.name === pluginName)
        return !!localPlugin
    }

    setRenderHook(hookName, func) {
        if (!this.renderHooks[hookName]) {
            this.renderHooks[hookName] = []
        }

        if (this.renderHooks[hookName].indexOf(func) < 0) {
            this.renderHooks[hookName].push(func)
        }
    }

    onRenderHook(hookName, ...args) {
        const renderHooks = this.renderHooks[hookName]
        if (renderHooks && renderHooks.length > 0) {
            for (const hookFunc of renderHooks) {
                // eslint-disable-next-line no-await-in-loop
                hookFunc(...args)
            }
        }
    }
}

export default new PluginManager()
