import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const removeTree = target => fs.rmSync(target, { recursive: true, force: true, maxRetries: 20, retryDelay: 120 })

if (!process.argv.includes('--child')) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-auto-dev-production-'))
  try {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--child'], {
      cwd: root,
      env: { ...process.env, HOME: home, USERPROFILE: home },
      encoding: 'utf8',
      windowsHide: true,
      timeout: 180_000,
    })
    if (result.status !== 0) {
      process.stderr.write(result.stdout || '')
      process.stderr.write(result.stderr || '')
      process.exit(result.status || 1)
    }
    process.stdout.write(result.stdout)
  } finally {
    removeTree(home)
  }
  process.exit(0)
}

const require = createRequire(import.meta.url)
const dist = (...parts) => path.join(root, 'ccm-package', 'dist', ...parts)
const ccmHome = path.join(os.homedir(), '.cc-connect')
const projectRoot = path.join(os.homedir(), 'source-project')
const deepRelative = 'src/a/b/c/d/e/f/deep-feature.ts'
fs.mkdirSync(path.join(projectRoot, path.dirname(deepRelative)), { recursive: true })
fs.writeFileSync(path.join(projectRoot, deepRelative), 'export function productionQueueIdentity() { return "ready" }\n')
fs.mkdirSync(path.join(ccmHome, 'configs'), { recursive: true })

let sourcePlannerCalls = 0
const mockModel = http.createServer(async (request, response) => {
  let body = ''
  for await (const chunk of request) body += chunk
  const payload = JSON.parse(body || '{}')
  const prompt = (payload.messages || []).map(item => String(item.content || '')).join('\n')
  let content = { sufficient: true, reason: '证据充分', selected_files: [], search_queries: [], plan_steps: ['核对队列身份'], impact_scope: ['任务链'], clarification_questions: [] }
  if (prompt.includes('只读源码规划器')) {
    sourcePlannerCalls += 1
    content = sourcePlannerCalls === 1
      ? { sufficient: false, reason: '需要读取深层实现', selected_files: [{ project: 'source-project', path: deepRelative, reason: '核对深层源码实现' }], search_queries: [], plan_steps: [], impact_scope: [], clarification_questions: [] }
      : { sufficient: true, reason: '已读取深层源码并足以形成计划', selected_files: [], search_queries: [], plan_steps: ['修改前核对深层实现', '完成后运行验证'], impact_scope: ['src/a/b/c/d/e/f'], clarification_questions: [] }
  }
  response.writeHead(200, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 80, completion_tokens: 30, total_tokens: 110 } }))
})
await new Promise((resolve, reject) => {
  mockModel.once('error', reject)
  mockModel.listen(0, '127.0.0.1', resolve)
})
const modelPort = mockModel.address().port
fs.writeFileSync(path.join(ccmHome, 'group-orchestrator-config.json'), JSON.stringify({
  enabled: true,
  format: 'openai-compatible',
  apiUrl: `http://127.0.0.1:${modelPort}/v1`,
  apiKey: 'selftest-key',
  model: 'selftest-model',
  timeoutMs: 10_000,
  modelContextWindow: 64_000,
}, null, 2))
const escapedWorkDir = projectRoot.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
fs.writeFileSync(path.join(ccmHome, 'configs', 'config-source-project.toml'), `language = "zh"\n[[projects]]\nname = "source-project"\n[projects.agent]\ntype = "codex"\n[projects.agent.options]\nwork_dir = "${escapedWorkDir}"\n`)

const storage = require(dist('modules', 'collaboration', 'storage.js'))
const collaboration = require(dist('modules', 'collaboration', 'collaboration.js'))
const coordinator = require(dist('modules', 'collaboration', 'collaboration-runtime-coordinator-review.js'))
const projectAnalysis = require(dist('modules', 'collaboration', 'project-analysis.js'))
const globalMission = require(dist('modules', 'collaboration', 'global-mission.js'))
const acceptance = require(dist('modules', 'collaboration', 'collaboration-acceptance.js'))
const unifiedScheduler = require(dist('system', 'unified-task-scheduler.js'))
const db = require(dist('core', 'db.js'))
const { closeSqliteTaskStore } = require(dist('core', 'task-store.js'))

