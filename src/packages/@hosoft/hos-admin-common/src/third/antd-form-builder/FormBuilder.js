/* eslint-disable prefer-destructuring,react/require-default-props */
import './FormBuilder.less'

import { Form, Icon } from '@ant-design/compatible'
import { Col, Input, Row, Tooltip } from 'antd'
import _ from 'lodash'
import PropTypes from 'prop-types'
import React, { Component, forwardRef } from 'react'

const FormItem = Form.Item
const widgetMap = {}

const getWrappedComponentWithForwardRef = _.memoize(Comp =>
    forwardRef((props, ref) => {
        return (
            <span ref={ref}>
                <Comp {...props} />
            </span>
        )
    }),
)

function getWidget(widget) {
    if (typeof widget === 'string') {
        if (!widgetMap[widget] || !widgetMap[widget].widget) {
            throw new Error(`Widget '${widget}' not found, did you defined it by FormBuilder.defineComponent?`)
        }
        return widgetMap[widget].widget
    }

    return widget
}

function convertMeta(field) {
    const widget = getWidget(field.widget)
    const item = _.find(Object.values(widgetMap), entry => entry.widget === widget && entry.metaConvertor)

    if (item) {
        const newField = item.metaConvertor(field)
        if (!newField) {
            throw new Error(`metaConvertor of '${String(field.widget)}' must return a field`)
        }

        return newField
    }

    return field
}

class FormBuilder extends Component {
    static propTypes = {
        meta: PropTypes.any.isRequired,
        initialValues: PropTypes.object,
        form: PropTypes.object,
        values: PropTypes.object,
        disabled: PropTypes.bool,
        viewMode: PropTypes.bool, // if viewMode, labels are left aligned
        preserve: PropTypes.bool,
    }

    static defaultProps = {
        disabled: false,
        form: null,
        viewMode: false,
        values: {},
        preserve: false,
    }

    getMeta() {
        // To support single field form builder
        const { meta } = this.props
        if (_.isArray(meta)) {
            return { fields: meta }
        }
        if (meta.elements) {
            // Compatible with old version of form builder.
            return { ...meta, fields: meta.elements }
        }
        if (!meta.fields) {
            return { fields: [meta] }
        }

        return meta
    }

