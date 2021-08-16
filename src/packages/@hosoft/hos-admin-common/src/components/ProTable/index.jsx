/* eslint-disable prefer-destructuring */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import './index.less'

import { Icon } from '@ant-design/compatible'
import { Col, Divider, Dropdown, Menu, Row, Spin, Table, Tooltip } from 'antd'
import _ from 'lodash'
import React, { useEffect, useImperativeHandle, useState } from 'react'

import Constants from "../../common/constants"

import ColumnSetting from "./ColumnSetting"
import SearchButtons from './SearchButtons'

/**
 * Ant design pro-table have performance and other issues,
 * implement a simple one according our function requirements.
 */
const ProTable = props => {
    const {
        actionRef, request, /* columns, options */ rowKey, toolBarRender, rowSelection, onFullScreen,
        headerTitle, subTitle, delayRender
    } = props

    const [columns, setColumns] = useState(props.columns)
    const [loading, setLoading] = useState(false)
    const [dataSource, setDataSource] = useState(null)
    const [params, setParams] = useState({})
    const [pagination, setPagination] = useState(null)
    const [selRowKeys, setSelRowKeys] = useState([])
    const [size, setSize] = useState('middle')
    const [toolBarButtons, setToolBarButtons] = useState(toolBarRender ? toolBarRender({}) : [])

    const searchColumns = columns.filter(c => c.searchFlag > 0)
    const tableColumns = columns.filter(c => !c.hideInTable)

    useImperativeHandle(actionRef, () => ({
        reload: () => {
            loadData(params)
        }
    }))

    const loadData = async args => {
        console.log('ProTable loadData:', args)

        setLoading(true)

        const rep = await request(args)
        if (!rep.success) {
            setDataSource([])
            setPagination({ total: 0})
        } else {
            setPagination(rep.pagination)
            setDataSource(rep.data)
        }

        setLoading(false)
        setTimeout(() => {
            setSelRowKeys([])
            onSelectionChange && onSelectionChange('', [])
        }, 500)
    }

    const handleSearch = (fields) => {
        const newParams = {...params}

        for (const key in fields) {
            const value = fields[key]
            const newKey = (key.indexOf(',') > -1) ? key.replace(',', '.') : key
            if (value) {
                newParams[newKey] = value
            } else {
                delete newParams[newKey]
            }
        }

        for (let i=0; i<searchColumns.length; i++) {
            const column = searchColumns[i]
            if (column.searchFlag === 2 && newParams[column.dataIndex]
                && typeof(newParams[column.dataIndex]) === 'string' && newParams[column.dataIndex].indexOf('*') < 0) {
                newParams[column.dataIndex] = `*${newParams[column.dataIndex]}*`
            }
        }

        setParams(newParams)
    }

    const onSelectionChange = (selectedRowKeys, selectedRows) => {
        console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
        if (!(selectedRowKeys && selectedRowKeys instanceof Array)) {
            selectedRowKeys = []
        }
        setSelRowKeys(selectedRowKeys)
        if (toolBarRender) {
            const buttons = toolBarRender({selectedRowKeys, selectedRows: selectedRows.filter(r => r !== undefined)})
            setToolBarButtons(buttons)
        }
    }

    const onParamsChange = (paging, filters, sorter) => {
        const newParams = {
            ...params,
            ...(filters || {}),
            page: _.get(paging, 'current', 1),
            page_size: _.get(paging, 'pageSize', Constants.DEF_PAGE_SIZE),
            sort: sorter && sorter.field ? (sorter.order === 'ascend' ? sorter.field : `-${sorter.field}`) : undefined
        }

        setParams(newParams)
    }

    const densityMenu = (
        <Menu style={{width: 80}} onClick={menuItem => {
            setSize(menuItem.key)
        }}>
            <Menu.Item key="default">较大</Menu.Item>
            <Menu.Item key="middle">默认</Menu.Item>
            <Menu.Item key="small">紧凑</Menu.Item>
        </Menu>
    )

    useEffect(() => {
        loadData(params)
    }, [params])

    const options = props.options || {}
    const hasToolbar = toolBarButtons.length > 0
        || options.density !== false
        || (options.fullscreen !== false && onFullScreen)
        || options.reload !== false
        || options.setting !== false

    // console.log('ProTable ====> rendered')

    return (
        <div className="ho_pro_table">
            {options.search !== false ? (
                <SearchButtons columns={searchColumns} onSearch={handleSearch}/>
            ) : null}
            {hasToolbar ? (
                <Row>
                    <Col span={8}>
                        <span className="ho_tbl_header">{headerTitle}</span>
                        {subTitle ? (
                            <span className="ho_tbl_header_sub"><br />{subTitle}</span>
                        ) : null}
                    </Col>
                    <Col span={16} className="ho_tbl_toolbar">
                        {options.density !== false ? (
                            <Dropdown trigger={['click']} overlay={densityMenu}>
                                <Tooltip title="密度" mouseEnterDelay={0.8}><Icon type="column-height" className="iconbtn" /></Tooltip>
                            </Dropdown>
                        ): null}
                        {options.fullscreen !== false && onFullScreen ? (
                            <Tooltip title="全屏" mouseEnterDelay={0.8}><Icon onClick={onFullScreen} type="fullscreen" className="iconbtn" /></Tooltip>
                        ): null}
                        {options.reload !== false ? (
                            <Tooltip title="刷新" mouseEnterDelay={0.8}><Icon onClick={() => actionRef.current.reload()} type="reload" className="iconbtn" /></Tooltip>
                        ): null}
                        {options.setting !== false ? (
                            <ColumnSetting onColumnChange={newColumns => setColumns(_.concat([], newColumns || columns))} tableColumns={columns} />
                        ) : null}
                        <Divider type="vertical" />
                        {toolBarButtons}
                    </Col>
                </Row>
            ) : null}

            {(!delayRender || dataSource) ? <Table
                bordered
                size={size}
                rowKey={rowKey}
                loading={loading}
                columns={tableColumns}
                pagination={pagination}
                expandable={{defaultExpandAllRows: true, rowExpandable: true}}
                dataSource={dataSource}
                rowSelection={rowSelection ? {
                    ...rowSelection,
                    onChange: onSelectionChange,
                    selectedRowKeys: selRowKeys
                } : null}
                onChange={onParamsChange}
            /> : <Spin style={{width: '100%', height: '100%', paddingTop: 100, paddingBottom: 100}} tip="加载中..." />}
        </div>
    )
}

export default ProTable
