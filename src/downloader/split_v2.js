const fs = require('fs');
const path = require('path');
const colors = require('colors');
const ffmpeg = require('ffmpeg-static')
const HttpsProxyAgent = require('https-proxy-agent')

const cp = require('child_process')

const prog = require('../utils/progress')
const util = require('../utils/tools')
const media = require('../utils/media')
const downloader = require('./ytdl/download')

function download(playlistTitle, data, bin, progressData, author, index) {
    let url = data.url;
    let title = data.title

    let format = util.formatCheck(data.format, false, true)
    let final_format = data.format || 'mp4'
    let quality = data.quality || 'highest'

    let dl_title = util.sanitizeTitle(title)
    let raw_title = dl_title.replaceAll(' ', '_').toLowerCase()

    let dl_audio_path = path.join(bin, raw_title+".audio."+'webm')
    let dl_video_path = path.join(bin, raw_title+".video."+'webm')
    let dl_raw_path = path.join(bin, raw_title+".raw."+'mkv')
    let dl_path = path.join(bin, dl_title+'.'+format)
    let dl_final_path = path.join(bin, dl_title+'.'+final_format)

    let nometadata = path.join(bin, dl_title+'.no_metadata.'+format)
    let cover_jpg = path.join(bin, 'cover.jpg')

    if(fs.existsSync(dl_raw_path)) fs.rmSync(dl_raw_path, { force: true })
    if(fs.existsSync(dl_audio_path)) fs.rmSync(dl_audio_path, { force: true })
    if(fs.existsSync(dl_video_path)) fs.rmSync(dl_video_path, { force: true })
    if(fs.existsSync(nometadata)) fs.rmSync(nometadata, { force: true })
    if(fs.existsSync(cover_jpg)) fs.rmSync(nometadata, { force: true })
    if(fs.existsSync(dl_path)) fs.rmSync(dl_path, { force: true })
    if(fs.existsSync(dl_final_path)) fs.rmSync(dl_final_path, { force: true })

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


    function dl(uri) {
        return new Promise(async(resolve) => {
            
            prog.multipleProgress([
                String(playlistTitle).green.bold,
                ("Downloading \""+dl_title+'"').yellow,
                progressData,
                { total: 100, current: 0, label: 'waiting' }
            ])

            let res_audio = await progressStream(uri, dl_audio_path, 'audio')
            if(res_audio !== 100) return resolve(res_audio)

            if(format === 'mp3') return resolve(100)

            let res_video = await progressStream(uri, dl_video_path, "video")
            if(res_video !== 100) return resolve(res_video)

            let result = await encode()
            return resolve(result)
        })
    }

    function progressStream(uri, pathage, label) {
        return new Promise(async(resolve) => {
            let res = await downloader(uri, {
                format: label,
                quality: quality,
                output_path: pathage
            }, (event, data) => {
                if(event === 'progress') {
                    const percent = data.percentage
                    const total_progress = label === "video and audio" ? 100 : (format === 'mp3' ? 102 : total)
    
                    current = last_current + Math.floor(parseInt(percent))

                    prog.multipleProgress([
                        String(playlistTitle).green.bold,
                        ("Downloading \""+dl_title+'"').yellow,
                        progressData,
                        { total: 100, current: Math.floor((current / total_progress) * 100), label, speed: data.speed.string }
                    ])
                } else if(event === 'error') {
                    prog.log(String(data).red)
                    return resolve(101)
                }
            })
            
            if(res.status !== 'SUCCESS') return resolve(101)

            last_current = last_current + 100

            return resolve(100)
        })
    }

    function encode() {
        function merge(video, audio) {
            return new Promise(async(resolve) => {
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
                    String(playlistTitle).green.bold,
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
                        String(playlistTitle).green.bold,
                        ("Downloading \""+dl_title+'"').yellow,
                        progressData,
                        { total: 100, current: Math.floor((current / total) * 100), label: 'converting to mp4' }
                    ])

                    await media.convertMp4(dl_raw_path, dl_path)

                    if(fs.existsSync(dl_raw_path)) fs.rmSync(dl_raw_path, { force: true })

                    current = current + 1

                    prog.multipleProgress([
                        String(playlistTitle).green.bold,
                        ("Downloading \""+dl_title+'"').yellow,
                        progressData,
                        { total: 100, current: Math.floor((current / total) * 100), label: 'metadata' }
                    ])

                    await media.editVideoMetadata(playlistTitle, index, dl_title, progressData, url, dl_path, nometadata, cover_jpg, final_format, dl_final_path, author)

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
                await media.editSongMetadata(playlistTitle, index, url, dl_raw_path, dl_path, progressData, dl_title, cover_jpg, final_format, dl_final_path, author)
            }
            
            if(fs.existsSync(dl_raw_path)) fs.rmSync(dl_raw_path, { force: true })
            if(fs.existsSync(dl_audio_path)) fs.rmSync(dl_audio_path, { force: true })
            if(fs.existsSync(dl_video_path)) fs.rmSync(dl_video_path, { force: true })
            if(fs.existsSync(cover_jpg)) fs.rmSync(nometadata, { force: true })
        }

        return resolve(result)
    })
}

module.exports = download