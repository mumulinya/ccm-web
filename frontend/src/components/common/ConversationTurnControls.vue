<script setup>
import { computed } from 'vue'
import { ListEnd, RotateCcw, Square, X } from '@lucide/vue'

const props = defineProps({
  busy: { type: Boolean, default: false },
  mode: { type: String, default: 'steer' },
  turns: { type: Array, default: () => [] },
  stopping: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['update:mode', 'stop', 'cancel', 'retry'])
const visibleTurns = computed(() => (props.turns || [])
  .filter(turn => ['queued', 'sending', 'failed'].includes(String(turn.status || '')))
  .slice(-4))
const statusLabel = (turn) => ({
  queued: turn.position ? `排队第 ${turn.position} 条` : '等待发送',
  sending: '正在发送',
  failed: '发送失败',
}[turn.status] || turn.status)
</script>

<template>
  <div v-if="busy || visibleTurns.length" class="turn-control" :class="{ compact: props.compact }" data-testid="conversation-turn-controls">
    <div v-if="busy" class="turn-control-toolbar">
      <div class="turn-mode" role="group" aria-label="工作中消息处理方式">
        <button type="button" :class="{ active: mode === 'steer' }" title="让 Agent 在安全节点把这条要求纳入当前工作" @click="emit('update:mode', 'steer')">引导当前</button>
        <button type="button" :class="{ active: mode === 'queue' }" title="当前工作结束后自动发送这条独立消息" @click="emit('update:mode', 'queue')">排队下一条</button>
      </div>
      <button class="stop-turn" type="button" :disabled="stopping" title="停止当前工作" aria-label="停止当前工作" @click="emit('stop')">
        <Square :size="14" fill="currentColor" />
        <span>{{ stopping ? '停止中' : '停止' }}</span>
      </button>
    </div>

    <div v-if="visibleTurns.length" class="turn-queue" aria-live="polite">
      <div class="turn-queue-title"><ListEnd :size="14" /><span>后续消息</span><strong>{{ visibleTurns.length }}</strong></div>
      <div v-for="turn in visibleTurns" :key="turn.id" class="turn-row" :class="`status-${turn.status}`">
        <span class="turn-status">{{ statusLabel(turn) }}</span>
        <span class="turn-message" :title="turn.message">{{ turn.message || '附件消息' }}</span>
        <button v-if="turn.status === 'failed'" type="button" title="重新排队" aria-label="重新排队" @click="emit('retry', turn)"><RotateCcw :size="13" /></button>
        <button v-else-if="turn.status === 'queued'" type="button" title="取消这条消息" aria-label="取消这条消息" @click="emit('cancel', turn)"><X :size="14" /></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.turn-control { padding: 8px 14px 0; border-top: 1px solid rgba(15,23,42,.08); background: color-mix(in srgb,var(--surface,#fff) 88%,transparent); }
.turn-control-toolbar,.turn-queue-title,.turn-row { display:flex; align-items:center; gap:8px; }
.turn-control-toolbar { justify-content:space-between; }
.turn-mode { display:inline-flex; padding:2px; border:1px solid rgba(15,23,42,.1); border-radius:7px; background:rgba(148,163,184,.09); }
.turn-mode button { min-height:28px; padding:0 10px; border:0; border-radius:5px; background:transparent; color:var(--text-muted,#64748b); cursor:pointer; font-size:12px; }
.turn-mode button.active { background:var(--surface,#fff); color:var(--text-primary,#0f172a); box-shadow:0 1px 3px rgba(15,23,42,.12); font-weight:700; }
.stop-turn { display:inline-flex; align-items:center; gap:6px; min-height:30px; padding:0 10px; border:1px solid rgba(220,38,38,.25); border-radius:7px; background:rgba(220,38,38,.05); color:#b91c1c; cursor:pointer; font-size:12px; font-weight:700; }
.stop-turn:disabled { opacity:.55; cursor:wait; }
.turn-queue { margin-top:7px; padding:7px 9px; border:1px solid rgba(15,23,42,.08); border-radius:7px; background:rgba(148,163,184,.05); }
.turn-queue-title { color:var(--text-secondary,#475569); font-size:11px; font-weight:700; }
.turn-queue-title strong { min-width:18px; padding:1px 5px; border-radius:5px; background:rgba(37,99,235,.1); color:#2563eb; text-align:center; }
.turn-row { min-height:28px; margin-top:4px; border-top:1px solid rgba(15,23,42,.06); padding-top:4px; font-size:11px; }
.turn-status { flex:0 0 auto; color:#2563eb; font-weight:700; }
.turn-message { min-width:0; flex:1; overflow:hidden; color:var(--text-secondary,#475569); text-overflow:ellipsis; white-space:nowrap; }
.turn-row button { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; padding:0; border:0; border-radius:5px; background:transparent; color:var(--text-muted,#64748b); cursor:pointer; }
.turn-row button:hover { background:rgba(15,23,42,.08); color:var(--text-primary,#0f172a); }
.status-failed .turn-status { color:#dc2626; }
.status-sending .turn-status { color:#059669; }
.compact { padding-inline:0; }
:global([data-theme="dark"] .turn-control) { border-color:rgba(255,255,255,.08); background:rgba(15,23,42,.78); }
:global([data-theme="dark"] .turn-mode),:global([data-theme="dark"] .turn-queue) { border-color:rgba(255,255,255,.1); }
:global([data-theme="dark"] .turn-mode button.active) { background:#1e293b; color:#f8fafc; }
@media (max-width:720px) { .turn-control-toolbar { align-items:stretch; } .turn-mode { flex:1; } .turn-mode button { flex:1; padding-inline:6px; } .stop-turn span { display:none; } }
</style>
