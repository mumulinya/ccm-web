import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const distributionPackage = JSON.parse(fs.readFileSync(path.join(root, 'ccm-package', 'package.json'), 'utf8'))
const ptyPackageFile = require.resolve('node-pty/package.json')
const ptyRoot = path.dirname(ptyPackageFile)
const ptyPackage = JSON.parse(fs.readFileSync(ptyPackageFile, 'utf8'))

assert.equal(distributionPackage.version, '1.0.16')
assert.equal(distributionPackage.dependencies?.['node-pty'], undefined)
assert.equal(distributionPackage.optionalDependencies['node-pty'], '1.2.0-beta.14')
assert.equal(ptyPackage.version, '1.2.0-beta.14')

const requiredPrebuilds = [
  'linux-x64/pty.node',
  'linux-arm64/pty.node',
  'darwin-x64/pty.node',
  'darwin-arm64/pty.node',
  'win32-x64/conpty.node',
  'win32-arm64/conpty.node',
]

for (const relativePath of requiredPrebuilds) {
  const target = path.join(ptyRoot, 'prebuilds', relativePath)
  assert.equal(fs.existsSync(target), true, `missing node-pty prebuild: ${relativePath}`)
  assert.ok(fs.statSync(target).size > 0, `empty node-pty prebuild: ${relativePath}`)
}

const prebuildScript = fs.readFileSync(path.join(ptyRoot, 'scripts', 'prebuild.js'), 'utf8')
assert.match(prebuildScript, /process\.platform.*process\.arch/s)
assert.match(prebuildScript, /process\.exit\(0\)/)

const pty = require('node-pty')
assert.equal(typeof pty.spawn, 'function')

console.log(JSON.stringify({
  success: true,
  ccmVersion: distributionPackage.version,
  nodePtyVersion: ptyPackage.version,
  prebuilds: requiredPrebuilds,
  currentPlatformModuleLoaded: `${process.platform}-${process.arch}`,
  paidProviderCalls: 0,
}, null, 2))
