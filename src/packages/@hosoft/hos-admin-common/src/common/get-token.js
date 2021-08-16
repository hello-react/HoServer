export default function getToken() {
    if (global.token) {
        return global.token
    }

    const infoJson = localStorage ? localStorage.getItem('antd-pro-auto-login') : ''
    if (!infoJson) {
        return ''
    }

    let autoLoginInfo
    try {
        autoLoginInfo = JSON.parse(infoJson)
        global.token = autoLoginInfo.token
    } catch (e) {
        return ''
    }

    return global.token
}
