const provider = require('./provider')

function request(query, host = 'aniwatch') {
    let anime = provider[host]

    return new Promise(async(resolva) => {
        try {
            let searched = await anime.search(query)

            if(!searched || !searched.results) return resolve(101)
            if(!Array.isArray(searched.results) || searched.results.length <= 0) return resolve(101)

            let raw_info = searched.results[0]
            let full_info = await anime.fetchAnimeInfo(raw_info.id)

            let returnData = {
                rawInfo: raw_info,
                fullInfo: full_info,
                episodes: [],
                host
            }

            if(!full_info || !full_info.episodes) return resolve(101)
            if(!Array.isArray(full_info.episodes) || full_info.episodes.length <= 0) return resolve(101)

            let episodes = []

            function all_eps(i = 0) {
                return new Promise(async(resolve) => {
                    let raw_ep = full_info.episodes[i]

                    if(!raw_ep) return resolve()

                    let episodeId = raw_ep.id
 
                    let fetched_sources = await anime.fetchEpisodeSources(episodeId) || {}
                    if(!fetched_sources.sources || !Array.isArray(fetched_sources.sources) || fetched_sources.sources <= 0) {
                        episodes[i] = { "404": true }
                        return resolve(await all_eps(i+1))
                    }

                    fetched_sources.sources = fetched_sources.sources.map((v, i) => {
                        if(!v.quality || v.quality === 'default' || v.quality === 'backup') v.quality = i

                        let nan = isNaN(v.quality) ? String(v.quality).toLowerCase().replaceAll('p', '') : v.quality
                        let parsed = isNaN(nan) ? i : parseInt(String(nan))

                        v.quality_label = v.quality
                        v.quality = parsed
                        v.type = v.isM3U8 ? 'm3u8' : 'hls'

                        return v
                    })

                    if(fetched_sources.captions) {
                        raw_ep.captions = fetched_sources.captions
                    }

                    fetched_sources.sources.sort((a, b) => a.quality - b.quality)
                    raw_ep.sources = fetched_sources

                    episodes[i] = raw_ep

                    return resolve(await all_eps(i+1))
                })
            }

            await all_eps(0)

            returnData.episodes = episodes.filter(v => !v["404"])

            return resolve(returnData)
        } catch (err) { 
            return resolve(101)
        }

        async function resolve(one) {
            if(one === 101) {
                if(host === 'gogo') return resolva(one)
                return resolva(await request(query, host === 'aniwatch' ? 'zoro' : 'gogo'))
            }

            return resolva(one)
        }
    })
}

module.exports = request