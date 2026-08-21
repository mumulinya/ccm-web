<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  FileClock,
  FolderKanban,
  Globe2,
  Layers,
  MessagesSquare,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from '@lucide/vue'
import { toast } from '../../utils/toast.js'
import MicroCompactStatusPanel from './MicroCompactStatusPanel.vue'
import PostCompactRecoveryPanel from './PostCompactRecoveryPanel.vue'
import WorkspacePageShell from '../common/WorkspacePageShell.vue'
import WorkspaceSectionNav from '../common/WorkspaceSectionNav.vue'

const presets = [
  { id: 'default', label: '自动适应', window: 0, threshold: 0 },
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
const advancedSection = ref(sessionStorage.getItem('ccm:memory-layout:v1:section') || 'context')
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
  timeBasedMicrocompactEnabled: true,
  timeBasedMicrocompactGapMinutes: 60,
  timeBasedMicrocompactKeepRecent: 5,
  agentCommunicationV2Enabled: true,
  agentRunnerStartTimeoutMs: 60000,
  agentAckTimeoutMs: 30000,
  agentHeartbeatIntervalMs: 20000,
  agentRuntimeStructuredProgressEnabled: true,
  strictPreExecutionAckEnabled: true,
  agentProgressFallbackTimeoutMs: 60000,
  agentRawOutputRetentionMode: 'ephemeral',
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

const memoryView = computed({
  get: () => activePage.value === 'settings' ? 'advanced' : (showAudit.value ? 'audit' : 'memory'),
  set: (value) => {
    if (value === 'advanced') {
      activePage.value = 'settings'
      showAudit.value = false
      return
    }
    activePage.value = 'memory'
    if (value === 'audit' && !showAudit.value) toggleAudit()
    else showAudit.value = false
  },
})

const memoryViews = computed(() => [
  { id: 'memory', label: '会话记忆' },
  { id: 'audit', label: '审计日志', count: audit.value.length },
  { id: 'advanced', label: '上下文策略设置' },
])

const advancedSections = [
  { id: 'context', label: '上下文与压缩', description: '窗口、预算与整理策略' },
  { id: 'tools', label: '代码与原生工具', description: '索引、搜索与原生工具' },
  { id: 'main-agent', label: '主 Agent 自适应续环', description: '续环与工具批量' },
  { id: 'third-party', label: '第三方 Agent 通信', description: 'ACK、心跳、租约与并发' },
  { id: 'provider', label: 'Provider 容量', description: '模型窗口与输出能力' },
  { id: 'templates', label: '记忆模板定制', description: '抽取提示词与模板' },
]

const setAdvancedSection = (value) => {
  advancedSection.value = value
  try { sessionStorage.setItem('ccm:memory-layout:v1:section', value) } catch {}
}

const memoryPrimaryAction = computed(() => memoryView.value !== 'advanced' ? null : ({
  id: 'save',
  label: saving.value ? '保存中...' : '保存当前设置',
  icon: Save,
  disabled: saving.value || customizationLoading.value,
}))

const saveCurrentMemorySection = () => {
  if (advancedSection.value === 'provider') return saveCapability()
  if (advancedSection.value === 'templates') return saveCustomization(false)
  return saveSettings()
}

const refreshCurrentMemoryView = () => memoryView.value === 'advanced' ? loadSettings() : (memoryView.value === 'audit' ? loadAudit() : loadOverview(true))

const scopes = computed(() => [
  ...(overview.value.globals || []).map(item => ({ ...item, scope: item.scope || 'global' })),
  ...(overview.value.groups || []).map(item => ({ ...item, scope: item.scope || 'group' })),
  ...(overview.value.projects || []).map(item => ({ ...item, scope: item.scope || 'project' })),
  ...(overview.value.tasks || []).map(item => ({ ...item, scope: item.scope || 'task-agent' })),
])

const selectedSummary = computed(() => scopes.value.find(item => item.id === selectedId.value && item.scope === selectedScope.value) || null)
const isSessionDetail = computed(() => ['group', 'global', 'task-agent'].includes(selectedScope.value) && !!detail.value?.session)
const isGroupSessionScope = computed(() => selectedScope.value === 'group' && Boolean(detail.value?.session))
const postCompactUsage = computed(() => detail.value?.postCompactUsage || null)
const microCompactState = computed(() => detail.value?.microCompactState || null)
const contextSourceContinuity = computed(() => detail.value?.contextSourceContinuity || null)
const providerContextCacheState = computed(() => detail.value?.providerContextCache || null)
const contextEngineTrends = computed(() => detail.value?.contextEngineTrends || null)
const contextEngineRecovery = computed(() => detail.value?.contextEngineRecovery || null)
const recoveryDrilling = ref(false)
const sourceMaintenancePreview = ref(null)
const sourceMaintenanceJob = ref(null)
const sourceMaintenanceLoading = ref(false)

const sourceMaintenanceIdentity = computed(() => {
  const session = detail.value?.session
  if (!session) return null
  return { scope: selectedScope.value, scopeId: selectedId.value, sessionId: session.id || selectedId.value }
})

const globalTree = computed(() => {
  const list = overview.value.globals || []
  return {
    id: 'global-root',
    label: '全局助手会话',
    longTerm: list.filter(item => !item.sessionId),
    sessions: list.filter(item => Boolean(item.sessionId)),
  }
})

const groupTrees = computed(() => {
  const map = new Map()
  for (const item of overview.value.groups || []) {
    const parentId = item.groupId || item.id
    if (!map.has(parentId)) map.set(parentId, { id: parentId, label: item.groupName || item.label || parentId, sessions: [] })
    map.get(parentId).sessions.push(item)
  }
  return Array.from(map.values())
})

const projectTrees = computed(() => {
  const map = new Map()
  for (const item of overview.value.projects || []) {
    const parentId = item.projectId || item.id
    if (!map.has(parentId)) map.set(parentId, { id: parentId, label: item.projectName || item.projectId || parentId, longTerm: [], sessions: [] })
    if (item.sessionId || item.projectSessionId || item.memoryKind === 'session') map.get(parentId).sessions.push(item)
    else map.get(parentId).longTerm.push(item)
  }
  return Array.from(map.values())
})

const taskProjectTrees = computed(() => {
  const map = new Map()
  for (const item of overview.value.tasks || []) {
    const projectId = item.projectId || 'unassigned'
    if (!map.has(projectId)) map.set(projectId, { id: projectId, label: item.projectName || (projectId === 'unassigned' ? '未指定项目' : projectId), sessions: [] })
    map.get(projectId).sessions.push(item)
  }
  return Array.from(map.values())
})

const groupScopes = computed(() => (overview.value.groups || []).filter(item => !item.sessionId).map(item => ({ id: item.id, label: item.groupName || item.label || item.id })))

const itemGroups = computed(() => {
  const rawGroups = detail.value?.itemGroups || []
  const q = query.value.toLowerCase()
  return rawGroups
    .map(group => {
      const items = Array.isArray(group.items) ? group.items : []
      const filtered = q
        ? items.filter(item => `${item.text || ''} ${item.reason || ''} ${item.type || ''}`.toLowerCase().includes(q))
        : items
      return { ...group, items: filtered }
    })
    .filter(group => group.items.length > 0)
})

const typeLabels = {
  facts: '核心事实',
  user_preferences: '用户偏好',
  project_guidelines: '项目规范',
  team_rules: '协作规则',
  active_context: '近期原文',
  summary: '正式摘要',
  decisions: '关键决策',
  context_summary: '全局摘要',
  persistentRequirements: '持续需求',
  factAnchors: '事实锚点',
  completed: '已完成工作',
  blocked: '阻塞与风险',
  workerLedger: 'Worker 任务账本',
  openQuestions: '待决问题',
  nextActions: '后续行动',
  durableMemories: '长期记忆',
  user: '用户画像',
  feedback: '历史反馈',
  authorization: '授权记录',
  missions: '任务目标',
  unresolved: '未决事项',
  references: '参考资料',
}

const formatNumber = value => Number(value || 0).toLocaleString('zh-CN')
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未记录'
const formatUsd = value => value === null || value === undefined ? '-' : `$${Number(value).toFixed(4)}`

const summarySourceLabel = (value) => ({
  model: '模型摘要',
  recent_transcript: '近期原文',
  deterministic_fallback: '确定性降级摘要',
  empty: '暂无摘要',
}[value] || value || '未生成')

const sessionMemoryStatusLabel = (value) => ({
  present: '已提取',
  empty: '空',
  disabled: '未启用',
  failed: '提取失败',
}[value] || value || '未就绪')

const circuitFailureModeLabel = (value) => ({
  context_overflow: '上下文超限',
  repeated_exception: '连续异常',
  timeout: '执行超时',
  manual: '手动熔断',
}[value] || value || '未知异常')

const providerCacheModeLabel = item => item?.providerNativeCacheAvailable ? (item?.providerNativeCacheActive ? '原生已命中' : '原生支持') : (item?.status === 'recorded' ? 'CCM 投影管理' : '自动')
const providerCapabilityLabel = item => item?.providerCapabilities?.reason || (item?.providerNativeCacheAvailable ? '支持原生缓存' : '依赖 CCM 动态投影')
const materializationCacheLabel = item => item?.materializationState?.cached ? '内存缓存已命中' : '实时生成投影'
const cacheRecommendationLabel = item => item?.action === 'promote_stable_prefix' ? '建议固化稳定前缀' : item?.action === 'keep_session_active' ? '建议保持会话活跃' : item?.reason || '配置保持良好'

const taskAgentSessionLabel = (item) => {
  if (item.taskTitle && item.agentName) return `${item.taskTitle} · ${item.agentName}`
  if (item.taskTitle) return item.taskTitle
  if (item.agentName) return `${item.agentName} (任务 #${item.taskId || item.id})`
  return item.sessionLabel || item.label || item.id
}

const taskAgentSessionMeta = (item) => {
  const parts = []
  if (item.agentType) parts.push(item.agentType)
  if (item.taskStatus) parts.push(item.taskStatus)
  return parts.join(' · ')
}

const contextPercentage = computed(() => {
  const cur = Number(selectedSummary.value?.currentTokens || 0)
  const max = Number(selectedSummary.value?.autoCompactThreshold || 0)
  if (!max) return 0
  return Math.min(100, Math.round((cur / max) * 100))
})

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) throw new Error(data.error || `请求失败 (${response.status})`)
  return data
}

