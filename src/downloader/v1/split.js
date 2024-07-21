const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const ffmpeg = require('ffmpeg-static')
const terminate = require('terminate')

const cp = require('child_process')

const prog = require('../../utils/progress')
const util = require('../../utils/tools')
const media = require('../../utils/media')

const cookie = require('../../tools/cookie')

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
    let dl_raw_path = path.join(bin, raw_title+".mkv")
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

    let dlOptions = cookie.use()

    let total = 203
    let current = 0
    let last_current = 0


    function dl(uri, q, f) {
        return new Promise(async(resolve) => {
            
            prog.multipleProgress([
                String(playlistTitle).green.bold,
                ("Downloading \""+dl_title+'"').yellow,
                progressData,
                { total: 100, current: 0, label: 'waiting' }
            ])

            if(f) {
                let fullOptions = Object.assign(dlOptions, { quality: q || quality, filter: 'videoandaudio' })
                let pipeOptF = { uri, opt: fullOptions }
                let full = ytdl(uri, fullOptions)
                let fullStream = fs.createWriteStream(dl_path)

                let res_f = await pipeStream(full, fullStream, pipeOptF, "downloading", q || quality, '', 0)
                if(res_f !== 100) return resolve(res_f)

                let r = await encode(uri, q, f)

                return resolve(r)
            }

            let audio = ytdl(uri, Object.assign(dlOptions, { quality: (q || quality)+'audio', filter: 'audioonly' }))
            let audioStream = fs.createWriteStream(dl_audio_path)

            let res_a = await pipeStream(audio, audioStream, "audio")
            if(res_a !== 100) return resolve(res_a)

            if(format === 'mp3') return resolve(100)

            let video = ytdl(uri, Object.assign(dlOptions, { quality: (q || quality)+'video', filter: 'videoonly' }))
            let videoStream = fs.createWriteStream(dl_video_path)

            let res_v = await pipeStream(video, videoStream, "video")
            if(res_v !== 100) return resolve(res_v)

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
                    String(playlistTitle).green.bold,
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
                        { total: 100, current: Math.floor((current / total) * 100), label: 'converting to '+final_format }
                    ])

                    await media.convert(dl_raw_path, dl_path, format)

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