/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/07/01
 **/

const Constants = require('../base/constants/constants')
const pluralize = require('pluralize')

/**
 * Base Model
 */
class Model {
    constructor(modelMeta, nativeModel) {
        this._meta = modelMeta
        this._native = nativeModel

        this._idField = {}
        this._routePath = null
        this._propertyList = {}
        this._setPropertyList()

        Model.setOutputFlag(modelMeta)

        this.getId = (id) => {}
        this.find = async (query, options, outFields) => {}
        this.findOne = async (query, options, outFields) => {}
        this.count = async (query, groupBy) => {}
        this.create = async (inputData, options) => {}
        this.createSub = async (propName, query, inputData, options) => {}
        this.update = async (query, inputData, options) => {}
        this.updateSub = async (propName, query, inputData, options) => {}
        this.updateMany = async (dataList, options) => {}
        this.delete = async (query, options) => {}
        this.deleteSub = async (propName, query, options) => {}
        this.deleteMany = async (query, options) => {}
        this.aggregate = async (query) => {}
        this.sync = async (options) => {}
        this.getDbType = () => {}
    }

    get name() {
        return this._meta.name
    }

    get meta() {
        return this._meta
    }

    set meta(modelMeta) {
        this._setPropertyList(modelMeta)
    }

    get properties() {
        return this._meta.properties
    }

    get relations() {
        return this._meta.relations
    }

    get nativeModel() {
        return this._native
    }

    hasProperty(propPath) {
        return this._propertyList[propPath] !== undefined
    }

    /**
     * get sub property by given path
     */
    getProperty(propPath) {
        if (!propPath) return null

        const modelNamePrefix = `${this._meta.name}.`
        const pos = propPath.indexOf(modelNamePrefix)
        if (pos === 0) {
            propPath = propPath.substr(modelNamePrefix.length)
        }

        return this._propertyList[propPath]

        /*
        const routePaths = propPath.split('.')
        if (routePaths.length === 1 && routePaths[0] === this.name) {
            return this._meta
        }

        let subProperty = this._meta
        let i = 0
        if (propPath.startsWith(this.name)) {
            i = 1
        }

        for (; i < routePaths.length; i++) {
            if (subProperty && subProperty.properties) {
                subProperty = subProperty.properties.find(item => item.name === routePaths[i])
            } else {
                return null
            }
        }

        return subProperty
        */
    }

