/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/02/10
 **/
const _ = require('lodash')
const config = require('@hosoft/config')
const DefSystemService = require('../services/system/DefSystemService')
const { Constants } = require('../../base')

/**
 * system manage related api
 */
class SystemController {
    initRoutes(container, router) {
        // server logs
        router.def('ServerLog', ['list'])

        // system announce, maintain info
        router.get('/system/announce', tf('getAnnounce'), async (ctx) => DefSystemService.getAnnounce(), {
            open: true,
            type: 1
        })
        router.post('/system/announce', tf('setAnnounce'), async (ctx) => DefSystemService.setAnnounce(ctx.body), {
            name: 'setSystemAnnounce',
            private: true,
            type: 1
        })
        router.get(
            '/system/maintain',
            tf('getSiteMaintainInfo'),
            async (ctx) => DefSystemService.getSiteMaintainInfo(),
            { open: true, type: 1 }
        )
        router.post(
            '/system/maintain',
            tf('setSiteMaintainInfo'),
            async (ctx) => DefSystemService.setSiteMaintainInfo(ctx.body),
            {
                name: 'setSystemMaintainInfo',
                private: true,
                type: 1
            }
        )

        // system configs
        router.get('/system/configs', tf('getSystemConfigs'), async (ctx) => this._getSystemConfigs(), {
            open: true,
            private: true,
            type: 1
        })

        // client version, ad banner info
        router.get(
            '/system/client_version',
            tf('getClientVersion'),
            (ctx) => DefSystemService.getClientVersion(ctx.query.client_type),
            { type: 1 }
        )
        router.post(
            '/system/client/ready',
            tf('clientReadyMsg'),
            async (ctx) => DefSystemService.clientReadyMsg(ctx.currentUserId, ctx.body),
            {
                type: 1
            }
        )

        // system plugins
        router.get(
            '/system/plugins/installed',
            tf('installedPlugins'),
            (ctx) => DefSystemService.installedPlugins(ctx.query),
            {
                open: true,
                type: 1
            }
        )

        router.post('/system/plugins/enable', tf('enablePlugins'), (ctx) => DefSystemService.enablePlugin(ctx.body), {
            type: 1
        })
    }

    _getSystemConfigs() {
        return config.getConfigs()
    }

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
