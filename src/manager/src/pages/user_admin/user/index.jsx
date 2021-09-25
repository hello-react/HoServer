/* eslint-disable prefer-destructuring */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import './index.less'

import { Icon } from "@ant-design/compatible"
import { Common, MultiTags, TableLayout, TransferModal } from "@hosoft/hos-admin-common"
import { Avatar, Dropdown, Menu, Modal, Tag, Tooltip } from "antd"
import _ from 'lodash'
import React, {Fragment} from 'react'

import UserService from "../service"
import UserForm from './components/UserForm'
import UserInfo from './components/UserInfo'

const getRowStyle = row => {
    if (row.disabled === true) {
        return 'ho_disable_user'
    }

    if (row.is_active === false && row.verified === false) {
        return 'ho_wait_verify'
    }

    return ''
}

const defTableColumns = Common.setDefaultColumn([
    {
        searchFlag: 1,
        title: "用户Id",
        align: "center",
        dataIndex: "user_id",
        width: 50
    },
    {
        title: "头像",
        dataIndex: "avatar",
        align: "center",
        width: 50,
        render: (text, record) => record.avatar ? (
            <Avatar src={Common.ossProcessImg(record.avatar, 50, 0, true)}/>
        ) : (
            <Avatar icon={<Icon type='user' />}/>
        )
    },
    {
        searchFlag: 1,
        title: "用户名",
        align: "center",
        dataIndex: "user_name"
    },
    {
        searchFlag: 2,
        title: "昵称",
        align: "center",
        dataIndex: "nick_name",
        width: 120,
        render: (text, row) => (
            <Fragment>
                <span className={getRowStyle(row)}>
                    {text}
                </span>
                {' '}
                {row.disabled === true ? <Tag color="#999">已冻结</Tag> : (
                    row.is_active === false && row.verified === false ? <Tag color="orange">待审核</Tag> : null
                )}
            </Fragment>
        )
    },
    {
        searchFlag: 2,
        title: "真实姓名",
        dataIndex: "real_name",
        hideInTable: true,
        render: (text, row) => (
            <span className={getRowStyle(row)}>{text}</span>
        )
    },
    {
        title: "性别",
        dataIndex: "gender",
        width: 35,
        align: 'center',
        filters: [
            {
                text: "男",
                value: "male"
            },
            {
                text: "女",
                value: "female"
            }
        ],
        render: text => {
            return text === 'male' ? '男' : (text === 'female' ? '女' : '未知')
        }
    },
    {
        searchFlag: 2,
        title: "手机号",
        dataIndex: "mobile",
        ellipsis: true,
        width: 120,
    },
    {
        searchFlag: 2,
        title: "电子邮件",
        dataIndex: "email",
        ellipsis: true,
        hideInTable: true
    },
    {
        searchFlag: 2,
        title: "身份证号码",
        dataIndex: "real_idcard",
        hideInTable: true
    },
    {
        title: "所在地区",
        dataIndex: "location",
        render: (text, record) => {
            return `${record.province || ''}${record.city || ''}${record.district || ''}`
        }
    },
    {
        title: "定位位置",
        dataIndex: "geolocation",
        ellipsis: true,
        hideInTable: true
    },
    {
        title: "三方联系信息",
        dataIndex: "third_contact",
        hideInTable: true
    },
    {
        title: "用户角色",
        dataIndex: "roles",
        width: 120,
        hideInTable: true,
        render: (text, record) => (
            <MultiTags tags={record.roles} editMode={0} />
        )
    },
    {
        title: "用户权限",
        dataIndex: "permissions",
        width: 120,
        hideInTable: true,
        render: (text, record) => (
            <MultiTags tags={record.permissions} editMode={0} />
        )
    },
    {
        valueType: "boolean",
        searchFlag: 1,
        title: "已激活?",
        dataIndex: "is_active",
        hideInTable: true
    },
    {
        valueType: "dateTime",
        title: "激活过期时间",
        dataIndex: "expire_time",
        hideInTable: true
    },
    {
        valueType: "boolean",
        searchFlag: 1,
        title: "登录过?",
        dataIndex: "has_login",
        hideInTable: true
    },
    {
        valueType: "boolean",
        searchFlag: 1,
        title: "通过审核?",
        dataIndex: "verified",
        hideInTable: true
    },
    {
        searchFlag: 1,
        title: "受邀请用户",
        dataIndex: "invited_by",
        hideInTable: true
    },
    {
        valueType: "boolean",
        searchFlag: 1,
        title: "冻结?",
        dataIndex: "disabled",
        hideInTable: true
    }
])

