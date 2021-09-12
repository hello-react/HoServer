/* eslint-disable camelcase */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/07/20
 **/
const bcrypt = require('bcryptjs')
const Constants = require('../../base/constants/constants')
const RdbAdapter = require('./adapter')
const { Sequelize, DataTypes } = require('sequelize')

const Op = Sequelize.Op
const operatorsAliases = {
    $eq: Op.eq,
    $ne: Op.ne,
    $gte: Op.gte,
    $gt: Op.gt,
    $lte: Op.lte,
    $lt: Op.lt,
    $not: Op.not,
    $in: Op.in,
    $nin: Op.notIn,
    $is: Op.is,
    $like: Op.like,
    $nike: Op.notLike,
    $ilike: Op.iLike,
    $nilike: Op.notILike,
    $regexp: Op.regexp,
    $nregexp: Op.notRegexp,
    $iregexp: Op.iRegexp,
    $niregexp: Op.notIRegexp,
    $between: Op.between,
    $nobetween: Op.notBetween,
    $overlap: Op.overlap,
    $contains: Op.contains,
    $contained: Op.contained,
    $adjacent: Op.adjacent,
    $sleft: Op.strictLeft,
    $sright: Op.strictRight,
    $noeright: Op.noExtendRight,
    $noeleft: Op.noExtendLeft,
    $and: Op.and,
    $or: Op.or,
    $any: Op.any,
    $all: Op.all,
    $values: Op.values,
    $col: Op.col
}

