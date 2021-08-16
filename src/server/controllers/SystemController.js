/**
 * System manage apis
 */
class SystemController {
    initRoutes(container, router) {
        // tags
        router.def('Tags')
        router.def('Tags', 'list').beforeDbProcess((ctx, query, options) => {
            // user_id null is system tags
            query.user_id = { $in: [null, ctx.currentUserId] }
        })

        // TODO: feedback plugin
        // router.def('Feedback', ['create', 'list', 'delete'])
    }
}

module.exports = new SystemController()
