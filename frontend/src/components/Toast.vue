<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  message: { type: String, required: true },
  type: { type: String, default: 'info' }, // info, success, error, warning
  duration: { type: Number, default: 3000 }
})

const visible = ref(true)

onMounted(() => {
  setTimeout(() => {
    visible.value = false
  }, props.duration)
})
</script>

<template>
  <div v-if="visible" class="toast" :class="type">
    <span class="toast-icon">{{ type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️' }}</span>
    <span class="toast-message">{{ message }}</span>
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 10px;
  font-size: 14px;
  z-index: 10000;
  animation: slide-down 0.3s ease-out;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  min-width: 200px;
  justify-content: center;
  backdrop-filter: blur(10px);
}

@keyframes slide-down {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.toast.info {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: var(--text-primary);
}

.toast.success {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #065f46;
}

.toast.error {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #991b1b;
}

.toast.warning {
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.2);
  color: #92400e;
}

.toast-icon { font-size: 16px; }
.toast-message { font-weight: 500; }
</style>
