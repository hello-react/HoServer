/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 * author: Jack Zhang
 **/
const config = require('config')
const rn = require('random-number')
const SMSClient = require('@alicloud/sms-sdk')
const { ErrorCodes } = require('../../framework/base')
const { SMS, User } = require('../../framework/models')

/**
 * 短信相关服务接口
 */
class SMSService {
    constructor() {
        const accessKeyId = config.get('sms.accessKeyId')
        const secretAccessKey = config.get('sms.secretAccessKey')

        this.smsSignName = config.get('sms.signName')
        this.smsTemplateCode = config.get('sms.templateCode')

        if (accessKeyId && secretAccessKey) {
            this.smsClient = new SMSClient({
                accessKeyId,
                secretAccessKey
            })
        }
    }

    /**
     * 发送验证码
     */
    async sendSMS(args) {
        if (!this.smsClient) {
            return Promise.reject({ message: '请先配置短信服务相关参数', code: ErrorCodes.SYSTEM_ERR_CONFIG })
        }

        const { check_exists, mobile, prefix, templ_code } = args
        if (check_exists) {
            const existUser = await User.count({ mobile })
            if (!existUser) {
                return Promise.reject({ message: '手机号未注册', code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
            }
        }

        const code = rn({
            min: 1111,
            max: 9999,
            integer: true
        }).toString()

        const templateParam = `{"code": ${code}}`

        try {
            const isChina = !prefix || prefix === '86' || prefix === '+86'

            const sendSMSResult = await this.smsClient.sendSMS({
                PhoneNumbers: isChina ? mobile : prefix + mobile,
                SignName: this.smsSignName,
                TemplateCode: templ_code || this.smsTemplateCode,
                TemplateParam: templateParam
            })

            await this.saveSMS(mobile, code)
            logger.info('UserService sendSMS result: ' + sendSMSResult)

            return 'success'
        } catch (e) {
            if (e.code === 'isv.BUSINESS_LIMIT_CONTROL') {
                return Promise.reject({ message: '对不起，短信验证码发送次数已达上限，请1小时后再试', code: ErrorCodes.GENERAL_ERR_THIRD_SERVICE })
            } else if (e.code === 'isv.MOBILE_NUMBER_ILLEGAL') {
                return Promise.reject({ message: '请输入有效正确的手机号', code: ErrorCodes.GENERAL_ERR_THIRD_SERVICE })
            } else {
                return Promise.reject({ message: '验证码发送失败 ', detail: e.message || '', code: ErrorCodes.GENERAL_ERR_UNEXPECTED })
            }
        }
    }

    /**
     * 验证短信验证码
     * @param mobile 手机号
     * @param sms_code 短信验证码
     * @returns {Promise<string>}
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
     * 保存短信验证验证码，验证时需检查时间戳，应设置15分钟后过期
     * @param mobile
     * @param sms_code
     * @returns {Promise<*>}
     */
    async saveSMS(mobile, smsContent) {
        const newSMS = new SMS({
            mobile: mobile,
            sms: smsContent
        })

        newSMS.save()

        logger.info(`sms saved, mobile: ${mobile}, smsContent: ${smsContent}`)
        return 'success'
    }
}

module.exports = new SMSService()
