<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FolderKanban,
  Globe2,
  MessagesSquare,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Trash2,
} from '@lucide/vue'
import { toast } from '../../utils/toast.js'
import MicroCompactStatusPanel from './MicroCompactStatusPanel.vue'
import PostCompactRecoveryPanel from './PostCompactRecoveryPanel.vue'

const presets = [
  { id: 'default', label: '自动', window: 0, threshold: 0 },
  { id: '516k', label: '516K', window: 516000, threshold: 460000 },
  { id: '1m', label: '1M', window: 1000000, threshold: 900000 },
  { id: 'custom', label: '自定义', window: null, threshold: null },
]

const loading = ref(false)
const saving = ref(false)
const activePage = ref('memory')
const overview = ref({ groups: [], projects: [], globals: [], tasks: [], alerts: [], totals: {} })
const selectedScope = ref('')
const selectedId = ref('')
const detail = ref(null)
const query = ref('')
const audit = ref([])
const showAudit = ref(false)
const editState = ref(null)

const config = ref({
  memoryContextPreset: 'default',
  modelContextWindow: 0,
  modelAutoCompactTokenLimit: 0,
  providerContextCacheMode: 'auto',
  mcpToolLoadingMode: 'deferred',
  mcpToolAutoThresholdPercent: 10,
  skillCatalogBudgetPercent: 1,
  postCompactSkillPerItemMaxTokens: 5000,
  postCompactSkillTotalMaxTokens: 25000,
  contextSourceCatalogBudgetPercent: 1,
  contextSourceHydrationBudgetPercent: 10,
  postCompactSourcePerItemMaxTokens: 5000,
  postCompactSourceTotalMaxTokens: 25000,
  typedMemoryDeliveryMaxDocuments: 5,
  typedMemoryDeliveryMaxTokens: 5000,
  sessionMemoryCompactMaxSectionTokens: 2000,
  sessionMemoryCompactMaxTotalTokens: 12000,
  groupSessionRetentionDays: 30,
  groupSessionMaxArchived: 20,
  groupSessionAutoPruneEnabled: false,
  timeBasedMicrocompactEnabled: false,
  timeBasedMicrocompactGapMinutes: 60,
  timeBasedMicrocompactKeepRecent: 5,
  agentCommunicationV2Enabled: true,
  agentRunnerStartTimeoutMs: 60000,
  agentAckTimeoutMs: 30000,
  agentHeartbeatIntervalMs: 20000,
  agentHeartbeatLostTimeoutMs: 90000,
  agentLeaseTtlMs: 120000,
  agentMaxAttempts: 3,
  agentMaxParallelPerProject: 2,
  agentMaxParallelGlobal: 6,
  adaptiveAgentLoopEnabled: true,
  dynamicAgentBudgetEnabled: true,
  agentToolCallBudget: 6,
  agentMaxModelTurns: 8,
  agentLoopNoProgressThreshold: 3,
  agentToolBatchSize: 2,
  agentReadOnlyParallelism: 2,
  codeIntelligenceEnabled: true,
  codeIndexStartPolicy: 'on_demand',
  codeIndexMaxConcurrentProjects: 1,
  languageServerManagedInstallEnabled: true,
  providerNativeToolsMode: 'auto',
  skillForkEnabled: true,
  webToolsEnabled: true,
  webFetchBrowserFallbackEnabled: true,
  webSearchProviderOrder: ['mcp', 'brave', 'bing', 'google'],
  searchMcpUrl: '',
  searchMcpToken: '',
  braveSearchApiKey: '',
  bingSearchApiKey: '',
  googleCseApiKey: '',
  googleCseId: '',
  notebookToolsEnabled: true,
  ccStyleExecutionDisplayEnabled: true,
  ccStyleAgentProgressNarrationEnabled: true,
})
const webSearchProvidersConfigured = ref({ mcp: false, brave: false, bing: false, google: false })
const capacity = ref(null)
const capabilities = ref([])
const capabilityForm = ref({ provider: '', model: '', contextWindow: 200000, maxOutputTokens: 20000 })
const customizationMode = ref('prompt')
const customizationTarget = ref('')
const customContent = ref('')
const customProfile = ref(null)
const customizationLoading = ref(false)

