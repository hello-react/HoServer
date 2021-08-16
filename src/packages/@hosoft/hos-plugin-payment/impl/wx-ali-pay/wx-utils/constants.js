/**
 * Created by chang on 2017/7/23.
 */

const ERR_TYPE = {
    NOAUTH: tp('noAuth'),
    NOTENOUGH: tp('notEnough'),
    ORDERPAID: tp('orderPaid'),
    ORDERCLOSED: tp('orderClosed'),
    SYSTEMERROR: tp('systemError'),
    APPID_NOT_EXIST: tp('appidNotExist'),
    MCHID_NOT_EXIST: tp('mchidNotExist'),
    APPID_MCHID_NOT_MATCH: tp('appidMchidNotMatch'),
    LACK_PARAMS: tp('lackParams'),
    OUT_TRADE_NO_USED: tp('outTradeNoUsed'),
    SIGNERROR: tp('signError'),
    XML_FORMAT_ERROR: tp('xmlFormatError'),
    REQUIRE_POST_METHOD: tp('requirePostMethod'),
    POST_DATA_EMPTY: tp('postDataEmpty'),
    NOT_UTF8: tp('notUtf8')
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
