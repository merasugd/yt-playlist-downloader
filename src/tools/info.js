const ytdl = require('ytdl-core').getInfo
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const cookie = require('./cookie')

function info(vidId) {
    return new Promise(async(resolve) => {
        ytdl(`https://www.youtube.com/watch?v=${vidId}`, cookie.use())
        .then(data => {
            return resolve({ streams: data.formats, details: data.videoDetails, fullDetails: data, status: 'GOOD' })
        })
        .catch(err => {
            return resolve({ status: 'ERROR', reason: err })
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
          
        const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key${apiKey}&prettyPrint=false`, Object.assign({ agent: cookie.use().agent }, cookie.use().requestOptions, { method: 'POST', body: JSON.stringify(b), headers }));
            
        if(!res.ok) return resolve({ status: res.status, reason: res.statusText })
        const json = await res.json();

        if(json.playabilityStatus.status !== 'OK') return resolve(json.playabilityStatus)

        return resolve({ streams: json.streamingData.adaptiveFormats, details: json.videoDetails, fullDetails: json, status: 'GOOD' })
    })
}

module.exports = { new: info2, old: info }