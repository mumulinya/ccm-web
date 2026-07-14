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
const surface = String(process.env.CCM_REAL_CHAIN_SURFACE || 'group').trim().toLowerCase()
assert.ok(['group', 'global'].includes(surface), `unsupported real-chain surface: ${surface}`)
const isolatedHome = path.join(scratchRoot, surface === 'global' ? 'main-agent-global-real-chain-home' : 'main-agent-real-chain-home')
const ccmHome = path.join(isolatedHome, '.cc-connect')
const projectRoot = path.join(isolatedHome, 'runtime-project')
const originalHome = os.homedir()
const port = 33700 + (process.pid % 300)
const baseUrl = `http://127.0.0.1:${port}`
const marker = `${surface}-real-chain-${Date.now()}`
const externalAgent = String(process.env.CCM_REAL_CHAIN_AGENT || 'claudecode').trim().toLowerCase()
const preserveArtifacts = process.env.CCM_REAL_CHAIN_PRESERVE === '1'
const injectTestFailure = process.env.CCM_REAL_CHAIN_INJECT_TEST_FAILURE === '1'
const exerciseResilience = process.env.CCM_REAL_CHAIN_EXERCISE_RESILIENCE === '1'
const repairMarker = `test-agent-repair-${marker}`
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
import fs from 'node:fs'
import { deliveryMarker } from '../src/feature.js'
assert.equal(deliveryMarker, '${marker}')
if (process.env.CCM_TEST_AGENT_REVIEW === '1') {
  const source = fs.readFileSync(new URL('../src/feature.js', import.meta.url), 'utf8')
  assert.ok(
    source.includes("export const reviewRepairMarker = '${repairMarker}'"),
    "TestAgent injected failure: add the exact reviewRepairMarker export requested by the failing independent review"
  )
}
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
if (injectTestFailure) {
  fs.writeFileSync(path.join(ccmHome, 'project-configs.json'), JSON.stringify({
    'runtime-e2e-project': {
      test_agent: {
        env: { CCM_TEST_AGENT_REVIEW: '1' },
      },
    },
  }, null, 2))
}

const orchestratorConfig = path.join(originalHome, '.cc-connect', 'group-orchestrator-config.json')
assert.equal(fs.existsSync(orchestratorConfig), true, 'unified model config is required for the real-chain test')
const isolatedOrchestratorConfig = JSON.parse(fs.readFileSync(orchestratorConfig, 'utf8'))
isolatedOrchestratorConfig.timeoutMs = surface === 'global'
  ? Math.max(120_000, Number(isolatedOrchestratorConfig.timeoutMs || 120_000))
  : Math.min(15_000, Number(isolatedOrchestratorConfig.timeoutMs || 15_000))
fs.writeFileSync(path.join(ccmHome, 'group-orchestrator-config.json'), JSON.stringify(isolatedOrchestratorConfig, null, 2))

let serverOutput = ''

function launchServer() {
  const server = spawn(process.execPath, [path.join(root, 'ccm-package', 'dist', 'server.js'), String(port)], {
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
  server.stdout.on('data', chunk => { serverOutput += String(chunk) })
  server.stderr.on('data', chunk => { serverOutput += String(chunk) })
  return server
}

let child = launchServer()

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function stopServer() {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(5_000)])
  if (child.exitCode === null) child.kill('SIGKILL')
}

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

