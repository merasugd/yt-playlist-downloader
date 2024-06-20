const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const metadata = require('ffmetadata')
const search = require('yt-search')
const ffmpeg = require('ffmpeg-static')
const cp = require('child_process')
const prog = require('./progress')

const checkNet = require('check-internet-connected')

metadata.setFfmpegPath(ffmpeg)

module.exports.sanitizeTitle = function (title) {
    return String(title).replaceAll(/[\\/:*"?|<>]/g, '');
}

module.exports.config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), { encoding: 'utf-8' }))
module.exports.settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), { encoding: 'utf-8' }))

module.exports.checkInternet = function (d) {
    return new Promise(async(resolve) => {
        if(!module.exports.config['internet_checking']) return resolve(true)
            
        if(d) {
            prog.multipleProgress(d)
        } else {
            prog.log('Checking internet...'.yellow)
        }

        checkNet({ timeout: 10000, retries: 5, domain: "google.com" })
        .then(() => {
            return resolve(true)
        })
        .catch((err) => {
            prog.log(`No Internet: ${err}`.red)
            return resolve(false)
        })
    })
}

module.exports.searchYt = function(uri, d) {
    return new Promise(async(resolve) => {
        let net = await module.exports.checkInternet(d)
        if(!net) return process.exit(1)
        
        let data = await search({ videoId: uri.replaceAll('https://www.youtube.com/watch?v=', '') })

        return resolve(data)
    })
}

module.exports.boolean = function(bool) {
    bool = bool.toLowerCase()

    if(bool === 'y' || bool === 'yes' || bool === 'true') {
        return true
    }
    
    return false
}

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

        let data = await module.exports.searchYt(url, [
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
        let data = await module.exports.searchYt(url, [
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
