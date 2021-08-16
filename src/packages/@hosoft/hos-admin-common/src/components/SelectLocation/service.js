import Constants from '../../common/constants'
import request from '../../common/request'
import {message} from "antd"

const wrapper = {}

wrapper.getProvinces = () => {
    return [
        {
            province: '北京市',
            code: '11'
        },
        {
            province: '天津市',
            code: '12'
        },
        {
            province: '河北省',
            code: '13'
        },
        {
            province: '山西省',
            code: '14'
        },
        {
            province: '内蒙古自治区',
            code: '15'
        },
        {
            province: '辽宁省',
            code: '21'
        },
        {
            province: '吉林省',
            code: '22'
        },
        {
            province: '黑龙江省',
            code: '23'
        },
        {
            province: '上海市',
            code: '31'
        },
        {
            province: '江苏省',
            code: '32'
        },
        {
            province: '浙江省',
            code: '33'
        },
        {
            province: '安徽省',
            code: '34'
        },
        {
            province: '福建省',
            code: '35'
        },
        {
            province: '江西省',
            code: '36'
        },
        {
            province: '山东省',
            code: '37'
        },
        {
            province: '河南省',
            code: '41'
        },
        {
            province: '湖北省',
            code: '42'
        },
        {
            province: '湖南省',
            code: '43'
        },
        {
            province: '广东省',
            code: '44'
        },
        {
            province: '广西壮族自治区',
            code: '45'
        },
        {
            province: '海南省',
            code: '46'
        },
        {
            province: '重庆市',
            code: '50'
        },
        {
            province: '四川省',
            code: '51'
        },
        {
            province: '贵州省',
            code: '52'
        },
        {
            province: '云南省',
            code: '53'
        },
        {
            province: '西藏自治区',
            code: '54'
        },
        {
            province: '陕西省',
            code: '61'
        },
        {
            province: '甘肃省',
            code: '62'
        },
        {
            province: '青海省',
            code: '63'
        },
        {
            province: '宁夏回族自治区',
            code: '64'
        },
        {
            province: '新疆维吾尔自治区',
            code: '65'
        }
    ]
}

wrapper.getCities = async (provinceCode) => {
    const rep = await request(`${Constants.API_PREFIX}/system/area/${provinceCode}/cities`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取城市列表失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

wrapper.getDistricts = async (cityCode) => {
    const rep = await request(`${Constants.API_PREFIX}/system/area/${cityCode}/districts`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取区县列表失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

export default wrapper
