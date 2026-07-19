<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Gauge, RefreshCw } from '@lucide/vue'

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

const toggleDetails = () => {
  detailsOpen.value = !detailsOpen.value
  emit('refresh')
}
const closeDetails = event => {
  if (rootEl.value && !rootEl.value.contains(event.target)) detailsOpen.value = false
}
onMounted(() => document.addEventListener('pointerdown', closeDetails))
onUnmounted(() => document.removeEventListener('pointerdown', closeDetails))
</script>

<template>
  <button
    ref="rootEl"
    type="button"
    class="session-context-usage"
    :class="`is-${state}`"
    :aria-label="accessibleLabel"
    :aria-expanded="detailsOpen"
    @click.stop="toggleDetails"
    @keydown.esc="detailsOpen = false"
  >
    <RefreshCw v-if="loading || isCompacting" :size="13" class="context-spinner" />
    <Gauge v-else :size="14" />
    <span>{{ usage ? `${contextPercent}%` : '--' }}</span>
    <div class="context-usage-tooltip" :class="{ open: detailsOpen }" role="tooltip">
      <strong>{{ usage ? `${contextPercent}% context used` : stateLabel }}</strong>
      <span v-if="usage">{{ formatTokens(currentTokens) }} / {{ formatTokens(contextWindow) }} tokens</span>
      <small v-if="usage">自动压缩线 {{ formatTokens(autoCompactThreshold) }} · {{ stateLabel }}</small>
      <small v-if="usage">{{ tokenSourceLabel }} · 更新于 {{ tokenUpdatedAt }}</small>
      <small v-else>{{ error || '正在读取当前会话...' }}</small>
    </div>
  </button>
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

.context-usage-tooltip {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 80;
  display: none;
  width: max-content;
  min-width: 154px;
  max-width: min(260px, calc(100vw - 24px));
  padding: 9px 11px;
  border: 1px solid color-mix(in srgb, var(--text-muted, #64748b) 32%, transparent);
  border-radius: 7px;
  background: #111317;
  color: #f8fafc;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
  pointer-events: none;
  text-align: left;
}

.session-context-usage:hover .context-usage-tooltip,
.session-context-usage:focus-visible .context-usage-tooltip,
.context-usage-tooltip.open { display: flex; flex-direction: column; gap: 3px; }
.context-usage-tooltip strong { font-size: 12px; font-weight: 700; }
.context-usage-tooltip span { font-size: 12px; color: #d1d5db; }
.context-usage-tooltip small { font-size: 10px; color: #9ca3af; }

.context-spinner { animation: context-spin 0.9s linear infinite; }
@keyframes context-spin { to { transform: rotate(360deg); } }

@media (max-width: 520px) {
  .session-context-usage { min-width: 46px; padding: 0 6px; }
  .context-usage-tooltip { right: -6px; }
}
</style>
