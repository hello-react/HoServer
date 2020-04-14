/* eslint-disable prefer-destructuring */
import { message, Upload } from 'antd'
import moment from 'moment'
import React, { useEffect, useState } from 'react'

import Constants from "@/utils/constants"
import request from '@/utils/request'
import { getExtType } from '@/utils/utils'

import defaultSettings from "../../../config/defaultSettings"

/* 用法
<UploadFile
    category={'test'}
    maxSize={3000}
    options={{ multiple: false }}
    onUploadFinish={(success, percent, fileUrl) => {
    }}
>
    <Button type="primary">点击上传</Button>
</UploadFile>
 */

const UploadFile = props => {
    const {category, onChange, onUploadFinish} = props
    const maxSize = props.maxSize || 1024
    const options = props.options || {}
    const accept = options.accept || '*.*'
    const enableOss = props.enableOss !== undefined ? props.enableOss : defaultSettings.enableOssUpload

    const [uploadPolicy, setUploadPolicy] = useState()
    const [fileList, setFileList] = useState([])

    if (!category) {
        throw new Error('category 未设置')
    }

    useEffect(() => {
        if (enableOss && !uploadPolicy) {
            loadUploadPolicy()
        }

        if (props.fileList) {
            setFileList(props.fileList || [])
        } else if (options.fileList) {
            setFileList(options.fileList || [])
        }
    }, [options])

    const loadUploadPolicy = async () => {
        const policyReq = await request(`${Constants.API_PREFIX}/upload/oss/policy`, { method: 'GET' })
        if (policyReq.status !== 0) {
            message.error(`获取 OSS 上传策略失败: ${policyReq.message}`)
            return false
        }

        setUploadPolicy(policyReq.data)
    }

    const checkOssResponse = files => {
        console.log('UploadFile result: ', files)
        for (const f of files) {
            if (f.response) {
                f.response = f.response.result || f.response
            }
        }
    }

    let uploadUrl
    if (enableOss) {
        if (!uploadPolicy) {
            return null
        }
        uploadUrl = uploadPolicy.host
    } else {
        uploadUrl = `${Constants.API_PREFIX}/upload?category=${category}`
    }

    return (
        <Upload
            name="file"
            {...options}
            fileList={fileList}
            data={uploadPolicy}
            action={uploadUrl}
            accept={accept}
            beforeUpload={async file => {
                if (accept.indexOf(getExtType(file.name).toLowerCase()) < 0) {
                    message.info(`请上传${accept}格式的文件`)
                    return false
                }

                if (file.size / 1024 > maxSize) {
                    message.info(`请上传体积小于${maxSize}k的文件`)
                    return false
                }

                if (enableOss) {
                    if (!uploadPolicy) {
                        message.error('获取文件上传规则失败')
                        return false
                    }

                    const policyData = uploadPolicy
                    policyData.key = `${category}/${moment().format('YYYY-MM/DD/hhmm')}/${file.name}`

                    setUploadPolicy({...uploadPolicy})
                }

                return true
            }}
            showUploadList
            onChange={async info => {
                console.log('UploadFile upload result: ', info)
                onChange && onChange(info)

                if (options.multiple) {
                    setFileList(info.fileList)
                } else {
                    setFileList([info.file])
                }

                // if (info.file.status !== 'uploading') {
                //     console.log(info.file, info.fileList)
                // }

                if (info.file.status === 'done') {
                    checkOssResponse(info.fileList)

                    if (info.file.percent / 1 === 100) {
                        message.success(`${info.file.name} 文件上传成功`)
                        onUploadFinish && onUploadFinish(true, info.file.percent, info.fileList)
                    } else {
                        message.error(`${info.file.name} 文件上传失败`)
                        onUploadFinish && onUploadFinish(false, info.file.percent, info.fileList)
                    }
                } else if (info.file.status === 'error') {
                    message.error(`${info.file.name} 文件上传失败`)
                    onUploadFinish && onUploadFinish(false, info.file.percent, info.fileList)
                }
            }}
        >
            {props.children}
        </Upload>
    )
}

export default UploadFile
