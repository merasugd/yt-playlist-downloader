const AdmZip = require('adm-zip')
const fs = require('fs/promises')
const fs_s = require('fs')
const path = require('path')

const prog = require('../utils/progress')
const util = require('../utils/tools')

function copyFolder(data, source, output) {
    let outputDir = path.join(output, util.sanitizeTitle(data.title))

    return new Promise(async(resolve) => {
        if(fs_s.existsSync(outputDir)) {
            await fs.rm(outputDir, { recursive: true, force: true })
            await fs.mkdir(outputDir)
        } else {
            await fs.mkdir(outputDir)
        }

        let files = await fs.readdir(source)

        let result = await copyLooper(files, outputDir, source, files.length, 0, true)

        if(result === 100) {
            return resolve(outputDir)
        }
    })
}

function copyLooper(files, output, source, total, int, d) {
    return new Promise(async(resolve) => {
        let file = files[int]

        if(!file || total <= int) return resolve(100)

        if(d) prog.progress(int+1, total, 'moving')
        
        if(fs_s.statSync(path.join(source, file)).isDirectory()) {
            let new_o = path.join(output, file)
            let new_s = path.join(source, file)

            let new_files = await fs.readdir(new_s)

            await fs.mkdir(new_o)
            
            let result = await copyLooper(new_files, new_o, new_s, new_files.length, 0, false)

            if(result === 100) {
                return resolve((await copyLooper(files, output, source, total, int+1, d)))
            }
        } else {
            let filePath = path.join(source, file)
            let newFilePath = path.join(output, file)

            let readStream = fs_s.createReadStream(filePath)
            let writeStream = fs_s.createWriteStream(newFilePath)

            readStream.pipe(writeStream)

            writeStream.on("finish", async() => {
                return resolve((await copyLooper(files, output, source, total, int+1, d)))
            })
        }
    })
}

module.exports = function(data, move, output) {
    let final = null;
    let outl = path.join(output, util.sanitizeTitle(data.title)+'.zip')

    return new Promise(async(resolve) => {
        if(move) {
            prog.log(("Moving downloaded playlist to "+output).yellow)
            let out = await copyFolder(data, data.path, output)
            prog.log(("Successfully moved downloaded playlist to "+out).green)
            final = out
        } else {
            prog.log("Creating zip...".yellow)
            let zip = new AdmZip()

            prog.log("Compressing...".yellow)
            await zip.addLocalFolderPromise(data.path)

            prog.log(("Writing zip to "+outl+"...").yellow)
            await zip.writeZipPromise(outl)

            prog.log(("Successfully zipped downloaded playlist to "+outl).green)

            final = outl
        }

        await fs.rm(data.path, { recursive: true, force: true })
        console.log("Done".green)

        return resolve(final)
    })
}

// for testing purposes
if(process.argv.length === 5) {
    module.exports({ path: process.argv[2], title: process.argv[3] }, true, process.argv[4])
}