<script setup>
import { computed } from 'vue'
import { CornerDownRight, ListEnd, RotateCcw, Square, Trash2 } from '@lucide/vue'

const props = defineProps({
  busy: { type: Boolean, default: false },
  turns: { type: Array, default: () => [] },
  stopping: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['stop', 'cancel', 'guide', 'retry'])
const visibleTurns = computed(() => (props.turns || [])
  .filter(turn => ['queued', 'sending', 'failed'].includes(String(turn.status || ''))))
const statusLabel = (turn) => ({
  queued: turn.mode === 'steer' ? '等待引导' : (turn.position ? `第 ${turn.position} 条` : '等待发送'),
  sending: '正在发送',
  failed: '发送失败',
}[turn.status] || turn.status)
</script>

<template>
  <div v-if="busy || visibleTurns.length" class="turn-control" :class="{ compact: props.compact }" data-testid="conversation-turn-controls">
    <div v-if="visibleTurns.length" class="turn-queue" aria-live="polite">
      <div v-for="turn in visibleTurns" :key="turn.id" class="turn-row" :class="`status-${turn.status}`">
        <ListEnd class="turn-handle" :size="15" aria-hidden="true" />
        <span class="turn-message" :title="turn.message">{{ turn.message || '附件消息' }}</span>
        <span class="turn-status">{{ statusLabel(turn) }}</span>
        <button
          v-if="busy && turn.status === 'queued' && turn.mode !== 'steer'"
          class="guide-turn"
          type="button"
          title="把这条消息优先纳入当前工作"
          @click="emit('guide', turn)"
        >
          <CornerDownRight :size="14" />
          <span>引导</span>
        </button>
        <button v-if="turn.status === 'failed'" type="button" title="重新排队" aria-label="重新排队" @click="emit('retry', turn)">
          <RotateCcw :size="14" />
        </button>
        <button v-else-if="turn.status === 'queued'" type="button" title="删除这条排队消息" aria-label="删除这条排队消息" @click="emit('cancel', turn)">
          <Trash2 :size="14" />
        </button>
      </div>
    </div>
    <div v-if="busy" class="turn-control-footer">
      <span v-if="visibleTurns.length">新消息会在当前工作结束后按顺序发送</span>
      <span v-else>Agent 正在工作，新消息可继续排队</span>
      <button class="stop-turn" type="button" :disabled="stopping" title="停止当前工作" aria-label="停止当前工作" @click="emit('stop')">
        <Square :size="12" fill="currentColor" />
        <span>{{ stopping ? '停止中' : '停止' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.turn-control {
  padding: 0 14px;
  border-top: 1px solid color-mix(in srgb, var(--border-color, rgba(15, 23, 42, .1)) 72%, transparent);
  background: color-mix(in srgb, var(--surface, #fff) 94%, transparent);
}

.turn-queue {
  max-height: 176px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.turn-row {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 42px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color, rgba(15, 23, 42, .1)) 66%, transparent);
  color: var(--text-secondary, #475569);
}

.turn-row:last-child {
  border-bottom: 0;
}

.turn-handle {
  flex: 0 0 auto;
  color: var(--text-muted, #94a3b8);
}

.turn-message {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--text-primary, #0f172a);
  font-size: 13px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.turn-status {
  flex: 0 0 auto;
  color: var(--text-muted, #64748b);
  font-size: 11px;
}

.turn-row button,
.stop-turn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
}

.turn-row button {
  flex: 0 0 auto;
  min-width: 28px;
  height: 28px;
  padding: 0 7px;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted, #64748b);
}

.turn-row button:hover {
  background: color-mix(in srgb, var(--accent-blue, #2563eb) 9%, transparent);
  color: var(--text-primary, #0f172a);
}

.turn-row .guide-turn {
  gap: 5px;
  min-width: auto;
  padding-inline: 8px;
  color: var(--text-secondary, #475569);
  font-size: 12px;
}

.turn-control-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  color: var(--text-muted, #64748b);
  font-size: 11px;
}

.stop-turn {
  gap: 5px;
  min-height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted, #64748b);
  font-size: 11px;
  font-weight: 700;
}

.stop-turn:hover {
  background: rgba(220, 38, 38, .07);
  color: #dc2626;
}

.stop-turn:disabled {
  cursor: wait;
  opacity: .55;
}

.status-failed .turn-status,
.status-failed .turn-message {
  color: #b91c1c;
}

.status-sending .turn-status {
  color: #059669;
}

.compact {
  padding-inline: 10px;
}

:global([data-theme="dark"] .turn-control) {
  border-color: rgba(255, 255, 255, .08);
  background: color-mix(in srgb, var(--surface, #111827) 92%, transparent);
}

@media (max-width: 720px) {
  .turn-control {
    padding-inline: 10px;
  }

  .turn-status {
    display: none;
  }

  .turn-row .guide-turn span,
  .stop-turn span {
    display: none;
  }

  .turn-row .guide-turn {
    width: 28px;
    padding: 0;
  }

  .turn-control-footer > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
