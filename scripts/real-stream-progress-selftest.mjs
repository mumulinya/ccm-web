import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const events = require('../ccm-package/dist/system/user-visible-agent-events.js')
const { createModelActivityController, createSafeJsonReplyDeltaExtractor } = require('../ccm-package/dist/system/model-activity.js')

let projectReply = ''
const project = createSafeJsonReplyDeltaExtractor(delta => { projectReply += delta })
for (const chunk of ['{"response', 'Type":"reply","reply":"你好\\n', '这是**真实流式**回答，含\\u4e2d', '\\u6587。","toolRequests":[]}']) project.push(chunk)
assert.equal(projectReply, '你好\n这是**真实流式**回答，含中文。')

let leakedToolJson = ''
const toolDecision = createSafeJsonReplyDeltaExtractor(delta => { leakedToolJson += delta })
toolDecision.push('{"responseType":"tool_calls","reply":"内部工具决策不得展示","toolRequests":[]}')
assert.equal(leakedToolJson, '')

let globalReply = ''
const global = createSafeJsonReplyDeltaExtractor(delta => { globalReply += delta })
global.push('{"state":"answer","message":"全局回答","tool":null}')
assert.equal(globalReply, '全局回答')

const activityEvents = []
const unsubscribe = events.subscribeUserVisibleAgentEvents(event => {
  if (event.eventType === 'model_activity') activityEvents.push(event)
})
const activity = createModelActivityController({
  scope: 'project', scopeId: 'demo', exactSessionId: 'session-stream', turnId: 'turn-stream',
  modelCallIndex: 1, phase: 'tool_result_review', waitingThresholdMs: 10,
})
await new Promise(resolve => setTimeout(resolve, 20))
activity.onRetry(2)
activity.onDelta('答')
activity.complete()
unsubscribe()
assert.deepEqual(activityEvents.map(event => event.detail.modelActivity.state), ['started', 'waiting', 'retrying', 'streaming', 'completed'])
assert.equal(activityEvents.some(event => /prompt|reasoning|thinking/i.test(JSON.stringify(event))), false)

for (const file of [
  'backend/server.ts',
  'backend/modules/collaboration/group-live-routes.ts',
  'backend/modules/global/global-agent-api.ts',
]) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  assert.equal(/streamBuffered(?:Conversation|Coordinator|Global)Reply/.test(source), false, `${file} 不得保留伪流式播放器`)
  assert.equal(/setTimeout\(resolve,\s*14\)/.test(source), false, `${file} 不得按14ms播放已完成回答`)
}

for (const file of [
  'backend/modules/projects/project-main-agent.ts',
  'backend/modules/collaboration/group-orchestrator-llm.ts',
  'backend/modules/global/global-agent-agentic-runtime.ts',
]) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  assert.match(source, /phase:\s*["']final_synthesis["']/, `${file} 必须为不支持结构化流式的Provider提供独立最终整理调用`)
  assert.match(source, /fallbackStreamCount/, `${file} 必须记录降级流式次数`)
}

console.log(JSON.stringify({ pass: true, projectReply, globalReply, activityStates: activityEvents.map(event => event.detail.modelActivity.state) }, null, 2))
