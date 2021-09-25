/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/03/09
 **/
import AliOSSUpload from '../impl/ali-oss/admin'

/**
 * cloud storage plugin
 */
class CloudStorage {
    init(pluginManager) {
        this.pluginManager = pluginManager
    }

    getUploadComponent(impl) {
        if (!this.pluginManager) {
            return null;
        }

        if (!impl) {
            impl = this.pluginManager.getDefaultImpl('hos-plugin-cloud-storage')
        }

        if (!impl || impl === 'ali-oss') {
            return AliOSSUpload
        }

        return null;
    }
}

export default new CloudStorage()
