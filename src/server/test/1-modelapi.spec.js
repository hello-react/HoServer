/* eslint-disable handle-callback-err,node/handle-callback-err */
const _ = require('lodash')
const assert = require('assert')
const express = require('express')
const moment = require('moment')
const mongoose = require('mongoose')
const path = require('path')
const request = require('supertest')
const startServer = require('./env/test-serever')
const { fileUtils } = require('@hosoft/restful-api-framework/utils')

global.PAGE_SIZE = 10
global.APP_PATH = process.cwd()

const app = express()

const getTestData = (testCase) => {
    const jsonObj = fileUtils.getJsonFile(path.join(__dirname, 'test_data', `${testCase}.json`))
    return jsonObj
}

before(async () => {
    await startServer(app)
})

// start test
describe('1: model default api', () => {
    let newCreateId1 = '5f519864de7ae31c2cb7a739'
    let newCreateId2 = '5f519864de7ae31c2cb7a73a'
    let newCreateId3 = ''
    let newCreateId4 = ''

    const arrayPropId1 = '5e7d3b8c9a13b0a17f29975c'
    const arraySubPropId1 = '5e7b32820872f0498cd46257'

    // total insert 5 records for test
    it('1001: create new record', (done) => {
        // first manual create 2 records
        const { Test } = require('@hosoft/restful-api-framework/models')
        const jsonObj = getTestData('1001')
        jsonObj.id = mongoose.Types.ObjectId(newCreateId1)
        Test.create(jsonObj)
        jsonObj.id = mongoose.Types.ObjectId(newCreateId2)
        Test.create(jsonObj)

        request(app)
            .post('/api/v1/test/tests')
            .send(getTestData('1001'))
            .end((err, res) => {
                if (err) return done(err)

                newCreateId1 = _.get(res.body, ['data', 'id'])
                assert(res.body.code == 200 && newCreateId1.length == 24)

                request(app)
                    .post('/api/v1/test/tests')
                    .send(getTestData('1001'))
                    .end((err, res) => {
                        if (err) return done(err)

                        newCreateId2 = _.get(res.body, ['data', 'id'])
                        assert(res.body.code == 200 && newCreateId2.length == 24)

                        request(app)
                            .post('/api/v1/test/tests')
                            .send(getTestData('1001'))
                            .end((err, res) => {
                                if (err) return done(err)

                                newCreateId3 = _.get(res.body, ['data', 'id'])
                                assert(res.body.code == 200 && newCreateId3.length == 24)
                                done()
                            })
                    })
            })
    })

    it('1002: get record detail', (done) => {
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
                        s1: 's1 original value'
                    },
                    p6: {
                        t2: ['5d62946590250a0d49ee4005', '5d62946590250a0d49ee4003', '5d62946590250a0d49ee4004'],
                        t3: [
                            {
                                id: '5e7b32820872f0498cd46257',
                                ts3: {
                                    ts31: 'ts31 original value1',
                                    ts32: 'ts32 original value1'
                                },
                                ts2: 1,
                                ts1: '5e508b808e27704e8132fd08'
                            },
                            {
                                id: '6e7b32820872f0498cd46257',
                                ts3: {
                                    ts31: 'ts31 original value2',
                                    ts32: 'ts32 original value2'
                                },
                                ts2: 2,
                                ts1: '6e508b808e27704e8132fd08'
                            }
                        ]
                    },
                    p1: 'key1',
                    p2: '5d62946590250a0d49ee4003',
                    p5: [
                        {
                            id: '5e7b32820872f0498cd46256',
                            s2: [
                                {
                                    ss2: [33, 76],
                                    ss1: 'ss1 original value'
                                }
                            ],
                            s1: 'key1',
                            s1_rel: 'value1'
                        }
                    ],
                    id: newCreateId3,
                    p1_rel: 'value1',
                    p2_rel: {
                        user_name: 'admin',
                        nick_name: '管理员',
                        user_id: '5d62946590250a0d49ee4003'
                    }
                })
                done()
            })
    })

    it('1003: update (merge only)', (done) => {
        request(app)
            .post(`/api/v1/test/tests/${newCreateId1}`)
            .send({
                p4: {
                    s1: 's1 modified value 1'
                },
                p6: {
                    t3: [
                        {
                            id: '5e7b32820872f0498cd46257',
                            ts2: 1,
                            ts3: {
                                ts31: 'ts31 modified value 1'
                            }
                        }
                    ]
                },
                replace: false
            })
            .end((err, res) => {
                if (err) return done(err)

                const nModified = _.get(res.body, ['data', 'nModified'])
                assert(res.body.code == 200 && nModified === 1)

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
                                s1: 's1 modified value 1'
                            },
                            p6: {
                                // t2: [
                                //     '5d62946590250a0d49ee4005',
                                //     '5d62946590250a0d49ee4003',
                                //     '5d62946590250a0d49ee4004'
                                // ],
                                t3: [
                                    {
                                        id: '5e7b32820872f0498cd46257',
                                        ts2: 1,
                                        ts3: {
                                            ts31: 'ts31 modified value 1'
                                        }
                                    }
                                ]
                            }
                        })
                        done()
                    })
            })
    })

    it('1004: update (replace)', (done) => {
        request(app)
            .post(`/api/v1/test/tests/${newCreateId2}`)
            .send({
                p2: '5d62946590250a0d49ee4003',
                p4: {
                    s1: 's1 modified value 2'
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

                const id = _.get(res.body, ['data', 'id'])
                assert(res.body.code == 200 && id === newCreateId2)

                request(app)
                    .get(`/api/v1/test/tests/${newCreateId2}`)
                    .end((err, res) => {
                        if (err) return done(err)

                        const data = res.body.data
                        assert.deepEqual(data.p4, {
                            s1: 's1 modified value 2'
                        })

                        if ((_.get(data, ['p5', 0, 's2']) || []).length === 0) {
                            _.unset(data, ['p5', 0, 's2'])
                        }
                        assert.deepEqual(data.p5, [
                            {
                                id: '5e7b32820872f0498cd46256',
                                s1: 'key2',
                                s1_rel: 'value2'
                            }
                        ])
                        done()
                    })
            })
    })

    it('1005: delete', (done) => {
        request(app)
            .delete(`/api/v1/test/tests/${newCreateId3}`)
            .end((err, res) => {
                if (err) return done(err)

                const id = _.get(res.body, ['data', 'id'])
                assert(res.body.code == 200 && id === newCreateId3)
                request(app)
                    .get(`/api/v1/test/tests/${newCreateId3}`)
                    .end((err, res) => {
                        if (err) return done(err)

                        assert(res.body.data == null)
                        done()
                    })
            })
    })

    // 1005 delete 1, 4 records left
    it('1006: list records', (done) => {
        request(app)
            .get(`/api/v1/test/tests?page_size=2&page=2`)
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                if (!res.body.code == 200) throw Error('get records list failed')

                // validate pagination
                assert.deepEqual(data.pagination, {
                    total: 4,
                    pageSize: 2,
                    current: 2,
                    pages: 2,
                    prev: 1
                })

                // also verify 1003, 1004 update result
                const record1 = data.list.find((r) => r.id === newCreateId1)
                const record2 = data.list.find((r) => r.id === newCreateId2)
                if (!(record1 || record2)) {
                    throw Error('create failed!')
                }

                assert(record1.p4 == undefined) // default not output
                assert.deepEqual(record1.p6, {
                    // t2: ['5d62946590250a0d49ee4005', '5d62946590250a0d49ee4003', '5d62946590250a0d49ee4004'],
                    t3: [
                        {
                            id: '5e7b32820872f0498cd46257',
                            ts2: 1,
                            ts3: {
                                ts31: 'ts31 modified value 1'
                            }
                        }
                    ]
                })

                // assert.deepEqual(record2.p4, {
                //     s1: 's1 modified value 2'
                // })
                if ((_.get(record2, ['p5', 0, 's2']) || []).length === 0) {
                    _.unset(record2, ['p5', 0, 's2'])
                }

                assert.deepEqual(record2.p5, [
                    {
                        id: '5e7b32820872f0498cd46256',
                        s1: 'key2',
                        s1_rel: 'value2'
                    }
                ])

                done()
            })
    })

    it('1007: batch update multiple records with same data', (done) => {
        request(app)
            .post(`/api/v1/test/tests/batch`)
            .send({
                id: [newCreateId1, newCreateId2],
                data: [
                    {
                        // id: newCreateId3,
                        p6: {
                            t3: [
                                {
                                    id: '5e7b32820872f0498cd46257',
                                    ts2: 1,
                                    ts3: {
                                        ts31: 'ts31 batch modified value 1'
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

                // query result，only output id and p6
                request(app)
                    .get(`/api/v1/test/tests?id=${newCreateId1},${newCreateId2}&select=id,p6&sort=created_at`)
                    .end((err, res) => {
                        if (err) return done(err)

                        res.body.data.list.forEach((r) => delete r._id)
                        assert.deepEqual(res.body.data.list, [
                            {
                                p6: {
                                    t3: [
                                        {
                                            ts3: {
                                                ts31: 'ts31 batch modified value 1'
                                            },
                                            ts2: 1,
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
                                                ts31: 'ts31 batch modified value 1'
                                            },
                                            ts2: 1,
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

    it('1008: batch update records', (done) => {
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
                                        ts31: 'ts31 batch modified value 2'
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
                                        ts31: 'ts31 batch modified value 3'
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

                // query result，and set only output id and p6
                request(app)
                    .get(`/api/v1/test/tests?id=${newCreateId1},${newCreateId2}&select=id,p6&sort=created_at`)
                    .end((err, res) => {
                        if (err) return done(err)

                        res.body.data.list.forEach((r) => delete r._id)
                        assert.deepEqual(res.body.data.list, [
                            {
                                p6: {
                                    t3: [
                                        {
                                            ts3: {
                                                ts31: 'ts31 batch modified value 2'
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
                                                ts31: 'ts31 batch modified value 3'
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

    it('1009: batch delete', (done) => {
        request(app)
            .delete(`/api/v1/test/tests/batch`)
            .send({ id: [newCreateId1, newCreateId2] })
            .end((err, res) => {
                if (err) return done(err)

                assert(res.body.code == 200 && _.get(res.body, ['data', 'deletedCount']) == 2)
                request(app)
                    .get(`/api/v1/test/tests?id=${newCreateId1},${newCreateId2}`)
                    .end((err, res) => {
                        if (err) return done(err)
                        assert(res.body.data.list.length === 0)
                        done()
                    })
            })
    })

    // operations for sub array model
    it('1020: create sub array record', (done) => {
        request(app)
            .post('/api/v1/test/tests')
            .send(getTestData('1001'))
            .end((err, res) => {
                if (err) return done(err)

                newCreateId4 = _.get(res.body, ['data', 'id'])
                assert(res.body.code == 200 && newCreateId4.length == 24)

                request(app)
                    .post(`/api/v1/test/tests/${newCreateId4}/p5`)
                    .send({
                        id: arrayPropId1,
                        s1: 'key1',
                        s2: [
                            {
                                ss1: 'sub prop test 1',
                                ss2: [1, 2]
                            }
                        ]
                    })
                    .end((err, res) => {
                        const data = res.body.data
                        assert(res.body.code == 200 && data['p5.id'] === arrayPropId1)

                        request(app)
                            .get(`/api/v1/test/tests/${newCreateId4}/p5/${arrayPropId1}`)
                            .end((err, res) => {
                                if (err) return done(err)

                                const data = res.body.data
                                _.unset(data, ['s2', 0, 'ss3'])
                                assert.deepEqual(data, {
                                    id: arrayPropId1,
                                    s1: 'key1',
                                    s1_rel: 'value1',
                                    s2: [
                                        {
                                            ss1: 'sub prop test 1',
                                            ss2: [1, 2]
                                        }
                                    ]
                                })
                                done()
                            })
                    })
            })
    })

    it('1021: modify sub array record (replace)', (done) => {
        request(app)
            .post(`/api/v1/test/tests/${newCreateId4}/p5/${arrayPropId1}`)
            .send({
                s1: 'key1',
                s2: [
                    {
                        ss1: 'sub prop test 1-modified value 1',
                        ss2: []
                    }
                ],
                replace: true
            })
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                assert(res.body.code == 200 && data.id === newCreateId4 && data['p5.id'] === arrayPropId1)
                done()
            })
    })

    it('1022: get sub array record detail', (done) => {
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
                    s1_rel: 'value1',
                    s2: [
                        {
                            ss1: 'sub prop test 1-modified value 1',
                            ss2: []
                        }
                    ]
                })
                done()
            })
    })

    it('1023: delete sub array record', (done) => {
        request(app)
            .delete(`/api/v1/test/tests/${newCreateId4}/p5/${arrayPropId1}`)
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                assert(res.body.code == 200 && data.id === newCreateId4 && data['p5.id'] === arrayPropId1)

                request(app)
                    .get(`/api/v1/test/tests/${newCreateId4}/p5/${arrayPropId1}`)
                    .end((err, res) => {
                        if (err) return done(err)

                        assert(res.body.data == null)
                        done()
                    })
            })
    })

    it('1024: get sub array records list', (done) => {
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
                        s1_rel: 'value1',
                        s2: [
                            {
                                ss1: 'ss1 original value',
                                ss2: [33, 76]
                            }
                        ]
                    }
                ])
                done()
            })
    })

    it('1041: modify sub array record (merge)', (done) => {
        request(app)
            .post(`/api/v1/test/tests/${newCreateId4}/p6/t3/${arraySubPropId1}/ts3`)
            .send({
                ts31: 'array sub record modified value 1',
                ts32: 'array sub record modified value 2',
                replace: false
            })
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                assert(res.body.code == 200 && data.id === newCreateId4)
                done()
            })
    })

    it('1042: get sub object detail', (done) => {
        request(app)
            .get(`/api/v1/test/tests/${newCreateId4}/p6/t3/${arraySubPropId1}/ts3`)
            .end((err, res) => {
                if (err) return done(err)

                const data = res.body.data
                assert.deepEqual(data, {
                    ts31: 'array sub record modified value 1',
                    ts32: 'array sub record modified value 2'
                })
                done()
            })
    })
})

after(async () => {})
