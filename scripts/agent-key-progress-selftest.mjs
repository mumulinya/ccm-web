import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const progress = require('../ccm-package/dist/system/agent-key-progress.js')
const events = require('../ccm-package/dist/system/user-visible-agent-events.js')

const result = progress.runAgentKeyProgressSelfTest()
assert.equal(result.schema, 'ccm-agent-key-progress-v1')
assert.equal(result.singleTool, false, 'single-tool first round must not add a summary model call')
assert.equal(result.multiTool, true, 'multi-tool round must request one key summary')
assert.equal(result.secondRound, true, 'second tool round must request one key summary')
assert.equal(result.passed, true)

const normalized = events.normalizeUserVisibleAgentEvent({
  eventId: 'key-progress-selftest',
  scope: 'project',
  scopeId: 'demo',
  exactSessionId: 'session-demo',
  generation: 3,
  turnId: 'turn-demo',
  eventType: 'assistant_progress',
  display: { title: '项目主 Agent', summary: '已确认配置路径，正在核对请求协议', status: 'success' },
  detail: {
    progress: { kind: 'before_summary', text: '已确认配置路径，正在核对请求协议', modelCallIndex: 2, relatedToolCallIds: ['tool-1'], batchId: 'batch-1', milestoneChecksum: 'checksum' },
    keyProgress: {
      schema: 'ccm-agent-key-progress-v1',
      eventId: 'key-progress-selftest',
      kind: 'model_key_summary',
      source: 'summary_model',
      status: 'success',
      round: 1,
      text: '已确认配置路径，正在核对请求协议',
      modelCallIndex: 2,
      toolCallIds: ['tool-1'],
      relatedEventIds: [],
      contentStored: false,
    },
  },
})
assert.equal(normalized.detail.keyProgress.schema, 'ccm-agent-key-progress-v1')
assert.equal(normalized.detail.keyProgress.eventId, normalized.eventId)
assert.equal(normalized.detail.keyProgress.contentStored, false)
assert.equal(/prompt|reasoning|stdout|api[_-]?key/i.test(JSON.stringify(normalized)), false)

for (const file of [
  'backend/modules/projects/project-native-query-adapter.ts',
  'backend/modules/collaboration/group-native-query-adapter.ts',
]) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  assert.match(source, /firstModelPreamble\s*=\s*String\(delta\)\.trim\(\)/, `${file} must buffer model preambles`)
  assert.match(source, /keyProgress\.toolBatchStarted/, `${file} must project deterministic tool batch start`)
  assert.match(source, /keyProgress\.toolBatchCompleted/, `${file} must project deterministic tool batch completion`)
  assert.match(source, /keyProgress\.summarizeToolBatch/, `${file} must use the shared hybrid summary gate`)
  assert.doesNotMatch(source, /keyProgress\.modelPreamble\(delta/, `${file} must not create an execution record for a no-tool reply`)
}

const transcriptSource = fs.readFileSync(new URL('../frontend/src/components/common/AgentExecutionTranscript.vue', import.meta.url), 'utf8')
assert.match(transcriptSource, /detail\?\.keyProgress\?\.text/, 'completed and replayed progress must prefer the persisted safe milestone')
assert.match(transcriptSource, /expansionStorageKey/, 'expansion must remain bound to the exact transcript instead of disappearing on click')
assert.match(transcriptSource, /ccm:manual-content-toggle/, 'manual expansion must protect the clicked record from bottom-follow scrolling')

const globalLoopSource = fs.readFileSync(new URL('../backend/agents/global/global-agent-loop-engine.ts', import.meta.url), 'utf8')
assert.match(globalLoopSource, /recordAgentKeyProgress/, 'global conversations must use the shared safe progress projection')
const taskStageSource = fs.readFileSync(new URL('../backend/system/task-execution-stage-projection.ts', import.meta.url), 'utf8')
assert.match(taskStageSource, /kind:\s*"verification_update"/, 'TestAgent progress must use the shared verification milestone')
assert.match(taskStageSource, /task-key-progress:/, 'task progress must keep stable replay identities')

console.log(JSON.stringify({ pass: true, result, normalized: normalized.detail.keyProgress }, null, 2))
