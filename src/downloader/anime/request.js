const { ANIME } = require('@consumet/extensions')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

function request(query, host = 'Gogo Anime') {
    let anime = null

    return new Promise(async(resolve) => {
        if(host === 'Gogo Anime') anime = new ANIME.Gogoanime()
        else return resolve(101)

        try {
            let searched = await anime.search(query)

            if(!searched || !searched.results) return await res()
            if(!Array.isArray(searched.results) || searched.results.length <= 0) return await res()

            let raw_info = searched.results[0]
            let full_info = await anime.fetchAnimeInfo(raw_info.id)

            let returnData = {
                rawInfo: raw_info,
                fullInfo: full_info,
                episodes: [],
                host
            }

            if(!full_info || !full_info.episodes) return await res()
            if(!Array.isArray(full_info.episodes) || full_info.episodes.length <= 0) return await res()

            let episodes = await Promise.all(
                full_info.episodes.map(async function(raw_ep) {
                    let episodeId = raw_ep.id

                    let fetched_sources = await anime.fetchEpisodeSources(episodeId) || {}
                    if(!fetched_sources.sources || !Array.isArray(fetched_sources.sources) || fetched_sources.sources <= 0) return { "404": true }

                    fetched_sources.sources = fetched_sources.sources.filter(v => v.quality !== 'default' && v.quality !== 'backup').map((v, i) => {
                        if(!v.quality) v.quality = i

                        let nan = isNaN(v.quality) ? String(v.quality).toLowerCase().replaceAll('p', '') : v.quality
                        let parsed = isNaN(nan) ? i : parseInt(String(nan))

                        v.quality_label = v.quality
                        v.quality = parsed
                        v.type = v.isM3U8 ? 'm3u8' : 'hls'

                        return v
                    })
                    fetched_sources.sources.sort((a, b) => a.quality - b.quality)
                    raw_ep.sources = fetched_sources

                    return raw_ep
                })
            )

            returnData.episodes = episodes.filter(v => !v["404"])

            return resolve(returnData)
        } catch (err) { 
            return resolve(101)
        }

        async function res() {
            return resolve(host === 'Aniwatch' ? 101 : await request(query, host === 'Gogo Anime' ? 'Zoro' : 'Aniwatch'))
        }
    })
}

function ani(q) {
    return new Promise(async(resolve) => {
        let apiUri = 'http://localhost:4000/anime/'

        q = String(q || '').toLowerCase()
        
        try {
            let search = await fetch(apiUri+`search?q=${q}`).then(v => v.json())
            if(!search || typeof search !== 'object') return resolve(101)

            let results = search.animes
            if(!results || !Array.isArray(results) || results.length <= 0) return resolve(101)

            let v = results[0]
                
            let id = v.id

            const resp = await fetch(`${apiUri}info?id=${id}`).then(v => v.json())
                      
            v.aniwatchInfo = resp.anime

            if(!resp.anime) return resolve(resp)
            
            let anime = resp.anime

            if(!anime || !anime.info) return resolve({ "400": true })
            if(Array.isArray(anime) && anime.length > 0) anime.info = anime[0].info

            let rawInfo = v
            let info = anime.info
            let fullInfo = info

            let eps = await fetch(`${apiUri}episodes/${id}`).then(v => v.json())

            fullInfo.totalEpisodes = eps.totalEpisodes

            let all_eps = eps.episodes.map(v => {
                return new Promise(async(resol) => {
                    let { episodeId } = v

                    let ep = await fetch(`${apiUri}servers?episodeId=${episodeId}`).then(v => v.json())
                            
                    if(ep.sub && Array.isArray(ep.sub) && ep.sub.length) {
                        v.service = ep.sub[0].serverName
                        v.category = 'sub'
                    } else if(ep.dub && Array.isArray(ep.dub) && ep.dub.length) {
                        v.service = ep.dub[0].serverName
                        v.category = 'dub'
                    } else return resol({ "404": true })

                    let source = await fetch(`${apiUri}episode-srcs?id=${episodeId}&server=vidstreaming&category=${v.category}`).then(v => v.json())

                    if(!source || typeof source !== 'object') return resol({ "404": true })
                    if(!source.sources) return resol({ "404": true })
                    if(!Array.isArray(source.sources) || source.sources.length <= 0) return resol({ "404": true })

                    if(source.tracks && Array.isArray(source.tracks) && source.tracks.length > 0) {
                        let captions = source.tracks.filter(v => v && typeof v === 'object').filter(v => v.kind && String(v.kind).toLowerCase().includes('captions'))

                        v.captions = captions.map(v => {
                            return {
                                uri: v.file,
                                lang: String(v.label || 'english').toLowerCase()
                            }
                        })
                    }

                    v.sources = {
                        sources: source.sources,
                        headers: source.headers || {}
                    }

                    return resol(v)
                })
            })

            v.episodes = await Promise.all(all_eps)
            v.episodes = v.episodes.filter(v => !v["404"])
            v.aniwatch = true

            return resolve({
                rawInfo,
                fullInfo,
                episodes: v.episodes,
                host: 'Aniwatch',
                aniwatch: true
            })
        } catch(err) {
            return resolve(101)
        }
    })
}

module.exports = request