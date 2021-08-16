/* eslint-disable react/jsx-boolean-value */
import './index.less'

import {Form as LegacyForm, Icon} from "@ant-design/compatible";
import {Button, Col, Input, Row, Select} from 'antd'
import _ from 'lodash'
import React, {useRef, useState} from 'react'

import RangePicker from '../RangePicker'

const { Option } = Select

const SearchButtons = props => {
    const {columns, onSearch} = props
    const [expand, setExpand] = useState(false)
    const searchFieldsRef = useRef({})

    const {getFieldDecorator} = props.form

    const renderFormField = column => {
        let fieldComp
        switch(column.valueType) {
        case 'boolean':
            fieldComp = (
                <Select placeholder="请选择">
                    <Option value={true}>是</Option>
                    <Option value={false}>否</Option>
                </Select>
            )
            break
        case 'dateTime':
            fieldComp = (
                <RangePicker onChange={value => {
                    console.log('selected date range: ', value)
                    props.form.setFieldsValue({[column.dataIndex]: value})
                }} />
            )
            break
        case 'option':
            fieldComp = (
                <Select placeholder="请选择">
                    {column.filters.map(o => (
                        <Option key={o.value} value={o.value}>{o.text}</Option>
                    ))}
                </Select>
            )
            break
        case 'text':
        default:
            fieldComp = <Input placeholder="请输入" />
            break
        }

        return fieldComp
    }

    const renderSearchFields = tableColumns => {
        const children = [];
        let index = 0
        for (let i = 0; i < tableColumns.length; i++) {
            const column = tableColumns[i]
            if (column.valueType === 'operation' || column.valueType === 'index') {
                continue
            }

            if (column.searchFlag > 0) {
                children.push(
                    <Col span={8} key={`sch${column.dataIndex}`}>
                        <LegacyForm.Item label={column.title} labelAlign={expand ? 'right' : 'left'} labelCol={{span: 6}}>
                            {getFieldDecorator(column.dataIndex)(renderFormField(column))}
                        </LegacyForm.Item>
                    </Col>
                )

                index++
                if (!expand && index > 1) {
                    break
                }
            }
        }

        if (index === 1) {
            children.push(
                <Col span={8} key='fillGap' />
            )
        }

        return children.length > 0 ? children : null
    }

    const renderSearchButtons = tableColumns => {
        return (
            <Col span={(expand && tableColumns.length > 2) ? 24: 8} style={{ textAlign: 'right' }}>
                {tableColumns.length > 2 ? (
                    <a style={{ marginRight: 10, fontSize: 12 }} onClick={() => setExpand(!expand)}>
                        {expand ? '收起' : '展开'} <Icon type={expand ? 'up' : 'down'} />
                    </a>
                ) : null}
                <Button type="primary" onClick={handleSubmit}>
                    搜索
                </Button>
                <Button style={{ marginLeft: 8 }} onClick={handleReset}>
                    重置
                </Button>
            </Col>
        )
    }

    const handleSubmit = () => {
        const fields = props.form.getFieldsValue()
        // if (Object.keys(fields).length > 0 && !_.isEqual(fields, searchFieldsRef.current))

        searchFieldsRef.current = fields
        onSearch && onSearch(fields)
    }

    const handleReset = () => {
        props.form.resetFields()
        handleSubmit()
    }

    const searchFields = renderSearchFields(columns)
    if (!searchFields) {
        return null
    }

    return (
        <LegacyForm className="ho_tbl_search">
            {
                <Row>
                    { searchFields }
                    { !expand ? renderSearchButtons(columns) : (null) }
                </Row>
            }
            {
                expand ? (
                    <Row>{ renderSearchButtons(columns) }</Row>
                ) : (null)
            }
        </LegacyForm>
    )
}

export default LegacyForm.create()(SearchButtons)
