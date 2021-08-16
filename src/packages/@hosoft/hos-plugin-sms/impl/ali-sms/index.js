/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
**/

const SmsService = require('./service')

/**
 * Plugin for Aliyun SMS service
 */
class AliSms {
    init(container, router, app) {
        router.get('/system/sms/aliyun', tp('sendSMS'), ctx => SmsService.sendSMS(ctx.query), { open: true })
    }
}

module.exports = new AliSms()
