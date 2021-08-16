/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 **/
const fileUtils = require('../../../utils/file-utils')
const moment = require('moment')
const PluginManager = require('../../../base/plugin-manager')
const { ApiService } = require('../../services')
const { Content, SiteMaintain } = require('../../../models')
const { ErrorCodes } = require('../../../base')

/**
 * default system service
 */
class DefSystemService {
    constructor() {
        this.init()
    }

    async init() {
        const maintainInfo = await this.getSiteMaintainInfo()
        if (maintainInfo) {
            await ApiService.setSiteMaintainInfo(maintainInfo)
        }
    }

    /**
     * get announce content
     */
    async getAnnounce(limit = 10) {
        return Content.find(
            {
                category: 'sys',
                sub_category: 'announce',
                enabled: true
            },
            { page_size: limit, sort: { updated_at: -1 } }
        )
    }

    /**
     * System announces are saved in Content table, with category announce
     */
    async setAnnounce(args) {
        args.category = 'announce'
        if (args.enabled === undefined) {
            args.enabled = true
        }

        if (args.id) {
            return Content.updateOne({ id: args.id }, args)
        } else {
            args.category = 'sys'
            args.sub_category = 'sys'
            const result = await Content.create(args)
            return result.id
        }
    }

    /**
     * get system maintain info
     */
    async getSiteMaintainInfo() {
        return SiteMaintain.findOne({ enabled: true })
    }

    /**
     * set system maintain info
     */
    async setSiteMaintainInfo(args) {
        await ApiService.setSiteMaintainInfo(args)

        if (args.id) {
            return SiteMaintain.updateOne({ id: args.id }, args)
        } else {
            args.category = 'sys'
            const result = await SiteMaintain.create(args)
            return result.id
        }
    }

    /**
     * client initialize finished
     */
    async clientReadyMsg(user_id, args) {
        const { build, platform, client_type } = args
        if (!(user_id && build && platform && client_type)) {
            return Promise.reject({ message: tf('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const clientVersion = await this.getClientVersion(client_type, build)
        const announces = await this.getAnnounce(1)
        const adContent = await Content.find(
            {
                category: 'sys',
                sub_category: 'ad',
                enabled: true
            },
            { page_size: 3, sort: { updated_at: -1 } }
        )

        return {
            serverTime: moment().format('YYYY-MM-DD HH:mm:ss'),
            clientVer: clientVersion,
            announces: announces,
            ad: adContent
        }
    }

    /**
     * client version info
     */
    async getClientVersion(clientType) {
        if (!clientType) {
            return Promise.reject({ message: tf('errParameter'), code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        if (!this.clientVersion) {
            this.clientVersion = {}
        }

        if (!this.clientVersion[clientType]) {
            this.clientVersion[clientType] = fileUtils.getJsonFile(`${clientType}_version`)
        }

        return this.clientVersion[clientType]
    }

    /**
     * get installed plugins
     * @param args
     */
    async installedPlugins(args) {
        return PluginManager.getInstalledPlugins()
    }

    /**
     * enable or disable plugin
     * @param args
     * @returns {Promise<void>}
     */
    async enablePlugin(args) {
        const { name, enabled, package_info } = args
        return await PluginManager.enablePlugin(name, enabled, package_info)
    }
}

module.exports = new DefSystemService()
