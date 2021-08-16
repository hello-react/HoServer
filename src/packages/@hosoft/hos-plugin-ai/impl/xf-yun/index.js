/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/

const XfYunService = require('./service')

/**
 * Plugin for Aliyun SMS service
 */
class AliSms {
    init(container, router, app) {
        router.get('/ai/xfyun/iat/wss', '获取讯飞语音云流式转写wss地址', ctx => XfYunService.getIatUrl(ctx.query))
    }
}

module.exports = new AliSms()
