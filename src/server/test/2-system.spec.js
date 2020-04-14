/* eslint-disable standard/no-callback-literal,handle-callback-err */
const assert = require('assert')
const express = require('express')
const fileUtils = require('../framework/utils/file-utils')
const path = require('path')
const request = require('supertest')

const app = express()

const getTestData = testCase => {
    const jsonObj = fileUtils.getJsonFile(path.join(__dirname, 'test_data', `${testCase}.json`))
    return jsonObj
}

describe('2: 系统接口', () => {
    // 1005 删掉 1 条, 还剩 4 条记录
    it('2001: 获取列表', done => {
        request(app)
            .get(`/api/v1/test/tests?page_size=2&page=2`)
            .end((err, res) => {
                if (err) return done(err)

                // const data = res.body.data
                // if (!res.body.code == 200) throw Error('获取列表失败')
                //
                // done()
            })
    })
})
