const express = require('express')
const request = require('supertest')

const app = express()

describe('2: 系统接口', () => {
    // 1005 删掉 1 条, 还剩 4 条记录
    it('2001: 获取列表', (done) => {
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
