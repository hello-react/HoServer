const { Constants } = require('@hosoft/restful-api-framework/base')

/**
 * Content manage apis
 */
class ContentController {
    initRoutes(container, router) {
        router.def('Content', [...Constants.API_DEF_ROUTE_ACTIONS, 'batch_update'])

        router
            .def('Content', 'list')
            .outFields('content')
            .beforeDbProcess((ctx, query) => {
                if (ctx.query.search) {
                    // prettier-ignore
                    query.$or = [
                        { title: new RegExp(`.*${ctx.query.search}.*`) },
                        { content: new RegExp(`.*${ctx.query.search}.*`) }
                    ]
                }

                if (!(query.category || ctx.isAdmin())) {
                    query.category = { $ne: 'sys' }
                }
            })
    }
}

module.exports = new ContentController()
