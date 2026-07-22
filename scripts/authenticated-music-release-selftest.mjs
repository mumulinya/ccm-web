import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const cli = path.join(root, 'ccm-package', 'bin', 'ccm.js')
const fixtureHome = path.join(root, 'scratch', `music-release-home-${Date.now().toString(36)}`)
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
const runCli = args => execFileSync(process.execPath, [cli, ...args], { cwd: root, env, encoding: 'utf8', timeout: 45_000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })

try {
  runCli(['start', '--background', '--port', String(port)])
  const registration = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `music_${Date.now().toString(36)}`, password: `Music-${Date.now()}-Release-Safe` }),
  })
  if (registration.status !== 201) throw new Error(`temporary registration failed: ${registration.status} ${await registration.text()}`)
  const cookie = String(registration.headers.get('set-cookie') || '').split(';')[0]
  if (!cookie) throw new Error('temporary auth cookie missing')
  const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  const command = fs.existsSync(npmCli) ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm')
  const args = fs.existsSync(npmCli) ? [npmCli, 'run', 'test:music-production'] : ['run', 'test:music-production']
  execFileSync(command, args, { cwd: root, env: { ...env, CCM_MUSIC_URL: `http://127.0.0.1:${port}`, CCM_AUTH_COOKIE: cookie }, timeout: 180_000, windowsHide: true, stdio: 'inherit' })
  console.log(JSON.stringify({ success: true, authenticatedIsolation: true, port, paidProviderCalls: 0 }, null, 2))
} finally {
  try { runCli(['stop']) } catch {}
}
