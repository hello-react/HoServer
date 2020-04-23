/* eslint-disable sort-requires/sort-requires */
/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/02/29
 * author: Jack Zhang
 **/

const ApiService = require('./api/ApiService')
const SysUserService = require('./user/SysUserService')

module.exports = {
    ApiService,
    SysUserService
}
