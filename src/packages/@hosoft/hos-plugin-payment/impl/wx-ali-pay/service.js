/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2019/11/18
**/
const _ = require('lodash')
const AlipaySdk = require('alipay-node-sdk')
const config = require('@hosoft/config')
const moment = require('moment')
const path = require('path')
const wxUtils = require('./wx-utils')
const { v4: uuidV4 } = require('uuid')
const { BaseHelper, Constants, ErrorCodes } = require('@hosoft/restful-api-framework/base')
const { Payment, Product, DiscountCode, User } = require('@hosoft/restful-api-framework/models')

const wxAppId = config.get('plugins.payment.wechat.appId')
const wxMchId = config.get('plugins.payment.wechat.mchId')
const wxApiKey = config.get('plugins.payment.wechat.apiKey')
let wxNotifyUrl = config.get('plugins.payment.wechat.notifyUrl')
if (!wxNotifyUrl) {
    wxNotifyUrl = config.get('server.serverUrl') + Constants.API_PREFIX + '/payment/wx_notify'
}

const alipaySellerId = config.get('plugins.payment.alipay.sellerId')
const alipayAppId = config.get('plugins.payment.alipay.appId')
let alipayNotifyUrl = config.get('plugins.payment.alipay.notifyUrl')
if (!alipayNotifyUrl) {
    alipayNotifyUrl = config.get('server.serverUrl') + Constants.API_PREFIX + '/payment/alipay_notify'
}

const alipayRsaPrivate = path.resolve(path.join(global.APP_PATH, 'config', 'payment', 'ali_seller_private.pem'))
const alipayRsaPubic = path.resolve(path.join(global.APP_PATH, 'config', 'payment', 'ali_public.pem'))

/**
 * Payment service
 */
class Service {
    constructor() {
        this.loadProducts()
    }

    async loadProducts() {
        this.products = await Product.find({ enabled: true })
    }

