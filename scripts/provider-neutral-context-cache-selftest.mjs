import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const cache = require(path.join(root, 'ccm-package', 'dist', 'system', 'provider-neutral-context-cache.js'))
const adapters = require(path.join(root, 'ccm-package', 'dist', 'system', 'provider-context-cache-adapters.js'))
const client = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'group-orchestrator-llm-client.js'))
const compact = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'group-memory-compaction.js'))
const compactionEngine = require(path.join(root, 'ccm-package', 'dist', 'system', 'unified-session-compaction-model.js'))

const unit = cache.runProviderNeutralContextCacheSelfTest()
const adapterUnit = adapters.runProviderContextCacheAdapterSelfTest()
const originalFetch = globalThis.fetch
const sessionId = `gcs_provider_cache_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
const receipts = []
let anthropicRequest = null
let openAiRequest = null
let geminiRequest = null
let geminiCompactRequest = null

try {
  globalThis.fetch = async (_url, init) => ({
    ok: true,
    status: 200,
    headers: { get: () => 'request-openai-selftest' },
    async text() {
      return JSON.stringify({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 21, completion_tokens: 2 } })
    },
  })
  await client.callOpenAiCompatibleChat({
    apiUrl: 'https://example.test/v1',
    apiKey: 'selftest',
    model: 'selftest-openai',
    providerContextCacheMode: 'auto',
  }, {
    retry: false,
    messages: [{ role: 'system', content: 'rules' }, { role: 'user', content: 'hello' }],
    providerContextCache: { scope: 'global', scopeId: sessionId, sessionId, source: 'transport_selftest' },
    onProviderContextCache: receipt => receipts.push(receipt),
  })

  globalThis.fetch = async (url, init) => {
    geminiCompactRequest = { url: String(url), body: JSON.parse(init.body) }
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'request-gemini-compact-selftest' },
      async text() {
        return JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"primaryRequest":"keep exact session"}' }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 40, cachedContentTokenCount: 10, candidatesTokenCount: 5 },
        })
      },
    }
  }
  const geminiCompact = await compactionEngine.callCompactionModelOnce({
    format: 'gemini-compatible',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: 'selftest',
    model: 'gemini-compact-selftest',
  }, 'compact system', 'compact user', 800, 10_000)

  globalThis.fetch = async (_url, init) => {
    openAiRequest = { body: JSON.parse(init.body), headers: init.headers }
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'request-openai-native-cache-selftest' },
      async text() {
        return JSON.stringify({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 100, prompt_tokens_details: { cached_tokens: 60 }, completion_tokens: 2 },
        })
      },
    }
  }
  await client.callOpenAiCompatibleChat({
    apiUrl: 'https://api.openai.com/v1',
    apiKey: 'selftest',
    model: 'selftest-openai-native-cache',
    providerContextCacheMode: 'auto',
    providerPromptCacheRetention: '24h',
  }, {
    retry: false,
    messages: [{ role: 'system', content: 'stable rules' }, { role: 'user', content: 'hello' }],
    providerContextCache: { scope: 'project', scopeId: 'project-openai', sessionId: `${sessionId}-openai`, source: 'transport_selftest' },
    onProviderContextCache: receipt => receipts.push(receipt),
  })

  const structuredMessages = [
    { role: 'system', content: 'rules' },
    { role: 'assistant', content: [{ type: 'tool_use', id: 'tool-1', name: 'read', input: { path: 'a.ts' } }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: '[Old tool result content cleared]' }] },
    { role: 'assistant', content: '继续处理。' },
    { role: 'user', content: '请继续。' },
  ]
  const editPlan = compact.buildGroupApiMicroCompactEditPlan(structuredMessages, {
    groupId: 'selftest-group',
    force: true,
    activeTokens: 200000,
    maxInputTokens: 200000,
    targetInputTokens: 160000,
    canApplyNatively: true,
    advisoryOnly: false,
  })
  const nativePlan = compact.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    groupId: 'selftest-group',
    groupSessionId: sessionId,
    agentType: 'anthropic-api',
    transport: 'anthropic_api',
    provider: 'anthropic',
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    contextManagementBetaHeaderEnabled: true,
  })
  globalThis.fetch = async (_url, init) => {
    anthropicRequest = { body: JSON.parse(init.body), headers: init.headers }
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'request-anthropic-selftest' },
      async text() {
        return JSON.stringify({ content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 18, cache_read_input_tokens: 11, output_tokens: 2 } })
      },
    }
  }
  await client.callAnthropicCompatibleChat({
    apiUrl: 'https://api.anthropic.com/v1',
    apiKey: 'selftest',
    model: 'selftest-anthropic',
    providerContextCacheMode: 'native',
    anthropicCacheReferenceEnabled: true,
  }, {
    retry: false,
    messages: structuredMessages,
    apiMicrocompactNativeApplyPlan: nativePlan,
    providerContextCache: { scope: 'group', scopeId: 'selftest-group', sessionId, source: 'transport_selftest' },
    onProviderContextCache: receipt => receipts.push(receipt),
  })

  globalThis.fetch = async (url, init) => {
    geminiRequest = { url: String(url), body: JSON.parse(init.body), headers: init.headers }
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'request-gemini-cache-selftest' },
      async text() {
        return JSON.stringify({
          candidates: [{ content: { role: 'model', parts: [{ text: 'gemini ok' }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 100, cachedContentTokenCount: 70, candidatesTokenCount: 4, totalTokenCount: 104 },
        })
      },
    }
  }
  await client.callOpenAiCompatibleChat({
    format: 'gemini-compatible',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: 'selftest',
    model: 'gemini-selftest',
    providerContextCacheMode: 'auto',
  }, {
    retry: false,
    messages: [{ role: 'system', content: 'gemini rules' }, { role: 'user', content: 'hello gemini' }],
    providerContextCache: { scope: 'global', scopeId: 'global-gemini', sessionId: `${sessionId}-gemini`, source: 'transport_selftest' },
    onProviderContextCache: receipt => receipts.push(receipt),
  })

  const checks = {
    coreSelfTestPassed: unit.pass === true,
    adapterSelfTestPassed: adapterUnit.pass === true,
    genericTransportReportedControlledProjection: receipts.some(receipt => receipt.provider === 'openai' && receipt.ccmControlledProjection === true && receipt.providerNative === false),
    anthropicTransportAppliedNativePatch: !!anthropicRequest?.body?.context_management?.edits?.length,
    anthropicTransportDeclaredBeta: String(anthropicRequest?.headers?.['anthropic-beta'] || '').includes('context-management-2025-06-27'),
    anthropicCacheReferencePlacedBeforeBoundary: anthropicRequest?.body?.messages?.some(message => Array.isArray(message.content) && message.content.some(block => block?.type === 'tool_result' && block.cache_reference === 'tool-1')),
    anthropicCacheEditPinnedToUserMessage: anthropicRequest?.body?.messages?.some(message => Array.isArray(message.content) && message.content.some(block => block?.type === 'cache_edits' && block.edits?.some(edit => edit.cache_reference === 'tool-1'))),
    openAiNativePromptCacheFieldsApplied: /^ccm-/.test(openAiRequest?.body?.prompt_cache_key || '') && openAiRequest?.body?.prompt_cache_retention === '24h',
    openAiCachedUsageSeparated: receipts.some(receipt => receipt.adapterKind === 'openai_prompt_cache' && receipt.cacheReadInputTokens === 60 && receipt.providerInputTokens === 40),
    geminiGenerateContentTransportWorks: /models\/gemini-selftest:generateContent/.test(geminiRequest?.url || '') && geminiRequest?.body?.systemInstruction?.parts?.[0]?.text === 'gemini rules',
    geminiImplicitCacheUsageRecorded: receipts.some(receipt => receipt.provider === 'gemini' && receipt.adapterKind === 'gemini_implicit_cache' && receipt.cacheReadInputTokens === 70 && receipt.providerInputTokens === 30),
    geminiFormalCompactionTransportWorks: geminiCompact?.provider === 'gemini' && geminiCompact?.summary?.primaryRequest === 'keep exact session' && /models\/gemini-compact-selftest:generateContent/.test(geminiCompactRequest?.url || ''),
    nativeUsageReportedWithoutFabrication: receipts.some(receipt => receipt.provider === 'anthropic' && receipt.providerNative === true && receipt.cacheReadInputTokens === 11),
    noPromptContentStoredInReceipts: receipts.every(receipt => receipt.contentStored === false && !('messages' in receipt)),
    memoryCenterShowsNativeVsControlled: fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'knowledge', 'MemoryCenterPanel.vue'), 'utf8').includes('Provider 原生')
      && fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'knowledge', 'MemoryCenterPanel.vue'), 'utf8').includes('CCM 受控投影'),
    settingsExposeFourModes: ['auto', 'native', 'controlled', 'off'].every(mode => fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'knowledge', 'MemoryCenterPanel.vue'), 'utf8').includes(`value="${mode}"`)),
    settingsExposeProviderAdapters: ['gemini-compatible', 'providerNativeCacheFamily', 'providerPromptCacheRetention', 'anthropicCacheReferenceEnabled'].every(value => fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'settings', 'SettingsModelPanel.vue'), 'utf8').includes(value)),
  }
  const result = { pass: Object.values(checks).every(Boolean), checks, unit: unit.checks, adapterUnit: adapterUnit.checks }
  console.log(JSON.stringify(result, null, 2))
  if (!result.pass) process.exitCode = 1
} finally {
  globalThis.fetch = originalFetch
}
