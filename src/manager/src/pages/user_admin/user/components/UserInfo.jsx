/* eslint-disable jsx-a11y/alt-text */
/**
 * HoServer Manager Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 * author: Jack Zhang
 * */
import '@ant-design/compatible/assets/index.css'

import { Icon} from "@ant-design/compatible"
import {Avatar, Button, Card, Col, Modal, Row, Tag, Tooltip} from 'antd'
import moment from 'moment'
import React, {useEffect, useRef, useState} from 'react'

import alipayIcon from '@/assets/alipay.svg'
import qqIcon from '@/assets/qq.svg'
import vipIcon from '@/assets/vip.svg'
import wechatIcon from '@/assets/wechat.svg'
import weiboIcon from '@/assets/weibo.svg'
import {formatLocation, ossProcessImg} from '@/utils/utils'

import UserService from '../../service'

const UserInfo = props => {
    const {children} = props
    const userInfo = props.modelInstance

    const [visible, setVisible] = useState(false)
    const roleRef = useRef([])
    const permRef = useRef([])

    useEffect(() => {
        if (visible) {
            loadData()
        }
    }, [visible])

    const loadData = async () => {
        roleRef.current = await UserService.listRole()
        permRef.current = await UserService.listPermission()
    }

    const renderGeneralForm = () => {
        return (
            <Card title="基本信息" bordered={false} size="small">
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">用户名：</Col>
                    <Col span={18}>
                        {userInfo.user_name}{' '}
                    </Col>
                </Row>
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">用户昵称：</Col>
                    <Col span={18}>
                        {userInfo.nick_name}{' '}
                        {userInfo.vip_type ? <img title='已激活 VIP' style={{width: 24}} src={vipIcon} /> : null}
                    </Col>
                </Row>
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">用户名：</Col>
                    <Col span={18}>{userInfo.gender === 'male' ? '男' : (userInfo.gender === 'female' ? '女' : '未知')}</Col>
                </Row>
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">真实姓名：</Col>
                    <Col span={18}>{userInfo.real_name}</Col>
                </Row>
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">注册时间：</Col>
                    <Col span={18}>{moment(userInfo.created_at).format('YYYY-MM-DD HH:mm')}</Col>
                </Row>
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">上次登录时间：</Col>
                    <Col span={18}>{userInfo.last_login ? moment(userInfo.last_login).format('yyyy-MM-dd HH:mm') : '尚未登录'}</Col>
                </Row>
                {userInfo.expire_time ? (
                    <Row gutter={[10, 20]}>
                        <Col span={6} align="right">VIP/激活过期时间：</Col>
                        <Col span={18}>{moment(userInfo.expire_time).format('yyyy-MM-dd HH:mm')}</Col>
                    </Row>
                ) : null}
            </Card>
        )
    }

    const renderContactlForm = () => {
        const thirContact = userInfo.third_contact || []
        const wxInfo = thirContact.find(t => t.type === 'wechat')
        const weiboInfo = thirContact.find(t => t.type === 'weibo')
        const qqInfo = thirContact.find(t => t.type === 'qq')
        const alipayInfo = thirContact.find(t => t.type === 'alipay')

        return (
            <Card title="联系信息" bordered={false} size="small">
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">手机号码：</Col>
                    <Col span={18}>{userInfo.mobile || '未设置'}</Col>
                </Row>
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">电子邮件：</Col>
                    <Col span={18}>{userInfo.email || '未设置'}</Col>
                </Row>
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">地区：</Col>
                    <Col span={18}>{formatLocation(userInfo.location_rel)}</Col>
                </Row>
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">三方账号：</Col>
                    <Col span={18}>
                        {wxInfo ? (
                            <div><img src={wechatIcon} style={{width: 24}} /> {wxInfo.dis_name || wxInfo.account}</div>
                        ) : null}
                        {weiboInfo ? (
                            <div style={{marginTop: 10}}><img src={qqIcon} style={{width: 24}} /> {weiboInfo.dis_name || weiboInfo.account}</div>
                        ) : null}
                        {qqInfo ? (
                            <div style={{marginTop: 10}}><img src={weiboIcon} style={{width: 24}} /> {qqInfo.dis_name || qqInfo.account}</div>
                        ) : null}
                        {alipayInfo ? (
                            <div style={{marginTop: 10}}><img src={alipayIcon} style={{width: 24}} /> {alipayInfo.dis_name || alipayInfo.account}</div>
                        ) : null}
                    </Col>
                </Row>
            </Card>
        )
    }

    const renderRoleForm = () => {
        return (
            <Card title="角色权限" bordered={false} size="small">
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right">角色：</Col>
                    <Col span={18}>
                        {userInfo.roles && userInfo.roles.length > 0 ? userInfo.roles.map(role => {
                            const item = roleRef.current.find(r => r.key === role)
                            return item ? (
                                <Tag key={item.key} color="blue">
                                    {item.title}
                                </Tag>
                            ) : null
                        }) : '未设置'}
                    </Col>
                </Row>
                <Row gutter={[10, 20]}>
                    <Col span={6} align="right"><Tooltip title="用户实际权限为角色权限+管理员设置权限"><Icon type="question-circle" /></Tooltip> 权限：</Col>
                    <Col span={18}>
                        {userInfo.permissions && userInfo.permissions.length > 0 ? userInfo.permissions.map(perm => {
                            const item = permRef.current.find(r => r.key === perm.name)
                            return item ? (
                                <Tag key={item.key} color="blue">
                                    {item.title}
                                </Tag>
                            ) : null
                        }) : '未设置'}
                    </Col>
                </Row>
            </Card>
        )
    }

    console.log('UserForm ====> rendered')

    return (
        <>
            {children ? (
                <span onClick={() => setVisible(true)}>
                    {children}
                </span>
            ) : (
                <a onClick={() => setVisible(true)}>
                    <Icon type="zoom-in" style={{color: '#1890ff'}} />
                </a>
            )}
            {visible ? (
                <Modal
                    key="userInfoModal"
                    centered
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title={`${userInfo.nick_name} 用户信息`}
                    visible={visible}
                    footer={<Button type="primary" onClick={() => setVisible(false)}>关闭</Button>}
                    onCancel={() => setVisible(false)}
                >
                    <Row gutter={[10, 20]}>
                        <Col span={16}>
                            <Row style={{padding: '12px'}}>
                                {userInfo.disabled ? <Tag color="red">该用户已冻结</Tag> : null}
                                {userInfo.verified === true ? <Tag color="green">已审核</Tag> : null}
                                {userInfo.is_active ? <Tag color="green">已激活</Tag> : (userInfo.is_active === false ? <Tag color="red">未激活</Tag> : null)}
                                {userInfo.is_active === false && userInfo.verified === false ? <Tag color="orange">待审核</Tag> : null}
                            </Row>
                            {renderGeneralForm()}
                            {renderContactlForm()}
                            {renderRoleForm()}
                        </Col>
                        <Col span={8} align="center">
                            <Avatar
                                src={ossProcessImg(userInfo.avatar, 250, 0, true)}
                                size={128}
                                icon={userInfo.avatar ? undefined : <Icon type="user" />}
                                style={{marginTop: 50, cursor: 'pointer'}}
                                onClick={() => userInfo.avatar && window.open(userInfo.avatar, '_blank')}
                            />
                            <div style={{fontStyle: 'italic', marginTop: 20}}>{userInfo.signature || '未设置签名'}</div>
                        </Col>
                    </Row>
                </Modal>
            ) : null}
        </>
    )
}

export default UserInfo
