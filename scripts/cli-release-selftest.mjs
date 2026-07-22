import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const cli = path.join(root, 'ccm-package', 'bin', 'ccm.js')
const fixtureHome = path.join(root, 'scratch', 'cli-release-selftest-home')
const dataDir = path.join(fixtureHome, '.cc-connect')
const lockFile = path.join(dataDir, 'run', 'ccm-server-instance.lock')
fs.rmSync(fixtureHome, { recursive: true, force: true })
fs.mkdirSync(fixtureHome, { recursive: true })

const port = await new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const selected = server.address().port
    server.close(error => error ? reject(error) : resolve(selected))
  })
})
const env = {
  ...process.env,
  HOME: fixtureHome,
  USERPROFILE: fixtureHome,
  CCM_TASK_STORE_DIR: dataDir,
  CCM_SERVER_LOCK_FILE: lockFile,
  NO_COLOR: '1',
}
const run = (args, options = {}) => execFileSync(process.execPath, [cli, ...args], { cwd: root, env, encoding: 'utf8', timeout: options.timeout || 45_000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })

try {
  assert.match(run(['--version']), /@mumulinya167\/cc-web 1\.0\.16/)
  const help = run(['help'])
  for (const command of ['start', 'stop', 'restart', 'status', 'doctor', 'open', 'logs', 'update', 'project']) assert.match(help, new RegExp(`\\b${command}\\b`))
  assert.match(help, /--host 127\.0\.0\.1/)

  const started = run(['start', '--background', '--port', String(port)])
  assert.match(started, /STARTED/)
  assert.match(started, new RegExp(`http://localhost:${port}`))

  const status = JSON.parse(run(['status', '--json']))
  assert.equal(status.package.version, '1.0.16')
  assert.equal(status.service.active, true)
  assert.equal(status.service.port, port)
  assert.equal(status.service.host, '127.0.0.1')
  assert.ok(status.service.pid > 0)

  const sessionResponse = await fetch(`http://127.0.0.1:${port}/api/auth/session`)
  assert.equal(sessionResponse.status, 200)
  const session = await sessionResponse.json()
  assert.equal(typeof session.first_install, 'boolean')

  const doctor = JSON.parse(run(['doctor', '--json']))
  assert.equal(doctor.success, true)
  assert.equal(doctor.checks.find(check => check.id === 'pty')?.ok, true)

  const logFile = path.join(dataDir, 'logs', 'ccm-server.log')
  const logDeadline = Date.now() + 5_000
  while ((!fs.existsSync(logFile) || !fs.readFileSync(logFile, 'utf8').includes('CCM Workspace')) && Date.now() < logDeadline) await new Promise(resolve => setTimeout(resolve, 100))
  const startupLog = fs.readFileSync(logFile, 'utf8')
  assert.match(startupLog, /CCM Workspace  v1\.0\.16/)
  assert.match(startupLog, new RegExp(`Local URL\\s+http://localhost:${port}`))
  assert.match(startupLog, new RegExp(`Listen\\s+127\\.0\\.0\\.1:${port}`))
  assert.doesNotMatch(startupLog, /╔|cc-web 控制台/)

  const stopped = run(['stop'])
  assert.match(stopped, /STOPPED/)
  const stoppedStatus = JSON.parse(run(['status', '--json']))
  assert.equal(stoppedStatus.service.active, false)

  const remoteStarted = run(['start', '--background', '--port', String(port), '--host', '0.0.0.0'])
  assert.match(remoteStarted, /STARTED/)
  assert.match(remoteStarted, /Listen\s+0\.0\.0\.0:/)
  const remoteStatus = JSON.parse(run(['status', '--json']))
  assert.equal(remoteStatus.service.host, '0.0.0.0')
  assert.equal(remoteStatus.service.active, true)
  assert.match(run(['stop']), /STOPPED/)

  console.log(JSON.stringify({
    success: true,
    checks: {
      versionAndHelp: true,
      isolatedBackgroundStart: true,
      structuredStatus: true,
      firstInstallAuthEndpoint: true,
      doctorIncludesPty: true,
      singleModernStartupBanner: true,
      controlledStop: true,
      explicitRemoteBinding: true,
    },
    port,
    paidProviderCalls: 0,
  }, null, 2))
} finally {
  try { run(['stop'], { timeout: 10_000 }) } catch {}
  const lock = fs.existsSync(lockFile) ? JSON.parse(fs.readFileSync(lockFile, 'utf8')) : null
  if (!lock?.pid || (() => { try { process.kill(Number(lock.pid), 0); return false } catch { return true } })()) fs.rmSync(fixtureHome, { recursive: true, force: true })
}
