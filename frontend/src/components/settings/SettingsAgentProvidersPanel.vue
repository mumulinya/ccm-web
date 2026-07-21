<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Bot, CheckCircle2, Download, KeyRound, LogIn, LogOut, RefreshCw, Save, ShieldCheck, Terminal } from '@lucide/vue'
import { confirmDialog, toast } from '../../utils/toast.js'

const loading = ref(true)
const saving = ref(false)
const checking = ref(false)
const actionProvider = ref('')
const statuses = ref({})
const providerCatalog = ref([])
const modelOptions = ref({ codex: [], cursor: [], gemini: [], opencode: [], claudecode: [] })
const modelLoading = ref({ codex: false, cursor: false, gemini: false, opencode: false, claudecode: false })
let installPollTimer = 0
const config = ref({
  codex: { enabled: true, authMode: 'cli_login', model: '' },
  cursor: { enabled: true, authMode: 'cli_login', model: '' },
  gemini: { enabled: true, authMode: 'cli_login', model: '' },
  opencode: { enabled: true, authMode: 'cli_login', model: '' },
  claudecode: {
    enabled: false,
    authMode: 'api',
    apiUrl: 'https://api.anthropic.com',
    apiKey: '',
    credentialType: 'api_key',
    model: '',
    hasKey: false,
    credentialProtected: false
  }
})

const providers = computed(() => providerCatalog.value.filter(item => item.id !== 'claudecode'))

const stateLabel = status => {
  if (status?.install?.status === 'running') return '安装中'
  if (!status?.installed) return '未安装'
  if (status.authState === 'logged_in') return '已登录'
  if (status.authState === 'configured') return '已配置'
  return '待认证'
}

const isReady = status => status?.installed && ['logged_in', 'configured'].includes(status?.authState)

const loadProviderModels = async provider => {
  modelLoading.value[provider] = true
  try {
    const response = await fetch(`/api/system/agent-providers/${provider}/models`)
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '读取模型失败')
    modelOptions.value[provider] = data.models || []
  } catch (error) {
    modelOptions.value[provider] = []
  } finally {
    modelLoading.value[provider] = false
  }
}

const load = async (force = false, quiet = false) => {
  if (force) checking.value = true
  else loading.value = true
  try {
    const response = await fetch(force ? '/api/system/agent-providers/status' : '/api/system/agent-providers')
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '读取开发 Agent 配置失败')
    if (data.config) {
      config.value = {
        ...config.value,
        ...data.config,
        codex: { ...config.value.codex, ...data.config.codex },
        cursor: { ...config.value.cursor, ...data.config.cursor },
        gemini: { ...config.value.gemini, ...data.config.gemini },
        opencode: { ...config.value.opencode, ...data.config.opencode },
        claudecode: { ...config.value.claudecode, ...data.config.claudecode, apiKey: '' }
      }
    }
    if (Array.isArray(data.providers) && data.providers.length) providerCatalog.value = data.providers
    statuses.value = data.statuses || {}
    void Promise.all(['codex', 'cursor', 'gemini', 'opencode', 'claudecode'].map(loadProviderModels))
    if (force && !quiet) toast.success('Agent 状态已更新')
  } catch (error) {
    toast.error(error?.message || '读取开发 Agent 配置失败')
  } finally {
    loading.value = false
    checking.value = false
  }
}

const pollInstallStatus = () => {
  if (installPollTimer) window.clearInterval(installPollTimer)
  installPollTimer = window.setInterval(async () => {
    try {
      const response = await fetch('/api/system/agent-providers/status')
      const data = await response.json()
      if (!response.ok || !data.success) return
      statuses.value = data.statuses || statuses.value
      const running = Object.values(statuses.value).some(status => status?.install?.status === 'running')
      if (!running) {
        window.clearInterval(installPollTimer)
        installPollTimer = 0
        const failed = Object.entries(statuses.value).find(([, status]) => status?.install?.status === 'failed')
        if (failed) toast.error(`${providers.value.find(item => item.id === failed[0])?.label || failed[0]} 安装失败`)
        else toast.success('Agent 安装完成，可以继续登录或配置模型')
        await load(false, true)
      }
    } catch {}
  }, 1800)
}

