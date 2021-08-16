/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import '@ant-design/compatible/assets/index.css'
import { BadgeButton, Constants, Common, ProTable } from '@hosoft/hos-admin-common'
import { Form as LegacyForm, Icon } from "@ant-design/compatible";
import { DownOutlined, PlusOutlined } from '@ant-design/icons'
import { Badge, Button, Divider, Dropdown, Input, Menu, message, Modal, Select } from 'antd'
import _ from 'lodash'
import React, {useEffect, useRef, useState} from 'react'

import InterfaceService from '../services/sdk'

const dataTypes = InterfaceService.getDataTypes().filter(t => t.value !== 'auto' && t.value !== 'enum')
const defTableColumns = Common.setDefaultColumn([
    {
        title: '字段名称',
        dataIndex: 'name'
    },
    {
        title: '字段类型',
        dataIndex: 'type'
    },
    {
        title: '字段说明',
        dataIndex: 'description'
    }
])

const OutputFieldsList = props => {
    const {editMode, onOk, apiInstance} = props

    const actionRef = useRef(null)
    const fieldsRef = useRef([])

    useEffect(() => {
        fieldsRef.current = _.concat([], apiInstance.out_fields || [])
    }, [editMode, apiInstance])

    const loadData = () => {
        return {
            success: true,
            data: [...fieldsRef.current],
            pagination: false
        }
    }

    const tableColumns = _.concat([], defTableColumns)
    if (props.editMode) {
        tableColumns.push({
            title: '操作',
            align: 'center',
            dataIndex: 'enabled',
            valueType: 'operation',
            fixed: 'right',
            width: 100,
            render: (text, record) => (
                <>
                    <>
                        <a title="编辑" onClick={async () => {
                            await setValueEditMode(2)
                            await setSelectedRowData(record)
                            await setValueModalVisible(true)
                            props.form.setFieldsValue(record)
                        }}>
                            <Icon type="edit" />
                        </a>
                        <Divider type="vertical" />
                        <a title="删除" onClick={() => {
                            handleRemove(record)
                        }}>
                            <Icon type="delete" />
                        </a>
                    </>
                </>
            ),
        })
    }

    const handleSubmitValue = () => {
        props.form.validateFields(async (err, value) => {
            if (err) return

            const fields = fieldsRef.current
            const existRecord = fields.find(v => v.name === value.name)
            if (valueEditMode === 1) {
                if (existRecord) {
                    return message.error(`字段 ${value.name} 已存在`)
                }

                fields.push(value)
            } else {
                if (existRecord && existRecord.name !== selectedRowData.name) {
                    return message.error(`字段 ${value.name} 已存在`)
                }

                const existIndex = fields.findIndex(v => v.name === selectedRowData.name)
                if (existIndex > -1) {
                    fields[existIndex] = value
                }
            }

            console.log('OutputFieldsList handleSubmitValue: ', fields)
            setValueModalVisible(false)
            actionRef.current.reload()
        })
    }

    const handleBatchRemove = records => {
        Modal.confirm({
            content: `确认删除所选记录？`,
            onOk: () => {
                const fields = fieldsRef.current
                for (let i=0; i<records.length; i++)
                {
                    const record = records[i]
                    const existIndex = fields.findIndex(v => v.name === record.name)
                    if (existIndex > -1) {
                        fields.splice(existIndex, 1)
                    }
                }
                actionRef.current.reload()
            }
        })
    }

    const handleRemove = record => {
        Modal.confirm({
            content: `确认删除 "${record.value}"？`,
            onOk: () => {
                const fields = fieldsRef.current
                const existIndex = fields.findIndex(v => v.name === record.name)
                if (existIndex > -1) {
                    fields.splice(existIndex, 1)
                    actionRef.current.reload()
                }
            }
        })
    }

    const [visible, setVisible] = useState(false)
    const [valueModalVisible, setValueModalVisible] = useState(false)
    const [valueEditMode, setValueEditMode] = useState(1)
    const [selectedRowData, setSelectedRowData] = useState(null)
    const [windowSize, setWindowSize] = useState({width: Constants.MODEL_TABLE_WIDTH, height: 600})
    const {getFieldDecorator} = props.form

    const fields = fieldsRef.current
    return (
        <>
            <BadgeButton count={visible ? fields.length : (apiInstance.out_fields || []).length}
                editMode={editMode}
                onClick={() => setVisible(true)}
            />
            {visible ? (
                <Modal
                    key="valuesModal"
                    centered
                    visible
                    destroyOnClose
                    width={windowSize.width}
                    bodyStyle={{ padding: 0, height: windowSize.height, overflow: 'scroll', backgroundColor: '#fff' }}
                    title="输出字段列表"
                    footer={!editMode ? <Button type="primary" onClick={() => setVisible(false)}>关闭</Button> : undefined}
                    onOk={() => {
                        onOk && onOk(fieldsRef.current)
                        setVisible(false)
                    }}
                    onCancel={() => setVisible(false)}
                >
                    <ProTable
                        actionRef={actionRef}
                        rowKey="name"
                        options={{search: false}}
                        onFullScreen={() => {
                            if (windowSize.width === Constants.MODEL_TABLE_WIDTH) {
                                setWindowSize({width: window.innerWidth, height: window.innerHeight-110})
                            } else {
                                setWindowSize({width: Constants.MODEL_TABLE_WIDTH, height: 600})
                            }
                        }}
                        toolBarRender={({ selectedRows }) => {
                            if (!editMode) {
                                return []
                            }

                            const selCount = selectedRows ? selectedRows.length : 0
                            return [
                                selCount > 0 ? (
                                    <Dropdown
                                        key="batchMenu"
                                        overlay={
                                            <Menu onClick={e => {
                                                if (e.key === 'remove') {
                                                    handleBatchRemove(selectedRows)
                                                }
                                            }}
                                            >
                                                <Menu.Item key="remove">删除</Menu.Item>
                                            </Menu>
                                        }>
                                        <Button>
                                            <Badge offset={[-6, -4]} count={selCount} />
                                            <span>批量操作</span><DownOutlined />
                                        </Button>
                                    </Dropdown>
                                ) : null,
                                <Button key="new" icon={<PlusOutlined />} type="primary" onClick={async () => {
                                    await setValueEditMode(1)
                                    await setValueModalVisible(true)
                                    let maxOrder = _.reduce(fields, (max, r) => Math.max(max, r.order || 0), 0)
                                    if (!maxOrder) maxOrder = 0

                                    props.form.setFieldsValue({order: maxOrder + 5})
                                }}>
                                    新建
                                </Button>
                            ]
                        }}
                        tableAlertRender={selectedRowKeys => (
                            <div>
                                已选择 <a style={{ fontWeight: 600 }}>{selectedRowKeys.length}</a> 项
                            </div>
                        )}
                        request={args => loadData(args)}
                        columns={tableColumns}
                        rowSelection={editMode ? {} : null}
                    />
                    {valueModalVisible ? (
                        <Modal
                            key="apiInfieldsEditModal"
                            centered
                            destroyOnClose
                            width={800}
                            bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                            title={`${valueEditMode === 1 ? '新建' : '编辑'}输出字段`}
                            visible
                            footer={!valueEditMode ? <Button type="primary" onClick={() => setValueModalVisible(false)}>关闭</Button> : undefined}
                            onOk={() => handleSubmitValue()}
                            onCancel={() => setValueModalVisible(false)}
                        >
                            <LegacyForm {...Constants.DEF_FORM_ITEM_LAYOUT} layout="horizontal">
                                <LegacyForm.Item required label="字段名称">
                                    {getFieldDecorator('name', {
                                        rules: [
                                            {required: true, message: '字段名称必填'},
                                            {pattern: '^([A-Za-z0-9/\\\\_\\-]){1,}$', message: '只允许英文字母、数字、下划线和斜线'}
                                        ]
                                    })(<Input placeholder="请输入英文字母数字和下划线" />)}
                                </LegacyForm.Item>
                                <LegacyForm.Item required label="字段类型">
                                    {getFieldDecorator('type', {
                                        rules: [{required: true, message: '字段类型必填'}]
                                    })(
                                        <Select placeholder="请选择">
                                            {dataTypes.map(c => (
                                                <Select.Option key={c.value} value={c.value}>{c.text}</Select.Option>
                                            ))}
                                        </Select>
                                    )}
                                </LegacyForm.Item>
                                <LegacyForm.Item label="备注">
                                    {getFieldDecorator('description')(<Input.TextArea placeholder="请输入" />)}
                                </LegacyForm.Item>
                            </LegacyForm>
                        </Modal>
                    ) : null}
                </Modal>
            ) : null}
        </>
    )
}

export default LegacyForm.create()(OutputFieldsList)
