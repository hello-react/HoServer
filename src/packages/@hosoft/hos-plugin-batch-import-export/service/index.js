/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
**/
const _ = require('lodash')
const config = require('@hosoft/config')
const Excel = require('exceljs')
const fs = require('fs')
const mkdirp = require('mkdirp')
const moment = require('moment')
const path = require('path')
const readline = require('readline')
const { BaseHelper, Constants, ErrorCodes, InputValidator } = require('@hosoft/restful-api-framework/base')
const { Common, fileUtils } = require('@hosoft/restful-api-framework/utils')

const serverUrl = config.get('server.serverUrl')
const rFileName = new RegExp('[:\\\\\\/*?"<>|]', 'g')

/**
 * Model data import/export service
 */
class ImportExportService {
    /**
     * export model data, set args.data to null will create a empty template
     */
    async exportModelData(args) {
        if (args.format === 'xlsx') {
            return this._exportModelDataExel(args)
        } else {
            return this._exportModelDataJson(args)
        }
    }

    /**
     * validate data to be imported
     */
    async prepareImportModelData(args) {
        return this.importModelData(args, false)
    }

    /**
     * batch import data
     * saveToDb:
     *   true, will save to database,
     *   false, not save，only validate data
     */
    async importModelData(args, saveToDb) {
        if (args.format === 'xlsx') {
            return this._importModelDataExel(args, saveToDb)
        } else {
            return this._importModelDataJson(args, saveToDb)
        }
    }

    /// /////////// private functions /////////////

    // array element format：{ row: rowNum, input: rowObj, status: 0, message: '', exist: false }
    async _verifySaveModelData(model, inputData, saveToDb, overwrite) {
        for (const rowObj of inputData) {
            if (rowObj.status === 0) {
                const invalidFields = {} // key: reason (1: type error, 2: width error, 3: dict key error),

                if (!(await InputValidator.validatePropInput({}, invalidFields, model, rowObj.input, '', false))) {
                    const errmessages = InputValidator.getInvalidFieldmessage(invalidFields)
                    if (rowObj.message) {
                        rowObj.message += '\r\n'
                    }

                    rowObj.message += errmessages.join('\r\n')
                    if (rowObj.status === 0) {
                        rowObj.status = 2
                    }
                }
            }
        }

        // check exist records
        const uniqueFields = []
        for (let i = 0; i < model.properties.length; i++) {
            const prop = model.properties[i]
            if (prop.unique || prop.auto_increment) {
                uniqueFields.push(prop.name)
            }
        }

        if (uniqueFields.length > 0) {
            for (const uf of uniqueFields) {
                const queryValues = []
                for (const record of inputData) {
                    if (record.status === 0 && record.input && record.input[uf]) {
                        queryValues.push(record.input[uf])
                    }
                }

                const query = {}
                query[uf] = { $in: queryValues }
                const existRecords = await model.find(query, uf)

                if (existRecords.length > 0) {
                    const existVals = existRecords.map(r => r[uf])
                    for (const record of inputData) {
                        const val = _.get(record.input, uf, '')
                        if (val && existVals.indexOf(val) > -1) {
                            record.exist = {}
                            record.exist[uf] = val
                            if (record.message) {
                                record.message += `\r\n${uf}=${val} ${tp('errRecordExist')}`
                            } else {
                                record.message = `${uf}=${val} ${tp('errRecordExist')}`
                            }

                            if (overwrite !== 1) {
                                record.status = 1
                            }
                        }
                    }
                }
            }
        }

        // write to database
        if (saveToDb) {
            for (const rowObj of inputData) {
                if (rowObj.status !== 0 || (rowObj.exist && overwrite === 2)) {
                    continue
                }

                try {
                    if (rowObj.exist) {
                        await model.find(rowObj.exist).updateOne({ $set: rowObj.input })
                    } else {
                        await model.create(rowObj.input)
                    }
                } catch (e) {
                    rowObj.status = 3
                    rowObj.message = e.message
                }
            }
        }
    }

