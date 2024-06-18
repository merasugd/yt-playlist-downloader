const yt = require('yt-search')

const prog = require('./progress')

module.exports = function(playlistId, data) {
    return new Promise(async(resolve) => {
        prog.log(("Searching "+playlistId+'"').yellow)

        let list = await yt({ listId: playlistId })
        
        data = data || {}

        let pl = list.title

        prog.log(('Found "'+pl+'"').green)

        let videos = list.videos.filter(v => v.title !== '[Private video]' || v.title !== '[Deleted video]').map(v => {
            return {
                title: v.title,
                url: 'https://www.youtube.com/watch?v='+v.videoId,
                format: data.format || 'mp4',
                quality: data.quality || 'highest',
                duration: v.duration,
            }
        })
        
        return resolve({
            playlist: pl,
            videos: videos
        })
    })
}