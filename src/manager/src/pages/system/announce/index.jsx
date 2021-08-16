/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import {Icon} from "@ant-design/compatible"
import { PageHeaderWrapper } from '@ant-design/pro-layout'
import {Button, Card, Col, Input, message, Row, Switch, Tooltip} from "antd"
import React, {Component} from 'react'

import SystemService from "../service"

class AnnounceManage extends Component {
    constructor() {
        super()
        this.id = ''
        this.state = {
            enableAnnounce: false,
            title: '',
            content: ''
        }
    }

    async componentDidMount() {
        const result = await SystemService.getAnnounce()
        if (result && result.length > 0) {
            const announce = result[0]

            this.id = announce.id
            this.setState({
                enableAnnounce: announce.enabled,
                title: announce.title,
                content: announce.content
            })
        }
    }

    async submitAnnounce() {
        const result = await SystemService.setAnnounce(this.id, this.state.enableAnnounce, this.state.title, this.state.content)
        if (result) {
            message.success('公告设置提交成功')
        }
    }

    render() {
        return (
            <PageHeaderWrapper>
                <Card>
                    <Row gutter={8} style={{padding: '10px 0'}}>
                        <Col span={4}>
                        开启系统公告: <Tooltip title="一般由客户端启动时通过公告api获取公告内容并展示"><Icon type="question-circle" /></Tooltip>
                        </Col>
                        <Col span={20}>
                            <Switch checked={this.state.enableAnnounce} onChange={value => {
                                this.setState({enableAnnounce: value})
                            }} />
                        </Col>
                    </Row>
                    <Row gutter={8} style={{padding: '10px 0'}}>
                        <Col span={4}>
                        公告内容:
                        </Col>
                        <Col span={20}>
                            <div style={{marginBottom: 10}}>
                                <Input
                                    disabled={!this.state.enableAnnounce}
                                    value={this.state.title}
                                    placeholder="公告标题"
                                    onChange={e => {
                                        this.setState({title: e.target.value})
                                    }}
                                />
                            </div>
                            <div>
                                <Input.TextArea
                                    rows={4}
                                    disabled={!this.state.enableAnnounce}
                                    value={this.state.content}
                                    placeholder="请输入公告内容"
                                    onChange={e => {
                                        this.setState({content: e.target.value})
                                    }}
                                />
                            </div>
                        </Col>
                    </Row>
                    <Row gutter={8} style={{padding: '10px 0'}}>
                        <Col span={4} />
                        <Col span={20}>
                            <Button type="primary" onClick={() => this.submitAnnounce()}>提交</Button>
                        </Col>
                    </Row>
                </Card>
            </PageHeaderWrapper>
        )
    }
}

export default AnnounceManage

