/**
 * plugin used to scan node_modules @hosoft/hos-plugin-* packages
 * and auto import in manager.
 */
const fs = require('fs')
const path = require('path')

export default (api, opts) => {
    api.onStart(() => {
        const loadPlugins = (plugins, pluginDir) => {
            const pa = fs.readdirSync(pluginDir)

            pa.forEach((ele, index) => {
                const fullPath = pluginDir + '/' + ele
                const info = fs.statSync(fullPath)
                if (info.isDirectory() && ele.startsWith('hos-plugin')) {
                    const pluginIndexFile = path.join(fullPath, 'admin', 'plugin-index.js')
                    const pluginDistFile = path.join(fullPath, 'dist', 'main.js')
                    const hasIndex = fs.existsSync(pluginIndexFile)
                    const hasDist = fs.existsSync(pluginDistFile)
                    if (hasIndex || hasDist) {
                        try {
                            const pos = pluginIndexFile.indexOf('node_modules')
                            const packageJson = JSON.parse(fs.readFileSync(path.join(fullPath, 'package.json')))
                            const dir = hasIndex
                                ? pluginIndexFile.substr(pos + 'node_modules'.length + 1).replace(/\\/g, '\\\\')
                                : pluginDistFile.substr(pos + 'node_modules'.length + 1).replace(/\\/g, '\\\\')
                            plugins.push({
                                name: ele,
                                main: packageJson.main,
                                version: packageJson.version,
                                dis_name: packageJson.description,
                                dir: dir
                            })
                        } catch (ex) {
                            console.error(ex)
                        }
                    }
                }
            })
        }

        const pluginDir = path.join(__dirname, '../node_modules', '@hosoft')
        if (!fs.existsSync(pluginDir)) {
            console.warn(`loadPlugins, plugin directory not exist: ${pluginDir}`)
            return
        }

        const localPlugins = []
        loadPlugins(localPlugins, pluginDir)

        const pluginImportFile = path.join(__dirname, '../src/.plugin-list/index.js')
        let jsContent = '/* eslint-disable */\n' +
            '/**\n' +
            ' * this file is auto generated by umi,\n' +
            ' * don\'t modify it!!!\n' +
            ' */\n'

        let exportContent = 'const pluginList = []\n\n'
        for (const plugin of localPlugins) {
            const parts = plugin.name.split('-')

            let importName = ''
            for(var i = 2 ; i < parts.length ; i++){
                importName += parts[i].charAt(0).toUpperCase() + parts[i].substr(1);;
            }

            jsContent += 'import ' +importName+ ' from \'' +plugin.dir+ '\'\n'
            exportContent += `pluginList.push({ instance: ${importName}, name: '${plugin.name}', type: 'manager', dir: '${plugin.dir}', version: '${plugin.version}', dis_name: '${plugin.dis_name}' })\n`
        }

        jsContent += '\n' + exportContent + '\nexport default pluginList'

        fs.writeFileSync(pluginImportFile, jsContent, { encoding: 'utf-8' })
    })
};
