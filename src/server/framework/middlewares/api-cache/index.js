/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/03/09
 **/
const md5 = require('md5')
const { CacheManager, Constants } = require('../../base')

/**
 * 注意：
 * 启用缓存后，系统自动根据查询参数哈希值对返回结果进行缓存，可有效提升服务端响应时间。
 * 缓存适用于静态数据或不常更新的数据，并且查询参数在有限范围内的场景。
 *
 * 若数据经常更新使用缓存将会导致客户端无法获取最新数据，修改接口实现缓存刷新策略则又增加架构和代码复杂度，
 * 若查询参数不固定则缓存无法命中失去缓存存在的意义，并浪费服务端内存。
 */
const before = async context => {
    const { req, apiRoute } = context
    const { api } = apiRoute

    // 仅针对 GET 请求
    if (api.cache && api.cache.enabled && api.method === 'GET') {
        const queryHash = _getApiHash(req)
        context.extraInfo.cache = { key: queryHash, hit: false }

        const apiCache = await CacheManager.getCache('apiCache', queryHash)
        if (apiCache) {
            context.setResult(apiCache, true)
            context.extraInfo.cache.hit = true

            return Constants.API_RESULT.RETURN
        }
    }
}

const after = async context => {
    const { cache } = context.extraInfo

    if (cache && cache.key && !cache.hit && context.result) {
        await CacheManager.setCache('apiCache', cache.key, context.result)
    }
}

const _getApiHash = req => {
    return md5(req.url)
}

module.exports = {
    before: before,
    after: after
}
