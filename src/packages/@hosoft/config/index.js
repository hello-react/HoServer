/**
 * A simple configuration manager for Node.js
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/07/15
**/
const _get = require('lodash.get')
const _set = require('lodash.set')
const fs = require('fs')
const jsonfile = require('jsonfile')
const path = require('path')
const yaml = require('js-yaml');

/**
 * Config class
 */
class Config {
    /**
     * options: {
     *     parser: json / yaml
     *     configDir: default to config in app path
     *     configFile: if you pass a absolute file, will ignore configDir option and directly use it.
     *                 if pass a relative file, will join configDir and configFile. by default, config file name
     *                 is depend on NODE_ENV and the parser setting.
     *     onSet: callback function after set config value
     *     onLoad: callback function after load
     *     onSave: callback function after save
     * }
     */
    constructor(options) {
        this._configs = {}
        this.setOptions(options)
        this.reload()
    }

    /**
     * create a new instance
     * @param options
     * @returns {Config}
     */
    newInstance(options) {
        return new Config(options)
    }

    /**
     * load configuration file
     */
    reload(options) {
        options && this.setOptions(options)

        const { parser } = this._options
        const configFile = this._configFile
        if (!(configFile && fs.existsSync(configFile))) {
            return console.error('configuration file not exist: ' + configFile)
        }

        try {
            let configs
            if (parser === 'yaml') {
                configs = yaml.load(fs.readFileSync(configFile));
            } else {
                configs = jsonfile.readFileSync(configFile)
            }

            if (configs) {
                this._configs = configs
            }

            if (this._options.onLoad) {
                this._options.onLoad(configFile)
            }
        } catch (e) {
            console.error('error loading configuration file', e);
        }
    }

    /**
     * get config item
     * @param key key can be Array like ['db', 'connection'], or just string 'db.connection'
     */
    get(key, defValue) {
        const value = _get(this._configs, key)
        return value === undefined ? defValue : value
    }

    /**
     * set config item
     * @param key key can be Array like ['db', 'connection'], or just string 'db.connection'
     * @param value value correspond with config key
     * @param save set to true to persist the config file immediately
     */
    set(key, value, save) {
        _set(this._configs, key, value)

        if (this._options.onSet) {
            this._options.onSet(key, value)
        }

        if (save) {
            this.save()
        }
    }

    /**
     * persis config file
     */
    save() {
        const { parser } = this._options
        const configFile = this._configFile

        try {
            if (parser === 'yaml') {
                const configContent = yaml.dump(this._configs);
                fs.writeFileSync(configFile, configContent)
            } else if (parser === 'json') {
                jsonfile.writeFileSync(configFile, this._configs)
            }

            if (this._options.onSave) {
                this._options.onSave(configFile, this._configs)
            }
        } catch (e) {
            console.error('error loading configuration file', e);
        }
    }

    /**
     * get config file
     */
    getConfigFile() {
        return this._configFile
    }

    /**
     * get all config items
     */
    getConfigs() {
        return this._configs
    }

    /**
     * get options
     */
    getOptions() {
        return this._options
    }

    /**
     * set options
     */
    setOptions(options) {
        const env = (process.env.NODE_ENV || 'default').toLowerCase()
        let appPath = global.APP_PATH || process.env.APP_PATH
        if (!appPath) {
            appPath = process.cwd()
        }

        if (!options) {
            options = {}
        }

        if (!options.parser) {
            options.parser = 'json'
        } else if(!['yaml', 'json'].includes(options.parser.toLowerCase())) {
            console.error('unsupported parser: ' + options.parser)
        }

        if (!options.configFile) {
            options.configFile = `${env}.${options.parser.toLowerCase()}`
        }

        if (!options.configDir) {
            options.configDir = path.join(appPath, 'config')
        }

        this._configFile = options.configFile.indexOf(path.delimiter) === 0
            ? options.configFile
            : path.join(options.configDir, options.configFile)
        this._options = options
    }
}

module.exports = new Config()
