const fs = require('fs')
const fsp = require('fs/promises')
const metadata = require('ffmetadata')
const ffmpeg = require('ffmpeg-static')
const cp = require('child_process')

const prog = require('./progress')
const util = require('./tools')

metadata.setFfmpegPath(ffmpeg)

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

module.exports.editSongMetadata = function(playlistTitle, url, raw_path, final_path, progressData, song_title) {
    return new Promise(async(resolve) => {
        prog.multipleProgress([
            ("Downloading \""+song_title+'"').yellow,
            progressData,
            { total: 100, current: 98, label: 'converting to mp3' }
        ])

        await module.exports.convertMp3(raw_path, final_path)

        if(fs.existsSync(raw_path)) fs.rmSync(raw_path, { force: true })

        prog.multipleProgress([
            ("Downloading \""+song_title+'"').yellow,
            progressData,
            { total: 100, current: 99, label: 'metadata' }
        ])

        let data = await util.searchYt(url, [
            ("Downloading \""+song_title+'"').yellow,
            progressData,
            { total: 100, current: 99, label: 'checking internet'.yellow }
        ])

        metadata.write(final_path, {
            artist: data.author.name,
            album: playlistTitle,
            title: data.title,
            genre: data.genre,
            description: data.description,
            date: data.uploadDate.split('-')[0]
        }, {}, function(err) {
            prog.multipleProgress([
                ("Downloading \""+song_title+'"').yellow,
                progressData,
                { total: 100, current: 100, label: 'metadata' }
            ])

            if(fs.existsSync(raw_path)) fs.rmSync(raw_path, { force: true })

            if(err) return resolve(101)
            return resolve(100)
        })
    })
}

module.exports.editVideoMetadata = function(playlistTitle, video_title, progressData, url, video_path, nometadata) {
    return new Promise(async(resolve) => {
        let data = await util.searchYt(url, [
            ("Downloading \""+video_title+'"').yellow,
            progressData,
            { total: 100, current: 99, label: 'checking internet'.yellow }
        ])

        await fsp.rename(video_path, nometadata)

        let proc = cp.spawn(ffmpeg, [
            '-i', nometadata,
            '-metadata', `title=${data.title}`,
            '-metadata', `artist=${data.author.name}`,
            '-metadata', `year=${data.uploadDate.split('-')[0]}`,
            '-metadata', `date=${data.uploadDate.split('-')[0]}`,
            '-metadata', `genre=${data.genre}`,
            '-metadata', `album=${playlistTitle}`,
            '-metadata', `description=${data.description}`,
            '-codec', 'copy',
            '-y', video_path
        ], {
            windowsHide: true
        })

        proc.on('error', async(err) => {
            if(fs.existsSync(nometadata)) await fsp.rename(nometadata, video_path)

            prog.log(String(err).red)
            return resolve(101)
        })

        proc.on('close', async() => { 
            if(fs.existsSync(nometadata)) await fsp.rm(nometadata, { force: true })

            return resolve(100)
        })
    })
}
