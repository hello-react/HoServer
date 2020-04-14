/* eslint-disable jsx-a11y/alt-text */
/**
 * HoServer Manager Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/01/20
 * author: Jack Zhang
 * */
import './FunctionList.less'

import { Icon} from "@ant-design/compatible"
import {Button, Card, Modal, Tag} from 'antd'
import _ from 'lodash'
import React, { Fragment, useRef,useState } from 'react'

import groupIcon from '@/assets/group_func.svg'
import privateIcon from '@/assets/private.svg'
import publicIcon from '@/assets/public.svg'
import BadgeButton from "@/components/BadgeButton"

const FunctionList = props => {
    const [visible, setVisible] = useState()
    const [group, setGroup] = useState(false)
    const [alphaSort, setAlphaSort] = useState(3)

    const {title, data} = props
    const showData = useRef(_.concat([], data || []))

    const renderSorter = () => {
        return (
            <Fragment>
                <span style={{fontSize: 14, fontWeight: 'normal'}}>排序 </span>
                <Tag color='blue' title={alphaSort === 1 ? '按字母顺序' : (alphaSort === 2 ? '按字母倒序' : '按代码行排序')}>
                    <a onClick={() => {
                        const newSort = alphaSort === 1 ? 2 : (alphaSort === 2 ? 3 : 1)
                        if (newSort === 1) {
                            showData.current = _.sortBy(data)
                        } else if (newSort === 2) {
                            showData.current = _.reverse(_.sortBy(data))

                        } else {
                            showData.current = _.concat([], data || [])
                        }

                        setAlphaSort(newSort)
                    }}>
                        <Icon type={alphaSort === 1 ? "sort-ascending" : (alphaSort === 2 ? "sort-descending" : "ordered-list")} />
                    </a>
                </Tag>
            </Fragment>
        )
    }

    const renderTitle = () => {
        return (
            <Fragment>
                {title}
                <span style={{float: 'right', marginRight: 15}}>
                    {renderSorter()}
                    <Tag color={group ? 'blue' : 'white'} title={group ? '自动分组' : '取消分组'}>
                        <a onClick={() => setGroup(!group)}>
                            <img style={{width: 20}} src={groupIcon} />
                        </a>
                    </Tag>
                </span>
            </Fragment>
        )
    }

    return (
        <>
            <BadgeButton count={data.length}
                editMode={0}
                onClick={() => setVisible(true)}
            />
            {visible ? (
                <Modal
                    key="funcListModal"
                    centered
                    destroyOnClose
                    width={800}
                    bodyStyle={{ maxHeight: 600, overflow: 'scroll' }}
                    title={renderTitle()}
                    visible={visible}
                    footer={<Button type="primary" onClick={() => setVisible(false)}>关闭</Button>}
                    onCancel={() => setVisible(false)}
                >
                    {group ? (
                        <>
                            <Card
                                className="ho_func_name"
                                title="Public Functions"
                                bordered={false}
                                bodyStyle={{backgroundColor: '#efefef'}}
                            >
                                {showData.current.filter(f => !f.startsWith('_')).map(f => (
                                    <p key={f}><img style={{width: 20, marginLeft: 10}} src={publicIcon} /> {f}</p>
                                ))}
                            </Card>
                            <Card
                                className="ho_func_name"
                                title="Private Functions"
                                bordered={false}
                                bodyStyle={{backgroundColor: '#efefef'}}
                            >
                                {showData.current.filter(f => f.startsWith('_')).map(f  => (
                                    <p key={f}><img style={{width: 20, marginLeft: 10}} src={privateIcon} /> {f}</p>
                                ))}
                            </Card>
                        </>
                    ) : (
                        <Card
                            className="ho_func_name"
                            title="函数列表"
                            bordered={false}
                            bodyStyle={{backgroundColor: '#efefef'}}
                        >
                            {showData.current.map(f => (
                                <p key={f}>
                                    {f.startsWith('_') ? (
                                        <img style={{width: 20, marginLeft: 10}} src={privateIcon} />
                                    ) : (
                                        <img style={{width: 20, marginLeft: 10}} src={publicIcon} />
                                    )}
                                    {' '}{f}
                                </p>
                            ))}
                        </Card>
                    )}
                </Modal>
            ) : null}
        </>
    )
}

export default FunctionList
