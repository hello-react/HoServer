const { Constants } = require('@hosoft/restful-api-framework/base')

/**
 * for unit test only
 */
class TestController {
    initRoutes(container, router) {
        router.def('Test', [...Constants.API_DEF_ROUTE_ACTIONS, 'batch_update', 'batch_delete'], { open: true })
        router.def('Test.p4', null, { open: true })
        router.def('Test.p5', null, { open: true })
        router.def('Test.p5.s2', null, { open: true })
        router.def('Test.p6', null, { open: true })
        router.def('Test.p6.t3', null, { open: true })
        router.def('Test.p6.t3.ts3', null, { open: true })
    }
}

module.exports = new TestController()
