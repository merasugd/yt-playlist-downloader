const readline = require("readline/promises")
const fs = require("fs")
const path = require("path")

const prompter = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const util = require('./utils/tools')
const prog = require('./utils/progress')
const manager = require('./utils/manager')

const searching = require('./functions/searching')
const compressor = require('./functions/compressor')

const downloader = require('./downloader/main')

//unused since final 1.0.3 release
/*if(!fs.existsSync(path.join(__dirname, "playlists.txt"))) fs.writeFileSync(path.join(__dirname, "playlists.txt"), `## this is used so you can download multiple playlist
## format to use is "(playlist_id):(quality):(format)"
## choices for quality are highest and lowest (ytdl-core doesnt have medium)
## choices for format are mp4 and mp3

## example format
## PLwLSw1_eDZl2v3GdglUbai_QNMJHZMOHP:highest:mp4
`)
if(!fs.existsSync(path.join(__dirname, "cookies.txt"))) fs.writeFileSync(path.join(__dirname, "cookies.txt"), '')*/

if(!fs.existsSync(path.join(__dirname, '..', '..', '.cache'))) fs.mkdirSync(path.join(__dirname, '..', '..', '.cache'))

let listofplaylist = (util.settings['playlists'] || []).map(v => {
    if(typeof v !== 'object') return 'not-valid'

    if(!v.playlistId || !v.quality || !v.format)  return 'not-valid'
    if(typeof v.playlistId !== 'string' || typeof v.quality !== 'string' || typeof v.format !== 'string')  return 'not-valid'

    let format = v.playlistId.replaceAll(':', '$url_splitting$')+':'+v.quality+':'+v.format

    if(v.settings) {
        format = format+':'+JSON.stringify(v.settings)
    } else {
        format = format+":[]"
    }
    
    return format
}).filter(v => v !== 'not-valid')

start()

async function start() {
    let net = await util.checkInternet()
    if(!net) return process.exit(1)

    let verCheck = await util.versionCheck()

    let result = await prompt(false, false, false, false, verCheck.msg)

    if(result === 100) return process.exit(0)
}

