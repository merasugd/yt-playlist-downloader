const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const ffmpeg = require('ffmpeg-static')

const prog = require('../../utils/progress')
const util = require('../../utils/tools')
const media = require('../../utils/media')
const download = require('./m3u8')

module.exports = function(playlistTitle, data, bin, progressData, author, index) {
    let sources = data.sources.sources
    let headers = data.sources.headers || {}
    let title = util.sanitizeTitle(data.title)

    let quality = data.quality
    let format = data.format

    let raw_path = path.join(bin, `${title.toLowerCase().replaceAll(' ', '_')}.raw.mp4`)
    let nometadata_path = path.join(bin, `${title.toLowerCase().replaceAll(' ', '_')}.nometadata.mp4`)
    let metadata = path.join(bin, `${title.toLowerCase().replaceAll(' ', '_')}.metadata.mp4`)
    let dl_path = path.join(bin, `${title}.${format}`)
    let cover = path.join(bin, 'cover.jpg')

    if(fs.existsSync(raw_path)) fs.rmSync(raw_path, { force: true })
    if(fs.existsSync(nometadata_path)) fs.rmSync(nometadata_path, { force: true })
    if(fs.existsSync(metadata)) fs.rmSync(metadata, { force: true })
    if(fs.existsSync(dl_path)) fs.rmSync(dl_path, { force: true })
    if(fs.existsSync(cover)) fs.rmSync(cover, { force: true })

    let total = 102
    let current = 0

    prog.multipleProgress([
        String(playlistTitle).green.bold,
        ("Downloading \""+title+'"').yellow,
        progressData,
        { total: 100, current: 0, label: 'waiting' }
    ])
    
    function dl() {
        return new Promise(async(resolve) => {
            let mainStream = await progressStream()
            if(mainStream !== 100) return resolve(mainStream)

            let result = await meta()
            return resolve(result)
        })
    }

    function progressStream() {
        return new Promise(async(resolve) => {
            download(raw_path, quality, sources, headers, (event, data) => {
                if(event === 'error') return resolve(101)
                if(event === 'end') return resolve(100)

                if(event === 'progress') {
                    current = Math.floor((data.current / total) * 100)
                    data.current = current

                    prog.multipleProgress([
                        String(playlistTitle).green.bold,
                        ("Downloading \""+title+'"').yellow,
                        progressData,
                        data
                    ])
                }
            })
        })
    }

    function meta() {
        return new Promise(async(resolve) => {
            prog.multipleProgress([
                String(playlistTitle).green.bold,
                ("Downloading \""+title+'"').yellow,
                progressData,
                { total: 100, current: Math.floor((current / total) * 100), label: 'metadata' }
            ])

            try {
                await util.basicDL(data.cover, cover)
                await fs.promises.rename(raw_path, nometadata_path)
            } catch (err) {
                console.log(err)
                return resolve(101)
            }
            
            let proc = cp.spawn(ffmpeg, [
                '-i', nometadata_path, '-i', cover,
                '-map', '0', '-map', '1',
                '-metadata', `title=${data.title}`,
                '-metadata', `artist=${author}`,
                '-metadata', `composer=${author}`,
                '-metadata', `album_artist=${author}`,
                '-metadata', `year=${data.year}`,
                '-metadata', `date=${data.year}`,
                '-metadata', `genre=Anime`,
                '-metadata', `album=${playlistTitle}`,
                '-metadata', `description=${data.description}`,
                '-metadata', `episode_id=${index}`,
                '-metadata', `track=${index}`,
                '-metadata', `network=${author}`,
                '-metadata', `show=${playlistTitle}`,
                '-metadata', `sypnosis=${data.description}`,
                '-metadata:s:t', 'mimetype=image/jpeg',
                '-disposition:v:1', 'attached_pic',
                '-codec', 'copy',
                '-y', metadata
            ], {
                windowsHide: true
            })

            proc.on('error', async(err) => {
                if(fs.existsSync(nometadata_path)) await require('fs/promises').rename(nometadata_path, dl_path)
                if(fs.existsSync(cover)) fs.rmSync(cover, { force: true })
    
                prog.log(String(err).red)
                return resolve(101)
            })
    
            proc.on('close', async() => { 
                current = current + 1

                prog.multipleProgress([
                    String(playlistTitle).green.bold,
                    ("Downloading \""+title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / total) * 100), label: 'metadata' }
                ])

                prog.multipleProgress([
                    String(playlistTitle).green.bold,
                    ("Downloading \""+title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / total) * 100), label: 'converting to '+format }
                ])

                if(format !== 'mp4') {
                    let res_c = await media.convert(metadata, dl_path, format)
                    if(res_c !== 100) return resolve(res_c)
    
                    if(fs.existsSync(metadata)) fs.rmSync(metadata, { force: true })
                } else await require('fs/promises').rename(metadata, dl_path)

                current = current + 1

                prog.multipleProgress([
                    String(playlistTitle).green.bold,
                    ("Downloading \""+title+'"').yellow,
                    progressData,
                    { total: 100, current: Math.floor((current / total) * 100), label: 'converting to '+format }
                ])
    
                if(fs.existsSync(metadata)) await require('fs/promises').rm(metadata, { force: true })
                if(fs.existsSync(nometadata_path)) await require('fs/promises').rm(nometadata_path, { force: true })
                if(fs.existsSync(cover)) fs.rmSync(cover, { force: true })
    
                return resolve(100)
            })
        })
    }

    return new Promise(async(resolve) => {
        let dl_result = await dl()

        if(fs.existsSync(raw_path)) fs.rmSync(raw_path, { force: true })
        if(fs.existsSync(nometadata_path)) fs.rmSync(nometadata_path, { force: true })
        if(fs.existsSync(metadata)) fs.rmSync(metadata, { force: true })
        if(fs.existsSync(cover)) fs.rmSync(cover, { force: true })

        return resolve(dl_result)
    })
}