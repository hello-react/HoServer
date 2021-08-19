/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 **/
const _ = require('lodash')
const { Api, Dictionary } = require('../../../models')
const { BaseHelper } = require('../../../base/helpers')
const { ErrorCodes } = require('../../../base')

/**
 * system api services
 */
class ApiService {
    /**
     * get API list
     */
    async getApiList(args, getAll) {
        let allApis = await BaseHelper.getContainer().getRouteList(!getAll, getAll)
        if (args.category_name !== undefined) {
            allApis = allApis.filter((api) => api.category_name === args.category_name)
        }
        if (args.method) {
            allApis = allApis.filter((api) => args.method.indexOf(api.method) > -1)
        }
        if (args.dis_name) {
            allApis = allApis.filter((api) => api.dis_name.indexOf(args.dis_name) > -1)
        }
        if (args.path) {
            allApis = allApis.filter((api) => api.path.indexOf(args.path) > -1)
        }
        if (args.description) {
            allApis = allApis.filter((api) => api.description && api.description.indexOf(args.description) > -1)
        }

        allApis = _.sortBy(allApis, ['type', 'main_cat', 'second_cat'])

        let preMainCat = {}
        for (const api of allApis) {
            if (api.main_cat !== preMainCat.main_cat) {
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
            // api count to display in admin site
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
     * get api detail
     * @param id
     * @returns {Promise<void>}
     */
    async getApiDetailt(id) {
        return BaseHelper.getContainer().getRouteById(id)
    }

    /**
     * update api，only the fields which allow to modify were updated
     */
    async updateApi(id, apiInfo) {
        const api = await BaseHelper.getContainer().getRouteById(id)
        if (!api) {
            return Promise.reject({ message: `Api not found: ${id}`, code: ErrorCodes.GENERAL_ERR_PARAM })
        }

        const existRecord = await Api.findOne({ id }, { lean: false }, { __v: 0 })
        const apiEditableFields = BaseHelper.getContainer().getApiEditableFields()
        for (const field of apiEditableFields) {
            if (apiInfo[field] !== undefined) {
                api[field] = apiInfo[field]

                if (existRecord) {
                    existRecord[field] = apiInfo[field]
                }
            }
        }

        // persis
        try {
            if (!existRecord) {
                await Api.create({
                    id: id,
                    path: api.path,
                    method: api.method,
                    ...apiInfo
                })
            } else {
                await existRecord.save()
            }
        } catch (e) {
            logger.error('update api failed: ', e)
        }

        // next time when get Api will auto generate
        delete api.main_cat
        return 'success'
    }

    /**
     * get system dict categories
     */
    async getDictCategories() {
        const categories = await Dictionary.find({}, { distinct: 'category_name' })
        return categories.map((c) => (typeof c === 'object' ? c.category_name : c)) // compatible with mysql
    }

    /**
     * modify category name for service, model, api
     */
    async setSysCategoryName(args) {
        const { key, value } = args
        const dictItem = await Dictionary.nativeModel.findOne({ name: 'sys_category' })
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
                dis_name: tf('sysCategory'),
                category_name: tf('sysDictionary'),
                created_at: Date.now(),
                updated_at: Date.now()
            })

            return newRecord.id
        }

        const existItem = dictItem.values.find((v) => v.key === key)
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

        dictItem.changed('values', true)
        await dictItem.save()
        await BaseHelper.clearCache('Dictionary', 'sys_category')
        return 'success'
    }

    /**
     * get service list
     */
    async getServiceList(args) {
        const serviceList = await BaseHelper.getContainer().getAllServices()
        const categoryNameDict = await BaseHelper.getSystemDict('sys_category')
        let allServices = []

        for (const key in serviceList) {
            const service = serviceList[key]
            const funcList = Object.getPrototypeOf(service.instance)
            const funcNames = Object.getOwnPropertyNames(funcList).filter((f) => f !== 'constructor')

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
     * fill category name
     */
    async fillCategoryInfo(dataList) {
        if (!(dataList && dataList instanceof Array)) {
            return
        }

        const categoryNameDict = await BaseHelper.getSystemDict('sys_category')
        for (const model of dataList) {
            const modelObj = model._doc || model
            if (modelObj.category_name === undefined) {
                modelObj.category_name = '_default'
                modelObj.category_disname = tf('defaultCategory')
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
