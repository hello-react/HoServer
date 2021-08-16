/* eslint-disable prefer-destructuring */
import React from 'react'

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
    return (
        <Uploader {...props} />
    )
}

export default UploadFile
