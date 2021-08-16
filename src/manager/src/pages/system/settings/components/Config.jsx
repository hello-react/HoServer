/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import {Icon} from "@ant-design/compatible"
import {Descriptions, Tooltip} from 'antd'
import React, {Component} from 'react'

import SystemService from "../../service"

class ConfigView extends Component {
    constructor() {
        super()

        this.configDesc = {}
        this.state = {
            configs: []
        }
    }

    componentDidMount = async () => {
        const configs = await SystemService.getSystemConfig()
        this.configDesc = configs.desc
        delete configs.desc

        this.setState({configs})
    }

    renderObject = confObj => {
        const result = confObj.map(seg => {
            return (
                <Descriptions.Item key={seg.seg} label={seg.seg}>
                    {seg.configs ? this.renderObject(seg.configs) : seg.value}
                </Descriptions.Item>
            )
        })

        return (
            <Descriptions column={1} bordered size="small">
                {result}
            </Descriptions>
        )
    }

    render() {
        return (
            <div>
                { this.renderObject(this.state.configs) }
            </div>
        )
    }
}

export default ConfigView
