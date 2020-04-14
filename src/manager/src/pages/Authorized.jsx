import { connect } from 'dva'
import React from 'react'
import Redirect from 'umi/redirect'

import Authorized from '@/utils/Authorized'
import { getRouteAuthority } from '@/utils/utils'

const AuthComponent = ({
    children,
    route = {
        routes: [],
    },
    location = {
        pathname: '',
    },
    user,
}) => {
    const { currentUser } = user
    const { routes = [] } = route
    const isLogin = currentUser && currentUser.nick_name

    return (
        <Authorized
            authority={getRouteAuthority(location.pathname, routes) || ''}
            noMatch={isLogin ? <Redirect to="/exception/403" /> : <Redirect to="/user/login" />}
        >
            {children}
        </Authorized>
    )
}

export default connect(({ user }) => ({
    user,
}))(AuthComponent)
