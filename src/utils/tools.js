const fs = require('fs')
const path = require('path')
const metadata = require('ffmetadata')
const search = require('yt-search')
const ffmpeg = require('ffmpeg-static')
const check_net = require('check-internet-connected')
const request = require('request')

const prog = require('./progress')

metadata.setFfmpegPath(ffmpeg)

module.exports.sanitizeTitle = function (title) {
    return String(title).replaceAll(/[\\/:*"?|<>]/g, '');
}

module.exports.config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'settings', 'config.json'), { encoding: 'utf-8' }))
module.exports.settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'settings', 'download.json'), { encoding: 'utf-8' }))

module.exports.checkInternet = function (d) {
    return new Promise(async(resolve) => {
        if(!module.exports.config['internet_checking']) return resolve(true)
            
        if(d) {
            prog.multipleProgress(d)
        } else {
            prog.log('Checking internet...'.yellow)
        }

        check_net({ timeout: 10000, retries: 5, domain: "google.com" })
        .then(() => {
            return resolve(true)
        })
        .catch((err) => {
            prog.log(`No Internet: ${err}`.red)
            return resolve(false)
        })
    })
}

module.exports.versionCheck = function() {
    let root = path.join(__dirname, '..', '..')
    let cache = path.join(root, '.cache')

    let packageNewUrl = 'https://raw.githubusercontent.com/merasugd/yt-playlist-downloader/main/package.json'

    let packageOld = path.join(root, 'package.json')
    let packageNew = path.join(cache, 'package.json')

    let verCheck = {
        pre: false,
        match: false,
        msg: "Error!"
    }

    return new Promise(async(resolve) => {
        let olddata = JSON.parse(fs.readFileSync(packageOld).toString())
        let newD = fs.createWriteStream(packageNew)

        request(packageNewUrl).pipe(newD)

        newD.on('finish', () => {
            let newdata = JSON.parse(fs.readFileSync(packageNew).toString())

            let oldVer = olddata.version
            let newVer = newdata.version
            let lastrelease = newdata.lastrelease || newVer

            if(newVer.includes('-pre') && oldVer === newVer) {
                verCheck.pre = true
                verCheck.match = true
                verCheck.msg = 'You are using a pre-release version.'.yellow
            } else if(newVer.includes('-pre') && oldVer.includes('-pre') && oldVer !== newVer) {
                verCheck.pre = true
                verCheck.match = false
                verCheck.msg = `Version: ${oldVer}, New pre-release version available v${newVer}`.yellow
            } else if(oldVer.includes('-pre') && oldVer !== newVer) {
                verCheck.pre = false
                verCheck.match = false
                verCheck.msg = `Using a pre-release version. Please update to v${newVer}`.yellow
            } else if(oldVer === newVer || oldVer === lastrelease) {
                verCheck.pre = false
                verCheck.match = true
                verCheck.msg = `Latest Version: ${oldVer}`.cyan
            } else if(oldVer !== newVer) {
                verCheck.pre = false
                verCheck.match = false
                verCheck.msg = `Please update to v${lastrelease}`.yellow
            }

            fs.rmSync(packageNew)

            return resolve(verCheck)
        })
    })
}

module.exports.searchYt = function(uri, d) {
    return new Promise(async(resolve) => {
        let net = await module.exports.checkInternet(d)
        if(!net) return process.exit(1)
        
        let data = await search({ videoId: uri.replaceAll('https://www.youtube.com/watch?v=', '') })

        return resolve(data)
    })
}

module.exports.boolean = function(bool) {
    bool = bool.toLowerCase()

    if(bool === 'y' || bool === 'yes' || bool === 'true') {
        return true
    }
    
    return false
}