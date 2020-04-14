const bodyParser = require('body-parser')
const config = require('config')
const Model = require('../../framework/models/Model')
const mongoose = require('mongoose')
const path = require('path')

require('body-parser-xml')(bodyParser)

module.exports = async app => {
    const db_connection_url = config.get('db.url')
    return new Promise((resolve, reject) => {
        mongoose.connect(db_connection_url, async err => {
            if (err) reject(err)
            console.log('connected to db success')

            // init global models
            global.DB_MODELS = await Model.find({}).lean()
            await require('../../framework/models')

            const { BaseHelper } = require('../../framework/base')

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

            const container = BaseHelper.getContainer()
            container.setHook('initialize', () => {
                container.controllers.test = {
                    name: 'Test',
                    category_name: 'test',
                    instance: require('./TestController')
                }
            })

            container.initialize(app, async () => {
                // clear test db
                const { Test } = require('../../framework/models')
                await Test.deleteMany({})

                console.log('Test app started!')
                resolve('success')
            })
        })
    })
}