async function postSseUntilTaskCreated(url, body) {
  const payload = JSON.stringify(body)
  return new Promise((resolve, reject) => {
    let settled = false
    const events = []
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
      let pending = ''
      response.setEncoding('utf8')
      response.on('data', chunk => {
        if (settled) return
        pending += chunk
        const blocks = pending.split(/\r?\n\r?\n/)
        pending = blocks.pop() || ''
        for (const block of blocks) {
          const data = block.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
          if (!data) continue
          const event = JSON.parse(data)
          events.push(event)
          if (event.type === 'task_created') {
            settled = true
            resolve(events)
            response.destroy()
            request.destroy()
            return
          }
        }
      })
      response.on('end', () => {
        if (settled) return
        settled = true
        reject(new Error(`${url} ended before task_created; events=${JSON.stringify(events).slice(0, 4000)}`))
      })
      response.on('error', error => { if (!settled) reject(error) })
    })
    request.setTimeout(120_000, () => request.destroy(new Error(`timed out waiting for task_created from ${url}`)))
    request.on('error', error => { if (!settled) reject(error) })
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

async function waitForTaskToStart(taskId) {
  const deadline = Date.now() + 60_000
  let latest = null
  while (Date.now() < deadline) {
    latest = (await loadTasks()).find(task => task.id === taskId) || null
    if (latest && ['in_progress', 'reviewing', 'reworking'].includes(String(latest.status || ''))) return latest
    if (latest && ['done', 'failed', 'cancelled'].includes(String(latest.status || ''))) {
      throw new Error(`task ${taskId} reached ${latest.status} before the restart checkpoint`)
    }
    await sleep(200)
  }
  throw new Error(`task ${taskId} did not enter execution before restart; latest=${JSON.stringify(latest)?.slice(0, 3000)}`)
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

async function waitForProjectTask(project) {
  const deadline = Date.now() + 3 * 60_000
  let transientLoadFailures = 0
  while (Date.now() < deadline) {
    let task = null
    try {
      task = (await loadTasks()).find(item =>
        String(item?.mission_target?.requested_project || item?.mission_target?.project || item.target_project || item.project || '') === project
        || (!!item?.parent_task_id && item?.assign_type === 'group' && JSON.stringify({
          mission_target: item.mission_target,
          business_goal: item.business_goal,
          description: item.description,
        }).includes(project))
      )
      transientLoadFailures = 0
    } catch (error) {
      transientLoadFailures += 1
      if (child.exitCode !== null || transientLoadFailures >= 5) throw error
      await sleep(500)
      continue
    }
    if (task?.id) return waitForTask(task.id)
    await sleep(500)
  }
  throw new Error(`global main agent did not create a persistent task for ${project}\n${serverOutput.slice(-5000)}`)
}

async function loadGlobalRun(runId) {
  const response = await fetch(`${baseUrl}/api/global-agent/runs?id=${encodeURIComponent(runId)}&detail=full`)
  assert.equal(response.ok, true, `global run ${runId} should be available`)
  return (await response.json()).run
}

async function waitForGlobalRun(runId) {
  const deadline = Date.now() + 3 * 60_000
  let latest = null
  while (Date.now() < deadline) {
    latest = await loadGlobalRun(runId)
    const terminal = ['completed', 'failed', 'cancelled'].includes(String(latest?.status || ''))
    const supervisionTerminal = ['completed', 'failed', 'cancelled'].includes(String(latest?.supervision_state || ''))
    if (terminal && (supervisionTerminal || latest?.final_delivery_report || latest?.final_report)) return latest
    await sleep(1_000)
  }
  throw new Error(`global run ${runId} did not publish a terminal supervised result; latest=${JSON.stringify(latest)?.slice(0, 4000)}`)
}

function verifyDeliveredTask(task, label) {
  const taskJson = JSON.stringify(task)
  const changedSource = fs.readFileSync(path.join(projectRoot, 'src', 'feature.js'), 'utf8')
  const testResult = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'test.mjs')], { cwd: projectRoot, encoding: 'utf8', windowsHide: true })
  const buildResult = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'build.mjs')], { cwd: projectRoot, encoding: 'utf8', windowsHide: true })

  assert.equal(task.status, 'done', `${label} task should complete: ${task.status_detail || task.result || task.error || ''}`)
  assert.equal(task.requires_independent_review, true, `${label} task should persist the independent-review requirement`)
  assert.match(changedSource, new RegExp(marker), 'external code agent should modify the project')
  assert.equal(testResult.status, 0, `fixture test should pass: ${testResult.stderr}`)
  assert.equal(buildResult.status, 0, `fixture build should pass: ${buildResult.stderr}`)
  assert.match(taskJson, /test.?agent/i, 'task evidence should include TestAgent execution')
  assert.match(taskJson, /independent.?review|独立复核/i, 'task evidence should include independent review')
  assert.match(taskJson, /post.?review.?spot.?check|完成前抽查|主 Agent.*抽查/i, 'task evidence should include the main-agent spot check')
  const timeline = Array.isArray(task?.delivery_summary?.timeline) ? task.delivery_summary.timeline : []
  assert.ok(timeline.some(item => item?.type === 'coordinator_plan'), `${label} should persist the group main-agent plan`)
  assert.ok(timeline.some(item => item?.type === 'dispatch'), `${label} should persist project child-agent dispatch`)
  assert.ok(timeline.some(item => item?.type === 'coordinator_review'), `${label} should persist group main-agent acceptance`)
  assert.ok(timeline.some(item => item?.type === 'test_agent_native_execution_start'), `${label} should persist group-owned TestAgent execution`)
  if (injectTestFailure) {
    const reviewStarts = timeline.filter(item => item?.type === 'test_agent_native_execution_start')
    const failedReviewRounds = timeline.filter(item => item?.type === 'test_agent_native_execution_done' && item?.status === 'warn')
    assert.ok(reviewStarts.length >= 2, `failure injection should run TestAgent at least twice; actual=${reviewStarts.length}`)
    assert.ok(failedReviewRounds.length >= 1, 'failure injection should preserve at least one failed TestAgent review round')
    assert.ok(timeline.some(item => item?.type === 'native_session_resume'), 'group main-agent rework should resume the original project-agent session')
    assert.match(taskJson, /needs_rework|test_agent_failed_review_rework|TestAgent.*(?:返工|未通过)/i, 'task evidence should preserve the failed-review rework route')
    assert.match(changedSource, new RegExp(repairMarker), 'the original implementation agent should repair the injected TestAgent failure')
    const sessionStorePath = path.join(ccmHome, 'task-agent-sessions.json')
    const sessionStore = JSON.parse(fs.readFileSync(sessionStorePath, 'utf8'))
    const taskSessions = (sessionStore.sessions || []).filter(item => item.taskId === task.id && item.project === 'runtime-e2e-project')
    assert.equal(taskSessions.length, 1, `rework should keep one task-agent session; actual=${taskSessions.length}`)
    assert.ok(taskSessions[0].turnCount >= 2, `rework should add a second turn to the same session; actual=${taskSessions[0].turnCount}`)
    assert.ok(taskSessions[0].nativeSessionId, 'rework session should retain a native third-party Agent session ID')
  }

  return spawnSync('git', ['diff', '--', 'src/feature.js'], { cwd: projectRoot, encoding: 'utf8', windowsHide: true }).stdout
}

