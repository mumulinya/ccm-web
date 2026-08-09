import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-context-policy-selftest-'))
process.env.CCM_MODEL_TOKEN_PREFLIGHT_DIR = path.join(tempRoot, 'calibration')
const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const policy = require(path.join(root, 'ccm-package', 'dist', 'tools', 'main-agent-context-policy.js'))
const preflight = require(path.join(root, 'ccm-package', 'dist', 'system', 'model-token-preflight.js'))

try {
  const skills = Array.from({ length: 40 }, (_, index) => ({
    name: `skill-${String(index + 1).padStart(2, '0')}`,
    description: `第 ${index + 1} 个 Skill 的说明。`.repeat(40),
    origin: index < 2 ? 'internal' : 'external',
  }))
  const catalog32k = policy.buildDynamicSkillCatalogPrompt({ label: '自测', skills, contextWindow: 32_000, budgetPercent: 1, recentlyInvokedSkillNames: ['skill-40'] })
  const catalog200k = policy.buildDynamicSkillCatalogPrompt({ label: '自测', skills, contextWindow: 200_000, budgetPercent: 1, recentlyInvokedSkillNames: ['skill-40'] })
  const catalog516k = policy.buildDynamicSkillCatalogPrompt({ label: '自测', skills, contextWindow: 516_000, budgetPercent: 1, recentlyInvokedSkillNames: ['skill-40'] })
  const catalogCustom = policy.buildDynamicSkillCatalogPrompt({ label: '自测', skills, contextWindow: 80_000, budgetPercent: 2.5, recentlyInvokedSkillNames: ['skill-40'] })
  const deferred = policy.resolveMcpToolLoadingDecision({ mcpToolLoadingMode: 'deferred' }, 200_000, 1_000)
  const autoBelow = policy.resolveMcpToolLoadingDecision({ mcpToolLoadingMode: 'auto', mcpToolAutoThresholdPercent: 10 }, 200_000, 19_999)
  const autoAbove = policy.resolveMcpToolLoadingDecision({ mcpToolLoadingMode: 'auto', mcpToolAutoThresholdPercent: 10 }, 200_000, 20_001)
  const inlineOverflow = policy.resolveMcpToolLoadingDecision({ mcpToolLoadingMode: 'inline' }, 32_000, 20_000)
  const inherited = policy.resolveMainAgentContextPolicy({}, { mcpToolLoadingMode: 'auto', postCompactSkillTotalMaxTokens: 30_000 })
  const sourceSnakeCase = policy.readMainAgentContextPolicy({ context_source_catalog_budget_percent: 2, context_source_hydration_budget_percent: 20, post_compact_source_per_item_max_tokens: 4_000, post_compact_source_total_max_tokens: 16_000 })
  const clearedSourceOverride = policy.updateMainAgentContextPolicyOverride({ contextSourceHydrationBudgetPercent: 30 }, { context_source_hydration_budget_percent: null }, {})
  let invalidSourcePairRejected = false
  try { policy.readMainAgentContextPolicy({ postCompactSourcePerItemMaxTokens: 6_000, postCompactSourceTotalMaxTokens: 5_000 }) } catch { invalidSourcePairRejected = true }

  const modelConfig = { format: 'anthropic-compatible', apiUrl: 'https://calibration.example.test/v1', model: 'selftest-model', providerNativeCacheFamily: 'anthropic' }
  for (let index = 0; index < 12; index += 1) {
    preflight.recordModelTokenCalibration(modelConfig, { estimatedTokens: 1_000, observedTokens: 1_180 + index })
  }
  preflight.recordModelTokenCalibration(modelConfig, { estimatedTokens: 1_000, observedTokens: 2_500 })
  const estimate = preflight.estimateModelTextTokens('x'.repeat(4_000), modelConfig)
  const calibration = preflight.readModelTokenCalibration(modelConfig)
  const checks = {
    allSkillNamesRetainedAt32k: skills.every(item => catalog32k.prompt.includes(`- ${item.name}`)),
    dynamicBudgetGrowsWithWindow: catalog200k.targetTokens > catalog32k.targetTokens,
    capacitiesUseConfiguredPercent: catalog32k.targetTokens === 320 && catalog200k.targetTokens === 2_000 && catalog516k.targetTokens === 5_160 && catalogCustom.targetTokens === 2_000,
    stablePriorityOrdering: catalog200k.prompt.indexOf('- skill-40') < catalog200k.prompt.indexOf('- skill-01') && catalog200k.prompt.indexOf('- skill-01') < catalog200k.prompt.indexOf('- skill-03'),
    descriptionsAreBounded: catalog516k.prompt.split('\n').filter(line => line.startsWith('- ') && line.includes(': ')).every(line => line.slice(line.indexOf(': ') + 2).replace(/…$/, '').length <= 250),
    deferredNeverInlinesOptionalSchemas: deferred.inline === false,
    autoUsesTenPercentThreshold: autoBelow.inline === true && autoAbove.inline === false && autoBelow.autoThresholdTokens === 20_000,
    inlineHasFinalSafetyDowngrade: inlineOverflow.inline === false && inlineOverflow.safetyDowngraded === true,
    scopeOverrideInheritsUnspecifiedValues: inherited.effective.mcpToolLoadingMode === 'auto' && inherited.effective.skillCatalogBudgetPercent === 1 && inherited.effective.postCompactSkillTotalMaxTokens === 30_000,
    restoreDefaultsMatchCc: policy.DEFAULT_MAIN_AGENT_CONTEXT_POLICY.postCompactSkillPerItemMaxTokens === 5_000 && policy.DEFAULT_MAIN_AGENT_CONTEXT_POLICY.postCompactSkillTotalMaxTokens === 25_000,
    sourceDefaultsAndSnakeCase: policy.DEFAULT_MAIN_AGENT_CONTEXT_POLICY.contextSourceCatalogBudgetPercent === 1 && policy.DEFAULT_MAIN_AGENT_CONTEXT_POLICY.contextSourceHydrationBudgetPercent === 10 && sourceSnakeCase.contextSourceCatalogBudgetPercent === 2 && sourceSnakeCase.contextSourceHydrationBudgetPercent === 20,
    sourceOverrideNullClears: !('contextSourceHydrationBudgetPercent' in clearedSourceOverride),
    invalidSourcePairRejected,
    calibrationWritesV2WithoutContent: calibration.calibration?.schema === 'ccm-model-token-calibration-v2' && calibration.calibration?.contentStored === false && !('content' in calibration.calibration),
    outlierRejectedAfterWarmup: Number(calibration.calibration?.rejectedSamples || 0) >= 1,
    calibratedGateNeverBelowRaw: estimate.calibratedTokens >= estimate.rawTokens && estimate.safetyAdjustedTokens >= estimate.calibratedTokens,
    positiveP95GuardLearned: Number(estimate.calibrationP95Ratio || 0) >= 1 && Number(estimate.calibrationP95PositiveDriftTokens || 0) > 0,
  }
  const result = { pass: Object.values(checks).every(Boolean), checks, calibration: { schema: calibration.calibration?.schema, samples: calibration.calibration?.samples, rejectedSamples: calibration.calibration?.rejectedSamples, checksum: crypto.createHash('sha256').update(JSON.stringify(calibration.calibration || null)).digest('hex').slice(0, 16) } }
  console.log(JSON.stringify(result, null, 2))
  if (!result.pass) process.exitCode = 1
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
