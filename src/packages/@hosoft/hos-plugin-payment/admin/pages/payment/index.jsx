/* eslint-disable react/react-in-jsx-scope,jsx-a11y/alt-text */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import { Alert, Row, Statistic, Tag } from 'antd'
import { connect } from 'dva'

import alipayIcon from '../../assets/alipay.svg'
import appstoreIcon from '../../assets/app_store.svg'
import wechatIcon from '../../assets/wechat.svg'
import ModelManageLayout from '@hosoft/hos-plugin-auto-crud-page/admin/layouts/ModelManageLayout'

import PaymentService from './service'

const extraColumns = [
    {
        title: '状态',
        dataIndex: ['charge', 'pay_status'],
        sorter: true,
        searchFlag: 1,
        width: 50,
        filters: [
            {
                text: "未支付",
                value: 0
            },
            {
                text: "已支付",
                value: 1
            }
        ],
        render: text => {
            const status = text / 1
            return status === 0 ? <Tag color="orange">未支付</Tag> : (status === 1 ? <Tag color="green">已支付</Tag> : <Tag>未知</Tag>)
        }
    },
    {
        title: '支付方式',
        dataIndex: ['charge', 'pay_by'],
        searchFlag: 1,
        width: 50,
        filters: [
            {
                text: "苹果内购",
                value: 'appstore'
            },
            {
                text: "微信",
                value: 'wechat'
            },
            {
                text: "支付宝",
                value: 'alipay'
            }
        ],
        render: text => {
            switch(text) {
            case 'appstore':
                return <img src={appstoreIcon} style={{width: 24}} />
            case 'wechat':
                return <img src={wechatIcon} style={{width: 24}} />
            case 'alipay':
                return <img src={alipayIcon} style={{width: 24}} />
            default:
                return ''
            }
        }
    }
]

/**
 * 根据 Model 定义自动生成 crud 页面
 */
class Payment extends ModelManageLayout {
    constructor() {
        super()

        this.modelName = 'Payment'
        this.subTitle = (
            <Alert icon={false} banner style={{marginBottom: '10px'}} message="注：此页面旨在展示系统自动生成增删改查管理页面功能" type="info" />
        )

        this.options = {
            // create: false,
            onGetTableColumn: columns => {
                columns[2].render = text => `¥${text} 元`
                columns.splice(2, 0, extraColumns[0])
                columns.splice(2, 0, extraColumns[1])
            }
        }
    }

    async componentDidMount() {
        super.componentDidMount()

        const statReport = await PaymentService.getPaymentStatistics()
        this.setState({pageHeaderContent: (
            <Row>
                <Statistic title="订单总数" value={statReport.total} />
                <Statistic title="成功支付" value={statReport.success} style={{marginLeft: '100px'}} />
                <Statistic title="总收入" prefix="¥" valueStyle={{color: 'orange'}} value={statReport.total_income} suffix="元" precision={2} style={{marginLeft: '100px'}} />
                <Statistic title="&nbsp;" value="=" valueStyle={{color: '#999'}} style={{marginLeft: '50px'}} />
                <Statistic title="成功订单金额" value={statReport.order_fee} precision={2} style={{marginLeft: '50px'}} />
                <Statistic title="&nbsp;" value="-&nbsp;" valueStyle={{color: '#999'}} style={{marginLeft: '30px'}} />
                <Statistic title="优惠金额" value={statReport.discount_fee} precision={2} style={{marginLeft: '28px'}} />
                <Statistic title="&nbsp;" value="=" valueStyle={{color: '#999'}} style={{marginLeft: '30px'}} />
                <Statistic title="实际支付总金额" value={statReport.pay_fee} precision={2} style={{marginLeft: '28px'}} />
                <Statistic title="&nbsp;" value="-&nbsp;" valueStyle={{color: '#999'}} style={{marginLeft: '30px'}} />
                <Statistic title="退款金额" value={statReport.refund_fee} precision={2} style={{marginLeft: '28px'}} />
            </Row>
        )})
    }
}

export default connect(({ plugin }) => ({
    serverPlugins: plugin.serverPlugins,
    managerPlugins: plugin.managerPlugins
}))(Payment)
