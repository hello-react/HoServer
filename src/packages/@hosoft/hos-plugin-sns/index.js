/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/04/25
**/
const _ = require('lodash')
const MessageService = require('../../../server/services/message/MessageService')
const { BaseHelper, DbHelper } = require('@hosoft/restful-api-framework/helpers')
const { CacheManager } = require('@hosoft/restful-api-framework/base')
const { Content, User } = require('@hosoft/restful-api-framework/models')

/**
 * Social plugin, add friend, comments, like, favorite functions support to server
 */
class SocialPlugin {
    init(container, router, app) {
        const SNSService = BaseHelper.getServiceInst('SNSService')

        // friends
        router.def('Friend', 'list').afterProcess(async ctx => {
            await this._fillFriendRelUser(ctx)
        })
        router.def('Friend', ['update', 'create'])
        router.def('Friend', 'create').afterProcess(async ctx => {
            await CacheManager.deleteCache('friend', String(ctx.currentUserId))
            // Need not to await
            this._sendNotificationMsg('follow', ctx)
        })
        router.delete('/sns/friends', tp('deleteFriend'), async ctx => {
            return SNSService.deleteFriend(ctx.currentUserId, ctx.body)
        })
        router.get('/sns/friends/post', tp('getFriendPost'), async ctx => {
            return SNSService.getFriendPost(ctx.currentUserId, ctx.query)
        })

        // comments
        router.def('Comment', ['list'])
        router.def('Comment', ['create']).afterProcess(async ctx => {
            this._sendNotificationMsg('comment', ctx)
            SNSService.updateContentStat(ctx.currentUserId, 'comment', 1, ctx.body.type_id)
        })

        router.def('Comment', ['delete']).afterProcess(async ctx => {
            SNSService.updateContentStat(ctx.currentUserId, 'comment', -1, ctx.params.id)
        })

        router.def('Comment', ['batch_delete']).afterProcess(async ctx => {
            SNSService.updateContentStat(ctx.currentUserId, 'comment', -1, ctx.body.id)
        })

        // forwards, favorites
        // router.def('Forward', 'create').afterProcess(async ctx => {
        //     this._sendNotificationMsg('favorite', ctx)
        //     SNSService.updateContentStat(ctx.currentUserId, 'forward', 1, ctx.body.type_id)
        // })

        router.def('Favorite', 'list').afterProcess(async ctx => {
            await SNSService.fillRelContents(_.get(ctx, ['result', 'list']))
        })
        router.def('Favorite', 'create').afterProcess(async ctx => {
            this._sendNotificationMsg('favorite', ctx)
            SNSService.updateContentStat(ctx.currentUserId, 'favorite', 1, ctx.body.type_id)
        })

        router.delete('/sns/favorites', tp('deleteFavorite'), async ctx => {
            return SNSService.deleteFavorite(ctx.currentUserId, ctx.body)
        })

        // likes
        router.post('/sns/likes', tp('toggleLike'), async ctx => {
            return SNSService.toggleLike(ctx.currentUserId, ctx.body)
        })

        // sns statistics
        router.get('/sns/:user_id/stat', tp('getUserSnsStat'), async ctx => {
            const userId = ctx.params.user_id
            return SNSService.getUserSnsStat(userId, ctx.currentUserId)
        })

        // Content api hooks
        setTimeout(() => this._hookContentApi(), 3000)
    }

    async _hookContentApi() {
        const SNSService = BaseHelper.getServiceInst('SNSService')

        const contentDetailApi = await BaseHelper.getContainer().getRoute('/api/v1/content/contents/:id')
        if (contentDetailApi) {
            contentDetailApi.afterProcess(async ctx => {
                await SNSService.fillMySnsStats(ctx.currentUserId, [ctx.result])
            })
        }

        const contentListApi = await BaseHelper.getContainer().getRoute('/api/v1/content/contents')
        if (contentListApi) {
            contentListApi.afterProcess(async ctx => {
                const contents = _.get(ctx, ['result', 'list']) || []
                for (const c of contents) {
                    if (!c.summary && c.content) {
                        c.summary = c.content.substr(0, 60) + '...'
                    }

                    delete c.content
                }

                if (ctx.query.fill_my_stat) {
                    await SNSService.fillMySnsStats(ctx.currentUserId, contents)
                }
            })
        }
    }

    async _fillFriendRelUser(context) {
        const { query, result } = context
        if (query.user_id) {
            await DbHelper.populateData(result, 'friend_user_id', User, 'user_id', '', '', 'friend_user_rel')
        }

        if (query.friend_user_id) {
            await DbHelper.populateData(result, 'user_id', User, 'user_id', '', '', 'user_rel')
        }
    }

    async _sendNotificationMsg(action, context) {
        let content
        switch (action) {
            case 'follow':
                MessageService.createMessage({
                    from: context.currentUserId,
                    to: context.body.friend_user_id,
                    to_scope: 'personal',
                    action: 'follow'
                })
                break
            case 'comment':
                content = await Content.findOne({ id: context.body.type_id })
                MessageService.createMessage({
                    from: context.currentUserId,
                    to: content.author,
                    to_scope: 'personal',
                    action: context.body.reply_id ? 'replay_comment' : 'comment',
                    type: context.body.type,
                    type_id: context.body.type_id,
                    message: {
                        id: context.result,
                        reply_id: context.body.reply_id,
                        comments: context.body.comments
                    }
                })
                break
            case 'forward':
                content = await Content.findOne({ id: context.body.type_id })
                MessageService.createMessage({
                    from: context.currentUserId,
                    to: content.author,
                    to_scope: 'personal',
                    action: 'forward',
                    type: context.body.type,
                    type_id: context.body.type_id,
                    message: {
                        id: context.result,
                        title: content ? content.title : ''
                    }
                })
                break
            case 'favorite':
                content = await Content.findOne({ id: context.body.type_id })
                MessageService.createMessage({
                    from: context.currentUserId,
                    to: content.author,
                    to_scope: 'personal',
                    action: 'favorite',
                    type: context.body.type,
                    type_id: context.body.type_id,
                    message: {
                        id: context.result,
                        title: content ? content.title : ''
                    }
                })
                break
        }
    }
}

module.exports = new SocialPlugin()
