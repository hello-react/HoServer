/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
**/
const { ErrorCodes, BaseHelper } = require('@hosoft/restful-api-framework/base')
const { SMS, User } = require('@hosoft/restful-api-framework/models')

/**
 * SMS service
 */
class SMSService {
    /**
     * verify SMS code
     */
    async verifySMS(mobile, sms_code) {
        // prettier-ignore
        const smsResult = await SMS.find({
            mobile
        }).sort({ created_at: -1 }).limit(1)

        if (smsResult && smsResult.length > 0) {
            const firstSMS = smsResult[0]
            const now_ms = new Date().getTime()

            return sms_code == firstSMS.sms && now_ms - firstSMS.created_at.getTime() <= 6 * 60 * 1000
        }

        return false
    }

    /**
     * save SMS
     */
    async saveSMS(mobile, smsContent) {
        const newSMS = {
            mobile: mobile,
            sms: smsContent
        }

        await SMS.create(newSMS)

        logger.info(`sms saved, mobile: ${mobile}, smsContent: ${smsContent}`)
        return 'success'
    }

    /**
     * login by mobile and SMS code
     */
    async loginWithMobile(args) {
        const { mobile, sms_code } = args

        const verifyResult = await this.verifySMS(mobile, sms_code)
        if (verifyResult !== true) {
            return Promise.reject({ message: tp('errValidateSMS'), code: ErrorCodes.USER_ERR_SMS_CODE })
        }

        const userInfo = await User.findOne({ mobile: mobile.trim() }, { lean: false })
        if (!userInfo) {
            return Promise.reject({ message: tp('errMobileNotExists'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        if (!userInfo.is_active) {
            userInfo.is_active = true
            await userInfo.save()
        }

        if (userInfo.disabled == true) {
            return Promise.reject({ message: tp('errUserFreezed'), code: ErrorCodes.USER_ERR_DISABLED })
        }

        return BaseHelper.getServiceInst('UserService').fillUserInfo(userInfo)
    }

    /**
     * bind mobile phone
     * @param args
     * @returns {Promise<*>}
     */
    async bindMobile(args) {
        const { sms_code, mobile, user_name } = args
        const userInfo = await User.findOne({ user_name: user_name.toLowerCase() })
        if (!userInfo) {
            return Promise.reject({ message: tp('errUserNotExists'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const verifyResult = await this.verifySMS(mobile, sms_code)
        if (verifyResult !== true) {
            return Promise.reject({ message: tp('errValidateSMS'), code: ErrorCodes.USER_ERR_SMS_CODE })
        }

        const existUser = await User.findOne({ mobile: mobile.trim() })
        if (existUser && existUser.user_name !== user_name.toLowerCase()) {
            return Promise.reject({ message: tp('errMobileExists', { mobile }), code: ErrorCodes.GENERAL_ERR_EXIST })
        }

        await User.update({ user_id: userInfo.user_id }, { mobile })
        return 'success'
    }
}

module.exports = new SMSService()
