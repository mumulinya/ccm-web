<script setup>
defineProps({
  project: { type: Object, default: null },
  agentOptions: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'switch-agent'])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal project-agent-switch-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>切换 Agent - {{ project?.name }}</h3>
      <div class="switch-hint">
        当前: {{ project?.agent }} · 需要先停止再切换
      </div>
      <div class="agent-list">
        <div
          v-for="agent in agentOptions"
          :key="agent.type"
          class="agent-option"
          :class="{ active: project?.agent === agent.type }"
          @click="emit('switch-agent', agent.type)"
        >
          <span class="agent-name">{{ agent.name }} {{ project?.agent === agent.type ? '← 当前' : '' }}</span>
          <span class="agent-type">{{ agent.type }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-agent-switch-modal { min-width: 420px; }
.switch-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 16px; }
.agent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.agent-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s;
  background: rgba(255, 255, 255, 0.4);
}
.agent-option:hover {
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.03);
}
.agent-option.active {
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.06);
}
.agent-name {
  font-size: 13.5px;
  color: var(--text-primary);
  font-weight: 600;
}
.agent-type {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'Share Tech Mono', monospace;
}
</style>