    /**
     * add output_flag_mod, array_level flag，which will be used in later operations
     * output_flag_mod:
     *  0 disallow output
     *  1 output by default (sub property may not output)
     *  2 don't output by default
     *  3 auto output, if sub property output_flag set to 1 or 4, will set to 1
     *  4 output include all sub properties
     */
    static setOutputFlag(prop, parent) {
        if (!prop) {
            return
        }

        if (prop.array_level === undefined) {
            prop.array_level = parent ? parent.array_level : 0
        }

        if (!prop.properties) {
            prop.output_flag_mod = prop.output_flag === 3 ? 1 : prop.output_flag
            return
        }

        if (prop.prop_type === Constants.API_FIELD_TYPE['array-of-object'] && prop.properties.length > 0) {
            prop.array_level++
        }

        let allSubOut = true
        for (const subProp of prop.properties) {
            Model.setOutputFlag(subProp)

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

    /**
     * get default output fields
     */
    getDefaultOutFields() {
        const defOutFields = []
        for (const prop of this.properties) {
            if (prop.output_flag_mod === 1 || prop.output_flag_mod === 4) {
                defOutFields.push(prop.name)
            }
        }

        return defOutFields
    }

    /**
     * get api output fields
     */
    getOutFields(query, outFields) {
        let selectFields

        if (query.select) {
            selectFields = {}
            const selFields = query.select.split(/[\s,]/)
            for (const fieldName of selFields) {
                const prop = this._propertyList[fieldName]
                if (prop && prop.output_flag_mod > 0) {
                    selectFields[fieldName] = 1
                }
            }
        } else if (outFields) {
            selectFields = outFields
        } else {
            selectFields = query.lean !== false ? { _id: 0, __v: 0 } : { __v: 0 }
        }

        return selectFields
    }

    /**
     * get model id field
     */
    getIdField(propPath) {
        if (this._idField[propPath] !== undefined) {
            return this._idField[propPath]
        }

        const model = propPath ? this.getProperty(propPath) : this

        if (!model.properties) {
            this._idField[propPath] = {}
            return this._idField[propPath]
        }

        let idField
        let propType
        for (let i = 0; i < model.properties.length; i++) {
            const property = model.properties[i]
            if (property && property.unique) {
                idField = property.name
                propType = property.prop_type
                if (idField !== 'id') {
                    break
                }
            }
        }

        if (idField === 'id') {
            propType = Constants.API_FIELD_TYPE.objectId
        }

        this._idField[propPath] = idField ? { name: idField, type: propType } : {}
        return this._idField[propPath]
    }

    /**
     * check id field type, auto convert or generate it
     */
    makeId(inputObj, subModel, isCreate) {
        const model = subModel || this

        for (const prop of model.properties) {
            const queryKey = prop.name
            const inputObjProp = inputObj[queryKey]

            if (prop.name === 'id' || prop.unique) {
                if (prop.prop_type === Constants.API_FIELD_TYPE.objectId) {
                    if (!inputObjProp) {
                        if (isCreate) inputObj[queryKey] = this.getObjectId()
                    } else {
                        inputObj[queryKey] = this.getObjectId(inputObjProp)
                    }
                }
            }

            // recursive check
            if (prop.properties && prop.properties.length > 0 && prop.array_level < 2 && inputObjProp) {
                if (prop.prop_type.indexOf('array') > -1 && inputObjProp instanceof Array) {
                    for (const inputObjAryItem of inputObjProp) {
                        this.makeId(inputObjAryItem, prop, isCreate)
                    }
                } else {
                    this.makeId(inputObjProp, prop, isCreate)
                }
            }
        }
    }

    /**
     * get model api route path
     * @returns {null}
     */
    getRoutePath() {
        if (this._routePath) {
            return this._routePath
        }

        // category
        const modelMeta = this.meta
        const categoryRoute = modelMeta.category_name.toLowerCase()

        // modelMeta
        let customRouteName = false
        let routeName = this.name.toLowerCase()
        if (modelMeta.route_name) {
            routeName = modelMeta.route_name.toLowerCase()
            customRouteName = true
        } else {
            routeName = this.name.toLowerCase()
        }

        // if modelName same as serviceRoute, remove one
        // const r1 = new RegExp(serviceRoute + '(i?es)?', 'i') // ignore plural
        // if (r1.test(routeName)) {
        //     serviceRoute = ''
        // }

        // convert to plural
        let modelRoute = customRouteName ? routeName : pluralize(routeName)
        routeName = pluralize(routeName, 1) // need singular for this
        // if (r1.test(modelRoute)) {
        //     serviceRoute = ''
        // }

        if (categoryRoute && !customRouteName) {
            modelRoute = categoryRoute + '/' + modelRoute
        }

        this._routePath = {
            routeName: routeName,
            path: `${Constants.API_PREFIX}/${modelRoute}`
        }

        return this._routePath
    }

    /**
     * model and query is used for get array element by input id
     */
    getObjectProp(record, propPath, query) {
        let subRecord = record
        let subModel = this
        let modelPath = ''

        const modelName = `${this._meta.name}.`
        const pos = propPath.indexOf(modelName)
        if (pos === 0) {
            propPath = propPath.substr(modelName.length)
        }

        const namePaths = propPath.split('.')
        for (let i = 0; i < namePaths.length; i++) {
            if (modelPath) {
                modelPath += '.'
            }

            modelPath += namePaths[i]
            subModel = subModel.properties.find((p) => p.name === namePaths[i])
            subRecord = subRecord[namePaths[i]]

            if (subRecord instanceof Array && query && i < namePaths.length) {
                const { name, type } = this.getIdField(modelPath)
                const inputId = query[`${modelPath}.${name}`]
                if (inputId) {
                    // TODO: object id equals
                    if (type === Constants.API_FIELD_TYPE.objectId) {
                        subRecord = subRecord.find((sr) =>
                            sr[name].equals ? sr[name].equals(inputId) : sr[name] == inputId
                        )
                    } else {
                        subRecord = subRecord.find((sr) => sr[name] == inputId)
                    }
                }
            }
        }

        return subRecord
    }

    /// ////////// private functions ///////////////

    /**
     * make properties list hashtable for later quick access
     */
    _setPropertyList() {
        const propertyList = {}

        const processProp = (prop, parentPath) => {
            if (parentPath) parentPath += '.'
            for (const p of prop.properties) {
                const childPath = `${parentPath}${p.name}`
                propertyList[childPath] = p
                if (p.properties) {
                    processProp(p, childPath)
                }
            }
        }

        processProp(this._meta, '')
        this._propertyList = propertyList
    }
}

module.exports = Model
