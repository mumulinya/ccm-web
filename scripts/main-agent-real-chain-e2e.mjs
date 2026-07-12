import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

if (process.env.CCM_REAL_AGENT_E2E !== '1') {
  throw new Error('Set CCM_REAL_AGENT_E2E=1 to run the external code-agent acceptance test.')
}

const root = path.resolve(import.meta.dirname, '..')
const scratchRoot = path.join(root, 'scratch')
const isolatedHome = path.join(scratchRoot, 'main-agent-real-chain-home')
const ccmHome = path.join(isolatedHome, '.cc-connect')
const projectRoot = path.join(isolatedHome, 'runtime-project')
const originalHome = os.homedir()
const port = 33700 + (process.pid % 300)
const baseUrl = `http://127.0.0.1:${port}`
const marker = `group-real-chain-${Date.now()}`
const externalAgent = String(process.env.CCM_REAL_CHAIN_AGENT || 'claudecode').trim().toLowerCase()
assert.ok(['claudecode', 'cursor', 'codex'].includes(externalAgent), `unsupported real-chain agent: ${externalAgent}`)

for (const target of [isolatedHome, projectRoot]) {
  assert.ok(target.startsWith(scratchRoot + path.sep), `temporary path must stay inside scratch: ${target}`)
}

fs.rmSync(isolatedHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
fs.mkdirSync(path.join(projectRoot, 'src'), { recursive: true })
fs.mkdirSync(path.join(projectRoot, 'scripts'), { recursive: true })
fs.mkdirSync(ccmHome, { recursive: true })
fs.mkdirSync(path.join(ccmHome, 'configs'), { recursive: true })

if (externalAgent === 'codex') {
  const sourceCodexHome = path.join(originalHome, '.codex')
  const isolatedCodexHome = path.join(isolatedHome, '.codex')
  const sourceCodexConfig = path.join(sourceCodexHome, 'config.toml')
  const sourceCodexAuth = path.join(sourceCodexHome, 'auth.json')
  assert.equal(fs.existsSync(sourceCodexConfig), true, 'Codex config is required for the real-chain test')
  assert.equal(fs.existsSync(sourceCodexAuth), true, 'Codex authentication is required for the real-chain test')
  fs.mkdirSync(isolatedCodexHome, { recursive: true })
  fs.copyFileSync(sourceCodexConfig, path.join(isolatedCodexHome, 'config.toml'))
  fs.copyFileSync(sourceCodexAuth, path.join(isolatedCodexHome, 'auth.json'))
}

fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify({
  name: 'ccm-main-agent-real-chain-fixture',
  private: true,
  type: 'module',
  scripts: {
    test: 'node scripts/test.mjs',
    build: 'node scripts/build.mjs',
  },
}, null, 2))
fs.writeFileSync(path.join(projectRoot, 'src', 'feature.js'), "export const deliveryMarker = 'before-main-agent-run'\n")
fs.writeFileSync(path.join(projectRoot, 'scripts', 'test.mjs'), `
import assert from 'node:assert/strict'
import { deliveryMarker } from '../src/feature.js'
assert.equal(deliveryMarker, '${marker}')
console.log('verified:${marker}')
`.trimStart())
fs.writeFileSync(path.join(projectRoot, 'scripts', 'build.mjs'), `
import fs from 'node:fs'
const source = fs.readFileSync(new URL('../src/feature.js', import.meta.url), 'utf8')
if (!source.includes('${marker}')) throw new Error('delivery marker missing')
console.log('built:${marker}')
`.trimStart())
fs.writeFileSync(path.join(projectRoot, 'README.md'), '# Main Agent Real Chain Fixture\n')

spawnSync('git', ['init'], { cwd: projectRoot, stdio: 'ignore', windowsHide: true })
spawnSync('git', ['config', 'user.name', 'CCM E2E'], { cwd: projectRoot, stdio: 'ignore', windowsHide: true })
spawnSync('git', ['config', 'user.email', 'ccm-e2e@example.invalid'], { cwd: projectRoot, stdio: 'ignore', windowsHide: true })
spawnSync('git', ['add', '.'], { cwd: projectRoot, stdio: 'ignore', windowsHide: true })
spawnSync('git', ['commit', '-m', 'fixture baseline'], { cwd: projectRoot, stdio: 'ignore', windowsHide: true })

const escapeToml = value => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
fs.writeFileSync(path.join(ccmHome, 'configs', 'config-runtime-e2e-project.toml'), `
language = "zh"

[[projects]]
name = "runtime-e2e-project"

[projects.agent]
type = "${externalAgent}"
mode = "default"

[projects.agent.options]
work_dir = "${escapeToml(projectRoot)}"
`.trimStart())

fs.writeFileSync(path.join(ccmHome, 'groups.json'), JSON.stringify([{
  id: 'runtime-real-chain-group',
  name: '主 Agent 真实链路验收群',
  members: [
    { project: 'coordinator', role: 'coordinator', agent: 'coded-orchestrator' },
    { project: 'runtime-e2e-project', agent: externalAgent },
  ],
  created_at: new Date().toISOString(),
}], null, 2))
fs.writeFileSync(path.join(ccmHome, 'tasks.json'), '[]')
fs.writeFileSync(path.join(ccmHome, 'group-logs.json'), '{}')