async function loadOverview(silent = false) {
  if (!silent) loading.value = true
  try {
    const data = await requestJson('/api/memory-center/overview')
    overview.value = {
      groups: data.groups || [],
      projects: data.projects || [],
      globals: data.globals || [],
      tasks: data.tasks || [],
      alerts: data.alerts || [],
      totals: data.totals || {},
    }
    const currentList = scopes.value
    if (!selectedId.value && currentList.length) {
      selectScope(currentList[0])
    } else if (selectedId.value) {
      const found = currentList.find(item => item.id === selectedId.value && item.scope === selectedScope.value)
      if (found) await loadDetail()
      else if (currentList.length) selectScope(currentList[0])
    }
  } catch (error) {
    if (!silent) toast.error(error.message || '加载记忆中心失败')
  } finally {
    if (!silent) loading.value = false
  }
}

async function selectScope(item) {
  selectedScope.value = item.scope
  selectedId.value = item.id
  showAudit.value = false
  sourceMaintenancePreview.value = null
  sourceMaintenanceJob.value = null
  await loadDetail()
}

async function loadDetail() {
  if (!selectedId.value) return
  loading.value = true
  try {
    const params = new URLSearchParams({ scope: selectedScope.value, id: selectedId.value })
    detail.value = await requestJson(`/api/memory-center/scope?${params}`)
  } catch (error) {
    toast.error(error.message || '读取记忆详情失败')
  } finally {
    loading.value = false
  }
}

async function loadAudit() {
  if (!selectedId.value) return
  loading.value = true
  try {
    const params = new URLSearchParams({ scope: selectedScope.value, id: selectedId.value })
    const data = await requestJson(`/api/memory-center/audit?${params}`)
    audit.value = data.audit || []
  } catch (error) {
    toast.error(error.message || '读取审计记录失败')
  } finally {
    loading.value = false
  }
}

async function toggleAudit() {
  showAudit.value = !showAudit.value
  if (showAudit.value) await loadAudit()
}

async function resetCompactCircuit() {
  const session = detail.value?.session
  if (!session) return
  try {
    await requestJson('/api/memory-center/compact-circuit-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopeId: selectedId.value, reason: '管理员手动重置压缩熔断' }),
    })
    await loadOverview(true)
    toast.success('压缩熔断状态已重置')
  } catch (error) {
    toast.error(error.message || '重置熔断状态失败')
  }
}

