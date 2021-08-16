/* eslint-disable radix */
/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */

const SERVER_VERSION = '1.0'

export default {
    // 默认每页显示记录数
    DEF_PAGE_SIZE: 10,

    // API URL 前缀
    API_PREFIX: `/api/v${parseInt(SERVER_VERSION, 10)}`,

    // API 字段类型
    API_FIELD_TYPE: {
        array: 'array',
        boolean: 'boolean',
        char: 'char',
        date: 'date',
        mix: 'mix',
        number: 'number',
        objectId: 'objectId',
        object: 'object',
        'array-of-boolean': 'array-of-boolean',
        'array-of-char': 'array-of-char',
        'array-of-number': 'array-of-number',
        'array-of-object': 'array-of-object',
        'array-of-objectId': 'array-of-objectId'
    },

    // 默认表单布局
    DEF_FORM_ITEM_LAYOUT: {
        labelCol: {
            xs: {span: 24},
            sm: {span: 4},
        },
        wrapperCol: {
            xs: {span: 24},
            sm: {span: 20},
        },
    },

    // 弹出列表模态窗口宽度
    MODEL_TABLE_WIDTH: parseInt(window.innerWidth * 0.75)
}
