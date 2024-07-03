// Dummy Account "YTPL YTDL"
let default_cookie = Buffer.from('R1BTPTE7IFlTQz04WWxvbDNaMUdHODsgVklTSVRPUl9JTkZPMV9MSVZFPThnTWlDZmlvY3JFOyBWSVNJVE9SX1BSSVZBQ1lfTUVUQURBVEE9Q2dKUVNCSUVHZ0FnRkElM0QlM0Q7IF9fU2VjdXJlLTFQU0lEVFM9c2lkdHMtQ2pJQjNFZ0FFaGZmcm5lVl9BSXRVaHRydzZjTXFNWVJaVjY3MXVHZURPY3VuSjlSNnJ4blJIQkdibWRpVlR5ZkZ3OTJfeEFBOyBfX1NlY3VyZS0zUFNJRFRTPXNpZHRzLUNqSUIzRWdBRWhmZnJuZVZfQUl0VWh0cnc2Y01xTVlSWlY2NzF1R2VET2N1bko5UjZyeG5SSEJHYm1kaVZUeWZGdzkyX3hBQTsgSFNJRD1BVFQ5WG13WTFhTjdkX2VMZzsgU1NJRD1BNG5TQ2JnRkFqalA0VXROcjsgQVBJU0lEPUhFRk1kTEQ1MmloU3gxaEMvQUlsVElwZW1lQ1Jpc3NvcFo7IFNBUElTSUQ9bDJ0clNIeVF3bUFqdHI4aC9BekdvaU4tSFc3bTU1eXpIVjsgX19TZWN1cmUtMVBBUElTSUQ9bDJ0clNIeVF3bUFqdHI4aC9BekdvaU4tSFc3bTU1eXpIVjsgX19TZWN1cmUtM1BBUElTSUQ9bDJ0clNIeVF3bUFqdHI4aC9BekdvaU4tSFc3bTU1eXpIVjsgU0lEPWcuYTAwMGxRaGZYSzRaZ0NzMm5DU0MyQUExLVltRFV0WUxqNjFWamhLM1hGLU5WbmM2VU1JbGIzUVNNWklhZ2N6bFZ0MXNmY2QtNndBQ2dZS0FaNFNBUmNTRlFIR1gyTWl1cnRMVktwSlU3VzlXak9ZNlJMT0xCb1ZBVUY4eUtxbTZweFQ2UWs0bllvTXhUYUlqaTZzMDA3NjsgX19TZWN1cmUtMVBTSUQ9Zy5hMDAwbFFoZlhLNFpnQ3MybkNTQzJBQTEtWW1EVXRZTGo2MVZqaEszWEYtTlZuYzZVTUlsLVF0Yy1aUGNZdEVPdnVSdUxBTDdXQUFDZ1lLQWNvU0FSY1NGUUhHWDJNaXZ0Q0xBdVc5YWlDMk5xTWlTcjFBVWhvVkFVRjh5S3B2eFhGV2FidzRkSHBGdFB4MUVwUU0wMDc2OyBfX1NlY3VyZS0zUFNJRD1nLmEwMDBsUWhmWEs0WmdDczJuQ1NDMkFBMS1ZbURVdFlMajYxVmpoSzNYRi1OVm5jNlVNSWxwMUh0STBYSVdzZ0tZWThaOF9vMjRnQUNnWUtBU2dTQVJjU0ZRSEdYMk1pVndCNjRrTU5TRnZrcXYtWUh2MFI1Qm9WQVVGOHlLb2dLMDZiaS1mY1pHb1lxSzJDXzNuMDAwNzY7IExPR0lOX0lORk89QUZtbUYyc3dSZ0loQUkyek13ZE1wV3JJZ0ZJQ29rc25YWi1CZE55ME9XaDVKQmFlVGFYenRiSUJBaUVBdEd3TEU2eVdGcW1YMUR5WDRkamRHaTZLdEZjY094SktEaHpWRzNranh3ZzpRVVEzTWpObWR6Vm5lSGwxVWpOVWREaGlRWFpQUTNoWVlXSkZibEpLVWw5WVpIYzViVTFHU1ZsdWNUbElibk5WUms1R1YxOUVja0Y1V25SSVRYWnNPRFIxTURZMFdIZG9lbEpHUW5NM2IyNURVMkZGZDFKTWEwSlhiV3cyVURneE5rdFVielZCWDJGM01rNHhXbTl2YjJaZlpUUlVWR05ZYjE5clZHOW9jM1YxTmxoMGEzcDZSMDlYTVVaNFZFSmtTbTlIV0VJelYwMTZOV3d6VDNWRVRFZG47IFBSRUY9dHo9QXNpYS5TaGFuZ2hhaSZmNj00MDAwMDAwMCZmNz0xMDAmZjU9MzAwMDA7IFNULWFtcmIyaj1zZXNzaW9uX2xvZ2luaW5mbz1BRm1tRjJzd1JnSWhBSTJ6TXdkTXBXcklnRklDb2tzblhaLUJkTnkwT1doNUpCYWVUYVh6dGJJQkFpRUF0R3dMRTZ5V0ZxbVgxRHlYNGRqZEdpNkt0RmNjT3hKS0RoelZHM2tqeHdnJTNBUVVRM01qTm1kelZuZUhsMVVqTlVkRGhpUVhaUFEzaFlZV0pGYmxKS1VsOVlaSGM1YlUxR1NWbHVjVGxJYm5OVlJrNUdWMTlFY2tGNVduUklUWFpzT0RSMU1EWTBXSGRvZWxKR1FuTTNiMjVEVTJGRmQxSk1hMEpYYld3MlVEZ3hOa3RVYnpWQlgyRjNNazR4V205dmIyWmZaVFJVVkdOWWIxOXJWRzlvYzNWMU5saDBhM3A2UjA5WE1VWjRWRUprU205SFdFSXpWMDE2Tld3elQzVkVURWRuOyBTSURDQz1BS0V5WHpVUDItUFFnTzY5bE0xV3FiR1Q3d0s4ei01YWFtMVdGWjl5T2tIWDNoelc4aGFtRHFEYWtPcVlQMzdTLXlWbXJGcUxJQTsgX19TZWN1cmUtMVBTSURDQz1BS0V5WHpVYk1IUFNWN2hwUE5GaFA1SHUyOTJmTzRFdGxzTFhzam1QRFZEUzZaaExQcURicUpEOFk0dWVDTUE0aUxZRUs1cks7IF9fU2VjdXJlLTNQU0lEQ0M9QUtFeVh6V3MtVFlZb1ZIYkpONGZOZGxxX195b1lIdlI1X3lOSWFtci1oYXJwd1VveHQ2MHMxMmlRQzdVd29UNUZ4eEdsakZV', 'base64').toString('utf-8') // dummy acc
let default_id_token = 'QUFFLUhqbTlLRlA2cWJYYkN4aGNXdi1GTVcwSk5SWDVKUXw\u003d'
// Default Cookie

const {HttpsProxyAgent} = require('https-proxy-agent')

const util = require('../utils/tools')

module.exports.use = function() {
    let cookie = getCookie()
    let proxy = getProxy()

    let returnData = { requestOptions: {} }

    if(proxy) {
        returnData.agent = proxy
    }
    if(cookie) {
        returnData.requestOptions.headers = {}
        returnData.requestOptions.headers['cookie'] = cookie.cookie

        if(cookie.id) {
            returnData.requestOptions.headers['x-youtube-identity-token'] = cookie.id
        }
    }

    return returnData
}

function getCookie() {
    let cookie = util.settings['own_cookie'] || default_cookie

    if(cookie === default_cookie) {
        return { cookie, id: default_id_token }
    } else return { cookie }
}

function getProxy() {
    if(!util.config['use_proxy']) return undefined

    let proxyServer = util.settings['proxy_server'] || ''
    let proxyAgent = proxyServer !== '' && !proxyServer.startsWith(' ') ? new HttpsProxyAgent(proxyServer) : undefined

    return proxyAgent
}