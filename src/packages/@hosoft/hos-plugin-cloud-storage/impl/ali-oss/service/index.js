/* eslint-disable no-template-curly-in-string,node/no-deprecated-api */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
**/
const config = require('@hosoft/config')
const crypto = require('crypto')
const router = require('express').Router()
const { Constants } = require('@hosoft/restful-api-framework/base')

/**
 * Aliyun OSS upload plugin
 */
class AliOSS {
    init(container, _, app) {
        // upload policy
        const getUploadPolicyWithCallback = () => {
            const accesskeyId = config.get('plugins.storage.oss.accessKeyId')
            const keySecret = config.get('plugins.storage.oss.accessKeySecret')
            const baseUrl = config.get('plugins.storage.oss.baseurl')
            let callbackUrl = config.get('plugins.storage.oss.uploadCallback')
            if (!callbackUrl) {
                callbackUrl = config.get('server.serverUrl') + '/api/v1/upload/oss/callback'
            }

            const $end = new Date().getTime() + 1000 * 60 * 60 * 12 // policy expire time 2 hours
            const $expiration = new Date($end).toISOString()

            const $policyString = {
                expiration: $expiration,
                conditions: [
                    ['content-length-range', 0, 200 * 1024 * 1024] // max upload file size
                ]
            }

            const $callback_param = {
                callbackUrl: callbackUrl,
                callbackBody:
                    'filename=${object}&size=${size}&userId=${userId}&mimeType=${mimeType}&height=${imageInfo.height}&width=${imageInfo.width}',
                callbackBodyType: 'application/x-www-form-urlencoded'
            }

            const $callback_string = JSON.stringify($callback_param)
            const $base64_callback_body = Buffer.from($callback_string).toString('base64')

            const $policy = JSON.stringify($policyString)
            const $base64_policy = new Buffer($policy).toString('base64')
            const $signature = crypto
                .createHmac('sha1', keySecret)
                .update($base64_policy)
                .digest('base64')

            return {
                OSSAccessKeyId: accesskeyId,
                host: baseUrl,
                policy: $base64_policy,
                signature: $signature,
                success_action_status: '200',
                callback: $base64_callback_body,
                expire: $end
            }
        }

        // get oss upload policy
        router.get(`${Constants.API_PREFIX}/upload/oss/policy`, (req, res) => {
            const result = getUploadPolicyWithCallback()
            return res.json({
                status: 0,
                data: result
            })
        })

        // oss upload result callback url
        router.post(`${Constants.API_PREFIX}/upload/oss/callback`, async (req, res) => {
            const $host = config.get('plugins.storage.oss.baseurl')
            const objKey = req.body.filename
            try {
                logger.info('upload oss callback', req.body)
            } catch (e) {
                logger.error('upload catch exception: ' + e.message)
            }

            // aliyun required JSON format
            res.json({ result: $host + '/' + objKey })
        })

        app.use(router)
    }
}

module.exports = new AliOSS()
