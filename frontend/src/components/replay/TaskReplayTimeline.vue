<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  events: { type: Array, default: () => [] },
  focusedEventId: { type: String, default: '' },
})
const emit = defineEmits(['open-evidence'])
const openEvents = ref(new Set())

const stageLabel = (stage) => ({ intake: '需求', planning: '计划', dispatch: '派发', execution: '执行', change: '改动', test: '测试', rework: '返工', review: '验收', completion: '交付', system: '系统' }[stage] || stage || '记录')
const statusLabel = (status) => ({ info: '记录', running: '进行中', passed: '通过', warning: '注意', failed: '失败', blocked: '受阻', cancelled: '已取消' }[status] || status || '记录')
const timeLabel = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  return date.toLocaleString('zh-CN', { hour12: false })
}
const hasDetails = (item) => !!(item.summary || item.evidence_ids?.length || (item.technical && Object.keys(item.technical).length))
const isOpen = (id) => openEvents.value.has(id)
const toggle = (id) => {
  const next = new Set(openEvents.value)
  next.has(id) ? next.delete(id) : next.add(id)
  openEvents.value = next
}
const technicalRows = (technical = {}) => Object.entries(technical).filter(([, value]) => value !== '' && value != null).map(([key, value]) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }))
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

watch(() => props.focusedEventId, async (id) => {
  if (!id) return
  const next = new Set(openEvents.value)
  next.add(id)
  openEvents.value = next
  await nextTick()
  document.getElementById(`replay-event-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})
</script>

<template>
  <div class="task-replay-timeline">
    <div v-if="!events.length" class="timeline-empty">当前筛选下没有记录</div>
    <section v-for="group in dateGroups" :key="group.key" class="timeline-day">
      <div class="timeline-date">{{ group.key }}</div>
      <ol>
        <li
          v-for="item in group.items"
          :id="`replay-event-${item.id}`"
          :key="item.id"
          :class="['timeline-event', item.status, { focused: focusedEventId === item.id }]"
        >
          <div class="event-rail"><span></span></div>
          <article>
            <header>
              <div class="event-heading">
                <span class="event-stage">{{ stageLabel(item.stage) }}</span>
                <strong>{{ item.title }}</strong>
              </div>
              <div class="event-meta">
                <span :class="['event-status', item.status]">{{ statusLabel(item.status) }}</span>
                <time>{{ timeLabel(item.at) }}</time>
              </div>
            </header>
            <div class="event-context">
              <span>{{ item.actor?.label || '系统' }}</span>
              <span v-if="item.project">{{ item.project }}</span>
              <span v-if="item.task_id">任务 {{ item.task_id }}</span>
            </div>
            <p v-if="item.summary" class="event-summary">{{ item.summary }}</p>
            <button v-if="hasDetails(item)" type="button" class="detail-toggle" :aria-expanded="isOpen(item.id)" @click="toggle(item.id)">
              {{ isOpen(item.id) ? '收起详情' : '查看详情' }}
            </button>
            <div v-if="isOpen(item.id)" class="event-details">
              <div v-if="item.evidence_ids?.length" class="event-evidence-links">
                <button v-for="evidenceId in item.evidence_ids" :key="evidenceId" type="button" @click="emit('open-evidence', evidenceId)">查看验证证据</button>
              </div>
              <details v-if="technicalRows(item.technical).length" class="event-technical">
                <summary>技术详情</summary>
                <dl>
                  <template v-for="row in technicalRows(item.technical)" :key="row.key">
                    <dt>{{ row.key }}</dt>
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
.timeline-empty { padding:44px 16px; border:1px dashed var(--border-color); border-radius:8px; color:var(--text-muted); text-align:center; font-size:13px; }
.timeline-day { display:grid; grid-template-columns:92px minmax(0,1fr); gap:12px; }
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
.timeline-event article { min-width:0; margin:5px 0 12px; padding:12px 14px; border:1px solid var(--border-color); border-radius:8px; background:var(--surface); transition:border-color .15s,box-shadow .15s; }
.timeline-event.focused article { border-color:#2563eb; box-shadow:0 0 0 2px rgba(37,99,235,.12); }
.timeline-event.failed article { border-left:3px solid #dc2626; }.timeline-event.blocked article,.timeline-event.warning article { border-left:3px solid #d97706; }
.timeline-event header { display:flex; justify-content:space-between; align-items:start; gap:14px; }
.event-heading { display:flex; align-items:center; min-width:0; gap:8px; }.event-heading strong { min-width:0; color:var(--text-primary); font-size:13px; line-height:1.45; overflow-wrap:anywhere; }
.event-stage { flex:none; padding:2px 6px; border-radius:4px; background:var(--bg-secondary); color:var(--text-secondary); font-size:10px; font-weight:800; }
.event-meta { flex:none; display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:10px; }.event-status { font-weight:800; }.event-status.passed { color:#15803d; }.event-status.running { color:#1d4ed8; }.event-status.warning,.event-status.blocked { color:#b45309; }.event-status.failed { color:#b91c1c; }
.event-context { display:flex; flex-wrap:wrap; gap:5px 10px; margin-top:7px; color:var(--text-muted); font-size:11px; }.event-context span:not(:last-child)::after { content:'·'; margin-left:10px; }
.event-summary { margin:9px 0 0; color:var(--text-secondary); font-size:12px; line-height:1.65; white-space:pre-wrap; overflow-wrap:anywhere; }
.detail-toggle { margin-top:9px; padding:0; border:0; background:transparent; color:var(--accent-blue); font-size:11px; font-weight:700; cursor:pointer; }
.event-details { margin-top:9px; padding-top:9px; border-top:1px solid var(--border-color); }
.event-evidence-links { display:flex; flex-wrap:wrap; gap:6px; }.event-evidence-links button { height:28px; padding:0 9px; border:1px solid var(--accent-blue); border-radius:6px; background:transparent; color:var(--accent-blue); font-size:11px; cursor:pointer; }
.event-technical { margin-top:8px; }.event-technical summary { color:var(--text-muted); font-size:11px; font-weight:700; cursor:pointer; }.event-technical dl { display:grid; grid-template-columns:minmax(90px,130px) minmax(0,1fr); gap:5px 10px; margin:8px 0 0; }.event-technical dt { color:var(--text-muted); font-size:10px; overflow-wrap:anywhere; }.event-technical dd { min-width:0; margin:0; }.event-technical pre { margin:0; color:var(--text-secondary); font:10px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
@media (max-width:720px) { .timeline-day { grid-template-columns:1fr; gap:0; }.timeline-date { position:static; padding:8px 0 4px 18px; }.timeline-event header { display:grid; gap:7px; }.event-meta { justify-content:space-between; }.event-heading { align-items:start; }.event-technical dl { grid-template-columns:1fr; }.event-technical dd { margin-bottom:5px; } }
</style>
