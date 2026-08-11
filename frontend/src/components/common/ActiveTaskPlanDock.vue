<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  activePlanMessageIndex,
  activePlanStepEvent,
  projectActiveTaskPlans,
} from '../../utils/activeTaskPlans.js'

const props = defineProps({
  events: { type: Array, default: () => [] },
  messages: { type: Array, default: () => [] },
  exactSessionId: { type: String, default: '' },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['locate', 'execution-action'])

const now = ref(Date.now())
const expanded = ref(false)
const showAll = ref(false)
let timer = null

const allPlans = computed(() => projectActiveTaskPlans(props.events, { exactSessionId: props.exactSessionId }))
const visiblePlans = computed(() => allPlans.value.filter(plan => (
  plan.status !== 'queued'
  && (plan.status !== 'completed' || (plan.completedAt > 0 && now.value - plan.completedAt <= 3_000))
)))
const selectedPlan = computed(() => visiblePlans.value.find(plan => plan.status === 'executing')
  || visiblePlans.value.find(plan => ['blocked', 'interrupted', 'ready'].includes(plan.status))
  || visiblePlans.value.find(plan => plan.status === 'completed')
  || null)
const currentStepIndex = computed(() => Math.max(0, selectedPlan.value?.steps?.findIndex(step => step.id === selectedPlan.value?.currentStepId) ?? 0))
const visibleSteps = computed(() => {
  const steps = selectedPlan.value?.steps || []
  if (showAll.value || steps.length <= 5) return steps
  const start = Math.max(0, Math.min(currentStepIndex.value - 2, steps.length - 5))
  return steps.slice(start, start + 5)
})
const hiddenStepCount = computed(() => Math.max(0, (selectedPlan.value?.steps?.length || 0) - visibleSteps.value.length))
const currentOrdinal = computed(() => {
  if (!selectedPlan.value?.totalCount) return 0
  if (selectedPlan.value.status === 'completed') return selectedPlan.value.totalCount
  return Math.min(selectedPlan.value.totalCount, currentStepIndex.value + 1)
})
const statusLabel = computed(() => ({
  ready: '计划已就绪',
  executing: '正在执行',
  blocked: '需要处理',
  interrupted: '执行已中断，现场已保留',
  completed: '全部完成',
}[selectedPlan.value?.status] || '正在执行'))
const enabledActions = computed(() => (selectedPlan.value?.actions || []).filter(action => action?.label))

const toggleExpanded = () => {
  expanded.value = !expanded.value
  if ((selectedPlan.value?.steps?.length || 0) > 5) showAll.value = expanded.value
}

watch(() => props.exactSessionId, () => {
  expanded.value = false
  showAll.value = false
}, { immediate: true })

const stepMark = step => ({
  completed: '✓',
  running: '●',
  rework: '↻',
  blocked: '!',
  skipped: '–',
  pending: '○',
}[step?.status] || '○')

const locateStep = step => {
  const plan = selectedPlan.value
  if (!plan) return
  const event = activePlanStepEvent(plan, step?.id)
  const messageIndex = activePlanMessageIndex(props.messages, plan)
  const detail = {
    messageIndex,
    anchorMessageId: plan.anchorMessageId,
    eventId: event?.eventId || plan.planEventId,
    planStepId: step?.id || '',
  }
  emit('locate', detail)
  if (typeof window !== 'undefined') window.requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('ccm:locate-execution-event', { detail }))
  })
}

const runAction = action => {
  if (!action?.enabled || !selectedPlan.value) return
  emit('execution-action', {
    messageIndex: activePlanMessageIndex(props.messages, selectedPlan.value),
    action: {
      ...action,
      task_id: action.taskId || selectedPlan.value.taskId,
      taskId: action.taskId || selectedPlan.value.taskId,
      workItemId: action.workItemId || '',
      eventId: action.eventId || '',
    },
  })
}

onMounted(() => { timer = window.setInterval(() => { now.value = Date.now() }, 500) })
onBeforeUnmount(() => { if (timer) window.clearInterval(timer) })
</script>

