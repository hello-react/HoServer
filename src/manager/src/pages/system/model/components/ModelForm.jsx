/* eslint-disable @typescript-eslint/camelcase */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import '@ant-design/compatible/assets/index.css'
import './ModelForm.less'

import { Form as LegacyForm, Icon } from "@ant-design/compatible";
import { Constants , ModelService } from '@hosoft/hos-admin-common'

import { Button, Col, Input, message, Modal, Row, Select, Switch, Tag, Tooltip } from 'antd'
import _ from "lodash";
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'

import InterfaceService from '@/services/interface'

import CategoryForm from "./CategoryForm"
import PropertiesList from "./PropertiesList"

const ModelForm = LegacyForm.create()(props => {
    const {editMode, modelInstance, formRef} = props

    const [categoryList, setCategoryList] = useState([])
    const [catFormVisible, setCatFormVisible] = useState(false)

    const modelRef = useRef({...modelInstance})
    const {getFieldDecorator} = props.form

    useImperativeHandle(formRef, () => ({
        getFormFields: callback => {
            getFormValues(callback)
        }
    }))

    const loadCategoryList = async () => {
        setCategoryList(await InterfaceService.getCategoryList())
    }

    useEffect(() => {
        if (!(categoryList && categoryList.length > 0)) {
            loadCategoryList()
        }

        editMode === 2 ? props.form.setFieldsValue({
            name: modelInstance.name,
            dis_name: modelInstance.dis_name,
            category_name: modelInstance.category_name,
            db_table: modelInstance.db_table,
            route_name: modelInstance.route_name,
            timestamp: modelInstance.timestamp,
            description: modelInstance.description
        }) : props.form.resetFields()
    }, [editMode, modelInstance])

    const getModelRouteList = () => {
        const modelName = props.form.getFieldValue('name')
        const routeName = props.form.getFieldValue('route_name')
        const categoryName = props.form.getFieldValue('category_name')
        const routePath = ModelService.getModelRoutePath(modelName, routeName, categoryName)
        const idField = ModelService.getModelIdField(modelInstance)

        return routePath ? (
            <div className="ho_model_form_tag">
                <p>默认Api接口预览：</p>
                <Tag>创建接口</Tag> <Tag>POST</Tag> {routePath} <br />
                <Tag>列表接口</Tag> <Tag>GET</Tag> {routePath} <br />
                <Tag>详情接口</Tag> <Tag>GET</Tag> {routePath}/:{idField} <br />
                <Tag>更新接口</Tag> <Tag>POST</Tag> {routePath}/:{idField} <br />
                <Tag>删除接口</Tag> <Tag>DELETE</Tag> {routePath}/:{idField} <br />
            </div>
        ) : null
    }

    const getDbTableName = () => {
        const modelName = props.form.getFieldValue('name')
        const categoryName = props.form.getFieldValue('category_name')
        if (!(categoryName && modelName)) {
            return ''
        }

        return `${categoryName}_${modelName}`.toLowerCase()
    }

    const setRouteName = value => {
        const defDbName = getDbTableName()
        if (value && defDbName !== value) {
            const categoryName = props.form.getFieldValue('category_name')
            const dbRouteName = `${categoryName}/${value.replace(`${categoryName}_`, '')}`
            const routeName = props.form.getFieldValue('route_name')
            if (routeName !== dbRouteName) {
                props.form.setFieldsValue({route_name: dbRouteName})
            }
        }
    }

    const getFormValues = callback => {
        props.form.validateFields(async (err, values) => {
            if (err) return null

            modelRef.current = _.merge(modelRef.current, values)
            if (!modelRef.current.properties || modelRef.current.properties.length === 0) {
                return message.warn('请先添加对象属性')
            }

            // timestamp
            const {properties} = modelRef.current
            if (modelInstance.timestamp) {
                if (!properties.find(p => p.name === 'created_at')) {
                    properties.push({
                        "auto_increment" : false,
                        "unique" : false,
                        "require" : false,
                        "index" : false,
                        "search_flag" : 0,
                        "output_flag" : 2,
                        "properties" : [],
                        "name" : "created_at",
                        "dis_name" : "创建时间",
                        "prop_type" : "date"
                    })
                }

                if (!properties.find(p => p.name === 'updated_at')) {
                    properties.push({
                        "auto_increment" : false,
                        "unique" : false,
                        "require" : false,
                        "index" : false,
                        "search_flag" : 0,
                        "output_flag" : 2,
                        "properties" : [],
                        "name" : "updated_at",
                        "dis_name" : "更新时间",
                        "prop_type" : "date"
                    })
                }
            }

            callback(modelRef.current)
        })
    }

    console.log('ModelForm ====> rendered')

    return (
        <LegacyForm {...Constants.DEF_FORM_ITEM_LAYOUT} layout="horizontal">
            <LegacyForm.Item required label="对象名称">
                {getFieldDecorator('name', {
                    rules: [
                        {required: true, message: '对象名称必填'},
                        {pattern: '^([A-Za-z0-9_\\-]){1,}$', message: '只允许英文字母数字和下划线'}
                    ]
                })(<Input placeholder="请输入英文字母数字和下划线" />)}
            </LegacyForm.Item>
            <LegacyForm.Item required label="显示名称">
                {getFieldDecorator('dis_name', {
                    rules: [{required: true, message: '显示名称必填'}]
                })(<Input placeholder="请输入" />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="对象分类">
                <Row gutter={8}>
                    <Col span={19}>
                        {getFieldDecorator('category_name', {
                            rules: [{required: true, message: '对象分类必填'}]
                        })(
                            <Select placeholder="请选择" onChange={value => {
                                modelRef.current.category_name = value
                            }}>
                                {categoryList.map(c => (
                                    <Select.Option key={c.key} value={c.key}>{c.value || c.key}</Select.Option>
                                ))}
                            </Select>
                        )}
                    </Col>
                    <Col span={4}>
                        <Button onClick={() => setCatFormVisible(true)} style={{width: '100%'}}>添加</Button>
                        <CategoryForm visible={catFormVisible} editMode={1} onCancel={() => setCatFormVisible(false)} onOk={async (mode, existRecord, values) => {
                            const categoryName = values.name.trim()
                            if (categoryName) {
                                if (categoryList.find(c => c.key === categoryName)) {
                                    return message.warn(`分类名称 ${categoryName} 已经存在`)
                                }

                                await setCategoryList(_.concat(categoryList, [{key: categoryName, value: values.dis_name}]))
                                await InterfaceService.setCategoryDisName(categoryName, values.dis_name)
                                props.form.setFieldsValue({category_name: categoryName})
                                setCatFormVisible(false)
                            }
                        }} />
                    </Col>
                    <Col span={1}>
                        <Tooltip title="如需修改、删除分类名称，请修改系统字典 sys_category">
                            {' '}
                            <Icon type="question-circle-o" />
                        </Tooltip>
                    </Col>
                </Row>
            </LegacyForm.Item>
            <LegacyForm.Item label="数据库表名" extra="对应 Mongodb 集合名称，建议使用默认值">
                {getFieldDecorator('db_table', {
                    initialValue: getDbTableName(),
                    rules: [
                        {required: true, message: '数据库表名必填'},
                        {pattern: '^([A-Za-z0-9_\\-]){1,}$', message: '只允许英文字母数字和下划线'}
                    ]
                })(<Input placeholder="请输入英文字母数字和下划线" onChange={e => setRouteName(e.target.value)} />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="对象属性列表" required>
                <PropertiesList modelMeta={modelRef.current || {}} editMode={editMode} onOk={values => {
                    modelRef.current.properties = values
                }} />
            </LegacyForm.Item>
            <LegacyForm.Item label="路由名称" extra={getModelRouteList()}>
                {getFieldDecorator('route_name', {
                    rules: [
                        {pattern: '^([A-Za-z0-9\\/\\_\\-]){1,}$', message: '只允许英文字母数字、下划线、斜线'}
                    ]
                })(<Input placeholder="一般不需要指定，默认使用对象分类+对象名称复数形式" />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="启用时间戳字段" extra="选中自动添加 created_at, updated_at 字段">
                {getFieldDecorator('timestamp')(<Switch defaultChecked={modelInstance.timestamp} />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="备注">
                {getFieldDecorator('description')(<Input.TextArea placeholder="请输入" />)}
            </LegacyForm.Item>
        </LegacyForm>
    )
})

const ModelFormModal = props => {
    const {children, disabled, editMode, modelInstance, onOk} = props

    const [visible, setVisible] = useState(false)
    const formRef = React.createRef()

    const handleSubmit = () => {
        formRef.current.getFormFields(values => {
            console.log('ModelForm submit: ', values)

            onOk && onOk(editMode, values, modelInstance)
            setVisible(false)
        })
    }

    return (
        <>
            {children ? (
                <span onClick={() => modelInstance.editable !== false && setVisible(true)}>
                    {children}
                </span>
            ) : (
                <Button disabled={disabled} onClick={() => setVisible(true)}>
                    <Icon type={!editMode ? 'eye' : 'edit'} /> {!editMode ? '查看' : '设置'}
                </Button>
            )}
            {visible ? (
                <Modal
                    key="modelEditModal"
                    centered
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title={`${!editMode ? '查看' : (editMode === 1 ? '新建' : '编辑')}对象模型`}
                    visible={visible}
                    footer={!editMode ? <Button type="primary" onClick={() => setVisible(false)}>关闭</Button> : undefined}
                    onOk={() => handleSubmit()}
                    onCancel={() => setVisible(false)}
                >
                    <ModelForm formRef={formRef} editMode={editMode} modelInstance={modelInstance} />
                </Modal>
            ) : null}
        </>
    )
}

export default ModelFormModal
