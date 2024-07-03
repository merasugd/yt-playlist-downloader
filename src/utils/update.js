const fs = require('fs')
const path = require('path')

const package = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), { encoding: 'utf-8' }))

const args = Object.keys(Object,assign(package.dependencies || (package.devDependencies || {}))).map(v => {
    return v+'@latest'
})
const cmd = [ 'npm', 'install', '--save-dev', '--legacy-peer-deps' ].concat(args)

console.log(cmd.join(' '))