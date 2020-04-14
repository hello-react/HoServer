/* eslint-disable no-underscore-dangle */
/**
 * HoServer Manager Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 * author: Jack Zhang
 * */
import { Icon } from '@ant-design/compatible'
import {Popover, Tooltip} from 'antd'
import _ from 'lodash'
import React from 'react'

import TableLayout from "@/layouts/TableLayout"
import ModelService from "@/services/model"
import {setDefaultColumn} from "@/utils/utils"

import FunctionList from './components/FunctionList'

class ServiceManage extends TableLayout {
    constructor() {
        super()

        this.modelName = 'Service'
        this.subTitle = '用于检查后台服务层代码命名、接口列表设计是否合理'
        this.state.modalVisible = false
        this.state.valuesModalVisible = false
    }

    getOptions = () => {
        return {
            edit: false,
            delete: false,
            create: false,
            import: false,
            export: false,
            search: false,
            rowSelection: null
        }
    }

    loadData = async params => {
        const result = await ModelService.getModelDataListTable(this.modelName, params)
        const data = _.get(result, 'data', [])

        let preCategory = {category_names: null}
        for (let i=0; i<data.length; i++) {
            const row = data[i]
            if (row.category_name === preCategory.category_name) {
                preCategory._span = preCategory._span ? preCategory._span + 1 : 2
                row._span = 0
            } else {
                preCategory = row
                row._span = 1
            }
        }

        return result
    }

    getTableColumns = () => {
        return setDefaultColumn([
            {
                title: '分类',
                dataIndex: 'category_name',
                align: 'center',
                width: 100,
                render: (value, row) => {
                    const obj = {
                        children: (
                            <Tooltip title={value}>
                                {row.category_disname || value}
                            </Tooltip>
                        ),
                        props: {},
                    }

                    obj.props.rowSpan = row._span
                    return obj
                }
            },
            {
                title: '服务名称',
                dataIndex: 'name',
                sorter: true,
                width: 150,
                render: (text, row) => (
                    <Popover placement="right" content={row.file} title="服务对应文件">
                        {text} <Icon type="question-circle" />
                    </Popover>
                )
            },
            {
                title: '接口列表',
                dataIndex: 'functions',
                render: (text, row) => (
                    <FunctionList title={`${row.name} 函数列表`} data={row.functions} />
                )
            }
        ])
    }

    onCancel = () => {
        this.setState({modalVisible: false})
    }
}

export default ServiceManage
