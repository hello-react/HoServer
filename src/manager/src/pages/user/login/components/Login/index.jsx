import '@ant-design/compatible/assets/index.css'

import { Form } from '@ant-design/compatible'
import { Tabs } from 'antd'
import classNames from 'classnames'
import React, { Component } from 'react'

import styles from './index.less'
import LoginContext from './LoginContext'
import LoginItem from './LoginItem'
import LoginSubmit from './LoginSubmit'
import LoginTab from './LoginTab'

class Login extends Component {
    static Tab = LoginTab

    static Submit = LoginSubmit

    static defaultProps = {
        className: '',
        defaultActiveKey: '',
        onTabChange: () => {},
        onSubmit: () => {},
    }

    constructor(props) {
        super(props)
        this.state = {
            type: props.defaultActiveKey,
            tabs: [],
            active: {},
        }
    }

    onSwitch = type => {
        this.setState(
            {
                type,
            },
            () => {
                const { onTabChange } = this.props

                if (onTabChange) {
                    onTabChange(type)
                }
            },
        )
    }

    getContext = () => {
        const { form } = this.props
        const { tabs = [] } = this.state
        return {
            tabUtil: {
                addTab: id => {
                    this.setState({
                        tabs: [...tabs, id],
                    })
                },
                removeTab: id => {
                    this.setState({
                        tabs: tabs.filter(currentId => currentId !== id),
                    })
                },
            },
            form: { ...form },
            updateActive: activeItem => {
                const { type = '', active = {} } = this.state

                if (active[type]) {
                    active[type].push(activeItem)
                } else {
                    active[type] = [activeItem]
                }

                this.setState({
                    active,
                })
            },
        }
    }

    handleSubmit = e => {
        e.preventDefault()
        const { active = {}, type = '' } = this.state
        const { form, onSubmit } = this.props
        const activeFields = active[type] || []

        if (form) {
            form.validateFields(
                activeFields,
                {
                    force: true,
                },
                (err, values) => {
                    if (onSubmit) {
                        onSubmit(err, values)
                    }
                },
            )
        }
    }

    render() {
        const { className, children } = this.props
        const { type, tabs = [] } = this.state
        const TabChildren = []
        const otherChildren = []

        React.Children.forEach(children, child => {
            if (!child) {
                return
            }

            if (child.type.typeName === 'LoginTab') {
                TabChildren.push(child)
            } else {
                otherChildren.push(child)
            }
        })

        return (
            <LoginContext.Provider value={this.getContext()}>
                <div className={classNames(className, styles.login)}>
                    <Form onSubmit={this.handleSubmit}>
                        {tabs.length ? (
                            <React.Fragment>
                                <Tabs animated={false} className={styles.tabs} activeKey={type} onChange={this.onSwitch}>
                                    {TabChildren}
                                </Tabs>
                                {otherChildren}
                            </React.Fragment>
                        ) : (
                            children
                        )}
                    </Form>
                </div>
            </LoginContext.Provider>
        )
    }
}

Object.keys(LoginItem).forEach(item => {
    Login[item] = LoginItem[item]
})
export default Form.create()(Login)
