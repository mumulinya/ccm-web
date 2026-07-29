import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const { createGlobalAgentFeishuChannel } = require(path.join(root, 'ccm-package', 'dist', 'modules', 'global', 'global-agent-feishu-channel.js'))

const request = {
  id: `perm_${'a'.repeat(24)}`,
  project: 'project-a',
  operation: 'git_push',
  originType: 'global',
  originSessionId: 'global-feishu-session',
  state: 'awaiting_user',
}
const exactDeliveries = []
const fallbackDeliveries = []
const decisions = []
const messages = []
const bindings = []
const agenticCalls = []
let activeRunPresent = true
const payload = {
  event: {
    message: { message_id: 'om_roundtrip_1', chat_id: 'oc_roundtrip', message_type: 'text', content: '{}' },
    sender: { sender_id: { open_id: 'ou_roundtrip' } },
  },
}

const turnStore = []
const channel = createGlobalAgentFeishuChannel({
  GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK: '已处理',
  appendGlobalActionAudit: () => {},
  appendGlobalAgentConversationMessage: (sessionId, role, content) => messages.push({ sessionId, role, content }),
  appendTraceEvent: () => {},
  bindFeishuIdentifiersFromValue: () => {},
  bindFeishuTaskContext: input => { bindings.push(input); return input },
  cancelGlobalAgentRun: () => {},
  conversationTurnControl: {
    enqueue: input => {
      const turn = { id: 'turn_roundtrip', ...input }
      turnStore.push(turn)
      return { turn }
    },
    list: () => ({ turns: [{ id: 'turn_roundtrip', position: 1 }] }),
    claim: () => {
      const turn = turnStore.find(item => !item.status || item.status === 'queued')
      if (turn) turn.status = 'sending'
      return turn || null
    },
    settle: input => {
      const turn = turnStore.find(item => item.id === input.id)
      if (turn) Object.assign(turn, { status: input.status, result: input.result, error: input.error || '' })
    },
  },
  createAgenticRuntime: () => ({}),
  decideWorkflowWithModel: async () => ({
    intentKind: 'task',
    readAction: 'none',
    actionRequired: true,
    continuationKind: 'new_task',
  }),
  ensureTraceId: value => value || 'trace-roundtrip',
  feishuRuntimeEventPresentation: () => null,
  findWaitingGlobalAgentRun: () => null,
  formatMissionStatus: () => '',
  getConfigs: () => [],
  getFeishuMessageId: value => value?.event?.message?.message_id || '',
  getGlobalAgentConversationMessages: () => [],
  getGlobalAgentRun: () => null,
  getGlobalDevelopmentMission: () => null,
  globalRunVisibleReply: () => '已处理',
  isGlobalProgressStatusRequest: () => false,
  listGlobalAgentRuns: () => activeRunPresent ? [{ id: 'run-active', status: 'running', session_id: 'global-feishu-session' }] : [],
  listTaskPermissionRequests: filters => filters.originSessionId === request.originSessionId ? [request] : [],
  loadGroups: () => [],
  notifyFeishuTaskStage: async input => { exactDeliveries.push(input); return { success: true, queued: false } },
  postLocalApi: async (baseUrl, pathname, body) => { decisions.push({ baseUrl, pathname, body }); return { success: true } },
  recordFeishuInbound: () => ({ chat_id: 'oc_roundtrip', open_id: 'ou_roundtrip', receive_id: 'oc_roundtrip', receive_id_type: 'chat_id', platform_session_key: 'feishu:oc_roundtrip:ou_roundtrip' }),
  resolveFeishuGlobalAgentSessionId: value => value?.ccm_session || 'global-feishu-session',
  resolveFeishuUserAccess: () => ({ allowed: true, role: 'admin', canOperate: true, canApprove: true, open_id: 'ou_roundtrip' }),
  resumeGlobalAgentRun: async () => ({}),
  runAgenticGlobalRequest: async (baseUrl, ctx, input) => {
    agenticCalls.push(input)
    return { id: 'run-queued-second', status: 'completed', mission_id: '', trace_id: input.traceId, steps: [], final_reply: '第二条已处理' }
  },
  sendFeishuReportMessage: async input => { fallbackDeliveries.push(input); return { success: true } },
  steerGlobalAgentRun: () => {},
})

const checks = []
const check = (name, fn) => { fn(); checks.push({ name, pass: true }) }

const approvalReply = await channel.processFeishuGlobalAgentMessage(
  'http://127.0.0.1:3080',
  {},
  `批准权限 ${request.id}`,
  payload,
  { sendReport: true, traceId: 'trace-approval' },
)
check('permission approval is accepted from the exact originating Feishu global session', () => {
  assert.match(approvalReply, /已批准/)
  assert.equal(decisions.length, 1)
  assert.equal(decisions[0].pathname, '/api/tasks/permission-requests/decide')
  assert.equal(decisions[0].body.request_id, request.id)
  assert.equal(decisions[0].body.decision, 'approve')
})
check('approval response returns through the bound Feishu conversation instead of the generic report channel', () => {
  assert.equal(exactDeliveries.length, 1)
  assert.equal(exactDeliveries[0].sessionId, 'global-feishu-session')
  assert.equal(fallbackDeliveries.length, 0)
})

const mismatchedPayload = { ...payload, ccm_session: 'sibling-global-session' }
const mismatchReply = await channel.processFeishuGlobalAgentMessage(
  'http://127.0.0.1:3080',
  {},
  `批准权限 ${request.id}`,
  mismatchedPayload,
  { sendReport: true, traceId: 'trace-mismatch' },
)
check('a sibling Feishu global session cannot approve the request', () => {
  assert.match(mismatchReply, /不属于当前飞书全局会话/)
  assert.equal(decisions.length, 1)
})
check('permission commands do not start a new Agent run', () => assert.equal(agenticCalls.length, 0))

const queuePayload = {
  event: {
    message: { message_id: 'om_roundtrip_2', chat_id: 'oc_roundtrip', root_id: 'om_topic_roundtrip', thread_id: 'om_topic_roundtrip', message_type: 'text', content: '{}' },
    sender: { sender_id: { open_id: 'ou_roundtrip' } },
  },
}
const queueResult = await channel.processFeishuControlledMessage(
  'http://127.0.0.1:3080',
  {},
  '继续补充测试',
  queuePayload,
  { sendReport: true, traceId: 'trace-queue' },
)
check('busy-run queue acknowledgement also returns through the exact Feishu conversation', () => {
  assert.equal(queueResult.queued, true)
  assert.equal(queueResult.report_sent, true)
  assert.equal(turnStore.length, 1)
  assert.equal(exactDeliveries.at(-1).sessionId, 'global-feishu-session')
  assert.equal(fallbackDeliveries.length, 0)
})

activeRunPresent = false
await channel.drainFeishuConversationTurns('http://127.0.0.1:3080', {}, 'global-feishu-session', payload)
check('queued second turn executes with its own original Feishu message and thread context', () => {
  assert.equal(agenticCalls.length, 1)
  const queuedBinding = bindings.findLast(item => item?.destination?.message_id === 'om_roundtrip_2')
  assert.equal(queuedBinding?.destination?.thread_id, 'om_topic_roundtrip')
  assert.equal(turnStore[0].status, 'completed')
})

console.log(JSON.stringify({ pass: true, checks, paid_provider_calls: 0 }, null, 2))
