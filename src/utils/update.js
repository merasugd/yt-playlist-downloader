const fs = require('fs')
const path = require('path')

const package = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), { encoding: 'utf-8' }))

const args = Object.keys(package.dependencies).map(v => {
    return v+'@latest'
})
const cmd = [ 'npm', 'install' ].concat(args)

console.log(cmd.join(' '))