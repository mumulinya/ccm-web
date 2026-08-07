import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'

// 审计文档《CC源码对照记忆压缩实现审计需求文档》第 11 节要求的压缩不变量。
// 这些断言此前在仓库里没有任何可执行覆盖：模块自检函数虽然存在，但没有任何
// scripts/*.mjs 调用它们，等于永远不会在 CI 里跑到。
//
// 每条断言都带一个"防空转"前置条件——夹具必须真的走到被测路径，否则逻辑坏掉
// 时测试仍会通过（仓库里已有过这样的假绿灯：noSplitToolResultPairs 断言挂在
// 一个完全不含 tool_use/tool_result 块的纯文本夹具上）。

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const selfTests = require(path.join(root, 'ccm-package/dist/modules/collaboration/group-memory-compaction-self-tests.js'))

// ---------------------------------------------------------------------------
// 不变量 1：未达 Token 阈值时不执行正式压缩
// ---------------------------------------------------------------------------
const belowThreshold = await selfTests.runGroupMemoryBelowThresholdNoCompactSelfTest()

assert.equal(
  belowThreshold.checks.fixtureIsGenuinelyBelowThreshold,
  true,
  `夹具 token(${belowThreshold.totalTokens}) 必须低于阈值(${belowThreshold.threshold})`,
)
// 防空转：保留窗按 token 计算，若所有消息都落在窗内则 keepIndex=0，
// 这种情况下即使阈值判断完全坏掉也不会压缩，断言就失去意义。
assert.equal(
  belowThreshold.checks.fixtureHasEligibleOlderMessages,
  true,
  `夹具必须存在落在保留窗之外的旧消息(keepIndex=${belowThreshold.keepIndex})，否则测试是空转`,
)
assert.equal(belowThreshold.checks.doesNotCompactBelowThreshold, true, '未达阈值时不得压缩')
assert.equal(
  belowThreshold.checks.skipReasonIsThresholdNotEmptyWindow,
  true,
  '跳过原因必须是"压力未达阈值"，不能是"没有可压缩的消息"',
)
assert.equal(belowThreshold.checks.boundaryNotAdvanced, true, '未压缩时不得推进 Boundary')
assert.equal(belowThreshold.checks.rawMessagesRemainImmutable, true, '原始消息不得被改写')
assert.equal(belowThreshold.pass, true, JSON.stringify(belowThreshold.checks))

// ---------------------------------------------------------------------------
// 不变量 8：候选摘要生成失败时，旧摘要与旧 Boundary 原封不动
// ---------------------------------------------------------------------------
const summaryFailure = await selfTests.runGroupMemorySummaryFailureKeepsStateSelfTest()

// 防空转：摘要器必须真的被调用过，否则"失败后状态不变"是废话
assert.equal(
  summaryFailure.checks.modelSummarizerWasActuallyInvoked,
  true,
  '注入的摘要器必须真的被调用，否则该测试是空转',
)
assert.equal(summaryFailure.checks.summaryFailurePropagates, true, '摘要失败必须冒泡，不得被静默吞掉')
assert.equal(
  summaryFailure.checks.callerMemoryRemainsUntouched,
  true,
  '失败时调用方持有的 memory 对象不得被就地改写',
)
assert.equal(
  summaryFailure.checks.compactionStillCarriesOriginalSummaryChecksum,
  true,
  '失败时不得覆盖旧摘要 checksum',
)
assert.equal(summaryFailure.checks.compactionBoundaryUnchanged, true, '失败时不得推进 Boundary')
assert.equal(summaryFailure.pass, true, JSON.stringify(summaryFailure.checks))

console.log(JSON.stringify({
  schema: 'ccm-group-compaction-invariant-selftest-v1',
  pass: true,
  invariants: {
    below_threshold_no_compact: {
      pass: belowThreshold.pass,
      total_tokens: belowThreshold.totalTokens,
      threshold: belowThreshold.threshold,
      keep_index: belowThreshold.keepIndex,
      checks: belowThreshold.checks,
    },
    summary_failure_keeps_state: {
      pass: summaryFailure.pass,
      model_was_invoked: summaryFailure.modelWasInvoked,
      failure_message: summaryFailure.failureMessage,
      checks: summaryFailure.checks,
    },
  },
}, null, 2))
