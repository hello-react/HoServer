/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2021/08/15
**/
const config = require('@hosoft/config')
const session = require('express-session')
const SSOService = require('./service')
const CAService = require('./service/ca-service')

/**
 * Plugin for SSO support
 */
class SSOPlugin {
    async init(container, router, app, pluginManager) {
        // for SSO we must enable session cookie
        this.enableSession(app)

        // for client app
        router.get('/sso/check_authenticated', tp('checkAuthenticated'), (ctx) => SSOService.checkAuthenticated(ctx), { open: true })
        router.get('/sso/app_login', tp('appLogin'), (ctx) => SSOService.autoLogin(ctx), { open: true })

        const ssoMode = config.get('plugins.sso.mode')
        logger.info('sso plugin working mode: ' + ssoMode)

        // for CA server
        if (ssoMode === 'ca-server') {
            container.setHook('afterLoginSuccess', (context, userInfo) => CAService.afterLoginSuccess(userInfo, context))
            container.setHook('afterLogoutSuccess', (context) => CAService.afterLogoutSuccess(context))

            router.get("/sso/ca_login", tp('caLogin'), (ctx) => CAService.caLogin(ctx), { open: true });
            router.get("/sso/verify_token", tp('verifyToken'), (ctx) => CAService.verifySsoToken(ctx.req), { open: true });
        }
    }

    enableSession(app) {
        const appName = config.get('server.productName')

        app.use(
            session({
                //store: new RedisStore({ client: redisClient }),
                secret: "Hosso!@#",
                resave: true,
                name: `${appName}.sid`,
                saveUninitialized: true,
                cookie: {
                    secure: false,
                    sameSite: false,
                    maxAge: null
                }
            })
        )
    }
}

module.exports = new SSOPlugin()
