<script setup>
import { Check, Pencil, ShieldCheck } from '@lucide/vue'

defineProps({
  request: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
  busy: Boolean,
  canConfirm: Boolean,
  canRevise: Boolean,
  canOpenDetail: Boolean,
})

const emit = defineEmits(['update:modelValue', 'confirm', 'revise', 'open-detail'])
</script>

<template>
  <section v-if="request" class="plan-confirmation-panel" aria-label="待确认方案">
    <header>
      <span class="plan-confirmation-icon"><ShieldCheck :size="16" /></span>
      <div>
        <strong>{{ request.title || '需要你确认后才执行' }}</strong>
        <p>{{ request.headline || '确认后才会按这份方案开始执行。' }}</p>
      </div>
      <span class="plan-confirmation-status">{{ request.status_label || '待确认' }}</span>
    </header>

    <ul v-if="rows.length">
      <li v-for="item in rows" :key="item"><Check :size="12" />{{ item }}</li>
    </ul>

    <label v-if="canConfirm" class="plan-confirmation-feedback">
      <span>修改要求 <small>可选</small></span>
      <textarea
        :value="modelValue"
        :disabled="busy"
        maxlength="600"
        rows="2"
        placeholder="例如：同时更新 README，并保留旧接口兼容"
        @input="emit('update:modelValue', $event.target.value)"
      />
    </label>

    <small v-if="request.feedback_hint || request.feedbackHint" class="plan-confirmation-hint">{{ request.feedback_hint || request.feedbackHint }}</small>

    <footer v-if="canConfirm || canRevise || canOpenDetail">
      <button v-if="canOpenDetail" type="button" class="secondary" :disabled="busy" @click="emit('open-detail')"><Pencil :size="14" />查看并修改计划</button>
      <button v-if="canRevise" type="button" class="secondary" :disabled="busy" @click="emit('revise')"><Pencil :size="14" />修改计划</button>
      <button v-if="canConfirm" type="button" class="primary" :disabled="busy" @click="emit('confirm')"><Check :size="14" />确认并执行</button>
    </footer>
  </section>
</template>

<style scoped>
.plan-confirmation-panel{display:grid;gap:9px;margin-top:10px;overflow:hidden;border:1px solid color-mix(in srgb,var(--border-color,#94a3b8) 72%,transparent);border-radius:9px;background:color-mix(in srgb,var(--surface,#fff) 98%,var(--primary-color,#2563eb) 2%)}
header{display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:start;gap:9px;padding:11px 12px 8px}
.plan-confirmation-icon{width:26px;height:26px;display:grid;place-items:center;border-radius:7px;color:var(--primary-color,#2563eb);background:color-mix(in srgb,var(--primary-color,#2563eb) 9%,transparent)}
header div{min-width:0} strong{display:block;color:var(--text-primary,#0f172a);font-size:12px} p{margin:3px 0 0;color:var(--text-secondary,#64748b);font-size:10.5px;line-height:1.5}.plan-confirmation-status{color:#b45309;font-size:10px;white-space:nowrap}
ul{display:grid;gap:5px;margin:0;padding:0 12px;list-style:none}li{display:flex;align-items:flex-start;gap:6px;color:var(--text-secondary,#475569);font-size:10.5px;line-height:1.45}li svg{flex:none;margin-top:2px;color:#15803d}
.plan-confirmation-feedback{display:grid;gap:5px;padding:0 12px;color:var(--text-primary,#334155);font-size:10.5px}.plan-confirmation-feedback small{color:var(--text-muted,#94a3b8)}textarea{box-sizing:border-box;width:100%;min-height:52px;padding:8px 9px;border:1px solid var(--border-color,#cbd5e1);border-radius:7px;background:var(--surface,#fff);color:var(--text-primary,#0f172a);font:inherit;line-height:1.45;resize:vertical}.plan-confirmation-hint{padding:0 12px;color:var(--text-muted,#64748b);font-size:9.5px;line-height:1.45}
footer{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:8px;padding:9px 12px;border-top:1px solid color-mix(in srgb,var(--border-color,#94a3b8) 62%,transparent);background:color-mix(in srgb,var(--surface,#fff) 96%,transparent);backdrop-filter:blur(8px)}button{display:inline-flex;align-items:center;gap:5px;min-height:31px;padding:0 11px;border-radius:7px;font-size:10.5px;cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}.secondary{border:1px solid var(--border-color,#cbd5e1);background:transparent;color:var(--text-secondary,#475569)}.primary{border:1px solid var(--primary-color,#2563eb);background:var(--primary-color,#2563eb);color:#fff}
@media(max-width:680px){header{grid-template-columns:26px minmax(0,1fr)}.plan-confirmation-status{grid-column:2}footer{position:static}button{flex:1;justify-content:center}}
</style>
