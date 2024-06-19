const readline = require("readline/promises")
const fs = require("fs")
const path = require("path")

const prompter = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const prog = require('./src/progress')
const searching = require('./src/searching')
const downloader = require('./src/downloader')
const compressor = require('./src/compressor')

if(!fs.existsSync(path.join(__dirname, "playlists.txt"))) fs.writeFileSync(path.join(__dirname, "playlists.txt"), `## this is used so you can download multiple playlist
## format to use is "(playlist_id):(quality):(format)"
## choices for quality are highest and lowest (ytdl-core doesnt have medium)
## choices for format are mp4 and mp3

## example format
## PLwLSw1_eDZl2v3GdglUbai_QNMJHZMOHP:highest:mp4
`)
if(!fs.existsSync(path.join(__dirname, "cookies.txt"))) fs.writeFileSync(path.join(__dirname, "cookies.txt"), '')
if(!fs.existsSync(path.join(__dirname, 'bin'))) fs.mkdirSync(path.join(__dirname, 'bin'))

let listofplaylist = fs.readFileSync(path.join(__dirname, "playlists.txt")).toString().split("\n").filter(v => v && !v.startsWith('\r') && !v.startsWith(' ') && !v.startsWith("##") && v !== "")

start()

async function start() {
    let result = await prompt()

    if(result === 100) return process.exit(0)
}

function prompt(plId, q, f, t) {
    return new Promise(async(resolve) => {
        prog.log("welcome To ".green+"YouTube Playlist Downloader".red+" by MerasGD".green)

        let inner = String(t || await prompter.question("Use playlists.txt: (y/N) ")).toLowerCase()
        if(inner === "y" || inner === 'yes') {
            let sure = String(await prompter.question("Are you sure: (y/N) ")).toLowerCase()

            if(sure === "n" || sure === "no") {
                return resolve(await prompt())
            }

            let in_outputdir = path.resolve(String(await prompter.question("Output Dir: ")).replaceAll('"', ''))
            if(in_outputdir === "" || in_outputdir.startsWith(" ") || in_outputdir.startsWith('"') || in_outputdir.endsWith('"') || !fs.existsSync(in_outputdir) || !(fs.statSync(in_outputdir).isDirectory())) return resolve(await prompt(plId, q, f, t, inner))

            let in_move = String(await prompter.question("Compress To Zip Or Move To Output (zip/move): ")).toLowerCase() === "zip" ? false : true

            let in_areyousure = String(await prompter.question(`Data:\nMultiple Playlists/playlists.txt: ${inner}\nOutputDir: ${in_outputdir}\nCompress: ${in_move ? false : true}\n\nAre you sure with this: (y/N) `))
            if(in_areyousure === "n" || in_areyousure === 'no') {
                return resolve(await prompt())
            }

            return resolve(await main(true, false, false, false, in_outputdir, in_move))
        }

        let playlistId = plId || await prompter.question("Playlist ID: ")

        let quality = String(q || (await prompter.question("Quality (highest/lowest): "))).toLowerCase()
        if((quality === "highest" || quality === "lowest") === false) return resolve(await prompt(playlistId))

        let format = String(f || await prompter.question("Format of Videos (mp4/mp3): ")).toLowerCase()
        if((format === "mp4" || format === "mp3") === false) return resolve(await prompt(playlistId, quality))

        let outputdir = path.resolve(String(await prompter.question("Output Dir: ")).replaceAll('"', ''))
        if(outputdir === "" || outputdir.startsWith(" ") || outputdir.startsWith('"') || outputdir.endsWith('"') || !fs.existsSync(outputdir) || !(fs.statSync(outputdir).isDirectory())) return resolve(await prompt(playlistId, quality, format))

        let move = String(await prompter.question("Compress To Zip Or Move To Output (zip/move): ")).toLowerCase() === "zip" ? false : true

        let areyousure = String(await prompter.question(`Data:\nPlaylistID: ${playlistId}\nQuality: ${quality}\nFormat: ${format}\nOutputDir: ${outputdir}\nCompress: ${move ? false : true}\n\nAre you sure with this: (y/N) `))
        if(areyousure === "n" || areyousure === 'no') {
            return resolve(await prompt())
        }
 
        return resolve(await main(false, playlistId, quality, format, outputdir, move))
    })
}

function looper(list, out, move, int) {
    return new Promise(async(resolve) => {
        if(list.length < 1) return resolve(101)
        
        let item = list[int]
        
        if(!item || list.length <= int) return resolve(100)
        
        let args = item.replace('\r', '').split(':')
        
        if(args.length !== 3) return resolve(102)
        
        let listId = args[0]
        let quality = args[1].toLowerCase()
        let format = args[2].toLowerCase()
        
        if((quality === "highest" || quality === "lowest") === false) return resolve(103)
        if((format === "mp4" || format === "mp3") === false) return resolve(104)

        let result = await main(false, listId, quality, format, out, move)

        if(result === 100) {
            return resolve(await looper(list, out, move, int+1))
        }
    })
}

function main(inner, id, quality, format, outputdir, move) {
    return new Promise(async(resolve) => {
        prog.log("Starting...".green)

        if(inner) {
            let result = await looper(listofplaylist, outputdir, move, 0)

            if(result === 101) {
                prog.log("Empty playlists.txt".red.bold)
                return process.exit(1)
            } else if(result === 102) {
                prog.log("Found an invalid format use... please read the comments in the file".red.bold)
                return process.exit(1)
            } else if(result === 103) {
                prog.log("Found an invalid quality... please read the comments in the file".red.bold)
                return process.exit(1)
            } else if(result === 104) {
                prog.log("Found an invalid format... please read the comments in the file".red.bold)
                return process.exit(1)
            }

            return resolve(result)
        }

        let search_result = await searching(id, { quality, format })

        let playlist_title = search_result.playlist
        let playlist_videos = search_result.videos
    
        let dl_result = await downloader(playlist_videos, playlist_title)

        let compress_result = await compressor(dl_result, move, outputdir)

        return resolve(100)
    })
}

module.exports = main