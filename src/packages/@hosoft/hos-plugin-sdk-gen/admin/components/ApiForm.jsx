/* eslint-disable @typescript-eslint/camelcase */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import '@ant-design/compatible/assets/index.css'

import { Form as LegacyForm, Icon } from "@ant-design/compatible";
import { TransferModal } from '@hosoft/hos-admin-common'
import { ApiService, prompt } from "@hosoft/hos-admin-common"
import { Button, Col, Input, InputNumber, Modal, Row, Switch, Tag } from 'antd'
import _ from  'lodash'
import React, {useEffect, useImperativeHandle, useRef, useState} from 'react'

import UserService from "../services/user"

import InParamsList from './InParamsList'
import OutputFieldsList from './OutputFieldsList'

const tagColor = {
    GET: 'blue',
    POST: 'orange',
    DELETE: 'red'
}

const formLayout = {
    labelCol: {
        xs: {span: 24},
        sm: {span: 5},
    },
    wrapperCol: {
        xs: {span: 24},
        sm: {span: 19},
    },
}

const ApiForm = LegacyForm.create()(props => {
    const {editMode, modelInstance, formRef} = props

    const [permissions, setPermissions] = useState([])
    const [apiInfo, setApiInfo] = useState({})
    const permRef = useRef([])

    const {getFieldDecorator} = props.form

    useImperativeHandle(formRef, () => ({
        getFormFields: callback => {
            getFormValues(callback)
        }
    }))

    useEffect(() => {
        loadData()
    }, [editMode, modelInstance])

    const loadData = async () => {
        permRef.current = await UserService.listPermission()

        if (editMode === 2) {
            const selApiInfo = await ApiService.getApiDetail(modelInstance.id)
            if (selApiInfo) {
                setApiInfo(selApiInfo)
                setPermissions(selApiInfo.permissions)
                props.form.setFieldsValue({
                    name: selApiInfo.name,
                    dis_name: selApiInfo.dis_name,
                    private: String(selApiInfo.private) === 'true',
                    disabled: String(selApiInfo.disabled) === 'true',
                    category_name: selApiInfo.category_name,
                    input_example: selApiInfo.input_example,
                    output_example: selApiInfo.output_example,
                    cache: selApiInfo.cache,
                    description: selApiInfo.description
                })
            }
        } else {
            props.form.resetFields()
        }
    }

    const getExample = async fieldName => {
        const text = await prompt({
            title: "请输入示例数据",
            initialValue: apiInfo[fieldName] || '',
            multiline: true,
            modalProps: {width: 800, height: 600},
            inputProps: {rows: 10}
        })

        if (text !== undefined) {
            apiInfo[fieldName] = text
            props.form.setFieldsValue({[fieldName]: text})
        }
    }

    const getFormValues = callback => {
        props.form.validateFields(async (err, values) => {
            if (err) return

            const result = _.merge(apiInfo, values)
            callback(result)
        })
    }

    console.log('ApiForm ====> rendered')

    return (
        <LegacyForm {...formLayout} layout="horizontal">
            <LegacyForm.Item label="路由">
                <Tag color={tagColor[modelInstance.method]}>{modelInstance.method}</Tag>
                <span>{' '}{modelInstance.path}</span>
            </LegacyForm.Item>
            <LegacyForm.Item required label="显示名称">
                {getFieldDecorator('dis_name', {
                    rules: [{required: true, message: '接口显示名称必填'}]
                })(<Input placeholder="请输入" />)}
            </LegacyForm.Item>
            <LegacyForm.Item required label="对应客户端SDK函数">
                {getFieldDecorator('name', {
                    rules: [
                        {required: true, message: '对应客户端SDK函数名称必填'},
                        {pattern: '^([A-Za-z0-9_\\-]){1,}$', message: '只允许英文字母数字和下划线'}
                    ]
                })(<Input placeholder="一般不用填写，除非系统自动生成的不合适" onChange={() => {}} />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="是否私有接口" extra="私有接口不会包含在自动生成的文档和客户端SDK中">
                {getFieldDecorator('private')(<Switch defaultChecked={String(modelInstance.private) !== 'false'} />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="是否禁止调用">
                {getFieldDecorator('disabled')(<Switch defaultChecked={String(modelInstance.disabled) === 'true'} />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="分类">
                {getFieldDecorator('category_name', {
                    rules: [
                        {pattern: '^([A-Za-z0-9_\\-/]){1,}$', message: '只允许英文字母数字和下划线'}
                    ]
                })(<Input placeholder="一般不用填写，自动根据路由分类" onChange={() => {}} />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="输入参数列表">
                <InParamsList editMode={editMode} apiInstance={apiInfo} onOk={values => {
                    apiInfo.in_params = values
                }} />
            </LegacyForm.Item>
            <LegacyForm.Item label="输出字段参数列表">
                <OutputFieldsList editMode={editMode} apiInstance={apiInfo}  onOk={values => {
                    apiInfo.out_fields = values
                }} />
            </LegacyForm.Item>
            <LegacyForm.Item label="输入数据示例">
                <Button onClick={() => getExample('input_example')}>设置</Button>{' '}
                {apiInfo.input_example ? <span style={{color: '#1890ff'}}>已设置</span> : '未设置'}
            </LegacyForm.Item>
            <LegacyForm.Item label="输出数据示例">
                <Button onClick={() => getExample('output_example')}>设置</Button>{' '}
                {apiInfo.output_example ? <span style={{color: '#1890ff'}}>已设置</span> : '未设置'}
            </LegacyForm.Item>
            <LegacyForm.Item label="权限设置" extra="接口默认调用权限为普通用户">
                <div>
                    {permissions && permissions.length > 0 ? permissions.map(perm => {
                        const item = permRef.current.find(r => r.key === perm)
                        return item ? (
                            <Tag key={item.key} color="blue">
                                {item.title}
                            </Tag>
                        ) : null
                    }) : '未设置'}
                </div>
                <TransferModal title="设置权限" request={UserService.listPermission} selValues={permissions} onOk={values => {
                    apiInfo.permissions = values
                    setPermissions(values)
                }} />
            </LegacyForm.Item>
            {modelInstance.method === 'GET' ? (
                <LegacyForm.Item label="缓存设置">
                    <Row gutter={8}>
                        <Col span={6}>
                            启用缓存:
                        </Col>
                        <Col span={18}>
                            {getFieldDecorator('cache.enable')(
                                <Switch defaultChecked={String(_.get(modelInstance, ['cache', 'enable'])) === 'true'} />
                            )}
                        </Col>
                    </Row>
                    <Row gutter={8}>
                        <Col span={6}>
                            缓存过期时间 (秒):
                        </Col>
                        <Col span={18}>
                            {getFieldDecorator('cache.tts')(
                                <InputNumber />
                            )}
                        </Col>
                    </Row>
                </LegacyForm.Item>
            ) : (null)}
            <LegacyForm.Item label="备注">
                {getFieldDecorator('description')(<Input.TextArea placeholder="请输入" />)}
            </LegacyForm.Item>
        </LegacyForm>
    )
})

const ApiFormModal = props => {
    const {children, editMode, modelInstance, onOk} = props

    const [visible, setVisible] = useState(false)
    const formRef = React.createRef()

    const handleSubmit = () => {
        formRef.current.getFormFields(values => {
            console.log('ApiForm submit: ', values)

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
                    key="apiEditModal"
                    centered
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title="Api 属性编辑"
                    visible={visible}
                    footer={!editMode ? <Button type="primary" onClick={() => setVisible(false)}>关闭</Button> : undefined}
                    onOk={() => handleSubmit()}
                    onCancel={() => setVisible(false)}
                >
                    <ApiForm formRef={formRef} editMode={editMode} modelInstance={modelInstance} />
                </Modal>
            ) : null}
        </>
    )
}

export default ApiFormModal
