/* eslint-disable react/no-access-state-in-setstate,no-underscore-dangle */
import '@ant-design/compatible/assets/index.css'

import { Form, Icon } from '@ant-design/compatible'
import { DeleteOutlined,DownOutlined, EditOutlined, VerticalAlignBottomOutlined, VerticalAlignTopOutlined } from '@ant-design/icons'
import { Common, RangePicker } from '@hosoft/hos-admin-common'
import { Avatar, Button, Card, Col, Dropdown, Input, List, Menu, message, Modal, Pagination, Row, Switch, Typography } from 'antd'
import _ from  'lodash'
import moment from 'moment'
import React, { Component, useState } from 'react'

import PostDetail from "./components/PostDetail"
import PostEditForm from './components/PostEditForm'
import StandardFormRow from './components/StandardFormRow'
import TagSelect from './components/TagSelect'
import ContentService from './service'
import styles from './style.less'

const FormItem = Form.Item
const { Paragraph } = Typography

const ContentItem = props => {
    const {contentEditForm, item, manageMode, handleOperate} = props
    const [selected, setSelected] = useState(item.selected || false)

    const handleClickCard = () => {
        if (manageMode) {
            const selStatus = !selected
            item.selected = selStatus
            setSelected(selStatus)
        } else {
            handleOperate('view', item)
        }

        return false
    }

    return (
        <Card
            className={[styles.card, manageMode && selected ? 'ant-card-sel' : '']}
            hoverable
            cover={item.cover ? <img alt="" src={Common.ossProcessImg(item.cover, 500, 375)} onClick={() => handleClickCard(item)} /> : null}
        >
            <Card.Meta onClick={() => handleClickCard(item)} title={<a>{item.title}</a>}
                description={
                    <Paragraph className={styles.item} ellipsis={{rows: 2,}}>
                        {item.sub_title}
                    </Paragraph>
                }
            />
            <div className={styles.cardItemContent}>
                <span>
                    {moment(item.updated_at).fromNow()}
                    {contentEditForm}
                    <DeleteOutlined style={{marginLeft: 10}} onClick={() => handleOperate('delete', item)} />
                </span>
                <div className={styles.avatarList}>
                    {item.author_rel && item.author_rel.avatar ? (
                        <Avatar src={Common.ossProcessImg(item.author_rel.avatar, 50, 0, true)}/>
                    ) : (
                        <Avatar icon={<Icon type='user' />}/>
                    )}
                </div>
            </div>
        </Card>
    )
}

class Post extends Component {
    constructor(props) {
        super(props)

        this.searchParams = {}
        this.state = {
            loading: true,
            manageMode: false,
            categories: [],
            contents: [],
            selectedPost: null,
            postDetailVisible: false,
            pagination: {}
        }
    }

    async componentDidMount() {
        moment.locale('zh-cn')
        this.loadData()

        const categories = await ContentService.getContentCategories()
        this.setState({ categories })
    }

    async loadData() {
        const rep = await ContentService.getContentList({
            ...this.state.pagination,
            ...this.searchParams
        })

        const pagination = _.get(rep, 'pagination', {})
        this.setState({
            contents: _.get(rep, 'list', []),
            pagination,
            loading: false
        })
    }

    async searchContent(text) {
        this.searchParams.search = text.trim()
        this.loadData()
    }

    async handleSaveContent(record, existRecord) {
        let result
        if (existRecord && existRecord.id) {
            result = await ContentService.updateContent(existRecord.id, record)
        } else {
            result = await ContentService.createContent(record)
        }

        console.log('createContent result: ', result)
        if (result) {
            this.loadData()
        }
    }

    async handleOperate(action, records) {
        let result
        if (action === 'refresh') {
            return this.loadData()
        }

        if (action === 'view') {
            return this.setState({selectedPost: records, postDetailVisible: true})
        }

        if (action === 'delete') {
            Modal.confirm({
                title: '温馨提示',
                content: `确定删除此文章吗？`,
                okText: '确认',
                cancelText: '取消',
                onOk: async () => {
                    result = await ContentService.deleteContent(records.id)
                    result && this.loadData()
                }
            })

            return
        }

        if (action === 'batch_delete') {
            result = await ContentService.batchDeleteContent(records)
        } else if (action === 'enable') {
            result = await ContentService.batchUpdateContent(records.map(r => r.id), {enabled: true})
        } else if (action === 'disable') {
            result = await ContentService.batchUpdateContent(records.map(r => r.id), {enabled: false})
        }

        if (result) {
            this.loadData()
        }
    }

