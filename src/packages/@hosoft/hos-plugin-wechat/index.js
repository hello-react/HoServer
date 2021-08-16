/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/03/09
 **/

const express = require('express')
const expressRouter = express.Router()
const config = require('@hosoft/config')
const wxSign = require('./service/wx-sign')
const wxUtils = require('./wx-utils')
const { Constants } = require('@hosoft/restful-api-framework/base')

const wxAppId = config.get('plugins.wechat.appId')
const wxAppSecret = config.get('plugins.wechat.appSecret')

// 创建公众号菜单
if (config.get('plugins.wechat.menu')) {
    wxUtils.getAccessToken(wxAppId, wxAppSecret).then(res => {
        require('./service/custome-menu')(res.access_token)
    })
}

/**
 * 主要用于微信公众号鉴权、获取扫码用户开放信息
 */
class WeChatPlugin {
    init(container, router, app) {
        // 微信鉴权
        expressRouter.get('/wx_callback', wxSign)
        expressRouter.post('/wx_callback', (req, res) => {
            // 设置返回数据header
            res.writeHead(200, { 'Content-Type': 'application/xml' })
            console.log('收到微信请求, req.body: ', req.body, 'req.query: ', req.query)

            if (req.body.xml) {
                // 收到用户订阅后的自动回复
                if (req.body.xml.event === 'subscribe') {
                    const resMsg = this._autoReply('text', req.body.xml, '欢迎关注 HoServer, 访问 http://helloreact.cn 获取更多信息')
                    res.end(resMsg)
                } else {
                    const userContent = encodeURI(req.body.xml.content)
                    const resMsg = this._processUserMsg(userContent, req.body.xml)
                    res.end(resMsg)
                }
            } else {
                wxSign(req, res)
            }
        })

        app.use(Constants.API_PREFIX + '/wx', expressRouter)
    }

    /**
     * 根据用户发送的不同内容，进行不同的回复
     */
    _processUserMsg(content, requestData) {
        let resMsg = ''
        switch (content) {
            case '1':
                resMsg = this._autoReply('news', requestData, {
                    title: '欢迎关注',
                    description: '测试描述',
                    picurl: '图片链接',
                    url: 'https://www.baidu.com'
                })
                break
            default:
                break
        }

        return resMsg
    }

    // prettier-ignore
    _autoReply(msgType, requestData, info) {
        let resMsg = ''

        switch (msgType) {
            case 'text':
                resMsg =
                    '<xml>' +
                    '<ToUserName><![CDATA[' + requestData.fromusername + ']]></ToUserName>' +
                    '<FromUserName><![CDATA[' + requestData.tousername + ']]></FromUserName>' +
                    '<CreateTime>' + parseInt(new Date().valueOf() / 1000) + '</CreateTime>' +
                    '<MsgType><![CDATA[text]]></MsgType>' +
                    '<Content><![CDATA[' + info + ']]></Content>' +
                    '</xml>'
                break
            case 'news':
                resMsg =
                    '<xml>' +
                    '  <ToUserName><![CDATA[' + requestData.fromusername + ']]></ToUserName>' +
                    '  <FromUserName><![CDATA[' + requestData.tousername + ']]></FromUserName>' +
                    '  <CreateTime>' + parseInt(new Date().valueOf() / 1000) + '</CreateTime>' +
                    '  <MsgType><![CDATA[news]]></MsgType>' +
                    '  <ArticleCount>1</ArticleCount>' +
                    '  <Articles>' +
                    '    <item>' +
                    '      <Title><![CDATA[' + info.title + ']]></Title>' +
                    '      <Description><![CDATA[' + info.description + ']]></Description>' +
                    '      <PicUrl><![CDATA[' + info.picurl + ']]></PicUrl>' +
                    '      <Url><![CDATA[' + info.url + ']]></Url>' +
                    '    </item>' +
                    '  </Articles>' +
                    '</xml>'
                break
            default:
                break
        }

        return resMsg
    }
}

module.exports = new WeChatPlugin()
