import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-global-runtime-v2-'))
process.env.CCM_CONVERSATION_TURN_FILE = path.join(temp, 'turns.json')
process.env.CCM_GLOBAL_TERMINAL_OUTBOX_FILE = path.join(temp, 'terminal-outbox.json')

try {
  const authorization = await import('../ccm-package/dist/agents/global/global-agent-authorization.js')
  const terminal = await import('../ccm-package/dist/agents/global/global-terminal-delivery.js')
  const turns = await import('../ccm-package/dist/agents/conversation-turn-control.js')

  const decision = (overrides = {}) => ({
    mode: 'plan_task',
    actionRequired: true,
    authorizationDirective: 'grant',
    requiresUserConfirmation: false,
    riskLevel: 'write',
    targetRefs: ['project-a'],
    impactScope: ['project-a'],
    ...overrides,
  })
  const receipt = authorization.buildGlobalWriteAuthorizationReceipt({
    turnId: 'turn-a',
    sessionId: 'session-a',
    source: 'web',
    message: '请修改 project-a',
    workflowDecision: decision(),
    principal: { kind: 'browser', userId: 'operator-a', role: 'operator', capabilities: ['task.execute'] },
  })
  assert.equal(receipt.allowed_risk, 'write')
  const run = {
    session_id: 'session-a',
    turn_id: 'turn-a',
    original_user_message: '请修改 project-a',
    authorization_message: '请修改 project-a',
    write_authorization_receipt: receipt,
  }
  assert.equal(authorization.globalWriteAuthorizationAllowsTool({ run, tool: 'send_project_cmd', args: { project: 'project-a' }, risk: 'write' }).allowed, true)
  assert.equal(authorization.globalWriteAuthorizationAllowsTool({ run, tool: 'send_project_cmd', args: { project: 'project-b' }, risk: 'write' }).allowed, false)
  assert.equal(authorization.globalWriteAuthorizationAllowsTool({ run, tool: 'manage_project', args: { project: 'project-a', operation: 'delete' }, risk: 'high' }).allowed, false)
  assert.equal(authorization.buildGlobalWriteAuthorizationReceipt({ turnId: 'b', sessionId: 's', source: 'web', message: 'x', workflowDecision: decision({ requiresUserConfirmation: true }), principal: { role: 'operator' } }).allowed_risk, 'read')
  assert.equal(authorization.buildGlobalWriteAuthorizationReceipt({ turnId: 'c', sessionId: 's', source: 'web', message: 'x', workflowDecision: decision({ authorizationDirective: 'preserve' }), principal: { role: 'operator' } }).allowed_risk, 'read')
  assert.equal(authorization.buildGlobalWriteAuthorizationReceipt({ turnId: 'd', sessionId: 's', source: 'web', message: 'x', workflowDecision: decision(), principal: { role: 'viewer' }, readOnly: true }).allowed_risk, 'read')

  const queue = new turns.ConversationTurnControlStore(process.env.CCM_CONVERSATION_TURN_FILE)
  const first = queue.enqueue({ scope: 'global', conversation_id: 'session-a', request_id: 'one', message: 'one' }).turn
  const second = queue.enqueue({ scope: 'global', conversation_id: 'session-a', request_id: 'two', message: 'two' }).turn
  const claimOne = queue.claim({ scope: 'global', conversation_id: 'session-a' })
  assert.equal(claimOne.id, first.id)
  assert.equal(queue.claim({ scope: 'global', conversation_id: 'session-a' }), null)
  assert.ok(claimOne.lease_id)
  queue.heartbeat({ id: claimOne.id, lease_id: claimOne.lease_id, run_id: 'run-one', checkpoint: 'model' })
  queue.settle({ id: claimOne.id, status: 'completed', run_id: 'run-one' })
  assert.equal(queue.claim({ scope: 'global', conversation_id: 'session-a' }).id, second.id)

  const supervisor = { id: 'sup-a', mission_id: 'mission-a', global_run_id: 'run-a', session_id: 'session-a', source: 'feishu-control-bot' }
  const terminalReceipt = terminal.createGlobalRunTerminalReceipt({ ...supervisor, outcome: 'completed', report: { summary: 'done' } })
  terminal.ensureGlobalTerminalDeliveries(supervisor, terminalReceipt)
  let failedOnce = false
  await terminal.drainGlobalTerminalDeliveries({
    supervisorId: supervisor.id,
    deliver: async (delivery) => {
      if (delivery.kind === 'feishu' && !failedOnce) { failedOnce = true; throw new Error('temporary delivery failure') }
    },
  })
  assert.equal(terminal.listGlobalTerminalDeliveries({ supervisorId: supervisor.id }).find(item => item.kind === 'feishu').state, 'pending')
  const terminalFile = JSON.parse(fs.readFileSync(process.env.CCM_GLOBAL_TERMINAL_OUTBOX_FILE, 'utf8'))
  for (const item of terminalFile.deliveries) if (item.state === 'pending') item.next_attempt_at = new Date(0).toISOString()
  fs.writeFileSync(process.env.CCM_GLOBAL_TERMINAL_OUTBOX_FILE, JSON.stringify(terminalFile, null, 2))
  await terminal.drainGlobalTerminalDeliveries({ supervisorId: supervisor.id, deliver: async () => {} })
  assert.equal(terminal.listGlobalTerminalDeliveries({ supervisorId: supervisor.id }).every(item => item.state === 'delivered'), true)

  const memorySource = fs.readFileSync(path.join(root, 'backend/agents/global/memory.ts'), 'utf8')
  const loopSource = fs.readFileSync(path.join(root, 'backend/agents/global/global-agent-loop-engine.ts'), 'utf8')
  const frontendSource = fs.readFileSync(path.join(root, 'frontend/src/components/global/GlobalAgent.vue'), 'utf8')
  assert.doesNotMatch(memorySource, /peelOldestApiConversationRound/)
  assert.match(memorySource, /splitGlobalCompactionTimelineByCompleteTurns/)
  assert.doesNotMatch(loopSource, /listGlobalAgentRuns\(\{ status: "running", limit: 20 \}\)/)
  assert.doesNotMatch(frontendSource, /GLOBAL_SUPERVISION_CONTINUATION_PATTERN/)

  console.log(JSON.stringify({
    pass: true,
    checks: {
      scopedAuthorization: true,
      confirmationCannotSelfAuthorize: true,
      viewerCannotWrite: true,
      exactSessionSingleLease: true,
      terminalDeliveryRetries: true,
      noLossyCompactionPeel: true,
      unboundedRecoveryScan: true,
      noFrontendKeywordContinuation: true,
    },
    paid_provider_calls: 0,
  }, null, 2))
} finally {
  fs.rmSync(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}
