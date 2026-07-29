<script setup>
import { computed } from 'vue'
import { Clock3, History, Scissors, ShieldCheck, ShieldX } from '@lucide/vue'

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
        <span class="microcompact-icon"><Scissors :size="17" /></span>
        <div><small>MICROCOMPACT</small><h4>旧工具结果整理</h4></div>
      </div>
      <span class="status-badge" :class="status">
        <ShieldCheck v-if="state?.receiptValid" :size="14" />
        <ShieldX v-else-if="status === 'invalid_receipt'" :size="14" />
        <History v-else :size="14" />
        {{ statusLabel }}
      </span>
    </div>

    <template v-if="hasReceipt">
      <div class="microcompact-metrics">
        <span><small>触发方式</small><strong>{{ triggerLabel }}</strong></span>
        <span><small>清理旧结果</small><strong>{{ formatNumber(state.clearedToolResultCount) }} 个</strong></span>
        <span><small>保留近期结果</small><strong>{{ formatNumber(state.keptToolResultCount) }} 个</strong></span>
        <span><small>节省上下文</small><strong>{{ formatNumber(state.tokensSaved) }} tokens</strong></span>
      </div>
      <p class="microcompact-reason">{{ reasonLabel }}</p>
      <div class="microcompact-meta">
        <span><Clock3 :size="13" />{{ formatTime(state.evaluatedAt) }}</span>
        <span>原始会话 {{ state.rawTranscriptPreserved ? '完整保留' : '状态异常' }}</span>
        <span :title="state.receiptChecksum">回执 {{ state.receiptValid ? '已核验' : '未通过' }}{{ state.receiptChecksum ? ` · ${state.receiptChecksum.slice(0, 10)}` : '' }}</span>
      </div>
    </template>
    <div v-else class="historical-note">
      <History :size="17" />
      <div><strong>没有可核验的执行回执</strong><p>{{ reasonLabel }}。原始会话仍然完整保留，页面不会推算或补造历史节省量。</p></div>
    </div>
  </section>
</template>

<style scoped>
.microcompact-panel { margin: 16px 0 20px; padding: 15px 16px; border: 1px solid var(--border-color); border-left: 3px solid var(--border-strong); background: var(--surface); }
.microcompact-panel[data-status='applied'] { border-left-color: var(--accent-green); }
.microcompact-panel[data-status='invalid_receipt'] { border-left-color: var(--accent-red); }
.microcompact-head, .microcompact-title, .status-badge, .microcompact-meta, .historical-note { display: flex; align-items: center; }
.microcompact-head { justify-content: space-between; gap: 16px; }
.microcompact-title { gap: 10px; }
.microcompact-icon { width: 32px; height: 32px; display: grid; place-items: center; color: var(--accent-green); background: var(--success-soft); }
.microcompact-title small { color: var(--text-muted); font-size: 9px; font-weight: 700; }
.microcompact-title h4 { margin: 2px 0 0; font-size: 14px; }
.status-badge { min-height: 28px; padding: 0 9px; gap: 5px; border: 1px solid var(--border-color); color: var(--text-secondary); font-size: 11px; font-weight: 650; white-space: nowrap; }
.status-badge.applied { border-color: color-mix(in srgb, var(--accent-green) 40%, var(--border-color)); color: var(--accent-green); background: var(--success-soft); }
.status-badge.invalid_receipt { color: var(--accent-red); background: var(--danger-soft); }
.microcompact-metrics { margin-top: 14px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-block: 1px solid var(--border-color); }
.microcompact-metrics span { min-width: 0; padding: 10px 12px; border-right: 1px solid var(--border-color); }
.microcompact-metrics span:last-child { border-right: 0; }
.microcompact-metrics small, .microcompact-metrics strong { display: block; }
.microcompact-metrics small { color: var(--text-muted); font-size: 10px; }
.microcompact-metrics strong { margin-top: 4px; font-size: 13px; overflow-wrap: anywhere; }
.microcompact-reason { margin: 11px 0 7px; color: var(--text-secondary); font-size: 12px; }
.microcompact-meta { gap: 14px; flex-wrap: wrap; color: var(--text-muted); font-size: 10px; }
.microcompact-meta span { display: inline-flex; align-items: center; gap: 4px; }
.historical-note { margin-top: 13px; gap: 10px; color: var(--text-secondary); }
.historical-note > svg { flex: 0 0 auto; color: var(--text-muted); }
.historical-note strong { font-size: 12px; }.historical-note p { margin: 3px 0 0; color: var(--text-muted); font-size: 11px; line-height: 1.5; }
@media (max-width: 720px) { .microcompact-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }.microcompact-metrics span:nth-child(2) { border-right: 0; }.microcompact-metrics span:nth-child(-n+2) { border-bottom: 1px solid var(--border-color); } }
</style>
