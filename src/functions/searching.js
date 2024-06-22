const yt = require('yt-search')

const prog = require('../utils/progress')
const util = require('../utils/tools')

module.exports = function(playlistId, data) {
    return new Promise(async(resolve) => {
        prog.log(("Searching "+playlistId+'"').yellow)

        let net = await util.checkInternet()
        if(!net) return process.exit(1)

        let list = await yt({ listId: playlistId })
        
        data = data || {}

        let pl = list.title

        prog.log(('Found "'+pl+'"').green)

        let videos = list.videos.filter(v => v.title !== '[Private video]' || v.title !== '[Deleted video]').map((v, i) => {
            let settings = data.settings.find((vc) => vc.videoTitle === v.title || vc.videoId === v.videoId || vc.videoIndex === i+1)

            if(settings && settings.exception) return 'excepted' 

            let format = settings ? settings.format : data.format
            let quality = settings ? settings.quality : data.quality

            if(format === 'mp4' || format === 'mp3') {
                format = format
            } else {
                format = data.format
            }

            if(quality === 'highest' || quality === 'lowest') {
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
            videos: videos
        })
    })
}