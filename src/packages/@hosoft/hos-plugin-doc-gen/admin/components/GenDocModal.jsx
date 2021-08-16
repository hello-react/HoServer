/* eslint-disable react/jsx-no-target-blank,react/no-access-state-in-setstate */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import { Common } from '@hosoft/hos-admin-common'
import { Alert, Button, Col, message, Modal, Row, Tabs } from "antd"
import { saveAs } from 'file-saver'
import _ from 'lodash'
import React, {Component} from 'react'

import DocGenService from '../service'

const { TabPane } = Tabs

class GenDocModal extends Component {
    constructor() {
        super()

        _.bindAll(this, ['setVisible', 'setInvisible'])
        this.state = {
            activeTabKey: 'client_doc',
            apiVersionInfo: null,
            loading: 0,
            visible: false
        }
    }

    onTabChange(activeKey) {
        this.setState({activeTabKey: activeKey})
    }

    async setVisible() {
        if (!this.state.apiVersionInfo) {
            const apiVersionInfo = await DocGenService.getApiDocInfo()
            this.setState({apiVersionInfo: apiVersionInfo || {}})
        }

        this.setState({ visible: true })
    }

    setInvisible() {
        this.setState({ visible: false })
    }

    generateApiDoc = async () => {
        this.setState({loading: 1})
        const result = await DocGenService.generateApiDoc()
        result && this.setState({apiVersionInfo: {
            doc: result,
            postman: this.state.apiVersionInfo.postman || {}
        }}, () => {
            message.success('文档生成完毕')
        })

        this.setState({loading: 0})
    }

    downloadMarkdown = async () => {
        this.setState({loading: 2})
        const downloadUrl = await DocGenService.downloadMarkdown()
        downloadUrl && saveAs(downloadUrl)

        this.setState({loading: 0})
    }

    generatePostman = async () => {
        this.setState({loading: 3})
        const result = await DocGenService.generatePostman()
        result && this.setState({apiVersionInfo: {
            postman: result,
            doc: this.state.apiVersionInfo.doc || {}
        }}, () => {
            message.success('Postman 集合生成完毕')
        })

        this.setState({loading: 0})
    }

