#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  executionEventsForMessage,
  hasAcceptedExecutionForMessage,
  shouldRenderExecutionTranscript,
  terminalGateForExecutionEvent,
} from '../frontend/src/utils/agentExecutionEvents.js'

const taskId = 'task-recovery-visible'
const messageId = `project-main-task:${taskId}`
const messages = [
  { id: 'user-1', role: 'user', timestamp: '2026-08-21T08:00:00.000Z', content: '完成这个功能' },
  {
    id: messageId,
    role: 'assistant',
    messageMode: 'task',
    task_id: taskId,
    timestamp: '2026-08-21T08:01:00.000Z',
    taskExperience: { task_id: taskId, status: 'done', execution_attempt: 2 },
    content: '任务已完成',
  },
]
const event = (sequence, eventType, extra = {}) => ({
  schema: 'ccm-user-visible-agent-event-v1',
  eventId: `${taskId}:${sequence}`,
  sequence,
  eventType,
  scope: 'project',
  scopeId: 'demo',
  exactSessionId: 's1',
  generation: 1,
  taskId,
  attempt: 2,
  anchorMessageId: `task-message:${taskId}`,
  display: { title: eventType, status: eventType.endsWith('completed') || eventType === 'result' ? 'success' : 'running' },
  detail: {},
  visibility: 'default',
  contentStored: false,
  createdAt: `2026-08-21T08:00:${String(sequence).padStart(2, '0')}.000Z`,
  ...extra,
})
const events = [
  event(0, 'requirement_plan', { generation: 2, anchorMessageId: messageId }),
  event(1, 'agent_started', { agentRunId: 'agent-run-2' }),
  event(2, 'tool_started', { toolCallId: 'tool-2' }),
  event(3, 'tool_completed', { toolCallId: 'tool-2' }),
  event(4, 'agent_completed', { agentRunId: 'agent-run-2' }),
  event(5, 'result', {
    anchorMessageId: messageId,
    detail: {
      terminalGate: { passed: true, accepted: true, source: 'task_ledger', contentStored: false },
      completionSummary: {
        schema: 'ccm-completion-summary-v1', status: 'success', headline: '任务已完成', filesChanged: 1,
        verificationPassed: 1, verificationFailed: 0, blockers: [], source: 'terminal_gate', contentStored: false,
      },
    },
  }),
  event(6, 'tool_completed', { taskId: 'other-task', anchorMessageId: messageId, toolCallId: 'other-tool' }),
]

const rows = executionEventsForMessage(events, messages, 1)
assert.ok(rows.some(row => row.eventId === `${taskId}:3` && row.toolCallId === 'tool-2'), 'recovery tools with an internal legacy anchor must stay attached to the task card')
assert.ok(rows.some(row => row.eventId === `${taskId}:5`), 'accepted terminal result must stay attached to the task card')
assert.equal(rows.some(row => row.taskId === 'other-task'), false, 'another task must not leak into this task timeline')
assert.equal(shouldRenderExecutionTranscript(events, messages, 1), true)
assert.equal(hasAcceptedExecutionForMessage(events, messages, 1), true)
assert.equal(terminalGateForExecutionEvent(rows.find(row => row.eventType === 'result'))?.passed, true)

const linksSource = fs.readFileSync(new URL('../backend/system/task-conversation-links.ts', import.meta.url), 'utf8')
const executorSource = fs.readFileSync(new URL('../backend/modules/collaboration/collaboration-task-executor.ts', import.meta.url), 'utf8')
assert.match(linksSource, /taskConversationAnchorMessageId/)
assert.match(executorSource, /taskConversationAnchorMessageId\(task/)

console.log('execution record recovery association self-test passed')
