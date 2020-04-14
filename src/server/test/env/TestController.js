const { Constants } = require('../../framework/base')

/**
 * 仅用于测试
 */
class TestController {
    initRoutes(container, router) {
        router.def('Test', [...Constants.API_DEF_ROUTE_ACTIONS, 'batch_update'], { permissions: [], public: true })
        router.def('Test.p4', null, { permissions: [], public: true })
        router.def('Test.p5', null, { permissions: [], public: true })
        router.def('Test.p5.s2', null, { permissions: [], public: true })
        router.def('Test.p6', null, { permissions: [], public: true })
        router.def('Test.p6.t3', null, { permissions: [], public: true })
        router.def('Test.p6.t3.ts3', null, { permissions: [], public: true })
    }
}

module.exports = new TestController()