try {
  const groupA = { id: 'identity-group-a', name: 'A', members: [] }
  const groupB = { id: 'identity-group-b', name: 'B', members: [] }
  storage.saveGroups([groupA, groupB])
  const sessionA1 = storage.createGroupChatSession(groupA.id, 'A1')
  const sessionA2 = storage.createGroupChatSession(groupA.id, 'A2')
  const sessionB1 = storage.createGroupChatSession(groupB.id, 'B1')
  const intake = overrides => collaboration.createTask({
    title: '同一需求',
    business_goal: '实现相同业务目标',
    requirement_content_hash: 'content-checksum',
    target_project: 'source-project',
    assign_type: 'group',
    workflow_type: 'requirement_epic',
    orchestration_scope: 'group_session',
    queue_scope: 'conversation_serial',
    request_origin: 'task-dispatch',
    source_channel: 'task-dispatch',
    client_message_id: 'client-message-1',
    ...overrides,
  })
  const first = intake({ group_id: groupA.id, group_session_id: sessionA1.id })
  const duplicate = intake({ group_id: groupA.id, group_session_id: sessionA1.id })
  const otherSession = intake({ group_id: groupA.id, group_session_id: sessionA2.id })
  const otherGroup = intake({ group_id: groupB.id, group_session_id: sessionB1.id })
  const repeatedLater = intake({ group_id: groupA.id, group_session_id: sessionA1.id, client_message_id: 'client-message-2' })

  assert.equal(duplicate.id, first.id)
  assert.notEqual(otherSession.id, first.id)
  assert.notEqual(otherGroup.id, first.id)
  assert.notEqual(repeatedLater.id, first.id)
  assert.match(first.idempotency_key, /^task-intake-v2:/)
  assert.equal(first.intake_identity.exact_session_id, sessionA1.id.toLowerCase())
  const legacyWithoutClientOne = collaboration.createTask({ title: '旧客户端同文任务', business_goal: '相同文字也必须视为新提交', target_project: 'source-project', project_session_id: 'ps_legacy', queue_scope: 'conversation_serial' })
  const legacyWithoutClientTwo = collaboration.createTask({ title: '旧客户端同文任务', business_goal: '相同文字也必须视为新提交', target_project: 'source-project', project_session_id: 'ps_legacy', queue_scope: 'conversation_serial' })
  assert.notEqual(legacyWithoutClientOne.id, legacyWithoutClientTwo.id)
  assert.match(legacyWithoutClientOne.client_message_id, /^server_/)

  const terminalTask = collaboration.createTask({ title: '终态任务', target_project: 'source-project', project_session_id: 'ps_terminal', queue_scope: 'conversation_serial', allow_duplicate: true })
  const settled = collaboration.updateTask(terminalTask.id, { status: 'done', status_detail: '验收通过', delivery_summary: { acceptance_gate_passed: true } })
  assert.equal(settled.acceptance_state, 'accepted')
  assert.equal(settled.terminal_state_receipt.status, 'done')
  assert.ok(settled.terminal_state_receipt.checksum)
  assert.equal(settled.workflow_timeline.some(event => event.type === 'terminal_state_normalized'), true)

  const guardedTask = collaboration.createTask({ title: '终态门禁', target_project: 'source-project', project_session_id: 'ps_guarded', workflow_type: 'project_main_agent', queue_scope: 'conversation_serial' })
  assert.throws(() => collaboration.updateTask(guardedTask.id, { status: 'done', status_detail: '直接完成' }), /缺少结构化最终验收证据/)
  const acceptedGuardedTask = collaboration.updateTask(guardedTask.id, {
    status: 'done',
    status_detail: '结构化验收通过',
    delivery_summary: { accepted: true, acceptance_gate_passed: true },
  })
  assert.equal(acceptedGuardedTask.acceptance_state, 'accepted')
  assert.equal(acceptedGuardedTask.terminal_decision.gate_passed, true)

  const unverifiedLegacyOutput = acceptance.getTaskExecutionFromReceipt('任务已完成，并修复了响应超时问题', null)
  assert.equal(unverifiedLegacyOutput.status, 'waiting')

  const queueOne = collaboration.createTask({ title: '串行一', business_goal: 'QUEUE_ONE', target_project: 'source-project', project_session_id: 'ps_queue', queue_scope: 'conversation_serial', allow_duplicate: true })
  const queueTwo = collaboration.createTask({ title: '串行二', business_goal: 'QUEUE_TWO', target_project: 'source-project', project_session_id: 'ps_queue', queue_scope: 'conversation_serial', allow_duplicate: true })
  const targetKey = collaboration.getTaskTargetKey(queueOne)
  collaboration.taskQueues.set(targetKey, [queueOne.id, queueTwo.id])
  const executionOrder = []
  let active = 0
  let maxActive = 0
  await coordinator.processTargetQueue(targetKey, {}, {
    executeTask: async task => {
      active += 1
      maxActive = Math.max(maxActive, active)
      executionOrder.push(task.id)
      await new Promise(resolve => setTimeout(resolve, 15))
      active -= 1
      return { status: 'blocked', detail: '等待用户补充', result: '等待用户补充' }
    },
  })
  const queueStates = db.loadTasks().filter(task => [queueOne.id, queueTwo.id].includes(task.id))
  assert.deepEqual(executionOrder, [queueOne.id, queueTwo.id])
  assert.equal(maxActive, 1)
  assert.equal(queueStates.every(task => task.status === 'blocked' && task.acceptance_state === 'blocked'), true)
  assert.equal(collaboration.runningTasks.has(targetKey), false)

  let workspaceActive = 0
  let workspaceMaxActive = 0
  const workspaceOrder = []
  const scheduled = ['lane-a', 'lane-b'].map((queueKey, index) => unifiedScheduler.scheduleUnifiedTaskOperation({
    taskId: `scheduled-${index + 1}`,
    queueKey,
    workspaceLane: 'workspace:shared-source',
    operation: async () => {
      workspaceActive += 1
      workspaceMaxActive = Math.max(workspaceMaxActive, workspaceActive)
      workspaceOrder.push(index + 1)
      await new Promise(resolve => setTimeout(resolve, 20))
      workspaceActive -= 1
      return index + 1
    },
  }))
  await Promise.all(scheduled)
  assert.equal(workspaceMaxActive, 1)
  assert.deepEqual(workspaceOrder, [1, 2])

  const leaseFailureTask = collaboration.createTask({ title: '租约失败', business_goal: 'LEASE_FAILURE', target_project: 'source-project', project_session_id: 'ps_lease', queue_scope: 'conversation_serial', allow_duplicate: true })
  const leaseKey = collaboration.getTaskTargetKey(leaseFailureTask)
  collaboration.taskQueues.set(leaseKey, [leaseFailureTask.id])
  await assert.rejects(() => coordinator.processTargetQueue(leaseKey, {}, { acquireTaskLease: () => { throw new Error('injected lease failure') } }), /injected lease failure/)
  assert.equal(collaboration.runningTasks.has(leaseKey), false)
  assert.equal(collaboration.taskQueues.get(leaseKey)[0], leaseFailureTask.id)
  assert.equal(db.loadTasks().find(task => task.id === leaseFailureTask.id).status, 'pending')

  const strongChild = id => ({
    id,
    parent_task_id: '',
    status: 'done',
    requires_code_changes: true,
    requires_verification: true,
    planning_source_evidence: { ready: true },
    delivery_summary: {
      acceptance_gate_passed: true,
      acceptance_gate: { pass: true, checks: [{ id: 'actual_changes', ok: true }, { id: 'verification_source', ok: true }] },
      actual_file_change_count: 1,
      actual_file_changes: [{ path: 'src/feature.ts' }],
      verification_executed: ['npm test passed by external runner (exit 0)'],
      verification_source_gate_passed: true,
      external_runner_verification_count: 1,
      acceptance: ['主 Agent 已完成最终验收并通过'],
      blockers: [],
      needs: [],
    },
  })
  const deps = { listExecutions: () => [], taskRequiresCodeChanges: task => task.requires_code_changes === true, taskRequiresVerification: task => task.requires_verification === true, listPermissionRequests: () => [] }
  const lowParent = { id: 'epic-low', workflow_type: 'requirement_epic', status: 'in_progress', workflow_decision: { riskLevel: 'low', verificationModes: ['commands'] } }
  const lowChild = { ...strongChild('child-low'), parent_task_id: lowParent.id }
  const lowAccepted = globalMission.refreshGlobalMissionParentInTaskList([lowParent, lowChild], lowParent.id, deps)
  assert.equal(lowAccepted.status, 'done')
  assert.equal(lowAccepted.acceptance_state, 'accepted')
  assert.equal(lowAccepted.acceptance_decision.status, 'approved')
  assert.equal(lowAccepted.epic_review.approval_mode, 'automatic_low_risk')
  const highParent = { id: 'epic-high', workflow_type: 'requirement_epic', status: 'in_progress', workflow_decision: { riskLevel: 'high', verificationModes: ['release'] } }
  const highChild = { ...strongChild('child-high'), parent_task_id: highParent.id }
  const highHeld = globalMission.refreshGlobalMissionParentInTaskList([highParent, highChild], highParent.id, deps)
  assert.equal(highHeld.status, 'awaiting_change_review')
  assert.equal(highHeld.acceptance_decision.status, 'user_approval_required')
  const permissionParent = { id: 'epic-permission', workflow_type: 'requirement_epic', status: 'in_progress', workflow_decision: { riskLevel: 'low', verificationModes: ['commands'] } }
  const permissionChild = { ...strongChild('child-permission'), parent_task_id: permissionParent.id }
  const permissionHeld = globalMission.refreshGlobalMissionParentInTaskList([permissionParent, permissionChild], permissionParent.id, {
    ...deps,
    listPermissionRequests: () => [{ taskId: permissionChild.id, state: 'awaiting_user' }],
  })
  assert.equal(permissionHeld.status, 'awaiting_change_review')
  assert.equal(permissionHeld.acceptance_decision.pending_permission_count, 1)

  const sourceGroup = { id: 'source-group', name: 'Source', members: [{ project: 'coordinator', role: 'coordinator', agent: 'coded-orchestrator' }, { project: 'source-project', agent: 'codex' }] }
  const sourceContext = await projectAnalysis.buildModelDrivenGroupPlanningSourceContext(sourceGroup, '修改深层队列身份实现', db.getConfigs(), { targetProjects: ['source-project'], maxRounds: 3 })
  assert.equal(sourceContext.ready, true)
  assert.equal(sourceContext.modelPlanning.rounds, 2)
  assert.equal(sourceContext.projects[0].selectedPaths.includes(deepRelative), true)
  assert.equal(sourceContext.modelPlanning.projectedTokens > 0, true)
  assert.equal(sourcePlannerCalls, 2)

  console.log(JSON.stringify({
    pass: true,
    schema: 'ccm-automatic-development-production-chain-selftest-v1',
    checks: {
      scopedIdempotency: true,
      repeatSubmissionCreatesNewTask: true,
      legacyClientDoesNotUseTextDedupe: true,
      terminalStateNormalized: true,
      terminalGateRejectsDirectCompletion: true,
      freeTextCannotSetTerminalState: true,
      strictConversationSerialQueue: true,
      sharedWorkspaceMutationLaneIsSerial: true,
      queueLeaseFailureReleasesLock: true,
      lowRiskAutoAcceptance: true,
      highRiskRequiresUserApproval: true,
      modelDrivenDeepSourcePlanning: true,
      paidProviderCalls: 0,
    },
  }, null, 2))
} finally {
  closeSqliteTaskStore()
  await new Promise(resolve => mockModel.close(resolve))
}
