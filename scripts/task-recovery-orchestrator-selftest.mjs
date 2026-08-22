#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-recovery-orchestrator-'))
process.env.USERPROFILE = tempRoot
process.env.HOME = tempRoot
process.env.CCM_TASK_STORE_DIR = tempRoot
process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR = path.join(tempRoot, 'events')
const ccmConfigDir = path.join(tempRoot, '.cc-connect', 'configs')
fs.mkdirSync(ccmConfigDir, { recursive: true })
fs.writeFileSync(path.join(ccmConfigDir, 'config-native-task.toml'), '[[projects]]\nname = "native-task"\nwork_dir = "."\ntype = "codex"\n')
const require = createRequire(import.meta.url)
const db = require(path.join(root, 'ccm-package', 'dist', 'core', 'db.js'))
const sessions = require(path.join(root, 'ccm-package', 'dist', 'tasks', 'agent-sessions.js'))
const interruption = require(path.join(root, 'ccm-package', 'dist', 'tasks', 'task-interruption.js'))
const recovery = require(path.join(root, 'ccm-package', 'dist', 'tasks', 'task-recovery-orchestrator.js'))
const timeline = require(path.join(root, 'ccm-package', 'dist', 'tasks', 'session-task-timeline.js'))
const taskContext = require(path.join(root, 'ccm-package', 'dist', 'tasks', 'task-context.js'))
const projectSessions = require(path.join(root, 'ccm-package', 'dist', 'modules', 'projects', 'sessions.js'))

const source = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

function workspace(name) {
  const workDir = path.join(tempRoot, name)
  fs.mkdirSync(workDir, { recursive: true })
  execFileSync('git', ['init'], { cwd: workDir, stdio: 'ignore' })
  fs.writeFileSync(path.join(workDir, 'README.md'), `${name}\n`)
  return workDir
}

function interruptedTask(id, workDir, agentType = 'codex') {
  const task = {
    id,
    title: 'recovery orchestration selftest',
    status: 'in_progress',
    acceptance_state: 'executing',
    execution_attempt: 1,
    generation: 3,
    target_project: id,
    project_session_id: `session-${id}`,
    workDir,
    updated_at: new Date().toISOString(),
    resume_checkpoint: { phase: 'executing', planChecksum: `plan-${id}`, completedWorkItemIds: ['work-complete'] },
    plan_dispatch_contract: { contractChecksum: `contract-${id}` },
  }
  const session = sessions.openTaskAgentSession({ scopeId: id, taskId: id, groupId: '', project: id, agentType })
  if (agentType === 'codex') sessions.recordTaskAgentSessionTurn(session.id, { success: true, nativeSessionId: `native-${id}` })
  const snapshot = recovery.captureTaskRecoveryWorkspace(task)
  const stopped = interruption.interruptTaskExecution({
    task,
    reasonCode: 'user_interrupt',
    reason: 'selftest interruption',
    actor: 'selftest',
    checkpoint: 'executing',
    sideEffectState: 'uncertain',
    workspaceChecksum: snapshot.checksum,
    resumeCheckpoint: task.resume_checkpoint,
    processTerminationProven: true,
  })
  return { ...task, status: 'blocked', acceptance_state: 'recovery_required', interruption_receipt: stopped.receipt, recovery_pending: true }
}

function storeInterruptedTask(task) {
  const started = timeline.persistTaskStartedAtomically({
    task,
    position: db.loadTasks().length,
    exactSessionId: task.project_session_id,
    scope: 'project',
    scopeId: task.target_project,
    generation: task.generation,
    attempt: task.execution_attempt,
    title: task.title,
    goal: task.title,
    buildContext: current => taskContext.buildTaskContextCapsule(current),
  })
  timeline.createTaskTerminalTimeline({ taskId: task.id, exactSessionId: task.project_session_id, scope: 'project', scopeId: task.target_project, status: 'interrupted', attempt: 1, generation: task.generation, payloadRef: task.interruption_receipt.checksum })
  return db.getTaskById(task.id) || started.task
}

