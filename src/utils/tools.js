const fs = require('fs')
const path = require('path')
const search = require('yt-search')
const ffmpeg = require('ffmpeg-static')
const check_net = require('check-internet-connected')
const request = require('request')
const url = require('node:url')

const prog = require('./progress')

const metadata = require('../tools/ffmetadata')

metadata.setFfmpegPath(ffmpeg)

module.exports.sanitizeTitle = function (title) {
    return String(title).replaceAll(/[\\/:*"?|<>]/g, '');
}

module.exports.config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'settings', 'config.json'), { encoding: 'utf-8' }))
module.exports.settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'settings', 'download.json'), { encoding: 'utf-8' }))

module.exports.downloader = function(list) {
    let types = ['split-v1', 'single-v1', 'split-v2', 'single-v2'].map((v, i) => { return { value: v, index: i } })
    let input = module.exports.config['downloader']

    if(list) return types.map(v => v.value)

    if(!input) {
        prog.log('Downloader not set in config'.red)
        return process.exit(1)
    }

    let use = types.find(v => v.value === input)

    if(!use) {
        prog.log('Invalid Downloader ['.red+String(input).yellow.bold+']'.red)
        return process.exit(1)
    }

    return use.index
}

module.exports.fetchPlaylistID = function (inputUrl) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]list=)|youtu\.be\/)([^"&?\/\s]{34})/;

    const parsedUrl = url.parse(inputUrl, true);

    if (parsedUrl.hostname === 'www.youtube.com' || parsedUrl.hostname === 'youtube.com') {
        if (parsedUrl.pathname === '/playlist' || parsedUrl.pathname === '/watch') {
            const playlistId = parsedUrl.query.list || parsedUrl.query.v;
            return playlistId;
        } else {
            const match = inputUrl.match(regex);
            if (match && match[1]) {
                return match[1];
            } else {
                return inputUrl;
            }
        }
    } else if (parsedUrl.hostname === 'youtu.be') {
        const match = inputUrl.match(regex);
        if (match && match[1]) {
            return match[1];
        } else {
            return inputUrl;
        }
    } else {
        return inputUrl;
    }
}

module.exports.fetchId = function(input) {
    let videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    let playlistIdPattern = /^(PL|UU|LL|FL)[a-zA-Z0-9_-]{32}$/;
  
    if (videoIdPattern.test(input)) {
        return 'video';
    } else if (playlistIdPattern.test(input)) {
        return 'playlist';
    } else {
        return 'unknown';
    }
}

module.exports.formatCheck = function(input, list, defaultf, ffmpeg_args) {
    let formats = [
        'mp3',
        'ogg',
        'wav',
        'm4a',
        'flac',
        'mp4',
        'mkv',
        'flv',
        'avi',
        'mov'
    ]
    let audio_formats = [
        'ogg',
        'mp3',
        'wav',
        'm4a',
        'flac'
    ]
    let video_formats = [
        'mkv',
        'mp4',
        'flv',
        'avi',
        'mov'
    ]
    let found = formats.find(v => v === input)

    if(ffmpeg_args) {
        if(input === 'mp4') return [
            '-i', list,
            '-c:v', 'copy', defaultf
        ]
        if(input === 'mkv') return [
            '-i', list,
            '-map', '0:0', '-map', '0:1',
            '-c', 'copy',
            '-id3v2_version', '3',
            '-metadata:s:v', 'title=Album cover',
            '-metadata:s:v', 'comment=Cover (front)',
            defaultf
        ]
        if(input === 'flv') return [
            '-i', list,
            '-pass', '1',
            '-vcodec', 'libx264', '-preset', 'slower',
            '-b', '512k', '-bt', '512k',
            '-threads', '0',
            '-s', '640x360', '-aspect', '16:9',
            '-acodec', 'libmp3lame',
            '-ar', '44100', '-ab', '32',
            '-f', 'flv', '-y',
            defaultf
        ]
        if(input === 'avi') return [
            '-i', list,
            '-codec', 'copy',
            defaultf
        ]
        if(input === 'mov') return [
            '-i', list,
            '-f', 'mov', defaultf
        ]

        if(input === 'mp3') return [
            '-i', list,
            '-vn', '-ab', '128k', '-ar', '44100',
            '-y', defaultf
        ]
        if(input === 'ogg') return [
            '-i', list,
            '-c:a', 'libvorbis',
            '-q:a', '5',
            defaultf
        ]
        if(input === 'wav') return [
            '-i', list,
            defaultf
        ]
        if(input === 'm4a') return [
            '-i', list,
            '-c:a', 'aac',
            '-vn',
            defaultf
        ]
        if(input === 'flac') return [
            '-i', list,
            defaultf
        ]

        return [
            '-i', list,
            defaultf
        ]
    }

    if(defaultf && found) {
        if(audio_formats.find(va => va === found)) return 'mp3'
        if(video_formats.find(vv => vv === found)) return 'mp4'
    } else if(defaultf && !found) return 'mp4'

    if(list) return formats

    if(found) return true

    return false
}

module.exports.pathCheck = function(input, input2) {
    let home = require('node:os').homedir()
    let downloads = path.join(home, 'Downloads')
    let check = input && input === "" || input.startsWith(" ") || input.startsWith('"') || input.endsWith('"') || !input

    if(!fs.existsSync(downloads) && check) fs.mkdirSync(downloads)

    if(check) return downloads
    if(fs.existsSync(input2) && (fs.statSync(input2).isDirectory())) return input

    return false
}

module.exports.qualityCheck = function(input, list) {
    let quality = [
        'highest',
        'medium',
        'lowest'
    ].filter(v => !module.exports.config['split_download_v2'] && v !== 'medium')

    if(list) return quality

    if(quality.find(v => v === input)) return true
    
    return false
}

module.exports.checkInternet = function (d) {
    return new Promise(async(resolve) => {
        if(!module.exports.config['internet_checking']) return resolve(true)
            
        if(d) {
            prog.multipleProgress(d)
        } else {
            prog.multipleProgress(['Checking Internet'.yellow])
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
        
        let data = (await search({ videoId: uri.replaceAll('https://www.youtube.com/watch?v=', '') }))

        return resolve(data)
    })
}

module.exports.basicDL = function(uri, out) {
    return new Promise(resolve => {
        let stream = fs.createWriteStream(out)

        request(uri).pipe(stream)

        stream.on('finish', () => { resolve(100) })
        stream.on('error', () => { resolve(101) })
    })
}

module.exports.boolean = function(bool) {
    return  bool.toLowerCase() === 'n' || bool.toLowerCase() === 'false' || bool.toLowerCase() === 'no' ? false : bool.toLowerCase() === 'y' || bool.toLowerCase() === 'true' || bool.toLowerCase() === 'yes' ? true : null
}

module.exports.acrcloud = function() {
    let allow = module.exports.config['music_metadata']
    let arcSettings = module.exports.settings['acrcloud']

    if(!allow) return false
    if(!arcSettings) return false
    if(!arcSettings.host) return false
    if(arcSettings.host === '' && arcSettings.host.startsWith(' ')) return false
    if(!arcSettings.api) return false
    if(typeof arcSettings.api.key !== 'string') return false
    if(typeof arcSettings.api.secret !== 'string') return false
    if(arcSettings.api.key === '' && arcSettings.api.key.startsWith(' ')) return false
    if(arcSettings.api.secret === '' && arcSettings.api.secret.startsWith(' ')) return false

    return arcSettings
}

module.exports.wait = function(ms) {
    return new Promise(resolve => { setTimeout(() => { return resolve() }, ms || 1000) })
}
