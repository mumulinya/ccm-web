import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  appendLiveModelActivityToTail,
  liveAssistantProvisionalText,
  liveAssistantInProgressText,
  latestAssistantProgressText,
} from '../frontend/src/utils/agentExecutionEvents.js'

const at = offset => new Date(Date.UTC(2026, 7, 14, 15, 0, offset)).toISOString()
const user = { role: 'user', content: '帮我改一下', timestamp: at(0) }
const liveAssistant = { role: 'assistant', content: '', streaming: true, timestamp: at(1), id: 'a1' }
const doneAssistant = { role: 'assistant', content: '已经改好了。', streaming: false, timestamp: at(8), id: 'a1' }
const events = [
  { eventId: 'turn', sequence: 1, eventType: 'turn_started', display: { status: 'running' }, createdAt: at(1), anchorMessageId: 'a1' },
  {
    eventId: 'progress-1', sequence: 2, eventType: 'assistant_progress',
    display: { status: 'running', summary: '我先定位相关代码和配置。' },
    detail: { progress: { kind: 'before_tools', text: '我先定位相关代码和配置。' } },
    createdAt: at(2), anchorMessageId: 'a1',
  },
  { eventId: 'tool', sequence: 3, eventType: 'tool_started', toolCallId: 't1', display: { status: 'running' }, createdAt: at(3), anchorMessageId: 'a1' },
  {
    eventId: 'progress-2', sequence: 4, eventType: 'assistant_progress',
    display: { status: 'running', summary: '已经定位到入口，继续修改。' },
    detail: { progress: { kind: 'key_finding', text: '已经定位到入口，继续修改。' } },
    createdAt: at(4), anchorMessageId: 'a1',
  },
]
const liveMessages = [user, liveAssistant]
const doneMessages = [user, doneAssistant]
const finishedEvents = [
  ...events,
  { eventId: 'result', sequence: 5, eventType: 'result', display: { status: 'success' }, createdAt: at(7), anchorMessageId: 'a1' },
]

assert.equal(latestAssistantProgressText(events, liveMessages, 1), '已经定位到入口，继续修改。')
assert.equal(liveAssistantProvisionalText(events, liveMessages, 1), '', '占位句不得盖住交错过程')
assert.equal(liveAssistantInProgressText(events, liveMessages, 1), '已经定位到入口，继续修改。', '任务进行中气泡应显示最新进度句或已流式正文')
assert.equal(liveAssistantInProgressText(finishedEvents, doneMessages, 1), '', '结束后必须让给最终回答')
assert.equal(liveAssistantInProgressText([
  ...events,
  { eventId: 'delta-1', sequence: 3.5, eventType: 'assistant_text_delta', display: { summary: '我先看' }, createdAt: at(3), anchorMessageId: 'a1' },
  { eventId: 'delta-2', sequence: 3.6, eventType: 'assistant_text_delta', display: { summary: ' README。' }, createdAt: at(3), anchorMessageId: 'a1' },
], liveMessages, 1), '我先看 README。', '已流式模型正文优先于进度句')
assert.equal(liveAssistantProvisionalText(events, [user, { ...liveAssistant, content: '', streaming: true }], 1), '')
assert.equal(
  liveAssistantProvisionalText([{ eventId: 'turn', sequence: 1, eventType: 'turn_started', display: { status: 'running' }, createdAt: at(1), anchorMessageId: 'a1' }], liveMessages, 1),
  '我正在处理当前请求。',
  '还没有进度事件时助手格也不能空着',
)
assert.equal(liveAssistantProvisionalText(finishedEvents, doneMessages, 1), '', '结束后必须让给最终回答，不再占用气泡正文')
assert.equal(liveAssistantProvisionalText(events, doneMessages, 1), '', '已有最终回答时不得继续展示临时进度')
assert.equal(liveAssistantProvisionalText(events, liveMessages, 0), '', '用户消息不得插入进度正文')

const root = process.cwd()
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const projectTemplate = read('frontend/src/components/projects/ProjectManager.template.html')
const groupTemplate = read('frontend/src/components/collaboration/GroupChat.template.html')
const globalMessages = read('frontend/src/components/global/GlobalAgentMessageList.vue')
const projectMessage = read('frontend/src/components/projects/ProjectAgentMessage.vue')
const transcript = read('frontend/src/components/common/AgentExecutionTranscript.vue')

assert.match(projectTemplate, /liveProjectAssistantProgress/)
assert.match(projectTemplate, /:live-progress="liveProjectAssistantProgress\(i\)"/)
assert.doesNotMatch(projectTemplate, /streaming && !String\(msg\.content/)
assert.ok(projectTemplate.indexOf('ProjectAgentMessage') < projectTemplate.indexOf('presentation="live"'), '项目会话必须先显示文字再显示实时工具')
assert.match(groupTemplate, /visibleGroupAssistantContent/)
assert.match(read('frontend/src/components/collaboration/GroupChatPanel.vue'), /liveAssistantInProgressText/)
assert.match(read('frontend/src/components/projects/ProjectManagerPanel.vue'), /liveAssistantInProgressText/)
assert.match(globalMessages, /liveAssistantInProgressText/)
assert.ok(groupTemplate.indexOf('AgentExecutionMessage') < groupTemplate.indexOf('presentation="live"'), '群聊必须先显示文字再显示实时工具')
assert.match(globalMessages, /visibleGlobalAssistantContent/)
assert.match(globalMessages, /liveGlobalAssistantProgress/)
assert.ok(globalMessages.indexOf('chat-bubble') < globalMessages.indexOf('presentation="live"'), '全局助手必须先显示文字再显示实时工具')
assert.match(projectMessage, /liveProgress/)
assert.match(projectMessage, /answerContent/)
assert.match(transcript, /event.progress && progressText\(event.progress\)/)
assert.doesNotMatch(transcript, /progressText\(event.progress\) && !isLivePresentation/)
assert.match(transcript, /flattenGroupedLiveRows/)
assert.match(transcript, /appendLiveModelActivityToTail/)
assert.match(transcript, /if \(event\?\.eventType === 'model_activity'\) return ''/)

const waitingActivity = {
  eventId: 'activity-review',
  sequence: 0,
  eventType: 'model_activity',
  display: { status: 'running', summary: '已取得检查结果，正在归纳关键结论' },
  detail: { modelActivity: { state: 'waiting', safeLabel: '已取得检查结果，正在归纳关键结论' } },
}
const streamedLiveRows = appendLiveModelActivityToTail([
  waitingActivity,
  { __progressBatch: true, key: 'batch-1', progress: { eventId: 'progress-plan', sequence: 2 }, children: [
    { eventId: 'glob-cloud', sequence: 3, eventType: 'tool_completed', toolCallId: 'glob-1' },
  ] },
  { eventId: 'progress-read', sequence: 4, eventType: 'assistant_progress', display: { summary: '已读取项目入口和配置' } },
])
assert.equal(streamedLiveRows.at(-1)?.eventId, 'activity-review', '归纳结论必须接在已读取之后，不能因 sequence 0 顶到流式开头')
assert.equal(streamedLiveRows[0]?.__progressBatch, true, '计划说明和工具必须留在归纳结论前面')
assert.equal(streamedLiveRows.some((row, index) => row?.eventId === 'progress-read' && index < streamedLiveRows.length - 1), true, '已读取必须出现在归纳结论之前')

console.log(JSON.stringify({
  pass: true,
  schema: 'ccm-live-assistant-provisional-selftest-v1',
}, null, 2))
