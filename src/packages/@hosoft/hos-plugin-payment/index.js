/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
**/

const path = require('path')
const PaymentService = require('./service')

/**
 * Payment plugin
 */
class PaymentPlugin {
    async init(container, router, app, pluginManager) {
        // payment record manage routes
        router.def('Payment')
        router.get('/payment/statistics', tp('getPaymentStatistics'), async ctx =>
            PaymentService.getPaymentStatistics(ctx.isAdmin() ? null : ctx.currentUserId, ctx.query)
        )

        // products
        router.def('Product', 'list')
        router.def('Product', ['create', 'update', 'delete'], { permissions: 'product:manage' })

        const dir = path.join(__dirname, 'impl')
        await pluginManager.initImplClass(dir, container, router, app)
    }
}

module.exports = new PaymentPlugin()
