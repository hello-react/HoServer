/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: Jack Zhang
 **/

const bodyParser = require('body-parser')
const config = require('config')
const Constants = require('./framework/base/constants/constants')
const express = require('express')
const fileUtils = require('./framework/utils/file-utils')
const fs = require('fs')
const Model = require('./framework/models/Model')
const mongoose = require('mongoose')
const path = require('path')
const schedule = require('node-schedule')
const winston = require('./framework/utils/winston-log')

require('body-parser-xml')(bodyParser)

// global.Promise = require('bluebird');
global._ = require('lodash')
global.logger = winston.getLogger()
global.APP_PATH = __dirname // process.cwd();

process.on('unhandledRejection', (reason, p) => {
    global.logger.error('Unhandled Rejection: ' + (reason.stack || reason))
})

if (config.get('configServer')) {
    fileUtils.getWebFileContent(config.get('configServer') + `${Constants.API_PREFIX}/system/configs`).then(result => {
        if (result.code / 1 !== 200) {
            console.error('get config from config server failed!', result.message)
            process.exit()
        }

        const configContent = result.data
        if (parseFloat(configContent.configVersion) > parseFloat(config.get('configVersion'))) {
            delete configContent.NODE_ENV
            delete configContent.config_file

            for (const fileSource of config.util.getConfigSources()) {
                fileUtils.saveJsonFile(fileSource.name, configContent, true)
            }

            console.info(`config has been updated from: ${config.get('configServer')}, please restart`)
            process.exit()
        }
    })
}

const dbConnectionUrl = config.get('db.url')
mongoose.connect(dbConnectionUrl, { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true })
const db = mongoose.connection
db.on('error', err => console.error('connection error:', err))
db.once('open', async () => {
    global.logger.debug('connected to db success: ' + dbConnectionUrl)

    // init global models
    global.DB_MODELS = await Model.find({})
        .sort({ order: 1 })
        .lean()
    await require('./framework/models')

    // start server
    await startServer()
})

const startServer = async () => {
    const app = express()
    app.set('views', path.join(__dirname, 'views'))
    app.set('view engine', 'ejs')

    app.use(bodyParser.json({ limit: '1mb' }))
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(
        bodyParser.xml({
            limit: '1mb',
            xmlParseOptions: {
                normalize: true,
                normalizeTags: true,
                explicitArray: false
            }
        })
    )

    // init
    const { BaseHelper } = require('./framework/base')
    await BaseHelper.getContainer().initialize(app, () => {
        // start server
        const port = process.env.PORT || config.get('server.port')
        app.listen(port, () => {
            console.log('========== HoServer API Server (v1.0) started on port ' + port + ' ==========')
            // console.log('DB URL: ' + dbConnectionUrl)
            console.log('REDIS HOST: ' + config.get('redis.host'))
            console.log('NODE_ENV: ' + process.env.NODE_ENV)
        })

        // 初始化定时任务
        const enableJob = config.get('server.enableJob') || false
        if (enableJob) {
            const taskDir = global.APP_PATH + '/jobs'
            fs.readdirSync(taskDir)
                .filter(function(file) {
                    return path.extname(file) === '.js'
                })
                .forEach(function(file) {
                    const job = require(path.join(taskDir, file))
                    if (job.cron && job.func) {
                        schedule.scheduleJob(job.cron, job.func)
                    }
                })

            console.log('=====> Background jobs enabled')
        }
    })
}