    render() {
        const {visible, activeTabKey} = this.state
        const apiVersionInfo = this.state.apiVersionInfo || {}
        const docInfo = apiVersionInfo.doc || {}
        const postmanInfo = apiVersionInfo.postman || {}
        const {children} = this.props

        return (
            <>
                {children ? (
                    <span onClick={this.setVisible}>
                        {children}
                    </span>
                ) : (
                    <Button type="primary" onClick={this.setVisible}>
                        生成Api文档
                    </Button>
                )}
                {visible ? (
                    <Modal
                        key="genDocModal"
                        centered
                        destroyOnClose
                        width={800}
                        title="文档生成"
                        visible={visible}
                        footer={null}
                        onCancel={this.setInvisible}
                    >
                        <Tabs activeKey={activeTabKey} animated={false} onChange={activeKey => this.onTabChange(activeKey)} >
                            <TabPane key="client_doc" tab="生成 Api 文档">
                                <Row gutter={8} style={{padding: '10px 0'}}>
                                    <Col span={4}>
                                        在线文档地址:
                                    </Col>
                                    <Col span={20}>
                                        <a href={docInfo.doc_url} title="点击打开预览" target="_blank">{docInfo.doc_url || '_'}</a>
                                        <Button disabled={!docInfo.doc_url} onClick={() => {
                                            Common.copyToClipboard(docInfo.doc_url)
                                            message.success('地址已复制')
                                        }} size="small" style={{marginLeft: 10}}>复制 Url</Button>
                                    </Col>
                                </Row>
                                <Row gutter={8} style={{padding: '10px 0'}}>
                                    <Col span={4}>
                                        文件输出目录 (服务器):
                                    </Col>
                                    <Col span={20}>
                                        <span>{docInfo.server_dir || '_'}</span>
                                    </Col>
                                </Row>
                                <Row gutter={8} style={{padding: '10px 0'}}>
                                    <Col span={4}>更新日期:</Col>
                                    <Col span={20}>
                                        <span>{docInfo.update_date || '_'}</span>
                                    </Col>
                                </Row>
                                <Row gutter={8} style={{padding: '10px 0'}}>
                                    <Col span={4}></Col>
                                    <Col span={18}>
                                        <Alert message="注：接口成功调用后可自动在文档中生成输入、输出数据示例" type="info" />
                                    </Col>
                                    <Col span={4} />
                                </Row>
                                <Row gutter={8} style={{padding: '10px 0', marginTop: '20px'}}>
                                    <Col span={4} />
                                    <Col span={20}>
                                        <Button
                                            loading={this.state.loading === 1}
                                            disabled={this.state.loading && this.state.loading !== 1}
                                            onClick={() => this.generateApiDoc()}
                                            type="primary"
                                            style={{marginTop: 10, marginRight: 10}}
                                        >
                                            重新生成
                                        </Button>
                                        <Button
                                            disabled={this.state.loading || !docInfo.markdown_url}
                                            onClick={() => window.open(docInfo.markdown_url, '_blank')}
                                            type="primary"
                                            style={{marginTop: 10}}
                                        >
                                            导出 Markdown (.zip)
                                        </Button>
                                    </Col>
                                </Row>
                            </TabPane>
                            <TabPane key="postman" tab="生成 Postman 集合">
                                <Row gutter={8} style={{padding: '10px 0'}}>
                                    <Col span={4}>
                                        在线地址:
                                    </Col>
                                    <Col span={20}>
                                        <div>
                                            <a href={postmanInfo.postman_url} title="点击直接下载" target="_blank">{postmanInfo.postman_url || '_'}</a>
                                            <Button disabled={!postmanInfo.postman_url} onClick={() => {
                                                copyToClipboard(postmanInfo.postman_url)
                                                message.success('地址已复制')
                                            }}  size="small" style={{marginLeft: 10}}>复制 Url</Button>
                                        </div>
                                        <div style={{marginTop: 10}}>
                                            可在 Postman 直接从 URL 导入集合 (File -&gt; Import... -&gt; Import From Link)
                                        </div>
                                        <div>
                                            [ <a href="https://www.postman.com/" target="_blank">Postman 官网</a> ]
                                            [ <a href="https://www.jianshu.com/p/6c9b45994c34" target="_blank">Postman 使用教程</a> ]
                                        </div>
                                    </Col>
                                </Row>
                                <Row gutter={8} style={{padding: '10px 0'}}>
                                    <Col span={4}>
                                        文件输出目录 (服务器):
                                    </Col>
                                    <Col span={20}>
                                        <span>{postmanInfo.server_file || '_'}</span>
                                    </Col>
                                </Row>
                                <Row gutter={8} style={{padding: '10px 0'}}>
                                    <Col span={4}>更新日期:</Col>
                                    <Col span={20}>
                                        <span>{postmanInfo.update_date || '_'}</span>
                                    </Col>
                                </Row>
                                <Row gutter={8} style={{padding: '10px 0', marginTop: '20px'}}>
                                    <Col span={4} />
                                    <Col span={20}>
                                        <Button
                                            loading={this.state.loading === 3}
                                            disabled={this.state.loading && this.state.loading !== 3}
                                            onClick={() => this.generatePostman()}
                                            type="primary"
                                            style={{marginTop: 10, marginRight: 10}}
                                        >
                                            重新生成
                                        </Button>
                                        <Button
                                            disabled={this.state.loading || !postmanInfo.postman_url}
                                            onClick={() => window.open(postmanInfo.postman_url, '_blank')}
                                            type="primary"
                                            style={{marginTop: 10}}
                                        >
                                            下载 (.postman)
                                        </Button>
                                    </Col>
                                </Row>
                            </TabPane>
                        </Tabs>
                    </Modal>
                ) : null}
            </>
        )
    }
}

export default GenDocModal
