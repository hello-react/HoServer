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
        cb(null, path.join(global.APP_PATH, 'public/uploads'))
    },
    filename: async function (req, file, cb) {
        const hookObj = { query: req.query, fileInfo: {} }
        await BaseHelper.getContainer().executeHook('uploadFile', null, null, hookObj)

        const category = hookObj.fileInfo.category || req.query.category || 'temp'
        const saveTo = hookObj.fileInfo.saveTo || category + '/' + moment().format('/YYYY-MM/DD/hhmmSSS/')
        const dir = path.join(global.APP_PATH, 'public/uploads', saveTo)

        mkdirp.sync(dir)

        cb(null, saveTo + file.originalname)
    }
})

const upload = multer({ storage: storage })
router.post(Constants.API_PREFIX + '/upload', upload.single('file'), (req, res) => {
    return res.send(serverUrl + '/public/uploads/' + req.file.filename)
})

module.exports = router
