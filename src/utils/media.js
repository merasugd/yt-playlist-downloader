const fs = require('fs')
const path = require('path')
const fsp = require('fs/promises')
const ffmpeg = require('ffmpeg-static')
const ffprobe = require('ffprobe-static').path
const cp = require('child_process')
const { getAudioDurationInSeconds } = require('get-audio-duration')
const uuid = require('uuid').v4

const prog = require('./progress')
const util = require('./tools')
const song = require('./song')

const metadata = require('../tools/ffmetadata')

metadata.setFfmpegPath(ffmpeg)

module.exports.ffmpeg = function(args) {
    return new Promise(async(resolve) => {
        let proc = cp.spawn(ffmpeg, args, {
            windowsHide: true
        })    

        proc.on('error', (err) => {
            prog.log(String(err).red)
            return resolve(101)
        })

        //proc.stderr.on('data', (d) => console.log(d.toString()))

        proc.on('close', async() => { 
            return resolve(100)
        })
    })
}

module.exports.convertMp4 = function(inp, out) {
    return new Promise(async(resolve) => {
        let proc = cp.spawn(ffmpeg, util.formatCheck('mp4', inp, out, true), {
            windowsHide: true
        })    

        proc.on('error', (err) => {
            console.log(String(err).red)
            return resolve(101)
        })

        proc.on('close', async() => { 
            return resolve(100)
        })
    })
}

module.exports.convert = function(inp, out, fom) {
    return new Promise(async(resolve) => {
        let result = await module.exports.ffmpeg(util.formatCheck(fom, inp, out, true))

        if(result === 100) {
            if(fs.existsSync(inp)) fs.rmSync(inp, { force: true })
            
            return resolve(result)
        } else {
            if(fs.existsSync(out)) fs.rmSync(out, { force: true })
            
            return resolve(101)
        }
    })
}

module.exports.convertMp3 = function(inp, out) {
    return new Promise(async(resolve) => {
        let proc = cp.spawn(ffmpeg, util.formatCheck('mp3', inp, out, true), {
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

        let dur = await getAudioDurationInSeconds(inp, ffprobe)
        if(dur < 30) return resolve(101)

        let proc = cp.spawn(ffmpeg, [
            '-i', inp,
            '-ss', '10',
            '-t', '10', final
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

module.exports.editSongMetadata = function(playlistTitle, track, url, raw_path, final_path, progressData, song_title, cover, final_format, final_dl_path, composer) {
    return new Promise(async(resolve) => {
        prog.multipleProgress([
            String(playlistTitle).green.bold,
            ("Downloading \""+song_title+'"').yellow,
            progressData,
            { total: 100, current: 98, label: 'converting to '+final_format }
        ])

        await module.exports.convert(raw_path, final_path, 'mp3')

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

        composer = composer || {}

        let default_meta = {
            artist: data.author.name,
            composer: data.author.name,
            album_artist: (composer||{name:'YTPLDl'}).name,
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

            if(final_format !== 'mp3') {
                let res_c = await module.exports.convert(final_path, final_dl_path, final_format)
                if(res_c !== 100) return resolve(res_c)

                if(fs.existsSync(final_path)) fs.rmSync(final_path, { force: true })
            }

            if(fs.existsSync(raw_path)) fs.rmSync(raw_path, { force: true })
            if(fs.existsSync(cover)) fs.rmSync(cover, { force: true })

            if(err) return resolve(101)
            return resolve(100)
        })
    })
}

module.exports.editVideoMetadata = function(playlistTitle, ep, video_title, progressData, url, video_path, nometadata, cover, final_format, final_dl_path, composer, met) {
    return new Promise(async(resolve) => {
        let data = met && typeof met === 'object' ? met : await util.searchYt(url, [
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

        composer = composer || {}

        await fsp.rename(video_path, nometadata)

        let proc = cp.spawn(ffmpeg, [
            '-i', nometadata, '-i', cover,
            '-map', '0', '-map', '1',
            '-metadata', `title=${data.title}`,
            '-metadata', `artist=${data.author.name}`,
            '-metadata', `composer=${data.author.name}`,
            '-metadata', `album_artist=${(composer||{name:'YTPLDl'}).name}`,
            '-metadata', `year=${data.uploadDate.split('-')[0]}`,
            '-metadata', `date=${data.uploadDate.split('-')[0]}`,
            '-metadata', `genre=${data.genre}`,
            '-metadata', `album=${playlistTitle}`,
            '-metadata', `description=${data.description}`,
            '-metadata', `episode_id=${ep}`,
            '-metadata', `track=${ep}`,
            '-metadata', `network=YouTube`,
            '-metadata', `show=${playlistTitle}`,
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
            if(final_format !== 'mp4') {
                let res_c = await module.exports.convert(video_path, final_dl_path, final_format)
                if(res_c !== 100) return resolve(res_c)

                if(fs.existsSync(video_path)) fs.rmSync(video_path, { force: true })
            }

            if(fs.existsSync(nometadata)) await fsp.rm(nometadata, { force: true })
            if(fs.existsSync(cover)) fs.rmSync(cover, { force: true })

            return resolve(100)
        })
    })
}
