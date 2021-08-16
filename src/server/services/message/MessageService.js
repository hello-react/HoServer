const _ = require('lodash')
const moment = require('moment')
const { CacheManager, Constants, ErrorCodes } = require('@hosoft/restful-api-framework/base')
const { DbHelper } = require('@hosoft/restful-api-framework/helpers')
const { Message, MessageReadStatus, User } = require('@hosoft/restful-api-framework/models')

/**
 * System message service
 */
class MessageService {
    /**
     * Get the message list, query the messages within 1 year at most
     * @param userId
     */
    async getMessageList(userId, args) {
        let { to_scope, to, type, offset, page_size, read_status, timestamp } = args

        page_size = parseInt(page_size) || Constants.PAGE_SIZE
        offset = parseInt(offset) || 0

        const query = {}
        if (to_scope) {
            query.to_scope = to_scope
        }

        if (type) {
            query.type = type
        }

        if (to) {
            query.to = to
        }

        if (read_status !== undefined) {
            query.read_status = parseInt(read_status) === 1 ? 1 : { $ne: 1 }
        }

        const maxDate = moment().add(-1, 'years')
        if (timestamp) {
            query.created_at = { $lte: new Date(timestamp), $gt: maxDate.toDate() }
        } else {
            query.created_at = { $gte: maxDate.toDate() }
        }

        const aggregateQuery = [{ $match: query }]
        if (to_scope !== 'personal') {
            aggregateQuery.push({
                $lookup: {
                    from: 'message_read_status',
                    localField: 'id',
                    foreignField: 'message_id',
                    as: 'read_status_rel'
                }
            })
        }

        if (query.read_status) {
            aggregateQuery.push({
                $match: { 'read_status_rel.read_status': query.read_status }
            })
        }

        aggregateQuery.push({ $sort: { created_at: -1 } })
        aggregateQuery.push({ $skip: offset })
        aggregateQuery.push({ $limit: page_size * 2 }) // there is filtering, read twice as much data each time

        const result = { offset: offset, page_size: page_size, records: [] }
        const resultHash = {}

        while (result.records.length < page_size) {
            const messages = await Message.aggregate(aggregateQuery)
            if (!messages || messages.length == 0) break

            // organize data
            await DbHelper.populateData(messages, 'from', User, 'user_id')
            if (to_scope !== 'personal') {
                for (const message of messages) {
                    if (message.to_scope === 'site') {
                        message.read_status = _.get(message.read_status_rel, 'read_status', 0)
                    }

                    delete message.read_status_rel
                }
            }

            // merge data
            for (let i = 0; i < messages.length; i++) {
                const message = messages[i]
                const newMsgRow = await this._mergeMessage(message, resultHash)
                if (newMsgRow) {
                    if (result.records.length === page_size) break
                    result.records.push(newMsgRow)
                    resultHash[newMsgRow.hash] = newMsgRow
                }

                result.offset++
            }

            aggregateQuery[aggregateQuery.length - 2].$skip = result.offset
            if (messages.length < page_size * 2) break
        }

        // keep up to 3 records
        this._trimSameKindMessage(result.records)

        // TODO: reset badge
        // this._getImController().resetNotificationHistory(userId, 'message', null)

        // remove hash
        if (result.records) {
            for (const record of result.records) {
                if (record.hash) {
                    delete record.hash
                }
            }
        }

        return result
    }

