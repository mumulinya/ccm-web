import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'ccm-package', 'public', 'pets')
const target = path.join(root, 'pet-assets-package')
const assets = path.join(target, 'assets')
const corePackage = JSON.parse(fs.readFileSync(path.join(root, 'ccm-package', 'package.json'), 'utf8'))
const resourcePackageFile = path.join(target, 'package.json')
const resourcePackage = JSON.parse(fs.readFileSync(resourcePackageFile, 'utf8'))

if (resourcePackage.version !== corePackage.version) {
  throw new Error(`Pet asset version ${resourcePackage.version} must match CCM ${corePackage.version}`)
}

fs.rmSync(assets, { recursive: true, force: true })
fs.mkdirSync(assets, { recursive: true })

const skins = {
  clawd: value => value === 'clawd.svg' || value.startsWith('clawd/'),
  cloudling: value => value === 'cloudling.svg' || value.startsWith('cloudling/'),
  calico: value => value === 'calico.svg' || value.startsWith('calico/'),
  ghost: value => /^ghost(?:-|\.svg)/.test(value),
  robot: value => /^robot(?:-|\.svg)/.test(value),
}

const files = []
const walk = directory => {
  for (const name of fs.readdirSync(directory)) {
    const absolute = path.join(directory, name)
    const stat = fs.lstatSync(absolute)
    if (stat.isSymbolicLink()) throw new Error(`Pet assets may not contain links: ${absolute}`)
    if (stat.isDirectory()) walk(absolute)
    else if (stat.isFile()) {
      const relative = path.relative(source, absolute).replaceAll(path.sep, '/')
      if (!Object.values(skins).some(matches => matches(relative))) continue
      const destination = path.join(assets, ...relative.split('/'))
      fs.mkdirSync(path.dirname(destination), { recursive: true })
      fs.copyFileSync(absolute, destination)
      const content = fs.readFileSync(destination)
      files.push({
        path: relative,
        size: content.length,
        sha256: crypto.createHash('sha256').update(content).digest('hex'),
      })
    }
  }
}
walk(source)
files.sort((left, right) => left.path.localeCompare(right.path))

for (const [skin, matches] of Object.entries(skins)) {
  if (!files.some(row => matches(row.path))) throw new Error(`No assets found for ${skin}`)
}

const manifest = {
  schema: 'ccm-pet-assets-manifest-v1',
  version: corePackage.version,
  skins: Object.keys(skins),
  files,
  tree_checksum: crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex'),
}
fs.writeFileSync(path.join(target, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ success: true, version: manifest.version, skins: manifest.skins, files: files.length }, null, 2))
