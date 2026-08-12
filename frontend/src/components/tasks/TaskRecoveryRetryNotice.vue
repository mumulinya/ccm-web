<script setup>
import { RotateCw } from '@lucide/vue'

defineProps({
  presentation: { type: Object, required: true },
  actions: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['action'])
</script>

<template>
  <section v-if="presentation.visible" class="task-recovery-retry" role="status" aria-live="polite">
    <RotateCw :size="16" :class="{ spinning: presentation.safeAuto }" aria-hidden="true" />
    <div>
      <strong>{{ presentation.title }}</strong>
      <span>{{ presentation.statusText }}</span>
      <small>{{ presentation.detail }}</small>
    </div>
    <div v-if="actions.length" class="task-recovery-actions">
      <button
        v-for="action in actions"
        :key="action.id || action.kind"
        type="button"
        :disabled="busy"
        :class="action.tone || 'outline'"
        @click="emit('action', action)"
      >{{ action.label }}</button>
    </div>
  </section>
</template>

<style scoped>
.task-recovery-retry { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:start; gap:9px 11px; margin:10px 0; padding:10px 11px; border:1px solid color-mix(in srgb,#f59e0b 34%,var(--border-color)); border-radius:8px; background:color-mix(in srgb,var(--surface) 90%,#fef3c7); }
.task-recovery-retry>svg { margin-top:2px; color:#d97706; }
.task-recovery-retry>div:not(.task-recovery-actions) { display:grid; min-width:0; gap:2px; }
.task-recovery-retry strong { color:var(--text-primary); font-size:12px; line-height:1.35; }
.task-recovery-retry span { color:#92400e; font-size:11.5px; font-weight:800; line-height:1.4; }
.task-recovery-retry small { color:var(--text-muted); font-size:10.5px; line-height:1.4; }
.task-recovery-actions { display:flex; align-items:center; gap:6px; }
.task-recovery-actions button { min-height:30px; padding:5px 9px; border:1px solid var(--border-color); border-radius:6px; background:var(--surface); color:var(--text-secondary); font:inherit; font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; }
.task-recovery-actions button.primary { border-color:#2563eb; background:#2563eb; color:#fff; }
.task-recovery-actions button.danger { border-color:#fecaca; color:#b91c1c; }
.task-recovery-actions button:disabled { opacity:.55; cursor:not-allowed; }
.spinning { animation:recovery-spin 1.2s linear infinite; }
@keyframes recovery-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion:reduce) { .spinning { animation:none; } }
@media (max-width:640px) { .task-recovery-retry { grid-template-columns:auto minmax(0,1fr); } .task-recovery-actions { grid-column:1/-1; padding-left:25px; } }
</style>
