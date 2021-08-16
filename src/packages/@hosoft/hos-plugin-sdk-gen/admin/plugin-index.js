import _ from 'lodash'
import React from 'react'

import GenSdkModal from "./components/GenSdkModal";

/**
 * plugin for generate api document
 */
class ApiDocGen {
    constructor() {
        _.bindAll(this, ['init', 'renderSdkGenButton'])
    }

    init(pluginManager) {
        pluginManager.setRenderHook('ProTableToolbar', this.renderSdkGenButton)
    }

    renderSdkGenButton(tableLayout, selectedRows, options, buttons) {
        const modelMeta = tableLayout.getModelMeta()
        if (modelMeta.name !== 'Api') {
            return
        }

        buttons.push((
            <GenSdkModal />
        ))
    }
}

export default new ApiDocGen()
