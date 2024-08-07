const fs = require('fs');
const path = require('path');
const colors = require('colors');
const ffmpeg = require('ffmpeg-static')

const cp = require('child_process')

const prog = require('../../utils/progress')
const util = require('../../utils/tools')
const media = require('../../utils/media')
const multi = require('../../tools/multiple_download')
const downloader = require('../../tools/ytdl')

function download(playlistTitle, data, bin, progressData, author, index) {
    let url = data.url;
    let title = data.title

    let format = util.formatCheck(data.format, false, true)
    let final_format = data.format || 'mp4'
    let quality = data.quality || 'highest'

    let dl_title = util.sanitizeTitle(title)
    let raw_title = dl_title.replaceAll(' ', '_').toLowerCase()

    let dl_audio_path = path.join(bin, raw_title+".audio.0000000000000EXTREP000083974374374")
    let dl_video_path = path.join(bin, raw_title+".video.0000000000000EXTREP000083974374374")
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

            if(format === 'mp3') {
                let res_audio = await progressStreamA(uri, 'audio')
                if(res_audio !== 100) return resolve(res_audio)

                return resolve(100)
            }

            let res_video = await progressStream(uri)
            if(res_video !== 100) return resolve(res_video)

            let result = await encode()
            return resolve(result)
        })
    }

    function progressStreamA(uri, label) {
        return new Promise(async(resolve) => {
            let res = await downloader(uri, {
                format: format === 'mp4' ? 'both' : 'audio',
                quality: quality,
                output_path: dl_audio_path.replaceAll('.0000000000000EXTREP000083974374374', '')
            }, (event, data) => {
                if(event === 'start') {
                    let ext = data.extension

                    dl_audio_path = dl_audio_path.replaceAll('.0000000000000EXTREP000083974374374', '.'+ext)
                } else if(event === 'progress') {
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
    
    function progressStream(uri) {
        return new Promise(async(resolve) => {
            let res = await multi(uri, {
                video: dl_video_path.replaceAll('.0000000000000EXTREP000083974374374', ''),
                quality: quality,
                audio: dl_audio_path.replaceAll('.0000000000000EXTREP000083974374374', '')
            }, (event, data) => {
                if(event === 'start') {
                    let ext1 = data[0].extension
                    let ext2 = data[1].extension

                    dl_video_path = dl_video_path.replaceAll('.0000000000000EXTREP000083974374374', '.'+ext1)
                    dl_audio_path = dl_audio_path.replaceAll('.0000000000000EXTREP000083974374374', '.'+ext2)
                } else if(event === 'progress') {
                    const percent = data[0].percentage
                    const percent2 = data[1].percentage
                    const speed = data[0].speed.string
                    const speed2 = data[1].speed.string

                    const label = data[0].type
                    const label2 = data[1].type

                    prog.multipleProgress([
                        String(playlistTitle).green.bold,
                        ("Downloading \""+dl_title+'"').yellow,
                        progressData,
                        { total: 100, current: Math.floor(parseInt(percent)), label, speed },
                        { total: 100, current: Math.floor(parseInt(percent2)), label: label2, speed: speed2 }
                    ])
                } else if(event === 'error') {
                    prog.log(String(data).red)
                    return resolve(101)
                } else if(event === 'finish') {
                }
            })
            
            if(res.status !== 'SUCCESS') return resolve(101)

            last_current = 200
            current = 200
            
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