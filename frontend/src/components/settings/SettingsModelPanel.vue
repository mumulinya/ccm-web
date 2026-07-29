<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Bot, CheckCircle2, CircleAlert, Database, Eye, EyeOff, Gauge, LoaderCircle, RefreshCw, Save, ShieldCheck, TestTube2 } from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const activeModel = ref('chat')
const loading = ref(false)
const testing = ref(false)
const embeddingSaving = ref(false)
const testResult = ref(null)
const apiKeyVisible = ref(false)
const apiKeyRevealLoading = ref(false)
const revealedStoredApiKey = ref('')
let apiKeyRevealTimer = null
const modelConfig = ref({
  enabled: true,
  format: 'openai-compatible',
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
  temperature: 0.2,
  reasoningEffort: 'off',
  providerContextCacheMode: 'auto',
  providerPromptCacheRetention: 'in_memory',
  providerNativeCacheEnabled: false,
  providerNativeCacheFamily: 'auto',
  providerNativeCacheFamilyManual: false,
  anthropicCacheReferenceEnabled: false,
  inferenceBackendKind: 'remote_api',
  metricsPath: '',
  timeoutMs: 120000,
  fallbackToRules: true,
  hasKey: false,
  credentialProtected: false,
  summaryReviewerEnabled: false,
  summaryReviewerFormat: 'openai-compatible',
  summaryReviewerApiUrl: '',
  summaryReviewerApiKey: '',
  summaryReviewerModel: '',
  summaryReviewerSampleRate: 0.1,
  summaryReviewerTimeoutMs: 30000,
  summaryReviewerHasKey: false
})
const embeddingConfig = ref({
  mode: 'auto',
  enabled: false,
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'text-embedding-3-small',
  hasKey: false
})

const modelReady = computed(() => modelConfig.value.enabled && modelConfig.value.hasKey && !!modelConfig.value.model && !!modelConfig.value.apiUrl)
const embeddingReady = computed(() => embeddingConfig.value.mode === 'local' || embeddingConfig.value.mode === 'auto' || (embeddingConfig.value.mode === 'remote' && embeddingConfig.value.hasKey && !!embeddingConfig.value.model))
const cacheAdapterLabel = computed(() => {
  const adapter = testResult.value?.contextCacheAdapter?.active?.adapter || modelConfig.value?.providerContextCache?.adapterV2?.active?.adapter || ''
  return ({
    anthropic_context_management: 'Anthropic 原生上下文编辑',
    openai_prompt_cache: 'OpenAI 原生 Prompt Cache',
    gemini_implicit_cache: 'Gemini 原生隐式缓存',
    stable_prefix: '稳定前缀',
    disabled: '缓存适配关闭',
  })[adapter] || ''
})
const cacheCapability = computed(() => testResult.value?.capability || modelConfig.value?.providerCacheCapability || null)
const cacheCapabilityStatus = computed(() => cacheCapability.value?.evidence?.status || cacheCapability.value?.status || 'unproven')
const cacheCapabilityLabel = computed(() => ({
  confirmed: '原生缓存已确认',
  unsupported: '接口明确不支持',
  unproven: '原生缓存尚未证明',
  degraded: '最近验证暂时失败',
})[cacheCapabilityStatus.value] || '原生缓存尚未证明')
const cacheCapabilityReason = computed(() => {
  const evidence = cacheCapability.value?.latestAttempt || cacheCapability.value?.evidence
  if (cacheCapability.value?.latestAttempt?.status === 'degraded' && cacheCapability.value?.evidence?.status === 'confirmed') {
    return '最近一次网络验证失败，仍保留有效的已确认能力证据。'
  }
  return ({
    confirmed: `Provider 已回传 ${Number(evidence?.cacheReadInputTokens || 0).toLocaleString()} 个缓存读取 Token。`,
    unsupported: 'Provider 明确拒绝了所选缓存协议字段；重新验证或清除证据前不会强制发送。',
    unproven: '接口可连接，但尚未返回可核验的缓存 Token。CCM 会使用受控投影。',
    degraded: '验证遇到超时或网络故障，15 分钟后可再次验证。',
  })[cacheCapabilityStatus.value] || '尚无有效能力证据。'
})
const consumers = computed(() => testResult.value?.consumers || [
  { id: 'global-agent', label: '全局 Agent', ready: null },
  { id: 'group-main-agent', label: '群聊主 Agent', ready: null },
  { id: 'project-main-agent', label: '项目主 Agent', ready: null },
  { id: 'music-agent', label: '音乐 Agent', ready: null }
])

