const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const ffmpeg = require('ffmpeg-static')
const HttpsProxyAgent = require('https-proxy-agent')

const cp = require('child_process')

const pather = path.join(__dirname, '..', 'bin')

const prog = require('./progress')
const util = require('./util')

function download(playlistTitle, data, bin, progressData) {
    let url = data.url;
    let title = data.title

    let format = (data.format || 'mp4')
    let quality = data.quality || 'highest'

    let dl_title = util.sanitizeTitle(title)
    let raw_title = dl_title.replaceAll(' ', '_').toLowerCase()

    let dl_audio_path = path.join(bin, raw_title+".audio."+'webm')
    let dl_video_path = path.join(bin, raw_title+".video."+'webm')
    let dl_raw_path = path.join(bin, raw_title+".mkv")
    let dl_path = path.join(bin, dl_title+'.'+format)

    let nometadata = path.join(bin, dl_title+'.no_metadata.'+format)

    let cookies = util.settings['cookie'] || ''
    let proxyServer = util.settings['proxy_server'] || ''
    let proxyAgent = proxyServer !== '' && !proxyServer.startsWith(' ') ? HttpsProxyAgent(proxyServer) : undefined
    let ytIdentityToken = typeof util.settings['youtube_identity_token'] === 'string' && util.settings['youtube_identity_token'] !== '' && !util.settings['youtube_identity_token'].startsWith(' ') ? util.settings['youtube_identity_token'] : undefined

    let dlOptions = {}
s
    if(util.config['use_youtube_cookies']) {
        dlOptions = cookies !== '' && !cookies.startsWith(' ') ? Object.assign({ requestOptions: { headers: { cookie: cookies, 'x-youtube-identity-token': ytIdentityToken } } }, dlOptions) : dlOptions
    }
    if(util.config['use_proxy_server']) {
        dlOptions = proxyServer !== '' && !proxyServer.startsWith(' ') && proxyServer.startsWith('http') ? Object.assign({ requestOptions: { agent: proxyAgent } }, dlOptions) : dlOptions
    }

    let total = 203
    let current = 0
    let last_current = 0


    function dl(uri, q, f) {
        return new Promise(async(resolve) => {

            prog.multipleProgress([
                ("Downloading \""+dl_title+'"').yellow,
                progressData,
                { total: 100, current: 0, label: 'waiting' }
            ])

            if(f) {
                let full = ytdl(uri, Object.assign(dlOptions, { quality: q || quality, filter: 'audioandvideo' }))
                let fullStream = fs.createWriteStream(dl_path)

                await pipeStream(full, fullStream, "video and audio")

                let r = await encode(uri, q, f)

                return resolve(r)
            }

            let audio = ytdl(uri, Object.assign(dlOptions, { quality: (q || quality)+'audio', filter: 'audioonly' }))
            let audioStream = fs.createWriteStream(dl_audio_path)

            await pipeStream(audio, audioStream, "audio")

            if(format === 'mp3') return resolve(100)

            let video = ytdl(uri, Object.assign(dlOptions, { quality: (q || quality)+'video', filter: 'videoonly' }))
            let videoStream = fs.createWriteStream(dl_video_path)

            await pipeStream(video, videoStream, "video")

            let result = await encode(uri, q, f)
            return resolve(result)
        })
    }

    function pipeStream(src, dest, label) {
        return new Promise((resolve) => {
            src.pipe(dest)
            
            src.on("progress", (_, downloaded, size) => {
                const percent = ((downloaded / size) * 100).toFixed(2);
                const total_progress = label === "video and audio" ? 100 : (format === 'mp3' ? 102 : total)
    
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

    function encode(prev_uri, q, f) {
        function merge(video, audio) {
            return new Promise(async(resolve) => {
                if(f && fs.existsSync(dl_path) || f && fs.existsSync(dl_raw_path)) return resolve(100)

                if(q === 'lowest' && f && !fs.existsSync(dl_raw_path)) {
                    prog.log("Fsiled".red.bold)
                    return process.exit(1)
                }

                if(!q && f && !fs.existsSync(dl_raw_path)) return resolve(await dl(prev_uri, 'lowest', true))
                if(q && !f && !fs.existsSync(dl_raw_path)) return resolve(await dl(prev_uri, undefined, true))
                if(!fs.existsSync(audio) || !fs.existsSync(video)) return resolve(await dl(prev_uri, 'lowest'))

                let audioStream = fs.createReadStream(audio)
                let videoStream = fs.createReadStream(video)

                let proc = cp.spawn(ffmpeg, [
                    '-loglevel', '8', '-hide_banner',
                    '-i', 'pipe:3', '-i', 'pipe:4',
                    '-map', '0:a', '-map', '1:v',
                    '-c', 'copy',
                    '-f', 'matroska', 'pipe:5'
                ], {
                    windowsHide: true,
                    stdio: [
                        'inherit', 'inherit', 'inherit',
                        'pipe', 'pipe', 'pipe'
                    ]
                })

                prog.multipleProgress([
                    ("Downloading \""+dl_title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / total) * 100), label: 'merging' }
                ])

                audioStream.pipe(proc.stdio[3])
                videoStream.pipe(proc.stdio[4])

                let output = fs.createWriteStream(dl_raw_path)
                proc.stdio[5].pipe(output)

                output.on('error', (err) => {
                    prog.log(String(err).red)
                    return resolve(101)
                })

                output.on('finish', async() => { 
                    current = current + 1

                    if(fs.existsSync(dl_audio_path)) fs.rmSync(dl_audio_path, { force: true })
                    if(fs.existsSync(dl_video_path)) fs.rmSync(dl_video_path, { force: true })

                    prog.multipleProgress([
                        ("Downloading \""+dl_title+'"').yellow,
                        progressData,
                        { total: 100, current: Math.floor((current / total) * 100), label: 'converting' }
                    ])

                    await util.convertMp4(dl_raw_path, dl_path)

                    if(fs.existsSync(dl_raw_path)) fs.rmSync(dl_raw_path, { force: true })

                    current = current + 1

                    prog.multipleProgress([
                        ("Downloading \""+dl_title+'"').yellow,
                        progressData,
                        { total: 100, current: Math.floor((current / total) * 100), label: 'metadata' }
                    ])

                    await util.editVideoMetadata(playlistTitle, url, dl_path, nometadata)

                    current = current + 1

                    return resolve(100)
                })
            })
        }

        return new Promise(async(resolve) => {
            resolve(await merge(dl_video_path, dl_audio_path))
        })
    }

    return new Promise(async(resolve) => {
        let result = await dl(url)

        if(result === 100) {
            if(fs.existsSync(dl_audio_path) && format === 'mp3') {
                await require('fs/promises').rename(dl_audio_path, dl_raw_path)
                await util.editSongMetadata(playlistTitle, url, dl_raw_path, dl_path, progressData, dl_title)
            }
            
            if(fs.existsSync(dl_raw_path)) fs.rmSync(dl_raw_path, { force: true })
            if(fs.existsSync(dl_audio_path)) fs.rmSync(dl_audio_path, { force: true })
            if(fs.existsSync(dl_video_path)) fs.rmSync(dl_video_path, { force: true })
        }

        return resolve(result)
    })
}

function downloadLooper(arr, bin, pl, int) {
    return new Promise(async(resolve) => {
        let item = arr[int]

        if(!item || arr.length <= int) return resolve(100)

        let current = int+1
        let total = arr.length

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