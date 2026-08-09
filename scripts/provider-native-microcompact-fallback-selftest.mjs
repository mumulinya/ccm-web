import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-native-microcompact-selftest-'))
process.env.CCM_PROVIDER_NATIVE_MICROCOMPACT_CAPABILITY_DIR = path.join(tempRoot, 'capability')
process.env.CCM_MODEL_TOKEN_PREFLIGHT_DIR = path.join(tempRoot, 'calibration')
const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const client = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'group-orchestrator-llm-client.js'))
const compact = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'group-memory-compaction.js'))
const capability = require(path.join(root, 'ccm-package', 'dist', 'system', 'provider-native-microcompact-capability.js'))
const originalFetch = globalThis.fetch

const messages = [
  { role: 'assistant', content: [{ type: 'tool_use', id: 'tool-1', name: 'read', input: { path: 'a.ts' } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: 'large old result' }] },
  { role: 'user', content: '继续' },
]
const editPlan = compact.buildGroupApiMicroCompactEditPlan(messages, { groupId: 'fallback', force: true, activeTokens: 200_000, maxInputTokens: 200_000, targetInputTokens: 160_000, canApplyNatively: true, advisoryOnly: false })
const nativePlan = compact.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
  groupId: 'fallback', groupSessionId: 'gcs-fallback', scope: 'group', scopeId: 'fallback', sessionId: 'gcs-fallback',
  agentType: 'anthropic-api', transport: 'anthropic_api', provider: 'anthropic', supportsApiContextManagement: true,
  nativeApiRequestLayer: true, contextManagementBetaHeaderEnabled: true, model: 'fallback-model', apiUrl: 'https://fallback.example.test/v1',
})

try {
  const fallbackRequests = []
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body)
    fallbackRequests.push(body)
    if (fallbackRequests.length === 1) return { ok: false, status: 400, headers: { get: () => 'reject-request' }, async text() { return 'unknown field context_management' } }
    return { ok: true, status: 200, headers: { get: () => 'fallback-request' }, async text() { return JSON.stringify({ content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 30, output_tokens: 2 } }) } }
  }
  const fallbackConfig = { format: 'anthropic-compatible', apiUrl: 'https://fallback.example.test/v1', apiKey: 'test', model: 'fallback-model', providerContextCacheMode: 'native' }
  const fallbackContent = await client.callAnthropicCompatibleChat(fallbackConfig, { retry: false, messages, apiMicrocompactNativeApplyPlan: nativePlan, providerContextCache: { scope: 'group', scopeId: 'fallback', sessionId: 'gcs-fallback' } })
  const unsupportedState = capability.readProviderNativeMicrocompactCapability(fallbackConfig)

  let probeBody = null
  globalThis.fetch = async (_url, init) => {
    probeBody = JSON.parse(init.body)
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'probe-request' },
      async text() {
        return JSON.stringify({
          content: [{ type: 'text', text: 'OK' }],
          context_management: { applied_edits: [{ type: 'clear_thinking_20251015', cleared_thinking_turns: 0, cleared_input_tokens: 1 }] },
          usage: { input_tokens: 40, output_tokens: 2 },
        })
      },
    }
  }
  const probeConfig = { format: 'anthropic-compatible', apiUrl: 'https://verified.example.test/v1', apiKey: 'test', model: 'verified-model', providerContextCacheMode: 'native', providerCacheProbeInProgress: true }
  await client.callAnthropicCompatibleChat(probeConfig, { retry: false, messages: [{ role: 'user', content: 'OK only' }], providerContextCache: { scope: 'other', scopeId: 'probe', sessionId: 'probe-session' } })
  const confirmedState = capability.readProviderNativeMicrocompactCapability({ ...probeConfig, providerCacheProbeInProgress: false })
  const officialState = capability.readProviderNativeMicrocompactCapability({ format: 'anthropic-compatible', apiUrl: 'https://api.anthropic.com/v1', model: 'official' })

  const checks = {
    nativeFieldWasAttempted: !!fallbackRequests[0]?.context_management,
    explicitFieldRejectionRetriedOnce: fallbackRequests.length === 2 && fallbackContent === 'ok',
    fallbackUsesControlledProjection: !fallbackRequests[1]?.context_management,
    rejectedCompatibleEndpointMarkedUnsupported: unsupportedState.status === 'unsupported',
    probeSendsNativeContextManagement: !!probeBody?.context_management?.edits?.length,
    verifiedCompatibleEndpointConfirmed: confirmedState.status === 'confirmed' && confirmedState.source !== 'official_endpoint',
    officialAnthropicTrustedSeparately: officialState.status === 'confirmed' && officialState.source === 'official_endpoint',
    capabilityEvidenceStoresNoContent: confirmedState.evidence?.contentStored === false && !('messages' in (confirmedState.evidence || {})),
  }
  const result = { pass: Object.values(checks).every(Boolean), checks }
  console.log(JSON.stringify(result, null, 2))
  if (!result.pass) process.exitCode = 1
} finally {
  globalThis.fetch = originalFetch
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