const cacheFamilyForFormat = (format) => ({
  'openai-compatible': 'openai',
  'anthropic-compatible': 'anthropic',
  'gemini-compatible': 'gemini'
})[format] || 'auto'

const syncNativeCacheFamily = () => {
  if (modelConfig.value.providerNativeCacheFamilyManual) return
  modelConfig.value.providerNativeCacheFamily = cacheFamilyForFormat(modelConfig.value.format)
}

const handleNativeCacheFamilyChange = (event) => {
  const selected = event?.target?.value || modelConfig.value.providerNativeCacheFamily
  if (selected === 'auto') {
    modelConfig.value.providerNativeCacheFamilyManual = false
    void nextTick(syncNativeCacheFamily)
    return
  }
  modelConfig.value.providerNativeCacheFamily = selected
  modelConfig.value.providerNativeCacheFamilyManual = true
}

watch(() => modelConfig.value.format, syncNativeCacheFamily)

const clearApiKeyRevealTimer = () => {
  if (apiKeyRevealTimer) window.clearTimeout(apiKeyRevealTimer)
  apiKeyRevealTimer = null
}

const hideApiKey = () => {
  clearApiKeyRevealTimer()
  apiKeyVisible.value = false
  if (revealedStoredApiKey.value && modelConfig.value.apiKey === revealedStoredApiKey.value) {
    modelConfig.value.apiKey = ''
  }
  revealedStoredApiKey.value = ''
}

const scheduleApiKeyAutoHide = () => {
  clearApiKeyRevealTimer()
  apiKeyRevealTimer = window.setTimeout(hideApiKey, 30_000)
}

const toggleApiKeyVisibility = async () => {
  if (apiKeyVisible.value) {
    hideApiKey()
    return
  }
  if (modelConfig.value.apiKey) {
    apiKeyVisible.value = true
    scheduleApiKeyAutoHide()
    return
  }
  if (!modelConfig.value.hasKey) return
  apiKeyRevealLoading.value = true
  try {
    const response = await fetch('/api/orchestrator/credential/reveal', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    if (!response.ok || !data.success || !data.apiKey) throw new Error(data.error || '读取 API Key 失败')
    revealedStoredApiKey.value = data.apiKey
    modelConfig.value.apiKey = data.apiKey
    apiKeyVisible.value = true
    scheduleApiKeyAutoHide()
  } catch (error) {
    toast.error(error?.message || '读取 API Key 失败')
  } finally {
    apiKeyRevealLoading.value = false
  }
}

const handleAdvancedToggle = async (event) => {
  const details = event.currentTarget
  if (details?.open) return
  await nextTick()
  let parent = details?.parentElement
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') {
      parent.scrollTop = Math.min(parent.scrollTop, Math.max(0, parent.scrollHeight - parent.clientHeight))
    }
    parent = parent.parentElement
  }
  details?.querySelector('summary')?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' })
}

const loadModelConfig = async () => {
  try {
    const response = await fetch('/api/orchestrator/config')
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '读取模型配置失败')
    hideApiKey()
    modelConfig.value = { ...modelConfig.value, ...data.config, apiKey: '', summaryReviewerApiKey: '' }
    syncNativeCacheFamily()
  } catch (error) {
    toast.error(error?.message || '读取统一模型配置失败')
  }
}

