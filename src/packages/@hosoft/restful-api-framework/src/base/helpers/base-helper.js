/* eslint-disable no-eval */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/
const Constants = require('../constants/constants')
const DB = require('../../db')
const { Dictionary } = require('../../models')

/*****************************************
 * System static caches, never expire
 *****************************************/

// cache of all Dictionary data
let dictionaryCache = {}

// modelMeta enum cache
const enumCache = {}

// class data cache
let modelDataCache = {}

let containerInst = null

/**
 * base helper functions
 */
const wrapper = {
    /**
     * get container instance
     * @returns {*}
     */
    getContainer: () => {
        if (!containerInst) {
            const Container = require('../container')
            containerInst = Container.getInstance()
        }

        return containerInst
    },

    /**
     * get database adapter
     */
    getDB: (dbType) => {
        return DB.getDb(dbType)
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
     * get service modelMeta
     * @param serviceName
     */
    getService(serviceName) {
        return wrapper.getContainer().getService(serviceName)
    },

    /**
     * get service instance
     * @param serviceName
     */
    getServiceInst(serviceName) {
        return wrapper.getContainer().getServiceInst(serviceName)
    },

    /**
     * get dict from database
     * @param dictName
     * @returns {Promise<{}>}
     */
    getSystemDict: async (dictName) => {
        let result = dictionaryCache[dictName]

        if (!result) {
            const dict = await Dictionary.findOne({ name: dictName })
            if (!dict) {
                dictionaryCache[dictName] = {}
                logger.error('getSystemDict, dict not found:', dictName)
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
     * get model property enum object
     */
    getPropertyEnum: (property) => {
        if (!property.relations.name) {
            throw new Error(`not valid enum, please check property ${property.name}`)
        }

        const cacheKey = property.name + property.relations.name
        if (!enumCache[cacheKey]) {
            try {
                let enumJson = property.relations.name.replace(/，/gm, ',').replace(/：/gm, ':').replace(/“/gm, '"')
                enumJson = enumJson.replace(/([^\\"]?)(\d+)([^\\"]?\\:)/gi, '$1"$2"$3')
                let enumObj = {}
                if (enumJson.startsWith('{')) {
                    enumObj = eval('(' + enumJson + ')')
                } else if (Constants[enumJson]) {
                    enumObj = Constants[enumJson]
                }

                enumCache[cacheKey] = enumObj
            } catch (e) {
                throw new Error(`parse enum JSON failed：${e.message}, property ${property.name}`)
            }
        }

        return enumCache[cacheKey]
    },

    /**
     * data cache maintained by default api when cache enabled
     * @param dataKey
     */
    getModelData: (modelName, dataKey) => {
        if (!modelDataCache[modelName]) {
            return null
        }

        return modelDataCache[modelName][dataKey]
    },

    /**
     * data cache maintained by default api when cache enabled,
     * if dataKey not set，will reset modelDataCache for target model
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
    },

    /**
     * clear data cache
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
                // await reloadModel(subKey)
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
    }
}

module.exports = wrapper
