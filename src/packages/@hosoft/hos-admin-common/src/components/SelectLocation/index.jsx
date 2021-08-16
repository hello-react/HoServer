import '@ant-design/compatible/assets/index.css'

import { Col, Row, Select } from 'antd'
import _ from 'lodash'
import React, { useEffect,useState } from 'react'

import AreaService from './service'

const {Option} = Select

const provinces = AreaService.getProvinces()

const SelectLocation = props => {
    const {editMode, onChange} = props

    const [cities, setCities] = useState([])
    const [districts, setDistricts] = useState([])
    const [location, setLocation] = useState({})

    useEffect(() => {
        load()
    }, [props.location])

    const load = async () => {
        const selLocation = props.location || {}
        setLocation(selLocation)
        await loadCities(selLocation.province)
        await loadDistricts(selLocation.city)
    }

    const loadCities = async value => {
        if (!value) return

        const selCities = await AreaService.getCities(value)
        if (selCities && selCities.length > 0) {
            await setCities(selCities)
        }
    }

    const loadDistricts = async value => {
        if (!value) return

        const selDistricts = await AreaService.getDistricts(value)
        if (selDistricts && selDistricts.length > 0) {
            setDistricts(selDistricts)
        }
    }

    const renderView = () => {
        const selProvince = provinces.find(r => r.code === location.province)
        const selCity = cities.find(r => r.code === location.city)
        const selDistrict = districts.find(r => r.code === location.district)

        return (
            <div>
                {`${_.get(selProvince, 'province', '')} ${_.get(selCity, 'city', '')} ${_.get(selDistrict, 'district', '')}`}
            </div>
        )
    }

    return editMode === 0 ? renderView() : (
        <Row gutter={8}>
            <Col span={8}>
                <Select placeholder="省" value={location.province} onChange={async value => {
                    location.province = value
                    loadCities(value)
                    // setLocation({...location})
                    onChange && onChange(location)
                }}>
                    {provinces.map(r => (
                        <Option key={r.code} value={r.code}>{r.province}</Option>
                    ))}
                </Select>
            </Col>
            <Col span={8}>
                <Select placeholder="市" value={location.city} onChange={async value => {
                    location.city = value
                    loadDistricts(value)
                    onChange && onChange(location)
                }}>
                    {cities.map(r => (
                        <Option key={r.code} value={r.code}>{r.city}</Option>
                    ))}
                </Select>
            </Col>
            <Col span={8}>
                <Select placeholder="区/县" value={location.district} onChange={async value => {
                    location.district = value
                    onChange && onChange(location)
                }}>
                    {districts.map(r => (
                        <Option key={r.code} value={r.code}>{r.district}</Option>
                    ))}
                </Select>
            </Col>
        </Row>
    )
}

export default SelectLocation
