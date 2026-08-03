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

const group = {
  id: 'group-session-binding',
  name: '会话绑定回归群聊',
  members: [{ role: 'coordinator', project: 'project-a' }],
  shared_files: [],
}
saveGroups([group])

const sessionA = createGroupChatSession(group.id, '需求创建会话 A')
const createdA = persistDailyDevBacklogFile(loadGroups(), group, {
  priority: 'normal',
  scope: '项目 A',
  acceptance: '任务进入创建时的精确会话',
  quality_decision: { state: 'ready', confidence: 1 },
  idempotency_key: 'session-binding-a',
  target_session_id: sessionA.id,
}, '固定会话需求 A', '验证创建时保存目标会话')
assert.equal(createdA.target_session_id, sessionA.id)

const sessionB = createGroupChatSession(group.id, '后来切换的活动会话 B')
assert.notEqual(sessionA.id, sessionB.id)
assert.equal(listDailyDevBacklogs(group.id).find(item => item.entry_id === createdA.entry_id).target_session_id, sessionA.id)

const createdDedicated = persistDailyDevBacklogFile(loadGroups(), loadGroups().find(item => item.id === group.id), {
  priority: 'normal',
  scope: '项目 A',
  acceptance: '未指定会话时创建专属自动化任务会话',
  quality_decision: { state: 'ready', confidence: 1 },
  idempotency_key: 'session-binding-dedicated',
}, '专属自动化会话需求', '验证自动化会话不会复用活动普通会话')
assert.notEqual(createdDedicated.target_session_id, sessionB.id)
const dedicatedListItem = listDailyDevBacklogs(group.id).find(item => item.entry_id === createdDedicated.entry_id)
assert.equal(dedicatedListItem.session_options.find(item => item.id === createdDedicated.target_session_id)?.session_kind, 'automation')

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
assert.equal(dispatchedA.task.group_session_id, sessionA.id)
assert.equal(dispatchedA.task.exact_session_id, sessionA.id)

const latestGroup = loadGroups().find(item => item.id === group.id)
const createdB = persistDailyDevBacklogFile(loadGroups(), latestGroup, {
  priority: 'normal',
  scope: '项目 A',
  acceptance: '用户可以在派发时明确改选会话',
  quality_decision: { state: 'ready', confidence: 1 },
  idempotency_key: 'session-binding-b',
  target_session_id: sessionA.id,
}, '可改选会话需求 B', '验证显式会话改选')
assert.equal(createdB.target_session_id, sessionA.id)

const dispatchedB = dispatchDailyDevBacklog(group.id, createdB.name, {}, {
  auto_execute: false,
  group_session_id: sessionB.id,
  exact_session_id: sessionB.id,
  source: 'selftest-explicit-session-change',
})
assert.equal(dispatchedB.success, true)
assert.equal(dispatchedB.task.group_session_id, sessionB.id)
assert.equal(dispatchedB.task.exact_session_id, sessionB.id)
assert.equal(dispatchedB.target_session.id, sessionB.id)

console.log(JSON.stringify({
  pass: true,
  paidProviderCalls: 0,
  checks: {
    creationSnapshotPersisted: true,
    activeSessionSwitchIgnored: true,
    dedicatedAutomationSessionCreated: true,
    explicitDispatchOverrideHonored: true,
    exactSessionPropagatedToTask: true,
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
  const receipt = JSON.parse(String(result.stdout || '').trim().split(/\r?\n/).at(-1))
  assert.equal(receipt.pass, true)
  const groupSidebar = fs.readFileSync(path.join(root, 'frontend/src/components/collaboration/GroupChatSessionSidebar.vue'), 'utf8')
  const projectSidebar = fs.readFileSync(path.join(root, 'frontend/src/components/projects/ProjectSessionSidebar.vue'), 'utf8')
  const workbench = fs.readFileSync(path.join(root, 'frontend/src/components/common/UsabilityWorkbench.vue'), 'utf8')
  assert.match(groupSidebar, /普通会话/)
  assert.match(groupSidebar, /自动化任务会话/)
  assert.match(projectSidebar, /普通会话/)
  assert.match(projectSidebar, /自动化任务会话/)
  assert.match(projectSidebar, /飞书会话/)
  assert.match(workbench, /exact_session_id/)
  receipt.checks.groupAndProjectSessionSections = true
  receipt.checks.workbenchExactSessionBinding = true
  console.log(JSON.stringify(receipt, null, 2))
} finally {
  fs.rmSync(storeDir, { recursive: true, force: true })
}
