<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { X } from '@lucide/vue'
import TaskExperiencePanel from './TaskExperiencePanel.vue'
import TaskExperienceDetail from './TaskExperienceDetail.vue'
import TaskExperienceSummary from './TaskExperienceSummary.vue'
import { normalizeTaskRuntimePhase } from '../../composables/useTaskRuntimeStatus.js'
import { buildTaskRolePresentation } from '../../utils/taskJourneyPresentation.js'

const props = defineProps({
  card: { type: Object, required: true },
  context: { type: String, default: 'task' },
  busy: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  suppressPlan: { type: Boolean, default: false },
})

const emit = defineEmits(['action'])
const detailsOpen = ref(false)

const phaseLabel = () => buildTaskRolePresentation(
  props.context,
  normalizeTaskRuntimePhase(props.card),
  props.card,
).phaseMeta.label

const closeDetails = () => { detailsOpen.value = false }
const onKeydown = (event) => {
  if (event.key === 'Escape' && detailsOpen.value) closeDetails()
}

watch(() => props.card?.task_id || props.card?.taskId || props.card?.id || '', closeDetails)
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <TaskExperienceSummary
    v-if="card && compact"
    :card="card"
    :context="context"
    :busy="busy"
    :suppress-plan="suppressPlan"
    @action="emit('action', $event)"
    @open-details="detailsOpen = true"
  />
  <TaskExperiencePanel v-else-if="card" :card="card" :context="context" :busy="busy" :suppress-plan="suppressPlan" @action="emit('action', $event)" />

  <Teleport to="body">
    <div v-if="card && compact && detailsOpen" class="task-detail-overlay" role="presentation" @mousedown.self="closeDetails">
      <aside class="task-detail-drawer" role="dialog" aria-modal="true" :aria-label="`${card.title || '任务'}详情`">
        <header class="task-detail-head">
          <div>
            <small>{{ context === 'global' ? '全局任务' : context === 'project' ? '项目任务' : '群聊任务' }} · {{ phaseLabel() }}</small>
            <strong>{{ card.title || card.goal || '任务详情' }}</strong>
          </div>
          <button type="button" title="关闭详情" aria-label="关闭详情" @click="closeDetails"><X :size="18" /></button>
        </header>
        <div class="task-detail-body">
          <TaskExperienceDetail :card="card" :context="context" :busy="busy" :suppress-plan="suppressPlan" @action="emit('action', $event)" />
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.task-detail-overlay {
  position: fixed;
  z-index: 2200;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgba(8, 12, 18, .48);
  backdrop-filter: blur(2px);
}
.task-detail-drawer {
  width: min(760px, 92vw);
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border-left: 1px solid var(--border-color);
  background: var(--bg-primary);
  box-shadow: -18px 0 50px rgba(0, 0, 0, .2);
}
.task-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface);
}
.task-detail-head > div { display: grid; min-width: 0; gap: 2px; }
.task-detail-head small { color: var(--text-muted); font-size: 10px; font-weight: 800; }
.task-detail-head strong { overflow: hidden; color: var(--text-primary); font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.task-detail-head button { width: 32px; height: 32px; display: grid; flex: none; place-items: center; border: 1px solid var(--border-color); border-radius: 6px; background: var(--surface); color: var(--text-secondary); cursor: pointer; }
.task-detail-head button:hover { color: var(--text-primary); background: var(--panel-muted); }
.task-detail-body { min-height: 0; overflow: hidden; }
@media (max-width: 680px) {
  .task-detail-drawer { width: 100%; }
}
</style>