const scopes = computed(() => [
  ...(overview.value.globals || []).map(item => ({ ...item, scope: item.scope || 'global' })),
  ...(overview.value.groups || []).map(item => ({ ...item, scope: item.scope || 'group' })),
  ...(overview.value.projects || []).map(item => ({ ...item, scope: item.scope || 'project' })),
  ...(overview.value.tasks || []).map(item => ({ ...item, scope: item.scope || 'task_agent' })),
])
const groupScopes = computed(() => scopes.value.filter(item => item.scope === 'group'))
const projectScopes = computed(() => scopes.value.filter(item => item.scope === 'project' || item.scope === 'project_session'))
const globalLongTermScopes = computed(() => scopes.value.filter(item => item.scope === 'global'))
const globalSessionScopes = computed(() => scopes.value.filter(item => item.scope === 'global_session'))
const taskScopes = computed(() => scopes.value.filter(item => item.scope === 'task_agent'))
const taskProjectTrees = computed(() => {
  const projects = new Map()
  for (const item of taskScopes.value) {
    const fallbackProject = String(item.label || '').split('/')[0]?.trim()
    const id = item.projectId || item.project || fallbackProject || 'unassigned'
    if (!projects.has(id)) projects.set(id, {
      id,
      label: item.projectLabel || (id === 'unassigned' ? '未关联项目' : id),
      sessions: [],
    })
    projects.get(id).sessions.push(item)
  }
  return [...projects.values()]
    .map(project => ({
      ...project,
      sessions: project.sessions.sort((left, right) => String(right.lastUsedAt || right.updatedAt || '').localeCompare(String(left.lastUsedAt || left.updatedAt || ''))),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
})
const globalTree = computed(() => ({
  id: 'global-agent',
  label: '全局 Agent',
  longTerm: globalLongTermScopes.value,
  sessions: globalSessionScopes.value,
}))
const groupTrees = computed(() => {
  const groups = new Map()
  for (const item of groupScopes.value) {
    const id = item.groupId || String(item.id || '').split('::')[0]
    if (!groups.has(id)) groups.set(id, { id, label: item.groupLabel || id, sessions: [] })
    groups.get(id).sessions.push(item)
  }
  return [...groups.values()]
})
const projectTrees = computed(() => {
  const projects = new Map()
  for (const item of projectScopes.value) {
    const id = item.projectId || (item.scope === 'project' ? item.id : String(item.id || '').split('::')[0])
    if (!projects.has(id)) projects.set(id, { id, label: id, longTerm: [], sessions: [] })
    if (item.scope === 'project') projects.get(id).longTerm.push(item)
    else projects.get(id).sessions.push(item)
  }
  return [...projects.values()]
})
const itemGroups = computed(() => (detail.value?.itemGroups || []).map(group => ({
  ...group,
  items: (group.items || []).filter(item => !query.value || `${item.text} ${item.itemId}`.toLowerCase().includes(query.value.toLowerCase())),
})).filter(group => group.items.length))
const selectedSummary = computed(() => {
  const overviewSummary = scopes.value.find(item => item.scope === selectedScope.value && item.id === selectedId.value)
  return overviewSummary ? { ...overviewSummary, ...(detail.value?.summary || {}), label: overviewSummary.label } : null
})
const isSessionDetail = computed(() => ['group', 'global_session', 'project_session', 'task_agent'].includes(selectedScope.value)
  && !(selectedScope.value === 'group' && !String(selectedId.value).includes('::')))
const microCompactState = computed(() => detail.value?.postCompactUsage?.timeBasedToolResultMicrocompact
  || detail.value?.summary?.microCompact
  || null)
const postCompactUsage = computed(() => detail.value?.postCompactUsage || null)
const providerContextCacheState = computed(() => detail.value?.providerContextCache || detail.value?.summary?.providerContextCache || null)
const contextEngineTrends = computed(() => detail.value?.summary?.contextEngineTrends || null)
const contextEngineRecovery = computed(() => detail.value?.summary?.contextEngineRecovery || null)
const contextSourceContinuity = computed(() => detail.value?.contextSourceContinuity || null)
const recoveryDrilling = ref(false)
const sourceMaintenancePreview = ref(null)
const sourceMaintenanceJob = ref(null)
const sourceMaintenanceLoading = ref(false)
const sourceMaintenanceIdentity = computed(() => {
  const generation = Number(contextSourceContinuity.value?.receipts?.[0]?.identity?.generation || 0)
  if (selectedScope.value === 'global_session') return { scope: 'global', scopeId: 'global-agent', sessionId: String(selectedId.value).replace(/^session:/, ''), generation }
  if (selectedScope.value === 'project_session') {
    const split = String(selectedId.value).indexOf('::')
    return split > 0 ? { scope: 'project', scopeId: String(selectedId.value).slice(0, split), sessionId: String(selectedId.value).slice(split + 2), generation } : null
  }
  if (selectedScope.value === 'group' && String(selectedId.value).includes('::')) {
    const split = String(selectedId.value).indexOf('::')
    return { scope: 'group', scopeId: String(selectedId.value).slice(0, split), sessionId: String(selectedId.value).slice(split + 2), generation }
  }
  return null
})

const typeLabels = {
  persistentRequirements: '长期要求', factAnchors: '事实', decisions: '决策', completed: '已完成',
  durableMemories: '有效长期记忆',
  blocked: '阻塞', workerLedger: '子 Agent 记录', openQuestions: '待确认', nextActions: '下一步',
  conclusions: '结论', user: '用户偏好', feedback: '反馈', authorization: '授权', missions: '任务',
  unresolved: '未解决', references: '引用', sessionSummary: '当前会话摘要', legacySessionSummary: '历史会话摘要（待模型验证）', sessionArchives: '本会话压缩归档',
  recentMessages: '近期原文（只读）',
}

const formatNumber = value => Number(value || 0).toLocaleString('zh-CN')
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN') : '未记录'
const providerCacheModeLabel = state => {
  const adapter = String(state?.adapterKind || '')
  if (adapter === 'openai_prompt_cache') return 'OpenAI 原生 Prompt Cache'
  if (adapter === 'gemini_implicit_cache') return 'Gemini 原生隐式缓存'
  if (adapter === 'anthropic_context_management') return 'Anthropic 原生上下文编辑'
  if (adapter === 'stable_prefix') return '稳定前缀缓存'
  return state?.providerNative ? 'Provider 原生' : 'CCM 受控投影'
}
const providerCapabilityLabel = state => ({
  confirmed: '已确认', unsupported: '不支持', unproven: '尚未证明', degraded: '临时降级',
}[state?.capability?.evidence?.status || state?.capability?.status] || '尚未证明')
const materializationCacheLabel = state => ({
  memory_hot_cache: '内存热缓存',
  shared_state: '共享状态复用',
  computed: '本轮重新构造',
}[state?.materializationCache?.source] || '未记录')
const cacheRecommendationLabel = recommendation => ({
  use_ccm_controlled_projection: '保持 CCM 受控投影',
  prefer_24h_retention: '建议改用 24 小时 Provider 缓存',
  keep_provider_default: '保持 Provider 当前配置',
}[recommendation?.action] || '等待更多真实 usage')
const formatUsd = value => `$${Number(value || 0).toFixed(6)}`
const summarySourceLabel = value => ({ model: '模型摘要', session_memory: '模型 Session Memory', 'session-memory': '模型 Session Memory' }[value] || '尚未生成')
// 只有精确的 group::gcs_* 会话有独立熔断台账，可被重置。
const isGroupSessionScope = computed(() => selectedScope.value === 'group' && String(selectedId.value).includes('::gcs_'))
const circuitFailureModeLabel = value => ({
  transient: '可重试故障',
  structural: '结构性故障',
  cancelled: '已取消',
}[String(value || '')] || '未知原因')
const sessionMemoryStatusLabel = value => ({
  ready: '模型记忆已就绪',
  waiting_model: '等待模型抽取',
  waiting_initialization_tokens: '等待达到抽取阈值',
  invalid: '模型记忆校验失败',
  waiting: '未就绪',
}[value] || '未就绪')
const taskAgentRuntimeLabel = value => ({
  claudecode: 'Claude Code',
  claude: 'Claude Code',
  codex: 'Codex',
  cursor: 'Cursor',
  gemini: 'Antigravity CLI',
  geminicli: 'Antigravity CLI',
  'gemini-cli': 'Antigravity CLI',
  antigravity: 'Antigravity CLI',
  'antigravity-cli': 'Antigravity CLI',
  agy: 'Antigravity CLI',
  opencode: 'OpenCode',
}[String(value || '').toLowerCase()] || '开发 Agent')
const shortTaskAgentId = value => {
  const id = String(value || '')
  return id.length > 16 ? `${id.slice(0, 12)}…` : id
}
const taskAgentSessionLabel = item => `${taskAgentRuntimeLabel(item.agentType)} · ${shortTaskAgentId(item.taskAgentSessionId || item.id)}`
const taskAgentSessionMeta = item => {
  const turns = Number(item.turnCount || 0)
  const state = item.status === 'open' ? '运行中' : item.status === 'closed' ? '已结束' : ''
  return [state, turns ? `${turns} 轮` : ''].filter(Boolean).join(' · ')
}

async function requestJson(url, options) {
  const response = await fetch(url, options)
  const data = await response.json()
  if (!response.ok || data.success === false) throw new Error(data.error || '请求失败')
  return data
}

async function loadDetail() {
  if (!selectedId.value) return
  detail.value = await requestJson(`/api/memory-center/scope?scope=${encodeURIComponent(selectedScope.value)}&id=${encodeURIComponent(selectedId.value)}`)
  if (showAudit.value) await loadAudit()
}

async function selectScope(item) {
  selectedScope.value = item.scope
  selectedId.value = item.id
  query.value = ''
  showAudit.value = false
  sourceMaintenancePreview.value = null
  sourceMaintenanceJob.value = null
  await loadDetail()
}

async function loadOverview(preserveSelection = true) {
  loading.value = true
  try {
    overview.value = await requestJson('/api/memory-center/overview')
    const exists = scopes.value.some(item => item.scope === selectedScope.value && item.id === selectedId.value)
    if (!preserveSelection || !exists) {
      const preferred = globalSessionScopes.value.find(item => item.currentSession)
        || groupScopes.value.find(item => item.alerts)
        || globalSessionScopes.value[0]
        || groupScopes.value[0]
        || projectScopes.value[0]
        || globalLongTermScopes.value[0]
      selectedScope.value = preferred?.scope || ''
      selectedId.value = preferred?.id || ''
    }
    await loadDetail()
  } catch (error) {
    toast.error(error.message || '读取记忆失败')
  } finally {
    loading.value = false
  }
}

async function loadAudit() {
  if (!selectedId.value) return
  const data = await requestJson(`/api/memory-center/audit?scope=${encodeURIComponent(selectedScope.value)}&id=${encodeURIComponent(selectedId.value)}&limit=100`)
  audit.value = data.audit || []
}

async function toggleAudit() {
  showAudit.value = !showAudit.value
  if (showAudit.value) await loadAudit()
}

async function resetCompactCircuit() {
  const reason = window.prompt('重置自动压缩熔断的原因（必填，将写入审计）')
  if (!reason || !reason.trim()) return
  try {
    await requestJson('/api/memory-center/compact-circuit-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopeId: selectedId.value, reason: reason.trim(), actor: 'memory-center' }),
    })
    await loadOverview(true)
    toast.success('自动压缩熔断已重置')
  } catch (error) {
    toast.error(error.message || '重置压缩熔断失败')
  }
}

async function previewSourceMaintenance() {
  if (!sourceMaintenanceIdentity.value) return
  sourceMaintenanceLoading.value = true
  try {
    sourceMaintenancePreview.value = await requestJson('/api/memory-center/context-source-maintenance/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sourceMaintenanceIdentity.value),
    })
    toast.success('历史来源收口预览已生成，尚未修改数据')
  } catch (error) { toast.error(error.message || '预览失败') }
  finally { sourceMaintenanceLoading.value = false }
}

async function applySourceMaintenance() {
  if (!sourceMaintenancePreview.value || !sourceMaintenanceIdentity.value) return
  const reason = window.prompt('执行历史来源收口的原因（必填，将创建备份）')
  if (!reason?.trim() || !window.confirm('确认按当前 checksum 执行？若数据已变化，服务端会整体拒绝。')) return
  sourceMaintenanceLoading.value = true
  try {
    sourceMaintenanceJob.value = await requestJson('/api/memory-center/context-source-maintenance/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sourceMaintenanceIdentity.value, planChecksum: sourceMaintenancePreview.value.planChecksum, reason: reason.trim(), actor: 'memory-center' }),
    })
    await loadDetail()
    toast.success('历史来源收口已完成并创建可回滚备份')
  } catch (error) { toast.error(error.message || '执行失败') }
  finally { sourceMaintenanceLoading.value = false }
}

async function rollbackSourceMaintenance() {
  if (!sourceMaintenanceJob.value?.jobId) return
  const reason = window.prompt('回滚原因（必填）')
  if (!reason?.trim() || !window.confirm('确认从该维护任务的备份恢复持久化数据？')) return
  sourceMaintenanceLoading.value = true
  try {
    sourceMaintenanceJob.value = await requestJson('/api/memory-center/context-source-maintenance/rollback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: sourceMaintenanceJob.value.jobId, reason: reason.trim(), actor: 'memory-center' }),
    })
    await loadDetail()
    toast.success('历史来源收口已回滚')
  } catch (error) { toast.error(error.message || '回滚失败') }
  finally { sourceMaintenanceLoading.value = false }
}

async function drillLatestRecovery() {
  const latest = contextEngineRecovery.value?.latest
  if (!latest?.recoveryId) return
  recoveryDrilling.value = true
  try {
    const data = await requestJson('/api/context-engine/recovery/drill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: latest.scope,
        scopeId: latest.scopeId,
        sessionId: latest.sessionId,
        recoveryId: latest.recoveryId,
      }),
    })
    if (!data.result?.passed) throw new Error('恢复点完整性校验未通过')
    toast.success('恢复演练通过，当前会话未被修改')
  } catch (error) {
    toast.error(error.message || '恢复演练失败')
  } finally {
    recoveryDrilling.value = false
  }
}

async function controlItem(item, action, extra = {}) {
  try {
    await requestJson('/api/memory-center/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: selectedScope.value,
        scopeId: selectedId.value,
        itemType: item.type,
        itemId: item.itemId,
        action,
        ...extra,
      }),
    })
    editState.value = null
    await loadOverview(true)
    toast.success('记忆已更新')
  } catch (error) {
    toast.error(error.message || '记忆更新失败')
  }
}

function openEdit(item, action) {
  editState.value = { item, action, text: item.text || '', reason: '' }
}

async function submitEdit() {
  const state = editState.value
  if (!state?.reason.trim()) return toast.error('请填写修改原因')
  if (state.action === 'edit' && !state.text.trim()) return toast.error('记忆内容不能为空')
  await controlItem(state.item, state.action, { text: state.text, reason: state.reason })
}

