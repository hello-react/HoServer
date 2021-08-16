/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import { PageHeaderWrapper } from '@ant-design/pro-layout'
import { Menu } from 'antd'
import React, { Component } from 'react'

import ConfigView from './components/Config'
import MaintainView from './components/Maintain'
import styles from './style.less'

const { Item } = Menu

class Settings extends Component {
    main = undefined

    constructor(props) {
        super(props)
        const menuMap = {
            configs: '服务配置',
            maintain: '系统维护'
        }
        this.state = {
            mode: 'inline',
            menuMap,
            selectKey: 'configs',
        }
    }

    componentDidMount() {
        window.addEventListener('resize', this.resize)
        this.resize()
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resize)
    }

    getMenu = () => {
        const { menuMap } = this.state
        return Object.keys(menuMap).map(item => <Item key={item}>{menuMap[item]}</Item>)
    }

    getRightTitle = () => {
        const { selectKey, menuMap } = this.state
        return menuMap[selectKey]
    }

    selectKey = key => {
        this.setState({
            selectKey: key,
        })
    }

    resize = () => {
        if (!this.main) {
            return
        }

        requestAnimationFrame(() => {
            if (!this.main) {
                return
            }

            let mode = 'inline'
            const { offsetWidth } = this.main

            if (this.main.offsetWidth < 641 && offsetWidth > 400) {
                mode = 'horizontal'
            }

            if (window.innerWidth < 768 && offsetWidth > 400) {
                mode = 'horizontal'
            }

            this.setState({
                mode,
            })
        })
    }

    renderChildren = () => {
        const { selectKey } = this.state

        switch (selectKey) {
        case 'configs':
            return <ConfigView />

        case 'maintain':
            return <MaintainView />

        default:
            break
        }

        return null
    }

    render() {
        const { currentUser } = this.props
        // if (!currentUser.userid) {
        //     return ''
        // }

        const { mode, selectKey } = this.state
        return (
            <PageHeaderWrapper>
                <div className={styles.main} ref={ref => {
                    if (ref) {
                        this.main = ref
                    }
                }}>
                    <div className={styles.leftMenu}>
                        <Menu mode={mode} selectedKeys={[selectKey]} onClick={({ key }) => this.selectKey(key)}>
                            {this.getMenu()}
                        </Menu>
                    </div>
                    <div className={styles.right}>
                        <div className={styles.title}>{this.getRightTitle()}</div>
                        {this.renderChildren()}
                    </div>
                </div>
            </PageHeaderWrapper>
        )
    }
}

export default Settings