    /**
     * create message
     * @param context
     * @returns {Promise<void>}
     */
    async createMessage(args) {
        if (!(args.to_scope && args.action)) {
            return Promise.reject({ message: tf('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const newMessage = await Message.create(args)
        logger.info(`New message created, id: ${newMessage.id}, action: ${newMessage.action}`)

        // reset cache
        if (args.to_scope === 'personal') {
            await CacheManager.deleteCache('UnreadMessages', args.to)

            // TODO: notice client to refresh badge
            // emitter.pushNotice(message.to + '', { data: null })
        }

        return newMessage
    }

    /**
     * set message status as read
     * @returns {Promise<void>}
     */
    async setMessageReadStatus(userId, msgIds) {
        if (typeof msgIds === 'string') {
            msgIds = msgIds.split(',')
        }

        const messagesToSet = await Message.find({ to: userId, id: { $in: msgIds } })

        if (messagesToSet.length > 0) {
            const messageStatusIds = []

            for (const message of messagesToSet) {
                if (!message.to_scope || message.to_scope === 'personal') {
                    message.read_status = 1
                    await message.save()
                    logger.info(`Personal message status set: ${message.id}, ${message.read_status}`)
                } else {
                    messageStatusIds.push(message.id)
                }
            }

            if (messageStatusIds.length > 0) {
                const existMessageStatus = await MessageReadStatus.find({
                    message_id: { $in: messageStatusIds },
                    to: userId
                })
                for (const msgId of messageStatusIds) {
                    const existMsgStat = existMessageStatus.find((item) => item.message_id == msgId)
                    if (existMsgStat) {
                        existMsgStat.read_status = 1
                        existMsgStat.read_time = Date.now()
                        await existMsgStat.save()
                        logger.info(`Scope message status set: ${msgId}, ${existMsgStat.read_status}`)
                    } else {
                        const newRecord = await MessageReadStatus.create({
                            message_id: msgId,
                            to: userId,
                            read_status: 1,
                            read_time: Date.now()
                        })

                        logger.info(
                            `Message status newRecord created, msg: ${msgId}, to: ${userId}, id: ${newRecord.id}`
                        )
                    }
                }
            }

            // emitter.pushNotice(to + '', { data: unreadMessasges })
        }
    }

    /// /////////// private functions /////////////

    /**
     * get time range display string
     * @param time
     * @returns {{slot: number, range: number, range_unit: string}}
     */
    _getTimeRange(time) {
        const now = moment().utc()
        time = time.utc()

        // unit is second
        const rangeSec = (now - time) / 1000.0 / 60.0
        let slot = 1.0
        let range = 1.0
        let range_unit = ''

        // within 1 hour
        if (rangeSec < 60) {
            slot = 1
            range = Math.ceil(rangeSec)
            range_unit = t('minute')
        }
        // within 1 day
        else if (rangeSec < 1440 /* 60*24 */) {
            slot = 2
            range = Math.ceil(rangeSec / 60)
            range_unit = t('hour')
        }
        // witin 1 week
        else if (rangeSec < 10080 /* 60*24*7 */) {
            slot = 3
            range = Math.ceil(rangeSec / 1440)
            range_unit = t('day')
        }
        // within 1 month
        else if (rangeSec < 43200 /* 60*24*30 */) {
            slot = 4
            range = Math.ceil(rangeSec / 10080)
            range_unit = t('week')
        }
        // within 3 month
        else if (rangeSec < 131040 /* 60*24*91 */) {
            slot = 5
            range = Math.ceil(rangeSec / 43200)
            range_unit = t('month')
        }
        // more than 3 months
        else {
            slot = 6
            range = Math.ceil(rangeSec / 43200)
            range_unit = t('month')
        }

        return {
            slot: slot,
            range: range,
            range_unit: range_unit
        }
    }

    /**
     * meerge same type records, keep up to 3 records
     */
    _trimSameKindMessage(messages) {
        for (let i = 0; i < messages.length; i++) {
            const msgData = messages[i]
            if (msgData.id && msgData.id.length > 2) {
                msgData.id_count = msgData.id.length
                msgData.id.splice(2)
            }

            if (msgData.user && msgData.user.length > 2) {
                msgData.user_count = msgData.user.length
                msgData.user.splice(2)
            }
        }
    }

    /**
     * Message merge, the merge rules are as follows:
     *
     * Displayed N hours ago for time of current day, N is rounded down, for example:
     *   1 hour and 30 minutes, then display 2 hours ago
     * Less than 1 hour, display N minutes ago, N rounded down, for example:
     *   55 minutes and 30 seconds, display 56 minutes ago
     * Less than 1 minute, display 1 minute ago
     * Within a week, if more than one day is displayed N days ago, N is rounded up, for example:
     *   1 day and 1 hour, display 1 day ago
     * Two weeks-within one month, merge one week before the other, showing 2 weeks ago, 3 weeks ago, 4 weeks ago
     * One month-3 months, combined one month and one month, showing 1 month ago, 2 months ago, 3 months ago
     * More than three months, all merged, show as three months ago
     */
    async _mergeMessage(message, resultHash) {
        const createTime = moment(message.created_at)
        const timeRange = this._getTimeRange(createTime)
        const hash = `${timeRange.slot}_${message.from}_${message.action}_${message.type}_${message.type_id}`

        const user = message.from_rel || {}

        if (resultHash[hash]) {
            const existRow = resultHash[hash]
            // The same user only count once in the same time slot
            const existUser = existRow.user.findIndex((item) => item.user_id === user.user_id)
            if (existUser < 0) {
                existRow.id.push(message.id) // message id
                existRow.user.push(user)
                existRow.count++
            }

            return null
        } else {
            const newRow = {
                hash: hash,
                id: [message.id],
                user: [user],
                action: message.action,
                message: message.message,
                timestamp: message.created_at,
                time_range: timeRange,
                type: message.type,
                type_id: message.type_id,
                read_status: message.read_status,
                count: 1
            }

            return newRow
        }
    } // END: for
}

module.exports = new MessageService()
