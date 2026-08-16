<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Cpu,
  CreditCard,
  Database,
  ExternalLink,
  HelpCircle,
  History,
  LayoutDashboard,
  Layers,
  ListFilter,
  Radio,
  RotateCw,
  Sparkles,
  Target,
  Workflow,
  XCircle,
  Zap,
} from '@lucide/vue'
import MetricsScopePicker from './MetricsScopePicker.vue'
import WorkspacePageShell from '../common/WorkspacePageShell.vue'

const emit = defineEmits(['navigate'])

const props = defineProps({
  active: { type: Boolean, default: true },
})
const metricsView = ref(sessionStorage.getItem('ccm:metrics-layout:v1:view') || 'overview')
const metricsViews = [
  { id: 'overview', label: '概览', icon: LayoutDashboard },
  { id: 'token', label: 'Token 分析', icon: Coins },
  { id: 'performance', label: '性能诊断', icon: Zap },
  { id: 'executions', label: '执行记录', icon: ListFilter },
]
watch(metricsView, value => sessionStorage.setItem('ccm:metrics-layout:v1:view', value))


const GLOBAL_SCOPE_ID = '__global__'
const CUSTOM_RANGE_DAYS = -1
const pad = (value) => String(value).padStart(2, '0')
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const today = new Date()
const defaultCustomEnd = dateKey(today)
const defaultCustomStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
const defaultCustomStart = dateKey(defaultCustomStartDate)
const validDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))

const emptyPayload = () => ({
  metrics: { version: 2, agents: {}, daily: {}, scopes: {}, events: [], updatedAt: null },
  catalog: {
    groups: [],
    projects: [],
    global: { id: 'global', name: '全局助手', agent: 'global-agent', scopeKey: 'global:global' },
    legacyUnscoped: {},
  },
  system: null,
  agentResources: [],
})

const payload = ref(emptyPayload())
const selectedGroupId = ref(localStorage.getItem('metrics-selected-group') || GLOBAL_SCOPE_ID)
const savedRangeDays = Number(localStorage.getItem('metrics-range-days') || 7)
const rangeDays = ref([CUSTOM_RANGE_DAYS, 0, 1, 7, 14, 30, 90].includes(savedRangeDays) ? savedRangeDays : 7)
const savedCustomStart = localStorage.getItem('metrics-custom-date-from') || defaultCustomStart
const savedCustomEnd = localStorage.getItem('metrics-custom-date-to') || defaultCustomEnd
const customDateFrom = ref(validDateKey(savedCustomStart) ? savedCustomStart : defaultCustomStart)
const customDateTo = ref(validDateKey(savedCustomEnd) ? savedCustomEnd : defaultCustomEnd)
const appliedCustomDateFrom = ref(customDateFrom.value)
const appliedCustomDateTo = ref(customDateTo.value)
const loading = ref(true)
const refreshing = ref(false)
const navigatingEventId = ref('')
const error = ref('')
const loadedAt = ref(null)
const activeRuns = ref([])
const executionStatus = ref(localStorage.getItem('metrics-execution-status') || 'all')
const executionPage = ref(1)
const executionPageSize = ref(Number(localStorage.getItem('metrics-execution-page-size') || 20))
const executionResult = ref({
  events: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  statusCounts: { all: 0, completed: 0, failed: 0, cancelled: 0, blocked: 0, unknown: 0 },
})
const executionLoading = ref(false)
const executionError = ref('')
const reliability = ref(null)
const reliabilityRuns = ref([])
const reliabilityLoading = ref(false)
const reliabilityError = ref('')
let poller = null
let metricsInFlight = false
let executionRequestId = 0

const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const formatNumber = (value) => new Intl.NumberFormat('zh-CN').format(safeNumber(value))
const formatPercent = (value) => `${Math.round(safeNumber(value))}%`
const formatDuration = (value) => {
  const ms = safeNumber(value)
  if (!ms) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} 秒`
  return `${(ms / 60000).toFixed(1)} 分钟`
}
const formatBytes = (value) => {
  const bytes = safeNumber(value)
  if (!bytes) return '0 MB'
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
const formatTokens = (value) => {
  const tokens = safeNumber(value)
  if (!tokens) return '—'
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
  return formatNumber(tokens)
}
const formatCost = (value) => safeNumber(value) > 0 ? `$${safeNumber(value).toFixed(4)}` : '未提供'
const formatTime = (value, fallback = '暂无记录') => {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleString('zh-CN', { hour12: false })
}
const formatRelativeTime = (value) => {
  if (!value) return '暂无记录'
  const delta = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(delta)) return '暂无记录'
  if (delta < 60_000) return '刚刚'
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`
  return `${Math.floor(delta / 86_400_000)} 天前`
}
const percentile = (values, ratio = 0.95) => {
  const rows = values.map(safeNumber).filter(value => value > 0).sort((a, b) => a - b)
  if (!rows.length) return 0
  return rows[Math.min(rows.length - 1, Math.ceil(rows.length * ratio) - 1)]
}
const rangeLabel = computed(() => {
  if (rangeDays.value === CUSTOM_RANGE_DAYS) {
    const format = value => String(value || '').split('-').map(Number).filter(Number.isFinite).join('/')
    return `${format(appliedCustomDateFrom.value)} 至 ${format(appliedCustomDateTo.value)}`
  }
  if (rangeDays.value === 0) return '全部历史'
  return rangeDays.value === 1 ? '今天' : `近 ${rangeDays.value} 天`
})
const customRangeError = computed(() => {
  if (!validDateKey(customDateFrom.value) || !validDateKey(customDateTo.value)) return '请选择完整的开始和结束日期'
  if (customDateFrom.value > customDateTo.value) return '开始日期不能晚于结束日期'
  const [fromYear, fromMonth, fromDay] = customDateFrom.value.split('-').map(Number)
  const [toYear, toMonth, toDay] = customDateTo.value.split('-').map(Number)
  const from = new Date(fromYear, fromMonth - 1, fromDay)
  const to = new Date(toYear, toMonth - 1, toDay)
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1
  if (days > 366) return '自定义时间范围最多为 366 天'
  return ''
})

const applyCustomRange = () => {
  if (customRangeError.value) return
  appliedCustomDateFrom.value = customDateFrom.value
  appliedCustomDateTo.value = customDateTo.value
  localStorage.setItem('metrics-custom-date-from', appliedCustomDateFrom.value)
  localStorage.setItem('metrics-custom-date-to', appliedCustomDateTo.value)
  if (rangeDays.value !== CUSTOM_RANGE_DAYS) {
    rangeDays.value = CUSTOM_RANGE_DAYS
    return
  }
  if (executionPage.value !== 1) executionPage.value = 1
  else if (props.active !== false) loadExecutionEvents()
}

const loadActiveRuns = async () => {
  if (!isGlobalScope.value) {
    activeRuns.value = []
    return
  }
  try {
    const response = await fetch('/api/global-agent/runs?limit=50', { cache: 'no-store' })
    if (!response.ok) return
    const data = await response.json()
    activeRuns.value = Array.isArray(data.runs) ? data.runs : []
  } catch {
    activeRuns.value = []
  }
}

const loadReliability = async () => {
  try {
    const response = await fetch('/api/reliability/drills/status?limit=8', { cache: 'no-store' })
    if (response.status === 403) { reliability.value = null; reliabilityRuns.value = []; return }
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '可靠性状态读取失败')
    reliability.value = data.status || null
    reliabilityRuns.value = Array.isArray(data.runs) ? data.runs : []
    reliabilityError.value = ''
  } catch (cause) {
    reliabilityError.value = cause?.message || '可靠性状态读取失败'
  }
}

const startReliabilityDrill = async () => {
  reliabilityLoading.value = true
  reliabilityError.value = ''
  try {
    const response = await fetch('/api/reliability/drills/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '启动可靠性演练失败')
    await loadReliability()
  } catch (cause) {
    reliabilityError.value = cause?.message || '启动可靠性演练失败'
  } finally {
    reliabilityLoading.value = false
  }
}

const cancelReliabilityDrill = async () => {
  const runId = reliability.value?.active_run?.run_id
  if (!runId) return
  reliabilityLoading.value = true
  try {
    const response = await fetch('/api/reliability/drills/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ run_id: runId }),
    })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '取消可靠性演练失败')
    await loadReliability()
  } catch (cause) {
    reliabilityError.value = cause?.message || '取消可靠性演练失败'
  } finally {
    reliabilityLoading.value = false
  }
}

const loadMetrics = async ({ silent = false } = {}) => {
  if (metricsInFlight) return
  metricsInFlight = true
  if (silent) refreshing.value = true
  error.value = ''
  try {
    const response = await fetch('/api/metrics', { cache: 'no-store' })
    if (!response.ok) throw new Error(`性能指标接口返回 ${response.status}`)
    const data = await response.json()
    let catalog = data.catalog || { groups: [], legacyUnscoped: {} }
    if (!catalog.global) {
      catalog = {
        ...catalog,
        global: { id: 'global', name: '全局助手', agent: 'global-agent', scopeKey: 'global:global' },
      }
    }
    if (!catalog.legacyUnscoped?.agentCount && Object.keys((data.metrics || data)?.agents || {}).length) {
      catalog = { ...catalog, legacyUnscoped: { agentCount: Object.keys((data.metrics || data).agents || {}).length } }
    }
    if (!catalog.groups?.length) {
      const groupResponse = await fetch('/api/groups', { cache: 'no-store' })
      if (groupResponse.ok) {
        const groupData = await groupResponse.json()
        catalog = {
          ...catalog,
          groups: (groupData.groups || []).map((group) => {
            const members = group.members || []
            const coordinator = members.find(member => member.role === 'coordinator') || members[0] || {}
            return {
              id: group.id,
              name: group.name || group.id,
              coordinator: coordinator.project || 'coordinator',
              members: members.map(member => ({ project: member.project, role: member.role || (member.project === coordinator.project ? 'coordinator' : 'member') })),
            }
          }),
        }
      }
    }
    payload.value = {
      metrics: data.metrics || data || emptyPayload().metrics,
      catalog,
      system: data.system || null,
      agentResources: Array.isArray(data.agentResources) ? data.agentResources : [],
    }
    loadedAt.value = new Date()
    const ids = [
      GLOBAL_SCOPE_ID,
      ...(payload.value.catalog.groups || []).map(group => group.id),
      ...(payload.value.catalog.projects || []).map(project => `project:${project.id}`),
    ]
    if (!ids.includes(selectedGroupId.value)) selectedGroupId.value = GLOBAL_SCOPE_ID
    await loadActiveRuns()
    await loadExecutionEvents()
    await loadReliability()
  } catch (cause) {
    error.value = cause?.message || '性能指标加载失败'
  } finally {
    loading.value = false
    refreshing.value = false
    metricsInFlight = false
  }
}

