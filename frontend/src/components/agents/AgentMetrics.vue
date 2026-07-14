<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const emptyPayload = () => ({
  metrics: { version: 2, agents: {}, daily: {}, scopes: {}, events: [], updatedAt: null },
  catalog: { groups: [], legacyUnscoped: {} },
  system: null,
})

const payload = ref(emptyPayload())
const selectedGroupId = ref(localStorage.getItem('metrics-selected-group') || '')
const rangeDays = ref(Number(localStorage.getItem('metrics-range-days') || 7))
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const loadedAt = ref(null)
let poller = null

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

const loadMetrics = async ({ silent = false } = {}) => {
  if (silent) refreshing.value = true
  error.value = ''
  try {
    const response = await fetch('/api/metrics', { cache: 'no-store' })
    if (!response.ok) throw new Error(`性能指标接口返回 ${response.status}`)
    const data = await response.json()
    let catalog = data.catalog || { groups: [], legacyUnscoped: {} }
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
    const ids = (payload.value.catalog.groups || []).map(group => group.id)
    if (!ids.includes(selectedGroupId.value)) selectedGroupId.value = ids[0] || ''
  } catch (cause) {
    error.value = cause?.message || '性能指标加载失败'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const groups = computed(() => payload.value.catalog?.groups || [])
const selectedGroup = computed(() => groups.value.find(group => group.id === selectedGroupId.value) || null)
const groupScope = computed(() => payload.value.metrics?.scopes?.[`group:${selectedGroupId.value}`] || null)
const coordinatorName = computed(() => selectedGroup.value?.coordinator || 'coordinator')
const mainAggregate = computed(() => (
  groupScope.value?.roles?.main_agent?.[coordinatorName.value]
  || { calls: 0, successes: 0, failures: 0, totalMs: 0, durationsMs: [], inputTokens: 0, outputTokens: 0, usageReportedCalls: 0, lastCall: null }
))

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
  const aggregate = groupScope.value?.dailyRoles?.[key]?.main_agent?.[coordinatorName.value] || {}
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

const mainEvents = computed(() => (payload.value.metrics?.events || [])
  .filter(event => event.groupId === selectedGroupId.value && event.role === 'main_agent')
  .sort((a, b) => String(b.at).localeCompare(String(a.at))))
const latestMainEvent = computed(() => mainEvents.value[0] || null)
const recentEvents = computed(() => (payload.value.metrics?.events || [])
  .filter(event => event.groupId === selectedGroupId.value && rangeKeys.value.includes(event.date || String(event.at || '').slice(0, 10)))
  .sort((a, b) => String(b.at).localeCompare(String(a.at)))
  .slice(0, 30))

const freshness = computed(() => {
  const at = latestMainEvent.value?.at || mainAggregate.value.lastCall
  if (!at) return { level: 'empty', label: '等待首条数据', detail: '该群聊尚未产生新版主 Agent 性能记录。' }
  const age = Date.now() - new Date(at).getTime()
  if (age <= 15 * 60_000) return { level: 'live', label: '实时采集中', detail: `最近活动 ${formatRelativeTime(at)}` }
  if (age <= 24 * 3_600_000) return { level: 'idle', label: '当前空闲', detail: `最近活动 ${formatRelativeTime(at)}` }
  return { level: 'stale', label: '数据已过期', detail: `最近活动 ${formatRelativeTime(at)}，健康状态不再沿用历史结论。` }
})

const health = computed(() => {
  if (freshness.value.level === 'empty') return { level: 'unknown', label: '暂无结论', detail: '需要至少一次真实主 Agent 调用。' }
  if (freshness.value.level === 'stale') return { level: 'unknown', label: '状态未知', detail: '数据已过期，不能据此判断当前健康度。' }
  const stats = rangeStats.value
  if (!stats.calls) return { level: 'unknown', label: '暂无结论', detail: `近 ${rangeDays.value} 天没有主 Agent 调用。` }
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
  const catalogMembers = selectedGroup.value?.members || []
  const known = new Set(catalogMembers.map(member => member.project))
  const metricOnly = Object.keys(groupScope.value?.agents || {}).filter(agent => !known.has(agent)).map(project => ({ project, role: 'member' }))
  return [...catalogMembers, ...metricOnly].map((member) => {
    const isMain = member.project === coordinatorName.value || member.role === 'coordinator'
    const aggregate = isMain
      ? groupScope.value?.roles?.main_agent?.[member.project] || {}
      : groupScope.value?.roles?.member_agent?.[member.project] || groupScope.value?.agents?.[member.project] || {}
    const calls = safeNumber(aggregate.calls)
    const successes = safeNumber(aggregate.successes)
    return {
      project: member.project,
      isMain,
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
}[source] || source || 'Agent 执行')

const restartPoller = () => {
  if (poller) clearInterval(poller)
  const seconds = Number(localStorage.getItem('app-polling-interval') || 10)
  if (seconds > 0) poller = setInterval(() => loadMetrics({ silent: true }), seconds * 1000)
}
const onStorage = (event) => {
  if (event.key === 'app-polling-interval') restartPoller()
}

watch(selectedGroupId, (value) => {
  if (value) localStorage.setItem('metrics-selected-group', value)
})
watch(rangeDays, (value) => localStorage.setItem('metrics-range-days', String(value)))

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
  <div class="metrics-page">
    <header class="page-header">
      <div>
        <div class="eyebrow">AGENT OBSERVABILITY</div>
        <h2>群聊 Agent 性能监控</h2>
        <p>按群聊隔离主 Agent 指标，并保留成员 Agent 的真实执行明细。</p>
      </div>
      <div class="toolbar">
        <label>
          <span>群聊</span>
          <select v-model="selectedGroupId" :disabled="!groups.length">
            <option v-if="!groups.length" value="">暂无群聊</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </label>
        <label>
          <span>时间范围</span>
          <select v-model.number="rangeDays">
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

    <div v-else-if="!groups.length" class="empty-state">
      <div class="empty-icon">◎</div>
      <h3>还没有可监控的群聊</h3>
      <p>创建群聊并设置主 Agent 后，真实调用会自动按群聊写入这里。</p>
    </div>

    <template v-else-if="selectedGroup">
      <section class="scope-strip">
        <div class="scope-main">
          <span class="scope-avatar">{{ selectedGroup.name.slice(0, 1) }}</span>
          <div><strong>{{ selectedGroup.name }}</strong><span>主 Agent · {{ coordinatorName }}</span></div>
        </div>
        <div class="scope-status" :class="freshness.level"><i></i><strong>{{ freshness.label }}</strong><span>{{ freshness.detail }}</span></div>
        <div class="scope-meta"><span>严格按 Group ID 聚合</span><code>{{ selectedGroup.id }}</code></div>
      </section>

      <div v-if="legacyNotice" class="legacy-notice">
        <span>历史兼容数据未包含群聊归属，已与当前群聊指标隔离，不参与本页计算。</span>
        <small>{{ legacyNotice }} 个旧 Agent 记录</small>
      </div>

      <section class="kpi-grid">
        <article class="kpi-card primary">
          <div class="kpi-head"><span>主 Agent 调用</span><i>01</i></div>
          <strong>{{ formatNumber(rangeStats.calls) }}</strong>
          <p>近 {{ rangeDays }} 天 · 失败 {{ formatNumber(rangeStats.failures) }} 次</p>
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
          <div class="kpi-head"><span>最近主 Agent 活动</span><i>04</i></div>
          <strong class="time-value">{{ formatRelativeTime(latestMainEvent?.at || mainAggregate.lastCall) }}</strong>
          <p>{{ formatTime(latestMainEvent?.at || mainAggregate.lastCall) }}</p>
        </article>
        <article class="kpi-card">
          <div class="kpi-head"><span>Token 用量</span><i>05</i></div>
          <strong>{{ formatTokens(rangeStats.totalTokens) }}</strong>
          <p v-if="rangeStats.usageReportedCalls">用量覆盖 {{ formatPercent(rangeStats.usageCoverage) }}</p>
          <p v-else>当前运行时未返回用量，不以 0 冒充</p>
        </article>
        <article class="kpi-card">
          <div class="kpi-head"><span>输入 / 输出 Token</span><i>06</i></div>
          <strong>{{ rangeStats.usageReportedCalls ? `${formatTokens(rangeStats.inputTokens)} / ${formatTokens(rangeStats.outputTokens)}` : '—' }}</strong>
          <p>{{ rangeStats.usageReportedCalls ? '输入 Token / 输出 Token' : '等待提供商返回真实 Token 用量' }}</p>
        </article>
      </section>

      <section class="overview-grid">
        <article class="panel trend-panel">
          <div class="panel-head">
            <div><span class="panel-kicker">MAIN AGENT TREND</span><h3>主 Agent 调用趋势</h3></div>
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
          <div v-if="!rangeStats.calls" class="chart-empty">所选时间范围内暂无该群主 Agent 调用</div>
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
          <div><span class="panel-kicker">GROUP AGENTS</span><h3>该群 Agent 性能</h3></div>
          <span class="panel-note">主 Agent 与成员 Agent 分角色统计</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Agent</th><th>角色</th><th>调用</th><th>成功率</th><th>平均耗时</th><th>P95</th><th>Token</th><th>最后调用</th></tr></thead>
            <tbody>
              <tr v-for="agent in agentRows" :key="agent.project">
                <td><strong>{{ agent.project }}</strong></td>
                <td><span class="role-badge" :class="{ main: agent.isMain }">{{ agent.isMain ? '群聊主 Agent' : '成员 Agent' }}</span></td>
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
          <div><span class="panel-kicker">RECENT EXECUTIONS</span><h3>该群最近执行记录</h3></div>
          <span class="panel-note">最多展示 30 条真实采集事件</span>
        </div>
        <div v-if="recentEvents.length" class="event-list">
          <article v-for="event in recentEvents" :key="event.id" class="event-row">
            <span class="event-state" :class="event.success ? 'success' : 'failed'">{{ event.success ? '✓' : '!' }}</span>
            <div class="event-main">
              <div><strong>{{ event.agent }}</strong><span class="role-badge" :class="{ main: event.role === 'main_agent' }">{{ event.role === 'main_agent' ? '群聊主 Agent' : '成员 Agent' }}</span><span>{{ sourceLabel(event.source) }}</span></div>
              <p v-if="event.error">{{ event.error }}</p>
              <p v-else>{{ event.runtime || '默认运行时' }} · {{ formatTime(event.at) }}</p>
            </div>
            <div class="event-metrics"><span>{{ formatDuration(event.durationMs) }}</span><span v-if="event.usageReported">{{ formatTokens(safeNumber(event.inputTokens) + safeNumber(event.outputTokens)) }} Token</span><span v-if="event.fileChangeCount">{{ event.fileChangeCount }} 个文件</span></div>
            <code v-if="event.traceId || event.taskId" :title="event.traceId || event.taskId">{{ (event.traceId || event.taskId).slice(0, 18) }}</code>
          </article>
        </div>
        <div v-else class="event-empty">该群尚无新版执行事件。下一次主 Agent 或成员 Agent 调用后会自动出现。</div>
      </section>

      <footer class="page-foot">
        <span>页面刷新：{{ loadedAt ? loadedAt.toLocaleTimeString('zh-CN', { hour12: false }) : '—' }}</span>
        <span>指标版本 v{{ payload.metrics?.version || 1 }}</span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.metrics-page{height:100%;overflow:auto;padding:24px 28px 40px;background:linear-gradient(180deg,rgba(248,250,252,.72),rgba(248,250,252,.18));color:var(--text-primary)}
.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:20px}.eyebrow,.panel-kicker{display:block;color:var(--accent-blue);font-size:9px;font-weight:900;letter-spacing:.16em}.page-header h2{margin:5px 0 4px;font-size:23px;letter-spacing:-.03em}.page-header p{margin:0;color:var(--text-muted);font-size:12px}.toolbar{display:flex;align-items:flex-end;gap:9px}.toolbar label{display:flex;flex-direction:column;gap:5px}.toolbar label span{color:var(--text-muted);font-size:9px;font-weight:800}.toolbar select,.refresh-btn{height:35px;border:1px solid rgba(148,163,184,.2);border-radius:9px;background:rgba(255,255,255,.82);color:var(--text-primary);font-size:11px;font-weight:700;outline:none}.toolbar select{min-width:156px;padding:0 30px 0 10px}.toolbar label:nth-child(2) select{min-width:100px}.refresh-btn{display:flex;align-items:center;gap:5px;padding:0 13px;cursor:pointer}.refresh-btn:hover{border-color:rgba(59,130,246,.4);color:var(--accent-blue)}.refresh-btn:disabled{opacity:.6;cursor:wait}.spinning{display:inline-block;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.state-banner,.scope-strip,.legacy-notice,.panel,.kpi-card,.empty-state{border:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.72);box-shadow:0 10px 30px rgba(15,23,42,.035)}.state-banner{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:12px;margin-bottom:16px}.state-banner div{display:flex;flex-direction:column;gap:3px}.state-banner strong{font-size:12px}.state-banner span{font-size:11px;color:var(--text-muted)}.state-banner button{border:0;border-radius:8px;background:var(--accent-blue);color:white;padding:7px 12px}.error-state{border-color:rgba(239,68,68,.25);background:rgba(254,242,242,.8)}
.loading-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.skeleton{height:128px;border-radius:14px;background:linear-gradient(90deg,rgba(226,232,240,.45),rgba(248,250,252,.9),rgba(226,232,240,.45));background-size:220% 100%;animation:shimmer 1.4s infinite}@keyframes shimmer{to{background-position:-220% 0}}.empty-state{border-radius:16px;padding:70px 20px;text-align:center}.empty-icon{font-size:38px;color:var(--accent-blue)}.empty-state h3{font-size:16px;margin:12px 0 7px}.empty-state p{font-size:12px;color:var(--text-muted)}
.scope-strip{display:grid;grid-template-columns:minmax(210px,1fr) minmax(270px,1.4fr) auto;align-items:center;gap:18px;border-radius:14px;padding:13px 15px;margin-bottom:10px}.scope-main,.scope-status{display:flex;align-items:center;gap:10px}.scope-avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,#2563eb,#7c3aed);color:#fff;font-weight:900}.scope-main div,.scope-status{min-width:0}.scope-main div{display:flex;flex-direction:column;gap:2px}.scope-main strong{font-size:12.5px}.scope-main div span,.scope-status span{color:var(--text-muted);font-size:10px}.scope-status{display:grid;grid-template-columns:auto auto 1fr}.scope-status i{width:8px;height:8px;border-radius:50%;background:#94a3b8}.scope-status.live i{background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.12)}.scope-status.idle i{background:#3b82f6}.scope-status.stale i{background:#f59e0b}.scope-status strong{font-size:11px}.scope-status span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.scope-meta{display:flex;flex-direction:column;align-items:flex-end;gap:3px}.scope-meta span{font-size:9px;color:var(--text-muted)}.scope-meta code{font-size:9px;color:var(--accent-blue);background:rgba(59,130,246,.08);padding:3px 6px;border-radius:5px}.legacy-notice{display:flex;justify-content:space-between;gap:15px;margin-bottom:14px;padding:9px 13px;border-radius:10px;border-color:rgba(245,158,11,.2);background:rgba(255,251,235,.72);color:#92400e;font-size:10px}.legacy-notice small{white-space:nowrap;font-weight:800}
.kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-bottom:13px}.kpi-card{position:relative;min-height:112px;border-radius:13px;padding:14px 15px;overflow:hidden}.kpi-card:after{content:"";position:absolute;right:-18px;bottom:-22px;width:68px;height:68px;border-radius:50%;background:rgba(59,130,246,.08);filter:blur(4px)}.kpi-card.primary{background:linear-gradient(135deg,rgba(37,99,235,.95),rgba(79,70,229,.9));color:#fff}.kpi-card.primary p,.kpi-card.primary .kpi-head{color:rgba(255,255,255,.72)}.kpi-card.critical{border-color:rgba(239,68,68,.28)}.kpi-card.warning{border-color:rgba(245,158,11,.28)}.kpi-head{display:flex;justify-content:space-between;color:var(--text-muted);font-size:10px;font-weight:800}.kpi-head i{font-style:normal;font-family:monospace;opacity:.45}.kpi-card>strong{display:block;margin-top:12px;font-size:25px;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.035em}.kpi-card>strong.time-value{font-size:20px}.kpi-card p{position:relative;z-index:1;margin:9px 0 0;color:var(--text-muted);font-size:9.5px;line-height:1.45}
.overview-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(330px,1fr);gap:13px;margin-bottom:13px}.panel{border-radius:14px;overflow:hidden}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:14px 16px;border-bottom:1px solid rgba(148,163,184,.13)}.panel-head h3{font-size:12.5px;margin:3px 0 0}.panel-note{font-size:9.5px;color:var(--text-muted)}.legend{display:flex;gap:12px;color:var(--text-muted);font-size:9px}.legend span{display:flex;align-items:center;gap:5px}.legend i{width:7px;height:7px;border-radius:2px}.legend .ok{background:#2563eb}.legend .fail{background:#ef4444}.chart{position:relative;display:flex;align-items:flex-end;gap:6px;height:190px;padding:25px 16px 13px}.chart-column{display:flex;flex:1;min-width:0;height:100%;flex-direction:column;align-items:center}.chart-value{height:15px;font:8px ui-monospace,monospace;color:var(--text-muted)}.bar-track{display:flex;align-items:flex-end;width:min(70%,28px);height:125px;border-radius:5px;background:rgba(148,163,184,.08);overflow:hidden}.bar-total{position:relative;width:100%;min-height:2px;background:#ef4444;border-radius:4px 4px 0 0;overflow:hidden;transition:height .3s}.bar-success{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,#60a5fa,#2563eb)}.chart-label{margin-top:7px;color:var(--text-muted);font-size:8px;white-space:nowrap}.chart-empty{margin:-112px 0 83px;text-align:center;color:var(--text-muted);font-size:10px;pointer-events:none}.live-dot{font-size:8px;font-weight:900;letter-spacing:.12em;color:#059669;background:rgba(16,185,129,.1);border-radius:99px;padding:5px 8px}.runtime-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;padding:7px 16px 13px}.runtime-grid>div{min-height:69px;padding:11px 8px;border-bottom:1px solid rgba(148,163,184,.1)}.runtime-grid>div:nth-last-child(-n+2){border-bottom:0}.runtime-grid span{display:block;color:var(--text-muted);font-size:9px}.runtime-grid strong{display:block;margin-top:5px;font-size:15px}.runtime-grid strong.sample-time{font-size:10px;margin-top:8px}.runtime-grid small{display:block;margin-top:5px;color:var(--text-muted);font-size:8px}.meter{height:3px;margin-top:7px;border-radius:3px;background:rgba(148,163,184,.14);overflow:hidden}.meter i{display:block;height:100%;background:linear-gradient(90deg,#2563eb,#8b5cf6);border-radius:inherit}
.agent-panel,.event-panel{margin-bottom:13px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:790px}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid rgba(148,163,184,.1);font-size:10px;white-space:nowrap}th{color:var(--text-muted);font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;background:rgba(248,250,252,.46)}td strong{font-size:10.5px}tbody tr:last-child td{border-bottom:0}tbody tr:hover{background:rgba(59,130,246,.025)}.role-badge{display:inline-flex;border-radius:99px;padding:3px 7px;background:rgba(100,116,139,.09);color:var(--text-muted);font-size:8px;font-weight:800}.role-badge.main{background:rgba(79,70,229,.1);color:#4f46e5}.rate{color:#059669;font-weight:800}.rate.bad{color:#dc2626}
.runtime-empty{display:grid;place-items:center;min-height:220px;padding:30px;text-align:center;color:var(--text-muted);font-size:10px}
.event-list{padding:2px 14px 8px}.event-row{display:grid;grid-template-columns:27px minmax(0,1fr) auto minmax(80px,140px);align-items:center;gap:10px;padding:10px 2px;border-bottom:1px solid rgba(148,163,184,.1)}.event-row:last-child{border-bottom:0}.event-state{display:grid;place-items:center;width:22px;height:22px;border-radius:7px;font-size:10px;font-weight:900}.event-state.success{background:rgba(16,185,129,.1);color:#059669}.event-state.failed{background:rgba(239,68,68,.1);color:#dc2626}.event-main{min-width:0}.event-main>div{display:flex;align-items:center;gap:7px}.event-main strong{font-size:10.5px}.event-main>div>span:last-child{color:var(--text-muted);font-size:9px}.event-main p{margin:3px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:9px}.event-metrics{display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-size:9px;color:var(--text-secondary)}.event-row code{overflow:hidden;text-overflow:ellipsis;color:var(--text-muted);font-size:8px;background:rgba(100,116,139,.06);padding:4px 6px;border-radius:5px}.event-empty{padding:38px;text-align:center;color:var(--text-muted);font-size:10px}.page-foot{display:flex;justify-content:space-between;padding:2px 3px;color:var(--text-muted);font-size:8.5px}
:global([data-theme="dark"]) .metrics-page{background:linear-gradient(180deg,rgba(2,6,23,.42),rgba(15,23,42,.08))}:global([data-theme="dark"]) .scope-strip,:global([data-theme="dark"]) .legacy-notice,:global([data-theme="dark"]) .panel,:global([data-theme="dark"]) .kpi-card,:global([data-theme="dark"]) .empty-state,:global([data-theme="dark"]) .state-banner{background:rgba(15,23,42,.72);border-color:rgba(148,163,184,.13);box-shadow:0 14px 35px rgba(0,0,0,.15)}:global([data-theme="dark"]) .toolbar select,:global([data-theme="dark"]) .refresh-btn{background:rgba(15,23,42,.82);border-color:rgba(148,163,184,.2)}:global([data-theme="dark"]) .legacy-notice{background:rgba(120,53,15,.18);color:#fbbf24}:global([data-theme="dark"]) th{background:rgba(2,6,23,.2)}
@media(max-width:1050px){.page-header{align-items:flex-start;flex-direction:column}.toolbar{width:100%;flex-wrap:wrap}.toolbar label:first-child{flex:1}.toolbar label:first-child select{width:100%}.scope-strip{grid-template-columns:1fr 1fr}.scope-meta{display:none}.overview-grid{grid-template-columns:1fr}.kpi-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.metrics-page{padding:16px 14px 32px}.toolbar{align-items:stretch}.toolbar label{flex:1}.toolbar select{width:100%;min-width:0}.refresh-btn{align-self:flex-end}.scope-strip{grid-template-columns:1fr}.scope-status{grid-template-columns:auto auto;}.scope-status span{grid-column:2;white-space:normal}.kpi-grid{grid-template-columns:1fr}.chart{gap:2px;padding-left:8px;padding-right:8px}.chart-label{font-size:7px;transform:rotate(-45deg);transform-origin:center}.runtime-grid{grid-template-columns:1fr}.runtime-grid>div{border-bottom:1px solid rgba(148,163,184,.1)!important}.event-row{grid-template-columns:27px minmax(0,1fr) auto}.event-row code{display:none}}
</style>