    render() {
        const { loading, categories, contents, pagination, manageMode } = this.state

        const cardList = (
            <List
                rowKey="id"
                loading={loading}
                grid={{
                    gutter: 24,
                    xl: 4,
                    lg: 3,
                    md: 3,
                    sm: 2,
                    xs: 1,
                }}
                dataSource={contents}
                renderItem={item => (
                    <List.Item>
                        <ContentItem
                            item={item}
                            manageMode={manageMode}
                            handleOperate={(action, record) => this.handleOperate(action, record)}
                            contentEditForm={(
                                <PostEditForm categories={categories} contentInfo={item} onOk={async (record, existRecord) => {
                                    const result = await ContentService.updateContent(existRecord.id, record)
                                    if (result) {
                                        this.loadData()
                                    }
                                }}>
                                    <EditOutlined style={{marginLeft: 10}} />
                                </PostEditForm>
                            )}
                        />
                    </List.Item>
                )}
            />
        )

        const formItemLayout = {
            wrapperCol: {
                xs: {
                    span: 24,
                },
                sm: {
                    span: 16,
                },
            },
        }

        return (
            <div className={styles.coverCardList}>
                <Card bordered={false}>
                    <Form layout="inline">
                        <StandardFormRow title="所属类目" block style={{paddingBottom: 11}}>
                            <FormItem>
                                <TagSelect expandable onChange={values => {
                                    if (values && values.length > 0) {
                                        this.searchParams.category = values
                                    } else {
                                        this.searchParams.category = undefined
                                    }

                                    this.loadData()
                                }}>
                                    {categories.map(cat => (
                                        <TagSelect.Option key={cat.key} value={cat.key}>{cat.value}</TagSelect.Option>
                                    ))}
                                </TagSelect>
                            </FormItem>
                        </StandardFormRow>
                        <StandardFormRow title="其它选项" grid last>
                            <Row gutter={16}>
                                <Col lg={8} md={10} sm={10} xs={24}>
                                    <FormItem {...formItemLayout} label="作者">
                                        <Input.Search onSearch={value => {
                                            this.searchParams.author_name = value ? `*${value}*` : ''
                                            this.loadData()
                                        }} />
                                    </FormItem>
                                </Col>
                                <Col lg={8} md={10} sm={10} xs={24}>
                                    <FormItem {...formItemLayout} label="发布时间">
                                        <RangePicker onChange={value => {
                                            this.searchParams.publish_date = value
                                            this.loadData()
                                        }} />
                                    </FormItem>
                                </Col>
                                <Col lg={8} md={10} sm={10} xs={24} align="right">
                                    {'管理 '}
                                    <Switch style={{marginRight: 10}} onChange={value => this.setState({manageMode: value})}>
                                    </Switch>

                                    {manageMode ? (
                                        <Dropdown overlay={
                                            <Menu onClick={e => {
                                                const records = this.state.contents.filter(c => c.selected === true)
                                                if (records.length === 0) {
                                                    return message.info('请先选择记录')
                                                }

                                                const operate = e.key === 'batch_delete' ? '删除' : (e.key === 'enable' ? '上架' : '下架')
                                                Modal.confirm({
                                                    title: '温馨提示',
                                                    content: `确定${operate}所选文章吗？`,
                                                    okText: '确认',
                                                    cancelText: '取消',
                                                    onOk: () => {
                                                        this.handleOperate(e.key, records)
                                                    }
                                                })
                                            }}>
                                                <Menu.Item key="batch_delete"><Icon type="delete" /> 删除</Menu.Item>
                                                <Menu.Item key="disable"><VerticalAlignBottomOutlined />下架</Menu.Item>
                                                <Menu.Item key="enable"><VerticalAlignTopOutlined /> 上架</Menu.Item>
                                            </Menu>
                                        }>
                                            <Button style={{marginRight: 10}}>
                                                批量操作 <DownOutlined />
                                            </Button>
                                        </Dropdown>
                                    ) : null}

                                    <PostEditForm categories={categories} contentInfo={this.selectedContent || {}} onOk={(record, existRecord) => {
                                        this.handleSaveContent(record, existRecord)
                                    }}>
                                        <Button disabled={!(categories && categories.length > 0)} type="primary">发布内容</Button>
                                    </PostEditForm>
                                </Col>
                            </Row>
                        </StandardFormRow>
                    </Form>
                </Card>
                <div className={styles.cardList}>{cardList}</div>
                <div style={{marginTop: 10, textAlign: 'center'}}>
                    <Pagination
                        {...pagination}
                        showSizeChanger
                        onShowSizeChange={(current, size) => {
                            this.setState({pagination: {...pagination, pageSize: size}}, () => this.loadData())
                        }}
                        onChange={(page, pageSize) => {
                            this.setState({pagination: {...pagination, page, pageSize}}, () => this.loadData())
                        }}
                    />
                </div>
                <Modal
                    footer={<Button type="primary" onClick={() => this.setState({postDetailVisible: false})}>关闭</Button>}
                    width="75%"
                    title="内容详情"
                    closable
                    onCancel={() => this.setState({postDetailVisible: false})}
                    visible={this.state.postDetailVisible}
                >
                    <PostDetail categories={categories} contentInfo={this.state.selectedPost} />
                </Modal>
            </div>
        )
    }
}

export default Post
