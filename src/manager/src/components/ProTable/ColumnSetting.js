// copy and modify from Ant Design Pro Table
import './index.less'

import { PushpinOutlined, SettingOutlined, VerticalAlignMiddleOutlined } from '@ant-design/icons'
import { Checkbox, Popover, Tooltip } from 'antd'
import React, {useEffect, useRef} from 'react'

const ToolTipIcon = ({title, show, children, onFixAction}) => {
    if (show) {
        return (
            <Tooltip title={title}>
                <span
                    className="ho_tbl_setting_list_item_option"
                    onClick={() => {
                        onFixAction()
                    }}
                >
                    {children}
                </span>
            </Tooltip>
        )
    }

    return null
}

const CheckboxList = ({list, showTitle = true, title: listTitle, onChange}) => {
    const show = list && list.length > 0;
    if (!show) {
        return null;
    }

    const fixTo = (record, position) => {
        record.fixed = position
        onChange()
    }

    const listDom = list.map(record => {
        return (
            <span key={record.dataIndex} className="ho_tbl_setting_list_item">
                <Checkbox
                    className="ho_tbl_setting_list_item_head"
                    onChange={e => {
                        record.hideInTable = !e.target.checked
                        onChange()
                    }}
                    checked={!record.hideInTable}
                >
                    {record.title}
                </Checkbox>
                <span>
                    <ToolTipIcon
                        columnKey={record.dataIndex}
                        fixed="right"
                        title="固定到右边"
                        show={record.fixed !== 'right'}
                        onFixAction={() => fixTo(record, 'right')}
                    >
                        <PushpinOutlined
                            style={{
                                transform: 'rotate(-90deg)',
                            }}
                        />
                    </ToolTipIcon>
                    <ToolTipIcon
                        columnKey={record.dataIndex}
                        fixed={undefined}
                        title="取消固定"
                        show={!!record.fixed}
                        onFixAction={() => fixTo(record, '')}
                    >
                        <VerticalAlignMiddleOutlined />
                    </ToolTipIcon>
                    <ToolTipIcon
                        columnKey={record.dataIndex}
                        fixed="left"
                        title="固定到左边"
                        show={record.fixed !== 'left'}
                        onFixAction={() => fixTo(record, 'left')}
                    >
                        <PushpinOutlined />
                    </ToolTipIcon>
                </span>
            </span>
        )
    })

    return (
        <div className="ho_tbl_setting_list_group">
            {showTitle && <span>{listTitle}</span>}
            {listDom}
        </div>
    )
};

const GroupCheckboxList = ({localColumns, onColumnChange}) => {
    const onChange = () => {
        onColumnChange()
    }

    const rightList = []
    const leftList = []
    const list = []

    localColumns.forEach(item => {
        const { fixed } = item
        if (fixed === 'left') {
            leftList.push(item)
            return
        }
        if (fixed === 'right') {
            rightList.push(item)
            return
        }
        list.push(item)
    })

    const showRight = rightList && rightList.length > 0
    const showLeft = leftList && leftList.length > 0

    return (
        <div className="ho_tbl_setting_list">
            <CheckboxList
                title="固定在左侧"
                list={leftList}
                onChange={onChange}
            />
            {/* 如果没有任何固定，不需要显示title */}
            <CheckboxList
                list={list}
                title="不固定"
                showTitle={showLeft || showRight}
                onChange={onChange}
            />
            <CheckboxList
                title="固定在右侧"
                list={rightList}
                onChange={onChange}
            />
        </div>
    )
}

const ColumnSetting = props => {
    const {tableColumns, onColumnChange} = props
    const selectKeys = Object.values(tableColumns).filter(value => !value || value.hideInTable !== true)
    const indeterminate = selectKeys.length > 0 && selectKeys.length !== tableColumns.length

    const columnsRef = useRef([])
    useEffect(() => {
        for (let i=0; i<tableColumns.length; i++) {
            columnsRef.current.push({...tableColumns[i]})
        }
    }, [])

    const setAllSelectAction = check => {
        for (let i=0; i<tableColumns.length; i++) {
            tableColumns[i].hideInTable = !check
        }
        onColumnChange()
    }

    return (
        <Popover
            arrowPointAtCenter
            title={
                <div>
                    <Checkbox
                        indeterminate={indeterminate}
                        checked={selectKeys.length === 0 && selectKeys.length !== tableColumns.length}
                        onChange={e => {
                            if (e.target.checked) {
                                setAllSelectAction(true)
                            } else {
                                setAllSelectAction(false)
                            }
                        }}
                    >
                        列展示
                    </Checkbox>
                    <a onClick={() => onColumnChange(columnsRef.current)}>
                        重置
                    </a>
                </div>
            }
            trigger="click"
            placement="bottomRight"
            content={<GroupCheckboxList onColumnChange={onColumnChange} localColumns={tableColumns} />}
        >
            <Tooltip title="列设置">
                <SettingOutlined className="iconbtn"/>
            </Tooltip>
        </Popover>
    )
}

export default ColumnSetting
