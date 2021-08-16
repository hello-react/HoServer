import { Form as LegacyForm, Icon } from '@ant-design/compatible'
import { Constants } from "@hosoft/hos-admin-common"
import {Button, message, Modal, Radio, Result, Spin, Steps, Upload} from 'antd'
import _ from 'lodash'
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'

const { Step } = Steps

const OptionsForm = LegacyForm.create()(props => {
    const [fileList, setFileList] = useState([])

    useImperativeHandle(props.actionRef, () => ({
        getValues: () => {
            return props.form.getFieldsValue()
        }
    }))

    const uploadProps = {
        name: 'file',
        multiple: false,
        accept: '*.json,*.xlsx',
        action: `${Constants.API_PREFIX}/upload?category=import`,
        headers: {
            authorization: 'authorization-text',
        },
        fileList,
        onChange(info) {
            setFileList([info.file])
            if (info.file.status === 'done') {
                message.success(`${info.file.name} 上传成功！`)
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} 上传失败！`)
            }
        },
    }

    const {getFieldDecorator} = props.form
    const {downloadTemplUrl} = props

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
            <LegacyForm.Item label="重复记录">
                {getFieldDecorator('overwrite', {
                    initialValue: 1
                })(
                    <Radio.Group>
                        <Radio value={1} style={{width: 200}}>覆盖</Radio>
                        <Radio value={2}>跳过</Radio>
                    </Radio.Group>
                )}
            </LegacyForm.Item>
            <LegacyForm.Item label="选择文件">
                <a style={{marginRight: 10}} href={downloadTemplUrl} target="_blank" rel="noopener noreferrer">Excel 模板下载...</a>
                {getFieldDecorator('files')(
                    <Upload {...uploadProps}>
                        <Button>
                            <Icon type="upload" /> 选择文件导入...
                        </Button>
                    </Upload>
                )}
            </LegacyForm.Item>
        </LegacyForm>
    )
})

const PrepareImport = props => {
    const [preProcessing, setPreProcessing] = useState(true)
    const [preResult, setPreResult] = useState({})
    const {options, onPrepareImport, onStatusChange} = props

    const handlePrepareImport = async () => {
        setPreProcessing(true)

        const result = await onPrepareImport(options)
        setPreResult(result)

        setTimeout(() => {
            setPreProcessing(false)
            onStatusChange(_.get(result, ['data', 'total']) > 0 && _.get(result, ['data', 'invalid']) === 0 ? 'success' : 'fail')
        }, 500)
    }

    useEffect(() => {
        handlePrepareImport()
    }, [])

    const data = _.get(preResult, 'data', {})
    const importCount = data.total - data.skip - data.invalid - data.failed
    const success = preResult && preResult.code / 1 === 200 && importCount > 0 && data.invalid === 0 && data.failed === 0

    return preProcessing ? (
        <Spin
            size="large"
            tip="正在处理，请稍候..."
            style={{position:'absolute', left:'50%', top:'50%', transform: 'translate(-50%, -50%)'}}
        />
    ) : (
        <Result
            status={success ? 'success' : (importCount > 0 ? 'warning' : 'error')}
            title='文件准备完毕'
            subTitle={success ? '点击 "开始导入" 继续' : (success === 2 ? '请完成处理有问题的记录后重新上传' : '文件准备失败')}
            extra={[
                <>
                    <p>共包含 {data.total} 条记录</p>
                    <p>
                        <span>跳过 {data.skip} 条已存在记录, {data.invalid} 条记录校验失败, {data.failed} 条记录保存失败</span>
                    </p>
                    <p><a href={data.result_url} target="_blank" rel="noopener noreferrer">下载处理结果...</a></p>
                </>
            ]}
        />
    )
}

const ImportResult = props => {
    const [processing, setProcessing] = useState(true)
    const [result, setResult] = useState({})
    const {options, onImport, onStatusChange} = props

    const handleImport = async () => {
        setProcessing(true)

        const rep = await onImport(options)
        setResult(rep)

        setTimeout(() => {
            setProcessing(false)
            onStatusChange(_.get(rep, ['data', 'total']) > 0 && _.get(rep, ['data', 'invalid']) === 0 ? 'success' : 'fail')
        }, 500)
    }

    useEffect(() => {
        handleImport()
    }, [])

    const data = _.get(result, 'data', {})
    const importCount = data.total - data.skip - data.invalid - data.failed
    const success = result && result.code / 1 === 200 && importCount > 0 && data.invalid === 0 && data.failed === 0
    return processing ? (
        <Spin
            size="large"
            tip="正在处理，请稍候..."
            style={{position:'absolute', left:'50%', top:'50%', transform: 'translate(-50%, -50%)'}}
        />
    ) : (
        <Result
            status={success ? 'success' : (importCount > 0 ? 'warning' : 'error')}
            title='导入完毕'
            extra={[
                <>
                    <p>共 {data.total} 条记录，成功导入 {importCount} 条</p>
                    <p>
                        <span>跳过 {data.skip} 条已存在记录, {data.invalid} 条记录校验失败, {data.failed} 条记录保存失败</span>
                    </p>
                    <p><a href={data.result_url} target="_blank" rel="noopener noreferrer">下载处理结果...</a></p>
                </>
            ]}
        />
    )
}

/**
 * 导入导出不需要使用阿里云存储上传
 */
const ImportModal = props => {
    const [options, setOptions] = useState()
    const [status, setStatus] = useState('')
    const [currentStep, setCurrentStep] = useState(0)
    const optionsRef = useRef({})

    const handlePrepareImport = async () => {
        const importOptions = optionsRef.current.getValues()
        await setOptions(importOptions)

        const fileList = _.get(importOptions, ['files', 'fileList'], [])
        if (!(fileList && fileList.length > 0 && fileList[0].status === 'done')) {
            return message.info('请先上传文件!')
        }

        setCurrentStep(currentStep + 1)
    }

    const handleImport = () => {
        if (status === 'success') {
            setCurrentStep(currentStep + 1)
        }
    }

    const renderFooter = () => {
        return (
            <div className="steps-action">
                {currentStep > 0 && (
                    <Button disabled={status === 'processing'} style={{ marginRight: 10 }} onClick={() => setCurrentStep(currentStep-1)}>
                        上一步
                    </Button>
                )}
                {currentStep < 2 && (
                    <Button disabled={status === 'processing' || (currentStep === 1 && status !== 'success')} type="primary" onClick={() => {
                        if (currentStep === 0) {
                            handlePrepareImport()
                        } else {
                            handleImport()
                        }
                    }}>
                        {currentStep === 1 ? '开始导入' : '下一步'}
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

    const {onCancel, downloadTemplUrl, onPrepareImport, onImport} = props
    return (
        <Modal
            centered
            visible
            destroyOnClose
            width={800}
            bodyStyle={{ height: 500, overflow: 'scroll', backgroundColor: '#fff' }}
            title="批量导入数据"
            footer={renderFooter()}
            onCancel={() => onCancel && onCancel()}
        >
            <Steps current={currentStep} style={{marginBottom: 20}}>
                <Step key="config" title="开始" />
                <Step key="prepare" title="准备导入" />
                <Step key="result" title="导入" />
            </Steps>
            <div style={{backgroundColor: '#fafafa', padding: 20, minHeight: 400}}>
                {currentStep === 0 ? (
                    <OptionsForm downloadTemplUrl={downloadTemplUrl} actionRef={optionsRef} />
                ) : currentStep === 1 ? (
                    <PrepareImport
                        options={options}
                        onPrepareImport={onPrepareImport}
                        onStatusChange={stat => setStatus(stat)}
                    />
                ) : (
                    <ImportResult
                        options={options}
                        onImport={onImport}
                        onStatusChange={stat => setStatus(stat)}
                    />
                )}
            </div>
        </Modal>
    )
}

export default LegacyForm.create()(ImportModal)
