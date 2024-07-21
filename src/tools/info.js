const ytdl = require('@distube/ytdl-core').getInfo
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const undici = (...args) => import('undici').then((undici) => undici.fetch(...args));

const cookie = require('./cookie')

function getExtension(mimeType) {
    const match = mimeType.match(/\/([a-z0-9]+)$/i);
    return match ? match[1] : null;
}

function info(vidId) {
    return new Promise(async(resolve) => {
        ytdl(`https://www.youtube.com/watch?v=${vidId}`, cookie.use())
        .then(data => {
            return resolve({ streams: data.formats.map(v => {
                let mime = v.mimeType.split(';')[0]
                let ext = getExtension(mime)

                v.extension = ext

                return v
            }), details: data.videoDetails, fullDetails: data, status: 'GOOD' })
        })
        .catch(async(err) => {
            return resolve(await info2(vidId))
        })
    })
}

function info2(videoId) {
    return new Promise(async(resolve) => {
        const apiKey = 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc'
        const headers = {
            'X-YouTube-Client-Name': '5',
            'X-YouTube-Client-Version': '19.09.3',
            Origin: 'https://www.youtube.com',
            'User-Agent': 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
            'content-type': 'application/json'
        }
          
        const b = {
            context: {
                client: {
                    clientName: 'IOS',
                    clientVersion: '19.09.3',
                    deviceModel: 'iPhone14,3',
                    userAgent: 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
                    hl: 'en',
                    timeZone: 'UTC',
                    utcOffsetMinutes: 0
                }
            },
            videoId,
            playbackContext: { contentPlaybackContext: { html5Preference: 'HTML5_PREF_WANTS' } },
            contentCheckOk: true,
            racyCheckOk: true
        }
          
        const res = await undici(`https://www.youtube.com/youtubei/v1/player?key${apiKey}&prettyPrint=false`, Object.assign(cookie.use().agent, { method: 'POST', body: JSON.stringify(b), headers }));
            
        if(!res.ok) return resolve({ status: res.status, reason: res.statusText })
        const json = await res.json();

        if(json.playabilityStatus.status !== 'OK') return resolve(json.playabilityStatus)

        return resolve({ streams: json.streamingData.adaptiveFormats.map(v => {
            let mime = v.mimeType.split(';')[0]
            let ext = getExtension(mime)

            v.extension = ext

            return v
        }), details: json.videoDetails, fullDetails: json, status: 'GOOD' })
    })
}

module.exports = { new: info, old: info }