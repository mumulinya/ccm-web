<script setup>
import { computed, onMounted, ref } from 'vue'
import { Bot, CheckCircle2, CircleAlert, Database, Gauge, KeyRound, RefreshCw, Save, ShieldCheck, TestTube2 } from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const activeModel = ref('chat')
const loading = ref(false)
const testing = ref(false)
const embeddingSaving = ref(false)
const testResult = ref(null)
const modelConfig = ref({
  enabled: true,
  format: 'openai-compatible',
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
  temperature: 0.2,
  timeoutMs: 120000,
  fallbackToRules: true,
  hasKey: false,
  credentialProtected: false
})
const embeddingConfig = ref({
  enabled: false,
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'text-embedding-3-small',
  hasKey: false
})

const modelReady = computed(() => modelConfig.value.enabled && modelConfig.value.hasKey && !!modelConfig.value.model && !!modelConfig.value.apiUrl)
const embeddingReady = computed(() => embeddingConfig.value.enabled && embeddingConfig.value.hasKey && !!embeddingConfig.value.model)
const consumers = computed(() => testResult.value?.consumers || [
  { id: 'global-agent', label: '全局 Agent', ready: null },
  { id: 'group-main-agent', label: '群聊主 Agent', ready: null },
  { id: 'music-agent', label: '音乐 Agent', ready: null }
])

const loadModelConfig = async () => {
  try {
    const response = await fetch('/api/orchestrator/config')
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '读取模型配置失败')
    modelConfig.value = { ...modelConfig.value, ...data.config, apiKey: '' }
  } catch (error) {
    toast.error(error?.message || '读取统一模型配置失败')
  }
}

const saveModelConfig = async (silent = false) => {
  loading.value = true
  const payload = { ...modelConfig.value }
  if (!payload.apiKey) delete payload.apiKey
  try {
    const response = await fetch('/api/orchestrator/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '保存失败')
    modelConfig.value = { ...modelConfig.value, ...data.config, apiKey: '' }
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
    const response = await fetch('/api/orchestrator/connection-test', { method: 'POST' })
    const data = await response.json()
    testResult.value = data
    if (!response.ok || !data.success) throw new Error(data.message || '连接测试失败')
    toast.success(data.message || '统一大模型连接正常')
  } catch (error) {
    toast.error(error?.message || '统一大模型连接失败')
  } finally {
    testing.value = false
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
</script>

<template>
  <section class="settings-panel" data-settings-panel="models">
    <header class="settings-panel-header">
      <div class="settings-panel-heading">
        <Bot :size="20" />
        <div>
          <h2>统一大模型</h2>
          <p>全局 Agent、群聊主 Agent 和音乐 Agent 共用这套连接配置；项目子 Agent 仍使用各项目自己的运行时设置。</p>
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
        <span v-if="testResult?.latencyMs" class="settings-status-meta">{{ testResult.latencyMs }} ms</span>
      </div>

      <div class="settings-tile-grid model-consumer-grid">
        <div v-for="consumer in consumers" :key="consumer.id" class="settings-tile">
          <div class="settings-tile-label">使用统一配置</div>
          <div class="settings-tile-value">{{ consumer.label }}</div>
          <div class="settings-tile-note">{{ consumer.ready === true ? '本次连接测试通过' : (consumer.ready === false ? '本次连接测试失败' : '保存后共享生效') }}</div>
        </div>
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
            <input id="model-key" v-model="modelConfig.apiKey" type="password" class="settings-input" :placeholder="modelConfig.hasKey ? '已加密保存，留空不修改' : '输入 API Key'">
            <span v-if="modelConfig.credentialProtected" class="settings-field-hint"><ShieldCheck :size="12" style="vertical-align:-2px" /> 已由本机凭据仓库加密保护。</span>
          </div>

          <details class="settings-details">
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
              </div>
              <label class="settings-switch" style="margin-top:12px">
                <input v-model="modelConfig.fallbackToRules" type="checkbox">
                <span class="settings-switch-track"></span>
                模型不可用时允许群聊主 Agent 使用只读规则兜底
              </label>
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
            <strong>{{ embeddingReady ? '外部向量模型已启用' : '当前使用本地混合检索' }}</strong>
            <span>{{ embeddingReady ? embeddingConfig.model : '不配置也可以正常使用知识库；系统会自动使用本地 hashing 向量。' }}</span>
          </div>
        </div>
      </div>

      <div class="settings-form">
        <label class="settings-switch">
          <input v-model="embeddingConfig.enabled" type="checkbox">
          <span class="settings-switch-track"></span>
          启用外部 Embedding API
        </label>
        <div class="settings-form-grid">
          <div class="settings-field">
            <label for="embedding-model">Embedding 模型</label>
            <input id="embedding-model" v-model="embeddingConfig.model" class="settings-input" placeholder="text-embedding-3-small / bge-m3">
          </div>
          <div class="settings-field">
            <label for="embedding-url">API 接口地址</label>
            <input id="embedding-url" v-model="embeddingConfig.apiUrl" class="settings-input" placeholder="https://api.openai.com/v1">
          </div>
        </div>
        <div class="settings-field">
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
