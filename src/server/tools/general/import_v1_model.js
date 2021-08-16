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
        execute_script(() => {
            console.log('DONE!')
        })
    }
})

/**
 * Tool for convert HoServer v1.0 model into 2.0
 * @param callback
 * @returns {Promise<void>}
 */
const execute_script = async (callback) => {
    const jsonFilePath = path.join(__dirname, 'data')
    const jsonFiles = fs.readdirSync(jsonFilePath)

    jsonFiles.forEach(async (ele, index) => {
        const fullPath = jsonFilePath + '/' + ele
        const info = fs.statSync(fullPath)
        if (!info.isDirectory()) {
            const jsonObj = fileUtils.getJsonFile(fullPath)
            const jsonObjNew = {}

            // model props
            jsonObjNew._id = jsonObj._id
            jsonObjNew.id = jsonObjNew._id
            jsonObjNew.name = jsonObj.name.replace('ats_', 'app_')
            jsonObjNew.dis_name = jsonObj.dis_name
            jsonObjNew.db_table = jsonObj.db_table
            jsonObjNew.route_name = jsonObj.route_name
            jsonObjNew.description = jsonObj.description
            jsonObjNew.created_at = moment(jsonObj.created_at)
            jsonObjNew.updated_at = moment(jsonObj.updated_at)
            jsonObjNew.timestamp = jsonObj.timestamp
            jsonObjNew.category_name = 'app'
            jsonObjNew.properties = []

            // model sub properties
            setModelPropties(jsonObj, jsonObjNew)

            // save to db
            // await Model.create(jsonObjNew)

            const newFile = fullPath + '.txt'
            fileUtils.saveJsonFile(newFile, jsonObjNew, true)
        }
    })

    callback && callback(true)
}

const setModelPropties = (subModel, recordObj) => {
    if (!recordObj.properties) {
        recordObj.properties = []
    }

    for (const prop of subModel.properties) {
        const newProp = {}
        if (prop._id) {
            newProp._id = prop._id
        }
        if (prop.id) {
            newProp.id = newProp._id || mongoose.Types.ObjectId()
        }
        if (prop.auto_increment) {
            newProp.auto_increment = prop.auto_increment
        }
        if (prop.relations) {
            newProp.relations = _.clone(prop.relations)
        }
        newProp.unique = prop.unique
        newProp.index = prop.index
        newProp.require = prop.require
        newProp.width = prop.width
        if (prop.name === 'created_at' || prop.name === 'updated_at') {
            newProp.input_flag = 0
        } else {
            newProp.input_flag = 1
        }
        newProp.search_flag = prop.search_flag
        newProp.output_flag = subModel.def_sel_fields && subModel.def_sel_fields.indexOf(prop.name) > -1 ? 1 : 2
        newProp.name = prop.name
        newProp.dis_name = prop.dis_name
        newProp.prop_type = prop.prop_type
        newProp.order = prop.order
        newProp.default_val = prop.default_val
        newProp.description = prop.description

        if (prop.properties && prop.properties.length > 0) {
            setModelPropties(prop, newProp)
        }

        recordObj.properties.push(newProp)
    }
}
