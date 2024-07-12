const DL = require('easydl')

const util = require('../utils/tools')
const info = require('./info').new
const cookie = require('./cookie')

module.exports = function(url, data, cb) {
    let { quality, video, audio } = data

    let id = util.fetchId(util.fetchPlaylistID(url)) === 'video' ? util.fetchPlaylistID(url) : null

    return new Promise(async(resolve) => {
        let got = await info(id)
        if(got.status === 'ERROR') return resolve(got)
        
        let all = got.streams || []
        if (!all || !Array.isArray(all)) return resolve({ status: 'ERROR', reason: 'NO STREAMS' })
        
        all = all.filter(v => !v.isLive)
        
        let all_video = all.filter(v => v.mimeType.startsWith('video/'))
        let all_audio = all.filter(v => v.mimeType.startsWith('audio/'))
        
        all_audio.sort((a, b) => a.bitrate - b.bitrate)
        all_video.sort((a, b) => a.bitrate - b.bitrate)

        let toDlV = filter(all_video, quality)
        let toDlA = filter(all_audio, quality)
        
        let audioProgress = null
        let videoProgress = null

        let audioEnded = false
        let videoEnded = false

        if(!toDlV || !toDlA) return resolve({ status: 'ERROR', reason: 'BAD FORMAT' })

        try {
            const dlV = new DL(toDlV.url, video+'.'+toDlV.extension, {
                existBehavior: "new_file",
                httpOptions: cookie.use().requestOptions
            })
            const dlA = new DL(toDlA.url, audio+'.'+toDlA.extension, {
                existBehavior: "new_file",
                httpOptions: cookie.use().requestOptions
            })

            dlV.on('build', () => {
                dlA.start()
            })
            dlA.on('build', () => {
                cb('start', [toDlV, toDlA])
            })

            const checkProgress = () => {
                if (videoProgress && audioProgress) {
                    cb('progress', [videoProgress, audioProgress]);
                    videoProgress = null;
                    audioProgress = null;
                }
            }
            const checkEnd = () => {
                if (videoEnded && audioEnded) {
                    cb('finish', 100);
                    return resolve({ status: 'SUCCESS' })
                }
            }

            dlV.on('progress', ({ total }) => {
                videoProgress = {
                    speed: {
                        string: convertSpeedToString(total.speed),
                        speed: total.speed
                    },
                    percentage: total.percentage.toFixed(2),
                    type: 'video'
                }
                
                checkProgress()
            })
            dlA.on('progress', ({ total }) => {
                audioProgress = {
                    speed: {
                        string: convertSpeedToString(total.speed),
                        speed: total.speed
                    },
                    percentage: total.percentage.toFixed(2),
                    type: 'audio'
                }

                checkProgress()
            })

            dlV.on('error', (err) => {
                cb('error', err)
            })
            dlA.on('error', (err) => {
                cb('error', err)
            })

            dlV.on('end', () => {
                videoEnded = true
            })
            dlA.on('end', () => {
                audioEnded = true
            })

            setInterval(() => checkProgress())
            setInterval(() => checkEnd())

            dlV.start()
        } catch (e) {
            cb('error', e)
            return resolve({ status: 'ERROR', reason: 'BAD DOWNLOAD' })
        }
    })
}

module.exports.info = info

function filter(all, quality) {
    if (quality === 'highest') {
        return all[all.length - 1]
    } else if (quality === 'lowest') {
        return all[0]
    } else if (quality === 'medium') {
        return all[Math.floor(all.length / 2)]
    } else return null
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