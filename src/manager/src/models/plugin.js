import { queryServerPlugins } from '@/services/plugin'

const PluginModel = {
    namespace: 'plugin',
    state: {
        serverPlugins: [],
        managerPlugins: []
    },
    effects: {
        *fetchServerPlugins(_, { call, put }) {
            const response = yield call(queryServerPlugins)
            if (response) {
                yield put({
                    type: 'saveServerPluginList',
                    payload: response,
                })
            }
        },

        *registerPlugin({ payload }, { put }) {
            yield put({
                type: 'saveManagerPlugin',
                payload,
            })
        }
    },
    reducers: {
        saveServerPluginList(state, action) {
            return { ...state, serverPlugins: action.payload || [] }
        },
        saveManagerPlugin(state, action) {
            const { managerPlugins } = state
            const pluginInfo = action.payload || {}

            const index = managerPlugins.findIndex(p => p.name === pluginInfo.name)
            if (index > -1) {
                managerPlugins[index] = pluginInfo
            } else {
                managerPlugins.push(pluginInfo)
            }

            return { ...state, managerPlugins: [].concat(managerPlugins) }
        }
    },
}

export default PluginModel
