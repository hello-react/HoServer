/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: Jack Zhang
 **/
const Constants = require('../../base/constants/constants')

module.exports = {
    init: (app, container, router) => {
        // prettier-ignore
        router.get('/', '版本信息', async context => {
            return `Welcome! HoServer API Service (ver${Constants.SERVER_VERSION})`
        }, {public: false, permissions: []})

        app.use(require('./upload'))
    }
}