    renderField = field => {
        const meta = this.getMeta()
        field = convertMeta(field)

        // Handle form item props
        const label = field.tooltip ? (
            <span>
                {field.label}
                <Tooltip title={field.tooltip}>
                    {' '}
                    <Icon type="question-circle-o" />
                </Tooltip>
            </span>
        ) : (
            field.label
        )

        let formItemLayout = field.formItemLayout || (field.label ? _.get(meta, 'formItemLayout') || [4, 20] : null)
        if (_.isArray(formItemLayout) && formItemLayout.length >= 2) {
            formItemLayout = {
                labelCol: { span: formItemLayout[0] },
                wrapperCol: { span: formItemLayout[1] },
            }
        }

        const isFieldViewMode = this.props.viewMode || meta.viewMode || field.viewMode || field.readOnly
        const formItemProps = {
            key: field.key,
            colon: meta.colon,
            ...formItemLayout,
            label,
            ..._.pick(field, ['help', 'extra', 'labelCol', 'wrapperCol', 'colon', 'htmlFor', 'validateStatus', 'hasFeedback']),
            ...field.formItemProps,
            className: `${this.props.viewMode || meta.viewMode ? 'ant-form-item-view-mode' : ''} ${(field.formItemProps || {}).className || ''}`,
        }

        if (field.label && typeof field.label === 'string') {
            formItemProps['data-label'] = field.label
        }

        if (field.colSpan && formItemProps.labelCol && !field.formItemLayout) {
            const labelCol = Math.round(formItemProps.labelCol.span / field.colSpan)

            Object.assign(formItemProps, {
                labelCol: { span: labelCol },
                wrapperCol: { span: 24 - labelCol },
            })
        }

        if (field.render) {
            return field.render.call(this, {
                formItemProps,
                field,
                ..._.pick(this.props, ['form', 'disabled', 'viewMode', 'initialValues']),
            })
        }

        let initialValue
        const initialValues = meta.initialValues || this.props.initialValues || {}

        if (_.has(field, 'initialValue')) {
            initialValue = field.initialValue
        } else if (field.getInitialValue) {
            initialValue = field.getInitialValue(field, initialValues, this.props.form)
        } else {
            initialValue = _.get(initialValues, field.key) || undefined
        }

        // Handle field props
        const rules = [...(field.rules || [])]
        if (field.required) {
            rules.unshift({
                required: true,
                message: field.message || `"${field.label || field.key}" 不能为空！`, // default to English, if needs localization, define it in fieldProps.rules.
            })
        }

        const fieldProps = {
            initialValue,
            preserve: this.props.preserve,
            ..._.pick(field, [
                'getValueFromEvent',
                'getValueProps',
                'normalize',
                'trigger',
                'preserve',
                'valuePropName',
                'validateTrigger',
                'validateFirst',
            ]),
            rules,
            ...field.fieldProps,
        }

        if (isFieldViewMode) {
            let viewEle = null
            const formValues = this.props.form ? this.props.form.getFieldsValue() : {}
            const viewValue = _.has(formValues, field.key) ? _.get(formValues, field.key) : initialValue
            if (field.renderView) {
                viewEle = field.renderView(viewValue, this.props.form)
            } else if (field.viewWidget) {
                const ViewWidget = typeof field.viewWidget === 'string' ? getWidget(field.viewWidget) : field.viewWidget
                viewEle = <ViewWidget value={viewValue} form={this.props.form} field={field} {...field.viewWidgetProps} />
            } else if (field.link) {
                const href = typeof field.link === 'string' ? field.link : viewValue
                viewEle = (
                    <a href={href} target={field.linkTarget || '_self'}>
                        {viewValue}
                    </a>
                )
            } else if (field.options) {
                // a little hacky here, if a field is select/options like, auto use label for value
                const found = _.find(field.options, opt => opt.value === viewValue)
                if (found) {
                    viewEle = <span title={viewValue} className="antd-form-builder-string-content">{found.label || ''}</span>
                }
            }
            if (!viewEle) {
                if (typeof viewValue === 'boolean') viewEle = viewValue ? '是' : '否' // _.capitalize(String(viewValue))
                else if (viewValue === undefined) {
                    viewEle = <span className="ant-form-item-view-mode-empty">(空)</span>
                } else {
                    viewEle = <span className="antd-form-builder-string-content">{String(viewValue) || ''}</span>
                }
            }

            if (this.props.form && field.readOnly) {
                return (
                    <FormItem {...formItemProps}>
                        {this.props.form.getFieldDecorator(
                            field.id || field.key,
                            fieldProps,
                        )(<span className="antd-form-builder-read-only-content">{viewEle}</span>)}
                    </FormItem>
                )
            }

            return <FormItem {...formItemProps}>{viewEle}</FormItem>
        }

        // Handle widget props
        const wp = field.widgetProps || {}
        const widgetProps = {
            ..._.pick(field, ['placeholder', 'type', 'className', 'class', 'onChange']),
            disabled: field.disabled || meta.disabled || this.props.disabled,
            ...wp,
        }
        const { getFieldDecorator } = this.props.form
        let FieldWidget = getWidget(field.widget) || Input

        if (field.forwardRef) {
            FieldWidget = getWrappedComponentWithForwardRef(FieldWidget)
        }

        if (field.noFormItem) {
            return getFieldDecorator(field.id || field.key, fieldProps)(<FieldWidget {...widgetProps}>{field.children || null}</FieldWidget>)
        }

        return (
            <FormItem {...formItemProps}>
                {getFieldDecorator(field.id || field.key, fieldProps)(<FieldWidget {...widgetProps}>{field.children || null}</FieldWidget>)}
            </FormItem>
        )
    }

    renderLayout(elements, fields) {
        // Layout the form in columns
        const columns = this.props.meta.columns || 1
        if (columns === 1) {
            return elements
        }

        const meta = this.getMeta()
        const gutter = _.has(meta, 'gutter') ? meta.gutter : 10
        const rows = []
        // for each column , how many grid cols
        const spanUnit = 24 / columns

        for (let i = 0; i < elements.length; ) {
            const cols = []
            for (
                let j = 0;
                (j < columns || j === 0) && // total col span is less than columns
                i < elements.length && // element exist
                (!['left', 'both'].includes(fields[i].clear) || j === 0); // field doesn't need to start a new row

            ) {
                const fieldSpan = fields[i].colSpan || 1
                cols.push(
                    <Col key={j} span={Math.min(24, spanUnit * fieldSpan)}>
                        {elements[i]}
                    </Col>,
                )
                j += fieldSpan
                if (['both', 'right'].includes(fields[i].clear)) {
                    i += 1
                    break
                }
                i += 1
            }
            rows.push(
                <Row key={i} gutter={gutter}>
                    {cols}
                </Row>,
            )
        }
        return rows
    }

    render() {
        const meta = this.getMeta()
        return this.renderLayout(meta.fields.map(this.renderField), meta.fields)
    }
}

FormBuilder.defineWidget = (name, widget, metaConvertor = null) => {
    if (widgetMap[name]) throw new Error(`Widget "${name}" 已经存在！`)
    widgetMap[name] = {
        widget,
        metaConvertor,
    }
}

export default FormBuilder
