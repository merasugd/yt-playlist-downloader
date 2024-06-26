const acrcloud = require('acrcloud')
const fs = require('fs')

const tools = require('./tools')
const media = require('./media')
const acrconfig = tools.acrcloud()

function artist(arr, index, defaultVal) {
    let artists = Array.isArray(arr) && arr.length > 0 ? arr : [{ name: defaultVal || 'Unknown Artist' }]
    
    if(index) return artists[index]

    return artists.map(v => {
        return v.name
    }).join(' & ')
}

module.exports = function(pth, track, album, d) {
    return new Promise(async(resolve) => {
        if(!acrconfig) return resolve(101)

        let arcclient = new acrcloud({
            host: acrconfig.host,
            access_key: acrconfig.api.key,
            access_secret: acrconfig.api.secret
        })

        let medResult = await media.cut(pth)

        arcclient.identify(fs.readFileSync(medResult === 101 ? medResult : pth))
        .then(async(result) => {
            if(!result || !result.metadata || !Array.isArray(result.metadata.music) || result.metadata.music.length < 0) {
                if(fs.existsSync(medResult)) fs.rmSync(medResult, { force: true })
                return resolve(101)
            }

            let data = result.metadata.music[0]
            let artists = data.external_metadata.spotify ? data.external_metadata.spotify.artists : data.artists

            if(fs.existsSync(medResult)) fs.rmSync(medResult, { force: true })

            let metadata = {
                artist: artist(artists),
                track: track,
                composer: artist(artists, 0),
                album: data.album && data.album.name ? data.album.name : album,
                title: data.title,
                genre: Array.isArray(data.genres) && data.genres.length > 0 ? artist(data.genres, false, 'Music') : 'Music',
                description: data.label || 'From YouTube Playlist '+album+' and Metadata from ACRCloud.',
                date: data.release_date.split('-')[0]
            }

            return resolve(metadata)
        })
        .catch((e) => {
            if(fs.existsSync(medResult)) fs.rmSync(medResult, { force: true })
            
            return resolve(101)
        })
    })
}