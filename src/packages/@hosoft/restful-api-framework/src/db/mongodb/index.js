/* eslint-disable camelcase */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/
const autoIncrement = require('./plugins/mongoose-auto-increment')
const Constants = require('../../base/constants/constants')
const ModelSchema = require('./schema/Model')
const MongoAdapter = require('./adapter')
const mongoose = require('mongoose')
const mongooseBcrypt = require('mongoose-bcrypt')
const mongoosePaginate = require('./plugins/mongoose-paginate')
const timestamps = require('./plugins/mongoose-timestamp')

const idProp = {
    name: 'id',
    dis_name: 'Id',
    prop_type: Constants.API_FIELD_TYPE.objectId,
    width: 24,
    unique: true,
    require: true,
    index: true,
    input_flag: 1,
    output_flag: 1,
    output_flag_mod: 1,
    search_flag: 1,
    order: 0,
    description: ''
}

let MongooseModels = null

class MongoDB {
    /**
     * load all models from databases and convert to mongodb schema
     */
    initDb(dbConfig) {
        return new Promise((resolve, reject) => {
            const dbConnectionUrl = dbConfig.url
            mongoose.connect(dbConnectionUrl, { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true })
            const db = mongoose.connection
            db.on('error', (err) => {
                logger.error('connection to mongo db error:', err)
                reject()
            })
            db.once('open', async () => {
                logger.debug('connected to db success: ' + dbConnectionUrl)

                autoIncrement.initialize(mongoose.connection)
                resolve()
            })
        })
    }

    async getModels() {
        if (!MongooseModels) {
            MongooseModels = []

            // load all db models
            const dbModels = await ModelSchema.find({ enabled: { $ne: false } })
                .sort({ order: 1 })
                .lean()

            for (const dbModel of dbModels) {
                const model = this.getModel(dbModel)
                MongooseModels.push(model)
            }
        }

        return MongooseModels
    }

    getModel(modelMeta) {
        let mongooseModel
        if (modelMeta.name === 'Model') {
            mongooseModel = require('./schema/Model')
        } else {
            const modelSchema = this.processDbModel(modelMeta)
            mongooseModel = mongoose.model(modelMeta.name, modelSchema, modelMeta.db_table)
        }

        return new MongoAdapter(modelMeta, mongooseModel)
    }

    // convert from db modelMeta to mongoose modelMeta
    processDbModel(dbModel) {
        const autoIncreseFields = []
        for (const property of dbModel.properties) {
            if (property.auto_increment) {
                autoIncreseFields.push(property.name)
            }
        }

        const modelObj = this._getDbSchema(dbModel)
        const modelSchema = new mongoose.Schema(modelObj, { id: false, _id: true })
        modelSchema.plugin(mongoosePaginate)

        // special: for user password
        if (dbModel.name === 'User') {
            modelSchema.plugin(mongooseBcrypt)
        }

        if (dbModel.timestamp) {
            modelSchema.plugin(timestamps)
        }

        // by default enable id field for all tables
        for (const incrementField of autoIncreseFields) {
            modelSchema.plugin(autoIncrement.plugin, {
                model: dbModel.name,
                field: incrementField,
                startAt: 1
            })
        }

        if (!dbModel.db_table || dbModel.db_table + '' === 'undefined') {
            logger.error('processDbModel, invalid modelMeta db table: ' + dbModel.name)
        }

        return modelSchema
    }

    /** **********************************************
     * below private functions
     * **********************************************/

    _getDbSchema(model) {
        const modelObj = {}

        let hasIdField = false
        let uniqueCount = 0

        for (const property of model.properties) {
            if (property.auto_increment) {
                property.unique = true
            }

            if (property.name === '_id') {
                uniqueCount++
                continue
            }

            if (/* property.timestamp && */ property.name === 'created_at' || property.name === 'updated_at') {
                continue
            }

            if (property.name === 'id' || property.auto_increment) {
                hasIdField = true
                // continue
            }

            if (property.unique) {
                uniqueCount++
                if (uniqueCount > 1) {
                    logger.warn('_getDbSchema, more than 1 unique field in: ' + model.name)
                }

                if (!property.index) {
                    property.index = true
                }
            }

            modelObj[property.name] = this._processDbProperty(model.name, property, false, 0)
        }

        if (!hasIdField && uniqueCount === 0) {
            logger.debug(model.name + ' has NO id field, use id as default')
            model.properties.push(idProp)
            modelObj.id = this._processDbProperty('', idProp, false, 0)
        }

        return modelObj
    }

