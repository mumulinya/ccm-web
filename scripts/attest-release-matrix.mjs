import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const manifestFile = path.resolve(process.argv[2] || '')
const evidenceDirectory = path.resolve(process.argv[3] || '')
if (!manifestFile || !evidenceDirectory) {
  throw new Error('Usage: attest-release-matrix <release-artifact-manifest.json> <evidence-directory>')
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
const artifactDirectory = path.dirname(manifestFile)
const tarball = path.join(artifactDirectory, manifest.tarball)
const tarballSha256 = crypto.createHash('sha256').update(fs.readFileSync(tarball)).digest('hex')
assert.equal(tarballSha256, manifest.tarball_sha256, 'Release tarball changed after build')
const petTarball = path.join(artifactDirectory, manifest.pet_assets?.tarball || '')
assert.equal(fs.existsSync(petTarball), true, 'Pet asset tarball is missing')
const petTarballSha256 = crypto.createHash('sha256').update(fs.readFileSync(petTarball)).digest('hex')
assert.equal(petTarballSha256, manifest.pet_assets.tarball_sha256, 'Pet asset tarball changed after build')

const evidenceFiles = []
const walk = directory => {
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name)
    const stat = fs.statSync(file)
    if (stat.isDirectory()) walk(file)
    else if (name.endsWith('.json')) evidenceFiles.push(file)
  }
}
walk(evidenceDirectory)

const evidence = evidenceFiles.map(file => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter(row => row?.schema === 'ccm-release-platform-evidence-v1')
for (const row of evidence) {
  assert.equal(row.success, true)
  assert.equal(row.version, manifest.version)
  assert.equal(row.tarball_sha256, manifest.tarball_sha256)
  assert.equal(Number(row.paidProviderCalls || 0), 0)
}

const required = new Set(['win32/20', 'win32/22', 'linux/20', 'linux/22'])
for (const row of evidence) {
  const nodeMajor = String(row.node || '').split('.')[0]
  required.delete(`${row.platform}/${nodeMajor}`)
}
assert.deepEqual([...required], [], `Release matrix evidence missing: ${[...required].join(', ')}`)

manifest.tested = true
manifest.tested_at = new Date().toISOString()
manifest.test_evidence = evidence
  .sort((left, right) => `${left.platform}/${left.node}`.localeCompare(`${right.platform}/${right.node}`))
  .map(row => ({
    platform: row.platform,
    node: row.node,
    tarball_sha256: row.tarball_sha256,
    verified_at: row.verified_at,
    paid_provider_calls: row.paidProviderCalls,
  }))
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ success: true, tested: true, evidence: manifest.test_evidence }, null, 2))
