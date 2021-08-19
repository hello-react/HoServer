const { Constants } = require('@hosoft/restful-api-framework/base')

/**
 * Content manage apis
 */
class ContentController {
    initRoutes(container, router) {
        router.def('Content', [...Constants.API_DEF_ROUTE_ACTIONS, 'batch_update'])
        router.def('Content', 'list').beforeDbProcess((ctx, query) => {
            if (!(query.category || ctx.isAdmin())) {
                query.category = { $ne: 'sys' }
            }
        })
    }
}

module.exports = new ContentController()
