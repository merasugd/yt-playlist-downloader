const fs = require('fs');
const path = require('path');
const colors = require('colors');

const prog = require('../../utils/progress')
const util = require('../../utils/tools')
const media = require('../../utils/media')
const downloader = require('../../tools/ytdl')

function download(playlistTitle, data, bin, progressData, author, index) {
    let url = data.url;
    let title = data.title

    let format = util.formatCheck(data.format, false, true)
    let final_format = data.format || 'mp4'
    let quality = data.quality || 'highest'

    let dl_title = util.sanitizeTitle(title)
    let raw_title = dl_title.replaceAll(' ', '_').toLowerCase()

    let dl_raw_path = path.join(bin, raw_title+".raw.0000000000000EXTREP000083974374374s")
    let dl_path = path.join(bin, dl_title+'.'+format)
    let dl_final_path = path.join(bin, dl_title+'.'+final_format)

    let nometadata = path.join(bin, dl_title+'.no_metadata.'+format)
    let cover_jpg = path.join(bin, 'cover.jpg')

    if(fs.existsSync(dl_raw_path)) fs.rmSync(dl_raw_path, { force: true })
    if(fs.existsSync(nometadata)) fs.rmSync(nometadata, { force: true })
    if(fs.existsSync(cover_jpg)) fs.rmSync(nometadata, { force: true })
    if(fs.existsSync(dl_path)) fs.rmSync(dl_path, { force: true })
    if(fs.existsSync(dl_final_path)) fs.rmSync(dl_final_path, { force: true })

    let total = 203
    let current = 0
    let last_current = 0


    function dl(uri, q) {
        return new Promise(async(resolve) => {
            
            prog.multipleProgress([
                String(playlistTitle).green.bold,
                ("Downloading \""+dl_title+'"').yellow,
                progressData,
                { total: 100, current: 0, label: 'waiting' }
            ])

            if(format === 'mp4') {
                let res_f = await progressStream(uri, dl_raw_path, "downloading")
                if(res_f !== 100) return resolve(res_f)

                prog.multipleProgress([
                    String(playlistTitle).green.bold,
                    ("Downloading \""+dl_title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / 102) * 100), label: "converting to "+final_format }
                ])

                let r1 = await media.convert(dl_raw_path, dl_path, format)
                if(r1 !== 100) return resolve(r1)
                if(fs.existsSync(dl_raw_path)) fs.rmSync(dl_raw_path)
                current = current + 1

                prog.multipleProgress([
                    String(playlistTitle).green.bold,
                    ("Downloading \""+dl_title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / 102) * 100), label: "converting to "+final_format }
                ])
                prog.multipleProgress([
                    String(playlistTitle).green.bold,
                    ("Downloading \""+dl_title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / 102) * 100), label: "metadata" }
                ])

                let r = await media.editVideoMetadata(playlistTitle, index, dl_title, progressData, uri, dl_path, nometadata, cover_jpg, final_format, dl_final_path, author)
                current = current + 1

                prog.multipleProgress([
                    String(playlistTitle).green.bold,
                    ("Downloading \""+dl_title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / 102) * 100), label: "metadata" }
                ])

                return resolve(r)
            }

            let res_a = await progressStream(uri, dl_raw_path, "downloading")
            if(res_a !== 100) return resolve(res_a)

            let result = await media.editSongMetadata(playlistTitle, index, uri, dl_raw_path, dl_path, progressData, dl_title, cover_jpg, final_format, dl_final_path, author)

            return resolve(result)
        })
    }

    function progressStream(uri, pathage, label) {
        return new Promise(async(resolve) => {
            let res = await downloader(uri, {
                format: format === 'mp4' ? 'both' : 'audio',
                quality: quality,
                output_path: pathage.replaceAll('.0000000000000EXTREP000083974374374', '')
            }, (event, data) => {
                if(event === 'start') {
                    let ext = data.extension

                    dl_raw_path = dl_raw_path.replaceAll('.0000000000000EXTREP000083974374374', '.'+ext)
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

    return new Promise(async(resolve) => {
        let result = await dl(url)

        if(result === 100) {
            if(fs.existsSync(dl_raw_path)) fs.rmSync(dl_raw_path, { force: true })
            if(fs.existsSync(nometadata)) fs.rmSync(dl_video_path, { force: true })
            if(fs.existsSync(cover_jpg)) fs.rmSync(nometadata, { force: true })
        }

        return resolve(result)
    })
}

module.exports = download