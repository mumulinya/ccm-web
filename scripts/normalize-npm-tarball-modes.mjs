import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createGunzip, createGzip } from 'node:zlib'
import tar from 'tar-stream'

const input = path.resolve(String(process.argv[2] || '').trim())
if (!input || !fs.existsSync(input)) throw new Error('Usage: normalize-npm-tarball-modes <package.tgz>')

const executableEntries = new Set([
  'package/bin/ccm.js',
  'package/bin/legacy-project-cli.js',
  'package/bin/postinstall.js',
  'package/bin/setup.js',
])
const output = `${input}.normalized`
const backup = `${input}.raw`
const found = new Set()

await new Promise((resolve, reject) => {
  const extract = tar.extract()
  const pack = tar.pack()
  const writer = fs.createWriteStream(output)
  extract.on('entry', (header, stream, next) => {
    const normalizedHeader = { ...header }
    if (executableEntries.has(header.name)) {
      normalizedHeader.mode = 0o755
      found.add(header.name)
    }
    const entry = pack.entry(normalizedHeader, error => error ? reject(error) : next())
    stream.on('error', reject)
    entry.on('error', reject)
    stream.pipe(entry)
  })
  extract.on('finish', () => pack.finalize())
  extract.on('error', reject)
  pack.on('error', reject)
  writer.on('error', reject)
  writer.on('close', resolve)
  pack.pipe(createGzip({ level: 9 })).pipe(writer)
  fs.createReadStream(input).pipe(createGunzip()).pipe(extract)
})

assert.deepEqual([...found].sort(), [...executableEntries].sort())
if (fs.existsSync(backup)) throw new Error(`Backup already exists: ${backup}`)
fs.renameSync(input, backup)
fs.renameSync(output, input)

console.log(JSON.stringify({
  success: true,
  tarball: input,
  rawBackup: backup,
  executableEntries: [...found].sort(),
}, null, 2))