<template>
  <Transition name="ccm-plan-dock">
    <section
      v-if="active && selectedPlan"
      class="active-task-plan-dock"
      :class="[selectedPlan.status, { expanded }]"
      aria-label="当前任务实施计划"
    >
      <header class="plan-dock-head">
        <button type="button" class="plan-dock-title" :aria-expanded="expanded" @click="toggleExpanded">
          <span>
            <strong>{{ selectedPlan.title }}</strong>
            <small aria-live="polite">{{ statusLabel }}</small>
          </span>
          <i>{{ expanded ? '⌃' : '⌄' }}</i>
        </button>
      </header>

      <ol class="plan-dock-steps">
        <li
          v-for="step in visibleSteps"
          :key="step.id"
          :class="[step.status, { current: step.id === selectedPlan.currentStepId }]"
        >
          <button
            type="button"
            :aria-current="step.id === selectedPlan.currentStepId ? 'step' : undefined"
            :title="`定位到执行现场：${step.title}`"
            @click="locateStep(step)"
          >
            <span class="plan-step-mark" aria-hidden="true">{{ stepMark(step) }}</span>
            <span class="plan-step-title">{{ step.title }}</span>
            <small v-if="step.project">{{ step.project }}</small>
          </button>
        </li>
      </ol>

      <footer class="plan-dock-foot">
        <button v-if="hiddenStepCount" type="button" class="plan-show-all" @click="showAll = !showAll">
          {{ showAll ? '收起步骤' : `查看其余${hiddenStepCount}步` }}
        </button>
        <span>第 {{ currentOrdinal }} / {{ selectedPlan.totalCount }} 步</span>
      </footer>

      <div v-if="['blocked', 'interrupted'].includes(selectedPlan.status) && enabledActions.length" class="plan-dock-actions" aria-label="任务处理操作">
        <button
          v-for="action in enabledActions"
          :key="action.id"
          type="button"
          :disabled="!action.enabled"
          :title="action.disabledReason || action.label"
          @click="runAction(action)"
        >{{ action.label }}</button>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.active-task-plan-dock {
  position: relative;
  width: min(440px, calc(100% - 24px));
  margin: 0 auto 9px;
  overflow: visible;
  border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 58%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface, #fff) 96%, transparent);
  box-shadow: 0 12px 30px rgba(15, 23, 42, .12), 0 2px 8px rgba(15, 23, 42, .06);
  backdrop-filter: blur(12px);
  color: var(--text-primary, #0f172a);
  z-index: 8;
}
.active-task-plan-dock.blocked { border-color: color-mix(in srgb, #dc2626 42%, var(--border-color, #94a3b8)); }
.active-task-plan-dock.interrupted { border-color: color-mix(in srgb, #d97706 44%, var(--border-color, #94a3b8)); }
.active-task-plan-dock.completed { border-color: color-mix(in srgb, #16a34a 42%, var(--border-color, #94a3b8)); }
.plan-dock-head { display: flex; align-items: center; gap: 8px; min-height: 43px; padding: 5px 7px 4px 12px; }
.plan-dock-title { min-width: 0; flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 2px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.plan-dock-title > span { min-width: 0; display: grid; gap: 1px; }
.plan-dock-title strong { overflow: hidden; color: var(--text-primary, #0f172a); font-size: 12px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.plan-dock-title small { color: var(--text-muted, #64748b); font-size: 9px; }
.blocked .plan-dock-title small { color: #dc2626; }
.interrupted .plan-dock-title small { color: #b45309; }
.completed .plan-dock-title small { color: #15803d; }
.plan-dock-title i { color: var(--text-muted, #64748b); font-size: 10px; font-style: normal; }
.plan-dock-steps { display: grid; gap: 0; margin: 0; padding: 1px 11px 5px; list-style: none; }
.plan-dock-steps li button { width: 100%; min-height: 27px; display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 6px; padding: 3px 5px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary, #475569); text-align: left; cursor: pointer; }
.plan-dock-steps li button:hover { background: rgba(100, 116, 139, .07); }
.plan-dock-steps li.current button { color: var(--text-primary, #0f172a); background: color-mix(in srgb, var(--primary-color, #2563eb) 7%, transparent); }
.plan-dock-steps li.completed button, .plan-dock-steps li.skipped button { opacity: .66; }
.plan-step-mark { width: 17px; height: 17px; display: inline-grid; place-items: center; border-radius: 50%; color: var(--text-muted, #64748b); border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 78%, transparent); font-size: 9px; line-height: 1; }
.plan-dock-steps li.completed .plan-step-mark { color: #15803d; border-color: rgba(22, 163, 74, .25); background: rgba(22, 163, 74, .09); }
.plan-dock-steps li.running .plan-step-mark { color: var(--primary-color, #2563eb); border-color: color-mix(in srgb, var(--primary-color, #2563eb) 35%, transparent); background: color-mix(in srgb, var(--primary-color, #2563eb) 9%, transparent); animation: plan-step-pulse 1.7s ease-in-out infinite; }
.plan-dock-steps li.rework .plan-step-mark { color: #d97706; border-color: rgba(217, 119, 6, .28); background: rgba(217, 119, 6, .09); }
.plan-dock-steps li.blocked .plan-step-mark { color: #dc2626; border-color: rgba(220, 38, 38, .28); background: rgba(220, 38, 38, .09); }
.plan-step-title { min-width: 0; overflow: hidden; font-size: 10.5px; font-weight: 560; text-overflow: ellipsis; white-space: nowrap; }
.plan-dock-steps small { max-width: 105px; overflow: hidden; color: var(--text-muted, #64748b); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.plan-dock-foot { min-height: 29px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 2px 13px 7px; color: var(--text-muted, #64748b); font-size: 9px; }
.plan-show-all { margin-right: auto; padding: 2px 0; border: 0; background: transparent; color: var(--primary-color, #2563eb); font-size: 9px; cursor: pointer; }
.plan-dock-actions { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 11px 10px; border-top: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 42%, transparent); }
.plan-dock-actions button { min-height: 28px; padding: 0 9px; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 62%, transparent); border-radius: 7px; background: transparent; color: var(--text-secondary, #475569); font-size: 9px; cursor: pointer; }
.plan-dock-actions button:hover:not(:disabled) { border-color: var(--primary-color, #2563eb); color: var(--primary-color, #2563eb); }
.plan-dock-actions button:disabled { opacity: .45; cursor: not-allowed; }
.plan-dock-enter-active, .plan-dock-leave-active { transition: opacity .18s ease, transform .18s ease; }
.plan-dock-enter-from, .plan-dock-leave-to { opacity: 0; transform: translateY(8px) scale(.985); }
@keyframes plan-step-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-color, #2563eb) 18%, transparent); } 50% { box-shadow: 0 0 0 4px transparent; } }
@media (max-width: 720px) {
  .active-task-plan-dock { width: calc(100% - 8px); margin-bottom: 7px; border-radius: 11px; }
  .plan-dock-head { min-height: 40px; padding-left: 10px; }
  .plan-dock-steps li:not(.current) { display: none; }
  .active-task-plan-dock.expanded .plan-dock-steps li { display: block; }
  .plan-dock-steps { padding-inline: 8px; }
  .plan-dock-steps small { display: none; }
  .plan-dock-foot { padding-inline: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .plan-dock-steps li.running .plan-step-mark { animation: none; }
  .plan-dock-enter-active, .plan-dock-leave-active { transition: none; }
}
</style>
