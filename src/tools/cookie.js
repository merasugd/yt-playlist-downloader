const util = require('../utils/tools')
const ytdl = require('@distube/ytdl-core')

const isUrl = (input) => {
    try {
        new nodeurl.URL(input)
        return true
    } catch (_) {
        return false
    }
}

module.exports.use = function() {
    let cookie = getCookie()
    let proxy = getProxy()
    let agent = null

    if(cookie && proxy) {
        agent = ytdl.createProxyAgent({ uri: proxy }, cookie)
    } else if(cookie) {
        agent = ytdl.createAgent(cookie)
    } else if(proxy) {
        agent = ytdl.createProxyAgent({ uri: proxy })
    }

    return { agent }
}

function getCookie() {
    let cookie = util.cookies

    return cookie
}

function getProxy() {
    if(!util.config['use_proxy']) return undefined

    let proxyServer = util.settings["proxy_server"] || ''

    return proxyServer !== '' && !proxyServer.startsWith(' ') && isUrl(proxyServer) ? proxyServer : undefined;
}