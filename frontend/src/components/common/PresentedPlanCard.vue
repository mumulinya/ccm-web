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
const files = computed(() => Array.isArray(props.plan?.files) ? props.plan.files.filter(item => String(item?.path || '').trim()) : [])
const scope = computed(() => Array.isArray(props.plan?.scope) ? props.plan.scope.filter(Boolean) : [])
const verification = computed(() => Array.isArray(props.plan?.verification) ? props.plan.verification.filter(item => String(item?.expected || item?.command || '').trim()) : [])
const risks = computed(() => Array.isArray(props.plan?.risks) ? props.plan.risks.filter(Boolean) : [])
const exclusions = computed(() => Array.isArray(props.plan?.exclusions) ? props.plan.exclusions.filter(Boolean) : [])
</script>

<template>
  <article v-if="visible" class="presented-plan">
    <header class="presented-plan-head">
      <strong>{{ plan.title || '实施计划' }}</strong>
      <p>{{ plan.context || plan.overview || plan.goal }}</p>
    </header>
    <section v-if="plan.goal" class="presented-plan-section">
      <h4>目标结果</h4><p>{{ plan.goal }}</p>
    </section>
    <section v-if="plan.approach" class="presented-plan-section">
      <h4>推荐方案</h4><p>{{ plan.approach }}</p>
    </section>
    <section v-if="scope.length" class="presented-plan-section">
      <h4>影响范围</h4><p>{{ scope.join('、') }}</p>
    </section>
    <ol class="presented-plan-steps">
      <li v-for="step in steps" :key="step.id || step.title">
        <span class="presented-plan-mark" aria-hidden="true">○</span>
        <span><strong>{{ step.title }}</strong><small v-if="step.objective || step.description">{{ step.objective || step.description }}</small><small v-if="step.acceptance?.length">验收：{{ step.acceptance.join('；') }}</small></span>
      </li>
    </ol>
    <section v-if="files.length" class="presented-plan-section">
      <h4>涉及文件</h4>
      <ul class="presented-plan-list"><li v-for="file in files" :key="`${file.project}:${file.path}`"><code>{{ file.project ? `${file.project}/` : '' }}{{ file.path }}</code><small>{{ file.reason }}</small></li></ul>
    </section>
    <section v-if="verification.length" class="presented-plan-section">
      <h4>验证方式</h4><ul class="presented-plan-list"><li v-for="item in verification" :key="item.command || item.expected"><code v-if="item.command">{{ item.command }}</code><span>{{ item.expected }}</span></li></ul>
    </section>
    <aside v-if="risks.length" class="presented-plan-exclusions">风险：{{ risks.join('、') }}</aside>
    <aside v-if="exclusions.length" class="presented-plan-exclusions">本次不做：{{ exclusions.join('、') }}</aside>
    <details v-if="plan.revision || plan.checksum" class="presented-plan-technical"><summary>技术详情</summary><span>revision {{ plan.revision || 1 }} · {{ plan.checksum ? plan.checksum.slice(0, 12) : '未提供 checksum' }}</span></details>
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
.presented-plan-section { display: grid; gap: 4px; padding: 8px 12px 0; }
.presented-plan-section h4 { margin: 0; color: var(--text-secondary); font-size: 11px; font-weight: 600; }
.presented-plan-section p { margin: 0; color: var(--text-primary); font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
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
.presented-plan-steps li > span:last-child { display: grid; gap: 2px; }
.presented-plan-steps small, .presented-plan-list small { color: var(--text-secondary); font-size: 11px; line-height: 1.4; }
.presented-plan-list { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.presented-plan-list li { display: grid; gap: 2px; color: var(--text-primary); font-size: 11px; line-height: 1.4; }
.presented-plan-list code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono, ui-monospace, monospace); }
.presented-plan-technical { margin: 0 12px 10px; color: var(--text-muted); font-size: 10px; }
.presented-plan-technical summary { cursor: pointer; color: var(--text-secondary); }
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
