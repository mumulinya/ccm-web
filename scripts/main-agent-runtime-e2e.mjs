import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { globalAgentRunTaskCard } from '../frontend/src/utils/taskExperience.js'
import { sanitizeUserFacingAgentText } from '../frontend/src/utils/agentDisplay.js'

const root = path.resolve(import.meta.dirname, '..')
const isolatedHome = path.join(root, 'scratch', `main-agent-runtime-e2e-home-${process.pid}-${Date.now().toString(36)}`)
const ccmHome = path.join(isolatedHome, '.cc-connect')
const port = 33100 + (process.pid % 500)
const baseUrl = `http://127.0.0.1:${port}`
let authCookie = ''
let csrfToken = ''

assert.ok(isolatedHome.startsWith(path.join(root, 'scratch') + path.sep), 'isolated home must stay inside scratch')
fs.rmSync(isolatedHome, { recursive: true, force: true, maxRetries: 12, retryDelay: 100 })
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

const mockModel = http.createServer(async (request, response) => {
  let body = ''
  for await (const chunk of request) body += chunk
  let prompt = body
  try {
    const payload = JSON.parse(body)
    prompt = (payload.messages || []).map(item => String(item?.content || '')).join('\n')
  } catch {}
  let content
  if (prompt.includes('shouldDelegate') && prompt.includes('dispatchPolicy')) {
    content = JSON.stringify({
      workflowDecision: { reason: '普通问答', confidence: 0.99, actionRequired: false, requiresCodeChanges: false, needsEpicDecomposition: false, intentKind: 'question', memoryPolicy: 'use', authorizationDirective: 'preserve', riskLevel: 'low', requiresUserConfirmation: false },
      intent: 'question', summary: '用户询问主 Agent 身份', domains: ['general'], deliverables: [], constraints: [], documentFindings: [], missingInfo: [],
      dispatchPolicy: { action: 'direct_answer', reason: '普通问答由群聊主 Agent 直接回复', requiresConfirmation: false, risk: '', nextStep: '直接回答用户' },
      coordinationStrategy: 'direct_worker_execution', coordinationPlan: { phases: [], synthesisStrategy: '' },
      reasoning: { knownFacts: ['用户只提出普通问题'], assumptionsToVerify: [], verificationAssertions: [], dependencyRationale: [], replanTriggers: [] },
      toolRequests: [], shouldDelegate: false, executionOrder: 'sequential', targets: [], friendlyResponse: '你好，我是这个群聊的主 Agent。', questionForUser: '', directResponse: '你好，我是这个群聊的主 Agent。', confidence: 0.99,
    })
  } else if (prompt.includes('ccm-model-workflow-decision-v2') || prompt.includes('needsEpicDecomposition')) {
    content = JSON.stringify({ reason: '用户只提出普通问答', confidence: 0.99, needsEpicDecomposition: false, actionRequired: false, continuationKind: 'new_task', readAction: 'none', targetRefs: [], impactScope: [], planSteps: [], clarificationQuestions: [], selectedSkills: [], intentKind: 'question', requiresCodeChanges: false, requiresAgentQa: false, requiresIndependentReview: false, verificationModes: [], memoryPolicy: 'use', authorizationDirective: 'preserve', riskLevel: 'low', requiresUserConfirmation: false })
  } else {
    content = JSON.stringify({ state: 'answer', message: '你好，我是 CCM 全局 Agent。', workflowDecision: { reason: '普通问答', confidence: 0.99, actionRequired: false, requiresCodeChanges: false, needsEpicDecomposition: false, intentKind: 'question', memoryPolicy: 'use', authorizationDirective: 'preserve', riskLevel: 'low', requiresUserConfirmation: false }, intent: { category: 'question', goal: '了解 Agent 身份', action_required: false, target_refs: [], impact_scope: [], confidence: 0.99, authorization_basis: 'none', reason: '普通问答' }, plan: [], tool: null, completion: { summary: '已直接回答', evidence: [], risks: [], next_action: '' } })
  }
  response.writeHead(200, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 100, completion_tokens: 40, total_tokens: 140 } }))
})
await new Promise((resolve, reject) => {
  mockModel.once('error', reject)
  mockModel.listen(0, '127.0.0.1', resolve)
})
const mockModelUrl = `http://127.0.0.1:${mockModel.address().port}/v1`
fs.writeFileSync(path.join(ccmHome, 'group-orchestrator-config.json'), JSON.stringify({
  enabled: true,
  format: 'openai-compatible',
  apiUrl: mockModelUrl,
  apiKey: 'runtime-e2e-mock-key',
  model: 'runtime-e2e-mock-model',
  timeoutMs: 5_000,
}, null, 2))

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
const removeTreeWithRetry = async target => {
  let lastError = null
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await fs.promises.rm(target, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 })
      return
    } catch (error) {
      lastError = error
      await sleep(150 + attempt * 50)
    }
  }
  throw lastError || new Error(`unable to remove ${target}`)
}

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
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Cookie: authCookie, 'X-CCM-CSRF': csrfToken },
    body: JSON.stringify(body),
  })
  assert.equal(response.ok, true, `${url} should return 2xx`)
  return parseSse(await response.text())
}

async function loadTasks() {
  const response = await fetch(`${baseUrl}/api/tasks`, { headers: { Cookie: authCookie } })
  assert.equal(response.ok, true, 'task list should be available')
  return (await response.json()).tasks || []
}

