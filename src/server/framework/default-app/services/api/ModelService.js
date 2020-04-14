/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 * author: Jack Zhang
 **/
const _ = require('lodash')
const config = require('config')
const Excel = require('exceljs')
const fs = require('fs')
const mkdirp = require('mkdirp')
const moment = require('moment')
const path = require('path')
const readline = require('readline')
const { BaseHelper, Constants, ErrorCodes, InputValidator } = require('../../../base')

const serverUrl = config.get('server.serverUrl')
const rFileName = new RegExp('[:\\\\\\/*?"<>|]', 'g')

/**
 * API 接口管理服务，对应管理后台的接口管理功能，
 * 包含对服务、对象、接口、词典、组件的管理
 */
class ModelService {
    /**
     * 批量导出对象数据，如果是创建对象模板，data 传空就行了
     */
    async exportModelData(args) {
        if (args.format === 'xlsx') {
            return this._exportModelDataExel(args)
        } else {
            return this._exportModelDataJson(args)
        }
    }

    /**
     * 批量导入数据前对数据进行分析
     */
    async prepareImportModelData(args) {
        return this.importModelData(args, false)
    }

    /**
     * 批量导入对象数据
     * saveToDb: true, 保存到数据库, false 不保存，只检查数据合法性
     */
    async importModelData(args, saveToDb) {
        if (args.format === 'xlsx') {
            return this._importModelDataExel(args, saveToDb)
        } else {
            return this._importModelDataJson(args, saveToDb)
        }
    }

    /// /////////// private functions /////////////

    // 数组元素格式：{ row: rowNum, input: rowObj, status: 0, message: '', exist: false }
    async _verifySaveModelData(model, inputData, saveToDb, overwrite) {
        // 检查数据合法性并
        for (const rowObj of inputData) {
            if (rowObj.status === 0) {
                const invalidFields = {} // key: 原因 (1: 类型错误, 2: 长度错误, 3: 字典 key 错误),

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

        // 检查已存在记录
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
                const existRecords = await model.instance
                    .find(query)
                    .select(uf)
                    .lean()

                if (existRecords.length > 0) {
                    const existVals = existRecords.map(r => r[uf])
                    for (const record of inputData) {
                        const val = _.get(record.input, uf, '')
                        if (val && existVals.indexOf(val) > -1) {
                            record.exist = {}
                            record.exist[uf] = val
                            if (record.message) {
                                record.message += `\r\n${uf}=${val} 记录已存在`
                            } else {
                                record.message = `${uf}=${val} 记录已存在`
                            }

                            if (overwrite !== 1) {
                                record.status = 1
                            }
                        }
                    }
                }
            }
        }

        // 写入数据库
        if (saveToDb) {
            for (const rowObj of inputData) {
                if (rowObj.status !== 0 || (rowObj.exist && overwrite === 2)) {
                    continue
                }

                try {
                    if (rowObj.exist) {
                        await model.instance.find(rowObj.exist).updateOne({ $set: rowObj.input })
                    } else {
                        await model.instance.create(rowObj.input)
                    }
                } catch (e) {
                    rowObj.status = 3
                    rowObj.message = e.message
                }
            }
        }
    }

