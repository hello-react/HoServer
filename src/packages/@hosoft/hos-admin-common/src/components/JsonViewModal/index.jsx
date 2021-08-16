import { Icon } from '@ant-design/compatible'
import { Button, Modal } from 'antd'
import _ from 'lodash'
import React, { useState } from 'react'
import ReactJson from "react-json-view";

export default props => {
    const {data, title, children} = props
    const [modalVisible, setModalVisible] = useState(props.visible || false)
    const [collapsed, setCollapsed] = useState(false)
    const jsonObj = _.clone(data)

    const handleClose = () => {
        setModalVisible(false)
    }

    const keys = _.keys(jsonObj)
    for (let i=0; i<keys.length; i++) {
        if (keys[i].startsWith('_')) {
            delete jsonObj[keys[i]]
        }
    }

    return (
        <>
            <a title="查看JSON" onClick={() => setModalVisible(true)}>
                {children || <Icon type="file-text" />}
            </a>
            {modalVisible ? (
                <Modal
                    centered
                    visible
                    destroyOnClose
                    maskClosable
                    width={800}
                    bodyStyle={{ maxHeight: 600, paddingRight: 50, overflow: 'scroll', backgroundColor: '#fff' }}
                    title={(
                        <>
                            {title || '查看JSON'}
                            <a style={{marginLeft: '10px', fontSize: '14px'}} onClick={() => setCollapsed(!collapsed)}>
                                <Icon type={collapsed ? 'plus-square' : 'minus-square'} />{' '}
                                {collapsed ? '展开' : '收起'}
                            </a>
                        </>
                    )}
                    onCancel={handleClose}
                    footer={
                        <Button type="primary" onClick={handleClose}>
                            关闭
                        </Button>
                    }
                >
                    <ReactJson
                        src={jsonObj}
                        name={false}
                        collapseStringsAfterLength={50}
                        collapsed={collapsed}
                        displayObjectSize={false}
                        displayDataTypes={false}
                        enableClipboard={false}
                    />
                </Modal>
            ) : null}
        </>
    )
}
