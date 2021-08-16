/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import {Icon} from "@ant-design/compatible"
import {Button, Col, DatePicker, Input, message, Row, Switch, Tooltip} from "antd"
import moment from 'moment'
import React, {Component, Fragment} from 'react'

import SystemService from "../../service"

class MaintainView extends Component {
    constructor() {
        super()
        this.id = ''
        this.state = {
            enableMaintain: false,
            description: '系统维护中，请稍候再来',
            startValue: null,
            endValue: null,
            endOpen: false,
        }
    }

    async componentDidMount() {
        const result = await SystemService.getSiteMaintainInfo()
        if (result) {
            this.id = result.id
            this.setState({
                enableMaintain: result.enabled,
                description: result.description || '系统维护中，请稍候再来',
                startValue: moment(result.start_time),
                endValue: moment(result.end_time)
            })
        }
    }

    onChange = (field, value) => {
        this.setState({
            [field]: value,
        });
    };

    onStartChange = value => {
        this.onChange('startValue', value);
    };

    onEndChange = value => {
        this.onChange('endValue', value);
    };

    handleStartOpenChange = open => {
        if (!open) {
            this.setState({ endOpen: true });
        }
    };

    handleEndOpenChange = open => {
        this.setState({ endOpen: open });
    };

    async submitMaintain() {
        const result = await SystemService.setSiteMaintainInfo(this.id, {
            enabled: this.state.enableMaintain,
            start_time: this.state.startValue ? this.state.startValue.format('YYYY-MM-DD HH:mm:ss') : null,
            end_time: this.state.endValue ? this.state.endValue.format('YYYY-MM-DD HH:mm:ss') : null,
            description: this.state.description
        })

        if (result) {
            message.success('系统维护设置提交成功')
        }
    }

    render() {
        const { startValue, endValue, endOpen } = this.state;

        return (
            <Fragment>
                <Row gutter={8} style={{padding: '10px 0'}}>
                    <Col span={4}>
                    开启系统维护:
                    </Col>
                    <Col span={20}>
                        <Switch checked={this.state.enableMaintain} onChange={value => {
                            this.setState({enableMaintain: value})
                        }} />
                    </Col>
                </Row>
                <Row gutter={8} style={{padding: '10px 0'}}>
                    <Col span={4}>
                        开始、结束时间: <Tooltip title="不填提交后立即进入系统维护状态"><Icon type="question-circle" /></Tooltip>
                    </Col>
                    <Col span={20}>
                        <DatePicker
                            disabled={!this.state.enableMaintain}
                            showTime
                            format="YYYY-MM-DD HH:mm:ss"
                            value={startValue}
                            placeholder="开始时间"
                            onChange={this.onStartChange}
                            onOpenChange={this.handleStartOpenChange}
                        />
                        {' '}
                        <DatePicker
                            disabled={!this.state.enableMaintain}
                            showTime
                            format="YYYY-MM-DD HH:mm:ss"
                            value={endValue}
                            placeholder="结束时间"
                            onChange={this.onEndChange}
                            open={endOpen}
                            onOpenChange={this.handleEndOpenChange}
                        />
                    </Col>
                </Row>
                <Row gutter={8} style={{padding: '10px 0'}}>
                    <Col span={4}>
                        维护提示:
                    </Col>
                    <Col span={20}>
                        <Input.TextArea
                            disabled={!this.state.enableMaintain}
                            rows={4}
                            value={this.state.description}
                            onChange={e => {
                                this.setState({description: e.target.value})
                            }}
                        />
                    </Col>
                </Row>
                <Row gutter={8} style={{padding: '10px 0'}}>
                    <Col span={4} />
                    <Col span={20}>
                        <Button type="primary" onClick={() => this.submitMaintain()}>提交</Button>
                    </Col>
                </Row>
            </Fragment>
        )
    }
}

export default MaintainView
