/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
**/
const config = require('@hosoft/config')
const request = require('request')
const wxUtils = require('../wx-utils')
const { BaseHelper, ErrorCodes, PluginManager } = require('@hosoft/restful-api-framework/base')
const { User } = require('@hosoft/restful-api-framework/models')
const qqOAuthConsumerKey = config.get('plugins.qq.oauthConsumerKey')
const wxAppId = config.get('plugins.wechat.appId')
const wxAppSecret = config.get('plugins.wechat.appSecret')

/**
 * Third login service
 */
class SocialLoginService {
    /**
     * 三方平台用户注册
     */
    async loginThird(args) {
        const { type, token, uid } = args

        if (!token) {
            return Promise.reject({ message: '参数错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        let userInfo
        if (type === 'qq') {
            const qqRes = await request.get(
                `'https://graph.qq.com/user/get_user_info?access_token=${token}&oauth_consumer_key=${qqOAuthConsumerKey}&openid=${uid}`
            )
            logger.info('qq user:' + qqRes)

            const qqUserInfo = JSON.parse(qqRes)
            if (qqUserInfo.ret != 0) {
                return Promise.reject({ message: 'QQ 登录失败', code: ErrorCodes.GENERAL_ERR_THIRD_SERVICE })
            }

            userInfo = await this.getUserByThirdId('qq', uid)
        } else if (type === 'wx' || type === 'wechat') {
            const wxUserInfo = await wxUtils.getUserInfo(wxAppId, wxAppSecret, token /* 微信返回的是 code */)
            userInfo = await this.getUserByThirdId('wx', wxUserInfo.openid)
        }

        if (!userInfo) {
            return Promise.reject({ message: '用户未注册', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        return BaseHelper.getServiceInst('UserService').fillUserInfo(userInfo, true)
    }

    /**
     * 获取三方账号关联的用户信息
     * @param args
     * @returns {Promise<void>}
     */
    async getWxUserInfo(args) {
        const { code, nick_name, avatar, auto_register } = args
        if (!code) {
            return Promise.reject({ message: '参数错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const wxUserInfo = await wxUtils.getUserInfo(wxAppId, wxAppSecret, code)
        if (!wxUserInfo) {
            return Promise.reject({ message: '获取微信用户信息错误', code: ErrorCodes.GENERAL_ERR_THIRD_SERVICE })
        }

        const userInfo = await this.getUserByThirdId('wx', wxUserInfo.openid)
        if (userInfo) {
            if (!userInfo.nick_name) {
                userInfo.nick_name = nick_name || wxUserInfo.nickname || ''
                await BaseHelper.getServiceInst('UserService').updateNickName(userInfo.user_id, userInfo.nick_name)
            }

            if (!userInfo.avatar) {
                userInfo.avatar = avatar || wxUserInfo.headimgurl || ''
                await BaseHelper.getServiceInst('UserService').updateAvatar(userInfo.user_id, userInfo.avatar)
            }

            return BaseHelper.getServiceInst('UserService').fillUserInfo(userInfo, true)
        }

        if (nick_name) {
            wxUserInfo.nickname = nick_name
        }

        if (avatar) {
            wxUserInfo.headimgurl = avatar
        }

        if (auto_register) {
            return this.registerThird({
                type: 'wx',
                uid: wxUserInfo.openid,
                third_user_info: wxUserInfo
            })
        } else {
            return {
                user_id: '',
                nick_name: wxUserInfo.nickname,
                avatar: wxUserInfo.headimgurl,
                third_account: [
                    {
                        type: 'wx',
                        uid: wxUserInfo.openid,
                        user_info: wxUserInfo
                    }
                ]
            }
        }
    }

    /**
     * 三方平台用户注册
     */
    async registerThird(args) {
        const { type, uid, sms_code, mobile, third_user_info } = args

        const smsPlugin = PluginManager.getPlugin('sms')
        if (mobile && smsPlugin) {
            const verifyResult = await smsPlugin.getService().verifySMS(mobile, sms_code)
            if (verifyResult !== true) {
                return Promise.reject({ message: '验证码验证失败', code: ErrorCodes.USER_ERR_SMS_CODE })
            }
        }

        const existUser = await User.findOne({
            'third_account.type': type,
            'third_account.uid': uid
        })

        if (existUser) {
            return Promise.reject({
                message: `此${type === 'wx' ? '微信' : type === 'qq' ? 'QQ' : ''}用户已经注册过账号`,
                code: ErrorCodes.GENERAL_ERR_EXIST
            })
        }

        let accountInfo
        if (type === 'qq') {
            accountInfo = {
                type: 'qq',
                uid: uid,
                avatar: third_user_info.figureurl_qq_2,
                dis_name: third_user_info.nickname,
                user_info: third_user_info
            }
        } else if (type === 'wx') {
            accountInfo = {
                type: 'wx',
                uid: uid,
                avatar: third_user_info.headimgurl,
                dis_name: third_user_info.nickname,
                user_info: third_user_info
            }
        }

        // if (!userName) {
        //     return Promise.reject({ message: '用户名无效', code: ErrorCodes.GENERAL_ERR_PARAM })
        // }

        // 老用户直接绑定
        const userInfo = await User.findOne({ user_name: mobile || uid }, { lean: false })
        if (userInfo) {
            if (!userInfo.is_active) {
                userInfo.is_active = true
            }

            if (!userInfo.third_account) {
                userInfo.third_account = []
            }

            userInfo.third_account.push(accountInfo)
            await userInfo.save()

            if (userInfo.disabled == true) {
                return Promise.reject({
                    message: '用户已冻结，请联系客服或老师',
                    code: ErrorCodes.USER_ERR_DISABLED
                })
            }

            return BaseHelper.getServiceInst('UserService').fillUserInfo(userInfo, true)
        } else {
            // 新用户创建后绑定
            if (mobile) {
                const userMobile = await User.count({
                    mobile
                })

                if (userMobile > 0) {
                    return Promise.reject({ message: `手机号 ${mobile} 已经绑定过用户`, code: ErrorCodes.GENERAL_ERR_EXIST })
                }
            }

            const newUser = await User.create({
                user_name: mobile || uid,
                nick_name: accountInfo.dis_name || mobile,
                avatar: accountInfo.avatar,
                mobile: mobile,
                is_active: true,
                third_account: [accountInfo]
            })

            const userInfo = await User.findOne({ user_id: newUser.user_id })
            return BaseHelper.getServiceInst('UserService').fillUserInfo(userInfo, true)
        }
    }

    /**
     * 通过三方账号 id 获取用户信息
     * @param openid
     * @returns {Promise<void>}
     */
    async getUserByThirdId(type, uid) {
        if (!uid) {
            return Promise.reject({ message: '请指定 uid', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        // prettier-ignore
        const userInfo = await User.findOne({
            'third_account.type': type,
            'third_account.uid': uid
        }, { lean: false })

        if (!userInfo) {
            return null
        }

        // 更新用户激活状态
        if (!userInfo.is_active) {
            userInfo.is_active = true
            await userInfo.save()
        }

        if (userInfo.disabled == true) {
            return Promise.reject({ message: '用户已冻结，请联系客服', code: ErrorCodes.USER_ERR_DISABLED })
        }

        return userInfo
    }
}

module.exports = new SocialLoginService()
