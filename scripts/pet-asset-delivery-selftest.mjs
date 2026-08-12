import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-pet-assets-package.mjs')], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
})
assert.equal(result.status, 0, result.stderr || result.stdout)

const packageRoot = path.join(root, 'pet-assets-package')
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'manifest.json'), 'utf8'))
const petMenuRuntime = fs.readFileSync(path.join(root, 'frontend/src/components/pets/usePetMenu.js'), 'utf8')
const petMenuTemplate = fs.readFileSync(path.join(root, 'frontend/src/components/pets/PetMenu.template.html'), 'utf8')
assert.equal(manifest.schema, 'ccm-pet-assets-manifest-v1')
assert.deepEqual(manifest.skins, ['clawd', 'cloudling', 'calico', 'ghost', 'robot'])
assert.ok(manifest.files.length > 100)
assert.equal(manifest.skins.includes('yuexinmiao'), false)
assert.match(petMenuRuntime, /if \(engineBusy\.value\) return false/)
assert.match(petMenuTemplate, /:disabled="engineBusy \|\| !selectedAgent/)
assert.match(petMenuTemplate, /正在准备宠物资源/)

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-pet-assets-'))
try {
  fs.cpSync(packageRoot, temporary, { recursive: true })
  const require = createRequire(import.meta.url)
  const { resolvePetAssetNpmInvocation, validatePetAssetManifest } = require('../ccm-package/dist/modules/pets/pet-asset-pack.js')
  const verified = validatePetAssetManifest(temporary, manifest.version)
  assert.equal(verified.tree_checksum, manifest.tree_checksum)

  const windowsInvocation = resolvePetAssetNpmInvocation('win32')
  assert.equal(windowsInvocation.command, process.execPath)
  assert.ok(windowsInvocation.prefixArgs[0].endsWith('npm-cli.js'))
  assert.ok(fs.existsSync(windowsInvocation.prefixArgs[0]))
  const unixInvocation = resolvePetAssetNpmInvocation('linux')
  assert.deepEqual(unixInvocation, { command: 'npm', prefixArgs: [] })

  const target = path.join(temporary, 'assets', ...manifest.files[0].path.split('/'))
  fs.appendFileSync(target, 'tampered')
  assert.throws(() => validatePetAssetManifest(temporary, manifest.version), /校验失败/)

  console.log(JSON.stringify({
    success: true,
    skins: manifest.skins,
    files: manifest.files.length,
    checksum_tamper_rejected: true,
    windows_npm_cli_launcher: true,
    duplicate_prepare_guard: true,
    provider_calls: 0,
  }))
} finally {
  fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