const groups = computed(() => payload.value.catalog?.groups || [])
const projects = computed(() => payload.value.catalog?.projects || [])
const globalCatalog = computed(() => payload.value.catalog?.global || {
  id: 'global',
  name: '全局助手',
  agent: 'global-agent',
  scopeKey: 'global:global',
})
const isGlobalScope = computed(() => selectedGroupId.value === GLOBAL_SCOPE_ID)
const isProjectScope = computed(() => String(selectedGroupId.value || '').startsWith('project:'))
const selectedProjectId = computed(() => isProjectScope.value ? selectedGroupId.value.slice('project:'.length) : '')
const selectedProject = computed(() => projects.value.find(project => project.id === selectedProjectId.value) || null)
const selectedGroup = computed(() => (
  isGlobalScope.value || isProjectScope.value
    ? null
    : groups.value.find(group => group.id === selectedGroupId.value) || null
))
const hasScopeSelection = computed(() => isGlobalScope.value || !!selectedGroup.value || !!selectedProject.value)
const activeScope = computed(() => {
  if (isGlobalScope.value) return payload.value.metrics?.scopes?.['global:global'] || null
  if (isProjectScope.value) return payload.value.metrics?.scopes?.[`project:${selectedProjectId.value}`] || null
  if (!selectedGroupId.value) return null
  return payload.value.metrics?.scopes?.[`group:${selectedGroupId.value}`] || null
})
const mainRoleKey = computed(() => (isGlobalScope.value ? 'global_agent' : 'main_agent'))
const coordinatorName = computed(() => (
  isGlobalScope.value
    ? (globalCatalog.value.agent || 'global-agent')
    : (isProjectScope.value ? 'project-main-agent' : (selectedGroup.value?.coordinator || 'coordinator'))
))
const scopeDisplayName = computed(() => (
  isGlobalScope.value
    ? (globalCatalog.value.name || '全局助手')
    : (isProjectScope.value ? (selectedProject.value?.name || selectedProjectId.value) : (selectedGroup.value?.name || '未选择'))
))
const mainAgentLabel = computed(() => (isGlobalScope.value ? '全局 Agent' : (isProjectScope.value ? '项目 Agent' : '群聊主 Agent')))
const emptyAggregate = () => ({
  calls: 0, successes: 0, failures: 0, totalMs: 0, durationsMs: [], inputTokens: 0, outputTokens: 0,
  directInputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0, providerTotalTokens: 0,
  totalCostUsd: 0, usageReportedCalls: 0, localNoModelCalls: 0, unreportedCalls: 0,
  modelMs: 0, toolWallMs: 0, queueWaitMs: 0, dependencyWaitMs: 0, verificationMs: 0, summaryMs: 0,
  peakCpuPercent: 0, peakRssBytes: 0, peakChildProcessCount: 0, lastCall: null,
})
const mainAggregate = computed(() => (
  activeScope.value?.roles?.[mainRoleKey.value]?.[coordinatorName.value]
  || (isProjectScope.value ? activeScope.value?.roles?.main_agent?.[selectedProjectId.value] : null)
  || (isGlobalScope.value ? activeScope.value?.agents?.[coordinatorName.value] : null)
  || emptyAggregate()
))

const scopeOptions = computed(() => ([
  { id: GLOBAL_SCOPE_ID, name: '全局 Agent', hint: '全局主 Agent', summary: '查看全局会话的模型调用与资源用量', agent: globalCatalog.value.agent, type: 'global' },
  ...groups.value.map(group => ({ id: group.id, name: group.name || group.id, hint: `群聊 · ${group.id}`, summary: `${group.members?.length || 0} 个项目成员 · ${group.coordinator || '主 Agent'}`, agent: group.coordinator, type: 'group' })),
  ...projects.value.map(project => ({ id: `project:${project.id}`, name: project.name || project.id, hint: `项目 · ${project.id}`, summary: `${project.agent || '项目 Agent'} · ${project.id}`, agent: project.agent, type: 'project' })),
]))

