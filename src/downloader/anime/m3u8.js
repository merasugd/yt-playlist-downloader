const { URL } = require('node:url')
const { default: ffmpegPath } = require('ffmpeg-static')
const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const m3u8Parser = require('m3u8-parser')
const hls = require('node-hls-downloader')

const parser = new m3u8Parser.Parser()
 
const media = require('../../utils/media')
const util = require('../../utils/tools')

let segments = (path.join(__dirname, '..', '..', '..', '.cache', 'stored_ts'))

module.exports = hlshandle

function hlshandle(output, quality, sources, source_headers, cb, t) {
    return new Promise(async(resolve) => {
        let fetched = filter(sources, quality)

        if(!fetched) {
            cb('error', new Error('BAD SOURCES'))
            return resolve(101)
        }

        try {
            let type = t || fetched.type
            let stream = fetched.url
            let concurrent = 10

            if(type === 'retry') {
                cb('start')

                if(fs.existsSync(segments)) await require('fs/promises').rm(segments, { recursive: true, force: true })
                fs.mkdirSync(segments)

                let index_path = path.join(segments, 'index.m3u8')
                await util.basicDL(stream, index_path)

                parser.push(fs.readFileSync(index_path).toString())
                parser.end()

                let parsed = parser.manifest
                let playlists = parsed.playlists
                let isVod = false

                if (parsed.segments && parsed.segments.length > 0) {
                    isVod = true
                    playlists = playlists || [{}]
                } else if(!playlists || !Array.isArray(playlists) || playlists.length <= 0) {
                    cb('error', 'invalid')
                    return resolve(101)
                }

                playlists.filter(a => a && a.attributes).sort((a, b) => a.attributes.BANDWIDTH - b.attributes.BANDWIDTH)

                let fetched_index = filter(playlists, quality)
                let uri = isVod ? stream : new URL(fetched_index.uri, stream).href

                let fetched_path = path.join(segments, 'fetched.m3u8')
                await util.basicDL(uri, fetched_path)

                let fetchedParser = new m3u8Parser.Parser()
                fetchedParser.push(fs.readFileSync(fetched_path).toString())
                fetchedParser.end()

                let fetched = fetchedParser.manifest

                if(!fetched.segments || !Array.isArray(fetched.segments) || fetched.segments.length <= 0) {
                    cb('error', 'invalid playlist')
                    return resolve(101)
                }

                let current = 0
                let total = fetched.segments.length

                await hls.download({
                    streamUrl: uri,
                    outputFile: output,
                    concurrency: concurrent,
                    quality: quality === 'highest' ? 'best' : quality === 'lowest' ? 'worst' : 'best',
                    logger: (...log) => {
                        log = log.join(' ')

                        if(String(log).includes('Received')) {
                            current = current + 1

                            let label = Math.floor((current / total) * 100) === 100 || current === total ? 'merging streams' : 'downloading hls'

                            cb('progress', { total: 100, current: Math.floor((current / total) * 100), label })
                        }
                    },
                    mergedSegmentsFile: path.join(segments, 'merged.ts'),
                    segmentsDir: segments.replaceAll('\\', '/')+'/segments/',
                    ffmpegPath: ffmpegPath
                })

                if(fs.existsSync(segments)) await require('fs/promises').rm(segments, { recursive: true, force: true })
                
                cb('end')
                return resolve(100)
            } else {
                let total = null
                let current = 0

                if(fs.existsSync(segments)) await require('fs/promises').rm(segments, { recursive: true, force: true })

                let order = []
                let hls = await import('hlsdownloader').then(v => v.default)
                let downloader = new hls({
                    playlistURL: stream,
                    concurrency: concurrent,
                    destination: segments,
                    overwrite: true,
                    onData: (data) => {
                        current = current + 1
                        total = data.totalItems
                        order.push(data.path)

                        let percentage = Math.floor((current / total) * 100)
                        let label = percentage === 100 || current === total ? 'merging streams' : 'downloading m3u8'

                        return cb('progress', { total: 100, current: percentage, label })
                    }
                })

                cb('start')
                downloader.startDownload().then(async(v) => {
                    if(v.errors && v.errors.length > 0) return resolve(await hlshandle(output, quality, sources, source_headers, cb, 'retry'))

                    const rep = (str = '') => {
                        let splitted = str.replaceAll('\\', '/').split('/')
                        let string1 = splitted[splitted.length-1].replaceAll('.ts', '')
                        let split2 = string1.split('.')
                        let string = split2[split2.length-1]
                        let numbersOnlyString = string.replaceAll(/\D/g, '')
                        let parsedInteger = parseInt(numbersOnlyString, 10)
                        
                        return Math.floor(parsedInteger);
                    }

                    
                    let all_ts = order.filter(v => v.endsWith('.ts')).sort((a, b) => rep(a) - rep(b))
                    let merged_path = path.join(segments, 'merge.ts')
                    let concat_merged_path = path.join(segments, 'merge.txt')
                    
                    await merge(merged_path, all_ts, concat_merged_path)

                    let proc = [
                        '-y',
                        '-i', merged_path,
                        '-c', 'copy',
                        output
                    ]

                    let ffmpeg = await media.ffmpeg(proc)

                    if(ffmpeg !== 100) {
                        cb('error', 101)
                        return resolve(101)
                    }

                    if(fs.existsSync(segments)) await require('fs/promises').rm(segments, { recursive: true, force: true })

                    cb('end')
                    return resolve(100)
                })
                
                function merge(m_path, m, ct) {
                    return new Promise(async(resolv) => {
                        fs.writeFileSync(ct, m.map(v => { return `file '${v}'` }).join('\n'))

                        let args = [
                            '-f', 'concat',
                            '-safe', '0',
                            '-i', ct,
                            '-c', 'copy',
                            '-y', m_path
                        ]

                        let proc = await media.ffmpeg(args)

                        if(proc !== 100) {
                            if(fs.existsSync(segments)) await require('fs/promises').rm(segments, { recursive: true, force: true })
                            cb('error', 101)
                            return resolve(101)
                        }

                        return resolv(100)
                    })
                }
            }
        } catch (err) {
            cb('error', err)
            return resolve(101)
        }
    })
}

function filter(all, quality) {
    if (quality === 'highest') {
        return all[all.length - 1]
    } else if (quality === 'lowest') {
        return all[0]
    } else if (quality === 'medium') {
        return all[Math.floor(all.length / 2)]
    } else return null
}