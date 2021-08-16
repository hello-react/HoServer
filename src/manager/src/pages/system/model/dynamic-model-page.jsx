/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/09/20
 */
import { Common } from "@hosoft/hos-admin-common"
import { Result } from 'antd'
import _ from 'lodash'
import React from 'react'

const DynamicModelPage = props => {
    const modelName = _.get(props, ['match', 'params', 'model_name'])
    const modelContents = []
    Common.pluginManager().onRenderHook('ModelContent', modelContents, modelName)

    if (modelContents.length === 0) {
        return (
            <Result title="请先安装自动生成管理页面插件" />
        )
    }

    return modelContents.map(item => (
        <div key={item.name}>
            {item.content}
        </div>
    ))
}

export default DynamicModelPage
