/**
 * Ant Design Pro v4 use `@ant-design/pro-layout` to handle Layout.
 * You can view component api by:
 * https://github.com/ant-design/ant-design-pro-layout
 */
import { GithubOutlined } from '@ant-design/icons'
import ProLayout, { DefaultFooter, SettingDrawer } from '@ant-design/pro-layout'
import { Common } from '@hosoft/hos-admin-common'
import { Button,Result } from 'antd'
import { connect } from 'dva'
import React, { useEffect } from 'react'
import { formatMessage } from 'umi-plugin-react/locale'
import Link from 'umi/link'

import RightContent from '@/components/GlobalHeader/RightContent'
import Authorized from '@/utils/Authorized'

import defaultSettings from "../../config/defaultSettings"

const noMatch = (
    <Result
        status="403"
        title="403"
        subTitle="抱歉，无权限访问此页面"
        extra={
            <Button type="primary">
                <Link to="/user/login">重新登录</Link>
            </Button>
        }
    />
)

/**
 * use Authorized check all menu item
 */
const menuDataRender = menuList => {
    return menuList.map(item => {
        const localItem = { ...item, children: item.children ? menuDataRender(item.children) : [] }
        return Authorized.check(item.authority, localItem, null)
    })
}

const getMenuTreeData = (parent, menuList) => {
    return menuList.map(item => {
        if (!item.name) return null
        const name = parent && parent.value ? `${parent.value}.${item.name}` : item.name || ''
        const localItem = { title: formatMessage({ id: `menu.${name}` }), value: name }
        if (item.routes) {
            localItem.children = getMenuTreeData(localItem, item.routes).filter(r => r !== null)
        }

        return Authorized.check(item.authority, localItem, null)
    })
}

const defaultFooterDom = (
    <DefaultFooter
        copyright="2019 乐橙"
        links={[
            {
                key: '快速[RESTful Api + 管理平台]开发脚手架',
                title: 'HOSERVER 官网',
                href: 'http://hos.helloreact.cn',
                blankTarget: true,
            },
            {
                key: '开箱即用跨平台 App 开发脚手架',
                title: 'HOMOBILE',
                href: 'http://hab.helloreact.cn',
                blankTarget: true,
            },
            // {
            //     key: 'Hello React 官网',
            //     title: 'HELLO REACT',
            //     href: 'http://helloreact.cn',
            //     blankTarget: true,
            // },
            {
                key: 'github',
                title: <span><GithubOutlined /> GITHUB</span>,
                href: 'https://github.com/helloreact/HoServer',
                blankTarget: true,
            }
        ]}
    />
)

const footerRender = () => {
    return defaultFooterDom
}

const BasicLayout = props => {
    const {
        dispatch,
        children,
        settings,
        location = {
            pathname: '/',
        },
    } = props

    useEffect(() => {
        dispatch({
            type: 'user/fetchCurrent',
        })

        const { routes } = props.route
        const menuData = getMenuTreeData(null, routes).filter(r => r !== null)
        dispatch({
            type: 'global/saveMenuData',
            payload: menuData
        })
    }, [])

    const handleMenuCollapse = payload => {
        if (dispatch) {
            dispatch({
                type: 'global/changeLayoutCollapsed',
                payload,
            })
        }
    } // get children authority

    const authorized = Common.getAuthorityFromRouter(props.route.routes, location.pathname || '/') || {
        authority: undefined,
    }

    return (
        <>
            <ProLayout
                logo={defaultSettings.logoUrl}
                formatMessage={formatMessage}
                menuHeaderRender={(logoDom, titleDom) => (
                    <Link to="/" style={{marginTop: '10px'}}>
                        {logoDom}
                        {titleDom}
                    </Link>
                )}
                onCollapse={handleMenuCollapse}
                menuItemRender={(menuItemProps, defaultDom) => {
                    if (menuItemProps.isUrl || menuItemProps.children || !menuItemProps.path) {
                        return defaultDom
                    }

                    return <Link to={menuItemProps.path}>{defaultDom}</Link>
                }}
                breadcrumbRender={(routers = []) => {
                    if (!Array.isArray(routers)) {
                        return null
                    }

                    return [
                        {
                            path: '/',
                            breadcrumbName: '首页',
                        },
                        ...routers
                    ]
                }}
                itemRender={(route, params, routes, paths) => {
                    const first = routes.indexOf(route) === 0
                    return first ? <Link to={paths.join('/')}>{route.breadcrumbName}</Link> : <span>{route.breadcrumbName}</span>
                }}
                footerRender={footerRender}
                menuDataRender={menuList => {
                    // menuList[1].children.splice(0, 0, {
                    //     exact: true,
                    //     name: "测试菜单",
                    //     parentKeys: ["/", "/func"],
                    //     path: "/model/User",
                    //     routes: null
                    // })

                    const menu = menuDataRender(menuList)
                    return menu
                }}
                rightContentRender={() => <RightContent />}
                {...props}
                {...settings}
            >
                <Authorized authority={authorized.authority} noMatch={noMatch}>
                    {children}
                </Authorized>
            </ProLayout>
            {process.env.NODE_ENV !== 'production' ? (
                <SettingDrawer
                    settings={settings}
                    onSettingChange={config =>
                        dispatch({
                            type: 'settings/changeSetting',
                            payload: config,
                        })
                    }
                />
            ) : null}
        </>
    )
}

export default connect(({ global, settings }) => ({
    collapsed: global.collapsed,
    settings,
}))(BasicLayout)
