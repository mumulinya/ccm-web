<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Gauge, RefreshCw, X } from '@lucide/vue'

const props = defineProps({
  usage: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  compacting: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh'])
const rootEl = ref(null)
const detailsOpen = ref(false)

const currentTokens = computed(() => Math.max(0, Number(props.usage?.currentTokens || 0)))
const contextWindow = computed(() => Math.max(0, Number(props.usage?.effectiveContextWindow || 0)))
const autoCompactThreshold = computed(() => Math.max(0, Number(props.usage?.autoCompactThreshold || 0)))
const contextPercent = computed(() => contextWindow.value > 0
  ? Math.max(0, Math.round((currentTokens.value / contextWindow.value) * 1000) / 10)
  : 0)
const compactPercent = computed(() => autoCompactThreshold.value > 0
  ? Math.max(0, Math.round((currentTokens.value / autoCompactThreshold.value) * 100))
  : 0)
const isCompacting = computed(() => props.compacting || props.usage?.compacting === true || props.usage?.compactionActivity?.active === true)

const state = computed(() => {
  if (props.error) return 'unavailable'
  if (isCompacting.value) return 'compacting'
  if (props.usage?.circuitOpen) return 'blocked'
  if (contextWindow.value > 0 && currentTokens.value >= contextWindow.value) return 'critical'
  if (autoCompactThreshold.value > 0 && currentTokens.value >= autoCompactThreshold.value) return 'threshold'
  if (compactPercent.value >= 85) return 'warning'
  return 'normal'
})

const stateLabel = computed(() => ({
  normal: '上下文正常',
  warning: '接近自动压缩线',
  threshold: '已到自动压缩线',
  critical: '已超过模型上下文',
  compacting: '正在压缩上下文',
  blocked: '压缩已熔断',
  unavailable: '上下文信息暂不可用',
})[state.value])

const formatTokens = value => {
  const tokens = Number(value || 0)
  if (tokens >= 1_000_000) return `${Number((tokens / 1_000_000).toFixed(tokens % 1_000_000 ? 1 : 0))}M`
  if (tokens >= 1_000) return `${Number((tokens / 1_000).toFixed(tokens % 1_000 ? 1 : 0))}K`
  return String(tokens)
}

const accessibleLabel = computed(() => props.usage
  ? `${contextPercent.value}% context used, ${formatTokens(currentTokens.value)} / ${formatTokens(contextWindow.value)} tokens`
  : stateLabel.value)
const tokenSourceLabel = computed(() => ({
  provider_usage_plus_estimate: 'Provider 实测 + 后续增量',
  provider_usage: 'Provider 实测',
  context_pressure_sample: '完整上下文采样',
  model_visible_payload: '完整模型可见上下文估算',
  message_estimate: '会话消息估算',
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
  if (providerRemainder > 0) rows.push({ key: 'providerRemainder', label: 'Provider observed remainder', tokens: providerRemainder, tone: 'remainder' })
  const usedDenominator = Math.max(1, currentTokens.value, rows.reduce((sum, row) => sum + row.tokens, 0))
  return rows.map(row => ({
    ...row,
    usedPercent: Math.round((row.tokens / usedDenominator) * 1000) / 10,
    capacityPercent: contextWindow.value > 0 ? Math.max(0, (row.tokens / contextWindow.value) * 100) : 0,
  }))
})
const compactStateLabel = computed(() => {
  if (isCompacting.value) return '正在压缩'
  if (props.usage?.circuitOpen) return '压缩熔断'
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
  model_visible_payload_estimate: '完整模型可见上下文估算',
  encrypted_transcript_estimate: '加密会话原文估算',
  message_estimate: '会话消息估算',
})[String(props.usage?.tokenMeasurement?.method || '')] || tokenSourceLabel.value)
const sessionLabel = computed(() => String(props.usage?.label || props.usage?.id || '当前会话').replace(/^session:/, ''))
const thresholdPercent = computed(() => autoCompactThreshold.value > 0 && contextWindow.value > 0
  ? Math.min(100, Math.round((autoCompactThreshold.value / contextWindow.value) * 1000) / 10)
  : 0)
const toggleDetails = () => {
  detailsOpen.value = !detailsOpen.value
  emit('refresh')
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
onMounted(() => document.addEventListener('pointerdown', closeDetails))
onUnmounted(() => document.removeEventListener('pointerdown', closeDetails))
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
    <span>{{ usage ? `${contextPercent}%` : '--' }}</span>
    <div v-if="detailsOpen" class="context-usage-popover" role="dialog" aria-label="当前会话上下文详情" @click.stop>
      <header class="context-popover-header">
        <div><span>CONTEXT</span><strong>{{ usage ? `${contextPercent}% Full` : stateLabel }}</strong></div>
        <button type="button" class="context-popover-close" aria-label="关闭上下文详情" @click="detailsOpen = false"><X :size="14" /></button>
      </header>
      <div v-if="usage" class="context-popover-session">{{ sessionLabel }}<span>{{ compactStateLabel }}</span></div>
      <div v-if="usage" class="context-popover-total"><span>模型可见上下文</span><b>~{{ formatTokens(currentTokens) }} / {{ formatTokens(contextWindow) }} Tokens</b></div>
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
      <div v-if="usage" class="context-popover-meta">
        <span><strong>摘要</strong>{{ summarySourceLabel }}</span>
        <span><strong>计量</strong>{{ measurementMethodLabel }}</span>
        <span><strong>更新于</strong>{{ tokenUpdatedAt }}</span>
      </div>
      <small v-else class="context-popover-empty">{{ error || '正在读取当前会话...' }}</small>
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
.session-context-usage.is-unavailable { color: var(--text-muted, #64748b); }

.context-usage-popover {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  z-index: 80;
  width: min(380px, calc(100vw - 24px));
  padding: 14px;
  border: 1px solid #cbd8d1;
  border-radius: 10px;
  background: #fff;
  color: #25342d;
  box-shadow: 0 18px 44px rgba(20, 40, 30, .20), 0 3px 10px rgba(20, 40, 30, .08);
  text-align: left;
}
.context-popover-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding-bottom: 11px; border-bottom: 1px solid #edf1ee; }
.context-popover-header div { display: grid; gap: 5px; }.context-popover-header span { color: #60746a; font-family: var(--font-mono, monospace); font-size: 10px; letter-spacing: 0; }.context-popover-header strong { color: #1d3027; font-size: 14px; font-weight: 750; }
.context-popover-close { width: 24px; height: 24px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: #edf1ee; color: #61746a; cursor: pointer; }.context-popover-close:hover { background: #dfeae3; color: #1b5c44; }
.context-popover-session { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 0 4px; color: #6d7e75; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.context-popover-session span { flex: 0 0 auto; color: #168260; font-size: 10px; font-weight: 700; }
.context-popover-total { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 0 8px; color: #6c7c73; font-size: 10px; }.context-popover-total b { color: #273b31; font-family: var(--font-mono, monospace); font-size: 11px; font-weight: 600; }
.context-meter { position: relative; display: flex; height: 8px; overflow: hidden; border-radius: 4px; background: #edf1ef; }.context-meter-segment { display: block; flex: 0 0 auto; height: 100%; transition: width .25s ease; }.context-meter-segment + .context-meter-segment { box-shadow: inset 1px 0 rgba(255,255,255,.55); }.context-meter-threshold { position: absolute; top: 0; bottom: 0; z-index: 2; width: 2px; background: #bd7b27; box-shadow: 0 0 0 1px rgba(255,255,255,.6); }
.context-meter-labels { display: flex; justify-content: space-between; gap: 6px; padding: 5px 0 10px; color: #87958d; font-family: var(--font-mono, monospace); font-size: 8px; }.context-meter-labels span:nth-child(2) { color: #aa741f; }
.context-breakdown { display: grid; gap: 0; max-height: 246px; overflow: auto; padding: 4px 0 5px; border-top: 1px solid #edf1ee; border-bottom: 1px solid #edf1ee; }.context-breakdown-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 27px; color: #394a41; font-size: 10px; }.context-breakdown-name { display: inline-flex; align-items: center; min-width: 0; gap: 8px; }.context-breakdown-name i { width: 10px; height: 10px; flex: 0 0 auto; border-radius: 2px; background: #7c8b83; }.tone-system { background: #777d7a !important; }.tone-tools { background: #7654d9 !important; }.tone-rules { background: #188d65 !important; }.tone-skills { background: #c58928 !important; }.tone-mcp { background: #bd438c !important; }.tone-subagents { background: #398dc0 !important; }.tone-summary { background: #d12858 !important; }.tone-conversation { background: #db6b42 !important; }.tone-request { background: #287f9d !important; }.tone-recovery { background: #745dc9 !important; }.tone-hooks { background: #4e9d7a !important; }.tone-bootstrap { background: #3d728f !important; }.tone-hydration { background: #a85791 !important; }.tone-envelope { background: #5f6f68 !important; }.tone-remainder { background: #a2aea8 !important; }.context-breakdown-value { display: inline-flex; align-items: baseline; justify-content: flex-end; gap: 7px; min-width: 78px; }.context-breakdown-row b { color: #52645a; font-family: var(--font-mono, monospace); font-size: 10px; font-weight: 600; }.context-breakdown-row small { min-width: 31px; color: #91a098; font-family: var(--font-mono, monospace); font-size: 8px; text-align: right; }.context-breakdown-empty, .context-popover-empty { padding: 8px 0; color: #84928a; font-size: 10px; line-height: 1.5; }
.context-popover-meta { display: grid; gap: 5px; padding-top: 10px; color: #7b8a82; font-size: 9px; }.context-popover-meta span { display: flex; justify-content: space-between; gap: 8px; }.context-popover-meta strong { color: #53665b; font-weight: 700; }

.context-spinner { animation: context-spin 0.9s linear infinite; }
@keyframes context-spin { to { transform: rotate(360deg); } }

@media (max-width: 520px) {
  .session-context-usage { min-width: 46px; padding: 0 6px; }
  .context-usage-popover { position: fixed; right: 12px; bottom: 82px; left: 12px; width: auto; max-height: calc(100vh - 106px); overflow: auto; }
}
</style>
