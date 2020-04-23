/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 * author: Jack Zhang
 **/
const fileUtils = require('../../../../framework/utils/file-utils')
const moment = require('moment')
const mongoose = require('mongoose')
const { ApiService } = require('../../services')
const { Content, SiteMaintain } = require('../../../models')
const { ErrorCodes } = require('../../../base')

/**
 * 对应后台系统管理中的相关功能接口
 *
 */
class SystemService {
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
     * 获取系统公告内容
     */
    async getAnnounce() {
        return Content.find({ category: 'sys', sub_category: 'announce', enabled: true })
            .limit(10)
            .sort({ updated_at: -1 })
            .lean()
    }

    /**
     * 设置系统公告内容，系统公告保存在 Content 表中，category 是 announce
     */
    async setAnnounce(args) {
        args.category = 'announce'
        if (args.enabled === undefined) {
            args.enabled = true
        }

        if (args.id) {
            return Content.updateOne({ id: args.id }, { $set: args })
        } else {
            args.id = mongoose.Types.ObjectId()
            args.category = 'sys'
            args.sub_category = 'sys'
            const result = await Content.create(args)
            return result.id
        }
    }

    /**
     * 获取系统维护信息
     */
    async getSiteMaintainInfo() {
        return SiteMaintain.findOne({ enabled: true }).lean()
    }

    /**
     * 设置系统维护信息，同时需要通知 ApiService
     */
    async setSiteMaintainInfo(args) {
        await ApiService.setSiteMaintainInfo(args)

        if (args.id) {
            return SiteMaintain.updateOne({ id: args.id }, { $set: args })
        } else {
            args.id = mongoose.Types.ObjectId()
            args.category = 'sys'
            const result = await SiteMaintain.create(args)
            return result.id
        }
    }

    /**
     * 客户端初始化完毕，服务端发送相关信息
     */
    async clientReadyMsg(user_id, args) {
        const { build, platform, client_type } = args
        if (!(user_id && build && platform && client_type)) {
            return Promise.reject({ msg: '参数错误', code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const clientVersion = await this.getClientVersion(client_type, build)

        return {
            serverTime: moment().format('YYYY-MM-DD HH:mm:ss'),
            clientVer: clientVersion,
            announce: {}
        }
    }

    /**
     * 客户端版本更新信息
     */
    async getClientVersion(clientType, clientVersion) {
        if (!clientType) {
            return Promise.reject({ msg: '版本信息未指定', code: ErrorCodes.GENERAL_ERR_PARAM })
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
