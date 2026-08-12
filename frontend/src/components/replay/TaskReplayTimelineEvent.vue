<script setup>
import { computed, ref, watch } from 'vue'
import { replayActorLabel, replayEventSummary, replayEventTitle, replayProjectLabel, replayStageLabel, replayTechnicalLabel } from '../../utils/taskReplayPresentation.js'

const props = defineProps({ item: { type: Object, required: true }, focused: Boolean, showRawGroups: Boolean })
const emit = defineEmits(['open-evidence', 'return-execution'])
const open = ref(false)
watch(() => props.focused, value => { if (value) open.value = true }, { immediate: true })
const stageLabel = replayStageLabel
const statusLabel = status => ({ info: '记录', running: '进行中', passed: '通过', warning: '注意', failed: '失败', blocked: '受阻', cancelled: '已取消' }[status] || status || '记录')
const timeLabel = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false }) }
const summary = computed(() => replayEventSummary(props.item))
const hasDetails = computed(() => summary.value.length > 220 || props.item.evidence_ids?.length || props.item.group_count > 1 || props.item.replay_link?.anchorMessageId || (props.item.technical && Object.keys(props.item.technical).length))
const technicalRows = computed(() => Object.entries(props.item.technical || {}).filter(([, value]) => value !== '' && value != null).map(([key, value]) => ({ key, label: replayTechnicalLabel(key), value: typeof value === 'string' ? value : JSON.stringify(value, null, 2) })))
</script>

<template>
  <article :id="`replay-event-${item.id}`" :class="['virtual-event-card', item.status, { focused }]">
    <header><div><span>{{ stageLabel(item.stage) }}</span><strong>{{ replayEventTitle(item) }}</strong></div><aside><b>{{ statusLabel(item.status) }}</b><time>{{ timeLabel(item.at) }}</time></aside></header>
    <div class="virtual-context"><span>{{ replayActorLabel(item.actor) }}</span><span v-if="replayProjectLabel(item)">项目 · {{ replayProjectLabel(item) }}</span></div>
    <p v-if="summary" :class="{ clamped: !open }">{{ summary }}</p>
    <button v-if="hasDetails" type="button" class="virtual-toggle" @click="open = !open">{{ open ? '收起' : '查看相关信息' }}</button>
    <div v-if="open" class="virtual-details">
      <div class="virtual-actions"><button v-for="id in item.evidence_ids || []" :key="id" type="button" @click="emit('open-evidence', id)">查看验证证据</button><button v-if="item.replay_link?.anchorMessageId" type="button" @click="emit('return-execution', item.replay_link)">返回执行现场</button></div>
      <ol v-if="showRawGroups && item.group_count > 1"><li v-for="raw in item.raw_events" :key="raw.id"><time>{{ timeLabel(raw.at) }}</time><strong>{{ replayEventTitle(raw) }}</strong><p>{{ replayEventSummary(raw) }}</p></li></ol>
      <details v-if="technicalRows.length"><summary>排障信息</summary><dl><template v-for="row in technicalRows" :key="row.key"><dt>{{ row.label }}</dt><dd><pre>{{ row.value }}</pre></dd></template></dl></details>
    </div>
  </article>
</template>

<style scoped>
.virtual-event-card{margin:4px 6px 10px 96px;padding:11px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--surface);color:var(--text-primary)}.virtual-event-card.focused{border-color:var(--accent-blue);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent-blue) 18%,transparent)}.virtual-event-card.failed{border-left:3px solid var(--accent-red)}.virtual-event-card.blocked,.virtual-event-card.warning{border-left:3px solid var(--accent-yellow)}header{display:flex;justify-content:space-between;gap:12px}header>div{display:flex;align-items:center;gap:8px;min-width:0}header>div span{padding:2px 6px;border-radius:4px;background:var(--bg-secondary);color:var(--text-muted);font-size:9px;font-weight:800}header strong{font-size:12px;overflow-wrap:anywhere}aside{display:flex;align-items:center;gap:8px;flex:none}aside b,aside time{color:var(--text-muted);font-size:9px}.virtual-context{display:flex;gap:5px;margin-top:7px}.virtual-context span{padding:2px 6px;border-radius:4px;background:var(--bg-secondary);color:var(--text-muted);font-size:9px}.virtual-event-card>p{margin:8px 0 0;color:var(--text-secondary);font-size:11px;line-height:1.55;white-space:pre-wrap}.virtual-event-card>p.clamped{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:3}.virtual-toggle{margin-top:8px;padding:0;border:0;background:transparent;color:var(--accent-blue);font-size:10px;cursor:pointer}.virtual-details{margin-top:8px;padding-top:8px;border-top:1px solid var(--border-color)}.virtual-actions{display:flex;flex-wrap:wrap;gap:6px}.virtual-actions button{height:27px;padding:0 8px;border:1px solid var(--border-color);border-radius:5px;background:transparent;color:var(--accent-blue);font-size:9.5px;cursor:pointer}.virtual-details ol{margin:8px 0;padding:0;list-style:none}.virtual-details li{display:grid;grid-template-columns:130px minmax(0,1fr);gap:6px;padding:6px;border-bottom:1px solid var(--border-color);font-size:9px}.virtual-details li p{grid-column:2;margin:0;color:var(--text-muted)}.virtual-details details{margin-top:8px}.virtual-details summary{color:var(--text-muted);font-size:9.5px;cursor:pointer}.virtual-details dl{display:grid;grid-template-columns:120px minmax(0,1fr);gap:5px;margin:8px 0 0}.virtual-details dt{color:var(--text-muted);font-size:9px}.virtual-details dd{margin:0}.virtual-details pre{margin:0;font:9px/1.45 ui-monospace,monospace;white-space:pre-wrap}@media(max-width:720px){.virtual-event-card{margin-left:4px}header{display:grid}aside{justify-content:flex-start}.virtual-details dl{grid-template-columns:1fr}}
</style>
