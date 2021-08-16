import { Constants, request } from "@hosoft/hos-admin-common"
import { message } from "antd"

const wrapper = {}

/**
 * 获取当前服务端文档版本信息 (文档 / Postman)
 */
wrapper.getApiDocInfo = async () => {
    const rep = await request(`${Constants.API_PREFIX }/api/doc/info`, {
        method: 'GET'
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取文档版本信息失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 生成 Api 接口文档
 */
wrapper.generateApiDoc = async () => {
    const rep = await request(`${Constants.API_PREFIX }/api/doc`, {
        method: 'POST'
    })

    if (rep.code / 1 !== 200) {
        message.error(`生成 Api 接口文档失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

/**
 * 生成 Postman 集合
 */
wrapper.generatePostman = async () => {
    const rep = await request(`${Constants.API_PREFIX }/api/postman`, {
        method: 'POST'
    })

    if (rep.code / 1 !== 200) {
        message.error(`生成 Postman 集合失败:  ${rep.message || '接口异常'}`)
        return null
    }

    return rep.data
}

export default wrapper
