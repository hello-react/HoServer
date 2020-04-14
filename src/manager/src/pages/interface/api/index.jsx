/* eslint-disable no-underscore-dangle */
/**
 * HoServer Manager Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 * author: Jack Zhang
 * */
import './index.less'

import {Icon} from "@ant-design/compatible"
import {Dropdown, Menu, Modal, Popover, Tag, Tooltip} from "antd"
import _ from "lodash"
import React from 'react'

import TableLayout from "@/layouts/TableLayout"
import InterfaceService from "@/services/interface";
import ModelService from "@/services/model"
import prompt from "@/third/antd-prompt";
import {setDefaultColumn} from "@/utils/utils"

import ApiService from "./service"

const tagColor = {
    GET: 'blue',
    POST: 'orange',
    DELETE: 'red'
}

const getMethodType = () => {
    return [
        {text: 'GET', value: 'GET'},
        {text: 'POST', value: 'POST'},
        {text: 'DELETE', value: 'DELETE'}
    ]
}

const getRowStyle = row => {
    if (row.disabled) {
        return 'ho_disable_api'
    }

    if (row.mock_result) {
        return 'ho_mock_api'
    }

    return ''
}

const defTableColumns = setDefaultColumn([
    {
        title: "接口分类",
        dataIndex: "main_category_disname",
        align: 'center',
        ellipsis: false
    },
    {
        title: "子分类",
        dataIndex: "second_category_disname",
        align: 'center',
        ellipsis: false
    },
    {
        searchFlag: 1,
        title: "名称",
        dataIndex: "dis_name",
        ellipsis: true,
        width: 150
    },
    {
        title: "方法",
        dataIndex: "method",
        ellipsis: true,
        align: "center",
        width: 100,
        filters: getMethodType(),
        render: (text, row) => (
            <Tag color={tagColor[row.method]} style={{width: 60}}>{text}</Tag>
        )
    },
    {
        valueType: "text",
        searchFlag: 1,
        title: "路由",
        dataIndex: "path",
        ellipsis: false,
        width: 250,
        render: (text, row) => (
            <span className={`ho_api_path ${getRowStyle(row)}`}>
                {row.path} {row.mock_result ? <Popover content={row.mock_result}><Tag color="blue">MOCK</Tag></Popover> : null}
            </span>
        )
    },
    {
        title: "关联对象",
        dataIndex: "model",
        hideInTable: true
    },
    {
        title: "表单数据类型",
        dataIndex: "form_data_type",
        align: "center",
        hideInTable: true
    },
    {
        valueType: "text",
        searchFlag: 1,
        title: "描述",
        dataIndex: "description"
    },
    {
        valueType: "number",
        title: "顺序",
        dataIndex: "order",
        sorter: false
    },
    // {
    //     valueType: "boolean",
    //     title: "已修改?",
    //     dataIndex: "modified"
    // },
    {
        valueType: "boolean",
        title: "禁用?",
        dataIndex: "disabled",
        ellipsis: true,
        align: "center",
        hideInTable: true
    }
])

