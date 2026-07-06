<script setup>
defineProps({
  msg: { type: Object, required: true },
})
</script>

<template>
  <div class="bubble conflict-plan-bubble">
    <div class="conflict-plan-head">
      <strong>跨 Agent 冲突保护</strong>
      <span>已自动串行</span>
    </div>
    <div class="conflict-plan-content">{{ msg.content }}</div>
    <div v-if="msg.conflictPlan?.conflicts?.length" class="conflict-plan-list">
      <div v-for="(conflict, conflictIndex) in msg.conflictPlan.conflicts" :key="`${conflict.projects?.join(':')}:${conflictIndex}`">
        <strong>{{ conflict.projects?.join(' 与 ') }}</strong>
        <span>{{ conflict.reason }}</span>
        <code v-if="conflict.scopes?.length">{{ conflict.scopes.join('、') }}</code>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conflict-plan-bubble {
  border-left: 3px solid #d97706;
  background: rgba(245, 158, 11, 0.06);
}
.conflict-plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.conflict-plan-head span {
  padding: 3px 7px;
  border-radius: 5px;
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  font-size: 10px;
  font-weight: 700;
}
.conflict-plan-content {
  white-space: pre-wrap;
  line-height: 1.65;
  color: var(--text-secondary);
}
.conflict-plan-list {
  display: grid;
  gap: 7px;
  margin-top: 9px;
}
.conflict-plan-list > div {
  display: grid;
  gap: 3px;
  padding: 7px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.52);
  font-size: 10.5px;
}
.conflict-plan-list span {
  color: var(--text-secondary);
}
.conflict-plan-list code {
  color: #92400e;
  overflow-wrap: anywhere;
}
</style>
