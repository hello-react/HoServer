/* eslint-disable react/no-array-index-key */
import {Icon} from "@ant-design/compatible";
import {Button, Descriptions, Modal, Tag} from 'antd'
import _ from  'lodash'
import moment from 'moment'
import React, {useState} from 'react'

import Constants from '@/utils/constants'

const ObjectInfo = props => {
    const {children, text, modelMeta, customMeta, modelInstance} = props
    const [visible, setVisible] = useState(false)

    if (_.get(modelMeta, 'properties', []).length === 0) {
        return null
    }

    return (
        <>
            {children ? (
                <span onClick={() => setVisible(true)}>
                    {children}
                </span>
            ) : (
                <span onClick={() => setVisible(true)} style={{cursor: 'pointer'}}>
                    <Icon type="zoom-in" style={{color: '#1890ff'}} /> {text}
                </span>
            )}
            {visible ? (
                <Modal
                    centered
                    visible
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title={modelMeta.dis_name}
                    footer={<Button type="primary" onClick={() => setVisible(false)}>关闭</Button>}
                    onCancel={() => setVisible(false)}
                >
                    <Descriptions column={1} bordered>
                        {modelMeta.properties.map(p => {
                            const propMeta = p
                            const propInstance = modelInstance[p.name]

                            switch (propMeta.prop_type) {
                            case Constants.API_FIELD_TYPE.boolean:
                                return (
                                    <Descriptions.Item key={p.name} label={propMeta.dis_name}>
                                        {String(propInstance) === 'true' ? '是' : '否'}
                                    </Descriptions.Item>
                                )
                            case Constants.API_FIELD_TYPE.date:
                                return (
                                    <Descriptions.Item key={p.name} label={propMeta.dis_name}>
                                        {propInstance ? moment(propInstance).format('YYYY-MM-DD HH:mm') : ''}
                                    </Descriptions.Item>
                                )
                            case Constants.API_FIELD_TYPE["array-of-boolean"]:
                            case Constants.API_FIELD_TYPE["array-of-char"]:
                            case Constants.API_FIELD_TYPE["array-of-number"]:
                            case Constants.API_FIELD_TYPE["array-of-objectId"]:
                                return (
                                    <Descriptions.Item key={p.name} label={propMeta.dis_name}>
                                        {(propInstance || []).map((v, idx) => (
                                            <Tag key={`${p.name}${idx}`}>{v}</Tag>
                                        ))}
                                    </Descriptions.Item>
                                )
                            case Constants.API_FIELD_TYPE.char:
                            case Constants.API_FIELD_TYPE.number:
                            case Constants.API_FIELD_TYPE.objectId:
                                return (
                                    <Descriptions.Item key={p.name} label={propMeta.dis_name}>
                                        {propInstance ? String(propInstance) : ''}
                                    </Descriptions.Item>
                                )
                            default:
                                if (_.get(propMeta, 'properties', []).length > 0) {
                                    if (propMeta.prop_type.indexOf('array') > -1 && customMeta && customMeta[propMeta.name]) {
                                        const renderFunc = customMeta[propMeta.name]
                                        return (
                                            <Descriptions.Item key={p.name} label={propMeta.dis_name}>
                                                {renderFunc(propInstance)}
                                            </Descriptions.Item>
                                        )
                                    }

                                    return (
                                        <Descriptions.Item key={p.name} label={propMeta.dis_name}>
                                            <ObjectInfo modelMeta={propMeta} modelInstance={propInstance} text="查看..." />
                                        </Descriptions.Item>
                                    )
                                }

                                return (
                                    <Descriptions.Item key={p.name} label={propMeta.dis_name}>
                                        {propInstance ? String(propInstance) : ''}
                                    </Descriptions.Item>
                                )
                            }
                        })}
                    </Descriptions>
                </Modal>
            ) : null}
        </>
    )
}

export default ObjectInfo
