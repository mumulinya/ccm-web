<script setup>
defineProps({
  skinId: { type: String, default: '' },
  label: { type: String, default: '' },
  emoji: { type: String, default: '' },
  color: { type: String, default: '#3f3f46' },
  format: { type: String, default: 'png' },
})

const emit = defineEmits([
  'close',
  'submit',
  'update:skinId',
  'update:label',
  'update:emoji',
  'update:color',
  'update:format',
])
</script>

<template>
  <div class="modal-overlay">
    <div class="glass-panel modal pet-skin-create-modal">
      <div class="modal-header">
        <span class="modal-title-text">🎨 创建自定义宠物皮肤外观</span>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>
      <div class="modal-body-content">
        <div class="form-item">
          <label class="form-label">皮肤 ID (拼音/英文，如 yuexinmiao)</label>
          <input
            class="form-input"
            :value="skinId"
            placeholder="例如：yuexinmiao"
            maxlength="20"
            @input="emit('update:skinId', $event.target.value)"
          >
        </div>
        <div class="form-item">
          <label class="form-label">皮肤中文名称</label>
          <input
            class="form-input"
            :value="label"
            placeholder="例如：月薪喵"
            maxlength="20"
            @input="emit('update:label', $event.target.value)"
          >
        </div>
        <div class="form-item">
          <label class="form-label">代表 Emoji</label>
          <input
            class="form-input"
            :value="emoji"
            placeholder="🐱"
            maxlength="5"
            @input="emit('update:emoji', $event.target.value)"
          >
        </div>
        <div class="form-item">
          <label class="form-label">动作图片默认格式</label>
          <select class="form-select" :value="format" @change="emit('update:format', $event.target.value)">
            <option value="png">PNG (推荐，适用于去背手绘动作图)</option>
            <option value="svg">SVG (适用于矢量动作图)</option>
          </select>
        </div>
        <div class="form-item">
          <label class="form-label">主题配色 (用于高亮显示)</label>
          <input
            type="color"
            class="form-input color-picker-input"
            :value="color"
            @input="emit('update:color', $event.target.value)"
          >
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
.pet-skin-create-modal {
  width: min(380px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 480px) {
  .pet-skin-create-modal {
    width: 100%;
    max-height: 92vh;
    border-radius: 8px 8px 0 0;
  }

  .modal-footer-btns > button {
    flex: 1;
  }
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
.color-picker-input {
  height: 38px;
  padding: 4px !important;
  cursor: pointer;
}
.modal-footer-btns {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
:global([data-theme="dark"] .form-input),
:global([data-theme="dark"] .form-select){
  background: var(--bg-secondary, #0f172a) !important;
  border-color: var(--border-color, rgba(255, 255, 255, 0.08)) !important;
  color: var(--text-primary, #f8fafc) !important;
}
</style>