    async _importModelDataExel(args, saveToDb) {
        const { model_name, overwrite, file } = args

        const model = BaseHelper.getModel(model_name)
        if (!model) {
            return Promise.reject({ message: `模型定义未找到: ${model_name}`, code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const importFile = path.join(global.APP_PATH, file)
        if (!fs.existsSync(importFile)) {
            return Promise.reject({ message: `文件未找到: ${file}`, code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        const workbook = new Excel.Workbook()
        try {
            await workbook.xlsx.readFile(importFile)
        } catch (e) {
            return Promise.reject({ message: `不是有效的Excel文件!`, code: ErrorCodes.GENERAL_ERR_READ_FILE })
        }
        const ws = workbook.getWorksheet(1)

        // 第一行必须是字段名称，根据名称获取每个属性所在的列
        const propColumnIdx = {}
        for (let i = 1; i <= ws.columnCount; i++) {
            const cell = ws.getCell(1, i)
            const fieldDisName = String(cell.value).trim()
            const prop = model.properties.find(p => p.dis_name === fieldDisName)
            if (prop) {
                propColumnIdx[i] = prop
            } else {
                cell.note = '未找到匹配属性，此列不导入!'
                cell.font = { color: { argb: 'FFFF0000' } }
            }
        }

        if (_.keys(propColumnIdx).length === 0) {
            return Promise.reject({ message: `未找到有效数据`, code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        // 逐行读取数据 (从第2行开始)
        const inputData = []

        const objectTypes = [Constants.API_FIELD_TYPE.object, Constants.API_FIELD_TYPE.mix]
        for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
            let rowStatus = 0 // 0: 成功，1：跳过，2：校验失败，3：保存失败
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
                                cell.note = '转换对象JSON失败：' + e.message
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

        // 校验、写入数据库
        await this._verifySaveModelData(model, inputData, saveToDb, overwrite)

        // 写入结果
        let success = 0
        let skip = 0
        let invalid = 0
        let failed = 0

        for (let i = 0; i < inputData.length; i++) {
            const rowData = inputData[i]
            const cell = ws.getCell(rowData.row, 1)

            // 0: 成功，1：跳过，2：校验失败，3：保存失败
            switch (rowData.status) {
                case 0:
                    success++
                    cell.font = { color: { argb: 'FF00CC33' } }
                    cell.note = saveToDb ? '导入成功' : '校验通过'
                    if (rowData.exist) {
                        cell.note += ' (覆盖更新)'
                    }
                    break
                case 1:
                    skip++
                    cell.font = { color: { argb: 'FF66CCFF' } }
                    cell.note = '记录已存在，跳过'
                    break
                case 2:
                    invalid++
                    cell.font = { color: { argb: 'FFFF6600' } }
                    cell.note = '数据校验失败'
                    break
                case 3:
                    failed++
                    cell.font = { color: { argb: 'FFFF0000' } }
                    cell.note = '保存失败'
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
            result_url: serverUrl + file
        }
    }

    _importModelDataJson(args, saveToDb) {
        const { model_name, overwrite, file } = args

        const model = BaseHelper.getModel(model_name)
        if (!model) {
            return Promise.reject({ message: `模型定义未找到: ${model_name}`, code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const importFile = path.join(global.APP_PATH, file)
        if (!fs.existsSync(importFile)) {
            return Promise.reject({ message: `文件未找到: ${file}`, code: ErrorCodes.GENERAL_ERR_NOT_FOUND })
        }

        // 逐行读取数据 (从第2行开始)
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
                        inputData.push({ row: rowNum, input: null, status: 2, exist: null, message: '转换对象JSON失败：' + e.message })
                    }
                }

                rowNum++
            })

            rl.on('close', async () => {
                // 校验、写入数据库
                await this._verifySaveModelData(model, inputData, saveToDb, overwrite)

                // 写入结果
                const workbook = new Excel.Workbook()
                workbook.creator = 'HoSoft'
                workbook.modified = new Date()

                const ws = workbook.addWorksheet(model.dis_name)

                let excelRow = 1
                let success = 0
                let skip = 0
                let invalid = 0
                let failed = 0

                for (let i = 0; i < inputData.length; i++) {
                    const rowData = inputData[i]
                    ws.getCell(excelRow, 1).value = `${rowData.row} 行`
                    const cell = ws.getCell(excelRow, 2)

                    // 0: 成功，1：跳过，2：校验失败，3：保存失败
                    switch (rowData.status) {
                        case 0:
                            success++
                            cell.font = { color: { argb: 'FF00CC33' } }
                            cell.value = saveToDb ? '导入成功' : '校验通过'
                            if (rowData.exist) {
                                cell.value += ' (覆盖更新)'
                            }
                            break
                        case 1:
                            skip++
                            cell.font = { color: { argb: 'FF66CCFF' } }
                            cell.value = '记录已存在，跳过'
                            break
                        case 2:
                            invalid++
                            cell.font = { color: { argb: 'FFFF6600' } }
                            cell.value = '数据校验失败'
                            break
                        case 3:
                            failed++
                            cell.font = { color: { argb: 'FFFF0000' } }
                            cell.value = '保存失败'
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
                    result_url: serverUrl + file + '.xlsx'
                })
            })
        })
    }

    async _exportModelDataExel(args) {
        const { model_name, scope, fields, data } = args

        const model = BaseHelper.getModel(model_name)
        if (!model) {
            return Promise.reject({ message: `模型定义未找到: ${model_name}`, code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const workbook = new Excel.Workbook()
        workbook.creator = 'HoSoft'
        workbook.modified = new Date()

        const ws = workbook.addWorksheet(model.dis_name)
        ws.properties.defaultColWidth = 18

        // 写入表头
        let index = 1
        for (let i = 0; i < model.properties.length; i++) {
            const prop = model.properties[i]
            if (prop.name === 'branch') {
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

        // 写入数据
        let exportData
        if (scope === 1) {
            exportData = await model.instance.find({}).lean()
        } else {
            exportData = data || []
        }

        let row = 2
        for (const record of exportData) {
            let col = 1
            for (let i = 0; i < model.properties.length; i++) {
                const prop = model.properties[i]
                if (prop.name === 'branch') {
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

        // 输出文件
        const saveTo = moment().format('/YYYY-MM/DD/hhmmSSS/')
        const fileName = model.dis_name.replace(rFileName, '') + '.xlsx'

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
            return Promise.reject({ message: `模型定义未找到: ${model_name}`, code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        for (let i = 0; i < model.properties.length; i++) {
            const prop = model.properties[i]
            if (prop.name === 'branch') {
                continue
            }

            if (fields[prop.name] !== false) {
                fields[prop.name] = true
            }
        }

        // 写入数据
        let exportData
        if (scope === 1) {
            exportData = await model.instance.find({}).lean()
        } else {
            exportData = data || []
        }

        for (let i = 0; i < model.properties.length; i++) {
            const prop = model.properties[i]
            if (prop.name === 'branch') {
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

        // 输出文件
        try {
            const saveTo = moment().format('/YYYY-MM/DD/hhmmSSS/')
            const fileName = model.dis_name.replace(rFileName, '') + '.json'

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
            return Promise.reject({ message: `写入文件失败: ${e.message}`, code: ErrorCodes.GENERAL_ERR_WRITE_FILE })
        }
    }
}

module.exports = new ModelService()
