/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/03/09
 **/
const md5 = require('md5')
const { CacheManager, Constants } = require('../../base')

/**
 * Note:
 * After caching is enabled, the system automatically caches the returned results according to the
 * hash value of the query parameters, which can effectively improve the response time of the server.
 * Caching is suitable for scenarios where static data or data that is not frequently updated,
 * and the query parameters are within a limited range.
 *
 * If the data is frequently updated and the cache is used, the client cannot obtain the latest data.
 * Modifying the interface to implement the cache refresh strategy will increase the architecture and code complexity.
 * If the query parameters are not fixed, the cache cannot be hit and loses the meaning of the cache,
 * and the server memory is wasted.
 */
const before = async (context) => {
    const { req, apiRoute } = context
    const { api } = apiRoute

    // only for GET request
    if (api.cache && api.cache.enabled && api.method === 'GET') {
        const queryHash = _getApiHash(req)
        context.extraInfo.cache = { key: queryHash, hit: false }

        const apiCache = await CacheManager.getCache('apiCache', queryHash)
        if (apiCache) {
            context.setResult(apiCache, true)
            context.extraInfo.cache.hit = true

            return Constants.HOOK_RESULT.RETURN
        }
    }
}

const after = async (context) => {
    const { cache } = context.extraInfo

    if (cache && cache.key && !cache.hit && context.result) {
        await CacheManager.setCache('apiCache', cache.key, context.result)
    }
}

const _getApiHash = (req) => {
    return md5(req.url)
}

module.exports = {
    before: before,
    after: after
}
