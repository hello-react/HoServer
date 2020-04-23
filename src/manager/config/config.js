import defaultSettings from './defaultSettings' // https://umijs.org/config/
import {Icon} from "@ant-design/compatible"

import slash from 'slash2'
import themePluginConfig from './themePluginConfig'

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
                // default false
                enable: true,
                // default zh-CN
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
            // dll features https://webpack.js.org/plugins/dll-plugin/
            // dll: {
            //   include: ['dva', 'dva/router', 'dva/saga', 'dva/fetch'],
            //   exclude: ['@babel/runtime', 'netlify-lambda'],
            // },
        },
    ],
    // [
    //     'umi-plugin-pro-block',
    //     {
    //         moveMock: false,
    //         moveService: false,
    //         modifyRequest: true,
    //         autoAddMenu: true,
    //     },
    // ],
]

// if (isAntDesignProPreview) {
//     plugins.push([
//         'umi-plugin-ga',
//         {
//             code: 'UA-72788897-6',
//         },
//     ])
//     plugins.push(['umi-plugin-antd-theme', themePluginConfig])
// }

export default {
    plugins,
    hash: true,
    targets: {
        ie: 11,
    },
    // umi routes: https://umijs.org/zh/guide/router.html
    routes: [
        {
            path: '/',
            component: '../layouts/BlankLayout',
            routes: [
                {
                    path: '/user',
                    component: '../layouts/UserLayout',
                    routes: [
                        {
                            path: '/user',
                            redirect: '/user/login',
                        },
                        {
                            name: 'login',
                            icon: 'smile',
                            path: '/user/login',
                            component: './user/login',
                        },
                        {
                            component: '404',
                        },
                    ],
                },
                {
                    path: '/',
                    component: '../layouts/BasicLayout',
                    Routes: ['src/pages/Authorized'],
                    authority: 'admin',
                    routes: [
                        {
                            path: '/',
                            name: 'home',
                            icon: 'home',
                            component: './home',
                            authority: 'admin'
                        },
                        // 接口管理
                        {
                            path: '/apimanage',
                            name: 'apimanage',
                            icon: 'api',
                            authority: 'api:manage',
                            routes: [
                                {
                                    path: '/apimanage/dictionary',
                                    name: 'dictionary',
                                    component: './interface/dictionary'
                                },
                                {
                                    path: '/apimanage/model',
                                    name: 'model',
                                    component: './interface/model'
                                },
                                {
                                    path: '/apimanage/service',
                                    name: 'service',
                                    component: './interface/service',
                                },
                                {
                                    path: '/apimanage/router',
                                    name: 'router',
                                    component: './interface/api'
                                },
                                {
                                    path: '/apimanage/apidoc',
                                    name: 'apidoc',
                                    component: 'Pro'
                                },
                                {
                                    path: '/apimanage/sdk',
                                    name: 'sdk',
                                    component: 'Pro'
                                },
                            ],
                        },
                        {
                            path: '/content',
                            name: 'content',
                            icon: 'profile',
                            authority: 'content:manage',
                            routes: [
                                {
                                    path: '/content/post',
                                    name: 'post',
                                    component: './content/post'
                                }
                            ],
                        },
                        {
                            path: '/payment',
                            name: 'payment',
                            icon: 'pay-circle',
                            authority: 'payment:manage',
                            routes: [
                                {
                                    path: '/payment/payment',
                                    name: 'payment',
                                    component: 'Pro',
                                }
                            ],
                        },
                        {
                            path: '/system',
                            name: 'system',
                            icon: 'setting',
                            authority: 'system:manage',
                            routes: [
                                {
                                    path: '/system/announce',
                                    name: 'announce',
                                    component: './system/announce'
                                },
                                {
                                    path: '/system/logs',
                                    name: 'logs',
                                    component: './system/logs'
                                },
                                {
                                    path: '/system/monitor',
                                    name: 'monitor',
                                    component: 'Pro'
                                },
                                {
                                    path: '/system/settings',
                                    name: 'settings',
                                    component: './system/settings'
                                }
                            ],
                        },
                        // 用户管理
                        {
                            path: '/user_admin',
                            name: 'user_admin',
                            icon: 'team',
                            authority: 'user:manage',
                            routes: [
                                {
                                    path: '/user_admin/users',
                                    name: 'users',
                                    component: './user_admin/user'
                                },
                                {
                                    path: '/user_admin/permissions',
                                    name: 'permissions',
                                    component: './user_admin/permission'
                                },
                                {
                                    path: '/user_admin/roles',
                                    name: 'roles',
                                    component: './user_admin/role'
                                }
                            ],
                        },
                        {
                            path: '/profile',
                            name: 'profile',
                            icon: 'user',
                            authority: 'admin',
                            component: './user/settings'
                        },
                        {
                            component: '404',
                        }
                    ],
                },
            ],
        },
    ],
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
    }, // chainWebpack: webpackPlugin,
    proxy: {
        '/api/v1/': {
            target: defaultSettings.apiServerUrl,
            changeOrigin: true,
            // pathRewrite: { '^/server': '' },
        },
    },
}
