import assert from 'node:assert/strict'

const { isCanonicalGroupSessionMemory, modelVisibleGroupRuntimeState } = await import('../ccm-package/dist/modules/collaboration/group-runtime-memory-admission.js')
const { buildGroupMemoryContext } = await import('../ccm-package/dist/modules/collaboration/group-memory-context.js')

const memory = {
  goal: '完成支付回调改造',
  currentPhase: 'implementation',
  factAnchors: [
    { type: 'user_requirement', text: '111' },
    { type: 'user_requirement', text: '项目必须使用 MySQL，不能替换数据库' },
  ],
  decisions: [
    { decision: '普通对话：Agent intent gateway 不创建任务卡' },
    { decision: 'answer：Agent intent gateway 不创建任务卡' },
    { decision: '支付回调采用幂等键和唯一索引双重保护', reason: '避免重复入账' },
  ],
  nextActions: [
    { action: '我会直接回复用户，不创建任务卡' },
    { action: '完成支付回调幂等集成测试' },
  ],
}

const admitted = modelVisibleGroupRuntimeState(memory)
assert.equal(admitted.factAnchors.length, 1)
assert.equal(admitted.decisions.length, 1)
assert.equal(admitted.nextActions.length, 1)

const context = buildGroupMemoryContext(memory)
assert.doesNotMatch(context, /Agent intent gateway/)
assert.doesNotMatch(context, /直接回复用户/)
assert.doesNotMatch(context, /111/)
assert.match(context, /支付回调采用幂等键/)
assert.match(context, /完成支付回调幂等集成测试/)
assert.equal(isCanonicalGroupSessionMemory({ modelExtracted: false, deterministicFallback: true, hasSummary: true, markdownExists: true, markdownChecksumMatches: true }), false)
assert.equal(isCanonicalGroupSessionMemory({ modelExtracted: true, hasSummary: true, markdownExists: true, markdownChecksumMatches: true }), true)

console.log(JSON.stringify({ pass: true, checks: 10, transientRuntimeExcluded: true, localFallbackExcluded: true }, null, 2))
