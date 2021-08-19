const SystemService = require('../services/system/SystemService')

/**
 * System manage apis
 */
class SystemController {
    initRoutes(container, router) {
        // tags
        router.def('Tags')
        router.def('Tags', 'list').beforeDbProcess((ctx, query, options) => {
            // user_id null is system tags
            query.user_id = { $in: [null, ctx.currentUserId] }
        })

        // system announce, maintain info
        router.get('/system/announce', t('getAnnounce'), async (ctx) => SystemService.getAnnounce(), {
            open: true
        })

        router.post('/system/announce', t('setAnnounce'), async (ctx) => SystemService.setAnnounce(ctx.body), {
            name: 'setSystemAnnounce'
        })

        router.get('/system/maintain', t('getSiteMaintainInfo'), async (ctx) => SystemService.getSiteMaintainInfo(), {
            open: true
        })

        router.post(
            '/system/maintain',
            t('setSiteMaintainInfo'),
            async (ctx) => SystemService.setSiteMaintainInfo(ctx.body),
            {
                name: 'setSystemMaintainInfo'
            }
        )

        // client version, client ready api, this is common used in mobile app
        router.get('/system/client_version', t('getClientVersion'), (ctx) =>
            SystemService.getClientVersion(ctx.query.client_type)
        )

        router.post('/system/client/ready', t('clientReadyMsg'), async (ctx) =>
            SystemService.clientReadyMsg(ctx.currentUserId, ctx.body)
        )
    }
}

module.exports = new SystemController()
