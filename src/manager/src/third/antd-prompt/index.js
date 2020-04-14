// forked from: https://github.com/wangsijie/antd-prompt
import {Form} from "@ant-design/compatible"
import {Input, Modal} from 'antd'
import React from 'react'
import ReactDOM from 'react-dom'

const Prompt = props => {
    const onOk = () => {
        props.form.validateFields(async (err, values) => {
            if (!err) {
                props.close(values.input)
            }
        })
    }

    const {modalProps, inputProps, rules, initialValue, label, multiline} = props
    const {getFieldDecorator} = props.form
    const InputComp = multiline ? Input.TextArea : Input

    return <Modal
        {...modalProps}
        visible={props.visible}
        onOk={onOk}
        onCancel={() => props.close()}
        title={props.title}
        getContainer={false}
        afterClose={props.afterClose}
    >
        <Form
            labelCol={label ? {
                xs: {span: 24},
                sm: {span: 6},
            } : undefined}
            wrapperCol={{
                xs: { span: 24 },
                sm: { span: label ? 18 : 24 },
            }}
        >
            <Form.Item label={label}>
                {getFieldDecorator('input', {
                    initialValue,
                    rules
                })(<InputComp {...inputProps} style={{width: '100%'}} />)}
            </Form.Item>
        </Form>
    </Modal>
}

const EnhancedPromptForm = Form.create()(Prompt)

export default function prompt(config) {
    return new Promise((resolve, reject) => {
        const div = document.createElement('div');
        document.body.appendChild(div);
        // eslint-disable-next-line no-use-before-define
        let currentConfig = {...config, close, visible: true};

        function destroy(value) {
            const unmountResult = ReactDOM.unmountComponentAtNode(div)
            if (unmountResult && div.parentNode) {
                div.parentNode.removeChild(div)
            }
            if (value !== undefined) {
                resolve(value)
            } else {
                reject(value)
            }
        }

        function render(props) {
            ReactDOM.render(<EnhancedPromptForm {...props} />, div)
        }

        function close(value) {
            currentConfig = {
                ...currentConfig,
                visible: false,
                afterClose: destroy.bind(this, value),
            };
            render(currentConfig)
        }

        render(currentConfig)
    });
}
