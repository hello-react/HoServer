import { DatePicker } from 'antd'
import React, { useState } from 'react'

const RangePicker = props => {
    const {onChange, selectRange} = props

    const [endOpen, setEndOpen] = useState(false)
    const [startValue, setStartValue] = useState(null)
    const [endValue, setEndValue] = useState(null)

    const onStartChange = value => {
        setStartValue(value)
        if (endValue && value) {
            onChange && onChange(`${value.format('YYYY-MM-DD HH:mm:ss')},${endValue.format('YYYY-MM-DD HH:mm:ss')}`)
        }
    };

    const onEndChange = value => {
        setEndValue(value)
        if (startValue && value) {
            onChange && onChange(`${startValue.format('YYYY-MM-DD HH:mm:ss')},${value.format('YYYY-MM-DD HH:mm:ss')}`)
        }
    };

    const handleStartOpenChange = open => {
        if (!open) {
            setEndOpen(true)
        }
    };

    const handleEndOpenChange = open => {
        setEndOpen(open)
    };

    return (
        <>
            <DatePicker
                showTime
                format="MM-DD HH:mm:ss"
                value={startValue}
                placeholder="开始时间"
                style={{width: 100}}
                onChange={onStartChange}
                onOpenChange={handleStartOpenChange}
            />
            { selectRange !== false ? (
                <DatePicker
                    showTime
                    format="MM-DD HH:mm:ss"
                    value={endValue}
                    placeholder="结束时间"
                    style={{width: 100, marginLeft: '10px'}}
                    onChange={onEndChange}
                    open={endOpen}
                    onOpenChange={handleEndOpenChange}
                />
            ) : null}
        </>
    )
}

export default RangePicker
