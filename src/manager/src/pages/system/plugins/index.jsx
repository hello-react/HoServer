/* eslint-disable no-underscore-dangle,eqeqeq */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import {Form as LegacyForm} from '@ant-design/compatible'
import {Common, TableLayout} from '@hosoft/hos-admin-common'
import {Modal, Popover, Switch, Typography} from 'antd'
import _ from 'lodash'
import moment from 'moment'
import React, { useState} from 'react'

import PluginManager from '@/utils/plugin-manager'

import {enablePlugin} from "./service"

const { Text } = Typography

const defTableColumns = Common.setDefaultColumn([
    {
        title: '名称',
        dataIndex: 'name',
        ellipse: false
    },
    {
        title: '版本',
        dataIndex: 'version',
        align: 'center',
        width: 50
    },
    {
        title: '安装路径',
        dataIndex: 'dir',
        width: 150,
        render: (value, row) => {
            let pluginDir = ''
            const tips = []
            for (const pkg of row.packages) {
                if (!pluginDir) {
                    pluginDir = pkg.dir
                }

                tips.push(pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1))
                tips.push(pkg.dir)
                tips.push('')
            }

            return (
                <Popover content={tips.map(t => t ? <div>{t}</div> : <br />)} title="安装路径">
                    {pluginDir}
                </Popover>
            )
        }
    },
    {
        title: '说明',
        dataIndex: 'dis_name',
        width: 150,
        render: (value, row) => {
            return _.get(row, ['packages', 0, 'dis_name'])
        }
    },
    {
        title: '过期时间',
        dataIndex: 'expire_time',
        align: 'center',
        width: 100,
        render: text => {
            if (!text) return ''
            let textType = 'success'
            const expireTime = moment(text)
            const diff = moment().diff(expireTime, 'days')
            if (diff > 0) {
                textType = 'danger'
            } else if (diff >= -3) {
                textType = 'warning'
            }

            return (
                <Text mark={textType === 'warning'} type={textType}>
                    {expireTime.format('YYYY/MM/DD HH:mm:ss')}
                </Text>
            )
        }
    },
    {
        title: '是否启用',
        dataIndex: 'enabled',
        valueType: 'boolean'
    }
])


const PluginSwitch = props => {
    const {plugin} = props
    const [checked, setChecked] = useState(plugin.enabled == 1)

    const handleEnablePlugin = async enabled => {
        return enablePlugin(plugin, enabled)
    }

    const handleChange = async value => {
        Modal.confirm({
            content: `确定${value ? '启用' : '禁用'}插件？`,
            onOk: async () => {
                if (plugin.enabled == 2) {
                    return
                }

                const result = await handleEnablePlugin(value)
                if (!result) {
                    return setChecked(!value)
                }

                let hasServer = false
                let hasManager = false
                plugin.packages.forEach(p => {
                    if (p.type === 'server') {
                        hasServer = true
                    } else if (p.type === 'manager') {
                        hasManager = true
                    }
                })

                let restartTip = '重新运行'
                if (hasServer) {
                    restartTip += '后台服务'
                }
                if (hasManager) {
                    restartTip += `${hasServer ? '和' : ''}管理平台`
                }

                Modal.success({content: `插件${value ? '启用' : '禁用'}成功，${restartTip}后生效`})
                plugin.enabled = value
                setChecked(value)
            },
            onCancel: () => {
                setChecked(!value)
            }
        })
    }

    return <Switch checked={checked} disabled={plugin.enabled == 2} onChange={handleChange} />
}


class PluginManage extends TableLayout {
    constructor() {
        super()
        this.modelName = 'Plugin'
    }

    loadData = async () => {
        const data = await PluginManager.getPluginList()

        return {
            success: true,
            data,
            pagination: null
        }
    }

    extraOperationRender = plugin => {
        return (
            <PluginSwitch key={plugin.name} plugin={plugin} />
        )
    }

    getOptions = () => {
        return {
            edit: false,
            delete: false,
            viewJson: false,
            rowSelection: false
        }
    }

    getTableColumns = () => {
        return _.concat([], defTableColumns)
    }
}

export default LegacyForm.create()(PluginManage)
