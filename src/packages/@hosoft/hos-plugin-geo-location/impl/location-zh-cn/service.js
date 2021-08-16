/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
**/
const { Area } = require('@hosoft/restful-api-framework/models')
const { BaseHelper } = require('@hosoft/restful-api-framework/base')

// 最新全国省\市\区县\街道3级区域数据缓存 (2018年12月)
const locationCache = {}

/**
 * Third login service
 */
class AreaService {
    async initLocationCache(){
        let allCities = await Area.find({})
        if (allCities.length === 0) {
            await this.initLocationData()
            allCities = await Area.find({})
        }

        const provinces = {}
        const cities = {}
        const districts = {}
        const subdistricts = {}

        for (const city of allCities) {
            if (!provinces[city.prov_code]) {
                provinces[city.prov_code] = city.province
            }

            cities[city.city_code] = city.city

            for (const district of city.districts) {
                districts[district.code] = district.district
                for (const subdistrict of district.subdistricts) {
                    subdistricts[subdistrict.code] = subdistrict.subdistrict
                }
            }
        }

        locationCache.provinces = provinces
        locationCache.cities = cities
        locationCache.districts = districts
        locationCache.subdistricts = subdistricts
    }

    /**
     * get location information
     */
    fillLocationInfo(params) {
        const location = {}

        if (params.province) {
            location.province = locationCache.provinces[params.province]
        }

        if (params.city) {
            location.city = locationCache.cities[params.city]
        }

        if (params.district) {
            location.district = locationCache.districts[params.district]
        }

        if (params.subdistrict) {
            location.subdistrict = locationCache.subdistricts[params.subdistrict]
        }

        return location
    }

    // 获取省份列表
    async getProvinces() {
        return BaseHelper.getSystemDict('area_province')
    }

    // 获取省份城市列表
    async getCities(provinceCode) {
        const result = await Area.find({ prov_code: provinceCode }, { select: 'city city_code' })
        return result.map(d => {
            return {
                city: d.city,
                code: d.city_code
            }
        })
    }

    // 获取城市区县列表
    async getDistricts(cityCode) {
        const result = await Area.findOne({ city_code: cityCode }, { select: 'districts' })
        return result.districts.map(d => {
            return {
                district: d.district,
                code: d.code
            }
        })
    }

    // 获取区县街道列博鳌
    async getSubDistricts(districtCode) {
        const result = await Area.findOne({ 'districts.code': districtCode }, { select: 'districts' })
        const district = result.districts.find(d => d.code === districtCode)
        return district.subdistricts.map(d => {
            return {
                subdistrict: d.subdistrict,
                code: d.code
            }
        })
    }

    async initLocationData() {
        const dataDir = path.join(__dirname, 'data')
        const recordFiles = fs.readdirSync()
        for (const fileName of recordFiles) {
            const fileExt = path.parse(fileName).ext
            if (fileExt && fileExt == '.json') {
                const recordFile = path.join(dataDir, fileName)
                const record = fileUtils.getJsonFile(recordFile)
                try {
                    await Area.create(record)
                } catch (e) {
                    console.error('create area record failed: ' + recordFile, e)
                }
            }
        }
    }
}

module.exports = new AreaService()
