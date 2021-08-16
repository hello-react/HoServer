import { LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { Common } from '@hosoft/hos-admin-common'
import { Avatar, Menu, Spin } from 'antd'
import { connect } from 'dva'
import React from 'react'
import router from 'umi/router'

import HeaderDropdown from '../HeaderDropdown'
import styles from './index.less'

class AvatarDropdown extends React.Component {
    onMenuClick = event => {
        const { key } = event

        if (key === 'logout') {
            const { dispatch } = this.props

            if (dispatch) {
                dispatch({
                    type: 'user/logout',
                })
            }
        } else if (key === 'my') {
            router.push('/profile')
        }
    }

    render() {
        const {
            currentUser = {
                avatar: '',
                name: '',
            },
            menu,
        } = this.props

        const menuHeaderDropdown = (
            <Menu className={styles.menu} selectedKeys={[]} onClick={this.onMenuClick}>
                {menu && (
                    <Menu.Item key="my">
                        <SettingOutlined />
                        个人设置
                    </Menu.Item>
                )}
                {menu && <Menu.Divider />}

                <Menu.Item key="logout">
                    <LogoutOutlined />
                    退出登录
                </Menu.Item>
            </Menu>
        )

        return currentUser && currentUser.nick_name ? (
            <HeaderDropdown overlay={menuHeaderDropdown}>
                <span className={`${styles.action} ${styles.account}`}>
                    <Avatar size="small" className={styles.avatar} src={Common.ossProcessImg(currentUser.avatar, 50, 0, true)} icon={currentUser.avatar ? undefined : <UserOutlined />} alt="avatar" />
                    <span className={styles.name}>{currentUser.nick_name}</span>
                </span>
            </HeaderDropdown>
        ) : (
            <Spin
                size="small"
                style={{
                    marginLeft: 8,
                    marginRight: 8,
                    lineHeight: '64px'
                }}
            />
        )
    }
}

export default connect(({ user }) => ({
    currentUser: user.currentUser,
}))(AvatarDropdown)
