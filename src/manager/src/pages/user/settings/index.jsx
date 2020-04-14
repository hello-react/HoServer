import { PageHeaderWrapper } from '@ant-design/pro-layout'
import { Button, Card, message } from 'antd'
import { connect } from 'dva'
import React, { Component } from 'react'

import UserService from "@/pages/user_admin/service"

import UserForm from './components/UserForm'

// eslint-disable-next-line react/prefer-stateless-function
class Settings extends Component {
    render() {
        return (
            <PageHeaderWrapper>
                <Card>
                    <div style={{width: '80%'}}>
                        <UserForm
                            wrappedComponentRef={(form) => this.userFormRef = form}
                            userInfo={this.props.currentUser}
                        />
                    </div>
                </Card>
                <Card style={{marginTop: -1}}>
                    <Button type="primary" onClick={async () => {
                        const userInfo = await this.userFormRef.getUserInfo()
                        console.log('userFormRef getUserInfo: ', userInfo)
                        if (userInfo) {
                            const result = await UserService.updateUser(userInfo.user_id, userInfo)
                            if (result) {
                                message.info('个人信息已修改')
                                this.props.dispatch({
                                    type: 'user/updateCurrent',
                                    payload: {
                                        userInfo
                                    }
                                })
                            }
                        }
                    }}>保存个人信息</Button>
                    <Button danger style={{marginLeft: 10}} onClick={() => {
                        this.props.dispatch({
                            type: 'user/logout',
                        })
                    }}>退出登录</Button>
                </Card>
            </PageHeaderWrapper>
        )
    }
}

export default connect(({ user }) => ({
    currentUser: user.currentUser,
}))(Settings)
