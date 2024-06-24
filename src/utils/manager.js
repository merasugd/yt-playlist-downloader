const fs = require('fs')
const path = require('path')

const tools = require('./tools')

let lock = path.join(__dirname, '..', '..', '.cache', 'lock.json')

module.exports.read = function() {
    if(!fs.existsSync(lock)) fs.writeFileSync(lock, '{}')
    if(!tools.config['safe_download']) return {}

    return JSON.parse(fs.readFileSync(lock).toString())
}

module.exports.write = function(data) {
    if(!tools.config['safe_download']) return {}

    fs.writeFileSync(lock, JSON.stringify(data, null, 4))

    return data
}

module.exports.reset = function() {
    if(!tools.config['safe_download']) return {}

    fs.writeFileSync(lock, '{}')

    return {}
}

module.exports.get = function(key) {
    if(!tools.config['safe_download']) return {}

    return module.exports.read()[key]
}

module.exports.save = function(plID, pltitle, arr, out, move, lastindex) {
    if(!tools.config['safe_download']) return {}

    let base = module.exports.read()

    let data = {
        id: plID,
        output: out,
        move: move,
        data: {
            videos: arr,
            playlist: pltitle
        },
        title: pltitle,
        index: lastindex,
        downloaded: []
    }

    base[plID] = data

    module.exports.write(base)

    return base
}

module.exports.addDownloaded = function(plId, videoData, i) {
    if(!tools.config['safe_download']) return {}

    let base = module.exports.read()

    if(!base[plId]) return

    let pl = base[plId]

    pl.downloaded.push(videoData) 

    pl.index = i

    module.exports.write(base)

    return base
}

module.exports.delete = function(plId) {
    if(!tools.config['safe_download']) return {}

    let base = module.exports.read()

    if(!base[plId]) return

    delete base[plId]

    module.exports.write(base)

    return base
}

module.exports.left = function() {
    if(!tools.config['safe_download']) return false

    let all = Object.keys(module.exports.read())

    if(!all || all.length <= 0) return false

    return Object.keys(module.exports.read()).map(v => {
        return module.exports.get(v)
    })
}