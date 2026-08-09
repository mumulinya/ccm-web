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

// ---------------------------------------------------------------------------
// 不变量 3：tool_use 与 tool_result 不得跨压缩边界被拆散
// ---------------------------------------------------------------------------
const toolClosure = selfTests.runGroupToolClosureBoundarySelfTest()

// 防空转：既有的 noSplitToolResultPairs 断言挂在纯文本夹具上恒真，
// 这里必须先证明夹具里真的有工具块。
assert.equal(
  toolClosure.checks.fixtureActuallyContainsToolBlocks,
  true,
  '夹具必须真的包含 tool_use/tool_result 块，否则断言恒真',
)
assert.equal(
  toolClosure.checks.detectsGenuinelySplitPair,
  true,
  `故意拆散的窗口必须被检出(missingToolUseIds=${JSON.stringify(toolClosure.missingToolUseIds)})`,
)
assert.equal(
  toolClosure.checks.adjustmentMovesBoundaryBack,
  true,
  `边界必须回退以保住闭包(${toolClosure.splitKeepIndex} -> ${toolClosure.adjustedKeepIndex})`,
)
assert.equal(toolClosure.checks.adjustedWindowKeepsPairsIntact, true, '修正后不得再有拆散的工具配对')
assert.equal(toolClosure.pass, true, JSON.stringify(toolClosure.checks))

// ---------------------------------------------------------------------------
// 不变量 5 / 15：摘要不含完整 diff 与终端日志；截断摘要必须被质量门拒绝
// ---------------------------------------------------------------------------
const bulkArtifacts = selfTests.runGroupSummaryExcludesBulkArtifactsSelfTest()

assert.equal(
  bulkArtifacts.checks.fixtureActuallyContainsBulkArtifacts,
  true,
  '夹具必须真的塞进大块 diff 与终端日志',
)
assert.equal(bulkArtifacts.checks.summaryExcludesDiffBody, true, '摘要不得包含 diff 正文')
assert.equal(bulkArtifacts.checks.summaryExcludesTerminalLog, true, '摘要不得包含终端日志正文')
assert.equal(
  bulkArtifacts.checks.summaryStillKeepsActionableFacts,
  true,
  '排除大块内容不能靠"丢掉一切"实现，可复用事实必须保留',
)
assert.equal(
  bulkArtifacts.checks.truncatedSummaryIsRejected,
  true,
  '字符截断出来的摘要必须被质量门拒绝(不变量 15)',
)
assert.equal(bulkArtifacts.checks.healthySummaryStillPasses, true, '正常摘要必须仍能通过质量门')
assert.equal(bulkArtifacts.pass, true, JSON.stringify(bulkArtifacts.checks))

// ---------------------------------------------------------------------------
// 不变量 20：未验证推测在压缩后仍保持 hypothesis 状态
// ---------------------------------------------------------------------------
const hypothesisState = selfTests.runGroupHypothesisStatePreservationSelfTest()

assert.equal(hypothesisState.checks.explicitAssumptionIsExtracted, true, '结构化待验证假设必须进入摘要')
assert.equal(hypothesisState.checks.normalizedSummaryKeepsHypothesisField, true, 'normalize 后不得丢失 hypothesis 状态')
assert.equal(hypothesisState.checks.renderedSummaryLabelsHypothesisAsUnverified, true, '模型可见摘要必须明确标注待验证假设')
assert.equal(hypothesisState.checks.healthyHypothesisSummaryPasses, true, '正确保留假设的摘要应通过质量门')
assert.equal(hypothesisState.checks.promotedHypothesisIsRejected, true, '把假设提升为决定/完成态时质量门必须拒绝')
assert.equal(hypothesisState.pass, true, JSON.stringify(hypothesisState.checks))

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
    tool_closure_not_split: {
      pass: toolClosure.pass,
      split_keep_index: toolClosure.splitKeepIndex,
      adjusted_keep_index: toolClosure.adjustedKeepIndex,
      missing_tool_use_ids: toolClosure.missingToolUseIds,
      checks: toolClosure.checks,
    },
    summary_excludes_bulk_artifacts: {
      pass: bulkArtifacts.pass,
      source_chars: bulkArtifacts.sourceChars,
      summary_chars: bulkArtifacts.summaryChars,
      checks: bulkArtifacts.checks,
    },
    hypothesis_state_preserved: {
      pass: hypothesisState.pass,
      checks: hypothesisState.checks,
    },
  },
}, null, 2))
