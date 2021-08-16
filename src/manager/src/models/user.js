import { Common } from "@hosoft/hos-admin-common"
import { stringify } from 'querystring'
import router from 'umi/router'

import { queryCurrent } from '@/services/user'
import { setAuthority, setAutologinInfo } from '@/utils/authority'

const UserModel = {
    namespace: 'user',
    state: {
        currentUser: {},
    },
    effects: {
        *fetchCurrent(_, { call, put }) {
            const response = yield call(queryCurrent)
            if (!response) {
                router.replace({
                    pathname: '/user/login',
                    search: stringify({
                        redirect: window.location.href,
                    }),
                })
            } else {
                yield put({
                    type: 'saveCurrentUser',
                    payload: response,
                })
            }
        },

        *updateCurrent({ payload }, { put }) {
            yield put({
                type: 'saveCurrentUser',
                payload: payload.userInfo,
            })
        },

        *logout(_, { put }) {
            yield put({
                type: 'saveCurrentUser',
                payload: null
            })

            setAuthority('')
            setAutologinInfo('')

            const { redirect } = Common.getPageQuery() // Note: There may be security issues, please note

            if (window.location.pathname !== '/user/login' && !redirect) {
                router.replace({
                    pathname: '/user/login',
                    search: stringify({
                        redirect: window.location.href,
                    }),
                })
            }
        },
    },
    reducers: {
        saveCurrentUser(state, action) {
            return { ...state, currentUser: action.payload || {} }
        },

        changeNotifyCount(
            state = {
                currentUser: {},
            },
            action,
        ) {
            return {
                ...state,
                currentUser: {
                    ...state.currentUser,
                    notifyCount: action.payload.totalCount,
                    unreadCount: action.payload.unreadCount,
                },
            }
        },
    },
}

export default UserModel