const idProp = {
    name: 'id',
    dis_name: 'Id',
    prop_type: Constants.API_FIELD_TYPE.number,
    width: 11,
    auto_increment: true,
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

let SequelizeModels = null
let sequelize
let Model

/**
 * use sequelize to access relational database, currently we only support MySql,
 * since HoServer need json support.
 */
class RelationDB {
    initDb(dbConfig, dbType) {
        return new Promise((resolve, reject) => {
            const dbConnectionUrl = dbConfig.url
            sequelize = new Sequelize(dbConnectionUrl, { operatorsAliases, logging: true })

            sequelize
                .authenticate()
                .then(async () => {
                    global.sequelize = sequelize

                    Model = require('./schema/Model')(sequelize, Sequelize.DataTypes)
                    console.log('connection to mysql established successfully.')
                    resolve()
                })
                .catch((err) => {
                    console.error('unable to connect to the mysql:', err)
                    reject(err)
                })
        })
    }

    async getModels() {
        if (!SequelizeModels) {
            SequelizeModels = []

            // load all db models
            const dbModels = await Model.findAll({ order: ['order'] })

            for (const dbModel of dbModels) {
                const model = this.getModel(dbModel)
                SequelizeModels.push(model)
            }
        }

        // await this.syncModels()
        return SequelizeModels
    }

    async syncModels() {
        await sequelize.sync({ force: false, alter: true })
    }

    getModel(modelMeta) {
        let sequelizeModel
        if (modelMeta.name === 'Model') {
            sequelizeModel = Model
        } else {
            const sequelizeDataType = this.processDbModel(modelMeta)
            if (sequelizeDataType) {
                sequelizeModel = sequelizeDataType(sequelize, Sequelize.DataTypes)
            }
        }

        return new RdbAdapter(modelMeta.dataValues || modelMeta, sequelizeModel)
    }

    processDbModel(dbModel) {
        let hasIdField = false
        let uniqueCount = 0

        const indexes = []
        const properties = {}

        for (const property of dbModel.properties) {
            if (dbModel.timestamp && (property.name === 'created_at' || property.name === 'updated_at')) {
                continue
            }

            const prop = {
                type: this._convertType(dbModel, property),
                allowNull: !(property.unique || property.input_flag === 2)
            }

            if (property.auto_increment) {
                property.unique = true
                prop.autoIncrement = true
                prop.primaryKey = true
            }

            if (property.unique) {
                prop.unique = true
            }

            if (property.name === 'id' || property.auto_increment) {
                prop.primaryKey = true
                hasIdField = true
            }

            if (property.unique) {
                uniqueCount++
                if (uniqueCount > 1) {
                    logger.warn('_getDbSchema, more than 1 unique field in: ' + dbModel.name)
                }

                if (!property.index) {
                    property.index = true
                }
            }

            if (property.default_val) {
                if (property.default_val === 'now') {
                    prop.defaultValue = Sequelize.NOW
                } else if (prop.type === DataTypes.BOOLEAN) {
                    prop.defaultValue = String(property.default_val) === 'true' ? 1 : 0
                } else if (property.default_val !== 'current_user_id') {
                    prop.defaultValue = property.default_val
                }
            }

            if (property.index && prop.width < 1024 && prop.type !== DataTypes.TEXT) {
                indexes.push({
                    unique: property.unique,
                    fields: [property.name]
                })
            }

            properties[property.name] = prop
        }

        if (!hasIdField && uniqueCount === 0) {
            logger.debug(dbModel.name + ' has NO id field, use id as default')
            dbModel.properties.push(idProp)
            properties.id = {
                type: DataTypes.INTEGER(11),
                unique: true,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true
            }
        }

        if (!dbModel.name || !dbModel.db_table || dbModel.db_table + '' === 'undefined') {
            logger.error('processDbModel, invalid modelMeta db table: ' + dbModel.name)
            return null
        }

        const model = (sequelize, DataTypes) => {
            const sequelizeModel = sequelize.define(dbModel.name, properties, {
                tableName: dbModel.db_table,
                timestamps: !!dbModel.timestamp,
                createdAt: dbModel.timestamp ? 'created_at' : undefined,
                updatedAt: dbModel.timestamp ? 'updated_at' : undefined,
                freezeTableName: true,
                indexes: indexes.length > 0 ? indexes : undefined
            })

            if (dbModel.name === 'User') {
                sequelizeModel.addHook('beforeValidate', (user, options) => {
                    if (user.password) {
                        const salt = bcrypt.genSaltSync(0)
                        user.password = bcrypt.hashSync(user.password, salt)
                    }
                })

                sequelizeModel.prototype.verifyPassword = function (password) {
                    return bcrypt.compareSync(password, this.password || '')
                }
            }

            return sequelizeModel
        }

        return model
    }

    _convertType(model, property) {
        let type = null

        switch (property.prop_type) {
            case Constants.API_FIELD_TYPE.array:
            case Constants.API_FIELD_TYPE.mix:
            case Constants.API_FIELD_TYPE.object:
            case Constants.API_FIELD_TYPE['array-of-object']:
            case Constants.API_FIELD_TYPE['array-of-boolean']:
            case Constants.API_FIELD_TYPE['array-of-char']:
            case Constants.API_FIELD_TYPE['array-of-number']:
            case Constants.API_FIELD_TYPE['array-of-objectId']:
                type = DataTypes.JSON
                break
            case Constants.API_FIELD_TYPE.boolean:
                type = DataTypes.BOOLEAN
                break
            case Constants.API_FIELD_TYPE.char:
                if (property.width > 1024) {
                    type = DataTypes.TEXT
                } else {
                    type = DataTypes.STRING(property.width || 50)
                }
                break
            case Constants.API_FIELD_TYPE.date:
                type = DataTypes.DATE
                break
            case Constants.API_FIELD_TYPE.number:
                if (property.width > 11) {
                    type = DataTypes.BIGINT(property.width)
                } else {
                    type = DataTypes.INTEGER(property.width || 11)
                }
                break
            case Constants.API_FIELD_TYPE.objectId:
                type = DataTypes.STRING(24)
                break
        }

        if (!type) {
            console.error(`invalid model property type: ${model.name} -> ${property.name}, use STRING(50) as default`)
            type = DataTypes.STRING(property.width || 50)
        }

        return type
    }
}

module.exports = RelationDB
