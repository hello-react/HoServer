const archiver = require('archiver')
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const request = require('request')

const wrapper = {}

/**
 * load json from a json config file
 */
wrapper.getJsonFile = (file) => {
    try {
        const result = JSON.parse(fs.readFileSync(file))
        return result
    } catch (ex) {
        logger.debug('getJsonFile failed, file: ' + file + ', error: ' + ex.message)
        return null
    }
}

/**
 * save config json to file
 * @param configFileName
 * @return {*}
 */
wrapper.saveJsonFile = (file, config, pretty = true) => {
    try {
        if (typeof config === 'object') {
            if (pretty) {
                config = JSON.stringify(config, null, 4)
            } else {
                config = JSON.stringify(config)
            }
        }

        fs.writeFileSync(file, config, { encoding: 'utf-8' })

        // console.log('config saved success: ', file)
        return true
    } catch (ex) {
        logger.error('saveJsonFile failed!' + ex.message)
        return false
    }
}

/**
 * read text file content
 * @param file
 * @returns {*}
 */
wrapper.readFileContent = (file) => {
    if (!fs.existsSync(file)) {
        return ''
    }

    return fs.readFileSync(file)
}

/**
 * get file content from a url
 * @param url
 */
wrapper.getWebFileContent = async (url) => {
    return new Promise((resolve, reject) => {
        if (url.indexOf('http') < 0) {
            url = 'http://' + url
        }

        request(url, { json: true }, (err, res, body) => {
            if (err) {
                return reject(err)
            }

            resolve(body)
        })
    })
}

/**
 * download file
 * @param url
 * @param dest
 * @returns {Promise<any>}
 */
wrapper.downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest, { flags: 'wx' })
        const isSecure = url.toLowerCase().indexOf('https') > -1

        const request = (isSecure ? https : http).get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file)
            } else {
                file.close()
                fs.unlink(dest, () => {}) // Delete temp file
                reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`)
            }
        })

        request.on('error', (err) => {
            file.close()
            fs.unlink(dest, () => {}) // Delete temp file
            reject(err.message)
        })

        file.on('finish', () => {
            resolve()
        })

        file.on('error', (err) => {
            file.close()

            if (err.code === 'EEXIST') {
                reject('File already exists')
            } else {
                fs.unlink(dest, () => {}) // Delete temp file
                reject(err.message)
            }
        })
    })
}

/**
 * delete folder
 */
wrapper.deleteDirectory = (path) => {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            const curPath = path + '/' + file
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                wrapper.deleteDirectory(curPath)
            } else {
                // delete file
                fs.unlinkSync(curPath)
            }
        })
        fs.rmdirSync(path)
    }
}

/**
 * zip entire directory
 */
wrapper.zipDirectory = (targetDir, zipFile, dirName) => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(zipFile)) {
            fs.unlinkSync(zipFile)
        }

        const outputZip = fs.createWriteStream(zipFile)
        const archive = archiver('zip', {
            zlib: { level: 9 }
        })

        outputZip.on('close', function () {
            console.log('zipDirectory finished: ' + archive.pointer() + ' total bytes')
            resolve()
        })

        outputZip.on('error', function (err) {
            reject(err)
        })

        archive.pipe(outputZip)
        archive.directory(targetDir, dirName || path.basename(targetDir))
        archive.finalize()
    })
}

wrapper.getDirectories = (dir) => {
    const subDirs = []

    fs.readdirSync(dir, { withFileTypes: true }).forEach((f) => {
        if (f.isDirectory()) {
            subDirs.push(f.name)
        }
    })

    return subDirs
}

wrapper.getFiles = (dir, ext) => {
    const files = []

    fs.readdirSync(dir).forEach((filename) => {
        const fileExt = path.parse(filename).ext
        if (ext && ext != fileExt) {
            return
        }

        const name = path.parse(filename).name
        const filepath = path.resolve(dir, filename)
        const stat = fs.statSync(filepath)
        const isFile = stat.isFile()

        if (isFile) {
            files.push({ filepath, name, fileExt, stat })
        }
    })

    files.sort((a, b) => {
        // natural sort alphanumeric strings
        // https://stackoverflow.com/a/38641281
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    })

    return files
}

module.exports = wrapper
