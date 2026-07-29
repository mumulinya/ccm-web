<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Bot, CheckCircle2, CircleUserRound, CircleX, Copy, Download, ExternalLink, FlaskConical, KeyRound, Link2, LogIn, LogOut, RefreshCw, Save, ShieldCheck, Terminal } from '@lucide/vue'
import { confirmDialog, toast } from '../../utils/toast.js'

const loading = ref(true)
const saving = ref(false)
const checking = ref(false)
const actionProvider = ref('')
const testingProvider = ref('')
const testResults = ref({})
const manualCommands = ref({})
const loginSessions = ref({})
const loginCodes = ref({})
const statuses = ref({})
const providerCatalog = ref([])
const modelOptions = ref({ codex: [], cursor: [], gemini: [], opencode: [], claudecode: [] })
const modelMetadata = ref({ codex: {}, cursor: {}, gemini: {}, opencode: {}, claudecode: {} })
const modelLoading = ref({ codex: false, cursor: false, gemini: false, opencode: false, claudecode: false })
const customModelMode = ref({ codex: false, cursor: false, gemini: false, opencode: false, claudecode: false })
const modelRequestGeneration = { codex: 0, cursor: 0, gemini: 0, opencode: 0, claudecode: 0 }
const openCodeLoginProvider = ref('openai')
const installPollTimers = new Map()
const installCompletionReceipts = new Set()
const loginPollTimers = new Map()
const loginPopups = new Map()
const openedAuthUrls = new Map()
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
    syncExternal: true,
    externalManaged: false,
    providerName: '',
    manualEnabled: false,
    hasKey: false,
    credentialProtected: false
  }
})

const providers = computed(() => providerCatalog.value.filter(item => item.id !== 'claudecode'))

const stateLabel = status => {
  if (status?.install?.status === 'running') return status?.install?.operation === 'update' ? '更新中' : '安装中'
  if (!status?.installed) return '未安装'
  if (status.authState === 'logged_in') return '已登录'
  if (status.authState === 'configured') return '已配置'
  if (status.authState === 'credential_detected') return '待验证'
  return '待认证'
}

const isReady = status => status?.installed && ['logged_in', 'configured'].includes(status?.authState)
const canTest = status => status?.installed && ['logged_in', 'configured', 'credential_detected'].includes(status?.authState)
const isLoginActive = provider => ['starting', 'awaiting_browser', 'awaiting_code', 'exchanging'].includes(loginSessions.value[provider]?.status)

const providerLabel = provider => providerCatalog.value.find(item => item.id === provider)?.label || provider

const hasModelCatalog = provider => modelMetadata.value[provider]?.source !== 'unavailable'
  && (modelOptions.value[provider] || []).some(model => model.id)

const modelSelectionValue = provider => customModelMode.value[provider] ? '__custom__' : String(config.value[provider]?.model || '')

const selectProviderModel = (provider, event) => {
  const value = String(event.target.value || '')
  if (value === '__custom__') {
    customModelMode.value = { ...customModelMode.value, [provider]: true }
    config.value[provider].model = ''
    return
  }
  customModelMode.value = { ...customModelMode.value, [provider]: false }
  config.value[provider].model = value
}

const syncCustomModelMode = provider => {
  const selected = String(config.value[provider]?.model || '')
  const listed = (modelOptions.value[provider] || []).some(model => model.id === selected)
  customModelMode.value = { ...customModelMode.value, [provider]: !!selected && !listed }
}

const updateLoginSession = (provider, session) => {
  loginSessions.value = { ...loginSessions.value, [provider]: session }
}

const stopLoginPolling = provider => {
  const timer = loginPollTimers.get(provider)
  if (timer) window.clearTimeout(timer)
  loginPollTimers.delete(provider)
}

const createLoginPopup = provider => {
  const popup = window.open('', `ccm_agent_login_${provider}`, 'popup=yes,width=560,height=720,resizable=yes,scrollbars=yes')
  if (!popup) return null
  try {
    popup.document.title = `${providerLabel(provider)} 网页登录`
    popup.document.body.style.cssText = 'margin:0;min-height:100vh;display:grid;place-items:center;background:#07111d;color:#e8f1f8;font-family:Inter,system-ui,sans-serif'
    const shell = popup.document.createElement('div')
    shell.style.cssText = 'width:min(420px,calc(100vw - 48px));padding:32px;border:1px solid #27445a;border-radius:8px;background:#0c1a28;box-shadow:0 24px 70px rgba(0,0,0,.38)'
    const mark = popup.document.createElement('strong')
    mark.textContent = 'CCM'
    mark.style.cssText = 'display:block;color:#53d4b4;font-size:14px;letter-spacing:0'
    const title = popup.document.createElement('h1')
    title.textContent = `正在准备 ${providerLabel(provider)} 登录`
    title.style.cssText = 'margin:18px 0 10px;font-size:24px;letter-spacing:0'
    const copy = popup.document.createElement('p')
    copy.textContent = '正在向第三方 Agent 请求一次性授权页面，请稍候。'
    copy.style.cssText = 'margin:0;color:#9cb1c1;line-height:1.7'
    const progress = popup.document.createElement('div')
    progress.style.cssText = 'height:3px;margin-top:24px;background:#173044;overflow:hidden'
    const bar = popup.document.createElement('i')
    bar.style.cssText = 'display:block;width:42%;height:100%;background:#53d4b4;animation:none'
    progress.appendChild(bar)
    shell.append(mark, title, copy, progress)
    popup.document.body.appendChild(shell)
  } catch {}
  loginPopups.set(provider, popup)
  return popup
}

