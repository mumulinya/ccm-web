<script setup>
import AgentPipeline from './AgentPipeline.vue'

defineProps({
  viewer: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="modal-overlay pipeline-overlay" @click.self="emit('close')">
    <div class="modal pipeline-modal">
      <div class="pipeline-modal-header">
        <h3>Agent 协作流看板</h3>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>
      <div class="pipeline-modal-body">
        <AgentPipeline
          :assignments="viewer.assignments"
          :coordinationPlan="viewer.coordinationPlan"
          :taskStatus="viewer.status"
          :fileChanges="viewer.fileChanges"
          :receipts="viewer.receipts"
          :deliverySummary="viewer.deliverySummary"
          :title="viewer.title"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pipeline-overlay {
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
}

.pipeline-modal {
  width: 860px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
  background: rgba(18, 22, 33, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.pipeline-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.pipeline-modal-header h3 {
  margin: 0;
  font-size: 15px;
  color: #fff;
}

.pipeline-modal-header .modal-close {
  position: static;
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.pipeline-modal-body {
  flex: 1;
  overflow-y: auto;
}
</style>
