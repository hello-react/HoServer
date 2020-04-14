/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 * author: Jack Zhang
 **/
const config = require('config')
const jwt = require('jsonwebtoken')
const request = require('request')
const SMSService = require('../system/SMSService')
const wxUtils = require('../utils/wx-utils')
const { ErrorCodes } = require('../../framework/base')
const { fillLocationData } = require('../../framework/db/db-helper')
const { SysUserService } = require('../../framework/default-app/services')
const { User } = require('../../framework/models')
const tokenExpireTime = config.get('jwt.expire') || '1d'

const qqOAuthConsumerKey = config.get('qq.oauth_consumer_key')
const wxAppId = config.get('wechat.appId')
const wxAppSecret = config.get('wechat.appSecret')

/**
 * 基础用户服务
 */
class UserService {
    /**
     * 用户登录
     */
    async login(args) {
        const password = args.password
        const user_name = args.user_name.toLowerCase()
        // prettier-ignore
        const userInfo = await User.findOne({
            user_name: user_name
        }).select('-__v')

        if (!userInfo) {
            return Promise.reject({ message: '用户不存在', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const valid = await userInfo.verifyPassword(password)
        if (valid) {
            if (!userInfo.is_active) {
                userInfo.is_active = true
                await userInfo.save()
            }

            if (userInfo.disabled == true) {
                return Promise.reject({ message: '用户已冻结，请联系客服', code: ErrorCodes.USER_ERR_DISABLED })
            }

            return this._fillUserInfo(userInfo)
        } else {
            return Promise.reject({ message: '密码校验错误', code: ErrorCodes.USER_ERR_PASSWORD })
        }
    }

    /**
     * 手机验证码登录
     */
    async loginWithMobile(args) {
        const { mobile, sms_code } = args

        const verifyResult = await SMSService.verifySMS(mobile, sms_code)
        if (verifyResult !== true) {
            return Promise.reject({ message: '验证码验证失败', code: ErrorCodes.USER_ERR_SMS_CODE })
        }

        const userInfo = await User.findOne({ mobile: mobile.trim() })
        if (!userInfo) {
            return Promise.reject({ message: '手机号未注册', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        if (!userInfo.is_active) {
            userInfo.is_active = true
            await userInfo.save()
        }

        if (userInfo.disabled == true) {
            return Promise.reject({ message: '用户已冻结，请联系客服', code: ErrorCodes.USER_ERR_DISABLED })
        }

        return this._fillUserInfo(userInfo)
    }

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
            const qqRes = await request.get(`'https://graph.qq.com/user/get_user_info?access_token=${token}&oauth_consumer_key=${qqOAuthConsumerKey}&openid=${uid}`)
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

        return userInfo
    }

    /**
     * 获取三方账号关联的用户信息
     * @param args
     * @returns {Promise<void>}
     */
    async getThirdUserInfo(args) {
        const { code } = args
        if (!code) {
            return Promise.reject({ message: '参数错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const wxUserInfo = await wxUtils.getUserInfo(wxAppId, wxAppSecret, code)
        if (!wxUserInfo) {
            return Promise.reject({ message: '获取微信用户信息错误', code: ErrorCodes.GENERAL_ERR_THIRD_SERVICE })
        }

        const userInfo = await this.getUserByThirdId('wx', wxUserInfo.openid)
        if (userInfo) {
            return userInfo
        }

        return {
            user_id: '',
            nick_name: wxUserInfo.nickname,
            avatar: wxUserInfo.headimgurl,
            third_account: [
                {
                    type: 'wx',
                    uid: wxUserInfo.openid,
                    ticket: wxUserInfo
                }
            ]
        }
    }

    /**
     * 用户注册，需校验短信验证码
     */
    async register(args) {
        const { user_name, nick_name, avatar, password, sms_code, mobile } = args

        if (!(user_name && password)) {
            return Promise.reject({ message: '参数错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const verifyResult = await SMSService.verifySMS(mobile, sms_code)
        if (verifyResult !== true) {
            return Promise.reject({ message: '验证码验证失败', code: ErrorCodes.USER_ERR_SMS_CODE })
        }

        const existUser = await User.count({ user_name })
        if (existUser > 0) {
            return Promise.reject({ message: `用户 ${user_name} 已经存在`, code: ErrorCodes.GENERAL_ERR_EXIST })
        }

        const userMobile = await User.count({ mobile })
        if (userMobile > 0) {
            return Promise.reject({ message: `手机号 ${mobile} 已经绑定过用户`, code: ErrorCodes.GENERAL_ERR_EXIST })
        }

        const newUser = {
            user_name: user_name,
            nick_name: nick_name,
            password: password,
            mobile: mobile,
            is_active: true,
            avatar: avatar
        }

        const result = await User.create(newUser)
        return result.user_id
    }

    /**
     * 三方平台用户注册
     */
    async registerThird(args) {
        const { type, uid, sms_code, mobile, ticket } = args

        const verifyResult = await SMSService.verifySMS(mobile, sms_code)
        if (verifyResult !== true) {
            return Promise.reject({ message: '验证码验证失败', code: ErrorCodes.USER_ERR_SMS_CODE })
        }

        const existUser = await User.findOne({
            'third_account.type': type,
            'third_account.uid': uid
        }).lean()

        if (existUser) {
            return Promise.reject({ message: '用户已经注册过', code: ErrorCodes.GENERAL_ERR_EXIST })
        }

        const userInfo = await User.findOne({
            mobile: mobile
        }).select('-__v')

        let accountInfo
        if (type === 'qq') {
            accountInfo = {
                type: 'qq',
                uid: uid,
                avatar: ticket.figureurl_qq_2,
                dis_name: ticket.nickname,
                ticket: ticket
            }
        } else if (type === 'wx') {
            accountInfo = {
                type: 'wx',
                uid: uid,
                avatar: ticket.headimgurl,
                dis_name: ticket.nickname,
                ticket: ticket
            }
        }

        // 老用户直接绑定
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

            return this._fillUserInfo(userInfo)
        } else {
            // 新用户创建后绑定
            const userMobile = await User.count({
                mobile
            })

            if (userMobile > 0) {
                return Promise.reject({ message: `手机号 ${mobile} 已经绑定过用户`, code: ErrorCodes.GENERAL_ERR_EXIST })
            }

            const newUser = await User.create({
                user_name: mobile,
                nick_name: accountInfo.dis_name,
                avatar: accountInfo.avatar,
                mobile: mobile,
                is_active: true,
                third_account: [accountInfo]
            })

            return this._fillUserInfo(newUser)
        }
    }

    /**
     * 通过用户名获取用户信息
     * @param req
     * @returns {Promise<*>}
     */
    async getUserByUserName(userName) {
        if (!userName || userName.length < 2) {
            return Promise.reject({ message: '参数错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const userInfo = await User.findOne({
            user_name: userName.toLowerCase()
        }).lean()

        if (!userInfo) {
            return Promise.reject({ message: '没有此用户', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        return this._fillUserInfo(userInfo)
    }

    /**
     * 通过 user_id 获取用户基本信息
     * @param args
     * @returns {Promise<*>}
     */
    async getUserByUserId(userId) {
        const userInfo = await User.findOne({
            user_id: userId
        }).lean()

        if (!userInfo) {
            return Promise.reject({ message: '没有此用户', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        return this._fillUserInfo(userInfo)
    }

    /**
     * 通过三方账号 id 获取用户信息
     * @param openid
     * @returns {Promise<void>}
     */
    async getUserByThirdId(type, uid) {
        const userInfo = await User.findOne({
            'third_account.type': type,
            'third_account.uid': uid
        }).lean()

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

        const result = await this._fillUserInfo(userInfo)
        result.third_account = userInfo.third_account || []

        return result
    }

    /**
     * 重置密码
     */
    async resetPassword(args) {
        const { mobile, sms_code, new_password } = args

        const verifyResult = await SMSService.verifySMS(mobile, sms_code)
        if (verifyResult !== true) {
            return Promise.reject({ message: '验证码验证失败', code: ErrorCodes.USER_ERR_SMS_CODE })
        }

        // 检查手机是否匹配
        const userInfo = await User.findOne({ mobile: mobile.trim() })
        if (!userInfo) {
            return Promise.reject({ message: '手机号未注册', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        // if (userInfo.mobile !== mobile.trim()) {
        //     Promise.reject({ message: '用户未绑定此手机，请确认号码', code: ErrorCodes.USER_ERR_MOBILE_NOT_BIND });
        // }

        const password = new_password
        return User.update({ user_id: userInfo.user_id }, { $set: { password } })
    }

    /**
     * 修改密码
     */
    async changePassword(args) {
        const { old_password, new_password, user_name } = args

        const options = { user_name: user_name.toLowerCase() }
        const user = await User.findOne(options)
        if (user) {
            const valid = await user.verifyPassword(old_password)
            if (!valid) {
                return Promise.reject({ message: '旧密码输入错误', code: ErrorCodes.USER_ERR_PASSWORD })
            }

            if (user.user_id !== args.currentUserId) {
                return Promise.reject({ message: '只能修改自己的密码', code: ErrorCodes.GENERAL_ERR_UNAUTHORIZED })
            }

            user.password = new_password
            await user.save()

            return true
        } else {
            return Promise.reject({ message: '用户不存在', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }
    }

    /**
     * 绑定手机号码
     * @param args
     * @returns {Promise<*>}
     */
    async bindMobile(args) {
        const { sms_code, mobile, user_name } = args
        const userInfo = await User.findOne({ user_name: user_name.toLowerCase() })
        if (!userInfo) {
            return Promise.reject({ message: '用户不存在', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        // 校验短信
        const verifyResult = await SMSService.verifySMS(mobile, sms_code)
        if (verifyResult !== true) {
            return Promise.reject({ message: '验证码验证失败', code: ErrorCodes.USER_ERR_SMS_CODE })
        }

        // 手机号码已经绑定了其他用户
        const existUser = await User.findOne({ mobile: mobile.trim() })
        if (existUser && existUser.user_name !== user_name.toLowerCase()) {
            return Promise.reject({ message: `手机号${mobile}已绑定了其他用户`, code: ErrorCodes.GENERAL_ERR_EXIST })
        }

        await User.update({ user_id: userInfo.user_id }, { $set: { mobile } })
        return 'success'
    }

    /****************************************************************
     * private functions
     ****************************************************************/

    /**
     *
     * @param mobile
     * @private
     */
    async _checkExistMobile(userId, mobile) {
        const user = await User.findOne({
            mobile
        })

        if (user && (!userId || userId != user.user_id)) {
            return true
        }

        return false
    }

    async _fillUserInfo(user) {
        const token = jwt.sign(
            {
                id: user.user_id
            },
            config.get('jwt.secret'),
            {
                expiresIn: tokenExpireTime
            }
        )

        await SysUserService.setUserRolePermission(user)

        const result = {
            user_id: user.user_id,
            user_name: user.user_name,
            nick_name: user.nick_name,
            real_name: user.real_name,
            gender: user.gender,
            avatar: user.avatar,
            mobile: user.mobile,
            email: user.email,
            permissions: user.permissions,
            roles: user.roles,
            is_admin: user.is_admin,
            location: user.location,
            token: token
        }

        return fillLocationData(result, 'location')
    }
}

module.exports = new UserService()
