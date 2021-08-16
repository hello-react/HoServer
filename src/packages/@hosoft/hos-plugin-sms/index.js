/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
**/
const path = require('path')
const SmsService = require('./service')

/**
 * Plugin for Aliyun SMS service
 */
class SmsPlugin {
    async init(container, router, app, pluginManager) {
        // add two api for user service
        router.post('/user/login/mobile', tp('loginWithMobile'), ctx => SmsService.loginWithMobile(ctx.body), { open: true })
        router.post('/user/mobile/bind', tp('bindMobile'), ctx => SmsService.bindMobile(ctx.body))

        const dir = path.join(__dirname, 'impl')
        await pluginManager.initImplClass(dir, container, router, app)
    }

    getService(impl) {
        return SmsService
    }
}

module.exports = new SmsPlugin()
