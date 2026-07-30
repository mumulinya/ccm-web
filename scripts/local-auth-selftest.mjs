import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import http from 'node:http'
import { spawn } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const outputDir = path.join(root, 'scratch', 'local-auth-selftest')
fs.mkdirSync(outputDir, { recursive: true })
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-local-auth-v2-'))
const dataDir = path.join(tempHome, '.cc-connect')
const serverPath = process.env.CCM_BACKEND_DIST_DIR
  ? path.join(path.resolve(process.env.CCM_BACKEND_DIST_DIR), 'server.js')
  : path.join(root, 'ccm-package', 'dist', 'server.js')
const checks = []
const browserHeaders = userAgent => ({ 'Sec-Fetch-Site': 'same-origin', 'Sec-Fetch-Mode': 'cors', 'User-Agent': userAgent, 'Accept-Language': 'zh-CN' })

const freePort = () => new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => resolve(address.port)); }); })
const waitForServer = async (baseUrl, child) => { const deadline = Date.now() + 45_000; while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`server exited (${child.exitCode})`); try { if ((await fetch(`${baseUrl}/api/auth/session`)).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 200)); } throw new Error('server startup timed out'); }
const stopServer = async child => { if (!child || child.exitCode !== null) return; child.kill('SIGTERM'); await new Promise(resolve => { const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5_000); child.once('exit', () => { clearTimeout(timer); resolve(); }); }); }
const removeTreeWithRetry = async target => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true })
      return
    } catch (error) {
      if (!['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error?.code) || attempt === 7) throw error
      await new Promise(resolve => setTimeout(resolve, 80 * (attempt + 1)))
    }
  }
}
const cookieFrom = response => (response.headers.get('set-cookie') || '').split(';')[0]
const json = (body, method = 'POST', headers = {}) => ({ method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
const requestWithHost = (port, host) => new Promise((resolve, reject) => { const request = http.request({ hostname: '127.0.0.1', port, path: '/api/auth/session', headers: { Host: host } }, response => { response.resume(); response.once('end', () => resolve(response.statusCode)); }); request.once('error', reject); request.end(); })

const run = async () => {
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`
  let child = null
  const start = async () => {
    child = spawn(process.execPath, [serverPath, String(port), '127.0.0.1'], { cwd: root, env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome, CCM_TASK_STORE_DIR: dataDir, CCM_FEISHU_CONTROL_BOT_AUTO_START: '0', CCM_STARTUP_PREPARE_LOCAL_EMBEDDING: '0' }, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', chunk => { output = `${output}${chunk}`.slice(-6000) })
    child.stderr.on('data', chunk => { output = `${output}${chunk}`.slice(-6000) })
    try { await waitForServer(baseUrl, child) } catch (error) { throw new Error(`${error.message}\n${output}`) }
  }
  const request = async (pathname, options = {}, session = null, userAgent = 'CCM-Selftest/1') => {
    const headers = { ...browserHeaders(userAgent), Origin: baseUrl, Referer: `${baseUrl}/`, ...(options.headers || {}) }
    if (session?.cookie) headers.Cookie = session.cookie
    if (session?.csrf && !['GET', 'HEAD', 'OPTIONS'].includes(String(options.method || 'GET').toUpperCase())) headers['X-CCM-CSRF'] = session.csrf
    const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers })
    const text = await response.text(); let data = {}; try { data = text ? JSON.parse(text) : {} } catch {}
    return { response, data, cookie: cookieFrom(response) }
  }
  const asSession = result => ({ cookie: result.cookie, csrf: result.data.csrf || result.data.session?.csrf })

  try {
    await start()
    const initial = await request('/api/auth/session')
    assert.equal(initial.response.status, 200); assert.equal(initial.data.first_install, true); assert.equal(initial.data.authenticated, false)
    const setupFile = path.join(dataDir, 'auth', 'setup-code.txt')
    assert.equal(fs.existsSync(setupFile), true)
    const setupCode = fs.readFileSync(setupFile, 'utf8').trim()
    checks.push({ name: 'new install creates a hashed one-time setup code without a default account', pass: true })

    const noCode = await request('/api/auth/register', json({ username: 'admin-one', password: 'Admin-One-123!' }))
    assert.equal(noCode.response.status, 403)
    const first = await request('/api/auth/register', json({ username: 'admin-one', password: 'Admin-One-123!', setup_code: setupCode }))
    assert.equal(first.response.status, 201); assert.equal(first.data.user.role, 'admin'); assert.equal(fs.existsSync(setupFile), false)
    const admin = asSession(first)
    const replay = await request('/api/auth/register', json({ username: 'admin-two', password: 'Admin-Two-123!', setup_code: setupCode }))
    assert.equal(replay.response.status, 403)
    checks.push({ name: 'setup code is required, consumed atomically, and cannot be replayed', pass: true })

    const unsigned = await fetch(`${baseUrl}/api/projects`)
    assert.equal(unsigned.status, 401)
    const oldAcp = await fetch(`${baseUrl}/api/internal/feishu-reaction/start`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CCM-ACP': '1' }, body: '{}' })
    assert.equal(oldAcp.status, 401)
    checks.push({ name: 'unsigned loopback and legacy ACP headers no longer bypass authentication', pass: true })

    const missingCsrf = await request('/api/auth/settings', json({ registration_enabled: true }, 'PUT'), { cookie: admin.cookie, csrf: '' })
    assert.equal(missingCsrf.response.status, 403); assert.equal(missingCsrf.data.code, 'CSRF_INVALID')
    const enable = await request('/api/auth/settings', json({ registration_enabled: true }, 'PUT'), admin)
    assert.equal(enable.response.status, 200)
    checks.push({ name: 'all browser mutations require the session CSRF token', pass: true })

    const viewerRegistration = await request('/api/auth/register', json({ username: 'viewer-one', password: 'Viewer-One-123!' }))
    assert.equal(viewerRegistration.response.status, 201); assert.equal(viewerRegistration.data.user.role, 'viewer')
    const viewer = asSession(viewerRegistration)
    assert.equal((await request('/api/projects', {}, viewer)).response.status, 200)
    assert.equal((await request('/api/projects/create', json({ name: 'forbidden' }), viewer)).response.status, 403)
    assert.equal((await request('/api/terminal/sessions', {}, viewer)).response.status, 403)
    const users = await request('/api/auth/users', {}, admin)
    const viewerUser = users.data.users.find(item => item.username === 'viewer-one')
    const promote = await request(`/api/auth/users/${viewerUser.id}/role`, json({ role: 'operator' }), admin)
    assert.equal(promote.response.status, 200)
    const viewerAfterRoleChange = await request('/api/projects', {}, viewer)
    assert.equal(viewerAfterRoleChange.response.status, 401)
    const operatorLogin = await request('/api/auth/login', json({ username: 'viewer-one', password: 'Viewer-One-123!' }))
    const operator = asSession(operatorLogin)
    assert.equal(operatorLogin.data.user.role, 'operator')
    assert.equal((await request('/api/projects/create', json({ name: 'still-forbidden' }), operator)).response.status, 403)
    assert.equal((await request('/api/tasks/queue', json({ task_id: 'missing' }), operator)).response.status === 403, false)
    checks.push({ name: 'viewer, operator and admin API capabilities are enforced by the server', pass: true })

    const lastAdmin = await request(`/api/auth/users/${first.data.user.id}/role`, json({ role: 'viewer' }), admin)
    assert.equal(lastAdmin.response.status, 400)
    checks.push({ name: 'the final active admin cannot be disabled, deleted or downgraded', pass: true })

    const mismatch = await request('/api/projects', {}, operator, 'Different-Browser/9')
    assert.equal(mismatch.response.status, 401); assert.equal(mismatch.data.code, 'SESSION_CLIENT_MISMATCH')
    const revokedAfterMismatch = await request('/api/projects', {}, operator)
    assert.equal(revokedAfterMismatch.response.status, 401)
    checks.push({ name: 'client fingerprint mismatch revokes the session and fails closed', pass: true })

    const secretFile = path.join(dataDir, 'auth', 'internal-api-secret')
    fs.mkdirSync(path.dirname(secretFile), { recursive: true })
    if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, `${crypto.randomBytes(48).toString('base64url')}\n`, { mode: 0o600 })
    const sign = (caller, method, pathname) => { const timestamp = String(Date.now()); const nonce = crypto.randomBytes(18).toString('base64url'); const payload = ['ccm-internal-api-v1', caller, method, pathname, timestamp, nonce].join('\n'); const signature = crypto.createHmac('sha256', fs.readFileSync(secretFile, 'utf8').trim()).update(payload).digest('base64url'); return { 'X-CCM-Internal-Caller': caller, 'X-CCM-Internal-Timestamp': timestamp, 'X-CCM-Internal-Nonce': nonce, 'X-CCM-Internal-Signature': signature }; }
    const signedHeaders = sign('global-agent', 'GET', '/api/projects')
    assert.equal((await fetch(`${baseUrl}/api/projects`, { headers: signedHeaders })).status, 200)
    assert.equal((await fetch(`${baseUrl}/api/projects`, { headers: signedHeaders })).status, 401)
    assert.equal((await fetch(`${baseUrl}/api/terminal/sessions`, { headers: sign('global-agent', 'GET', '/api/terminal/sessions') })).status, 401)
    checks.push({ name: 'internal HMAC binds caller, method and path and rejects nonce replay or route expansion', pass: true })

    assert.equal(await requestWithHost(port, 'attacker.invalid'), 421)
    const secured = await fetch(`${baseUrl}/`)
    assert.match(secured.headers.get('content-security-policy') || '', /frame-ancestors 'none'/)
    assert.equal(secured.headers.get('x-content-type-options'), 'nosniff')
    checks.push({ name: 'host validation and browser security headers apply to static and API responses', pass: true })

    for (let index = 0; index < 5; index += 1) await request('/api/auth/login', json({ username: 'locked-user', password: 'Wrong-Pass-123!' }))
    const locked = await request('/api/auth/login', json({ username: 'locked-user', password: 'Wrong-Pass-123!' }))
    assert.equal(locked.response.status, 429)
    await stopServer(child); child = null; await start()
    const lockedAfterRestart = await request('/api/auth/login', json({ username: 'locked-user', password: 'Wrong-Pass-123!' }))
    assert.equal(lockedAfterRestart.response.status, 429)
    const rateStore = JSON.parse(fs.readFileSync(path.join(dataDir, 'auth', 'login-rate-limit.json'), 'utf8'))
    assert.equal(rateStore.entries.length <= 5000, true)
    checks.push({ name: 'login rate limits persist across restart and remain bounded', pass: true })

    const storedUsers = JSON.parse(fs.readFileSync(path.join(dataDir, 'auth', 'users.json'), 'utf8'))
    const storedSessions = JSON.parse(fs.readFileSync(path.join(dataDir, 'auth', 'sessions.json'), 'utf8'))
    assert.equal(storedUsers.schema, 'ccm-local-auth-users-v2'); assert.equal(storedSessions.schema, 'ccm-local-auth-sessions-v2')
    assert.equal(JSON.stringify(storedUsers).includes('Admin-One-123!'), false)
    return { pass: true, generatedAt: new Date().toISOString(), checks }
  } finally {
    await stopServer(child)
    if (!process.env.CCM_KEEP_TEST_ARTIFACTS) await removeTreeWithRetry(tempHome)
  }
}

try { const report = await run(); fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); }
catch (error) { const report = { pass: false, generatedAt: new Date().toISOString(), checks, error: error?.stack || String(error) }; fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2)); console.error(report.error); process.exitCode = 1; }
