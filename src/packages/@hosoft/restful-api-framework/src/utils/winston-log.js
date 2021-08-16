/**
 * winston logger
 *
 */

'use strict'

const config = require('@hosoft/config')
const Elasticsearch = require('winston-elasticsearch')
const MongoDB = require('winston-mongodb').MongoDB
const os = require('os')
const path = require('path')
const winston = require('winston')

let logger = null

// init log
function initialize() {
    if (logger != null) {
        return logger
    }

    const transports = []
    const hostName = os.hostname()
    const maskFormat = winston.format((info) => {
        info.process = process.pid
        info.host = hostName
        return info
    })

    if (config.get('log.console')) {
        transports.push(
            new winston.transports.Console({
                level: config.get('log.console'),
                format: winston.format.combine(winston.format.colorize(), winston.format.simple())
            })
        )
    }

    if (config.get('log.file')) {
        // new winston.transports.File({ filename: 'render_farm_error.log', level: 'error' }),
        transports.push(
            new winston.transports.File({
                filename: path.join(global.APP_PATH || __dirname, 'logs', 'hoserver.log'),
                logstash: true,
                showLevel: true,
                depth: 2,
                timestamp: true,
                level: config.get('log.file'),
                format: winston.format.combine(
                    winston.format.timestamp(),
                    maskFormat(),
                    winston.format.metadata(),
                    winston.format.json()
                )
            })
        )
    }

    const esUrl = config.get('db.elasticsearch.host')
    if (esUrl && config.get('log.elasticsearch')) {
        const esTransportOpts = {
            indexSuffixPattern: 'YYYY_MM',
            level: config.get('log.elasticsearch'),
            clientOpts: {
                host: esUrl
            },
            format: winston.format.combine(
                winston.format.timestamp(),
                maskFormat(),
                winston.format.metadata(),
                winston.format.simple()
            )
        }

        transports.push(new Elasticsearch(esTransportOpts))
    }

    if (config.get('log.mongo')) {
        const mongoUrl = config.get('db.mongo.url')
        if (mongoUrl) {
            transports.push(
                new MongoDB({
                    level: config.get('log.mongo'),
                    db: mongoUrl,
                    options: { useUnifiedTopology: true, useNewUrlParser: true },
                    collection: 'sys_serverlog',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        maskFormat(),
                        winston.format.metadata(),
                        winston.format.simple()
                    )
                })
            )
        }
    }

    const logColors = {
        debug: 'green',
        info: 'cyan',
        warn: 'yellow',
        error: 'red',
        persist: 'blue'
    }

    logger = winston.createLogger({
        levels: {
            persist: 0, // will save to db
            error: 1,
            warn: 2,
            info: 3,
            debug: 4
        },
        transports: transports
    })

    winston.addColors(logColors)
    return logger
}

module.exports = {
    getLogger: initialize
}
