<script setup>
import { computed } from 'vue'

const props = defineProps({
  msg: { type: Object, required: true },
  displayContent: { type: String, default: '' },
  accentStyle: { type: Object, default: () => ({}) },
})

const intakeSummary = computed(() => props.msg?.intakeSummary || props.msg?.intake_summary || null)
const intakeItems = computed(() => Array.isArray(intakeSummary.value?.items) ? intakeSummary.value.items : [])
const taskStatusLabel = computed(() => {
  if (intakeSummary.value?.status_label) return intakeSummary.value.status_label
  if (props.msg?.queue?.queued === false) {
    return String(props.msg?.queue?.message || '').includes('确认') ? '等待确认' : '已保存'
  }
  return '已入队'
})
</script>

<template>
  <div class="bubble project-task-intake" :style="accentStyle">
    <div class="project-task-head">
      <div>
        <span class="project-task-kicker">项目任务</span>
        <strong>{{ msg.task?.title || '项目开发任务' }}</strong>
      </div>
      <span class="project-task-status">{{ taskStatusLabel }}</span>
    </div>
    <div class="project-task-content">{{ displayContent || msg.content }}</div>
    <section v-if="intakeSummary" class="project-task-next" :class="intakeSummary.status">
      <header>
        <span>{{ intakeSummary.title || '接下来' }}</span>
        <strong>{{ intakeSummary.status_label || '已接管' }}</strong>
      </header>
      <p v-if="intakeSummary.headline">{{ intakeSummary.headline }}</p>
      <div v-if="intakeItems.length" class="project-task-next-grid">
        <div v-for="item in intakeItems" :key="item.label || item.value">
          <small>{{ item.label }}</small>
          <b>{{ item.value }}</b>
        </div>
      </div>
      <small v-if="intakeSummary.next_action" class="project-task-next-action">下一步：{{ intakeSummary.next_action }}</small>
    </section>
    <slot />
  </div>
</template>

<style scoped>
.project-task-intake {
  border-left: 3px solid var(--accent-blue);
  background: rgba(37, 99, 235, 0.045);
}
.project-task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}
.project-task-head > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.project-task-head strong {
  font-size: 14px;
  overflow-wrap: anywhere;
}
.project-task-kicker {
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 700;
}
.project-task-status {
  flex: none;
  padding: 3px 7px;
  border-radius: 4px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 700;
}
.project-task-content {
  white-space: pre-wrap;
  line-height: 1.65;
  color: var(--text-secondary);
}
.project-task-next {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  background: rgba(239, 246, 255, 0.72);
}
.project-task-next.waiting_confirmation {
  border-color: rgba(245, 158, 11, 0.24);
  background: rgba(255, 251, 235, 0.78);
}
.project-task-next header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.project-task-next header span,
.project-task-next header strong {
  color: var(--accent-blue);
  font-size: 11px;
  font-weight: 800;
}
.project-task-next.waiting_confirmation header span,
.project-task-next.waiting_confirmation header strong {
  color: #92400e;
}
.project-task-next p {
  margin: 0 0 8px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.project-task-next-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 7px;
}
.project-task-next-grid div {
  min-width: 0;
  display: grid;
  gap: 3px;
  padding: 7px 8px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.68);
}
.project-task-next-grid small {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
}
.project-task-next-grid b {
  color: var(--text-primary);
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.project-task-next-action {
  display: block;
  margin-top: 8px;
  color: var(--accent-blue);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
</style>
