/* eslint-disable @typescript-eslint/camelcase */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import '@ant-design/compatible/assets/index.css'

import { Button, Col, message, Modal, Row, Select } from 'antd'
import SdkService from "../services/sdk"
import _ from 'lodash'
import React, {useEffect, useState} from 'react'

const GenSdkModal = props => {
    const {children} = props

    const [visible, setVisible] = useState(false)
    const [versionInfo, setVersionInfo] = useState({})
    const [loading, setLoading] = useState(false)
    const [language, setLanguage] = useState('js-antd-pro')

    useEffect(() => {
        if (visible) {
            loadInfo()
        }
    }, [visible])

    const loadInfo = async () => {
        const sdkVersionInfo = await SdkService.getClientSdkInfo()
        setVersionInfo(sdkVersionInfo || {})
    }

    const generateClientSdk = async () => {
        setLoading(true)

        const result = await SdkService.generateClientSdk(language)
        if (result) {
            message.success('SDK 生成完毕')
        }

        const newVersionInfo = {
            ...versionInfo,
            [language] : result
        }

        setVersionInfo(newVersionInfo)
        setLoading(false)
    }

    const downloadClientSdk = async () => {
        window.open(versionInfo[language].download_url, '_blank')
    }

    console.log('GenSdkModal ====> rendered')

    return (
        <>
            {children ? (
                <span onClick={() => setVisible(true)}>
                    {children}
                </span>
            ) : (
                <Button type="primary" onClick={() => setVisible(true)}>
                    生成客户端 SDK
                </Button>
            )}
            {visible ? (
                <Modal
                    key="genSdkModal"
                    centered
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title="生成客户端 SDK"
                    visible={visible}
                    footer={null}
                    onCancel={() => setVisible(false)}
                >
                    <div>
                        <Row gutter={8} style={{padding: '10px 0'}}>
                            <Col span={6}>
                                选择语言模板:
                            </Col>
                            <Col span={18}>
                                <Select value={language} required placeholder="请选择" style={{ width: 300 }} onChange={value => setLanguage(value)}>
                                    <Select.Option key="js-antd-pro" value="js-antd-pro">Javascript (Ant Design Pro)</Select.Option>
                                    <Select.Option key="js-react-native" value="js-react-native">Javascript (React Native)</Select.Option>
                                    <Select.Option key="js-jquery" value="js-jquery">Javascript (jQuery)</Select.Option>
                                    <Select.Option key="java-android" value="java-android">Java</Select.Option>
                                    <Select.Option key="object-c" value="object-c">Object-C</Select.Option>
                                    {/* <Select.Option key="c-sharp" value="c-sharp">C #</Select.Option> */}
                                    {/* <Select.Option key="python" value="python">Python</Select.Option> */}
                                </Select>
                            </Col>
                        </Row>
                        <Row gutter={8} style={{padding: '10px 0'}}>
                            <Col span={6}>
                                文件输出目录 (服务器):
                            </Col>
                            <Col span={18}>
                                <span>{_.get(versionInfo, [language, 'server_dir']) || '_'}</span>
                            </Col>
                        </Row>
                        <Row gutter={8} style={{padding: '10px 0'}}>
                            <Col span={6}>下载地址:</Col>
                            <Col span={18}>
                                <span>{_.get(versionInfo, [language, 'download_url']) || '_'}</span>
                            </Col>
                        </Row>
                        <Row gutter={8} style={{padding: '10px 0'}}>
                            <Col span={6}>更新日期:</Col>
                            <Col span={18}>
                                <span>{_.get(versionInfo, [language, 'update_date']) || '_'}</span>
                            </Col>
                        </Row>
                        <Row gutter={8} style={{padding: '10px 0', marginTop: '20px'}}>
                            <Col span={6} />
                            <Col span={18}>
                                <Button
                                    loading={loading === 1}
                                    disabled={loading && loading !== 1}
                                    onClick={() => generateClientSdk()}
                                    type="primary"
                                    style={{marginTop: 10, marginRight: 10}}
                                >
                                    重新生成
                                </Button>
                                <Button
                                    loading={loading === 2}
                                    disabled={loading && loading !== 2 && _.get(versionInfo, [language, 'download_url'])}
                                    onClick={() => downloadClientSdk()}
                                    type="primary"
                                    style={{marginTop: 10}}
                                >
                                    下载 (.zip)
                                </Button>
                            </Col>
                        </Row>
                    </div>
                </Modal>
            ) : null}
        </>
    )
}

export default GenSdkModal
