<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const traceId = ref('')
const limit = ref(20)
const scope = ref('orchestrator')
const eventType = ref('all')
const eventStatusFilter = ref('all')
const loading = ref(false)
const error = ref('')
const replay = ref(null)

const isSuite = computed(() => Array.isArray(replay.value?.replays))
const rows = computed(() => isSuite.value ? replay.value.replays || [] : (replay.value ? [replay.value] : []))
const eventTypes = computed(() => {
  const types = new Set()
  rows.value.forEach(row => (row.latest_events || []).forEach(event => {
    if (event?.type) types.add(event.type)
  }))
  return Array.from(types).sort()
})
const eventStatuses = computed(() => {
  const statuses = new Set()
  rows.value.forEach(row => (row.latest_events || []).forEach(event => {
    if (event?.status) statuses.add(event.status)
  }))
  return Array.from(statuses).sort()
})
const eventMatches = (event) => {
  if (eventType.value !== 'all' && event?.type !== eventType.value) return false
  if (eventStatusFilter.value !== 'all' && event?.status !== eventStatusFilter.value) return false
  return true
}
const visibleRows = computed(() => rows.value
  .map(row => ({ ...row, visible_events: (row.latest_events || []).filter(eventMatches) }))
  .filter(row => eventType.value === 'all' && eventStatusFilter.value === 'all' ? true : row.visible_events.length > 0))
const summary = computed(() => {
  const items = visibleRows.value
  return {
    total: isSuite.value ? replay.value?.total || items.length : items.length,
    pass: isSuite.value ? replay.value?.pass === true : replay.value?.verdict === 'pass',
    needsReview: isSuite.value ? replay.value?.needs_review || 0 : (replay.value?.verdict === 'needs_review' ? 1 : 0),
    lifecycle: items.reduce((sum, item) => sum + Number(item.lifecycle_count || 0), 0),
    blocked: items.reduce((sum, item) => sum + Number(item.blocked_count || 0), 0),
    contracts: items.reduce((sum, item) => sum + Number(item.contract_injection_count || 0), 0),
    ack: items.reduce((sum, item) => sum + Number(item.ack_signal_count || 0), 0),
  }
})

const verdictLabel = (value) => ({
  pass: '通过',
  needs_review: '需复核',
  missing_trace: '无 Trace',
}[value] || value || '未知')

const eventStatus = (event) => ({
  ok: '通过',
  info: '记录',
  warning: '注意',
  error: '错误',
}[typeof event === 'string' ? event : event?.status] || (typeof event === 'string' ? event : event?.status) || '记录')

const loadReplay = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (traceId.value.trim()) params.set('trace_id', traceId.value.trim())
    else params.set('limit', String(Math.max(1, Math.min(100, Number(limit.value || 20)))))
    const base = scope.value === 'global' ? '/api/global-agent/trace-replay' : '/api/orchestrator/trace-replay'
    const res = await fetch(`${base}?${params.toString()}`)
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || 'Trace Replay 读取失败')
    replay.value = data.replay || null
  } catch (e) {
    error.value = e.message || 'Trace Replay 读取失败'
  }
  loading.value = false
}

const applyReplayTarget = (target = {}) => {
  if (!target) return false
  if (target.scope) scope.value = target.scope === 'global' ? 'global' : 'orchestrator'
  if (target.trace_id || target.traceId) traceId.value = target.trace_id || target.traceId
  return !!(target.trace_id || target.traceId || target.scope)
}

const readStoredReplayTarget = () => {
  try {
    const raw = localStorage.getItem('trace-replay-target')
    if (!raw) return false
    const target = JSON.parse(raw)
    localStorage.removeItem('trace-replay-target')
    return applyReplayTarget(target)
  } catch {
    return false
  }
}

const handleReplayTarget = (event) => {
  if (applyReplayTarget(event.detail || {})) loadReplay()
}

onMounted(() => {
  if (props.navigateTo?.tab === 'trace-replay') applyReplayTarget(props.navigateTo)
  readStoredReplayTarget()
  window.addEventListener('trace-replay-target', handleReplayTarget)
  loadReplay()
})

onUnmounted(() => {
  window.removeEventListener('trace-replay-target', handleReplayTarget)
})

watch(() => props.navigateTo, (target) => {
  if (target?.tab === 'trace-replay' && applyReplayTarget(target)) loadReplay()
})
</script>

