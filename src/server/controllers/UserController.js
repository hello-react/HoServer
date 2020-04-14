/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/15
 * author: Jack Zhang
 **/
const UserService = require('../services/user/UserService')
const { ErrorCodes } = require('../framework/base')

/**
 * 用户相关接口
 */
class UserController {
    // prettier-ignore
    initRoutes(container, router) {
        // 用户不支持删除，默认路由仅用于管理员操作，普通用户操作调用独立接口
        router.def('User', ['create', 'detail', 'batch_update'], {permissions: 'user:manage'})
        router.def('User', 'list', {permissions: 'user:manage'}).outFields('location real_name mobile email is_admin is_active has_login verified disabled')
        router.def('User', 'update').beforeDbProcess((ctx, userInfo) => this._removeUnexpectedFields(ctx, userInfo))
        router.get('/user/current', '获取当前用户信息', ctx => UserService.getUserByUserId(ctx.currentUserId))
        router.get('/user/wechat', '获取微信登录用户信息', ctx => UserService.getThirdUserInfo(ctx.query), {permissions: []})

        // 登录注册相关
        router.post('/user/register', '用户注册', ctx => UserService.register(ctx.body), {permissions: []})
        router.post('/user/register/third', '三方平台用户注册', ctx => UserService.registerThird(ctx.body), {permissions: []})
        router.post('/user/login', '用户登录', ctx => UserService.login(ctx.body), {permissions: []})
        router.post('/user/login/mobile', '手机验证码登录', ctx => UserService.loginWithMobile(ctx.body), {permissions: []})
        router.post('/user/login/third', '三方平台用户登录', ctx => UserService.loginThird(ctx.body), {permissions: []})
        router.post('/user/login_admin', '管理员登录', async ctx => this.loginAdmin(ctx), {permissions: []})

        // 修改重置密码
        router.post('/user/password/change', '修改密码', ctx => UserService.changePassword(ctx.body))
        router.post('/user/password/reset', '重置密码', ctx => UserService.resetPassword(ctx.body))
        router.post('/user/mobile/bind', '绑定手机号', ctx => UserService.bindMobile(ctx.body))
    }

    // 更新用户信息部分字段不允许修改
    _removeUnexpectedFields(ctx, userInfo) {
        delete userInfo.user_id
        delete userInfo.user_name
        delete userInfo.has_login
        delete userInfo.is_active

        if (!ctx.body.password) {
            delete userInfo.password
        }
    }

    async loginAdmin(ctx) {
        const userInfo = UserService.login(ctx.body)
        if (!userInfo.is_admin) {
            return Promise.reject({ message: '非管理员用户', code: ErrorCodes.GENERAL_ERR_UNAUTHORIZED })
        }

        return userInfo
    }
}

module.exports = new UserController()
