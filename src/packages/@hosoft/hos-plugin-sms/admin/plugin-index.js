/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/03/09
 **/
import { sendSmsAliyun } from './service'

/**
 * sms plugin
 */
class SMS {
    init(pluginManager) {
        this.pluginManager = pluginManager
    }

    async sendSMS(mobile, impl) {
        if (!impl) {
            impl = this.pluginManager.getDefaultImpl('hos-plugin-sms')
        }

        if (!impl || impl === 'ali-sms') {
            return sendSmsAliyun(mobile)
        }
    }
}

export default new SMS()
