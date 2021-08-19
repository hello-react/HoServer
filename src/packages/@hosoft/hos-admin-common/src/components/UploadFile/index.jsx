/* eslint-disable prefer-destructuring */
import React from 'react'

import {pluginManager} from '../../common/common'
import Uploader from './LocalWebUpload'

/*
usage:

<UploadFile
    category={'test'}
    maxSize={3000}
    options={{ multiple: false }}
    onUploadFinish={(success, percent, fileUrl) => {
    }}
>
    <Button type="primary">Click to Upload</Button>
</UploadFile>
 */

const UploadFile = props => {
    let UploaderComp = null

    if (props.cloud !== false) {
        const storagePlugin = pluginManager().getLocalPlugin('hos-plugin-cloud-storage')
        if (storagePlugin) {
            UploaderComp = storagePlugin.instance.getUploadComponent()
            // console.log('storage component: ', UploaderComp)
        }
    }

    return (
        <UploaderComp {...props} />
    )
}

export default UploadFile
