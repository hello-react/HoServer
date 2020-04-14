import { PageLoading } from '@ant-design/pro-layout'
import { connect } from 'dva'
import { stringify } from 'querystring'
import React from 'react'
import { Redirect } from 'umi'

class SecurityLayout extends React.Component {
    state = {
        isReady: false,
    }

    componentDidMount() {
        this.setState({
            isReady: true,
        })
        const { dispatch } = this.props

        if (dispatch) {
            dispatch({
                type: 'user/fetchCurrent',
            })
        }
    }

    render() {
        const { isReady } = this.state
        const { children, loading, currentUser } = this.props
        // 你可以把它替换成你自己的登录认证规则（比如判断 token 是否存在）

        const isLogin = currentUser && currentUser.user_id
        const queryString = stringify({
            redirect: window.location.href,
        })

        if ((!isLogin && loading) || !isReady) {
            return <PageLoading />
        }

        if (!isLogin) {
            return <Redirect to={`/user/login?${queryString}`}></Redirect>
        }

        return children
    }
}

export default connect(({ user, loading }) => ({
    currentUser: user.currentUser,
    loading: loading.models.user,
}))(SecurityLayout)
