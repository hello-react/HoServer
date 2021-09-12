/* eslint-disable no-underscore-dangle */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import { Icon } from "@ant-design/compatible";
import { Common, JsonViewModal, TableLayout } from '@hosoft/hos-admin-common'
import { ModelService } from '@hosoft/hos-admin-common'
import { prompt } from '@hosoft/hos-admin-common'
import { Modal, Tooltip } from "antd"
import _ from "lodash"
import React from 'react'

import InterfaceService from "@/services/interface";

import ModelForm from "./components/ModelForm"
import PropertiesList from "./components/PropertiesList"
import {batchDeleteModel, createModel, deleteModel, updateModel} from "./service"

const defTableColumns = Common.setDefaultColumn([
    {
        title: "对象分类",
        dataIndex: "category_disname",
        align: 'center'
    },
    {
        title: "对象名称",
        dataIndex: "name",
        searchFlag: 1,
        width: 120
    },
    {
        title: "显示名称",
        searchFlag: 1,
        dataIndex: "dis_name",
        width: 120
    },
    {
        title: '属性列表',
        dataIndex: 'properties',
        ellipsis: false,
        render: (text, record) => {
            return (
                <PropertiesList modelMeta={record} editMode={0} />
            )
        }
    },
    {
        valueType: "boolean",
        title: "时间戳字段",
        dataIndex: "timestamp",
        hideInTable: true
    },
    {
        title: "路由名称",
        dataIndex: "route_name",
        ellipsis: false,
        hideInTable: true
    },
    {
        title: "数据库表名",
        searchFlag: 1,
        ellipsis: false,
        dataIndex: "db_table",
        width: 120,
    },
    {
        title: "描述",
        dataIndex: "description",
        searchFlag: 1
    }
])

const systemModels = []

class ModelManage extends TableLayout {
    constructor() {
        super()

        this.modelName = 'Model'
        this.customMeta = {
            properties: record => {
                return <PropertiesList modelMeta={{properties: record}} editMode={0} />
            }
        }
        this.extraOperationRender = record => {
            return (
                <JsonViewModal title={`${record.dis_name} DB Schema`} data={record.schema}>
                    <Icon type="console-sql" />
                </JsonViewModal>
            )
        }

        defTableColumns[0].render = (value, row) => {
            const obj = {
                children: (
                    <span>
                        {value}{' '}
                        <Tooltip title="修改分类显示名称，也可以通过修改系统字典中的 sys_category 字典相关键值修改分类名称">
                            <Icon type="edit" onClick={() => this.handleChangeCatName(row.category_name, value)} />
                        </Tooltip>
                        <br />{row.category_name}
                    </span>
                ),
                props: {},
            }

            obj.props.rowSpan = row._span
            return obj
        }
    }

    processSchema = schema => {
        for (const key in schema) {
            const prop = schema[key]
            if (!prop) {
                continue
            }

            if (prop.unique === false)
                delete prop.unique
            if (prop.index === false)
                delete prop.index
            if (prop.searchable === false)
                delete prop.searchable
            if (prop.required === false)
                delete prop.required

            if (typeof prop === 'object') {
                if (prop instanceof Array) {
                    for (let i = 0; i < prop.length; i++) {
                        if (typeof prop[i] === 'object') {
                            this.processSchema(prop[i])
                        }
                    }
                } else {
                    this.processSchema(prop)
                }
            }
        }
    }

    loadData = async params => {
        params.sort = 'category_name name'
        params.page_size = 100
        const result = await ModelService.getModelDataListTable(this.modelName, params)
        const data = _.get(result, 'data', [])

        let preCategory = {category_names: undefined}
        for (let i=0; i<data.length; i++) {
            const row = data[i]
            this.processSchema(row.schema)

            if (systemModels.indexOf(row.name) > -1) {
                row.deletable = false
                row.editable = false
            }

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

    getOptions = () => {
        return { viewJson: false }
    }

    getTableColumns = () => {
        return _.concat([], defTableColumns)
    }

    getFormComponent = () => {
        return ModelForm
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

    handleOperate = async (action, args) => {
        if (action === 'delete') {
            Modal.confirm({
                content: `确认删除所选记录？`,
                onOk: () => {
                    this.handleRemove(args.record)
                }
            })
        }
    }

    handleSubmit = async (editMode, newModel, existModel) => {
        const removeRelFields = model => {
            if (!(model && model.properties && model.properties.length > 0)) {
                return
            }

            delete model.schema
            for (let i=0; i<model.properties.length; i++) {
                const prop = model.properties[i]
                if (prop.relations && prop.relations.rel_model) {
                    delete prop.relations.rel_model
                }

                removeRelFields(prop)
            }
        }

        removeRelFields(newModel)

        let result
        if (editMode === 1) {
            result = await createModel(newModel)
            result && Modal.success({content: '对象创建成功，请重启服务并刷新页面使新对象生效。当然你也可以全部改完后再重启。'})
        } else {
            result = await updateModel(existModel.name, newModel)
            if (result) {
                if (newModel.db_table !== existModel.db_table) {
                    Modal.success({content: '对象修改成功，请重启服务并刷新页面使新设置生效。数据表名称修改后原表不会修改，数据仍然保留，请手动处理。'})
                } else {
                    Modal.success({content: '对象修改成功，请重启服务并刷新页面使新设置生效。当然你也可以全部改完后再重启。'})
                }
            }
        }

        if (result) {
            this.reloadData()
        }
    }

    handleRemove = async records => {
        let result
        if (records instanceof Array) {
            result = await batchDeleteModel(records)
        } else {
            result = await deleteModel(records.name)
        }

        if (result) {
            Modal.success({content: '对象删除成功，请重启服务使新设置生效。相关数据库表仍保留，如需删除请手工处理'})
            this.reloadData()
        }
    }
}

export default ModelManage
