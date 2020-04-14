/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: WjChang
 **/

const constants = require('./constants')
const parseString = require('xml2js').parseString
const pay = require('./pay')
const qs = require('querystring')

const request = require('request')
const requestPromise = require('request-promise-any')

const parseXml = function(xml) {
    return new Promise((resolve, reject) => {
        parseString(xml, (err, ret) => {
            if (err) {
                reject(err)
            }
            resolve(ret)
        })
    })
}

/**
 * 通过 appId 和 appSecret 到微信服务器获取 client token
 * @param callback
 */
async function getAccessToken(appid, secret) {
    return new Promise((resolve, reject) => {
        request.get(
            {
                uri: 'https://api.weixin.qq.com/cgi-bin/token',
                json: true,
                qs: { grant_type: 'client_credential', appid, secret }
            },
            (err, res, body) => {
                if (err) {
                    return reject('guard_dog err: ' + err)
                }
                // console.log(body);
                if (body.errcode) {
                    return reject(`获取 access token 失败[${body.errcode}], ${body.errmsg}`)
                }

                resolve(body)
            }
        )
    })
}

/**
 * 获取微信用户信息
 */
async function getUserInfo(app_id, app_secret, code, grant_type = 'authorization_code') {
    const reqUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token?'
    const params = {
        appid: app_id,
        secret: app_secret,
        code: code,
        grant_type: 'authorization_code'
    }

    const options = {
        method: 'get',
        url: reqUrl + qs.stringify(params)
    }

    return new Promise((resolve, reject) => {
        request(options, async (tokenErr, tokenRes, tokenBody) => {
            if (tokenErr || !tokenRes) {
                return reject('获取微信授权失败: ' + JSON.stringify(tokenErr))
            }

            if (typeof tokenBody === 'string') {
                tokenBody = JSON.parse(tokenBody)
            }

            // 检查用户是否已经注册
            const openid = tokenBody.openid
            if (tokenBody.errcode / 1 > 0) {
                return reject('获取微信用户 openid 失败: ' + JSON.stringify(tokenBody))
            }

            const accessToken = tokenBody.access_token
            const options = {
                method: 'get',
                url:
                    'https://api.weixin.qq.com/sns/userinfo?' +
                    qs.stringify({
                        access_token: accessToken,
                        openid: openid,
                        lang: 'zh_CN'
                    })
            }

            request(options, async (userErr, userRes, userBody) => {
                if (userErr && userRes) {
                    return reject('获取微信用户 access_token 失败: ' + JSON.stringify(userErr))
                }

                if (typeof userBody === 'string') {
                    userBody = JSON.parse(userBody)
                }

                resolve(userBody)
            })
        })
    })
}

/**
 * 支付签名
 */
async function doPrepay(tid, total_fee, body, openid, app_id, mch_id, api_key, attach = 'test', notify_url = '/notify', device_ip = '0.0.0.0', trade_type = 'JSAPI') {
    const nonce_str = Math.random()
        .toString()
        .substr(0, 10)
    total_fee = Math.floor((total_fee * 10000) / 100)

    let formData = '<xml>'
    formData += '<appid>' + app_id + '</appid>'
    formData += '<attach>' + attach + '</attach>'
    formData += '<body>' + body + '</body>'
    formData += '<mch_id>' + mch_id + '</mch_id>'
    formData += '<nonce_str>' + nonce_str + '</nonce_str>'
    formData += '<notify_url>' + notify_url + '</notify_url>'

    if (trade_type === 'JSAPI') {
        formData += '<openid>' + openid + '</openid>'
    }

    formData += '<out_trade_no>' + tid + '</out_trade_no>'
    formData += '<spbill_create_ip>' + device_ip + '</spbill_create_ip>'
    formData += '<total_fee>' + total_fee + '</total_fee>'
    formData += '<trade_type>' + trade_type + '</trade_type>'
    formData += '<sign>' + pay.paysignjsapi(app_id, attach, body, mch_id, nonce_str, notify_url, openid, tid, device_ip, total_fee, trade_type, api_key) + '</sign>'
    formData += '</xml>'

    const prepayRes = await requestPromise({
        url: constants.WX_GET_UNIFIED_ORDER,
        method: 'POST',
        body: formData
    })

    const pResObj = await parseXml(prepayRes)

    if (pResObj.xml.return_code[0] === 'FAIL') {
        throw pResObj.xml.return_msg[0]
    } else if (pResObj.xml.return_code[0] === 'SUCCESS') {
        const args = {}
        const retData = {}
        args.package = 'prepay_id=' + pResObj.xml.prepay_id[0]
        args.timeStamp = Math.floor(new Date().getTime() / 1000).toString()
        args.nonceStr = Math.random()
            .toString()
            .substr(0, 10)
        args.signType = 'MD5'
        args.prepayid = pResObj.xml.prepay_id[0]
        args.appPackage = 'Sign=WXPay'

        if (trade_type === 'JSAPI') {
            args.paySign = pay.paysignjs(app_id, args.nonceStr, args.package, args.signType, args.timeStamp, api_key)

            retData.package = args.package
            retData.timeStamp = args.timeStamp
            retData.nonceStr = args.nonceStr
            retData.signType = args.signType
            retData.paySign = args.paySign
        } else if (trade_type === 'APP' || trade_type === 'NATIVE') {
            args.sign = pay.paysignapp(app_id, mch_id, args.prepayid, args.appPackage, args.nonceStr, args.timeStamp, api_key)

            retData.partnerid = mch_id
            retData.prepayid = args.prepayid
            retData.package = args.appPackage
            retData.noncestr = args.nonceStr
            retData.timestamp = args.timeStamp
            retData.sign = args.sign

            if (trade_type === 'NATIVE') {
                retData.code_url = pResObj.xml.code_url[0]
            }
        }

        return retData
    } else {
        throw Error('支付服务异常')
    }
}

module.exports = {
    getAccessToken,
    getUserInfo,
    doPrepay
}