const navigateLoginPopup = (provider, authUrl) => {
  if (!authUrl || openedAuthUrls.get(provider) === authUrl) return
  const popup = loginPopups.get(provider)
  if (popup && !popup.closed) {
    try { popup.location.replace(authUrl) } catch { popup.location.href = authUrl }
  }
  openedAuthUrls.set(provider, authUrl)
}

const openLoginUrl = provider => {
  const authUrl = loginSessions.value[provider]?.authUrl
  if (!authUrl) return
  const popup = window.open(authUrl, `ccm_agent_login_${provider}`, 'popup=yes,width=720,height=820,resizable=yes,scrollbars=yes')
  if (popup) loginPopups.set(provider, popup)
  else toast.error('浏览器阻止了登录弹窗，请允许本站打开弹窗后重试')
}

const pollLoginSession = provider => {
  stopLoginPolling(provider)
  const run = async () => {
    const session = loginSessions.value[provider]
    if (!session?.sessionId) return
    try {
      const response = await fetch(`/api/system/agent-providers/${provider}/login/${session.sessionId}`)
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || '读取网页登录状态失败')
      updateLoginSession(provider, data)
      navigateLoginPopup(provider, data.authUrl)
      if (data.status === 'succeeded') {
        stopLoginPolling(provider)
        toast.success(`${providerLabel(provider)} 已登录`)
        await load(true, true)
        return
      }
      if (data.status === 'failed') {
        stopLoginPolling(provider)
        toast.error(data.error || `${providerLabel(provider)} 登录未完成`)
        return
      }
    } catch (error) {
      stopLoginPolling(provider)
      toast.error(error?.message || '读取网页登录状态失败')
      return
    }
    loginPollTimers.set(provider, window.setTimeout(run, 1200))
  }
  loginPollTimers.set(provider, window.setTimeout(run, 350))
}

const rememberManualCommand = async (provider, command, label = '在 CCM 所在服务器的 SSH 终端运行') => {
  if (!command) return
  manualCommands.value = { ...manualCommands.value, [provider]: { command, label } }
  try { await navigator.clipboard?.writeText(command) } catch {}
}

const copyManualCommand = async provider => {
  const command = manualCommands.value[provider]?.command
  if (!command) return
  try {
    await navigator.clipboard.writeText(command)
    toast.success('命令已复制')
  } catch {
    toast.error('无法自动复制，请手动选择命令')
  }
}

const copyLoginCode = async provider => {
  const code = loginSessions.value[provider]?.userCode
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    toast.success('设备码已复制')
  } catch {
    toast.error('无法自动复制，请手动选择设备码')
  }
}

const loadProviderModels = async provider => {
  const generation = ++modelRequestGeneration[provider]
  if (provider !== 'claudecode' && statuses.value[provider]?.authState !== 'logged_in') {
    if (generation !== modelRequestGeneration[provider]) return
    modelOptions.value[provider] = []
    modelMetadata.value[provider] = { source: 'unavailable', error: '完成登录后才能读取当前账号的可用模型' }
    modelLoading.value[provider] = false
    syncCustomModelMode(provider)
    return
  }
  modelLoading.value[provider] = true
  try {
    const response = await fetch(`/api/system/agent-providers/${provider}/models`)
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '读取模型失败')
    if (generation !== modelRequestGeneration[provider]) return
    modelOptions.value[provider] = data.models || []
    modelMetadata.value[provider] = { source: data.source || 'unavailable', error: data.error || '', detail: data.detail || '', allowsCustom: data.allowsCustom !== false }
    syncCustomModelMode(provider)
  } catch (error) {
    if (generation !== modelRequestGeneration[provider]) return
    modelOptions.value[provider] = []
    modelMetadata.value[provider] = { source: 'unavailable', error: error?.message || '读取模型列表失败' }
    syncCustomModelMode(provider)
  } finally {
    modelLoading.value[provider] = false
  }
}

