import { GlobalOutlined } from '@ant-design/icons'
import { Menu } from 'antd'
import classNames from 'classnames'
import React from 'react'
import { getLocale, setLocale } from 'umi-plugin-react/locale'

import HeaderDropdown from '../HeaderDropdown'
import styles from './index.less'

const SelectLang = props => {
    const { className } = props
    const selectedLang = getLocale()

    const changeLang = ({ key }) => setLocale(key)

    const locales = ['zh-CN', 'zh-TW', 'en-US']
    const languageLabels = {
        'zh-CN': '简体中文',
        'zh-TW': '繁體中文',
        'en-US': 'English',
    }
    const languageIcons = {
        'zh-CN': '🇨🇳',
        'zh-TW': '🇭🇰',
        'en-US': '🇺🇸'
    }
    const langMenu = (
        <Menu className={styles.menu} selectedKeys={[selectedLang]} onClick={changeLang}>
            {locales.map(locale => (
                <Menu.Item key={locale}>
                    <span role="img" aria-label={languageLabels[locale]}>
                        {languageIcons[locale]}
                    </span>{' '}
                    {languageLabels[locale]}
                </Menu.Item>
            ))}
        </Menu>
    )
    return (
        <HeaderDropdown overlay={langMenu} placement="bottomRight">
            <span className={classNames(styles.dropDown, className)}>
                <GlobalOutlined title="语言" />
            </span>
        </HeaderDropdown>
    )
}

export default SelectLang