async function loadSettings() {
  loading.value = true
  try {
    const [configData, capacityData, capabilityData] = await Promise.all([
      requestJson('/api/orchestrator/config'),
      requestJson('/api/groups/memory/capacity'),
      requestJson('/api/groups/memory/capabilities'),
    ])
    const current = configData.config || {}
    webSearchProvidersConfigured.value = current.webSearchProvidersConfigured || { mcp: false, brave: false, bing: false, google: false }
    config.value = {
      ...config.value,
      memoryContextPreset: current.memoryContextPreset || 'default',
      modelContextWindow: Number(current.modelContextWindow || 0),
      modelAutoCompactTokenLimit: Number(current.modelAutoCompactTokenLimit || 0),
      providerContextCacheMode: current.providerContextCacheMode || 'auto',
      mcpToolLoadingMode: current.mcpToolLoadingMode || 'deferred',
      mcpToolAutoThresholdPercent: Number(current.mcpToolAutoThresholdPercent ?? 10),
      skillCatalogBudgetPercent: Number(current.skillCatalogBudgetPercent ?? 1),
      postCompactSkillPerItemMaxTokens: Number(current.postCompactSkillPerItemMaxTokens || 5000),
      postCompactSkillTotalMaxTokens: Number(current.postCompactSkillTotalMaxTokens || 25000),
      contextSourceCatalogBudgetPercent: Number(current.contextSourceCatalogBudgetPercent ?? 1),
      contextSourceHydrationBudgetPercent: Number(current.contextSourceHydrationBudgetPercent ?? 10),
      postCompactSourcePerItemMaxTokens: Number(current.postCompactSourcePerItemMaxTokens || 5000),
      postCompactSourceTotalMaxTokens: Number(current.postCompactSourceTotalMaxTokens || 25000),
      typedMemoryDeliveryMaxDocuments: Number(current.typedMemoryDeliveryMaxDocuments || 5),
      typedMemoryDeliveryMaxTokens: Number(current.typedMemoryDeliveryMaxTokens || 5000),
      sessionMemoryCompactMaxSectionTokens: Number(current.sessionMemoryCompactMaxSectionTokens || 2000),
      sessionMemoryCompactMaxTotalTokens: Number(current.sessionMemoryCompactMaxTotalTokens || 12000),
      groupSessionRetentionDays: Number(current.groupSessionRetentionDays || 30),
      groupSessionMaxArchived: Number(current.groupSessionMaxArchived || 20),
      groupSessionAutoPruneEnabled: current.groupSessionAutoPruneEnabled === true,
      timeBasedMicrocompactEnabled: current.timeBasedMicrocompactEnabled === true,
      timeBasedMicrocompactGapMinutes: Number(current.timeBasedMicrocompactGapMinutes || 60),
      timeBasedMicrocompactKeepRecent: Number(current.timeBasedMicrocompactKeepRecent || 5),
      agentCommunicationV2Enabled: current.agentCommunicationV2Enabled !== false,
      agentRunnerStartTimeoutMs: Number(current.agentRunnerStartTimeoutMs || 60000),
      agentAckTimeoutMs: Number(current.agentAckTimeoutMs || 30000),
      agentHeartbeatIntervalMs: Number(current.agentHeartbeatIntervalMs || 20000),
      agentHeartbeatLostTimeoutMs: Number(current.agentHeartbeatLostTimeoutMs || 90000),
      agentLeaseTtlMs: Number(current.agentLeaseTtlMs || 120000),
      agentMaxAttempts: Number(current.agentMaxAttempts || 3),
      agentMaxParallelPerProject: Number(current.agentMaxParallelPerProject || 2),
      agentMaxParallelGlobal: Number(current.agentMaxParallelGlobal || 6),
      adaptiveAgentLoopEnabled: current.adaptiveAgentLoopEnabled !== false,
      dynamicAgentBudgetEnabled: current.dynamicAgentBudgetEnabled !== false,
      agentToolCallBudget: Number(current.agentToolCallBudget || 6),
      agentMaxModelTurns: Number(current.agentMaxModelTurns || 8),
      agentLoopNoProgressThreshold: Number(current.agentLoopNoProgressThreshold || 3),
      agentToolBatchSize: Number(current.agentToolBatchSize || 2),
      agentReadOnlyParallelism: Number(current.agentReadOnlyParallelism || 2),
      codeIntelligenceEnabled: current.codeIntelligenceEnabled !== false,
      codeIndexStartPolicy: current.codeIndexStartPolicy || 'on_demand',
      codeIndexMaxConcurrentProjects: Number(current.codeIndexMaxConcurrentProjects || 1),
      languageServerManagedInstallEnabled: current.languageServerManagedInstallEnabled !== false,
      providerNativeToolsMode: current.providerNativeToolsMode || 'auto',
      skillForkEnabled: current.skillForkEnabled !== false,
      webToolsEnabled: current.webToolsEnabled !== false,
      webFetchBrowserFallbackEnabled: current.webFetchBrowserFallbackEnabled !== false,
      webSearchProviderOrder: Array.isArray(current.webSearchProviderOrder) ? current.webSearchProviderOrder : ['mcp', 'brave', 'bing', 'google'],
      searchMcpUrl: '', searchMcpToken: '', braveSearchApiKey: '', bingSearchApiKey: '', googleCseApiKey: '', googleCseId: '',
      notebookToolsEnabled: current.notebookToolsEnabled !== false,
      ccStyleExecutionDisplayEnabled: current.ccStyleExecutionDisplayEnabled !== false,
      ccStyleAgentProgressNarrationEnabled: current.ccStyleAgentProgressNarrationEnabled !== false,
    }
    capacity.value = capacityData
    capabilities.value = capabilityData.entries || []
    await loadCustomization()
  } catch (error) {
    toast.error(error.message || '读取设置失败')
  } finally {
    loading.value = false
  }
}

function selectPreset(preset) {
  config.value.memoryContextPreset = preset.id
  if (preset.id !== 'custom') {
    config.value.modelContextWindow = preset.window
    config.value.modelAutoCompactTokenLimit = preset.threshold
  }
}

async function saveSettings() {
  const value = config.value
  if (value.memoryContextPreset === 'custom') {
    if (Number(value.modelContextWindow) < 32000) return toast.error('上下文窗口不能小于 32,000 token')
    if (Number(value.modelAutoCompactTokenLimit) < 18000 || Number(value.modelAutoCompactTokenLimit) >= Number(value.modelContextWindow) - 3000) {
      return toast.error('压缩阈值必须至少比上下文窗口低 3,000 token')
    }
  }
  if (Number(value.sessionMemoryCompactMaxTotalTokens) < Number(value.sessionMemoryCompactMaxSectionTokens)) return toast.error('总记忆预算不能小于单章节预算')
  if (Number(value.postCompactSkillTotalMaxTokens) < Number(value.postCompactSkillPerItemMaxTokens)) return toast.error('Skill 恢复总预算不能小于单个 Skill 预算')
  if (Number(value.postCompactSourceTotalMaxTokens) < Number(value.postCompactSourcePerItemMaxTokens)) return toast.error('来源恢复总预算不能小于单个来源预算')
  saving.value = true
  try {
    await requestJson('/api/orchestrator/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
    })
    await loadSettings()
    toast.success('上下文设置已保存')
  } catch (error) {
    toast.error(error.message || '保存设置失败')
  } finally {
    saving.value = false
  }
}

async function saveCapability() {
  const value = capabilityForm.value
  if (!value.provider.trim()) return toast.error('请填写 Provider')
  if (Number(value.contextWindow) < 32000) return toast.error('上下文窗口不能小于 32,000 token')
  saving.value = true
  try {
    await requestJson('/api/groups/memory/capabilities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...value, source: 'user_setting', checkedAt: new Date().toISOString() }),
    })
    await loadSettings()
    toast.success('模型容量已保存')
  } catch (error) {
    toast.error(error.message || '保存模型容量失败')
  } finally {
    saving.value = false
  }
}

async function loadCustomization() {
  customizationLoading.value = true
  try {
    const endpoint = customizationMode.value === 'prompt' ? 'session-memory-custom-prompt' : 'session-memory-custom-template'
    const data = await requestJson(`/api/memory-center/${endpoint}?scope_id=${encodeURIComponent(customizationTarget.value)}`)
    customProfile.value = data.profile || null
    const direct = customizationTarget.value ? data.profile?.exactSession : data.profile?.global
    customContent.value = direct?.present ? direct.content : (customizationTarget.value ? data.profile?.content || '' : '')
  } catch (error) {
    toast.error(error.message || '读取 Session Memory 定制失败')
  } finally {
    customizationLoading.value = false
  }
}

