<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Bot, ChevronDown, CircleDollarSign, FolderGit2, Gauge, RefreshCw, X } from '@lucide/vue'
import { subscribeRuntimeEvents } from '../../utils/runtimeEventBus.js'

const props = defineProps({
  usage: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  compacting: { type: Boolean, default: false },
  scope: { type: String, default: '' },
  scopeId: { type: String, default: '' },
  exactSessionId: { type: String, default: '' },
})

const emit = defineEmits(['refresh'])
const rootEl = ref(null)
const detailsOpen = ref(false)
const activeTab = ref('overview')
const runtimeStatus = ref(null)
const runtimeLoading = ref(false)
const runtimeError = ref('')
const expandedProjects = ref(new Set())
let runtimeTimer = null
let unsubscribeRuntimeEvents = null
const expandedCatalogKeys = ref(new Set())
const formatUsd = value => Number.isFinite(Number(value)) ? `$${Number(value).toFixed(Number(value) < 0.01 ? 4 : 2)}` : '未提供'
const runtimeUsage = computed(() => runtimeStatus.value?.usage || {})
const runtimeTokenLabel = computed(() => {
  if (runtimeUsage.value?.source !== 'provider_reported') return '未提供'
  const input = Number(runtimeUsage.value?.inputTokens)
  const output = Number(runtimeUsage.value?.outputTokens)
  if (!Number.isFinite(input) && !Number.isFinite(output)) return '未提供'
  return `${formatTokens(Number.isFinite(input) ? input : 0)} 输入 · ${formatTokens(Number.isFinite(output) ? output : 0)} 输出`
})
const workspaceSummary = computed(() => {
  const projects = runtimeStatus.value?.projects || []
  if (!projects.length) return '当前会话没有可读取的项目状态'
  const changed = projects.filter(project => project.dirty).length
  const conflict = projects.filter(project => project.risk === 'conflict').length
  if (conflict) return `${projects.length} 个项目 · ${conflict} 个分支存在冲突风险`
  if (changed) return `${projects.length} 个项目 · ${changed} 个工作区有改动`
  return `${projects.length} 个项目 · 工作区正常`
})
const projectExpanded = id => expandedProjects.value.has(id)
const toggleProject = id => {
  const next = new Set(expandedProjects.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  expandedProjects.value = next
}
const loadRuntimeStatus = async () => {
  if (!props.scope || !props.scopeId || !props.exactSessionId || runtimeLoading.value) return
  runtimeLoading.value = true
  runtimeError.value = ''
  try {
    const params = new URLSearchParams({ scope: props.scope, scope_id: props.scopeId, exact_session_id: props.exactSessionId })
    const response = await fetch(`/api/conversations/runtime-status?${params.toString()}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.success) throw new Error(payload?.error || '会话状态读取失败')
    runtimeStatus.value = payload.status || null
  } catch (error) {
    runtimeError.value = error?.message || '会话状态读取失败'
  } finally {
    runtimeLoading.value = false
  }
}
const scheduleRuntimeRefresh = () => {
  if (runtimeTimer) window.clearInterval(runtimeTimer)
  runtimeTimer = null
  if (!detailsOpen.value || !runtimeStatus.value?.task || ['done', 'failed', 'cancelled', 'canceled'].includes(String(runtimeStatus.value.task.state || '').toLowerCase())) return
  runtimeTimer = window.setInterval(loadRuntimeStatus, 10000)
}

const currentTokens = computed(() => Math.max(0, Number(props.usage?.currentTokens || 0)))
const contextWindow = computed(() => Math.max(0, Number(props.usage?.effectiveContextWindow || 0)))
const autoCompactThreshold = computed(() => Math.max(0, Number(props.usage?.autoCompactThreshold || 0)))
const contextPercent = computed(() => contextWindow.value > 0
  ? Math.max(0, Math.round((currentTokens.value / contextWindow.value) * 1000) / 10)
  : 0)
const contextPercentLabel = computed(() => currentTokens.value > 0 && contextWindow.value > 0 && contextPercent.value === 0
  ? '<0.1%'
  : `${contextPercent.value}%`)
const compactPercent = computed(() => autoCompactThreshold.value > 0
  ? Math.max(0, Math.round((currentTokens.value / autoCompactThreshold.value) * 100))
  : 0)
const isCompacting = computed(() => props.compacting || props.usage?.compacting === true || props.usage?.compactionActivity?.active === true)

// 硬熔断（自动压缩被阻断）与软降级（压缩成功但摘要回退确定性算法）是两回事，
// 后端已分开上报，这里也分开展示，避免把降级误报成熔断。
const circuitBlocked = computed(() => props.usage?.circuitOpen === true)
const circuitWaitingRetry = computed(() => circuitBlocked.value && !!props.usage?.circuitAutoRetryAt)
const summaryDegraded = computed(() => props.usage?.summaryDegraded === true)

const state = computed(() => {
  if (props.error) return 'unavailable'
  if (isCompacting.value) return 'compacting'
  if (circuitBlocked.value) return 'blocked'
  if (contextWindow.value > 0 && currentTokens.value >= contextWindow.value) return 'critical'
  if (autoCompactThreshold.value > 0 && currentTokens.value >= autoCompactThreshold.value) return 'threshold'
  if (compactPercent.value >= 85) return 'warning'
  if (summaryDegraded.value) return 'degraded'
  return 'normal'
})

const stateLabel = computed(() => ({
  normal: '上下文正常',
  degraded: '摘要质量降级',
  warning: '接近自动压缩线',
  threshold: '已到自动压缩线',
  critical: '已超过模型上下文',
  compacting: '正在压缩上下文',
  blocked: circuitWaitingRetry.value ? '压缩熔断（等待自动重试）' : '压缩熔断（需人工重置）',
  unavailable: '上下文信息暂不可用',
})[state.value])

const formatTokens = value => {
  const tokens = Number(value || 0)
  if (tokens >= 1_000_000) return `${Number((tokens / 1_000_000).toFixed(tokens % 1_000_000 ? 1 : 0))}M`
  if (tokens >= 1_000) return `${Number((tokens / 1_000).toFixed(tokens % 1_000 ? 1 : 0))}K`
  return String(tokens)
}

const accessibleLabel = computed(() => props.usage
  ? `${contextPercentLabel.value} context used, ${formatTokens(currentTokens.value)} / ${formatTokens(contextWindow.value)} tokens`
  : stateLabel.value)
const tokenSourceLabel = computed(() => ({
  provider_usage_plus_estimate: 'Provider 实测 + 后续增量',
  provider_usage: 'Provider 实测',
  provider_payload_accounting: 'Provider 调用完整上下文',
  context_pressure_sample: '完整上下文采样',
  model_visible_payload: '完整模型可见上下文估算',
  model_visible_payload_projection: '当前模型可见上下文投影',
  message_estimate: '会话消息估算',
  project_transcript_estimate: '项目会话原文估算',
  post_compact_record: '压缩后门禁记录',
  empty: '暂无样本',
})[String(props.usage?.tokenSource || '')] || '模型可见上下文计量')
const tokenUpdatedAt = computed(() => props.usage?.tokenUpdatedAt
  ? new Date(props.usage.tokenUpdatedAt).toLocaleString('zh-CN')
  : '尚未记录')
const tokenBreakdown = computed(() => props.usage?.modelVisiblePayload?.tokenBreakdown
  || props.usage?.tokenMeasurement?.modelVisiblePayload?.tokenBreakdown
  || {})
const breakdownRows = computed(() => {
  const measurement = props.usage?.tokenMeasurement || {}
  const breakdown = tokenBreakdown.value
  const hasPayloadBreakdown = Object.keys(breakdown).length > 0
  const rows = [
    { key: 'system', label: hasPayloadBreakdown ? 'System prompt' : 'Fixed context', tokens: Number(hasPayloadBreakdown ? breakdown.system || 0 : measurement.estimatedFixedTokens || 0), tone: 'system' },
    { key: 'tools', label: 'Tool definitions', tokens: Number(breakdown.tools || 0), tone: 'tools' },
    { key: 'rules', label: 'Rules', tokens: Number(breakdown.rules || 0), tone: 'rules' },
    { key: 'skills', label: 'Skills', tokens: Number(breakdown.skills || 0), tone: 'skills' },
    { key: 'mcp', label: 'MCP & dynamic tools', tokens: Number(breakdown.mcpTools ?? breakdown.mcp ?? 0) + Number(breakdown.mcpResults || 0), tone: 'mcp' },
    { key: 'subagents', label: 'Subagent definitions', tokens: Number(breakdown.subagents || breakdown.subagentDefinitions || 0), tone: 'subagents' },
    { key: 'summary', label: 'Summarized conversation', tokens: Number(hasPayloadBreakdown ? breakdown.summary || 0 : measurement.estimatedSummaryTokens || 0), tone: 'summary' },
    { key: 'recentMessages', label: 'Conversation', tokens: Number(hasPayloadBreakdown ? breakdown.recentMessages || 0 : measurement.estimatedMessageTokens || 0), tone: 'conversation' },
    { key: 'currentRequest', label: 'Current request', tokens: Number(breakdown.currentRequest || 0), tone: 'request' },
    { key: 'recoveryContext', label: 'Recovery context', tokens: Number(hasPayloadBreakdown ? breakdown.recoveryContext || 0 : props.usage?.recoveryContextTokens || 0), tone: 'recovery' },
    { key: 'hookResults', label: 'Hooks', tokens: Number(hasPayloadBreakdown ? breakdown.hookResults || 0 : props.usage?.hookResultTokens || 0), tone: 'hooks' },
    { key: 'workerBootstrap', label: 'Worker bootstrap prompt', tokens: Number(breakdown.workerBootstrap || 0), tone: 'bootstrap' },
    { key: 'hydratedContext', label: 'MCP hydrated context', tokens: Number(breakdown.hydratedContext || 0), tone: 'hydration' },
    { key: 'providerEnvelope', label: 'Provider envelope', tokens: Number(breakdown.providerEnvelope || 0), tone: 'envelope' },
  ].filter(row => Number.isFinite(row.tokens) && row.tokens > 0)
  const accountedTokens = rows.reduce((sum, row) => sum + row.tokens, 0)
  const providerRemainder = Math.max(0, currentTokens.value - accountedTokens)
  if (providerRemainder > 0) rows.push({
    key: 'providerRemainder',
    label: hasPayloadBreakdown ? 'Provider 其余上下文' : '历史 Provider 总量（无分项快照）',
    tokens: providerRemainder,
    tone: 'remainder',
  })
  const usedDenominator = Math.max(1, currentTokens.value, rows.reduce((sum, row) => sum + row.tokens, 0))
  return rows.map(row => ({
    ...row,
    usedPercent: Math.round((row.tokens / usedDenominator) * 1000) / 10,
    capacityPercent: contextWindow.value > 0 ? Math.max(0, (row.tokens / contextWindow.value) * 100) : 0,
  }))
})
const conversationTokens = computed(() => breakdownRows.value
  .filter(row => ['summary', 'recentMessages', 'currentRequest'].includes(row.key))
  .reduce((sum, row) => sum + Number(row.tokens || 0), 0))
const dynamicContextTokens = computed(() => breakdownRows.value
  .filter(row => ['tools', 'skills', 'mcp', 'subagents', 'recoveryContext', 'hookResults', 'hydratedContext'].includes(row.key))
  .reduce((sum, row) => sum + Number(row.tokens || 0), 0))
const availableCatalog = computed(() => props.usage?.availableContextCatalog || {})
const deferredCatalogRows = computed(() => [
  { key: 'mcp', label: 'MCP 工具', tone: 'mcp', value: availableCatalog.value?.mcp || {} },
  { key: 'skills', label: 'Skills', tone: 'skills', value: availableCatalog.value?.skills || {} },
].map(row => ({
  ...row,
  configured: Math.max(0, Number(row.value?.configured || 0)),
  available: Math.max(0, Number(row.value?.available || 0)),
  loaded: Math.max(0, Number(row.value?.loaded || 0)),
  invoked: Math.max(0, Number(row.value?.invoked || 0)),
  loadedThisTurn: row.value?.loadedThisTurn === true,
  estimatedTokens: Math.max(0, Number(row.value?.estimatedTokensIfLoaded || 0)),
  items: (Array.isArray(row.value?.items) ? row.value.items : [])
    .map(item => ({
      name: String(item?.name || '').trim(),
      state: ['available', 'loaded', 'invoked', 'unavailable'].includes(String(item?.state || '')) ? String(item.state) : 'available',
      configured: item?.configured !== false,
      evidenceStatus: String(item?.evidenceStatus || ''),
      loadLevels: Array.isArray(item?.loadLevels) ? item.loadLevels : [],
      loadSources: Array.isArray(item?.loadSources) ? item.loadSources : [],
      loadedTokens: Math.max(0, Number(item?.loadedTokens || 0)),
      dropReasons: Array.isArray(item?.dropReasons) ? item.dropReasons : [],
      invocationCount: Math.max(0, Number(item?.invocationCount || 0)),
    }))
    .filter(item => item.name),
})).filter(row => row.items.length > 0))
const contextItemStateLabel = item => ({
  invoked: item.invocationCount > 1 ? `已调用 ${item.invocationCount} 次` : '已调用',
  loaded: item.loadLevels.includes('body') ? '正文已加载' : item.loadLevels.includes('schema') ? 'Schema 已加载' : '目录已加载',
  unavailable: '当前不可用',
  available: item.evidenceStatus === 'unproven' ? '可用 · 本轮状态未证明' : '可用 · 本轮未加载',
})[item.state] || '可用'
const contextItemSourceLabel = item => {
  if (item.loadSources.includes('post_compact_restored')) return '压缩边界恢复'
  if (item.loadSources.includes('always_load')) return '固定加载'
  if (item.loadSources.includes('same_run')) return '同 Run 加载'
  if (item.loadSources.includes('catalog')) return '目录可见'
  return ''
}
const catalogExpanded = key => expandedCatalogKeys.value.has(key)
const toggleCatalogRow = key => {
  const next = new Set(expandedCatalogKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedCatalogKeys.value = next
}
const compactStateLabel = computed(() => {
  if (isCompacting.value) return '正在压缩'
  if (circuitBlocked.value) return circuitWaitingRetry.value ? '压缩熔断（待重试）' : '压缩熔断（待重置）'
  if (summaryDegraded.value) return '摘要降级但压缩正常'
  if (props.usage?.summarySource) return '可继续对话'
  return '尚未压缩'
})
const summarySourceLabel = computed(() => ({
  model: '模型摘要',
  session_memory: '模型 Session Memory',
  'session-memory': '模型 Session Memory',
  local_selftest: '待模型重新验证',
  structured: '待模型重新验证',
  project_long_term_injection_estimate: '项目长期记忆注入估算',
})[String(props.usage?.summarySource || '').toLowerCase()] || '暂无正式摘要')
const measurementMethodLabel = computed(() => ({
  latest_provider_usage_plus_new_message_estimate: 'Provider 实测 + 后续增量',
  provider_usage_plus_complete_payload_accounting: 'Provider 实测 + 完整上下文分项',
  model_visible_payload_estimate: '完整模型可见上下文估算',
  current_model_visible_payload_projection: '当前模型可见上下文投影',
  encrypted_transcript_estimate: '加密会话原文估算',
  project_transcript_estimate: '项目会话原文估算',
  message_estimate: '会话消息估算',
})[String(props.usage?.tokenMeasurement?.method || '')] || tokenSourceLabel.value)
const sessionLabel = computed(() => String(props.usage?.label || props.usage?.id || '当前会话').replace(/^session:/, ''))
const thresholdPercent = computed(() => autoCompactThreshold.value > 0 && contextWindow.value > 0
  ? Math.min(100, Math.round((autoCompactThreshold.value / contextWindow.value) * 1000) / 10)
  : 0)
const toggleDetails = () => {
  detailsOpen.value = !detailsOpen.value
  emit('refresh')
  if (detailsOpen.value) loadRuntimeStatus()
  scheduleRuntimeRefresh()
}
const onRootKeydown = event => {
  if (event.key === 'Escape') {
    detailsOpen.value = false
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggleDetails()
  }
}
const closeDetails = event => {
  if (rootEl.value && !rootEl.value.contains(event.target)) detailsOpen.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', closeDetails)
  unsubscribeRuntimeEvents = subscribeRuntimeEvents(['task'], event => {
    if (event?.type === 'task.changed' && detailsOpen.value) loadRuntimeStatus()
  })
})
onUnmounted(() => { document.removeEventListener('pointerdown', closeDetails); unsubscribeRuntimeEvents?.(); if (runtimeTimer) window.clearInterval(runtimeTimer) })
watch(() => [props.scope, props.scopeId, props.exactSessionId], () => { runtimeStatus.value = null; if (detailsOpen.value) loadRuntimeStatus() })
watch(() => runtimeStatus.value?.task?.state, scheduleRuntimeRefresh)
watch(detailsOpen, scheduleRuntimeRefresh)
</script>

<template>
  <div
    ref="rootEl"
    class="session-context-usage"
    :class="`is-${state}`"
    role="button"
    tabindex="0"
    :aria-label="accessibleLabel"
    :aria-expanded="detailsOpen"
    @click.stop="toggleDetails"
    @keydown="onRootKeydown"
  >
    <RefreshCw v-if="loading || isCompacting" :size="13" class="context-spinner" />
    <Gauge v-else :size="14" />
    <span>{{ usage ? contextPercentLabel : '--' }}</span>
    <div v-if="detailsOpen" class="context-usage-popover" role="dialog" aria-label="当前会话上下文详情" @click.stop>
      <header class="context-popover-header">
        <div><span>SESSION STATUS</span><strong>{{ runtimeStatus?.task?.title || sessionLabel }}</strong></div>
        <button type="button" class="context-popover-close" aria-label="关闭上下文详情" @click="detailsOpen = false"><X :size="14" /></button>
      </header>
      <nav class="context-popover-tabs" aria-label="会话状态页签">
        <button type="button" :class="{ active: activeTab === 'overview' }" :aria-current="activeTab === 'overview' ? 'page' : undefined" @click="activeTab = 'overview'">概览</button>
        <button type="button" :class="{ active: activeTab === 'context' }" :aria-current="activeTab === 'context' ? 'page' : undefined" @click="activeTab = 'context'">上下文</button>
        <button type="button" class="context-runtime-refresh" title="刷新会话状态" @click="loadRuntimeStatus"><RefreshCw :size="12" :class="{ spinning: runtimeLoading }" /></button>
      </nav>
      <section v-if="activeTab === 'overview'" class="context-runtime-overview">
        <div v-if="runtimeStatus" class="context-runtime-grid">
          <article><Bot :size="15" /><span><small>当前模型</small><strong>{{ runtimeStatus.model?.displayName || '未提供' }}</strong><em v-if="runtimeStatus.model?.effort">{{ runtimeStatus.model.effort }}</em></span></article>
          <article><Gauge :size="15" /><span><small>任务阶段</small><strong>{{ runtimeStatus.task?.stage || '当前无正式任务' }}</strong><em v-if="runtimeStatus.task?.state">{{ runtimeStatus.task.state }}</em></span></article>
          <article><CircleDollarSign :size="15" /><span><small>本轮真实用量</small><strong>{{ runtimeTokenLabel }}</strong><em>{{ formatUsd(runtimeUsage.totalCostUsd) }}</em></span></article>
          <article><FolderGit2 :size="15" /><span><small>工作区</small><strong>{{ workspaceSummary }}</strong><em>{{ contextPercentLabel }} 上下文</em></span></article>
        </div>
        <div v-if="runtimeStatus?.projects?.length" class="context-runtime-projects">
          <button v-for="project in runtimeStatus.projects" :key="project.id" type="button" :class="['context-runtime-project', `risk-${project.risk}`]" :aria-expanded="projectExpanded(project.id)" @click="toggleProject(project.id)">
            <span class="context-runtime-project-main"><FolderGit2 :size="13" /><b>{{ project.name }}</b><small>{{ project.branch || 'Git 不可用' }}</small></span>
            <span>{{ project.dirty ? `${project.changedFiles} 个改动` : project.risk === 'unavailable' ? '状态不可用' : '干净' }}</span>
            <ChevronDown :size="13" :class="{ expanded: projectExpanded(project.id) }" />
            <small v-if="projectExpanded(project.id)" class="context-runtime-project-detail">领先 {{ project.ahead || 0 }} · 落后 {{ project.behind || 0 }} · {{ project.risk === 'conflict' ? '分支存在冲突风险' : project.dirty ? '存在未提交改动' : project.risk === 'unavailable' ? '无法读取仓库状态' : '工作区正常' }}</small>
          </button>
        </div>
        <small v-if="runtimeLoading && !runtimeStatus" class="context-popover-empty">正在读取会话状态...</small>
        <small v-else-if="runtimeError && !runtimeStatus" class="context-popover-empty">{{ runtimeError }}</small>
      </section>
      <template v-if="activeTab === 'context'">
      <div v-if="usage" class="context-popover-session">{{ sessionLabel }}<span>{{ compactStateLabel }}</span></div>
      <div v-if="usage" class="context-popover-total"><span>最近完整模型载荷</span><b>~{{ formatTokens(currentTokens) }} / {{ formatTokens(contextWindow) }} Tokens</b></div>
      <div v-if="usage" class="context-continuity-note">
        <span><b>会话正文 {{ formatTokens(conversationTokens) }}</b><small>消息与正式摘要</small></span>
        <p v-if="dynamicContextTokens > 0">系统规则和已启用工具保持可用；Skill、知识、源码及工具结果按需加载，因此每轮载荷会变化。会话原文和正式摘要不会被删除。</p>
        <p v-else>这里统计当前精确会话的消息与正式摘要；发生正式压缩时会保留可追溯摘要。</p>
      </div>
      <div v-if="usage" class="context-meter" aria-hidden="true">
        <span
          v-for="row in breakdownRows"
          :key="`meter-${row.key}`"
          class="context-meter-segment"
          :class="`tone-${row.tone}`"
          :style="{ width: `${row.capacityPercent}%` }"
        ></span>
        <i v-if="thresholdPercent" class="context-meter-threshold" :style="{ left: `${thresholdPercent}%` }"></i>
      </div>
      <div v-if="usage" class="context-meter-labels"><span>0</span><span>自动压缩 {{ formatTokens(autoCompactThreshold) }}</span><span>{{ formatTokens(contextWindow) }}</span></div>
      <div v-if="usage" class="context-breakdown">
        <div v-for="row in breakdownRows" :key="row.key" class="context-breakdown-row"><span class="context-breakdown-name"><i :class="`tone-${row.tone}`"></i>{{ row.label }}</span><span class="context-breakdown-value"><b>{{ formatTokens(row.tokens) }}</b><small>{{ row.usedPercent }}%</small></span></div>
        <div v-if="!breakdownRows.length" class="context-breakdown-empty">当前会话还没有可分解的模型上下文样本。</div>
      </div>
      <section v-if="usage && deferredCatalogRows.length" class="context-available-catalog">
        <header><strong>工具上下文</strong><small>逐项按真实载荷与调用回执统计</small></header>
        <div v-for="row in deferredCatalogRows" :key="`available-${row.key}`" class="context-available-row">
          <button type="button" class="context-available-summary" :aria-expanded="catalogExpanded(row.key)" @click="toggleCatalogRow(row.key)">
            <span><i :class="`tone-${row.tone}`"></i>{{ row.label }}<ChevronDown :size="13" :class="{ expanded: catalogExpanded(row.key) }" /></span>
            <b>{{ row.loaded }} 已加载 · {{ row.invoked }} 已调用</b>
          </button>
          <div class="context-available-state">
            <span>{{ row.available }} 可用 · {{ row.configured }} 项用户授权</span>
            <small v-if="row.estimatedTokens">全部加载约 {{ formatTokens(row.estimatedTokens) }} Tokens</small>
          </div>
          <div v-if="row.items.length && catalogExpanded(row.key)" class="context-available-items">
            <span v-for="item in row.items" :key="`${row.key}-${item.name}`" :class="`state-${item.state}`" :title="contextItemStateLabel(item)">
              <b>{{ item.name }}</b><small>{{ contextItemStateLabel(item) }}<template v-if="contextItemSourceLabel(item)"> · {{ contextItemSourceLabel(item) }}</template><template v-if="item.loadedTokens"> · {{ formatTokens(item.loadedTokens) }}</template></small>
            </span>
          </div>
        </div>
      </section>
      <div v-if="usage" class="context-popover-meta">
        <span><strong>摘要</strong>{{ summarySourceLabel }}</span>
        <span><strong>计量</strong>{{ measurementMethodLabel }}</span>
        <span><strong>更新于</strong>{{ tokenUpdatedAt }}</span>
      </div>
      <small v-else class="context-popover-empty">{{ error || '正在读取当前会话...' }}</small>
      </template>
    </div>
  </div>
</template>

<style scoped>
.session-context-usage {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 52px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--text-muted, #64748b) 24%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--surface, #fff) 92%, #64748b 8%);
  color: var(--text-secondary, #475569);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  white-space: nowrap;
}

.session-context-usage:hover,
.session-context-usage:focus-visible {
  border-color: color-mix(in srgb, currentColor 42%, transparent);
  outline: none;
}

.session-context-usage.is-warning,
.session-context-usage.is-threshold { color: #b45309; background: color-mix(in srgb, var(--surface, #fff) 90%, #f59e0b 10%); }
.session-context-usage.is-critical,
.session-context-usage.is-blocked { color: #dc2626; background: color-mix(in srgb, var(--surface, #fff) 90%, #ef4444 10%); }
.session-context-usage.is-compacting { color: #0369a1; background: color-mix(in srgb, var(--surface, #fff) 90%, #0ea5e9 10%); }
.session-context-usage.is-degraded { color: #7c3aed; background: color-mix(in srgb, var(--surface, #fff) 92%, #8b5cf6 8%); }
.session-context-usage.is-unavailable { color: var(--text-muted, #64748b); }

.context-usage-popover {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  z-index: 80;
  width: min(420px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  min-width: 0;
  box-sizing: border-box;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface-raised);
  color: var(--text-primary);
  box-shadow: 0 18px 44px rgba(20, 40, 30, .20), 0 3px 10px rgba(20, 40, 30, .08);
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
}
.context-popover-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; min-width: 0; padding-bottom: 11px; border-bottom: 1px solid var(--border-color); }
.context-popover-header div { display: grid; min-width: 0; gap: 5px; }.context-popover-header span { color: var(--text-muted); font-family: var(--font-mono, monospace); font-size: 10px; letter-spacing: 0; }.context-popover-header strong { color: var(--text-primary); font-size: 14px; font-weight: 750; overflow-wrap: anywhere; }
.context-popover-tabs { display: flex; align-items: center; gap: 4px; padding: 9px 0; border-bottom: 1px solid var(--border-color); }
.context-popover-tabs button { height: 27px; padding: 0 10px; border: 0; border-radius: 6px; color: var(--text-muted); background: transparent; font-size: 10px; font-weight: 650; cursor: pointer; }
.context-popover-tabs button.active { color: var(--text-primary); background: var(--panel-muted); }
.context-popover-tabs .context-runtime-refresh { width: 27px; margin-left: auto; padding: 0; display: inline-grid; place-items: center; }
.context-runtime-refresh .spinning { animation: context-spin .9s linear infinite; }
.context-runtime-overview { display: grid; gap: 11px; padding-top: 11px; }
.context-runtime-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.context-runtime-grid article { min-width: 0; display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 5px; padding: 9px; border: 1px solid color-mix(in srgb, var(--border-color) 75%, transparent); border-radius: 7px; background: color-mix(in srgb, var(--surface) 97%, transparent); }
.context-runtime-grid article > svg { margin-top: 2px; color: var(--text-muted); }
.context-runtime-grid article span { min-width: 0; display: grid; gap: 2px; }
.context-runtime-grid small { color: var(--text-muted); font-size: 8px; }
.context-runtime-grid strong { min-width: 0; overflow: hidden; color: var(--text-primary); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.context-runtime-grid em { color: var(--text-muted); font-size: 8px; font-style: normal; }
.context-runtime-projects { display: grid; border-top: 1px solid var(--border-color); }
.context-runtime-project { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto 16px; align-items: center; gap: 7px; padding: 8px 2px; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent); color: var(--text-secondary); background: transparent; font: inherit; font-size: 9px; text-align: left; cursor: pointer; }
.context-runtime-project-main { min-width: 0; display: grid; grid-template-columns: 18px minmax(0, auto) minmax(0, 1fr); align-items: center; gap: 4px; }
.context-runtime-project-main b { overflow: hidden; color: var(--text-primary); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.context-runtime-project-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.context-runtime-project > svg { transition: transform .16s ease; }.context-runtime-project > svg.expanded { transform: rotate(180deg); }
.context-runtime-project-detail { grid-column: 1 / -1; padding-left: 22px; color: var(--text-muted); line-height: 1.45; }
.context-runtime-project.risk-conflict > span:nth-child(2) { color: #dc2626; }.context-runtime-project.risk-changed > span:nth-child(2) { color: #b45309; }
.context-popover-close { width: 24px; height: 24px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: var(--panel-muted); color: var(--text-muted); cursor: pointer; }.context-popover-close:hover { background: var(--control-hover); color: var(--accent-green); }
.context-popover-session { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 0 4px; color: var(--text-muted); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.context-popover-session span { flex: 0 0 auto; color: var(--accent-green); font-size: 10px; font-weight: 700; }
.context-popover-total { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 10px; min-width: 0; padding: 7px 0 8px; color: var(--text-muted); font-size: 10px; }.context-popover-total b { color: var(--text-primary); font-family: var(--font-mono, monospace); font-size: 11px; font-weight: 600; white-space: nowrap; }
.context-continuity-note { display: grid; min-width: 0; gap: 7px; margin-bottom: 9px; padding: 9px 10px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--accent-cyan, #22d3ee) 18%, var(--border-color)); border-radius: 6px; background: color-mix(in srgb, var(--surface) 93%, var(--accent-cyan, #22d3ee) 7%); }
.context-continuity-note span { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; min-width: 0; gap: 3px 10px; }.context-continuity-note b { min-width: 0; color: var(--text-primary); font-size: 10px; }.context-continuity-note small { color: var(--text-muted); font-size: 9px; }.context-continuity-note p { min-width: 0; margin: 0; color: var(--text-secondary); font-size: 10px; line-height: 1.6; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
.context-meter { position: relative; display: flex; height: 8px; overflow: hidden; border-radius: 4px; background: var(--panel-muted); }.context-meter-segment { display: block; flex: 0 0 auto; height: 100%; transition: width .25s ease; }.context-meter-segment + .context-meter-segment { box-shadow: inset 1px 0 color-mix(in srgb, var(--surface) 70%, transparent); }.context-meter-threshold { position: absolute; top: 0; bottom: 0; z-index: 2; width: 2px; background: var(--accent-yellow); box-shadow: 0 0 0 1px var(--surface); }
.context-meter-labels { display: flex; justify-content: space-between; gap: 6px; padding: 5px 0 10px; color: var(--text-muted); font-family: var(--font-mono, monospace); font-size: 8px; }.context-meter-labels span:nth-child(2) { color: var(--accent-yellow); }
.context-breakdown { display: grid; gap: 0; max-height: 246px; overflow: auto; padding: 4px 0 5px; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }.context-breakdown-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 27px; color: var(--text-secondary); font-size: 10px; }.context-breakdown-name { display: inline-flex; align-items: center; min-width: 0; gap: 8px; }.context-breakdown-name i { width: 10px; height: 10px; flex: 0 0 auto; border-radius: 2px; background: var(--text-muted); }.tone-system { background: #777d7a !important; }.tone-tools { background: #7654d9 !important; }.tone-rules { background: #188d65 !important; }.tone-skills { background: #c58928 !important; }.tone-mcp { background: #bd438c !important; }.tone-subagents { background: #398dc0 !important; }.tone-summary { background: #d12858 !important; }.tone-conversation { background: #db6b42 !important; }.tone-request { background: #287f9d !important; }.tone-recovery { background: #745dc9 !important; }.tone-hooks { background: #4e9d7a !important; }.tone-bootstrap { background: #3d728f !important; }.tone-hydration { background: #a85791 !important; }.tone-envelope { background: #5f6f68 !important; }.tone-remainder { background: #a2aea8 !important; }.context-breakdown-value { display: inline-flex; align-items: baseline; justify-content: flex-end; gap: 7px; min-width: 78px; }.context-breakdown-row b { color: var(--text-secondary); font-family: var(--font-mono, monospace); font-size: 10px; font-weight: 600; }.context-breakdown-row small { min-width: 31px; color: var(--text-muted); font-family: var(--font-mono, monospace); font-size: 8px; text-align: right; }.context-breakdown-empty, .context-popover-empty { padding: 8px 0; color: var(--text-muted); font-size: 10px; line-height: 1.5; }
.context-available-catalog { display: grid; gap: 8px; padding: 10px 0 4px; border-bottom: 1px solid var(--border-color); }.context-available-catalog header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.context-available-catalog header strong { color: var(--text-primary); font-size: 10px; }.context-available-catalog header small { color: var(--text-muted); font-size: 8px; }.context-available-row { display: grid; gap: 5px; padding: 7px 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--panel-muted); }.context-available-summary, .context-available-state { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.context-available-summary{width:100%;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.context-available-summary:hover span{color:var(--text-primary)}.context-available-summary:focus-visible{outline:2px solid color-mix(in srgb,var(--accent-blue) 40%,transparent);outline-offset:3px;border-radius:3px}.context-available-summary span { display: inline-flex; align-items: center; gap: 7px; color: var(--text-secondary); font-size: 10px; }.context-available-summary span svg{color:var(--text-muted);transition:transform .16s ease}.context-available-summary span svg.expanded{transform:rotate(180deg)}.context-available-summary i { width: 9px; height: 9px; flex: 0 0 auto; border-radius: 2px; }.context-available-summary b { color: var(--text-primary); font-size: 9px; }.context-available-state { color: var(--text-secondary); font-size: 8px; }.context-available-state small { color: var(--text-muted); font-size: 8px; }.context-available-items { display: grid; gap: 4px; max-height: 96px; overflow: auto; }.context-available-items > span { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; min-width: 0; padding: 3px 0; border-top: 1px solid color-mix(in srgb, var(--border-color) 58%, transparent); }.context-available-items b { min-width: 0; overflow: hidden; color: var(--text-secondary); font-size: 8px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }.context-available-items small { color: var(--text-muted); font-size: 7px; white-space: nowrap; }.context-available-items .state-loaded small { color: var(--accent-cyan, #22d3ee); }.context-available-items .state-invoked small { color: var(--success-color, #22a979); }.context-available-items .state-unavailable small { color: var(--danger-color, #df5c65); }
@media(prefers-reduced-motion:reduce){.context-available-summary span svg{transition:none}}
.context-popover-meta { display: grid; gap: 5px; padding-top: 10px; color: var(--text-muted); font-size: 9px; }.context-popover-meta span { display: flex; justify-content: space-between; gap: 8px; }.context-popover-meta strong { color: var(--text-secondary); font-weight: 700; }

.context-spinner { animation: context-spin 0.9s linear infinite; }
@keyframes context-spin { to { transform: rotate(360deg); } }

@media (max-width: 520px) {
  .session-context-usage { min-width: 46px; padding: 0 6px; }
  .context-usage-popover { position: fixed; right: 12px; bottom: 82px; left: 12px; width: auto; max-height: calc(100vh - 106px); overflow: auto; }
  .context-runtime-grid { grid-template-columns: 1fr; }
}
</style>
