/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2018/11/15
 **/

const Bootstrap = require('@hosoft/restful-api-framework')(__dirname)
const config = require('@hosoft/config')

const port = process.env.PORT || config.get('server.port')

// prettier-ignore
Bootstrap.startServer(null, port, async (status, container) => {
    if (status === 'beforeStart') {
        // do something before start
    } else if (status === 'startSucess') {
        console.info('\n _   _        ____                                \n' +
            '| | | |  ___ / ___|   ___  _ __ __   __ ___  _ __ \n' +
            '| |_| | / _ \\\\___ \\  / _ \\| \'__|\\ \\ / // _ \\| \'__|\n' +
            '|  _  || (_) |___) ||  __/| |    \\ V /|  __/| |   \n' +
            '|_| |_| \\___/|____/  \\___||_|     \\_/  \\___||_|   \n\n' +
            `PORT: ${port}\n` +
            `API VERSION: ${config.get('server.version')}\n` +
            `NODE_ENV: ${process.env.NODE_ENV}\n`
        )
    }
})
