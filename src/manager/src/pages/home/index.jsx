/* eslint-disable jsx-a11y/alt-text */
/**
 * HoServer Manager Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 * author: Jack Zhang
 * */
import { BulbTwoTone } from '@ant-design/icons'
import { PageHeaderWrapper } from '@ant-design/pro-layout'
import { Avatar, Card, Col, Divider, List, Row,Skeleton } from 'antd'
import { connect } from 'dva'
import moment from 'moment'
import React, { Component } from 'react'

import {ossProcessImg} from "@/utils/utils";

import styles from './style.less'

const PageHeaderContent = ({ currentUser }) => {
    const loading = currentUser && Object.keys(currentUser).length

    if (!loading) {
        return (
            <Skeleton
                avatar
                paragraph={{
                    rows: 1,
                }}
                active
            />
        )
    }

    return (
        <div className={styles.pageHeaderContent}>
            <div className={styles.content}>
                <div className={styles.contentTitle}>
                    {currentUser.nick_name}，欢迎使用！
                </div>
            </div>
        </div>
    )
}

class Home extends Component {
    constructor() {
        super()
        this.showIntrduce = true
    }

    componentDidMount() {
        const { dispatch } = this.props
        dispatch({
            type: 'dashboardAndworkplace/init',
        })
    }

    componentWillUnmount() {
        const { dispatch } = this.props
        dispatch({
            type: 'dashboardAndworkplace/clear',
        })
    }

    renderActivities = item => {
        const events = item.template.split(/@\{([^{}]*)\}/gi).map(key => {
            if (item[key]) {
                return (
                    <a href={item[key].link} key={item[key].name}>
                        {item[key].name}
                    </a>
                )
            }

            return key
        })
        return (
            <List.Item key={item.id}>
                <List.Item.Meta
                    avatar={<Avatar src={ossProcessImg(item.user.avatar, 50, 0, true)} />}
                    title={
                        <span>
                            <a className={styles.username}>{item.user.name}</a>
                            &nbsp;
                            <span className={styles.event}>{events}</span>
                        </span>
                    }
                    description={
                        <span className={styles.datetime} title={item.updatedAt}>
                            {moment(item.updatedAt).fromNow()}
                        </span>
                    }
                />
            </List.Item>
        )
    }

    render() {
        const { currentUser } = this.props
        if (!currentUser || !currentUser.user_id) {
            return null
        }

        return (
            <PageHeaderWrapper title={false} content={<PageHeaderContent currentUser={currentUser} />}>
                <Row gutter={24}>
                    <Col xl={24} lg={24} md={24} sm={24} xs={24}>
                        <Card
                            className={styles.projectList}
                            style={{marginBottom: '10px'}}
                            bordered={false}>
                            <BulbTwoTone /> 欢迎使用 HoServer 管理平台，请选择菜单进行操作。
                        </Card>
                        {this.showIntrduce ? (
                            <Card
                                className={styles.projectList}
                                bordered={false}
                            >
                                <p align="center">
                                    <img style={{width: '250px'}} src="https://gitee.com/hello-react/HoServer/raw/master/src/server/public/branding/logo_with_text.png" />
                                </p>

                                <p align="center">
                                    <a href="http://hos.helloreact.cn">
                                        <img src="https://img.shields.io/badge/OfficialWebsite-HoServer-yellow.svg" />{' '}
                                    </a>
                                    <a href="http://hos.helloreact.cn">
                                        <img src="https://img.shields.io/badge/Licence-GPL3.0-green.svg?style=flat" />{' '}
                                    </a>
                                    <a href="https://gitee.com/hello-react/HoServer">
                                        <img src="https://img.shields.io/badge/Gitee-red.svg" />{' '}
                                    </a>
                                    <a href="https://github.com/hello-react/HoServer">
                                        <img src="https://img.shields.io/badge/Github-green.svg?style=social&logo=github" />
                                    </a>
                                </p>
                                <Divider />
                                <p>
                                    HoServer 是开箱即用的后台服务和管理平台脚手架，可视化对象定义，一行代码实现增删改查所有接口，内置用户、权限等基本功能。基于 HoServer 可在短时间内开发出高质量的 RESTfull API 服务和管理平台，
                                    助您大幅缩短项目开发周期，降低开发成本。是您产品占领窗口快速推向市场、接项目提升客户满意度的利器。
                                </p>
                                <p>
                                    官方网站: [ <a href="http://hos.helloreact.cn" target="_blank" rel="noopener noreferrer">HoServer 官网</a> ]
                                </p>
                                <p>
                                    使用文档: [ <a href="http://hos.helloreact.cn/docs" target="_blank" rel="noopener noreferrer">开发文档</a> ] &nbsp; [ <a href="http://hos.helloreact.cn/docs/#deploy" target="_blank" rel="noopener noreferrer">部署文档</a> ]
                                </p>
                                <p>
                                    视频介绍: [ <a href="http://hos.helloreact.cn/docs/tutorials_video.html" target="_blank" rel="noopener noreferrer">功能介绍视频</a> ]
                                </p>
                            </Card>
                        ) : null}
                    </Col>
                </Row>
            </PageHeaderWrapper>
        )
    }
}

export default connect(({ user }) => ({
    currentUser: user.currentUser
}))(Home)