<template>
  <section class="trace-replay-page">
    <header class="trace-toolbar">
      <div class="trace-field trace-id-field">
        <label>Trace ID</label>
        <input v-model="traceId" placeholder="trace_id" @keyup.enter="loadReplay" />
      </div>
      <div class="trace-field">
        <label>范围</label>
        <select v-model="scope" @change="loadReplay">
          <option value="orchestrator">群聊主 Agent</option>
          <option value="global">全局主 Agent</option>
        </select>
      </div>
      <div class="trace-field">
        <label>数量</label>
        <input v-model.number="limit" type="number" min="1" max="100" :disabled="!!traceId.trim()" @keyup.enter="loadReplay" />
      </div>
      <div class="trace-field">
        <label>事件</label>
        <select v-model="eventType">
          <option value="all">全部类型</option>
          <option v-for="type in eventTypes" :key="type" :value="type">{{ type }}</option>
        </select>
      </div>
      <div class="trace-field">
        <label>状态</label>
        <select v-model="eventStatusFilter">
          <option value="all">全部状态</option>
          <option v-for="status in eventStatuses" :key="status" :value="status">{{ eventStatus(status) }}</option>
        </select>
      </div>
      <button type="button" :disabled="loading" @click="loadReplay">{{ loading ? '读取中' : '刷新' }}</button>
    </header>

    <div v-if="error" class="trace-error">{{ error }}</div>

    <div class="trace-summary">
      <article :class="{ ok: summary.pass }">
        <span>Trace</span>
        <strong>{{ summary.total }}</strong>
      </article>
      <article :class="{ warn: summary.needsReview > 0 }">
        <span>需复核</span>
        <strong>{{ summary.needsReview }}</strong>
      </article>
      <article>
        <span>Lifecycle</span>
        <strong>{{ summary.lifecycle }}</strong>
      </article>
      <article :class="{ warn: summary.blocked > 0 }">
        <span>Blocked</span>
        <strong>{{ summary.blocked }}</strong>
      </article>
      <article>
        <span>ACK</span>
        <strong>{{ summary.ack }}</strong>
      </article>
      <article>
        <span>Contract</span>
        <strong>{{ summary.contracts }}</strong>
      </article>
    </div>

    <div class="trace-list">
      <article v-for="item in visibleRows" :key="item.trace_id" class="trace-card" :class="item.verdict">
        <header>
          <div>
            <strong>{{ item.trace_id || 'trace' }}</strong>
            <small>{{ item.event_count || 0 }} events · {{ item.tool_or_dispatch_count || 0 }} tool/dispatch</small>
          </div>
          <span>{{ verdictLabel(item.verdict) }}</span>
        </header>
        <div class="trace-metrics">
          <span>lifecycle {{ item.lifecycle_count || 0 }}</span>
          <span>blocked {{ item.blocked_count || 0 }}</span>
          <span>contract {{ item.contract_injection_count || 0 }}</span>
          <span>ack {{ item.ack_signal_count || 0 }}</span>
        </div>
        <ol v-if="item.visible_events?.length" class="trace-events">
          <li v-for="event in item.visible_events.slice(-8)" :key="event.id || `${event.type}-${event.message}`" :class="event.status">
            <div>
              <strong>{{ event.type || 'event' }}</strong>
              <small>{{ event.message || event.agent || event.task_id || '' }}</small>
            </div>
            <em>{{ eventStatus(event) }}</em>
          </li>
        </ol>
      </article>
    </div>
  </section>
</template>

<style scoped>
.trace-replay-page { height:100%; display:flex; flex-direction:column; gap:14px; padding:16px; overflow:auto; background:var(--bg-primary); color:var(--text-primary); letter-spacing:0; }
.trace-toolbar { display:grid; grid-template-columns:minmax(220px,1fr) 130px 100px 150px 120px auto; gap:10px; align-items:end; padding:12px; border:1px solid var(--border-color); border-radius:8px; background:var(--surface); }
.trace-field { display:grid; gap:5px; min-width:0; }.trace-field label { color:var(--text-muted); font-size:12px; font-weight:700; }.trace-field input,.trace-field select { width:100%; min-width:0; height:34px; padding:0 10px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-secondary); color:var(--text-primary); font-size:13px; }
.trace-toolbar button { height:34px; padding:0 14px; border:1px solid var(--accent-blue); border-radius:6px; background:var(--accent-blue); color:#fff; font-size:13px; font-weight:760; cursor:pointer; }.trace-toolbar button:disabled { opacity:.6; cursor:not-allowed; }
.trace-error { padding:10px 12px; border:1px solid #fecaca; border-radius:8px; background:#fef2f2; color:#991b1b; font-size:13px; }
.trace-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; }.trace-summary article { padding:12px; border:1px solid var(--border-color); border-radius:8px; background:var(--surface); }.trace-summary article.ok { border-color:rgba(34,197,94,.35); }.trace-summary article.warn { border-color:rgba(245,158,11,.42); background:#fffbeb; }.trace-summary span { display:block; color:var(--text-muted); font-size:12px; }.trace-summary strong { display:block; margin-top:4px; color:var(--text-primary); font-size:22px; line-height:1; }
.trace-list { display:grid; gap:10px; }.trace-card { padding:12px; border:1px solid var(--border-color); border-radius:8px; background:var(--surface); }.trace-card.needs_review { border-color:rgba(245,158,11,.42); }.trace-card.missing_trace { border-color:rgba(239,68,68,.32); }.trace-card header { display:flex; justify-content:space-between; gap:12px; align-items:start; }.trace-card header strong { display:block; color:var(--text-primary); font-size:13px; overflow-wrap:anywhere; }.trace-card header small { display:block; margin-top:3px; color:var(--text-muted); font-size:11px; }.trace-card header span { padding:3px 8px; border-radius:999px; background:var(--accent-soft); color:var(--accent-blue); font-size:11px; font-weight:800; white-space:nowrap; }
.trace-metrics { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }.trace-metrics span { padding:4px 7px; border-radius:6px; background:var(--bg-secondary); color:var(--text-secondary); font-size:11px; font-weight:700; }
.trace-events { display:grid; gap:6px; margin:10px 0 0; padding:0; list-style:none; }.trace-events li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; padding:8px; border-radius:7px; background:var(--bg-secondary); border-left:3px solid #94a3b8; }.trace-events li.ok { border-left-color:#22c55e; }.trace-events li.warning { border-left-color:#f59e0b; }.trace-events li.error { border-left-color:#ef4444; }.trace-events strong { display:block; color:var(--text-primary); font-size:12px; overflow-wrap:anywhere; }.trace-events small { display:block; margin-top:2px; color:var(--text-muted); font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.trace-events em { align-self:center; color:var(--text-muted); font-size:11px; font-style:normal; white-space:nowrap; }
@media (max-width:720px) { .trace-toolbar { grid-template-columns:1fr; }.trace-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }.trace-card header { display:grid; } }
</style>
