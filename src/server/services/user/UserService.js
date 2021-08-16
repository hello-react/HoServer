const config = require('@hosoft/config')
const jwt = require('jsonwebtoken')
const PasswordValidator = require('password-validator')
const { BaseHelper, ErrorCodes, PluginManager } = require('@hosoft/restful-api-framework/base')
const { Role, User } = require('@hosoft/restful-api-framework/models')
const tokenExpireTime = config.get('jwt.expire') || '1d'

// password validate rule
const schema = new PasswordValidator()
// prettier-ignore
schema.is().min(6).is().max(20).has().not().spaces()

/**
 * User management service
 */
class UserService {
    /**
     * user login
     */
    async login(args) {
        const password = args.password
        const user_name = (args.user_name || '').toLowerCase()
        if (!(user_name && password)) {
            return Promise.reject({ message: t('errNoUserOrPass'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        // prettier-ignore
        const userInfo = await User.findOne({
            user_name: user_name
        }, { lean: false })

        if (!userInfo) {
            return Promise.reject({ message: t('errUserNotExists'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const valid = await userInfo.verifyPassword(password)
        if (valid) {
            if (!userInfo.is_active) {
                userInfo.is_active = true
                await userInfo.save()
            }

            if (userInfo.disabled == true) {
                return Promise.reject({ message: t('errUserFreezed'), code: ErrorCodes.USER_ERR_DISABLED })
            }

            return this.fillUserInfo(userInfo)
        } else {
            return Promise.reject({ message: t('errWrongUserOrPassword'), code: ErrorCodes.USER_ERR_PASSWORD })
        }
    }

    /**
     * user register
     */
    async register(args) {
        const { user_name, nick_name, avatar, password, sms_code, mobile } = args

        if (!(user_name && password)) {
            return Promise.reject({ message: tf('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        if (!(await this._validatePassword(password))) {
            return
        }

        const smsPlugin = PluginManager.getPlugin('sms')
        if (mobile && smsPlugin) {
            const verifyResult = await smsPlugin.getService().verifySMS(mobile, sms_code)
            if (verifyResult !== true) {
                return Promise.reject({ message: t('errValidateSMS'), code: ErrorCodes.USER_ERR_SMS_CODE })
            }

            const userMobile = await User.count({ mobile })
            if (userMobile > 0) {
                return Promise.reject({ message: t('errMobileExists', { mobile }), code: ErrorCodes.GENERAL_ERR_EXIST })
            }
        }

        const existUser = await User.count({ user_name })
        if (existUser > 0) {
            return Promise.reject({
                message: t('errUserExists', { name: user_name }),
                code: ErrorCodes.GENERAL_ERR_EXIST
            })
        }

        const newUser = {
            user_name: user_name,
            nick_name: nick_name || user_name,
            password: password,
            mobile: mobile,
            is_active: true,
            avatar: avatar
        }

        const result = await User.create(newUser)
        return result.user_id
    }

    /**
     * get user detail by user name
     * @param req
     * @returns {Promise<*>}
     */
    async getUserByUserName(userName) {
        if (!userName || userName.length < 2) {
            return Promise.reject({ message: tf('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const userInfo = await User.findOne({
            user_name: userName.toLowerCase()
        })

        if (!userInfo) {
            return Promise.reject({ message: t('errUserNotExists'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        return this.fillUserInfo(userInfo)
    }

    /**
     * get user detail by user id
     * @param args
     * @returns {Promise<*>}
     */
    async getUserByUserId(userId, currentUserId) {
        if (!userId) {
            return null
        }

        const userInfo = await User.findOne({
            user_id: userId
        })

        if (!userInfo) {
            return Promise.reject({ message: t('errUserNotExists'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        // less information for other users
        if (String(currentUserId) != String(userId)) {
            return {
                user_id: userInfo.user_id,
                user_name: userInfo.user_name,
                nick_name: userInfo.nick_name,
                gender: userInfo.gender,
                avatar: userInfo.avatar
            }
        }

        return this.fillUserInfo(userInfo)
    }

    /**
     * reset password TODO: email validation
     */
    async resetPassword(args) {
        const smsPlugin = PluginManager.getPlugin('sms')
        if (!smsPlugin) {
            return Promise.reject({
                message: t('errPluginNotInstall', { name: 'SMS' }),
                code: ErrorCodes.GENERAL_ERR_PLUGIN
            })
        }

        const { mobile, sms_code, new_password } = args
        if (!(await this._validatePassword(new_password))) {
            return
        }

        const verifyResult = await smsPlugin.getService().verifySMS(mobile, sms_code)
        if (verifyResult !== true) {
            return Promise.reject({ message: t('errValidateSMS'), code: ErrorCodes.USER_ERR_SMS_CODE })
        }

        const userInfo = await User.findOne({ mobile: mobile.trim() })
        if (!userInfo) {
            return Promise.reject({ message: t('errMobileNotExists'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        // if (userInfo.mobile !== mobile.trim()) {
        //     Promise.reject({ message: t('errMobileNotBind'), code: ErrorCodes.USER_ERR_MOBILE_NOT_BIND });
        // }

        const password = new_password
        return User.update({ user_id: userInfo.user_id }, { password })
    }

    /**
     * change password
     */
    async changePassword(args, curUserId) {
        const { old_password, new_password, user_name } = args
        if (!(await this._validatePassword(new_password))) {
            return
        }

        const query = { user_name: user_name.toLowerCase() }
        const user = await User.findOne(query, { lean: false })
        if (user) {
            const valid = await user.verifyPassword(old_password)
            if (!valid) {
                return Promise.reject({ message: t('errOldPassword'), code: ErrorCodes.USER_ERR_PASSWORD })
            }

            if (curUserId && String(user.user_id) != String(curUserId)) {
                return Promise.reject({ message: tf('errNoAuthority'), code: ErrorCodes.GENERAL_ERR_UNAUTHORIZED })
            }

            user.password = new_password
            await user.save()

            return true
        } else {
            return Promise.reject({ message: t('errUserNotExists'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }
    }

    /**
     * change user name
     */
    async changeUserName(userId, args) {
        const { user_name, password } = args

        const userInfo = await User.findOne({ user_name })
        if (userInfo) {
            return Promise.reject({
                message: t('errUserExists', { name: user_name }),
                code: ErrorCodes.GENERAL_ERR_EXIST
            })
        }

        return User.update({ user_id: userId }, { user_name, password })
    }

    /**
     * update nick name
     */
    async updateNickName(userId, nickName) {
        return User.update({ user_id: userId }, { nick_name: nickName })
    }

    /**
     * update nick avatar
     */
    async updateAvatar(userId, avatar) {
        return User.update({ user_id: userId }, { avatar })
    }

    async fillUserInfo(user, fillThird) {
        const token = jwt.sign(
            {
                id: user.user_id
            },
            config.get('jwt.secret'),
            {
                expiresIn: tokenExpireTime
            }
        )

        await this.setUserRolePermission(user)

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
            vip_type: user.vip_type,
            token: token
        }

        if (fillThird) {
            result.third_account = user.third_account
        }

        // fill location info
        const areaPlugin = PluginManager.getPlugin('area')
        if (areaPlugin) {
            areaPlugin.getService().fillLocationInfo(result.location)
        }

        await BaseHelper.getContainer().executeHook('fillUserInfo', null, null, result, user)
        return result
    }

    /**
     * get role detail by role name
     * @param roleName
     */
    async getRoleByName(roleName) {
        return Role.findOne({ name: roleName })
    }

    /**
     * fill user default role and permissions
     * @param userInfo
     */
    async setUserRolePermission(userInfo) {
        const permissions = userInfo.permissions || []
        if (permissions.findIndex((p) => p.name === 'site:access') < 0) {
            permissions.push({ name: 'site:access', scope: null })
        }

        if (userInfo.roles && userInfo.roles.length > 0) {
            for (const roleName of userInfo.roles) {
                const role = await this.getRoleByName(roleName)
                if (role && role.permissions) {
                    for (const permission of role.permissions) {
                        const existPerm = permissions.find((p) => p.name === permission.name)
                        if (!existPerm) {
                            permissions.push(permission)
                        }
                    }
                }
            } // END: for
        }

        const roles = userInfo.roles || []
        if (roles.indexOf('user') < 0) {
            roles.push('user')
        }

        userInfo.permissions = permissions
        userInfo.roles = roles
    }

    /****************************************************************
     * private functions
     ****************************************************************/

    async _validatePassword(password) {
        const result = schema.validate(password, { list: true })
        if (result && result.length > 0) {
            let msg
            const err = result[0]
            if (err === 'min') {
                msg = t('errPasswordLengthMin', { min: 6 })
            } else if (err === 'max') {
                msg = t('errPasswordLengthMax', { max: 20 })
            } else if (err === 'spaces') {
                msg = t('errPasswordNoSpaces')
            }

            return Promise.reject({ message: msg, code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        return true
    }

    async _checkExistMobile(userId, mobile) {
        const user = await User.findOne({
            mobile
        })

        if (user && (!userId || userId != user.user_id)) {
            return true
        }

        return false
    }
}

module.exports = new UserService()
