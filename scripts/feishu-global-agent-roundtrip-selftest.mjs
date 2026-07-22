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
    claim: () => null,
    settle: () => {},
  },
  createAgenticRuntime: () => ({}),
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
  listGlobalAgentRuns: () => [{ id: 'run-active', status: 'running', session_id: 'global-feishu-session' }],
  listTaskPermissionRequests: filters => filters.originSessionId === request.originSessionId ? [request] : [],
  loadGroups: () => [],
  notifyFeishuTaskStage: async input => { exactDeliveries.push(input); return { success: true, queued: false } },
  postLocalApi: async (baseUrl, pathname, body) => { decisions.push({ baseUrl, pathname, body }); return { success: true } },
  recordFeishuInbound: () => ({ chat_id: 'oc_roundtrip', open_id: 'ou_roundtrip', receive_id: 'oc_roundtrip', receive_id_type: 'chat_id', platform_session_key: 'feishu:oc_roundtrip:ou_roundtrip' }),
  resolveFeishuGlobalAgentSessionId: value => value?.ccm_session || 'global-feishu-session',
  resumeGlobalAgentRun: async () => ({}),
  runAgenticGlobalRequest: async () => { throw new Error('permission command must not start a new Agent run') },
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

const queueResult = await channel.processFeishuControlledMessage(
  'http://127.0.0.1:3080',
  {},
  '继续补充测试',
  payload,
  { sendReport: true, traceId: 'trace-queue' },
)
check('busy-run queue acknowledgement also returns through the exact Feishu conversation', () => {
  assert.equal(queueResult.queued, true)
  assert.equal(queueResult.report_sent, true)
  assert.equal(turnStore.length, 1)
  assert.equal(exactDeliveries.at(-1).sessionId, 'global-feishu-session')
  assert.equal(fallbackDeliveries.length, 0)
})

console.log(JSON.stringify({ pass: true, checks, paid_provider_calls: 0 }, null, 2))
