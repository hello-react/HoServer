/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
**/

const SocialLoginService = require('./service')

/**
 * Social login for china wechat, qq and weibo
 */
class SocialLoginCN {
    init(container, router, app) {
        router.get('/user/wechat', '获取微信登录用户信息', ctx => SocialLoginService.getWxUserInfo(ctx.query), { open: true })
        router.post('/user/register/social_cn', '三方平台用户注册', ctx => SocialLoginService.registerThird(ctx.body), { open: true })
        router.post('/user/login/social_cn', '三方平台用户登录', ctx => SocialLoginService.loginThird(ctx.body), { open: true })
    }
}

module.exports = new SocialLoginCN()
