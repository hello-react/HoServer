/* eslint-disable no-template-curly-in-string,node/no-deprecated-api */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/
const BaseHelper = require('../../base/helpers/base-helper')
const config = require('@hosoft/config')
const Constants = require('../../base/constants/constants')
const fs = require('fs')
const mkdirp = require('mkdirp')
const moment = require('moment')
const multer = require('multer')
const path = require('path')
const router = require('express').Router()

const serverUrl = config.get('server.serverUrl')

/************************************************
 * local uploads
 * **********************************************/

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, global.APP_PATH)
    },
    filename: async function (req, file, cb) {
        const hookObj = { query: req.query, fileInfo: {} }

        const category = req.query.category || 'temp'
        const fileName = req.query.filename || file.originalname
        const isTemp = req.query.is_temp || false

        const saveTo =
            (isTemp + '' === 'true' ? '/temp' : '/public/uploads') +
            `/${category}/` +
            moment().format('YYYY-MM/DD/hhmmSSS/')
        const dir = path.join(global.APP_PATH, saveTo)
        mkdirp.sync(dir)

        hookObj.fileInfo.saveTo = saveTo
        hookObj.fileInfo.fileName = fileName

        await BaseHelper.getContainer().executeHook('uploadFile', null, null, hookObj)
        cb(null, hookObj.fileInfo.saveTo + hookObj.fileInfo.fileName)
    }
})

const upload = multer({ storage: storage })
router.post(Constants.API_PREFIX + '/upload', upload.single('file'), (req, res) => {
    if (req.file.filename.indexOf('/public') == 0) {
        return res.send(serverUrl + req.file.filename)
    }

    res.send(fs.existsSync(path.join(global.APP_PATH, req.file.filename)) ? 'success' : '')
})

module.exports = router
