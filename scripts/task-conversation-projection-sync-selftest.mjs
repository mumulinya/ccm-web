#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-task-conversation-projection-'))
process.env.HOME = sandbox
process.env.USERPROFILE = sandbox
process.env.CCM_TASK_STORE_DIR = path.join(sandbox, '.cc-connect')

const ccmDir = process.env.CCM_TASK_STORE_DIR
fs.mkdirSync(path.join(ccmDir, 'configs'), { recursive: true })
fs.writeFileSync(path.join(ccmDir, 'configs', 'config-demo.toml'), '[[projects]]\nname = "demo"\nwork_dir = "."\ntype = "claudecode"\n')

const require = createRequire(import.meta.url)
const sessions = require(path.join(root, 'ccm-package', 'dist', 'modules', 'projects', 'sessions.js'))
const groupStorage = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'storage.js'))
const projection = require(path.join(root, 'ccm-package', 'dist', 'system', 'task-conversation-projection.js'))
const visibleEvents = require(path.join(root, 'ccm-package', 'dist', 'system', 'user-visible-agent-events.js'))

try {
  const sourceSessionId = sessions.createProjectSessionRecord('demo', '来源会话').sessionId
  const recoverySessionId = sessions.createProjectSessionRecord('demo', '恢复会话').sessionId
  const taskId = 'projection-sync-task'
  sessions.upsertProjectSessionTaskMessage('demo', sourceSessionId, {
    id: `project-main-task:${taskId}`,
    role: 'assistant',
    content: '项目主 Agent 未能完成本轮任务：任务已取消',
    messageMode: 'task',
    task_id: taskId,
    taskExperience: { task_id: taskId, status: 'cancelled', revision: 2, execution_attempt: 1 },
  })

  const runningTask = {
    id: taskId,
    title: '恢复运行态投影',
    target_project: 'demo',
    project_session_id: sourceSessionId,
    exact_session_id: sourceSessionId,
    active_execution_session_id: recoverySessionId,
    status: 'pending',
    status_detail: '第 3 次执行 · 已从签名工作单重建现场',
    acceptance_state: 'planned',
    revision: 3,
    execution_attempt: 3,
    queue_state: 'queued',
    queue_position: 1,
    task_context: {
      sessionBindings: [
        { role: 'source', exactSessionId: sourceSessionId, status: 'active' },
        { role: 'active_execution', exactSessionId: recoverySessionId, status: 'active' },
      ],
    },
  }
  const runningReceipt = projection.syncTaskConversationProjection(runningTask, 'selftest_recovery_queued')
  assert.equal(runningReceipt.status, 'synced')
  const runningSource = sessions.getSessionDetail('demo', sourceSessionId).history.filter(row => row.task_id === taskId)
  const runningRecovery = sessions.getSessionDetail('demo', recoverySessionId).history.filter(row => row.task_id === taskId)
  assert.equal(runningSource.length, 1, 'queued recovery must replace the stale source message in place')
  assert.equal(runningRecovery.length, 1, 'queued recovery must be visible before the executor starts')
  assert.match(runningSource[0].content, /恢复会话继续/)
  assert.match(runningRecovery[0].content, /第 3 次执行/)
  assert.equal(runningRecovery[0].taskExperience.execution_attempt, 3)
  assert.equal(runningRecovery[0].taskExperience.runtime_status.terminal, false)

  groupStorage.saveGroups([{ id: 'group-projection', name: '投影测试群聊', members: [] }])
  const groupSourceSession = groupStorage.createGroupChatSession('group-projection', '来源会话').id
  const groupRecoverySession = groupStorage.createGroupChatSession('group-projection', '恢复会话').id
  const groupTask = {
    ...runningTask,
    id: 'group-projection-task',
    group_id: 'group-projection',
    group_session_id: groupSourceSession,
    exact_session_id: groupSourceSession,
    active_execution_session_id: groupRecoverySession,
    target_project: 'demo',
  }
  const groupReceipt = projection.syncTaskConversationProjection(groupTask, 'selftest_group_recovery_queued')
  assert.equal(groupReceipt.status, 'synced')
  assert.deepEqual(new Set(groupReceipt.updatedSessionIds), new Set([groupSourceSession, groupRecoverySession]))
  const groupSourceRows = groupStorage.getGroupMessages('group-projection', groupSourceSession).filter(row => row.task_id === groupTask.id)
  const groupRecoveryRows = groupStorage.getGroupMessages('group-projection', groupRecoverySession).filter(row => row.task_id === groupTask.id)
  assert.equal(groupSourceRows.length, 1, 'group source session must receive a single recovery link projection')
  assert.equal(groupRecoveryRows.length, 1, 'group recovery session must receive a single full task projection')
  assert.match(groupSourceRows[0].content, /恢复会话继续/)
  assert.match(groupRecoveryRows[0].content, /第 3 次执行/)

  const completedTask = {
    id: taskId,
    title: '恢复完成投影',
    target_project: 'demo',
    project_session_id: sourceSessionId,
    exact_session_id: sourceSessionId,
    active_execution_session_id: recoverySessionId,
    status: 'done',
    status_detail: '项目主 Agent 自验通过',
    acceptance_state: 'accepted',
    revision: 9,
    execution_attempt: 3,
    file_changes: { files: [{ path: 'README.md' }, { path: 'E2E_PROOF.md' }] },
    verification: [{ status: 'passed', command: 'npm test' }],
    task_context: {
      sessionBindings: [
        { role: 'source', exactSessionId: sourceSessionId, status: 'active' },
        { role: 'active_execution', exactSessionId: recoverySessionId, status: 'active' },
      ],
    },
  }

  const first = projection.syncTaskConversationProjection(completedTask, 'selftest_terminal_gate')
  assert.equal(first.status, 'synced')
  assert.deepEqual(new Set(first.updatedSessionIds), new Set([sourceSessionId, recoverySessionId]))

  const sourceHistory = sessions.getSessionDetail('demo', sourceSessionId).history
  const recoveryHistory = sessions.getSessionDetail('demo', recoverySessionId).history
  const sourceRows = sourceHistory.filter(row => row.task_id === taskId && row.role === 'assistant')
  const recoveryRows = recoveryHistory.filter(row => row.task_id === taskId && row.role === 'assistant')
  assert.equal(sourceRows.length, 1, 'source session must update the existing task message in place')
  assert.equal(recoveryRows.length, 1, 'recovery session must contain exactly one task message')
  assert.match(sourceRows[0].content, /恢复会话中完成/)
  assert.match(recoveryRows[0].content, /任务已完成/)
  assert.equal(recoveryRows[0].taskExperience.status, 'done')
  assert.equal(recoveryRows[0].taskExperience.execution_attempt, 3)
  assert.equal(recoveryRows[0].taskExperience.revision, 9)
  assert.equal(recoveryRows[0].taskExperience.runtime_status.phase, 'completed')
  assert.equal(recoveryRows[0].taskExperience.runtime_status.terminal, true)
  assert.deepEqual(recoveryRows[0].taskExperience.actions, [])
  const terminalEvents = visibleEvents.listUserVisibleAgentEvents({ scope: 'project', scopeId: 'demo', exactSessionId: recoverySessionId, limit: 50 }).events
    .filter(event => event.taskId === taskId && event.eventType === 'result')
  assert.equal(terminalEvents.length, 1, 'terminal task projection must close the execution timeline')
  assert.equal(terminalEvents[0].display.status, 'success')
  assert.deepEqual(terminalEvents[0].detail.terminalGate, {
    passed: true,
    accepted: true,
    source: 'task_ledger',
    contentStored: false,
  })
  assert.equal(terminalEvents[0].detail.completionSummary.status, 'success')
  assert.equal(terminalEvents[0].detail.completionSummary.source, 'terminal_gate')

  const second = projection.syncTaskConversationProjection(completedTask, 'selftest_duplicate_sse')
  assert.equal(second.status, 'unchanged', 'duplicate projection delivery must be idempotent')
  assert.equal(sessions.getSessionDetail('demo', recoverySessionId).history.filter(row => row.task_id === taskId).length, 1)

  projection.syncTaskConversationProjection({
    ...completedTask,
    status: 'cancelled',
    status_detail: 'late attempt cancellation',
    revision: 8,
    execution_attempt: 2,
  }, 'selftest_late_attempt')
  const afterLate = sessions.getSessionDetail('demo', recoverySessionId).history.find(row => row.task_id === taskId)
  assert.equal(afterLate.taskExperience.status, 'done', 'older task revisions cannot overwrite the accepted terminal state')
  assert.match(afterLate.content, /任务已完成/)

  const backendSource = fs.readFileSync(path.join(root, 'backend', 'modules', 'collaboration', 'collaboration-task-service.ts'), 'utf8')
  const recoverySource = fs.readFileSync(path.join(root, 'backend', 'tasks', 'task-recovery-orchestrator.ts'), 'utf8')
  const routeSource = fs.readFileSync(path.join(root, 'backend', 'modules', 'collaboration', 'collaboration-routes.ts'), 'utf8')
  const bootstrapSource = fs.readFileSync(path.join(root, 'backend', 'server-bootstrap.ts'), 'utf8')
  const projectUiSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'projects', 'useProjectManager.js'), 'utf8')
  const globalUiSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'global', 'GlobalAgent.vue'), 'utf8')
  assert.match(backendSource, /syncTaskConversationProjection/)
  assert.match(backendSource, /enqueueTaskConversationProjectionSync/)
  assert.match(recoverySource, /recovery_attempt_committed/)
  assert.match(recoverySource, /recovery_attempt_queued/)
  assert.match(routeSource, /conversation_projection/)
  assert.match(bootstrapSource, /reconcileTaskConversationProjections/)
  assert.match(projectUiSource, /authoritativeProjectTaskContent/)
  assert.match(globalUiSource, /global\.session_messages_changed/)

  console.log(JSON.stringify({
    success: true,
    sourceSessionId,
    recoverySessionId,
    checks: {
      inPlaceSourceProjection: true,
      recoveryProjection: true,
      queuedRecoveryProjection: true,
      groupRecoverySessionProjection: true,
      duplicateDeliveryIdempotent: true,
      staleRevisionRejected: true,
      terminalRuntimeReconciled: true,
      terminalTimelineClosed: true,
      startupCompensationWired: true,
      frontendLiveRefreshWired: true,
    },
  }, null, 2))
} finally {
  try {
    fs.rmSync(sandbox, { recursive: true, force: true })
  } catch (error) {
    // better-sqlite3 keeps the Windows file handle until process teardown.
    // The isolated temp directory is safe to let the OS clean up afterwards.
    if (error?.code !== 'EBUSY') throw error
  }
}