const saveModelConfig = async (silent = false) => {
  loading.value = true
  const payload = { ...modelConfig.value }
  if (!payload.apiKey || (revealedStoredApiKey.value && payload.apiKey === revealedStoredApiKey.value)) delete payload.apiKey
  if (!payload.summaryReviewerApiKey) delete payload.summaryReviewerApiKey
  try {
    const response = await fetch('/api/orchestrator/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '保存失败')
    hideApiKey()
    modelConfig.value = { ...modelConfig.value, ...data.config, apiKey: '', summaryReviewerApiKey: '' }
    if (!silent) toast.success('统一大模型配置已保存')
    return true
  } catch (error) {
    toast.error(error?.message || '保存统一模型配置失败')
    return false
  } finally {
    loading.value = false
  }
}

const testConnection = async () => {
  if (!await saveModelConfig(true)) return
  testing.value = true
  testResult.value = null
  try {
    const response = await fetch('/api/orchestrator/cache-capability/probe', { method: 'POST' })
    const data = await response.json()
    testResult.value = {
      ...data,
      success: data?.connection?.success === true,
      consumers: (data?.consumers || [
        { id: 'global-agent', label: '全局 Agent' },
        { id: 'group-main-agent', label: '群聊主 Agent' },
        { id: 'project-main-agent', label: '项目主 Agent' },
        { id: 'music-agent', label: '音乐 Agent' },
      ]).map(item => ({ ...item, ready: data?.connection?.success === true })),
      message: data?.connection?.success
        ? `连接正常，缓存能力：${({ confirmed: '已确认', unsupported: '不支持', unproven: '尚未证明', degraded: '临时降级' })[data?.receipt?.status] || '尚未证明'}`
        : (data?.error || data?.receipt?.reason || '连接测试失败'),
    }
    if (!response.ok || !data?.connection?.success) throw new Error(testResult.value.message)
    modelConfig.value.providerCacheCapability = data.capability
    toast.success(testResult.value.message)
  } catch (error) {
    toast.error(error?.message || '统一大模型连接失败')
  } finally {
    testing.value = false
  }
}

const revokeCacheCapability = async () => {
  try {
    const response = await fetch('/api/orchestrator/cache-capability/revoke', { method: 'POST' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '清除证据失败')
    testResult.value = null
    await loadModelConfig()
    toast.success('缓存能力证据已清除，已恢复安全默认')
  } catch (error) {
    toast.error(error?.message || '清除缓存能力证据失败')
  }
}

const loadEmbeddingConfig = async () => {
  try {
    const response = await fetch('/api/rag/embedding-config')
    const data = await response.json()
    if (response.ok && data.success) embeddingConfig.value = { ...embeddingConfig.value, ...data.config, apiKey: '' }
  } catch {
    toast.error('读取知识库向量模型配置失败')
  }
}

const saveEmbeddingConfig = async () => {
  embeddingSaving.value = true
  const payload = { ...embeddingConfig.value, rebuild: true }
  if (!payload.apiKey) delete payload.apiKey
  try {
    const response = await fetch('/api/rag/embedding-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '保存失败')
    embeddingConfig.value = { ...embeddingConfig.value, ...data.config, apiKey: '' }
    toast.success(`向量模型配置已保存，知识库索引共 ${data.chunksCount || 0} 个分片`)
  } catch (error) {
    toast.error(error?.message || '保存向量模型配置失败')
  } finally {
    embeddingSaving.value = false
  }
}

onMounted(() => Promise.all([loadModelConfig(), loadEmbeddingConfig()]))
onBeforeUnmount(clearApiKeyRevealTimer)
</script>

<template>
  <section class="settings-panel" data-settings-panel="models">
    <header class="settings-panel-header">
      <div class="settings-panel-heading">
        <Bot :size="20" />
        <div>
          <h2>统一大模型</h2>
          <p>全局 Agent、群聊主 Agent、项目主 Agent 和音乐 Agent 共用这套连接配置；项目开发子 Agent 仍使用各项目自己的运行时设置。</p>
        </div>
      </div>
    </header>

    <div class="settings-segmented" aria-label="模型配置类型">
      <button type="button" :class="{ active: activeModel === 'chat' }" @click="activeModel = 'chat'"><Bot :size="15" /> 对话模型</button>
      <button type="button" :class="{ active: activeModel === 'embedding' }" @click="activeModel = 'embedding'"><Database :size="15" /> 知识库向量</button>
    </div>

    <template v-if="activeModel === 'chat'">
      <div class="settings-status-banner" :class="{ ready: testResult?.success || (modelReady && !testResult) }">
        <div class="settings-status-copy">
          <CheckCircle2 v-if="testResult?.success" :size="18" />
          <CircleAlert v-else :size="18" />
          <div>
            <strong>{{ testResult?.success ? '统一大模型连接正常' : (modelReady ? '配置完整，等待连接测试' : '统一大模型待配置') }}</strong>
            <span v-if="testResult">{{ testResult.message }}</span>
            <span v-else>{{ modelConfig.model || '填写模型、接口地址和 API Key 后即可使用。' }}</span>
          </div>
        </div>
        <span v-if="testResult?.latencyMs || cacheAdapterLabel" class="settings-status-meta">{{ testResult?.latencyMs ? `${testResult.latencyMs} ms` : '' }}<template v-if="cacheAdapterLabel">{{ testResult?.latencyMs ? ' · ' : '' }}{{ cacheAdapterLabel }}</template></span>
      </div>

      <div class="settings-tile-grid model-consumer-grid">
        <div v-for="consumer in consumers" :key="consumer.id" class="settings-tile">
          <div class="settings-tile-label">使用统一配置</div>
          <div class="settings-tile-value">{{ consumer.label }}</div>
          <div class="settings-tile-note">{{ consumer.ready === true ? '本次连接测试通过' : (consumer.ready === false ? '本次连接测试失败' : '保存后共享生效') }}</div>
        </div>
      </div>

      <div class="settings-inline-status" :class="`cache-capability-${cacheCapabilityStatus}`">
        <div>
          <strong>{{ cacheCapabilityLabel }}</strong>
          <span>{{ cacheCapabilityReason }}</span>
        </div>
        <button v-if="cacheCapability?.evidence || cacheCapability?.latestAttempt" type="button" class="settings-button" :disabled="testing" @click="revokeCacheCapability"><RefreshCw :size="15" /> 清除证据</button>
      </div>

      <div class="settings-section">
        <div class="settings-form">
          <label class="settings-switch">
            <input v-model="modelConfig.enabled" type="checkbox">
            <span class="settings-switch-track"></span>
            启用统一大模型
          </label>
          <div class="settings-form-grid">
            <div class="settings-field">
              <label for="model-format">接口协议</label>
              <select id="model-format" v-model="modelConfig.format" class="settings-input">
                <option value="auto">自动识别</option>
                <option value="openai-compatible">OpenAI Compatible</option>
                <option value="anthropic-compatible">Anthropic Compatible</option>
                <option value="gemini-compatible">Gemini Generate Content</option>
              </select>
            </div>
            <div class="settings-field">
              <label for="model-name">模型名称</label>
              <input id="model-name" v-model="modelConfig.model" class="settings-input" placeholder="例如 gpt-5 / claude-sonnet">
            </div>
          </div>
          <div class="settings-field">
            <label for="model-url">API 接口地址</label>
            <input id="model-url" v-model="modelConfig.apiUrl" class="settings-input" placeholder="https://api.openai.com/v1">
            <span class="settings-field-hint">可以填写 Base URL，也可以填写完整的 messages 或 chat/completions 地址。</span>
          </div>
          <div class="settings-field">
            <label for="model-key">API Key</label>
            <div class="settings-secret-input">
              <input
                id="model-key"
                v-model="modelConfig.apiKey"
                :type="apiKeyVisible ? 'text' : 'password'"
                class="settings-input"
                autocomplete="off"
                spellcheck="false"
                :placeholder="modelConfig.hasKey ? '已加密保存，留空不修改' : '输入 API Key'"
              >
              <button
                type="button"
                class="settings-secret-toggle"
                :disabled="apiKeyRevealLoading || (!modelConfig.hasKey && !modelConfig.apiKey)"
                :title="apiKeyVisible ? '隐藏 API Key' : '显示 API Key（30 秒后自动隐藏）'"
                :aria-label="apiKeyVisible ? '隐藏 API Key' : '显示 API Key'"
                :aria-pressed="apiKeyVisible"
                @click="toggleApiKeyVisibility"
              >
                <LoaderCircle v-if="apiKeyRevealLoading" :size="16" class="settings-spin" />
                <EyeOff v-else-if="apiKeyVisible" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
            <span v-if="modelConfig.credentialProtected" class="settings-field-hint"><ShieldCheck :size="12" style="vertical-align:-2px" /> 已由本机凭据仓库加密保护。</span>
          </div>

          <details class="settings-details" @toggle="handleAdvancedToggle">
            <summary><Gauge :size="14" /> 高级参数</summary>
            <div class="settings-details-content">
              <div class="settings-form-grid">
                <div class="settings-field">
                  <label for="model-temperature">温度</label>
                  <input id="model-temperature" v-model.number="modelConfig.temperature" type="number" min="0" max="1" step="0.1" class="settings-input">
                </div>
                <div class="settings-field">
                  <label for="model-timeout">超时时间（毫秒）</label>
                  <input id="model-timeout" v-model.number="modelConfig.timeoutMs" type="number" min="5000" step="1000" class="settings-input">
                </div>
                <div class="settings-field">
                  <label for="model-reasoning-effort">推理强度</label>
                  <select id="model-reasoning-effort" v-model="modelConfig.reasoningEffort" class="settings-input">
                    <option value="off">关闭</option>
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                  <span class="settings-field-hint">仅对支持推理的模型生效；OpenAI 兼容接口发送 reasoning_effort，Anthropic 兼容接口发送 thinking 预算。不支持的网关可先选「关闭」。</span>
                </div>
                <div class="settings-field">
                  <label for="model-context-cache-mode">上下文缓存</label>
                  <select id="model-context-cache-mode" v-model="modelConfig.providerContextCacheMode" class="settings-input">
                    <option value="auto">自动选择</option>
                    <option value="native">优先 Provider 原生</option>
                    <option value="controlled">CCM 受控投影</option>
                    <option value="off">关闭缓存适配</option>
                  </select>
                </div>
                <div class="settings-field">
                  <label for="model-inference-backend">推理后端</label>
                  <select id="model-inference-backend" v-model="modelConfig.inferenceBackendKind" class="settings-input">
                    <option value="remote_api">远程 API / 中转站</option>
                    <option value="vllm">外接 vLLM</option>
                    <option value="sglang">外接 SGLang</option>
                  </select>
                  <span class="settings-field-hint">CCM 只连接现有服务，不安装或管理 Python、CUDA、模型文件和 GPU 进程。</span>
                </div>
                <div v-if="modelConfig.inferenceBackendKind !== 'remote_api'" class="settings-field">
                  <label for="model-metrics-path">同源指标路径</label>
                  <input id="model-metrics-path" v-model="modelConfig.metricsPath" class="settings-input" placeholder="/metrics">
                  <span class="settings-field-hint">只允许同源路径；后端指标可证明 KV 缓存启用，但只有每请求缓存 Token 才计入节省。</span>
                </div>
                <div class="settings-field">
                  <label for="model-cache-retention">Prompt Cache 保留</label>
                  <select id="model-cache-retention" v-model="modelConfig.providerPromptCacheRetention" class="settings-input">
                    <option value="in_memory">Provider 默认</option>
                    <option value="24h">24 小时</option>
                  </select>
                  <span class="settings-field-hint">24 小时模式可能在 Provider 侧保留缓存状态；需要零数据保留时请选择 Provider 默认。</span>
                </div>
                <div v-if="modelConfig.providerNativeCacheEnabled" class="settings-field">
                  <label for="model-native-cache-family">自定义接口缓存协议</label>
                  <select id="model-native-cache-family" v-model="modelConfig.providerNativeCacheFamily" class="settings-input" @change="handleNativeCacheFamilyChange($event)">
                    <option value="auto">恢复自动跟随</option>
                    <option value="openai">OpenAI Prompt Cache</option>
                    <option value="anthropic">Anthropic Context Management</option>
                    <option value="gemini">Gemini Context Cache</option>
                    <option value="compatible">仅稳定前缀</option>
                  </select>
                  <span class="settings-field-hint">{{ modelConfig.providerNativeCacheFamilyManual ? '已手动指定，切换接口协议时不会覆盖。' : '自动跟随接口协议；手动选择后停止同步。' }}</span>
                </div>
              </div>
              <div class="settings-switch-stack">
                <label class="settings-switch">
                  <input v-model="modelConfig.providerNativeCacheEnabled" type="checkbox">
                  <span class="settings-switch-track"></span>
                  <span class="settings-switch-label">强制向当前自定义接口发送所选原生缓存字段</span>
                </label>
                <label v-if="modelConfig.format === 'anthropic-compatible'" class="settings-switch">
                  <input v-model="modelConfig.anthropicCacheReferenceEnabled" type="checkbox">
                  <span class="settings-switch-track"></span>
                  <span class="settings-switch-label">启用 Anthropic cache_reference/cache_edits</span>
                </label>
                <label class="settings-switch">
                  <input v-model="modelConfig.fallbackToRules" type="checkbox">
                  <span class="settings-switch-track"></span>
                  <span class="settings-switch-label">模型不可用时允许群聊主 Agent 使用只读规则兜底</span>
                </label>
              </div>
              <div class="settings-field settings-reviewer-block">
                <label class="settings-switch">
                  <input v-model="modelConfig.summaryReviewerEnabled" type="checkbox">
                  <span class="settings-switch-track"></span>
                  <span class="settings-switch-label">抽样使用第二模型独立复核正式摘要</span>
                </label>
                <span class="settings-field-hint">默认关闭。命中抽样后仅调用一次且不重试；遗漏约束、编造完成状态或复核配置失效时拒绝提交摘要。</span>
              </div>
              <div v-if="modelConfig.summaryReviewerEnabled" class="settings-form-grid">
                <div class="settings-field">
                  <label for="summary-reviewer-format">复核接口协议</label>
                  <select id="summary-reviewer-format" v-model="modelConfig.summaryReviewerFormat" class="settings-input">
                    <option value="openai-compatible">OpenAI Compatible</option>
                    <option value="anthropic-compatible">Anthropic Compatible</option>
                    <option value="gemini-compatible">Gemini Generate Content</option>
                  </select>
                </div>
                <div class="settings-field">
                  <label for="summary-reviewer-model">复核模型</label>
                  <input id="summary-reviewer-model" v-model="modelConfig.summaryReviewerModel" class="settings-input" placeholder="独立复核模型名称">
                </div>
                <div class="settings-field">
                  <label for="summary-reviewer-url">复核 API 地址</label>
                  <input id="summary-reviewer-url" v-model="modelConfig.summaryReviewerApiUrl" class="settings-input" placeholder="https://api.example.com/v1">
                </div>
                <div class="settings-field">
                  <label for="summary-reviewer-key">复核 API Key</label>
                  <input id="summary-reviewer-key" v-model="modelConfig.summaryReviewerApiKey" type="password" class="settings-input" :placeholder="modelConfig.summaryReviewerHasKey ? '已安全保存，留空不修改' : '输入复核模型 API Key'">
                </div>
                <div class="settings-field">
                  <label for="summary-reviewer-rate">抽样比例</label>
                  <input id="summary-reviewer-rate" v-model.number="modelConfig.summaryReviewerSampleRate" type="number" min="0" max="1" step="0.05" class="settings-input">
                </div>
                <div class="settings-field">
                  <label for="summary-reviewer-timeout">复核超时（毫秒）</label>
                  <input id="summary-reviewer-timeout" v-model.number="modelConfig.summaryReviewerTimeoutMs" type="number" min="5000" max="120000" step="1000" class="settings-input">
                </div>
              </div>
            </div>
          </details>

          <div class="settings-panel-actions">
            <button type="button" class="settings-button primary" :disabled="loading || testing" @click="saveModelConfig(false)"><Save :size="15" /> 保存配置</button>
            <button type="button" class="settings-button" :disabled="loading || testing" @click="testConnection"><TestTube2 :size="15" /> {{ testing ? '测试中' : '保存并测试连接' }}</button>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="settings-status-banner" :class="{ ready: embeddingReady }">
        <div class="settings-status-copy">
          <CheckCircle2 v-if="embeddingReady" :size="18" />
          <CircleAlert v-else :size="18" />
          <div>
            <strong>{{ embeddingReady ? '知识库语义检索已配置' : '当前仅使用词面检索' }}</strong>
            <span>{{ embeddingConfig.mode === 'remote' ? embeddingConfig.model : embeddingConfig.mode === 'lexical' ? '关键词、中文切词与Hashing，不标记为语义命中。' : '首次使用会准备本地多语言Embedding模型。' }}</span>
          </div>
        </div>
      </div>

      <div class="settings-form">
        <div class="settings-field">
          <label for="embedding-mode">检索模式</label>
          <select id="embedding-mode" v-model="embeddingConfig.mode" class="settings-select">
            <option value="auto">自动（外部优先，本地兜底）</option>
            <option value="local">本地语义</option>
            <option value="remote">外部 Embedding</option>
            <option value="lexical">仅词面检索</option>
          </select>
        </div>
        <div v-if="embeddingConfig.mode === 'remote' || embeddingConfig.mode === 'auto'" class="settings-form-grid">
          <div class="settings-field">
            <label for="embedding-model">Embedding 模型</label>
            <input id="embedding-model" v-model="embeddingConfig.model" class="settings-input" placeholder="text-embedding-3-small / bge-m3">
          </div>
          <div class="settings-field">
            <label for="embedding-url">API 接口地址</label>
            <input id="embedding-url" v-model="embeddingConfig.apiUrl" class="settings-input" placeholder="https://api.openai.com/v1">
          </div>
        </div>
        <div v-if="embeddingConfig.mode === 'remote' || embeddingConfig.mode === 'auto'" class="settings-field">
          <label for="embedding-key">API Key</label>
          <input id="embedding-key" v-model="embeddingConfig.apiKey" type="password" class="settings-input" :placeholder="embeddingConfig.hasKey ? '已安全保存，留空不修改' : '输入 API Key'">
        </div>
        <div class="settings-inline-status">
          <div>
            <strong>保存后会重建知识库索引</strong>
            <span>重建期间已有索引仍可读取，不会删除知识库文档。</span>
          </div>
          <button type="button" class="settings-button primary" :disabled="embeddingSaving" @click="saveEmbeddingConfig"><RefreshCw :size="15" /> {{ embeddingSaving ? '重建中' : '保存并重建' }}</button>
        </div>
      </div>
    </template>
  </section>
</template>
