/* eslint-disable prefer-destructuring */
import { message, Upload } from 'antd'
import React, { useEffect, useState } from 'react'

import Constants from "../../common/constants"
import { getExtType } from '../../common/utils'

/**
 * 本地 Web 服务器上传
 */
const LocalWebUpload = props => {
    const {category, onChange, onUploadFinish} = props
    const maxSize = props.maxSize || 1024
    const options = props.options || {}
    const accept = options.accept || '*.*'

    const [fileList, setFileList] = useState([])

    if (!category) {
        throw new Error('category 未设置')
    }

    useEffect(() => {
        if (props.fileList) {
            setFileList(props.fileList || [])
        } else if (options.fileList) {
            setFileList(options.fileList || [])
        }
    }, [options])

    const uploadUrl = `${Constants.API_PREFIX}/upload?category=${category}`

    return (
        <Upload
            name="file"
            {...options}
            fileList={fileList}
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
                    if (info.file.percent / 1 === 100) {
                        message.success(`${info.file.name} 文件上传成功`)
                        onUploadFinish && onUploadFinish(true, info.file.percent, info.fileList, props)
                    } else {
                        message.error(`${info.file.name} 文件上传失败`)
                        onUploadFinish && onUploadFinish(false, info.file.percent, info.fileList, props)
                    }
                } else if (info.file.status === 'error') {
                    message.error(`${info.file.name} 文件上传失败`)
                    onUploadFinish && onUploadFinish(false, info.file.percent, info.fileList, props)
                }
            }}
        >
            {props.children}
        </Upload>
    )
}

export default LocalWebUpload
