/* eslint-disable no-underscore-dangle */
/**
 * HoServer Manager Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 * author: Jack Zhang
 * */
import {Form as LegacyForm} from "@ant-design/compatible"
import {Modal, Tag} from "antd";
import _ from "lodash";
import React, {Fragment} from 'react'

import TableLayout from "@/layouts/TableLayout"
import ModelService from "@/services/model";
import {setDefaultColumn} from "@/utils/utils"

import UserService from "../service"
import PermissionForm from "./components/PermissionForm"

const defTableColumns = setDefaultColumn([
    {
        title: "权限分类",
        dataIndex: "category_name",
        ellipsis: false,
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
        searchFlag: 1,
        title: "名称(或代码)",
        dataIndex: "name",
        ellipsis: false,
        render: (value) => {
            return <Tag color={value.indexOf('manage') > -1 ? 'red' : 'blue'}>{value}</Tag>
        }
    },
    {
        searchFlag: 2,
        title: "显示名称",
        dataIndex: "dis_name",
        ellipsis: false
    },
    {
        title: "对应资源",
        dataIndex: "resource_name",
        hideInTable: true
    },
    {
        title: "资源操作",
        dataIndex: "action",
        hideInTable: true
    },
    {
        valueType: "text",
        searchFlag: 2,
        title: "描述",
        dataIndex: "description",
        ellipsis: false,
        width: 150
    }
])

class PermissionManage extends TableLayout {
    constructor() {
        super()

        this.modelName = 'Permission'
        this.permissions = null
        this.rolePermCategories = null

        defTableColumns[4].render = (text, row) => {
            if (!this.permissions) return null

            return (
                <Fragment>
                    {row.permissions && row.permissions.length > 0 ? row.permissions.map(p => {
                        const item = this.permissions.find(r => r.key === p.name)
                        return item ? (
                            <Tag key={item.key} color="blue">
                                {item.title}
                            </Tag>
                        ) : null
                    }) : '未设置'}
                </Fragment>
            )
        }
    }

    loadData = async params => {
        if (!this.permissions) {
            this.permissions = await UserService.listPermission()
        }

        if (!this.rolePermCategories) {
            this.rolePermCategories = await UserService.getRolePermCategories()
        }

        params.sort = 'category_name name'
        const result = await ModelService.getModelDataListTable(this.modelName, params)
        const data = _.get(result, 'data', [])

        let preCategory = {category_name: null}
        for (let i=0; i<data.length; i++) {
            const row = data[i]
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

    getOptions = () => {
        return {
            batch_delete: false
        }
    }

    getFormComponent = () => {
        return PermissionForm
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
            result = await UserService.createPermission(values)
        } else if (exitValues) {
            result = await UserService.updatePermission(exitValues.name, values)
        }

        if (result) {
            this.reloadData()
        }
    }

    handleRemove = async records => {
        const result = await UserService.deletePermission(records.name)
        if (result) {
            this.reloadData()
        }
    }
}

export default LegacyForm.create()(PermissionManage)
