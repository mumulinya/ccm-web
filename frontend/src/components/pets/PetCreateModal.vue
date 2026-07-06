<script setup>
defineProps({
  label: { type: String, default: '' },
  type: { type: String, default: '' },
  petTypes: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'submit', 'update:label', 'update:type'])
</script>

<template>
  <div class="modal-overlay">
    <div class="glass-panel modal pet-create-modal">
      <div class="modal-header">
        <span class="modal-title-text">🐾 创建自定义桌面宠物</span>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>
      <div class="modal-body-content">
        <div class="form-item">
          <label class="form-label">宠物昵称</label>
          <input
            class="form-input"
            :value="label"
            placeholder="例如：我的月薪喵"
            maxlength="20"
            @input="emit('update:label', $event.target.value)"
          >
        </div>
        <div class="form-item">
          <label class="form-label">初始外观类型</label>
          <select class="form-select" :value="type" @change="emit('update:type', $event.target.value)">
            <option v-for="pt in petTypes" :key="pt.id" :value="pt.id">
              {{ pt.emoji }} {{ pt.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="modal-footer-btns">
        <button class="btn btn-outline btn-sm" @click="emit('close')">取消</button>
        <button class="btn btn-primary btn-sm" @click="emit('submit')">确认创建</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pet-create-modal {
  width: 380px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-title-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}
.modal-body-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #475569);
  text-align: left;
}
.form-input,
.form-select {
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 13.5px;
  outline: none;
  color: var(--text-primary, #0f172a);
}
.form-input {
  transition: all 0.2s;
}
.form-input:focus {
  border-color: var(--accent-blue, #3b82f6);
  background: #fff;
}
.modal-footer-btns {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
:global([data-theme="dark"]) .form-input,
:global([data-theme="dark"]) .form-select {
  background: var(--bg-secondary, #0f172a) !important;
  border-color: var(--border-color, rgba(255, 255, 255, 0.08)) !important;
  color: var(--text-primary, #f8fafc) !important;
}
</style>
