import { GithubOutlined } from '@ant-design/icons'
import { DefaultFooter, getMenuData, getPageTitle } from '@ant-design/pro-layout'
import { connect } from 'dva'
import React from 'react'
import { Helmet } from 'react-helmet'
import { formatMessage } from 'umi-plugin-react/locale'
import Link from 'umi/link'

import SelectLang from '@/components/SelectLang'

import defaultSettings from "../../config/defaultSettings";
import styles from './UserLayout.less'

const UserLayout = props => {
    const {
        route = {
            routes: [],
        },
    } = props
    const { routes = [] } = route
    const {
        children,
        location = {
            pathname: '',
        },
    } = props

    const { breadcrumb } = getMenuData(routes)
    const title = getPageTitle({
        pathname: location.pathname,
        formatMessage,
        breadcrumb,
        ...props,
    })

    return (
        <>
            <Helmet>
                <title>{title}</title>
                <meta name="description" content={title} />
            </Helmet>

            <div className={styles.container}>
                <div className={styles.lang}>
                    <SelectLang />
                </div>
                <div className={styles.content}>
                    <div className={styles.top}>
                        <div className={styles.header}>
                            <Link to="/">
                                <img alt="logo" className={styles.logo} src={defaultSettings.logoLightUrl} />
                                <span className={styles.title}>
                                    {defaultSettings.productName}
                                    <img alt="" src={`${defaultSettings.imageUrl}/std_light.svg`} style={{width: '48px', marginLeft: '10px', marginBottom: '5px'}} />
                                </span>
                            </Link>
                        </div>
                        <div className={styles.desc}>极速开发高质量 RESTful Api 后台服务和管理平台</div>
                    </div>
                    {children}
                </div>
                <DefaultFooter
                    copyright="2019 乐橙"
                    links={[
                        {
                            key: '快速[RESTful Api + 管理平台]开发脚手架',
                            title: 'HO SERVER 官网',
                            href: 'http://hos.helloreact.cn',
                            blankTarget: true,
                        },
                        {
                            key: '开箱即用跨平台 App 开发脚手架',
                            title: 'HO APP BASE',
                            href: 'http://hab.helloreact.cn',
                            blankTarget: true,
                        },
                        // {
                        //     key: 'Hello React 官网',
                        //     title: 'HELLO REACT',
                        //     href: 'https://helloreact.cn',
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
            </div>
        </>
    )
}

export default connect(({ settings }) => ({ ...settings }))(UserLayout)
