/**
 * Created by chang on 2017/7/22.
 */

const crypto = require('crypto')

function paysignjs(appid, nonceStr, pkg, signType, timeStamp, api_key) {
    const ret = {
        appId: appid,
        nonceStr: nonceStr,
        package: pkg,
        signType: signType,
        timeStamp: timeStamp
    }

    let string = raw1(ret)
    string = string + '&key=' + api_key
    return crypto
        .createHash('md5')
        .update(string, 'utf8')
        .digest('hex')
        .toUpperCase()
}

function paysignapp(appid, partnerid, prepayid, packagestr, noncestr, timestamp, api_key) {
    const ret = {
        appid: appid,
        partnerid: partnerid,
        prepayid: prepayid,
        package: packagestr,
        noncestr: noncestr,
        timestamp: timestamp
    }

    let string = raw1(ret)
    string = string + '&key=' + api_key
    return crypto
        .createHash('md5')
        .update(string, 'utf8')
        .digest('hex')
        .toUpperCase()
}

function raw1(args) {
    let keys = Object.keys(args)
    keys = keys.sort()
    const newArgs = {}
    keys.forEach(function(key) {
        newArgs[key] = args[key]
    })

    let string = ''
    for (const k in newArgs) {
        string += '&' + k + '=' + newArgs[k]
    }
    string = string.substr(1)
    return string
}

function paysignjsapi(appid, attach, body, mch_id, nonce_str, notify_url, openid, out_trade_no, spbill_create_ip, total_fee, trade_type, api_key) {
    const ret = {
        appid: appid,
        attach: attach,
        body: body,
        mch_id: mch_id,
        nonce_str: nonce_str,
        notify_url: notify_url,
        openid: openid,
        out_trade_no: out_trade_no,
        spbill_create_ip: spbill_create_ip,
        total_fee: total_fee,
        trade_type: trade_type
    }

    if (trade_type === 'APP' || trade_type === 'NATIVE') {
        delete ret.openid
    }

    let string = raw(ret)
    string = string + '&key=' + api_key
    return crypto
        .createHash('md5')
        .update(string, 'utf8')
        .digest('hex')
        .toUpperCase()
}

function raw(args) {
    let keys = Object.keys(args)
    keys = keys.sort()
    const newArgs = {}
    keys.forEach(function(key) {
        newArgs[key.toLowerCase()] = args[key]
    })

    let string = ''
    for (const k in newArgs) {
        string += '&' + k + '=' + newArgs[k]
    }
    string = string.substr(1)
    return string
}

exports.paysignjs = paysignjs
exports.paysignjsapi = paysignjsapi
exports.paysignapp = paysignapp
