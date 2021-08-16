/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/
const config = require('@hosoft/config')

/**
 * all system constants
 */
module.exports = {
    // demo replace(false|true)
    IS_DEMO_SITE: false,

    // product name
    PRODUCT_NAME: config.get('server.productName') || 'HoServer',

    // server version
    SERVER_VERSION: config.get('server.version') || '1.0',

    // all api route prefix
    // prettier-ignore
    API_PREFIX: (config.get('server.apiPrefix') !== undefined && config.get('server.apiPrefix') !== null)
        ? config.get('server.apiPrefix')
        : '/api/v' + parseInt(config.get('server.version') || '1.0'),

    // default page size
    PAGE_SIZE: 10,

    /************************************************
     * API related
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
    API_DEF_ROUTE_ACTIONS: ['list', 'detail', 'create', 'update', 'delete'],

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
        NONE: 'none', // not allow input
        EXACT: 'exact',
        FUZZY: 'fuzzy',
        DEFAULT: 'default' // force to use default value
    },

    // Api hook function execute result type
    HOOK_RESULT: {
        CONTINUE: 'continue',
        STOP_OTHER_HOOK: 'stop',
        RETURN: 'return' // stop execute api and return
    }
}
