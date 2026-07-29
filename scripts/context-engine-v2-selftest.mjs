import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-context-engine-v2-'))
process.env.CCM_PROVIDER_CACHE_CAPABILITY_DIR = path.join(temp, 'capability')
const require = createRequire(import.meta.url)
const engine = require(path.join(root, 'ccm-package', 'dist', 'system', 'provider-neutral-context-cache.js'))
const registry = require(path.join(root, 'ccm-package', 'dist', 'system', 'provider-cache-capability-registry.js'))
const probe = require(path.join(root, 'ccm-package', 'dist', 'system', 'provider-cache-capability-probe.js'))
const adapters = require(path.join(root, 'ccm-package', 'dist', 'system', 'provider-context-cache-adapters.js'))
const tokenPreflight = require(path.join(root, 'ccm-package', 'dist', 'system', 'model-token-preflight.js'))
const summaryQuality = require(path.join(root, 'ccm-package', 'dist', 'system', 'session-summary-quality-gate.js'))
const secondaryReview = require(path.join(root, 'ccm-package', 'dist', 'system', 'session-summary-secondary-review.js'))
const observability = require(path.join(root, 'ccm-package', 'dist', 'system', 'context-engine-observability.js'))
const recovery = require(path.join(root, 'ccm-package', 'dist', 'system', 'context-engine-recovery.js'))