class ApiManage extends TableLayout {
    constructor() {
        super()

        this.modelName = 'Api'
        this.subTitle = '请注意 express 框架路由是有先后顺序的，顺序靠前的路由优先匹配'
        this.extraOperationRender = record => (
            <Tooltip mouseEnterDelay={0.8} title="更多操作">
                <Dropdown overlay={
                    <Menu onClick={e => {
                        this.handleOperate(e.key, {record})
                    }}>
                        <Menu.Item key="disable">禁用此接口</Menu.Item>
                        <Menu.Item key="enable">启用此接口</Menu.Item>
                        <Menu.Divider />
                        <Menu.Item key="force_result">Mock返回数据</Menu.Item>
                    </Menu>
                }>
                    <Icon type="ellipsis" style={{cursor: 'pointer'}} />
                </Dropdown>
            </Tooltip>
        )

        defTableColumns[0].render = (value, row) => {
            const obj = {
                children: (
                    <span>
                        {value}{' '}
                        {row.main_category ? (
                            <Tooltip title="修改分类显示名称，也可以通过修改系统字典中的 sys_category 字典相关键值修改分类名称">
                                <Icon type="edit" onClick={() => this.handleChangeCatName(row.main_category, value)} />
                            </Tooltip>
                        ) : null}
                        <br /> {row.main_category}
                    </span>
                ),
                props: {},
            }

            obj.props.rowSpan = row._main_span
            return obj
        }

        defTableColumns[1].render = (value, row) => {
            const obj = {
                children: (
                    <span>
                        {value || '默认分类'}{' '}
                        {row.second_category ? (
                            <Tooltip title="修改分类显示名称，也可以通过修改系统字典中的 sys_category 字典相关键值修改分类名称">
                                <Icon type="edit" onClick={() => this.handleChangeCatName(row.second_category, value)} />
                            </Tooltip>
                        ) : null}
                        <br /> {row.second_category}
                    </span>
                ),
                props: {},
            }

            obj.props.rowSpan = row._second_span
            return obj
        }

        defTableColumns[2].render = (text, row) => {
            return <span className={getRowStyle(row)}>
                {text} {row.permissions && row.permissions.length === 0 ? <Tooltip title="该接口开放调用，用户无需登录即可访问"><Tag color="green">P</Tag></Tooltip> : null}
            </span>
        }
    }

    loadData = async params => {
        params.page_size = 30
        const result = await ModelService.getModelDataListTable(this.modelName, params)
        const data = _.get(result, 'data', [])

        let preMain = {}
        let preSecond = {}
        for (let i=0; i<data.length; i++) {
            const row = data[i]
            const mainCat = row.main_category
            const secondCat = row.second_category

            if (mainCat === preMain.main_category && secondCat === preSecond.second_category) {
                preMain._main_span = preMain._main_span ? preMain._main_span + 1 : 2
                preSecond._second_span = preSecond._second_span ? preSecond._second_span + 1 : 2
                row._main_span = 0
                row._second_span = 0
            } else if (mainCat === preMain.main_category) {
                preMain._main_span = preMain._main_span ? preMain._main_span + 1 : 2
                preSecond = row
                row._main_span = 0
                row._second_span = 1
            } else {
                preMain = row
                preSecond = row
                row._main_span = 1
                row._second_span = 1
            }
        }

        return result
    }

    getOptions = () => {
        return {
            rowSelection: null,
            import: false,
            export: false,
            delete: false,
            viewJson: true
        }
    }

    getTableColumns = () => {
        return _.concat([], defTableColumns)
    }

    handleOperate = (action, args) => {
        if (action === 'force_result') {
            this.forceMockResult(args.record)
        } else if (action === 'disable') {
            Modal.confirm({
                content: `确认禁用所选接口？`,
                onOk: () => {
                    this.enableApi(false, args.record)
                }
            })
        } else if (action === 'enable') {
            Modal.confirm({
                content: `确认启用所选接口？`,
                onOk: () => {
                    this.enableApi(true, args.record)
                }
            })
        }
    }

    handleChangeCatName = async (category, initialValue) => {
        const categoryName = await prompt({
            title: "修改分类显示名称",
            label: '显示名称',
            initialValue,
            inputProps: {placeholder: "请输入分类显示名称"},
            rules: [
                {
                    required: true,
                    message: "分类显示名称不能为空"
                }
            ]
        })

        if (categoryName) {
            const result = await InterfaceService.setCategoryDisName(category, categoryName)
            if (result) {
                this.reloadData()
            }
        }
    }

    forceMockResult = async record => {
        const mockResult = await prompt({
            title: "请输入返回结果",
            initialValue: record.mock_result || '',
            multiline: true,
            modalProps: {width: 800, height: 600},
            inputProps: {rows: 10}
        })

        if (await ApiService.forceMockResult(record.id, mockResult)) {
            this.reloadData()
        }
    }

    enableApi = async (enable, record) => {
        if (await ApiService.enableApi(record.id, enable)) {
            this.reloadData()
        }
    }
}

export default ApiManage
