import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '..')
const isolatedHome = path.join(root, 'scratch', 'main-agent-runtime-e2e-home')
const ccmHome = path.join(isolatedHome, '.cc-connect')
const port = 33100 + (process.pid % 500)
const baseUrl = `http://127.0.0.1:${port}`

assert.ok(isolatedHome.startsWith(path.join(root, 'scratch') + path.sep), 'isolated home must stay inside scratch')
fs.rmSync(isolatedHome, { recursive: true, force: true })
fs.mkdirSync(ccmHome, { recursive: true })
fs.writeFileSync(path.join(ccmHome, 'groups.json'), JSON.stringify([{
  id: 'runtime-e2e-group',
  name: '主 Agent 运行验收群',
  members: [
    { project: 'coordinator', role: 'coordinator', agent: 'coded-orchestrator' },
    { project: 'runtime-e2e-project', agent: 'claudecode' },
  ],
  created_at: new Date().toISOString(),
}], null, 2))
fs.writeFileSync(path.join(ccmHome, 'tasks.json'), '[]')
fs.writeFileSync(path.join(ccmHome, 'group-logs.json'), '[]')

const child = spawn(process.execPath, [path.join(root, 'ccm-package', 'dist', 'server.js'), String(port)], {
  cwd: root,
  env: { ...process.env, USERPROFILE: isolatedHome, HOME: isolatedHome },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})

let serverOutput = ''
child.stdout.on('data', chunk => { serverOutput += String(chunk) })
child.stderr.on('data', chunk => { serverOutput += String(chunk) })

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function waitForServer() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`isolated server exited early (${child.exitCode})\n${serverOutput}`)
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {}
    await sleep(150)
  }
  throw new Error(`isolated server did not become ready\n${serverOutput}`)
}

function parseSse(text) {
  return text.split(/\r?\n\r?\n/)
    .map(block => block.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n'))
    .filter(Boolean)
    .map(value => JSON.parse(value))
}

function assertOrderedEvents(events, label) {
  assert.ok(events.length >= 2, `${label} should emit multiple events`)
  const ids = events.map(event => event.event_id || event.eventId)
  assert.equal(ids.every(Boolean), true, `${label} events should carry IDs`)
  assert.equal(new Set(ids).size, ids.length, `${label} event IDs should be unique`)
  assert.deepEqual(events.map(event => event.sequence), events.map((_, index) => index + 1), `${label} sequences should be monotonic`)
}

async function postSse(url, body) {
  const response = await fetch(`${baseUrl}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  })
  assert.equal(response.ok, true, `${url} should return 2xx`)
  return parseSse(await response.text())
}

try {
  await waitForServer()

  const page = await (await fetch(baseUrl)).text()
  assert.match(page, /<div id="app"><\/div>/, 'production frontend should be served')

  const globalRequest = {
    message: '现在有哪些任务正在进行？',
    session_id: 'runtime-e2e-session',
    request_id: 'runtime-e2e-global-status-1',
    stream: true,
  }
  const globalEvents = await postSse('/api/global-agent/run?stream=true', globalRequest)
  assertOrderedEvents(globalEvents, 'global stream')
  const globalResult = globalEvents.find(event => event.type === 'result')
  assert.ok(globalResult?.run?.id, 'global status request should return a run')
  assert.equal(globalEvents.at(-1)?.type, 'done', 'global stream should terminate with done')
  assert.doesNotMatch(String(globalResult.run.final_reply || ''), /trace_id|session_id|CCM_AGENT_RECEIPT/i, 'global primary reply should hide protocol details')

  const duplicateEvents = await postSse('/api/global-agent/run?stream=true', globalRequest)
  assertOrderedEvents(duplicateEvents, 'global duplicate replay')
  const duplicateResult = duplicateEvents.find(event => event.type === 'result')
  assert.equal(duplicateResult?.duplicate, true, 'same global request ID should replay instead of executing twice')
  assert.equal(duplicateResult?.run?.id, globalResult.run.id, 'duplicate replay should return the original run')

  const groupEvents = await postSse('/api/groups/send', {
    group_id: 'runtime-e2e-group',
    target_project: 'all',
    message: '现在任务进展怎么样？',
    message_mode: 'conversation',
    client_message_id: 'runtime-e2e-group-status-1',
  })
  assertOrderedEvents(groupEvents, 'group stream')
  assert.equal(groupEvents.at(-1)?.type, 'done', 'group stream should terminate with done')
  assert.ok(groupEvents.some(event => event.type === 'status'), 'group status request should stream a friendly progress state')
  assert.doesNotMatch(JSON.stringify(groupEvents), /CCM_AGENT_RECEIPT|native_session|WorkerContextPacket/i, 'group visible stream should hide protocol details')

  console.log(JSON.stringify({
    pass: true,
    baseUrl,
    isolated: true,
    checks: {
      productionFrontendServed: true,
      globalSseOrdered: true,
      duplicateGlobalRequestReplayed: true,
      groupSseOrdered: true,
      primaryTextHidesTechnicalProtocol: true,
    },
  }, null, 2))
} finally {
  if (child.exitCode === null) {
    child.kill('SIGTERM')
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      sleep(5_000),
    ])
    if (child.exitCode === null) child.kill('SIGKILL')
  }
  fs.rmSync(isolatedHome, { recursive: true, force: true })
}
