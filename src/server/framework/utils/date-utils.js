const moment = require('moment')
const { ErrorCodes } = require('../base')

const getDateQueries = timestamp => {
    if (timestamp) {
        let timeArray = null

        if (typeof timestamp === 'number') {
            return moment(timestamp).toDate()
        } else if (typeof timestamp === 'string') {
            timeArray = timestamp.split(',')
        } else if (timestamp instanceof Array) {
            timeArray = timestamp
        } else {
            timeArray = [timestamp]
        }

        if (timeArray.length === 1) {
            return getDateQuery(timeArray[0])
        } else if (timeArray.length === 2) {
            const firstQuery = getDateQuery(timeArray[0], '$gte')
            const secondQuery = getDateQuery(timeArray[1], '$lte')

            return {
                ...firstQuery,
                ...secondQuery
            }
        } else {
            return Promise.reject({ message: '参数错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }
    }
}

const getDateQuery = (dateTime, defQuery) => {
    let result = {}
    let q = defQuery
    if (dateTime.startsWith('gt:')) {
        q = '$gt'
        dateTime = dateTime.substring(3)
    } else if (dateTime.startsWith('gte:')) {
        q = '$gte'
        dateTime = dateTime.substring(3)
    } else if (dateTime.startsWith('lt:')) {
        q = '$lt'
        dateTime = dateTime.substring(3)
    } else if (dateTime.startsWith('lte:')) {
        q = '$lte'
        dateTime = dateTime.substring(3)
    }

    if (q) {
        result[q] = moment(dateTime)
            .utc()
            .toDate()
    } else {
        result = moment(dateTime)
            .utc()
            .toDate()
    }

    return result
}

module.exports = {
    getDateQueries,
    getDateQuery
}