    _processDbProperty(parentName, property, isSubProp, arrayLevel) {
        let prop = {}

        if (property.prop_type === Constants.API_FIELD_TYPE.object) {
            parentName += '.' + property.name
            let uniqueCount = 0
            for (const subProperty of property.properties) {
                if (subProperty.unique) {
                    uniqueCount++
                    if (uniqueCount > 1) {
                        logger.warn(`_processDbProperty, more than 1 unique field in: ${parentName}.${property.name}`)
                    }
                }
                prop[subProperty.name] = this._processDbProperty(parentName, subProperty, true, arrayLevel)
            }
        } else if (property.prop_type === Constants.API_FIELD_TYPE['array-of-object']) {
            parentName += '.' + property.name
            arrayLevel++
            if (arrayLevel > 1) {
                logger.info(`[${parentName}] NESTED array prop, will not support generate default route`)
            }

            const arrayProp = {}
            let uniqueCount = 0

            for (const subProperty of property.properties) {
                if (!subProperty) {
                    logger.warn(`${parentName}.${property.name} has null property`)
                    continue
                }

                arrayProp[subProperty.name] = this._processDbProperty(parentName, subProperty, true, arrayLevel)
                if (subProperty.unique) {
                    // logger.debug(`[${parentName}.${subProperty.name}] is an unique field of array`)

                    uniqueCount++
                    if (uniqueCount > 1) {
                        logger.warn(`_processDbProperty, more than 1 unique field in: ${parentName}.${property.name}`)
                    }
                }
            }

            if (uniqueCount === 0) {
                logger.debug(`[${parentName}] array has NOT set unique field, use id as default！`)
                // property.properties.push(idProp)
                // arrayProp.id = _processDbProperty(parentName, idProp, true, arrayLevel)
            }

            prop = [mongoose.Schema(arrayProp, { noId: true, id: false, _id: false })] // don't use id
        } else {
            // sub property unique is only used for code to validate input data
            prop.unique = isSubProp || arrayLevel > 0 ? false : property.unique || false
            prop.type = this._convertType(property.prop_type)
            prop.required = property.unique || property.input_flag === 2 || false
            prop.index = property.index || false
            if (property.default_val) {
                prop.default = property.default_val
                // schema ignore current_user_id
                if (prop.default === 'current_user_id') {
                    prop.default = undefined
                } else if (prop.default === 'now') {
                    prop.default = () => {
                        return Date.now()
                    }
                }
            } else if (prop.unique && prop.type === mongoose.Schema.Types.ObjectId) {
                prop.default = () => mongoose.Types.ObjectId()
            }
        }

        return prop
    }

    _checkModelIdField(modelMeta, isSubProp, arrayLevel) {
        if (!modelMeta.properties) {
            return
        }

        let uniqueCount = 0

        for (const subModelMeta of modelMeta.properties) {
            if (subModelMeta.unique) {
                uniqueCount++
            }

            if (subModelMeta.prop_type === Constants.API_FIELD_TYPE.object) {
                for (const subProperty of subModelMeta.properties) {
                    this._checkModelIdField(subProperty, true, arrayLevel)
                }
            } else if (subModelMeta.prop_type === Constants.API_FIELD_TYPE['array-of-object']) {
                for (const subProperty of subModelMeta.properties) {
                    if (!subProperty) {
                        continue
                    }

                    this._checkModelIdField(subProperty, true, arrayLevel + 1)
                }
            }
        }

        if (!isSubProp && uniqueCount === 0) {
            modelMeta.properties.splice(0, 0, idProp)
        }
    }

    _convertType(propType) {
        let type = mongoose.Schema.Types.Mixed

        switch (propType) {
            case Constants.API_FIELD_TYPE.array:
                type = []
                break
            case Constants.API_FIELD_TYPE['array-of-boolean']:
                type = [mongoose.Schema.Types.Boolean]
                break
            case Constants.API_FIELD_TYPE['array-of-char']:
                type = [mongoose.Schema.Types.String]
                break
            case Constants.API_FIELD_TYPE['array-of-number']:
                type = [mongoose.Schema.Types.Number]
                break
            case Constants.API_FIELD_TYPE['array-of-objectId']:
                type = [mongoose.Schema.Types.ObjectId]
                break
            case Constants.API_FIELD_TYPE.boolean:
                type = mongoose.Schema.Types.Boolean
                break
            case Constants.API_FIELD_TYPE.char:
                type = mongoose.Schema.Types.String
                break
            case Constants.API_FIELD_TYPE.date:
                type = mongoose.Schema.Types.Date
                break
            case Constants.API_FIELD_TYPE.mix:
                type = mongoose.Schema.Types.Mixed
                break
            case Constants.API_FIELD_TYPE.number:
                type = mongoose.Schema.Types.Number
                break
            case Constants.API_FIELD_TYPE.objectId:
                type = mongoose.Schema.Types.ObjectId
                break
        }

        return type
    }
}

module.exports = MongoDB
