const moment = require('moment')
const { BaseHelper, ErrorCodes } = require('@hosoft/restful-api-framework/base')
const { Content, SiteMaintain } = require('@hosoft/restful-api-framework/models')
const { fileUtils } = require('@hosoft/restful-api-framework/utils')

/**
 * default system service
 */
class SystemService {
    constructor() {
        this.init()
    }

    async init() {
        const maintainInfo = await this.getSiteMaintainInfo()
        if (maintainInfo) {
            await BaseHelper.getContainer().enableMaintainInfo(maintainInfo)
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
        await BaseHelper.getContainer().enableMaintainInfo(args)

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

        const clientVersion = {}
        if ((client_type, build)) {
            await this.getClientVersion(client_type, build)
        }

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
            server_time: moment().format('YYYY-MM-DD HH:mm:ss'),
            client_ver: clientVersion,
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
}

module.exports = new SystemService()
