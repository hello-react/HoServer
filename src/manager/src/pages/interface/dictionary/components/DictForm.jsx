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
import {Button, Col, Input, message, Modal, Row, Select} from 'antd'
import _ from 'lodash'
import React, {useEffect, useImperativeHandle, useRef, useState} from 'react'

import prompt from "@/third/antd-prompt"
import Constants from "@/utils/constants"

import {getDictCategories} from "../service"
import ValuesList from "./ValuesList"

const DictForm = LegacyForm.create()(props => {
    const {editMode, modelInstance, formRef} = props
    const {getFieldDecorator} = props.form

    const [categories, setCategories] = useState([])

    const categoryRef = useRef([])
    const dictRef = useRef({...modelInstance})

    useImperativeHandle(formRef, () => ({
        getFormFields: callback => {
            getFormValues(callback)
        }
    }))

    useEffect(() => {
        loadCategoryList()

        if (editMode === 1) {
            props.form.resetFields()
        } else if (editMode === 2) {
            const {name, dis_name, category_name, description} = dictRef.current
            props.form.setFieldsValue({
                name, dis_name, category_name, description
            })
        }
    }, [editMode, modelInstance])

    const loadCategoryList = async () => {
        categoryRef.current = await getDictCategories()
        setCategories(_.concat([], categoryRef.current))
    }

    const addCategory = async () => {
        let categoryName = await prompt({
            title: "添加字典分类",
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

            const dictInstance = dictRef.current
            if (!dictInstance.values || dictInstance.values.length === 0) {
                return message.warn('请先添加字典条目')
            }

            _.merge(dictInstance, fields)
            callback(dictInstance)
        })
    }

    return (
        <LegacyForm {...Constants.DEF_FORM_ITEM_LAYOUT} layout="horizontal">
            <LegacyForm.Item required label="字典名称">
                {getFieldDecorator('name', {
                    rules: [
                        {required: true, message: '字典名称必填'},
                        {pattern: '^([A-Za-z0-9_\\-]){1,}$', message: '只允许英文字母数字和下划线'}
                    ]
                })(<Input placeholder="请输入英文字母数字和下划线" />)}
            </LegacyForm.Item>
            <LegacyForm.Item required label="显示名称">
                {getFieldDecorator('dis_name', {
                    rules: [{required: true, message: '显示名称必填'}]
                })(<Input placeholder="请输入" />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="分类" extra="可选">
                <Row gutter={8}>
                    <Col span={20}>
                        {getFieldDecorator('category_name')(
                            <Select placeholder="请选择">
                                {categories.map(c => (
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
            <LegacyForm.Item label="取值列表">
                <ValuesList editMode={editMode} dictInstance={dictRef.current} onOk={valueList => {
                    dictRef.current.values = valueList
                }} />
            </LegacyForm.Item>
            <LegacyForm.Item label="备注">
                {getFieldDecorator('description')(<Input.TextArea placeholder="请输入" />)}
            </LegacyForm.Item>
        </LegacyForm>
    )
})

const DictFormModal = props => {
    const {children, editMode, modelInstance, onOk} = props

    const [visible, setVisible] = useState(false)
    const formRef = React.createRef()

    const handleSubmit = () => {
        formRef.current.getFormFields((values) => {
            console.log('DictForm submit: ', values)

            onOk && onOk(editMode, values, modelInstance)
            setVisible(false)
        })
    }

    return (
        <>
            {children ? (
                <a disabled={modelInstance.editable === false} onClick={() => setVisible(true)}>
                    {children}
                </a>
            ) : (
                <Button disabled={modelInstance.editable === false} onClick={() => setVisible(true)}>
                    <Icon type={!editMode ? 'eye' : 'edit'} /> {!editMode ? '查看' : '设置'}
                </Button>
            )}
            {visible ? (
                <Modal
                    key="dictEditModal"
                    centered
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title={`${!editMode ? '查看' : (editMode === 1 ? '新建' : '编辑')}字典`}
                    visible={visible}
                    footer={!editMode ? <Button type="primary" onClick={() => setVisible(false)}>关闭</Button> : undefined}
                    onOk={() => handleSubmit()}
                    onCancel={() => setVisible(false)}
                >
                    <DictForm formRef={formRef} editMode={editMode} modelInstance={modelInstance} />
                </Modal>
            ) : null}
        </>
    )
}

export default DictFormModal
