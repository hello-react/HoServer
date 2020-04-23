/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/02/10
 * author: Jack Zhang
 **/
const _ = require('lodash')
const config = require('config')
const fileUtils = require('../../utils/file-utils')
const path = require('path')
const SystemService = require('../services/system/SystemService')
const configDesc = fileUtils.getJsonFile(path.join(global.APP_PATH, 'config', 'config_desc.json'))
const { Constants } = require('../../base')

/**
 * 资源服务，提供对资源、课件相关功能的接口
 */
class SystemController {
    initRoutes(container, router) {
        // tags
        router.def('Tags')

        // server logs
        router.def('ServerLog', ['list'])

        // 系统公告、系统维护
        router.get('/system/announce', '获取系统公告内容', async ctx => SystemService.getAnnounce(), { permissions: [] })
        router.post('/system/announce', '设置系统公告内容', async ctx => SystemService.setAnnounce(ctx.body), { name: 'setSystemAnnounce', public: false })
        router.get('/system/maintain', '获取系统维护信息', async ctx => SystemService.getSiteMaintainInfo(), { permissions: [] })
        router.post('/system/maintain', '设置系统维护信息', async ctx => SystemService.setSiteMaintainInfo(ctx.body), { name: 'setSystemMaintainInfo', public: false })

        // 客户端启动准备完毕上报
        router.post('/system/client/ready', '客户端启动完毕', async ctx => SystemService.clientReadyMsg(ctx.currentUserId, ctx.body))

        // 系统配置接口
        router.get('/system/configs', '获取系统配置列表', async ctx => this._getSystemConfigs(), { public: false })
    }

    // 系统配置直接通过 config 获取，只读
    _getSystemConfigs() {
        const configItems = _.cloneDeep(config)

        const result = {
            NODE_ENV: config.util.getEnv('NODE_ENV'),
            // configFile: config.util
            //     .getConfigSources()
            //     .map(f => f.name)
            //     .join(', '),
            ...configItems
        }

        this._setDesc(result, configDesc)
        return result
    }

    _setDesc(items, descItems) {
        const keys = _.keys(items)
        for (const key of keys) {
            const item = items[key]
            const descItem = descItems[key] || {}
            if (typeof item === 'object') {
                this._setDesc(item, descItem)
                item.dis_name = descItem.dis_name
                item.desc = descItem.desc
            } else {
                items[key] = {
                    ...descItem,
                    value: Constants.IS_DEMO_SITE && descItem.mask ? '*'.repeat(Math.min(items[key].length, 50)) : items[key]
                }
            }
        }
    }
}

module.exports = new SystemController()