try {
  await waitForServer()
  const cliProbe = await probeRuntimeAgent()
  let task = null
  let taskId = ''
  let traceId = ''
  let runId = ''
  let userSummaryPublished = false
  let groupMessagePayloadBytes = null
  let duplicateRequestReplayed = null
  let sseDisconnectRecovered = null
  let restartPreservedTask = null

  if (surface === 'group') {
    const groupRequest = {
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
    }
    const taskEvents = exerciseResilience
      ? await postSseUntilTaskCreated('/api/groups/send', groupRequest)
      : await postSse('/api/groups/send', groupRequest)
    const createdEvent = taskEvents.find(event => event.type === 'task_created')
    taskId = createdEvent?.task?.id || createdEvent?.taskId || taskEvents.find(event => event.taskId)?.taskId
    assert.ok(taskId, `group main agent should create a persistent task: ${JSON.stringify(taskEvents).slice(0, 4000)}`)
    if (exerciseResilience) {
      const beforeRestart = await waitForTaskToStart(taskId)
      const traceBeforeRestart = beforeRestart.trace_id || ''
      await sleep(1_500)
      await stopServer()
      child = launchServer()
      await waitForServer()
      const replayEvents = await postSse('/api/groups/send', groupRequest)
      const tasksAfterRestart = await loadTasks()
      const groupTasksAfterRestart = tasksAfterRestart.filter(item => item.group_id === 'runtime-real-chain-group')
      const matchingTasks = tasksAfterRestart.filter(item => item.id === taskId || item.client_message_id === groupRequest.client_message_id)
      assert.equal(groupTasksAfterRestart.length, 1, `retry must not create a second group task; actual=${groupTasksAfterRestart.length}`)
      assert.equal(matchingTasks.length, 1, `restart and retry should keep one persistent task; actual=${matchingTasks.length}`)
      assert.equal(matchingTasks[0].id, taskId, 'restart and retry should preserve the original task ID')
      assert.equal(matchingTasks[0].trace_id || '', traceBeforeRestart, 'restart should preserve the original task trace')
      assert.ok(replayEvents.some(event => event.type === 'done' || event.type === 'task_created' || event.duplicate === true), 'retry after SSE disconnect should return a replay or current task response')
      sseDisconnectRecovered = true
      restartPreservedTask = true
      duplicateRequestReplayed = true
    }
    task = await waitForTask(taskId)
    if (task.status === 'needs_user' && task.intake_state === 'awaiting_confirmation') {
      const response = await fetch(`${baseUrl}/api/tasks/confirm-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, approved: true, auto_execute: true }),
      })
      assert.equal(response.ok, true, 'execution plan confirmation should succeed')
      task = await waitForTask(taskId)
    }
    traceId = task.trace_id || ''
    const groupMessagesResponse = await fetch(`${baseUrl}/api/groups/messages?id=runtime-real-chain-group&limit=40`)
    const groupMessagesText = groupMessagesResponse.ok ? await groupMessagesResponse.text() : '{}'
    groupMessagePayloadBytes = Buffer.byteLength(groupMessagesText)
    assert.ok(groupMessagePayloadBytes < 25 * 1024 * 1024, `group message payload should stay bounded; bytes=${groupMessagePayloadBytes}`)
    const groupMessages = JSON.parse(groupMessagesText).messages || []
    userSummaryPublished = groupMessages.some(message => message.role === 'assistant' && /完成|交付|验收/.test(String(message.content || '')))
    assert.ok(userSummaryPublished, 'group should publish a user-readable delivery summary')
  } else {
    const request = {
      message: [
        '我明确授权你立即执行这项开发任务，并创建持久任务持续跟进到完成。',
        '请在 runtime-e2e-project 完成一次真实代码修改。',
        `把 src/feature.js 的 deliveryMarker 修改为 ${marker}。`,
        '必须实际运行 npm test 和 npm run build。',
        '全局 Agent 只负责把任务交给 runtime-real-chain-group 的群聊主 Agent 并接收进度。',
        '群聊主 Agent 必须创建计划、派发 runtime-e2e-project 子 Agent、验收返回结果，再调用 TestAgent 独立复核和安排返工复验，最后总结给全局 Agent。',
      ].join('\n'),
      session_id: 'runtime-global-real-chain-session',
      request_id: `runtime-global-real-chain-${marker}`,
      stream: true,
    }
    const globalEvents = await postSse('/api/global-agent/run?stream=true', request)
    const initialResult = globalEvents.find(event => event.type === 'result')
    assert.ok(initialResult?.run?.id, `global main agent should return a persistent run: ${JSON.stringify(globalEvents).slice(0, 5000)}`)
    runId = initialResult.run.id
    traceId = initialResult.run.trace_id || ''
    assert.ok(
      initialResult.run.mission_id || initialResult.run.supervisor_id,
      `global main agent should attach persistent mission supervision: ${JSON.stringify(initialResult.run).slice(0, 6000)}`,
    )
    assert.ok(initialResult.run.todo_plan || initialResult.run.todoPlan || initialResult.run.workchain?.todo_plan, 'global real task should expose a user-visible Todo plan')
    assert.doesNotMatch(String(initialResult.run.final_reply || ''), /CCM_AGENT_RECEIPT|native_session|WorkerContextPacket/i, 'global primary reply should hide internal protocols')

    const duplicateEvents = await postSse('/api/global-agent/run?stream=true', request)
    const duplicateResult = duplicateEvents.find(event => event.type === 'result')
    duplicateRequestReplayed = duplicateResult?.duplicate === true && duplicateResult?.run?.id === runId
    assert.equal(duplicateRequestReplayed, true, 'duplicate global request should replay the original run')

    task = await waitForProjectTask('runtime-e2e-project')
    taskId = task.id
    assert.equal(task.assign_type, 'group', 'global single-project task must be owned by a collaboration group')
    assert.equal(task.group_id, 'runtime-real-chain-group', 'global agent must route the project through its real collaboration group')
    assert.equal(task.target_project, 'coordinator', 'global agent must dispatch to the group main agent, not the project child agent')
    assert.equal(task?.mission_target?.ownership_chain?.global_agent, 'dispatch_and_relay_only', 'global agent ownership must remain dispatch-and-relay only')
    assert.equal(task?.mission_target?.ownership_chain?.group_main_agent, 'plan_dispatch_accept_review_and_summarize', 'group main agent must own planning, acceptance, review, and summary')
    const finalRun = await waitForGlobalRun(runId)
    assert.equal(finalRun.status, 'completed', `global supervised run should complete: ${finalRun.error || finalRun.final_reply || ''}`)
    assert.equal(['completed', 'done'].includes(String(finalRun.supervision_state || '')), true, 'global supervisor should reach completion')
    userSummaryPublished = /完成|交付|验收/.test(String(finalRun.final_reply || finalRun.final_delivery_report?.markdown || finalRun.final_report?.markdown || ''))
    assert.ok(userSummaryPublished, 'global main agent should publish a user-readable final summary')
  }

  const diff = verifyDeliveredTask(task, `${surface} main agent`)
  console.log(JSON.stringify({
    pass: true,
    isolated: true,
    surface,
    taskId,
    runId,
    traceId,
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
      userSummaryPublished,
      groupMessagePayloadBounded: surface === 'group' ? true : null,
      groupMessagePayloadBytes,
      duplicateRequestReplayed,
      injectedTestAgentFailureRepaired: injectTestFailure ? true : null,
      sameNativeSessionReused: injectTestFailure ? true : null,
      duplicateReworkFollowupsSuppressed: injectTestFailure ? true : null,
      sseDisconnectRecovered,
      restartPreservedTask,
    },
    diff: diff.slice(0, 2000),
  }, null, 2))
} finally {
  await stopServer()
  if (!preserveArtifacts) {
    fs.rmSync(isolatedHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}