const load = async (force = false, quiet = false, loadModels = true) => {
  if (force && !quiet) checking.value = true
  else if (!force) loading.value = true
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
    for (const [provider, status] of Object.entries(statuses.value)) {
      if (status?.authState === 'logged_in' && manualCommands.value[provider]) {
        const next = { ...manualCommands.value }
        delete next[provider]
        manualCommands.value = next
      }
    }
    if (loadModels) void Promise.all(['codex', 'cursor', 'gemini', 'opencode', 'claudecode'].map(loadProviderModels))
    if (force && !quiet) toast.success('Agent 状态已更新')
  } catch (error) {
    toast.error(error?.message || '读取开发 Agent 配置失败')
  } finally {
    loading.value = false
    checking.value = false
  }
}

const stopInstallPolling = provider => {
  const timer = installPollTimers.get(provider)
  if (timer) window.clearTimeout(timer)
  installPollTimers.delete(provider)
}

const installReceiptKey = (provider, install = {}) => [
  provider,
  install.operation || '',
  install.startedAt || '',
  install.completedAt || '',
  install.status || ''
].join(':')

const pollInstallStatus = provider => {
  stopInstallPolling(provider)
  const run = async () => {
    try {
      const response = await fetch('/api/system/agent-providers/status')
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || '读取安装状态失败')
      statuses.value = data.statuses || statuses.value
      const status = statuses.value[provider]
      const install = status?.install || {}
      if (install.status === 'running') {
        installPollTimers.set(provider, window.setTimeout(run, 1800))
        return
      }
      stopInstallPolling(provider)
      if (['succeeded', 'failed'].includes(install.status)) {
        const receipt = installReceiptKey(provider, install)
        if (!installCompletionReceipts.has(receipt)) {
          installCompletionReceipts.add(receipt)
          const label = providerLabel(provider)
          const actionLabel = install.operation === 'update' ? '更新' : '安装'
          if (install.status === 'failed') toast.error(`${label} ${actionLabel}失败`)
          else toast.success(`${label} ${actionLabel}完成`)
        }
      }
      await load(false, true)
    } catch {
      installPollTimers.set(provider, window.setTimeout(run, 2400))
    }
  }
  installPollTimers.set(provider, window.setTimeout(run, 350))
}

const save = async () => {
  saving.value = true
  const claude = config.value.claudecode
  const claudePayload = {
    enabled: claude.externalManaged ? claude.manualEnabled === true : claude.enabled,
    syncExternal: claude.syncExternal !== false,
  }
  if (!claude.externalManaged) Object.assign(claudePayload, {
    apiUrl: claude.apiUrl,
    model: claude.model,
    credentialType: claude.credentialType
  })
  const payload = {
    codex: { enabled: config.value.codex.enabled, model: config.value.codex.model },
    cursor: { enabled: config.value.cursor.enabled, model: config.value.cursor.model },
    gemini: { enabled: config.value.gemini.enabled, model: config.value.gemini.model },
    opencode: { enabled: config.value.opencode.enabled, model: config.value.opencode.model },
    claudecode: claudePayload
  }
  if (!claude.externalManaged && claude.apiKey) payload.claudecode.apiKey = claude.apiKey
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
    void Promise.all(['codex', 'cursor', 'gemini', 'opencode', 'claudecode'].map(loadProviderModels))
    toast.success('开发 Agent 配置已保存并应用到后续任务')
  } catch (error) {
    toast.error(error?.message || '保存开发 Agent 配置失败')
  } finally {
    saving.value = false
  }
}

