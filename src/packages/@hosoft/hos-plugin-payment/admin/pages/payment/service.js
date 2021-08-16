/* eslint-disable @typescript-eslint/camelcase */
import { message } from "antd"
import { Constants, request } from '@hosoft/hos-admin-common'
import _ from 'lodash'

const wrapper = {}

/**
 * 获取支付记录统计
 */
wrapper.getPaymentStatistics = async function() {
    const rep = await request(`${Constants.API_PREFIX}/payment/statistics`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取支付记录统计失败:  ${rep.message || '接口异常'}`)
        return {}
    }

    let total = 0
    let success = 0
    let total_income = 0
    let order_fee = 0
    let discount_fee = 0
    let pay_fee = 0
    let refund_fee = 0

    const { data } = rep
    total = _.reduce(data.count, (count, r) => count + r.value, 0)
    success = _.get(data.count.find(r => r.pay_status === 1), 'value') || 0
    for (let i=0; i<data.fee.length; i++) {
        const row = data.fee[i]

        if (row.pay_status === 1) {
            order_fee += row.total_fee
            discount_fee += row.discount_fee
            pay_fee += row.pay_fee
        } else if (row.pay_status === 3) {
            refund_fee += row.pay_fee
        }
    }

    total_income = pay_fee - refund_fee

    return {
        total,
        success,
        total_income,
        order_fee,
        discount_fee,
        pay_fee,
        refund_fee
    }
}

export default wrapper
