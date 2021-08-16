/* eslint-disable no-underscore-dangle */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import { Form as LegacyForm } from "@ant-design/compatible"
import { Common, TableLayout } from '@hosoft/hos-admin-common'
import { ModelService } from '@hosoft/hos-admin-common'
import { Modal } from "antd";
import _ from "lodash"
import React from 'react'

import DictForm from "./components/DictForm"
import ValuesList from './components/ValuesList'
import {batchDeleteDictionary, createDictionary, deleteDictionary, updateDictionary} from "./service"

const defTableColumns = Common.setDefaultColumn([
    {
        title: '分类',
        dataIndex: 'category_name',
        ellipse: false,
        align: 'center',
        render: (value, row) => {
            const obj = {
                children: value || '默认分类',
                props: {},
            }

            obj.props.rowSpan = row._span
            return obj
        }
    },
    {
        title: '字典名称',
        dataIndex: 'name',
        searchFlag: 2
    },
    {
        title: '显示名称',
        dataIndex: 'dis_name',
        searchFlag: 2
    },
    {
        title: '备注',
        dataIndex: 'description',
        searchFlag: 2
    },
    {
        title: '取值列表',
        dataIndex: 'values',
        ellipsis: false,
        width: 120,
        render: (text, record) => {
            return (
                <ValuesList editMode={0} dictInstance={record}/>
            )
        }
    }
])

const systemDicts = ['area_province', 'content_category', 'sys_category']

class DictionaryManage extends TableLayout {
    constructor() {
        super()

        this.modelName = 'Dictionary'
    }

    loadData = async params => {
        params.sort = 'category_name name'
        const result = await ModelService.getModelDataListTable(this.modelName, params)
        const data = _.get(result, 'data', [])

        let preCategory = {category_name: undefined}
        for (let i=0; i<data.length; i++) {
            const row = data[i]
            if (systemDicts.indexOf(row.name) > -1) {
                row.deletable = false
            }

            if (row.category_name === preCategory.category_name) {
                preCategory._span = preCategory._span ? preCategory._span + 1 : 2
                row._span = 0
            } else {
                row._span = 1
                preCategory = row
            }
        }

        return result
    }

    getTableColumns = () => {
        return _.concat([], defTableColumns)
    }

    getFormComponent = () => {
        return DictForm
    }

    handleOperate = (action, args) => {
        if (action === 'delete') {
            Modal.confirm({
                content: `确认删除所选字典？`,
                onOk: () => {
                    this.handleRemove(args.record)
                }
            })
        }
    }

    handleSubmit = async (editMode, values, exitValues) => {
        let result
        if (editMode === 1) {
            result = await createDictionary(values)
        } else if (exitValues) {
            result = await updateDictionary(exitValues.name, values)
        }

        if (result) {
            this.reloadData()
        }
    }

    handleRemove = async records => {
        let result
        if (records instanceof Array) {
            result = await batchDeleteDictionary(records)
        } else {
            result = await deleteDictionary(records.name)
        }

        if (result) {
            this.reloadData()
        }
    }
}

export default LegacyForm.create()(DictionaryManage)
