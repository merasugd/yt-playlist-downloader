const yt = require('yt-search')

const prog = require('../utils/progress')
const util = require('../utils/tools')

module.exports = function(playlistId, data) {
    return new Promise(async(resolve) => {
        prog.multipleProgress([
            "Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green,
            ("Searching "+playlistId+'"').yellow
        ])

        let net = await util.checkInternet()
        if(!net) return process.exit(1)

        playlistId = util.fetchPlaylistID(playlistId)

        let opt_pl = { listId: playlistId }
        let opt_vd = playlistId
        let typeGot = util.fetchId(playlistId)
        let opt = typeGot === 'video' ? opt_vd : opt_pl

        let list = await yt(opt)
        
        data = data || {}

        if(typeGot === 'video') {
            let firstVid = list.videos[0]

            list.title = firstVid.title
            list.videos = [ firstVid ]
            list.author = firstVid.author
        }

        let pl = list.title
        let author = list.author

        prog.multipleProgress([
            "Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green,
            ('Found "'+pl+'"').green
        ])

        let videos = list.videos.filter(v => v.title !== '[Private video]' || v.title !== '[Deleted video]').map((v, i) => {
            let settings = data.settings.find((vc) => vc.videoTitle === v.title || vc.videoId === v.videoId || vc.videoIndex === i+1)

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

            return {
                title: v.title,
                url: 'https://www.youtube.com/watch?v='+v.videoId,
                format: format || 'mp4',
                quality: quality || 'highest',
                duration: v.duration,
            }
        }).filter(v => v !== "excepted")
        
        return resolve({
            playlist: pl,
            author: author,
            videos: videos
        })
    })
}