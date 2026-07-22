import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const moduleUrl = pathToFileURL(path.join(root, 'ccm-package', 'dist', 'modules', 'tools', 'terminal.js')).href
const { handleTerminalApi, runTerminalModuleSelfTest, runPersistentTerminalSelfTest, stopAllTerminalRuns } = await import(`${moduleUrl}?t=${Date.now()}`)

const staticResult = runTerminalModuleSelfTest()
assert.equal(staticResult.success, true)
assert.equal(staticResult.checks.dangerousCommandBlocked, true)

const liveResult = await runPersistentTerminalSelfTest()
assert.equal(liveResult.success, true)
assert.equal(liveResult.checks.persistentOutput, true)
assert.equal(liveResult.checks.dangerousCommandChallenge, true)
assert.ok(liveResult.checks.processPid > 0)

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname
  if (!handleTerminalApi(pathname, req, res)) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not Found' }))
  }
})
await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const baseUrl = `http://127.0.0.1:${server.address().port}`
const jsonRequest = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `${response.status} ${pathname}`)
  return data
}
try {
  const shellInventory = await jsonRequest('/api/terminal/shells')
  assert.ok(shellInventory.shells.length > 0)
  const sessionId = `pty-http-${Date.now().toString(36)}`
  const created = await jsonRequest('/api/terminal/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, name: 'HTTP PTY', cwd: process.cwd(), cols: 90, rows: 24 }) })
  assert.equal(created.session.id, sessionId)
  const sessions = await jsonRequest('/api/terminal/sessions')
  assert.equal(sessions.sessions.some(session => session.id === sessionId && session.pid > 0), true)
  const resized = await jsonRequest('/api/terminal/session/resize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, cols: 92, rows: 25 }) })
  assert.deepEqual([resized.cols, resized.rows], [92, 25])
  const actions = await jsonRequest(`/api/terminal/project-actions?cwd=${encodeURIComponent(root)}`)
  assert.equal(actions.scripts.some(script => script.name === 'build'), true)
  await jsonRequest(`/api/terminal/session?id=${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
} finally {
  stopAllTerminalRuns()
  await new Promise(resolve => server.close(resolve))
}

const terminal = read('frontend/src/components/tools/Terminal.vue')
const emulator = read('frontend/src/components/tools/terminal/TerminalEmulatorPane.vue')
const api = read('frontend/src/api/index.js')
const app = read('frontend/src/App.vue')
const globalAgent = read('frontend/src/components/global/GlobalAgent.vue')
const projectAgent = read('frontend/src/components/projects/useProjectManager.js')
const groupAgent = read('frontend/src/components/collaboration/useGroupChat.js')

assert.match(emulator, /new Terminal\(/)
assert.match(emulator, /FitAddon/)
assert.match(emulator, /EventSource\(`\/api\/terminal\/session\/events/)
assert.match(emulator, /terminalApi\.resize/)
assert.match(terminal, /projectActions/)
assert.match(terminal, /processSessions/)
assert.match(terminal, /sendToAgent\('global'/)
assert.match(api, /confirmInput/)
assert.match(app, /handleTerminalAnalysis/)
assert.match(globalAgent, /target\.draftMessage/)
assert.match(projectAgent, /target\.draftMessage/)
assert.match(groupAgent, /target\.draftMessage/)

console.log(JSON.stringify({
  success: true,
  checks: {
    persistentPtyOutput: true,
    ansiTerminalAndResize: true,
    dangerousCommandServerChallenge: true,
    httpSessionLifecycle: true,
    projectScriptAndProcessWorkflow: true,
    agentDraftRouting: ['global', 'project', 'group'],
  },
  paidProviderCalls: 0,
}, null, 2))