    async prePayWx(user_id, context) {
        const { product_id, openid, discount_code, data, trade_type } = context.body
        const count = context.body.count || 1

        let openId = openid
        if (!openId) {
            const userInfo = await User.findOne({ user_id })
            const wxUserInfo = (userInfo.third_account || []).find(t => t.type == 'wechat')
            openId = _.get(wxUserInfo, ['user_info', 'openid'])
        }

        if (!openId) {
            return Promise.reject({ message: tp('unkown openid'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const product = this.products.find(p => p.product_code === product_id)
        if (!product) {
            return Promise.reject({ message: tp('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        let price = product.fee * count
        let discountFee = 0

        if (DiscountCode && discount_code && discount_code.length > 6) {
            const discountCodeInfo = await DiscountCode.findOne({ sn: discount_code })
            if (!discountCodeInfo) {
                return Promise.reject({ message: tp('invalidDiscountCode'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
            }

            discountFee = discountCodeInfo.discount_fee
            price = (price - discountCodeInfo.discount_fee).toFixed(1)
            if (price < 0) {
                price = 0
            }
        }

        const trade = {
            id: uuidV4(), // 1: order unique NO.，used for query order（internal）
            flow_no: moment().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 100000), // 2: The serial number of the order (for the customer)
            total_fee: price,
            body: product.product_name
        }

        // create order
        const newPayment = {
            user_id: user_id,
            type: 0,
            count: count,
            data: data,
            trade_sn: trade.flow_no,
            trade_id: trade.id,
            product_id: product.product_code,
            fee: product.fee * count,
            discount_fee: discountFee,
            charge: {
                pay_by: 'wechat',
                pay_fee: price,
                pay_account: '',
                pay_status: 0,
                pay_sn: ''
            }
        }

        const hookResult = await BaseHelper.getContainer().executeHook('beforeCreatePayment', context, null, newPayment, context.body)
        if (hookResult === Constants.HOOK_RESULT.RETURN) {
            return 'hooked'
        }

        await Payment.create(newPayment)

        if (price === 0) {
            await this._processOrder(context, {
                pay_by: 'wechat',
                trade_id: trade.id,
                pay_logon_account: '',
                pay_fee: 0,
                pay_account: '',
                pay_sn: '',
                receipt: {}
            })

            return 'no_fee'
        }

        try {
            const result = await wxUtils.doPrepay(
                trade.flow_no,
                trade.total_fee,
                trade.body,
                openId,
                wxAppId,
                wxMchId,
                wxApiKey,
                trade.id, // The unique number of the order, corresponding to item 1 above
                wxNotifyUrl,
                '0.0.0.0',
                trade_type || 'APP'
            )

            return result
        } catch (e) {
            return Promise.reject({ message: e.message || e, code: ErrorCodes.GENERAL_ERR_PLUGIN })
        }
    }

    async prePayAlipay(user_id, context) {
        const { product_id, discount_code, data } = context.body
        const count = context.body.count || 1

        const product = this.products.find(p => p.product_code === product_id)
        if (!product) {
            return Promise.reject({ message: tp('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        let price = product.fee * count
        let discountFee = 0

        if (DiscountCode && discount_code && discount_code.length > 6) {
            const discountCodeInfo = await DiscountCode.findOne({ sn: discount_code })
            if (!discountCodeInfo) {
                return Promise.reject({ message: tp('invalidDiscountCode'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
            }

            discountFee = discountCodeInfo.discount_fee

            price = (price - discountCodeInfo.discount_fee).toFixed(1)
            if (price < 0) {
                price = 0
            }
        }

        const trade = {
            id: uuidV4(),
            flow_no: moment().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 100000),

            total_fee: price,
            body: product.product_name
        }

        // insert order
        const newPayment = {
            user_id: user_id,
            type: 0,
            count: count,
            data: data,
            discount_fee: discountFee,
            discount_code,
            product_id: product.product_code,
            trade_sn: trade.flow_no,
            trade_id: trade.id, // internal use only

            fee: product.fee * count,
            charge: {
                pay_by: 1,
                pay_fee: price,
                pay_account: '',
                pay_status: 0,
                pay_sn: ''
            }
        }

        const hookResult = await BaseHelper.getContainer().executeHook('beforeCreatePayment', context, null, newPayment, context.body)
        if (hookResult === Constants.HOOK_RESULT.RETURN) {
            return 'hooked'
        }

        await Payment.create(newPayment)

        if (price === 0) {
            // no fee
            await this._processOrder(context, {
                pay_by: 'alipay',
                trade_id: trade.id,
                pay_logon_account: '',
                pay_fee: 0,
                pay_account: '',
                pay_sn: '',
                receipt: {}
            })

            return 'no_fee'
        }

        const aliPay = new AlipaySdk({
            appId: alipayAppId,
            notifyUrl: alipayNotifyUrl,
            rsaPrivate: alipayRsaPrivate,
            rsaPublic: alipayRsaPubic,
            sandbox: false,
            signType: 'RSA2'
        })

        try {
            const result = await aliPay.appPay({
                subject: trade.body,
                body: trade.body,
                outTradeId: trade.id,
                timeout: '10m',
                amount: trade.total_fee,
                goodsType: '0',
                sellerId: alipaySellerId
            })

            return result
        } catch (e) {
            return Promise.reject({ message: e.message, code: ErrorCodes.GENERAL_ERR_PLUGIN })
        }
    }

    // wechat pay callback
    async wxNotify(context) {
        const data = _.get(context, ['body', 'xml']) || {}

        logger.info('received wechat server callback: ', data)
        if (data.result_code === 'SUCCESS' && data.return_code === 'SUCCESS') {
            if (data.attach && data.transaction_id) {
                const ret = await this._processOrder(context, {
                    pay_by: 'wechat',
                    trade_id: data.attach,
                    pay_logon_account: data.openid,
                    pay_fee: data.total_fee / 100.0, // unit: cents
                    pay_account: data.openid,
                    pay_sn: data.transaction_id,
                    receipt: data
                })

                if (ret) {
                    return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
                }
            } else {
                // logger.info(e);
                await this._saveBadPayment(context, data, 'wechat')
            }
        } else {
            await this._saveBadPayment(context, data, 'wechat')
        }

        return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
    }

    /* alipay callback
     *
     * alipay standard callback data：
     *
     * {
     *    "gmt_create": "2018-11-04 16:22:26",
     *    "charset": "utf-8",
     *    "seller_email": "test_seller@gmail.com",
     *    "subject": "Test Product Name",
     *    "sign": "",
     *    "body": "Test Product Name 0.02",
     *    "buyer_id": "2088002017862974",
     *    "invoice_amount": "0.02",
     *    "notify_id": "2018110400222162226062971027328178",
     *    "fund_bill_list": "[{\"amount\":\"0.02\",\"fundChannel\":\"ALIPAYACCOUNT\"}]",
     *    "notify_type": "trade_status_sync",
     *    "trade_status": "TRADE_SUCCESS",
     *    "receipt_amount": "0.02",
     *    "app_id": "2018070360565263",
     *    "buyer_pay_amount": "0.02",
     *    "sign_type": "RSA2",
     *    "seller_id": "2088131633921508",
     *    "gmt_payment": "2018-11-04 16:22:26",
     *    "notify_time": "2018-11-04 16:22:26",
     *    "version": "1.0",
     *    "out_trade_no": "1509-466c-a28e-718521177497-6d15951d9f00-d41d8", (app internal trade No.)
     *    "total_amount": "0.02",
     *    "trade_no": "2018110422001462971009585113", (alipay tracde No.)
     *    "auth_app_id": "2018070360565263",
     *    "buyer_logon_id": "jac***@coolcalendar.net",
     *    "point_amount": "0.00"
     * }
     */
    async alipayNotify(context) {
        const data = _.get(context, 'body')

        logger.info('received alipay server callback: ', data)

        if (data.out_trade_no /* our id */ && data.trade_no /* alipay id */) {
            // only check success callback
            if (data.trade_status == 'TRADE_SUCCESS' || data.trade_status == 'TRADE_FINISHED') {
                const ret = await this._processOrder(context, {
                    pay_by: 'alipay',
                    trade_id: data.out_trade_no,
                    pay_account: data.buyer_id,
                    pay_fee: data.total_amount,
                    pay_logon_account: data.buyer_logon_id,
                    pay_sn: data.trade_no,
                    receipt: data
                })

                if (!ret) {
                    await this._saveBadPayment(context, data, 'alipay')
                    return 'error'
                }
            }

            return 'success'
        } else {
            await this._saveBadPayment(context, data, 'alipay')
            return 'error'
        }
    }

    async _processOrder(context, data) {
        const order = await Payment.findOne({ trade_id: data.trade_id }, { lean: false })
        if (order) {
            if ((await BaseHelper.getContainer().executeHook('beforeProcessPayment', null, null, true, data)) === Constants.HOOK_RESULT.RETURN) {
                return 'hooked'
            }

            if ((order.charge || {}).pay_status === 1) {
                logger.info('order had been processed: ' + data.trade_id)

                if (!order.charge) {
                    order.charge = {}
                }
                order.charge.receipt = data.receipt
                await order.save()
                return true
            }

            // modify order status
            await Payment.nativeModel.findOneAndUpdate(
                {
                    trade_id: data.trade_id
                },
                {
                    $set: {
                        'charge.pay_by': data.pay_by,
                        'charge.pay_fee': data.pay_fee,
                        'charge.pay_account': data.pay_account,
                        'charge.pay_logon_account': data.pay_logon_account,
                        'charge.pay_status': 1,
                        'charge.pay_sn': data.pay_sn
                    },
                    $push: {
                        'charge.receipt': data.receipt
                    }
                }
            )

            // write discount code history
            if (DiscountCode && order.discount_code) {
                const discountCodeInfo = await DiscountCode.findOne({ sn: order.discount_code }, { lean: false })
                if (discountCodeInfo) {
                    if (!discountCodeInfo.use_history) {
                        discountCodeInfo.use_history = []
                    }

                    discountCodeInfo.use_history.push({
                        user_id: order.user_id,
                        has_used: true,
                        used_time: Date.now()
                    })

                    discountCodeInfo.markModified('use_history')
                    await discountCodeInfo.save()
                    logger.info(`user had used discount code，history record saved: ${order.discount_code}`)
                }
            }

            logger.info(`user ${data.pay_by} order finished success: ${order.trade_id}`)
            return true
        } else {
            return false
        }
    }

    async _saveBadPayment(context, data, pay_by) {
        if (!(data && typeof data == 'object')) {
            return
        }

        logger.info(
            `received ${pay_by} callback，can't find payment record or error! trade_no: ${data.trade_no}, transaction_id: ${data.transaction_id}`
        )

        if ((await BaseHelper.getContainer().executeHook('beforeProcessPayment', null, null, false, data)) === Constants.HOOK_RESULT.RETURN) {
            return 'hooked'
        }

        if (pay_by == 1) {
            const existRecord = await Payment.findOne({ trade_id: data.out_trade_no })
            if (!existRecord) {
                await Payment.create({
                    user_id: '',
                    type: -1, // type unknown
                    trade_sn: 'unknown',
                    trade_id: data.out_trade_no,

                    fee: data.total_amount,
                    charge: {
                        pay_by: 1,
                        pay_fee: data.total_amount,
                        pay_account: data.buyer_id,
                        pay_status: 1,
                        pay_sn: data.trade_no,
                        pay_logon_account: data.buyer_logon_id,
                        receipt: data
                    }
                })
            }
        } else if (pay_by == 2) {
            const existRecord = await Payment.findOne({ trade_id: data.attach })
            if (!existRecord) {
                await Payment.create({
                    user_id: '',
                    type: -1, // type unknown
                    trade_sn: 'unknown',
                    trade_id: data.attach,

                    fee: data.total_fee / 100.0,
                    charge: {
                        pay_by: 2,
                        pay_fee: data.total_fee / 100.0,
                        pay_account: data.openid,
                        pay_status: 1,
                        pay_sn: data.transaction_id,
                        pay_logon_account: data.openid,
                        receipt: data
                    }
                })
            }
        }
    }
}

module.exports = new Service()
