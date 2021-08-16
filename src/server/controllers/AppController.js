/**
 * App scope api which cannot classified can be put there
 */
class AppController {
    initRoutes(container, router) {
        // define your routes like below
        /*
        router.def('Test', [...Constants.API_DEF_ROUTE_ACTIONS, 'batch_update', 'batch_delete'])
        router.def('Test.p4')

        router.get(
            '/test/test_route',
            'this is the test get api',
            ctx => TestService.getTestFunc(ctx.currentUserId, ctx.query)
        )

        router.post('/test/test_route', 'this is the test post api', ctx => TestService.postTestFunc(ctx.body))
        */
    }
}

module.exports = new AppController()
