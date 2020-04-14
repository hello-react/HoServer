/* eslint-disable no-eval */
/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 * author: Jack Zhang
 **/
const _ = require('lodash')
const Constants = require('../constants/constants')
const fs = require('fs')
const mongoose = require('mongoose')
const path = require('path')
const pluralize = require('pluralize')

const { Dictionary, Api, Area, reloadModel } = require('../../models')

/*****************************************
 * System static caches, never expire
 *****************************************/

// 最新全国省\市\区县\街道3级区域数据缓存 (2018年12月)
const locationCache = {}

// cache all class instances
const classFactoryCache = {}

// model id field cache
const modelCache = { idField: {}, routePath: {} }

// cache of all Dictionary data
var dictionaryCache = {}

// modelMeta enum cache, e.g. User.gender = {“male“: “男“, “female“: “女“}
var enumCache = {}

// class data cache, 存放需永久存储的业务数据
var modelDataCache = {}

/**
 * 基础 Api 服务工具类
 */
const wrapper = {
    /**
     * 清除缓存
     */
    clearCache: async (category, key, subKey) => {
        if (category === 'Dictionary') {
            if (key) {
                delete dictionaryCache[key]
            } else {
                dictionaryCache = {}
            }
        }

        if (category === 'Model') {
            if (key === 'Model') {
                await reloadModel(subKey)
            } else if (key) {
                if (subKey) {
                    modelDataCache[key] && delete modelDataCache[key][subKey]
                } else {
                    delete modelDataCache[key]
                }
            } else {
                modelDataCache = {}
            }
        }
    },

    /**
     * get container instance
     * @returns {*}
     */
    getContainer: () => {
        // 避免重复包含
        if (!classFactoryCache.container) {
            const Container = require('../container')
            classFactoryCache.container = Container.getInstance()
        }

        return classFactoryCache.container
    },

    /**
     *
     * @param modelName
     * @returns {null}
     */
    getModel(modelName) {
        return wrapper.getContainer().getModel(modelName)
    },

    /**
     * get modelMeta schema
     * @param modelName
     */
    getModelInst(modelName) {
        const modelMeta = wrapper.getContainer().getModel(modelName)
        if (modelMeta) {
            return modelMeta.instance
        }

        return null
    },

    /**
     * get service instance
     * @param serviceName
     */
    getServiceInst(serviceName) {
        return wrapper.getContainer().getServiceInst(serviceName)
    },

    /**
     * get service modelMeta
     * @param serviceName
     */
    getService(serviceName) {
        return wrapper.getContainer().getService(serviceName)
    },

    /**
     * set query db hook
     */
    setQueryDbHook: (hookFunc, routePath, method, order) => {
        return wrapper.getContainer().setHook('beforeDbProcess', hookFunc, routePath, method, order)
    },

    /**
     * set write db hook
     */
    setWriteDbHook: (hookFunc, routePath, method, order) => {
        return wrapper.getContainer().setHook('beforeDbProcess', hookFunc, routePath, method, order)
    },

    /**
     * get all models meta-data from database
     */
    getAllModels: async () => {
        const allModels = _.concat([], global.DB_MODELS)

        // Service meta used for manager
        allModels.push({
            name: 'Service',
            dis_name: '后台服务',
            category_name: 'api',
            properties: [
                {
                    unique: true,
                    name: 'name',
                    dis_name: '服务名称',
                    prop_type: 'char'
                },
                {
                    name: 'dis_name',
                    dis_name: '显示名称',
                    prop_type: 'char'
                },
                {
                    name: 'category',
                    dis_name: '服务分类',
                    prop_type: 'char'
                },
                {
                    name: 'category_name',
                    dis_name: '分类英文',
                    prop_type: 'char'
                },
                {
                    name: 'category_disname',
                    dis_name: '分类英文',
                    prop_type: 'char'
                }
            ]
        })

        // await this._fixModels(allModels);
        return allModels
    },

    /**
     * load all services from database
     * @returns {Promise<*>}
     */
    getAllServices: async () => {
        const serviceFiles = []

        const loopServiceDir = (dir, category) => {
            const pa = fs.readdirSync(dir)
            pa.forEach((ele, index) => {
                const info = fs.statSync(dir + '/' + ele)
                if (info.isDirectory()) {
                    loopServiceDir(dir + '/' + ele, category ? `${category}/${ele}` : ele)
                } else {
                    const fileName = path.basename(ele, '.js')
                    if (fileName.endsWith('Service')) {
                        serviceFiles.push({
                            name: fileName.substr(0, fileName.lastIndexOf('Service')),
                            category_name: category,
                            file: dir + '/' + ele
                        })
                    }
                }
            })
        }

        // system default app services
        loopServiceDir(path.join(global.APP_PATH, 'framework', 'default-app', 'services'), 'default')
        loopServiceDir(path.join(global.APP_PATH, 'services'), '')
        return serviceFiles
    },

    /**
     * loop controoler diorectory and load all controllers
     * @returns {Promise<*>}
     */
    getAllControllers: async () => {
        const controllerFiles = []

        const loopControllerDir = (dir, category) => {
            const pa = fs.readdirSync(dir)
            pa.forEach((ele, index) => {
                const info = fs.statSync(dir + '/' + ele)
                if (info.isDirectory() && !ele.endsWith('Controller')) {
                    loopControllerDir(dir + '/' + ele, category ? `${category}/${ele}` : ele)
                } else {
                    const fileName = path.basename(ele, '.js')
                    if (fileName.endsWith('Controller')) {
                        controllerFiles.push({
                            name: fileName.substr(0, fileName.lastIndexOf('Controller')),
                            category_name: category,
                            file: dir + '/' + ele
                        })
                    }
                }
            })
        }

        loopControllerDir(path.join(global.APP_PATH, 'framework', 'default-app', 'controllers'), 'default')
        loopControllerDir(path.join(global.APP_PATH, 'controllers'), '')
        return controllerFiles
    },

    /**
     * load all apis
     * @param desc 是否倒排
     */
    getAllModifiedApis: async (desc = false) => {
        const result = await Api.find({})
            .sort(desc ? '-order' : 'order')
            .lean()

        return result
    },

    /**
     * Load all Mongdo Schemas
     */
    getMongoSchemas: () => {
        if (!this.dbModels) {
            this.dbModels = require('../../models')
        }

        return this.dbModels
    },

    /**
     * factory method, used for create service and modelMeta instacne
     * @param type service or modelMeta
     * @param serviceCategory the service category
     * @param className
     * @returns {*} the object instance correspond to className
     */
    getClassByName: (type, serviceCategory, className) => {
        // service.api.UserService
        const key = type + '.' + serviceCategory + '.' + className
        const typeName = type.charAt(0).toUpperCase() + type.slice(1)

        if (!classFactoryCache[key]) {
            if (type === 'model') {
                const dbModels = wrapper.getMongoSchemas()
                classFactoryCache[key] = dbModels[className]
            } else {
                let find = false
                let classFilePath = path.join(__dirname, '..', '..', '..', pluralize(type))
                const searchNames = [`${className}${typeName}.js`, className + '.js']
                for (const fileName of searchNames) {
                    const serviceClassFile = path.join(classFilePath, serviceCategory, fileName)
                    if (fs.existsSync(serviceClassFile)) {
                        classFilePath = serviceClassFile
                        find = true
                        break
                    }
                }

                if (!(find && fs.lstatSync(classFilePath).isFile())) {
                    logger.error('getClassByName, find class file failed: ' + className, classFilePath)
                    return null
                }

                classFactoryCache[key] = require(classFilePath)
            }
        }

        return classFactoryCache[key]
    },

    /**
     * get modeul route path
     */
    getModelRoutePath(model) {
        if (modelCache.routePath[model.name]) {
            return modelCache.routePath[model.name]
        }

        // category
        const categoryRoute = model.category_name.toLowerCase()

        // modelMeta
        let customRouteName = false
        let routeName = model.name.toLowerCase()
        if (model.route_name) {
            routeName = model.route_name.toLowerCase()
            customRouteName = true
        } else {
            routeName = model.name.toLowerCase()
        }

        // modelName 如果和 serviceRoute 一样就去掉一级
        // const r1 = new RegExp(serviceRoute + '(i?es)?', 'i') // 忽略结尾复数形式
        // if (r1.test(routeName)) {
        //     serviceRoute = ''
        // }

        // 转成复数形式
        let modelRoute = customRouteName ? routeName : pluralize(routeName)
        routeName = pluralize(routeName, 1) // 需要单数
        // if (r1.test(modelRoute)) {
        //     serviceRoute = ''
        // }

        if (categoryRoute) {
            modelRoute = categoryRoute + '/' + modelRoute
        }

        const result = {
            routeName: routeName,
            path: `${Constants.API_PREFIX}/${modelRoute}`
        }

        modelCache.routePath[model.name] = result
        return result
    },

    /**
     * get sub property by given path
     */
    getSubProperty: (model, propPath) => {
        const routePaths = propPath.split('.')
        if (routePaths.length === 1 && routePaths[0] === model.name) {
            return model
        }

        let subProperty = model
        let i = 0
        if (propPath.startsWith(model.name)) {
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
    },

    /**
     * get dict from database
     * @param dictName
     * @returns {Promise<{}>}
     */
    getSystemDictItem: async dictName => {
        var result = dictionaryCache[dictName]

        if (!result) {
            const dict = await Dictionary.findOne({ name: dictName }).lean()
            if (!dict) {
                dictionaryCache[dictName] = {}
                logger.error('getSystemDictItem, dict not found:', dictName)
                return {}
            }

            result = {}
            for (const val of dict.values) {
                if (val.enabled / 1 !== 0) {
                    result[val.key] = val.value.value || val.value
                }
            }

            dictionaryCache[dictName] = result
        }

        return result
    },

    /**
     * get dict from database
     * @param dictName
     * @returns {Promise<{}>}
     */
    getSystemDictValue: async (dictName, key, valueOnly = false) => {
        const dictValues = await wrapper.getSystemDictItem(dictName)
        if (valueOnly) return dictValues[key]
        else return key + '|' + dictValues[key]
    },

    /**
     * 和 getModelPropertyEnum 不同的是，这个直接处理 property
     */
    getPropertyEnum: (property, modelName = '') => {
        if (!property.relations.name) {
            throw new Error(`不是有效enum，请检查对象定义: ${modelName || 'not set'}, 属性: ${property.name}`)
        }

        const cacheKey = property.name + property.relations.name
        if (!enumCache[cacheKey]) {
            try {
                let enumJson = property.relations.name
                    .replace(/，/gm, ',')
                    .replace(/：/gm, ':')
                    .replace(/“/gm, '"')
                enumJson = enumJson.replace(/([^\\"]?)(\d+)([^\\"]?\\:)/gi, '$1"$2"$3')
                let enumObj = {}
                if (enumJson.startsWith('{')) {
                    enumObj = eval('(' + enumJson + ')')
                } else if (Constants[enumJson]) {
                    enumObj = Constants[enumJson]
                }

                enumCache[cacheKey] = enumObj
            } catch (e) {
                throw new Error(`解析枚举字段 JSON 出错：${e.message}, model: ${modelName || 'not set'}, property: ${property.name}`)
            }
        }

        return enumCache[cacheKey]
    },

    /**
     * get enum related with the modelMeta property
     */
    getModelPropertyEnum: (model, propPath) => {
        const property = wrapper.getSubProperty(model, propPath)
        if (!property) {
            return null
        }

        return wrapper.getPropertyEnum(property)
    },

    /**
     * get location information
     */
    getLocation: params => {
        const location = {}

        if (params.province) {
            location.province = locationCache.provinces[params.province]
        }

        if (params.city) {
            location.city = locationCache.cities[params.city]
        }

        if (params.district) {
            location.district = locationCache.districts[params.district]
        }

        if (params.subdistrict) {
            location.subdistrict = locationCache.subdistricts[params.subdistrict]
        }

        return location
    },

    getModelIdField: model => {
        if (!model._id) {
            model._id = mongoose.Types.ObjectId()
        }

        if (modelCache.idField[model._id]) {
            return modelCache.idField[model._id]
        }

        if (!(model && model.properties)) {
            return 'id'
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

        const result = { idField: idField || 'id', propType }
        modelCache.idField[model._id] = result
        return result
    },

    /**
     * 获取业务数据，业务数据由具体服务本身初始化时全部塞入缓存
     * @param dataKey
     */
    getModelData: (modelName, dataKey) => {
        if (!modelDataCache[modelName]) {
            return null
        }

        return modelDataCache[modelName][dataKey]
    },

    /**
     * 设置业务数据缓存，如未指定 dataKey，将全部替换 modelDataCache
     */
    setModelData: (modelName, dataKey, data) => {
        if (!modelDataCache) {
            modelDataCache = {}
        }

        if (!modelDataCache[modelName]) {
            modelDataCache[modelName] = {}
        }

        if (!dataKey) {
            modelDataCache[modelName] = data
        } else {
            modelDataCache[modelName][dataKey] = data
        }
    }
}

const initLocationCache = async () => {
    const allCities = await Area.find({}).lean()

    const provinces = {}
    const cities = {}
    const districts = {}
    const subdistricts = {}

    for (const city of allCities) {
        if (!provinces[city.prov_code]) {
            provinces[city.prov_code] = city.province
        }

        cities[city.city_code] = city.city

        for (const district of city.districts) {
            districts[district.code] = district.district
            for (const subdistrict of district.subdistricts) {
                subdistricts[subdistrict.code] = subdistrict.subdistrict
            }
        }
    }

    locationCache.provinces = provinces
    locationCache.cities = cities
    locationCache.districts = districts
    locationCache.subdistricts = subdistricts
}

// init location cache at start
initLocationCache().then(() => {
    logger.debug('location cache init success')
})

module.exports = wrapper
