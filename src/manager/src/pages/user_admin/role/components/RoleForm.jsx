/* eslint-disable @typescript-eslint/camelcase */
/**
 * HoServer Manager Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 * author: Jack Zhang
 * */
import '@ant-design/compatible/assets/index.css'

import {Form as LegacyForm, Icon} from "@ant-design/compatible"
import {Button, Col, Input, message, Modal, Row, Select, Tag} from 'antd'
import _ from 'lodash'
import React, {useEffect, useImperativeHandle, useRef, useState} from 'react'

import ListSelect from "@/components/Modals/ListSelect";
import prompt from "@/third/antd-prompt"
import Constants from "@/utils/constants"

import UserService from "../../service"

const RoleForm = LegacyForm.create()(props => {
    const {editMode, modelInstance, formRef} = props

    const [permissions, setPermissions] = useState(modelInstance.permissions || [])
    const [categories, setCategories] = useState([])
    const {getFieldDecorator} = props.form

    const categoryRef = useRef([])
    const permRef = useRef([])
    const roleRef = useRef({...modelInstance})

    useImperativeHandle(formRef, () => ({
        getFormFields: callback => {
            getFormValues(callback)
        }
    }))

    useEffect(() => {
        loadExtraData()

        if (editMode === 2) {
            const {name, dis_name, category_name, description} = roleRef.current
            props.form.setFieldsValue({
                name, dis_name, category_name, description
            })
        } else {
            props.form.resetFields()
        }
    }, [editMode, modelInstance])

    const loadExtraData = async () => {
        permRef.current = await UserService.listPermission()

        categoryRef.current = await UserService.getRolePermCategories()
        setCategories(_.concat([], categoryRef.current))
    }

    const addCategory = async () => {
        let categoryName = await prompt({
            title: "添加角色分类",
            label: '分类名称',
            inputProps: {placeholder: "请输入分类名称"},
            rules: [
                {
                    required: true,
                    message: "分类名称不能为空"
                }
            ]
        })

        categoryName = categoryName.trim()
        if (categoryName) {
            if (categories.indexOf(categoryName) > -1) {
                return message.warn(`分类名称 ${categoryName} 已经存在`)
            }

            categoryRef.current.push(categoryName)
            await setCategories(_.concat([], categoryRef.current))
            props.form.setFieldsValue({category_name: categoryName})
        }
    }

    const getFormValues = callback => {
        props.form.validateFields((err, fields) => {
            if (err) return

            const roleInstance = roleRef.current

            _.merge(roleInstance, fields)
            callback(roleInstance)
        })
    }

    return (
        <LegacyForm {...Constants.DEF_FORM_ITEM_LAYOUT} layout="horizontal">
            <LegacyForm.Item required label="角色名称">
                {getFieldDecorator('name', {
                    rules: [
                        {required: true, message: '角色名称必填'},
                        {pattern: '^([A-Za-z0-9:_\\-]){1,}$', message: '只允许英文字母数字冒号和下划线'}
                    ]
                })(<Input placeholder="请输入英文字母数字和下划线" />)}
            </LegacyForm.Item>
            <LegacyForm.Item required label="显示名称">
                {getFieldDecorator('dis_name', {
                    rules: [{required: true, message: '显示名称必填'}]
                })(<Input placeholder="请输入" />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="分类名称" extra="可选">
                <Row gutter={8}>
                    <Col span={20}>
                        {getFieldDecorator('category_name')(
                            <Select placeholder="请选择">
                                {categories && categories.map(c => (
                                    <Select.Option key={c} value={c}>{c}</Select.Option>
                                ))}
                            </Select>
                        )}
                    </Col>
                    <Col span={4}>
                        <Button onClick={() => addCategory()} style={{width: '100%'}}>添加</Button>
                    </Col>
                </Row>
            </LegacyForm.Item>
            <LegacyForm.Item label="角色权限">
                <div>
                    {permissions.length > 0 ? permissions.map(perm => {
                        const item = permRef.current.find(r => r.key === perm.name)
                        return item ? (
                            <Tag key={item.key} color="blue">
                                {item.title}
                            </Tag>
                        ) : null
                    }) : '未设置'}
                </div>
                <div>
                    <ListSelect title="设置权限" request={UserService.listPermission} selValues={permissions.map(p => p.name)} onOk={values => {
                        roleRef.current.permissions = values.map(v => ({name: v, scope: ''}))
                        setPermissions(roleRef.current.permissions)
                    }} />
                </div>
            </LegacyForm.Item>
            <LegacyForm.Item label="备注">
                {getFieldDecorator('description')(<Input.TextArea placeholder="请输入" />)}
            </LegacyForm.Item>
        </LegacyForm>
    )
})

const RoleFormModal = props => {
    const {children, editMode, modelInstance, onOk} = props

    const [visible, setVisible] = useState(false)
    const formRef = React.createRef()

    const handleSubmit = () => {
        formRef.current.getFormFields((values) => {
            console.log('ModelForm submit: ', values)

            onOk && onOk(editMode, values, modelInstance)
            setVisible(false)
        })
    }

    return (
        <>
            {children ? (
                <span onClick={() => setVisible(true)}>
                    {children}
                </span>
            ) : (
                <Button onClick={() => setVisible(true)}>
                    <Icon type={!editMode ? 'eye' : 'edit'} /> {!editMode ? '查看' : '设置'}
                </Button>
            )}
            {visible ? (
                <Modal
                    key="roleEditModal"
                    centered
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title={`${!editMode ? '查看' : (editMode === 1 ? '新建' : '编辑')}角色`}
                    visible={visible}
                    footer={!editMode ? <Button type="primary" onClick={() => setVisible(false)}>关闭</Button> : undefined}
                    onOk={() => handleSubmit()}
                    onCancel={() => setVisible(false)}
                >
                    <RoleForm formRef={formRef} editMode={editMode} modelInstance={modelInstance} />
                </Modal>
            ) : null}
        </>
    )
}

export default RoleFormModal