try {
  const nativeSessionId = projectSessions.createProjectSessionRecord('native-task', '恢复即时投影').sessionId
  const nativeDraft = interruptedTask('native-task', workspace('native-workspace'), 'codex')
  nativeDraft.project_session_id = nativeSessionId
  const nativeTask = storeInterruptedTask(nativeDraft)
  const nativeWorkspace = recovery.captureTaskRecoveryWorkspace(nativeTask)
  let enqueueCount = 0
  const resumed = await recovery.runTaskRecoveryOrchestrator(nativeTask, {
    scope: 'project',
    scopeId: 'native-task',
    exactSessionId: nativeTask.project_session_id,
    idempotencyKey: 'resume-native-once',
    authorizationValid: true,
    runtimeValid: true,
    currentWorkspaceChecksum: nativeWorkspace.checksum,
    worktreeOwnershipValid: true,
    enqueue: () => { enqueueCount += 1; return { queued: true } },
  })
  assert.equal(resumed.success, true)
  assert.equal(resumed.preflight.recoveryMode, 'native_session')
  assert.equal(resumed.task.execution_attempt, 2)
  assert.equal(resumed.task.recovery_transaction.status, 'committed')
  assert.equal(resumed.conversationProjection?.status, 'synced')
  assert.equal(resumed.conversationProjection?.attempt, 2)
  const nativeTaskMessage = projectSessions.getSessionDetail('native-task', nativeSessionId).history.find(row => row.task_id === nativeTask.id)
  assert.match(nativeTaskMessage?.content || '', /第 2 次执行/, 'recovery commit must be visible before executor progress')
  assert.equal(enqueueCount, 1)
  const duplicate = await recovery.runTaskRecoveryOrchestrator(nativeTask, {
    scope: 'project', exactSessionId: nativeTask.project_session_id, idempotencyKey: 'resume-native-once', authorizationValid: true,
  })
  assert.equal(duplicate.duplicate, true)
  assert.equal(enqueueCount, 1, 'duplicate resume must not enqueue a second attempt')
  assert.equal(duplicate.conversationProjection?.attempt, 2, 'duplicate recovery must return the current conversation projection receipt')

  const secondWorkspace = recovery.captureTaskRecoveryWorkspace(resumed.task)
  const secondStopped = interruption.interruptTaskExecution({
    task: { ...resumed.task, status: 'in_progress', acceptance_state: 'executing' },
    reasonCode: 'provider_failure',
    reason: 'second recoverable interruption',
    actor: 'selftest',
    checkpoint: 'executing',
    sideEffectState: 'committed',
    workspaceChecksum: secondWorkspace.checksum,
    resumeCheckpoint: resumed.task.resume_checkpoint,
    processTerminationProven: true,
  })
  const interruptedAgain = db.updateTaskById(nativeTask.id, {
    status: 'blocked',
    acceptance_state: 'recovery_required',
    execution_attempt: 2,
    recovery_pending: true,
    interruption_receipt: secondStopped.receipt,
  })
  const resumedAgain = await recovery.runTaskRecoveryOrchestrator(interruptedAgain, {
    scope: 'project',
    scopeId: 'native-task',
    exactSessionId: nativeTask.project_session_id,
    idempotencyKey: 'resume-native-second-interruption',
    authorizationValid: true,
    runtimeValid: true,
    currentWorkspaceChecksum: secondWorkspace.checksum,
    worktreeOwnershipValid: true,
  })
  assert.equal(resumedAgain.success, true)
  assert.equal(resumedAgain.task.execution_attempt, 3)
  assert.notEqual(resumedAgain.task.recovery_transaction.transactionId, resumed.task.recovery_transaction.transactionId)

  const degradedTask = storeInterruptedTask(interruptedTask('degraded-task', workspace('degraded-workspace'), 'opencode'))
  const degradedWorkspace = recovery.captureTaskRecoveryWorkspace(degradedTask)
  const degraded = await recovery.runTaskRecoveryOrchestrator(degradedTask, {
    scope: 'project', exactSessionId: degradedTask.project_session_id, idempotencyKey: 'resume-degraded-once', authorizationValid: true,
    currentWorkspaceChecksum: degradedWorkspace.checksum, worktreeOwnershipValid: true,
  })
  assert.equal(degraded.success, true)
  assert.equal(degraded.preflight.recoveryMode, 'rehydrated_attempt')
  assert.equal(degraded.activation.replacedSessionIds.length, 1)

  const providerDriftTask = interruptedTask('provider-drift-task', workspace('provider-drift-workspace'), 'codex')
  const providerDriftSession = sessions.listTaskAgentSessions({ taskId: providerDriftTask.id })[0]
  sessions.recordTaskAgentSessionTurn(providerDriftSession.id, {
    success: true,
    nativeSessionId: `native-${providerDriftTask.id}`,
    nativeContinuationEvidence: { providerContractId: 'unverified-new-contract' },
  })
  const providerDriftPreflight = recovery.buildTaskRecoveryPreflight(providerDriftTask, {
    scope: 'project', exactSessionId: providerDriftTask.project_session_id, authorizationValid: true,
  })
  assert.equal(providerDriftPreflight.recoveryMode, 'rehydrated_attempt', 'provider contract drift must rebuild a fresh Agent session')
  assert.equal(providerDriftPreflight.blockers.includes('provider_contract_drift'), false)
  assert.equal(providerDriftPreflight.checks.providerContractValid, true)

  let restartTask = interruptedTask('restart-transaction-task', workspace('restart-transaction-workspace'), 'codex')
  restartTask.recovery_transaction = {
    schema: 'ccm-task-recovery-transaction-v1',
    transactionId: 'abandoned-validating-transaction',
    status: 'validating',
    taskId: restartTask.id,
    generation: restartTask.generation,
    previousAttempt: 1,
    nextAttempt: 2,
    leaseId: 'expired-lease',
    exactSessionId: restartTask.project_session_id,
    workspaceManifestChecksum: restartTask.interruption_receipt.workspace_checksum,
    planChecksum: restartTask.interruption_receipt.plan_checksum,
    contractChecksum: restartTask.interruption_receipt.contract_checksum,
    preflightChecksum: 'old-preflight',
    idempotencyKey: 'old-recovery',
    startedAt: new Date(Date.now() - 120_000).toISOString(),
    checksum: 'old-transaction-checksum',
    contentStored: false,
  }
  restartTask = storeInterruptedTask(restartTask)
  const restartWorkspace = recovery.captureTaskRecoveryWorkspace(restartTask)
  const restarted = await recovery.runTaskRecoveryOrchestrator(restartTask, {
    scope: 'project', exactSessionId: restartTask.project_session_id, idempotencyKey: 'resume-after-restart', authorizationValid: true,
    currentWorkspaceChecksum: restartWorkspace.checksum, worktreeOwnershipValid: true,
  })
  assert.equal(restarted.success, true)
  assert.equal(restarted.task.execution_attempt, 2)
  assert.equal(restarted.task.recovery_transaction.status, 'committed')

  const driftTask = interruptedTask('drift-task', workspace('drift-workspace'), 'codex')
  fs.appendFileSync(path.join(driftTask.workDir, 'README.md'), 'drift\n')
  const driftPreflight = recovery.buildTaskRecoveryPreflight(driftTask, {
    scope: 'project', exactSessionId: driftTask.project_session_id, authorizationValid: true,
  })
  assert.equal(driftPreflight.recoveryMode, 'manual_reconciliation')
  assert.equal(driftPreflight.blockers.includes('workspace_manifest_drift'), true)
  const adoptedReceipt = interruption.reconcileTaskInterruptionReceipt(driftTask, {
    action: 'adopt_current_changes',
    workspaceChecksum: recovery.captureTaskRecoveryWorkspace(driftTask).checksum,
    actor: 'selftest',
  })
  const adoptedPreflight = recovery.buildTaskRecoveryPreflight({ ...driftTask, interruption_receipt: adoptedReceipt }, {
    scope: 'project', exactSessionId: driftTask.project_session_id, authorizationValid: true,
  })
  assert.equal(adoptedPreflight.recoveryMode, 'native_session')

  const unresolvedTask = interruptedTask('unresolved-task', workspace('unresolved-workspace'), 'codex')
  const unresolvedPreflight = recovery.buildTaskRecoveryPreflight(unresolvedTask, {
    scope: 'project', exactSessionId: unresolvedTask.project_session_id, authorizationValid: true,
    unresolvedToolCallIds: ['tool-write-unknown'],
  })
  assert.equal(unresolvedPreflight.recoveryMode, 'manual_reconciliation')
  assert.equal(unresolvedPreflight.checks.toolPairsReconciled, false)

  const missingWorkspaceTask = interruptedTask('missing-workspace-task', workspace('missing-workspace'), 'codex')
  fs.rmSync(missingWorkspaceTask.workDir, { recursive: true, force: true })
  const missingPreflight = recovery.buildTaskRecoveryPreflight(missingWorkspaceTask, {
    scope: 'project', exactSessionId: missingWorkspaceTask.project_session_id, authorizationValid: true,
  })
  assert.equal(missingPreflight.recoveryMode, 'rejected')
  assert.equal(missingPreflight.blockers.includes('workspace_manifest_unavailable'), true)

  const workbenchSource = source('backend/modules/system/usability.ts')
  const groupSource = source('backend/modules/collaboration/collaboration-routes.ts')
  const projectSource = source('backend/modules/projects/project-main-agent.ts')
  const legacyResumeCalls = [workbenchSource, groupSource, projectSource]
    .filter(text => text.includes('resumeInterruptedTaskExecution('))
  assert.equal([workbenchSource, groupSource, projectSource].every(text => text.includes('runTaskRecoveryOrchestrator(')), true)
  assert.equal(legacyResumeCalls.length, 0)

  console.log(JSON.stringify({
    pass: true,
    checks: {
      native_session_new_attempt: true,
      degraded_provider_rehydrated: true,
      provider_contract_drift_rehydrated: true,
      abandoned_validating_transaction_recovered: true,
      duplicate_resume_suppressed: true,
      committed_transaction_can_advance_after_new_interruption: true,
      workspace_drift_manual: true,
      explicit_workspace_adoption_reconciles: true,
      unresolved_tool_pair_manual: true,
      missing_workspace_fail_closed: true,
      recovery_transaction_committed: true,
      three_scope_entrypoints_share_orchestrator: true,
      legacy_scope_resume_calls_removed: true,
      paid_provider_calls: 0,
    },
  }, null, 2))
} finally {
  try { fs.rmSync(tempRoot, { recursive: true, force: true }) } catch {}
}
