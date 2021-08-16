/* eslint-disable @typescript-eslint/camelcase */
import '@ant-design/compatible/assets/index.css'

import { Icon } from "@ant-design/compatible";
import { Button, Modal, Transfer } from 'antd'
import _ from  'lodash'
import React, { useEffect, useState } from 'react'

const TransferModal = props => {
    const {children, title, request, selValues, onOk} = props

    const [visible, setVisible] = useState(false)
    const [selectedKeys, setSelectedKeys] = useState([])
    const [targetKeys, setTargetKeys] = useState(selValues || [])
    const [dataSource, setDataSource] = useState(null)

    useEffect(() => {
        if (props.visible !== visible) {
            setVisible(props.visible)
        }

        if (selValues !== targetKeys) {
            setTargetKeys(selValues)
        }

        loadData()
    }, [props.visible, selValues])

    const loadData = async () => {
        if (!dataSource) {
            const data = await request()
            setDataSource(data)
        }
    }

    const handleSubmit = () => {
        console.log('TransferModal submit: ', targetKeys)

        // const result = []
        // for (let i=0; i<targetKeys.length; i++) {
        //     const key = targetKeys[i]
        //     const item = dataSource.find(r => r.key === key)
        //     if (item) {
        //         result.push({
        //             name: key,
        //             dis_name: item.title
        //         })
        //     }
        // }

        onOk && onOk(targetKeys)
        setVisible(false)
    }

    const handleChange = nextTargetKeys => {
        console.log('TransferModal nextTargetKeys', nextTargetKeys)
        setTargetKeys(nextTargetKeys)
    }

    const handleSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
        setSelectedKeys(_.concat(sourceSelectedKeys, targetSelectedKeys))
    }

    const filterOption = (inputValue, option) => option.title.indexOf(inputValue) > -1

    console.log('TransferModal ====> rendered')

    return (
        <>
            {children ? (
                <span onClick={() => setVisible(true)}>
                    {children}
                </span>
            ) : (
                <Button onClick={() => setVisible(true)}>
                    <Icon type="edit" /> 设置
                </Button>
            )}
            {visible ? (
                <Modal
                    key="listSelectModal"
                    centered
                    destroyOnClose
                    width={675}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title={title}
                    visible={visible}
                    onOk={() => handleSubmit()}
                    onCancel={() => setVisible(false)}
                >
                    <Transfer
                        dataSource={dataSource || []}
                        showSearch
                        filterOption={filterOption}
                        targetKeys={targetKeys}
                        selectedKeys={selectedKeys || []}
                        onChange={handleChange}
                        onSelectChange={handleSelectChange}
                        listStyle={{width: 285}}
                        render={item => item.title}
                    />
                </Modal>
            ) : null}
        </>
    )
}

export default TransferModal
