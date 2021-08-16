import { reloadAuthorized } from './Authorized'

export function getAuthority(str) {
    // authorityString could be admin, "admin", ["admin"]
    const authorityString = typeof str === 'undefined' && localStorage ? localStorage.getItem('antd-pro-authority') : str

    let authority

    try {
        if (authorityString) {
            authority = JSON.parse(authorityString)
        }
    } catch (e) {
        authority = authorityString
    }

    if (typeof authority === 'string') {
        return [authority]
    }

    console.log('getAuthority result: ', authority)
    return authority
}

export function setAuthority(authority) {
    const proAuthority = typeof authority === 'string' ? [authority] : authority
    localStorage.setItem('antd-pro-authority', JSON.stringify(proAuthority)) // auto reload

    console.log('setAuthority: ', authority)
    reloadAuthorized()
}

export function getAutoLogin() {
    const infoJson = localStorage ? localStorage.getItem('antd-pro-auto-login') : ''
    if (!infoJson) {
        return false
    }

    let autoLoginInfo
    try {
        autoLoginInfo = JSON.parse(infoJson)
        return !!autoLoginInfo.autoLogin
    } catch (e) {
        return false
    }
}

export function setAutologinInfo(autoLoginInfo) {
    global.token = autoLoginInfo ? autoLoginInfo.token : ''
    localStorage.setItem('antd-pro-auto-login', autoLoginInfo ? JSON.stringify(autoLoginInfo) : '')
}
