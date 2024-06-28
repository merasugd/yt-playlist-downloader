const DL = require('easydl')

const util = require('../../utils/tools')
const info = require('./info')

function filter(all, quality) {
    if (quality === 'highest') {
        return all[all.length - 1]
    } else if (quality === 'lowest') {
        return all[0]
    } else if (quality === 'medium') {
        return all[Math.floor(all.length / 2)]
    }
}

function convertSpeedToString(speed) {
    if (speed >= 1024 * 1024 * 1024) {
        return ((speed / (1024 * 1024 * 1024)).toFixed(2) + ' GB/s').green.bold;
    } else if (speed >= 1024 * 1024) {
        return ((speed / (1024 * 1024)).toFixed(2) + ' MB/s').green;
    } else if (Math.floor(speed) <= 0) {
        return '0 KB/s'.red
    } else {
        return ((speed / 1024).toFixed(2) + ' KB/s').yellow;
    }
}

module.exports = function(url, data, cb) {
    let { quality, format, output_path } = data

    let id = util.fetchId(util.fetchPlaylistID(url)) === 'video' ? util.fetchPlaylistID(url) : null

    return new Promise(async(resolve) => {
        let got = await info(id)
        if(got.status === 'ERROR') return resolve(got)
        
        let all = got.streams.adaptiveFormats
        if (!all || !Array.isArray(all)) return resolve({ status: 'ERROR', reason: 'NO STREAMS' })
        
        let all_audio = all.filter(v => v.mimeType.startsWith('audio/'))
        let all_video = all.filter(v => v.mimeType.startsWith('video/'))

        all_audio.sort((a, b) => a.bitrate - b.bitrate)
        all_video.sort((a, b) => a.bitrate - b.bitrate)

        let toDl = null

        if(format === 'audio') {
            toDl = filter(all_audio, quality)
        } else if(format === 'video') {
            toDl = filter(all_video, quality)
        } else return resolve({ status: 'ERROR', reason: 'BAD FORMAT' })

        try {
            const dl = new DL(toDl.url, output_path, {
                existBehavior: "overwrite"
            })

            dl.on('progress', ({ total }) => {
                let data = {
                    speed: {
                        string: convertSpeedToString(total.speed),
                        speed: total.speed
                    },
                    percentage: total.percentage.toFixed(2)
                }

                cb('progress', data)
            })
            dl.on('error', (err) => {
                cb('error', err)
            })
            dl.on('end', () => {
                cb('finish', 100)
                return resolve({ status: 'SUCCESS' })
            })

            dl.start()
        } catch (e) {
            cb('error', e)
            return resolve({ status: 'ERROR', reason: 'BAD DOWNLOAD' })
        }
    })
}