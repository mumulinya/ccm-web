import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const terminalSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'tools', 'Terminal.vue'), 'utf8')
const terminalModuleUrl = pathToFileURL(path.join(root, 'ccm-package', 'dist', 'modules', 'tools', 'terminal.js')).href
const { runTerminalModuleSelfTest } = await import(terminalModuleUrl)

const jsonRequest = async (pathname, method = 'GET', body) => {
  const response = await fetch(`${baseUrl}${pathname}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `${method} ${pathname} failed: ${response.status}`)
  return data
}

const streamCommand = async (command, onEvent = () => {}) => {
  const response = await fetch(`${baseUrl}/api/terminal/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command }) })
  assert.equal(response.ok, true)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const events = []
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() || ''
    for (const block of blocks) {
      const text = block.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
      if (!text) continue
      const event = JSON.parse(text)
      events.push(event)
      await onEvent(event)
    }
  }
  return events
}

const original = await jsonRequest('/api/terminal/workspace')
try {
  assert.equal(runTerminalModuleSelfTest().success, true)
  assert.match(terminalSource, /confirmDialog/)
  assert.match(terminalSource, /terminalApi\.stop/)
  assert.match(terminalSource, /terminalApi\.saveWorkspace/)

  const fixture = {
    activeTerminalId: 'selftest-terminal', splitMode: true,
    sessions: [{ id: 'selftest-terminal', name: '验收终端', currentCwd: process.cwd(), history: ['node -v'], terminalOutput: [{ text: 'persisted line', type: 'output', time: '00:00:00' }] }],
  }
  await jsonRequest('/api/terminal/workspace', 'PUT', { workspace: fixture })
  const persisted = await jsonRequest('/api/terminal/workspace')
  assert.equal(persisted.workspace.sessions[0].history[0], 'node -v')
  assert.equal(persisted.workspace.sessions[0].terminalOutput[0].text, 'persisted line')

  const streamCmd = process.platform === 'win32'
    ? "Write-Output 'stream-first'; Start-Sleep -Milliseconds 350; Write-Output 'stream-second'"
    : "printf 'stream-first\\n'; sleep 0.35; printf 'stream-second\\n'"
  const streamed = await streamCommand(streamCmd)
  assert.equal(streamed[0].type, 'started')
  assert.equal(streamed.some(event => event.type === 'stdout' && event.text.includes('stream-first')), true)
  assert.equal(streamed.some(event => event.type === 'stdout' && event.text.includes('stream-second')), true)
  assert.equal(streamed.at(-1).type, 'done')
  assert.equal(streamed.at(-1).exitCode, 0)
  assert.ok(streamed.at(-1).durationMs >= 250)

  let stopRequested = false
  const longCmd = process.platform === 'win32' ? "Write-Output 'running'; Start-Sleep -Seconds 8" : "printf 'running\\n'; sleep 8"
  const stopped = await streamCommand(longCmd, async event => {
    if (event.type === 'started' && !stopRequested) {
      stopRequested = true
      await jsonRequest('/api/terminal/stop', 'POST', { runId: event.runId })
    }
  })
  assert.equal(stopRequested, true)
  assert.equal(stopped.at(-1).type, 'done')
  assert.equal(stopped.at(-1).stopped, true)
  assert.ok(stopped.at(-1).durationMs < 8000)

  console.log(JSON.stringify({ success: true, checks: ['workspace persistence', 'streamed stdout', 'exit code and duration', 'running command stop', 'frontend safety and persistence controls'] }, null, 2))
} finally {
  await jsonRequest('/api/terminal/workspace', 'PUT', { workspace: original.workspace || { sessions: [] } })
}
