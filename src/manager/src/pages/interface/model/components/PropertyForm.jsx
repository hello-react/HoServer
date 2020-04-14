/* eslint-disable eqeqeq,no-eval,no-restricted-globals,react/jsx-boolean-value */
/**
 * HoServer Manager Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 * author: Jack Zhang
 * */
import '@ant-design/compatible/assets/index.css'

import {Form as LegacyForm, Icon} from "@ant-design/compatible";
import {Button, Col, Input, InputNumber, message, Modal, Row, Select, Switch} from 'antd'
import _ from 'lodash'
import React, {useEffect, useImperativeHandle, useRef, useState} from 'react'

import InterfaceService from '@/services/interface'
import ModelService from '@/services/model'
import prompt from "@/third/antd-prompt"
import Constants from "@/utils/constants"

import {getDictionaryDetail} from "../../dictionary/service"
import PropertiesList from "./PropertiesList"

const {API_FIELD_TYPE} = Constants
const objectTypes = [API_FIELD_TYPE.array, API_FIELD_TYPE.mix, API_FIELD_TYPE.object, API_FIELD_TYPE["array-of-object"]]
const supportRelationTypes = [API_FIELD_TYPE.objectId, API_FIELD_TYPE.number, API_FIELD_TYPE.char,
    API_FIELD_TYPE["array-of-number"], API_FIELD_TYPE["array-of-char"], API_FIELD_TYPE["array-of-objectId"]]

