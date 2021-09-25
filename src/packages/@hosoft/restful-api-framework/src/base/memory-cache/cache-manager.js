/* eslint-disable guard-for-in,brace-style */
/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/

const cacheManager = require('./cache-store')
// const config = require('@hosoft/config')

// container instance
let cacheManagerInstance = null

/**
 * global cache manager
 */
class CacheManager {
    /**
     * factory method
     */
    static getInstance() {
        if (cacheManagerInstance == null) {
            cacheManagerInstance = cacheManager.caching({
                store: 'memory',
                // store: 'redis',
                // host: config.get('db.redis.host'),
                // port: config.get('db.redis.port'),
                ttl: 1800 /* default 30 minutes */
            })
        }

        return cacheManagerInstance
    }

    /**
     * set cache
     * @param keyPrefix used for classify cache
     * @param key cache key
     * @param value cache value
     * @param ttl timeout duration, default is 1 hour
     */
    static async setCache(keyPrefix, key = '', value, ttl = 600) {
        try {
            return await CacheManager.getInstance().set(keyPrefix + key, value, ttl)
        } catch (err) {
            logger.error('setCache error: ' + keyPrefix + key, err)
        }
    }

    /**
     * get cache
     * @param key
     */
    static async getCache(keyPrefix, key = '') {
        try {
            return await CacheManager.getInstance().get(keyPrefix + key)
        } catch (err) {
            logger.error('getCache error: ' + keyPrefix + key, err)
            return null
        }
    }

    /**
     * delete cache
     * @param key
     */
    static async deleteCache(keyPrefix, key = '') {
        try {
            return await CacheManager.getInstance().del(keyPrefix + key)
        } catch (err) {
            logger.error('deleteCache error: ' + keyPrefix + key, err)
            return null
        }
    }
}

module.exports = CacheManager
