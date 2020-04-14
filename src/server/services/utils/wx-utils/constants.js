/**
 * Created by chang on 2017/7/23.
 */

const ERR_TYPE = {
    NOAUTH: '商户无此接口权限',
    NOTENOUGH: '余额不足',
    ORDERPAID: '商户订单已支付',
    ORDERCLOSED: '订单已关闭',
    SYSTEMERROR: '系统超时',
    APPID_NOT_EXIST: '参数中缺少APPID',
    MCHID_NOT_EXIST: '参数中缺少MCHID',
    APPID_MCHID_NOT_MATCH: 'appid和mch_id不匹配',
    LACK_PARAMS: '缺少必要的请求参数',
    OUT_TRADE_NO_USED: '商户订单号重复',
    SIGNERROR: '签名错误',
    XML_FORMAT_ERROR: 'XML格式错误',
    REQUIRE_POST_METHOD: '请使用post方法',
    POST_DATA_EMPTY: 'post数据为空',
    NOT_UTF8: '编码格式错误'
}

exports.WX_GET_SESSION_KEY = 'https://api.weixin.qq.com/sns/jscode2session'
exports.WX_GET_UNIFIED_ORDER = 'https://api.mch.weixin.qq.com/pay/unifiedorder'
exports.WX_GET_ACCESS_TOKEN = 'https://api.weixin.qq.com/sns/oauth2/access_token'
exports.WX_GET_USER_INFO = 'https://api.weixin.qq.com/sns/userinfo'

exports.getErrDes = function(err_code) {
    for (const key in ERR_TYPE) {
        if (key === err_code) {
            return ERR_TYPE[key]
        }
    }
}
