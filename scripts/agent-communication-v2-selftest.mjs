import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-agent-communication-v2-'))
process.env.CCM_TASK_STORE_DIR = root

const communication = await import('../ccm-package/dist/system/agent-communication-v2.js')
const taskStore = await import('../ccm-package/dist/core/task-store.js')
const parallelDispatch = await import('../ccm-package/dist/modules/collaboration/collaboration-agent-parallel-dispatch.js')

function identity(suffix, receiver = 'project-a') {
  return {
    taskId: `task-${suffix}`,
    workItemId: `work-${suffix}`,
    scope: 'project',
    scopeId: receiver,
    exactSessionId: `session-${suffix}`,
    generation: 1,
    attempt: 1,
    senderAgentId: 'ccm-project-main-agent',
    receiverAgentId: receiver,
  }
}

try {
  const parallelGroupId = parallelDispatch.createAgentParallelGroupId({ groupId: 'group-a', taskId: 'task-parallel', targets: ['project-a', 'project-b'] })
  assert.match(parallelGroupId, /^agent-batch:/)
  assert.equal(parallelGroupId, parallelDispatch.createAgentParallelGroupId({ groupId: 'group-a', taskId: 'task-parallel', targets: ['project-a', 'project-b'] }), '并行批次ID必须稳定')
  const isolatedParallelResults = await parallelDispatch.settleParallelAgentJobs(['project-a', 'project-b'], async project => {
    if (project === 'project-a') throw new Error('project-a failed')
    return [`${project} completed`]
  })
  assert.equal(isolatedParallelResults[0].error?.message, 'project-a failed')
  assert.deepEqual(isolatedParallelResults[1].outputs, ['project-b completed'], '一个项目失败不得吞掉其他独立项目结果')

  const started = communication.startAgentCommunicationDispatch({
    ...identity('success'),
    ownerId: 'selftest-runner',
    payload: {
      objectiveChecksum: 'objective-checksum',
      prompt: 'SENTINEL_PROMPT_MUST_NOT_PERSIST',
      rawOutput: 'SENTINEL_OUTPUT_MUST_NOT_PERSIST',
      nested: { content: 'SENTINEL_CONTENT_MUST_NOT_PERSIST', artifactRef: 'artifact-1' },
    },
  })
  assert.equal(started.acquired, true)
  assert.equal(started.envelope.state, 'runner_starting')
  assert.equal(started.envelope.schema, 'ccm-agent-communication-envelope-v2')

  communication.markAgentCommunicationRunnerStarted(started.envelope.messageId, { runnerRequestId: 'runner-1' })
  const stale = communication.recordAgentCommunicationReceipt(started.envelope.messageId, 'dispatch_ack', {
    taskId: 'task-success', workItemId: 'work-success', exactSessionId: 'session-success',
    generation: 0, attempt: 1, leaseId: started.envelope.leaseId,
    senderAgentId: 'project-a', receiverAgentId: 'ccm-project-main-agent',
  }, { understoodGoal: 'wrong generation' })
  assert.equal(stale.accepted, false)
  assert.equal(stale.stale, true)

  const acknowledged = communication.ensureAgentCommunicationAcknowledged(started.envelope.messageId, {
    understoodGoal: 'implement the scoped task',
    plannedScope: ['src/'],
    forbiddenScope: ['secrets/'],
    verificationPlan: ['npm test'],
  })
  assert.equal(acknowledged.accepted, true)
  const afterAck = communication.getAgentCommunication(started.envelope.messageId)
  const receiptIdentity = {
    taskId: afterAck.taskId, workItemId: afterAck.workItemId, exactSessionId: afterAck.exactSessionId,
    generation: afterAck.generation, attempt: afterAck.attempt, leaseId: afterAck.leaseId,
    senderAgentId: afterAck.receiverAgentId, receiverAgentId: afterAck.senderAgentId,
  }
  const heartbeat = communication.heartbeatAgentCommunication(started.envelope.messageId, receiptIdentity, { phase: 'executing', progress: 50, sideEffectState: 'known' })
  assert.equal(heartbeat.accepted, true)
  const progressOne = communication.recordAgentCommunicationReceipt(started.envelope.messageId, 'progress', receiptIdentity, { phase: 'executing', progress: 60, summary: 'working' })
  const progressTwo = communication.recordAgentCommunicationReceipt(started.envelope.messageId, 'progress', receiptIdentity, { phase: 'executing', progress: 60, summary: 'working' })
  assert.equal(progressOne.accepted, true)
  assert.equal(progressTwo.deduplicated, true)
  const result = communication.submitAgentCommunicationResult(started.envelope.messageId, {
    status: 'done', summary: 'implemented', filesChanged: ['src/a.ts'],
    verificationResults: [{ name: 'test', status: 'passed', evidence: ['exit=0'] }],
  })
  assert.equal(result.accepted, true)
  assert.equal(communication.getAgentCommunicationDiagnostics().concurrency.global, 0, 'Result提交后必须立即释放第三方Agent运行槽')
  const terminal = communication.finalizeAgentCommunication(started.envelope.messageId, 'accepted', {
    summary: 'CCM verification passed', verificationResults: [{ name: 'test', status: 'passed' }],
  })
  assert.equal(terminal.accepted, true)

  const complete = communication.getAgentCommunication(started.envelope.messageId)
  assert.equal(complete.state, 'completed')
  assert.deepEqual(complete.receipts.map(item => item.receiptType), ['dispatch_ack', 'progress', 'result', 'terminal'])
  const serialized = JSON.stringify(complete)
  assert.equal(serialized.includes('SENTINEL_PROMPT_MUST_NOT_PERSIST'), false)
  assert.equal(serialized.includes('SENTINEL_OUTPUT_MUST_NOT_PERSIST'), false)
  assert.equal(serialized.includes('SENTINEL_CONTENT_MUST_NOT_PERSIST'), false)

  const c1 = communication.startAgentCommunicationDispatch({ ...identity('cap-1', 'same-project'), ownerId: 'runner-1' })
  const c2 = communication.startAgentCommunicationDispatch({ ...identity('cap-2', 'same-project'), ownerId: 'runner-2' })
  const c3 = communication.startAgentCommunicationDispatch({ ...identity('cap-3', 'same-project'), ownerId: 'runner-3' })
  const c4 = communication.startAgentCommunicationDispatch({ ...identity('cap-4', 'same-project'), ownerId: 'runner-4' })
  assert.equal(c1.acquired, true)
  assert.equal(c2.acquired, true)
  assert.equal(c3.acquired, false)
  assert.equal(c3.reason, 'project_parallel_limit')
  assert.equal(c3.position, 1)
  assert.equal(c4.position, 2)
  const queuedDispatchPromise = communication.waitForAgentCommunicationDispatch({
    ...identity('cap-3', 'same-project'),
    ownerId: 'runner-3',
    existingMessageId: c3.envelope.messageId,
  }, { initialDispatch: c3, pollIntervalMs: 25 })
  setTimeout(() => communication.releaseAgentCommunicationLease(c1.envelope.messageId, 'selftest_capacity_release'), 50)
  const c3Started = await queuedDispatchPromise
  assert.equal(c3Started.acquired, true, '容量释放后排队Agent必须自动领取租约')
  assert.equal(c3Started.envelope.state, 'runner_starting')
  communication.releaseAgentCommunicationLease(c2.envelope.messageId, 'selftest_cleanup')
  communication.releaseAgentCommunicationLease(c3Started.envelope.messageId, 'selftest_cleanup')

  const retryFirst = communication.startAgentCommunicationDispatch({ ...identity('retry', 'retry-project'), ownerId: 'retry-runner-1' })
  communication.markAgentCommunicationRunnerStarted(retryFirst.envelope.messageId, { runnerRequestId: 'retry-1' })
  communication.ensureAgentCommunicationAcknowledged(retryFirst.envelope.messageId, { summary: 'retry ack' })
  communication.submitAgentCommunicationResult(retryFirst.envelope.messageId, { summary: 'needs rework' })
  communication.finalizeAgentCommunication(retryFirst.envelope.messageId, 'rejected', { summary: 'verification rejected' })
  const retrySecond = communication.startAgentCommunicationDispatch({ ...identity('retry', 'retry-project'), ownerId: 'retry-runner-2', existingMessageId: retryFirst.envelope.messageId })
  assert.equal(retrySecond.acquired, true)
  assert.equal(retrySecond.envelope.attempt, 2)

  const timeoutFirst = communication.startAgentCommunicationDispatch({ ...identity('timeout', 'timeout-project'), ownerId: 'timeout-runner' })
  const timeoutOutcomes = communication.reconcileAgentCommunications({
    now: Date.now() + 70_000,
    policy: { agentRunnerStartTimeoutMs: 60_000, agentLeaseTtlMs: 120_000 },
  })
  const timeoutOutcome = timeoutOutcomes.find(item => item.messageId === timeoutFirst.envelope.messageId)
  assert.equal(timeoutOutcome?.toState, 'startup_timeout')
  assert.equal(timeoutOutcome?.safeRetry, true)
  const timeoutRetry = communication.performAgentCommunicationAction(timeoutFirst.envelope.messageId, 'retry', { reason: 'selftest timeout retry' })
  assert.equal(timeoutRetry.envelope.attempt, 2)
  assert.equal(timeoutRetry.envelope.state, 'queued')
  const staleTerminal = communication.finalizeAgentCommunication(timeoutFirst.envelope.messageId, 'failed', {
    summary: 'old runner stopped late', expectedAttempt: 1, expectedLeaseId: timeoutFirst.envelope.leaseId,
  })
  assert.equal(staleTerminal.stale, true)
  assert.equal(communication.getAgentCommunication(timeoutFirst.envelope.messageId).state, 'queued')

  const bridge = communication.bridgeLegacyAgentCommunication({
    ...identity('legacy', 'legacy-project'),
    legacySchema: 'ccm-task-v1', legacyId: 'legacy-task-1', legacyStatus: 'in_progress',
  })
  assert.equal(bridge.bridged, true)
  assert.equal(bridge.envelope.state, 'queued')
  const terminalLegacy = communication.bridgeLegacyAgentCommunication({
    ...identity('legacy-done', 'legacy-project'),
    legacySchema: 'ccm-task-v1', legacyId: 'legacy-task-2', legacyStatus: 'done',
  })
  assert.equal(terminalLegacy.bridged, false)

  const diagnostics = communication.getAgentCommunicationDiagnostics()
  assert.ok(diagnostics.metrics.stale_receipt_total >= 1)
  assert.equal(diagnostics.concurrency.maxPerProject, 2)
  assert.equal(diagnostics.concurrency.maxGlobal, 6)
  assert.equal(typeof diagnostics.metrics.runner_started_to_ack_ms, 'number')
  assert.equal(typeof diagnostics.metrics.coordination_dependency_wait_ms, 'number')
  console.log(JSON.stringify({ success: true, schema: 'ccm-agent-communication-v2-selftest', messageId: started.envelope.messageId, diagnostics }, null, 2))
} finally {
  taskStore.closeSqliteTaskStore()
  fs.rmSync(root, { recursive: true, force: true })
}
