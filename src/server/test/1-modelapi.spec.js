/* eslint-disable standard/no-callback-literal,handle-callback-err */
const _ = require('lodash')
const assert = require('assert')
const config = require('config')
const express = require('express')
const fileUtils = require('../framework/utils/file-utils')
const moment = require('moment')
const mongoose = require('mongoose')
const path = require('path')
const request = require('supertest')
const startServer = require('./env/test-serever')
const winston = require('../framework/utils/winston-log')

global.PAGE_SIZE = 10
global.APP_PATH = process.cwd()
global.logger = winston.getLogger()

const app = express()

const getTestData = testCase => {
    const jsonObj = fileUtils.getJsonFile(path.join(__dirname, 'test_data', `${testCase}.json`))
    return jsonObj
}

before(async () => {
    await startServer(app)
})

// start test
describe('1: 对象默认接口', () => {
    let newCreateId1 = ''
    let newCreateId2 = ''
    let newCreateId3 = ''
    let newCreateId4 = ''

    const arrayPropId1 = '5e7d3b8c9a13b0a17f29975c'
    const arrayPropId2 = '5e7b32820872f0498cd46256'
    const arraySubPropId1 = '5e7b32820872f0498cd46257'

    // 共插入 5 条记录做测试
    it('1001: 创建新纪录', done => {
        // 先手工插入 2 条
        const { Test } = require('../framework/models')
        for (let i = 0; i < 2; i++) {
            const jsonObj = getTestData('1001')
            jsonObj.id = mongoose.Types.ObjectId()
            Test.create(jsonObj)
        }

        request(app)
            .post('/api/v1/test/tests')
            .send(getTestData('1001'))
            .end((err, res) => {
                if (err) return done(err)

                newCreateId1 = res.body.data
                assert(res.body.code == 200 && newCreateId1.length == 24)

                request(app)
                    .post('/api/v1/test/tests')
                    .send(getTestData('1001'))
                    .end((err, res) => {
                        if (err) return done(err)

                        newCreateId2 = res.body.data
                        assert(res.body.code == 200 && newCreateId2.length == 24)

                        request(app)
                            .post('/api/v1/test/tests')
                            .send(getTestData('1001'))
                            .end((err, res) => {
                                if (err) return done(err)

                                newCreateId3 = res.body.data
                                assert(res.body.code == 200 && newCreateId3.length == 24)
                                done()
                            })
                    })
            })
    })

    it('1002: 获取详情', done => {
        request(app)
            .get(`/api/v1/test/tests/${newCreateId3}`)
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                delete data._id
                delete data.created_at
                delete data.updated_at
                delete data.p2_rel._id
                delete data.p2_rel.avatar
                _.unset(data, ['p5', 0, 's2', 0, 'ss3'])
                assert.deepEqual(data, {
                    p4: {
                        s1: 's1 原始值'
                    },
                    p6: {
                        t2: ['5d62946590250a0d49ee4005', '5d62946590250a0d49ee4003', '5d62946590250a0d49ee4004'],
                        t3: [
                            {
                                ts3: {
                                    ts31: 'ts31 原始值1',
                                    ts32: 'ts32 原始值1'
                                },
                                ts2: 1,
                                ts1: '5e508b808e27704e8132fd08',
                                id: '5e7b32820872f0498cd46257'
                            },
                            {
                                ts3: {
                                    ts31: 'ts31 原始值2',
                                    ts32: 'ts32 原始值2'
                                },
                                ts2: 2,
                                ts1: '6e508b808e27704e8132fd08',
                                id: '6e7b32820872f0498cd46257'
                            }
                        ]
                    },
                    p1: 'key1',
                    p2: '5d62946590250a0d49ee4003',
                    p5: [
                        {
                            s2: [
                                {
                                    ss2: [33, 76],
                                    ss1: 'ss1 原始值',
                                    id: '5e7b32820872f0498cd46255'
                                }
                            ],
                            s1: 'key1',
                            id: '5e7b32820872f0498cd46256'
                        }
                    ],
                    id: newCreateId3,
                    p1_rel: 'value1',
                    p2_rel: {
                        user_name: 'admin',
                        nick_name: '超级管理员',
                        user_id: '5d62946590250a0d49ee4003'
                    }
                })
                done()
            })
    })

    it('1003: 修改合并', done => {
        request(app)
            .post(`/api/v1/test/tests/${newCreateId1}`)
            .send({
                p4: {
                    s1: 's1 修改值1'
                },
                p6: {
                    t3: [
                        {
                            id: '5e7b32820872f0498cd46257',
                            ts3: {
                                ts31: 'ts31 修改值1'
                            }
                        }
                    ]
                },
                replace: false
            })
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                assert(res.body.code == 200 && data === 'success')

                request(app)
                    .get(`/api/v1/test/tests/${newCreateId1}`)
                    .end((err, res) => {
                        if (err) return done(err)

                        const data = res.body.data
                        delete data._id
                        delete data.created_at
                        delete data.updated_at
                        delete data.p2_rel
                        delete data.p5
                        assert.deepEqual(data, {
                            id: newCreateId1,
                            p1: 'key1',
                            p1_rel: 'value1',
                            p2: '5d62946590250a0d49ee4003',
                            p4: {
                                s1: 's1 修改值1'
                            },
                            p6: {
                                t2: ['5d62946590250a0d49ee4005', '5d62946590250a0d49ee4003', '5d62946590250a0d49ee4004'],
                                t3: [
                                    {
                                        id: '5e7b32820872f0498cd46257',
                                        ts2: 1,
                                        ts3: {
                                            ts31: 'ts31 修改值1'
                                        }
                                    }
                                ]
                            }
                        })
                        done()
                    })
            })
    })

    it('1004: 修改替换', done => {
        request(app)
            .post(`/api/v1/test/tests/${newCreateId2}`)
            .send({
                p4: {
                    s1: 's1 修改值2'
                },
                p5: [
                    {
                        id: '5e7b32820872f0498cd46256',
                        s1: 'key2'
                    }
                ],
                replace: true
            })
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                assert(res.body.code == 200 && data === 'success')

                request(app)
                    .get(`/api/v1/test/tests/${newCreateId2}`)
                    .end((err, res) => {
                        if (err) return done(err)

                        const data = res.body.data
                        assert.deepEqual(data.p4, {
                            s1: 's1 修改值2'
                        })
                        assert.deepEqual(data.p5, [
                            {
                                id: '5e7b32820872f0498cd46256',
                                s1: 'key2',
                                s2: []
                            }
                        ])
                        done()
                    })
            })
    })

    it('1005: 删除', done => {
        request(app)
            .delete(`/api/v1/test/tests/${newCreateId3}`)
            .end((err, res) => {
                if (err) return done(err)

                assert(res.body.code == 200)
                request(app)
                    .get(`/api/v1/test/tests/${newCreateId3}`)
                    .end((err, res) => {
                        if (err) return done(err)

                        assert(res.body.code == 1003)
                        done()
                    })
            })
    })

    // 1005 删掉 1 条, 还剩 4 条记录
    it('1006: 获取列表', done => {
        request(app)
            .get(`/api/v1/test/tests?page_size=2&page=2`)
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                if (!res.body.code == 200) throw Error('获取列表失败')

                // 验证分页
                assert.deepEqual(data.pagination, {
                    total: 4,
                    pageSize: 2,
                    current: 2,
                    pages: 2,
                    prev: 1
                })

                // 同时验证 1003, 1004 修改结果
                const record1 = data.list.find(r => r.id === newCreateId1)
                const record2 = data.list.find(r => r.id === newCreateId2)
                if (!(record1 || record2)) {
                    throw Error('创建失败')
                }

                assert(record1.p4 == undefined) // 默认不输出
                assert.deepEqual(record1.p6, {
                    t2: ['5d62946590250a0d49ee4005', '5d62946590250a0d49ee4003', '5d62946590250a0d49ee4004'],
                    t3: [
                        {
                            id: '5e7b32820872f0498cd46257',
                            ts2: 1,
                            ts3: {
                                ts31: 'ts31 修改值1'
                            }
                        }
                    ]
                })

                // assert.deepEqual(record2.p4, {
                //     s1: 's1 修改值2'
                // })
                assert.deepEqual(record2.p5, [
                    {
                        id: '5e7b32820872f0498cd46256',
                        s1: 'key2',
                        s2: []
                    }
                ])

                done()
            })
    })

    it('1007: 批量更新多个记录指定属性', done => {
        request(app)
            .post(`/api/v1/test/tests/batch`)
            .send({
                id: [newCreateId1, newCreateId2],
                data: [
                    {
                        id: newCreateId3,
                        p6: {
                            t3: [
                                {
                                    id: '5e7b32820872f0498cd46257',
                                    ts3: {
                                        ts31: 'ts31 批量修改值1'
                                    }
                                }
                            ]
                        }
                    }
                ]
            })
            .end((err, res) => {
                if (err) return done(err)
                assert(res.body.code == 200)

                // 查询结果，并指定字段只输出 id 和 p6
                request(app)
                    .get(`/api/v1/test/tests?id=${newCreateId1},${newCreateId2}&select=id,p6&sort=created_at`)
                    .end((err, res) => {
                        if (err) return done(err)

                        res.body.data.list.forEach(r => delete r._id)
                        assert.deepEqual(res.body.data.list, [
                            {
                                p6: {
                                    t3: [
                                        {
                                            ts3: {
                                                ts31: 'ts31 批量修改值1'
                                            },
                                            id: '5e7b32820872f0498cd46257'
                                        }
                                    ]
                                },
                                id: newCreateId1
                            },
                            {
                                p6: {
                                    t3: [
                                        {
                                            ts3: {
                                                ts31: 'ts31 批量修改值1'
                                            },
                                            id: '5e7b32820872f0498cd46257'
                                        }
                                    ]
                                },
                                id: newCreateId2
                            }
                        ])
                        done()
                    })
            })
    })

    it('1008: 批量更新多个记录', done => {
        request(app)
            .post(`/api/v1/test/tests/batch`)
            .send({
                data: [
                    {
                        id: newCreateId1,
                        p6: {
                            t3: [
                                {
                                    id: '5e7b32820872f0498cd46257',
                                    ts3: {
                                        ts31: 'ts31 批量修改值2'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        id: newCreateId2,
                        p6: {
                            t3: [
                                {
                                    id: '5e7b32820872f0498cd46257',
                                    ts3: {
                                        ts31: 'ts31 批量修改值3'
                                    }
                                }
                            ]
                        }
                    }
                ]
            })
            .end((err, res) => {
                if (err) return done(err)
                assert(res.body.code == 200)

                // 查询结果，并指定字段只输出 id 和 p6
                request(app)
                    .get(`/api/v1/test/tests?id=${newCreateId1},${newCreateId2}&select=id,p6&sort=created_at`)
                    .end((err, res) => {
                        if (err) return done(err)

                        res.body.data.list.forEach(r => delete r._id)
                        assert.deepEqual(res.body.data.list, [
                            {
                                p6: {
                                    t3: [
                                        {
                                            ts3: {
                                                ts31: 'ts31 批量修改值2'
                                            },
                                            id: '5e7b32820872f0498cd46257'
                                        }
                                    ]
                                },
                                id: newCreateId1
                            },
                            {
                                p6: {
                                    t3: [
                                        {
                                            ts3: {
                                                ts31: 'ts31 批量修改值3'
                                            },
                                            id: '5e7b32820872f0498cd46257'
                                        }
                                    ]
                                },
                                id: newCreateId2
                            }
                        ])
                        done()
                    })
            })
    })

    it('1009: 批量删除', done => {
        request(app)
            .delete(`/api/v1/test/tests/batch`)
            .send({ id: [newCreateId1, newCreateId2] })
            .end((err, res) => {
                if (err) return done(err)

                assert(res.body.code == 200)
                request(app)
                    .get(`/api/v1/test/tests?id=${newCreateId1},${newCreateId2}`)
                    .end((err, res) => {
                        if (err) return done(err)
                        assert(res.body.data.list.length === 0)
                        done()
                    })
            })
    })

    // 操作子对象数组
    it('1020: 创建子数组对象', done => {
        request(app)
            .post('/api/v1/test/tests')
            .send(getTestData('1001'))
            .end((err, res) => {
                if (err) return done(err)

                newCreateId4 = res.body.data
                assert(res.body.code == 200 && newCreateId3.length == 24)

                request(app)
                    .post(`/api/v1/test/tests/${newCreateId4}/p5`)
                    .send({
                        id: arrayPropId1,
                        s1: 'key1',
                        s2: [
                            {
                                ss1: '子属性测试1',
                                ss2: [1, 2],
                                id: '5e7c13ecbc1503719aa22b40'
                            }
                        ]
                    })
                    .end((err, res) => {
                        const data = res.body.data
                        assert(res.body.code == 200 && data === arrayPropId1)

                        request(app)
                            .get(`/api/v1/test/tests/${newCreateId4}/p5/${arrayPropId1}`)
                            .end((err, res) => {
                                if (err) return done(err)

                                const data = res.body.data
                                _.unset(data, ['s2', 0, 'ss3'])
                                assert.deepEqual(data, {
                                    id: arrayPropId1,
                                    s1: 'key1',
                                    s2: [
                                        {
                                            ss1: '子属性测试1',
                                            ss2: [1, 2],
                                            id: '5e7c13ecbc1503719aa22b40'
                                        }
                                    ]
                                })
                                done()
                            })
                    })
            })
    })

    it('1021: 修改子数组对象', done => {
        request(app)
            .post(`/api/v1/test/tests/${newCreateId4}/p5/${arrayPropId1}`)
            .send({
                s1: 'key1',
                s2: [
                    {
                        ss1: '子属性测试1-修改值1',
                        id: '5e7c13ecbc1503719aa22b40'
                    }
                ],
                replace: true
            })
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                assert(res.body.code == 200 && data === 'success')
                done()
            })
    })

    it('1022: 获取子数组详情', done => {
        request(app)
            .get(`/api/v1/test/tests/${newCreateId4}/p5/${arrayPropId1}`)
            .end((err, res) => {
                if (err) return done(err)

                const createTime = moment(_.get(res.body, ['data', 's2', 0, 'ss3']))
                assert(createTime.isValid())

                _.unset(res, ['body', 'data', 's2', 0, 'ss3'])
                assert.deepEqual(res.body.data, {
                    id: arrayPropId1,
                    s1: 'key1',
                    s2: [
                        {
                            ss1: '子属性测试1-修改值1',
                            ss2: [],
                            id: '5e7c13ecbc1503719aa22b40'
                        }
                    ]
                })
                done()
            })
    })

    it('1023: 删除子数组对象', done => {
        request(app)
            .delete(`/api/v1/test/tests/${newCreateId4}/p5/${arrayPropId1}`)
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                assert(res.body.code == 200 && data === 'success')

                request(app)
                    .get(`/api/v1/test/tests/${newCreateId4}/p5/${arrayPropId1}`)
                    .end((err, res) => {
                        if (err) return done(err)

                        assert(res.body.code === 1003)
                        done()
                    })
            })
    })

    it('1024: 获取子数组对象列表', done => {
        request(app)
            .get(`/api/v1/test/tests/${newCreateId4}/p5`)
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                _.unset(data, [0, 's2', 0, 'ss3'])
                assert.deepEqual(data, [
                    {
                        id: '5e7b32820872f0498cd46256',
                        s1: 'key1',
                        s2: [
                            {
                                id: '5e7b32820872f0498cd46255',
                                ss1: 'ss1 原始值',
                                ss2: [33, 76]
                            }
                        ]
                    }
                ])
                done()
            })
    })

    // 操作子对象
    it('1041: 修改子对象属性', done => {
        request(app)
            .post(`/api/v1/test/tests/${newCreateId4}/p6/t3/${arraySubPropId1}/ts3`)
            .send({
                ts31: '数组子对象修改值 1',
                ts32: '数组子对象修改值 2',
                replace: false
            })
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                assert(res.body.code == 200 && data === 'success')
                done()
            })
    })

    it('1042: 获取子对象详情', done => {
        request(app)
            .get(`/api/v1/test/tests/${newCreateId4}/p6/t3/${arraySubPropId1}/ts3`)
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                assert.deepEqual(data, {
                    ts31: '数组子对象修改值 1',
                    ts32: '数组子对象修改值 2'
                })
                done()
            })
    })
})

after(async () => {
    // start a test server to manual verify some case
    const port = process.env.PORT || config.get('server.port')
    app.listen(port, () => {
        console.log('========== HoServer API Test Server (v1.0) started on port ' + port + ' ==========')
        console.log('NODE_ENV: ' + process.env.NODE_ENV)
    })
})
