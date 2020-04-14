import {Form as LegacyForm, Icon} from "@ant-design/compatible"
import {UploadOutlined} from "@ant-design/icons"
import {Avatar, Button} from "antd"
import React, {useEffect, useState} from "react"

import UploadFile from "@/components/UploadFile"
import {ossProcessImg} from "@/utils/utils"

const AvatarForm = props => {
    const {onUploadResult, src} = props
    const [avatarSrc, setAvatarSrc] = useState(src)

    useEffect(() => {
        setAvatarSrc(ossProcessImg(props.src, 250, 0, true))
    }, [props.src])

    const uploadProps = {
        category: 'avatar',
        options: {
            multiple: false,
            accept: '.jpg,.jpeg,.png',
            showUploadList: false,
            headers: {
                authorization: 'authorization-text',
            }
        },
        onUploadFinish: (success, percent, fileList) => {
            console.log('AvatarForm upload result: ', fileList)

            if (success && fileList[0]) {
                setAvatarSrc(fileList[0].response)
                onUploadResult && onUploadResult(fileList[0].response)
            }
        }
    }

    return (
        <LegacyForm.Item>
            <div>
                <Avatar src={avatarSrc} size={128} icon={avatarSrc ? undefined : <Icon type="user" />} style={{marginTop: 50}} />
            </div>
            <div style={{marginTop: 10}}>
                <UploadFile {...uploadProps}>
                    <Button>
                        <UploadOutlined />上传...
                    </Button>
                </UploadFile>
            </div>
        </LegacyForm.Item>
    )
}

export default AvatarForm
