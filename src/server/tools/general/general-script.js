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
        execute_script(() => {
            console.log('DONE!')
        })
    }
})

/**
 * Tool script
 * @param callback
 * @returns {Promise<void>}
 */
const execute_script = async callback => {
    const { User } = require('@hosoft/restful-api-framework/models')
    // do something here

    callback && callback(true)
}