const PropertyForm = LegacyForm.create()(props => {
    const {getFieldDecorator} = props.form
    const {level, editMode, propMeta, formRef} = props

    const [propertyList, setPropertyList] = useState([])
    const [relations, setRelations] = useState({})
    const [selModelProps, setSelModelProps] = useState([])
    const [propType, setPropType] = useState('')
    const [unique, setUnique] = useState(false)

    const isObjectType = objectTypes.indexOf(propType) > -1
    const isAuto = propType === 'auto'
    const isEnum = propType === 'enum'
    const mapType = propType.indexOf('array') > -1 ? propType.substr('array-of-'.length) : propType

    let dataTypes = InterfaceService.getDataTypes()
    if (level > 0) {
        dataTypes = dataTypes.filter(t => t.value !== 'auto')
    }

    const thisRef = useRef({})

    useImperativeHandle(formRef, () => ({
        getFormFields: callback => {
            getFormValues(callback)
        }
    }))

    useEffect(() => {
        setRelations({})
        setSelModelProps([])
        setUnique(false)
        setPropType('')
        initForm()
    }, [editMode, propMeta])

    const loadSystemData = async () => {
        thisRef.current.modelList = (await InterfaceService.getModelList())
        thisRef.current.dictList = (await InterfaceService.getDictionaryList())
        thisRef.current.selDictValues = []
    }

    const checkUnique = (properties) => {
        const propList = _.concat([], properties)
        let hasUnique = false
        for (const prop of propList) {
            if (prop.unique) {
                hasUnique = true
                break
            }
        }

        if (!hasUnique) {
            propList.splice(0, 0, {
                "unique" : true,
                "index" : true,
                "properties" : null,
                "require" : false,
                "name" : "id",
                "dis_name" : "Id",
                "prop_type" : API_FIELD_TYPE.objectId
            })
        }

        return propList
    }

    const initForm = async () => {
        await loadSystemData()

        if (editMode === 1) {
            props.form.resetFields()
            return
        }

        setPropertyList(_.concat([], propMeta.properties || []))

        const fields = {...propMeta}
        const relType = (_.get(fields, ['relations', 'rel_type'], 0) || 0) / 1
        let curModelProps = []
        let curRelations = {}

        if (relType == 2 || relType == 3) {
            fields.prop_type = 'enum'
        } else if (fields.auto_increment) {
            fields.prop_type = 'auto'
        }

        setUnique(fields.unique)
        setPropType(fields.prop_type)

        if (relType) {
            if (relType == 1 && fields.relations.name) {
                const selModel = await ModelService.getModelMeta(fields.relations.name)
                curModelProps = selModel ? selModel.properties : []
            } else if (relType === 3) {
                const dictDetail = await getDictionaryDetail(fields.relations.name)
                const selDictValues = {}
                for (const item of dictDetail.values) {
                    selDictValues[item.key] = item.value
                }
                thisRef.current.selDictValues = selDictValues
            }

            curRelations = fields.relations || {}
        }

        const propList = checkUnique(curModelProps)
        setSelModelProps(propList)

        await setSelModelProps(propList)
        await setRelations(curRelations)

        delete fields.id
        delete fields.auto_increment

        props.form.setFieldsValue(fields)
    }

    const handleInputEnum = async () => {
        const enumStr = await prompt({
            title: "输入字典枚举",
            initialValue: relations.name || '',
            inputProps: {placeholder: "形式如 key: value，每行一个，也可以直接输入 JSON"},
            multiline: true
        })

        let enumValue
        if (enumStr.trim()) {
            try {
                console.log('handleInputEnum enumStr: ', enumStr)
                enumValue = eval(`(${ enumStr })`)
            } catch {
                message.info('你输入的不是 JSON，尝试按 key=value 提取')
                const lines = enumStr.split(/[\r\n]/g)
                const result = {}
                for (const line of lines) {
                    const parts = line.split(/[:：=]/g)
                    if (parts.length === 2) {
                        const key = parts[0].trim()
                        const value = parts[1].trim()
                        if (key && value) {
                            result[key] = value
                        }
                    }
                }

                enumValue = _.keys(result).length > 0 ? result : null
            }
        }

        if (enumValue) {
            relations.rel_type = 2
            relations.name = JSON.stringify(enumValue)
            setRelations({...relations})
        } else {
            message.info('不是有效字典格式，请检查输入')
        }
    }

    const getFormValues = callback => {
        props.form.validateFields(async (err, values) => {
            if (err) return

            // auto_increment
            values.auto_increment = false
            if (isAuto) {
                values.prop_type = 'number'
                values.auto_increment = true
                values.unique = true
                values.index = true
                values.require = true
                values.search_flag = 1
            } else if (isEnum) {
                if (!(relations && relations.name)) {
                    return message.info('请设置枚举关联属性')
                }

                let enumValues
                const dict = thisRef.current.dictList.find(d => d.name === relations.name)

                if (dict) {
                    relations.rel_type == 3
                    enumValues = thisRef.current.selDictValues
                } else if (typeof relations.name === 'string') {
                    relations.rel_type == 2
                    try {
                        enumValues = JSON.parse(relations.name)
                    } catch(e) {
                        enumValues = eval(`(${ relations.name })`)
                    }
                }

                if (enumValues) {
                    if (values.default_val && _.keys(enumValues).indexOf(values.default_val) < 0) {
                        console.log('handleSubmit value not in enum list: ', _.keys(enumValues), values.default_val)
                        return message.info('默认值不在枚举列表中')
                    }

                    let enumType = 'number'
                    if (relations.rel_type === 3) {
                        enumType = 'char'
                    } else {
                        const keys = _.keys(enumValues)
                        for (let i = 0; i < keys.length; i++) {
                            const key = keys[i]
                            const val = enumValues[key]
                            if (isNaN(parseInt(val, 10))) {
                                enumType = 'char'
                                break
                            }
                        }
                    }

                    values.prop_type = enumType
                } else {
                    return message.info('枚举值设置有误')
                }
            }

            if (unique) {
                if (values.index === undefined) {
                    values.index = true
                }
                values.require = true
            } else if (isObjectType) {
                values.index = false
            }

            // search_flag
            if(values.search_flag === 2 && propType !== 'char') {
                values.search_flag = undefined
            }

            if (values.search_flag === undefined && !isObjectType) {
                values.search_flag = 1
            }

            // properties
            values.properties = isObjectType ? propertyList : null

            // input_flag
            if (isNaN(parseInt(values.input_flag, 10))) {
                values.input_flag = 1
            }

            // output_flag
            if (isNaN(parseInt(values.output_flag, 10))) {
                values.output_flag = 1
            }
            // relations
            values.relations = !(isObjectType || isAuto) ? relations : null
            if (relations && relations.rel_type === 1 && !(relations.name && relations.field)) {
                return message.info('请选择关联对象和字段')
            }

            if (relations && relations.rel_type === 0) {
                values.relations = null
            }

            callback(values)
        })
    }

    console.log(`PropertyForm ====> rendered (${level}): ${propMeta.dis_name}`)

    return (
        <LegacyForm {...Constants.DEF_FORM_ITEM_LAYOUT} layout="horizontal">
            <LegacyForm.Item required label="属性名称">
                {getFieldDecorator('name', {
                    rules: [
                        {required: true, message: '属性名称必填'},
                        {pattern: '^([A-Za-z0-9_\\-]){1,}$', message: '只允许英文字母数字和下划线'}
                    ]
                })(<Input placeholder="请输入英文字母数字和下划线" />)}
            </LegacyForm.Item>
            <LegacyForm.Item required label="显示名称">
                {getFieldDecorator('dis_name', {
                    rules: [{required: true, message: '显示名称必填'}]
                })(<Input placeholder="请输入" />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="数据类型" extra="自动增长类型是在应用层实现，MongoDb 数据库本身并不支持自动增长类型，如数据量较大，或存在并发写入，集群部署的场景，都不建议使用">
                {getFieldDecorator('prop_type', {
                    rules: [{required: true, message: '数据类型必填'}]
                })(
                    <Select placeholder="请选择" onChange={value => {
                        setPropType(value)
                        if (value === 'enum') {
                            relations.rel_type = 2
                            setRelations({...relations})
                        }
                    }}>
                        {dataTypes.map(c => (
                            <Select.Option key={c.value} value={c.value}>{c.text}</Select.Option>
                        ))}
                    </Select>
                )}
            </LegacyForm.Item>
            {isEnum ? (
                <LegacyForm.Item label="关联字典">
                    <Row gutter={8}>
                        <Col span={8}>
                            <Select value={relations.rel_type == 3 ? relations.name : ''} placeholder="选择字典" onChange={async value => {
                                relations.rel_type = value ? 3 : 2
                                relations.name = value
                                setRelations({...relations})

                                if (value) {
                                    const dictDetail = await getDictionaryDetail(value)
                                    const selDictValues = {}
                                    for (const item of dictDetail.values) {
                                        selDictValues[item.key] = item.value
                                    }
                                    thisRef.current.selDictValues = selDictValues
                                }
                            }}>
                                <Select.Option value="">请选择</Select.Option>
                                {thisRef.current.dictList && thisRef.current.dictList.map(p => (
                                    <Select.Option key={p.name} value={p.name}>{p.dis_name}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col span={8}>
                            <Button disabled={relations.rel_type != 2} onClick={handleInputEnum}>
                                输入字典枚举
                            </Button>
                        </Col>
                        <Col span={8} />
                    </Row>
                </LegacyForm.Item>
            ) : null}
            {isObjectType ? (
                <LegacyForm.Item label="子属性列表" extra="尽量减少嵌套子对象层次，便于开发维护">
                    <PropertiesList level={level+1} modelMeta={{...propMeta, properties: propertyList}} editMode={editMode} onOk={values => {
                        setPropertyList(values)
                    }} />
                </LegacyForm.Item>
            ) : null}
            {isAuto || [API_FIELD_TYPE.objectId, API_FIELD_TYPE.number, API_FIELD_TYPE.char].includes(propType) ? (
                <LegacyForm.Item label="是否唯一">
                    {getFieldDecorator('unique')(<Switch defaultChecked={propMeta.unique} onChange={value => setUnique(value)} />)}
                </LegacyForm.Item>
            ) : null}
            {propType === 'char' || propType === 'number' ? (
                <LegacyForm.Item label="长度">
                    {getFieldDecorator('width')(<InputNumber min={1} />)}
                </LegacyForm.Item>
            ) : null}
            {(!isObjectType && propType.indexOf('array') < 0) ? (
                <LegacyForm.Item label="默认值">
                    <Row gutter={8}>
                        <Col span={8}>
                            {getFieldDecorator('default_val')(<Input />)}
                        </Col>
                        <Col span={8}>
                            <Select placeholder="常用默认值" onChange={value => {
                                props.form.setFieldsValue({default_val: value})
                            }}>
                                <Select.Option value="current_user_id">当前登录用户Id</Select.Option>
                                <Select.Option value="now">当前时间</Select.Option>
                            </Select>
                        </Col>
                        <Col span={8} />
                    </Row>
                </LegacyForm.Item>
            ) : null}
            {!isAuto ? (
                <LegacyForm.Item label="输入选项" extra="用于创建记录时数据检查">
                    {getFieldDecorator('input_flag')(
                        // 0: 禁止输入，1: 可选输入，2: 必须输入，3: 强制使用默认值
                        <Select placeholder="请选择" defaultValue={1}>
                            <Select.Option value={0}>禁止输入</Select.Option>
                            <Select.Option value={1}>可选输入</Select.Option>
                            <Select.Option value={2}>必须输入</Select.Option>
                            {!isObjectType ? (
                                <Select.Option value={3}>强制使用默认值</Select.Option>
                            ) : null}
                        </Select>
                    )}
                </LegacyForm.Item>
            ) : null}
            {!(isObjectType || isAuto || isEnum) ? (
                <LegacyForm.Item label="查询选项">
                    {getFieldDecorator('search_flag')(<Select placeholder="请选择">
                        <Select.Option value={0}>禁止查询</Select.Option>
                        <Select.Option value={1}>精确匹配</Select.Option>
                        {propType === 'char' ? (
                            <Select.Option value={2}>模糊搜索 (仅用于字符型)</Select.Option>
                        ) : null}
                        {isObjectType ? (
                            <Select.Option value={3}>强制使用默认值</Select.Option>
                        ) : null}
                    </Select>)}
                </LegacyForm.Item>
            ) : null}
            <LegacyForm.Item label="输出选项" extra="设为默认不输出时，查询列表时不输出，查询记录详情时仍输出">
                {getFieldDecorator('output_flag')(
                    <Select defaultValue={1} placeholder="请选择">
                        <Select.Option value={0}>禁止输出</Select.Option>
                        <Select.Option value={1}>默认输出</Select.Option>
                        <Select.Option value={2}>默认不输出</Select.Option>
                        {isObjectType ? (
                            <Select.Option value={3}>根据子属性输出选项自动设置</Select.Option>
                        ) : null}
                    </Select>
                )}
            </LegacyForm.Item>
            {!(isObjectType || isAuto) ? (
                <LegacyForm.Item label="索引类型" extra={
                    <span>
                        复杂索引请手工配置 <a href="https://docs.mongodb.com/manual/indexes/" target="_blank" rel="noopener noreferrer">官方文档</a>
                    </span>
                }>
                    {getFieldDecorator('index')(
                        <Select defaultValue={false}  placeholder="请选择">
                            <Select.Option value={false}>无索引</Select.Option>
                            <Select.Option value={true}>默认索引</Select.Option>
                            {propType === 'char' ? (
                                <Select.Option value="hashed">哈希索引 (hashed)</Select.Option>
                            ) : null}
                            {propType === 'char' ? (
                                <Select.Option value="text">全文索引 (text)</Select.Option>
                            ) : null}
                        </Select>
                    )}
                </LegacyForm.Item>
            ) : null}
            {supportRelationTypes.indexOf(propType) > -1 ? (
                <LegacyForm.Item label="关联对象" extra="查询数据时可自动将关联对象数据一并输出，便于客户端操作">
                    <Row gutter={8}>
                        <Col span={8}>
                            <Select value={relations.rel_type == 1 ? 1 : 0} placeholder="请选择" onChange={value => {
                                relations.rel_type = value
                                setRelations({...relations})
                            }}>
                                <Select.Option value={0}>无关联</Select.Option>
                                <Select.Option value={1}>关联对象属性</Select.Option>
                            </Select>
                        </Col>
                        <Col span={8}>
                            <Select value={relations.rel_type == 1 ? relations.name : ''} placeholder="关联对象" disabled={relations.rel_type != 1} onChange={async value => {
                                const selModel = await ModelService.getModelMeta(value)
                                relations.name = selModel.name
                                setRelations({...relations})

                                const propList = checkUnique(selModel.properties)
                                setSelModelProps(propList)
                            }}>
                                <Select.Option value="">请选择对象</Select.Option>
                                {thisRef.current.modelList && thisRef.current.modelList.map(m => (
                                    <Select.Option key={m.name} value={m.name}>{m.dis_name} [{m.name}]</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col span={8}>
                            <Select
                                value={relations.rel_type == 1 ? relations.field : ''}
                                placeholder={!propType ? '请先设置数据类型' : `对象属性(${mapType}类型)`}
                                disabled={!(selModelProps && selModelProps.length > 0)}
                                onChange={value => {
                                    relations.field = value
                                    setRelations({...relations})
                                }}
                            >
                                <Select.Option value="">请选择对象属性</Select.Option>
                                {selModelProps && selModelProps.map(p => p.prop_type === mapType ? (
                                    <Select.Option key={p.name} value={p.name}>{p.dis_name} [{p.name}]</Select.Option>
                                ) : null)}
                            </Select>
                        </Col>
                    </Row>
                </LegacyForm.Item>
            ) : null}
            <LegacyForm.Item label="显示顺序">
                {getFieldDecorator('order')(<InputNumber min={0} />)}
            </LegacyForm.Item>
            <LegacyForm.Item label="备注">
                {getFieldDecorator('description')(<Input.TextArea placeholder="请输入" />)}
            </LegacyForm.Item>
        </LegacyForm>
    )
})

const PropertyFormModal = props => {
    const {level, children, editMode, propMeta, onOk} = props

    const [visible, setVisible] = useState(false)
    const formRef = React.createRef()

    const handleSubmit = () => {
        formRef.current.getFormFields(values => {
            console.log('PropetyForm submit: ', values)

            onOk && onOk(values, propMeta)
            setVisible(false)
        })
    }

    return (
        <>
            {children ? (
                <span onClick={() => setVisible(true)}>
                    {children}
                </span>
            ) : (
                <Button onClick={() => setVisible(true)}>
                    <Icon type={!editMode ? 'eye' : 'edit'} /> {!editMode ? '查看' : '设置'}
                </Button>
            )}
            {visible ? (
                <Modal
                    key="propEditModal"
                    centered
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title={`${!editMode ? '查看' : '编辑'}属性列表`}
                    visible
                    footer={!editMode ? <Button type="primary" onClick={() => setVisible(false)}>关闭</Button> : undefined}
                    onOk={() => handleSubmit()}
                    onCancel={() => setVisible(false)}
                >
                    <PropertyForm level={level} formRef={formRef} editMode={editMode} propMeta={propMeta} />
                </Modal>
            ) : null}
        </>
    )
}

export default PropertyFormModal
