const Bootstrap = require('@hosoft/restful-api-framework')()

module.exports = async app => {
    const config = require('@hosoft/config')
    const port = process.env.PORT || config.get('server.port')

    return new Promise((resolve, reject) => {
        // prettier-ignore
        Bootstrap.startServer(app, port, async (status, container) => {
            if (status === 'beforeStart') {
                container.setHook('initialize', () => {
                    container.controllers.test = {
                        name: 'Test',
                        category_name: 'test',
                        instance: require('./TestController')
                    }
                })

                return
            }

            // clear test db
            const {Test} = require('@hosoft/restful-api-framework/models')
            await Test.deleteMany({}, true)

            console.log('Test app started!')
            resolve('success')
        })
    })
}
