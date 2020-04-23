/* eslint-disable react/jsx-no-target-blank */
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { PageHeaderWrapper } from '@ant-design/pro-layout'
import { Button, Col, Modal, Result, Row, Table } from 'antd'
import React, {useState} from 'react'
import router from 'umi/router'

const dataSource = [
    {
        func: '一行代码实现增删改查',
        community: true,
        pro: true
    },
    {
        func: '批量更新删除、聚合查询',
        community: true,
        pro: true
    },
    {
        func: '对象定义可视化管理',
        community: true,
        pro: true,
        desc: '数据库集合可视化定义，无需手工创建'
    },
    {
        func: '系统管理、用户管理平台',
        community: true,
        pro: true
    },
    {
        func: '接口权限安全校验',
        community: true,
        pro: true,
        desc: '默认基于 JWT 校验，可为每个接口单独设置权限'
    },
    {
        func: '接口缓存',
        community: true,
        pro: true
    },
    {
        func: '性能指标输出',
        community: true,
        pro: true
    },
    {
        func: '短信接口',
        community: true,
        pro: true
    },
    // PRO
    {
        func: '自动生成增删改查管理页面',
        community: false,
        pro: true
    },
    {
        func: '数据批量导入导出',
        community: false,
        pro: true
    },
    {
        func: '三方登录 (QQ、微信、微博)',
        community: false,
        pro: true
    },
    {
        func: '微信公众号、微信支付、支付宝支付集成',
        community: false,
        pro: true
    },
    {
        func: '自动生成 Api 文档',
        community: false,
        pro: true,
        desc: <a target="_blank" href="https://hosapi.helloreact.cn/api/v1/api/doc/">查看自动生成文档示例</a>
    },
    {
        func: '自动生成客户端 SDK (Javascript、React Native、Java、Object-C 等)',
        community: false,
        pro: true,
        desc: <a target="_blank" href="https://gitee.com/hello-react/pub_files/tree/master/hoserver_sdk_example">查看自动生成 SDK 代码示例</a>
    },
    {
        func: '基于 Grafana 监控系统',
        community: false,
        pro: true,
        desc: <a target="_blank" href="http://monitor.helloreact.cn/">查看监控系统示例</a>
    },
    {
        func: '技术支持',
        community: 'QQ、微信群',
        pro: '一对一技术支持'
    }
];

const columns = [
    {
        title: '功能',
        dataIndex: 'func',
        key: 'func',
        width: 250
    },
    {
        title: '开源版本',
        dataIndex: 'community',
        key: 'community',
        align: 'center',
        width: 100,
        render: (text, record) => {
            return typeof(record.community) === 'string' ? record.community : (record.community ? <CheckOutlined style={{color: 'green'}} /> : <CloseOutlined style={{color: 'red'}} />)
        }
    },
    {
        title: 'PRO 版本',
        dataIndex: 'pro',
        key: 'pro',
        align: 'center',
        width: 100,
        render: (text, record) => {
            return typeof(record.pro) === 'string' ? record.pro : <CheckOutlined style={{color: 'green'}} />
        }
    },
    {
        title: '说明',
        dataIndex: 'desc',
        key: 'desc',
        width: 200
    }
]

const featureNames = {
    apidoc: '文档生成',
    sdk: 'SDK 生成',
    payment: '支付管理',
    monitor: '系统监控'
}

const NoFoundPage = (props) => {
    const {path} = props.match
    const [modalVisible, setModalVisible] = useState(false)

    const featureName = path.substr(path.lastIndexOf('/') + 1)

    return (
        <PageHeaderWrapper>
            <Result
                status="403"
                title={`${featureNames[featureName] || '此'}功能仅用于 HoServer Pro 版本`}
                subTitle="HoServer Pro 是 HoServer 的商业版本，在社区版基础上增加了Api文档自动生成、客户端SDK自动生成、系统监控、第三方系统对接等更多高级功能。"
                extra={
                    <>
                        <Button type="primary" size='large' onClick={() => setModalVisible(true)}>
                            购买PRO版 ( ¥1680 )
                        </Button>
                    </>
                }
            >
            </Result>
            <Row>
                <Col span={18} offset={3}>
                    <h2>功能对比</h2>
                    <Table pagination={false} dataSource={dataSource} columns={columns} />
                </Col>
            </Row>
            <Modal
                title="付费购买"
                visible={modalVisible}
                width={800}
                bodyStyle={{textAlign: 'center'}}
                onOk={() => {}}
                onCancel={() => setModalVisible(false)}
                okText="确认"
                footer={<Button type="primary" onClick={() => setModalVisible(false)}>关闭</Button>}
                cancelText="取消"
            >
                <img alt="" style={{width: 300, marginRight: '20px'}} src="http://assets.helloreact.cn/images/hoserver_alipay.png" />
                <img alt="" style={{width: 300}} src="http://assets.helloreact.cn/images/hoserver_wxpay.png" />
                <p style={{marginTop: '10px', fontSize: '16px'}}>付款后，请加客服微信 (jhzzzz) 或 QQ (5488232) 获取 PRO 版本源码</p>
            </Modal>
        </PageHeaderWrapper>
    )
}

export default NoFoundPage
