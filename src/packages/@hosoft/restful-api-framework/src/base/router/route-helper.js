/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/18
 **/

const _ = require('lodash')
const BaseHelper = require('../helpers/base-helper')
const PromMetrics = require('../../middlewares/prom-metrics')

/**
 * output result
 */
const outputResult = (res) => {
    const context = res._context
    if (context.finished || res.finished) {
        return logger.info('api already output the result: ' + _.get(context, ['apiRoute', 'api', 'path']))
    }

    res.charset = 'utf-8'

    if (!context.error) {
        return res.json({ code: 200, data: context.result, message: null, extra: context.extraInfo })
    }

    const err = context.error
    if (err instanceof Error || err instanceof TypeError) {
        res.status(200)
        res.json({
            code: 400,
            data: null,
            message: err.message,
            extra: context.extraInfo,
            stack: err.stack
        })
    } else if (typeof err === 'string') {
        res.json({
            code: 500,
            data: '',
            message: err,
            extra: context.extraInfo
        })
    } else {
        const { code, message } = err
        err.data = err.data || null

        res.json({
            code: code,
            data: err.data,
            message: message,
            extra: context.extraInfo
        })
    }
}

// mixin for DRY
module.exports = (promise, res, next) => {
    promise
        .then(async (data) => {
            // function directly called by manual route config
            const context = res._context
            if (!context.result && data) {
                context.setResult(data)
            }

            // result hook
            try {
                await BaseHelper.getContainer().executeHook('afterProcess', context, context.apiRoute.api)
            } catch (err) {
                logger.error(
                    `afterProcess executeHook error: ${typeof err === 'string' ? err : err.stack || err.message}`
                )
                context.error = err
            }

            // after execute
            try {
                await BaseHelper.getContainer().afterExecute(context)
            } catch (err) {
                context.error = err
                logger.error(`afterExecute error: ${typeof err === 'string' ? err : err.stack || err.message}`)
            }

            // write to http response
            outputResult(res)
            PromMetrics.resetConcurrentGauge(context)
        })
        .catch((err) => {
            logger.error(`route helper exception: ${typeof err === 'string' ? err : err.stack || err.message}`)

            const context = res._context
            context.error = err

            outputResult(res)
            PromMetrics.resetConcurrentGauge(context)
        })
}
