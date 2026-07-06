<script setup>
defineProps({
  template: { type: Object, required: true },
  variables: { type: Object, required: true },
})

const emit = defineEmits(['close', 'apply', 'update-variable'])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal template-variables-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>📝 填写模板变量 - {{ template.name }}</h3>
      <div class="template-hint">检测到该模板包含参数占位符，请为其填写具体内容：</div>

      <div class="variables-list">
        <div v-for="(val, key) in variables" :key="key" class="form-group variable-field">
          <label>{{ key }}</label>
          <textarea
            :value="val"
            rows="2"
            placeholder="请输入相应的内容..."
            @input="emit('update-variable', { key, value: $event.target.value })"
          ></textarea>
        </div>
      </div>

      <div class="form-actions template-actions">
        <button class="btn btn-cancel" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="emit('apply')">插入输入框</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-variables-modal {
  min-width: 450px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
}

.template-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 6px 0 16px;
}

.variables-list {
  max-height: 250px;
  overflow-y: auto;
  padding-right: 4px;
}

.variable-field {
  margin-bottom: 14px;
}

.variable-field label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 600;
}

.variable-field textarea {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-primary);
  font-size: 13px;
  resize: vertical;
  outline: none;
}

.template-actions {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}
</style>
