/* eslint-disable handle-callback-err */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/06/05
 **/

const _ = require('lodash')
const Backend = require('i18next-fs-backend')
const bodyParser = require('body-parser')
const config = require('@hosoft/config')
const Constants = require('./base/constants/constants')
const Database = require('./db')
const express = require('express')
const fileUtils = require('./utils/file-utils')
const fs = require('fs')
const i18next = require('i18next')
const path = require('path')
const schedule = require('node-schedule')
const sleep = require('./utils/sleep')
const winston = require('./utils/winston-log')

require('body-parser-xml')(bodyParser)

process.on('unhandledRejection', (reason, p) => {
    const err = reason.stack || reason
    logger.error('Unhandled Rejection: ' + (typeof err === 'object' ? JSON.stringify(err) : err))
})

class Bootstrap {
    constructor(workingDir) {
        if (!global.APP_PATH) {
            global.APP_PATH = workingDir || process.cwd()
        }

        global.logger = winston.getLogger()

        // for cluster mode
        this.clusterHasInit = false
        this.isMaster = false
        this.discover = null
    }

    async startServer(app, port, callback) {
        const clusterMode = process.env.CLUSTER_MODE
        if (clusterMode) {
            this.initClusterMode(port, clusterMode)

            // wait cluster init
            while (!this.clusterHasInit) {
                await sleep(1000)
            }
        }

        await this.initL18n()
        await Database.init()

        await this.startExpressApp(app, port, callback)
    }

    async initL18n() {
        // prettier-ignore
        const tf = await i18next.createInstance().use(Backend).init({
            // debug: true,
            initImmediate: false,
            fallbackLng: 'en',
            lng: config.get('server.language') || 'en',
            ns: ['framework'],
            defaultNS: 'framework',
            backend: {
                loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json')
            }
        })

        // prettier-ignore
        const t = await i18next.createInstance().use(Backend).init({
            lng: config.get('server.language') || 'en',
            fallbackLng: 'en',
            ns: ['app'],
            defaultNS: 'app',
            backend: {
                loadPath: path.join(global.APP_PATH, 'locales/{{lng}}/{{ns}}.json')
            }
        })

        // t is for app, while tf if internal used in framework
        global.tf = tf
        global.t = t
    }

    async initClusterMode(port, clusterMode) {
        const Discover = require('node-discover')

        const discover = Discover({
            // helloInterval: 5000,
            port: 3100,
            start: false
        })

        if (clusterMode.toString().toLowerCase() !== 'master') {
            discover.demote(true)
        }

        // promoted to a master
        discover.on('promotion', (obj) => {
            logger.info('node promotion to a cluster master node: ' + obj.address)
            this.isMaster = true
            this.clusterHasInit = true
        })

        // demoted from being a master
        discover.on('demotion', () => {
            this.isMaster = false
        })

        discover.on('added', (obj) => {
            if (this.isMaster) {
                discover.send('master-address', { port })
            }
        })

        // d.on('removed', (obj) => { })
        discover.on('master', (obj) => {
            logger.info('cluster master node update: ' + obj.address)
            this.isMaster = !!(_.get(discover, ['broadcast', 'instanceUuid']) === obj.id)
        })

        config.getOptions().onSet = (key, value) => {
            discover.send('config-set', { key, value })
        }

        let success = discover.join('config-set', (data) => {
            logger.info(`get cluster config set, ${data.key}: ${data.value}`)
            if (data.key) {
                config.set(data.key, data.value)
                config.save()
            }
        })

        // prettier-ignore
        success = success && discover.join("master-address", async (data, eventInfo, nodeInfo) => {
            if (this.clusterHasInit) {
                return
            }

            const masterHost = nodeInfo.address
            const masterPort = data.port

            const result = await fileUtils.getWebFileContent(
                `http://${masterHost}:${masterPort}${Constants.API_PREFIX}/system/configs`
            )
            if (result.code / 1 !== 200) {
                console.error('get config from cluster master node failed!', result.message)
                process.exit()
            }

            const configContent = result.data
            fileUtils.saveJsonFile(config.getConfigFile(), configContent, true)
            config.reload()

            logger.info(`cluster node init success, master node: ${masterHost}(${masterPort})`)
            this.clusterHasInit = true
            setTimeout(() => {
                discover.demote(false) // now allow to be master
            }, discover.settings.checkInterval * 5)
        })

        if (!success) {
            console.error('join cluster channel failed!')
            process.exit()
        }

        discover.start()
    }

    async startExpressApp(_app, port, callback) {
        const app = _app || express()
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

        // init routers
        const container = require('./base/container').getInstance()
        callback && callback('beforeStart', container)

        container.initialize(app, () => {
            // start listen
            app.listen(port)

            // cron jobs, for long time execute jobs, please run it in standalone process
            const enableJob = config.get('server.enableJob') || false
            if (enableJob) {
                const taskDir = global.APP_PATH + '/jobs'
                fs.readdirSync(taskDir)
                    .filter(function (file) {
                        return path.extname(file) === '.js'
                    })
                    .forEach(function (file) {
                        const job = require(path.join(taskDir, file))
                        if (job.cron && job.func) {
                            schedule.scheduleJob(job.cron, job.func)
                        }
                    })

                console.log('BACKGROUND JOBS: enabled')
            }

            callback && callback('startSucess')
        })
    }
}

module.exports = function (workingDir) {
    return new Bootstrap(workingDir)
}