    async _importModelDataExel(args, saveToDb) {
        const { model_name, overwrite } = args

        const model = BaseHelper.getModel(model_name)
        if (!model) {
            return Promise.reject({ message: tp('errModelNotFound', { name: model_name }), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const serverUrl = config.get('server.serverUrl')
        let importFile = args.file
        let relativeFile

        if (importFile.indexOf(serverUrl) > -1) {
            relativeFile = importFile.substr(serverUrl.length)
            importFile = path.join(global.APP_PATH, relativeFile)
        } else if (importFile.indexOf('http') > -1) {
            relativeFile = path.join('public', 'temp', Common.getTempFile())
            const tmp = path.join(global.APP_PATH, relativeFile)
            await fileUtils.downloadFile(importFile, tmp)
            importFile = tmp
        } else {
            relativeFile = importFile
            importFile = path.join(global.APP_PATH, importFile)
        }

        if (!fs.existsSync(importFile)) {
            return Promise.reject({ message: tp('errFileNotFound', { importFile }), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const workbook = new Excel.Workbook()
        try {
            await workbook.xlsx.readFile(importFile)
        } catch (e) {
            return Promise.reject({ message: tp('errInvalidFile', { type: 'Excel' }), code: ErrorCodes.GENERAL_ERR_READ_FILE })
        }
        const ws = workbook.getWorksheet(1)

        // first line is table header
        const propColumnIdx = {}
        for (let i = 1; i <= ws.columnCount; i++) {
            const cell = ws.getCell(1, i)
            const fieldDisName = String(cell.value).trim()
            const prop = model.properties.find(p => p.dis_name === fieldDisName)
            if (prop) {
                propColumnIdx[i] = prop
            } else {
                cell.note = tp('noMatchProperty')
                cell.font = { color: { argb: 'FFFF0000' } }
            }
        }

        if (_.keys(propColumnIdx).length === 0) {
            return Promise.reject({ message: tp('errNoValidData'), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        // read data (from second line)
        const inputData = []

        const objectTypes = [Constants.API_FIELD_TYPE.object, Constants.API_FIELD_TYPE.mix]
        for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
            let rowStatus = 0 // 0: success, 1: skip, 2: validate failed, 3: save failed
            const rowObj = {}
            for (let i = 1; i <= ws.columnCount; i++) {
                const prop = propColumnIdx[i]
                if (prop) {
                    const cell = ws.getCell(rowNum, i)
                    if (objectTypes.includes(prop.prop_type) || prop.prop_type.startsWith('array')) {
                        const jsonStr = String(cell.value).trim()
                        if (jsonStr) {
                            try {
                                const jsonObj = JSON.parse(cell.value)
                                rowObj[prop.name] = jsonObj
                            } catch (e) {
                                cell.note = tp('errConvertJsonFail', { message: e.message })
                                cell.font = { color: { argb: 'FFFF0000' } }
                                rowStatus = 2
                            }
                        }
                    } else {
                        rowObj[prop.name] = cell.value
                    }
                }
            }

            if (_.keys(rowObj).length === 0 && rowStatus === 0) {
                rowStatus = 2
            }

            if (rowStatus === 0) {
                inputData.push({ row: rowNum, input: rowObj, status: 0, exist: null, message: '' })
            } else {
                inputData.push({ row: rowNum, input: null, status: rowStatus, exist: null, message: '' })
            }
        }

        // validate data, write to database
        await this._verifySaveModelData(model, inputData, saveToDb, overwrite)

        // write result
        let success = 0
        let skip = 0
        let invalid = 0
        let failed = 0

        for (let i = 0; i < inputData.length; i++) {
            const rowData = inputData[i]
            const cell = ws.getCell(rowData.row, 1)

            // 0: success, 1: skip, 2: validate failed, 3: save failed
            switch (rowData.status) {
                case 0:
                    success++
                    cell.font = { color: { argb: 'FF00CC33' } }
                    cell.note = saveToDb ? tp('importSuccess') : tp('validatePass')
                    if (rowData.exist) {
                        cell.note += ` (${'recordUpdated'})`
                    }
                    break
                case 1:
                    skip++
                    cell.font = { color: { argb: 'FF66CCFF' } }
                    cell.note = tp('skipExists')
                    break
                case 2:
                    invalid++
                    cell.font = { color: { argb: 'FFFF6600' } }
                    cell.note = tp('errValidateData')
                    break
                case 3:
                    failed++
                    cell.font = { color: { argb: 'FFFF0000' } }
                    cell.note = tp('errSaveFile')
                    break
            }

            if (rowData.message) {
                cell.note += '\r\n\r\n' + rowData.message
            }
        }

        const result = await workbook.xlsx.writeFile(importFile)
        console.log('_importModelDataExel finished: ' + importFile, result)

        return {
            total: inputData.length,
            success,
            skip,
            invalid,
            failed,
            result_url: serverUrl + relativeFile
        }
    }

    async _importModelDataJson(args, saveToDb) {
        const { model_name, overwrite } = args

        const model = BaseHelper.getModel(model_name)
        if (!model) {
            return Promise.reject({ message: tp('errModelNotFound', { name: model_name }), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const serverUrl = config.get('server.serverUrl')
        let importFile = args.file
        let relativeFile

        if (importFile.indexOf(serverUrl) > -1) {
            relativeFile = importFile.substr(serverUrl.length)
            importFile = path.join(global.APP_PATH, relativeFile)
        } else if (importFile.indexOf('http') > -1) {
            relativeFile = path.join('public', 'temp', Common.getTempFile())
            const tmp = path.join(global.APP_PATH, relativeFile)
            await fileUtils.downloadFile(importFile, tmp)
            importFile = tmp
        } else {
            relativeFile = importFile
            importFile = path.join(global.APP_PATH, importFile)
        }

        if (!fs.existsSync(importFile)) {
            return Promise.reject({ message: tp('errFileNotFound', { importFile }), code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        // read data from second row
        return new Promise((resolve, reject) => {
            const inputData = []

            let rowNum = 1
            const rl = readline.createInterface({
                input: fs.createReadStream(importFile)
            })

            rl.on('line', line => {
                const jsonStr = line.trim()
                if (jsonStr) {
                    try {
                        const rowObj = JSON.parse(jsonStr)
                        inputData.push({ row: rowNum, input: rowObj, status: 0, exist: null, message: '' })
                    } catch (e) {
                        inputData.push({ row: rowNum, input: null, status: 2, exist: null, message: tp('errConvertJsonFail', { message: e.message }) })
                    }
                }

                rowNum++
            })

            rl.on('close', async () => {
                // validate data and write to database
                await this._verifySaveModelData(model, inputData, saveToDb, overwrite)

                // write result
                const workbook = new Excel.Workbook()
                workbook.creator = 'HoSoft'
                workbook.modified = new Date()

                const ws = workbook.addWorksheet(model.meta.dis_name)

                let excelRow = 1
                let success = 0
                let skip = 0
                let invalid = 0
                let failed = 0

                for (let i = 0; i < inputData.length; i++) {
                    const rowData = inputData[i]
                    ws.getCell(excelRow, 1).value = tp('rowNum', { row: rowData.row })
                    const cell = ws.getCell(excelRow, 2)

                    switch (rowData.status) {
                        case 0:
                            success++
                            cell.font = { color: { argb: 'FF00CC33' } }
                            cell.value = saveToDb ? tp('importSuccess') : tp('validatePass')
                            if (rowData.exist) {
                                cell.value += ` (${'recordUpdated'})`
                            }
                            break
                        case 1:
                            skip++
                            cell.font = { color: { argb: 'FF66CCFF' } }
                            cell.value = tp('skipExists')
                            break
                        case 2:
                            invalid++
                            cell.font = { color: { argb: 'FFFF6600' } }
                            cell.value = tp('errValidateData')
                            break
                        case 3:
                            failed++
                            cell.font = { color: { argb: 'FFFF0000' } }
                            cell.value = tp('errSaveFile')
                            break
                    }

                    if (rowData.message) {
                        ws.getCell(excelRow, 3).value = rowData.message
                    }

                    excelRow++
                }

                const result = await workbook.xlsx.writeFile(importFile + '.xlsx')
                console.log('_importModelDataJson finished: ' + importFile, result)

                resolve({
                    total: inputData.length,
                    success,
                    skip,
                    invalid,
                    failed,
                    result_url: serverUrl + relativeFile + '.xlsx'
                })
            })
        })
    }

    async _exportModelDataExel(args) {
        const { model_name, scope, fields, data } = args

        const model = BaseHelper.getModel(model_name)
        if (!model) {
            return Promise.reject({ message: tp('errModelNotFound', { name: model_name }), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const workbook = new Excel.Workbook()
        workbook.creator = 'Hello React HoServer'
        workbook.modified = new Date()

        const ws = workbook.addWorksheet(model.dis_name)
        ws.properties.defaultColWidth = 18

        // write table head
        let index = 1
        for (let i = 0; i < model.properties.length; i++) {
            const prop = model.properties[i]
            if (prop.name === 'branch' || prop.output_flag === 0) {
                continue
            }

            const cell = ws.getCell(1, index)
            cell.value = prop.dis_name
            if (prop.description) {
                cell.note = prop.description
            }

            if (fields[prop.name] !== false) {
                fields[prop.name] = true
            }
            index++
        }

        // write data
        let exportData
        if (scope === 1) {
            exportData = await model.find({})
        } else {
            exportData = data || []
        }

        let row = 2
        for (const record of exportData) {
            let col = 1
            for (let i = 0; i < model.properties.length; i++) {
                const prop = model.properties[i]
                if (prop.name === 'branch' || prop.output_flag === 0) {
                    continue
                }

                if (fields[prop.name] === true) {
                    const cell = ws.getCell(row, col)
                    cell.value = record[prop.name]
                }

                col++
            }

            row++
        }

        // output file
        const saveTo = moment().format('/YYYY-MM/DD/hhmmSSS/')
        const fileName = model.meta.dis_name.replace(rFileName, '') + '.xlsx'

        const dir = path.join(global.APP_PATH, 'public/export', saveTo)
        await mkdirp.sync(dir)

        const excelFile = path.join(dir, fileName)
        const result = await workbook.xlsx.writeFile(excelFile)
        console.log('_exportModelDataExel finished: ' + excelFile, result)

        return {
            file: excelFile,
            url: `${serverUrl}/public/export/${saveTo}${fileName}`
        }
    }

    async _exportModelDataJson(args) {
        const { model_name, scope, fields, data } = args

        const model = BaseHelper.getModel(model_name)
        if (!model) {
            return Promise.reject({ message: tp('errModelNotFound', { name: model_name }), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        for (let i = 0; i < model.properties.length; i++) {
            const prop = model.properties[i]
            if (prop.name === 'branch' || prop.output_flag === 0) {
                continue
            }

            if (fields[prop.name] !== false) {
                fields[prop.name] = true
            }
        }

        // write data
        let exportData
        if (scope === 1) {
            exportData = await model.find({})
        } else {
            exportData = data || []
        }

        for (let i = 0; i < model.properties.length; i++) {
            const prop = model.properties[i]
            if (prop.name === 'branch' || prop.output_flag === 0) {
                continue
            }

            if (fields[prop.name] === false) {
                for (const record of exportData) {
                    delete record[prop.name]
                }
            }
        }

        const content = []
        for (const record of exportData) {
            content.push(JSON.stringify(record))
        }

        // output file
        try {
            const saveTo = moment().format('/YYYY-MM/DD/hhmmSSS/')
            const fileName = model.meta.dis_name.replace(rFileName, '') + '.json'

            const dir = path.join(global.APP_PATH, 'public/export', saveTo)
            await mkdirp.sync(dir)

            const jsonFile = path.join(dir, fileName)
            fs.writeFileSync(jsonFile, '', { encoding: 'utf-8' })
            for (const line of content) {
                fs.appendFileSync(jsonFile, line + '\r\n', { encoding: 'utf-8' })
            }
            console.log('_exportModelDataJson finished: ' + jsonFile)

            return {
                file: jsonFile,
                url: `${serverUrl}/public/export/${saveTo}${fileName}`
            }
        } catch (e) {
            return Promise.reject({ message: tp('errWriteFile', { message: e.message }), code: ErrorCodes.GENERAL_ERR_WRITE_FILE })
        }
    }
}

module.exports = new ImportExportService()
