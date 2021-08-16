/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2019/11/18
**/
const { BaseHelper, Constants, ErrorCodes } = require('@hosoft/restful-api-framework/base')
const { Payment, Product } = require('@hosoft/restful-api-framework/models')

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

    async saveAppStorePay(user_id, args) {
        const { pay_by, product_id, data, receipt } = context.params
        if (!(user_id && pay_by && product_id && receipt)) {
            return Promise.reject({ message: tp('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const product = this.products.find(p => p.product_code === product_id)
        if (!product) {
            return Promise.reject({ message: tp('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const newPayment = {
            user_id,
            product_id: product.product_code,
            type: '0',
            charge: {
                pay_by,
                receipt
            }
        }

        let result
        if (pay_by === 'appstore' && typeof receipt === 'object') {
            newPayment.trade_sn = receipt.transactionIdentifier
            newPayment.trade_id = newPayment.trade_sn
            newPayment.product_id = receipt.productIdentifier
            newPayment.status = 1
            newPayment.fee = product.fee
            newPayment.data = data

            if ((await BaseHelper.getContainer().executeHook('beforeCreatePayment', newPayment, args)) === Constants.HOOK_RESULT.RETURN) {
                return 'hooked'
            }

            result = await Payment.create(newPayment)
        }

        return result.id
    }
}

module.exports = new Service()
