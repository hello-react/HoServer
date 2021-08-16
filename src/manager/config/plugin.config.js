import path from 'path'

function getModulePackageName(module) {
    if (!module.context) return null
    const nodeModulesPath = path.join(__dirname, '../node_modules/')

    if (module.context.substring(0, nodeModulesPath.length) !== nodeModulesPath) {
        return null
    }

    const moduleRelativePath = module.context.substring(nodeModulesPath.length)
    const [moduleDirName] = moduleRelativePath.split(path.sep)
    let packageName = moduleDirName // handle tree shaking

    if (packageName && packageName.match('^_')) {
        // eslint-disable-next-line prefer-destructuring
        packageName = packageName.match(/^_(@?[^@]+)/)[1]
    }

    return packageName
}

export const webpackPlugin = (config, webpackConfig) => {
    // for our es6 packages
    config.resolve.symlinks(false)
    const hosPath = path.resolve('./node_modules/@hosoft')
    config.module.rule('js').exclude.clear().end().exclude.add(/node_modules\/(?!@hosoft)/).end()
    config.module.rule('js').include.add(hosPath).end()
    config.module.rule('jsx').include.add(hosPath).end()

    // optimize chunks
    config.optimization // share the same chunks across different modules
        .runtimeChunk(false)
        .splitChunks({
            chunks: 'async',
            name: 'vendors',
            maxInitialRequests: Infinity,
            minSize: 0,
            cacheGroups: {
                vendors: {
                    test: module => {
                        // const packageName = getModulePackageName(module) || ''
                        return false
                    },

                    name(module) {
                        return 'misc'
                    },
                },
            },
        })
}
