import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-visible-agent-events-'))
process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR = root

const require = createRequire(import.meta.url)
const events = require('../ccm-package/dist/system/user-visible-agent-events.js')
const projections = require('../ccm-package/dist/system/user-visible-agent-projections.js')
const replyStyle = require('../ccm-package/dist/agents/conversational-reply-style.js')

const builtIn = events.runUserVisibleAgentEventSelfTest()
assert.equal(builtIn.pass, true, JSON.stringify(builtIn, null, 2))

const identity = { scope: 'project', scopeId: 'demo', exactSessionId: 'session-visible-1', generation: 2 }
const started = events.appendToolProjection({
  ...identity,
  eventId: 'visible-tool-start',
  eventType: 'tool_started',
  toolName: 'find_definition',
  toolCallId: 'tool-1',
  arguments: { symbol: 'runAgent', api_key: 'EVENT_SECRET_SENTINEL' },
})
const completed = events.appendToolProjection({
  ...identity,
  eventId: 'visible-tool-complete',
  eventType: 'tool_completed',
  toolName: 'find_definition',
  toolCallId: 'tool-1',
  observation: { content: 'SOURCE_BODY_SENTINEL', output: 'TOOL_OUTPUT_SENTINEL', locations: [{ path: 'src/agent.ts', line: 12 }] },
  durationMs: 1250,
})
events.appendToolProjection({ ...identity, eventId: 'visible-tool-complete', eventType: 'tool_completed', toolName: 'find_definition', toolCallId: 'tool-1' })

const listed = events.listUserVisibleAgentEvents({ ...identity, cursor: 0, limit: 100 })
assert.equal(listed.events.length, 2, '事件ID必须幂等去重')
assert.equal(started.sequence, 1)
assert.equal(completed.sequence, 2)
assert.equal(listed.nextCursor, 2)
assert.equal(listed.contentStored, false)
const serialized = JSON.stringify(listed)
assert.equal(serialized.includes('EVENT_SECRET_SENTINEL'), false, '密钥不得出现在事件投影')
assert.equal(serialized.includes('SOURCE_BODY_SENTINEL'), false, '源码正文不得出现在事件投影')
assert.equal(serialized.includes('TOOL_OUTPUT_SENTINEL'), false, '通用output字段不得把工具正文带进事件投影')
assert.equal(serialized.includes('contentChecksum'), true, '正文必须替换为checksum')
assert.equal(serialized.includes('outputChecksum'), true, '工具output必须替换为checksum')

let ephemeral = null
const unsubscribe = events.subscribeUserVisibleAgentEvents(event => { if (event.eventType === 'assistant_text_delta') ephemeral = event })
events.publishEphemeralUserVisibleAgentEvent({
  ...identity,
  eventId: 'delta-live-only',
  eventType: 'assistant_text_delta',
  display: { title: '项目主 Agent', summary: '正在流式回复', status: 'running' },
})
unsubscribe()
assert.equal(ephemeral?.sequence, 0, '文本增量必须是非持久实时事件')
assert.equal(events.listUserVisibleAgentEvents({ ...identity }).events.length, 2, '文本增量不得写入持久投影')

const liveScopes = []
const stopLiveScopeCapture = events.subscribeUserVisibleAgentEvents(event => {
  if (event.eventType === 'assistant_text_delta') liveScopes.push(event.scope)
})
projections.publishUserVisibleAssistantText({ scope:'global', scopeId:'global', exactSessionId:'global-session', turnId:'global-turn', text:'全局回复' })
projections.publishUserVisibleAssistantText({ scope:'group', scopeId:'group-1', exactSessionId:'group-session', turnId:'group-turn', text:'群聊回复' })
stopLiveScopeCapture()
assert.deepEqual(liveScopes, ['global', 'group'], '全局和群聊必须使用同一实时文本事件')
assert.equal(events.listUserVisibleAgentEvents({ scope:'global', scopeId:'global', exactSessionId:'global-session' }).events.length, 0)
assert.equal(events.listUserVisibleAgentEvents({ scope:'group', scopeId:'group-1', exactSessionId:'group-session' }).events.length, 0)

