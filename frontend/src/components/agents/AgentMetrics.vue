<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const emit = defineEmits(['navigate'])

const props = defineProps({
  active: { type: Boolean, default: true },
})

const GLOBAL_SCOPE_ID = '__global__'

const emptyPayload = () => ({
  metrics: { version: 2, agents: {}, daily: {}, scopes: {}, events: [], updatedAt: null },
  catalog: {
    groups: [],
    global: { id: 'global', name: '全局助手', agent: 'global-agent', scopeKey: 'global:global' },
    legacyUnscoped: {},
  },
  system: null,
})

const payload = ref(emptyPayload())
const selectedGroupId = ref(localStorage.getItem('metrics-selected-group') || GLOBAL_SCOPE_ID)
const rangeDays = ref(Number(localStorage.getItem('metrics-range-days') || 7))
const loading = ref(true)
const refreshing = ref(false)
const navigatingEventId = ref('')
const error = ref('')
const loadedAt = ref(null)
const activeRuns = ref([])
const scopeQuery = ref('')
const scopeMenuOpen = ref(false)
const scopeInputRef = ref(null)
let poller = null
let metricsInFlight = false

const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const pad = (value) => String(value).padStart(2, '0')
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
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
const rangeLabel = computed(() => (rangeDays.value === 1 ? '今天' : `近 ${rangeDays.value} 天`))

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
    }
    loadedAt.value = new Date()
    const ids = [GLOBAL_SCOPE_ID, ...(payload.value.catalog.groups || []).map(group => group.id)]
    if (!ids.includes(selectedGroupId.value)) selectedGroupId.value = GLOBAL_SCOPE_ID
    await loadActiveRuns()
  } catch (cause) {
    error.value = cause?.message || '性能指标加载失败'
  } finally {
    loading.value = false
    refreshing.value = false
    metricsInFlight = false
  }
}

const groups = computed(() => payload.value.catalog?.groups || [])
const globalCatalog = computed(() => payload.value.catalog?.global || {
  id: 'global',
  name: '全局助手',
  agent: 'global-agent',
  scopeKey: 'global:global',
})
const isGlobalScope = computed(() => selectedGroupId.value === GLOBAL_SCOPE_ID)
const selectedGroup = computed(() => (
  isGlobalScope.value
    ? null
    : groups.value.find(group => group.id === selectedGroupId.value) || null
))
const hasScopeSelection = computed(() => isGlobalScope.value || !!selectedGroup.value)
const activeScope = computed(() => {
  if (isGlobalScope.value) return payload.value.metrics?.scopes?.['global:global'] || null
  if (!selectedGroupId.value) return null
  return payload.value.metrics?.scopes?.[`group:${selectedGroupId.value}`] || null
})
const mainRoleKey = computed(() => (isGlobalScope.value ? 'global_agent' : 'main_agent'))
const coordinatorName = computed(() => (
  isGlobalScope.value
    ? (globalCatalog.value.agent || 'global-agent')
    : (selectedGroup.value?.coordinator || 'coordinator')
))
const scopeDisplayName = computed(() => (
  isGlobalScope.value ? (globalCatalog.value.name || '全局助手') : (selectedGroup.value?.name || '未选择')
))
const mainAgentLabel = computed(() => (isGlobalScope.value ? '全局 Agent' : '群聊主 Agent'))
const emptyAggregate = () => ({
  calls: 0, successes: 0, failures: 0, totalMs: 0, durationsMs: [], inputTokens: 0, outputTokens: 0, usageReportedCalls: 0, lastCall: null,
})
const mainAggregate = computed(() => (
  activeScope.value?.roles?.[mainRoleKey.value]?.[coordinatorName.value]
  || (isGlobalScope.value ? activeScope.value?.agents?.[coordinatorName.value] : null)
  || emptyAggregate()
))

const scopeOptions = computed(() => ([
  { id: GLOBAL_SCOPE_ID, name: '全局', hint: '全局助手' },
  ...groups.value.map(group => ({ id: group.id, name: group.name || group.id, hint: group.id })),
]))
const filteredScopeOptions = computed(() => {
  const query = String(scopeQuery.value || '').trim().toLowerCase()
  if (!query) return scopeOptions.value
  return scopeOptions.value.filter((option) => (
    String(option.name || '').toLowerCase().includes(query)
    || String(option.hint || '').toLowerCase().includes(query)
    || String(option.id || '').toLowerCase().includes(query)
  ))
})
const selectedScopeLabel = computed(() => {
  const option = scopeOptions.value.find(item => item.id === selectedGroupId.value)
  return option?.name || scopeDisplayName.value
})

const openScopeMenu = async () => {
  scopeMenuOpen.value = true
  scopeQuery.value = ''
  await nextTick()
  scopeInputRef.value?.focus?.()
}
const closeScopeMenu = () => {
  scopeMenuOpen.value = false
  scopeQuery.value = ''
}
const selectScope = (id) => {
  selectedGroupId.value = id
  closeScopeMenu()
}
const onScopeKeydown = (event) => {
  if (event.key === 'Escape') {
    closeScopeMenu()
    return
  }
  if (event.key === 'Enter') {
    const first = filteredScopeOptions.value[0]
    if (first) selectScope(first.id)
  }
}

