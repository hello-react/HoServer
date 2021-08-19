import {Constants, request} from '@hosoft/hos-admin-common'
import {message} from 'antd'

/**
 * 获取验证码短信
 * @param mobile
 */
export async function sendSmsAliyun(mobile) {
    const rep = await request(`${Constants.API_PREFIX}/system/sms/aliyun`, {
        method: 'GET',
        params: { check_exists: true, mobile }
    })

    if (rep.code / 1 !== 200) {
        message.error(`获取验证码失败:  ${rep.message || '接口异常'}`)
    } else {
        return rep.data
    }
}
