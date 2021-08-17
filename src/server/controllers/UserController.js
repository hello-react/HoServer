/* eslint-disable max-len */
const UserService = require('../services/user/UserService')
const { ErrorCodes } = require('@hosoft/restful-api-framework/base')
const { Role, Permission } = require('@hosoft/restful-api-framework/models')

/**
 * User related apis
 */
class UserController {
    // prettier-ignore
    initRoutes(container, router) {
        // role, permissions
        router.get('/user/roles/categories', t('getRolePermCategories'), async context => {
            return this._getRolePermCategories()
        }, { model: 'Role', private: true })

        router.def('Permission')
        router.def('Role')

        // users
        router.def('User.permissions')
        router.def('User', ['create', 'batch_update'], {permissions: 'user:manage'})
        router.def('User', 'list', {permissions: 'user:manage'}).outFields('location real_name mobile email is_admin is_active vip_type has_login verified disabled')
        router.def('User', 'update').beforeDbProcess((ctx, dbQuery, userInfo) => this._removeUnexpectedFields(ctx, dbQuery, userInfo))
        router.get('/user/users/:user_id', t('getUserByUserId'), ctx => UserService.getUserByUserId(ctx.params.user_id, ctx.isAdmin() ? '' : ctx.currentUserId))
        router.get('/user/current', t('getCurrentUserInfo'), ctx => this._getCurrentUserInfo(ctx))

        // login/register
        router.post('/user/register', t('register'), ctx => UserService.register(ctx.body), {open: true})
        router.post('/user/login', t('login'), ctx => UserService.login(ctx.body), {open: true})
        router.post('/user/login_admin', t('loginAdmin'), async ctx => this._loginAdmin(ctx), {open: true})

        // modify password
        router.post('/user/password/change', t('changePassword'), ctx => UserService.changePassword(ctx.body, ctx.isAdmin() ? '' : ctx.currentUserId))
        router.post('/user/password/reset', t('resetPassword'), ctx => UserService.resetPassword(ctx.body), {open: true})

        // change user name
        router.post('/user/user_name/change', t('changeUserName'), ctx => UserService.changeUserName(ctx.currentUserId, ctx.body))
    }

    // some fields are not allow to modify
    _removeUnexpectedFields(ctx, dbQuery, userInfo) {
        if (userInfo.user_name === 'superadmin') {
            return Promise.reject({ message: t('errNotEditable'), code: ErrorCodes.GENERAL_ERR_UNAUTHORIZED })
        }

        delete userInfo.user_id
        delete userInfo.user_name
        delete userInfo.has_login
        delete userInfo.is_active

        if (!ctx.body.password) {
            delete userInfo.password
        }
    }

    async _getCurrentUserInfo(ctx) {
        const curUserInfo = await UserService.getUserByUserId(ctx.currentUserId)
        return curUserInfo || {}
    }

    async _getRolePermCategories() {
        const roles = await Role.find({}, { distinct: 'category_name' })
        const perms = await Permission.find({}, { distinct: 'category_name' })

        const roleCats = roles.map((r) => r.category_name)
        const permCats = perms.map((r) => r.category_name)

        for (const cat of permCats) {
            if (!roleCats.includes(cat)) {
                roleCats.push(cat)
            }
        }

        return roleCats
    }

    async _loginAdmin(ctx) {
        const userInfo = UserService.login(ctx.body)
        if (!userInfo.is_admin) {
            return Promise.reject({ message: t('errNotAdminUser'), code: ErrorCodes.GENERAL_ERR_UNAUTHORIZED })
        }

        return userInfo
    }
}

module.exports = new UserController()
