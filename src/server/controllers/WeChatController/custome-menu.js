const request = require('request')

const config = require('config')

const getAuthUrl = (url, page) => {
    return url + page + '.html'
}

/**
 * 注意：微信公众号自定义菜单仅限于公司账号，并通过微信认证才能使用
 * 常用type为view和click, 分别为点击事件和链接，根据需求自行修改
 */
const menus = {
    button: [
        {
            type: 'view',
            name: '个人信息',
            url: getAuthUrl(config.get('server.serverUrl'), '/public/mobile/profile')
        },
        {
            type: 'view',
            name: '下载',
            url: getAuthUrl(config.get('server.serverUrl'), '/public/mobile/download')
        }
    ]
}

function createMenu(accessToken) {
    const options = {
        url: 'https://api.weixin.qq.com/cgi-bin/menu/create?access_token=' + accessToken,
        form: JSON.stringify(menus),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }

    request.post(options, function(err, res, body) {
        if (err) {
            return logger.error('创建自定义菜单失败：' + err.message)
        } else if (body.errcode) {
            return logger.error('创建自定义菜单失败：' + body.errmsg)
        } else {
            console.log('创建自定义菜单成功：', body)
        }
    })
}

module.exports = createMenu
