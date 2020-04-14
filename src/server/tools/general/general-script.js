/* eslint-disable no-unused-vars,standard/no-callback-literal */
const _ = require('lodash')
const config = require('config')
const Constants = require('../../framework/base/constants/constants')
const fileUtils = require('../../framework/utils/file-utils')
const fs = require('fs')
const Model = require('../../framework/models/Model')
const moment = require('moment')
const mongoose = require('mongoose')
const path = require('path')
const winston = require('../../framework/utils/winston-log')

global.PAGE_SIZE = 10
global.APP_PATH = process.cwd()
global.logger = winston.getLogger()

const db_connection_url = config.get('db.url')
mongoose.connect(db_connection_url, async err => {
    if (err) throw err
    console.log('connected to db success')

    // init global models
    global.DB_MODELS = await Model.find({}).lean()
    await require('../../framework/models')

    execute_script(() => {
        console.log('DONE!!!')
        process.exit()
    })
})

/**
 * 工具脚本
 * @param callback
 * @returns {Promise<void>}
 */
const execute_script = async callback => {
    const { BaseHelper } = require('../../framework/base')

    const container = BaseHelper.getContainer()
    container.initialize(null, async () => {
        const { Model, Dictionary } = require('../../framework/models')
        // do something here
        const models = await Model.find({})

        for (const m of models) {
            let order = 5
            for (const p of m.properties) {
                // if (p.properties) {
                //     let subOrder = 5
                //     for (const subp of p.properties) {
                //         subp.order = subOrder
                //         subp.require = undefined
                //         subOrder += 5
                //     }
                // }
            }
        }

        callback && callback(true)
    })
}
