/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2019/11/18
**/
const { Payment } = require('@hosoft/restful-api-framework/models')

/**
 * Payment service
 */
class Service {
    /**
     * get payment record statistic report
     */
    async getPaymentStatistics(userId, args) {
        const payCount = await Payment.aggregate([
            { $match: userId ? { userId: userId } : {} },
            { $group: { _id: { pay_status: '$charge.pay_status' }, value: { $sum: 1 } } },
            { $project: { _id: 0, pay_status: '$_id.pay_status', value: 1 } }
        ])

        const feeSum = await Payment.aggregate([
            { $match: userId ? { userId: userId } : {} },
            {
                $group: {
                    _id: { pay_status: '$charge.pay_status' },
                    total_fee: { $sum: '$fee' },
                    pay_fee: { $sum: '$charge.pay_fee' },
                    discount_fee: { $sum: '$discount_fee' }
                }
            },
            { $project: { _id: 0, pay_status: '$_id.pay_status', total_fee: 1, pay_fee: 1, discount_fee: 1 } }
        ])

        return {
            count: payCount,
            fee: feeSum
        }
    }

    /**
     * get product list, the product list is configured
     */
    async getProductList(args) {
        //
    }
}

module.exports = new Service()
