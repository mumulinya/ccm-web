import assert from 'node:assert/strict'
import {
  isReplayDiagnosticEvent,
  replayActorLabel,
  replayEventTitle,
  replayFileStatusLabel,
  replayTechnicalLabel,
  replayWorkStatusLabel,
  sanitizeReplayText,
} from '../frontend/src/utils/taskReplayPresentation.js'

const persisted = {
  category: 'group.message_persisted',
  title: 'group.message_persisted',
  actor: { type: 'group_agent', label: 'coordinator' },
}
assert.equal(isReplayDiagnosticEvent(persisted), true)
assert.equal(replayEventTitle(persisted), '会话已保存本次进展')
assert.equal(replayActorLabel(persisted.actor), '群聊主 Agent')
assert.equal(replayActorLabel({ type: 'test_agent', label: 'test-agent' }), 'TestAgent（独立验收）')

assert.equal(isReplayDiagnosticEvent({
  category: 'task_log',
  status: 'info',
  summary: '任务状态更新为 running',
}), true)
assert.equal(isReplayDiagnosticEvent({
  category: 'test_result',
  status: 'passed',
  summary: '真实浏览器验证通过',
}), false)

assert.equal(replayFileStatusLabel('M'), '已修改')
assert.equal(replayFileStatusLabel('A'), '新增')
assert.equal(replayFileStatusLabel('D'), '已删除')
assert.equal(replayWorkStatusLabel('blocked'), '需处理')

assert.equal(replayTechnicalLabel('provider'), '模型服务')
assert.equal(replayTechnicalLabel('generation'), '会话代次')
assert.equal(replayTechnicalLabel('session_id'), '会话编号')
assert.equal(replayTechnicalLabel('trace_id'), '追踪编号')
assert.equal(replayTechnicalLabel('browser_flow'), '页面验收流程')
assert.equal(replayTechnicalLabel('console_errors'), '控制台错误数')
assert.equal(replayTechnicalLabel('semantic_decision'), '模型语义决策回执')
assert.equal(replayTechnicalLabel('criterion_coverage'), '验收标准覆盖')
assert.equal(replayTechnicalLabel('unplanned_criteria'), '未规划验收标准')
assert.equal(sanitizeReplayText('TestAgent 读取工作项回执与作用域'), 'TestAgent（独立验收） 读取执行步骤执行结果与任务来源')

console.log('task replay presentation self-test passed')
