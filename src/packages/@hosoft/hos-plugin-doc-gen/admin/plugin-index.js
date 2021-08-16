import _ from 'lodash'
import React from 'react'

import GenDocModal from "./components/GenDocModal";

/**
 * plugin for generate api document
 */
class ApiDocGen {
    constructor() {
        _.bindAll(this, ['init', 'renderDocGenButton'])
    }

    init(pluginManager) {
        pluginManager.setRenderHook('ProTableToolbar', this.renderDocGenButton)
    }

    renderDocGenButton(tableLayout, selectedRows, options, buttons) {
        const modelMeta = tableLayout.getModelMeta()
        if (modelMeta.name !== 'Api') {
            return
        }

        buttons.push((
            <GenDocModal />
        ))
    }
}

export default new ApiDocGen()
