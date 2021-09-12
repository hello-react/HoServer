const { MessageService } = require('@hosoft/restful-api-framework/services')

/**
 * Message api，used for system notification, user messages, badges etc.
 */
class MessageController {
    initRoutes(container, router) {
        router.get(
            '/messages',
            t('getMessageList'),
            ctx => MessageService.getMessageList(ctx.currentUserId, ctx.query),
            { model: 'Message' }
        )

        router.post(
            '/message/read_status',
            t('setMessageReadStatus'),
            ctx => MessageService.setMessageReadStatus(ctx.currentUserId, ctx.body),
            { model: 'Message' }
        )
    }
}

module.exports = new MessageController()
