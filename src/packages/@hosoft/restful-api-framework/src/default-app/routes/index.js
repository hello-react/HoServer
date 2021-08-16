/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/
const Constants = require('../../base/constants/constants')

module.exports = {
    init: (container, router, app) => {
        // prettier-ignore
        router.get('/', tf('versionInfo'), async context => {
            return `Welcome! HoServer API Service (ver${Constants.SERVER_VERSION})`
        }, { private: true, open: true, type: 1 })

        app.use(require('./upload'))
    }
}
