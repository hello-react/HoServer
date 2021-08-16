/* eslint-disable no-underscore-dangle,default-case */
import {Constants, request} from '@hosoft/hos-admin-common'
import {message} from "antd"
import _ from "lodash";
import pluralize from 'pluralize'

const wrapper = {}

wrapper.getModelImportTemplateUrl = modelName => {
    return `${Constants.API_PREFIX}/api/models/import/template?model_name=${modelName}`
}

wrapper.prepareImportModelData = async (modelName, options) => {
    const file = _.get(options.files, ['fileList', 0, 'response'])
    if (!file) {
        return message.error('请先选择文件!')
    }

    const rep = await request(`${Constants.API_PREFIX}/api/models/import/prepare`, {
        method: 'POST',
        data: {
            model_name: modelName,
            overwrite: options.overwrite,
            format: options.format,
            file
        }
    })

    if (rep.code / 1 !== 200) {
        message.error(`数据准备失败: ${rep.message || '接口异常'}`)
        return null
    }

    return rep
}

wrapper.importModelData = async (modelName, options) => {
    const file = _.get(options.files, ['fileList', 0, 'response'])
    if (!file) {
        return message.error('请先选择文件!')
    }

    const rep = await request(`${Constants.API_PREFIX}/api/models/import`, {
        method: 'POST',
        data: {
            model_name: modelName,
            overwrite: options.overwrite,
            format: options.format,
            file
        }
    })

    if (rep.code / 1 !== 200) {
        message.error(`导入数据失败: ${rep.message || '接口异常'}`)
        return null
    }

    return rep
}

wrapper.exportModelData = async (modelName, options, data) => {
    const rep = await request(`${Constants.API_PREFIX}/api/models/export`, {
        method: 'POST',
        data: {
            model_name: modelName,
            scope: options.scope,
            format: options.format,
            fields: options.fields,
            data
        }
    })

    if (rep.code / 1 !== 200) {
        message.error(`导出数据失败: ${rep.message || '接口异常'}`)
        return null
    }

    return rep
}

export default wrapper
