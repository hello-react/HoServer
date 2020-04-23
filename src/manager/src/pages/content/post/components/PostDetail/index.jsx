/* eslint-disable react/no-access-state-in-setstate,no-underscore-dangle */
import '@ant-design/compatible/assets/index.css'

import {PaperClipOutlined} from "@ant-design/icons"
import { Card } from 'antd'
import _ from  'lodash'
import moment from 'moment'
import React, { useEffect, useState } from 'react'

import ContentService from "@/pages/content/post/service";

const PostDetail = props => {
    const {categories, contentInfo} = props
    const [content, setContent] = useState(contentInfo)

    useEffect(() => {
        loadData()
    }, [contentInfo])

    const loadData = async () => {
        if (contentInfo.id) {
            const currentDetail = (await ContentService.getContentDetail(contentInfo.id)) || {}
            setContent(currentDetail)
        }
    }

    const category = categories.find(c => c.key === content.category)
    return (
        <Card bordered={false} bodyStyle={{paddingTop: 0}}>
            <div style={{fontSize: '28px'}}>
                {content.title}
                {content.sub_title ? (
                    <span style={{marginLeft: '10px', fontSize: '14px', color: '#aaa'}}>{content.sub_title}</span>
                ) : null}
            </div>
            <div style={{color: '#aaa'}}>
                <div style={{marginTop: '20px'}}>
                    <span>{_.get(content, ['author_rel', 'nick_name'])}</span> <span>{moment(content.publish_date).format('YYYY-MM-DD HH:mm')}</span>
                </div>
                <div>
                    <span>分类: {_.get(category, 'value') || '未知'}</span>
                </div>
                {content.link ? (
                    <div>
                        <span>来源: <a href={content.link} target="_blank" rel="noopener noreferrer">{content.link}</a></span>
                    </div>
                ) : null}
            </div>
            <div style={{marginTop: '10px'}}>
                {content.cover ? (
                    <img src={content.cover} style={{maxWidth: '800px'}} alt="" />
                ) : null}
            </div>
            <div style={{fontSize: '16px', marginTop: '20px'}} dangerouslySetInnerHTML={{__html: (content.content || '').replace(/\n/g, '<br />')}} />
            {content.files && content.files.length > 0 ? content.files.map(f => f.type.indexOf('image') > -1 ? (
                <div style={{marginTop: '20px'}}><img src={f.url} style={{maxWidth: '800px'}} alt="" /></div>
            ) : (
                <div style={{marginTop: '10px'}}><PaperClipOutlined /> <a href={f.url} target="_blank" rel="noopener noreferrer">f.url</a></div>
            )) : null}
        </Card>
    )
}
export default PostDetail
