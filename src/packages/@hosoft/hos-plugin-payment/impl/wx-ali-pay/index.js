/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/02/27
**/
const PaymentService = require('./service')

/**
 * alipay, wechat pay server implementation
 */
class AliWeChatPay {
    init(container, router, app, pluginManager) {
        // wechat, alipay related
        router.post('/payment/prepay/wx', tp('prePayWx'), async ctx => PaymentService.prePayWx(ctx.currentUserId, ctx))
        router.post('/payment/prepay/alipay', tp('prePayAlipay'), async ctx => PaymentService.prePayAlipay(ctx.currentUserId, ctx))
        router.post('/payment/notify/wx', tp('wxNotify'), async ctx => PaymentService.wxNotify(ctx), { open: true })
        router.post('/payment/notify/alipay', tp('alipayNotify'), async ctx => PaymentService.alipayNotify(ctx), { open: true })
    }
}

module.exports = new AliWeChatPay()
