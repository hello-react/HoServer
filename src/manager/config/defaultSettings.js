// import proImg from '@/assets/pro.svg'

const IS_HOS_PRO = false
const API_SERVER_URL = 'http://localhost:3001'
const IMAGE_URL = 'https://gitee.com/hello-react/HoServer/raw/master/src/server/public/branding/'
// const IMAGE_URL = API_SERVER_URL + '/public/branding/'

const PRODUCT_NAME = 'HoServer'
const THEME_COLOR = 'dark'
// demo replace(localhost:3000|monitor.helloreact.cn)
const MONITOR_URL = 'http://localhost:3000/'

export default {
    navTheme: THEME_COLOR,
    // 拂晓蓝
    primaryColor: 'daybreak',
    layout: 'sidemenu',
    contentWidth: 'Fluid',
    fixedHeader: false,
    autoHideHeader: false,
    fixSiderbar: false,
    colorWeak: false,
    menu: {
        locale: true,
    },
    title:'HoServer',
    pwa: false,

    // 产品名称，主要用于登录等页面显示
    productName: PRODUCT_NAME,
    // 相关Logo图片资源地址
    imageUrl: IMAGE_URL,
    logoUrl: `${IMAGE_URL}/logo_${THEME_COLOR}.svg`,
    logoLightUrl: `${IMAGE_URL}/logo_light.svg`,

    // 后台 Api 服务地址
    apiServerUrl: API_SERVER_URL,
    // 监控系统地址
    monitorUrl: MONITOR_URL,
    // 是否使用阿里云存储上传（网页客户端直传）// demo replace(false|true)
    enableOssUpload: true
}