const orchestratorConfig = path.join(originalHome, '.cc-connect', 'group-orchestrator-config.json')
assert.equal(fs.existsSync(orchestratorConfig), true, 'unified model config is required for the real-chain test')
fs.copyFileSync(orchestratorConfig, path.join(ccmHome, 'group-orchestrator-config.json'))

const child = spawn(process.execPath, [path.join(root, 'ccm-package', 'dist', 'server.js'), String(port)], {
  cwd: root,
  env: {
    ...process.env,
    USERPROFILE: isolatedHome,
    HOME: isolatedHome,
    CODEX_HOME: path.join(originalHome, '.codex'),
    CLAUDE_CONFIG_DIR: path.join(originalHome, '.claude'),
  },
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
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode})\n${serverOutput.slice(-5000)}`)
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {}
    await sleep(200)
  }
  throw new Error(`server did not become ready\n${serverOutput.slice(-5000)}`)
}

function parseSse(text) {
  return text.split(/\r?\n\r?\n/)
    .map(block => block.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n'))
    .filter(Boolean)
    .map(value => JSON.parse(value))
}

async function postSse(url, body) {
  const payload = JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, response => {
      request.setTimeout(0)
      let responseText = ''
      response.setEncoding('utf8')
      response.on('data', chunk => { responseText += chunk })
      response.on('end', () => {
        if ((response.statusCode || 500) >= 400) {
          reject(new Error(`${url} should return 2xx; status=${response.statusCode}; body=${responseText.slice(0, 4000)}; server=${serverOutput.slice(-4000)}`))
          return
        }
        try { resolve(parseSse(responseText)) } catch (error) { reject(error) }
      })
      response.on('error', reject)
    })
    request.setTimeout(120_000, () => request.destroy(new Error(`timed out waiting for ${url} response headers`)))
    request.on('error', reject)
    request.write(payload)
    request.end()
  })
}

async function postJson(url, body, expectedOk = true) {
  const response = await fetch(`${baseUrl}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(240_000),
  })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : {} } catch {
    throw new Error(`${url} returned invalid JSON; status=${response.status}; body=${text.slice(0, 4000)}`)
  }
  if (expectedOk && !response.ok) {
    throw new Error(`${url} should return 2xx; status=${response.status}; body=${JSON.stringify(data).slice(0, 5000)}; server=${serverOutput.slice(-5000)}`)
  }
  return { response, data }
}

async function probeRuntimeAgent() {
  const { response, data } = await postJson('/api/orchestrator/agent-cli-probe', {
    group_id: 'runtime-real-chain-group',
    target_member: 'runtime-e2e-project',
    agent_type: externalAgent,
    capability_write: true,
    timeout_ms: 180_000,
    source: 'main-agent-real-chain-e2e',
  }, false)
  assert.equal(response.ok, true, `${externalAgent} CLI probe should return 2xx: ${JSON.stringify(data).slice(0, 5000)}`)
  assert.equal(data.success, true, `${externalAgent} CLI probe should pass: ${data.message || data.error || JSON.stringify(data).slice(0, 4000)}`)
  assert.equal(data.target?.project, 'runtime-e2e-project', 'probe should target the isolated runtime project')
  assert.equal(data.target?.agent_type, externalAgent, `probe should exercise ${externalAgent} CLI`)
  assert.equal(data.capabilities?.write?.pass, true, 'probe should prove workspace write capability')
  return data
}

async function recoverTasksAfterProbe() {
  const { response, data } = await postJson('/api/orchestrator/agent-recovery-monitor/run', {
    timeout_ms: 180_000,
    source: 'main-agent-real-chain-e2e',
  }, false)
  assert.equal(response.ok, true, `agent recovery should return 2xx: ${JSON.stringify(data).slice(0, 5000)}`)
  assert.equal(data.success, true, `agent recovery should succeed: ${data.message || JSON.stringify(data).slice(0, 4000)}`)
  return data
}

async function loadTasks() {
  try {
    const response = await fetch(`${baseUrl}/api/tasks`)
    assert.equal(response.ok, true, 'task list should be available')
    return (await response.json()).tasks || []
  } catch (error) {
    await sleep(150)
    if (child.exitCode !== null) {
      throw new Error(`server exited while loading tasks (${child.exitCode}): ${error?.message || error}\n${serverOutput.slice(-8000)}`)
    }
    throw error
  }
}