class UserManage extends TableLayout {
    constructor() {
        super()

        this.modelName = 'User'
        this.renderExtra = this.renderRoleSettings
        this.extraOperationRender = record => (
            <Tooltip mouseEnterDelay={0.8} title="更多操作">
                <Dropdown trigger={['click']} overlay={
                    <Menu onClick={e => {
                        this.handleOperate(e.key, {record})
                    }}>
                        <Menu.Item key="disable">冻结</Menu.Item>
                        <Menu.Item key="enable">取消冻结</Menu.Item>
                        <Menu.Item key="active">审核通过</Menu.Item>
                        <Menu.Item key="inactive">审核不通过</Menu.Item>
                    </Menu>
                }>
                    <Icon type="ellipsis" />
                </Dropdown>
            </Tooltip>
        )

        defTableColumns[2].render = (text, record) => {
            return (
                <Fragment>
                    <span className={getRowStyle(record)}>{record.user_name}{' '}</span>
                    <UserInfo modelMeta={this.state.modelMeta} modelInstance={record} />
                </Fragment>
            )
        }

        this.state.selectedRecords = []
        this.state.roles = []
        this.state.permissions = []
        this.state.roleSettingVisible = false
        this.state.permSettingVisible = false
    }

    renderRoleSettings = () => {
        const roles = this.state.roles || []
        const permissions = this.state.permissions || []

        return (
            <Fragment>
                <TransferModal
                    title="设置角色"
                    visible={this.state.roleSettingVisible}
                    request={UserService.listRole}
                    selValues={roles}
                    onOk={values => {
                        this.setRole(values)
                    }}
                ><span /></TransferModal>
                <TransferModal
                    title="设置权限"
                    visible={this.state.permSettingVisible}
                    request={UserService.listPermission}
                    selValues={permissions.map(p => p.name)}
                    onOk={values => {
                        this.setPermission(values)
                    }}
                ><span /></TransferModal>
            </Fragment>
        )
    }

    getTableColumns = () => {
        return _.concat([], defTableColumns)
    }

    getFormComponent = () => {
        return UserForm
    }

    getOptions = () => {
        return {
            delete: false,
            batchOperations: [
                <Menu.Item key="disable">冻结</Menu.Item>,
                <Menu.Item key="enable">取消冻结</Menu.Item>,
                <Menu.Item key="active">审核通过</Menu.Item>,
                <Menu.Item key="inactive">审核不通过</Menu.Item>,
                <Menu.Divider />,
                <Menu.Item key="set_role">设置角色</Menu.Item>,
                <Menu.Item key="set_permission">设置权限</Menu.Item>
            ]
        }
    }

    handleOperate = async (action, args) => {
        let roles
        let permissions
        let result= null

        switch (action) {
        case 'disable':
            Modal.confirm({
                content: `确认冻结所选用户？`,
                onOk: async () => {
                    result = await this.enableUser(false, (args.record instanceof Array) ? args.record : [args.record])
                    result && this.reloadData()
                }
            })
            break
        case 'enable':
            Modal.confirm({
                content: `确认取消冻结所选用户？`,
                onOk: async () => {
                    result = await this.enableUser(true, (args.record instanceof Array) ? args.record : [args.record])
                    result && this.reloadData()
                }
            })
            break
        case 'active':
            Modal.confirm({
                content: `确认审核通过？`,
                onOk: async () => {
                    result = await this.activeUser(true, (args.record instanceof Array) ? args.record : [args.record])
                    result && this.reloadData()
                }
            })
            break
        case 'inactive':
            Modal.confirm({
                content: `确认审核不通过？`,
                onOk: async () => {
                    result = await this.activeUser(false, (args.record instanceof Array) ? args.record : [args.record])
                    result && this.reloadData()
                }
            })
            break
        case 'set_role':
            if (args.record instanceof Array) {
                roles = args.record[0].roles
                for (let i=1; i<args.record.length; i++) {
                    roles = _.intersection(roles, args.record[i].roles)
                }
            } else {
                roles = args.record.roles
            }

            this.setState({selectedRecords: args.record, roles}, () => {
                this.setState({roleSettingVisible: true})
            })
            break
        case 'set_permission':
            if (args.record instanceof Array) {
                permissions = args.record[0].permissions
                for (let i=1; i<args.record.length; i++) {
                    permissions = _.intersectionBy(permissions, args.record[i].permissions, 'name')
                }
            } else {
                permissions = args.record.permissions
            }

            this.setState({selectedRecords: args.record, permissions}, () => {
                this.setState({permSettingVisible: true})
            })
            break
        }
    }

    handleSubmit = async (editMode, newModel, existModel) => {
        delete newModel.is_admin
        delete newModel.disabled

        let result
        if (editMode === 1) {
            result = await UserService.createUser(newModel)
        } else {
            delete newModel.user_id
            result = await UserService.updateUser(existModel.user_id, newModel)
        }

        if (result) {
            this.reloadData()
        }
    }

    enableUser = async (enable, userInfos) => {
        return UserService.batchUpdateUser(userInfos.map(u => u.user_id), {disabled: !enable})
    }

    activeUser = async (active, userInfos) => {
        return UserService.batchUpdateUser(userInfos.map(u => u.user_id), {is_active: active, verified: true})
    }

    setRole = async values => {
        const result = await UserService.batchUpdateUser(this.state.selectedRecords.map(u => u.user_id), {roles: values})
        result && this.reloadData()
    }

    setPermission = async values => {
        const result = await UserService.batchUpdateUser(this.state.selectedRecords.map(u => u.user_id), {
            permissions: values.map(v => ({name: v, scope: ''}))
        })

        result && this.reloadData()
    }
}

export default UserManage