async function previewSourceMaintenance() {
  if (!sourceMaintenanceIdentity.value) return
  sourceMaintenanceLoading.value = true
  try {
    sourceMaintenancePreview.value = await requestJson('/api/memory-center/context-source-maintenance/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sourceMaintenanceIdentity.value),
    })
    toast.success('历史来源收口预览已生成')
  } catch (error) { toast.error(error.message || '预览失败') }
  finally { sourceMaintenanceLoading.value = false }
}

async function applySourceMaintenance() {
  if (!sourceMaintenancePreview.value || !sourceMaintenanceIdentity.value) return
  const reason = window.prompt('执行历史来源收口的原因 (必填，将创建安全备份)')
  if (!reason?.trim() || !window.confirm('确认按当前 Checksum 执行？若数据已变化，服务端会整体拒绝。')) return
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
  const reason = window.prompt('回滚原因 (必填)')
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
      agentRuntimeStructuredProgressEnabled: current.agentRuntimeStructuredProgressEnabled !== false,
      strictPreExecutionAckEnabled: current.strictPreExecutionAckEnabled !== false,
      agentProgressFallbackTimeoutMs: Number(current.agentProgressFallbackTimeoutMs || 60000),
      agentRawOutputRetentionMode: 'ephemeral',
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
  <WorkspacePageShell
    v-model:active-view="memoryView"
    title="记忆控制中心"
    description="统一查看各会话长期记忆、摘要连续性、MicroCompact 整理与多模型上下文策略"
    :views="memoryViews"
    :primary-action="memoryPrimaryAction"
    :secondary-actions="[{ id: 'refresh', label: '刷新数据', icon: RefreshCw }]"
    storage-key="ccm:memory-layout:v1"
    @primary-action="saveCurrentMemorySection"
    @secondary-action="refreshCurrentMemoryView"
  >
    <div class="memory-center-root">
      <!-- 视图 1：会话记忆与审计 -->
      <div v-if="activePage === 'memory'" class="memory-workspace">
        <!-- 左侧范围树导航 -->
        <aside class="scope-nav-tree">
          <!-- 全局会话 -->
          <div v-if="globalTree.longTerm.length || globalTree.sessions.length" class="scope-tree-group">
            <span class="group-label">全局助手</span>
            <details class="scope-details" open>
              <summary class="details-summary">
                <Globe2 :size="15" class="tree-icon blue" />
                <strong>{{ globalTree.label }}</strong>
                <span class="tree-count">{{ globalTree.sessions.length }}</span>
                <ChevronRight :size="13" class="arrow-icon" />
              </summary>
              <div class="tree-children">
                <button
                  v-for="item in globalTree.longTerm"
                  :key="item.id"
                  type="button"
                  class="tree-node-btn"
                  :class="{ active: selectedId === item.id && selectedScope === item.scope }"
                  @click="selectScope(item)"
                >
                  <Globe2 :size="14" />
                  <div class="node-copy">
                    <strong>长期记忆</strong>
                    <small class="font-mono">{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }}</small>
                  </div>
                </button>
                <button
                  v-for="item in globalTree.sessions"
                  :key="item.id"
                  type="button"
                  class="tree-node-btn"
                  :class="{ active: selectedId === item.id && selectedScope === item.scope }"
                  @click="selectScope(item)"
                >
                  <MessagesSquare :size="14" />
                  <div class="node-copy">
                    <strong>{{ item.label }}{{ item.currentSession ? ' · 当前' : '' }}</strong>
                    <small class="font-mono">{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }}</small>
                  </div>
                </button>
              </div>
            </details>
          </div>

          <!-- 群聊会话 -->
          <div v-if="groupTrees.length" class="scope-tree-group">
            <span class="group-label">群聊会话 ({{ groupTrees.length }})</span>
            <details v-for="tree in groupTrees" :key="tree.id" class="scope-details">
              <summary class="details-summary">
                <MessagesSquare :size="15" class="tree-icon purple" />
                <strong>{{ tree.label }}</strong>
                <span class="tree-count">{{ tree.sessions.length }}</span>
                <ChevronRight :size="13" class="arrow-icon" />
              </summary>
              <div class="tree-children">
                <button
                  v-for="item in tree.sessions"
                  :key="item.id"
                  type="button"
                  class="tree-node-btn"
                  :class="{ active: selectedId === item.id && selectedScope === item.scope }"
                  @click="selectScope(item)"
                >
                  <MessagesSquare :size="14" />
                  <div class="node-copy">
                    <strong>{{ item.sessionLabel || item.label }}</strong>
                    <small class="font-mono">{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }}</small>
                  </div>
                  <AlertTriangle v-if="item.alerts" :size="13" class="alert-warn-icon" />
                </button>
              </div>
            </details>
          </div>

          <!-- 项目会话 -->
          <div v-if="projectTrees.length" class="scope-tree-group">
            <span class="group-label">项目会话 ({{ projectTrees.length }})</span>
            <details v-for="tree in projectTrees" :key="tree.id" class="scope-details">
              <summary class="details-summary">
                <FolderKanban :size="15" class="tree-icon orange" />
                <strong>{{ tree.label }}</strong>
                <span class="tree-count">{{ tree.sessions.length }}</span>
                <ChevronRight :size="13" class="arrow-icon" />
              </summary>
              <div class="tree-children">
                <button
                  v-for="item in tree.longTerm"
                  :key="item.id"
                  type="button"
                  class="tree-node-btn"
                  :class="{ active: selectedId === item.id && selectedScope === item.scope }"
                  @click="selectScope(item)"
                >
                  <Globe2 :size="14" />
                  <div class="node-copy">
                    <strong>项目长期记忆</strong>
                    <small>{{ item.longTermMemory?.activeCount || 0 }} 有效 / {{ item.longTermMemory?.taskHistoryCount || 0 }} 历史</small>
                  </div>
                </button>
                <button
                  v-for="item in tree.sessions"
                  :key="item.id"
                  type="button"
                  class="tree-node-btn"
                  :class="{ active: selectedId === item.id && selectedScope === item.scope }"
                  @click="selectScope(item)"
                >
                  <MessagesSquare :size="14" />
                  <div class="node-copy">
                    <strong>{{ item.sessionLabel || item.label }}</strong>
                    <small class="font-mono">{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }}</small>
                  </div>
                </button>
              </div>
            </details>
          </div>

          <!-- 子 Agent 会话 -->
          <div v-if="taskProjectTrees.length" class="scope-tree-group">
            <span class="group-label">子 Agent 会话 ({{ taskProjectTrees.length }} 项目)</span>
            <details v-for="tree in taskProjectTrees" :key="tree.id" class="scope-details">
              <summary class="details-summary">
                <Bot :size="15" class="tree-icon green" />
                <strong :title="tree.label">{{ tree.label }}</strong>
                <span class="tree-count">{{ tree.sessions.length }}</span>
                <ChevronRight :size="13" class="arrow-icon" />
              </summary>
              <div class="tree-children">
                <button
                  v-for="item in tree.sessions"
                  :key="item.id"
                  type="button"
                  class="tree-node-btn"
                  :class="{ active: selectedId === item.id && selectedScope === item.scope }"
                  :title="`${tree.label} / ${item.id}`"
                  @click="selectScope(item)"
                >
                  <Bot :size="14" />
                  <div class="node-copy">
                    <strong>{{ taskAgentSessionLabel(item) }}</strong>
                    <small class="font-mono">
                      {{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }}
                      <span v-if="taskAgentSessionMeta(item)"> · {{ taskAgentSessionMeta(item) }}</span>
                    </small>
                  </div>
                  <AlertTriangle v-if="item.circuitOpen" :size="13" class="alert-warn-icon" />
                </button>
              </div>
            </details>
          </div>
        </aside>

        <!-- 右侧详情展示区 -->
        <main class="memory-detail-panel">
          <div v-if="detail && selectedSummary" class="detail-container">
            <!-- 头部标题 -->
            <div class="detail-top-row">
              <div class="scope-badge-group">
                <span class="scope-tag">{{ selectedScope.toUpperCase() }}</span>
                <h3>{{ selectedSummary.label }}</h3>
              </div>
              <button type="button" class="btn-toggle-audit" @click="toggleAudit">
                <Activity :size="13" />
                <span>{{ showAudit ? '返回记忆视图' : '查看审计日志' }}</span>
              </button>
            </div>

            <!-- 4 格现代化 KPI 指标卡片 -->
            <div v-if="selectedScope === 'project'" class="metrics-grid">
              <div class="metric-card">
                <small>当前模型载荷</small>
                <strong>需选择精确会话</strong>
              </div>
              <div class="metric-card">
                <small>有效长期记忆</small>
                <strong class="font-mono">{{ selectedSummary.longTermMemory?.activeCount || 0 }} 条</strong>
              </div>
              <div class="metric-card">
                <small>任务历史记录</small>
                <strong class="font-mono">{{ selectedSummary.longTermMemory?.taskHistoryCount || 0 }} 条</strong>
              </div>
              <div class="metric-card">
                <small>写入策略</small>
                <strong>验收通过后提交</strong>
              </div>
            </div>

            <div v-else class="metrics-grid">
              <div class="metric-card">
                <small>当前模型上下文</small>
                <strong class="font-mono">{{ formatNumber(selectedSummary.currentTokens) }} tokens</strong>
                <div class="mini-progress-track">
                  <div class="mini-progress-fill" :style="{ width: `${contextPercentage}%` }"></div>
                </div>
              </div>
              <div class="metric-card">
                <small>自动压缩阈值</small>
                <strong class="font-mono">{{ formatNumber(selectedSummary.autoCompactThreshold) }}</strong>
              </div>
              <div class="metric-card">
                <small>距离压缩安全空间</small>
                <strong class="font-mono" :class="{ 'text-warn': Number(selectedSummary.remainingTokens) < 10000 }">
                  {{ formatNumber(selectedSummary.remainingTokens) }} tokens
                </strong>
              </div>
              <div class="metric-card">
                <small>上下文健康度</small>
                <strong class="health-status-text" :class="selectedSummary.health">
                  <CheckCircle2 v-if="selectedSummary.health === 'healthy'" :size="14" />
                  <span>{{ selectedSummary.health === 'healthy' ? '健康就绪' : selectedSummary.health }}</span>
                </strong>
              </div>
            </div>

            <!-- 状态说明与熔断警报 -->
            <div v-if="selectedSummary.circuitOpen" class="circuit-alert-box">
              <AlertTriangle :size="16" />
              <div class="alert-text">
                <strong>自动压缩已触发熔断保护</strong>
                <span>
                  原因：{{ circuitFailureModeLabel(selectedSummary.circuitFailureMode) }}，连续失败 {{ selectedSummary.circuitConsecutiveFailures || 0 }} 次。
                  <template v-if="selectedSummary.circuitAutoRetryAt">将在 {{ formatTime(selectedSummary.circuitAutoRetryAt) }} 自动试探恢复。</template>
                  <template v-else>重试无法自愈，需人工确认后重置。</template>
                </span>
              </div>
              <button v-if="isGroupSessionScope" type="button" class="btn-reset-circuit" @click="resetCompactCircuit">
                <RotateCcw :size="12" />
                <span>立即重置熔断</span>
              </button>
            </div>

            <div v-else-if="selectedSummary.summaryDegraded" class="degraded-hint-box">
              <AlertTriangle :size="14" />
              <span>压缩正常，但最近 {{ selectedSummary.summaryFallbackFailures || 0 }} 次模型摘要失败并回退到确定性摘要，摘要质量已降级。</span>
            </div>

            <!-- 子组件：MicroCompact 与 PostCompact 恢复 -->
            <MicroCompactStatusPanel v-if="isSessionDetail && microCompactState?.applicable" :state="microCompactState" />
            <PostCompactRecoveryPanel v-if="isSessionDetail" :usage="postCompactUsage" />

            <!-- 上下文来源连续性面板 -->
            <section v-if="isSessionDetail && contextSourceContinuity" class="source-continuity-panel">
              <div class="continuity-head">
                <Layers :size="15" />
                <h4>上下文来源连续性 (Source Continuity)</h4>
              </div>
              <div class="continuity-grid">
                <div class="c-block">
                  <small>来源目录</small>
                  <strong class="font-mono">{{ formatNumber(contextSourceContinuity.budget?.catalogUsedTokens) }} / {{ formatNumber(contextSourceContinuity.budget?.catalogTargetTokens) }}</strong>
                </div>
                <div class="c-block">
                  <small>正文注入</small>
                  <strong class="font-mono">{{ formatNumber(contextSourceContinuity.budget?.hydrationUsedTokens) }} / {{ formatNumber(contextSourceContinuity.budget?.hydrationTargetTokens) }}</strong>
                </div>
                <div class="c-block">
                  <small>知识 / 共享文件</small>
                  <strong class="font-mono">{{ formatNumber(contextSourceContinuity.budget?.knowledgeTokens) }} / {{ formatNumber(contextSourceContinuity.budget?.sharedFileTokens) }}</strong>
                </div>
                <div class="c-block">
                  <small>恢复 / 安全余量</small>
                  <strong class="font-mono">{{ formatNumber(contextSourceContinuity.budget?.restoredTokens) }} / {{ formatNumber(contextSourceContinuity.budget?.remainingSafeTokens) }}</strong>
                </div>
              </div>

              <div v-if="contextSourceContinuity.receipts?.length" class="source-receipts-list">
                <span v-for="receipt in contextSourceContinuity.receipts.slice(0, 12)" :key="receipt.receiptId" class="receipt-pill">
                  {{ receipt.sourceKind === 'knowledge' ? '知识' : '共享文件' }} · {{ receipt.documentName }} · {{ receipt.state }}
                </span>
              </div>

              <div v-if="sourceMaintenanceIdentity" class="source-maintenance-bar">
                <div class="m-text">
                  <strong>历史来源收口工具</strong>
                  <small>仅显式预览/确认后迁移；不会删除知识、共享文件或正式长期记忆。</small>
                </div>
                <button type="button" class="btn-m-action" :disabled="sourceMaintenanceLoading" @click="previewSourceMaintenance">
                  <Sparkles :size="12" />
                  <span>{{ sourceMaintenanceLoading ? '处理中...' : '预览影响' }}</span>
                </button>
                <template v-if="sourceMaintenancePreview">
                  <button type="button" class="btn-m-action primary" :disabled="sourceMaintenanceLoading" @click="applySourceMaintenance">
                    <span>确认执行迁移</span>
                  </button>
                </template>
              </div>
            </section>

            <!-- 记忆内容 / 审计日志呈现 -->
            <template v-if="!showAudit">
              <div class="search-and-action-bar">
                <div class="search-input-box">
                  <Search :size="14" class="search-icon" />
                  <input v-model.trim="query" :placeholder="isSessionDetail ? '搜索摘要与近期原文...' : '搜索当前范围记忆条目...'">
                </div>
              </div>

              <!-- 记忆条目分组 -->
              <div v-if="itemGroups.length" class="memory-sections-list">
                <section v-for="group in itemGroups" :key="group.type" class="memory-group-card">
                  <div class="group-header">
                    <h4>{{ typeLabels[group.type] || group.type }}</h4>
                    <span class="group-badge">{{ group.items.length }}</span>
                  </div>
                  <div class="memory-items-container">
                    <article
                      v-for="item in group.items"
                      :key="item.itemId"
                      class="memory-item-card"
                      :class="{ deprecated: item.deprecated, pinned: item.pinned }"
                    >
                      <div class="memory-main-copy">
                        <p class="memory-text">{{ item.text || '空记录' }}</p>
                        <div class="memory-meta font-mono">
                          <span><Clock3 :size="11" />{{ formatTime(item.evidence?.time || item.updatedAt) }}</span>
                          <span v-if="item.reason">· {{ item.reason }}</span>
                          <span v-if="item.legacy_unverified" class="legacy-badge">历史未核验</span>
                          <span v-else-if="item.extraction_source" class="source-badge">
                            {{ item.extraction_source === 'model_semantic' ? '模型语义提取' : item.extraction_source === 'structured_event' ? '结构化事实' : item.extraction_source }}
                          </span>
                        </div>
                      </div>

                      <div v-if="!item.readOnly" class="item-actions">
                        <button
                          type="button"
                          class="btn-item-action"
                          :class="{ active: item.pinned }"
                          :title="item.pinned ? '取消固定' : '固定此条记忆'"
                          @click="controlItem(item, item.pinned ? 'unpin' : 'pin')"
                        >
                          <PinOff v-if="item.pinned" :size="13" />
                          <Pin v-else :size="13" />
                        </button>
                        <button type="button" class="btn-item-action" title="修改记忆内容" @click="openEdit(item, 'edit')">
                          <Pencil :size="13" />
                        </button>
                        <button
                          v-if="!item.deprecated"
                          type="button"
                          class="btn-item-action danger"
                          title="废弃/删除此条记忆"
                          @click="openEdit(item, 'delete')"
                        >
                          <Trash2 :size="13" />
                        </button>
                        <button
                          v-else
                          type="button"
                          class="btn-item-action"
                          title="恢复此条记忆"
                          @click="controlItem(item, 'restore')"
                        >
                          <RotateCcw :size="13" />
                        </button>
                      </div>
                    </article>
                  </div>
                </section>
              </div>

              <div v-else class="empty-state-box">
                <Brain :size="28" />
                <p>{{ isSessionDetail ? '当前会话尚未生成模型摘要，也没有可展示的近期原文。' : '当前范围暂未收录结构化记忆条目。' }}</p>
              </div>
            </template>

            <!-- 审计日志列表 -->
            <section v-else class="audit-log-section">
              <div v-if="audit.length" class="audit-cards-list">
                <article v-for="entry in audit" :key="entry.id" class="audit-card">
                  <time class="font-mono">{{ formatTime(entry.at) }}</time>
                  <div class="audit-copy">
                    <strong>{{ entry.action || entry.type }}</strong>
                    <p>{{ entry.reason || entry.itemType || '系统自动维护记录' }}</p>
                  </div>
                </article>
              </div>
              <div v-else class="empty-state-box">
                <Clock3 :size="28" />
                <p>暂无针对此记忆范围的变更审计记录。</p>
              </div>
            </section>
          </div>

          <div v-else class="empty-state-box">
            <Brain :size="32" />
            <p>{{ loading ? '正在读取记忆中心数据...' : '请在左侧选择一个记忆范围以查看详情。' }}</p>
          </div>
        </main>
      </div>

      <!-- 视图 2：高级设置 -->
      <div v-else class="advanced-settings-layout">
        <WorkspaceSectionNav
          :sections="advancedSections"
          :active-section="advancedSection"
          label="高级设置章节"
          @update:active-section="setAdvancedSection"
        />

        <main class="settings-page">
          <!-- 1. 上下文与压缩 -->
          <section v-show="advancedSection === 'context'" class="settings-section">
            <div class="section-head">
              <div>
                <span class="eyebrow">CONTEXT & COMPACTION POLICY</span>
                <h3>上下文容量与压缩策略</h3>
              </div>
            </div>

            <!-- Segmented Pill 预设条 -->
            <div class="preset-segmented-pills">
              <button
                v-for="preset in presets"
                :key="preset.id"
                type="button"
                class="pill-btn"
                :class="{ active: config.memoryContextPreset === preset.id }"
                @click="selectPreset(preset)"
              >
                {{ preset.label }}
              </button>
            </div>

            <div class="field-grid">
              <div class="field-item">
                <label>模型上下文窗口 (Token)</label>
                <input v-model.number="config.modelContextWindow" type="number" min="0" step="1000" :disabled="config.memoryContextPreset !== 'custom'">
              </div>
              <div class="field-item">
                <label>自动压缩阈值 (Token)</label>
                <input v-model.number="config.modelAutoCompactTokenLimit" type="number" min="0" step="1000" :disabled="config.memoryContextPreset !== 'custom'">
              </div>
              <div class="field-item">
                <label>Provider 上下文处理模式</label>
                <select v-model="config.providerContextCacheMode">
                  <option value="auto">智能自动选择</option>
                  <option value="native">优先 Provider 原生缓存</option>
                  <option value="controlled">CCM 受控投影</option>
                  <option value="off">关闭 Provider 适配</option>
                </select>
              </div>
              <div class="field-item">
                <label>MCP Schema 加载模式</label>
                <select v-model="config.mcpToolLoadingMode">
                  <option value="deferred">延迟加载 (CC 默认)</option>
                  <option value="auto">按容量自动</option>
                  <option value="inline">全部内联</option>
                </select>
              </div>
              <div class="field-item">
                <label>MCP 自动阈值 (%)</label>
                <input v-model.number="config.mcpToolAutoThresholdPercent" type="number" min="0" max="100" step="1">
              </div>
              <div class="field-item">
                <label>Skill 目录预算 (%)</label>
                <input v-model.number="config.skillCatalogBudgetPercent" type="number" min="0.1" max="10" step="0.1">
              </div>
              <div class="field-item">
                <label>单个 Skill 恢复预算</label>
                <input v-model.number="config.postCompactSkillPerItemMaxTokens" type="number" min="500" max="20000" step="500">
              </div>
              <div class="field-item">
                <label>Skill 恢复总预算</label>
                <input v-model.number="config.postCompactSkillTotalMaxTokens" type="number" min="1000" max="100000" step="1000">
              </div>
              <div class="field-item">
                <label>来源目录预算 (%)</label>
                <input v-model.number="config.contextSourceCatalogBudgetPercent" type="number" min="0.1" max="10" step="0.1">
              </div>
              <div class="field-item">
                <label>来源正文预算 (%)</label>
                <input v-model.number="config.contextSourceHydrationBudgetPercent" type="number" min="1" max="50" step="1">
              </div>
              <div class="field-item">
                <label>单个来源恢复预算</label>
                <input v-model.number="config.postCompactSourcePerItemMaxTokens" type="number" min="500" max="20000" step="500">
              </div>
              <div class="field-item">
                <label>来源恢复总预算</label>
                <input v-model.number="config.postCompactSourceTotalMaxTokens" type="number" min="1000" max="100000" step="1000">
              </div>
            </div>

            <div class="toggles-list">
              <label class="toggle-control-label">
                <input v-model="config.groupSessionAutoPruneEnabled" type="checkbox">
                <span>自动清理过期归档会话</span>
              </label>
              <label class="toggle-control-label">
                <input v-model="config.timeBasedMicrocompactEnabled" type="checkbox">
                <span>启用旧工具结果空闲整理 (Time-based Tool Result Microcompact)</span>
              </label>
            </div>
            <div class="field-grid microcompact-policy-fields">
              <div class="field-item">
                <label>空闲触发间隔（分钟）</label>
                <input v-model.number="config.timeBasedMicrocompactGapMinutes" type="number" min="1" max="1440" step="1">
              </div>
              <div class="field-item">
                <label>保留最近工具结果数</label>
                <input v-model.number="config.timeBasedMicrocompactKeepRecent" type="number" min="1" max="20" step="1">
              </div>
            </div>
          </section>

          <!-- 2. 代码与原生工具 -->
          <section v-show="advancedSection === 'tools'" class="settings-section">
            <div class="section-head">
              <div>
                <span class="eyebrow">DEVELOPER TOOLS</span>
                <h3>代码智能与原生工具</h3>
              </div>
            </div>
            <div class="field-grid">
              <div class="field-item">
                <label>索引启动策略</label>
                <select v-model="config.codeIndexStartPolicy">
                  <option value="on_demand">按需启动</option>
                  <option value="manual">仅手动</option>
                  <option value="startup">启动时建立</option>
                </select>
              </div>
              <div class="field-item">
                <label>并行索引项目上限</label>
                <input v-model.number="config.codeIndexMaxConcurrentProjects" type="number" min="1" max="8">
              </div>
              <div class="field-item">
                <label>Provider 原生工具模式</label>
                <select v-model="config.providerNativeToolsMode">
                  <option value="auto">自动探测与回退</option>
                  <option value="native">优先原生</option>
                  <option value="json">仅 CCM JSON Loop</option>
                </select>
              </div>
              <div class="field-item">
                <label>Web Search Provider 顺序</label>
                <input :value="config.webSearchProviderOrder.join(', ')" @change="config.webSearchProviderOrder = $event.target.value.split(',').map(item => item.trim()).filter(Boolean)">
              </div>
            </div>

            <div class="toggles-list">
              <label class="toggle-control-label">
                <input v-model="config.codeIntelligenceEnabled" type="checkbox">
                <span>启用 LSP 与增量代码索引</span>
              </label>
              <label class="toggle-control-label">
                <input v-model="config.languageServerManagedInstallEnabled" type="checkbox">
                <span>允许管理员预览并确认受管语言服务安装</span>
              </label>
              <label class="toggle-control-label">
                <input v-model="config.skillForkEnabled" type="checkbox">
                <span>启用 Skill context: fork 隔离执行</span>
              </label>
              <label class="toggle-control-label">
                <input v-model="config.webToolsEnabled" type="checkbox">
                <span>启用安全公开 Web 工具</span>
              </label>
            </div>
          </section>

          <!-- 3. 主 Agent 自适应续环 -->
          <section v-show="advancedSection === 'main-agent'" class="settings-section">
            <div class="section-head">
              <div>
                <span class="eyebrow">MAIN AGENT LOOP</span>
                <h3>主 Agent 自适应续环</h3>
              </div>
            </div>
            <div class="field-grid">
              <div class="field-item">
                <label>分段工具调用数</label>
                <input v-model.number="config.agentToolCallBudget" type="number" min="1" max="64" step="1">
              </div>
              <div class="field-item">
                <label>分段模型轮次</label>
                <input v-model.number="config.agentMaxModelTurns" type="number" min="1" max="32" step="1">
              </div>
              <div class="field-item">
                <label>无进展熔断阈值</label>
                <input v-model.number="config.agentLoopNoProgressThreshold" type="number" min="2" max="10" step="1">
              </div>
              <div class="field-item">
                <label>每轮工具批量</label>
                <input v-model.number="config.agentToolBatchSize" type="number" min="1" max="8" step="1">
              </div>
            </div>
            <div class="toggles-list">
              <label class="toggle-control-label">
                <input v-model="config.adaptiveAgentLoopEnabled" type="checkbox">
                <span>有新进展就继续，不用固定总轮数结束项目/群聊主 Agent</span>
              </label>
            </div>
          </section>

          <!-- 4. 第三方 Agent 通信 -->
          <section v-show="advancedSection === 'third-party'" class="settings-section">
            <div class="section-head">
              <div>
                <span class="eyebrow">AGENT COMMUNICATION V2</span>
                <h3>第三方 Agent 通信与租约</h3>
              </div>
            </div>
            <div class="field-grid">
              <div class="field-item">
                <label>Runner 启动超时 (ms)</label>
                <input v-model.number="config.agentRunnerStartTimeoutMs" type="number" min="5000" max="300000" step="1000">
              </div>
              <div class="field-item">
                <label>ACK 超时 (ms)</label>
                <input v-model.number="config.agentAckTimeoutMs" type="number" min="5000" max="120000" step="1000">
              </div>
              <div class="field-item">
                <label>系统心跳间隔 (ms)</label>
                <input v-model.number="config.agentHeartbeatIntervalMs" type="number" min="5000" max="60000" step="1000">
              </div>
              <div class="field-item">
                <label>最大执行轮次</label>
                <input v-model.number="config.agentMaxAttempts" type="number" min="1" max="3" step="1">
              </div>
            </div>
          </section>

          <!-- 5. Provider 容量 -->
          <section v-show="advancedSection === 'provider'" class="settings-section">
            <div class="section-head">
              <div>
                <span class="eyebrow">PROVIDER CAPACITY</span>
                <h3>子 Agent 模型容量与输出限制</h3>
              </div>
            </div>
            <div class="field-grid capability-grid">
              <div class="field-item">
                <label>Provider</label>
                <input v-model.trim="capabilityForm.provider" placeholder="例如：codex, openai">
              </div>
              <div class="field-item">
                <label>模型名称</label>
                <input v-model.trim="capabilityForm.model" placeholder="留空对该 Provider 全部生效">
              </div>
              <div class="field-item">
                <label>上下文窗口 (Token)</label>
                <input v-model.number="capabilityForm.contextWindow" type="number" min="32000" step="1000">
              </div>
              <div class="field-item">
                <label>最大输出 Token</label>
                <input v-model.number="capabilityForm.maxOutputTokens" type="number" min="0" step="1000">
              </div>
            </div>
          </section>

          <!-- 6. 记忆模板定制 -->
          <section v-show="advancedSection === 'templates'" class="settings-section">
            <div class="section-head">
              <div>
                <span class="eyebrow">SESSION MEMORY CUSTOMIZATION</span>
                <h3>抽取提示词与模板定制</h3>
              </div>
              <button type="button" class="btn-restore-inherit" :disabled="customizationLoading" @click="saveCustomization(true)">
                <RotateCcw :size="12" />
                <span>恢复默认继承</span>
              </button>
            </div>
            <div class="customization-toolbar">
              <div class="preset-segmented-pills">
                <button type="button" class="pill-btn" :class="{ active: customizationMode === 'prompt' }" @click="customizationMode = 'prompt'">提示词</button>
                <button type="button" class="pill-btn" :class="{ active: customizationMode === 'template' }" @click="customizationMode = 'template'">Markdown 模板</button>
              </div>
              <select v-model="customizationTarget" class="scope-target-select">
                <option value="">所有群聊默认</option>
                <option v-for="item in groupScopes" :key="item.id" :value="item.id">{{ item.label }}</option>
              </select>
            </div>
            <textarea
              v-model="customContent"
              :rows="customizationMode === 'prompt' ? 8 : 12"
              :maxlength="customizationMode === 'prompt' ? 32000 : 48000"
              class="code-textarea font-mono"
              :placeholder="customizationMode === 'prompt' ? '优先保留用户纠正、当前任务和精确文件路径。' : '# Current State\n_Active work and immediate next steps._'"
            ></textarea>
            <small class="profile-note">{{ customProfile?.source || 'default' }} · {{ customContent.length }} 字符</small>
          </section>
        </main>
      </div>

      <!-- 修改/删除记忆模态框 -->
      <div v-if="editState" class="modal-backdrop" @click.self="editState = null">
        <div class="edit-modal">
          <div class="modal-head">
            <h3>{{ editState.action === 'edit' ? '修改记忆内容' : '废弃/删除记忆' }}</h3>
            <button type="button" class="btn-modal-close" @click="editState = null">×</button>
          </div>
          <div class="modal-body">
            <div v-if="editState.action === 'edit'" class="field-item">
              <label>记忆正文</label>
              <textarea v-model="editState.text" rows="5" class="modal-textarea"></textarea>
            </div>
            <div class="field-item">
              <label>修改/删除原因 (必填，记录审计)</label>
              <textarea v-model="editState.reason" rows="3" class="modal-textarea" placeholder="填写变更背景便于后续审计..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="editState = null">取消</button>
            <button type="button" class="btn-confirm" :class="{ danger: editState.action === 'delete' }" @click="submitEdit">
              <span>确认操作</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </WorkspacePageShell>
