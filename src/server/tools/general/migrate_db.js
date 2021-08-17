/* eslint-disable no-unused-vars */
const _ = require('lodash')
const Bootstrap = require('@hosoft/restful-api-framework')()
const express = require('express')
const fs = require('fs')
const moment = require('moment')
const mongoose = require('mongoose')
const path = require('path')
const { fileUtils } = require('@hosoft/restful-api-framework/utils')

// prettier-ignore
const app = express()

Bootstrap.startServer(app, 3001, async (status, container) => {
    if (status === 'startSucess') {
        const action = process.env.ACTION
        if (action === 'export') {
            export_db(() => {
                console.log('DONE!')
            })
        } else if (action === 'import') {
            import_db(() => {
                console.log('DONE!')
            })
        } else {
            console.log('invalid action')
        }
    }
})

const import_db = async (callback) => {
    const allModels = require('@hosoft/restful-api-framework/models')
    const dataDir = path.join(__dirname, 'data', 'migrate')

    const dirs = fs.readdirSync(dataDir)
    const pos = dirs.indexOf('Model')
    if (pos > 0) {
        dirs[pos] = dirs[0]
        dirs[0] = 'Model'
    }

    for (const dirname of dirs) {
        const filepath = path.resolve(dataDir, dirname)
        const stat = fs.statSync(filepath)
        if (stat.isDirectory()) {
            const model = allModels[dirname]
            const modelDir = path.join(dataDir, dirname)

            // 删除所有数据
            // await model.deleteMany({}, true)
            const recordFiles = fs.readdirSync(modelDir)
            for (const fileName of recordFiles) {
                const fileExt = path.parse(fileName).ext
                if (fileExt && fileExt == '.json') {
                    const recordFile = path.join(modelDir, fileName)
                    const record = fileUtils.getJsonFile(recordFile)
                    try {
                        await model.create(record)
                    } catch (e) {
                        console.error('create record failed: ' + recordFile, e)
                    }
                }
            }

            console.log(`${dirname} import success, total ${recordFiles.length} records`)
            if (dirname === 'Model') {
                console.log('new Model imported, please restart')
                fileUtils.deleteDirectory(filepath)
                process.exit()
            }
        }
    }

    callback && callback(true)
}

const export_db = async (callback) => {
    const allModels = require('@hosoft/restful-api-framework/models')
    const modelNames = _.keys(allModels)

    const onlyModels = process.env.ONLY_MODEL ? process.env.ONLY_MODEL.split(',') : []
    const addModels = process.env.ADD_MODEL ? process.env.ADD_MODEL.split(',') : []

    let exportRecordModel = ['Content', 'Dictionary', 'Model', 'Permission', 'Role', 'Test', 'User']
    let exportModelNames = [
        'Api',
        'Content',
        'Dictionary',
        'Message',
        'MessageReadStatus',
        'Model',
        'Permission',
        'Role',
        'Plugin',
        'ServerLog',
        'SiteMaintain',
        'Tags',
        'Test',
        'User'
    ]

    if (onlyModels && onlyModels.length > 0) {
        exportRecordModel = onlyModels
        exportModelNames = onlyModels
    }

    if (addModels && addModels.length > 0) {
        exportRecordModel = _.concat(exportRecordModel, addModels)
        exportModelNames = _.concat(exportModelNames, addModels)
    }

    for (const modelName of modelNames) {
        if (!exportRecordModel.includes(modelName)) {
            continue
        }

        try {
            const model = allModels[modelName]
            const allRecords = await model.find({})
            const dataDir = path.join(__dirname, 'data', 'migrate', modelName)
            if (fs.existsSync(dataDir)) {
                await fileUtils.deleteDirectory(dataDir)
            }

            fs.mkdirSync(dataDir, { recursive: true })

            let uniqueField = 'id'
            for (const prop of model.meta.properties) {
                if (prop.unique) {
                    uniqueField = prop.name
                    break
                }
            }

            for (const record of allRecords) {
                // 对于 Model 只导处指定数据
                if (modelName === 'Model' && !exportModelNames.includes(record.name)) {
                    continue
                }

                fileUtils.saveJsonFile(path.join(dataDir, record[uniqueField] + '.json'), record)
            }

            console.log(`${modelName} export success, total: ${allRecords.length} records`)
        } catch (e) {
            console.error(modelName, e)
        }
    }

    callback && callback(true)
}
