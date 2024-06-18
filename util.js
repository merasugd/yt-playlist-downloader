const fs = require('fs')
const path = require('path')
const metadata = require('ffmetadata')
const search = require('yt-search')

metadata.setFfmpegPath(require('ffmpeg-static'))

module.exports.sanitizeTitle = function (title) {
    return String(title).replaceAll(/[\\/:*"?|<>]/g, '');
}

module.exports.config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), { encoding: 'utf-8' }))

module.exports.editSongMetadata = function(pl, url, patther, thumb) {
    return new Promise(async(resolve) => {
        let data = await search({ videoId: url.replaceAll('https://www.youtube.com/watch?v=', '') })

        console.log(data)

        metadata.write(patther, {
            artist: data.author.name,
            album: pl,
            title: data.title,
            genre: data.genre,
            description: data.description,
            date: data.uploadDate.split('-')[0]
        }, { attachments: [thumb] }, function(err) {
            if(err) return resolve(101)
            return resolve(100)
        })
    })
}

module.exports.editSongMetadata('https://www.youtube.com/watch?v=uKxyLmbOc0Q')