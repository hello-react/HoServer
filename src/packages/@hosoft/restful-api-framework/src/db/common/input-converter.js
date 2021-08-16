const Constants = require('../../base/constants/constants')
const ErrorCodes = require('../../base/constants/error-codes')
const moment = require('moment')
const mongoose = require('mongoose')

class InputConverter {
    /**
     * convert input data according type setting
     */
    convertData(val, type, isMongo) {
        if (type === Constants.API_FIELD_TYPE.objectId || type === Constants.API_FIELD_TYPE['array-of-objectId']) {
            if (typeof val === 'string' && /[,|]/.test(val)) {
                val = val = val.split(/[,|]/)
            }

            const convertIdFunc = isMongo ? this._convertObjectId : this._convertObjectIdStr
            val = val instanceof Array ? val.map((v) => convertIdFunc(v)) : convertIdFunc(val)
        } else {
            val = this._convertData(val, type)
        }

        return val instanceof Array ? { $in: val } : val
    }

    /**
     * make date query
     * @param timestamp
     */
    getDateQuery(timestamp) {
        if (timestamp) {
            let timeArray = null

            if (typeof timestamp === 'number') {
                return moment(timestamp).toDate()
            } else if (typeof timestamp === 'string') {
                timeArray = timestamp.split(',')
            } else if (timestamp instanceof Array) {
                timeArray = timestamp
            } else if (typeof timestamp === 'object') {
                return timestamp
            } else {
                timeArray = [timestamp]
            }

            if (timeArray.length === 1) {
                return this._convertDateString(timeArray[0])
            } else if (timeArray.length === 2) {
                const firstQuery = this._convertDateString(timeArray[0], '$gte')
                const secondQuery = this._convertDateString(timeArray[1], '$lte')

                return {
                    ...firstQuery,
                    ...secondQuery
                }
            } else {
                return Promise.reject({ message: 'date format error', code: ErrorCodes.GENERAL_ERR_PARAM })
            }
        }
    }

    _convertData(val, type) {
        if (type === Constants.API_FIELD_TYPE.date) {
            return this.getDateQuery(val)
        }

        if (typeof val === 'string' && type !== Constants.API_FIELD_TYPE.char && /[,|]/.test(val)) {
            val = val.split(/[,|]/)
        }

        const isArray = val instanceof Array

        // prettier-ignore
        switch (type) {
            case Constants.API_FIELD_TYPE.number:
            case Constants.API_FIELD_TYPE['array-of-number']:
                val = isArray
                    ? val.map(v => v / 1)
                    : val / 1
                break
            case Constants.API_FIELD_TYPE.boolean:
            case Constants.API_FIELD_TYPE['array-of-boolean']:
                val = isArray
                    ? val.map(v => v + '' === 'false' ? false : !!(v + ''))
                    : val + '' === 'false' ? false : !!(val + '')
                break
        }

        return val
    }

    /**
     * convert date time string to date query
     */
    _convertDateString(dateTime, defQuery) {
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
            result[q] = moment(dateTime).utc().toDate()
        } else {
            result = moment(dateTime).utc().toDate()
        }

        return result
    }

    _convertObjectId(val) {
        if (val && typeof val === 'string' && val.length === 24) {
            return mongoose.Types.ObjectId(val)
        }

        return val
    }

    /**
     * mongodb objectId is not support for rdb, convert to string
     */
    _convertObjectIdStr(val) {
        if (val && val instanceof mongoose.Types.ObjectId) {
            return String(val)
        }

        return val
    }
}

module.exports = new InputConverter()
