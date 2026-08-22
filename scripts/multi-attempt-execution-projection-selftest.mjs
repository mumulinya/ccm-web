#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-multi-attempt-execution-'))
process.env.CCM_TASK_STORE_DIR = path.join(root, 'task-store')
process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR = path.join(root, 'visible-events')

const require = createRequire(import.meta.url)
const timeline = require('../ccm-package/dist/tasks/session-task-timeline.js')
const visible = require('../ccm-package/dist/system/user-visible-agent-events.js')

const taskId = 'task-multi-attempt'
const base = { scope: 'project', scopeId: 'project-a' }
const sourceSession = 'session-source'
const recoverySession = 'session-recovery'

timeline.createTaskStartedTimeline({ ...base, exactSessionId: sourceSession, taskId, attempt: 1 })
visible.appendUserVisibleAgentEvent({
  ...base, exactSessionId: sourceSession, taskId, attempt: 1, generation: 1,
  eventId: 'attempt-1-tool', eventType: 'tool_completed', toolCallId: 'tool-a', toolName: 'run_command',
  display: { title: '运行命令', summary: '构建失败', status: 'failed' },
})
visible.appendUserVisibleAgentEvent({
  ...base, exactSessionId: sourceSession, taskId, attempt: 1, generation: 1,
  eventId: 'attempt-1-result', eventType: 'result',
  display: { title: '任务中断', summary: '等待恢复', status: 'waiting' },
  detail: { completionSummary: { schema: 'ccm-completion-summary-v1', status: 'interrupted', headline: '任务已中断', detail: '构建阶段中断', filesChanged: 0, verificationPassed: 0, verificationFailed: 1, blockers: [], source: 'query_projection', contentStored: false } },
})
timeline.createTaskTerminalTimeline({ ...base, exactSessionId: sourceSession, taskId, status: 'interrupted', attempt: 1 })

timeline.createTaskAttemptStartedTimeline({ ...base, exactSessionId: recoverySession, taskId, attempt: 2, generation: 2 })
visible.appendUserVisibleAgentEvent({
  ...base, exactSessionId: recoverySession, taskId, attempt: 2, generation: 2,
  eventId: 'attempt-2-tool', eventType: 'tool_completed', toolCallId: 'tool-b', toolName: 'read_file',
  display: { title: '读取文件', summary: '读取完成', status: 'success' },
})
visible.appendUserVisibleAgentEvent({
  ...base, exactSessionId: recoverySession, taskId, attempt: 2, generation: 2,
  eventId: 'attempt-2-result', eventType: 'result',
  display: { title: '任务完成', summary: '验收通过', status: 'success' },
  detail: { completionSummary: { schema: 'ccm-completion-summary-v1', status: 'success', headline: '任务完成', filesChanged: 1, verificationPassed: 1, verificationFailed: 0, blockers: [], source: 'terminal_gate', contentStored: false } },
})
timeline.createTaskTerminalTimeline({ ...base, exactSessionId: recoverySession, taskId, status: 'success', attempt: 2 })

const projection = visible.listTaskAttemptReplayProjections({ ...base, exactSessionId: recoverySession, taskId })
assert.equal(projection.schema, 'ccm-attempt-replay-list-v1')
assert.deepEqual(projection.attempts.map(item => item.attempt), [1, 2], 'attempt必须按时间正序返回')
assert.equal(projection.attempts[0].status, 'interrupted')
assert.equal(projection.attempts[0].counts.tools, 1)
assert.equal(projection.attempts[1].status, 'success')

const firstAttempt = visible.listUserVisibleAgentEventsForTaskAttempt({ ...base, exactSessionId: recoverySession, taskId, attempt: 1, limit: 100 })
assert.ok(firstAttempt.events.some(item => item.eventId === 'attempt-1-tool'), '恢复会话必须能够按taskId读取来源会话的历史attempt')
assert.ok(firstAttempt.events.every(item => Number(item.attempt) === 1), '历史详情不能混入当前attempt')
assert.ok(!firstAttempt.events.some(item => item.eventId === 'attempt-2-tool'))

const component = fs.readFileSync(path.join(process.cwd(), 'frontend/src/components/common/AgentExecutionTranscript.vue'), 'utf8')
assert.ok(component.indexOf('class="cc-attempt-history history-first"') < component.indexOf('class="cc-current-attempt-head"'), '历史执行必须渲染在当前执行上方')
assert.match(component, /embedded-attempt/, '历史attempt必须复用共享执行记录组件')

const replayComponent = fs.readFileSync(path.join(process.cwd(), 'frontend/src/components/system/TraceReplay.vue'), 'utf8')
assert.match(replayComponent, /import AgentExecutionTranscript/, '任务回放必须复用共享执行记录组件')
assert.ok(
  replayComponent.indexOf('<AgentExecutionTranscript') < replayComponent.indexOf('section="work_item_attempts"'),
  '任务回放必须先展示统一attempt执行记录，再展示工作项返工诊断',
)
assert.match(replayComponent, /loadReplayExecutionProjection/, '任务回放必须从安全attempt接口读取权威执行投影')

const frontendProjection = await import('../frontend/src/utils/agentExecutionEvents.js')
const messages = [
  { id: 'user-1', role: 'user', timestamp: '2026-08-22T00:00:00.000Z' },
  { id: 'assistant-1', role: 'assistant', taskId, timestamp: '2026-08-22T00:00:03.000Z', streaming: false },
]
const duplicateToolAcrossAttempts = [
  { schema: 'ccm-user-visible-agent-event-v1', eventId: 'a1-tool', sequence: 1, eventType: 'tool_completed', taskId, attempt: 1, generation: 1, toolCallId: 'same-tool-id', display: { status: 'failed', title: '运行命令' }, createdAt: '2026-08-22T00:00:01.000Z' },
  { schema: 'ccm-user-visible-agent-event-v1', eventId: 'a1-result', sequence: 2, eventType: 'result', taskId, attempt: 1, generation: 1, display: { status: 'failed', title: '中断' }, createdAt: '2026-08-22T00:00:02.000Z' },
  { schema: 'ccm-user-visible-agent-event-v1', eventId: 'a2-tool', sequence: 3, eventType: 'tool_completed', taskId, attempt: 2, generation: 2, toolCallId: 'same-tool-id', display: { status: 'success', title: '运行命令' }, createdAt: '2026-08-22T00:00:03.000Z' },
  { schema: 'ccm-user-visible-agent-event-v1', eventId: 'a2-result', sequence: 4, eventType: 'result', taskId, attempt: 2, generation: 2, display: { status: 'success', title: '完成' }, createdAt: '2026-08-22T00:00:04.000Z' },
]
assert.deepEqual(frontendProjection.executionAttemptNumbersForMessage(duplicateToolAcrossAttempts, messages, 1), [1, 2])
const attemptOneRows = frontendProjection.executionEventsForMessage(duplicateToolAcrossAttempts, messages, 1, { attempt: 1 })
assert.ok(attemptOneRows.some(item => item.eventId === 'a1-tool'))
assert.ok(!attemptOneRows.some(item => item.eventId === 'a2-tool'), '相同toolCallId不能跨attempt合并')

console.log(JSON.stringify({ pass: true, attempts: projection.attempts.length, historyEvents: firstAttempt.events.length }))
