import React, { Component } from 'react'

const API_SERVER_URL = 'http://localhost:3001'
const IMAGE_URL = API_SERVER_URL + '/public/branding/'

const PRODUCT_NAME = 'HoServer'
const THEME_COLOR = 'dark'
// demo replace(localhost:3000|monitor.helloreact.cn)
const MONITOR_URL = 'http://localhost:3000/'

export default {
    navTheme: THEME_COLOR,
    // 拂晓蓝
    primaryColor: 'cyan',
    layout: 'sidemenu',
    contentWidth: 'Fluid',
    fixedHeader: false,
    autoHideHeader: false,
    fixSiderbar: false,
    colorWeak: false,
    menu: {
        locale: true,
    },
    title: PRODUCT_NAME,
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
    monitorUrl: MONITOR_URL
}
