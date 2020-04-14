/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 * author: Jack Zhang
 **/
const _ = require('lodash')
const { Api, Dictionary } = require('../../../models')
const { BaseHelper, ErrorCodes } = require('../../../base')

/**
 * API 接口管理服务，对应管理后台的接口管理功能，
 * 包含对服务、对象、接口、词典、组件的管理
 */
class ApiService {
    /**
     * 获取 API 列表
     */
    async getApiList(args) {
        let allApis = await BaseHelper.getContainer().getApiList(true)
        if (args.category_name !== undefined) {
            allApis = allApis.filter(api => api.category_name === args.category_name)
        }
        if (args.method) {
            allApis = allApis.filter(api => args.method.indexOf(api.method) > -1)
        }
        if (args.dis_name) {
            allApis = allApis.filter(api => api.dis_name.indexOf(args.dis_name) > -1)
        }
        if (args.path) {
            allApis = allApis.filter(api => api.path.indexOf(args.path) > -1)
        }
        if (args.description) {
            allApis = allApis.filter(api => api.description && api.description.indexOf(args.description) > -1)
        }

        allApis = _.sortBy(allApis, ['category_name'])

        let preMainCat = {}
        for (const api of allApis) {
            if (api.main_category !== preMainCat.main_category) {
                preMainCat = api
                preMainCat.count = 1
            } else {
                preMainCat.count++
            }
        }

        const page = args.page || 1
        const pageSize = args.page_size || 30

        const result = []
        const start = (page - 1) * pageSize
        const end = Math.min((page - 1) * pageSize + pageSize, allApis.length)
        for (let i = start; i < end; i++) {
            // 第一个元素有可能没有 count，对应客户端显示的该分类下api个数
            if (i === start && allApis[i].count === undefined) {
                for (let j = start - 1; j >= 0; j--) {
                    if (allApis[j].count) {
                        allApis[i].count = allApis[j].count
                        break
                    }
                }
            }

            const api = allApis[i]
            if (args.select_all) {
                result.push(api)
            } else {
                const simpleApi = { ...api }
                delete simpleApi.in_params
                delete simpleApi.out_fields
                delete simpleApi.input_example
                delete simpleApi.output_example
                result.push(simpleApi)
            }
        }

        return {
            list: result,
            pagination: {
                total: allApis.length,
                pageSize: pageSize,
                current: page,
                pages: parseInt(allApis / pageSize)
            }
        }
    }

    /**
     * 获取 Api 详情
     * @param id
     * @returns {Promise<void>}
     */
    async getApiDetailt(id) {
        return BaseHelper.getContainer().getApi(id)
    }

    /**
     * 更新 Api 信息，仅支持更新 disabled, mock_result 两个属性
     */
    async updateApi(id, apiInfo) {
        const api = await BaseHelper.getContainer().getApi(id)
        if (!api) {
            return Promise.reject({ message: `Api未找到: ${id}`, code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const existRecord = await Api.findOne({ id })
        const apiEditableFields = BaseHelper.getContainer().getApiEditableFields()
        for (const field of apiEditableFields) {
            if (apiInfo[field] !== undefined) {
                api[field] = apiInfo[field]

                if (existRecord) {
                    existRecord[field] = apiInfo[field]
                }
            }
        }

        // 持久化到数据库
        if (!existRecord) {
            // 仅持久化已修改的部分
            await Api.create({
                id: id,
                path: api.path,
                method: api.method,
                ...apiInfo
            })
        } else {
            await existRecord.save()
        }

        delete api.main_category // 下次获取 Api 列表时重新生成
        return 'success'
    }

    /**
     * 获取系统字典分类列表
     */
    async getDictCategories() {
        const categories = await Dictionary.distinct('category_name')
        return categories
    }

    /**
     * 修改服务、Model、Api的分类名称
     */
    async setSysCategoryName(args) {
        const { key, value } = args
        const dictItem = await Dictionary.findOne({ name: 'sys_category' })
        if (!dictItem) {
            const newRecord = await Dictionary.create({
                values: [
                    {
                        key: key,
                        value: value,
                        order: 1,
                        enabled: 1
                    }
                ],
                name: 'sys_category',
                dis_name: '系统Api、Model分类',
                category_name: '系统内置字典',
                created_at: Date.now(),
                updated_at: Date.now()
            })

            return newRecord.id
        }

        const existItem = dictItem.values.find(v => v.key === key)
        if (existItem) {
            existItem.value = value
            existItem.enabled = true
        } else {
            const maxOrder = _.reduce(dictItem.values, (max, r) => Math.max(max, r.order || 0), 0)
            dictItem.values.push({
                key: key,
                value: value,
                order: maxOrder + 1,
                enabled: 1
            })
        }

        await dictItem.save()
        await BaseHelper.clearCache('Dictionary', 'sys_category')
        return 'success'
    }

    /**
     * 获取服务列表
     */
    async getServiceList(args) {
        const serviceList = await BaseHelper.getContainer().getServiceList()
        const categoryNameDict = await BaseHelper.getSystemDictItem('sys_category')
        let allServices = []

        for (const key in serviceList) {
            const service = serviceList[key]
            const funcList = Object.getPrototypeOf(service.instance)
            const funcNames = Object.getOwnPropertyNames(funcList).filter(f => f !== 'constructor')

            if (service.category_name.indexOf('default/') < 0) {
                allServices.push({
                    name: service.name + 'Service',
                    description: service.description,
                    category_name: service.category_name,
                    category_disname: categoryNameDict[service.category_name],
                    file: service.file,
                    functions: funcNames
                })
            }
        }

        allServices = _.sortBy(allServices, ['category_name', 'name'])

        return {
            list: allServices,
            pagination: {
                total: allServices.length,
                pageSize: allServices.length,
                current: 1,
                pages: 1
            }
        }
    }

    /**
     * 设置系统维护信息，非匿名 Api 将拒绝请客户端求
     * @param args
     * @returns {Promise<void>}
     */
    async setSiteMaintainInfo(args) {
        BaseHelper.getContainer().enableMaintainInfo(args)
    }

    /**
     * 填充分类显示名称，并
     */
    async fillCategoryInfo(dataList) {
        if (!(dataList && dataList instanceof Array)) {
            return
        }

        const categoryNameDict = await BaseHelper.getSystemDictItem('sys_category')
        for (const model of dataList) {
            const modelObj = model._doc || model
            if (modelObj.category_name === undefined) {
                modelObj.category_name = 'default'
                modelObj.category_disname = '默认分类'
            } else {
                const disName = categoryNameDict[modelObj.category_name]
                if (disName) {
                    modelObj.category_disname = disName
                }
            }
        }
    }

    /// /////////// private functions /////////////
}

module.exports = new ApiService()
