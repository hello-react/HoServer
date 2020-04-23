import { PageHeaderWrapper } from '@ant-design/pro-layout'
import { Input } from 'antd'
import { connect } from 'dva'
import React, { Component } from 'react'

import Post from './post'

class Search extends Component {
    handleFormSubmit = value => {
        this.postRef && this.postRef.searchContent(value)
    }

    render() {
        const mainSearch = (
            <div style={{textAlign: 'center',}}>
                <Input.Search
                    placeholder="请输入"
                    enterButton="搜索"
                    size="large"
                    onSearch={(value) => this.handleFormSubmit(value)}
                    style={{
                        maxWidth: 522,
                        width: '100%',
                    }}
                />
            </div>
        )

        return (
            <PageHeaderWrapper content={mainSearch}>
                <Post ref={ref => this.postRef = ref}/>
            </PageHeaderWrapper>
        )
    }
}

export default connect()(Search)
