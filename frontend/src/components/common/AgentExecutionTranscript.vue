<script setup>
import { computed, onMounted } from 'vue'
import {
  eventStatusLabel,
  executionEventsForMessage,
  executionTranscriptExpanded,
  formatExecutionDuration,
  installExecutionTranscriptShortcut,
  shouldRenderExecutionTranscript,
} from '../../utils/agentExecutionEvents.js'

const props = defineProps({
  events: { type: Array, default: () => [] },
  messages: { type: Array, default: () => [] },
  messageIndex: { type: Number, required: true },
  enabled: { type: Boolean, default: true },
})

onMounted(installExecutionTranscriptShortcut)

const rows = computed(() => executionEventsForMessage(props.events, props.messages, props.messageIndex))
const shouldRender = computed(() => shouldRenderExecutionTranscript(props.events, props.messages, props.messageIndex))
const resultEvent = computed(() => [...rows.value].reverse().find(event => event.eventType === 'result'))
const compacted = computed(() => !!resultEvent.value && !executionTranscriptExpanded.value)
const visibleRows = computed(() => rows.value.filter(event => !['turn_started', 'assistant_text_delta', 'result'].includes(event.eventType)))
const toolCount = computed(() => rows.value.filter(event => event.eventType.startsWith('tool_')).length)
const agentCount = computed(() => rows.value.filter(event => event.eventType.startsWith('agent_')).length)
const failedCount = computed(() => rows.value.filter(event => event?.display?.status === 'failed').length)

const statusMark = event => {
  if (event?.display?.status === 'success') return '✓'
  if (event?.display?.status === 'failed') return '×'
  if (event?.display?.status === 'waiting') return '…'
  return '●'
}

const safeJson = value => {
  if (value == null) return ''
  try { return JSON.stringify(value, null, 2) } catch { return '' }
}

const rowMeta = event => [
  event?.display?.toolUseCount ? `${event.display.toolUseCount} tool uses` : '',
  event?.display?.tokenCount ? `${event.display.tokenCount} tokens` : '',
  formatExecutionDuration(event?.display?.durationMs),
].filter(Boolean).join(' · ')
</script>

