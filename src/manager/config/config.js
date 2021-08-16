import defaultSettings from './defaultSettings' // https://umijs.org/config/
import {Icon} from "@ant-design/compatible"
import {webpackPlugin} from './plugin.config'

import slash from 'slash2'
import themePluginConfig from './themePluginConfig'
import routes from './routes'
import path from 'path'

const { pwa } = defaultSettings

const plugins = [
    [
        'umi-plugin-react',
        {
            antd: true,
            dva: {
                hmr: true,
            },
            locale: {
                enable: true,
                default: 'zh-CN',
                // default true, when it is true, will use `navigator.language` overwrite default
                baseNavigator: true,
            },
            dynamicImport: {
                loadingComponent: './components/PageLoading/index',
                webpackChunkName: true,
                level: 3,
            },
            pwa: pwa
                ? {
                      workboxPluginMode: 'InjectManifest',
                      workboxOptions: {
                          importWorkboxFrom: 'local',
                      },
                  }
                : false, // default close dll, because issue https://github.com/ant-design/ant-design-pro/issues/4665
            // dll features c
            // dll: {
            //   include: ['dva', 'dva/router', 'dva/saga', 'dva/fetch'],
            //   exclude: ['@babel/runtime', 'netlify-lambda'],
            // },
        }
    ],
    path.resolve(__dirname, 'hos-plugin-gen.js')
    //['umi-plugin-antd-theme', themePluginConfig]
]

export default {
    plugins,
    hash: true,
    targets: {
        ie: 11,
    },
    // umi routes: https://umijs.org/zh/guide/router.html
    routes: routes,
    // Theme for antd: https://ant.design/docs/react/customize-theme-cn
    theme: {
        // ...darkTheme,
    },
    define: {
    },
    ignoreMomentLocale: true,
    lessLoaderOptions: {
        javascriptEnabled: true,
    },
    disableRedirectHoist: true,
    cssLoaderOptions: {
        modules: true,
        getLocalIdent: (context, _, localName) => {
            if (
                context.resourcePath.includes('node_modules') ||
                context.resourcePath.includes('ant.design.pro.less') ||
                context.resourcePath.includes('global.less')
            ) {
                return localName
            }

            const match = context.resourcePath.match(/src(.*)/)

            if (match && match[1]) {
                const antdProPath = match[1].replace('.less', '')
                const arr = slash(antdProPath)
                    .split('/')
                    .map(a => a.replace(/([A-Z])/g, '-$1'))
                    .map(a => a.toLowerCase())
                return `antd-pro${arr.join('-')}-${localName}`.replace(/--/g, '-')
            }

            return localName
        },
    },
    manifest: {
        basePath: '/',
    },
    chainWebpack: webpackPlugin,
    proxy: {
        '/api/v1/': {
            target: defaultSettings.apiServerUrl,
            changeOrigin: true,
            // pathRewrite: { '^/server': '' },
        },
    },
}
