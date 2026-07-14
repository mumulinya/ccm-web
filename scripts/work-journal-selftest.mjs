import assert from 'node:assert/strict'
import {
  generateEvidenceDailyReport,
  mergeWorkJournalEvents,
  runWorkJournalSelfTest,
} from '../ccm-package/dist/modules/scheduling/work-journal.js'

const contract = runWorkJournalSelfTest()
assert.equal(contract.pass, true)

const events = [
  {
    schema: 'ccm-work-journal-event-v1',
    id: 'request-monday',
    at: '2026-07-06T02:00:00.000Z',
    type: 'task_created',
    state: 'pending',
    actor_type: 'user',
    actor_label: '你',
    source: 'group_chat',
    source_label: '群聊协作',
    title: '完成退款审批功能',
    detail: '实现退款审批',
    task_id: 'refund-task',
    group_id: 'refund-group',
    project: 'refund-app',
    work_id: 'refund-task',
    evidence_level: 'strong',
    evidence_ref: 'fixture#created',
    metadata: {},
  },
  {
    schema: 'ccm-work-journal-event-v1',
    id: 'complete-friday',
    at: '2026-07-10T08:00:00.000Z',
    type: 'task_completed',
    state: 'done',
    actor_type: 'agent',
    actor_label: '群聊主 Agent',
    source: 'task',
    source_label: '任务执行',
    title: '完成退款审批功能',
    detail: '已验收',
    task_id: 'refund-task',
    group_id: 'refund-group',
    project: 'refund-app',
    work_id: 'refund-task',
    evidence_level: 'strong',
    evidence_ref: 'fixture#completed',
    metadata: {},
  },
  {
    schema: 'ccm-work-journal-event-v1',
    id: 'automation-friday',
    at: '2026-07-10T09:00:00.000Z',
    type: 'automation_run',
    state: 'done',
    actor_type: 'system',
    actor_label: '自动开发',
    source: 'automation',
    source_label: '自动开发',
    title: '生成工作复盘',
    detail: '无人值守任务已完成',
    task_id: '',
    group_id: '',
    project: '',
    work_id: 'automation:daily-report',
    evidence_level: 'strong',
    evidence_ref: 'fixture#automation',
    metadata: {},
  },
]

const monday = generateEvidenceDailyReport('2026-07-06', events)
const friday = generateEvidenceDailyReport('2026-07-10', events)
assert.equal(monday.summary.done_tasks, 0)
assert.equal(friday.summary.done_tasks, 1)
assert.equal(monday.ownership.user_actions, 1)
assert.equal(friday.ownership.agent_actions, 1)
assert.equal(friday.ownership.system_actions, 1)
assert.match(friday.markdown, /## Agent 今天推进的工作/)
assert.doesNotMatch(friday.markdown.split('## Agent 今天推进的工作')[1].split('## 系统自动化')[0], /生成工作复盘/)
assert.match(friday.markdown, /## 系统自动化/)
assert.match(friday.markdown.split('## 系统自动化')[1].split('## 验收与质量')[0], /生成工作复盘/)
assert.equal(friday.immutable_source, true)
assert.equal(friday.schema, 'ccm-evidence-work-report-v2')
assert.deepEqual(mergeWorkJournalEvents(events, events).appended, [])

console.log(JSON.stringify({
  pass: true,
  contract,
  historicalSnapshot: {
    mondayDone: monday.summary.done_tasks,
    fridayDone: friday.summary.done_tasks,
  },
  ownership: {
    monday: monday.ownership,
    friday: friday.ownership,
  },
}, null, 2))
