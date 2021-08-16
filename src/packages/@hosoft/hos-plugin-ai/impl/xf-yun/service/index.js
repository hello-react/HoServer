/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
**/
const config = require('@hosoft/config')
const CryptoJS = require('crypto-js')
const { ErrorCodes } = require('@hosoft/restful-api-framework/base')

/**
 * iflytek voice cloud service
 */
class XfYunService {
    async getAuth(date) {
        const host = 'iat-api.xfyun.cn'
        // const appid = '5a405607'
        const apiSecret = 'adcbdc6ba4411b2671c216e503b0dbdb'
        const apiKey = '62bb0c8b9fb46fae58474ca4766bc4a1'
        const uri = '/v2/iat'

        const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${uri} HTTP/1.1`
        const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret)
        const signature = CryptoJS.enc.Base64.stringify(signatureSha)
        const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
        const authStr = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authorizationOrigin))

        return authStr
    }

    async getIatUrl() {
        const date = new Date().toUTCString()
        const auth = await this.getAuth(date)
        return 'wss://iat-api.xfyun.cn/v2/iat?authorization=' + auth + '&date=' + date + '&host=' + 'iat-api.xfyun.cn'
    }
}

module.exports = new XfYunService()
