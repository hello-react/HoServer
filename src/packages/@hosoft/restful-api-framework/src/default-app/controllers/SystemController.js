/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/02/10
 **/
const _ = require('lodash')
const config = require('@hosoft/config')
const SystemService = require('../services/system/SystemService')
const { Constants } = require('../../base')

/**
 * System management related api
 */
class SystemController {
    initRoutes(container, router) {
        // server logs
        router.def('ServerLog', ['list'])

        // system configs
        router.get('/system/configs', tf('getSystemConfigs'), async (ctx) => this._getSystemConfigs(), {
            open: true,
            private: true,
            type: 1
        })

        // plugins management
        router.get(
            '/system/plugins/installed',
            tf('installedPlugins'),
            (ctx) => SystemService.installedPlugins(ctx.query),
            {
                open: true,
                type: 1
            }
        )

        router.post('/system/plugins/enable', tf('enablePlugins'), (ctx) => SystemService.enablePlugin(ctx.body), {
            type: 1
        })
    }

    _getSystemConfigs() {
        return config.getConfigs()
    }

    // deprecated
    _setDesc(items, descItems) {
        const keys = _.keys(items)
        for (const key of keys) {
            const item = items[key]
            const descItem = descItems[key] || {}
            if (typeof item === 'object') {
                this._setDesc(item, descItem)
                item.dis_name = descItem.dis_name
                item.desc = descItem.desc
            } else {
                items[key] = {
                    ...descItem,
                    value:
                        Constants.IS_DEMO_SITE && descItem.mask
                            ? '*'.repeat(Math.min(items[key].length, 50))
                            : items[key]
                }
            }
        }
    }
}

module.exports = new SystemController()
