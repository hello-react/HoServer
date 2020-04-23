/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/02/27
 * author: Jack Zhang
 **/
const { Constants } = require('../framework/base')

/**
 * 内容管理接口
 */
class ContentController {
    initRoutes(container, router) {
        // 内容管理路由
        router.def('Content', [...Constants.API_DEF_ROUTE_ACTIONS, 'batch_update'])
        router.def('Content', 'list').beforeDbProcess((context, query) => {
            if (context.query.search) {
                // prettier-ignore
                query.$or = [
                    { title: new RegExp(`.*${context.query.search}.*`) },
                    { content: new RegExp(`.*${context.query.search}.*`) }
                ]
            }
        })
    }
}

module.exports = new ContentController()
