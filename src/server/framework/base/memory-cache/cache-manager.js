/* eslint-disable guard-for-in,brace-style */
/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/

const cacheManager = require('./cache-store')
// const config = require('config')

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
                // host: config.get('redis.host'),
                // port: config.get('redis.port'),
                ttl: 1800 /* 默认30分钟 */
            })
        }

        return cacheManagerInstance
    }

    /**
     * set cache
     * @param keyPrefix 用于对缓存进行分类
     * @param key cache key
     * @param value cache value
     * @param ttl timeout duration, default is 1 hour
     */
    static async setCache(keyPrefix, key, value, ttl) {
        try {
            return await CacheManager.getInstance().set(keyPrefix + key, value, ttl)
        } catch (err) {
            logger.error('setCache error: ' + keyPrefix + key, err)
        }
    }

    /**
     * get cache
     * @param keyPrefix 用于对缓存进行分类
     * @param key
     */
    static async getCache(keyPrefix, key) {
        try {
            return await CacheManager.getInstance().get(keyPrefix + key)
        } catch (err) {
            logger.error('getCache error: ' + keyPrefix + key, err)
            return null
        }
    }
}

module.exports = CacheManager
