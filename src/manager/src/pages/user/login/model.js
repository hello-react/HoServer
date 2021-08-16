import { Common } from '@hosoft/hos-admin-common'
import { routerRedux } from 'dva/router'

// TODO：sms plugin
// import { sendSMS } from '@/services/system'
import { userLogin } from '@/services/user'
import { setAuthority,setAutologinInfo } from '@/utils/authority'

const Model = {
    namespace: 'userAndlogin',
    state: {
        status: undefined,
    },
    effects: {
        *login({ payload }, { call, put }) {
            const response = yield call(userLogin, payload)
            yield put({
                type: 'changeLoginStatus',
                payload: { type: payload.type, autoLogin: payload.autoLogin, ...response },
            }) // Login successfully

            if (response.status === 'ok') {
                const urlParams = new URL(window.location.href)
                const params = Common.getPageQuery()
                let { redirect } = params

                if (redirect) {
                    const redirectUrlParams = new URL(redirect)

                    if (redirectUrlParams.origin === urlParams.origin) {
                        redirect = redirect.substr(urlParams.origin.length)

                        if (redirect.match(/^\/.*#/)) {
                            redirect = redirect.substr(redirect.indexOf('#') + 1)
                        }
                    } else {
                        window.location.href = redirect
                        return
                    }
                }

                yield put(routerRedux.replace(redirect || '/'))
            }
        },

        *getCaptcha({ payload }, { call }) {
            yield call(sendSMS, payload)
        },
    },
    reducers: {
        changeLoginStatus(state, { payload }) {
            setAuthority(payload.currentAuthority)
            setAutologinInfo({token: payload.token, autoLogin: payload.autoLogin})

            return { ...state, status: payload.status, token: payload.token, type: payload.type }
        },
    },
}

export default Model
