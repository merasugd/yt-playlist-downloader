const fs = require('fs')
const path = require('path')
const fsp = require('fs/promises')
const metadata = require('ffmetadata')
const ffmpeg = require('ffmpeg-static')
const cp = require('child_process')
const uuid = require('uuid').v4

const prog = require('./progress')
const util = require('./tools')
const song = require('./song')

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

module.exports.cut = function(inp) {
    return new Promise(async(resolve) => {
        let final = path.join(__dirname, '..', '..', '.cache', 'temp-'+uuid()+'.mp3')

        let proc = cp.spawn(ffmpeg, [
            '-i', inp,
            '-t', '20', final
        ], {
            windowsHide: true
        })    

        proc.on('error', (err) => {
            prog.log(String(err).red)
            return resolve(101)
        })

        proc.on('close', async() => { 
            return resolve(final)
        })
    })
}

module.exports.editSongMetadata = function(playlistTitle, track, url, raw_path, final_path, progressData, song_title, cover) {
    return new Promise(async(resolve) => {
        prog.multipleProgress([
            String(playlistTitle).green.bold,
            ("Downloading \""+song_title+'"').yellow,
            progressData,
            { total: 100, current: 98, label: 'converting to mp3' }
        ])

        await module.exports.convertMp3(raw_path, final_path)

        if(fs.existsSync(raw_path)) fs.rmSync(raw_path, { force: true })

        prog.multipleProgress([
            String(playlistTitle).green.bold,
            ("Downloading \""+song_title+'"').yellow,
            progressData,
            { total: 100, current: 99, label: 'metadata' }
        ])

        let data = await util.searchYt(url, [
            String(playlistTitle).green.bold,
            ("Downloading \""+song_title+'"').yellow,
            progressData,
            { total: 100, current: 99, label: 'checking internet'.yellow }
        ])

        let cover_dl = await util.basicDL(data.thumbnail, cover)
        if(cover_dl !== 100) {
            prog.log("Failed".red)
            return resolve(101)
        }

        let default_meta = {
            artist: data.author.name,
            composer: data.author.name,
            track: track,
            album: playlistTitle,
            title: data.title,
            genre: data.genre,
            description: data.description,
            date: data.uploadDate.split('-')[0]
        }
        let acr_lyrics = await song(final_path, track, playlistTitle, [
            String(playlistTitle).green.bold,
            ("Downloading \""+song_title+'"').yellow,
            progressData,
            { total: 100, current: 99, label: 'checking internet'.yellow }
        ])
        let meta = util.acrcloud() ? (acr_lyrics !== 101 ? acr_lyrics : default_meta) : default_meta

        metadata.write(final_path, meta, { attachments: [cover], "id3v2.3": true }, async function(err) {
            prog.multipleProgress([
                String(playlistTitle).green.bold,
                ("Downloading \""+song_title+'"').yellow,
                progressData,
                { total: 100, current: 100, label: 'metadata' }
            ])

            if(fs.existsSync(raw_path)) fs.rmSync(raw_path, { force: true })
            if(fs.existsSync(cover)) fs.rmSync(cover, { force: true })

            if(err) return resolve(101)
            return resolve(100)
        })
    })
}

module.exports.editVideoMetadata = function(playlistTitle, ep, video_title, progressData, url, video_path, nometadata, cover) {
    return new Promise(async(resolve) => {
        let data = await util.searchYt(url, [
            String(playlistTitle).green.bold,
            ("Downloading \""+video_title+'"').yellow,
            progressData,
            { total: 100, current: 99, label: 'checking internet'.yellow }
        ])

        let cover_dl = await util.basicDL(data.thumbnail, cover)
        if(cover_dl !== 100) {
            if(fs.existsSync(nometadata)) await fsp.rename(nometadata, video_path)

            prog.log("Failed".red)
            return resolve(101)
        }

        await fsp.rename(video_path, nometadata)

        let proc = cp.spawn(ffmpeg, [
            '-i', nometadata, '-i', cover,
            '-map', '0', '-map', '1',
            '-metadata', `title=${data.title}`,
            '-metadata', `artist=${data.author.name}`,
            '-metadata', `year=${data.uploadDate.split('-')[0]}`,
            '-metadata', `date=${data.uploadDate.split('-')[0]}`,
            '-metadata', `genre=${data.genre}`,
            '-metadata', `album=${playlistTitle}`,
            '-metadata', `description=${data.description}`,
            '-metadata', `episode_id=${ep}`,
            '-metadata', `network=YouTube`,
            '-metadata', `show=YouTube`,
            '-metadata', `sypnosis=${data.description}`,
            '-metadata:s:t', 'mimetype=image/jpeg',
            '-disposition:v:1', 'attached_pic',
            '-codec', 'copy',
            '-y', video_path
        ], {
            windowsHide: true
        })

        proc.on('error', async(err) => {
            if(fs.existsSync(nometadata)) await fsp.rename(nometadata, video_path)
            if(fs.existsSync(cover)) fs.rmSync(cover, { force: true })

            prog.log(String(err).red)
            return resolve(101)
        })

        proc.on('close', async() => { 
            if(fs.existsSync(nometadata)) await fsp.rm(nometadata, { force: true })
            if(fs.existsSync(cover)) fs.rmSync(cover, { force: true })

            return resolve(100)
        })
    })
}