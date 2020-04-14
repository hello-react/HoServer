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
import {Button, Card, Col, Input, message, Modal, Row, Select, Switch, Tag, Tooltip} from 'antd'
import _ from "lodash";
import React, {useEffect, useImperativeHandle, useRef, useState} from 'react'

import ListSelect from "@/components/Modals/ListSelect"
import SelectLocation from '@/components/SelectLocation'
import Constants from "@/utils/constants"

import UserService from '../../service'
import AvatarForm from './AvatarForm'

const UserForm = LegacyForm.create()(props => {
    const {editMode, modelInstance, formRef} = props

    const [showPassword, setShowPassword] = useState(false)
    const [roles, setRoles] = useState(modelInstance.roles || [])
    const [permissions, setPermissions] = useState(modelInstance.permissions || [])
    const [userInfo, setUserInfo] = useState({})

    const roleRef = useRef([])
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
        roleRef.current = await UserService.listRole()
        permRef.current = await UserService.listPermission()

        const userId = modelInstance.user_id
        if (userId) {
            const selUserInfo = await UserService.getUserDetail(userId)
            setUserInfo(selUserInfo)

            setRoles(selUserInfo.roles || [])
            setPermissions(selUserInfo.permissions || [])
            props.form.setFieldsValue(selUserInfo)
        }
    }

    const getFormValues = callback => {
        props.form.validateFields(async (err, values) => {
            if (err) return

            _.merge(userInfo, values)
            callback(userInfo)
        })
    }

    const renderGeneralForm = () => {
        return (
            <Card title="基本信息" bordered={false} size="small">
                <LegacyForm.Item required={editMode === 1} label="用户名">
                    {getFieldDecorator('user_name', {
                        rules: [
                            {required: true, message: '用户名必填'},
                            {pattern: '^([A-Za-z0-9_\\-]){1,}$', message: '只允许英文字母数字和下划线'}
                        ]
                    })(editMode === 1 ? <Input placeholder="请输入英文字母数字和下划线" /> : <span>{userInfo.user_name}</span>)}
                </LegacyForm.Item>
                <LegacyForm.Item label="管理员用户">
                    {getFieldDecorator('is_admin')(<Switch checked={userInfo.is_admin} onChange={val => userInfo.is_admin = val} />)}
                </LegacyForm.Item>
                <LegacyForm.Item required label="昵称">
                    {getFieldDecorator('nick_name', {
                        rules: [
                            {required: true, message: '用户昵称必填'}
                        ]
                    })(<Input />)}
                </LegacyForm.Item>
                <LegacyForm.Item required={editMode === 1} label="密码">
                    {getFieldDecorator('password', {
                        rules: [
                            {required: editMode === 1, message: '请输入密码'},
                            {pattern: '^([~!@#$%^&*()+<>,.?/;\'":A-Za-z0-9_\\-]){1,}$', message: '只允许英文字母、符号、数字和下划线'}
                        ]
                    })(
                        <Input type={showPassword ? "text" : "password"}
                            placeholder={editMode === 1 ? '请输入密码' : '留空保持密码不变'}
                            suffix={<Icon type="eye" onClick={() => setShowPassword(!showPassword)} />}
                        />
                    )}
                </LegacyForm.Item>
                <LegacyForm.Item label="性别">
                    {getFieldDecorator('gender')(
                        <Select placeholder="请选择">
                            <Select.Option value="male">男</Select.Option>
                            <Select.Option value="female">女</Select.Option>
                            <Select.Option value="">未知</Select.Option>
                        </Select>
                    )}
                </LegacyForm.Item>
                <LegacyForm.Item label="真实姓名">
                    {getFieldDecorator('real_name')(<Input />)}
                </LegacyForm.Item>
            </Card>
        )
    }

    const renderContactlForm = () => {
        return (
            <Card title="联系信息" bordered={false} size="small">
                <LegacyForm.Item label="手机号码">
                    {getFieldDecorator('mobile')(<Input />)}
                </LegacyForm.Item>
                <LegacyForm.Item label="电子邮件">
                    {getFieldDecorator('email')(<Input />)}
                </LegacyForm.Item>
                <LegacyForm.Item label="地区">
                    <SelectLocation location={userInfo.location} onChange={value => {
                        userInfo.location = value
                    }} />
                </LegacyForm.Item>
            </Card>
        )
    }

    const renderRoleForm = () => {
        return (
            <Card title="角色权限" bordered={false} size="small">
                <LegacyForm.Item label="角色">
                    <div>
                        {roles.length > 0 ? roles.map(role => {
                            const item = roleRef.current.find(r => r.key === role)
                            return item ? (
                                <Tag key={item.key} color="blue">
                                    {item.title}
                                </Tag>
                            ) : null
                        }) : '未设置'}
                    </div>
                    <div>
                        <ListSelect title="设置角色" request={UserService.listRole} selValues={roles} onOk={values => {
                            userInfo.roles = values
                            setRoles(values)
                        }} />
                    </div>
                </LegacyForm.Item>
                <LegacyForm.Item label={<Tooltip title="用户实际权限为角色权限+管理员设置权限">权限 <Icon type="question-circle" /></Tooltip>}>
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
                            userInfo.permissions = values.map(v => ({name: v, scope: ''}))
                            setPermissions(values)
                        }} />
                    </div>
                </LegacyForm.Item>
            </Card>
        )
    }

    console.log('UserForm ====> rendered')

    return (
        <LegacyForm {...Constants.DEF_FORM_ITEM_LAYOUT} layout="horizontal">
            <Row gutter={8}>
                <Col span={18}>
                    {renderGeneralForm()}
                    {renderContactlForm()}
                    {renderRoleForm()}
                </Col>
                <Col span={6} align="center">
                    <AvatarForm src={userInfo.avatar} onUploadResult={avatarUrl => {
                        if (avatarUrl) {
                            userInfo.avatar = avatarUrl
                        }
                    }} />
                </Col>
            </Row>
        </LegacyForm>
    )
})

const UserFormModal = props => {
    const {children, editMode, modelInstance, onOk} = props

    const [visible, setVisible] = useState(false)
    const formRef = React.createRef()

    const handleSubmit = () => {
        formRef.current.getFormFields((values) => {
            console.log('UserForm submit: ', values)

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
                    key="userEditModal"
                    centered
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title={`${editMode === 1 ? '新建' : '编辑'}用户信息`}
                    visible={visible}
                    onOk={() => handleSubmit()}
                    onCancel={() => setVisible(false)}
                >
                    <UserForm formRef={formRef} editMode={editMode} modelInstance={modelInstance} />
                </Modal>
            ) : null}
        </>
    )
}

export default UserFormModal
