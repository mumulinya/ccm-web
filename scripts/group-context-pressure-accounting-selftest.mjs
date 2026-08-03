import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const compaction = require(path.join(root, 'ccm-package/dist/modules/collaboration/group-compaction-engine.js'))
const memoryCenter = require(path.join(root, 'ccm-package/dist/modules/knowledge/memory-control-center-api.js'))

const partialTrigger = {
  schema: 'ccm-model-visible-payload-snapshot-v1',
  scope: 'group',
  sessionId: 'group-a:gcs-a',
  tokenBreakdown: {
    system: 0,
    tools: 0,
    rules: 0,
    skills: 0,
    mcpTools: 0,
    subagentDefinitions: 0,
    recentMessages: 735,
  },
  totalTokens: 735,
  payloadChecksum: 'partial-payload',
  fixedContextChecksum: 'empty-fixed',
}
const providerBaseline = {
  valid: true,
  event: {
    token_breakdown: {
      system: 25_649,
      tools: 0,
      rules: 871,
      skills: 1_450,
      mcpTools: 3_247,
      subagentDefinitions: 54,
      recentMessages: 1_456,
    },
    accounting_total_tokens: 32_727,
    payload_checksum: 'provider-payload',
    fixed_context_checksum: 'provider-fixed',
  },
}

const pressure = compaction.buildGroupPressureAccountingSelection(partialTrigger, providerBaseline, 'group-a', 'gcs-a')
assert.equal(pressure.triggerFixedTokens, 0)
assert.equal(pressure.measurementPayload, null)
assert.equal(pressure.persistedAccounting.totalTokens, 32_727)
assert.equal(pressure.persistedAccounting.tokenBreakdown.skills, 1_450)
assert.equal(pressure.persistedAccounting.tokenBreakdown.mcpTools, 3_247)

const selected = memoryCenter.selectMemoryCenterContextAccounting({
  scope: 'group',
  stored: { ...partialTrigger, schema: 'ccm-model-visible-payload-accounting-v1' },
  provider: pressure.persistedAccounting,
})
assert.equal(selected.source, 'provider_payload_accounting')
assert.equal(selected.payload.totalTokens, 32_727)
assert.equal(memoryCenter.isCompleteMemoryCenterContextAccounting(selected.payload), true)
assert.equal(memoryCenter.isCompleteMemoryCenterContextAccounting(partialTrigger), false)

const completeTrigger = {
  ...partialTrigger,
  tokenBreakdown: { ...partialTrigger.tokenBreakdown, system: 4_000, rules: 400 },
  totalTokens: 5_135,
}
const completePressure = compaction.buildGroupPressureAccountingSelection(completeTrigger, providerBaseline, 'group-a', 'gcs-a')
assert.equal(completePressure.measurementPayload, completeTrigger)
assert.equal(completePressure.persistedAccounting.totalTokens, 5_135)

console.log(JSON.stringify({
  pass: true,
  checks: 12,
  restoredTokens: selected.payload.totalTokens,
  percentAt496k: Number((selected.payload.totalTokens / 496_000 * 100).toFixed(1)),
  paidProviderCalls: 0,
}, null, 2))
