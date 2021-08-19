/* eslint-disable sort-requires/sort-requires */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/02/29
 **/

const ApiService = require('./api/ApiService')
const ContentService = require('./content/ContentService')
const MessageService = require('./message/MessageService')

module.exports = {
    ApiService,
    ContentService,
    MessageService
}