projections.projectCommittedGroupCompaction({
  groupId:'group-1', exactSessionId:'group-session', reason:'selftest',
  result:{ compacted:true, boundary:{ id:'boundary-1', boundaryGeneration:3, post_compact_restore:{ dynamicContextRestoreReceipt:{ restoredTokens:1200 } } } },
})
const groupCompactionEvents = events.listUserVisibleAgentEvents({ scope:'group', scopeId:'group-1', exactSessionId:'group-session' }).events
assert.equal(groupCompactionEvents.length, 1)
assert.equal(groupCompactionEvents[0].eventType, 'context_compacted')
assert.equal(groupCompactionEvents[0].display.tokenCount, 1200)

const frontendFiles = [
  'frontend/src/components/global/GlobalAgentMessageList.vue',
  'frontend/src/components/projects/ProjectManager.template.html',
  'frontend/src/components/collaboration/GroupChat.template.html',
]
for (const file of frontendFiles) {
  assert.match(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /AgentExecutionTranscript/, `${file}必须接入统一执行流组件`)
}

const frontendExecution = await import('../frontend/src/utils/agentExecutionEvents.js')
const at = offset => new Date(Date.UTC(2026, 7, 9, 10, 0, offset)).toISOString()
const conversationMessages = [
  { role: 'user', content: '你觉得这个项目怎么样', timestamp: at(0) },
  { role: 'assistant', content: '整体方向不错。', timestamp: at(4) },
]
const conversationEvents = [
  { eventId: 'conversation-start', sequence: 1, eventType: 'turn_started', display: { status: 'running' }, createdAt: at(1) },
  { eventId: 'conversation-thinking', sequence: 2, eventType: 'thinking_status', display: { status: 'running' }, createdAt: at(2) },
  { eventId: 'conversation-result', sequence: 3, eventType: 'result', display: { status: 'success', toolUseCount: 0 }, createdAt: at(3) },
]
assert.equal(frontendExecution.shouldRenderExecutionTranscript(conversationEvents, conversationMessages, 1, false), false, '零动作普通对话默认不得显示执行记录')
assert.equal(frontendExecution.shouldRenderExecutionTranscript(conversationEvents, conversationMessages, 1, true), true, 'Ctrl+O展开后普通对话仍可查看技术记录')
const toolEvents = [
  ...conversationEvents.slice(0, 2),
  { eventId: 'tool-start', sequence: 3, eventType: 'tool_started', display: { status: 'running' }, createdAt: at(3) },
]
assert.equal(frontendExecution.shouldRenderExecutionTranscript(toolEvents, conversationMessages, 1, false), true, '真实工具动作必须立即显示执行记录')
const failedEvents = [
  ...conversationEvents.slice(0, 2),
  { eventId: 'turn-failed', sequence: 3, eventType: 'result', display: { status: 'failed' }, createdAt: at(3) },
]
assert.equal(frontendExecution.shouldRenderExecutionTranscript(failedEvents, conversationMessages, 1, false), true, '失败事件必须保留排障入口')
assert.match(replyStyle.CONVERSATIONAL_REPLY_STYLE_GUIDANCE, /两至三段短文或少量要点/)
for (const file of [
  'backend/agents/global/global-agent-run-projection.ts',
  'backend/modules/projects/project-main-agent.ts',
  'backend/modules/collaboration/group-orchestrator-llm.ts',
]) {
  assert.match(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /CONVERSATIONAL_REPLY_STYLE_GUIDANCE/, `${file}必须使用共享普通对话回复风格`)
}

fs.rmSync(root, { recursive: true, force: true })
console.log(JSON.stringify({
  pass: true,
  schema: events.USER_VISIBLE_AGENT_EVENT_SCHEMA,
  checks: {
    safeProjection: true,
    idempotentReplay: true,
    ephemeralDeltaNotPersisted: true,
    allScopeTextDeltaProjected: true,
    committedGroupCompactionProjected: true,
    allThreeScopesUseSharedComponent: true,
    ordinaryConversationHiddenByDefault: true,
    ordinaryConversationAvailableWithCtrlO: true,
    meaningfulExecutionShown: true,
    failedExecutionShown: true,
    adaptiveConciseReplySharedAcrossScopes: true,
  },
}, null, 2))
