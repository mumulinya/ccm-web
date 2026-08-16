<script setup>
import { computed } from 'vue'
import {
  Clock3,
  History,
  Scissors,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from '@lucide/vue'

const props = defineProps({ state: { type: Object, default: null } })

const status = computed(() => String(props.state?.status || 'historical_unrecorded'))
const hasReceipt = computed(() => props.state?.hasReceipt === true)
const statusLabel = computed(() => ({
  applied: '已执行',
  skipped: '本轮未触发',
  invalid_receipt: '回执校验失败',
  historical_unrecorded: '历史数据未记录',
}[status.value] || '暂无记录'))

const reasonLabel = computed(() => ({
  assistant_gap_exceeded_threshold: '会话空闲超过设定时间，旧缓存已失效',
  cold_prompt_cache_old_tool_results: '会话空闲后缓存已变冷，只整理足够旧的工具结果',
  context_pressure_old_tool_results: '上下文接近正式压缩门限，只整理足够旧的工具结果',
  gap_under_threshold: '空闲时间尚未达到触发线',
  trigger_below_threshold: '空闲时间和上下文压力均未达到触发线',
  not_enough_compactable_tool_results: '可清理的旧工具结果不足',
  no_old_completed_tool_results: '没有符合年龄、配对和安全条件的旧工具结果',
  matching_tool_results_missing: '没有找到完整配对的旧工具结果',
  last_assistant_timestamp_missing: '缺少可核验的上一轮时间',
  main_thread_supported_trigger_required: '当前不是可执行 MicroCompact 的主会话投影',
  trigger_evidence_missing: '缺少可核验的时间或上下文压力证据',
  disabled: '功能当前已关闭',
  receipt_missing: '该记录生成时没有保存 MicroCompact 回执',
}[String(props.state?.reason || '')] || '按当前会话状态完成评估'))

const triggerLabel = computed(() => props.state?.trigger === 'context_pressure' ? '上下文压力' : props.state?.trigger === 'time_based' ? '空闲时间' : '未触发')
const formatNumber = value => Number(value || 0).toLocaleString('zh-CN')
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN') : '未记录'
</script>

<template>
  <section v-if="state?.applicable" class="microcompact-panel" :data-status="status">
    <div class="microcompact-head">
      <div class="microcompact-title">
        <span class="microcompact-icon"><Scissors :size="16" /></span>
        <div class="title-text">
          <small>MICROCOMPACT</small>
          <h4>旧工具结果整理</h4>
        </div>
      </div>
      <span class="status-badge" :class="status">
        <ShieldCheck v-if="state?.receiptValid" :size="13" />
        <ShieldX v-else-if="status === 'invalid_receipt'" :size="13" />
        <History v-else :size="13" />
        <span>{{ statusLabel }}</span>
      </span>
    </div>

    <template v-if="hasReceipt">
      <div class="microcompact-metrics">
        <div class="metric-block">
          <small>触发方式</small>
          <strong>{{ triggerLabel }}</strong>
        </div>
        <div class="metric-block">
          <small>清理旧结果</small>
          <strong class="font-mono">{{ formatNumber(state.clearedToolResultCount) }} 个</strong>
        </div>
        <div class="metric-block">
          <small>保留近期结果</small>
          <strong class="font-mono">{{ formatNumber(state.keptToolResultCount) }} 个</strong>
        </div>
        <div class="metric-block highlight">
          <small>节省上下文</small>
          <strong class="font-mono text-saved">{{ formatNumber(state.tokensSaved) }} tokens</strong>
        </div>
      </div>
      <p class="microcompact-reason">{{ reasonLabel }}</p>
      <div class="microcompact-meta">
        <span><Clock3 :size="12" />{{ formatTime(state.evaluatedAt) }}</span>
        <span>原始会话 {{ state.rawTranscriptPreserved ? '完整保留' : '状态异常' }}</span>
        <span :title="state.receiptChecksum" class="font-mono">
          回执 {{ state.receiptValid ? '已核验' : '未通过' }}{{ state.receiptChecksum ? ` · ${state.receiptChecksum.slice(0, 10)}` : '' }}
        </span>
      </div>
    </template>

    <div v-else class="historical-note">
      <History :size="16" />
      <div>
        <strong>没有可核验的执行回执</strong>
        <p>{{ reasonLabel }}。原始会话仍然完整保留，页面不会推算或补造历史节省量。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.microcompact-panel {
  margin: 14px 0 18px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.microcompact-panel[data-status='applied'] {
  border-left-color: var(--accent-green, #10b981);
}

.microcompact-panel[data-status='invalid_receipt'] {
  border-left-color: var(--accent-red, #ef4444);
}

.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.text-saved {
  color: var(--accent-green, #10b981) !important;
}

.microcompact-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.microcompact-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.microcompact-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: var(--accent-green, #10b981);
  background: var(--success-soft, rgba(16, 185, 129, 0.1));
}

.title-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.title-text small {
  color: var(--text-muted);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.title-text h4 {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--panel-muted);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.applied {
  border-color: color-mix(in srgb, var(--accent-green, #10b981) 40%, transparent);
  color: var(--accent-green, #10b981);
  background: var(--success-soft, rgba(16, 185, 129, 0.1));
}

.status-badge.invalid_receipt {
  border-color: color-mix(in srgb, var(--accent-red, #ef4444) 40%, transparent);
  color: var(--accent-red, #ef4444);
  background: var(--danger-soft, rgba(239, 68, 68, 0.1));
}

.microcompact-metrics {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
}

.metric-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-block small {
  color: var(--text-muted);
  font-size: 10.5px;
}

.metric-block strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.microcompact-reason {
  margin: 10px 0 6px;
  color: var(--text-secondary);
  font-size: 11.5px;
  line-height: 1.5;
}

.microcompact-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--text-muted);
  font-size: 10.5px;
}

.microcompact-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.historical-note {
  margin-top: 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--text-secondary);
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--bg-primary);
}

.historical-note > svg {
  flex-shrink: 0;
  color: var(--text-muted);
  margin-top: 2px;
}

.historical-note strong {
  font-size: 12px;
  color: var(--text-primary);
}

.historical-note p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}

@media (max-width: 680px) {
  .microcompact-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}
</style>
