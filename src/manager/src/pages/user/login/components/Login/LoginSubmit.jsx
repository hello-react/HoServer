import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button } from 'antd'
import React from 'react'
import classNames from 'classnames'
import styles from './index.less'

const FormItem = Form.Item

const LoginSubmit = ({ className, ...rest }) => {
    const clsString = classNames(styles.submit, className)
    return (
        <FormItem>
            <Button size="large" className={clsString} type="primary" htmlType="submit" {...rest} />
        </FormItem>
    )
}

export default LoginSubmit
