/* eslint-disable eqeqeq */
import { Form as LegacyForm } from '@ant-design/compatible'
import { Constants } from "@hosoft/hos-admin-common"
import { Button, message, Modal, Radio, Result, Spin, Steps,Switch } from 'antd'
import { saveAs } from 'file-saver'
import React, {useImperativeHandle, useRef, useState} from 'react'

const { Step } = Steps
const formLayout = {
    labelCol: {
        xs: {span: 24},
        sm: {span: 8},
    },
    wrapperCol: {
        xs: {span: 24},
        sm: {span: 16},
    },
}

const ChooseScope = LegacyForm.create()(props => {
    const {getFieldDecorator} = props.form

    useImperativeHandle(props.actionRef, () => ({
        getValues: () => {
            return props.form.getFieldsValue()
        }
    }))

    return (
        <LegacyForm {...Constants.DEF_FORM_ITEM_LAYOUT} labelAlign="left" layout="horizontal">
            <LegacyForm.Item label="文件格式">
                {getFieldDecorator('format', {
                    initialValue: "xlsx"
                })(
                    <Radio.Group>
                        <Radio value="xlsx" style={{width: 200}}>Excel 文件 (*.xlsx)</Radio>
                        <Radio value="json">JSON 文件 (*.json)</Radio>
                    </Radio.Group>
                )}
            </LegacyForm.Item>
            <LegacyForm.Item label="数据范围">
                {getFieldDecorator('scope', {
                    initialValue: 1
                })(
                    <Radio.Group>
                        <Radio value={1} style={{width: 200}}>全部记录</Radio>
                        <Radio value={2}>当前选择</Radio>
                    </Radio.Group>
                )}
            </LegacyForm.Item>
        </LegacyForm>
    )
})

const ChooseFields = LegacyForm.create()(props => {
    const {modelMeta} = props
    const {getFieldDecorator} = props.form

    useImperativeHandle(props.actionRef, () => ({
        getValues: () => {
            return props.form.getFieldsValue()
        }
    }))

    return (
        <LegacyForm {...formLayout} labelAlign="left" layout="horizontal">
            {modelMeta.properties.map(p => {
                if (p.name === 'branch') {
                    return null
                }

                return (
                    <LegacyForm.Item key={p.name} label={p.dis_name}>
                        {getFieldDecorator(p.name)(
                            <Switch defaultChecked />
                        )}
                    </LegacyForm.Item>
                )
            })}
        </LegacyForm>
    )
})

const ExportModal = props => {
    const [processing, setProcessing] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [result, setResult] = useState({})

    const scopeRef = useRef()
    const fieldsRef = useRef()
    const options = useRef({})

    const selectExportFields = () => {
        const setting = scopeRef.current.getValues()
        options.current.scope = setting.scope
        options.current.format = setting.format

        if (setting.scope === 2 && !(props.data && props.data.length > 0)) {
            return message.error('尚未选择任何记录！')
        }
        setCurrentStep(currentStep+1)
    }

    const handleExport = async () => {
        options.current.fields = fieldsRef.current.getValues()
        setCurrentStep(currentStep+1)

        setProcessing(true)

        const {onExport, modelMeta} = props
        const exportResult = await onExport(
            modelMeta.name,
            options.current
        )
        setResult(exportResult || {})

        setTimeout(() => setProcessing(false), 500)
    }

    const renderResult = () => {
        const success = result.code / 1 === 200 && result.data
        const modelName = props.modelMeta.dis_name

        return processing ? (
            <Spin
                size="large"
                tip="正在处理，请稍候..."
                style={{position:'absolute', left:'50%', top:'50%', transform: 'translate(-50%, -50%)'}}
            />
        ) : (
            <Result
                status={success ? 'success' : 'error'}
                title={success ? '导出成功，点击下载' : '导出失败'}
                subTitle={!success ? result.message : ''}
                extra={success ? [
                    <Button type="primary" key="console" onClick={async () => {
                        // window.open(result.data.url, '_blank')
                        const fileExt = result.data.substr(result.data.lastIndexOf('.'))
                        saveAs(result.data, modelName + fileExt)
                    }}>
                        下载
                    </Button>
                ] : null}
            />
        )
    }

    const renderFooter = () => {
        return (
            <div className="steps-action">
                {currentStep > 0 && (
                    <Button disabled={processing} style={{ marginRight: 10 }} onClick={() => setCurrentStep(currentStep-1)}>
                        上一步
                    </Button>
                )}
                {currentStep < 2 && (
                    <Button disabled={processing} type="primary" onClick={() => {
                        currentStep === 0 ? selectExportFields() : handleExport()
                    }}>
                        {currentStep === 1 ? '开始导出' : '下一步'}
                    </Button>
                )}
                {currentStep === 2 && (
                    <Button type="primary" onClick={() => onCancel && onCancel()}>
                        完成
                    </Button>
                )}
            </div>
        )
    }

    const {onCancel, modelMeta} = props

    return (
        <Modal
            centered
            visible
            destroyOnClose
            width={800}
            bodyStyle={{ height: 500, overflow: 'scroll', backgroundColor: '#fff' }}
            title="批量导出数据"
            footer={renderFooter()}
            onCancel={() => onCancel && onCancel()}
        >
            <Steps current={currentStep} style={{marginBottom: 20}}>
                <Step key="config" title="开始" />
                <Step key="preprocess" title="选择列" />
                <Step key="result" title="导出" />
            </Steps>
            <div style={{backgroundColor: '#fafafa', padding: 20, minHeight: 400}}>
                {currentStep === 0 ? (
                    <ChooseScope actionRef={scopeRef} />
                ) : currentStep === 1 ? (
                    <ChooseFields actionRef={fieldsRef} modelMeta={modelMeta} />
                ) : renderResult()}
            </div>
        </Modal>
    )
}

export default ExportModal
