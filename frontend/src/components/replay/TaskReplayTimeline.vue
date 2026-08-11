<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import TaskReplayTimelineEvent from './TaskReplayTimelineEvent.vue'
import {
  replayActorLabel,
  replayEventSummary,
  replayEventTitle,
  replayProjectLabel,
  replayTechnicalLabel,
} from '../../utils/taskReplayPresentation.js'

const props = defineProps({
  events: { type: Array, default: () => [] },
  focusedEventId: { type: String, default: '' },
  showRawGroups: { type: Boolean, default: false },
})
const emit = defineEmits(['open-evidence', 'return-execution'])
const openEvents = ref(new Set())
const virtualHost = ref(null)
const virtualizationEnabled = computed(() => props.events.length > 300)

const stageLabel = (stage) => ({ intake: '需求', planning: '计划', dispatch: '派发', execution: '执行', change: '改动', test: '测试', rework: '返工', review: '验收', completion: '交付', system: '系统' }[stage] || stage || '记录')
const statusLabel = (status) => ({ info: '记录', running: '进行中', passed: '通过', warning: '注意', failed: '失败', blocked: '受阻', cancelled: '已取消' }[status] || status || '记录')
const timeLabel = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  return date.toLocaleString('zh-CN', { hour12: false })
}
const summaryText = item => replayEventSummary(item)
const hasDetails = (item) => !!(
  summaryText(item).length > 220
  || item.evidence_ids?.length
  || item.group_count > 1
  || item.task_id
  || item.category
  || (item.technical && Object.keys(item.technical).length)
)
const isOpen = (id) => openEvents.value.has(id)
const toggle = (id) => {
  const next = new Set(openEvents.value)
  next.has(id) ? next.delete(id) : next.add(id)
  openEvents.value = next
}
const technicalRows = (item = {}) => {
  const technical = item.technical || {}
  const rows = [
    ['category', item.category],
    ['task_id', item.task_id],
    ['actor', item.actor?.label],
    ['project', item.project],
    ...Object.entries(technical),
  ]
  const seen = new Set()
  return rows
    .filter(([key, value]) => {
      if (value === '' || value == null || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(([key, value]) => ({
      key,
      label: replayTechnicalLabel(key),
      value: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    }))
}
const containsEvent = (item, eventId) => item.id === eventId || (item.raw_event_ids || []).includes(eventId)
const groupLabel = (item) => ({ duplicate: '重复更新', progress: '状态更新', retry: '重试记录' }[item.group_kind] || '关联记录')
const timeRangeLabel = (item) => {
  if (!item.first_at || !item.last_at || item.first_at === item.last_at) return timeLabel(item.at)
  const start = new Date(item.first_at)
  const end = new Date(item.last_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return timeLabel(item.at)
  const options = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }
  return `${start.toLocaleTimeString('zh-CN', options)} - ${end.toLocaleTimeString('zh-CN', options)}`
}
const dateGroups = computed(() => {
  const groups = []
  for (const item of props.events) {
    const date = new Date(item.at)
    const key = Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleDateString('zh-CN')
    let group = groups.at(-1)
    if (!group || group.key !== key) {
      group = { key, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
})
const virtualRows = computed(() => dateGroups.value.flatMap(group => [
  { type: 'date', key: `date:${group.key}`, label: group.key },
  ...group.items.map(item => ({ type: 'event', key: `event:${item.id}`, item })),
]))
const virtualizer = useVirtualizer(computed(() => ({
  count: virtualizationEnabled.value ? virtualRows.value.length : 0,
  getScrollElement: () => virtualHost.value,
  estimateSize: index => virtualRows.value[index]?.type === 'date' ? 36 : 112,
  getItemKey: index => virtualRows.value[index]?.key || index,
  overscan: 8,
})))

watch(() => props.focusedEventId, async (id) => {
  if (!id) return
  const target = props.events.find(item => containsEvent(item, id))
  const targetId = target?.id || id
  const next = new Set(openEvents.value)
  next.add(targetId)
  openEvents.value = next
  await nextTick()
  if (virtualizationEnabled.value) {
    const index = virtualRows.value.findIndex(row => row.type === 'event' && containsEvent(row.item, id))
    if (index >= 0) virtualizer.value.scrollToIndex(index, { align: 'center' })
  } else document.getElementById(`replay-event-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})
</script>

<template>
  <div class="task-replay-timeline">
    <div v-if="!events.length" class="timeline-empty">当前筛选下没有记录</div>
    <div v-else-if="virtualizationEnabled" ref="virtualHost" class="virtual-timeline" aria-label="虚拟化执行时间线">
      <div class="virtual-spacer" :style="{ height: `${virtualizer.getTotalSize()}px` }">
        <div v-for="virtualRow in virtualizer.getVirtualItems()" :key="virtualRow.key" :ref="virtualizer.measureElement" :data-index="virtualRow.index" class="virtual-row" :style="{ transform: `translateY(${virtualRow.start}px)` }">
          <div v-if="virtualRows[virtualRow.index]?.type === 'date'" class="virtual-date">{{ virtualRows[virtualRow.index].label }}</div>
          <TaskReplayTimelineEvent
            v-else
            :item="virtualRows[virtualRow.index].item"
            :focused="containsEvent(virtualRows[virtualRow.index].item, focusedEventId)"
            :show-raw-groups="showRawGroups"
            @open-evidence="emit('open-evidence', $event)"
            @return-execution="emit('return-execution', $event)"
          />
        </div>
      </div>
    </div>
    <section v-for="group in virtualizationEnabled ? [] : dateGroups" :key="group.key" class="timeline-day">
      <div class="timeline-date">{{ group.key }}</div>
      <ol>
        <li
          v-for="item in group.items"
          :id="`replay-event-${item.id}`"
          :key="item.id"
          :class="['timeline-event', item.status, { focused: containsEvent(item, focusedEventId) }]"
        >
          <div class="event-rail"><span></span></div>
          <article>
            <header>
              <div class="event-heading">
                <span class="event-stage">{{ stageLabel(item.stage) }}</span>
                <strong>{{ replayEventTitle(item) }}</strong>
              </div>
              <div class="event-meta">
                <span v-if="item.group_count > 1" class="event-group-count">{{ groupLabel(item) }} · {{ item.group_count }} 条</span>
                <span :class="['event-status', item.status]">{{ statusLabel(item.status) }}</span>
                <time>{{ timeRangeLabel(item) }}</time>
              </div>
            </header>
            <div class="event-context">
              <span class="event-actor">{{ replayActorLabel(item.actor) }}</span>
              <span v-if="replayProjectLabel(item)" class="event-project">项目 · {{ replayProjectLabel(item) }}</span>
            </div>
            <p v-if="summaryText(item)" :class="['event-summary', { clamped: !isOpen(item.id) }]">{{ summaryText(item) }}</p>
            <button v-if="hasDetails(item)" type="button" class="detail-toggle" :aria-expanded="isOpen(item.id)" @click="toggle(item.id)">
              {{ isOpen(item.id) ? '收起' : item.group_count > 1 ? `展开 ${item.group_count} 条合并记录` : summaryText(item).length > 220 ? '展开完整内容' : '查看相关信息' }}
            </button>
            <div v-if="isOpen(item.id)" class="event-details">
              <div v-if="item.evidence_ids?.length" class="event-evidence-links">
                <button v-for="evidenceId in item.evidence_ids" :key="evidenceId" type="button" @click="emit('open-evidence', evidenceId)">查看验证证据</button>
                <button v-if="item.replay_link?.anchorMessageId" type="button" @click="emit('return-execution', item.replay_link)">返回执行现场</button>
              </div>
              <button v-else-if="item.replay_link?.anchorMessageId" type="button" class="return-execution" @click="emit('return-execution', item.replay_link)">返回执行现场</button>
              <ol v-if="showRawGroups && item.group_count > 1" class="raw-event-list">
                <li v-for="raw in item.raw_events" :key="raw.id || `${raw.at}-${raw.title}`">
                  <time>{{ timeLabel(raw.at) }}</time>
                  <span :class="['event-status', raw.status]">{{ statusLabel(raw.status) }}</span>
                  <div><strong>{{ replayEventTitle(raw) }}</strong><p v-if="replayEventSummary(raw)">{{ replayEventSummary(raw) }}</p></div>
                </li>
              </ol>
              <details v-if="technicalRows(item).length" class="event-technical">
                <summary>排障信息</summary>
                <dl>
                  <template v-for="row in technicalRows(item)" :key="row.key">
                    <dt>{{ row.label }}</dt>
                    <dd><pre>{{ row.value }}</pre></dd>
                  </template>
                </dl>
              </details>
            </div>
          </article>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.task-replay-timeline { min-width:0; }
.virtual-timeline{position:relative;height:min(72vh,760px);overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable}.virtual-spacer{position:relative;width:100%}.virtual-row{position:absolute;top:0;left:0;width:100%}.virtual-date{position:sticky;left:0;padding:10px 0 5px 8px;color:var(--text-muted);font-size:11px;font-weight:750;background:var(--surface)}
.timeline-empty { padding:44px 16px; border:1px dashed var(--border-color); border-radius:8px; color:var(--text-muted); text-align:center; font-size:13px; }
.timeline-day { display:grid; grid-template-columns:78px minmax(0,1fr); gap:10px; }
.timeline-date { position:sticky; top:8px; align-self:start; padding-top:14px; color:var(--text-muted); font-size:12px; font-weight:700; }
.timeline-day ol { min-width:0; margin:0; padding:0; list-style:none; }
.timeline-event { display:grid; grid-template-columns:18px minmax(0,1fr); min-width:0; }
.event-rail { position:relative; display:flex; justify-content:center; }
.event-rail::after { content:''; position:absolute; top:0; bottom:0; width:1px; background:var(--border-color); }
.event-rail span { z-index:1; width:9px; height:9px; margin-top:20px; border:2px solid var(--surface); border-radius:50%; background:#94a3b8; box-shadow:0 0 0 1px #94a3b8; }
.timeline-event.passed .event-rail span { background:#16a34a; box-shadow:0 0 0 1px #16a34a; }
.timeline-event.running .event-rail span { background:#2563eb; box-shadow:0 0 0 1px #2563eb; }
.timeline-event.warning .event-rail span,.timeline-event.blocked .event-rail span { background:#d97706; box-shadow:0 0 0 1px #d97706; }
.timeline-event.failed .event-rail span { background:#dc2626; box-shadow:0 0 0 1px #dc2626; }
.timeline-event.cancelled .event-rail span { background:#64748b; box-shadow:0 0 0 1px #64748b; }
.timeline-event article { min-width:0; margin:4px 0 10px; padding:11px 12px; border:1px solid var(--border-color); border-radius:8px; background:var(--surface); transition:border-color .15s,box-shadow .15s; }
.timeline-event.focused article { border-color:#2563eb; box-shadow:0 0 0 2px rgba(37,99,235,.12); }
.timeline-event.failed article { border-left:3px solid #dc2626; }.timeline-event.blocked article,.timeline-event.warning article { border-left:3px solid #d97706; }
.timeline-event header { display:flex; justify-content:space-between; align-items:start; gap:14px; }
.event-heading { display:flex; align-items:center; min-width:0; gap:8px; }.event-heading strong { min-width:0; color:var(--text-primary); font-size:13px; line-height:1.45; overflow-wrap:anywhere; }
.event-stage { flex:none; padding:2px 6px; border-radius:4px; background:var(--bg-secondary); color:var(--text-secondary); font-size:10px; font-weight:800; }
.event-meta { flex:none; display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:10px; }.event-status { font-weight:800; }.event-status.passed { color:#15803d; }.event-status.running { color:#1d4ed8; }.event-status.warning,.event-status.blocked { color:#b45309; }.event-status.failed { color:#b91c1c; }
.event-group-count { padding:2px 5px; border-radius:4px; background:var(--accent-soft); color:var(--accent-blue); font-weight:800; }
.event-context { display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; color:var(--text-muted); font-size:10.5px; }.event-context span { padding:2px 6px; border-radius:4px; background:var(--bg-secondary); }.event-context .event-actor { color:var(--text-secondary); font-weight:750; }
.event-summary { margin:8px 0 0; color:var(--text-secondary); font-size:12px; line-height:1.6; white-space:pre-wrap; overflow-wrap:anywhere; }.event-summary.clamped { display:-webkit-box; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:3; }
.detail-toggle { margin-top:9px; padding:0; border:0; background:transparent; color:var(--accent-blue); font-size:11px; font-weight:700; cursor:pointer; }
.event-details { margin-top:9px; padding-top:9px; border-top:1px solid var(--border-color); }
.event-evidence-links { display:flex; flex-wrap:wrap; gap:6px; }.event-evidence-links button { height:28px; padding:0 9px; border:1px solid var(--accent-blue); border-radius:6px; background:transparent; color:var(--accent-blue); font-size:11px; cursor:pointer; }
.return-execution{height:28px;padding:0 9px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--accent-blue);font-size:11px;cursor:pointer}
.raw-event-list { display:grid; gap:0; margin:0 0 9px; padding:0; border:1px solid var(--border-color); border-radius:6px; list-style:none; overflow:hidden; }.raw-event-list li { display:grid; grid-template-columns:138px 58px minmax(0,1fr); align-items:start; gap:8px; padding:8px 9px; border-bottom:1px solid var(--border-color); background:var(--bg-primary); }.raw-event-list li:last-child { border-bottom:0; }.raw-event-list time { color:var(--text-muted); font-size:9.5px; white-space:nowrap; }.raw-event-list div { min-width:0; }.raw-event-list strong { display:block; color:var(--text-secondary); font-size:10.5px; line-height:1.4; overflow-wrap:anywhere; }.raw-event-list p { margin:3px 0 0; color:var(--text-muted); font-size:10px; line-height:1.45; white-space:pre-wrap; overflow-wrap:anywhere; }
.event-technical { margin-top:8px; padding-top:8px; border-top:1px dashed var(--border-color); }.event-technical summary { color:var(--text-muted); font-size:10.5px; font-weight:700; cursor:pointer; }.event-technical dl { display:grid; grid-template-columns:minmax(90px,130px) minmax(0,1fr); gap:5px 10px; margin:8px 0 0; }.event-technical dt { color:var(--text-muted); font-size:10px; overflow-wrap:anywhere; }.event-technical dd { min-width:0; margin:0; }.event-technical pre { margin:0; color:var(--text-secondary); font:10px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
@media (max-width:720px) { .timeline-day { grid-template-columns:1fr; gap:0; }.timeline-date { position:static; padding:8px 0 4px 18px; }.timeline-event header { display:grid; gap:7px; }.event-meta { justify-content:flex-start; flex-wrap:wrap; }.event-heading { align-items:start; }.event-technical dl { grid-template-columns:1fr; }.event-technical dd { margin-bottom:5px; }.raw-event-list li { grid-template-columns:1fr auto; }.raw-event-list li>div { grid-column:1/-1; } }
</style>
