<script setup>
import { computed } from 'vue'
import { Check } from '@lucide/vue'

const props = defineProps({
  plan: { type: Object, default: null },
  canConfirmExecute: Boolean,
  confirmExecuteBusy: Boolean,
})

const emit = defineEmits(['confirm-execute'])

const steps = computed(() => (
  Array.isArray(props.plan?.steps) ? props.plan.steps : []
).filter(step => String(step?.title || '').trim()))
const visible = computed(() => steps.value.length > 0)
</script>

<template>
  <article v-if="visible" class="presented-plan">
    <header class="presented-plan-head">
      <strong>{{ plan.title || '实施计划' }}</strong>
      <p>{{ plan.overview || plan.goal }}</p>
    </header>
    <ol class="presented-plan-steps">
      <li v-for="step in steps" :key="step.id || step.title">
        <span class="presented-plan-mark" aria-hidden="true">○</span>
        <span>{{ step.title }}</span>
      </li>
    </ol>
    <aside v-if="plan.exclusions?.length" class="presented-plan-exclusions">本次不包含：{{ plan.exclusions.join('、') }}</aside>
    <footer v-if="canConfirmExecute" class="presented-plan-actions">
      <button
        type="button"
        class="presented-plan-confirm"
        :disabled="confirmExecuteBusy"
        @click="emit('confirm-execute')"
      >
        <Check :size="14" />确认并执行
      </button>
    </footer>
  </article>
</template>

<style scoped>
.presented-plan {
  margin-top: 10px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.04);
  overflow: hidden;
}
.presented-plan-head {
  display: grid;
  gap: 4px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.12);
}
.presented-plan-head strong {
  color: var(--accent-blue);
  font-size: 13px;
}
.presented-plan-head p,
.presented-plan-exclusions {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.presented-plan-steps {
  margin: 0;
  padding: 8px 12px 10px;
  display: grid;
  gap: 4px;
  list-style: none;
}
.presented-plan-steps li {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 6px;
  align-items: start;
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.45;
}
.presented-plan-mark {
  color: var(--accent-blue, #2563eb);
  font-size: 10px;
  line-height: 1.45;
}
.presented-plan-exclusions {
  padding: 0 12px 10px;
}
.presented-plan-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px 10px;
  border-top: 1px solid rgba(59, 130, 246, 0.12);
}
.presented-plan-confirm {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 31px;
  padding: 0 11px;
  border: 1px solid var(--primary-color, #2563eb);
  border-radius: 7px;
  background: var(--primary-color, #2563eb);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}
.presented-plan-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
