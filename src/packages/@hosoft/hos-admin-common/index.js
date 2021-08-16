/**
 * HoServer manager admin common components
 */
import BadgeButton from './src/components/BadgeButton'
import JsonViewModal from './src/components/JsonViewModal'
import TransferModal from './src/components/TransferModal'
import MultiTags from './src/components/MultiTags'
import ObjectInfo from './src/components/ObjectInfo'
import ProTable from './src/components/ProTable'
import RangePicker from './src/components/RangePicker'
import SelectLocation from './src/components/SelectLocation'
import UploadFile from './src/components/UploadFile'
import TableLayout from './src/layout/TableLayout'

import * as Common from './src/common/common'
import * as Utils from './src/common/utils'
import Constants from './src/common/constants'
import request from './src/common/request'
import getToken from './src/common/get-token'

import FormBuilder from './src/third/antd-form-builder'
import prompt from './src/third/antd-prompt'

import ApiService from './src/services/api'
import ModelService from './src/services/model'

export {
    // components
    BadgeButton,
    JsonViewModal,
    TransferModal,
    MultiTags,
    ObjectInfo,
    ProTable,
    RangePicker,
    SelectLocation,
    UploadFile,

    // layout
    TableLayout,

    // common utils
    Constants,
    Common,
    Utils,
    request,
    getToken,

    // third
    FormBuilder,
    prompt,

    // services
    ApiService,
    ModelService
}
