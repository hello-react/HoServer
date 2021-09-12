/* eslint-disable eqeqeq */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import '@ant-design/compatible/assets/index.css'

import { Form as LegacyForm, Icon } from "@ant-design/compatible"
import { DownOutlined, PlusOutlined } from '@ant-design/icons'
import { BadgeButton, Common, Constants, JsonViewModal, ProTable } from '@hosoft/hos-admin-common'
import { Badge, Button, Divider, Dropdown, Menu, message, Modal } from 'antd'
import _ from 'lodash'
import React, {useEffect, useRef, useState} from 'react'

import PropertyForm from "./PropertyForm"

const {API_FIELD_TYPE} = Constants

const getInputFlag = () => {
    return [
        {text: '禁止输入', value: 0},
        {text: '可选输入', value: 1},
        {text: '必须输入', value: 2},
        {text: '强制使用默认值', value: 3}
    ]
}

const getSearchFlag = () => {
    return [
        {text: '禁止查询', value: 0},
        {text: '精确匹配', value: 1},
        {text: '模糊搜索', value: 2},
        {text: '强制使用默认值', value: 3}
    ]
}

const getOutputFlag = () => {
    return [
        {text: '禁止输出', value: 0},
        {text: '默认输出', value: 1},
        {text: '默认不输出', value: 2},
        {text: '根据子属性输出选项自动设置', value: 3}
    ]
}

const defTableColumns = Common.setDefaultColumn([
    {
        title: "属性名称",
        dataIndex: "name",
        sorter: true,
        searchFlag: 1
    },
    {
        title: "显示名称",
        dataIndex: "dis_name",
        searchFlag: 1
    },
    {
        title: "自动增长",
        dataIndex: "auto_increment",
        valueType: 'boolean',
        hideInTable: true
    },
    {
        title: "数据类型",
        ellipsis: false,
        dataIndex: "prop_type",
        align: 'center',
        render: (text, record) => {
            if (record.auto_increment) {
                return 'number (自动增长)'
            }

            const relType = _.get(record, ['relations', 'rel_type'])
            if (relType === 2 || relType === 3) {
                return 'enum (字典)'
            }

            return text
        }
    },
    {
        title: "长度",
        dataIndex: "width",
        valueType: 'number',
        width: 75
    },
    {
        title: "是否唯一",
        dataIndex: "unique",
        valueType: 'boolean',
        hideInTable: true
    },
    {
        title: "必填",
        dataIndex: "require",
        valueType: 'boolean'
    },
    {
        title: "索引类型",
        dataIndex: "index",
        filters: [
            {text: '无索引', value: false},
            {text: '默认索引', value: true},
            {text: '哈希索引', value: 'hashed'},
            {text: '全文索引', value: 'text'}
        ]
    },
    {
        title: "默认值",
        hideInTable: true,
        dataIndex: "default_val"
    },
    {
        title: "子属性列表",
        dataIndex: "properties"
    },
    {
        title: "输入选项",
        dataIndex: "input_flag",
        filters: getInputFlag()
    },
    {
        title: "查询选项",
        dataIndex: "search_flag",
        filters: getSearchFlag()
    },
    {
        title: "输出选项",
        dataIndex: "output_flag",
        filters: getOutputFlag()
    },
    {
        title: "关联对象",
        dataIndex: "relations",
        align: 'center',
        render: (text, record) => {
            const relations = record.relations || {}
            if (relations.rel_type == 1) {
                return `${relations.name} [${relations.field}]`
            }

            if (relations.rel_type == 2) {
                let jsonObj = {}
                try {
                    jsonObj = JSON.parse(relations.name)
                    return <JsonViewModal title="关联字典" data={jsonObj}>查看字典</JsonViewModal>
                } catch (e) {
                    return null
                }
            }

            if (relations.rel_type == 3) {
                return `字典 [${relations.name}]`
            }
        }
    },
    {
        title: "排序",
        dataIndex: "order",
        valueType: 'number',
        sorter: true
    },
    {
        title: "属性描述",
        dataIndex: "description",
        width: 120
    }
])

