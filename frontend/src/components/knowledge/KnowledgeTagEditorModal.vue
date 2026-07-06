<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  doc: { type: Object, default: null },
  tags: { type: Array, default: () => [] },
  newTag: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update:newTag', 'add-tag', 'remove-tag', 'save'])
</script>

<template>
  <div v-if="visible" class="tag-editor-overlay" @click.self="emit('close')">
    <div class="tag-editor-modal aura-card">
      <div class="modal-header">
        <h4>🏷️ 编辑文档分类标签</h4>
        <span class="file-label">{{ doc?.name }}</span>
      </div>
      <div class="modal-body">
        <p class="modal-hint">标签将用作垂直归类和范围过滤。输入内容并按<strong>回车</strong>添加，以 # 开头。</p>

        <div class="editor-tags-list">
          <span v-for="tag in tags" :key="tag" class="editor-tag-pill">
            {{ tag }}
            <button class="btn-remove-tag-pill" @click="emit('remove-tag', tag)">&times;</button>
          </span>
        </div>

        <div class="tag-input-group">
          <input
            :value="newTag"
            type="text"
            placeholder="新增标签，例如 #feishu"
            class="tech-input"
            @input="emit('update:newTag', $event.target.value)"
            @keyup.enter="emit('add-tag')"
          >
          <button class="btn btn-primary" @click="emit('add-tag')">添加</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="emit('save')">保存更改</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tag-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1010;
  display: flex;
  align-items: center;
  justify-content: center;
}
.aura-card {
  border-radius: 12px;
  background: rgba(255,255,255,0.68);
  border: 1px solid var(--border-color);
}
.tag-editor-modal {
  width: 440px;
  background: var(--surface, #ffffff) !important;
  box-shadow: 0 12px 48px rgba(0,0,0,0.15);
  border: 1px solid var(--border-color);
  padding: 22px;
}
.modal-header {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
  margin-bottom: 16px;
}
.modal-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.file-label {
  font-size: 11px;
  color: var(--text-secondary);
  display: block;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.modal-hint {
  font-size: 11.5px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.5;
}
.editor-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  background: var(--bg-primary, #f8fafc);
  border: 1px solid var(--border-color);
  padding: 10px;
  border-radius: 8px;
  min-height: 60px;
  margin-bottom: 16px;
  align-content: flex-start;
}
.editor-tag-pill {
  background: rgba(0, 114, 255, 0.08);
  color: var(--accent-blue, #0072ff);
  border: 1px solid rgba(0, 114, 255, 0.15);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-remove-tag-pill {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}
.btn-remove-tag-pill:hover { color: #ef4444; }
.tag-input-group { display: flex; gap: 8px; }
.tech-input {
  flex: 1;
  background: var(--surface, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--text-primary);
  outline: none;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  border-top: 1px solid var(--border-color);
  padding-top: 14px;
}
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-primary { background: var(--gradient-blue); color: white; }
.btn-outline { background: transparent; border: 1px solid rgba(0,0,0,0.08); color: var(--text-secondary); }
:global([data-theme='dark']) .editor-tags-list { background: rgba(0,0,0,0.15); }
</style>
