import assert from 'node:assert/strict'
import { compactTaskReplayEvents, replayCompactionStats } from '../frontend/src/utils/taskReplayEventCompaction.js'

const base = {
  stage: 'execution',
  category: 'agent_status_update',
  status: 'running',
  actor: { type: 'project_agent', label: 'demo-agent' },
  task_id: 'task-1',
  project: 'demo',
  evidence_ids: [],
}

const raw = [
  { ...base, id: 'e1', at: '2026-07-26T10:00:00.000Z', title: 'Agent 正在执行', summary: '正在读取项目。' },
  { ...base, id: 'e2', at: '2026-07-26T10:00:02.000Z', title: 'Agent 正在执行', summary: '正在读取项目。', evidence_ids: ['proof-1'] },
  { ...base, id: 'e-gap', at: '2026-07-26T10:00:03.000Z', stage: 'planning', category: 'plan', title: '计划已确认', summary: '准备进入开发。', status: 'passed' },
  { ...base, id: 'e3', at: '2026-07-26T10:00:05.000Z', title: 'Agent 正在执行', summary: '正在读取项目。', status: 'passed' },
  { ...base, id: 'e4', at: '2026-07-26T10:00:06.000Z', stage: 'test', category: 'test_result', title: 'TestAgent 验收', summary: '验证通过。', status: 'passed' },
  { ...base, id: 'e5', at: '2026-07-26T10:00:07.000Z', stage: 'test', category: 'test_result', title: 'TestAgent 验收', summary: '验证失败。', status: 'failed' },
]

const compact = compactTaskReplayEvents(raw)
assert.equal(compact.length, 4, 'identical progress events should merge without swallowing intervening key events')
assert.equal(compact[0].group_count, 3)
assert.deepEqual(compact[0].raw_event_ids, ['e1', 'e2', 'e3'])
assert.deepEqual(compact[0].evidence_ids, ['proof-1'])
assert.equal(compact[0].status, 'passed', 'the visible node should show the latest status')
assert.equal(compact[1].id, 'e-gap')
assert.equal(compact[2].id, 'e4')
assert.equal(compact[3].id, 'e5', 'different verification result must remain a separate key node')
assert.deepEqual(replayCompactionStats(raw, compact), { raw: 6, visible: 4, merged: 2, groups: 1 })
assert.equal(raw[0].raw_events, undefined, 'raw audit events must not be mutated')

console.log('task replay event compaction self-test passed')
