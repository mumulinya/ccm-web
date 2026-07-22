import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const installRoot = path.resolve(process.argv[2] || '')
const expectedVersion = String(process.argv[3] || '').trim()
if (!installRoot || !expectedVersion) throw new Error('Usage: npm-installed-package-selftest <install-root> <version>')
const packageRoot = path.join(installRoot, 'node_modules', '@mumulinya167', 'cc-web')
const packageFile = path.join(packageRoot, 'package.json')
const cli = path.join(packageRoot, 'bin', 'ccm.js')
assert.equal(fs.existsSync(packageFile), true)
assert.equal(fs.existsSync(cli), true)
const packageInfo = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
assert.equal(packageInfo.version, expectedVersion)
assert.equal(packageInfo.dependencies?.['node-pty'], undefined)
assert.equal(packageInfo.optionalDependencies['node-pty'], '1.2.0-beta.14')
assert.equal(packageInfo.scripts?.postinstall, 'node bin/postinstall.js')
assert.match(fs.readFileSync(cli, 'utf8'), /^#!\/usr\/bin\/env node/)
assert.match(fs.readFileSync(path.join(packageRoot, 'bin', 'postinstall.js'), 'utf8'), /chmodSync\(filePath, 0o755\)/)
const requireFromPackage = createRequire(packageFile)
assert.ok(requireFromPackage.resolve('node-pty'))

const fixtureHome = path.join(installRoot, `runtime-home-${expectedVersion}`)
const dataDir = path.join(fixtureHome, '.cc-connect')
const lockFile = path.join(dataDir, 'run', 'ccm-server-instance.lock')
fs.mkdirSync(fixtureHome, { recursive: true })
const port = await new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const selected = server.address().port
    server.close(error => error ? reject(error) : resolve(selected))
  })
})
const env = { ...process.env, HOME: fixtureHome, USERPROFILE: fixtureHome, CCM_TASK_STORE_DIR: dataDir, CCM_SERVER_LOCK_FILE: lockFile, NO_COLOR: '1' }
const run = (args, timeout = 45_000) => execFileSync(process.execPath, [cli, ...args], { cwd: installRoot, env, encoding: 'utf8', timeout, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
const request = async (pathname, options = {}, cookie = '') => {
  const headers = { ...(options.headers || {}), ...(cookie ? { Cookie: cookie } : {}) }
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

try {
  assert.match(run(['--version']), new RegExp(`${expectedVersion.replace(/\./g, '\\.')}\\s*$`))
  const doctor = JSON.parse(run(['doctor', '--json']))
  assert.equal(doctor.success, true)
  assert.equal(doctor.checks.find(check => check.id === 'pty')?.ok, true)

  const started = run(['start', '--background', '--port', String(port)])
  assert.match(started, /STARTED/)
  const rootResponse = await fetch(`http://127.0.0.1:${port}/`)
  assert.equal(rootResponse.status, 200)
  const initial = await request('/api/auth/session')
  assert.equal(initial.response.status, 200)
  assert.equal(initial.data.first_install, true)

  const registration = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `release_${Date.now().toString(36)}`, password: `Release-${Date.now()}-Safe` }),
  })
  assert.equal(registration.response.status, 201)
  assert.equal(registration.data.success, true)
  const cookie = String(registration.response.headers.get('set-cookie') || '').split(';')[0]
  assert.ok(cookie)

  const endpoints = [
    '/api/projects', '/api/groups', '/api/memory-center/overview', '/api/cleanup/summary',
    '/api/pets/agents', '/api/music/list', '/api/cron', '/api/terminal/shells',
  ]
  for (const endpoint of endpoints) {
    const result = await request(endpoint, {}, cookie)
    assert.equal(result.response.status, 200, `${endpoint}: ${result.response.status} ${JSON.stringify(result.data)}`)
  }

  const terminalId = `release-pty-${Date.now().toString(36)}`
  const created = await request('/api/terminal/session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: terminalId, name: 'Release PTY', cwd: installRoot, cols: 90, rows: 24 }),
  }, cookie)
  assert.equal(created.response.status, 200)
  assert.ok(created.data.session.pid > 0)
  const input = await request('/api/terminal/session/input', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: terminalId, data: "Write-Output 'INSTALLED_PTY_OK'\r" }),
  }, cookie)
  assert.equal(input.response.status, 200)
  const sessions = await request('/api/terminal/sessions', {}, cookie)
  assert.equal(sessions.data.sessions.some(session => session.id === terminalId), true)
  const removed = await request(`/api/terminal/session?id=${encodeURIComponent(terminalId)}`, { method: 'DELETE' }, cookie)
  assert.equal(removed.response.status, 200)

  const stopped = run(['stop'])
  assert.match(stopped, /STOPPED/)
  console.log(JSON.stringify({
    success: true,
    source: packageRoot,
    version: expectedVersion,
    checks: {
      packageDependencies: true,
      cliVersionAndDoctor: true,
      backgroundLifecycle: true,
      firstInstallRegistration: true,
      authenticatedCoreApis: endpoints.length,
      installedPersistentPty: true,
    },
    paidProviderCalls: 0,
  }, null, 2))
} finally {
  try { run(['stop'], 10_000) } catch {}
}
