<script setup>
defineProps({
  msg: { type: Object, required: true },
  accentStyle: { type: Object, default: () => ({}) },
})
</script>

<template>
  <div class="bubble project-task-intake" :style="accentStyle">
    <div class="project-task-head">
      <div>
        <span class="project-task-kicker">项目任务</span>
        <strong>{{ msg.task?.title || '项目开发任务' }}</strong>
      </div>
      <span class="project-task-status">{{ msg.queue?.queued === false ? '已保存' : '执行中' }}</span>
    </div>
    <div class="project-task-content">{{ msg.content }}</div>
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
</style>
