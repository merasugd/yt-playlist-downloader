const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { ANIME } = require('@consumet/extensions')
const codec = import('iso-639-2')
const nodeurl = require('node:url')
const apis = require('../../../settings/api')
const colors = require('colors')

const prog = require('../../utils/progress')

const isUrl = (input) => {
    try {
        new nodeurl.URL(input)
        return true
    } catch (_) {
        return false
    }
}

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}

const ZoroApi = apis.consumet_apis.filter(v => isUrl(v))
const AniwatchApi = apis.aniwatch_apis.filter(v => isUrl(v))

const urlExists = (uri) => {
    return new Promise(async(resolve) => {
        let res = await fetch(uri, { headers })
        if(!res.ok) return resolve(false)
        
        return resolve(true)
    })
}
const customApi = async(list = ['hi']) => {
    let fetched = list[Math.floor(Math.random() * list.length)];

    let api = fetched
    let is_valid = await urlExists(api)
    
    if(!api || !is_valid) {
        prog.log(`No ${list === ZoroApi ? 'Consumet ' : list === AniwatchApi ? 'Aniwatch ' : ''}APIs found! Are you sure they are urls and requestable?`.red)
        return process.exit(1)
    }

    if(!api.endsWith('/')) api = api+'/'

    return api + (list === ZoroApi ? 'anime/zoro' : list === AniwatchApi ? 'anime' : '')
}

const langCodec = async function(lang) {
    let allCodecs = (await codec).iso6392
    let fetched = allCodecs.find(v => v.name.toLowerCase() === lang)

    if(!fetched) return null

    return fetched.iso6392B
}

const consumet = new ANIME.Gogoanime()

function zoro() {
    function search(q) {
        return new Promise(async(resolve, reject) => {
            let api = await customApi(ZoroApi)

            let response = await fetch(`${api}/${q}`, { headers })          
            if(!response.ok) return resolve(new Error(`${api}: BAD REQUEST`));
            
            let json = await response.json()
            if(!json || !json.results || !Array.isArray(json.results) || json.results.length <= 0) return resolve(new Error(`${api}: 404 NOT FOUND`));

            return resolve(json)
        })
    }

    function fetchAnimeInfo(animeId) {
        return new Promise(async(resolve, reject) => {
            let api = await customApi(ZoroApi)

            let response = await fetch(`${api}/info?id=${animeId}`, { headers })
            if(!response.ok) return resolve(new Error(`${api}: BAD REQUEST`));

            let json = await response.json()
            if(!json || !json.title || !json.episodes || !Array.isArray(json.episodes) || json.episodes.length <= 0) return resolve(new Error(`${api}: 404 NOT FOUND`));

            return resolve(json)
        })
    }

    function fetchEpisodeSources(episodeId) {
        return new Promise(async(resolve, reject) => {
            let api = await customApi(ZoroApi)

            let response = await fetch(`${api}/watch?episodeId=${episodeId}&server=vidcloud`, { headers })          
            if(!response.ok) return resolve(new Error(`${api}: BAD REQUEST`));
            
            let json = await response.json()

            let returnData = {
                sources: [],
                captions: []
            }

            if(!json || !json.sources || !Array.isArray(json.sources) || json.sources.length <= 0) return resolve(new Error(`${api}: 404 NOT FOUND`));

            returnData.sources = json.sources

            if(Array.isArray(json.subtitles) && json.subtitles.length > 0) {
                let parsedSub = (await Promise.all(json.subtitles.map(async(v) => {
                    let uri = v.url || v.uri
                    let lang = v.lang

                    if(!uri || !lang) return 'none'
                    
                    let splet = lang.split(' - ')

                    lang = splet[0]
                    lang = String(lang).toLowerCase()

                    if(!isUrl(uri)) return 'none'
                    if(!(await langCodec(lang))) return 'none'

                    return {
                        uri,
                        lang
                    }
                }))).filter(v => v !== 'none')

                returnData.captions = parsedSub
            }

            return resolve(returnData)
        })
    }

    return { search, fetchAnimeInfo, fetchEpisodeSources }
}

function aniwatch() {
    function search(q) {
        return new Promise(async(resolve, reject) => {
            let api = await customApi(AniwatchApi)

            let response = await fetch(`${api}/search?q=${q}`, { headers })          
            if(!response.ok) return resolve(new Error(`${api}: BAD REQUEST`));
            
            let json = await response.json()
            if(!json || !json.animes || !Array.isArray(json.animes) || json.animes.length <= 0) return resolve(new Error(`${api}: 404 NOT FOUND`));

            let results = json.animes.map(v => {
                if(v.name) v.title = v.name
                if(v.poster) v.image = v.poster

                return v
            })

            return resolve({ results })
        })
    }

    function fetchAnimeInfo(animeId) {
        return new Promise(async(resolve, reject) => {
            let api = await customApi(AniwatchApi)

            let response = await fetch(`${api}/info?id=${animeId}`, { headers })
            if(!response.ok) return resolve(new Error(`${api}: BAD REQUEST`));

            let json = await response.json()
            if(!json || !json.anime || !json.anime.info) return resolve(new Error(`${api}: 404 NOT FOUND`));

            let returnData = json.anime.info

            if(returnData.name) returnData.title = returnData.name
            if(returnData.poster) returnData.image = returnData.poster

            let res = await fetch(`${api}/episodes/${animeId}`, { headers })
            if(!res.ok) return resolve(new Error('BAD ANIME'))

            let ep_json = await res.json()
            if(!ep_json.episodes || !Array.isArray(ep_json.episodes) || ep_json.episodes.length <= 0) return resolve(new Error('NO EPISODES '+returnData.title));

            let episodes = ep_json.episodes.map(v => {
                if(v.episodeId) v.id = v.episodeId
                
                return v
            })

            returnData.episodes = episodes

            return resolve(returnData)
        })
    }


    function fetchEpisodeSources(episodeId) {
        return new Promise(async(resolve, reject) => {
            let api = await customApi(AniwatchApi)

            let response = await fetch(`${api}/episode-srcs?id=${episodeId}&server=vidcloud`, { headers })          
            if(!response.ok) return resolve(new Error(`${api}/episode-srcs?id=${episodeId}&server=vidcloud: BAD REQUEST`));
            
            let json = await response.json()
            
            let returnData = {
                sources: [],
                captions: []
            }

            if(!json || !json.sources || !Array.isArray(json.sources) || json.sources.length <= 0) return resolve(new Error(`${api}: 404 NOT FOUND`));

            returnData.sources = json.sources

            if(json.tracks && Array.isArray(json.tracks) && json.tracks.length > 0) {
                let subtitles = (await Promise.all(json.tracks.filter(v => v && v.kind && String(v.kind).toLowerCase().includes('captions')).map(async(v) => {
                    let uri = v.url || v.uri || v.file
                    let lang = v.lang || v.label

                    if(!uri || !lang) return 'none'
                    
                    let splet = lang.split(' - ')

                    lang = splet[0]
                    lang = String(lang).toLowerCase()

                    if(!isUrl(uri)) return 'none'
                    if(!(await langCodec(lang))) return 'none'

                    return {
                        uri,
                        lang
                    }
                }))).filter(v => v !== 'none')

                returnData.captions = subtitles
            }

            return resolve(returnData)
        })
    }

    return { search, fetchAnimeInfo, fetchEpisodeSources }
}

module.exports = {
    gogo: consumet,
    zoro: zoro(),
    aniwatch: aniwatch(),
}