const rangeKeys = computed(() => {
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
    usageReportedCalls: safeNumber(aggregate.usageReportedCalls),
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
    result.usageReportedCalls += day.usageReportedCalls
    result.durations.push(...day.durations)
    return result
  }, { calls: 0, successes: 0, failures: 0, totalMs: 0, inputTokens: 0, outputTokens: 0, usageReportedCalls: 0, durations: [] })
  summary.successRate = summary.calls ? (summary.successes / summary.calls) * 100 : 0
  summary.avgMs = summary.calls ? summary.totalMs / summary.calls : 0
  summary.p95Ms = percentile(summary.durations, 0.95)
  summary.totalTokens = summary.inputTokens + summary.outputTokens
  summary.usageCoverage = summary.calls ? (summary.usageReportedCalls / summary.calls) * 100 : 0
  return summary
})

const eventInSelectedScope = (event) => {
  if (isGlobalScope.value) {
    return String(event?.scopeType || '') === 'global'
      && (String(event?.scopeId || 'global') === 'global' || !event?.scopeId)
  }
  return event?.groupId === selectedGroupId.value
}

const resolveEventStatus = (event) => {
  const explicit = String(event?.status || '').trim().toLowerCase()
  if (['completed', 'failed', 'cancelled'].includes(explicit)) return explicit
  if (event?.success === true) return 'completed'
  if (/cancell?ed/i.test(String(event?.error || ''))) return 'cancelled'
  return 'failed'
}

const mainEvents = computed(() => (payload.value.metrics?.events || [])
  .filter(event => eventInSelectedScope(event) && event.role === mainRoleKey.value)
  .sort((a, b) => String(b.at).localeCompare(String(a.at))))
const latestMainEvent = computed(() => mainEvents.value[0] || null)
const scopedRangeEvents = computed(() => (payload.value.metrics?.events || [])
  .filter(event => eventInSelectedScope(event) && rangeKeys.value.includes(event.date || String(event.at || '').slice(0, 10)))
  .sort((a, b) => String(b.at).localeCompare(String(a.at)))
  .map(event => ({ ...event, resolvedStatus: resolveEventStatus(event) })))
const recentEvents = computed(() => scopedRangeEvents.value.slice(0, 30))

