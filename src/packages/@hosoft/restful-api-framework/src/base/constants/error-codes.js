/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/

/**
 * System error codes
 */
module.exports = {
    /**
     * General errors
     */
    GENERAL_ERR_BASE: 1000,
    GENERAL_ERR_PARAM: 1001,
    GENERAL_ERR_EXIST: 1002,
    GENERAL_ERR_NOT_FOUND: 1003,
    GENERAL_ERR_IN_USE: 1004,
    GENERAL_ERR_QUERY_FAIL: 1005,
    GENERAL_ERR_CREATE_FAIL: 1006,
    GENERAL_ERR_UPDATE_FAIL: 1007,
    GENERAL_ERR_DELETE_FAIL: 1008,
    GENERAL_ERR_UNAUTHORIZED: 1009,
    GENERAL_ERR_NOT_SUPPORT: 1010,
    GENERAL_ERR_READONLY: 1011,
    GENERAL_ERR_INPUT: 1012,
    GENERAL_ERR_READ_FILE: 1013,
    GENERAL_ERR_WRITE_FILE: 1014,
    GENERAL_ERR_THIRD_SERVICE: 1015,
    GENERAL_ERR_PLUGIN: 1016,
    GENERAL_ERR_LICENSE: 1017,
    GENERAL_ERR_UNEXPECTED: 1099,

    /**
     * Api call errors
     */
    API_ERR_BASE: 2000,
    API_ERR_DISABLED: 2001,
    API_ERR_EXECUTE: 2002,
    API_ERR_REFERENCE: 2003,
    API_MODEL_BAD_TYPE: 2004,

    /**
     * User related errors
     */
    USER_ERR_BASE: 3000,
    USER_ERR_TOKEN_EXPIRE: 3001,
    USER_ERR_PASSWORD: 3002,
    USER_ERR_SMS_CODE: 3003,
    USER_ERR_DISABLED: 3004,

    /**
     * System manage related errors
     */
    SYSTEM_ERR_BASE: 4000,
    SYSTEM_ERR_CLIENT_VERSION: 4001,
    SYSTEM_ERR_MAINTAIN: 4002,
    SYSTEM_ERR_CONFIG: 4017
}