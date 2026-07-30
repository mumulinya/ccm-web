import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const distRoot = process.env.CCM_BACKEND_DIST_DIR || path.join(root, 'ccm-package', 'dist')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-pet-security-'))
process.env.USERPROFILE = tempHome
process.env.HOME = tempHome

try {
  const pets = require(path.join(distRoot, 'modules', 'pets', 'pets.js'))
  const internalAuth = require(path.join(distRoot, 'modules', 'system', 'internal-api-auth.js'))
  const assets = pets.runPetAssetSecuritySelfTest()
  assert.equal(assets.pass, true)

  const route = '/api/pets/runtime/bootstrap?client_id=test'
  const headers = internalAuth.buildInternalApiHeaders('desktop-pet', 'GET', route)
  const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]))
  const request = { method: 'GET', headers: normalized }
  assert.equal(internalAuth.verifyInternalApiRequest(request, route)?.caller, 'desktop-pet')
  assert.equal(internalAuth.verifyInternalApiRequest(request, route), null)

  const forbiddenRoute = '/api/cleanup/summary'
  const forbiddenHeaders = internalAuth.buildInternalApiHeaders('desktop-pet', 'GET', forbiddenRoute)
  const forbiddenRequest = {
    method: 'GET',
    headers: Object.fromEntries(Object.entries(forbiddenHeaders).map(([key, value]) => [key.toLowerCase(), value])),
  }
  assert.equal(internalAuth.verifyInternalApiRequest(forbiddenRequest, forbiddenRoute), null)

  for (const file of [
    path.join(root, 'ccm-package', 'pet', 'main.js'),
    path.join(root, 'ccm-package', 'pet', 'preload.js'),
    path.join(root, 'ccm-package', 'pet', 'renderer', 'pet.js'),
  ]) {
    assert.equal(fs.existsSync(file), true)
  }
  const html = fs.readFileSync(path.join(root, 'ccm-package', 'pet', 'renderer', 'index.html'), 'utf8')
  assert.match(html, /Content-Security-Policy/)
  assert.match(html, /connect-src 'none'/)

  console.log(JSON.stringify({
    pass: true,
    checks: Object.keys(assets.checks).length + 8,
    asset_checks: assets.checks,
    paid_provider_calls: 0,
  }, null, 2))
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