const statusBuckets = computed(() => {
  const buckets = { completed: 0, failed: 0, cancelled: 0 }
  for (const event of scopedRangeEvents.value) {
    const status = event.resolvedStatus || resolveEventStatus(event)
    if (status === 'completed') buckets.completed += 1
    else if (status === 'cancelled') buckets.cancelled += 1
    else buckets.failed += 1
  }
  return buckets
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
  return !!(event?.traceId || selectedGroupId.value)
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
        : '该群聊尚未产生新版主 Agent 性能记录。',
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
      detail: isGlobalScope.value ? '需要至少一次真实全局 Agent 调用。' : '需要至少一次真实主 Agent 调用。',
    }
  }
  if (freshness.value.level === 'stale') return { level: 'unknown', label: '状态未知', detail: '数据已过期，不能据此判断当前健康度。' }
  const stats = rangeStats.value
  if (!stats.calls) {
    return {
      level: 'unknown',
      label: '暂无结论',
      detail: `${rangeLabel.value}没有${isGlobalScope.value ? '全局' : '主'} Agent 调用。`,
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

const agentRows = computed(() => {
  if (isGlobalScope.value) {
    const aggregate = mainAggregate.value || {}
    const calls = safeNumber(aggregate.calls)
    const successes = safeNumber(aggregate.successes)
    return [{
      project: coordinatorName.value,
      isMain: true,
      roleLabel: '全局 Agent',
      calls,
      failures: safeNumber(aggregate.failures),
      successRate: calls ? (successes / calls) * 100 : 0,
      avgMs: safeNumber(aggregate.avgMs),
      p95Ms: percentile(Array.isArray(aggregate.durationsMs) ? aggregate.durationsMs : [], 0.95),
      lastCall: aggregate.lastCall || null,
      tokens: safeNumber(aggregate.inputTokens) + safeNumber(aggregate.outputTokens),
      usageReportedCalls: safeNumber(aggregate.usageReportedCalls),
    }]
  }
  const catalogMembers = selectedGroup.value?.members || []
  const known = new Set(catalogMembers.map(member => member.project))
  const metricOnly = Object.keys(activeScope.value?.agents || {}).filter(agent => !known.has(agent)).map(project => ({ project, role: 'member' }))
  return [...catalogMembers, ...metricOnly].map((member) => {
    const isMain = member.project === coordinatorName.value || member.role === 'coordinator'
    const aggregate = isMain
      ? activeScope.value?.roles?.main_agent?.[member.project] || {}
      : activeScope.value?.roles?.member_agent?.[member.project] || activeScope.value?.agents?.[member.project] || {}
    const calls = safeNumber(aggregate.calls)
    const successes = safeNumber(aggregate.successes)
    return {
      project: member.project,
      isMain,
      roleLabel: isMain ? '群聊主 Agent' : '成员 Agent',
      calls,
      failures: safeNumber(aggregate.failures),
      successRate: calls ? (successes / calls) * 100 : 0,
      avgMs: safeNumber(aggregate.avgMs),
      p95Ms: percentile(Array.isArray(aggregate.durationsMs) ? aggregate.durationsMs : [], 0.95),
      lastCall: aggregate.lastCall || null,
      tokens: safeNumber(aggregate.inputTokens) + safeNumber(aggregate.outputTokens),
      usageReportedCalls: safeNumber(aggregate.usageReportedCalls),
    }
  }).sort((a, b) => Number(b.isMain) - Number(a.isMain) || b.calls - a.calls || a.project.localeCompare(b.project))
})

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
  if (role === 'main_agent') return '群聊主 Agent'
  return '成员 Agent'
}

const eventStatusLabel = (status) => ({
  completed: '成功',
  failed: '失败',
  cancelled: '取消',
}[status] || '失败')

const eventStatusClass = (status) => ({
  completed: 'success',
  failed: 'failed',
  cancelled: 'cancelled',
}[status] || 'failed')

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
const onDocumentPointerDown = (event) => {
  if (!scopeMenuOpen.value) return
  const root = event.target?.closest?.('.scope-combobox')
  if (!root) closeScopeMenu()
}

watch(selectedGroupId, (value) => {
  if (value) localStorage.setItem('metrics-selected-group', value)
  if (props.active !== false) loadActiveRuns()
})
watch(rangeDays, (value) => localStorage.setItem('metrics-range-days', String(value)))
watch(() => props.active, (isActive) => {
  if (isActive === false) {
    if (poller) clearInterval(poller)
    poller = null
    return
  }
  loadMetrics({ silent: true })
  restartPoller()
})

onMounted(async () => {
  await loadMetrics()
  restartPoller()
  window.addEventListener('storage', onStorage)
  document.addEventListener('pointerdown', onDocumentPointerDown)
})
onUnmounted(() => {
  if (poller) clearInterval(poller)
  window.removeEventListener('storage', onStorage)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<template>
  <div class="metrics-page">
    <header class="page-header">
      <div>
        <div class="eyebrow">AGENT OBSERVABILITY</div>
        <h2>Agent 性能监控</h2>
        <p>按范围查看全局助手或群聊主 Agent 指标，并保留成员 Agent 的真实执行明细。</p>
      </div>
      <div class="toolbar">
        <label class="scope-combobox">
          <span>范围</span>
          <button type="button" class="scope-trigger" :aria-expanded="scopeMenuOpen" @click="scopeMenuOpen ? closeScopeMenu() : openScopeMenu()">
            <strong>{{ selectedScopeLabel }}</strong>
            <i>▾</i>
          </button>
          <div v-if="scopeMenuOpen" class="scope-menu">
            <input
              ref="scopeInputRef"
              v-model="scopeQuery"
              type="search"
              placeholder="搜索群聊名称或 ID"
              @keydown="onScopeKeydown"
            >
            <div class="scope-options">
              <button
                v-for="option in filteredScopeOptions"
                :key="option.id"
                type="button"
                class="scope-option"
                :class="{ active: option.id === selectedGroupId }"
                @click="selectScope(option.id)"
              >
                <strong>{{ option.name }}</strong>
                <small>{{ option.hint }}</small>
              </button>
              <div v-if="!filteredScopeOptions.length" class="scope-empty">无匹配群聊</div>
            </div>
          </div>
        </label>
        <label>
          <span>时间范围</span>
          <select v-model.number="rangeDays">
            <option :value="1">今天</option>
            <option :value="7">近 7 天</option>
            <option :value="14">近 14 天</option>
            <option :value="30">近 30 天</option>
          </select>
        </label>
        <button class="refresh-btn" :disabled="refreshing" @click="loadMetrics({ silent: true })">
          <span :class="{ spinning: refreshing }">↻</span>{{ refreshing ? '刷新中' : '刷新' }}
        </button>
      </div>
    </header>

    <div v-if="error" class="state-banner error-state">
      <div><strong>性能指标加载失败</strong><span>{{ error }}</span></div>
      <button @click="loadMetrics()">重试</button>
    </div>

    <div v-if="loading" class="loading-grid">
      <div v-for="item in 8" :key="item" class="skeleton"></div>
    </div>

    <template v-else-if="hasScopeSelection">
      <section class="scope-strip">
        <div class="scope-main">
          <span class="scope-avatar">{{ scopeDisplayName.slice(0, 1) }}</span>
          <div>
            <strong>{{ scopeDisplayName }}</strong>
            <span>{{ mainAgentLabel }} · {{ coordinatorName }}</span>
          </div>
        </div>
        <div class="scope-status" :class="freshness.level"><i></i><strong>{{ freshness.label }}</strong><span>{{ freshness.detail }}</span></div>
        <div class="scope-meta">
          <span>{{ isGlobalScope ? '按全局 scope 聚合' : '严格按 Group ID 聚合' }}</span>
          <code>{{ isGlobalScope ? 'global:global' : selectedGroup.id }}</code>
        </div>
      </section>

      <div v-if="legacyNotice && !isGlobalScope" class="legacy-notice">
        <span>历史兼容数据未包含群聊归属，已与当前群聊指标隔离，不参与本页计算。</span>
        <small>{{ legacyNotice }} 个旧 Agent 记录</small>
      </div>

      <section class="kpi-grid">
        <article class="kpi-card primary">
          <div class="kpi-head"><span>{{ mainAgentLabel }}调用</span><i>01</i></div>
          <strong>{{ formatNumber(rangeStats.calls) }}</strong>
          <p>{{ rangeLabel }} · 失败 {{ formatNumber(rangeStats.failures) }} 次</p>
        </article>
        <article class="kpi-card" :class="health.level">
          <div class="kpi-head"><span>调用成功率</span><i>02</i></div>
          <strong>{{ rangeStats.calls ? formatPercent(rangeStats.successRate) : '—' }}</strong>
          <p>{{ health.label }} · {{ health.detail }}</p>
        </article>
        <article class="kpi-card">
          <div class="kpi-head"><span>P95 响应时间</span><i>03</i></div>
          <strong>{{ formatDuration(rangeStats.p95Ms) }}</strong>
          <p>平均 {{ formatDuration(rangeStats.avgMs) }}</p>
        </article>
        <article class="kpi-card">
          <div class="kpi-head"><span>最近{{ mainAgentLabel }}活动</span><i>04</i></div>
          <strong class="time-value">{{ formatRelativeTime(latestMainEvent?.at || mainAggregate.lastCall) }}</strong>
          <p>{{ formatTime(latestMainEvent?.at || mainAggregate.lastCall) }}</p>
        </article>
        <article class="kpi-card">
          <div class="kpi-head"><span>Token 用量</span><i>05</i></div>
          <strong>{{ formatTokens(rangeStats.totalTokens) }}</strong>
          <p v-if="rangeStats.usageReportedCalls">用量覆盖 {{ formatPercent(rangeStats.usageCoverage) }}</p>
          <p v-else>{{ isGlobalScope ? '等待全局模型返回真实 Token 用量' : '当前运行时未返回用量，不以 0 冒充' }}</p>
        </article>
        <article class="kpi-card">
          <div class="kpi-head"><span>输入 / 输出 Token</span><i>06</i></div>
          <strong>{{ rangeStats.usageReportedCalls ? `${formatTokens(rangeStats.inputTokens)} / ${formatTokens(rangeStats.outputTokens)}` : '—' }}</strong>
          <p>{{ rangeStats.usageReportedCalls ? '输入 Token / 输出 Token' : '等待提供商返回真实 Token 用量' }}</p>
        </article>
      </section>

      <section class="bucket-strip">
        <div class="bucket-block">
          <span class="bucket-kicker">终态分桶 · {{ rangeLabel }}</span>
          <div class="bucket-chips">
            <span class="chip ok">成功 {{ formatNumber(statusBuckets.completed) }}</span>
            <span class="chip bad">失败 {{ formatNumber(statusBuckets.failed) }}</span>
            <span class="chip mute">取消 {{ formatNumber(statusBuckets.cancelled) }}</span>
          </div>
        </div>
        <div v-if="isGlobalScope" class="bucket-block live">
          <span class="bucket-kicker">进行中 · 实时 runs</span>
          <div class="bucket-chips">
            <span class="chip warn">待确认 {{ formatNumber(liveRunBuckets.waiting_confirmation) }}</span>
            <span class="chip info">监督中 {{ formatNumber(liveRunBuckets.supervising) }}</span>
            <span class="chip mute">运行中 {{ formatNumber(liveRunBuckets.running) }}</span>
            <small v-if="!hasLiveRuns">当前无进行中的全局 run</small>
          </div>
        </div>
      </section>

      <section class="overview-grid">
        <article class="panel trend-panel">
          <div class="panel-head">
            <div><span class="panel-kicker">{{ isGlobalScope ? 'GLOBAL AGENT TREND' : 'MAIN AGENT TREND' }}</span><h3>{{ mainAgentLabel }}调用趋势</h3></div>
            <div class="legend"><span><i class="ok"></i>成功</span><span><i class="fail"></i>失败</span></div>
          </div>
          <div class="chart">
            <div v-for="day in trendPoints" :key="day.key" class="chart-column" :title="`${day.key} · ${day.calls} 次 · 成功 ${day.successes} · 失败 ${day.failures}`">
              <span class="chart-value">{{ day.calls || '' }}</span>
              <div class="bar-track">
                <div class="bar-total" :style="{ height: `${day.height}%` }">
                  <div class="bar-success" :style="{ height: `${day.successHeight}%` }"></div>
                </div>
              </div>
              <span class="chart-label">{{ day.label }}</span>
            </div>
          </div>
          <div v-if="!rangeStats.calls" class="chart-empty">所选时间范围内暂无{{ isGlobalScope ? '全局 Agent' : '该群主 Agent' }}调用</div>
        </article>

        <article class="panel runtime-panel">
          <div class="panel-head"><div><span class="panel-kicker">CCM PROCESS</span><h3>服务进程实时资源</h3></div><span class="live-dot">LIVE</span></div>
          <div v-if="hasSystem" class="runtime-grid">
            <div><span>CPU</span><strong>{{ safeNumber(system.process?.cpuPercent).toFixed(1) }}%</strong><div class="meter"><i :style="{ width: `${Math.min(100, safeNumber(system.process?.cpuPercent))}%` }"></i></div></div>
            <div><span>Heap</span><strong>{{ formatBytes(system.process?.heapUsedBytes) }}</strong><div class="meter"><i :style="{ width: `${heapPercent}%` }"></i></div></div>
            <div><span>RSS 内存</span><strong>{{ formatBytes(system.process?.rssBytes) }}</strong><small>进程总驻留内存</small></div>
            <div><span>事件循环利用率</span><strong>{{ safeNumber(system.eventLoop?.utilization).toFixed(1) }}%</strong><small>最近两次采样窗口</small></div>
            <div><span>运行时长</span><strong>{{ formatDuration(safeNumber(system.process?.uptimeSeconds) * 1000) }}</strong><small>PID {{ system.process?.pid || '—' }}</small></div>
            <div><span>采样时间</span><strong class="sample-time">{{ formatTime(system.collectedAt, '—') }}</strong><small>随页面轮询更新</small></div>
          </div>
          <div v-else class="runtime-empty">服务重启后启用实时 CPU、内存和事件循环采样。</div>
        </article>
      </section>

      <section class="panel agent-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">{{ isGlobalScope ? 'GLOBAL AGENT' : 'GROUP AGENTS' }}</span>
            <h3>{{ isGlobalScope ? '全局 Agent 性能' : '该群 Agent 性能' }}</h3>
          </div>
          <span class="panel-note">{{ isGlobalScope ? '全局助手终态调用统计，含模型返回的 Token 用量' : '主 Agent 与成员 Agent 分角色统计' }}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>角色</th>
                <th>调用</th>
                <th>成功率</th>
                <th>平均耗时</th>
                <th>P95</th>
                <th>Token</th>
                <th>最后调用</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="agent in agentRows" :key="agent.project">
                <td><strong>{{ agent.project }}</strong></td>
                <td><span class="role-badge" :class="{ main: agent.isMain }">{{ agent.roleLabel }}</span></td>
                <td>{{ formatNumber(agent.calls) }}</td>
                <td><span :class="['rate', agent.calls && agent.successRate < 80 ? 'bad' : '']">{{ agent.calls ? formatPercent(agent.successRate) : '—' }}</span></td>
                <td>{{ formatDuration(agent.avgMs) }}</td>
                <td>{{ formatDuration(agent.p95Ms) }}</td>
                <td>{{ agent.usageReportedCalls ? formatTokens(agent.tokens) : '未提供' }}</td>
                <td><span :title="formatTime(agent.lastCall)">{{ formatRelativeTime(agent.lastCall) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel event-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">RECENT EXECUTIONS</span>
            <h3>{{ isGlobalScope ? '全局最近执行记录' : '该群最近执行记录' }}</h3>
          </div>
          <span class="panel-note">最多展示 30 条 · 可点击跳转</span>
        </div>
        <div v-if="recentEvents.length" class="event-list">
          <article
            v-for="event in recentEvents"
            :key="event.id"
            class="event-row"
            :class="{
              'is-failed': event.resolvedStatus === 'failed',
              'is-cancelled': event.resolvedStatus === 'cancelled',
              'is-clickable': eventNavigable(event),
              'is-navigating': navigatingEventId === event.id,
            }"
            @click="openEvent(event)"
          >
            <span class="event-state" :class="eventStatusClass(event.resolvedStatus)">
              {{ event.resolvedStatus === 'completed' ? '✓' : (event.resolvedStatus === 'cancelled' ? '–' : '!') }}
            </span>
            <div class="event-main">
              <div>
                <strong>{{ event.agent }}</strong>
                <span class="role-badge" :class="{ main: event.role === 'main_agent' || event.role === 'global_agent' }">{{ eventRoleLabel(event.role) }}</span>
                <span class="status-badge" :class="eventStatusClass(event.resolvedStatus)">{{ eventStatusLabel(event.resolvedStatus) }}</span>
                <span>{{ sourceLabel(event.source) }}</span>
              </div>
              <p v-if="event.resolvedStatus !== 'completed' && event.error" class="event-error" :title="event.error">{{ event.error }}</p>
              <p v-else>{{ event.runtime || '默认运行时' }} · {{ formatTime(event.at) }}</p>
            </div>
            <div class="event-metrics">
              <span>{{ formatDuration(event.durationMs) }}</span>
              <span v-if="event.usageReported">{{ formatTokens(safeNumber(event.inputTokens) + safeNumber(event.outputTokens)) }} Token</span>
              <span v-if="event.fileChangeCount">{{ event.fileChangeCount }} 个文件</span>
            </div>
            <code v-if="event.traceId || event.executionId || event.taskId" :title="event.traceId || event.executionId || event.taskId">
              {{ (event.traceId || event.executionId || event.taskId).slice(0, 18) }}
            </code>
          </article>
        </div>
        <div v-else class="event-empty">
          {{ isGlobalScope
            ? '全局助手尚无执行事件。下一次全局 Agent 终态完成后会自动出现。'
            : '该群尚无新版执行事件。下一次主 Agent 或成员 Agent 调用后会自动出现。' }}
        </div>
      </section>

      <footer class="page-foot">
        <span>页面刷新：{{ loadedAt ? loadedAt.toLocaleTimeString('zh-CN', { hour12: false }) : '—' }}</span>
        <span>指标版本 v{{ payload.metrics?.version || 1 }}</span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.metrics-page{height:100%;overflow:auto;padding:24px 28px 40px;background:linear-gradient(180deg,var(--bg-secondary),var(--bg-primary));color:var(--text-primary)}
.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:20px}.eyebrow,.panel-kicker{display:block;color:var(--accent-blue);font-size:9px;font-weight:900;letter-spacing:.16em}.page-header h2{margin:5px 0 4px;font-size:23px;letter-spacing:-.03em}.page-header p{margin:0;color:var(--text-muted);font-size:12px}.toolbar{display:flex;align-items:flex-end;gap:9px}.toolbar label{display:flex;flex-direction:column;gap:5px}.toolbar label span{color:var(--text-muted);font-size:9px;font-weight:800}.toolbar select,.refresh-btn,.scope-trigger{height:35px;border:1px solid var(--border-color);border-radius:9px;background:var(--bg-card);color:var(--text-primary);font-size:11px;font-weight:700;outline:none}.toolbar select{min-width:100px;padding:0 30px 0 10px}.refresh-btn{display:flex;align-items:center;gap:5px;padding:0 13px;cursor:pointer}.refresh-btn:hover{border-color:var(--border-strong);color:var(--accent-blue)}.refresh-btn:disabled{opacity:.6;cursor:wait}.spinning{display:inline-block;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.scope-combobox{position:relative;min-width:180px}.scope-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-width:180px;padding:0 10px;cursor:pointer;text-align:left}.scope-trigger strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.scope-trigger i{font-style:normal;color:var(--text-muted)}.scope-menu{position:absolute;top:calc(100% + 4px);left:0;z-index:20;width:min(280px,70vw);border:1px solid var(--border-color);border-radius:10px;background:var(--bg-card);box-shadow:var(--shadow-md);padding:8px}.scope-menu input{width:100%;height:32px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);padding:0 10px;font-size:11px;outline:none}.scope-options{margin-top:6px;max-height:220px;overflow:auto}.scope-option{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;border:0;background:transparent;color:var(--text-primary);padding:8px 8px;border-radius:8px;cursor:pointer;text-align:left}.scope-option:hover,.scope-option.active{background:var(--accent-soft)}.scope-option strong{font-size:11px}.scope-option small{color:var(--text-muted);font-size:9px}.scope-empty{padding:14px 8px;text-align:center;color:var(--text-muted);font-size:10px}
.state-banner,.scope-strip,.legacy-notice,.panel,.kpi-card,.empty-state,.bucket-strip{border:1px solid var(--border-color);background:var(--bg-card);box-shadow:var(--shadow-sm)}.state-banner{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:12px;margin-bottom:16px}.state-banner div{display:flex;flex-direction:column;gap:3px}.state-banner strong{font-size:12px}.state-banner span{font-size:11px;color:var(--text-muted)}.state-banner button{border:0;border-radius:8px;background:var(--accent-blue);color:white;padding:7px 12px}.error-state{border-color:color-mix(in srgb,var(--accent-red) 32%,transparent);background:var(--danger-soft)}
.loading-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.skeleton{height:128px;border-radius:14px;background:linear-gradient(90deg,var(--bg-tertiary),var(--bg-card),var(--bg-tertiary));background-size:220% 100%;animation:shimmer 1.4s infinite}@keyframes shimmer{to{background-position:-220% 0}}.empty-state{border-radius:16px;padding:70px 20px;text-align:center}.empty-icon{font-size:38px;color:var(--accent-blue)}.empty-state h3{font-size:16px;margin:12px 0 7px}.empty-state p{font-size:12px;color:var(--text-muted)}
.scope-strip{display:grid;grid-template-columns:minmax(210px,1fr) minmax(270px,1.4fr) auto;align-items:center;gap:18px;border-radius:14px;padding:13px 15px;margin-bottom:10px}.scope-main,.scope-status{display:flex;align-items:center;gap:10px}.scope-avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,#2563eb,#7c3aed);color:#fff;font-weight:900}.scope-main div,.scope-status{min-width:0}.scope-main div{display:flex;flex-direction:column;gap:2px}.scope-main strong{font-size:12.5px}.scope-main div span,.scope-status span{color:var(--text-muted);font-size:10px}.scope-status{display:grid;grid-template-columns:auto auto 1fr}.scope-status i{width:8px;height:8px;border-radius:50%;background:#94a3b8}.scope-status.live i{background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.12)}.scope-status.idle i{background:#3b82f6}.scope-status.stale i{background:#f59e0b}.scope-status strong{font-size:11px}.scope-status span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.scope-meta{display:flex;flex-direction:column;align-items:flex-end;gap:3px}.scope-meta span{font-size:9px;color:var(--text-muted)}.scope-meta code{font-size:9px;color:var(--accent-blue);background:var(--accent-soft);padding:3px 6px;border-radius:5px}.legacy-notice{display:flex;justify-content:space-between;gap:15px;margin-bottom:14px;padding:9px 13px;border-radius:10px;border-color:color-mix(in srgb,var(--accent-yellow) 28%,transparent);background:var(--warning-soft);color:var(--accent-yellow);font-size:10px}.legacy-notice small{white-space:nowrap;font-weight:800}
.kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-bottom:10px}.kpi-card{position:relative;min-height:112px;border-radius:13px;padding:14px 15px;overflow:hidden}.kpi-card:after{content:"";position:absolute;right:-18px;bottom:-22px;width:68px;height:68px;border-radius:50%;background:rgba(59,130,246,.08);filter:blur(4px)}.kpi-card.primary{background:linear-gradient(135deg,rgba(37,99,235,.95),rgba(79,70,229,.9));color:#fff}.kpi-card.primary p,.kpi-card.primary .kpi-head{color:rgba(255,255,255,.72)}.kpi-card.critical{border-color:rgba(239,68,68,.28)}.kpi-card.warning{border-color:rgba(245,158,11,.28)}.kpi-head{display:flex;justify-content:space-between;color:var(--text-muted);font-size:10px;font-weight:800}.kpi-head i{font-style:normal;font-family:monospace;opacity:.45}.kpi-card>strong{display:block;margin-top:12px;font-size:25px;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.035em}.kpi-card>strong.time-value{font-size:20px}.kpi-card p{position:relative;z-index:1;margin:9px 0 0;color:var(--text-muted);font-size:9.5px;line-height:1.45}
.bucket-strip{display:flex;flex-wrap:wrap;gap:14px 22px;border-radius:12px;padding:11px 14px;margin-bottom:13px}.bucket-block{display:flex;flex-direction:column;gap:7px;min-width:180px}.bucket-kicker{color:var(--text-muted);font-size:9px;font-weight:800;letter-spacing:.04em}.bucket-chips{display:flex;flex-wrap:wrap;align-items:center;gap:7px}.bucket-chips small{color:var(--text-muted);font-size:9px}.chip{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-size:10px;font-weight:800}.chip.ok{background:rgba(16,185,129,.12);color:#059669}.chip.bad{background:rgba(239,68,68,.12);color:#dc2626}.chip.warn{background:rgba(245,158,11,.14);color:#d97706}.chip.info{background:rgba(59,130,246,.12);color:#2563eb}.chip.mute{background:var(--panel-muted);color:var(--text-muted)}
.overview-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(330px,1fr);gap:13px;margin-bottom:13px}.panel{border-radius:14px;overflow:hidden}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:14px 16px;border-bottom:1px solid rgba(148,163,184,.13)}.panel-head h3{font-size:12.5px;margin:3px 0 0}.panel-note{font-size:9.5px;color:var(--text-muted)}.legend{display:flex;gap:12px;color:var(--text-muted);font-size:9px}.legend span{display:flex;align-items:center;gap:5px}.legend i{width:7px;height:7px;border-radius:2px}.legend .ok{background:#2563eb}.legend .fail{background:#ef4444}.chart{position:relative;display:flex;align-items:flex-end;gap:6px;height:190px;padding:25px 16px 13px}.chart-column{display:flex;flex:1;min-width:0;height:100%;flex-direction:column;align-items:center}.chart-value{height:15px;font:8px ui-monospace,monospace;color:var(--text-muted)}.bar-track{display:flex;align-items:flex-end;width:min(70%,28px);height:125px;border-radius:5px;background:rgba(148,163,184,.08);overflow:hidden}.bar-total{position:relative;width:100%;min-height:2px;background:#ef4444;border-radius:4px 4px 0 0;overflow:hidden;transition:height .3s}.bar-success{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,#60a5fa,#2563eb)}.chart-label{margin-top:7px;color:var(--text-muted);font-size:8px;white-space:nowrap}.chart-empty{margin:-112px 0 83px;text-align:center;color:var(--text-muted);font-size:10px;pointer-events:none}.live-dot{font-size:8px;font-weight:900;letter-spacing:.12em;color:#059669;background:rgba(16,185,129,.1);border-radius:99px;padding:5px 8px}.runtime-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;padding:7px 16px 13px}.runtime-grid>div{min-height:69px;padding:11px 8px;border-bottom:1px solid rgba(148,163,184,.1)}.runtime-grid>div:nth-last-child(-n+2){border-bottom:0}.runtime-grid span{display:block;color:var(--text-muted);font-size:9px}.runtime-grid strong{display:block;margin-top:5px;font-size:15px}.runtime-grid strong.sample-time{font-size:10px;margin-top:8px}.runtime-grid small{display:block;margin-top:5px;color:var(--text-muted);font-size:8px}.meter{height:3px;margin-top:7px;border-radius:3px;background:rgba(148,163,184,.14);overflow:hidden}.meter i{display:block;height:100%;background:linear-gradient(90deg,#2563eb,#8b5cf6);border-radius:inherit}
.agent-panel,.event-panel{margin-bottom:13px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:790px}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--border-color);font-size:10px;white-space:nowrap}th{color:var(--text-muted);font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;background:var(--panel-muted)}td strong{font-size:10.5px}tbody tr:last-child td{border-bottom:0}tbody tr:hover{background:var(--accent-soft)}.role-badge,.status-badge{display:inline-flex;border-radius:99px;padding:3px 7px;background:var(--panel-muted);color:var(--text-muted);font-size:8px;font-weight:800}.role-badge.main{background:var(--accent-soft);color:var(--accent-blue)}.status-badge.success{background:rgba(16,185,129,.12);color:#059669}.status-badge.failed{background:rgba(239,68,68,.12);color:#dc2626}.status-badge.cancelled{background:rgba(148,163,184,.16);color:#64748b}.rate{color:var(--accent-green);font-weight:800}.rate.bad{color:var(--accent-red)}
.runtime-empty{display:grid;place-items:center;min-height:220px;padding:30px;text-align:center;color:var(--text-muted);font-size:10px}
.event-list{padding:2px 14px 8px}.event-row{display:grid;grid-template-columns:27px minmax(0,1fr) auto minmax(80px,140px);align-items:center;gap:10px;padding:10px 8px;margin:0 -6px;border-radius:8px;border-bottom:1px solid rgba(148,163,184,.1)}.event-row:last-child{border-bottom:0}.event-row.is-clickable{cursor:pointer}.event-row.is-clickable:hover{background:var(--accent-soft)}.event-row.is-failed{background:rgba(239,68,68,.05);box-shadow:inset 3px 0 0 #ef4444}.event-row.is-cancelled{background:rgba(148,163,184,.06);box-shadow:inset 3px 0 0 #94a3b8}.event-row.is-navigating{opacity:.65}.event-state{display:grid;place-items:center;width:22px;height:22px;border-radius:7px;font-size:10px;font-weight:900}.event-state.success{background:rgba(16,185,129,.1);color:#059669}.event-state.failed{background:rgba(239,68,68,.1);color:#dc2626}.event-state.cancelled{background:rgba(148,163,184,.16);color:#64748b}.event-main{min-width:0}.event-main>div{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.event-main strong{font-size:10.5px}.event-main>div>span:last-child{color:var(--text-muted);font-size:9px}.event-main p{margin:3px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:9px}.event-main p.event-error{color:#dc2626;font-weight:700}.event-metrics{display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-size:9px;color:var(--text-secondary)}.event-row code{overflow:hidden;text-overflow:ellipsis;color:var(--text-muted);font-size:8px;background:rgba(100,116,139,.06);padding:4px 6px;border-radius:5px}.event-empty{padding:38px;text-align:center;color:var(--text-muted);font-size:10px}.page-foot{display:flex;justify-content:space-between;padding:2px 3px;color:var(--text-muted);font-size:8.5px}
@media(max-width:1050px){.page-header{align-items:flex-start;flex-direction:column}.toolbar{width:100%;flex-wrap:wrap}.scope-combobox{flex:1}.scope-trigger{width:100%}.scope-strip{grid-template-columns:1fr 1fr}.scope-meta{display:none}.overview-grid{grid-template-columns:1fr}.kpi-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.metrics-page{padding:16px 14px 32px}.toolbar{align-items:stretch}.toolbar label{flex:1}.toolbar select,.scope-trigger{width:100%;min-width:0}.refresh-btn{align-self:flex-end}.scope-strip{grid-template-columns:1fr}.scope-status{grid-template-columns:auto auto;}.scope-status span{grid-column:2;white-space:normal}.kpi-grid{grid-template-columns:1fr}.chart{gap:2px;padding-left:8px;padding-right:8px}.chart-label{font-size:7px;transform:rotate(-45deg);transform-origin:center}.runtime-grid{grid-template-columns:1fr}.runtime-grid>div{border-bottom:1px solid rgba(148,163,184,.1)!important}.event-row{grid-template-columns:27px minmax(0,1fr) auto}.event-row code{display:none}}
</style>
