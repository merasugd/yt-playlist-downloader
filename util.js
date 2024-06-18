const fs = require('fs')
const path = require('path')
const metadata = require('ffmetadata')
const search = require('yt-search')
const ffmpeg = require('ffmpeg-static')
const cp = require('child_process')

const prog = require('./progress')

metadata.setFfmpegPath(require('ffmpeg-static'))

module.exports.sanitizeTitle = function (title) {
    return String(title).replaceAll(/[\\/:*"?|<>]/g, '');
}

module.exports.config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), { encoding: 'utf-8' }))

module.exports.convertMp4 = function(inp, out) {
    return new Promise(async(resolve) => {
        let proc = cp.spawn(ffmpeg, [
            '-i', inp,
            '-c:v', 'copy', out
        ], {
            windowsHide: true
        })    

        proc.on('error', (err) => {
            prog.log(String(err).red)
            return resolve(101)
        })

        proc.on('close', async() => { 
            return resolve(100)
        })
    })
}

module.exports.convertMp3 = function(inp, out) {
    return new Promise(async(resolve) => {
        let proc = cp.spawn(ffmpeg, [
            '-i', inp,
            '-vn', '-ab', '128k', '-ar', '44100',
            '-y', out
        ], {
            windowsHide: true
        })

        proc.on('error', (err) => {
            prog.log(String(err).red)
            return resolve(101)
        })

        proc.on('close', async() => { 
            return resolve(100)
        })
    })
}

module.exports.editSongMetadata = function(pl, url, patther, final, thumb, progressData, dl_title) {
    return new Promise(async(resolve) => {
        let data = await search({ videoId: url.replaceAll('https://www.youtube.com/watch?v=', '') })

        prog.multipleProgress([
            ("Downloading \""+dl_title+'"').yellow,
            progressData,
            { total: 100, current: 100, label: 'converting' }
        ])

        await module.exports.convertMp3(patther, final)

        metadata.write(final, {
            artist: data.author.name,
            album: pl,
            title: data.title,
            genre: data.genre,
            description: data.description,
            date: data.uploadDate.split('-')[0]
        }, { attachments: [thumb] }, function(err) {
            if(err) return resolve(101)
            return resolve(100)
        })
    })
}
