/* eslint-disable @typescript-eslint/camelcase */
import '@ant-design/compatible/assets/index.css'

import {Form as LegacyForm, Icon} from "@ant-design/compatible"
import {Button, Input, Modal, Select, Switch} from 'antd'
import React, {useEffect, useImperativeHandle, useRef, useState} from 'react'

import UploadFile from "@/components/UploadFile"
import Constants from "@/utils/constants"

import ContentService from '../../service'

const PostEditForm = LegacyForm.create()(props => {
    const {categories, contentInfo, formRef} = props
    const [coverFile, setCoverFile] = useState([])
    const [fileList, setFileList] = useState([])
    const [previewVisible, setPreviewVisible] = useState(false)
    const [previewImage, setPreviewImage] = useState('')

    const {getFieldDecorator} = props.form
    const contentRef = useRef({...contentInfo})

    useImperativeHandle(formRef, () => ({
        getFormFields: callback => {
            getFormValues(callback)
        }
    }))

    useEffect(() => {
        loadData()
    }, [contentInfo])

    const loadData = async () => {
        if (contentInfo.id) {
            contentRef.current = (await ContentService.getContentDetail(contentInfo.id)) || {}
            if (!contentRef.current) {
                return
            }
        }

        const {title, sub_title, link, cover, files, category, sub_category, content, enabled} = contentRef.current
        props.form.setFieldsValue({
            title, sub_title, link, category, sub_category, content, enabled
        })

        if (cover) {
            setCoverFile([{
                uid: '0',
                name: 'cover',
                status: 'done',
                url: cover
            }])
        }

        if (files) {
            let index = 1
            setFileList(files.map(f => {
                return {
                    uid: index,
                    name: `file${index++}`,
                    status: 'done',
                    url: f.url
                }
            }))
        }
    }

    const getFormValues = callback => {
        props.form.validateFields((err, values) => {
            if (err) return
            if (coverFile && coverFile.length > 0 && coverFile[0].response) {
                values.cover = coverFile[0].response
            }

            if (fileList && fileList.length > 0) {
                const files = []
                for (let i=0; i<fileList.length; i++) {
                    if (fileList[i].status === 'done') {
                        files.push({
                            type: fileList[i].type,
                            url: fileList[i].response
                        })
                    }
                }

                if (files.length > 0) {
                    values.files = files
                }
            }

            callback(values)
        })
    }

    const handlePreview = async file => {
        const fileName = file.name.toLowerCase()
        if (fileName.indexOf('.jpg') > 0 || fileName.indexOf('.jpeg') > 0 || fileName.indexOf('.png') > 0) {
            setPreviewImage(file.response || file.thumbUrl)
            setPreviewVisible(true)
        } else {
            window.open(file.response || file.originFileObj, '_blank')
        }
    }

    return (
        <>
            <LegacyForm {...Constants.DEF_FORM_ITEM_LAYOUT} layout="horizontal">
                <LegacyForm.Item required label="标题">
                    {getFieldDecorator('title', {
                        rules: [
                            {required: true, message: '标题必填'}
                        ]
                    })(<Input placeholder="请输入标题" />)}
                </LegacyForm.Item>
                <LegacyForm.Item label="副标题">
                    {getFieldDecorator('sub_title')(<Input />)}
                </LegacyForm.Item>
                <LegacyForm.Item label="原文链接地址">
                    {getFieldDecorator('link')(<Input />)}
                </LegacyForm.Item>
                <LegacyForm.Item label="内容分类">
                    {getFieldDecorator('category', {
                        rules: [{required: true, message: '请选择分类'}]
                    })(
                        <Select required placeholder="请选择">
                            {categories.map(c => (
                                <Select.Option key={c.key} value={c.key}>{c.value}</Select.Option>
                            ))}
                        </Select>
                    )}
                </LegacyForm.Item>
                <LegacyForm.Item label="子分类">
                    {getFieldDecorator('sub_category')(
                        <Input />
                    )}
                </LegacyForm.Item>
                <LegacyForm.Item label="封面">
                    <UploadFile
                        category='post'
                        options={{
                            listType: 'picture-card',
                            multiple: false,
                            accept: '*.jpg,*.jpeg,*.png',
                            onPreview: {handlePreview}
                        }}
                        fileList={coverFile}
                        onUploadFinish={(success, percent, files) => {
                            if (success) {
                                setCoverFile([files[files.length - 1]])
                            }
                        }}
                    >
                        <div>
                            <Icon type="upload" style={{fontSize: 24, color: '#999'}} />
                            <div className="ant-upload-text">上传</div>
                        </div>
                    </UploadFile>
                </LegacyForm.Item>
                <LegacyForm.Item label="附件">
                    <UploadFile
                        category='post'
                        options={{
                            listType: 'picture-card',
                            multiple: true,
                            accept: '*.jpg,*.jpeg,*.png',
                            onPreview: {handlePreview}
                        }}
                        fileList={fileList}
                        onUploadFinish={(success, percent, files) => {
                            setFileList(files)
                        }}
                    >
                        <div>
                            <Icon type="plus" style={{fontSize: 24, color: '#999'}} />
                            <div className="ant-upload-text">上传</div>
                        </div>
                    </UploadFile>
                </LegacyForm.Item>
                <LegacyForm.Item label="文章内容">
                    {getFieldDecorator('content')(
                        <Input.TextArea rows={5} />
                    )}
                </LegacyForm.Item>
                <LegacyForm.Item label="立即上架">
                    {getFieldDecorator('enabled')(<Switch defaultChecked />)}
                </LegacyForm.Item>
            </LegacyForm>
            <Modal visible={previewVisible} footer={null} onCancel={() => setPreviewVisible(false)}>
                <img alt="" style={{ width: '100%' }} src={previewImage} />
            </Modal>
        </>
    )
})

const PostEditFormModal = props => {
    const {children, editMode, categories, contentInfo, onOk} = props

    const [visible, setVisible] = useState(false)
    const formRef = React.createRef()

    const handleSubmit = () => {
        formRef.current.getFormFields(values => {
            console.log('PostEditForm submit: ', values)

            onOk && onOk(values, contentInfo)
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
                    key="postEditModal"
                    centered
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll', backgroundColor: '#fff' }}
                    title={`${(contentInfo.id ? '编辑' : '发布')}内容`}
                    visible={visible}
                    onOk={() => handleSubmit()}
                    onCancel={() => setVisible(false)}
                >
                    <PostEditForm formRef={formRef} editMode={editMode} categories={categories} contentInfo={contentInfo} />
                </Modal>
            ) : null}
        </>
    )
}

export default PostEditFormModal
