import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const cli = path.join(root, 'ccm-package', 'bin', 'ccm.js')
const fixtureHome = path.join(root, 'scratch', 'node-pty-degraded-runtime')
const dataDir = path.join(fixtureHome, '.cc-connect')
const lockFile = path.join(dataDir, 'run', 'ccm-server-instance.lock')
fs.rmSync(fixtureHome, { recursive: true, force: true })
fs.mkdirSync(fixtureHome, { recursive: true })

const port = await new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const value = server.address().port
    server.close(error => error ? reject(error) : resolve(value))
  })
})
const env = {
  ...process.env,
  HOME: fixtureHome,
  USERPROFILE: fixtureHome,
  CCM_TASK_STORE_DIR: dataDir,
  CCM_SERVER_LOCK_FILE: lockFile,
  CCM_DISABLE_NODE_PTY: '1',
  NO_COLOR: '1',
}
const run = args => execFileSync(process.execPath, [cli, ...args], {
  cwd: root, env, encoding: 'utf8', timeout: 45_000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
})

try {
  const doctor = JSON.parse(run(['doctor', '--json']))
  const pty = doctor.checks.find(check => check.id === 'pty')
  assert.equal(doctor.success, true)
  assert.equal(pty.ok, false)
  assert.equal(pty.required, false)
  assert.equal(pty.degraded, true)

  assert.match(run(['start', '--background', '--port', String(port)]), /STARTED/)
  const registration = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `fallback_${Date.now().toString(36)}`, password: `Fallback-${Date.now()}-Safe` }),
  })
  assert.equal(registration.status, 201)
  const cookie = String(registration.headers.get('set-cookie') || '').split(';')[0]
  const request = (pathname, options = {}) => fetch(`http://127.0.0.1:${port}${pathname}`, {
    ...options, headers: { ...(options.headers || {}), Cookie: cookie },
  })

  const shells = await request('/api/terminal/shells').then(response => response.json())
  assert.equal(shells.persistent.available, false)
  assert.equal(shells.persistent.mode, 'command_fallback')

  const persistentAttempt = await request('/api/terminal/session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'degraded-pty', cwd: root }),
  })
  assert.equal(persistentAttempt.status, 503)
  assert.equal((await persistentAttempt.json()).code, 'CCM_PTY_UNAVAILABLE')

  const command = await request('/api/terminal/exec', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: `node -e "console.log('CCM_COMMAND_FALLBACK_OK')"`, cwd: root }),
  }).then(response => response.json())
  assert.equal(command.success, true)
  assert.match(command.output, /CCM_COMMAND_FALLBACK_OK/)

  console.log(JSON.stringify({
    success: true,
    checks: {
      optionalDoctorCapability: true,
      coreServerStartsWithoutPty: true,
      explicitPersistentTerminal503: true,
      commandFallbackWorks: true,
    },
    paidProviderCalls: 0,
  }, null, 2))
} finally {
  try { run(['stop']) } catch {}
  fs.rmSync(fixtureHome, { recursive: true, force: true })
}