const loadExecutionEvents = async () => {
  if (!hasScopeSelection.value) return
  const requestId = ++executionRequestId
  executionLoading.value = true
  executionError.value = ''
  try {
    const params = new URLSearchParams({
      scope_type: isGlobalScope.value ? 'global' : (isProjectScope.value ? 'project' : 'group'),
      scope_id: isGlobalScope.value ? 'global' : (isProjectScope.value ? selectedProjectId.value : selectedGroupId.value),
      days: String(rangeDays.value === CUSTOM_RANGE_DAYS ? 0 : rangeDays.value),
      status: executionStatus.value,
      page: String(executionPage.value),
      page_size: String(executionPageSize.value),
    })
    if (rangeDays.value === CUSTOM_RANGE_DAYS) {
      params.set('from', appliedCustomDateFrom.value)
      params.set('to', appliedCustomDateTo.value)
    }
    const response = await fetch(`/api/metrics/events?${params.toString()}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`执行记录接口返回 ${response.status}`)
    const data = await response.json()
    if (requestId !== executionRequestId) return
    executionResult.value = {
      events: Array.isArray(data.events) ? data.events : [],
      total: safeNumber(data.total),
      page: Math.max(1, safeNumber(data.page) || 1),
      pageSize: Math.max(5, safeNumber(data.pageSize) || executionPageSize.value),
      totalPages: Math.max(1, safeNumber(data.totalPages) || 1),
      statusCounts: {
        all: safeNumber(data.statusCounts?.all),
        completed: safeNumber(data.statusCounts?.completed),
        failed: safeNumber(data.statusCounts?.failed),
        cancelled: safeNumber(data.statusCounts?.cancelled),
        blocked: safeNumber(data.statusCounts?.blocked),
        unknown: safeNumber(data.statusCounts?.unknown),
      },
    }
    if (executionPage.value !== executionResult.value.page) executionPage.value = executionResult.value.page
  } catch (cause) {
    if (requestId === executionRequestId) executionError.value = cause?.message || '执行记录加载失败'
  } finally {
    if (requestId === executionRequestId) executionLoading.value = false
  }
}

const rangeKeys = computed(() => {
  if (rangeDays.value === CUSTOM_RANGE_DAYS) {
    const [fromYear, fromMonth, fromDay] = appliedCustomDateFrom.value.split('-').map(Number)
    const [toYear, toMonth, toDay] = appliedCustomDateTo.value.split('-').map(Number)
    const cursor = new Date(fromYear, fromMonth - 1, fromDay)
    const end = new Date(toYear, toMonth - 1, toDay)
    const keys = []
    while (cursor <= end && keys.length < 366) {
      keys.push(dateKey(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return keys
  }
  if (rangeDays.value === 0) {
    const daily = activeScope.value?.dailyRoles || activeScope.value?.daily || {}
    return Object.keys(daily).sort()
  }
  const keys = []
  const now = new Date()
  for (let offset = rangeDays.value - 1; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    keys.push(dateKey(date))
  }
  return keys
})

const trend = computed(() => rangeKeys.value.map((key) => {
  const aggregate = activeScope.value?.dailyRoles?.[key]?.[mainRoleKey.value]?.[coordinatorName.value]
    || (isProjectScope.value ? activeScope.value?.dailyRoles?.[key]?.main_agent?.[selectedProjectId.value] : null)
    || (isGlobalScope.value ? activeScope.value?.daily?.[key]?.[coordinatorName.value] : null)
    || {}
  return {
    key,
    label: key.slice(5),
    calls: safeNumber(aggregate.calls),
    successes: safeNumber(aggregate.successes),
    failures: safeNumber(aggregate.failures),
    totalMs: safeNumber(aggregate.totalMs),
    durations: Array.isArray(aggregate.durationsMs) ? aggregate.durationsMs : [],
    inputTokens: safeNumber(aggregate.inputTokens),
    outputTokens: safeNumber(aggregate.outputTokens),
    cacheCreationInputTokens: safeNumber(aggregate.cacheCreationInputTokens),
    cacheReadInputTokens: safeNumber(aggregate.cacheReadInputTokens),
    providerTotalTokens: safeNumber(aggregate.providerTotalTokens),
    totalCostUsd: safeNumber(aggregate.totalCostUsd),
    usageReportedCalls: safeNumber(aggregate.usageReportedCalls),
    localNoModelCalls: safeNumber(aggregate.localNoModelCalls),
    unreportedCalls: safeNumber(aggregate.unreportedCalls),
    modelMs: safeNumber(aggregate.modelMs),
    toolWallMs: safeNumber(aggregate.toolWallMs),
    queueWaitMs: safeNumber(aggregate.queueWaitMs),
    dependencyWaitMs: safeNumber(aggregate.dependencyWaitMs),
    verificationMs: safeNumber(aggregate.verificationMs),
    summaryMs: safeNumber(aggregate.summaryMs),
    peakCpuPercent: safeNumber(aggregate.peakCpuPercent),
    peakRssBytes: safeNumber(aggregate.peakRssBytes),
    peakChildProcessCount: safeNumber(aggregate.peakChildProcessCount),
  }
}))

const rangeStats = computed(() => {
  const summary = trend.value.reduce((result, day) => {
    result.calls += day.calls
    result.successes += day.successes
    result.failures += day.failures
    result.totalMs += day.totalMs
    result.inputTokens += day.inputTokens
    result.outputTokens += day.outputTokens
    result.cacheCreationInputTokens += day.cacheCreationInputTokens
    result.cacheReadInputTokens += day.cacheReadInputTokens
    result.providerTotalTokens += day.providerTotalTokens
    result.totalCostUsd += day.totalCostUsd
    result.usageReportedCalls += day.usageReportedCalls
    result.localNoModelCalls += day.localNoModelCalls
    result.unreportedCalls += day.unreportedCalls
    result.modelMs += day.modelMs
    result.toolWallMs += day.toolWallMs
    result.queueWaitMs += day.queueWaitMs
    result.dependencyWaitMs += day.dependencyWaitMs
    result.verificationMs += day.verificationMs
    result.summaryMs += day.summaryMs
    result.peakCpuPercent = Math.max(result.peakCpuPercent, day.peakCpuPercent)
    result.peakRssBytes = Math.max(result.peakRssBytes, day.peakRssBytes)
    result.peakChildProcessCount = Math.max(result.peakChildProcessCount, day.peakChildProcessCount)
    result.durations.push(...day.durations)
    return result
  }, {
    calls: 0, successes: 0, failures: 0, totalMs: 0, inputTokens: 0, outputTokens: 0,
    cacheCreationInputTokens: 0, cacheReadInputTokens: 0, providerTotalTokens: 0, totalCostUsd: 0,
    usageReportedCalls: 0, localNoModelCalls: 0, unreportedCalls: 0,
    modelMs: 0, toolWallMs: 0, queueWaitMs: 0, dependencyWaitMs: 0, verificationMs: 0, summaryMs: 0,
    peakCpuPercent: 0, peakRssBytes: 0, peakChildProcessCount: 0, durations: [],
  })
  summary.successRate = summary.calls ? (summary.successes / summary.calls) * 100 : 0
  summary.avgMs = summary.calls ? summary.totalMs / summary.calls : 0
  summary.p95Ms = percentile(summary.durations, 0.95)
  summary.totalTokens = summary.providerTotalTokens || summary.inputTokens + summary.outputTokens
  summary.usageCoverage = summary.calls ? (summary.usageReportedCalls / summary.calls) * 100 : 0
  return summary
})

const eventInSelectedScope = (event) => {
  if (isGlobalScope.value) {
    return String(event?.scopeType || '') === 'global'
      && (String(event?.scopeId || 'global') === 'global' || !event?.scopeId)
  }
  if (isProjectScope.value) {
    return String(event?.scopeType || '') === 'project'
      && String(event?.scopeId || '') === selectedProjectId.value
  }
  return event?.groupId === selectedGroupId.value
}

const resolveEventStatus = (event) => {
  const explicit = String(event?.status || '').trim().toLowerCase()
  if (['completed', 'failed', 'cancelled', 'blocked', 'unknown'].includes(explicit)) return explicit
  if (event?.success === true) return 'completed'
  if (event?.success === false) return 'failed'
  return 'unknown'
}

const mainEvents = computed(() => (executionResult.value.events || [])
  .filter(event => eventInSelectedScope(event) && event.role === mainRoleKey.value)
  .sort((a, b) => String(b.at).localeCompare(String(a.at))))
const latestMainEvent = computed(() => mainEvents.value[0] || null)
const recentEvents = computed(() => (executionResult.value.events || [])
  .map(event => ({ ...event, resolvedStatus: event.resolvedStatus || resolveEventStatus(event) })))
const executionStatusOptions = computed(() => ([
  { value: 'all', label: '全部', count: executionResult.value.statusCounts.all },
  { value: 'completed', label: '成功', count: executionResult.value.statusCounts.completed },
  { value: 'failed', label: '失败', count: executionResult.value.statusCounts.failed },
  { value: 'cancelled', label: '取消', count: executionResult.value.statusCounts.cancelled },
  { value: 'blocked', label: '阻塞', count: executionResult.value.statusCounts.blocked },
  { value: 'unknown', label: '历史未知', count: executionResult.value.statusCounts.unknown },
]))
const executionPageStart = computed(() => (
  executionResult.value.total ? (executionResult.value.page - 1) * executionResult.value.pageSize + 1 : 0
))
const executionPageEnd = computed(() => Math.min(
  executionResult.value.total,
  executionResult.value.page * executionResult.value.pageSize,
))

const statusBuckets = computed(() => {
  return {
    completed: safeNumber(executionResult.value.statusCounts.completed),
    failed: safeNumber(executionResult.value.statusCounts.failed),
    cancelled: safeNumber(executionResult.value.statusCounts.cancelled),
    blocked: safeNumber(executionResult.value.statusCounts.blocked),
    unknown: safeNumber(executionResult.value.statusCounts.unknown),
  }
})

const liveRunBuckets = computed(() => {
  const buckets = { waiting_confirmation: 0, supervising: 0, running: 0 }
  if (!isGlobalScope.value) return buckets
  for (const run of activeRuns.value) {
    const status = String(run?.status || '').trim().toLowerCase()
    if (status === 'waiting_confirmation') buckets.waiting_confirmation += 1
    else if (status === 'supervising') buckets.supervising += 1
    else if (['running', 'queued', 'paused'].includes(status)) buckets.running += 1
  }
  return buckets
})
const hasLiveRuns = computed(() => (
  liveRunBuckets.value.waiting_confirmation
  + liveRunBuckets.value.supervising
  + liveRunBuckets.value.running
) > 0)

const eventNavigable = (event) => {
  if (isGlobalScope.value) return !!(event?.executionId || event?.traceId)
  return !!(event?.traceId || selectedGroupId.value || selectedProjectId.value)
}

const openEvent = async (event) => {
  if (!eventNavigable(event) || navigatingEventId.value) return
  navigatingEventId.value = event.id || event.executionId || 'event'
  try {
    if (isGlobalScope.value) {
      if (event.executionId) {
        const response = await fetch(`/api/global-agent/runs?id=${encodeURIComponent(event.executionId)}`, { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          const sessionId = data?.run?.session_id || data?.run?.sessionId || ''
          if (sessionId) {
            emit('navigate', { tab: 'global-agent', sessionId })
            return
          }
        }
      }
      if (event.traceId) {
        emit('navigate', { tab: 'trace-replay', trace_id: event.traceId, traceId: event.traceId })
        return
      }
      return
    }
    if (event.traceId) {
      emit('navigate', { tab: 'trace-replay', trace_id: event.traceId, traceId: event.traceId })
      return
    }
    if (isProjectScope.value) {
      emit('navigate', { tab: 'projects', project: selectedProjectId.value, projectId: selectedProjectId.value })
      return
    }
    emit('navigate', { tab: 'groups', groupId: selectedGroupId.value })
  } finally {
    navigatingEventId.value = ''
  }
}

const freshness = computed(() => {
  const at = latestMainEvent.value?.at || mainAggregate.value.lastCall
  if (!at) {
    return {
      level: 'empty',
      label: '等待首条数据',
      detail: isGlobalScope.value
        ? '全局助手尚未产生性能记录。'
        : (isProjectScope.value ? '该项目尚未产生新版 Agent 性能记录。' : '该群聊尚未产生新版主 Agent 性能记录。'),
    }
  }
  const age = Date.now() - new Date(at).getTime()
  if (age <= 15 * 60_000) return { level: 'live', label: '实时采集中', detail: `最近活动 ${formatRelativeTime(at)}` }
  if (age <= 24 * 3_600_000) return { level: 'idle', label: '当前空闲', detail: `最近活动 ${formatRelativeTime(at)}` }
  return { level: 'stale', label: '数据已过期', detail: `最近活动 ${formatRelativeTime(at)}，健康状态不再沿用历史结论。` }
})

const health = computed(() => {
  if (freshness.value.level === 'empty') {
    return {
      level: 'unknown',
      label: '暂无结论',
      detail: isGlobalScope.value ? '需要至少一次真实全局 Agent 调用。' : `需要至少一次真实${isProjectScope.value ? '项目' : '主'} Agent 调用。`,
    }
  }
  if (freshness.value.level === 'stale') return { level: 'unknown', label: '状态未知', detail: '数据已过期，不能据此判断当前健康度。' }
  const stats = rangeStats.value
  if (!stats.calls) {
    return {
      level: 'unknown',
      label: '暂无结论',
      detail: `${rangeLabel.value}没有${isGlobalScope.value ? '全局' : (isProjectScope.value ? '项目' : '主')} Agent 调用。`,
    }
  }
  if (stats.successRate >= 95 && stats.p95Ms <= 60_000) return { level: 'healthy', label: '健康', detail: '成功率和 P95 延迟均处于稳定区间。' }
  if (stats.successRate >= 80 && stats.p95Ms <= 180_000) return { level: 'warning', label: '需关注', detail: '成功率或尾部延迟接近告警阈值。' }
  return { level: 'critical', label: '异常', detail: '失败率或尾部延迟已超过建议阈值。' }
})

const maxTrendCalls = computed(() => Math.max(1, ...trend.value.map(day => day.calls)))
const trendPoints = computed(() => trend.value.map(day => ({
  ...day,
  height: Math.max(day.calls ? 8 : 2, (day.calls / maxTrendCalls.value) * 100),
  successHeight: day.calls ? (day.successes / day.calls) * 100 : 0,
})))

const aggregateRoleForRange = (role, agent) => {
  const result = emptyAggregate()
  for (const key of rangeKeys.value) {
    const row = activeScope.value?.dailyRoles?.[key]?.[role]?.[agent]
    if (!row) continue
    for (const field of ['calls', 'successes', 'failures', 'totalMs', 'inputTokens', 'outputTokens', 'directInputTokens', 'cacheCreationInputTokens', 'cacheReadInputTokens', 'providerTotalTokens', 'totalCostUsd', 'usageReportedCalls', 'localNoModelCalls', 'unreportedCalls', 'modelMs', 'toolWallMs', 'queueWaitMs', 'dependencyWaitMs', 'verificationMs', 'summaryMs']) {
      result[field] = safeNumber(result[field]) + safeNumber(row[field])
    }
    result.peakCpuPercent = Math.max(safeNumber(result.peakCpuPercent), safeNumber(row.peakCpuPercent))
    result.peakRssBytes = Math.max(safeNumber(result.peakRssBytes), safeNumber(row.peakRssBytes))
    result.peakChildProcessCount = Math.max(safeNumber(result.peakChildProcessCount), safeNumber(row.peakChildProcessCount))
    result.durationsMs.push(...(Array.isArray(row.durationsMs) ? row.durationsMs : []))
    if (!result.lastCall || String(row.lastCall || '') > String(result.lastCall)) result.lastCall = row.lastCall || result.lastCall
  }
  return result
}
const selectedCoverage = computed(() => (payload.value.metrics?.coverage || []).filter(row => (
  row.scopeType === (isGlobalScope.value ? 'global' : (isProjectScope.value ? 'project' : 'group'))
  && row.scopeId === (isGlobalScope.value ? 'global' : (isProjectScope.value ? selectedProjectId.value : selectedGroupId.value))
)))
const coverageFor = (role, agent) => selectedCoverage.value.filter(row => row.role === role && row.agent === agent)
const usageDetail = (aggregate, role, agent) => {
  const coverage = coverageFor(role, agent)
  return {
    reported: safeNumber(aggregate.usageReportedCalls),
    local: safeNumber(aggregate.localNoModelCalls),
    missing: safeNumber(aggregate.unreportedCalls),
    runtimes: [...new Set(coverage.map(row => row.runtime).filter(Boolean))],
    missingReasons: [...new Set(coverage.filter(row => row.usageSource === 'unreported').map(row => row.missingReason).filter(Boolean))],
  }
}

const agentRows = computed(() => {
  if (isGlobalScope.value) {
    const aggregate = aggregateRoleForRange('global_agent', coordinatorName.value)
    const calls = safeNumber(aggregate.calls)
    const successes = safeNumber(aggregate.successes)
    const usage = usageDetail(aggregate, 'global_agent', coordinatorName.value)
    return [{
      project: coordinatorName.value,
      isMain: true,
      roleLabel: '全局 Agent',
      calls,
      failures: safeNumber(aggregate.failures),
      successRate: calls ? (successes / calls) * 100 : 0,
      avgMs: calls ? safeNumber(aggregate.totalMs) / calls : 0,
      p95Ms: percentile(Array.isArray(aggregate.durationsMs) ? aggregate.durationsMs : [], 0.95),
      lastCall: aggregate.lastCall || null,
      tokens: safeNumber(aggregate.providerTotalTokens) || safeNumber(aggregate.inputTokens) + safeNumber(aggregate.outputTokens),
      usageReportedCalls: safeNumber(aggregate.usageReportedCalls),
      cacheTokens: safeNumber(aggregate.cacheCreationInputTokens) + safeNumber(aggregate.cacheReadInputTokens),
      costUsd: safeNumber(aggregate.totalCostUsd),
      usage,
    }]
  }
  if (isProjectScope.value) {
    const rows = []
    for (const [role, agents] of Object.entries(activeScope.value?.roles || {})) {
      for (const [agent, aggregate] of Object.entries(agents || {})) {
        const ranged = aggregateRoleForRange(role, agent)
        const calls = safeNumber(ranged?.calls)
        const successes = safeNumber(ranged?.successes)
        const usage = usageDetail(ranged, role, agent)
        rows.push({
          project: agent,
          isMain: role === 'main_agent',
          roleLabel: role === 'main_agent' ? '项目主 Agent' : (role === 'test_agent' ? 'TestAgent' : (role === 'project_agent' ? '项目子 Agent' : '成员 Agent')),
          calls,
          failures: safeNumber(ranged?.failures),
          successRate: calls ? (successes / calls) * 100 : 0,
          avgMs: calls ? safeNumber(ranged?.totalMs) / calls : 0,
          p95Ms: percentile(Array.isArray(ranged?.durationsMs) ? ranged.durationsMs : [], 0.95),
          lastCall: ranged?.lastCall || null,
          tokens: safeNumber(ranged?.providerTotalTokens) || safeNumber(ranged?.inputTokens) + safeNumber(ranged?.outputTokens),
          usageReportedCalls: safeNumber(ranged?.usageReportedCalls),
          cacheTokens: safeNumber(ranged?.cacheCreationInputTokens) + safeNumber(ranged?.cacheReadInputTokens),
          costUsd: safeNumber(ranged?.totalCostUsd),
          usage,
        })
      }
    }
    return rows.sort((a, b) => Number(b.isMain) - Number(a.isMain) || b.calls - a.calls || a.project.localeCompare(b.project))
  }
  const catalogMembers = selectedGroup.value?.members || []
  const known = new Set(catalogMembers.map(member => member.project))
  const metricOnly = Object.keys(activeScope.value?.agents || {}).filter(agent => !known.has(agent)).map(project => ({ project, role: 'member' }))
  return [...catalogMembers, ...metricOnly].map((member) => {
    const isMain = member.project === coordinatorName.value || member.role === 'coordinator'
    const role = isMain ? 'main_agent' : 'member_agent'
    const aggregate = aggregateRoleForRange(role, member.project)
    const calls = safeNumber(aggregate.calls)
    const successes = safeNumber(aggregate.successes)
    return {
      project: member.project,
      isMain,
      roleLabel: isMain ? '群聊主 Agent' : '成员 Agent',
      calls,
      failures: safeNumber(aggregate.failures),
      successRate: calls ? (successes / calls) * 100 : 0,
      avgMs: calls ? safeNumber(aggregate.totalMs) / calls : 0,
      p95Ms: percentile(Array.isArray(aggregate.durationsMs) ? aggregate.durationsMs : [], 0.95),
      lastCall: aggregate.lastCall || null,
      tokens: safeNumber(aggregate.providerTotalTokens) || safeNumber(aggregate.inputTokens) + safeNumber(aggregate.outputTokens),
      usageReportedCalls: safeNumber(aggregate.usageReportedCalls),
      cacheTokens: safeNumber(aggregate.cacheCreationInputTokens) + safeNumber(aggregate.cacheReadInputTokens),
      costUsd: safeNumber(aggregate.totalCostUsd),
      usage: usageDetail(aggregate, role, member.project),
    }
  }).sort((a, b) => Number(b.isMain) - Number(a.isMain) || b.calls - a.calls || a.project.localeCompare(b.project))
})

const usageCoverageRows = computed(() => agentRows.value.map(row => ({
  ...row,
  coverage: row.calls ? (row.usage.reported / row.calls) * 100 : 0,
})))
const agentResources = computed(() => (payload.value.agentResources || []).filter((run) => {
  if (isGlobalScope.value) return true
  if (isProjectScope.value) return run.project === selectedProjectId.value
  return selectedGroup.value?.members?.some(member => member.project === run.project)
}))
const phaseTimingRows = computed(() => ([
  { label: '模型调用', value: rangeStats.value.modelMs },
  { label: '工具执行', value: rangeStats.value.toolWallMs },
  { label: '排队等待', value: rangeStats.value.queueWaitMs },
  { label: '依赖等待', value: rangeStats.value.dependencyWaitMs },
  { label: '验证验收', value: rangeStats.value.verificationMs },
  { label: '总结交付', value: rangeStats.value.summaryMs },
]).filter(item => safeNumber(item.value) > 0))
const missingReasonLabel = reason => ({
  runtime_unreported: '运行时未返回 usage',
  unsupported_protocol: '当前协议不支持 usage',
  format_drift: 'Provider usage 格式已变化',
  failed_before_provider: '请求在到达 Provider 前失败',
  historical_unavailable: '历史记录未提供',
}[reason] || reason || '未提供原因')

const system = computed(() => payload.value.system || {})
const hasSystem = computed(() => !!payload.value.system?.process)
const heapPercent = computed(() => {
  const used = safeNumber(system.value.process?.heapUsedBytes)
  const total = safeNumber(system.value.process?.heapTotalBytes)
  return total ? Math.min(100, (used / total) * 100) : 0
})
const legacyNotice = computed(() => safeNumber(payload.value.catalog?.legacyUnscoped?.agentCount))

const sourceLabel = (source) => ({
  task: '任务规划',
  user: '群聊对话',
  direct: '直接协调',
  'intent-gateway': '意图判断',
  'coordinator-review': '结果验收',
  'coordinator-summary': '最终汇总',
  'group-agent': '成员执行',
  'global-agent-loop': '全局助手',
  'global-agent-supervision': '全局监督交付',
  'global-agent': '全局助手',
}[source] || source || 'Agent 执行')

const eventRoleLabel = (role) => {
  if (role === 'global_agent') return '全局 Agent'
  if (role === 'main_agent') return isProjectScope.value ? '项目主 Agent' : '群聊主 Agent'
  if (role === 'project_agent') return '项目子 Agent'
  if (role === 'test_agent') return 'TestAgent'
  return '成员 Agent'
}

const eventStatusLabel = (status) => ({
  completed: '成功',
  failed: '失败',
  cancelled: '取消',
  blocked: '阻塞',
  unknown: '历史未知',
}[status] || '历史未知')

const eventStatusClass = (status) => ({
  completed: 'success',
  failed: 'failed',
  cancelled: 'cancelled',
  blocked: 'blocked',
  unknown: 'unknown',
}[status] || 'unknown')

const restartPoller = () => {
  if (poller) clearInterval(poller)
  poller = null
  if (props.active === false) return
  const seconds = Number(localStorage.getItem('app-polling-interval') || 10)
  if (seconds > 0) poller = setInterval(() => loadMetrics({ silent: true }), seconds * 1000)
}
const onStorage = (event) => {
  if (event.key === 'app-polling-interval') restartPoller()
}
watch(selectedGroupId, (value) => {
  if (value) localStorage.setItem('metrics-selected-group', value)
  if (props.active !== false) loadActiveRuns()
  if (executionPage.value !== 1) executionPage.value = 1
  else if (props.active !== false) loadExecutionEvents()
})
watch(rangeDays, (value) => {
  localStorage.setItem('metrics-range-days', String(value))
  if (executionPage.value !== 1) executionPage.value = 1
  else if (props.active !== false) loadExecutionEvents()
})
watch(executionStatus, (value) => {
  localStorage.setItem('metrics-execution-status', value)
  if (executionPage.value !== 1) executionPage.value = 1
  else if (props.active !== false) loadExecutionEvents()
})
watch(executionPage, () => {
  if (props.active !== false) loadExecutionEvents()
})
watch(executionPageSize, (value) => {
  localStorage.setItem('metrics-execution-page-size', String(value))
  if (executionPage.value !== 1) executionPage.value = 1
  else if (props.active !== false) loadExecutionEvents()
})
watch(() => props.active, (isActive) => {
  if (isActive === false) {
    if (poller) clearInterval(poller)
    poller = null
    return
  }
  loadMetrics({ silent: true })
  restartPoller()
})

const copiedKey = ref('')
const copyText = async (text, key) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key || text
    setTimeout(() => { if (copiedKey.value === (key || text)) copiedKey.value = '' }, 1800)
  } catch {}
}

const inputTokenRatio = computed(() => {
  const total = safeNumber(rangeStats.value.inputTokens) + safeNumber(rangeStats.value.outputTokens)
  return total > 0 ? (safeNumber(rangeStats.value.inputTokens) / total) * 100 : 50
})

const expandedErrorIds = ref(new Set())
const toggleErrorExpand = (id) => {
  if (!id) return
  if (expandedErrorIds.value.has(id)) expandedErrorIds.value.delete(id)
  else expandedErrorIds.value.add(id)
}

const totalStatusBucketCalls = computed(() => {
  const b = statusBuckets.value
  return b.completed + b.failed + b.cancelled + b.blocked + b.unknown
})

const statusPercent = (count) => {
  const total = totalStatusBucketCalls.value
  return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
}

onMounted(async () => {
  await loadMetrics()
  restartPoller()
  window.addEventListener('storage', onStorage)
})
onUnmounted(() => {
  if (poller) clearInterval(poller)
  window.removeEventListener('storage', onStorage)
})
</script>

<template>
  <WorkspacePageShell
    v-model:active-view="metricsView"
    title="Agent 性能监控"
    description="按全局、群聊和项目查看真实用量、资源与执行表现"
    :views="metricsViews"
    storage-key="ccm:metrics-layout:v1"
  >
    <template #status>
      <div class="toolbar metrics-shared-toolbar">
        <label class="scope-control"><span>范围</span><MetricsScopePicker v-model="selectedGroupId" :options="scopeOptions" /></label>
        <label><span>时间</span><select v-model.number="rangeDays"><option :value="1">今天</option><option :value="7">近 7 天</option><option :value="14">近 14 天</option><option :value="30">近 30 天</option><option :value="90">近 90 天</option><option :value="0">全部历史</option><option :value="CUSTOM_RANGE_DAYS">自定义</option></select></label>
        <button class="refresh-btn" :disabled="refreshing" @click="loadMetrics({ silent: true })"><RotateCw :size="13" :class="{ spinning: refreshing }" /><span>{{ refreshing ? '刷新中' : '刷新' }}</span></button>
      </div>
    </template>

    <div class="metrics-page">
      <div v-if="rangeDays === CUSTOM_RANGE_DAYS" class="custom-range-inline">
        <div class="toolbar">
          <div class="custom-date-range">
            <label>
              <span>开始日期</span>
              <input v-model="customDateFrom" type="date" :max="customDateTo || defaultCustomEnd">
            </label>
            <i>至</i>
            <label>
              <span>结束日期</span>
              <input v-model="customDateTo" type="date" :min="customDateFrom" :max="defaultCustomEnd">
            </label>
            <button class="apply-range-btn" type="button" :disabled="!!customRangeError" :title="customRangeError || '按选择日期统计'" @click="applyCustomRange">应用</button>
            <small v-if="customRangeError" class="custom-range-error">{{ customRangeError }}</small>
          </div>
        </div>
      </div>

      <div v-if="error" class="state-banner error-state">
        <div class="banner-content">
          <AlertCircle :size="18" />
          <div><strong>性能指标加载失败</strong><span>{{ error }}</span></div>
        </div>
        <button @click="loadMetrics()">重试</button>
      </div>

      <div v-if="loading" class="loading-grid">
        <div v-for="item in 6" :key="item" class="skeleton"></div>
      </div>

      <template v-else-if="hasScopeSelection">
        <!-- 顶部 Agent 资产与范围信息横幅 -->
        <section class="scope-strip">
          <div class="scope-main">
            <span class="scope-avatar">{{ scopeDisplayName.slice(0, 1) }}</span>
            <div class="scope-info">
              <div class="scope-title-row">
                <strong>{{ scopeDisplayName }}</strong>
                <span class="scope-tag">{{ mainAgentLabel }}</span>
              </div>
              <span class="scope-coordinator">协调者：{{ coordinatorName }}</span>
            </div>
          </div>
          <div class="scope-status" :class="freshness.level">
            <span class="status-indicator"></span>
            <div>
              <strong>{{ freshness.label }}</strong>
              <span :title="freshness.detail">{{ freshness.detail }}</span>
            </div>
          </div>
          <div class="scope-meta">
            <span class="meta-label">{{ isGlobalScope ? '全局 Scope' : (isProjectScope ? 'Project ID' : 'Group ID') }}</span>
            <button
              type="button"
              class="scope-code-btn"
              :title="copiedKey === 'scope' ? '已复制' : '点击复制 Scope'"
              @click="copyText(isGlobalScope ? 'global:global' : (isProjectScope ? `project:${selectedProjectId}` : `group:${selectedGroup.id}`), 'scope')"
            >
              <code>{{ isGlobalScope ? 'global:global' : (isProjectScope ? `project:${selectedProjectId}` : `group:${selectedGroup.id}`) }}</code>
              <Check v-if="copiedKey === 'scope'" :size="12" class="copied-icon" />
              <Copy v-else :size="12" />
            </button>
          </div>
        </section>

        <div v-if="legacyNotice && !isGlobalScope" class="legacy-notice">
          <AlertTriangle :size="15" />
          <span>历史兼容数据未包含群聊归属，已与当前群聊指标隔离，不参与本页计算。</span>
          <small>{{ legacyNotice }} 个旧 Agent 记录</small>
        </div>

        <!-- 视图 1：概览视图 -->
        <template v-if="metricsView === 'overview'">
          <!-- KPI 9格指标矩阵 -->
          <section class="kpi-grid">
            <article class="kpi-card">
              <div class="kpi-head">
                <div class="kpi-title">
                  <span class="icon-wrap blue"><Zap :size="15" /></span>
                  <span>{{ mainAgentLabel }}调用</span>
                </div>
                <span v-if="rangeStats.failures > 0" class="kpi-badge warn">失败 {{ formatNumber(rangeStats.failures) }}</span>
                <span v-else class="kpi-badge ok">全成功</span>
              </div>
              <strong class="kpi-value">{{ formatNumber(rangeStats.calls) }}</strong>
              <p class="kpi-footer">{{ rangeLabel }} · 成功 {{ formatNumber(rangeStats.successes) }} 次</p>
            </article>

            <article class="kpi-card" :class="health.level">
              <div class="kpi-head">
                <div class="kpi-title">
                  <span class="icon-wrap green"><Target :size="15" /></span>
                  <span>调用成功率</span>
                </div>
                <span class="kpi-badge" :class="health.level">{{ health.label }}</span>
              </div>
              <strong class="kpi-value" :class="{ 'text-danger': rangeStats.calls && rangeStats.successRate < 80 }">
                {{ rangeStats.calls ? formatPercent(rangeStats.successRate) : '—' }}
              </strong>
              <p class="kpi-footer" :title="health.detail">{{ health.detail }}</p>
            </article>

            <article class="kpi-card">
              <div class="kpi-head">
                <div class="kpi-title">
                  <span class="icon-wrap purple"><Clock :size="15" /></span>
                  <span>P95 响应时间</span>
                </div>
                <span class="kpi-badge muted">尾部延迟</span>
              </div>
              <strong class="kpi-value">{{ formatDuration(rangeStats.p95Ms) }}</strong>
              <p class="kpi-footer">平均耗时 {{ formatDuration(rangeStats.avgMs) }}</p>
            </article>

            <article class="kpi-card">
              <div class="kpi-head">
                <div class="kpi-title">
                  <span class="icon-wrap cyan"><History :size="15" /></span>
                  <span>最近活动</span>
                </div>
                <span class="kpi-badge muted">时效</span>
              </div>
              <strong class="kpi-value time-value">{{ formatRelativeTime(latestMainEvent?.at || mainAggregate.lastCall) }}</strong>
              <p class="kpi-footer" :title="formatTime(latestMainEvent?.at || mainAggregate.lastCall)">{{ formatTime(latestMainEvent?.at || mainAggregate.lastCall) }}</p>
            </article>

            <article class="kpi-card">
              <div class="kpi-head">
                <div class="kpi-title">
                  <span class="icon-wrap amber"><Coins :size="15" /></span>
                  <span>Token 总用量</span>
                </div>
                <span v-if="rangeStats.usageReportedCalls" class="kpi-badge ok">覆盖 {{ formatPercent(rangeStats.usageCoverage) }}</span>
                <span v-else class="kpi-badge muted">未回执</span>
              </div>
              <strong class="kpi-value">{{ formatTokens(rangeStats.totalTokens) }}</strong>
              <p class="kpi-footer" v-if="rangeStats.usageReportedCalls">真实回执 {{ rangeStats.usageReportedCalls }}/{{ rangeStats.calls }} 次</p>
              <p class="kpi-footer text-muted" v-else>{{ isGlobalScope ? '等待全局模型返回真实用量' : '当前运行时未返回用量' }}</p>
            </article>

            <article class="kpi-card">
              <div class="kpi-head">
                <div class="kpi-title">
                  <span class="icon-wrap indigo"><RotateCw :size="15" /></span>
                  <span>输入 / 输出 Token</span>
                </div>
                <span class="kpi-badge muted">分布</span>
              </div>
              <strong class="kpi-value token-pair" v-if="rangeStats.usageReportedCalls">
                <span class="inp">{{ formatTokens(rangeStats.inputTokens) }}</span>
                <span class="sep">/</span>
                <span class="out">{{ formatTokens(rangeStats.outputTokens) }}</span>
              </strong>
              <strong class="kpi-value" v-else>—</strong>
              <div v-if="rangeStats.usageReportedCalls" class="token-mini-bar" title="输入 vs 输出比例">
                <span class="bar-in" :style="{ width: `${inputTokenRatio}%` }"></span>
                <span class="bar-out" :style="{ width: `${100 - inputTokenRatio}%` }"></span>
              </div>
              <p class="kpi-footer" v-else>等待提供商返回真实 Token 用量</p>
            </article>

            <article class="kpi-card">
              <div class="kpi-head">
                <div class="kpi-title">
                  <span class="icon-wrap teal"><Database :size="15" /></span>
                  <span>缓存 Token</span>
                </div>
                <span class="kpi-badge muted">Prompt 缓存</span>
              </div>
              <strong class="kpi-value">{{ rangeStats.usageReportedCalls ? formatTokens(rangeStats.cacheCreationInputTokens + rangeStats.cacheReadInputTokens) : '—' }}</strong>
              <p class="kpi-footer" v-if="rangeStats.usageReportedCalls">写入 {{ formatTokens(rangeStats.cacheCreationInputTokens) }} · 命中 {{ formatTokens(rangeStats.cacheReadInputTokens) }}</p>
              <p class="kpi-footer text-muted" v-else>Provider 未提供缓存用量</p>
            </article>

            <article class="kpi-card">
              <div class="kpi-head">
                <div class="kpi-title">
                  <span class="icon-wrap emerald"><CreditCard :size="15" /></span>
                  <span>Provider 费用</span>
                </div>
                <span class="kpi-badge muted">真实回执</span>
              </div>
              <strong class="kpi-value">{{ formatCost(rangeStats.totalCostUsd) }}</strong>
              <p class="kpi-footer">{{ rangeStats.totalCostUsd ? '仅统计 Provider 明确返回的费用' : '未提供价格结算' }}</p>
            </article>

            <article class="kpi-card">
              <div class="kpi-head">
                <div class="kpi-title">
                  <span class="icon-wrap orange"><Cpu :size="15" /></span>
                  <span>Agent 资源峰值</span>
                </div>
                <span class="kpi-badge muted">进程监控</span>
              </div>
              <strong class="kpi-value">{{ rangeStats.peakRssBytes ? formatBytes(rangeStats.peakRssBytes) : '—' }}</strong>
              <p class="kpi-footer">{{ rangeStats.peakCpuPercent ? `CPU ${rangeStats.peakCpuPercent.toFixed(1)}% · ${rangeStats.peakChildProcessCount} 个进程` : '等待托管进程采样' }}</p>
            </article>
          </section>

          <!-- 终态分桶：横向比例分解条 -->
          <section class="bucket-strip">
            <div class="bucket-header">
              <div class="bucket-title">
                <Layers :size="14" />
                <strong>终态调用分布 · {{ rangeLabel }}</strong>
              </div>
              <span class="bucket-total">总计 {{ formatNumber(totalStatusBucketCalls) }} 次</span>
            </div>

            <!-- 横向彩色比例段 -->
            <div v-if="totalStatusBucketCalls > 0" class="breakdown-bar">
              <div
                v-if="statusBuckets.completed > 0"
                class="seg ok"
                :style="{ width: `${statusPercent(statusBuckets.completed)}%` }"
                :title="`成功: ${statusBuckets.completed} (${statusPercent(statusBuckets.completed)}%)`"
              ></div>
              <div
                v-if="statusBuckets.failed > 0"
                class="seg bad"
                :style="{ width: `${statusPercent(statusBuckets.failed)}%` }"
                :title="`失败: ${statusBuckets.failed} (${statusPercent(statusBuckets.failed)}%)`"
              ></div>
              <div
                v-if="statusBuckets.cancelled > 0"
                class="seg mute"
                :style="{ width: `${statusPercent(statusBuckets.cancelled)}%` }"
                :title="`取消: ${statusBuckets.cancelled} (${statusPercent(statusBuckets.cancelled)}%)`"
              ></div>
              <div
                v-if="statusBuckets.blocked > 0"
                class="seg warn"
                :style="{ width: `${statusPercent(statusBuckets.blocked)}%` }"
                :title="`阻塞: ${statusBuckets.blocked} (${statusPercent(statusBuckets.blocked)}%)`"
              ></div>
              <div
                v-if="statusBuckets.unknown > 0"
                class="seg info"
                :style="{ width: `${statusPercent(statusBuckets.unknown)}%` }"
                :title="`历史未知: ${statusBuckets.unknown} (${statusPercent(statusBuckets.unknown)}%)`"
              ></div>
            </div>

            <div class="bucket-chips">
              <span class="chip ok"><i class="dot"></i>成功 <strong>{{ formatNumber(statusBuckets.completed) }}</strong> <small>({{ statusPercent(statusBuckets.completed) }}%)</small></span>
              <span class="chip bad"><i class="dot"></i>失败 <strong>{{ formatNumber(statusBuckets.failed) }}</strong> <small>({{ statusPercent(statusBuckets.failed) }}%)</small></span>
              <span class="chip mute"><i class="dot"></i>取消 <strong>{{ formatNumber(statusBuckets.cancelled) }}</strong></span>
              <span class="chip warn"><i class="dot"></i>阻塞 <strong>{{ formatNumber(statusBuckets.blocked) }}</strong></span>
              <span class="chip info"><i class="dot"></i>未知 <strong>{{ formatNumber(statusBuckets.unknown) }}</strong></span>
            </div>

            <div v-if="isGlobalScope" class="live-runs-bar">
              <span class="live-title"><Radio :size="12" class="live-pulse" /> 进行中 Runs</span>
              <div class="live-chips">
                <span class="chip warn">待确认 {{ formatNumber(liveRunBuckets.waiting_confirmation) }}</span>
                <span class="chip info">监督中 {{ formatNumber(liveRunBuckets.supervising) }}</span>
                <span class="chip mute">运行中 {{ formatNumber(liveRunBuckets.running) }}</span>
                <small v-if="!hasLiveRuns">当前无进行中的全局 run</small>
              </div>
            </div>
          </section>

          <!-- 趋势图与实时进程资源 -->
          <section class="overview-grid">
            <!-- 调用趋势 -->
            <article class="panel trend-panel">
              <div class="panel-head">
                <div>
                  <span class="panel-kicker">{{ isGlobalScope ? 'GLOBAL AGENT TREND' : (isProjectScope ? 'PROJECT AGENT TREND' : 'MAIN AGENT TREND') }}</span>
                  <h3>{{ mainAgentLabel }}调用趋势</h3>
                </div>
                <div class="legend">
                  <span><i class="ok"></i>成功</span>
                  <span><i class="fail"></i>失败</span>
                </div>
              </div>
              <div class="chart">
                <div v-for="day in trendPoints" :key="day.key" class="chart-column" :title="`${day.key} · 共 ${day.calls} 次 · 成功 ${day.successes} · 失败 ${day.failures}`">
                  <span class="chart-value">{{ day.calls > 0 ? day.calls : '' }}</span>
                  <div class="bar-track">
                    <div class="bar-total" :style="{ height: `${day.height}%` }">
                      <div class="bar-success" :style="{ height: `${day.successHeight}%` }"></div>
                    </div>
                  </div>
                  <span class="chart-label">{{ day.label }}</span>
                </div>
              </div>
              <div v-if="!rangeStats.calls" class="chart-empty">所选时间范围内暂无调用数据</div>
            </article>

            <!-- 服务进程实时资源 -->
            <article class="panel runtime-panel">
              <div class="panel-head">
                <div>
                  <span class="panel-kicker">CCM PROCESS</span>
                  <h3>服务进程实时资源</h3>
                </div>
                <span class="live-pill"><i class="live-dot-pulse"></i> LIVE</span>
              </div>
              <div v-if="hasSystem" class="runtime-dashboard">
                <div class="gauge-card">
                  <div class="gauge-header">
                    <span>CPU 使用率</span>
                    <strong>{{ safeNumber(system.process?.cpuPercent).toFixed(1) }}%</strong>
                  </div>
                  <div class="meter-bar">
                    <i :style="{ width: `${Math.min(100, safeNumber(system.process?.cpuPercent))}%` }"></i>
                  </div>
                </div>

                <div class="gauge-card">
                  <div class="gauge-header">
                    <span>Node.js Heap 堆内存</span>
                    <strong>{{ formatBytes(system.process?.heapUsedBytes) }}</strong>
                  </div>
                  <div class="meter-bar heap">
                    <i :style="{ width: `${heapPercent}%` }"></i>
                  </div>
                </div>

                <div class="runtime-stat-row">
                  <div class="stat-mini">
                    <span>RSS 驻留内存</span>
                    <strong>{{ formatBytes(system.process?.rssBytes) }}</strong>
                  </div>
                  <div class="stat-mini">
                    <span>事件循环利用率</span>
                    <strong>{{ safeNumber(system.eventLoop?.utilization).toFixed(1) }}%</strong>
                  </div>
                  <div class="stat-mini">
                    <span>运行时长</span>
                    <strong>{{ formatDuration(safeNumber(system.process?.uptimeSeconds) * 1000) }}</strong>
                  </div>
                  <div class="stat-mini">
                    <span>PID 进程号</span>
                    <strong class="font-mono">{{ system.process?.pid || '—' }}</strong>
                  </div>
                </div>

                <div class="runtime-footer">
                  <span>采样时间：{{ formatTime(system.collectedAt, '—') }}</span>
                  <small>随页面心跳轮询更新</small>
                </div>
              </div>
              <div v-else class="runtime-empty">服务启动后将自动激活实时 CPU、内存与事件循环采样。</div>
            </article>
          </section>
        </template>

        <!-- 视图 2：Token 分析 -->
        <template v-if="metricsView === 'token'">
          <!-- Token 完整度分析 -->
          <article class="panel coverage-panel">
            <div class="panel-head">
              <div>
                <span class="panel-kicker">USAGE COMPLETENESS</span>
                <h3>Token 用量完整度分析</h3>
              </div>
              <span class="panel-note">真实回执覆盖 {{ formatNumber(rangeStats.usageReportedCalls) }} / {{ formatNumber(rangeStats.calls) }} 次</span>
            </div>
            <div v-if="usageCoverageRows.length" class="coverage-list">
              <div v-for="row in usageCoverageRows" :key="`${row.roleLabel}:${row.project}`" class="coverage-card">
                <div class="coverage-agent">
                  <div class="coverage-agent-header">
                    <strong>{{ row.project }}</strong>
                    <span class="role-badge" :class="{ main: row.isMain }">{{ row.roleLabel }}</span>
                  </div>
                  <small v-if="row.usage.runtimes.length" class="coverage-runtime">{{ row.usage.runtimes.join(' / ') }}</small>
                </div>
                <div class="coverage-progress-wrap">
                  <div class="coverage-meter">
                    <i :style="{ width: `${Math.min(100, row.coverage)}%` }"></i>
                  </div>
                  <strong class="coverage-pct">{{ row.calls ? formatPercent(row.coverage) : '—' }}</strong>
                </div>
                <div class="coverage-tags">
                  <span v-if="row.usage.reported" class="coverage-tag ok">已报告 {{ row.usage.reported }}</span>
                  <span v-if="row.usage.local" class="coverage-tag local">本地验证 {{ row.usage.local }}</span>
                  <span v-if="row.usage.missing" class="coverage-tag missing">未提供 {{ row.usage.missing }}</span>
                  <small v-if="row.usage.missingReasons.length" class="coverage-reason">{{ row.usage.missingReasons.map(missingReasonLabel).join('；') }}</small>
                </div>
              </div>
            </div>
            <div v-else class="runtime-empty">当前范围尚无 Agent 调用记录。</div>
          </article>

          <!-- Agent Token 性能详细大表 -->
          <article class="panel agent-panel">
            <div class="panel-head">
              <div>
                <span class="panel-kicker">{{ isGlobalScope ? 'GLOBAL AGENT' : (isProjectScope ? 'PROJECT AGENTS' : 'GROUP AGENTS') }}</span>
                <h3>{{ isGlobalScope ? '全局 Agent Token 消耗表' : (isProjectScope ? '该项目 Agent 性能明细' : '该群 Agent 性能明细') }}</h3>
              </div>
              <span class="panel-note">支持首列固定与横向滑动查看</span>
            </div>
            <div class="table-wrap">
              <table class="metrics-table">
                <thead>
                  <tr>
                    <th class="sticky-col">Agent 名称</th>
                    <th>角色</th>
                    <th class="text-right">总调用</th>
                    <th class="text-right">成功率</th>
                    <th class="text-right">平均耗时</th>
                    <th class="text-right">P95 耗时</th>
                    <th class="text-right">Token 总量</th>
                    <th class="text-right">回执覆盖</th>
                    <th class="text-right">缓存 Token</th>
                    <th class="text-right">Provider 费用</th>
                    <th>最后调用时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="agent in agentRows" :key="agent.project">
                    <td class="sticky-col">
                      <div class="agent-col-cell">
                        <strong>{{ agent.project }}</strong>
                      </div>
                    </td>
                    <td><span class="role-badge" :class="{ main: agent.isMain }">{{ agent.roleLabel }}</span></td>
                    <td class="text-right font-mono">{{ formatNumber(agent.calls) }}</td>
                    <td class="text-right">
                      <span :class="['rate font-mono', agent.calls && agent.successRate < 80 ? 'bad' : '']">
                        {{ agent.calls ? formatPercent(agent.successRate) : '—' }}
                      </span>
                    </td>
                    <td class="text-right font-mono">{{ formatDuration(agent.avgMs) }}</td>
                    <td class="text-right font-mono">{{ formatDuration(agent.p95Ms) }}</td>
                    <td class="text-right font-mono">
                      <strong>{{ agent.usageReportedCalls ? formatTokens(agent.tokens) : (agent.usage.local ? '本地验证' : '未提供') }}</strong>
                    </td>
                    <td class="text-right font-mono">{{ agent.calls ? `${agent.usage.reported}/${agent.calls}` : '—' }}</td>
                    <td class="text-right font-mono">{{ agent.usageReportedCalls ? formatTokens(agent.cacheTokens) : '—' }}</td>
                    <td class="text-right font-mono">{{ formatCost(agent.costUsd) }}</td>
                    <td><span :title="formatTime(agent.lastCall)">{{ formatRelativeTime(agent.lastCall) }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </template>

        <!-- 视图 3：性能与可靠性 -->
        <template v-if="metricsView === 'performance'">
          <!-- 阶段耗时瀑布流分解 -->
          <article class="panel phase-panel">
            <div class="panel-head">
              <div>
                <span class="panel-kicker">WALL CLOCK BREAKDOWN</span>
                <h3>阶段耗时瀑布分解 (Waterfall Breakdown)</h3>
              </div>
              <span class="panel-note">总耗时 {{ formatDuration(rangeStats.totalMs) }}</span>
            </div>
            <div v-if="phaseTimingRows.length" class="phase-waterfall">
              <div v-for="item in phaseTimingRows" :key="item.label" class="waterfall-row">
                <div class="waterfall-label">
                  <strong>{{ item.label }}</strong>
                  <span class="font-mono">{{ formatDuration(item.value) }}</span>
                </div>
                <div class="waterfall-track">
                  <div
                    class="waterfall-bar"
                    :style="{ width: `${Math.min(100, rangeStats.totalMs ? (item.value / rangeStats.totalMs) * 100 : 0)}%` }"
                  >
                    <span class="waterfall-pct">{{ rangeStats.totalMs ? Math.round((item.value / rangeStats.totalMs) * 100) : 0 }}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="runtime-empty">当前调用尚未返回可分解的阶段耗时。</div>
          </article>

          <!-- 活跃 Agent 进程资源 -->
          <article v-if="agentResources.length" class="panel agent-resource-panel">
            <div class="panel-head">
              <div>
                <span class="panel-kicker">ACTIVE AGENT PROCESSES</span>
                <h3>运行中的 Agent 进程</h3>
              </div>
              <span class="live-pill"><i class="live-dot-pulse"></i> {{ agentResources.length }} RUNNING</span>
            </div>
            <div class="agent-resource-list">
              <div v-for="run in agentResources" :key="run.id" class="agent-resource-card">
                <div class="resource-card-header">
                  <strong>{{ run.project || run.agentType || 'Agent' }}</strong>
                  <span class="resource-source">{{ run.commandLabel || run.source || '托管运行时' }}</span>
                </div>
                <div class="resource-card-metrics">
                  <div class="res-item">
                    <span>CPU 占用</span>
                    <strong :class="{ 'text-warn': safeNumber(run.resources?.cpuPercent) > 60 }">{{ safeNumber(run.resources?.cpuPercent).toFixed(1) }}%</strong>
                  </div>
                  <div class="res-item">
                    <span>RSS 内存</span>
                    <strong>{{ formatBytes(run.resources?.rssBytes) }}</strong>
                  </div>
                  <div class="res-item">
                    <span>子进程数</span>
                    <strong>{{ formatNumber(run.resources?.childProcessCount) }}</strong>
                  </div>
                  <div class="res-item">
                    <span>已运行时长</span>
                    <strong>{{ formatDuration(run.ageMs) }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- 可靠性演练与恢复 -->
          <article v-if="reliability || reliabilityError" class="panel reliability-panel">
            <div class="panel-head">
              <div>
                <span class="panel-kicker">RELIABILITY DRILLS</span>
                <h3>系统可靠性演练与自愈验证</h3>
              </div>
              <div class="reliability-actions">
                <button v-if="reliability?.active_run" type="button" class="btn-warn" :disabled="reliabilityLoading" @click="cancelReliabilityDrill">取消演练</button>
                <button v-else type="button" class="btn-primary" :disabled="reliabilityLoading" @click="startReliabilityDrill">
                  <Sparkles :size="13" />
                  <span>{{ reliabilityLoading ? '启动中…' : '发起可靠性演练' }}</span>
                </button>
              </div>
            </div>
            <div v-if="reliabilityError" class="event-load-error">
              <AlertCircle :size="16" />
              <span>{{ reliabilityError }}</span>
              <button @click="loadReliability">重试</button>
            </div>
            <div v-else class="reliability-grid">
              <div class="reliability-card">
                <span>当前运行状态</span>
                <strong :class="{ 'text-ok': !reliability?.active_run }">{{ reliability?.active_run?.status || '空闲就绪' }}</strong>
                <small>{{ reliability?.active_run?.checkpoint || '没有演练占用租约' }}</small>
              </div>
              <div class="reliability-card">
                <span>最近演练结论</span>
                <strong>{{ reliability?.latest_run?.status || '暂无演练记录' }}</strong>
                <small>{{ formatTime(reliability?.latest_run?.completed_at, '尚未完成演练') }}</small>
              </div>
              <div class="reliability-card">
                <span>自动化调度器</span>
                <strong>{{ reliability?.scheduler_running ? '已激活' : '已暂停' }}</strong>
                <small>下次演练：{{ formatTime(reliability?.next_run_at, '等待触发') }}</small>
              </div>
            </div>
          </article>
        </template>

        <!-- 视图 4：执行记录列表 -->
        <template v-if="metricsView === 'executions'">
          <article class="panel event-panel">
            <div class="panel-head">
              <div>
                <span class="panel-kicker">RECENT EXECUTIONS</span>
                <h3>{{ isGlobalScope ? '全局执行链路记录' : (isProjectScope ? '该项目执行记录' : '该群执行记录') }}</h3>
              </div>
              <span class="panel-note">{{ rangeLabel }}共 {{ formatNumber(executionResult.total) }} 条记录 · 支持交互追溯</span>
            </div>

            <!-- 状态筛选器 -->
            <div class="event-controls">
              <div class="event-status-tabs" role="tablist" aria-label="执行状态筛选">
                <button
                  v-for="option in executionStatusOptions"
                  :key="option.value"
                  type="button"
                  :class="{ active: executionStatus === option.value }"
                  @click="executionStatus = option.value"
                >
                  <span>{{ option.label }}</span>
                  <small>{{ formatNumber(option.count) }}</small>
                </button>
              </div>
              <label class="page-size-control">
                <span>单页显示</span>
                <select v-model.number="executionPageSize">
                  <option :value="10">10 条</option>
                  <option :value="20">20 条</option>
                  <option :value="50">50 条</option>
                </select>
              </label>
            </div>

            <div v-if="executionError" class="event-load-error">
              <AlertCircle :size="16" />
              <span>{{ executionError }}</span>
              <button type="button" @click="loadExecutionEvents">重新加载</button>
            </div>

            <!-- 执行记录流 -->
            <div v-if="recentEvents.length" class="event-list" :class="{ loading: executionLoading }">
              <article
                v-for="event in recentEvents"
                :key="event.id"
                class="event-row"
                :class="{
                  'is-failed': event.resolvedStatus === 'failed',
                  'is-cancelled': event.resolvedStatus === 'cancelled',
                  'is-blocked': event.resolvedStatus === 'blocked',
                  'is-unknown': event.resolvedStatus === 'unknown',
                  'is-clickable': eventNavigable(event),
                  'is-navigating': navigatingEventId === event.id,
                }"
                @click="openEvent(event)"
              >
                <!-- 状态微图标 -->
                <div class="event-state-icon" :class="eventStatusClass(event.resolvedStatus)">
                  <CheckCircle2 v-if="event.resolvedStatus === 'completed'" :size="16" />
                  <XCircle v-else-if="event.resolvedStatus === 'failed'" :size="16" />
                  <AlertTriangle v-else-if="event.resolvedStatus === 'blocked'" :size="16" />
                  <Clock v-else-if="event.resolvedStatus === 'cancelled'" :size="16" />
                  <HelpCircle v-else :size="16" />
                </div>

                <div class="event-main">
                  <div class="event-main-head">
                    <strong class="event-agent-name">{{ event.agent }}</strong>
                    <span class="role-badge" :class="{ main: event.role === 'main_agent' || event.role === 'global_agent' }">{{ eventRoleLabel(event.role) }}</span>
                    <span class="status-badge" :class="eventStatusClass(event.resolvedStatus)">{{ eventStatusLabel(event.resolvedStatus) }}</span>
                    <span class="event-source-tag">{{ sourceLabel(event.source) }}</span>
                  </div>

                  <!-- 错误信息可折叠展开 -->
                  <div v-if="event.resolvedStatus !== 'completed' && event.error" class="event-error-box" @click.stop="toggleErrorExpand(event.id)">
                    <span class="error-text" :class="{ expanded: expandedErrorIds.has(event.id) }">{{ event.error }}</span>
                    <small class="error-hint">{{ expandedErrorIds.has(event.id) ? '收起' : '展开详情' }}</small>
                  </div>

                  <p class="event-time">
                    <span>{{ event.runtime || '默认运行时' }}</span>
                    <span class="dot-sep">·</span>
                    <span class="font-mono">{{ formatTime(event.at) }}</span>
                  </p>
                </div>

                <div class="event-metrics">
                  <span class="font-mono duration">{{ formatDuration(event.durationMs) }}</span>
                  <span v-if="event.usageReported" class="font-mono text-muted">{{ formatTokens(safeNumber(event.inputTokens) + safeNumber(event.outputTokens)) }} Token</span>
                  <span v-else-if="event.usageSource === 'local_no_model'" class="text-muted">本地验证</span>
                  <span v-else class="text-muted" :title="missingReasonLabel(event.usageMissingReason)">Token 未提供</span>
                  <span v-if="safeNumber(event.totalCostUsd)" class="font-mono text-ok">{{ formatCost(event.totalCostUsd) }}</span>
                  <span v-if="event.fileChangeCount" class="text-muted">{{ event.fileChangeCount }} 个文件变更</span>
                </div>

                <!-- Trace ID 胶囊带复制 -->
                <div v-if="event.traceId || event.executionId || event.taskId" class="event-trace-wrap" @click.stop>
                  <button
                    type="button"
                    class="trace-pill"
                    :title="`点击复制：${event.traceId || event.executionId || event.taskId}`"
                    @click="copyText(event.traceId || event.executionId || event.taskId, event.id)"
                  >
                    <code>{{ (event.traceId || event.executionId || event.taskId).slice(0, 14) }}…</code>
                    <Check v-if="copiedKey === event.id" :size="11" class="copied-icon" />
                    <Copy v-else :size="11" />
                  </button>
                  <ArrowUpRight v-if="eventNavigable(event)" :size="13" class="nav-arrow" />
                </div>
              </article>
            </div>

            <div v-else-if="!executionLoading && !executionError" class="event-empty">
              {{ executionStatus === 'all'
                ? (isGlobalScope
                  ? '所选时间范围内暂无全局执行记录。'
                  : (isProjectScope ? '所选时间范围内暂无该项目执行记录。' : '所选时间范围内暂无该群执行记录。'))
                : `所选时间范围内暂无“${eventStatusLabel(executionStatus)}”记录。` }}
            </div>

            <div v-if="executionLoading && !recentEvents.length" class="event-loading">正在加载执行记录…</div>

            <!-- 分页栏 -->
            <div v-if="executionResult.totalPages > 1" class="event-pagination">
              <span>第 {{ executionPageStart }}–{{ executionPageEnd }} 条，共 {{ formatNumber(executionResult.total) }} 条</span>
              <div class="pagination-buttons">
                <button type="button" :disabled="executionResult.page <= 1 || executionLoading" @click="executionPage = 1">首页</button>
                <button type="button" :disabled="executionResult.page <= 1 || executionLoading" @click="executionPage -= 1">上一页</button>
                <span class="page-current">{{ executionResult.page }} / {{ executionResult.totalPages }}</span>
                <button type="button" :disabled="executionResult.page >= executionResult.totalPages || executionLoading" @click="executionPage += 1">下一页</button>
                <button type="button" :disabled="executionResult.page >= executionResult.totalPages || executionLoading" @click="executionPage = executionResult.totalPages">末页</button>
              </div>
            </div>
          </article>
        </template>

        <footer class="page-foot">
          <span>页面更新：{{ loadedAt ? loadedAt.toLocaleTimeString('zh-CN', { hour12: false }) : '—' }}</span>
          <span>CCM 指标引擎 v{{ payload.metrics?.version || 2 }}</span>
        </footer>
      </template>
    </div>
  </WorkspacePageShell>
</template>

<style scoped>
/* ==================== 页面基础容器 ==================== */
.metrics-page {
  min-height: 100%;
  padding: 16px 24px 36px;
  background: var(--bg-primary);
  color: var(--text-primary);
  box-sizing: border-box;
}

.font-mono {
  font-family: var(--font-mono, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace);
  font-variant-numeric: tabular-nums;
}

.text-right { text-align: right; }
.text-ok { color: var(--accent-green, #10b981) !important; }
.text-warn { color: var(--accent-yellow, #f59e0b) !important; }
.text-danger { color: var(--accent-red, #ef4444) !important; }
.text-muted { color: var(--text-muted) !important; }

/* 顶栏共享筛选栏 */
.metrics-shared-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.metrics-shared-toolbar label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}
.metrics-shared-toolbar label span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.scope-control {
  min-width: 220px;
}
.toolbar select,
.refresh-btn,
.apply-range-btn {
  height: var(--control-height, 34px);
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--control-bg, var(--bg-card));
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.toolbar select:focus,
.refresh-btn:focus-visible,
.apply-range-btn:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}
.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.refresh-btn:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}
.refresh-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 自定义日期选择面板 */
.custom-range-inline {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.custom-date-range {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--radius-md, 6px);
  border: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
}
.custom-date-range label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.custom-date-range label span {
  color: var(--text-muted);
  font-size: 11px;
}
.custom-date-range input[type="date"] {
  height: 28px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--control-bg);
  color: var(--text-primary);
  font-size: 11.5px;
  padding: 0 6px;
  outline: none;
}
.custom-date-range > i {
  color: var(--text-muted);
  font-size: 12px;
  font-style: normal;
}
.custom-range-error {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 3px;
  color: var(--accent-red, #ef4444);
  font-size: 10.5px;
}

/* 错误与骨架屏 */
.state-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 14px;
  border: 1px solid var(--border-color);
  background: var(--surface);
}
.error-state {
  border-color: color-mix(in srgb, var(--accent-red) 35%, transparent);
  background: var(--danger-soft, rgba(239, 68, 68, 0.08));
}
.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--accent-red);
}
.banner-content div { display: flex; flex-direction: column; gap: 2px; }
.banner-content strong { font-size: 13px; }
.banner-content span { font-size: 12px; color: var(--text-secondary); }
.state-banner button {
  padding: 5px 12px;
  border: 0;
  border-radius: 6px;
  background: var(--accent-blue);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.skeleton {
  height: 120px;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--panel-muted), var(--surface), var(--panel-muted));
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }

/* ==================== 顶部 Scope 横幅 ==================== */
.scope-strip {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(260px, 1.2fr) auto;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 16px;
  margin-bottom: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.scope-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.scope-avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent-blue, #2563eb), #7c3aed);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  flex-shrink: 0;
}
.scope-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.scope-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.scope-title-row strong {
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scope-tag {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-blue);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
}
.scope-coordinator {
  color: var(--text-muted);
  font-size: 11.5px;
}
.scope-status {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.status-indicator {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #94a3b8;
  flex-shrink: 0;
}
.scope-status.live .status-indicator {
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.16);
}
.scope-status.idle .status-indicator { background: #3b82f6; }
.scope-status.stale .status-indicator { background: #f59e0b; }
.scope-status div {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.scope-status strong {
  font-size: 12px;
  font-weight: 700;
}
.scope-status span {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scope-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}
.meta-label {
  font-size: 10.5px;
  color: var(--text-muted);
}
.scope-code-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--panel-muted);
  color: var(--text-primary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.scope-code-btn:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}
.scope-code-btn code {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
}
.copied-icon {
  color: var(--accent-green, #10b981);
}
.legacy-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-yellow) 30%, transparent);
  background: var(--warning-soft, rgba(245, 158, 11, 0.08));
  color: var(--accent-yellow, #d97706);
  font-size: 11.5px;
  margin-bottom: 12px;
}
.legacy-notice small { margin-left: auto; font-weight: 700; }

/* ==================== 1. KPI 9格指标网格 ==================== */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.kpi-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 118px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.kpi-card:hover {
  border-color: color-mix(in srgb, var(--accent-blue) 30%, var(--border-color));
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.06));
}
.kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.kpi-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
}
.icon-wrap {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  flex-shrink: 0;
}
.icon-wrap.blue { background: rgba(37, 99, 235, 0.1); color: var(--accent-blue, #2563eb); }
.icon-wrap.green { background: rgba(16, 185, 129, 0.1); color: var(--accent-green, #10b981); }
.icon-wrap.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.icon-wrap.cyan { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }
.icon-wrap.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.icon-wrap.indigo { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
.icon-wrap.teal { background: rgba(20, 184, 166, 0.1); color: #14b8a6; }
.icon-wrap.emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.icon-wrap.orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }

.kpi-badge {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.2;
}
.kpi-badge.ok { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.kpi-badge.warn { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
.kpi-badge.muted { background: var(--panel-muted); color: var(--text-muted); }
.kpi-badge.healthy { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.kpi-badge.warning { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
.kpi-badge.critical { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

.kpi-value {
  display: block;
  margin: 10px 0 6px;
  font-size: 26px;
  font-weight: 800;
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}
.kpi-value.time-value { font-size: 20px; }
.kpi-value.token-pair {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 20px;
}
.kpi-value.token-pair .inp { color: var(--accent-blue, #2563eb); }
.kpi-value.token-pair .sep { color: var(--text-muted); font-size: 16px; font-weight: 400; }
.kpi-value.token-pair .out { color: #8b5cf6; }

.token-mini-bar {
  display: flex;
  height: 5px;
  width: 100%;
  border-radius: 999px;
  overflow: hidden;
  background: var(--panel-muted);
  margin-top: 4px;
}
.token-mini-bar .bar-in { background: var(--accent-blue, #2563eb); height: 100%; }
.token-mini-bar .bar-out { background: #8b5cf6; height: 100%; }

.kpi-footer {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ==================== 终态分桶条 (Breakdown Strip) ==================== */
.bucket-strip {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bucket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bucket-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--text-primary);
}
.bucket-total {
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 600;
}
.breakdown-bar {
  display: flex;
  height: 8px;
  width: 100%;
  border-radius: 999px;
  overflow: hidden;
  background: var(--panel-muted);
}
.breakdown-bar .seg { height: 100%; transition: width 0.3s ease; }
.breakdown-bar .seg.ok { background: #10b981; }
.breakdown-bar .seg.bad { background: #ef4444; }
.breakdown-bar .seg.warn { background: #f59e0b; }
.breakdown-bar .seg.info { background: #3b82f6; }
.breakdown-bar .seg.mute { background: #94a3b8; }

.bucket-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 600;
  background: var(--panel-muted);
  color: var(--text-secondary);
}
.chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.chip.ok .dot { background: #10b981; }
.chip.bad .dot { background: #ef4444; }
.chip.warn .dot { background: #f59e0b; }
.chip.info .dot { background: #3b82f6; }
.chip.mute .dot { background: #94a3b8; }

.chip.ok { background: rgba(16, 185, 129, 0.08); color: #059669; }
.chip.bad { background: rgba(239, 68, 68, 0.08); color: #dc2626; }
.chip.warn { background: rgba(245, 158, 11, 0.08); color: #d97706; }
.chip.info { background: rgba(59, 130, 246, 0.08); color: #2563eb; }

.live-runs-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}
.live-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-primary);
}
.live-chips {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ==================== 面板与图表容器 ==================== */
.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
.panel {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  margin-bottom: 14px;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface);
}
.panel-kicker {
  display: block;
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.panel-head h3 {
  margin: 3px 0 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.panel-note {
  font-size: 11.5px;
  color: var(--text-muted);
}
.legend {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11.5px;
  color: var(--text-muted);
}
.legend span { display: flex; align-items: center; gap: 5px; }
.legend i { width: 8px; height: 8px; border-radius: 2px; }
.legend .ok { background: var(--accent-blue, #2563eb); }
.legend .fail { background: #ef4444; }

/* 趋势柱状图 */
.chart {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 210px;
  padding: 24px 16px 14px;
}
.chart-column {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  align-items: center;
}
.chart-value {
  height: 16px;
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}
.bar-track {
  display: flex;
  align-items: flex-end;
  width: min(80%, 34px);
  height: 140px;
  border-radius: 6px;
  background: var(--panel-muted);
  overflow: hidden;
}
.bar-total {
  position: relative;
  width: 100%;
  min-height: 3px;
  background: #ef4444;
  border-radius: 5px 5px 0 0;
  overflow: hidden;
  transition: height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.bar-success {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #60a5fa, var(--accent-blue, #2563eb));
  border-radius: 5px 5px 0 0;
}
.chart-label {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
}
.chart-empty {
  margin: -110px 0 90px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

/* 实时资源仪表盘 */
.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.live-dot-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
}
.runtime-dashboard {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.gauge-card {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
}
.gauge-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.gauge-header span { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.gauge-header strong { font-size: 15px; font-weight: 800; }
.meter-bar {
  height: 6px;
  border-radius: 999px;
  background: var(--panel-muted);
  overflow: hidden;
}
.meter-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-blue, #2563eb), #8b5cf6);
  transition: width 0.3s ease;
}
.meter-bar.heap i {
  background: linear-gradient(90deg, #06b6d4, #10b981);
}
.runtime-stat-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.stat-mini {
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-mini span { font-size: 11px; color: var(--text-muted); }
.stat-mini strong { font-size: 13.5px; font-weight: 700; }
.runtime-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

/* ==================== 2. Token 分析视图 ==================== */
.coverage-list {
  padding: 12px 16px;
  display: grid;
  gap: 10px;
}
.coverage-card {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) minmax(140px, 1fr) minmax(200px, 1.4fr);
  align-items: center;
  gap: 16px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
}
.coverage-agent {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.coverage-agent-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.coverage-agent strong { font-size: 13px; font-weight: 700; }
.coverage-runtime { color: var(--text-muted); font-size: 11px; }
.coverage-progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.coverage-meter {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--panel-muted);
  overflow: hidden;
}
.coverage-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-blue, #2563eb), #10b981);
}
.coverage-pct { font-size: 12.5px; font-weight: 800; min-width: 44px; text-align: right; }
.coverage-tags { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.coverage-tag {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
}
.coverage-tag.ok { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.coverage-tag.local { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
.coverage-tag.missing { background: rgba(245, 158, 11, 0.12); color: #d97706; }
.coverage-reason { color: var(--text-muted); font-size: 10.5px; width: 100%; margin-top: 2px; }

/* 大表格样式（首列固定） */
.table-wrap {
  overflow-x: auto;
  max-width: 100%;
}
.metrics-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 860px;
}
.metrics-table th,
.metrics-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  white-space: nowrap;
}
.metrics-table th {
  background: var(--panel-muted);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.metrics-table tbody tr:hover td {
  background: var(--accent-soft, rgba(37, 99, 235, 0.04));
}
.metrics-table .sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--surface);
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.04);
}
.metrics-table th.sticky-col {
  background: var(--panel-muted);
  z-index: 3;
}
.agent-col-cell strong {
  font-size: 13px;
  font-weight: 700;
}
.role-badge,
.status-badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 2px 8px;
  background: var(--panel-muted);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}
.role-badge.main {
  background: var(--accent-soft);
  color: var(--accent-blue);
}
.rate {
  color: var(--accent-green, #10b981);
  font-weight: 700;
}
.rate.bad {
  color: var(--accent-red, #ef4444);
}

/* ==================== 3. 性能诊断视图 (Waterfall) ==================== */
.phase-waterfall {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.waterfall-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  align-items: center;
  gap: 16px;
}
.waterfall-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12.5px;
}
.waterfall-label strong { font-weight: 700; }
.waterfall-label span { color: var(--text-muted); font-size: 11.5px; }
.waterfall-track {
  height: 20px;
  border-radius: 6px;
  background: var(--panel-muted);
  overflow: hidden;
}
.waterfall-bar {
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--accent-blue, #2563eb), #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  min-width: 32px;
  transition: width 0.3s ease;
}
.waterfall-pct {
  color: #fff;
  font-size: 10.5px;
  font-weight: 800;
  font-family: var(--font-mono, monospace);
}

.agent-resource-list {
  padding: 12px 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}
.agent-resource-card {
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.resource-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.resource-card-header strong { font-size: 13px; font-weight: 700; }
.resource-source { font-size: 11px; color: var(--text-muted); }
.resource-card-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.res-item {
  display: flex;
  flex-direction: column;
  font-size: 11px;
}
.res-item span { color: var(--text-muted); }
.res-item strong { font-size: 12.5px; font-weight: 700; margin-top: 1px; }

/* 可靠性演练 */
.reliability-actions { display: flex; gap: 8px; }
.btn-primary, .btn-warn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: 0;
}
.btn-primary { background: var(--accent-blue); color: #fff; }
.btn-warn { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.reliability-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 14px 16px;
}
.reliability-card {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.reliability-card span { font-size: 11.5px; color: var(--text-muted); }
.reliability-card strong { font-size: 14px; font-weight: 700; }
.reliability-card small { font-size: 10.5px; color: var(--text-muted); margin-top: 2px; }

/* ==================== 4. 执行记录视图 ==================== */
.event-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface);
}
.event-status-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}
.event-status-tabs button {
  height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.event-status-tabs button:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}
.event-status-tabs button.active {
  background: var(--accent-soft);
  color: var(--accent-blue);
  font-weight: 700;
  border-color: color-mix(in srgb, var(--accent-blue) 25%, transparent);
}
.event-status-tabs button small {
  font-family: var(--font-mono, monospace);
  font-size: 10.5px;
  padding: 1px 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 16%, transparent);
}
.event-status-tabs button.active small {
  background: color-mix(in srgb, var(--accent-blue) 20%, transparent);
}
.page-size-control {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-muted);
}
.page-size-control select {
  height: 28px;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 11.5px;
}

.event-list {
  padding: 6px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.event-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1.4fr) minmax(130px, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: var(--surface);
  transition: background 0.15s ease, border-color 0.15s ease;
}
.event-row:hover {
  background: var(--control-hover);
  border-color: var(--border-color);
}
.event-row.is-clickable { cursor: pointer; }
.event-row.is-failed {
  border-left: 3px solid #ef4444;
  background: rgba(239, 68, 68, 0.02);
}
.event-row.is-blocked {
  border-left: 3px solid #f59e0b;
}

.event-state-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
}
.event-state-icon.success { color: #10b981; }
.event-state-icon.failed { color: #ef4444; }
.event-state-icon.blocked { color: #f59e0b; }
.event-state-icon.cancelled { color: #94a3b8; }
.event-state-icon.unknown { color: #3b82f6; }

.event-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.event-main-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.event-agent-name {
  font-size: 13px;
  font-weight: 700;
}
.event-source-tag {
  color: var(--text-muted);
  font-size: 11.5px;
}
.event-error-box {
  padding: 4px 8px;
  border-radius: 5px;
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  cursor: pointer;
}
.error-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.error-text.expanded { white-space: normal; }
.error-hint { color: var(--accent-red); font-weight: 700; }
.event-time {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot-sep { opacity: 0.5; }

.event-metrics {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-size: 11.5px;
}
.event-metrics .duration { font-weight: 700; }

.event-trace-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.trace-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--panel-muted);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.trace-pill:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}
.trace-pill code {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
}
.nav-arrow { color: var(--text-muted); }

.event-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-muted);
}
.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pagination-buttons button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}
.pagination-buttons button:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}
.pagination-buttons button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.page-current {
  font-family: var(--font-mono, monospace);
  font-size: 11.5px;
  font-weight: 700;
  padding: 0 8px;
}

.page-foot {
  display: flex;
  justify-content: space-between;
  padding: 10px 4px 0;
  color: var(--text-muted);
  font-size: 11px;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 1050px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .overview-grid { grid-template-columns: 1fr; }
  .scope-strip { grid-template-columns: 1fr 1fr; }
  .scope-meta { display: none; }
  .reliability-grid { grid-template-columns: 1fr; }
  .coverage-card { grid-template-columns: 1fr; gap: 8px; }
}

@media (max-width: 700px) {
  .metrics-page { padding: 12px 14px 28px; }
  .kpi-grid { grid-template-columns: 1fr; }
  .scope-strip { grid-template-columns: 1fr; }
  .event-row { grid-template-columns: 24px 1fr; }
  .event-metrics, .event-trace-wrap { grid-column: 2; align-items: flex-start; }
  .event-controls { flex-direction: column; align-items: stretch; }
  .event-status-tabs { overflow-x: auto; scrollbar-width: none; }
  .waterfall-row { grid-template-columns: 1fr; gap: 4px; }
}
</style>

