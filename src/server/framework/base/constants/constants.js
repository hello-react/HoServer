/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: HoSoft Co ltd.
 **/
const config = require('config')

const SERVER_VERSION = config.get('server.version')
const PRODUCT_NAME = config.get('server.productName')

/**
 * all system constants
 */
module.exports = {
    // demo replace(false|true)
    IS_DEMO_SITE: false,

    // product name
    PRODUCT_NAME: PRODUCT_NAME,

    // server version
    SERVER_VERSION: SERVER_VERSION,

    /**
     * all api route prefix
     * @type {string}
     */
    API_PREFIX: '/api/v' + parseInt(SERVER_VERSION),

    // default page size
    PAGE_SIZE: 10,

    /************************************************
     * API 相关常量
     ***********************************************/

    // object data type
    API_FIELD_TYPE: {
        objectId: 'objectId',
        char: 'char',
        number: 'number',
        boolean: 'boolean',
        date: 'date',
        object: 'object',
        array: 'array',
        mix: 'mix',
        'array-of-number': 'array-of-number',
        'array-of-boolean': 'array-of-boolean',
        'array-of-char': 'array-of-char',
        'array-of-object': 'array-of-object',
        'array-of-objectId': 'array-of-objectId'
    },

    // HTTP methods, currently we don't support PATCH
    API_HTTP_METHOD: {
        GET: 'GET',
        POST: 'POST',
        DELETE: 'DELETE'
    },

    // Model default api routes
    API_DEF_ROUTE_ACTIONS: ['list', 'detail', 'create', 'update', 'delete', 'batch_delete'],

    // form submit data types
    API_FORM_DATA: {
        NONE: 'none',
        'FORM-DATA': 'form-data',
        BINARY: 'binary',
        JSON: 'json',
        RAW: 'raw',
        XML: 'xml',
        'X-WWW-FORM-URLENCODED': 'x-www-form-urlencoded'
    },

    // API request params type
    API_IN_PARAM_FLAG: {
        NONE: 'none', // 禁止输入
        MATCH: 'match',
        REGEX: 'regex',
        ALL: 'all',
        ANY: 'any',
        DEFAULT: 'default' // 强制使用默认值
    },

    // Api hook function execute result type
    API_RESULT: {
        CONTINUE: 'continue', // 继续执行
        STOP_OTHER_HOOK: 'stop', // 停止执行其他 插件/Hook 函数
        RETURN: 'return' // 停止 Api 执行，返回结果
    },

    /************************************************
     * 用户相关常量
     ***********************************************/

    // 区域名称，内置关键字
    AREA_LOCATION_NAMES: {
        LOCATION: 'location',
        PROVINCE: 'province',
        CITY: 'city',
        DISTRICT: 'district',
        SUBDISTRICT: 'subdistrict'
    }
}
