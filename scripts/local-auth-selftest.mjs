import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const outputDir = path.join(root, 'scratch', 'local-auth-selftest')
fs.mkdirSync(outputDir, { recursive: true })
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-local-auth-'))
const serverPath = path.join(root, 'ccm-package', 'dist', 'server.js')
const checks = []

const getFreePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer()
  probe.once('error', reject)
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address()
    const port = typeof address === 'object' && address ? address.port : 0
    probe.close(() => resolve(port))
  })
})

const waitForServer = async (baseUrl, child) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 45_000) {
    if (child.exitCode !== null) throw new Error(`server exited before startup (${child.exitCode})`)
    try {
      const response = await fetch(`${baseUrl}/`)
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('server startup timed out')
}

const cookieFrom = response => {
  const raw = response.headers.get('set-cookie') || ''
  return raw.split(';')[0]
}

const run = async () => {
  const port = await getFreePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, [serverPath, String(port)], {
    cwd: root,
    env: {
      ...process.env,
      HOME: tempHome,
      USERPROFILE: tempHome,
      CCM_FEISHU_CONTROL_BOT_AUTO_START: '0',
      CCM_LOCAL_AUTH_SELFTEST: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let serverOutput = ''
  child.stdout.on('data', chunk => { serverOutput += String(chunk).slice(-4000) })
  child.stderr.on('data', chunk => { serverOutput += String(chunk).slice(-4000) })

  try {
    await waitForServer(baseUrl, child)
    const browserHeaders = {
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      Origin: baseUrl,
      Referer: `${baseUrl}/`,
    }
    const request = async (pathname, options = {}, cookie = '') => {
      const headers = { ...browserHeaders, ...(options.headers || {}) }
      if (cookie) headers.Cookie = cookie
      const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers })
      const text = await response.text()
      let data = {}
      try { data = text ? JSON.parse(text) : {} } catch {}
      return { response, data, cookie: cookieFrom(response) }
    }
    const json = (body, options = {}) => ({
      method: options.method || 'POST',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body),
    })

    const initial = await request('/api/auth/session')
    assert.equal(initial.response.status, 200)
    assert.equal(initial.data.authenticated, false)
    assert.equal(initial.data.registration_enabled, false)
    assert.equal(initial.data.first_install, true)
    assert.equal(initial.data.login_theme, 'command')
    assert.equal(initial.data.user, null)
    checks.push({ name: 'first startup exposes onboarding while keeping normal registration disabled', pass: true })

    const localAgentRequest = await fetch(`${baseUrl}/api/projects`)
    assert.equal(localAgentRequest.status, 200)
    const simulatedRemoteRequest = await fetch(`${baseUrl}/api/projects`, { headers: { 'X-Forwarded-For': '203.0.113.8' } })
    assert.equal(simulatedRemoteRequest.status, 401)
    checks.push({ name: 'only loopback Agent requests may use the local no-cookie API path', pass: true })

    const protectedBeforeLogin = await request('/api/projects')
    assert.equal(protectedBeforeLogin.response.status, 401)
    assert.equal(protectedBeforeLogin.data.code, 'AUTH_REQUIRED')
    checks.push({ name: 'browser API requests require a local session', pass: true })

    const wrongLogin = await request('/api/auth/login', json({ username: 'mumulin', password: 'wrong-password' }))
    assert.equal(wrongLogin.response.status, 401)
    const login = await request('/api/auth/login', json({ username: 'mumulin', password: 'lzy123167' }))
    assert.equal(login.response.status, 200)
    assert.equal(login.data.user.username, 'mumulin')
    assert.equal(login.data.first_install, false)
    assert.match(login.cookie, /^ccm_session=/)
    const adminCookie = login.cookie
    checks.push({ name: 'initial admin login creates an HttpOnly session cookie', pass: true })

    const projects = await request('/api/projects', {}, adminCookie)
    assert.equal(projects.response.status, 200)
    const authenticatedRemoteRequest = await fetch(`${baseUrl}/api/projects`, {
      headers: { Cookie: adminCookie, 'X-Forwarded-For': '203.0.113.8' },
    })
    assert.equal(authenticatedRemoteRequest.status, 200)
    checks.push({ name: 'authenticated remote and reverse-proxy requests retain API access', pass: true })
    const settingsBefore = await request('/api/auth/settings', {}, adminCookie)
    assert.equal(settingsBefore.response.status, 200)
    assert.equal(settingsBefore.data.registration_enabled, false)
    assert.equal(settingsBefore.data.login_theme, 'command')
    assert.equal(settingsBefore.data.user_count, 1)
    const closedRegister = await request('/api/auth/register', json({ username: 'second-user', password: 'Newpass123!' }))
    assert.equal(closedRegister.response.status, 403)
    checks.push({ name: 'registration is closed by default and visible to the admin', pass: true })

    const themeUpdate = await request('/api/auth/settings', json({ login_theme: 'light' }, { method: 'PUT' }), adminCookie)
    assert.equal(themeUpdate.response.status, 200)
    assert.equal(themeUpdate.data.login_theme, 'light')
    assert.equal(themeUpdate.data.registration_enabled, false)
    const invalidTheme = await request('/api/auth/settings', json({ login_theme: 'invented' }, { method: 'PUT' }), adminCookie)
    assert.equal(invalidTheme.response.status, 400)
    const themedSession = await request('/api/auth/session', {}, adminCookie)
    assert.equal(themedSession.data.login_theme, 'light')
    checks.push({ name: 'admin login theme persists without changing registration policy', pass: true })

    const enable = await request('/api/auth/settings', json({ registration_enabled: true }, { method: 'PUT' }), adminCookie)
    assert.equal(enable.response.status, 200)
    assert.equal(enable.data.registration_enabled, true)
    const register = await request('/api/auth/register', json({ username: 'second-user', password: 'Newpass123!' }))
    assert.equal(register.response.status, 201)
    assert.match(register.cookie, /^ccm_session=/)
    const userCookie = register.cookie
    const duplicate = await request('/api/auth/register', json({ username: 'second-user', password: 'Newpass123!' }))
    assert.equal(duplicate.response.status, 400)
    const userSettings = await request('/api/auth/settings', {}, userCookie)
    assert.equal(userSettings.response.status, 403)
    const userProjects = await request('/api/projects', {}, userCookie)
    assert.equal(userProjects.response.status, 200)
    checks.push({ name: 'enabled registration creates a normal user without admin settings access', pass: true })

    const passwordChange = await request('/api/auth/password', json({ current_password: 'Newpass123!', new_password: 'Newpass456!' }, { method: 'POST' }), userCookie)
    assert.equal(passwordChange.response.status, 200)
    assert.equal(passwordChange.data.relogin_required, true)
    const invalidatedSession = await request('/api/projects', {}, userCookie)
    assert.equal(invalidatedSession.response.status, 401)
    const oldPassword = await request('/api/auth/login', json({ username: 'second-user', password: 'Newpass123!' }))
    assert.equal(oldPassword.response.status, 401)
    const newPassword = await request('/api/auth/login', json({ username: 'second-user', password: 'Newpass456!' }))
    assert.equal(newPassword.response.status, 200)
    checks.push({ name: 'password changes invalidate old sessions and require the new password', pass: true })

    const adminRelogin = await request('/api/auth/login', json({ username: 'mumulin', password: 'lzy123167' }))
    assert.equal(adminRelogin.response.status, 200)
    const disable = await request('/api/auth/settings', json({ registration_enabled: false }, { method: 'PUT' }), adminRelogin.cookie)
    assert.equal(disable.response.status, 200)
    assert.equal(disable.data.registration_enabled, false)
    const closedAgain = await request('/api/auth/register', json({ username: 'third-user', password: 'Newpass123!' }))
    assert.equal(closedAgain.response.status, 403)

    const stateAfterRestart = JSON.parse(fs.readFileSync(path.join(tempHome, '.cc-connect', 'auth', 'users.json'), 'utf8'))
    assert.equal(stateAfterRestart.registrationEnabled, false)
    assert.equal(stateAfterRestart.onboardingCompleted, true)
    assert.equal(stateAfterRestart.loginTheme, 'light')
    assert.equal(stateAfterRestart.users.length, 2)
    assert.equal(stateAfterRestart.users.some(user => user.password?.hash?.includes('lzy123167')), false)
    assert.equal(stateAfterRestart.users.some(user => user.password?.hash?.includes('Newpass456!')), false)
    checks.push({ name: 'auth storage persists policy and stores only scrypt password hashes', pass: true })

    return { pass: true, generatedAt: new Date().toISOString(), baseUrl, checks }
  } finally {
    child.kill('SIGTERM')
    await new Promise(resolve => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve() }, 5_000)
      child.once('exit', () => { clearTimeout(timer); resolve() })
    })
    fs.rmSync(tempHome, { recursive: true, force: true })
  }
}

try {
  const report = await run()
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const report = { pass: false, generatedAt: new Date().toISOString(), checks, error: error?.stack || String(error) }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.error(report.error)
  process.exitCode = 1
}
