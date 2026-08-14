import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-visible-business-chain-'))
process.env.CCM_TASK_STORE_DIR = path.join(root, 'tasks')
process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR = path.join(root, 'events')

const events = await import('../ccm-package/dist/system/user-visible-agent-events.js')
const communication = await import('../ccm-package/dist/system/agent-communication-v2.js')
const taskStore = await import('../ccm-package/dist/core/task-store.js')

const identity = { scope: 'project', scopeId: 'fixture-project', exactSessionId: 'fixture-session', generation: 1 }
const base = {
  taskId: 'fixture-task',
  scope: 'project',
  scopeId: identity.scopeId,
  exactSessionId: identity.exactSessionId,
  generation: 1,
  attempt: 1,
  senderAgentId: 'ccm-project-main-agent',
}

function finishAgent(workItemId, receiverAgentId, kind) {
  const started = communication.startAgentCommunicationDispatch({
    ...base, workItemId, receiverAgentId, ownerId: `runner-${workItemId}`,
    payload: { objectiveChecksum: `${workItemId}-objective`, prompt: 'PRIVATE_HANDOFF_SENTINEL' },
  })
  assert.equal(started.acquired, true)
  communication.markAgentCommunicationRunnerStarted(started.envelope.messageId, { runnerRequestId: `${workItemId}-runner` })
  communication.ensureAgentCommunicationAcknowledged(started.envelope.messageId, {
    understoodGoal: `${kind} scoped work`, plannedScope: ['src/'], verificationPlan: ['npm test'],
  })
  const submitted = communication.submitAgentCommunicationResult(started.envelope.messageId, {
    status: 'done', summary: `${kind} result submitted`, filesChanged: kind === 'worker' ? ['src/feature.ts'] : [],
    verificationResults: [{ name: kind === 'worker' ? 'typecheck' : 'independent-test', status: 'passed', evidenceIds: [`evidence-${kind}`] }],
  })
  assert.equal(submitted.accepted, true)
  const terminal = communication.finalizeAgentCommunication(started.envelope.messageId, 'accepted', {
    summary: `${kind} accepted by CCM`, evidenceIds: [`evidence-${kind}`],
  })
  assert.equal(terminal.accepted, true)
  return started.envelope.messageId
}

try {
  events.appendToolProjection({
    ...identity, taskId: base.taskId, eventId: 'code-search-start', eventType: 'tool_started',
    toolName: 'find_definition', toolCallId: 'code-search', arguments: { symbol: 'executeFeature' },
  })
  events.appendToolProjection({
    ...identity, taskId: base.taskId, eventId: 'code-search-complete', eventType: 'tool_completed',
    toolName: 'find_definition', toolCallId: 'code-search',
    observation: { locations: [{ path: 'src/feature.ts', range: { startLine: 12, startCharacter: 0, endLine: 12, endCharacter: 14 } }], contentStored: false },
  })

  finishAgent('worker-item', 'codex-worker', 'worker')
  finishAgent('test-item', 'ccm-test-agent', 'test-agent')

  events.appendUserVisibleAgentEvent({
    ...identity, taskId: base.taskId, eventId: 'project-terminal-result', eventType: 'result',
    display: { title: '任务已完成', summary: '代码修改和独立验收均已通过', status: 'success', toolUseCount: 1 },
    fileChanges: [{ path: 'src/feature.ts', project: 'fixture-project', additions: 12, deletions: 2 }],
    result: events.buildUserVisibleAgentResult({
      status: 'success', text: '交付完成', turns: 3, toolCalls: 1,
      agents: { worker: 1, testAgent: 1 }, filesChanged: [{ path: 'src/feature.ts' }],
      verificationResults: [{ name: 'independent-test', status: 'passed', evidenceIds: ['evidence-test-agent'] }],
    }),
  })

  const listed = events.listUserVisibleAgentEvents({ ...identity, cursor: 0, limit: 500 })
  const rows = listed.events
  const codeSearch = rows.find(row => row.eventId === 'code-search-complete')
  const resultSubmitted = rows.find(row => row.eventType === 'agent_progress' && row.display?.summary?.includes('等待 CCM 验收'))
  const workerTerminal = rows.find(row => row.eventType === 'agent_completed' && row.workItemId === 'worker-item')
  const testTerminal = rows.find(row => row.eventType === 'agent_completed' && row.workItemId === 'test-item')
  const finalResult = rows.find(row => row.eventId === 'project-terminal-result')

  assert.equal(codeSearch?.display?.title, '查找定义')
  assert.ok(resultSubmitted, 'Worker Result必须展示为等待CCM验收')
  assert.ok(workerTerminal && testTerminal, 'Worker和TestAgent必须分别具备CCM Terminal事件')
  assert.ok(resultSubmitted.sequence < workerTerminal.sequence, 'Result不得晚于或替代Terminal')
  assert.ok(testTerminal.sequence < finalResult.sequence, '最终交付必须发生在TestAgent Terminal之后')
  assert.equal(finalResult.detail?.fileChanges?.[0]?.path, 'src/feature.ts')
  assert.equal(finalResult.detail?.fileChanges?.[0]?.additions, 12)
  assert.equal(JSON.stringify(rows).includes('PRIVATE_HANDOFF_SENTINEL'), false)
  assert.equal(rows.every(row => row.contentStored === false), true)

  console.log(JSON.stringify({
    pass: true,
    schema: 'ccm-user-visible-agent-business-chain-e2e-v1',
    sequence: rows.map(row => ({ sequence: row.sequence, type: row.eventType, title: row.display?.title, workItemId: row.workItemId || '' })),
    checks: {
      codeSearchProjected: true,
      workerResultWaitsForTerminal: true,
      testAgentTerminalPrecedesDelivery: true,
      noPrivateHandoffPersisted: true,
    },
  }, null, 2))
} finally {
  taskStore.closeSqliteTaskStore()
  fs.rmSync(root, { recursive: true, force: true })
}