try {
  const config = {
    apiUrl: 'https://gateway.example/v1?api_key=must-not-persist',
    format: 'openai-compatible',
    model: 'context-v2-mock',
    providerNativeCacheFamily: 'openai',
    inferenceBackendKind: 'vllm',
  }
  const messages = [
    { id: 'system', role: 'system', content: 'System prompt' },
    { id: 'rules', role: 'system', contextBlockType: 'rules', content: 'Project rules' },
    { id: 'skills', role: 'system', contextBlockType: 'skill', content: 'Selected skills' },
    { id: 'mcp', role: 'system', contextBlockType: 'mcp', content: 'MCP catalog' },
    { id: 'memory', role: 'system', contextBlockType: 'long_term_memory', content: 'Accepted memory' },
    { id: 'user', role: 'user', content: 'Implement feature' },
    { id: 'tool-use', role: 'assistant', type: 'tool_use', content: { name: 'read_file' } },
    { id: 'tool-result', role: 'user', type: 'tool_result', content: 'source result' },
  ]
  const prepared = engine.prepareProviderNeutralContextCacheRequest(messages, {
    scope: 'project', scopeId: 'project-a', sessionId: 'session-a', generation: 2, boundaryGeneration: 1,
    provider: 'openai', model: config.model, apiUrl: config.apiUrl, format: config.format,
    providerNativeCacheFamily: 'openai', inferenceBackendKind: 'vllm', contextWindowTokens: 10000,
    maxOutputTokens: 1000, reservedTokens: 500, mode: 'controlled',
  })
  assert.equal(prepared.plan.schema, 'ccm-context-plan-v2')
  assert.equal(prepared.plan.version, 2)
  assert.equal(engine.verifyProviderNeutralContextCachePlan(prepared.plan, { scope: 'project', scopeId: 'project-a', sessionId: 'session-a' }).valid, true)
  assert.deepEqual(new Set(prepared.plan.blocks.map(block => block.kind)), new Set(['system', 'rules', 'skill', 'mcp', 'long_term_memory', 'conversation', 'tool_use', 'tool_result']))
  assert.equal(prepared.plan.blocks.every(block => block.contentStored === false && !('content' in block)), true)
  assert.equal(prepared.plan.tokenGate.passed, true)
  assert.equal(prepared.plan.tokenGate.characterTruncationAllowed, false)
  assert.match(prepared.plan.tokenGate.estimationStrategy, /tiktoken/)
  assert.equal(prepared.plan.tokenGate.calibratedInputTokens > 0, true)
  assert.equal(JSON.stringify(prepared.plan).includes('must-not-persist'), false)

  const adaptiveSessionId = `session-adaptive-${Date.now()}`
  const adaptiveMessages = [
    { id: 'system-anchor', role: 'system', content: 'System anchor' },
    { id: 'volatile', role: 'system', contextBlockType: 'recovery', content: 'Current task status' },
    { id: 'rules-stable', role: 'system', contextBlockType: 'rules', content: 'Stable rules' },
    { id: 'skill-stable', role: 'system', contextBlockType: 'skill', content: 'Stable skill catalog' },
    { id: 'user-turn', role: 'user', content: 'Exact user turn' },
    { id: 'assistant-turn', role: 'assistant', content: 'Exact assistant turn' },
  ]
  const adaptiveFirst = engine.prepareProviderNeutralContextCacheRequest(adaptiveMessages, {
    scope: 'project', scopeId: 'project-adaptive', sessionId: adaptiveSessionId, generation: 1,
    provider: 'openai', model: 'adaptive-mock', contextWindowTokens: 10000, maxOutputTokens: 1000,
    mode: 'controlled', inputCostPerMillionTokens: 2, cacheReadCostPerMillionTokens: 0.5,
  })
  const adaptiveSecond = engine.prepareProviderNeutralContextCacheRequest(adaptiveMessages, {
    scope: 'project', scopeId: 'project-adaptive', sessionId: adaptiveSessionId, generation: 1,
    provider: 'openai', model: 'adaptive-mock', contextWindowTokens: 10000, maxOutputTokens: 1000,
    mode: 'controlled', inputCostPerMillionTokens: 2, cacheReadCostPerMillionTokens: 0.5,
  })
  assert.equal(adaptiveFirst.plan.adaptiveStablePrefix.reordered, true)
  assert.deepEqual(adaptiveSecond.messages.slice(-2).map(message => message.id), ['user-turn', 'assistant-turn'])
  assert.equal(adaptiveSecond.plan.materializationCache.status, 'hit')
  assert.equal(['memory_hot_cache', 'shared_state'].includes(adaptiveSecond.plan.materializationCache.source), true)
  const completion = engine.completeProviderNeutralContextCacheRequest(adaptiveSecond.plan, {
    ok: true,
    usage: { inputTokens: 1000, cacheReadInputTokens: 500 },
  })
  assert.equal(completion.estimatedInputCostUsd > 0, true)
  assert.equal(completion.cacheRecommendation.requiresProbe, false)
  assert.equal(completion.rollingMetrics.samples >= 1, true)

  const singleflightSessionId = `session-singleflight-${Date.now()}`
  const runtimeBefore = engine.readProviderNeutralContextCacheRuntimeStatus()
  const concurrent = await Promise.all(Array.from({ length: 6 }, () => engine.prepareProviderNeutralContextCacheRequestSingleflight(messages, {
    scope: 'group', scopeId: 'group-singleflight', sessionId: singleflightSessionId, generation: 1,
    provider: 'openai', model: 'singleflight-mock', contextWindowTokens: 10000, maxOutputTokens: 1000,
    mode: 'controlled',
  })))
  const runtimeAfter = engine.readProviderNeutralContextCacheRuntimeStatus()
  assert.equal(concurrent.length, 6)
  assert.equal(runtimeAfter.singleflight.owners - runtimeBefore.singleflight.owners, 1)
  assert.equal(runtimeAfter.singleflight.joins - runtimeBefore.singleflight.joins, 5)
  assert.equal(concurrent.filter(item => item.plan.materializationCache.singleflightJoined).length, 5)
  assert.equal(runtimeAfter.multiInstance.stateFileLocks, true)
  assert.equal(runtimeAfter.multiInstance.sharedCapabilityEvidence, true)

  const invalidated = engine.invalidateProviderNeutralContextCacheState({ scope: 'group', scopeId: 'group-singleflight', sessionId: singleflightSessionId }, 'selftest')
  assert.equal(invalidated.success, true)
  assert.equal(engine.readLatestProviderNeutralContextCacheState({ scope: 'group', scopeId: 'group-singleflight', sessionId: singleflightSessionId }), null)
  const maintenance = engine.runProviderNeutralContextCacheMaintenance({ dryRun: true, stateRetentionDays: 30 })
  assert.equal(maintenance.dryRun, true)
  assert.equal(Number.isInteger(maintenance.scannedStates), true)
  engine.invalidateProviderNeutralContextCacheState({ scope: 'project', scopeId: 'project-adaptive', sessionId: adaptiveSessionId }, 'selftest')

  assert.throws(() => engine.prepareProviderNeutralContextCacheRequest(messages, {
    scope: 'project', scopeId: 'project-a', sessionId: 'session-too-large', provider: 'openai', model: 'mock',
    contextWindowTokens: 40, maxOutputTokens: 20, reservedTokens: 10,
  }), error => error?.code === 'CONTEXT_PLAN_TOKEN_GATE_REQUIRES_FORMAL_COMPACTION')

  const registryUnit = registry.runProviderCacheCapabilityRegistrySelfTest()
  assert.equal(registryUnit.pass, true, JSON.stringify(registryUnit))
  const probeUnit = await probe.runProviderCacheCapabilityProbeSelfTest()
  assert.equal(probeUnit.pass, true, JSON.stringify(probeUnit))
  assert.equal(tokenPreflight.runModelTokenPreflightSelfTest().pass, true)
  assert.equal(summaryQuality.runSessionSummaryQualityGateSelfTest().pass, true)
  assert.equal((await secondaryReview.runSessionSummarySecondaryReviewSelfTest()).pass, true)
  assert.equal(observability.runContextEngineObservabilitySelfTest().pass, true)
  assert.equal(recovery.runContextEngineRecoverySelfTest().pass, true)

  registry.revokeProviderCacheCapabilityEvidence(config)
  const safeDefault = adapters.resolveProviderContextCacheAdapter(config)
  assert.equal(safeDefault.adapter, 'stable_prefix')
  registry.recordProviderCacheCapabilityEvidence(config, { status: 'confirmed', providerCallCount: 2, cacheReadInputTokens: 2048, reason: 'usage_receipt' })
  const confirmed = adapters.resolveProviderContextCacheAdapter(config)
  assert.equal(confirmed.adapter, 'openai_prompt_cache')
  assert.equal(confirmed.capabilitySource, 'confirmed_capability_evidence')
  registry.recordProviderCacheCapabilityEvidence(config, { status: 'unsupported', providerCallCount: 1, reason: 'field_rejected' })
  const unsupported = adapters.resolveProviderContextCacheAdapter({ ...config, providerNativeCacheEnabled: true })
  assert.equal(unsupported.adapter, 'stable_prefix')
  assert.equal(unsupported.unsupportedEvidenceBlocksForce, true)

  const capabilityFile = path.join(temp, 'capability', 'capabilities.json')
  const stored = fs.readFileSync(capabilityFile, 'utf8')
  assert.equal(stored.includes('must-not-persist'), false)
  assert.equal(stored.includes('api_key'), false)

  const mcpSource = fs.readFileSync(path.join(root, 'backend', 'integrations', 'third-party-memory-snapshot.ts'), 'utf8')
  assert.match(mcpSource, /context_plan_checksum/)
  assert.match(mcpSource, /confirmationCursor/)
  assert.match(mcpSource, /contextPlanBlockChanges/)
  const routesSource = fs.readFileSync(path.join(root, 'backend', 'modules', 'collaboration', 'orchestrator-routes.ts'), 'utf8')
  for (const route of ['/api/orchestrator/cache-capability', '/api/orchestrator/cache-capability/probe', '/api/orchestrator/cache-capability/revoke', '/api/context-engine/status', '/api/context-engine/cache/runtime', '/api/context-engine/cache/maintenance', '/api/context-engine/trends', '/api/context-engine/recovery/drill', '/api/context-engine/recovery/restore']) {
    assert.equal(routesSource.includes(route), true, `missing ${route}`)
  }

  console.log(JSON.stringify({
    pass: true,
    checks: 55,
    context_plan_v2: true,
    exact_session_identity: true,
    fail_closed_token_gate: true,
    provider_capability_evidence: true,
    probe_calls_max: 2,
    external_vllm_sglang_only: true,
    prompt_or_key_persisted: false,
    model_token_preflight: true,
    summary_quality_gate: true,
    secondary_review_default_off: true,
    trends_and_alerts: true,
    recovery_drill: true,
    materialization_hot_cache: true,
    concurrent_singleflight: true,
    adaptive_stable_prefix: true,
    cost_latency_recommendation: true,
    controlled_retention_cleanup: true,
    multi_instance_file_leases: true,
    paid_provider_calls: 0,
  }, null, 2))
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