async function saveCustomization(reset = false) {
  if (!reset && !customContent.value.trim()) return toast.error('内容不能为空')
  if (!reset && customizationMode.value === 'template') {
    const headers = customContent.value.split(/\r?\n/).filter(line => /^#\s+\S/.test(line))
    if (!headers.length || headers.length > 20) return toast.error('模板需要 1 到 20 个一级章节')
  }
  saving.value = true
  try {
    const endpoint = customizationMode.value === 'prompt' ? 'session-memory-custom-prompt' : 'session-memory-custom-template'
    await requestJson(`/api/memory-center/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopeId: customizationTarget.value, content: customContent.value, reset }),
    })
    await loadCustomization()
    toast.success(reset ? '已恢复继承' : 'Session Memory 定制已保存')
  } catch (error) {
    toast.error(error.message || '保存 Session Memory 定制失败')
  } finally {
    saving.value = false
  }
}

watch([customizationMode, customizationTarget], loadCustomization)
watch(activePage, page => page === 'settings' ? loadSettings() : loadOverview(true))
onMounted(() => loadOverview(false))
</script>

<template>
  <div class="memory-center">
    <header class="mc-header">
      <div>
        <span class="eyebrow">MEMORY CENTER</span>
        <h2>记忆中心</h2>
      </div>
      <div class="header-actions">
        <nav class="page-tabs" aria-label="记忆中心视图">
          <button :class="{ active: activePage === 'memory' }" @click="activePage = 'memory'"><MessagesSquare :size="16" />会话记忆</button>
          <button :class="{ active: activePage === 'settings' }" @click="activePage = 'settings'"><Settings2 :size="16" />上下文设置</button>
        </nav>
        <button class="icon-btn" :disabled="loading" title="刷新" @click="activePage === 'memory' ? loadOverview(true) : loadSettings()"><RefreshCw :size="18" /></button>
      </div>
    </header>

    <div v-if="activePage === 'memory'" class="memory-workspace">
      <aside class="scope-list">
        <div v-if="globalTree.longTerm.length || globalTree.sessions.length" class="scope-group">
          <label>全局</label>
          <details class="scope-parent" open>
            <summary><Globe2 :size="16" /><strong>{{ globalTree.label }}</strong><small>{{ globalTree.sessions.length }} 个会话</small></summary>
            <div class="scope-children">
              <button v-for="item in globalTree.longTerm" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" @click="selectScope(item)">
                <Globe2 :size="15" /><span><strong>长期记忆</strong><small>{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }} tokens</small></span>
              </button>
              <button v-for="item in globalTree.sessions" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" @click="selectScope(item)">
                <MessagesSquare :size="15" /><span><strong>{{ item.label }}{{ item.currentSession ? ' · 当前' : '' }}</strong><small>{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }} tokens</small></span>
              </button>
            </div>
          </details>
        </div>
        <div v-if="groupTrees.length" class="scope-group">
          <label>群聊 · {{ groupTrees.length }}</label>
          <details v-for="tree in groupTrees" :key="tree.id" class="scope-parent">
            <summary><MessagesSquare :size="16" /><strong>{{ tree.label }}</strong><small>{{ tree.sessions.length }} 个会话</small></summary>
            <div class="scope-children">
              <button v-for="item in tree.sessions" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" @click="selectScope(item)">
                <MessagesSquare :size="15" /><span><strong>{{ item.sessionLabel || item.label }}</strong><small>{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }} tokens</small></span>
                <AlertTriangle v-if="item.alerts" :size="15" class="warn" />
              </button>
            </div>
          </details>
        </div>
        <div v-if="projectTrees.length" class="scope-group">
          <label>项目 · {{ projectTrees.length }}</label>
          <details v-for="tree in projectTrees" :key="tree.id" class="scope-parent">
            <summary><FolderKanban :size="16" /><strong>{{ tree.label }}</strong><small>{{ tree.sessions.length }} 个会话</small></summary>
            <div class="scope-children">
              <button v-for="item in tree.longTerm" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" @click="selectScope(item)">
                <Globe2 :size="15" /><span><strong>长期记忆</strong><small>{{ item.longTermMemory?.activeCount || 0 }} 条有效 · {{ item.longTermMemory?.taskHistoryCount || 0 }} 条历史</small></span>
              </button>
              <button v-for="item in tree.sessions" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" @click="selectScope(item)">
                <MessagesSquare :size="15" /><span><strong>{{ item.sessionLabel || item.label }}</strong><small>{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }} tokens</small></span>
              </button>
            </div>
          </details>
        </div>
        <div v-if="taskProjectTrees.length" class="scope-group task-agent-group" data-scope-kind="task-agent">
          <label>子 Agent · {{ taskProjectTrees.length }} 个项目</label>
          <details v-for="tree in taskProjectTrees" :key="tree.id" class="scope-parent task-project-parent" :data-project-id="tree.id">
            <summary><FolderKanban :size="16" /><strong :title="tree.label">{{ tree.label }}</strong><small>{{ tree.sessions.length }} 个会话</small></summary>
            <div class="scope-children">
              <button v-for="item in tree.sessions" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" :title="`${tree.label} / ${item.id}`" @click="selectScope(item)">
                <Bot :size="15" /><span><strong>{{ taskAgentSessionLabel(item) }}</strong><small>{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }} tokens<span v-if="taskAgentSessionMeta(item)"> · {{ taskAgentSessionMeta(item) }}</span></small></span>
                <AlertTriangle v-if="item.circuitOpen" :size="15" class="warn" />
              </button>
            </div>
          </details>
        </div>
      </aside>

      <main class="memory-detail">
        <div v-if="detail && selectedSummary" class="detail-content">
          <div class="detail-head">
            <div><span class="eyebrow">{{ selectedScope.toUpperCase() }}</span><h3>{{ selectedSummary.label }}</h3></div>
            <button class="text-btn" @click="toggleAudit">{{ showAudit ? '返回记忆' : '审计记录' }}</button>
          </div>
          <div v-if="selectedScope === 'project'" class="summary-strip">
            <span><small>实际注入估算</small><strong>{{ formatNumber(selectedSummary.currentTokens) }} tokens</strong></span>
            <span><small>有效长期记忆</small><strong>{{ selectedSummary.longTermMemory?.activeCount || 0 }} 条</strong></span>
            <span><small>任务历史</small><strong>{{ selectedSummary.longTermMemory?.taskHistoryCount || 0 }} 条</strong></span>
            <span><small>写入策略</small><strong>验收后提交</strong></span>
          </div>
          <div v-else class="summary-strip">
            <span><small>当前模型上下文</small><strong>{{ formatNumber(selectedSummary.currentTokens) }}</strong></span>
            <span><small>自动压缩线</small><strong>{{ formatNumber(selectedSummary.autoCompactThreshold) }}</strong></span>
            <span><small>距离压缩</small><strong>{{ formatNumber(selectedSummary.remainingTokens) }}</strong></span>
            <span><small>状态</small><strong :class="selectedSummary.health"><CheckCircle2 v-if="selectedSummary.health === 'healthy'" :size="15" />{{ selectedSummary.health }}</strong></span>
          </div>
          <p v-if="selectedScope !== 'project' && (selectedSummary.beforeTokens || selectedSummary.afterTokens)" class="compact-history">最近压缩：{{ formatNumber(selectedSummary.beforeTokens) }} → {{ formatNumber(selectedSummary.afterTokens) }} tokens</p>
          <p v-if="selectedScope !== 'project' && (selectedSummary.summarySource || selectedSummary.sessionMemory || selectedSummary.consecutiveFailures)" class="compact-history">
            正式摘要 {{ summarySourceLabel(selectedSummary.summarySource) }} · 近期原文 {{ formatNumber(selectedSummary.preservedRecentTokens) }} tokens / {{ selectedSummary.preservedRecentMessages || 0 }} 条 · Session Memory {{ sessionMemoryStatusLabel(selectedSummary.sessionMemory?.status) }} · 连续失败 {{ selectedSummary.consecutiveFailures || 0 }}
          </p>
          <p v-if="selectedSummary.circuitOpen" class="compact-circuit-alert">
            <AlertTriangle :size="16" />
            自动压缩已熔断（{{ circuitFailureModeLabel(selectedSummary.circuitFailureMode) }}，连续失败 {{ selectedSummary.circuitConsecutiveFailures || 0 }} 次）。
            <template v-if="selectedSummary.circuitAutoRetryAt">将在 {{ formatTime(selectedSummary.circuitAutoRetryAt) }} 自动试探恢复。</template>
            <template v-else>重试无法自愈，需人工确认后重置。</template>
            <button v-if="isGroupSessionScope" class="text-btn" @click="resetCompactCircuit">立即重置</button>
          </p>
          <p v-else-if="selectedSummary.summaryDegraded" class="compact-history">
            压缩正常，但最近 {{ selectedSummary.summaryFallbackFailures || 0 }} 次模型摘要失败并回退到确定性摘要，摘要质量已降级。
          </p>
          <p v-if="selectedScope !== 'project' && (selectedSummary.postCompactGate || selectedSummary.resolvedModelCapacity || selectedSummary.ptlRecoveryAttempts)" class="compact-history">
            门禁 {{ selectedSummary.postCompactGate?.status || '未采样' }} · 模型容量 {{ formatNumber(selectedSummary.effectiveContextWindow) }} · 当前请求 {{ formatNumber(selectedSummary.pendingRequestTokens) }} · 恢复 {{ formatNumber(selectedSummary.recoveryContextTokens) }} · Hooks {{ formatNumber(selectedSummary.hookResultTokens) }} · PTL {{ selectedSummary.ptlRecoveryAttempts || 0 }} 次
          </p>
          <MicroCompactStatusPanel v-if="isSessionDetail && microCompactState?.applicable" :state="microCompactState" />
          <PostCompactRecoveryPanel v-if="isSessionDetail" :usage="postCompactUsage" />
          <section v-if="isSessionDetail && contextSourceContinuity" class="source-continuity-panel">
            <h4>上下文来源连续性</h4>
            <div class="summary-strip">
              <span><small>来源目录</small><strong>{{ formatNumber(contextSourceContinuity.budget?.catalogUsedTokens) }} / {{ formatNumber(contextSourceContinuity.budget?.catalogTargetTokens) }}</strong></span>
              <span><small>正文注入</small><strong>{{ formatNumber(contextSourceContinuity.budget?.hydrationUsedTokens) }} / {{ formatNumber(contextSourceContinuity.budget?.hydrationTargetTokens) }}</strong></span>
              <span><small>知识 / 共享文件</small><strong>{{ formatNumber(contextSourceContinuity.budget?.knowledgeTokens) }} / {{ formatNumber(contextSourceContinuity.budget?.sharedFileTokens) }}</strong></span>
              <span><small>恢复 / 安全余量</small><strong>{{ formatNumber(contextSourceContinuity.budget?.restoredTokens) }} / {{ formatNumber(contextSourceContinuity.budget?.remainingSafeTokens) }}</strong></span>
            </div>
            <p v-if="contextSourceContinuity.latestRestore" class="compact-history">最近恢复：{{ contextSourceContinuity.latestRestore.status }} · {{ contextSourceContinuity.latestRestore.restored?.length || 0 }} 个来源 · 跳过 {{ contextSourceContinuity.latestRestore.dropped?.length || 0 }} 个</p>
            <div class="source-receipts">
              <span v-for="receipt in (contextSourceContinuity.receipts || []).slice(0, 12)" :key="receipt.receiptId">
                {{ receipt.sourceKind === 'knowledge' ? '知识' : '共享文件' }} · {{ receipt.documentName }} · {{ receipt.state }}<template v-if="receipt.promotionEvidence?.length"> · 已准入 {{ receipt.promotionEvidence.length }} 条（{{ receipt.promotionEvidence[0].memoryId }} · {{ String(receipt.promotionEvidence[0].admissionChecksum || '').slice(0, 12) }}）</template><template v-if="receipt.truncated"> · 已截断</template>
              </span>
            </div>
            <div v-if="sourceMaintenanceIdentity" class="source-maintenance">
              <div><strong>历史来源收口</strong><small>仅显式预览/确认后迁移；不会删除知识、共享文件或正式长期记忆。</small></div>
              <button class="text-btn" :disabled="sourceMaintenanceLoading" @click="previewSourceMaintenance">{{ sourceMaintenanceLoading ? '处理中' : '预览' }}</button>
              <template v-if="sourceMaintenancePreview">
                <span>影响 {{ sourceMaintenancePreview.affectedRecordCount || 0 }} 处 · 预计移除 {{ formatNumber(sourceMaintenancePreview.estimatedRemovedBodyTokens) }} tokens · Promotion {{ sourceMaintenancePreview.promotionBackfillCount || 0 }} · 未确认 {{ sourceMaintenancePreview.unresolvedCount || 0 }}</span>
                <button class="text-btn" :disabled="sourceMaintenanceLoading" @click="applySourceMaintenance">确认执行</button>
              </template>
              <template v-if="sourceMaintenanceJob?.jobId && sourceMaintenanceJob.status !== 'rolled_back'">
                <span>维护任务 {{ sourceMaintenanceJob.jobId }}</span>
                <button class="text-btn" :disabled="sourceMaintenanceLoading" @click="rollbackSourceMaintenance">回滚</button>
              </template>
            </div>
          </section>
          <p v-if="isSessionDetail && providerContextCacheState?.applicable" class="compact-history">
            Context Engine {{ providerContextCacheState.contextEngineVersion === 2 ? 'V2' : '兼容 V1' }}：<strong>{{ providerContextCacheState.status === 'recorded' ? providerCacheModeLabel(providerContextCacheState) : '尚未产生请求回执' }}</strong>
            · 能力 {{ providerCapabilityLabel(providerContextCacheState) }}
            <template v-if="providerContextCacheState.status === 'recorded'"> · {{ providerContextCacheState.blockCount || 0 }} 个不可变块 · 复用 {{ providerContextCacheState.reusedBlockCount || 0 }} · 变化 {{ providerContextCacheState.changedBlockCount || 0 }} · 投影 {{ formatNumber(providerContextCacheState.totalTokens) }} tokens<template v-if="providerContextCacheState.providerInputTokens"> · 直接输入 {{ formatNumber(providerContextCacheState.providerInputTokens) }}</template><template v-if="providerContextCacheState.cacheCreationInputTokens"> · 缓存创建 {{ formatNumber(providerContextCacheState.cacheCreationInputTokens) }}</template><template v-if="providerContextCacheState.cacheReadInputTokens"> · 缓存读取 {{ formatNumber(providerContextCacheState.cacheReadInputTokens) }}</template><template v-if="providerContextCacheState.cacheHitRate"> · 命中率 {{ (providerContextCacheState.cacheHitRate * 100).toFixed(1) }}%</template><template v-if="providerContextCacheState.cacheDeletedInputTokens"> · 原生缓存清理 {{ formatNumber(providerContextCacheState.cacheDeletedInputTokens) }}</template></template>
          </p>
          <p v-if="isSessionDetail && providerContextCacheState?.status === 'recorded'" class="compact-history">
            上下文准备：<strong>{{ materializationCacheLabel(providerContextCacheState) }}</strong>
            · 稳定前缀 {{ providerContextCacheState.adaptiveStablePrefix?.stablePrefixBlockCount || providerContextCacheState.stablePrefixBlockCount || 0 }} 块
            <template v-if="providerContextCacheState.adaptiveStablePrefix?.reordered"> · 已自适应调整</template>
            · CCM 投影 {{ Number(providerContextCacheState.projectionDurationMs || 0).toFixed(1) }} ms
            <template v-if="providerContextCacheState.providerLatencyMs"> · Provider {{ Number(providerContextCacheState.providerLatencyMs).toFixed(1) }} ms</template>
            <template v-if="providerContextCacheState.reportedCostUsd || providerContextCacheState.estimatedInputCostUsd"> · 本轮成本 {{ formatUsd(providerContextCacheState.reportedCostUsd || providerContextCacheState.estimatedInputCostUsd) }}</template>
            · 建议 {{ cacheRecommendationLabel(providerContextCacheState.cacheRecommendation) }}
          </p>
          <p v-if="isSessionDetail && selectedSummary.summaryQuality" class="compact-history">
            摘要质量 <strong>{{ selectedSummary.summaryQuality.score || 0 }} / 100</strong> · 锚点 {{ selectedSummary.summaryQuality.anchorCount || 0 }} · 缺失 {{ selectedSummary.summaryQuality.missingAnchorCount || 0 }}
            · 独立抽检 {{ selectedSummary.secondaryReview?.selected ? (selectedSummary.secondaryReview?.passed ? '已通过' : '未通过') : '本轮未抽中' }}
          </p>
          <p v-if="isSessionDetail && contextEngineTrends" class="compact-history">
            最近 {{ contextEngineTrends.summary?.eventCount || 0 }} 条上下文事件 · 平均缓存命中 {{ ((contextEngineTrends.summary?.averageCacheHitRate || 0) * 100).toFixed(1) }}% · 压缩 {{ contextEngineTrends.summary?.compactionCount || 0 }} 次
            <template v-if="contextEngineTrends.summary?.averageProjectionDurationMs"> · 平均投影 {{ Number(contextEngineTrends.summary.averageProjectionDurationMs).toFixed(1) }} ms</template>
            <template v-if="contextEngineTrends.summary?.averageProviderLatencyMs"> · 平均 Provider {{ Number(contextEngineTrends.summary.averageProviderLatencyMs).toFixed(1) }} ms</template>
            <template v-if="contextEngineTrends.summary?.totalEstimatedCostUsd"> · 估算成本 {{ formatUsd(contextEngineTrends.summary.totalEstimatedCostUsd) }}</template>
            <template v-if="contextEngineTrends.alerts?.length"> · <strong>{{ contextEngineTrends.alerts.length }} 项健康提醒</strong></template>
          </p>
          <p v-if="isSessionDetail && contextEngineRecovery?.count" class="compact-history">
            已保留 {{ contextEngineRecovery.count }} 个会话恢复点 · 最近创建于 {{ formatTime(contextEngineRecovery.latest?.createdAt) }}
            <button class="text-btn" :disabled="recoveryDrilling" @click="drillLatestRecovery">{{ recoveryDrilling ? '校验中' : '校验最近恢复点' }}</button>
          </p>

          <template v-if="!showAudit">
            <div v-if="detail.alerts?.length" class="alert-list">
              <p v-for="alert in detail.alerts" :key="alert.id"><AlertTriangle :size="16" />{{ alert.message }}</p>
            </div>
            <p v-if="isSessionDetail && !selectedSummary.summarySource" class="continuity-state">当前会话尚未生成模型压缩摘要，现在使用近期原文保持连续性。</p>
            <label class="search-box"><Search :size="17" /><input v-model.trim="query" :placeholder="isSessionDetail ? '搜索摘要与近期原文' : '搜索当前记忆'" /></label>
            <section v-for="group in itemGroups" :key="group.type" class="memory-section">
              <h4>{{ typeLabels[group.type] || group.type }} <span>{{ group.items.length }}</span></h4>
              <article v-for="item in group.items" :key="item.itemId" :class="['memory-row', { deprecated: item.deprecated }]">
                <div class="memory-copy">
                  <p>{{ item.text || '空记录' }}</p>
                  <small>
                    {{ formatTime(item.evidence?.time || item.updatedAt) }}
                    <template v-if="item.reason"> · {{ item.reason }}</template>
                    <template v-if="item.legacy_unverified"> · 历史数据，语义状态未核验</template>
                    <template v-else-if="item.extraction_source"> · {{ item.extraction_source === 'model_semantic' ? '模型语义提取' : item.extraction_source === 'structured_event' ? '结构化事实' : item.extraction_source }}</template>
                  </small>
                </div>
                <div v-if="!item.readOnly" class="row-actions">
                  <button class="icon-btn" :title="item.pinned ? '取消固定' : '固定记忆'" @click="controlItem(item, item.pinned ? 'unpin' : 'pin')"><PinOff v-if="item.pinned" :size="16" /><Pin v-else :size="16" /></button>
                  <button class="icon-btn" title="修改" @click="openEdit(item, 'edit')"><Pencil :size="16" /></button>
                  <button v-if="!item.deprecated" class="icon-btn danger" title="删除" @click="openEdit(item, 'delete')"><Trash2 :size="16" /></button>
                  <button v-else class="icon-btn" title="恢复" @click="controlItem(item, 'restore')"><RotateCcw :size="16" /></button>
                </div>
              </article>
            </section>
            <p v-if="!itemGroups.length" class="empty-state">{{ isSessionDetail ? '当前会话尚未生成模型摘要，也没有可展示的近期原文。' : '当前范围还没有结构化记忆。' }}</p>
          </template>
          <section v-else class="audit-list">
            <article v-for="entry in audit" :key="entry.id"><time>{{ formatTime(entry.at) }}</time><div><strong>{{ entry.action || entry.type }}</strong><p>{{ entry.reason || entry.itemType || '系统记录' }}</p></div></article>
            <p v-if="!audit.length" class="empty-state">暂无审计记录。</p>
          </section>
        </div>
        <p v-else class="empty-state">{{ loading ? '正在读取记忆...' : '请选择一个记忆范围。' }}</p>
      </main>
    </div>

    <main v-else class="settings-page">
      <section class="settings-section">
        <div class="section-head"><div><span class="eyebrow">CONTEXT POLICY</span><h3>上下文与压缩</h3></div><button class="primary-btn" :disabled="saving" @click="saveSettings"><Save :size="16" />{{ saving ? '保存中' : '保存' }}</button></div>
        <div class="preset-control"><button v-for="preset in presets" :key="preset.id" :class="{ active: config.memoryContextPreset === preset.id }" @click="selectPreset(preset)">{{ preset.label }}</button></div>
        <div class="field-grid">
          <label><span>上下文窗口</span><input v-model.number="config.modelContextWindow" type="number" min="0" step="1000" :disabled="config.memoryContextPreset !== 'custom'" /></label>
          <label><span>自动压缩阈值</span><input v-model.number="config.modelAutoCompactTokenLimit" type="number" min="0" step="1000" :disabled="config.memoryContextPreset !== 'custom'" /></label>
          <label><span>Provider/CCM 上下文处理</span><select v-model="config.providerContextCacheMode"><option value="auto">自动选择</option><option value="native">优先 Provider 原生编辑</option><option value="controlled">CCM 受控压缩投影</option><option value="off">关闭 Provider 适配</option></select></label>
          <label><span>MCP Schema 加载</span><select v-model="config.mcpToolLoadingMode"><option value="deferred">延迟加载（CC 默认）</option><option value="auto">按容量自动</option><option value="inline">全部内联</option></select></label>
          <label><span>MCP 自动阈值（%）</span><input v-model.number="config.mcpToolAutoThresholdPercent" type="number" min="0" max="100" step="1" /></label>
          <label><span>Skill 目录预算（%）</span><input v-model.number="config.skillCatalogBudgetPercent" type="number" min="0.1" max="10" step="0.1" /></label>
          <label><span>单个 Skill 恢复预算</span><input v-model.number="config.postCompactSkillPerItemMaxTokens" type="number" min="500" max="20000" step="500" /></label>
          <label><span>Skill 恢复总预算</span><input v-model.number="config.postCompactSkillTotalMaxTokens" type="number" min="1000" max="100000" step="1000" /></label>
          <label><span>来源目录预算（%）</span><input v-model.number="config.contextSourceCatalogBudgetPercent" type="number" min="0.1" max="10" step="0.1" /></label>
          <label><span>来源正文预算（%）</span><input v-model.number="config.contextSourceHydrationBudgetPercent" type="number" min="1" max="50" step="1" /></label>
          <label><span>单个来源恢复预算</span><input v-model.number="config.postCompactSourcePerItemMaxTokens" type="number" min="500" max="20000" step="500" /></label>
          <label><span>来源恢复总预算</span><input v-model.number="config.postCompactSourceTotalMaxTokens" type="number" min="1000" max="100000" step="1000" /></label>
          <label><span>每轮记忆文件</span><input v-model.number="config.typedMemoryDeliveryMaxDocuments" type="number" min="1" max="5" /></label>
          <label><span>记忆注入预算</span><input v-model.number="config.typedMemoryDeliveryMaxTokens" type="number" min="500" max="20000" step="100" /></label>
          <label><span>单章节预算</span><input v-model.number="config.sessionMemoryCompactMaxSectionTokens" type="number" min="250" max="20000" step="100" /></label>
          <label><span>会话记忆总预算</span><input v-model.number="config.sessionMemoryCompactMaxTotalTokens" type="number" min="1000" max="100000" step="500" /></label>
          <label><span>归档保留天数</span><input v-model.number="config.groupSessionRetentionDays" type="number" min="1" max="3650" /></label>
          <label><span>每群最大归档</span><input v-model.number="config.groupSessionMaxArchived" type="number" min="1" max="1000" /></label>
          <label><span>空闲触发间隔（分钟）</span><input v-model.number="config.timeBasedMicrocompactGapMinutes" type="number" min="5" max="1440" /></label>
          <label><span>保留近期工具结果</span><input v-model.number="config.timeBasedMicrocompactKeepRecent" type="number" min="1" max="50" /></label>
        </div>
        <label class="toggle-row"><input v-model="config.groupSessionAutoPruneEnabled" type="checkbox" /><span>自动清理过期归档会话</span></label>
        <label class="toggle-row"><input v-model="config.timeBasedMicrocompactEnabled" type="checkbox" /><span>启用旧工具结果空闲整理（Time-based Tool Result Microcompact）</span></label>
        <div v-if="capacity" class="runtime-strip"><span>摘要方式 <strong>模型</strong></span><span>上下文缓存 <strong>{{ config.providerContextCacheMode === 'native' ? '优先原生' : config.providerContextCacheMode === 'controlled' ? 'CCM 受控' : config.providerContextCacheMode === 'off' ? '关闭' : '自动' }}</strong></span><span>模型窗口 <strong>{{ formatNumber(capacity.capacity?.contextWindow) }}</strong></span><span>有效窗口 <strong>{{ formatNumber(capacity.capacity?.effectiveContextWindow) }}</strong></span><span>当前触发线 <strong>{{ formatNumber(capacity.effectiveAutoCompactThreshold) }}</strong></span></div>
      </section>

      <section class="settings-section">
        <div class="section-head"><div><span class="eyebrow">CC-LEVEL TOOLS</span><h3>代码智能与原生工具</h3></div></div>
        <div class="field-grid">
          <label><span>索引启动策略</span><select v-model="config.codeIndexStartPolicy"><option value="on_demand">按需启动</option><option value="manual">仅手动</option><option value="startup">启动时建立</option></select></label>
          <label><span>并行索引项目</span><input v-model.number="config.codeIndexMaxConcurrentProjects" type="number" min="1" max="8" /></label>
          <label><span>Provider 原生工具</span><select v-model="config.providerNativeToolsMode"><option value="auto">自动探测与回退</option><option value="native">优先原生</option><option value="json">仅 CCM JSON Loop</option></select></label>
          <label><span>Web Search Provider 顺序</span><input :value="config.webSearchProviderOrder.join(', ')" @change="config.webSearchProviderOrder = $event.target.value.split(',').map(item => item.trim()).filter(Boolean)" /></label>
          <label><span>Search MCP HTTPS 地址</span><input v-model.trim="config.searchMcpUrl" type="url" :placeholder="webSearchProvidersConfigured.mcp ? '已配置；留空保持原值' : 'https://search.example/api'" /></label>
          <label><span>Search MCP Token</span><input v-model.trim="config.searchMcpToken" type="password" :placeholder="webSearchProvidersConfigured.mcp ? '已安全保存；留空保持' : '未配置'" autocomplete="new-password" /></label>
          <label><span>Brave Search Key</span><input v-model.trim="config.braveSearchApiKey" type="password" :placeholder="webSearchProvidersConfigured.brave ? '已安全保存；留空保持' : '未配置'" autocomplete="new-password" /></label>
          <label><span>Bing Search Key</span><input v-model.trim="config.bingSearchApiKey" type="password" :placeholder="webSearchProvidersConfigured.bing ? '已安全保存；留空保持' : '未配置'" autocomplete="new-password" /></label>
          <label><span>Google CSE Key</span><input v-model.trim="config.googleCseApiKey" type="password" :placeholder="webSearchProvidersConfigured.google ? '已安全保存；留空保持' : '未配置'" autocomplete="new-password" /></label>
          <label><span>Google CSE ID</span><input v-model.trim="config.googleCseId" type="password" :placeholder="webSearchProvidersConfigured.google ? '已安全保存；留空保持' : '未配置'" autocomplete="new-password" /></label>
        </div>
        <label class="toggle-row"><input v-model="config.codeIntelligenceEnabled" type="checkbox" /><span>启用LSP与增量代码索引</span></label>
        <label class="toggle-row"><input v-model="config.languageServerManagedInstallEnabled" type="checkbox" /><span>允许管理员预览并确认受管语言服务安装</span></label>
        <label class="toggle-row"><input v-model="config.skillForkEnabled" type="checkbox" /><span>启用 Skill context: fork 隔离执行</span></label>
        <label class="toggle-row"><input v-model="config.webToolsEnabled" type="checkbox" /><span>启用安全公开Web工具</span></label>
        <label class="toggle-row"><input v-model="config.webFetchBrowserFallbackEnabled" type="checkbox" /><span>允许无Cookie临时浏览器渲染JS壳页面</span></label>
        <label class="toggle-row"><input v-model="config.notebookToolsEnabled" type="checkbox" /><span>启用Notebook结构化检查与项目子Agent受管执行</span></label>
        <label class="toggle-row"><input v-model="config.ccStyleExecutionDisplayEnabled" type="checkbox" /><span>启用 CC 风格用户可见执行流（全局/项目/群聊统一）</span></label>
        <label class="toggle-row"><input v-model="config.ccStyleAgentProgressNarrationEnabled" type="checkbox" /><span>启用 CC 风格工具前后阶段说明（不展示隐藏思维链）</span></label>
        <p class="compact-history">其他语言服务不会静默下载；搜索没有真实Provider时不注册；Notebook写入与执行必须绑定正式WorkItem、attempt和lease。</p>
      </section>

      <section class="settings-section">
        <div class="section-head"><div><span class="eyebrow">MAIN AGENT LOOP</span><h3>主 Agent 自适应续环</h3></div></div>
        <div class="field-grid">
          <label><span>分段工具调用数</span><input v-model.number="config.agentToolCallBudget" type="number" min="1" max="64" step="1" /><small>自适应模式下只生成续环统计，不终止任务</small></label>
          <label><span>分段模型轮次</span><input v-model.number="config.agentMaxModelTurns" type="number" min="1" max="32" step="1" /><small>自适应模式下到达后重置分段计数</small></label>
          <label><span>无进展熔断阈值</span><input v-model.number="config.agentLoopNoProgressThreshold" type="number" min="2" max="10" step="1" /></label>
          <label><span>每轮工具批量</span><input v-model.number="config.agentToolBatchSize" type="number" min="1" max="8" step="1" /></label>
          <label><span>只读并行度</span><input v-model.number="config.agentReadOnlyParallelism" type="number" min="1" max="8" step="1" /></label>
        </div>
        <label class="toggle-row"><input v-model="config.adaptiveAgentLoopEnabled" type="checkbox" /><span>有新进展就继续，不用固定总轮数结束项目/群聊主 Agent</span></label>
        <p class="compact-history">关闭后进入旧版 bounded 兼容模式，分段工具调用数和模型轮次会重新成为硬上限。无论哪种模式，上下文、权限、取消、重复失败和副作用安全门始终有效。</p>
      </section>

      <section class="settings-section">
        <div class="section-head"><div><span class="eyebrow">AGENT COMMUNICATION V2</span><h3>第三方 Agent 通信与租约</h3></div></div>
        <div class="field-grid">
          <label><span>Runner 启动超时（ms）</span><input v-model.number="config.agentRunnerStartTimeoutMs" type="number" min="5000" max="300000" step="1000" /></label>
          <label><span>ACK 超时（ms）</span><input v-model.number="config.agentAckTimeoutMs" type="number" min="5000" max="120000" step="1000" /></label>
          <label><span>系统心跳间隔（ms）</span><input v-model.number="config.agentHeartbeatIntervalMs" type="number" min="5000" max="60000" step="1000" /></label>
          <label><span>失联判定（ms）</span><input v-model.number="config.agentHeartbeatLostTimeoutMs" type="number" min="15000" max="600000" step="1000" /></label>
          <label><span>租约时长（ms）</span><input v-model.number="config.agentLeaseTtlMs" type="number" min="15000" max="900000" step="1000" /></label>
          <label><span>最大执行轮次</span><input v-model.number="config.agentMaxAttempts" type="number" min="1" max="3" step="1" /></label>
          <label><span>单项目并发</span><input v-model.number="config.agentMaxParallelPerProject" type="number" min="1" max="16" step="1" /></label>
          <label><span>全局并发</span><input v-model.number="config.agentMaxParallelGlobal" type="number" min="1" max="64" step="1" /></label>
        </div>
        <label class="toggle-row"><input v-model="config.agentCommunicationV2Enabled" type="checkbox" /><span>启用 Dispatch / ACK / Progress / Result / Terminal 证据链</span></label>
        <p class="compact-history">第三方 Agent 只能提交 ACK、进度和 Result；Terminal 仅由 CCM 在正式验收后生成。项目/群聊只能降低并发上限，不能突破全局值。</p>
      </section>

      <section class="settings-section">
        <div class="section-head"><div><span class="eyebrow">PROVIDER CAPACITY</span><h3>子 Agent 模型容量</h3></div><button class="primary-btn" :disabled="saving" @click="saveCapability"><Save :size="16" />保存容量</button></div>
        <div class="field-grid capability-grid">
          <label><span>Provider</span><input v-model.trim="capabilityForm.provider" placeholder="codex" /></label>
          <label><span>模型</span><input v-model.trim="capabilityForm.model" placeholder="可选" /></label>
          <label><span>上下文窗口</span><input v-model.number="capabilityForm.contextWindow" type="number" min="32000" step="1000" /></label>
          <label><span>最大输出</span><input v-model.number="capabilityForm.maxOutputTokens" type="number" min="0" step="1000" /></label>
        </div>
        <div class="capability-list"><div v-for="entry in capabilities.filter(item => !item.revoked).slice(0, 12)" :key="entry.evidenceId || `${entry.provider}:${entry.model}`"><strong>{{ entry.provider }}{{ entry.model ? ` / ${entry.model}` : '' }}</strong><span>{{ formatNumber(entry.contextWindow) }} / 输出 {{ formatNumber(entry.maxOutputTokens) }}</span><small>{{ entry.source }}</small></div></div>
      </section>

      <section class="settings-section">
        <div class="section-head"><div><span class="eyebrow">SESSION MEMORY</span><h3>抽取提示词与模板</h3></div><div class="section-actions"><button class="text-btn" :disabled="customizationLoading" @click="saveCustomization(true)">恢复继承</button><button class="primary-btn" :disabled="saving || customizationLoading" @click="saveCustomization(false)"><Save :size="16" />保存</button></div></div>
        <div class="customization-toolbar">
          <div class="preset-control"><button :class="{ active: customizationMode === 'prompt' }" @click="customizationMode = 'prompt'">提示词</button><button :class="{ active: customizationMode === 'template' }" @click="customizationMode = 'template'">模板</button></div>
          <select v-model="customizationTarget"><option value="">所有群聊默认</option><option v-for="item in groupScopes" :key="item.id" :value="item.id">{{ item.label }}</option></select>
        </div>
        <textarea v-model="customContent" :rows="customizationMode === 'prompt' ? 9 : 14" :maxlength="customizationMode === 'prompt' ? 32000 : 48000" :placeholder="customizationMode === 'prompt' ? '优先保留用户纠正、当前任务和精确文件路径。' : '# Current State\n_Active work and immediate next steps._'" />
        <small class="profile-note">{{ customProfile?.source || 'default' }} · {{ customContent.length }} 字符</small>
      </section>
    </main>

    <div v-if="editState" class="modal-backdrop" @click.self="editState = null">
      <div class="edit-modal">
        <h3>{{ editState.action === 'edit' ? '修改记忆' : '删除记忆' }}</h3>
        <label v-if="editState.action === 'edit'"><span>内容</span><textarea v-model="editState.text" rows="6" /></label>
        <label><span>原因</span><textarea v-model="editState.reason" rows="3" /></label>
        <div><button class="text-btn" @click="editState = null">取消</button><button class="primary-btn" :class="{ danger: editState.action === 'delete' }" @click="submitEdit">确认</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.memory-center { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; color: var(--text-primary, #17201d); background: var(--bg-primary); }
.mc-header { min-height: 76px; padding: 14px 24px; display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid var(--border-color); background: var(--surface); }
.mc-header h2, .detail-head h3, .section-head h3 { margin: 2px 0 0; font-size: 20px; letter-spacing: 0; }
.eyebrow { color: var(--text-muted); font-size: 10px; font-weight: 700; letter-spacing: 0; }
.header-actions, .section-actions, .row-actions, .section-head, .detail-head { display: flex; align-items: center; gap: 10px; }
.section-head, .detail-head { justify-content: space-between; }
.detail-head .text-btn { flex: 0 0 auto; white-space: nowrap; }
.page-tabs, .preset-control { display: inline-flex; padding: 3px; border: 1px solid var(--border-color); background: var(--panel-muted); }
.page-tabs button, .preset-control button { min-height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 7px; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; }
.page-tabs button.active, .preset-control button.active { background: var(--surface-raised); color: var(--accent-green); box-shadow: var(--shadow-sm); }
button { font: inherit; }
.icon-btn { width: 34px; height: 34px; display: inline-grid; place-items: center; border: 1px solid var(--border-color); background: var(--surface-raised); color: var(--text-secondary); cursor: pointer; }
.icon-btn:hover { border-color: #8fa69c; color: #0e6b4f; }
.icon-btn.danger:hover, .primary-btn.danger { color: var(--accent-red); border-color: color-mix(in srgb, var(--accent-red) 40%, var(--border-color)); background: var(--danger-soft); }
.text-btn, .primary-btn { min-height: 34px; padding: 0 12px; border: 1px solid var(--border-color); background: var(--surface-raised); color: var(--text-secondary); cursor: pointer; }
.primary-btn { display: inline-flex; align-items: center; gap: 7px; border-color: #0e6b4f; background: #0e6b4f; color: #fff; }
button:disabled { opacity: .55; cursor: not-allowed; }
.memory-workspace { min-height: 0; display: grid; flex: 1 1 auto; grid-template-columns: minmax(230px, 280px) 1fr; overflow: hidden; }
.scope-list { min-height: 0; padding: 18px 12px; border-right: 1px solid var(--border-color); background: var(--panel-muted); overflow-y: auto; overscroll-behavior: contain; }
.scope-group + .scope-group { margin-top: 20px; }
.scope-group > label { display: block; padding: 0 8px 7px; color: #75817c; font-size: 11px; font-weight: 700; }
.scope-group > button { width: 100%; min-height: 48px; padding: 7px 8px; display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 8px; border: 0; border-left: 3px solid transparent; background: transparent; color: #48564f; text-align: left; cursor: pointer; }
.scope-group > button.active { border-left-color: var(--accent-green); background: var(--success-soft); color: var(--text-primary); }
.scope-group strong, .scope-group small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scope-group strong { font-size: 13px; }.scope-group small { margin-top: 3px; color: #78847e; font-size: 10px; }.warn { color: #ad7217; }
.scope-parent { margin: 0; }
.scope-parent + .scope-parent { margin-top: 4px; }
.scope-parent > summary { min-height: 38px; padding: 6px 8px; display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 8px; color: #34433c; cursor: pointer; list-style: none; }
.scope-parent > summary::-webkit-details-marker { display: none; }
.scope-parent > summary::after { content: '›'; grid-column: 3; grid-row: 1; margin-left: 6px; color: #829089; transform: rotate(90deg); transition: transform .15s ease; }
.scope-parent:not([open]) > summary::after { transform: rotate(0deg); }
.scope-parent > summary small { grid-column: 3; grid-row: 1; margin: 0 16px 0 0; font-size: 9px; }
.scope-children { margin-left: 9px; border-left: 1px solid #d7dfdb; }
.scope-children > button { width: calc(100% - 4px); min-height: 44px; margin-left: 4px; padding: 6px 7px 6px 10px; display: grid; grid-template-columns: 17px minmax(0, 1fr) auto; align-items: center; gap: 7px; border: 0; border-left: 3px solid transparent; background: transparent; color: #526159; text-align: left; cursor: pointer; }
.scope-children > button.active { border-left-color: var(--accent-green); background: var(--success-soft); color: var(--text-primary); }
.task-agent-group > label { display: flex; align-items: center; justify-content: space-between; }
.task-project-parent > summary { border-left: 3px solid transparent; }
.task-project-parent[open] > summary { border-left-color: var(--border-strong); background: var(--surface-subtle); }
.task-project-parent > summary strong { min-width: 0; }
.memory-detail { min-width: 0; min-height: 0; padding: 22px clamp(18px, 3vw, 42px) 50px; overflow-y: auto; overscroll-behavior: contain; }
.detail-content { max-width: 1100px; margin: 0 auto; }
.summary-strip, .runtime-strip { margin: 18px 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-block: 1px solid var(--border-color); background: var(--surface); }
.summary-strip > span, .runtime-strip > span { padding: 12px 14px; border-right: 1px solid var(--border-color); }.summary-strip > span:last-child, .runtime-strip > span:last-child { border-right: 0; }
.summary-strip small, .summary-strip strong { display: block; }.summary-strip small { color: #748079; font-size: 10px; }.summary-strip strong { margin-top: 4px; font-size: 15px; }.summary-strip strong.healthy { color: #0e6b4f; display: flex; align-items: center; gap: 5px; }.summary-strip strong.warning, .summary-strip strong.critical { color: #a15d16; }
.compact-history { margin: -10px 0 18px; color: #6f7c75; font-size: 11px; }
.compact-circuit-alert { max-width: 720px; margin: -6px 0 16px; padding: 9px 11px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; border-left: 3px solid #dc2626; background: color-mix(in srgb, var(--surface, #fff) 92%, #ef4444 8%); color: #b91c1c; font-size: 12px; }
.compact-circuit-alert .text-btn { margin-left: auto; }
.continuity-state { max-width: 720px; margin: 0 0 14px; padding: 9px 11px; border-left: 3px solid var(--border-strong); background: var(--surface-subtle); color: var(--text-secondary); font-size: 12px; }
.source-continuity-panel{display:grid;gap:9px;margin:10px 0;padding:12px;border:1px solid var(--border-color);border-radius:10px;background:var(--surface-subtle)}
.source-continuity-panel h4{margin:0;font-size:13px;color:var(--text-primary)}
.source-receipts{display:flex;flex-wrap:wrap;gap:6px}.source-receipts span{padding:5px 8px;border:1px solid var(--border-color);border-radius:999px;color:var(--text-secondary);font-size:10px}
.source-maintenance{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding-top:8px;border-top:1px dashed var(--border-color);color:var(--text-secondary);font-size:11px}.source-maintenance>div{display:grid;gap:2px;margin-right:auto}.source-maintenance strong{color:var(--text-primary);font-size:12px}.source-maintenance small{font-size:10px}
.alert-list { margin-bottom: 14px; }.alert-list p { margin: 0 0 6px; padding: 9px 11px; display: flex; gap: 8px; align-items: center; background: var(--warning-soft); color: var(--accent-yellow); border-left: 3px solid var(--accent-yellow); font-size: 12px; }
.search-box { max-width: 420px; height: 38px; padding: 0 11px; display: flex; align-items: center; gap: 8px; border: 1px solid var(--border-color); background: var(--control-bg); }.search-box input { width: 100%; border: 0; outline: 0; background: transparent; }
.memory-section { margin-top: 24px; }.memory-section h4 { margin: 0 0 7px; font-size: 13px; }.memory-section h4 span { color: #7b8781; font-weight: 500; }
.memory-row { min-height: 62px; padding: 11px 8px 11px 12px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border-top: 1px solid var(--border-color); background: var(--surface); }.memory-row:last-child { border-bottom: 1px solid var(--border-color); }.memory-row.deprecated { opacity: .58; }.memory-copy { min-width: 0; }.memory-copy p { margin: 0; line-height: 1.5; overflow-wrap: anywhere; white-space: pre-wrap; }.memory-copy small { color: var(--text-muted); font-size: 10px; }
.audit-list article { padding: 13px 4px; display: grid; grid-template-columns: 150px 1fr; gap: 18px; border-bottom: 1px solid #dce3df; }.audit-list time { color: #75817b; font-size: 11px; }.audit-list p { margin: 4px 0 0; }
.empty-state { padding: 50px 10px; color: #78847e; text-align: center; }
.settings-page { width: 100%; max-width: 1180px; min-height: 0; margin: 0 auto; padding: 24px clamp(18px, 3vw, 42px) 60px; flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; box-sizing: border-box; }.settings-section { padding: 22px 0 28px; border-bottom: 1px solid #d6dfda; }.settings-section:first-child { padding-top: 0; }
.field-grid { margin-top: 18px; display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 14px; }.field-grid label, .edit-modal label { display: grid; gap: 6px; }.field-grid label span, .edit-modal label span { color: var(--text-secondary); font-size: 11px; font-weight: 600; }.field-grid input, select, textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); background: var(--control-bg); color: inherit; outline: none; }.field-grid input, select { height: 38px; padding: 0 10px; }.field-grid input:focus, select:focus, textarea:focus { border-color: var(--accent-green); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-green) 14%, transparent); }.field-grid input:disabled { background: var(--panel-muted); color: var(--text-muted); }
.toggle-row { margin-top: 16px; display: inline-flex; align-items: center; gap: 8px; }.toggle-row input { width: 16px; height: 16px; accent-color: #0e6b4f; }.runtime-strip { grid-template-columns: repeat(3, 1fr); font-size: 12px; }
.capability-list { margin-top: 16px; border-top: 1px solid #dce3df; }.capability-list > div { min-height: 42px; display: grid; grid-template-columns: 1fr 180px 120px; align-items: center; gap: 14px; border-bottom: 1px solid #e1e7e4; }.capability-list span, .capability-list small { color: #6d7973; }
.customization-toolbar { margin: 16px 0 10px; display: flex; justify-content: space-between; gap: 12px; }.customization-toolbar select { max-width: 420px; }.settings-section textarea { padding: 11px; resize: vertical; line-height: 1.55; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }.profile-note { display: block; margin-top: 6px; color: #78847e; }
.modal-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: var(--overlay-scrim); }.edit-modal { width: min(560px, 100%); padding: 20px; background: var(--surface-raised); border: 1px solid var(--border-color); box-shadow: var(--shadow-lg); }.edit-modal h3 { margin-top: 0; }.edit-modal label + label { margin-top: 12px; }.edit-modal textarea { padding: 10px; }.edit-modal > div:last-child { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 900px) { .mc-header { align-items: flex-start; }.header-actions { align-items: flex-end; flex-direction: column-reverse; }.memory-workspace { grid-template-columns: 1fr; }.scope-list { max-height: 230px; border-right: 0; border-bottom: 1px solid #dce3df; }.field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.summary-strip { grid-template-columns: repeat(2, 1fr); }.capability-list > div { grid-template-columns: 1fr; gap: 3px; padding: 8px 0; } }
@media (max-width: 560px) { .mc-header { padding: 12px; flex-direction: column; }.header-actions { width: 100%; flex-direction: row; align-items: center; }.page-tabs { width: auto; flex: 1; }.page-tabs button { flex: 1; justify-content: center; }.memory-detail, .settings-page { padding-inline: 12px; }.field-grid { grid-template-columns: 1fr; }.customization-toolbar { flex-direction: column; }.customization-toolbar select { max-width: none; }.memory-row { align-items: flex-start; }.row-actions { flex-direction: column; }.runtime-strip { grid-template-columns: 1fr; } }
</style>
