/* eslint-disable no-underscore-dangle */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import { Form as LegacyForm } from "@ant-design/compatible"
import { Common, TableLayout } from '@hosoft/hos-admin-common'
import { Popover,Tag } from "antd";
import _ from "lodash";
import React from 'react'

const getLogColor = level => {
    switch(level) {
    case 'debug':
        return 'lightGray'
    case 'info':
        return ''
    case 'warn':
        return 'orange'
    case 'error':
        return 'red'
    }
}

const defTableColumns = Common.setDefaultColumn([
    {
        valueType: 'dateTime',
        searchFlag: 1,
        title: "时间戳",
        dataIndex: "timestamp"
    },
    {
        searchFlag: 1,
        title: "日志等级",
        align: 'center',
        dataIndex: "level",
        width: 50,
        filters: [
            {
                text: "Debug",
                value: "debug"
            },
            {
                text: "Info",
                value: "info"
            },
            {
                text: "Warn",
                value: "warn"
            },
            {
                text: "Error",
                value: "error"
            }
        ],
        render: text => {
            return (
                <Tag color={getLogColor(text)}>{text.toUpperCase()}</Tag>
            )
        }
    },
    {
        searchFlag: 2,
        title: "日志内容",
        dataIndex: "message",
        width: 300,
        render: text => {
            if (!text) return null
            return (
                text.length > 45
                    ? <Popover placement="topLeft" trigger="click" title={text}><span style={{cursor: 'pointer'}}>{text.substr(0, 50)} ...</span></Popover>
                    : <span>{text}</span>
            )
        }

    },
    {
        searchFlag: 1,
        title: "服务信息",
        dataIndex: "meta",
        render: (text, record) => {
            return `${record.meta.host} (${record.meta.process})`
        }
    }
])

class LogManage extends TableLayout {
    constructor() {
        super()
        this.modelName = 'ServerLog'
        this.sortBy = '-timestamp'
    }

    getTableColumns = () => {
        return _.concat([], defTableColumns)
    }

    getOptions = () => {
        return {
            edit: false,
            delete: false,
            create: false,
            import: false,
            export: true
        }
    }
}

export default LegacyForm.create()(LogManage)
