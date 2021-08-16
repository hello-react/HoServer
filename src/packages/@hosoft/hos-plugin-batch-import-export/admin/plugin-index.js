import _ from 'lodash'
import React from 'react'

import ImExportMenu from "./components/ImExportMenu";

/**
 * plugin for batch import / export data
 */
class ImportExport {
    constructor() {
        _.bindAll(this, ['init', 'renderImportExportMenu'])
    }

    init(pluginManager) {
        pluginManager.setRenderHook('ProTableToolbar', this.renderImportExportMenu)
    }

    renderImportExportMenu(tableLayout, selectedRows, options, buttons) {
        if (options && (options.import !== false || options.export !== false)){
            const modelMeta = tableLayout.getModelMeta()
            buttons.splice(2, 0,
                <ImExportMenu
                    key="imexport"
                    options={{import: options.import, export: options.export}}
                    modelMeta={modelMeta}
                    data={selectedRows}
                />
            )
        }
    }
}

export default new ImportExport()