const testProvider = async provider => {
  testingProvider.value = provider
  testResults.value = { ...testResults.value, [provider]: { pending: true } }
  try {
    const response = await fetch(`/api/system/agent-providers/${provider}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.value[provider]?.model || '' })
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || 'Agent 可用性测试失败')
    testResults.value = { ...testResults.value, [provider]: data.test }
    if (data.test?.usable) {
      toast.success(`${providerLabel(provider)} 可以正常使用`)
      await load(true, true, true)
    }
    else toast.error(data.test?.detail || `${providerLabel(provider)} 当前不可用`)
  } catch (error) {
    testResults.value = { ...testResults.value, [provider]: { usable: false, detail: error?.message || 'Agent 可用性测试失败', checkedAt: new Date().toISOString() } }
    toast.error(error?.message || 'Agent 可用性测试失败')
  } finally {
    testingProvider.value = ''
  }
}

const install = async provider => {
  actionProvider.value = provider
  try {
    const response = await fetch(`/api/system/agent-providers/${provider}/install`, { method: 'POST' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '无法启动安装')
    statuses.value = { ...statuses.value, [provider]: { ...statuses.value[provider], install: data.install } }
    toast.success(statuses.value[provider]?.installed ? '更新任务已启动，可以留在当前页面查看进度' : '安装任务已启动，可以留在当前页面查看进度')
    pollInstallStatus(provider)
  } catch (error) {
    toast.error(error?.message || '无法启动安装')
  } finally {
    actionProvider.value = ''
  }
}

const login = async provider => {
  const popup = createLoginPopup(provider)
  actionProvider.value = provider
  try {
    const response = await fetch(`/api/system/agent-providers/${provider}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(provider === 'opencode' ? { provider_id: openCodeLoginProvider.value } : {})
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '无法启动登录')
    updateLoginSession(provider, data)
    navigateLoginPopup(provider, data.authUrl)
    pollLoginSession(provider)
    if (!popup) toast.error('浏览器阻止了登录弹窗，请允许本站弹窗并点击“打开认证页”')
    else toast.success('网页登录已启动，请在弹出的浏览器页面完成认证')
  } catch (error) {
    try { if (popup && !popup.closed) popup.close() } catch {}
    toast.error(error?.message || '无法启动登录')
  } finally {
    actionProvider.value = ''
  }
}

