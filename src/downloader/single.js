const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const HttpsProxyAgent = require('https-proxy-agent')

const root = path.join(__dirname, '..', '..')
const pather = path.join(root, '.cache')

const prog = require('../utils/progress')
const util = require('../utils/tools')
const media = require('../utils/media')

function download(playlistTitle, data, bin, progressData) {
    let url = data.url;
    let title = data.title

    let format = (data.format || 'mp4')
    let quality = data.quality || 'highest'

    let dl_title = util.sanitizeTitle(title)
    let raw_title = dl_title.replaceAll(' ', '_').toLowerCase()

    let dl_raw_path = path.join(bin, raw_title+".webm")
    let dl_path = path.join(bin, dl_title+'.'+format)

    let nometadata = path.join(bin, dl_title+'.no_metadata.'+format)

    let cookies = util.settings['cookie'] || ''
    let proxyServer = util.settings['proxy_server'] || ''
    let proxyAgent = proxyServer !== '' && !proxyServer.startsWith(' ') ? HttpsProxyAgent(proxyServer) : undefined
    let ytIdentityToken = typeof util.settings['youtube_identity_token'] === 'string' && util.settings['youtube_identity_token'] !== '' && !util.settings['youtube_identity_token'].startsWith(' ') ? util.settings['youtube_identity_token'] : undefined

    let dlOptions = {}

    if(util.config['use_youtube_cookies']) {
        dlOptions = cookies !== '' && !cookies.startsWith(' ') ? Object.assign({ requestOptions: { headers: { cookie: cookies, 'x-youtube-identity-token': ytIdentityToken } } }, dlOptions) : dlOptions
    }
    if(util.config['use_proxy_server']) {
        dlOptions = proxyServer !== '' && !proxyServer.startsWith(' ') && proxyServer.startsWith('http') ? Object.assign({ requestOptions: { agent: proxyAgent } }, dlOptions) : dlOptions
    }

    let total = 203
    let current = 0
    let last_current = 0


    function dl(uri, q) {
        return new Promise(async(resolve) => {
            
            prog.multipleProgress([
                ("Downloading \""+dl_title+'"').yellow,
                progressData,
                { total: 100, current: 0, label: 'waiting' }
            ])

            if(format === 'mp4') {
                let full = ytdl(uri, Object.assign(dlOptions, { quality: q || quality, filter: 'videoandaudio' }))
                let fullStream = fs.createWriteStream(dl_raw_path)

                await pipeStream(full, fullStream, "downloading")

                prog.multipleProgress([
                    ("Downloading \""+dl_title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / 102) * 100), label: "converting to mp4" }
                ])

                let r1 = await media.convertMp4(dl_raw_path, dl_path)
                if(r1 !== 100) return resolve(r1)
                if(fs.existsSync(dl_raw_path)) fs.rmSync(dl_raw_path)
                current = current + 1

                prog.multipleProgress([
                    ("Downloading \""+dl_title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / 102) * 100), label: "converting to mp4" }
                ])
                prog.multipleProgress([
                    ("Downloading \""+dl_title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / 102) * 100), label: "metadata" }
                ])

                let r = await media.editVideoMetadata(playlistTitle, dl_title, progressData, uri, dl_path, nometadata)
                current = current + 1

                prog.multipleProgress([
                    ("Downloading \""+dl_title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / 102) * 100), label: "metadata" }
                ])

                return resolve(r)
            }

            let audio = ytdl(uri, Object.assign(dlOptions, { quality: (q || quality)+'audio', filter: 'audioonly' }))
            let audioStream = fs.createWriteStream(dl_raw_path)
            await pipeStream(audio, audioStream, "downloading")

            let result = await media.editSongMetadata(playlistTitle, uri, dl_raw_path, dl_path, progressData, dl_title)

            return resolve(result)
        })
    }

    function pipeStream(src, dest, label) {
        return new Promise((resolve) => {
            prog.multipleProgress([
                ("Downloading \""+dl_title+'"').yellow,
                progressData,
                { total: 100, current: 0, label: 'waiting' }
            ])

            src.pipe(dest)
            
            src.on("progress", (_, downloaded, size) => {
                const percent = ((downloaded / size) * 100).toFixed(2);
                const total_progress = label === "video and audio"  || label === "downloading" ? 102 : (format === 'mp3' ? 102 : total)
    
                current = last_current + Math.floor(parseInt(percent))

                prog.multipleProgress([
                    ("Downloading \""+dl_title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / total_progress) * 100), label }
                ])
            });
    
            src.on('finish', () => {
                resolve(100)

                last_current = current
            })
    
            src.on('error', (err) => {
                prog.log(String(err).red)
                resolve(101)
            })
        })
    }

    return new Promise(async(resolve) => {
        return resolve(await dl(url))
    })
}

function downloadLooper(arr, bin, pl, int) {
    return new Promise(async(resolve) => {
        let item = arr[int]

        if(!item || arr.length <= int) return resolve(100)

        let current = int+1
        let total = arr.length

        let net = await util.checkInternet([
            ('Downloading "'+pl+'"').yellow,
            { current, total, label: 'playlist' },
            { total: 100, current: 0, label: 'checking internet'.yellow }
        ])
        if(!net) return process.exit(1)

        prog.multipleProgress([
            ('Downloading "'+pl+'"').yellow,
            { current, total, label: 'playlist' },
            { total: 100, current: 0, label: 'waiting' }
        ])

        let dlResult = await download(pl, item, bin, { current, total, label: 'playlist' })

        if(dlResult !== 100) return resolve(101)

        return resolve((await downloadLooper(arr, bin, pl, int+1)))
    })
}

module.exports = function(arr, pl) {
    return new Promise(async(resolve) => {
        let playlist = path.join(pather, util.sanitizeTitle(String(pl))
            .replaceAll(' ', '_')
            .toLowerCase()
        )

        if(fs.existsSync(playlist)) {
            fs.rmSync(playlist, { recursive: true, force: true })
            fs.mkdirSync(playlist)
        } else {
            fs.mkdirSync(playlist)
        }

        let result = await downloadLooper(arr, playlist, pl, 0)

        if(result !== 100) {
            fs.rmdirSync(playlist, { recursive: true, force: true })
            prog.log("Failed".red.bold)
            return process.exit(1)     
        }

        prog.log('Downloaded Playlist "'+pl+'"')

        return resolve({
            path: playlist,
            title: pl
        })
    })
}