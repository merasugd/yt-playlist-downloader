const fs = require('fs');
const path = require('path');
const colors = require('colors');

const root = path.join(__dirname, '..', '..')
const pather = path.join(root, '.cache')

const prog = require('../utils/progress')
const util = require('../utils/tools')
const manager = require('../utils/manager')

const split = require('./split')
const single = require('./single')

const download = util.config['split_download'] ? split : single

function downloadLooper(arr, bin, pl, id, int) {
    return new Promise(async(resolve) => {
        let item = arr[int]

        if(!item || arr.length <= int) return resolve(100)

        let current = int+1
        let total = arr.length

        let net = await util.checkInternet([
            String(pl).green.bold,
            ('Downloading "'+pl+'"').yellow,
            { current, total, label: 'playlist' },
            { total: 100, current: 0, label: 'checking internet'.yellow }
        ])
        if(!net) return process.exit(1)

        prog.multipleProgress([
            String(pl).green.bold,
            ('Downloading "'+pl+'"').yellow,
            { current, total, label: 'playlist' },
            { total: 100, current: 0, label: 'waiting' }
        ])

        manager.addDownloaded(id, item, int)

        let dlResult = await download(pl, item, bin, { current, total, label: 'playlist' })

        if(dlResult !== 100) return resolve(101)

        return resolve((await downloadLooper(arr, bin, pl, id, int+1)))
    })
}

module.exports = function(conDl, arr, pl, id, output, move) {
    return new Promise(async(resolve) => {
        let playlist = path.join(pather, util.sanitizeTitle(String(pl))
            .replaceAll(' ', '_')
            .toLowerCase()
        )

        if(!conDl && util.config['safe_download']) {
            manager.save(id, pl, arr, output, move, 0)
        }

        if(!conDl && fs.existsSync(playlist)) {
            fs.rmSync(playlist, { recursive: true, force: true })
            fs.mkdirSync(playlist)
        }

        if(!fs.existsSync(playlist)) fs.mkdirSync(playlist)
        
        let result = await downloadLooper(arr, playlist, pl, id, conDl ? (conDl.index || 0) : 0)

        if(result !== 100) {
            prog.log("Failed".red.bold)
            return process.exit(1)     
        }

        manager.delete(id)

        prog.multipleProgress([
            "Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green,
            'Downloaded Playlist "'+pl+'"'
        ])

        return resolve({
            path: playlist,
            title: pl
        })
    })
}