import { Icon } from '@ant-design/compatible'
import { Input, Tag, Tooltip } from 'antd'
import React, { Fragment,useEffect, useRef, useState } from 'react'

import JsonViewModal from "@/components/Modals/JsonViewModal"

export default props => {
    const {editMode} = props

    const [inputVisible, setInputVisible] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const [tags, setTags] = useState(props.tags || [])
    const input = useRef()

    useEffect(() => {
        if (inputVisible) {
            input.current && input.current.focus()
        }
    }, [inputVisible])

    const handleClose = removedTag => {
        const newTags = tags.filter(tag => tag !== removedTag)
        setTags(newTags)
    }

    const showInput = () => {
        setInputVisible(true)
    }

    const handleInputChange = e => {
        setInputValue(e.target.value)
    }

    const handleInputConfirm = () => {
        let newTags = tags
        if (inputValue && tags.indexOf(inputValue) === -1) {
            newTags = [...tags, inputValue]
            setTags(newTags)
        }

        setInputVisible(false)
        setInputValue('')
    }

    return (
        <Fragment>
            {tags.map(tag => {
                if (typeof tag === 'object') {
                    return (
                        <JsonViewModal data={tag}>
                            <Icon type="eye" /> 查看
                        </JsonViewModal>
                    )
                }

                const isLongTag = tag.length > 20
                const tagElem = (
                    <Tag key={tag} color="blue" closable onClose={() => handleClose(tag)}>
                        {isLongTag ? `${tag.slice(0, 20)}...` : tag}
                    </Tag>
                )

                return isLongTag ? (
                    <Tooltip title={tag} key={tag}>
                        {tagElem}
                    </Tooltip>
                ) : (
                    tagElem
                )
            })}

            {editMode && inputVisible ? (
                <Input
                    ref={input}
                    type="text"
                    style={{ width: 100 }}
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputConfirm}
                    onPressEnter={handleInputConfirm}
                />
            ) : null}

            {editMode && !inputVisible ? (
                <Tag onClick={showInput} style={{ background: '#fff', borderStyle: 'dashed' }}>
                    <Icon type="plus" /> 新建
                </Tag>
            ) : null}
        </Fragment>
    )
}
