#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'

const replay = fs.readFileSync('frontend/src/components/system/TraceReplay.vue', 'utf8')
const transcript = fs.readFileSync('frontend/src/components/common/AgentExecutionTranscript.vue', 'utf8')
const insights = fs.readFileSync('frontend/src/components/replay/TaskReplayInsights.vue', 'utf8')
const executive = fs.readFileSync('frontend/src/components/replay/TaskReplayExecutiveSummary.vue', 'utf8')

assert.match(replay, /const replayView = ref\('summary'\)/, '任务回放必须默认进入摘要视图')
assert.match(replay, /const replaySections = computed/, '任务回放导航必须随视图动态生成')
assert.match(replay, /\{ id: 'execution', label: '执行记录' \}/, '摘要导航必须包含统一执行记录')
assert.match(replay, /<template v-if="replayView === 'advanced'">/, '审计内容必须只在完整记录中渲染')
assert.ok(
  replay.indexOf('id="replay-section-execution"') < replay.indexOf('<template v-if="replayView === \'advanced\'">'),
  '摘要视图必须先展示统一执行记录，随后才是完整记录内容',
)
assert.match(replay, /:show-completion-summary="false"/, '任务回放必须隐藏共享组件中重复的任务总结')
assert.match(replay, /section="actions"/, '待处理动作必须保留在摘要层')
assert.match(replay, /section="integrity"/, '完整记录必须保留完整度投影')
assert.match(replay, /section="causal"/, '完整记录必须保留因果链投影')
assert.match(replay, /section="work_item_attempts"/, '工作项重试必须作为独立技术诊断保留')
assert.doesNotMatch(replay, /section="attempts"/, '旧的重复尝试对比入口必须移除')
assert.match(replay, /id="replay-section-technical"/, '资源使用与保留策略必须归入技术详情')
assert.match(
  replay,
  /@media \(max-width: 720px\)[\s\S]*?\.replay-chapter-nav\s*\{[\s\S]*?margin:\s*-12px -12px 12px;/,
  '移动端章节导航必须与 12px 页面边距对齐，不得产生横向溢出',
)

assert.match(transcript, /showCompletionSummary: \{ type: Boolean, default: true \}/)
assert.match(transcript, /showCompletionFiles: \{ type: Boolean, default: true \}/)
assert.match(insights, /工作项返工诊断/)
assert.match(insights, /<details v-if="section === 'work_item_attempts'/, '工作项返工诊断必须默认收起')
assert.match(executive, /正式交付文件/)
assert.match(executive, /执行次数/)

console.log(JSON.stringify({
  pass: true,
  checks: {
    summaryDefault: true,
    advancedOnlyDiagnostics: true,
    sharedExecutionRecord: true,
    duplicateSummaryRemoved: true,
    workItemAttemptsCollapsed: true,
  },
}))
