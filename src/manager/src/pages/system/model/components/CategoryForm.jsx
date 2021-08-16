/* eslint-disable @typescript-eslint/camelcase */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import '@ant-design/compatible/assets/index.css'

import {Form as LegacyForm} from "@ant-design/compatible"
import {Constants} from '@hosoft/hos-admin-common'
import {Button, Input, Modal} from 'antd'
import _ from 'lodash'
import React, {useEffect, useImperativeHandle, useRef} from 'react'

const CategoryForm = LegacyForm.create()(props => {
    const {editMode, modelInstance, formRef} = props
    const {getFieldDecorator} = props.form

    const categoryRef = useRef({...modelInstance})

    useImperativeHandle(formRef, () => ({
        getFormFields: callback => {
            getFormValues(callback)
        }
    }))

    useEffect(() => {
        if (editMode === 1) {
            props.form.resetFields()
        } else if (editMode === 2) {
            const {name, dis_name} = categoryRef.current
            props.form.setFieldsValue({
                name, dis_name
            })
        }
    }, [editMode, modelInstance])

    const getFormValues = callback => {
        props.form.validateFields((err, fields) => {
            if (err) return

            let catInstance = categoryRef.current
            catInstance = _.merge(catInstance, fields)
            callback(catInstance)
        })
    }

    return (
        <LegacyForm {...Constants.DEF_FORM_ITEM_LAYOUT} layout="horizontal">
            <LegacyForm.Item required label="分类英文名">
                {getFieldDecorator('name', {
                    rules: [
                        {required: true, message: '分类英文名称必填'},
                        {pattern: '^([A-Za-z0-9_\\-]){1,}$', message: '只允许英文字母数字和下划线'}
                    ]
                })(<Input placeholder="请输入英文字母数字和下划线" />)}
            </LegacyForm.Item>
            <LegacyForm.Item required label="分类显示名">
                {getFieldDecorator('dis_name', {
                    rules: [{required: true, message: '显示名称必填'}]
                })(<Input placeholder="请输入" />)}
            </LegacyForm.Item>
        </LegacyForm>
    )
})

const CategoryFormModal = props => {
    const {editMode, modelInstance, onOk, onCancel} = props

    const formRef = React.createRef()

    const handleSubmit = () => {
        formRef.current.getFormFields(values => {
            console.log('CategoryForm submit: ', values)

            onOk && onOk(editMode, modelInstance, values)
        })
    }

    return (
        <Modal
            key="categoryEditModal"
            centered
            destroyOnClose
            width={600}
            bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
            title="添加分类"
            visible={props.visible}
            footer={!editMode ? <Button type="primary" onClick={() => onCancel && onCancel()}>关闭</Button> : undefined}
            onOk={() => handleSubmit()}
            onCancel={() => onCancel && onCancel()}
        >
            <CategoryForm formRef={formRef} editMode={editMode} modelInstance={modelInstance} />
        </Modal>
    )
}

export default CategoryFormModal