const PropertiesList = props => {
    const {editMode, modelMeta, /* modelInstance */ onOk} = props

    const [level] = useState(props.level || 0)
    const [visible, setVisible] = useState(false)
    const [windowSize, setWindowSize] = useState({width: Constants.MODEL_TABLE_WIDTH * 1.2, height: 600})

    const actionRef = useRef(null)
    const thisRef = useRef({properties: null})

    useEffect(() => {
        if (visible) {
            const propList = modelMeta instanceof Array ? modelMeta : modelMeta.properties || []
            thisRef.current.properties = _.concat([], propList || [])
        }
    }, [visible, modelMeta])

    const loadData = params => {
        return new Promise(resolve => {
            setTimeout(() => {
                let data
                const isDesc = params.sort && params.sort.indexOf('-') === 0
                if (isDesc) {
                    params.sort = params.sort.substr(1)
                    data = _.orderBy(thisRef.current.properties, params.sort || 'order', ['desc'])
                } else {
                    data = _.orderBy(thisRef.current.properties, params.sort || 'order')
                }

                // if (params && params.enabled) {
                //     data = data.filter(row => {
                //         const enabled = row.enabled === 0 ? '0' : '1'
                //         return params.enabled.indexOf(enabled) > -1
                //     })
                // }

                resolve({
                    success: true,
                    data,
                    pagination: false
                })
            }, 500)
        })
    }

    const tableColumns = _.concat([], defTableColumns)
    tableColumns[9].render = (text, record) => {
        return (record.properties || []).length > 0 ? (
            <PropertiesList level={level+1} modelMeta={record} editMode={editMode} onOk={values => {
                record.properties = values
            }} />
        ) : null
    }

    tableColumns.push({
        title: '操作',
        dataIndex: 'enabled',
        valueType: 'operation',
        fixed: 'right',
        align: 'center',
        width: 100,
        render: (text, record) => {
            return props.editMode ? (
                <>
                    <a title="克隆属性" onClick={() => {
                        handleClone(record)
                    }}>
                        <Icon type="copy" />
                    </a>
                    <Divider type="vertical" />
                    <PropertyForm level={level} editMode={2} propMeta={record} onOk={(newProp, existProp) => {
                        const existIndex = thisRef.current.properties.findIndex(p => p.name === existProp.name)
                        if (existIndex < 0) {
                            return message.info(`${existProp.name} 不存在`)
                        }

                        thisRef.current.properties[existIndex] = newProp
                        actionRef.current.reload()
                    }}>
                        <a title="编辑">
                            <Icon type="edit" />
                            <Divider type="vertical" />
                        </a>
                    </PropertyForm>
                    <a title="删除" onClick={() => {
                        handleRemove(record)
                    }}>
                        <Icon type="delete" />
                    </a>
                </>
            ) : (
                <JsonViewModal title={`${modelMeta.dis_name} JSON`} data={record} />
            )
        },
    })

    const handleSubmit = () => {
        const data = (thisRef.current.properties && thisRef.current.properties.length > 0) ? _.sortBy(thisRef.current.properties, 'order') : null
        if (!(data && data.length > 0)) {
            return message.warn('请先添加属性!')
        }

        console.log('PropertiesList handleSubmit: ', data)
        onOk && onOk(data)
        setVisible(false)
    }

    const handleClone = record => {
        const properties = _.get(thisRef.current, 'properties', [])
        const existIndex = properties.findIndex(v => v.name === record.name)
        if (existIndex > -1) {
            const cloneProp = _.cloneDeep(record)
            cloneProp.name = `${record.name }_copy`
            cloneProp.dis_name = `${record.dis_name } copy`
            if (record.order) {
                cloneProp.order = record.order + 1
            }
            properties.splice(existIndex, 0, cloneProp)
            actionRef.current.reload()
        }
    }

    const handleBatchRemove = records => {
        Modal.confirm({
            content: `确认删除所选记录？`,
            onOk: () => {
                const properties = _.get(thisRef.current, 'properties', [])
                for (let i=0; i<records.length; i++)
                {
                    const record = records[i]
                    const existIndex = properties.findIndex(v => v.name === record.name)
                    if (existIndex > -1) {
                        properties.splice(existIndex, 1)
                    }
                }
                actionRef.current.reload()
            }
        })
    }

    const handleBatchModify = (records, field, value) => {
        const setPropertyValues = () => {
            let count = 0
            const curProperties = thisRef.current.properties
            for (const record of records) {
                const existIndex = curProperties.findIndex(v => v.name === record.name)
                if (existIndex > -1) {
                    if (field === 'index' && (value === 'hashed' || value === 'text') && record.prop_type !== 'char') {
                        message.warn('哈希/全文索引只能用于 MongoDb 字符类型数据')
                        continue
                    }

                    const newRecord = {...curProperties[existIndex]}
                    newRecord[field] = value
                    curProperties[existIndex] = newRecord
                    count++

                    // console.log(`handleBatchModify, ${record.name} => ${value}`)
                }
            }

            actionRef.current.reload()
            if (count > 0) {
                message.info('设置完毕')
            }
        }

        records.length > 10 ?
            Modal.confirm({
                content: `确认批量设置 ${records.length} 个属性？`,
                onOk: () => {
                    setPropertyValues()
                }
            }) :
            setPropertyValues()
    }

    const handleRemove = record => {
        Modal.confirm({
            content: `确认删除 "${record.dis_name}"？`,
            onOk: () => {
                const properties = _.get(thisRef.current, 'properties', [])
                const existIndex = properties.findIndex(v => v.name === record.name)
                if (existIndex > -1) {
                    properties.splice(existIndex, 1)
                    actionRef.current.reload()
                }
            }
        })
    }

    // console.log(`PropertiesList ====> rendered (${level}): ${modelMeta.dis_name}`)
    const count = visible && thisRef.current.properties ? thisRef.current.properties.length : _.get(modelMeta, 'properties', []).length
    return (
        <>
            <BadgeButton count={count}
                editMode={editMode}
                onClick={() => setVisible(true)}
            />
            {visible ? (
                <Modal
                    key="propertiesModal"
                    centered
                    visible
                    destroyOnClose
                    width={windowSize.width}
                    bodyStyle={{ padding: 0, height: windowSize.height, overflow: 'scroll', backgroundColor: '#fff' }}
                    title="对象属性列表"
                    footer={!editMode ? <Button type="primary" onClick={() => setVisible(false)}>关闭</Button> : undefined}
                    onOk={() => handleSubmit()}
                    onCancel={() => setVisible(false)}
                >
                    <ProTable
                        actionRef={actionRef}
                        rowKey={r => r.name}
                        options={{search: false}}
                        onFullScreen={() => {
                            if (windowSize.width === window.innerWidth) {
                                setWindowSize({width: Constants.MODEL_TABLE_WIDTH * 1.2, height: 600})
                            } else {
                                setWindowSize({width: window.innerWidth, height: window.innerHeight-110})
                            }
                        }}
                        toolBarRender={({ selectedRows }) => {
                            if (!editMode) return []
                            const rowCount = selectedRows ? selectedRows.length : 0
                            return [
                                rowCount > 0 ? (
                                    <Dropdown key="batchMenu" overlay={
                                        <Menu onClick={e => {
                                            if (e.key === 'remove') {
                                                handleBatchRemove(selectedRows)
                                            } else if (e.key.endsWith('flag')) {
                                                const parts = e.key.split('-')
                                                handleBatchModify(selectedRows, parts[1], parseInt(parts[0], 10))
                                            } else if (e.key.endsWith('index')) {
                                                const parts = e.key.split('-')
                                                let value = parts[0]
                                                if (value === 'true') {
                                                    value = true
                                                } else if (value === 'false') {
                                                    value = false
                                                }

                                                handleBatchModify(selectedRows, parts[1], value)
                                            }
                                        }}>
                                            <Menu.Item key="remove">删除</Menu.Item>
                                            <Menu.Divider />
                                            <Menu.SubMenu title="输入选项">
                                                <Menu.Item key="0-input_flag">禁止输入</Menu.Item>
                                                <Menu.Item key="1-input_flag">可选输入</Menu.Item>
                                                <Menu.Item key="2-input_flag">必须输入</Menu.Item>
                                            </Menu.SubMenu>
                                            <Menu.SubMenu title="输出选项">
                                                <Menu.Item key="0-output_flag">禁止输出</Menu.Item>
                                                <Menu.Item key="1-output_flag">默认输出</Menu.Item>
                                                <Menu.Item key="2-output_flag">默认不输出</Menu.Item>
                                            </Menu.SubMenu>
                                            <Menu.SubMenu title="查询选项">
                                                <Menu.Item key="0-search_flag">禁止查询</Menu.Item>
                                                <Menu.Item key="1-search_flag">精确匹配</Menu.Item>
                                            </Menu.SubMenu>
                                            <Menu.SubMenu title="索引类型">
                                                <Menu.Item key="false-index">无索引</Menu.Item>
                                                <Menu.Item key="true-index">默认索引</Menu.Item>
                                                <Menu.Item key="hashed-index">哈希索引(hashed)</Menu.Item>
                                                <Menu.Item key="text-index">全文索引(text)</Menu.Item>
                                            </Menu.SubMenu>
                                        </Menu>
                                    }>
                                        <Button>
                                            <Badge offset={[-6, -4]} count={rowCount} />
                                            <span>批量操作</span><DownOutlined />
                                        </Button>
                                    </Dropdown>
                                ) : null,
                                <Button key="resort" onClick={() => {
                                    const newValues = _.orderBy(thisRef.current.properties, 'order')
                                    let index = 5
                                    for (let i=0; i<newValues.length; i++) {
                                        newValues[i].order = index
                                        index += 5
                                    }

                                    thisRef.current.properties = newValues
                                    actionRef.current.reload()
                                }}>重编序号</Button>,
                                <PropertyForm level={level} key="new" editMode={1} propMeta={{}} onOk={values => {
                                    const existProp = thisRef.current.properties.find(p => p.name === values.name)
                                    if (existProp) {
                                        return message.info(`${values.name} 已存在`)
                                    }

                                    thisRef.current.properties.push(values)
                                    actionRef.current.reload()
                                }}>
                                    <Button icon={<PlusOutlined />} type="primary">
                                        新建
                                    </Button>
                                </PropertyForm>,
                                <Button type="primary" onClick={() => {
                                    thisRef.current.properties.splice(0, 0, {
                                        "unique" : true,
                                        "index" : true,
                                        "order": 0,
                                        "output_flag": 1,
                                        "search_flag": 1,
                                        "properties" : null,
                                        "require" : false,
                                        "name" : "id",
                                        "dis_name" : "Id",
                                        "prop_type" : API_FIELD_TYPE.objectId
                                    })
                                    actionRef.current.reload()
                                }}>
                                    新建Id
                                </Button>
                            ]
                        }}
                        tableAlertRender={selectedRowKeys => (
                            <div>
                                已选择 <a style={{ fontWeight: 600 }}>{selectedRowKeys.length}</a> 项
                            </div>
                        )}
                        request={params => loadData(params)}
                        columns={tableColumns}
                        rowSelection={editMode ? {} : null}
                    />
                </Modal>
            ) : null}
        </>
    )
}

export default LegacyForm.create()(PropertiesList)
