/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/02/27
**/
const PaymentService = require('./service')

/**
 * apple pay implementation
 */
class ApplePay {
    init(container, router, app, pluginManager) {
        router.post('/payment/appstore', tp('saveAppStorePay'), async ctx => PaymentService.saveAppStorePay(ctx.currentUserId, ctx.body))
    }
}

module.exports = new ApplePay()
