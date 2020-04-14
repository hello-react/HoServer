/* eslint-disable camelcase */
/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: Jack Zhang
 **/
const autoIncrement = require('../db/mongoose-auto-increment')
const Constants = require('../base/constants/constants')
const mongoose = require('mongoose')
const mongooseBcrypt = require('mongoose-bcrypt')
const mongoosePaginate = require('../db/mongoose-paginate')
const timestamps = require('../db/mongoose-timestamp')

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

var MongoModels = null

/**
 * load all models from databases and convert to mongodb schema
 */
const initModels = () => {
    if (!MongoModels) {
        if (!global.DB_MODELS) {
            return console.log('please set db models first!')
        }

        MongoModels = {}
        autoIncrement.initialize(mongoose.connection)

        for (const dbModel of global.DB_MODELS) {
            if (dbModel.name === 'Model') {
                _processPropOutputFlag(dbModel)
                MongoModels[dbModel.name] = require('./Model')
                continue
            }

            const modelSchema = _processDbModel(dbModel)
            MongoModels[dbModel.name] = mongoose.model(dbModel.name, modelSchema, dbModel.db_table)
        }
    }

    // export a reload function
    MongoModels.reloadModel = modelName => {
        // currently mongoose not support runtime reload!!!
    }

    MongoModels.processModel = modelMeta => {
        _processPropOutputFlag(modelMeta)
        return _checkModelIdField(modelMeta, false, 0)
    }

    return MongoModels
}

/** **********************************************
 * below private functions
 * **********************************************/

const _getDbSchema = model => {
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

        modelObj[property.name] = _processDbProperty(model.name, property, false, 0)
    }

    if (!hasIdField && uniqueCount === 0) {
        logger.debug(model.name + ' has NO id field, use id as default')
        model.properties.push(idProp)
        modelObj.id = _processDbProperty('', idProp, false, 0)
    }

    return modelObj
}

// convert from db modelMeta to mongoose modelMeta
const _processDbModel = dbModel => {
    // set output flag
    _processPropOutputFlag(dbModel)

    const autoIncreseFields = []
    for (const property of dbModel.properties) {
        if (property.auto_increment) {
            autoIncreseFields.push(property.name)
        }
    }

    const modelObj = _getDbSchema(dbModel)
    const modelSchema = new mongoose.Schema(modelObj)
    modelSchema.plugin(mongoosePaginate)

    // special user table
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
        logger.error('_processDbModel, invalid modelMeta db table: ' + dbModel.name)
    }

    return modelSchema
}

const _processDbProperty = (parentName, property, isSubProp, arrayLevel) => {
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
            prop[subProperty.name] = _processDbProperty(parentName, subProperty, true, arrayLevel)
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

            arrayProp[subProperty.name] = _processDbProperty(parentName, subProperty, true, arrayLevel)
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
            property.properties.push(idProp)
            arrayProp.id = _processDbProperty(parentName, idProp, true, arrayLevel)
        }

        prop = [mongoose.Schema(arrayProp, { _id: false })] // 不使用默认 id
    } else {
        prop.unique = isSubProp || arrayLevel > 0 ? false : property.unique || false // 子属性 unique 仅用于代码层面检查文档内唯一
        prop.type = _convertType(property.prop_type)
        prop.required = property.unique || property.input_flag === 2 || false
        prop.index = property.index || false
        if (property.default_val) {
            prop.default = property.default_val
            // schema 忽略current_user_id
            if (prop.default === 'current_user_id') {
                prop.default = undefined
            } else if (prop.default === 'now') {
                prop.default = () => {
                    return Date.now()
                }
            }
        }

        if (property.name.match(/.*name$/) || property.name.match(/.*dis_name$/) || property.name.match(/.*title$/) || property.name.match(/.*description$/)) {
            prop.searchable = true
        }
    }

    return prop
}

const _checkModelIdField = (modelMeta, isSubProp, arrayLevel) => {
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
                _checkModelIdField(subProperty, true, arrayLevel)
            }
        } else if (subModelMeta.prop_type === Constants.API_FIELD_TYPE['array-of-object']) {
            let uniqueCount = 0
            for (const subProperty of subModelMeta.properties) {
                if (!subProperty) {
                    continue
                }

                _checkModelIdField(subProperty, true, arrayLevel + 1)
                if (subProperty.unique) {
                    uniqueCount++
                }
            }

            if (uniqueCount === 0) {
                subModelMeta.properties.push(idProp)
            }
        }
    }

    if (!isSubProp && uniqueCount === 0) {
        modelMeta.properties.splice(0, 0, idProp)
    }
}

/**
 * 附加一个 output_flag_mod 属性，方便后期获取 api 参数列表
 * output_flag_mod: 0 禁止输出，1 输出 (子属性不一定全部输出)，2 不输出，3 自动，4 全部输出
 */
const _processPropOutputFlag = prop => {
    if (!prop.properties) {
        prop.output_flag_mod = prop.output_flag === 3 ? 1 : prop.output_flag
        return
    }

    let allSubOut = true
    for (const subProp of prop.properties) {
        _processPropOutputFlag(subProp)

        if (prop.output_flag === 3 && subProp.output_flag === 1) {
            prop.output_flag_mod = 1
        }

        if (subProp.output_flag === 0 || subProp.output_flag === 2) {
            allSubOut = false
        }
    }

    if (!prop.output_flag_mod) {
        prop.output_flag_mod = prop.output_flag === 3 ? 1 : prop.output_flag
        if (prop.output_flag_mod === 1 && allSubOut) {
            prop.output_flag_mod = 4
        }
    }
}

const _convertType = propType => {
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

module.exports = initModels()
