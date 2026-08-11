import assert from 'node:assert/strict'
import {
  activePlanMessageIndex,
  activePlanStepEvent,
  activePlanStorageKey,
  projectActiveTaskPlans,
} from '../frontend/src/utils/activeTaskPlans.js'

const at = seconds => new Date(1_780_000_000_000 + seconds * 1000).toISOString()
const base = {
  schema: 'ccm-user-visible-agent-event-v1',
  scope: 'project',
  scopeId: 'demo',
  exactSessionId: 'session-secret-value',
  contentStored: false,
  visibility: 'default',
}
const plan = (taskId, anchorMessageId, generation, revision, sequence, steps, status = 'executing') => ({
  ...base,
  eventId: `plan:${taskId}:${generation}:${revision}`,
  eventType: 'requirement_plan',
  taskId,
  anchorMessageId,
  generation,
  sequence,
  createdAt: at(sequence),
  display: { title: '实施计划', summary: '安全目标', status: 'running' },
  detail: { requirementPlan: {
    schema: 'ccm-user-visible-requirement-plan-v1', planId: taskId, revision, title: `计划 ${taskId}`, goal: '完成用户需求', steps,
    scope: [], expectedResults: [], exclusions: [], status, createdAt: at(1), updatedAt: at(sequence), planChecksum: `sum-${revision}`, contentStored: false,
  } },
})
const stepsV1 = [
  { id: 'step-1', title: '检查现有实现', status: 'completed' },
  { id: 'step-2', title: '修改页面布局', status: 'running' },
  { id: 'step-3', title: '完成验证', status: 'pending' },
]
const stepsV2 = stepsV1.map(step => step.id === 'step-2' ? { ...step, status: 'completed' } : step.id === 'step-3' ? { ...step, status: 'running' } : step)
const events = [
  plan('task-a', 'message-a', 1, 1, 1, stepsV1),
  plan('task-a', 'message-a', 1, 2, 2, stepsV2),
  { ...base, eventId: 'tool-step-3', eventType: 'tool_started', taskId: 'task-a', anchorMessageId: 'message-a', generation: 1, sequence: 3, createdAt: at(3), display: { title: '验证', status: 'running' }, detail: { causalRefs: { planStepId: 'step-3' } } },
  plan('task-b', 'message-b', 1, 1, 4, stepsV1),
  plan('task-a', 'message-a-new', 2, 1, 5, stepsV1),
  { ...base, eventId: 'task-a-current-runner', eventType: 'agent_started', taskId: 'task-a', anchorMessageId: 'message-a-new', generation: 2, sequence: 6, createdAt: at(6), display: { title: '项目 Agent', status: 'running' } },
  { ...base, eventId: 'late-old-result', eventType: 'result', taskId: 'task-a', anchorMessageId: 'message-a', generation: 1, sequence: 99, createdAt: at(99), display: { title: '旧任务完成', status: 'success' } },
]

const projected = projectActiveTaskPlans(events, { exactSessionId: base.exactSessionId })
assert.equal(projected.length, 2, '旧generation计划必须被新generation替代，另一个并发任务仍保留')
const taskA = projected.find(item => item.taskId === 'task-a')
const taskB = projected.find(item => item.taskId === 'task-b')
assert.equal(taskA.generation, 2)
assert.equal(taskA.status, 'executing', '迟到的旧generation Result不能完成当前计划')
assert.equal(taskB.status, 'queued', '同一会话的第二个主任务必须显示排队，不能并行展示为执行中')
assert.equal(taskB.queuePosition, 1)
assert.equal(taskB.currentStepId, '')
assert.notEqual(taskA.fingerprint, taskB.fingerprint)

const revisionProjection = projectActiveTaskPlans(events.filter(event => event.generation === 1 && event.taskId === 'task-a'), { exactSessionId: base.exactSessionId })[0]
assert.equal(revisionProjection.revision, 2, '同一任务必须使用最高revision')
assert.equal(revisionProjection.currentStepId, 'step-3')
assert.equal(activePlanStepEvent(revisionProjection, 'step-3')?.eventId, 'tool-step-3')
assert.equal(activePlanMessageIndex([{ id: 'message-a' }, { id: 'message-b' }], revisionProjection), 0)

const successEvents = [
  plan('task-c', 'message-c', 1, 1, 1, stepsV1),
  { ...base, eventId: 'result-c', eventType: 'result', taskId: 'task-c', anchorMessageId: 'message-c', generation: 1, sequence: 2, createdAt: at(2), display: { title: '任务完成', status: 'success' } },
]
const completed = projectActiveTaskPlans(successEvents, { exactSessionId: base.exactSessionId })[0]
assert.equal(completed.status, 'completed')
assert.equal(completed.completedCount, completed.totalCount, '只有当前generation正式Result才能将所有步骤收口')

const linkedWorkItemEvents = [
  plan('task-d', 'message-d', 1, 1, 1, [
    { id: 'work-1', title: '实现权限页面', status: 'running' },
    { id: 'work-2', title: '完成验证', status: 'pending' },
  ]),
  { ...base, eventId: 'agent-work-1-done', eventType: 'agent_completed', taskId: 'task-d', workItemId: 'work-1', anchorMessageId: 'message-d', generation: 1, sequence: 2, createdAt: at(2), display: { title: '项目 Agent', status: 'success' } },
  { ...base, eventId: 'agent-work-2-started', eventType: 'agent_started', taskId: 'task-d', workItemId: 'work-2', anchorMessageId: 'message-d', generation: 1, sequence: 3, createdAt: at(3), display: { title: 'TestAgent', status: 'running' } },
]
const linkedWorkItemPlan = projectActiveTaskPlans(linkedWorkItemEvents, { exactSessionId: base.exactSessionId })[0]
assert.equal(linkedWorkItemPlan.steps[0].status, 'completed', '显式workItem事件必须推进对应计划步骤')
assert.equal(linkedWorkItemPlan.currentStepId, 'work-2', '新执行步骤必须原位成为当前步骤')

const storageKey = activePlanStorageKey(base.exactSessionId)
assert.equal(storageKey.includes(base.exactSessionId), false, 'sessionStorage键不得包含原始会话ID')
assert.equal(JSON.stringify(projected).includes('prompt'), false)

console.log(JSON.stringify({ pass: true, schema: 'ccm-active-task-plan-dock-selftest-v1', checks: {
  latestRevision: true,
  generationFence: true,
  serialQueueProjection: true,
  exactMessageAnchor: true,
  causalStepLocation: true,
  terminalGate: true,
  linkedWorkItemProgress: true,
  opaqueStorageKey: true,
} }, null, 2))
