/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/15
 * author: Jack Zhang
 **/
const SMSService = require('../services/system/SMSService')

/**
 * 系统服务接口
 */
class SystemController {
    initRoutes(container, router) {
        router.get('/system/sms', '获取验证码', context => SMSService.sendSMS(context.query), { permissions: [] })
    }
}

module.exports = new SystemController()
