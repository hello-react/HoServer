/* eslint-disable no-useless-escape,no-undef,no-bitwise */
import {Tooltip} from 'antd'
import moment from 'moment'
import pathRegexp from 'path-to-regexp'
import {parse} from 'querystring'
import React from "react"

const reg = /(((^https?:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+(?::\d+)?|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)$/
export const isUrl = path => reg.test(path)

export const getPageQuery = () => parse(window.location.href.split('?')[1])

/**
 * props.route.routes
 * @param router [{}]
 * @param pathname string
 */
export const getAuthorityFromRouter = (router = [], pathname) => {
    const authority = router.find(({ path }) => path && pathRegexp(path).exec(pathname))
    if (authority) return authority
    return undefined
}

export const getRouteAuthority = (path, routeData) => {
    let authorities
    routeData.forEach(route => {
        // match prefix
        if (pathRegexp(`${route.path}/(.*)`).test(`${path}/`)) {
            if (route.authority) {
                authorities = route.authority
            } // exact match

            if (route.path === path) {
                authorities = route.authority || authorities
            } // get children authority recursively

            if (route.routes) {
                authorities = getRouteAuthority(path, route.routes) || authorities
            }
        }
    })

    return authorities
}

export const setDefaultColumn = columns => {
    for (let i=0; i<columns.length; i++) {
        const col = columns[i]

        if (!col.valueType) col.valueType = 'text'
        if (col.filters) {
            col.valueType = 'option'
            if (!col.align) col.align = 'center'
            if (!col.render) {
                col.render = text => {
                    // eslint-disable-next-line eqeqeq
                    const item = col.filters.find(f => f.value == text)
                    return item ? item.text : text
                }
            }
        }

        if (col.valueType === 'boolean') {
            if (!col.width) col.width = 50
            if (!col.align) col.align = 'center'
            if (col.filters === null) {
                col.filters = [
                    {text: '是', value: true},
                    {text: '否', value: false}
                ]
            }
            col.render = text => {
                return String(text) === 'true' ? '是' : '否'
            }
        } else if (col.valueType === 'number') {
            if (!col.width) col.width = 50
            if (!col.align) col.align = 'center'
        } else if (col.valueType === 'dateTime') {
            col.render = text => {
                return moment(text).format('YYYY/MM/DD HH:mm:ss')
            }
        }

        if (col.dataIndex === 'description') {
            if (!col.width) col.width = 150

            col.ellipsis = false
            col.render = text => {
                if (!text) return null
                return text.length > 45
                    ? <Tooltip placement="topLeft" title={text}>{text.substr(0, 50)}...</Tooltip>
                    : <span>{text}</span>
            }
        }

        if (col.width === undefined) col.width = 100
        if (col.dataIndex === 'name' || col.dataIndex === 'dis_name') col.ellipsis = false
        if (col.ellipsis === undefined) col.ellipsis = true
        if (col.sorter === undefined) col.sorter = false
        if (col.searchFlag === undefined) col.searchFlag = 0
    }

    return columns
}

export const formatLocation = location => {
    if (!location) {
        return ''
    }

    return `${location.province} ${location.city} ${location.district}`
}

export const getBase64 = file => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
    })
}

export const getExtType = (file, reserveDot = false) => {
    const xp = file.lastIndexOf('.')
    return reserveDot ? file.substring(xp, file.length).toLowerCase() : file.substring(xp + 1, file.length).toLowerCase()
}

export const copyToClipboard = text => {
    if (window.clipboardData && window.clipboardData.setData) {
        // Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
        return clipboardData.setData("Text", text);

    }

    if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        const textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in Microsoft Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand("copy");  // Security exception may be thrown by some browsers.
        }
        catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
            return false;
        }
        finally {
            document.body.removeChild(textarea);
        }
    }
}

export const ossProcessImg = (uri, w, h, circle = false) => {
    if (!uri) return ''
    if (uri.indexOf('http') !== 0) return uri

    if (uri.indexOf('?') > 0) {
        return `${uri}&x-oss-process=image/resize,m_fill,h_${h}/format,png${circle ? `/circle,r_${v}` : ''}`
    }

    let size = ''
    let limit = 1
    if (w) {
        size += `,w_${w}`
    }
    if (h) {
        size += `,h_${h}`
        limit = size ? 0 : 1
    }

    if (!size) {
        return uri
    }

    return `${uri}?x-oss-process=image/resize,m_fill${size},limit_${limit}/format,png${circle ? `/circle,r_${w || h}` : ''}`
}