</template>

<style scoped>
.memory-center-root {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-primary);
  background: var(--bg-primary);
}

.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.text-warn { color: var(--accent-yellow, #d97706) !important; }

/* 左右工作台布局 */
.memory-workspace {
  min-height: 0;
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(260px, 300px) 1fr;
  overflow: hidden;
}

/* 左侧目录树导航 */
.scope-nav-tree {
  min-height: 0;
  padding: 14px 10px;
  border-right: 1px solid var(--border-color);
  background: var(--panel-muted, var(--bg-primary));
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.scope-tree-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-label {
  padding: 0 8px 4px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.scope-details {
  margin: 0;
}

.details-summary {
  min-height: 34px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  list-style: none;
  transition: background-color 0.15s ease;
}

.details-summary::-webkit-details-marker { display: none; }

.details-summary:hover {
  background: var(--control-hover, rgba(148, 163, 184, 0.08));
}

.tree-icon { flex-shrink: 0; }
.tree-icon.blue { color: var(--accent-blue); }
.tree-icon.purple { color: #8b5cf6; }
.tree-icon.orange { color: #f59e0b; }
.tree-icon.green { color: #10b981; }

.details-summary strong {
  font-size: 12.5px;
  font-weight: 600;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-count {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border-color);
  padding: 0 5px;
  border-radius: 999px;
}

.arrow-icon {
  color: var(--text-muted);
  transition: transform 0.15s ease;
}

.scope-details[open] .arrow-icon {
  transform: rotate(90deg);
}

.tree-children {
  margin-left: 12px;
  padding-left: 6px;
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

.tree-node-btn {
  width: 100%;
  min-height: 38px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tree-node-btn:hover {
  background: var(--surface);
  color: var(--text-primary);
}

.tree-node-btn.active {
  background: var(--surface, var(--bg-card));
  color: var(--accent-blue, #2563eb);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.node-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.node-copy strong {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-copy small {
  font-size: 10px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-warn-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

/* 右侧详情 */
.memory-detail-panel {
  min-width: 0;
  min-height: 0;
  padding: 20px 24px 48px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--bg-primary);
}

.detail-container {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.scope-badge-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scope-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent-blue);
  background: var(--accent-soft);
  padding: 2px 6px;
  border-radius: 4px;
}

.scope-badge-group h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.btn-toggle-audit {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-toggle-audit:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

/* KPI 指标卡片 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.metric-card small {
  font-size: 10.5px;
  color: var(--text-muted);
}

.metric-card strong {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-progress-track {
  height: 3px;
  border-radius: 999px;
  background: var(--panel-muted);
  margin-top: 4px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: inherit;
}

.health-status-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.health-status-text.healthy { color: var(--accent-green, #10b981) !important; }

/* 熔断警报条 */
.circuit-alert-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #ef4444 35%, transparent);
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
}

.alert-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  font-size: 11.5px;
}

.btn-reset-circuit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.degraded-hint-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  font-size: 11.5px;
}

/* 上下文连续性面板 */
.source-continuity-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
}

.continuity-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
}

.continuity-head h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.continuity-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg-primary);
}

.c-block small {
  color: var(--text-muted);
  font-size: 10px;
  display: block;
}

.c-block strong {
  font-size: 12px;
  color: var(--text-primary);
}

.source-receipts-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.receipt-pill {
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--panel-muted);
  color: var(--text-secondary);
}

.source-maintenance-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
}

.m-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.m-text strong {
  font-size: 12px;
  color: var(--text-primary);
}

.m-text small {
  font-size: 10.5px;
  color: var(--text-muted);
}

.btn-m-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.btn-m-action.primary {
  border-color: var(--accent-blue);
  background: var(--accent-blue);
  color: #fff;
}

/* 搜索与记忆卡片 */
.search-and-action-bar {
  display: flex;
  align-items: center;
}

.search-input-box {
  position: relative;
  width: 100%;
  max-width: 420px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input-box input {
  width: 100%;
  height: 34px;
  padding: 0 10px 0 32px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--surface);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

.search-input-box input:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.memory-sections-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.memory-group-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.group-badge {
  font-size: 10.5px;
  color: var(--text-muted);
  background: var(--panel-muted);
  padding: 0 6px;
  border-radius: 999px;
  font-weight: 600;
}

.memory-items-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.memory-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}

.memory-item-card:hover {
  border-color: color-mix(in srgb, var(--accent-blue) 35%, var(--border-color));
}

.memory-item-card.pinned {
  border-left: 3px solid var(--accent-blue);
}

.memory-item-card.deprecated {
  opacity: 0.55;
}

.memory-main-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.memory-text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--text-primary);
  word-break: break-word;
}

