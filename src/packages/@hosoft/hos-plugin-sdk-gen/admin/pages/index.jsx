/* eslint-disable no-underscore-dangle */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import { Icon } from "@ant-design/compatible"
import { Common, TableLayout } from '@hosoft/hos-admin-common'
import { prompt } from '@hosoft/hos-admin-common'
import { ApiService, ModelService } from "@hosoft/hos-admin-common"
import { Popover, Tag } from "antd"
import _ from "lodash"
import React from 'react'

import ApiForm from "../components/ApiForm"
import GenSdkModal from "../components/GenSdkModal"

const tagColor = {
    GET: 'blue',
    POST: 'orange',
    DELETE: 'red'
}

const getRowStyle = row => {
    if (row.disabled) {
        return 'ho_disable_api'
    }

    return ''
}

const defTableColumns = Common.setDefaultColumn([
    {
        title: "分类",
        dataIndex: "category_name",
        ellipsis: false,
        width: 200,
        render: (text, row) => {
            if (row._level === 1) {
                return <span><Icon type='folder'/> {row.main_catname || row.main_cat}</span>
            }

            if (row._level === 2) {
                return <span><Icon type='file_text'/>  {row.second_catname || row.second_cat}</span>
            }

            return ''
        }
    },
    {
        title: "SDK函数名",
        dataIndex: "name",
        ellipsis: false,
        width: 200
    },
    {
        title: "说明",
        dataIndex: "dis_name",
        ellipsis: false,
        width: 200,
        render: (text, row) => {
            if (row._level === 1) {
                return <Tag size="large">{row.main_catname || '默认分类'}</Tag>
            }

            return text
        }
    },
    {
        title: "方法",
        dataIndex: "method",
        ellipsis: false,
        align: "center",
        width: 75,
        render: (text, row) => {
            return row._level === 1 ? '' : <Tag color={tagColor[row.method]} style={{width: 60}}>{text}</Tag>
        }
    },
    {
        valueType: "text",
        title: "路由",
        dataIndex: "path",
        width: 300,
        render: (text, row) => {
            if (row._level === 1) {
                return ''
            }

            return (
                <span className={`ho_api_path ${getRowStyle(row)}`}>
                    {row.path}
                </span>
            )
        }
    }
])

class ApiSdkManage extends TableLayout {
    constructor() {
        super()

        this.modelName = 'Api'
        this.delayRender = true

        defTableColumns[1].render = (text, row) => {
            if (row._level === 1) {
                return <span className="ho_api_sub">包含 {row.count} 个函数</span>
            }

            if (!row.name) {
                return (
                    <span className="ho_api_path">
                        <span style={{color: 'red'}}>未命名请设置</span> <Icon type="edit" onClick={() => this.handleChangeFuncName(row.id, row.name)}/>
                    </span>
                )
            }

            return row.is_auto_name ? (
                <Popover content="名称为系统自动生成，如果需要请修改" className="ho_api_path ho_auto_name">
                    {row.name} <Icon type="edit" onClick={() => this.handleChangeFuncName(row.id, row.name)} />
                </Popover>
            ) : (
                <span className="ho_api_path">
                    {row.name} <Icon type="edit" onClick={() => this.handleChangeFuncName(row.id, row.name)} />
                </span>
            )
        }
    }

    loadData = async params => {
        params.page_size = 30
        const result = await ModelService.getModelDataListTable(this.modelName, params)
        const data = _.get(result, 'data', [])

        this.subTitle = `共有 Api 接口函数 ${_.get(result, ['pagination', 'total'])} 个`

        let preMain = {}
        let preSecond = {}
        for (let i=0; i<data.length; i++) {
            const row = data[i]
            const parts = row.category_name.split('/')
            const mainCat = parts[0]
            const secondCat = parts.length > 1 ? parts[1] : ''

            if (mainCat === preMain.main_cat && secondCat === preSecond.second_cat) {
                if (!preSecond.children) {
                    preSecond.children = []
                }

                preSecond.children.push(row)
                row._level = 3
                row._removed = true
            } else if (mainCat === preMain.main_cat) {
                preSecond = row

                if (!preMain.children) {
                    preMain.children = []
                }

                preMain.children.push(row)
                row._level = 2
                row._removed = true
            } else {
                const secondRow = _.clone(row)
                secondRow._level = 2
                row._level = 1
                row.children = [
                    secondRow
                ]

                preMain = row
                preSecond = secondRow
            }

            // debugger
        }

        const newData = []
        for (let i=0; i<data.length; i++) {
            const row = data[i]
            if (!row._removed) {
                newData.push(row)
            }
        }

        _.set(result, 'data', newData)
        return result
    }

    getOptions = () => {
        return {
            rowSelection: null,
            import: false,
            edit: true,
            delete: false,
            viewJson: false,
            toolBarRender: () => {
                return [ <GenSdkModal key="genSdkModal" /> ]
            }
        }
    }

    getTableColumns = () => {
        return _.concat([], defTableColumns)
    }

    getFormComponent = () => {
        return ApiForm
    }

    handleSubmit = async (editMode, newModel, existModel) => {
        const result = await ApiService.updateApi(existModel.id, newModel)
        if (result) {
            this.reloadData()
        }
    }

    handleChangeFuncName = async (id, initialValue) => {
        const apiName = await prompt({
            title: "修改函数名称",
            label: '函数名称',
            initialValue,
            inputProps: {placeholder: "请输入函数名称"},
            rules: [
                {required: true, message: "函数名称不能为空"},
                {pattern: '^([A-Za-z0-9_]){1,}$', message: '只允许英文字母数字和下划线'}
            ]
        })

        if (apiName) {
            const result = await ApiService.setApiName(id, apiName)
            if (result) {
                this.reloadData()
            }
        }
    }
}

export default ApiSdkManage