const submitLoginCode = async provider => {
  const session = loginSessions.value[provider]
  const code = String(loginCodes.value[provider] || '').trim()
  if (!session?.sessionId || !code) {
    toast.error('请先粘贴网页显示的授权码')
    return
  }
  actionProvider.value = provider
  try {
    const response = await fetch(`/api/system/agent-providers/${provider}/login/${session.sessionId}/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '授权码提交失败')
    updateLoginSession(provider, data)
    loginCodes.value = { ...loginCodes.value, [provider]: '' }
    pollLoginSession(provider)
    toast.success('授权码已提交，正在验证登录结果')
  } catch (error) {
    toast.error(error?.message || '授权码提交失败')
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
    if (data.partial) {
      toast.error(`${label} 已退出当前凭据，但仍检测到：${(data.remainingCredentialSources || []).join('、')}`)
      await load(true)
    } else if (data.manual) {
      await rememberManualCommand(provider, data.command)
      toast.success(`服务器退出命令已显示并尝试复制，请在 SSH 终端执行`)
    } else if (data.interactive) toast.success(`已打开 ${label} 认证管理窗口，完成后点击“重新检查”`)
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
  await load(false, false, false)
  for (const [provider, status] of Object.entries(statuses.value)) {
    if (status?.install?.status === 'running') pollInstallStatus(provider)
  }
  // 首屏用缓存秒开后，静默做一次强制复检：外部终端里的 CLI 登录/登出
  // 不会触发服务端缓存失效，这里主动等一轮真实探测纠正过期状态
  void load(true, true, true)
})
onBeforeUnmount(() => {
  for (const provider of installPollTimers.keys()) stopInstallPolling(provider)
  for (const provider of loginPollTimers.keys()) stopLoginPolling(provider)
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
              <span class="agent-provider-meta">{{ statuses[provider.id]?.version || '未检测到版本信息' }}</span>
              <span v-if="statuses[provider.id]?.authState === 'logged_in'" class="provider-account" :class="{ unresolved: !statuses[provider.id]?.account }">
                <CircleUserRound :size="13" />
                <strong>当前账号</strong>
                {{ statuses[provider.id]?.account || '已登录，但 Agent 未公开账号名称' }}
              </span>
              <span v-if="statuses[provider.id]?.detail" class="agent-provider-auth-detail">{{ statuses[provider.id].detail }}</span>
              <span v-if="statuses[provider.id]?.install?.status === 'failed'" class="provider-install-error">
                {{ statuses[provider.id]?.install?.error || statuses[provider.id]?.install?.output || `${statuses[provider.id]?.install?.operation === 'update' ? '更新' : '安装'}失败，请检查网络、系统权限和命令路径。` }}
              </span>
            </div>
          </div>
          <div class="provider-model-field">
            <label :for="`${provider.id}-provider-model`">任务模型</label>
            <select
              v-if="hasModelCatalog(provider.id)"
              :id="`${provider.id}-provider-model`"
              class="settings-input"
              :value="modelSelectionValue(provider.id)"
              @change="selectProviderModel(provider.id, $event)"
            >
              <option v-for="model in modelOptions[provider.id]" :key="model.id || 'auto'" :value="model.id">{{ model.label }}</option>
              <option v-if="modelMetadata[provider.id]?.allowsCustom" value="__custom__">自定义模型 ID...</option>
            </select>
            <input
              v-if="!hasModelCatalog(provider.id) || customModelMode[provider.id]"
              :id="hasModelCatalog(provider.id) ? `${provider.id}-provider-custom-model` : `${provider.id}-provider-model`"
              v-model="config[provider.id].model"
              class="settings-input provider-custom-model"
              :placeholder="modelLoading[provider.id] ? '正在读取可用模型...' : '输入模型 ID，留空使用自动模式'"
            >
            <span v-if="hasModelCatalog(provider.id)" class="settings-field-hint model-catalog-ok">{{ modelMetadata[provider.id]?.detail || `当前账号返回 ${modelOptions[provider.id].filter(model => model.id).length} 个可用模型，修改后应用于后续任务。` }}</span>
            <span v-else class="settings-field-hint">{{ modelLoading[provider.id] ? '正在读取当前账号与本机 CLI 的模型目录...' : (modelMetadata[provider.id]?.error || '当前 Agent 无法枚举模型，可留空使用自动模式或手动填写模型 ID。') }}</span>
            <template v-if="provider.id === 'opencode' && statuses.opencode?.authState !== 'logged_in'">
              <label for="opencode-login-provider">登录 Provider</label>
              <select id="opencode-login-provider" v-model="openCodeLoginProvider" class="settings-input">
                <option value="">由 OpenCode 交互选择</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="openrouter">OpenRouter</option>
                <option value="github-copilot">GitHub Copilot</option>
              </select>
              <span class="settings-field-hint">登录只作用于所选OpenCode Provider，不会清除其他Provider。</span>
            </template>
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
            <button v-else-if="statuses[provider.id]?.authState !== 'logged_in'" type="button" class="settings-button primary" :disabled="actionProvider === provider.id || isLoginActive(provider.id)" @click="login(provider.id)">
              <RefreshCw v-if="isLoginActive(provider.id)" :size="15" class="provider-spin" />
              <LogIn v-else :size="15" /> {{ isLoginActive(provider.id) ? '认证中' : '登录' }}
            </button>
            <button v-else type="button" class="settings-button" :disabled="actionProvider === provider.id || testingProvider === provider.id" @click="logout(provider.id)">
              <LogOut :size="15" /> 退出
            </button>
            <button v-if="canTest(statuses[provider.id])" type="button" class="settings-button provider-test-button" :disabled="testingProvider === provider.id || actionProvider === provider.id" :title="`使用当前模型测试 ${provider.label}，可能产生少量 Provider 用量`" @click="testProvider(provider.id)">
              <RefreshCw v-if="testingProvider === provider.id" :size="15" class="provider-spin" />
              <FlaskConical v-else :size="15" /> {{ testingProvider === provider.id ? '测试中' : '测试' }}
            </button>
            <button v-if="statuses[provider.id]?.installed" type="button" class="settings-button icon-text-button" :disabled="statuses[provider.id]?.install?.status === 'running' || actionProvider === provider.id || testingProvider === provider.id" :title="`更新 ${provider.label}`" @click="install(provider.id)">
              <RefreshCw :size="15" :class="{ 'provider-spin': statuses[provider.id]?.install?.status === 'running' }" /> 更新
            </button>
          </div>
          <div v-if="testResults[provider.id] && !testResults[provider.id].pending" class="provider-test-result" :class="{ passed: testResults[provider.id].usable, failed: !testResults[provider.id].usable }">
            <CheckCircle2 v-if="testResults[provider.id].usable" :size="15" />
            <CircleX v-else :size="15" />
            <div>
              <strong>{{ testResults[provider.id].usable ? '当前 Agent 可以使用' : '当前 Agent 测试失败' }}</strong>
              <span>{{ testResults[provider.id].detail }}<template v-if="testResults[provider.id].latencyMs"> · {{ testResults[provider.id].latencyMs }} ms</template><template v-if="testResults[provider.id].model"> · {{ testResults[provider.id].model }}</template></span>
            </div>
          </div>
          <div v-if="loginSessions[provider.id]" class="provider-login-session" :data-status="loginSessions[provider.id].status">
            <div class="provider-login-session-head">
              <span class="provider-login-session-icon"><ShieldCheck :size="16" /></span>
              <div>
                <strong>{{ loginSessions[provider.id].status === 'succeeded' ? '网页登录成功' : loginSessions[provider.id].status === 'failed' ? '网页登录未完成' : '正在进行网页登录' }}</strong>
                <span>{{ loginSessions[provider.id].detail }}</span>
              </div>
              <button v-if="loginSessions[provider.id].authUrl && loginSessions[provider.id].status !== 'succeeded'" type="button" class="settings-button" @click="openLoginUrl(provider.id)">
                <ExternalLink :size="14" /> 打开认证页
              </button>
            </div>
            <div v-if="loginSessions[provider.id].userCode" class="provider-device-code">
              <span>设备码</span>
              <code>{{ loginSessions[provider.id].userCode }}</code>
              <button type="button" class="settings-button" title="复制设备码" @click="copyLoginCode(provider.id)"><Copy :size="14" /></button>
            </div>
            <form v-if="loginSessions[provider.id].requiresCode" class="provider-code-form" @submit.prevent="submitLoginCode(provider.id)">
              <label :for="`${provider.id}-authorization-code`">网页授权码</label>
              <input :id="`${provider.id}-authorization-code`" v-model="loginCodes[provider.id]" class="settings-input" autocomplete="one-time-code" placeholder="粘贴 Google 授权页面显示的代码">
              <button type="submit" class="settings-button primary" :disabled="actionProvider === provider.id || !loginCodes[provider.id]?.trim()">提交授权码</button>
            </form>
            <p v-if="loginSessions[provider.id].error" class="provider-login-error">{{ loginSessions[provider.id].error }}</p>
          </div>
          <div v-if="manualCommands[provider.id]" class="provider-manual-command">
            <span>{{ manualCommands[provider.id].label }}</span>
            <code>{{ manualCommands[provider.id].command }}</code>
            <button type="button" class="settings-button" title="复制命令" :aria-label="`复制 ${provider.label} 认证命令`" @click="copyManualCommand(provider.id)"><Copy :size="15" /></button>
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
            <span v-if="config.claudecode.externalManaged" class="claude-external-source"><Link2 :size="13" /> CC-Switch · {{ config.claudecode.providerName }}</span>
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
          <div v-if="config.claudecode.externalManaged" class="external-provider-banner">
            <Link2 :size="17" />
            <div><strong>正在跟随 CC-Switch</strong><span>地址、模型和凭据来自当前启用的 {{ config.claudecode.providerName }}；密钥不会复制到 CCM。</span></div>
          </div>
          <label v-if="config.claudecode.externalManaged" class="settings-switch">
            <input v-model="config.claudecode.syncExternal" type="checkbox">
            <span class="settings-switch-track"></span>
            自动跟随 CC-Switch 当前 Claude Provider
          </label>
          <label v-else class="settings-switch">
            <input v-model="config.claudecode.enabled" type="checkbox">
            <span class="settings-switch-track"></span>
            启用 Claude Code 第三方 API
          </label>
          <div class="settings-form-grid">
            <div class="settings-field">
              <label for="claude-provider-url">API Base URL</label>
              <input id="claude-provider-url" v-model="config.claudecode.apiUrl" class="settings-input" :disabled="config.claudecode.externalManaged" placeholder="https://api.anthropic.com">
            </div>
            <div class="settings-field">
              <label for="claude-provider-model">模型名称</label>
              <select v-if="hasModelCatalog('claudecode')" id="claude-provider-model" class="settings-input" :disabled="config.claudecode.externalManaged" :value="modelSelectionValue('claudecode')" @change="selectProviderModel('claudecode', $event)">
                <option v-for="model in modelOptions.claudecode" :key="model.id" :value="model.id">{{ model.label }}</option>
                <option v-if="modelMetadata.claudecode?.allowsCustom" value="__custom__">自定义模型 ID...</option>
              </select>
              <input v-if="!hasModelCatalog('claudecode') || customModelMode.claudecode" id="claude-provider-custom-model" v-model="config.claudecode.model" class="settings-input provider-custom-model" :disabled="config.claudecode.externalManaged" placeholder="输入第三方 API 支持的模型 ID">
              <span class="settings-field-hint">{{ hasModelCatalog('claudecode') ? `当前 API 返回 ${modelOptions.claudecode.length} 个可用模型。` : (modelMetadata.claudecode?.error || '保存 API 凭据后可读取模型列表。') }}</span>
            </div>
          </div>
          <div class="settings-form-grid">
            <div class="settings-field">
              <label for="claude-credential-type">认证字段</label>
              <select id="claude-credential-type" v-model="config.claudecode.credentialType" class="settings-input" :disabled="config.claudecode.externalManaged">
                <option value="api_key">ANTHROPIC_API_KEY</option>
                <option value="auth_token">ANTHROPIC_AUTH_TOKEN</option>
              </select>
            </div>
            <div class="settings-field">
              <label for="claude-provider-key">API Key</label>
              <input id="claude-provider-key" v-model="config.claudecode.apiKey" type="password" class="settings-input" :disabled="config.claudecode.externalManaged" :placeholder="config.claudecode.externalManaged ? '由 CC-Switch 管理，不复制到 CCM' : config.claudecode.hasKey ? '已加密保存，留空不修改' : '输入第三方 API Key'">
              <span class="settings-field-hint"><ShieldCheck :size="12" /> {{ config.claudecode.externalManaged ? 'CCM 只在后端运行时读取当前凭据，不会返回浏览器。' : '密钥仅保存在本机 AES-256-GCM 凭据仓库中，不会返回浏览器。' }}</span>
            </div>
          </div>
          <div class="settings-panel-actions provider-form-actions">
            <button v-if="config.claudecode.credentialProtected" type="button" class="settings-button danger" :disabled="saving" @click="clearClaudeKey"><LogOut :size="15" /> 移除密钥</button>
            <button v-if="canTest(statuses.claudecode)" type="button" class="settings-button" :disabled="testingProvider === 'claudecode'" title="使用当前模型测试 Claude Code API，可能产生少量 Provider 用量" @click="testProvider('claudecode')">
              <RefreshCw v-if="testingProvider === 'claudecode'" :size="15" class="provider-spin" />
              <FlaskConical v-else :size="15" /> {{ testingProvider === 'claudecode' ? '测试中' : '测试 Agent' }}
            </button>
            <button type="button" class="settings-button primary" :disabled="saving" @click="save"><Save :size="15" /> {{ saving ? '保存中' : '保存并应用' }}</button>
          </div>
          <div v-if="testResults.claudecode && !testResults.claudecode.pending" class="provider-test-result claude-test-result" :class="{ passed: testResults.claudecode.usable, failed: !testResults.claudecode.usable }">
            <CheckCircle2 v-if="testResults.claudecode.usable" :size="15" />
            <CircleX v-else :size="15" />
            <div><strong>{{ testResults.claudecode.usable ? 'Claude Code API 可以使用' : 'Claude Code API 测试失败' }}</strong><span>{{ testResults.claudecode.detail }}<template v-if="testResults.claudecode.latencyMs"> · {{ testResults.claudecode.latencyMs }} ms</template></span></div>
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
.provider-account { width: fit-content; max-width: 100%; display: flex; align-items: center; gap: 5px; margin-top: 7px; padding: 5px 8px; border: 1px solid color-mix(in srgb, var(--accent-green) 28%, var(--border-color)); border-radius: 6px; background: color-mix(in srgb, var(--accent-green) 6%, var(--bg-primary)); color: var(--text-secondary); font-size: 10.5px; overflow-wrap: anywhere; }
.provider-account svg { flex: 0 0 auto; color: var(--accent-green); }
.provider-account strong { color: var(--text-primary); font-size: inherit; }
.provider-account.unresolved { border-color: var(--border-color); background: var(--bg-secondary); }
.provider-account.unresolved svg { color: var(--text-muted); }
.claude-external-source { width: fit-content; display: flex; align-items: center; gap: 5px; margin-top: 7px; padding: 4px 7px; border: 1px solid color-mix(in srgb, var(--accent-blue) 25%, var(--border-color)); border-radius: 6px; background: color-mix(in srgb, var(--accent-blue) 5%, var(--bg-primary)); color: var(--accent-blue); font-size: 10.5px; }
.agent-provider-auth-detail { display: block; margin-top: 3px; color: var(--text-secondary); font-size: 10.5px; line-height: 1.45; overflow-wrap: anywhere; }
.provider-state { padding: 2px 7px; border-radius: 999px; background: rgba(245, 158, 11, .11); color: #a16207; font-size: 10px; font-weight: 800; }
.provider-state.ready { background: rgba(16, 185, 129, .11); color: #087f5b; }
.agent-provider-controls { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 12px; }
.provider-model-field { margin: 14px 0 0 46px; max-width: 560px; }
.provider-model-field > label { display: block; margin-bottom: 6px; color: var(--text-secondary); font-size: 11px; font-weight: 700; }
.provider-model-field .settings-field-hint { margin-top: 6px; }
.provider-model-field > .settings-input + .provider-custom-model, .settings-field > .settings-input + .provider-custom-model { margin-top: 8px; }
.model-catalog-ok { color: var(--accent-green); }
.provider-test-result { display: flex; align-items: flex-start; gap: 8px; margin: 10px 0 0 46px; padding: 9px 11px; border: 1px solid var(--border-color); border-radius: 7px; background: var(--bg-secondary); }
.provider-test-result > svg { flex: 0 0 auto; margin-top: 1px; }
.provider-test-result > div { min-width: 0; }
.provider-test-result strong, .provider-test-result span { display: block; }
.provider-test-result strong { font-size: 11px; }
.provider-test-result span { margin-top: 3px; color: var(--text-secondary); font-size: 10.5px; line-height: 1.45; overflow-wrap: anywhere; }
.provider-test-result.passed { border-color: color-mix(in srgb, var(--accent-green) 34%, var(--border-color)); background: color-mix(in srgb, var(--accent-green) 5%, var(--bg-primary)); }
.provider-test-result.passed > svg { color: var(--accent-green); }
.provider-test-result.failed { border-color: color-mix(in srgb, var(--danger-color, #b42318) 32%, var(--border-color)); background: color-mix(in srgb, var(--danger-color, #b42318) 4%, var(--bg-primary)); }
.provider-test-result.failed > svg { color: var(--danger-color, #b42318); }
.claude-test-result { margin-left: 0; }
.provider-install-error { display: block; margin-top: 7px; color: var(--danger-color, #b42318); font-size: 10.5px; line-height: 1.45; overflow-wrap: anywhere; white-space: pre-line; }
.provider-login-session { margin: 12px 0 0 46px; padding: 12px; border: 1px solid color-mix(in srgb, var(--accent-green) 34%, var(--border-color)); border-radius: 8px; background: color-mix(in srgb, var(--accent-green) 5%, var(--bg-primary)); }
.provider-login-session[data-status="failed"] { border-color: color-mix(in srgb, #b42318 38%, var(--border-color)); background: color-mix(in srgb, #b42318 4%, var(--bg-primary)); }
.provider-login-session-head { display: flex; align-items: center; gap: 10px; }
.provider-login-session-head > div { min-width: 0; flex: 1; }
.provider-login-session-head strong, .provider-login-session-head span { display: block; }
.provider-login-session-head strong { color: var(--text-primary); font-size: 11.5px; }
.provider-login-session-head span { margin-top: 3px; color: var(--text-secondary); font-size: 10.5px; line-height: 1.45; }
.provider-login-session-icon { width: 30px; height: 30px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--accent-green) 14%, transparent); color: var(--accent-green); }
.provider-device-code { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color); }
.provider-device-code > span { color: var(--text-secondary); font-size: 10.5px; }
.provider-device-code code { font-size: 17px; font-weight: 800; letter-spacing: 0; color: var(--text-primary); }
.provider-device-code .settings-button { margin-left: auto; }
.provider-code-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px 10px; align-items: end; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color); }
.provider-code-form label { grid-column: 1 / -1; color: var(--text-secondary); font-size: 10.5px; font-weight: 700; }
.provider-login-error { margin: 9px 0 0; color: var(--danger-color, #b42318); font-size: 10.5px; }
.provider-manual-command { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px 10px; align-items: center; margin: 10px 0 0 46px; padding: 10px 12px; border-left: 3px solid var(--accent-blue); background: var(--bg-secondary); }
.provider-manual-command > span { grid-column: 1 / -1; color: var(--text-secondary); font-size: 10.5px; }
.provider-manual-command code { min-width: 0; overflow-x: auto; color: var(--text-primary); font-size: 11px; white-space: nowrap; }
.claude-install-button { margin: 12px 0 0 46px; }
.claude-provider-row { margin-top: 8px; }
.claude-provider-form { margin: 16px 0 0 46px; }
.external-provider-banner { display: flex; align-items: flex-start; gap: 9px; padding: 11px 12px; border: 1px solid color-mix(in srgb, var(--accent-blue) 28%, var(--border-color)); border-radius: 7px; background: color-mix(in srgb, var(--accent-blue) 5%, var(--bg-primary)); }
.external-provider-banner > svg { flex: 0 0 auto; margin-top: 1px; color: var(--accent-blue); }
.external-provider-banner > div { min-width: 0; }
.external-provider-banner strong, .external-provider-banner span { display: block; }
.external-provider-banner strong { font-size: 11.5px; }
.external-provider-banner span { margin-top: 3px; color: var(--text-secondary); font-size: 10.5px; line-height: 1.5; }
.external-provider-banner + .settings-switch { margin-top: 12px; }
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
  .provider-login-session { margin-left: 46px; }
  .provider-test-result { margin-left: 46px; }
  .provider-test-result.claude-test-result { margin-left: 0; }
  .provider-manual-command { margin-left: 46px; }
  .claude-provider-form { margin-left: 0; }
  .claude-install-button { margin-left: 46px; }
}
@media (max-width: 560px) {
  .agent-provider-controls { padding-left: 0; }
  .provider-model-field, .provider-login-session, .provider-test-result, .provider-manual-command, .claude-install-button { margin-left: 0; }
  .provider-login-session-head { align-items: flex-start; flex-wrap: wrap; }
  .provider-login-session-head .settings-button { width: 100%; justify-content: center; }
  .provider-code-form { grid-template-columns: 1fr; }
}
</style>