async function waitForTask(taskId) {
  const deadline = Date.now() + 18 * 60_000
  let latest = null
  let readinessRecoveryAttempted = false
  let transientLoadFailures = 0
  while (Date.now() < deadline) {
    try {
      latest = (await loadTasks()).find(task => task.id === taskId) || null
      transientLoadFailures = 0
    } catch (error) {
      transientLoadFailures += 1
      if (child.exitCode !== null || transientLoadFailures >= 5) throw error
      await sleep(500)
      continue
    }
    if (latest && ['done', 'failed', 'cancelled', 'needs_user'].includes(String(latest.status || ''))) return latest
    const readinessText = [
      latest?.status_detail,
      latest?.execution_readiness?.message,
      latest?.daily_dev_execution_readiness?.message,
    ].filter(Boolean).join('\n')
    if (latest?.status === 'pending' && /(?:真实\s*CLI\s*探针|Agent CLI.*探针|agent-cli-probe)/i.test(readinessText)) {
      if (readinessRecoveryAttempted) {
        throw new Error(`task ${taskId} remained blocked after a successful CLI probe and recovery: ${readinessText}\n${serverOutput.slice(-5000)}`)
      }
      readinessRecoveryAttempted = true
      await probeRuntimeAgent()
      await recoverTasksAfterProbe()
    }
    await sleep(2_000)
  }
  throw new Error(`task ${taskId} did not settle; latest=${JSON.stringify(latest)?.slice(0, 3000)}\n${serverOutput.slice(-5000)}`)
}

try {
  await waitForServer()
  const cliProbe = await probeRuntimeAgent()
  const taskEvents = await postSse('/api/groups/send', {
    group_id: 'runtime-real-chain-group',
    target_project: 'all',
    message: [
      '请在 runtime-e2e-project 完成一次真实代码交付。',
      `把 src/feature.js 的 deliveryMarker 修改为 ${marker}。`,
      '必须实际运行 npm test 和 npm run build。',
      '完成后必须交给 TestAgent 独立复核，并由主 Agent 抽查后再总结。',
    ].join('\n'),
    message_mode: 'project_task',
    force_task: true,
    auto_execute: true,
    requires_code_changes: true,
    requires_verification: true,
    requires_independent_review: true,
    client_message_id: `runtime-real-chain-${marker}`,
  })

  const createdEvent = taskEvents.find(event => event.type === 'task_created')
  const taskId = createdEvent?.task?.id || createdEvent?.taskId || taskEvents.find(event => event.taskId)?.taskId
  assert.ok(taskId, `group main agent should create a persistent task: ${JSON.stringify(taskEvents).slice(0, 4000)}`)

  let task = await waitForTask(taskId)
  if (task.status === 'needs_user' && task.intake_state === 'awaiting_confirmation') {
    const response = await fetch(`${baseUrl}/api/tasks/confirm-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, approved: true, auto_execute: true }),
    })
    assert.equal(response.ok, true, 'execution plan confirmation should succeed')
    task = await waitForTask(taskId)
  }

  const taskJson = JSON.stringify(task)
  const changedSource = fs.readFileSync(path.join(projectRoot, 'src', 'feature.js'), 'utf8')
  const testResult = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'test.mjs')], { cwd: projectRoot, encoding: 'utf8', windowsHide: true })
  const buildResult = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'build.mjs')], { cwd: projectRoot, encoding: 'utf8', windowsHide: true })
  const groupMessagesResponse = await fetch(`${baseUrl}/api/groups/messages?id=runtime-real-chain-group&limit=200`)
  const groupMessages = groupMessagesResponse.ok ? (await groupMessagesResponse.json()).messages || [] : []

  assert.equal(task.status, 'done', `real group task should complete: ${task.status_detail || task.result || task.error || ''}`)
  assert.equal(task.requires_independent_review, true, 'group task should persist the independent-review requirement')
  assert.match(changedSource, new RegExp(marker), 'external code agent should modify the project')
  assert.equal(testResult.status, 0, `fixture test should pass: ${testResult.stderr}`)
  assert.equal(buildResult.status, 0, `fixture build should pass: ${buildResult.stderr}`)
  assert.match(taskJson, /test.?agent/i, 'task evidence should include TestAgent execution')
  assert.match(taskJson, /independent.?review|独立复核/i, 'task evidence should include independent review')
  assert.match(taskJson, /post.?review.?spot.?check|完成前抽查|主 Agent.*抽查/i, 'task evidence should include the main-agent spot check')
  assert.ok(groupMessages.some(message => message.role === 'assistant' && /完成|交付|验收/.test(String(message.content || ''))), 'group should publish a user-readable delivery summary')

  const diff = spawnSync('git', ['diff', '--', 'src/feature.js'], { cwd: projectRoot, encoding: 'utf8', windowsHide: true }).stdout
  console.log(JSON.stringify({
    pass: true,
    isolated: true,
    taskId,
    traceId: task.trace_id || '',
    status: task.status,
    marker,
    externalAgent,
    cliProbe: {
      success: cliProbe.success,
      durationMs: cliProbe.duration_ms,
      writeCapability: cliProbe.capabilities?.write?.pass === true,
    },
    checks: {
      persistentTaskCreated: true,
      externalAgentChangedCode: true,
      projectTestPassed: true,
      projectBuildPassed: true,
      testAgentEvidencePersisted: true,
      mainAgentSpotCheckPersisted: true,
      userSummaryPublished: true,
    },
    diff: diff.slice(0, 2000),
  }, null, 2))
} finally {
  if (child.exitCode === null) {
    child.kill('SIGTERM')
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(5_000)])
    if (child.exitCode === null) child.kill('SIGKILL')
  }
  fs.rmSync(isolatedHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