.memory-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 10.5px;
  color: var(--text-muted);
}

.legacy-badge {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  padding: 1px 4px;
  border-radius: 3px;
}

.source-badge {
  background: var(--accent-soft);
  color: var(--accent-blue);
  padding: 1px 5px;
  border-radius: 3px;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.btn-item-action {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-item-action:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.btn-item-action.active {
  border-color: var(--accent-blue);
  background: var(--accent-soft);
  color: var(--accent-blue);
}

.btn-item-action.danger:hover {
  border-color: var(--accent-red, #ef4444);
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

/* 审计列表 */
.audit-cards-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.audit-card {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--surface);
}

.audit-card time {
  font-size: 11px;
  color: var(--text-muted);
}

.audit-copy strong {
  font-size: 12px;
  color: var(--text-primary);
}

.audit-copy p {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--text-secondary);
}

.empty-state-box {
  padding: 50px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

/* 高级设置布局 */
.advanced-settings-layout {
  min-height: 0;
  flex: 1;
  display: flex;
  overflow: hidden;
}

.settings-page {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 24px 60px;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--accent-blue);
  letter-spacing: 0.05em;
}

.section-head h3 {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

/* 胶囊预设 */
.preset-segmented-pills {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
  width: fit-content;
}

.pill-btn {
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn:hover {
  color: var(--text-primary);
  background: var(--surface);
}

.pill-btn.active {
  background: var(--surface, var(--bg-card));
  color: var(--accent-blue, #2563eb);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-item label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.field-item input,
.field-item select {
  height: var(--control-height, 34px);
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

.field-item input:focus,
.field-item select:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.toggles-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.toggle-control-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
}

.btn-restore-inherit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.customization-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.scope-target-select {
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 12px;
}

.code-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.code-textarea:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.profile-note {
  color: var(--text-muted);
  font-size: 11px;
}

/* 模态弹窗 */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--overlay-scrim, rgba(15, 23, 42, 0.55));
  backdrop-filter: blur(3px);
}

.edit-modal {
  width: min(520px, 100%);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
}

.modal-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.btn-modal-close {
  border: 0;
  background: transparent;
  font-size: 18px;
  color: var(--text-muted);
  cursor: pointer;
}

.modal-body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  resize: vertical;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.btn-cancel,
.btn-confirm {
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel {
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
}

.btn-confirm {
  border: 0;
  background: var(--accent-blue, #2563eb);
  color: #fff;
}

.btn-confirm.danger {
  background: var(--accent-red, #ef4444);
}

@media (max-width: 900px) {
  .memory-workspace {
    grid-template-columns: 1fr;
  }
  .scope-nav-tree {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .field-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .detail-top-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  .continuity-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .field-grid {
    grid-template-columns: 1fr;
  }
  .memory-item-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .item-actions {
    align-self: flex-end;
  }
}
</style>
