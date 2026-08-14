<script setup>
import { computed, ref, watch } from 'vue'
import { ChevronDown, CornerDownRight, HelpCircle, ListEnd, MoreHorizontal, Paperclip, RotateCcw, Square, Trash2 } from '@lucide/vue'

const props = defineProps({
  busy: { type: Boolean, default: false },
  turns: { type: Array, default: () => [] },
  stopping: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['stop', 'cancel', 'guide', 'retry', 'resolve-route'])
const expanded = ref(false)
const menuTurnId = ref('')
const visibleTurns = computed(() => (props.turns || [])
  .filter(turn => ['queued', 'needs_route', 'failed'].includes(String(turn.status || '')))
  .sort((left, right) => Number(left.position || 0) - Number(right.position || 0)
    || Date.parse(left.created_at || left.createdAt || '') - Date.parse(right.created_at || right.createdAt || '')))
const displayedTurns = computed(() => expanded.value ? visibleTurns.value : visibleTurns.value.slice(0, 1))
const sourceLabel = turn => ({
  workbench: '来自工作台',
  global_agent: '来自全局 Agent',
  schedule: '来自定时任务',
}[String(turn?.source || '')] || '')
const statusLabel = turn => ({
  queued: turn.mode === 'steer' ? '等待调整' : (turn.position ? `排队第 ${turn.position} 条` : '等待处理'),
  sending: '正在接入',
  needs_route: '等待你选择',
  failed: '处理失败',
}[turn.status] || turn.status)
const turnText = turn => turn.messagePreview || turn.message || (turn.attachmentRefs?.length || turn.attachments?.length ? '附件消息' : '待处理消息')
const isDispatch = turn => turn?.kind === 'task_dispatch'
const toggleMenu = turn => { menuTurnId.value = menuTurnId.value === turn.id ? '' : turn.id }
const runAndClose = (event, turn) => {
  menuTurnId.value = ''
  emit(event, turn)
}
const viewTask = turn => {
  menuTurnId.value = ''
  if (!turn?.task_id || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('ccm-command-result-action', {
    detail: { kind: 'navigate', tab: 'tasks', context: { taskId: turn.task_id } },
  }))
}

watch(() => visibleTurns.value.length, count => {
  if (count <= 1) expanded.value = false
  if (!visibleTurns.value.some(turn => turn.id === menuTurnId.value)) menuTurnId.value = ''
})
</script>

<template>
  <section v-if="visibleTurns.length" class="turn-control" :class="{ compact: props.compact }" data-testid="conversation-turn-controls" aria-label="会话待处理消息">
    <div v-if="visibleTurns.length" class="turn-queue" aria-live="polite">
      <article v-for="turn in displayedTurns" :key="turn.id" class="turn-row" :class="[`status-${turn.status}`, { dispatch: isDispatch(turn), 'route-row': turn.status === 'needs_route' }]">
        <div class="turn-main">
          <HelpCircle v-if="turn.status === 'needs_route'" class="turn-handle" :size="16" aria-hidden="true" />
          <ListEnd v-else class="turn-handle" :size="16" aria-hidden="true" />
          <div class="turn-copy">
            <strong v-if="turn.status === 'needs_route'" class="route-title">这条消息可能与刚才的任务有关</strong>
            <div class="turn-message" :title="turn.message || turn.messagePreview">{{ turnText(turn) }}</div>
            <div class="turn-meta">
              <span v-if="sourceLabel(turn)" class="turn-source">{{ sourceLabel(turn) }}</span>
              <span>{{ statusLabel(turn) }}</span>
              <span v-if="(turn.attachmentRefs?.length || turn.attachments?.length)" class="turn-attachments"><Paperclip :size="11" />{{ turn.attachmentRefs?.length || turn.attachments?.length }}</span>
            </div>
            <p v-if="turn.status === 'needs_route' && turn.routing?.reason" class="route-reason">{{ turn.routing.reason }}</p>
            <div v-if="turn.status === 'needs_route'" class="route-actions" aria-label="选择消息处理方式">
              <button type="button" :disabled="turn.canMutate === false || !turn.routing?.candidateTaskId" :title="!turn.routing?.candidateTaskId ? '当前没有可安全恢复的原任务' : ''" @click="emit('resolve-route', turn, 'continue_original')">继续原任务</button>
              <button type="button" class="primary" :disabled="turn.canMutate === false" @click="emit('resolve-route', turn, 'start_new_task')">作为新任务</button>
              <button type="button" :disabled="turn.canMutate === false" @click="emit('resolve-route', turn, 'answer_only')">仅回答问题</button>
            </div>
          </div>
        </div>

        <div v-if="turn.status !== 'needs_route'" class="turn-actions">
          <button
            v-if="busy && turn.status === 'queued' && turn.mode !== 'steer' && !isDispatch(turn) && turn.canMutate !== false"
            class="guide-turn"
            type="button"
            title="把这条消息安全接入当前任务"
            @click="emit('guide', turn)"
          >
            <CornerDownRight :size="14" />
            <span>调整方向</span>
          </button>
          <button v-if="turn.status === 'failed' && turn.canMutate !== false" type="button" title="重新排队" @click="emit('retry', turn)">
            <RotateCcw :size="14" /><span class="sr-only">重新排队</span>
          </button>
          <button v-else-if="turn.status === 'queued' && turn.canMutate !== false" type="button" title="删除这条待处理消息" @click="emit('cancel', turn)">
            <Trash2 :size="14" /><span class="sr-only">删除</span>
          </button>
          <div class="turn-more">
            <button type="button" title="更多操作" :aria-expanded="menuTurnId === turn.id" @click="toggleMenu(turn)">
              <MoreHorizontal :size="15" />
            </button>
            <div v-if="menuTurnId === turn.id" class="turn-menu" role="menu">
              <button v-if="isDispatch(turn) && turn.task_id" type="button" role="menuitem" @click="viewTask(turn)">查看来源任务</button>
              <button v-if="turn.status === 'failed' && turn.canMutate !== false" type="button" role="menuitem" @click="runAndClose('retry', turn)">重新排队</button>
              <button v-if="turn.status === 'queued' && turn.canMutate !== false" class="danger" type="button" role="menuitem" @click="runAndClose('cancel', turn)">删除待处理消息</button>
            </div>
          </div>
        </div>
      </article>

      <button v-if="visibleTurns.length > 1" type="button" class="queue-toggle" :aria-expanded="expanded" @click="expanded = !expanded">
        <span>{{ expanded ? '收起队列' : `另有 ${visibleTurns.length - 1} 条待处理消息` }}</span>
        <ChevronDown :size="14" :class="{ rotated: expanded }" />
      </button>
    </div>

    <footer v-if="busy" class="turn-control-footer">
      <span v-if="visibleTurns.length">当前任务结束后将按顺序处理</span>
      <span v-else>Agent 正在工作，新消息会进入待处理队列</span>
      <button class="stop-turn" type="button" :disabled="stopping" title="停止当前工作" @click="emit('stop')">
        <Square :size="11" fill="currentColor" />
        <span>{{ stopping ? '停止中' : '停止' }}</span>
      </button>
    </footer>
  </section>
</template>

<style scoped>
.turn-control { position:relative; width:min(720px,calc(100% - 24px)); margin:0 auto 8px; color:var(--text-primary,#0f172a); z-index:9; }
.turn-queue { overflow:visible; border:1px solid color-mix(in srgb,var(--border-color,#cbd5e1) 68%,transparent); border-radius:16px; background:color-mix(in srgb,var(--surface,#fff) 97%,transparent); box-shadow:0 10px 28px rgba(15,23,42,.08); }
.turn-row { position:relative; display:flex; align-items:center; gap:12px; min-height:54px; padding:9px 10px 8px 14px; border-bottom:1px solid color-mix(in srgb,var(--border-color,#cbd5e1) 56%,transparent); }
.turn-row:last-of-type { border-bottom:0; }
.turn-main { min-width:0; flex:1; display:flex; align-items:flex-start; gap:10px; }
.turn-handle { flex:0 0 auto; margin-top:2px; color:var(--text-muted,#94a3b8); }
.turn-copy { min-width:0; display:grid; gap:4px; }
.route-title { color:var(--text-primary,#0f172a); font-size:13px; line-height:1.35; }
.route-reason { margin:1px 0 0; color:var(--text-secondary,#475569); font-size:11px; line-height:1.45; }
.route-actions { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
.route-actions button { min-height:30px; padding:0 11px; border:1px solid color-mix(in srgb,var(--border-color,#cbd5e1) 80%,transparent); border-radius:8px; background:var(--surface,#fff); color:var(--text-secondary,#475569); font-size:11px; font-weight:650; cursor:pointer; }
.route-actions button:hover { border-color:color-mix(in srgb,var(--primary-color,#2563eb) 55%,var(--border-color,#cbd5e1)); color:var(--primary-color,#2563eb); }
.route-actions button.primary { border-color:var(--primary-color,#2563eb); background:var(--primary-color,#2563eb); color:#fff; }
.route-actions button:disabled { cursor:not-allowed; opacity:.55; }
.route-row { align-items:flex-start; padding-block:12px; background:color-mix(in srgb,var(--primary-color,#2563eb) 3%,var(--surface,#fff)); }
.route-row .turn-handle { color:var(--primary-color,#2563eb); }
.turn-message { overflow:hidden; display:-webkit-box; color:var(--text-primary,#0f172a); font-size:13px; line-height:1.45; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.turn-meta { display:flex; align-items:center; flex-wrap:wrap; gap:6px; color:var(--text-muted,#64748b); font-size:10px; }
.turn-source { color:var(--primary-color,#2563eb); }
.turn-attachments { display:inline-flex; align-items:center; gap:3px; }
.turn-actions { flex:0 0 auto; display:flex; align-items:center; gap:2px; }
.turn-actions button,.stop-turn,.queue-toggle { display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; color:var(--text-muted,#64748b); cursor:pointer; }
.turn-actions>button,.turn-more>button { min-width:30px; height:30px; padding:0 7px; border-radius:8px; }
.turn-actions button:hover,.queue-toggle:hover { background:color-mix(in srgb,var(--primary-color,#2563eb) 8%,transparent); color:var(--text-primary,#0f172a); }
.turn-actions .guide-turn { gap:5px; width:auto; padding-inline:9px; color:var(--text-secondary,#475569); font-size:12px; }
.turn-more { position:relative; }
.turn-menu { position:absolute; right:0; bottom:calc(100% + 6px); width:156px; display:grid; padding:5px; border:1px solid var(--border-color,#cbd5e1); border-radius:10px; background:var(--surface,#fff); box-shadow:0 14px 34px rgba(15,23,42,.16); z-index:20; }
.turn-menu button { justify-content:flex-start; width:100%; min-height:30px; padding:0 8px; border-radius:7px; font-size:11px; }
.turn-menu .danger { color:#dc2626; }
.queue-toggle { width:100%; justify-content:center; gap:5px; min-height:31px; border-top:1px solid color-mix(in srgb,var(--border-color,#cbd5e1) 48%,transparent); border-radius:0 0 16px 16px; font-size:10px; }
.queue-toggle svg { transition:transform .16s ease; }.queue-toggle svg.rotated { transform:rotate(180deg); }
.turn-control-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:31px; padding:2px 5px 0 10px; color:var(--text-muted,#64748b); font-size:10px; }
.stop-turn { gap:5px; min-height:27px; padding:0 8px; border-radius:7px; font-size:10px; font-weight:650; }
.stop-turn:hover { background:rgba(220,38,38,.07); color:#dc2626; }.stop-turn:disabled { cursor:wait; opacity:.55; }
.status-failed .turn-message,.status-failed .turn-meta { color:#b91c1c; }.status-sending .turn-meta { color:#059669; }.dispatch .turn-handle { color:var(--primary-color,#2563eb); }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
.compact { width:min(700px,calc(100% - 16px)); }
:global([data-theme="dark"] .turn-queue) { background:color-mix(in srgb,var(--surface,#111827) 96%,transparent); box-shadow:0 12px 30px rgba(0,0,0,.24); }
@media (max-width:720px) {
  .turn-control { width:calc(100% - 8px); margin-bottom:6px; }.turn-queue { border-radius:12px; }.turn-row { align-items:flex-start; padding:9px; }
  .turn-actions .guide-turn span,.stop-turn span { display:none; }.turn-actions .guide-turn { width:30px; padding:0; }.turn-message { -webkit-line-clamp:3; }
  .turn-control-footer>span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
}
@media (prefers-reduced-motion:reduce) { .queue-toggle svg { transition:none; } }
</style>
