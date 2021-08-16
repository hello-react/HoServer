/* eslint-disable @typescript-eslint/camelcase,react/no-access-state-in-setstate */
import '@ant-design/compatible/assets/index.css'

import {Form as LegacyForm, Icon} from "@ant-design/compatible"
import {Constants, SelectLocation} from '@hosoft/hos-admin-common'
import {Card, Col, Input, Row, Select, Tag, Tooltip} from 'antd'
import _ from "lodash";
import React, {Component} from 'react'

import UserService from '@/pages/user_admin/service'
import AvatarForm from '@/pages/user_admin/user/components/AvatarForm'

class UserForm extends Component {
    constructor() {
        super()
        this.state = {
            userInfo: {},
            showPassword: false
        }
    }

    componentDidMount() {
        this.loadData()
    }

    async getUserInfo() {
        return new Promise((resolve, reject) => {
            this.props.form.validateFields(async (err, values) => {
                if (err) {
                    return reject(err)
                }

                resolve(_.merge(this.state.userInfo, values))
            })
        })
    }

    async loadData() {
        this.sysRoles = await UserService.listRole()
        this.sysPerms = await UserService.listPermission()

        const userInfo = {...this.props.userInfo}

        this.setState({ userInfo })
        this.props.form.setFieldsValue({
            user_name: userInfo.user_name,
            nick_name: userInfo.nick_name,
            gender: userInfo.gender,
            real_name: userInfo.real_name,
            mobile: userInfo.mobile,
            email: userInfo.email
        })
    }

    renderGeneralForm() {
        const {getFieldDecorator} = this.props.form
        const {userInfo} = this.state

        return (
            <Card title="基本信息" bordered={false} size="small">
                <LegacyForm.Item label="用户名">
                    {getFieldDecorator('user_name', {
                        rules: [
                            {pattern: '^([A-Za-z0-9_\\-]){1,}$', message: '只允许英文字母数字和下划线'}
                        ]
                    })(<span>{userInfo.user_name}</span>)}
                </LegacyForm.Item>
                <LegacyForm.Item required label="昵称">
                    {getFieldDecorator('nick_name', {
                        rules: [
                            {required: true, message: '用户昵称必填'}
                        ]
                    })(<Input />)}
                </LegacyForm.Item>
                <LegacyForm.Item label="密码">
                    {getFieldDecorator('password', {
                        rules: [
                            {pattern: '^([~!@#$%^&*()+<>,.?/;\'":A-Za-z0-9_\\-]){1,}$', message: '只允许英文字母、符号、数字和下划线'}
                        ]
                    })(
                        <Input type={this.state.showPassword ? "text" : "password"}
                            placeholder="留空保持密码不变"
                            suffix={<Icon type="eye" onClick={() => this.setState({showPassword: !this.state.showPassword})} />}
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

    renderContactlForm() {
        const {getFieldDecorator} = this.props.form
        const {userInfo} = this.state

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
                        this.setState({userInfo})
                    }} />
                </LegacyForm.Item>
            </Card>
        )
    }

    renderRoleForm() {
        const {userInfo} = this.state
        return (
            <Card title="角色权限" bordered={false} size="small">
                <LegacyForm.Item label="角色">
                    <div>
                        {userInfo.roles ? userInfo.roles.map(role => {
                            const item = this.sysRoles.find(r => r.key === role)
                            return item ? (
                                <Tag key={item.key} color="blue">
                                    {item.title}
                                </Tag>
                            ) : null
                        }) : '未设置'}
                    </div>
                </LegacyForm.Item>
                <LegacyForm.Item label={<Tooltip title="用户实际权限为角色权限+管理员设置权限">权限 <Icon type="question-circle" /></Tooltip>}>
                    <div>
                        {userInfo.permissions ? userInfo.permissions.map(perm => {
                            const item = this.sysPerms.find(r => r.key === perm.name)
                            return item ? (
                                <Tag key={item.key} color="blue">
                                    {item.title}
                                </Tag>
                            ) : null
                        }) : '未设置'}
                    </div>
                </LegacyForm.Item>
            </Card>
        )
    }

    render() {
        const {userInfo} = this.state

        return (
            <LegacyForm {...Constants.DEF_FORM_ITEM_LAYOUT} layout="horizontal">
                <Row gutter={8}>
                    <Col span={18}>
                        {this.renderGeneralForm()}
                        {this.renderContactlForm()}
                        {this.renderRoleForm()}
                    </Col>
                    <Col span={6} align="center">
                        <AvatarForm src={userInfo.avatar} onUploadResult={avatarUrl => {
                            if (avatarUrl) {
                                userInfo.avatar = avatarUrl
                                this.setState({userInfo})
                            }
                        }} />
                    </Col>
                </Row>
            </LegacyForm>
        )
    }
}

export default LegacyForm.create()(UserForm)
