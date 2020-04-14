const archiver = require('archiver')
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const request = require('request')

/**
 * load json from a json config file
 */
const getJsonFile = file => {
    try {
        const result = JSON.parse(fs.readFileSync(file))
        return result
    } catch (ex) {
        logger.debug('getJsonFile failed!' + ex.message)
        return null
    }
}

/**
 * save config json to file
 * @param configFileName
 * @return {*}
 */
const saveJsonFile = (file, config, pretty = true) => {
    try {
        if (typeof config === 'object') {
            if (pretty) {
                config = JSON.stringify(config, null, 4)
            } else {
                config = JSON.stringify(config)
            }
        }

        fs.writeFileSync(file, config, { encoding: 'utf-8' })

        console.log('config saved success: ', file)
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
const readFileContent = file => {
    if (!fs.existsSync(file)) {
        return ''
    }

    return fs.readFileSync(file)
}

/**
 * get file content from a url
 * @param url
 */
const getWebFileContent = async url => {
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
const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest, { flags: 'wx' })
        const isSecure = url.toLowerCase().indexOf('https') > -1

        const request = (isSecure ? https : http).get(url, response => {
            if (response.statusCode === 200) {
                response.pipe(file)
            } else {
                file.close()
                fs.unlink(dest, () => {}) // Delete temp file
                reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`)
            }
        })

        request.on('error', err => {
            file.close()
            fs.unlink(dest, () => {}) // Delete temp file
            reject(err.message)
        })

        file.on('finish', () => {
            resolve()
        })

        file.on('error', err => {
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
const deleteDirectory = path => {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function(file, index) {
            var curPath = path + '/' + file
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                deleteDirectory(curPath)
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
const zipDirectory = (targetDir, zipFile, dirName) => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(zipFile)) {
            fs.unlinkSync(zipFile)
        }

        const outputZip = fs.createWriteStream(zipFile)
        var archive = archiver('zip', {
            zlib: { level: 9 }
        })

        outputZip.on('close', function() {
            console.log('zipDirectory finished: ' + archive.pointer() + ' total bytes')
            resolve()
        })

        outputZip.on('error', function(err) {
            reject(err)
        })

        archive.pipe(outputZip)
        archive.directory(targetDir, dirName || path.basename(targetDir))
        archive.finalize()
    })
}

module.exports = {
    getWebFileContent,
    downloadFile,
    getJsonFile,
    saveJsonFile,
    readFileContent,
    deleteDirectory,
    zipDirectory
}
