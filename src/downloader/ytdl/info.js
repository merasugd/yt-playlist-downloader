const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const HttpsProxyAgent = require('https-proxy-agent')

const util = require('../../utils/tools')

let ytdlApi = 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc' //credits to yt-dlp
let myApi = 'AIzaSyB_ya5yPGpiyFBbJ20yPPtMIDVfT2ZS3js'

let cookies = util.settings['cookie'] || ''
let proxyServer = util.settings['proxy_server'] || ''
let proxyAgent = proxyServer !== '' && !proxyServer.startsWith(' ') ? HttpsProxyAgent(proxyServer) : undefined
let ytIdentityToken = typeof util.settings['youtube_identity_token'] === 'string' && util.settings['youtube_identity_token'] !== '' && !util.settings['youtube_identity_token'].startsWith(' ') ? util.settings['youtube_identity_token'] : undefined

let cookie = null
let agent = null

if(util.config['use_youtube_cookies']) {
    cookie = cookies !== '' && !cookies.startsWith(' ') ? { cookie: cookies, ytId: ytIdentityToken } : null
}
if(util.config['use_proxy_server']) {
    agent = proxyServer !== '' && !proxyServer.startsWith(' ') && proxyServer.startsWith('http') ? proxyAgent : null
 }

module.exports = function(vidId) {
    let api = ytdlApi
    let cookies = typeof cookie === 'object' ? cookie.cookie : null
    let ytId = typeof cookie === 'object' ? cookie.ytId : null

    let headers = cookies && ytId ? {
        'X-YouTube-Client-Name': '5',
        'X-YouTube-Client-Version': '19.09.3',
        Origin: 'https://www.youtube.com',
        'User-Agent': 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
        'content-type': 'application/json',
        'Cookie': cookies,
        'x-youtube-identity-token': ytId
    } : {
        'X-YouTube-Client-Name': '5',
        'X-YouTube-Client-Version': '19.09.3',
        Origin: 'https://www.youtube.com',
        'User-Agent': 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
        'content-type': 'application/json'
    }
    let req = {
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
        videoId: vidId,
        playbackContext: { contentPlaybackContext: { html5Preference: 'HTML5_PREF_WANTS' } },
        contentCheckOk: true,
        racyCheckOk: true
    }

    let url = `https://www.youtube.com/youtubei/v1/player?key${api}&prettyPrint=false`

    return new Promise(async(resolve) => {
        let got = await fetch(url, { method: 'POST', agent, body: JSON.stringify(req), headers })
        let json = await got.json()

        if(json.playabilityStatus && json.playabilityStatus.status === 'ERROR') {
            return resolve(json.playabilityStatus)    
        } else if(!json.streamingData || !json.videoDetails) {
            return resolve({ status: 'ERROR', reason: 'BAD REQUEST' })
        }

        let fullDetails = await fullVidInfo(vidId, cookies, ytId)

        return resolve(Object.assign({ streams: json.streamingData, details: json.videoDetails, fullDetails }, json.playabilityStatus))
    })
}

function fullVidInfo(vidId, cookies, ytId) {
    return new Promise(async(resolve) => {
        let apiKey = myApi

        let headers = {
            'Cookie': cookies,
            'x-youtube-identity-token': ytId,
            'Content-Type': 'application/json'
        }
        
        let url = `https://www.googleapis.com/youtube/v3/videos?id=${vidId}&key=${apiKey}&part=snippet,contentDetails,statistics,status`;

        try {
            let response = cookies && ytId ? await fetch(url, { headers, agent }) : await fetch(url, { agent })
            let yt = await response.json()

            if (!yt.items || !Array.isArray(yt.items) || yt.items.length < 1) {
                return resolve(null);
            }

            return resolve(yt.items[0])
        } catch (error) {
            return resolve(null)
        }
    })
}