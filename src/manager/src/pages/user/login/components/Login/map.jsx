import { LockOutlined, MailOutlined, MobileOutlined, UserOutlined } from '@ant-design/icons'
import React from 'react'

import styles from './index.less'

export default {
    UserName: {
        props: {
            size: 'large',
            id: 'userName',
            prefix: <UserOutlined className={styles.prefixIcon} />,
            placeholder: '',
        },
        rules: [
            {
                required: true,
                message: '请输入用户名!',
            },
        ],
    },
    Password: {
        props: {
            size: 'large',
            prefix: <LockOutlined className={styles.prefixIcon} />,
            type: 'password',
            id: 'password',
            placeholder: '',
        },
        rules: [
            {
                required: true,
                message: '请输入密码!',
            },
        ],
    },
    Mobile: {
        props: {
            size: 'large',
            prefix: <MobileOutlined className={styles.prefixIcon} />,
            placeholder: '手机号码',
        },
        rules: [
            {
                required: true,
                message: '请输入手机号码!',
            },
            {
                pattern: /^1\d{10}$/,
                message: '手机号码无效!',
            },
        ],
    },
    Captcha: {
        props: {
            size: 'large',
            prefix: <MailOutlined className={styles.prefixIcon} />,
            placeholder: 'captcha',
        },
        rules: [
            {
                required: true,
                message: '请输入验证码!',
            },
        ],
    },
}
