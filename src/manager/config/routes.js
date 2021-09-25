/**
 * admin default routes
 */
export default [
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
                //authority: 'admin',
                routes: [
                    {
                        path: '/',
                        name: 'home',
                        icon: 'home',
                        component: './home',
                        //authority: 'admin'
                    },
                    {
                        path: '/user_admin',
                        name: 'user_admin',
                        icon: 'user',
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
                        path: '/contents',
                        name: 'content',
                        icon: 'profile',
                        authority: 'content:manage',
                        component: './content/post'
                    },
                    // 系统管理
                    {
                        path: '/system',
                        name: 'system',
                        icon: 'setting',
                        authority: 'system:manage',
                        routes: [
                            {
                                path: '/system/dictionary',
                                name: 'dictionary',
                                component: './system/dictionary'
                            },
                            /*
                            {
                                path: '/system/tags',
                                name: 'tag',
                                // authority: 'tag:manage',
                                component: './content/post'
                            },
                            {
                                path: '/system/messages',
                                name: 'message',
                                // authority: 'message:manage',
                                component: './content/post'
                            },
                            */
                            // 接口管理
                            {
                                path: '/system/api',
                                name: 'api',
                                authority: 'api:manage',
                                routes: [
                                    {
                                        path: '/system/api/model',
                                        name: 'model',
                                        component: './system/model'
                                    },
                                    {
                                        path: '/system/api/router',
                                        name: 'router',
                                        component: './system/api'
                                    }
                                ],
                            },
                            {
                                path: '/system/manage',
                                name: 'maintain',
                                authority: 'system:manage',
                                routes: [
                                    {
                                        path: '/system/manage/settings',
                                        name: 'settings',
                                        component: './system/settings'
                                    },
                                    {
                                        path: '/system/manage/announce',
                                        name: 'announce',
                                        component: './system/announce'
                                    },
                                    {
                                        path: '/system/manage/logs',
                                        name: 'logs',
                                        component: './system/logs'
                                    }
                                ]
                            }
                        ],
                    },
                    {
                        path: 'plugin',
                        name: 'plugin',
                        icon: 'appstore',
                        authority: 'plugin:manage',
                        routes: [
                            {
                                path: '/plugin/installed',
                                name: 'installed',
                                component: './system/plugins'
                            },
                            {
                                path: 'http://hos.helloreact.cn/plugins',
                                name: 'browse',
                                target: '_blank'
                            }
                        ]
                    },
                    {
                        path: '/profile',
                        name: 'profile',
                        icon: 'user',
                        authority: 'admin',
                        hideInMenu: true,
                        component: './user/settings'
                    },
                    {
                        component: '404',
                    }
                ],
            },
        ],
    },
]
