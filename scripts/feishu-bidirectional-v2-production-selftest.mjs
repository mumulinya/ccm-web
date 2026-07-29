import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-feishu-v2-'))
process.env.CCM_FEISHU_INBOUND_RECEIPT_FILE = path.join(tempDir, 'receipts.json')
process.env.CCM_CONVERSATION_TURN_FILE = path.join(tempDir, 'conversation-turns.json')

try {
  const runtime = await import(`${pathToFileURL(path.join(root, 'ccm-package/dist/modules/collaboration/feishu-conversation-v2.js')).href}?test=${Date.now()}`)
  const channel = await import(`${pathToFileURL(path.join(root, 'ccm-package/dist/modules/collaboration/feishu-channel.js')).href}?test=${Date.now()}`)
  const projectQueue = await import(`${pathToFileURL(path.join(root, 'ccm-package/dist/modules/projects/project-feishu-turn-queue.js')).href}?test=${Date.now()}`)
  const turnControl = await import(`${pathToFileURL(path.join(root, 'ccm-package/dist/agents/conversation-turn-control.js')).href}?test=${Date.now()}`)
  const payload = {
    chat_id: 'oc_v2_chat',
    open_id: 'ou_v2_user',
    user_id: 'user_v2',
    root_id: 'om_topic_a',
    thread_id: 'om_topic_a',
    message_id: 'om_message_1',
  }
  const first = runtime.buildFeishuInboundEnvelopeV2({ payload, targetType: 'global_agent', applicationId: 'app-v2', transport: 'acp' })
  const callbackCopy = runtime.buildFeishuInboundEnvelopeV2({ payload, targetType: 'global_agent', applicationId: 'app-v2', transport: 'event_callback' })
  assert.equal(first.idempotency_key, callbackCopy.idempotency_key, 'transport must not alter inbound identity')

  const claim = runtime.acquireFeishuInboundReceipt(first, 60_000)
  const duplicateInFlight = runtime.acquireFeishuInboundReceipt(callbackCopy, 60_000)
  assert.equal(claim.acquired, true)
  assert.equal(duplicateInFlight.acquired, false)
  assert.equal(duplicateInFlight.in_progress, true)
  runtime.completeFeishuInboundReceipt(claim.receipt.id, { reply: '已完成' })
  const duplicateCompleted = runtime.acquireFeishuInboundReceipt(callbackCopy, 60_000)
  assert.equal(duplicateCompleted.acquired, false)
  assert.equal(duplicateCompleted.receipt.result.reply, '已完成')

  const topicB = runtime.buildFeishuInboundEnvelopeV2({
    payload: { ...payload, root_id: 'om_topic_b', thread_id: 'om_topic_b', message_id: 'om_message_2' },
    targetType: 'global_agent', applicationId: 'app-v2', transport: 'acp',
  })
  assert.notEqual(first.identity.conversation_key_v2, topicB.identity.conversation_key_v2, 'topics must be isolated')

  const project = runtime.buildFeishuInboundEnvelopeV2({
    payload: { ...payload, project: 'project-a' }, targetType: 'project_agent', projectId: 'project-a', applicationId: 'app-v2', transport: 'acp',
  })
  assert.notEqual(first.identity.conversation_key_v2, project.identity.conversation_key_v2, 'global and project targets must be isolated')

  assert.throws(() => runtime.buildFeishuInboundEnvelopeV2({ payload, targetType: 'group_agent', applicationId: 'app-v2', transport: 'acp' }), /不再支持直接进入群聊/)

  const queued = runtime.buildFeishuQueuedTurnContextV2(first, payload, {
    chat_id: payload.chat_id,
    open_id: payload.open_id,
    receive_id: payload.chat_id,
    receive_id_type: 'chat_id',
    message_id: payload.message_id,
    root_message_id: payload.root_id,
    thread_id: payload.thread_id,
  })
  assert.equal(queued.message_id, 'om_message_1')
  assert.equal(queued.destination.thread_id, 'om_topic_a')
  assert.equal(queued.destination.message_id, 'om_message_1')
  const origin = runtime.buildFeishuOriginReceiptV2({ envelope: first, sessionId: 'feishu-session-a' })
  assert.equal(origin.source, 'global_feishu')
  const acpDestination = channel.resolveFeishuDestination({
    chat_id: 'oc_v2_chat', open_id: 'ou_v2_user', messageId: 'acp:synthetic:turn', platform_message_id: 'om_real_message_1234',
  })
  assert.equal(acpDestination.message_id, 'om_real_message_1234', 'synthetic ACP ids must never become Feishu reply targets')

  const firstProjectTurn = projectQueue.enqueueProjectFeishuTurn({
    project: 'project-a', projectSessionId: 'pfs_topic_a', message: '第一条项目消息', requestId: 'om_project_1',
    platformContext: { ...payload, message_id: 'om_project_1', thread_id: 'om_topic_a' },
  })
  const secondProjectTurn = projectQueue.enqueueProjectFeishuTurn({
    project: 'project-a', projectSessionId: 'pfs_topic_a', message: '第二条项目消息', requestId: 'om_project_2',
    platformContext: { ...payload, message_id: 'om_project_2', thread_id: 'om_topic_a' },
  })
  assert.equal(firstProjectTurn.position, 1)
  assert.equal(secondProjectTurn.position, 2)
  const claimedFirst = turnControl.conversationTurnControl.claim({ scope: 'project', conversation_id: firstProjectTurn.conversationId })
  assert.equal(claimedFirst.message, '第一条项目消息')
  assert.equal(claimedFirst.metadata.platform_context.message_id, 'om_project_1')
  turnControl.conversationTurnControl.defer(claimedFirst.id, 'lease busy')
  const reclaimedFirst = turnControl.conversationTurnControl.claim({ scope: 'project', conversation_id: firstProjectTurn.conversationId })
  assert.equal(reclaimedFirst.id, claimedFirst.id, 'lease contention must preserve FIFO order')
  turnControl.conversationTurnControl.settle({ id: reclaimedFirst.id, status: 'completed' })
  const claimedSecond = turnControl.conversationTurnControl.claim({ scope: 'project', conversation_id: firstProjectTurn.conversationId })
  assert.equal(claimedSecond.message, '第二条项目消息')
  assert.equal(claimedSecond.metadata.platform_context.message_id, 'om_project_2')
  turnControl.conversationTurnControl.settle({ id: claimedSecond.id, status: 'completed' })
  assert.notEqual(
    projectQueue.projectFeishuTurnConversationId('project-a', 'pfs_topic_a'),
    projectQueue.projectFeishuTurnConversationId('project-a', 'pfs_topic_b'),
    'project Feishu topics must have independent queues',
  )

  const channelSource = fs.readFileSync(path.join(root, 'backend/modules/global/global-agent-feishu-channel.ts'), 'utf8')
  const globalApiSource = fs.readFileSync(path.join(root, 'backend/modules/global/global-agent-api.ts'), 'utf8')
  const projectSource = fs.readFileSync(path.join(root, 'backend/modules/projects/sessions.ts'), 'utf8')
  const queueSource = fs.readFileSync(path.join(root, 'backend/modules/collaboration/collaboration-runtime-task-queue.ts'), 'utf8')
  const serverSource = fs.readFileSync(path.join(root, 'backend/server.ts'), 'utf8')
  assert.match(channelSource, /feishu_context_v2/)
  assert.match(channelSource, /queuedContext\?\.payload/)
  assert.doesNotMatch(channelSource, /channel: "configured_fallback"/)
  assert.doesNotMatch(globalApiSource, /processedFeishuMessageIds/)
  assert.match(globalApiSource, /feishu-global-inbound-v2/)
  assert.doesNotMatch(projectSource, /resolution: "single_bound_target"/)
  assert.match(queueSource, /must never fall back to the generic webhook/)
  assert.match(serverSource, /enqueueCurrentProjectFeishuTurn/)
  assert.match(serverSource, /startProjectFeishuTurnRecoveryForServer/)

  console.log(JSON.stringify({
    pass: true,
    checks: {
      shared_cross_transport_idempotency: true,
      durable_processing_receipt: true,
      exact_topic_isolation: true,
      global_project_isolation: true,
      group_direct_ingress_rejected: true,
      queued_message_context_preserved: true,
      exact_origin_receipt: true,
      synthetic_acp_id_not_used_as_reply_target: true,
      generic_webhook_business_fallback_removed: true,
      project_single_target_fallback_removed: true,
      project_turn_fifo_and_exact_payload: true,
      project_turn_restart_recovery_registered: true,
    },
    paid_provider_calls: 0,
  }, null, 2))
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
