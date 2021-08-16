/* eslint-disable no-underscore-dangle */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import {Form as LegacyForm} from "@ant-design/compatible"
import { Common, TableLayout } from "@hosoft/hos-admin-common"
import { ModelService } from '@hosoft/hos-admin-common'
import {Modal, Tag} from "antd";
import _ from "lodash";
import React, {Fragment} from 'react'

import UserService from "../service"
import RoleForm from "./components/RoleForm"

const defTableColumns = Common.setDefaultColumn([
    {
        searchFlag: 1,
        title: "角色分类",
        align: 'center',
        dataIndex: "category_name",
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
        title: "角色名称",
        dataIndex: "name"
    },
    {
        searchFlag: 2,
        title: "显示名称",
        dataIndex: "dis_name"
    },
    {
        title: "角色权限",
        dataIndex: "permissions",
        ellipsis: false,
        width: 300
    }
])

class RoleManage extends TableLayout {
    constructor() {
        super()

        this.modelName = 'Role'
        this.permissions = null
        this.rolePermCategories = null

        defTableColumns[3].render = (text, row) => {
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

        let preCategory = {category_name: undefined}
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
        return RoleForm
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
            result = await UserService.createRole(values)
        } else if (exitValues) {
            result = await UserService.updateRole(exitValues.name, values)
        }

        if (result) {
            this.reloadData()
        }
    }

    handleRemove = async records => {
        const result = await UserService.deleteRole(records.name)
        if (result) {
            this.reloadData()
        }
    }
}

export default LegacyForm.create()(RoleManage)
