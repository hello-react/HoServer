/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/07/01
 **/
const _ = require('lodash')
const config = require('@hosoft/config')
const MongoDB = require('./mongodb')
const RDB = require('./rdb')

/**
 * Database wrapper
 */
class Database {
    constructor() {
        this.dbClasses = []
    }

    async init() {
        const dbConfigs = config.get('db') || {}
        const dbAdapters = [
            {
                name: ['mongo'],
                class: MongoDB
            },
            {
                name: ['mysql', 'postgres', 'mysql', 'mssql', 'mariadb', 'sqlite'],
                class: RDB
            }
        ]

        let dbModels = []

        for (const da of dbAdapters) {
            for (const dbName of da.name) {
                const dbConfig = dbConfigs[dbName]
                if (dbConfig) {
                    // eslint-disable-next-line new-cap
                    const dbClass = new da.class()
                    try {
                        await dbClass.initDb(dbConfig, dbName)
                        dbClass.name = dbName
                        dbClass.isDefault = dbConfig.default
                        this.dbClasses.push(dbClass)
                    } catch (err) {
                        console.error(`init db ${dbName} failed: `, err)
                        process.exit()
                    }

                    const models = await dbClass.getModels()
                    dbModels = _.concat(dbModels, models)
                }
            }
        }

        global.DB_MODELS = dbModels
    }

    getDb(dbType) {
        if (dbType == 'default') {
            return this.getDefaultDb()
        }

        return this.dbClasses.find((db) => db.name === dbType)
    }

    getDefaultDb() {
        let dbClass = this.dbClasses.find((db) => db.isDefault === true)
        if (!dbClass) {
            dbClass = this.dbClasses.find((db) => db.isDefault !== false)
        }

        if (!dbClass) {
            dbClass = this.dbClasses[0]
        }

        return dbClass
    }
}

module.exports = new Database()
