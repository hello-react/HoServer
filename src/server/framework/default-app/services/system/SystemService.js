/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 * author: Jack Zhang
 **/
const mongoose = require('mongoose')
const { ApiService } = require('../../services')
const { Content, SiteMaintain } = require('../../../models')

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
}

module.exports = new SystemService()
