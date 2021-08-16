/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
**/
const MessageService = require('../../../../server/services/message/MessageService')
const { CacheManager, Constants, ErrorCodes } = require('@hosoft/restful-api-framework/base')
const { Comment, Content, Forward, Favorite, Friend, Like } = require('@hosoft/restful-api-framework/models')
const { DbHelper } = require('@hosoft/restful-api-framework/helpers')

/**
 * SNS Service
 */
class Index {
    /**
     * like/dislike
     */
    async toggleLike(userId, args) {
        const { type_id } = args
        const content = await Content.findOne({ id: type_id })
        if (!content) {
            return Promise.reject({ message: tp('errContentNotFound'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const like = await Like.findOne({ type: 'topic', type_id: content.id, user_id: userId })
        if (!like) {
            const newLike = await Like.create({
                type: 'topic',
                type_id: content.id,
                user_id: userId,
                type_user_id: content.author
            })

            // send notify message
            MessageService.createMessage({
                from: userId,
                to: content.author,
                to_scope: 'personal',
                action: 'like',
                type: 'topic',
                type_id: content.id,
                message: { id: newLike.id, title: content.title }
            })

            this.updateContentStat(userId, 'like', 1, content.id)
            return { action: 'create', id: newLike.id }
        } else {
            await Like.deleteOne({
                id: like.id
            })

            this.updateContentStat(userId, 'like', -1, content.id)
            return { action: 'delete', id: like.id }
        }
    }

    /**
     * Update content statistics after comment, like, forward, and favorite operations
     */
    async updateContentStat(userId, type, count, idList) {
            if (!['like', 'comment', 'forward', 'favorite'].includes(type)) {
            return Promise.reject({ message: tp('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        if (idList instanceof Array) {
            await Content.updateMany({ id: { $in: idList } }, { $inc: { [`stat.${type}`]: count } })
        } else {
            await Content.updateOne({ id: idList }, { $inc: { [`stat.${type}`]: count } })
        }

        // reset cache
        await CacheManager.deleteCache(type, String(userId))
    }

    /**
     * Fill current user SNS comments, likes, and forwarding stat data,
     * A user will not have too much data, directly use the cache
     */
    async fillMySnsStats(userId, contents) {
        const myFriends = await this._getUserFriends(userId)

        let myComments = await CacheManager.getCache('comment', String(userId))
        if (!myComments) {
            myComments = await Comment.find({ user_id: userId }, null, 'id type_id')
            await CacheManager.setCache('comment', String(userId), myComments)
        }

        let myLikes = await CacheManager.getCache('like', String(userId))
        if (!myLikes) {
            myLikes = await Like.find({ user_id: userId }, null, 'id type_id')
            await CacheManager.setCache('like', String(userId), myLikes)
        }

        let myForwards = await CacheManager.getCache('forward', String(userId))
        if (!myForwards) {
            myForwards = await Forward.find({ user_id: userId }, null, 'id type_id')
            await CacheManager.setCache('forward', String(userId), myForwards)
        }

        const myFavorite = await this._getUserFavorites(userId)

        for (const c of contents) {
            const doc = c._doc || c
            doc.my_stat = {}
            doc.my_stat.follow = !!myFriends.find(r => r.friend_user_id.equals(doc.author))
            doc.my_stat.like = !!myLikes.find(r => r.type_id.equals(doc.id))
            doc.my_stat.comment = !!myComments.find(r => r.type_id.equals(doc.id))
            doc.my_stat.forward = !!myForwards.find(r => r.type_id.equals(doc.id))
            doc.my_stat.favorite = !!myFavorite.find(r => r.type_id.equals(doc.id))
        }
    }

    /**
     * delete favorite
     */
    async deleteFavorite(userId, args) {
        const { id, type, type_id } = args
        if (!(userId && (id || (type && type_id)))) {
            return Promise.reject({ message: tp('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const query = {
            user_id: userId
        }

        if (id) {
            query.id = id
        } else {
            query.type = type
            query.type_id = type_id
        }

        const favorite = await Favorite.findOne(query)
        if (!favorite) {
            return Promise.reject({ message: tp('favoriteItemNotFound'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        await favorite.delete()
        this.updateContentStat(userId, 'favorite', -1, favorite.type_id)

        return 'success'
    }

    /**
     * delete friend
     */
    async deleteFriend(userId, args) {
        const { id, friend_user_id } = args
        if (!(userId && (id || friend_user_id))) {
            return Promise.reject({ message: tp('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const query = {
            user_id: userId
        }

        if (id) {
            query.id = id
        } else {
            query.friend_user_id = friend_user_id
        }

        const friend = await Friend.findOne(query)
        if (!friend) {
            return Promise.reject({ message: tp('errFriendNotFound'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        await friend.delete()
        await CacheManager.deleteCache('friend', String(userId))

        return 'success'
    }

    /**
     * Get a list of content posted by friends
     */
    async getFriendPost(userId, args) {
        const myFriends = await this._getUserFriends(userId)
        if (!myFriends) {
            return []
        }

        const page = args.page || 1
        const pageSize = args.page_size || Constants.PAGE_SIZE
        delete args.page
        delete args.page_size

        const friendIds = myFriends.map(f => f.friend_user_id)
        const friendPosts = await Content.find(
            {
                ...args,
                author: { $in: friendIds }
            },
            {
                sort: { updated_at: -1 },
                page: page,
                limit: pageSize
            }
        )

        for (const c of friendPosts) {
            if (!c.summary && c.content) {
                c.summary = c.content.substr(0, 60) + '...'
            }

            delete c.content
        }

        return friendPosts
    }

    /**
     * get user SNS stat data
     * @param userId
     */
    async getUserSnsStat(userId, currentUserId) {
        const friends = await this._getUserFriends(userId)
        const favorites = await this._getUserFavorites(userId)
        const contents = await Content.paginate({ author: userId }, { limit: 6, lean: true })
        const followers = await this._getUserFollowers(userId)

        const snsStat = {
            favorites: favorites.length,
            friends: friends.length,
            followers: followers.length,
            contents: contents
        }

        if (String(userId) != String(currentUserId)) {
            const userFriends = await this._getUserFriends(currentUserId)
            const muFriends = await this._getUserFriends(userId)
            snsStat.has_follow = !!userFriends.find(f => f.friend_user_id.equals(userIdObj))
            snsStat.follow_me = !!muFriends.find(f => f.friend_user_id.equals(currentUserId))
        }

        return snsStat
    }

    async fillRelContents(dataList) {
        return DbHelper.populateData(dataList, 'type_id', Content, 'id')
    }

    async _getUserFavorites(userId) {
        let userFavorite = await CacheManager.getCache('favorite', String(userId))
        if (!userFavorite) {
            userFavorite = await Favorite.find({ user_id: userId }, null, 'id type_id')
            await CacheManager.setCache('favorite', String(userId), userFavorite)
        }

        return userFavorite
    }

    async _getUserFriends(userId) {
        let userFriends = await CacheManager.getCache('friend', String(userId))
        if (!userFriends) {
            userFriends = await Friend.find({ user_id: userId }, null, 'id friend_user_id')
            await CacheManager.setCache('friend', String(userId), userFriends)
        }

        return userFriends
    }

    async _getUserFollowers(userId) {
        let userFriends = await CacheManager.getCache('follower', String(userId))
        if (!userFriends) {
            userFriends = await Friend.find({ friend_user_id: userId }, null, 'id user_id')
            await CacheManager.setCache('follower', String(userId), userFriends)
        }

        return userFriends
    }
}

module.exports = new Index()
