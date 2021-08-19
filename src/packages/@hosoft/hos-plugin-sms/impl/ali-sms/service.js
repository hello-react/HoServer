/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
**/
const config = require('@hosoft/config')
const rn = require('random-number')
const SMSClient = require('@alicloud/sms-sdk')
const SMSService = require('../../service')
const { ErrorCodes } = require('@hosoft/restful-api-framework/base')
const { User } = require('@hosoft/restful-api-framework/models')

/**
 * aliyun SMS service
 */
class AliSMSService {
    constructor() {
        const accessKeyId = config.get('plugins.sms.accessKeyId')
        const secretAccessKey = config.get('plugins.sms.secretAccessKey')

        this.smsSignName = config.get('plugins.sms.signName')
        this.smsTemplateCode = config.get('plugins.sms.templateCode')

        if (accessKeyId && secretAccessKey) {
            this.smsClient = new SMSClient({
                accessKeyId,
                secretAccessKey
            })
        }
    }

    /**
     * send SMS code
     */
    async sendSMS(args) {
        if (!this.smsClient) {
            return Promise.reject({ message: tp('errSMSConfig'), code: ErrorCodes.SYSTEM_ERR_CONFIG })
        }

        const { check_exists, mobile, prefix, templ_code } = args
        if (check_exists) {
            const existUser = await User.count({ mobile })
            if (!existUser) {
                return Promise.reject({ message: tp('errMobileNotExists'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
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

            await SMSService.saveSMS(mobile, code)
            logger.info('UserService sendSMS result: ', sendSMSResult)

            return 'success'
        } catch (e) {
            if (e.code === 'isv.BUSINESS_LIMIT_CONTROL') {
                return Promise.reject({ message: tp('errBusinessLimit'), code: ErrorCodes.GENERAL_ERR_THIRD_SERVICE })
            } else if (e.code === 'isv.MOBILE_NUMBER_ILLEGAL') {
                return Promise.reject({ message: tp('errMobileNumber'), code: ErrorCodes.GENERAL_ERR_THIRD_SERVICE })
            } else {
                return Promise.reject({ message: `${tp('errSendSMS')}, detail: ${e.message || ''}`, code: ErrorCodes.GENERAL_ERR_UNEXPECTED })
            }
        }
    }
}

module.exports = new AliSMSService()
