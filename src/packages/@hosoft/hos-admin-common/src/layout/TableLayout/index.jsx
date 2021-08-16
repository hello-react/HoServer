/* eslint-disable react/no-unused-state */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import '@ant-design/compatible/assets/index.css'
import './index.less'

import { Icon } from "@ant-design/compatible";
import { DownOutlined, PlusOutlined } from '@ant-design/icons'
import { PageHeaderWrapper } from '@ant-design/pro-layout'
import { Badge, Button, Divider, Dropdown, Menu, message } from 'antd'
import _ from 'lodash'
import * as Common from '../../common/common'
import JsonViewModal from '../../components/JsonViewModal'
import ProTable from '../../components/ProTable'
import React, { Component } from 'react'

import ModelService from '../../services/model'

class TableLayout extends Component {
    constructor() {
        super()

        _.bindAll(this, ['handleBatchMenuClick', 'columnRender', 'toolbarRender', 'tableAlertRender'])

        this.actionRef = React.createRef()
        this.modelName = ''
        this.subTitle = ''

        this.state = {
            options: {},
            formComp: null,
            modelMeta: null,
            tableColumns: null
        }
    }

    async componentDidMount() {
        if (!this.modelName) {
            return console.error('modelName not set!')
        }

        const modelMeta = await ModelService.getModelMeta(this.modelName)
        if (!modelMeta) return

        const tableColumns = this.getTableColumns()
        const options = this.getOptions() || {}
        if (!(options.edit === false && options.delete === false && options.viewJson === false) || this.extraOperationRender) {
            const lastField = modelMeta.properties[modelMeta.properties.length-1].name
            tableColumns.push({
                title: '操作',
                align: 'center',
                dataIndex: lastField,
                valueType: 'operation',
                fixed: 'right',
                width: 100,
                ellipsis: false,
                render: this.columnRender,
            })
        }

        this.setState({options, modelMeta, tableColumns})
    }

    loadData = params => {
        if (this.sortBy) {
            params.sort = this.sortBy
        }

        return ModelService.getModelDataListTable(this.modelName, params)
    }

    reloadData = () => {
        this.actionRef.current.reload()
    }

    getModelMeta = () => {
        return this.state.modelMeta
    }

    // 获取表格列及相关参数，派生类实现
    getTableColumns = () => {
        throw new Error('getTableColumns not implement')
    }

    // 以下 4 个函数由派生类实现
    getOptions = () => { }

    getFormComponent = () => { }

    handleOperate = () => { }

    handleSubmit = () => { }

    handleBatchMenuClick(e, selectedRows) {
        if (selectedRows.length === 0) {
            return message.info('请先选择记录')
        }

        this.handleOperate(e.key, {record: selectedRows})
    }

    columnRender(text, record) {
        const { options, modelMeta } = this.state
        const FormComp = this.getFormComponent()

        return (
            <>
                {options.viewJson !== false ? (
                    <>
                        <JsonViewModal title={`${modelMeta.dis_name} JSON`} data={record} />
                        {options.edit !== false || options.delete !== false || this.extraOperationRender ? <Divider type="vertical" /> : null}
                    </>
                ) : null}
                {FormComp && options.edit !== false ? (
                    <FormComp editMode={2} modelMeta={modelMeta} modelInstance={record} onOk={this.handleSubmit}>
                        <a title="编辑" disabled={record.editable === false}>
                            <Icon type="edit" />
                            {options.delete !== false || this.extraOperationRender ? <Divider type="vertical" /> : null}
                        </a>
                    </FormComp>
                ) : null}
                {options.delete !== false ? (
                    <a title="删除" disabled={record.editable === false || record.deletable === false} onClick={() => this.handleOperate('delete', {record})}>
                        <Icon type="delete" />
                        {this.extraOperationRender ? <Divider type="vertical" /> : null}
                    </a>
                ) : null}
                {this.extraOperationRender ? this.extraOperationRender(record) : null}
            </>
        )
    }

    toolbarRender({ selectedRows }) {
        const { options, modelMeta } = this.state
        if (!modelMeta) {
            return null
        }

        const FormComp = this.getFormComponent()
        const canBatchDelete = options.delete !== false && options.batch_delete !== false

        if (options.toolBarRender) {
            return options.toolBarRender(selectedRows)
        }

        const count = selectedRows ? selectedRows.length : 0
        const toolbarButtons = [
            (options.batchOperations || canBatchDelete) && count > 0 ? (
                <Dropdown
                    key="batchMenu"
                    overlay={
                        <Menu onClick={e => this.handleBatchMenuClick(e, selectedRows)}>
                            {canBatchDelete ? <Menu.Item key="delete">删除</Menu.Item> : null}
                            {options.batchOperations ? (options.batchOperations instanceof Array ?
                                options.batchOperations.map(operation => (operation)) : options.batchOperations)
                                : null
                            }
                        </Menu>
                    }
                >
                    <Button>
                        <Badge offset={[-6, -4]} count={count} />
                        <span>批量操作</span>
                        <DownOutlined />
                    </Button>
                </Dropdown>
            ) : null,
            options.create !== false && FormComp ? (
                <FormComp key="create" editMode={1} modelMeta={modelMeta} modelInstance={{}} onOk={this.handleSubmit}>
                    <Button icon={<PlusOutlined />} type="primary">新建</Button>
                </FormComp>
            ) : null
        ]

        Common.pluginManager().onRenderHook('ProTableToolbar', this, selectedRows, options, toolbarButtons)
        return toolbarButtons
    }

    tableAlertRender(selectedRowKeys) {
        return (
            <div>已选择 <a style={{ fontWeight: 600 }}>{selectedRowKeys.length}</a> 项</div>
        )
    }

    render() {
        // console.log('TableLayout ====> rendered')

        const {options, modelMeta, tableColumns} = this.state
        if (!(tableColumns && modelMeta)) {
            return null
        }

        return (
            <PageHeaderWrapper>
                <ProTable
                    headerTitle={`${modelMeta.dis_name}列表`}
                    subTitle={this.subTitle}
                    delayRender={!!this.delayRender}
                    actionRef={this.actionRef}
                    rowKey={modelMeta.row_key}
                    options={options}
                    toolBarRender={this.toolbarRender}
                    tableAlertRender={this.tableAlertRender}
                    request={params => this.loadData(params)}
                    columns={tableColumns}
                    rowSelection={options.rowSelection !== undefined ? options.rowSelection : {}}
                />
                {/* render extra content */}
                {this.renderExtra ? this.renderExtra() : null}
            </PageHeaderWrapper>
        )
    }
}

export default TableLayout
