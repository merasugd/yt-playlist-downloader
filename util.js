const fs = require('fs')
const path = require('path')

module.exports.sanitizeTitle = function (title) {
    return String(title).replaceAll(/[\\/:*"?|<>]/g, '');
}

module.exports.config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), { encoding: 'utf-8' }))