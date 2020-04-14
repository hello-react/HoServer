/* eslint-disable no-template-curly-in-string,node/no-deprecated-api */
/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: Jack Zhang
 **/
const config = require('config')
const Constants = require('../../base/constants/constants')
const crypto = require('crypto')
const mkdirp = require('mkdirp')
const moment = require('moment')
const multer = require('multer')
const path = require('path')
const router = require('express').Router()

const serverUrl = config.get('server.serverUrl')

/************************************************
 * local uploads
 * **********************************************/

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(global.APP_PATH, 'public/uploads'))
    },
    filename: function(req, file, cb) {
        const category = req.query.category || 'temp'
        const saveTo = category + '/' + moment().format('/YYYY-MM/DD/hhmmSSS/')
        const dir = path.join(global.APP_PATH, 'public/uploads', saveTo)
        mkdirp.sync(dir)

        cb(null, saveTo + file.originalname)
    }
})

const upload = multer({ storage: storage })
router.post(Constants.API_PREFIX + '/upload', upload.single('file'), (req, res) => {
    return res.send(serverUrl + '/public/uploads/' + req.file.filename)
})

/************************************************
 * OSS upload
 * **********************************************/

const getUploadPolicyWithCallback = () => {
    const accesskeyId = config.get('storage.oss.accessKeyId')
    const keySecret = config.get('storage.oss.accessKeySecret')
    const baseUrl = config.get('storage.oss.baseurl')
    let callbackUrl = config.get('storage.oss.uploadCallback')
    if (!callbackUrl) {
        callbackUrl = config.get('server.serverUrl') + '/api/v1/upload/oss/callback'
    }

    const $end = new Date().getTime() + 1000 * 60 * 60 * 12 // policy 过期时间为2小时
    const $expiration = new Date($end).toISOString()

    const $policyString = {
        expiration: $expiration,
        conditions: [
            ['content-length-range', 0, 200 * 1024 * 1024] // 最大文件大小.用户可以自己设置
        ]
    }

    const $callback_param = {
        callbackUrl: callbackUrl,
        callbackBody: 'filename=${object}&size=${size}&userId=${userId}&mimeType=${mimeType}&height=${imageInfo.height}&width=${imageInfo.width}',
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
    const $host = config.get('storage.oss.baseurl')
    const objKey = req.body.filename
    try {
        logger.info('upload oss callback', req.body)
    } catch (e) {
        logger.error('upload catch exception: ' + e.message)
    }

    // 阿里云要求必须是 json
    res.json({ result: $host + '/' + objKey })
})

module.exports = router
