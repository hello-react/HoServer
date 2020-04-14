import {Badge, Button} from 'antd'
import React from 'react'

export default props => {
    const {onClick, count, editMode} = props

    return editMode ? (
        <Button onClick={onClick}>
            <span>设置</span>
            <Badge showZero offset={[4, -4]} count={count} style={{ backgroundColor: '#e6f7ff', color: count > 0 ? '#2db7f5' : '#999' }} />
        </Button>
    ) : (
        <a onClick={onClick}>
            <span>查看</span>
            <Badge showZero offset={[4, -4]} count={count} style={{ backgroundColor: '#e6f7ff', color: count > 0 ? '#2db7f5' : '#999' }} />
        </a>
    )
}
