/**
 * HoServer API Server Ver 1.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/
const Prometheus = require('prom-client')

Prometheus.collectDefaultMetrics({
    prefix: 'hos_'
})

const allCount = new Prometheus.Counter({
    name: 'hos_total_call_count',
    help: '总调用次数'
})

const successCount = new Prometheus.Counter({
    name: 'hos_success_call_count',
    help: '成功调用次数'
})

const unSuccessCount = new Prometheus.Counter({
    name: 'hos_unsuccess_call_count',
    help: '未成功调用次数'
})

const exceptionCount = new Prometheus.Counter({
    name: 'hos_exception_call_count',
    help: '异常调用次数'
})

const rtGauge = new Prometheus.Gauge({ name: 'hos_response_time', help: '响应时间(ms)' })
// gauge.set(10)

const concurrentMap = {}
const coGauge = new Prometheus.Gauge({ name: 'hos_concurrent', help: '并发数' })
coGauge.set(1) // 默认 1 路

// const histogram = new Prometheus.Histogram({
//     name: 'hos_max_concurrent',
//     help: '成功率',
//     buckets: [1, 2, 3, 5, 10, 15, 20, 30, 50, 100, 200, 300]
// })
//
// histogram.observe(10)

/**
 * this middleware is used to record the Api execute performance statistics,
 * and other metrics for prometheus
 */

const init = async app => {
    // prettier-ignore
    app.get('/metrics', (req, res) => {
        res.set('Content-Type', Prometheus.register.contentType)
        res.end(Prometheus.register.metrics())
    })
}

const before = async context => {
    allCount.inc()
    coGauge.inc()
    concurrentMap[context.apiRoute.api.id] = 1

    context.extraInfo.perf = {
        start: new Date()
    }
}

const after = async context => {
    if (context.extraInfo.perf && context.extraInfo.perf.start) {
        const end = new Date()
        const duration = end - context.extraInfo.perf.start

        context.extraInfo.perf.dur = duration
        rtGauge.set(duration)
    }
}

const resetConcurrentGauge = context => {
    if (concurrentMap[context.apiRoute.api.id]) {
        delete concurrentMap[context.apiRoute.api.id]
        coGauge.dec()
    }

    if (!context.error) {
        successCount.inc()
    } else if (context.error instanceof Error || context.error instanceof TypeError) {
        exceptionCount.inc()
    } else {
        unSuccessCount.inc()
    }
}

module.exports = {
    init: init,
    before: before,
    after: after,
    resetConcurrentGauge
}