try {
  await waitForServer()

  const page = await (await fetch(baseUrl)).text()
  assert.match(page, /<div id="app">/, 'production frontend should be served')

  await fetch(`${baseUrl}/api/auth/session`)
  const setupCodeFile = path.join(ccmHome, 'auth', 'setup-code.txt')
  assert.equal(fs.existsSync(setupCodeFile), true, 'fresh runtime should create a one-time setup code')
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'runtimeadmin', password: 'runtime-e2e-password', setup_code: fs.readFileSync(setupCodeFile, 'utf8').trim() }),
  })
  assert.equal(registerResponse.status, 201, 'first administrator registration should succeed')
  const registerPayload = await registerResponse.json()
  authCookie = String(registerResponse.headers.get('set-cookie') || '').split(';')[0]
  csrfToken = String(registerPayload.csrf || '')
  assert.ok(authCookie && csrfToken, 'authenticated E2E should receive cookie and CSRF token')

  assert.equal((await loadTasks()).length, 0, 'isolated runtime should start without tasks')

  const globalRequest = {
    message: '你是谁？请用一句通俗的话回答。',
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
  assert.doesNotMatch(String(globalResult.run.final_reply || ''), /处理总结|验证与验收|下一步/, 'ordinary global question should stay a natural reply without delivery sections')
  assert.equal(Boolean(globalResult.run.mission_id || globalResult.run.supervisor_id), false, 'ordinary global question should not create mission supervision')
  assert.equal(Boolean(globalResult.run.plan_mode || globalResult.run.display_stream?.plan_mode), false, 'ordinary global question should not publish a task plan')
  assert.equal(Boolean(globalResult.run.final_delivery_report || globalResult.run.display_stream?.delivery_report), false, 'ordinary global question should not publish a delivery report')
  const ordinaryGlobalCard = globalAgentRunTaskCard({
    role: 'assistant',
    content: globalResult.run.final_reply || '',
    agenticRun: globalResult.run,
  })
  assert.equal(ordinaryGlobalCard, null, 'production global UI mapper should render an ordinary answer as plain text without Todo card')
  assert.equal((await loadTasks()).length, 0, 'ordinary global question should not create a persistent task')

  const duplicateEvents = await postSse('/api/global-agent/run?stream=true', globalRequest)
  assertOrderedEvents(duplicateEvents, 'global duplicate replay')
  const duplicateResult = duplicateEvents.find(event => event.type === 'result')
  assert.equal(duplicateResult?.duplicate, true, 'same global request ID should replay instead of executing twice')
  assert.equal(duplicateResult?.run?.id, globalResult.run.id, 'duplicate replay should return the original run')

  const groupEvents = await postSse('/api/groups/send', {
    group_id: 'runtime-e2e-group',
    target_project: 'all',
    message: '你是谁？请用一句通俗的话回答。',
    message_mode: 'conversation',
    client_message_id: 'runtime-e2e-group-status-1',
  })
  assertOrderedEvents(groupEvents, 'group stream')
  assert.equal(groupEvents.at(-1)?.type, 'done', 'group stream should terminate with done')
  assert.ok(groupEvents.some(event => event.type === 'status'), 'group status request should stream a friendly progress state')
  assert.equal(groupEvents.some(event => event.type === 'task_created'), false, 'ordinary group question should not emit a task-created event')
  assert.doesNotMatch(JSON.stringify(groupEvents), /CCM_AGENT_RECEIPT|native_session|WorkerContextPacket/i, 'group visible stream should hide protocol details')
  const groupDone = groupEvents.find(event => event.type === 'agent_done') || {}
  const groupVisibleText = [groupDone.text, groupDone.display_stream?.user_visible_text, groupDone.displayStream?.userVisibleText].filter(Boolean).join('\n')
  assert.doesNotMatch(groupVisibleText, /处理总结|验证与验收|下一步/, 'ordinary group question should stay a natural reply without delivery sections')
  assert.equal((await loadTasks()).length, 0, 'ordinary group question should not create a persistent task')

  const multilineReply = sanitizeUserFacingAgentText('第一段\n- 第一项\n- 第二项\n\n\n最后一段', '', 500)
  assert.equal(multilineReply, '第一段\n- 第一项\n- 第二项\n\n最后一段', 'visible message sanitizer should preserve line and paragraph breaks')

  console.log(JSON.stringify({
    pass: true,
    baseUrl,
    isolated: true,
    checks: {
      productionFrontendServed: true,
      globalSseOrdered: true,
      duplicateGlobalRequestReplayed: true,
      groupSseOrdered: true,
      ordinaryGlobalHasNoTodoCard: true,
      ordinaryGlobalHasNoDeliverySummary: true,
      ordinaryGroupCreatesNoTask: true,
      ordinaryGroupHasNoDeliverySummary: true,
      visibleMessageLineBreaksPreserved: true,
      primaryTextHidesTechnicalProtocol: true,
    },
  }, null, 2))
} finally {
  if (child.exitCode === null) {
    if (process.platform === 'win32') {
      spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' })
    } else {
      child.kill('SIGTERM')
    }
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      sleep(5_000),
    ])
    if (child.exitCode === null) {
      child.kill('SIGKILL')
      await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(2_000)])
    }
  }
  await new Promise(resolve => mockModel.close(resolve))
  await removeTreeWithRetry(isolatedHome)
}