<template>
  <section v-if="enabled && shouldRender" class="cc-execution" :class="{ complete: !!resultEvent, expanded: executionTranscriptExpanded }">
    <button class="cc-execution-head" type="button" @click="executionTranscriptExpanded = !executionTranscriptExpanded">
      <span class="cc-execution-chevron">{{ executionTranscriptExpanded ? '⌄' : '›' }}</span>
      <strong>{{ compacted ? (resultEvent?.display?.title || '执行完成') : '执行记录' }}</strong>
      <span class="cc-execution-summary">
        <template v-if="compacted">{{ resultEvent?.display?.summary || '本轮处理已结束' }}</template>
        <template v-else>{{ toolCount }} 个工具动作<span v-if="agentCount"> · {{ agentCount }} 个 Agent 事件</span><span v-if="failedCount"> · {{ failedCount }} 个失败</span></template>
      </span>
      <kbd>Ctrl+O</kbd>
    </button>

    <div v-if="!compacted" class="cc-execution-rows">
      <article v-for="event in visibleRows" :key="event.eventId" class="cc-execution-row" :class="event.display?.status || 'running'">
        <span class="cc-execution-mark">{{ statusMark(event) }}</span>
        <div class="cc-execution-main">
          <div class="cc-execution-title">
            <strong>{{ event.display?.title || 'Agent' }}</strong>
            <code v-if="event.display?.target">{{ event.display.target }}</code>
            <span>{{ eventStatusLabel(event) }}</span>
          </div>
          <p v-if="event.display?.summary">{{ event.display.summary }}</p>
          <small v-if="rowMeta(event)">{{ rowMeta(event) }}</small>
          <div v-if="executionTranscriptExpanded && event.detail" class="cc-execution-detail">
            <div v-if="event.detail.safeArguments">
              <b>参数摘要</b>
              <pre>{{ safeJson(event.detail.safeArguments) }}</pre>
            </div>
            <div v-if="event.detail.safeResult">
              <b>结果摘要</b>
              <pre>{{ safeJson(event.detail.safeResult) }}</pre>
            </div>
            <div v-if="event.detail.fileChanges?.length">
              <b>文件变化</b>
              <ul><li v-for="file in event.detail.fileChanges" :key="file.path || file">{{ file.path || file }}</li></ul>
            </div>
            <div v-if="event.detail.evidenceIds?.length">
              <b>Evidence</b>
              <code>{{ event.detail.evidenceIds.join(' · ') }}</code>
            </div>
            <div v-if="event.detail.usage && Object.keys(event.detail.usage).length">
              <b>Usage</b>
              <pre>{{ safeJson(event.detail.usage) }}</pre>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.cc-execution {
  width: 100%;
  margin: 0 0 10px;
  border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 42%, transparent);
  border-radius: 9px;
  background: color-mix(in srgb, var(--surface-subtle, #f8fafc) 88%, transparent);
  overflow: hidden;
}
.cc-execution-head {
  width: 100%;
  min-height: 38px;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 0;
  color: var(--text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.cc-execution-head:hover { background: rgba(100, 116, 139, 0.06); }
.cc-execution-head strong { color: var(--text-primary); font-size: 12px; }
.cc-execution-chevron { color: var(--text-muted); font-size: 18px; line-height: 1; }
.cc-execution-summary { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.cc-execution-head kbd { padding: 2px 5px; border: 1px solid rgba(100, 116, 139, 0.25); border-radius: 4px; color: var(--text-muted); font-size: 9px; font-family: inherit; }
.cc-execution-rows { border-top: 1px solid rgba(100, 116, 139, 0.13); padding: 5px 0; }
.cc-execution-row { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 5px; padding: 6px 10px; }
.cc-execution-row + .cc-execution-row { border-top: 1px solid rgba(100, 116, 139, 0.07); }
.cc-execution-mark { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: #2563eb; background: rgba(37, 99, 235, 0.1); font-size: 10px; }
.cc-execution-row.success .cc-execution-mark { color: #15803d; background: rgba(34, 197, 94, 0.12); }
.cc-execution-row.failed .cc-execution-mark { color: #dc2626; background: rgba(239, 68, 68, 0.12); }
.cc-execution-row.waiting .cc-execution-mark { color: #b45309; background: rgba(245, 158, 11, 0.13); }
.cc-execution-title { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; min-width: 0; }
.cc-execution-title strong { color: var(--text-primary); font-size: 12px; }
.cc-execution-title code { max-width: min(520px, 65vw); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); font-size: 11px; }
.cc-execution-title span { margin-left: auto; color: var(--text-muted); font-size: 10px; }
.cc-execution-main p { margin: 3px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.45; }
.cc-execution-main small { display: block; margin-top: 3px; color: var(--text-muted); font-size: 10px; }
.cc-execution-detail { display: grid; gap: 8px; margin-top: 7px; padding: 8px; border-radius: 7px; background: rgba(15, 23, 42, 0.035); }
.cc-execution-detail b { display: block; margin-bottom: 4px; color: var(--text-secondary); font-size: 10px; }
.cc-execution-detail pre { max-height: 220px; margin: 0; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--text-secondary); font: 10px/1.5 Consolas, monospace; }
.cc-execution-detail code { white-space: normal; overflow-wrap: anywhere; color: var(--text-secondary); font-size: 10px; }
.cc-execution-detail ul { margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 10px; }
@media (max-width: 720px) {
  .cc-execution-head { grid-template-columns: auto auto minmax(0, 1fr); }
  .cc-execution-head kbd { display: none; }
  .cc-execution-title span { width: 100%; margin-left: 0; }
}
</style>
