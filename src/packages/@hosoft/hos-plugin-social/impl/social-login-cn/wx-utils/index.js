/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: WjChang
 **/

const qs = require('querystring')
const request = require('request')

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
    const reqUrl = 'https://api.weixin.qq.com/sns/jscode2session?' // 'https://api.weixin.qq.com/sns/oauth2/access_token?'
    const params = {
        appid: app_id,
        secret: app_secret,
        code: code,
        js_code: code,
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
            if (tokenBody.errcode / 1 > 0) {
                return reject('获取微信用户 openid 失败: ' + JSON.stringify(tokenBody))
            }

            const openid = tokenBody.openid
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
                    return resolve({ openid })
                    // return reject('获取微信用户 access_token 失败: ' + JSON.stringify(userErr))
                }

                if (typeof userBody === 'string') {
                    userBody = JSON.parse(userBody)
                }

                if (userBody.errcode / 1 > 0) {
                    return resolve({ openid })
                }

                resolve(userBody)
            })
        })
    })
}

module.exports = {
    getAccessToken,
    getUserInfo
}
