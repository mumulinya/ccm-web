import assert from 'node:assert/strict'
import fs from 'node:fs'
import { projectActiveTaskPlans } from '../frontend/src/utils/activeTaskPlans.js'
import { taskCardNeedsConversationControl } from '../frontend/src/utils/taskCardPresentation.js'

const base = {
  schema: 'ccm-user-visible-agent-event-v1', scope: 'project', scopeId: 'demo', exactSessionId: 'session-plan',
  taskId: 'task-plan', anchorMessageId: 'message-plan', generation: 1, contentStored: false, visibility: 'default',
}
const requirementPlan = (revision, sequence, steps, expectedResults = []) => ({
  ...base, eventId: `plan-${revision}`, eventType: 'requirement_plan', sequence,
  createdAt: new Date(1_780_000_000_000 + sequence * 1000).toISOString(), display: { title: '实施计划', status: 'running' },
  detail: { requirementPlan: {
    schema: 'ccm-user-visible-requirement-plan-v1', planId: 'task-plan', revision, title: '统一计划视图', goal: '只显示一个计划主视图',
    steps, scope: ['项目会话'], expectedResults, exclusions: ['不改变全局会话 Plan 行为'], status: 'ready',
    createdAt: new Date(1_780_000_000_000).toISOString(), updatedAt: new Date(1_780_000_000_000 + sequence * 1000).toISOString(),
    planChecksum: `checksum-${revision}`, contentStored: false,
  } },
})
const v1 = requirementPlan(1, 1, [
  { id: 'a', title: '旧步骤', status: 'pending' },
  { id: 'b', title: '保留步骤', status: 'pending' },
], ['旧验收'])
const v2 = requirementPlan(2, 2, [
  { id: 'b', title: '已调整步骤', status: 'pending' },
  { id: 'c', title: '新增步骤', status: 'pending' },
], ['新验收'])

const ready = projectActiveTaskPlans([v1, v2], { exactSessionId: base.exactSessionId })[0]
assert.equal(ready.status, 'ready')
assert.deepEqual(ready.revisionDelta, { added: 1, changed: 2, removed: 1 })
assert.deepEqual(ready.acceptanceCriteria, ['新验收'])

const started = { ...base, eventId: 'agent-started', eventType: 'agent_started', sequence: 3, createdAt: new Date(1_780_000_003_000).toISOString(), display: { title: '项目 Agent', status: 'running' } }
assert.equal(projectActiveTaskPlans([v1, v2, started], { exactSessionId: base.exactSessionId })[0].status, 'executing', '确认后的真实活动必须让同一计划原位切换为执行清单')

const planOnlyCard = { phase: 'needs_user', requires_confirmation: true, actions: [{ kind: 'confirm_plan', enabled: true }, { kind: 'revise_plan', enabled: true }] }
assert.equal(taskCardNeedsConversationControl(planOnlyCard), true)
assert.equal(taskCardNeedsConversationControl(planOnlyCard, { planOwnedByDock: true }), false, '计划主视图存在时不得重复显示任务确认卡')
assert.equal(taskCardNeedsConversationControl({ ...planOnlyCard, phase: 'blocked', actions: [{ kind: 'retry', enabled: true }] }, { planOwnedByDock: true }), true, '非计划阻塞控制必须保留')

for (const file of [
  'frontend/src/components/projects/ProjectManager.template.html',
  'frontend/src/components/collaboration/GroupChat.template.html',
]) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  assert.match(source, /plan-owned-by-dock=/, `${file} 必须接入共享计划归属`)
  assert.match(source, /<ActiveTaskPlanDock/, `${file} 必须使用共享计划主视图`)
}

console.log(JSON.stringify({ pass: true, schema: 'ccm-conversation-plan-primary-surface-selftest-v1' }, null, 2))
