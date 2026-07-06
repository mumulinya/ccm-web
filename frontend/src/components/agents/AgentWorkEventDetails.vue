<script setup>
import { computed } from 'vue'
import { sanitizeUserFacingAgentText, summarizeWorkEvents } from '../../utils/agentDisplay.js'

const props = defineProps({
  msg: { type: Object, required: true },
  mainAgent: { type: Boolean, default: false },
  accentStyle: { type: Object, default: () => ({}) },
})

const events = computed(() => Array.isArray(props.msg?.workEvents) ? props.msg.workEvents.filter(Boolean) : [])
const eventSummary = computed(() => summarizeWorkEvents(events.value))
const panelState = computed(() => {
  if (events.value.some(event => event.kind === 'error')) return { tone: 'fail', label: '失败' }
  if (props.msg?.streaming) return { tone: 'running', label: '执行中' }
  if (events.value.some(event => event.kind === 'done')) return { tone: 'ok', label: '完成' }
  return { tone: 'idle', label: events.value.length ? '等待回执' : '待执行' }
})
const latestEvent = computed(() => events.value[events.value.length - 1] || null)
const compactWorkText = (value, max = 320) => {
  const text = sanitizeUserFacingAgentText(value, '')
  return text.length > max ? `${text.slice(0, max)}...` : text
}
const workEventLabel = (kind) => ({
  status: '状态',
  output: '输出',
  tool: '工具',
  done: '完成',
  error: '错误'
}[kind || 'status'] || kind)
const workEventTone = (kind) => {
  if (kind === 'done') return 'ok'
  if (kind === 'error') return 'fail'
  if (kind === 'output') return 'output'
  return 'status'
}
const formatWorkTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
const formatWorkDuration = () => {
  if (!events.value.length) return '0s'
  const first = new Date(events.value[0].time || props.msg?.timestamp || Date.now()).getTime()
  const last = props.msg?.streaming ? Date.now() : new Date(events.value[events.value.length - 1].time || Date.now()).getTime()
  if (Number.isNaN(first) || Number.isNaN(last)) return '0s'
  const seconds = Math.max(0, Math.round((last - first) / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}
</script>

<template>
  <details
    v-if="events.length"
    class="agent-work-events"
    :class="[panelState.tone, { 'main-agent-technical-events': mainAgent }]"
    :style="accentStyle"
  >
    <summary v-if="mainAgent" class="main-agent-summary">
      <span>技术详情</span>
      <small>可展开排查</small>
    </summary>
    <summary v-else class="work-events-head">
      <div class="work-head-main">
        <span class="work-agent-dot"></span>
        <span class="work-title">子 Agent 执行摘要</span>
        <span :class="['work-state-pill', panelState.tone]">{{ panelState.label }}</span>
      </div>
      <div class="work-head-meta">
        <span>{{ eventSummary.summary }}</span>
        <span>{{ formatWorkDuration() }}</span>
        <small v-if="eventSummary.hiddenCount">+{{ eventSummary.hiddenCount }} 条详情</small>
      </div>
    </summary>

    <div v-if="!mainAgent" class="work-events-preview">
      <span>{{ formatWorkTime(latestEvent?.time) }}</span>
      <pre>{{ eventSummary.latestText }}</pre>
    </div>
    <div class="work-events-list">
      <div
        v-for="event in events.slice(-12)"
        :key="event.id || event.time || event.text"
        :class="['work-event', workEventTone(event.kind)]"
      >
        <div class="work-event-side">
          <span class="work-event-kind">{{ workEventLabel(event.kind) }}</span>
          <span class="work-event-time">{{ formatWorkTime(event.time) }}</span>
        </div>
        <pre>{{ compactWorkText(event.text) }}</pre>
      </div>
    </div>
  </details>
</template>

<style scoped>
.agent-work-events {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 22%, rgba(15, 23, 42, 0.08));
  border-radius: 8px;
  background: color-mix(in srgb, var(--agent-accent) 5%, rgba(255, 255, 255, 0.7));
  overflow: hidden;
}
.agent-work-events > summary {
  list-style: none;
  cursor: pointer;
  user-select: none;
}
.agent-work-events > summary::-webkit-details-marker { display: none; }
.agent-work-events:not([open]) .work-events-preview,
.agent-work-events:not([open]) .work-events-list { display: none; }
.agent-work-events[open] .work-events-preview { border-bottom: 1px solid rgba(15, 23, 42, 0.06); }
.agent-work-events.fail {
  border-color: rgba(239, 68, 68, 0.24);
  background: rgba(239, 68, 68, 0.035);
}
.main-agent-technical-events {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.5);
}
.main-agent-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
}
.main-agent-summary span { color: var(--text-secondary); }
.main-agent-summary small { font-size: 10px; font-weight: 700; }
.main-agent-technical-events .work-events-list {
  margin-top: 8px;
  padding: 8px 0 0;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}
.work-events-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
}
.work-head-main,
.work-head-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.work-head-meta {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-weight: 700;
}
.work-agent-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 999px;
  background: var(--agent-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--agent-accent) 12%, transparent);
}
.work-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}
.work-state-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  background: rgba(100, 116, 139, 0.1);
  color: var(--text-muted);
}
.work-state-pill.running {
  background: color-mix(in srgb, var(--agent-accent) 13%, transparent);
  color: var(--agent-accent);
}
.work-state-pill.ok {
  background: rgba(34, 197, 94, 0.12);
  color: var(--accent-green);
}
.work-state-pill.fail {
  background: rgba(239, 68, 68, 0.12);
  color: var(--accent-red);
}
.work-events-preview {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 8px;
  padding: 8px 10px;
  align-items: start;
  color: var(--text-muted);
  font-size: 11px;
}
.work-events-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
  font-family: Consolas, 'JetBrains Mono', monospace;
  line-height: 1.5;
}
.work-events-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px;
  max-height: 300px;
  overflow-y: auto;
}
.work-event {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 9px;
  align-items: start;
}
.work-event-side {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.work-event-kind {
  width: fit-content;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.1);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
}
.work-event-time {
  color: var(--text-muted);
  font-size: 10px;
  font-family: Consolas, 'JetBrains Mono', monospace;
}
.work-event pre {
  min-width: 0;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
  font-family: Consolas, 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.55;
}
.work-event.output pre { color: var(--text-primary); }
.work-event.ok .work-event-kind { background: rgba(34, 197, 94, 0.12); color: var(--accent-green); }
.work-event.fail .work-event-kind { background: rgba(239, 68, 68, 0.12); color: var(--accent-red); }
.work-event.output .work-event-kind { background: color-mix(in srgb, var(--agent-accent) 12%, transparent); color: var(--agent-accent); }
:global([data-theme="dark"]) .agent-work-events {
  background: color-mix(in srgb, var(--agent-accent) 7%, rgba(15, 23, 42, 0.72));
}
:global([data-theme="dark"]) .work-events-head {
  border-color: rgba(148, 163, 184, 0.12);
}
</style>