const save = async () => {
  saving.value = true
  const payload = {
    codex: { enabled: config.value.codex.enabled, model: config.value.codex.model },
    cursor: { enabled: config.value.cursor.enabled, model: config.value.cursor.model },
    gemini: { enabled: config.value.gemini.enabled, model: config.value.gemini.model },
    opencode: { enabled: config.value.opencode.enabled, model: config.value.opencode.model },
    claudecode: {
      enabled: config.value.claudecode.enabled,
      apiUrl: config.value.claudecode.apiUrl,
      model: config.value.claudecode.model,
      credentialType: config.value.claudecode.credentialType
    }
  }
  if (config.value.claudecode.apiKey) payload.claudecode.apiKey = config.value.claudecode.apiKey
  try {
    const response = await fetch('/api/system/agent-providers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '保存开发 Agent 配置失败')
    config.value = {
      ...config.value,
      ...data.config,
      codex: { ...config.value.codex, ...data.config.codex },
      cursor: { ...config.value.cursor, ...data.config.cursor },
      gemini: { ...config.value.gemini, ...data.config.gemini },
      opencode: { ...config.value.opencode, ...data.config.opencode },
      claudecode: { ...config.value.claudecode, ...data.config.claudecode, apiKey: '' }
    }
    statuses.value = data.statuses || statuses.value
    toast.success('开发 Agent 配置已保存并应用到后续任务')
  } catch (error) {
    toast.error(error?.message || '保存开发 Agent 配置失败')
  } finally {
    saving.value = false
  }
}

const install = async provider => {
  actionProvider.value = provider
  try {
    const response = await fetch(`/api/system/agent-providers/${provider}/install`, { method: 'POST' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '无法启动安装')
    statuses.value = { ...statuses.value, [provider]: { ...statuses.value[provider], install: data.install } }
    toast.success('安装任务已启动，可以留在当前页面查看进度')
    pollInstallStatus()
  } catch (error) {
    toast.error(error?.message || '无法启动安装')
  } finally {
    actionProvider.value = ''
  }
}

const login = async provider => {
  actionProvider.value = provider
  try {
    const response = await fetch(`/api/system/agent-providers/${provider}/login`, { method: 'POST' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '无法启动登录')
    toast.success('已打开登录窗口，完成后点击“重新检查”')
  } catch (error) {
    toast.error(error?.message || '无法启动登录')
  } finally {
    actionProvider.value = ''
  }
}

const logout = async provider => {
  const label = providerCatalog.value.find(item => item.id === provider)?.label || provider
  if (!await confirmDialog(`退出 ${label} 的本机账号？这会影响其他使用同一 CLI 登录状态的终端。`)) return
  actionProvider.value = provider
  try {
    const response = await fetch(`/api/system/agent-providers/${provider}/logout`, { method: 'POST' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '退出登录失败')
    if (data.interactive) toast.success(`已打开 ${label} 认证管理窗口，完成后点击“重新检查”`)
    else {
      toast.success(`${label} 已退出登录`)
      await load(true)
    }
  } catch (error) {
    toast.error(error?.message || '退出登录失败')
  } finally {
    actionProvider.value = ''
  }
}

const clearClaudeKey = async () => {
  if (!await confirmDialog('移除 Claude Code 的第三方 API 密钥？后续 Claude Code 任务将无法运行，直到重新配置。')) return
  saving.value = true
  try {
    const response = await fetch('/api/system/agent-providers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        claudecode: { enabled: false, clearApiKey: true }
      })
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '移除密钥失败')
    config.value.claudecode = { ...config.value.claudecode, ...data.config.claudecode, apiKey: '' }
    statuses.value = data.statuses || statuses.value
    toast.success('Claude Code API 密钥已移除')
  } catch (error) {
    toast.error(error?.message || '移除密钥失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await load()
  if (Object.values(statuses.value).some(status => status?.install?.status === 'running')) pollInstallStatus()
})
onBeforeUnmount(() => {
  if (installPollTimer) window.clearInterval(installPollTimer)
})
</script>

<template>
  <section class="settings-panel" data-settings-panel="agent-providers">
    <header class="settings-panel-header">
      <div class="settings-panel-heading">
        <Terminal :size="20" />
        <div>
          <h2>开发 Agent</h2>
          <p>统一管理项目 Agent 和群聊项目子 Agent 使用的 Claude Code、Codex、Cursor、Gemini CLI 与 OpenCode。设置会作用于后续新任务和新运行世代。</p>
        </div>
      </div>
      <button type="button" class="settings-button" :disabled="checking || loading" @click="load(true)">
        <RefreshCw :size="15" :class="{ 'provider-spin': checking }" /> {{ checking ? '检查中' : '重新检查' }}
      </button>
      <button type="button" class="settings-button primary" :disabled="saving || loading" @click="save">
        <Save :size="15" /> {{ saving ? '保存中' : '保存配置' }}
      </button>
    </header>

    <div v-if="loading" class="settings-status-banner">
      <div class="settings-status-copy"><RefreshCw :size="18" class="provider-spin" /><div><strong>正在读取 Agent 状态</strong><span>检查本机 CLI 与安全凭据配置。</span></div></div>
    </div>

    <template v-else>
      <div class="agent-provider-list">
        <section v-for="provider in providers" :key="provider.id" class="agent-provider-row">
          <div class="agent-provider-main">
            <span class="agent-provider-icon"><Bot :size="18" /></span>
            <div class="agent-provider-copy">
              <div class="agent-provider-title">
                <strong>{{ provider.label }}</strong>
                <span class="provider-state" :class="{ ready: isReady(statuses[provider.id]) }">{{ stateLabel(statuses[provider.id]) }}</span>
              </div>
              <p>{{ provider.description }}</p>
              <span class="agent-provider-meta">
                {{ statuses[provider.id]?.version || statuses[provider.id]?.detail || '未检测到版本信息' }}
                <template v-if="statuses[provider.id]?.account"> · {{ statuses[provider.id].account }}</template>
              </span>
              <span v-if="statuses[provider.id]?.install?.status === 'failed'" class="provider-install-error">
                {{ statuses[provider.id]?.install?.error || statuses[provider.id]?.install?.output || '安装失败，请检查 npm、网络或系统权限。' }}
              </span>
            </div>
          </div>
          <div class="provider-model-field">
            <label :for="`${provider.id}-provider-model`">任务模型</label>
            <input
              :id="`${provider.id}-provider-model`"
              v-model="config[provider.id].model"
              class="settings-input"
              :list="`${provider.id}-provider-models`"
              :placeholder="modelLoading[provider.id] ? '正在读取可用模型...' : '自动选择，也可输入模型 ID'"
            >
            <datalist :id="`${provider.id}-provider-models`">
              <option v-for="model in modelOptions[provider.id]" :key="model.id || 'auto'" :value="model.id">{{ model.label }}</option>
            </datalist>
            <span class="settings-field-hint">留空时跟随 {{ provider.label }} 默认模型，修改后应用于后续任务。</span>
          </div>
          <div class="agent-provider-controls">
            <label class="settings-switch" :aria-label="`启用 ${provider.label}`">
              <input v-model="config[provider.id].enabled" type="checkbox">
              <span class="settings-switch-track"></span>
              启用
            </label>
            <button v-if="!statuses[provider.id]?.installed" type="button" class="settings-button primary" :disabled="statuses[provider.id]?.install?.status === 'running' || actionProvider === provider.id" @click="install(provider.id)">
              <RefreshCw v-if="statuses[provider.id]?.install?.status === 'running'" :size="15" class="provider-spin" />
              <Download v-else :size="15" /> {{ statuses[provider.id]?.install?.status === 'running' ? '安装中' : '安装' }}
            </button>
            <button v-else-if="statuses[provider.id]?.authState !== 'logged_in'" type="button" class="settings-button primary" :disabled="actionProvider === provider.id" @click="login(provider.id)">
              <LogIn :size="15" /> 登录
            </button>
            <button v-else type="button" class="settings-button" :disabled="actionProvider === provider.id" @click="logout(provider.id)">
              <LogOut :size="15" /> 退出
            </button>
            <button v-if="statuses[provider.id]?.installed" type="button" class="settings-button icon-text-button" :disabled="statuses[provider.id]?.install?.status === 'running' || actionProvider === provider.id" :title="`更新 ${provider.label}`" @click="install(provider.id)">
              <RefreshCw :size="15" :class="{ 'provider-spin': statuses[provider.id]?.install?.status === 'running' }" /> 更新
            </button>
          </div>
        </section>
      </div>

      <section class="agent-provider-row claude-provider-row">
        <div class="agent-provider-main">
          <span class="agent-provider-icon"><KeyRound :size="18" /></span>
          <div class="agent-provider-copy">
            <div class="agent-provider-title">
              <strong>Claude Code API</strong>
              <span class="provider-state" :class="{ ready: isReady(statuses.claudecode) }">{{ stateLabel(statuses.claudecode) }}</span>
            </div>
            <p>Claude Code 直接使用你配置的 Anthropic 兼容第三方 API，不读取 Claude 账号登录态。</p>
            <span class="agent-provider-meta">{{ statuses.claudecode?.version || statuses.claudecode?.detail }}</span>
            <span v-if="statuses.claudecode?.install?.status === 'failed'" class="provider-install-error">
              {{ statuses.claudecode?.install?.error || statuses.claudecode?.install?.output || 'Claude Code 安装失败。' }}
            </span>
          </div>
          <button v-if="!statuses.claudecode?.installed" type="button" class="settings-button primary claude-install-button" :disabled="statuses.claudecode?.install?.status === 'running' || actionProvider === 'claudecode'" @click="install('claudecode')">
            <RefreshCw v-if="statuses.claudecode?.install?.status === 'running'" :size="15" class="provider-spin" />
            <Download v-else :size="15" /> {{ statuses.claudecode?.install?.status === 'running' ? '安装中' : '安装 Claude Code' }}
          </button>
        </div>

        <div class="settings-form claude-provider-form">
          <label class="settings-switch">
            <input v-model="config.claudecode.enabled" type="checkbox">
            <span class="settings-switch-track"></span>
            启用 Claude Code 第三方 API
          </label>
          <div class="settings-form-grid">
            <div class="settings-field">
              <label for="claude-provider-url">API Base URL</label>
              <input id="claude-provider-url" v-model="config.claudecode.apiUrl" class="settings-input" placeholder="https://api.anthropic.com">
            </div>
            <div class="settings-field">
              <label for="claude-provider-model">模型名称</label>
              <input id="claude-provider-model" v-model="config.claudecode.model" class="settings-input" list="claudecode-provider-models" placeholder="输入第三方 API 支持的模型 ID">
              <datalist id="claudecode-provider-models">
                <option v-for="model in modelOptions.claudecode" :key="model.id" :value="model.id">{{ model.label }}</option>
              </datalist>
            </div>
          </div>
          <div class="settings-form-grid">
            <div class="settings-field">
              <label for="claude-credential-type">认证字段</label>
              <select id="claude-credential-type" v-model="config.claudecode.credentialType" class="settings-input">
                <option value="api_key">ANTHROPIC_API_KEY</option>
                <option value="auth_token">ANTHROPIC_AUTH_TOKEN</option>
              </select>
            </div>
            <div class="settings-field">
              <label for="claude-provider-key">API Key</label>
              <input id="claude-provider-key" v-model="config.claudecode.apiKey" type="password" class="settings-input" :placeholder="config.claudecode.hasKey ? '已加密保存，留空不修改' : '输入第三方 API Key'">
              <span class="settings-field-hint"><ShieldCheck :size="12" /> 密钥仅保存在本机 AES-256-GCM 凭据仓库中，不会返回浏览器。</span>
            </div>
          </div>
          <div class="settings-panel-actions provider-form-actions">
            <button v-if="config.claudecode.hasKey" type="button" class="settings-button danger" :disabled="saving" @click="clearClaudeKey"><LogOut :size="15" /> 移除密钥</button>
            <button type="button" class="settings-button primary" :disabled="saving" @click="save"><Save :size="15" /> {{ saving ? '保存中' : '保存并应用' }}</button>
          </div>
        </div>
      </section>

      <div class="settings-details provider-routing-note">
        <div class="settings-details-content">
          <CheckCircle2 :size="15" />
          <span>项目选择哪一种 Agent，就只读取对应认证。CLI 登录与 Claude Code API 互不混用；Gemini CLI 和 OpenCode 同样受 CCM 的项目范围、MCP 权限和记忆快照约束。</span>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.agent-provider-list { border-top: 1px solid var(--border-color); }
.agent-provider-row { padding: 18px 0; border-bottom: 1px solid var(--border-color); }
.agent-provider-main { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.agent-provider-icon { width: 34px; height: 34px; flex: 0 0 auto; display: grid; place-items: center; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); color: var(--accent-blue); }
.agent-provider-copy { min-width: 0; flex: 1; }
.agent-provider-title { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.agent-provider-title strong { font-size: 13px; }
.agent-provider-copy p { margin: 5px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.agent-provider-meta { display: block; margin-top: 5px; color: var(--text-muted); font-size: 10.5px; overflow-wrap: anywhere; }
.provider-state { padding: 2px 7px; border-radius: 999px; background: rgba(245, 158, 11, .11); color: #a16207; font-size: 10px; font-weight: 800; }
.provider-state.ready { background: rgba(16, 185, 129, .11); color: #087f5b; }
.agent-provider-controls { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 12px; }
.provider-model-field { margin: 14px 0 0 46px; max-width: 560px; }
.provider-model-field > label { display: block; margin-bottom: 6px; color: var(--text-secondary); font-size: 11px; font-weight: 700; }
.provider-model-field .settings-field-hint { margin-top: 6px; }
.provider-install-error { display: block; margin-top: 7px; color: var(--danger-color, #b42318); font-size: 10.5px; line-height: 1.45; overflow-wrap: anywhere; white-space: pre-line; }
.claude-install-button { margin: 12px 0 0 46px; }
.claude-provider-row { margin-top: 8px; }
.claude-provider-form { margin: 16px 0 0 46px; }
.provider-form-actions { padding-top: 2px; }
.provider-routing-note { margin-top: 18px; }
.provider-routing-note .settings-details-content { display: flex; align-items: flex-start; gap: 8px; margin-top: 0; }
.provider-routing-note svg { flex: 0 0 auto; margin-top: 2px; color: var(--accent-green); }
.settings-field-hint { display: flex; align-items: flex-start; gap: 5px; }
.settings-field-hint svg { flex: 0 0 auto; margin-top: 1px; }
.provider-spin { animation: provider-spin .9s linear infinite; }
@keyframes provider-spin { to { transform: rotate(360deg); } }
@media (max-width: 820px) {
  .agent-provider-controls { justify-content: flex-start; flex-wrap: wrap; padding-left: 46px; }
  .provider-model-field { margin-left: 46px; }
  .claude-provider-form { margin-left: 0; }
  .claude-install-button { margin-left: 46px; }
}
@media (max-width: 560px) {
  .agent-provider-controls { padding-left: 0; }
  .provider-model-field, .claude-install-button { margin-left: 0; }
}
</style>