function prompt(plId, q, f, t, verMsg) {
    return new Promise(async(resolve) => {
        prog.log("Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green+'\n'+verMsg)

        let isThereLeft = manager.left()

        if(isThereLeft && util.config['safe_download']) {
            prog.log("Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green+'\n'+verMsg)
            let left = await prompter.question('Unfinished downloads found, do you want to finsih it? (y/N) '.yellow)

            if(util.boolean(left)) {
                return resolve(await main(false, false, false, false, false, false, false, true))
            } else {
                manager.reset()
            }
        }

        let inner = String(t || await prompter.question("Multiple Playlist: (y/N) ")).toLowerCase()
        if(util.boolean(inner)) {
            let in_outputdir = path.resolve(String(await prompter.question("Output Dir: ")).replaceAll('"', ''))
            if(in_outputdir === "" || in_outputdir.startsWith(" ") || in_outputdir.startsWith('"') || in_outputdir.endsWith('"') || !fs.existsSync(in_outputdir) || !(fs.statSync(in_outputdir).isDirectory())) return resolve(await prompt(plId, q, f, inner, verMsg))

            let in_move = String(await prompter.question("Compress To Zip Or Move To Output (zip/move): ")).toLowerCase() === "zip" ? false : true

            prog.log("Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green+'\n'+verMsg)
            let in_areyousure = String(await prompter.question(`Data:\nMultiple Playlists: ${(inner === 'y' ? 'true' : 'false').cyan}\nOutputDir: ${(in_outputdir).cyan}\nCompress: ${String(in_move ? false : true).cyan}\n\nAre you sure with this: (y/N) `))
            if(in_areyousure === "n" || in_areyousure === 'no') {
                return resolve(await prompt(false, false, false, false, verMsg))
            }

            return resolve(await main(true, false, false, false, in_outputdir, in_move))
        }

        let playlistId = plId || await prompter.question("Playlist ID: ")

        let quality = String(q || (await prompter.question("Quality (highest/lowest): "))).toLowerCase()
        if((quality === "highest" || quality === "lowest") === false) return resolve(await prompt(playlistId, q, f, t, verMsg))

        let format = String(f || await prompter.question("Format of Videos (mp4/mp3): ")).toLowerCase()
        if((format === "mp4" || format === "mp3") === false) return resolve(await prompt(playlistId, quality, f, t, verMsg))

        let outputdir = path.resolve(String(await prompter.question("Output Dir: ")).replaceAll('"', ''))
        if(outputdir === "" || outputdir.startsWith(" ") || outputdir.startsWith('"') || outputdir.endsWith('"') || !fs.existsSync(outputdir) || !(fs.statSync(outputdir).isDirectory())) return resolve(await prompt(playlistId, quality, format, t, verMsg))

        let move = String(await prompter.question("Compress To Zip Or Move To Output (zip/move): ")).toLowerCase() === "zip" ? false : true
        
        let makeExceptions = await filters(verMsg, format, quality)

        prog.log("Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green+'\n'+verMsg)
        let areyousure = String(await prompter.question(`Data:\nPlaylistID: ${(playlistId).cyan}\nQuality: ${(quality).cyan}\nFormat: ${(format).cyan}\nOutputDir: ${(outputdir).cyan}\nCompress: ${String(move ? false : true).cyan}\nSettings: ${JSON.stringify(makeExceptions).cyan}\n\nAre you sure with this: (y/N) `))
        if(areyousure === "n" || areyousure === 'no') {
            return resolve(await prompt(false, false, false, false, verMsg))
        }
 
        return resolve(await main(false, playlistId, quality, format, outputdir, move, makeExceptions))
    })
}

function filters(verMsg, d_format, d_quality) {
    return new Promise(async(resolve) => {
        let makeOne = await prompter.question('Settings for a video: (y/N) ')
        let all = []

        if(makeOne === "n" || makeOne === 'no') {
            return resolve(all)
        }

        function addUp(type) {
            return new Promise(async(resolv) => {
                let data = {}
                let tit = `[VideoSetting:${all.length+1}] `

                if(type === 'GIVE_UP') {
                    return resolv(all)
                }

                let id = await prompter.question(tit+`Video ${type}: `)
                if(id === 'n' || id === 'no' || id === '' || !id) return resolv(await addUp( (type === 'ID' ? 'TITLE' : (type === 'TITLE' ? 'INDEX' : 'GIVE_UP')) ))

                if(type === 'ID') {
                    data.videoId = id
                } else if(type === 'TITLE') {
                    data.videoTitle = id
                } else if(type === 'INDEX') {
                    data.videoIndex = id
                } else {
                    return resolv(await addUp('ID'))
                }

                let except = await prompter.question(tit+'Except It from downloads: (true/false) ')

                if(util.boolean(except)) {
                    data.exception = true
                    all.push(data)

                    prog.log("Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green+'\n'+verMsg)
                    let s_exception = await prompter.question(JSON.stringify(data, null, 3).yellow+'\n\n'+tit+'Are you sure? (y/N) ')
                    if(!util.boolean(s_exception)) {
                        return resolv(await addUp('ID'))
                    }

                    prog.log("Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green+'\n'+verMsg)
                    let r_exception = await prompter.question(JSON.stringify(all, null, 3).yellow+'\n\n'+tit+'Is this all? (y/N) ')
                    if(util.boolean(r_exception)) {
                        return resolv(all)
                    } else return resolv(await addUp('ID'))
                } else{
                    data.exception = false
                }

                let format = await prompter.question(tit+'Video Format: (mp3/mp4) ')

                if(format === 'mp3' || format === "mp4") {
                    data.format = format
                } else {
                    data.format = d_format
                }

                let quality = await prompter.question(tit+'Video Quality: (highest/lowest) ')

                if(quality === 'highest' || quality === "lowest") {
                    data.quality = quality
                } else {
                    data.quality = d_quality
                }

                prog.log("Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green+'\n'+verMsg)
                let sure = await prompter.question(JSON.stringify(data, null, 3).yellow+'\n\n'+tit+'Are you sure? (y/N) ')
                if(!util.boolean(sure)) {
                    return resolv(await addUp('ID'))
                }

                all.push(data)

                prog.log("Welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green+'\n'+verMsg)
                let goods = await prompter.question(JSON.stringify(all, null, 3).yellow+'\n\n'+tit+'Is this all? (y/N) ')
                if(util.boolean(goods)) {
                    return resolv(all)
                } else return resolv(await addUp('ID'))
            })
        }

        return resolve(await addUp('ID'))
    })
}

function looper(list, out, move, int) {
    return new Promise(async(resolve) => {
        if(list.length < 1) return resolve(101)
        
        let item = list[int]
        
        if(!item || list.length <= int) return resolve(100)

        if(typeof item === 'object' && item.data) {
            let moved = item.move
            let output = item.output
            let id = item.id

            let result = await main(false, id, false, false, output, moved, false, item)

            if(result === 100) {
                return resolve(await looper(list, output, moved, int+1))
            }
        }

        let args = item.replace('\r', '').split(':')
        
        if(args.length < 4) return resolve(102)
        
        let listId = args[0].replaceAll('$url_splitting$', ':')
        let quality = args[1].toLowerCase()
        let format = args[2].toLowerCase()
        let settings = JSON.parse(args.slice(3).join(':'))

        if((quality === "highest" || quality === "lowest") === false) return resolve(103)
        if((format === "mp4" || format === "mp3") === false) return resolve(104)

        let result = await main(false, listId, quality, format, out, move, settings)

        if(result === 100) {
            return resolve(await looper(list, out, move, int+1))
        }
    })
}

function main(inner, id, quality, format, outputdir, move, settings, isThereLeft) {
    return new Promise(async(resolve) => {
        prog.log("Starting...".green)

        if(inner) {
            let result = await looper(listofplaylist, outputdir, move, 0)

            if(result === 101) {
                prog.log("Empty playlists... please check settings.json".red.bold)
                return process.exit(1)
            } else if(result === 102) {
                prog.log("Found an invalid format use...".red.bold)
                return process.exit(1)
            } else if(result === 103) {
                prog.log("Found an invalid quality...".red.bold)
                return process.exit(1)
            } else if(result === 104) {
                prog.log("Found an invalid format...".red.bold)
                return process.exit(1)
            }

            return resolve(result)
        }

        if(typeof isThereLeft === 'boolean' && isThereLeft) {
            let all = manager.left()

            return resolve(await looper(all, false, false, 0))
        }

        let search_result = isThereLeft ? isThereLeft.data : await searching(id, { quality, format, settings })

        let playlist_title = search_result.playlist
        let playlist_videos = search_result.videos
    
        let dl_result = await downloader(isThereLeft, playlist_videos, playlist_title, id, outputdir, move)

        await compressor(dl_result, move, outputdir)

        return resolve(100)
    })
}

module.exports = main