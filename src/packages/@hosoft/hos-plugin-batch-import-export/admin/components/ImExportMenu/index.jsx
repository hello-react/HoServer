/**
 * HoServer Manager Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 */
import { Icon } from '@ant-design/compatible'
import {Button, Dropdown, Menu} from 'antd'
import React, { useState } from 'react'

import ModelService from "../../service"

import ExportModal from '../Modals/ExportModal'
import ImportModal from '../Modals/ImportModal'

export default props => {
    const [importVisible, setImportVisible] = useState(false)
    const [exportVisible, setExportVisible] = useState(false)

    const handleImExportMenuClick = e => {
        if (e.key === 'import') {
            setImportVisible(true)
        } else if (e.key === 'export') {
            setExportVisible(true)
        }
    }

    const {options, modelMeta, data} = props
    let buttonText = ''
    if (options.import !== false) {
        buttonText += '导入'
    }
    if (options.export !== false) {
        buttonText += '导出'
    }

    return (
        <>
            <Dropdown overlay={(
                <Menu onClick={handleImExportMenuClick}>
                    {options.import !== false ? (
                        <Menu.Item key="import">
                            <Icon type="import" />
                            批量导入数据
                        </Menu.Item>
                    ) : null}
                    {options.export !== false ? (
                        <Menu.Item key="export">
                            <Icon type="export" />
                            批量导出数据
                        </Menu.Item>
                    ) : null}
                </Menu>
            )}>
                <Button type="primary">
                    {buttonText} <Icon type="down" />
                </Button>
            </Dropdown>

            {importVisible ? (
                <ImportModal
                    modelMeta={modelMeta}
                    onCancel={() => setImportVisible(false)}
                    downloadTemplUrl={ModelService.getModelImportTemplateUrl(modelMeta.name)}
                    onPrepareImport={args => {
                        return ModelService.prepareImportModelData(modelMeta.name, args)
                    }}
                    onImport={args => {
                        return ModelService.importModelData(modelMeta.name, args)
                    }}
                />
            ) : null}

            {exportVisible ? (
                <ExportModal
                    modelMeta={modelMeta}
                    data={data}
                    onExport={(modelName, args) => {
                        return ModelService.exportModelData(modelName, args, data)
                    }}
                    onCancel={() => setExportVisible(false)}
                />
            ) : null}
        </>
    )
}
