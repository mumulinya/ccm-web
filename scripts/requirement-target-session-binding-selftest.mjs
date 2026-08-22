import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-target-session-'))

const childSource = String.raw`
const assert = require('node:assert/strict')
const {
  createGroupChatSession,
  loadGroups,
  saveGroups,
} = require('./ccm-package/dist/modules/collaboration/storage.js')
const {
  configureDailyDevBacklogRuntime,
  dispatchDailyDevBacklog,
  listDailyDevBacklogs,
  persistDailyDevBacklogFile,
} = require('./ccm-package/dist/modules/collaboration/daily-dev-backlog.js')
const {
  listAutomationSessionBindings,
  replaceAutomationSessionSources,
} = require('./ccm-package/dist/system/automation-session-bindings.js')

const group = {
  id: 'group-session-binding',
  name: '会话绑定回归群聊',
  members: [{ role: 'coordinator', project: 'project-a' }],
  shared_files: [],
}
saveGroups([group])

const sessionA = createGroupChatSession(group.id, '普通会话 A')
const createdA = persistDailyDevBacklogFile(loadGroups(), group, {
  priority: 'normal',
  scope: '项目 A',
  acceptance: '需求条目只绑定群聊，不在创建时绑定精确会话',
  quality_decision: { state: 'ready', confidence: 1 },
  idempotency_key: 'session-binding-a',
  target_session_id: sessionA.id,
}, '来源绑定需求 A', '验证需求条目不接受用户选择的会话')
assert.equal(createdA.target_session_id, '')

const sessionB = createGroupChatSession(group.id, '普通会话 B')
assert.notEqual(sessionA.id, sessionB.id)
assert.equal(listDailyDevBacklogs(group.id).find(item => item.entry_id === createdA.entry_id).target_session_id, '')

const createdTasks = []
configureDailyDevBacklogRuntime({
  validateDailyDevGroupReady: () => ({ coordinator: { project: 'project-a' } }),
  getReadyDailyDevMembers: () => [],
  getTaskExecutionPhase: () => 'pending',
  taskNeedsUserIntervention: () => false,
  isTaskQueuedInMemory: () => false,
  createTask: task => {
    const created = { ...task, id: 'task-' + (createdTasks.length + 1) }
    createdTasks.push(created)
    return created
  },
  enqueueTask: () => ({ queued: false }),
  getQueueStatus: () => ({ running: false }),
  getAgentExecutionReadiness: () => ({ ready: true }),
  continueDailyDevTasksFromGaps: () => ({ continued: 0 }),
  buildDailyDevAgentDiagnostics: () => ({}),
  hasDailyDevContinuationGaps: () => false,
})

const dispatchedA = dispatchDailyDevBacklog(group.id, createdA.name, {}, { auto_execute: false })
assert.equal(dispatchedA.success, true)
assert.notEqual(dispatchedA.task.group_session_id, sessionA.id)
assert.notEqual(dispatchedA.task.group_session_id, sessionB.id)
assert.equal(dispatchedA.task.exact_session_id, dispatchedA.task.group_session_id)
const firstBoundSessionId = dispatchedA.task.group_session_id
const firstBinding = listAutomationSessionBindings('group', group.id).find(item => item.status === 'active' && item.sources.includes('requirement_pool'))
assert.equal(firstBinding.exactSessionId, firstBoundSessionId)
assert.equal(firstBinding.session.sessionKind, 'automation')

const latestGroup = loadGroups().find(item => item.id === group.id)
const createdB = persistDailyDevBacklogFile(loadGroups(), latestGroup, {
  priority: 'normal',
  scope: '项目 A',
  acceptance: '后续需求复用需求池来源绑定',
  quality_decision: { state: 'ready', confidence: 1 },
  idempotency_key: 'session-binding-b',
  target_session_id: sessionA.id,
}, '复用来源绑定需求 B', '验证客户端显式会话被忽略')
assert.equal(createdB.target_session_id, '')

const dispatchedB = dispatchDailyDevBacklog(group.id, createdB.name, {}, {
  auto_execute: false,
  group_session_id: sessionB.id,
  exact_session_id: sessionB.id,
  source: 'selftest-client-session-ignored',
})
assert.equal(dispatchedB.success, true)
assert.equal(dispatchedB.task.group_session_id, firstBoundSessionId)
assert.equal(dispatchedB.task.exact_session_id, firstBoundSessionId)

const replacement = createGroupChatSession(group.id, '手工绑定的需求池自动化会话', { sessionKind: 'automation' })
replaceAutomationSessionSources({
  scope: 'group',
  scopeId: group.id,
  exactSessionId: replacement.id,
  sources: ['requirement_pool'],
  actor: 'selftest',
  reason: 'verify_new_tasks_follow_new_binding',
})
const createdC = persistDailyDevBacklogFile(loadGroups(), loadGroups().find(item => item.id === group.id), {
  priority: 'normal',
  scope: '项目 A',
  acceptance: '绑定调整只影响新任务',
  quality_decision: { state: 'ready', confidence: 1 },
  idempotency_key: 'session-binding-c',
}, '新绑定需求 C', '验证不可变任务会话快照')
const dispatchedC = dispatchDailyDevBacklog(group.id, createdC.name, {}, { auto_execute: false })
assert.equal(dispatchedC.task.group_session_id, replacement.id)
assert.equal(dispatchedA.task.group_session_id, firstBoundSessionId)

console.log(JSON.stringify({
  pass: true,
  paidProviderCalls: 0,
  checks: {
    backlogCreationDoesNotBindSession: true,
    firstTaskAutoCreatesSourceBinding: true,
    clientSessionOverrideIgnored: true,
    laterTasksReuseSourceBinding: true,
    rebindingAffectsOnlyNewTasks: true,
    immutableTaskSessionSnapshot: true,
  },
}))
`

try {
  const result = spawnSync(process.execPath, ['-e', childSource], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      CCM_TASK_STORE_DIR: storeDir,
      HOME: storeDir,
      USERPROFILE: storeDir,
    },
    timeout: 60_000,
    windowsHide: true,
  })
  assert.equal(result.status, 0, result.stderr || result.stdout || '目标会话绑定回归失败')
  const receiptLine = String(result.stdout || '').trim().split(/\r?\n/).reverse().find(line => line.trim().startsWith('{'))
  assert.ok(receiptLine, result.stdout || '目标会话绑定回归未返回 JSON 回执')
  const receipt = JSON.parse(receiptLine)
  assert.equal(receipt.pass, true)
  const groupSidebar = fs.readFileSync(path.join(root, 'frontend/src/components/collaboration/GroupChatSessionSidebar.vue'), 'utf8')
  const projectSidebar = fs.readFileSync(path.join(root, 'frontend/src/components/projects/ProjectSessionSidebar.vue'), 'utf8')
  const workbench = fs.readFileSync(path.join(root, 'frontend/src/components/common/UsabilityWorkbench.vue'), 'utf8')
  assert.match(groupSidebar, /普通会话/)
  assert.match(groupSidebar, /自动化任务会话/)
  assert.match(projectSidebar, /普通会话/)
  assert.match(projectSidebar, /自动化任务会话/)
  assert.match(projectSidebar, /飞书会话/)
  assert.doesNotMatch(workbench, /exact_session_id:/)
  assert.match(workbench, /按工作台来源自动绑定/)
  receipt.checks.groupAndProjectSessionSections = true
  receipt.checks.workbenchUsesSourceBinding = true
  console.log(JSON.stringify(receipt, null, 2))
} finally {
  fs.rmSync(storeDir, { recursive: true, force: true })
}
