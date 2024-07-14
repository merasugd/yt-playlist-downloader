const prog = require('../../utils/progress')
const util = require('../../utils/tools')
const request = require('./request')
const terminate = require('terminate')

module.exports = function(query, data = {}) {
    return new Promise(async(resolve) => {
        let net = await util.checkInternet()
        if(!net) return process.exit(1)

        prog.multipleProgress([
            "Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green,
            ('Searching Anime "'+query+'"').yellow
        ])

        let got = await request(query)
        if(got === 101) return resolve(101)

        if(!got || !got.episodes) return resolve(101)

        let list = {}

        data.settings = data.settings || []

        list.year = (got.fullInfo.releaseDate || String(new Date().getFullYear())).toLowerCase().replaceAll('release: ', '')
        list.title = got.fullInfo.title || got.fullInfo.name
        list.author = got.host
        list.videos = got.episodes.map((v, i) => { v.title = `${list.title} Episode ${i+1}`; v.year = list.year; v.description = `${got.fullInfo.description || 'Downloaded'}`; v.cover = got.fullInfo.image || got.fullInfo.cover || got.fullInfo.poster; return v }).map((v, i) => {
            let settings = data.settings.find((vc) => vc.videoIndex === i+1)

            if(settings && settings.exception) return 'excepted'

            let format = settings ? settings.format : data.format
            let quality = settings ? settings.quality : data.quality

            if(util.formatCheck(format)) {
                format = format
            } else {
                format = data.format
            }

            if(util.qualityCheck(quality)) {
                quality = quality
            } else {
                quality = data.quality
            }

            return Object.assign(v, {
                format: format || 'mp4',
                quality: quality || 'highest'
            })
        }).filter(v => v !== "excepted")

        return resolve({
            playlist: list.title,
            author: list.author,
            videos: list.videos
        })
    })
}