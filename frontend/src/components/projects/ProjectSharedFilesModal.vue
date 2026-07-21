<script setup>
import EmptyState from '../common/EmptyState.vue'

defineProps({
  visible: { type: Boolean, default: false },
  projectName: { type: String, default: '' },
  files: { type: Array, default: () => [] },
  showAdd: { type: Boolean, default: false },
  showEdit: { type: Boolean, default: false },
  editFileName: { type: String, default: '' },
  editFileContent: { type: String, default: '' },
})

const emit = defineEmits([
  'close',
  'add-file',
  'edit-file',
  'delete-file',
  'close-add',
  'close-edit',
  'submit-add',
  'submit-edit',
  'update-field',
])

const updateField = (field, event) => emit('update-field', { field, value: event.target.value })
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal shared-files-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>📁 项目共享文件 - {{ projectName }}</h3>
      <div class="modal-desc">项目共享文件，Agent 可以直接读取这些文件内容</div>

      <div class="shared-toolbar">
        <button class="btn btn-primary btn-sm" @click="emit('add-file')">+ 新建文件</button>
      </div>

      <div class="shared-list">
        <EmptyState v-if="files.length === 0" icon="📁" title="暂无共享文件" />
        <div v-for="f in files" :key="f.name" class="shared-file-item">
          <div class="shared-file-head">
            <div>
              <span>📄</span>
              <strong>{{ f.name }}</strong>
            </div>
            <div>
              <button class="btn btn-outline btn-sm" @click="emit('edit-file', f.name)">编辑</button>
              <button class="btn btn-danger btn-sm" @click="emit('delete-file', f.name)">删除</button>
            </div>
          </div>
          <div class="shared-file-preview">{{ f.content?.substring(0, 150) }}{{ f.content?.length > 150 ? '...' : '' }}</div>
        </div>
      </div>

      <div class="shared-footer">
        <button class="btn btn-primary" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>

  <div v-if="showAdd" class="modal-overlay" @click.self="emit('close-add')">
    <div class="modal file-editor-modal">
      <button class="modal-close" @click="emit('close-add')">&times;</button>
      <h3>新建项目共享文件</h3>
      <div class="form-group">
        <label>文件名</label>
        <input :value="editFileName" placeholder="如 api-docs.md" @input="updateField('name', $event)">
      </div>
      <div class="form-group">
        <label>文件内容</label>
        <textarea :value="editFileContent" rows="10" placeholder="输入文件内容..." @input="updateField('content', $event)"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-cancel" @click="emit('close-add')">取消</button>
        <button class="btn btn-primary" @click="emit('submit-add')">创建</button>
      </div>
    </div>
  </div>

  <div v-if="showEdit" class="modal-overlay" @click.self="emit('close-edit')">
    <div class="modal file-editor-modal">
      <button class="modal-close" @click="emit('close-edit')">&times;</button>
      <h3>编辑文件 - {{ editFileName }}</h3>
      <div class="form-group">
        <label>文件内容</label>
        <textarea :value="editFileContent" rows="15" @input="updateField('content', $event)"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-cancel" @click="emit('close-edit')">取消</button>
        <button class="btn btn-primary" @click="emit('submit-edit')">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shared-files-modal {
  min-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-desc {
  margin-bottom: 16px;
  color: var(--text-muted);
  font-size: 12px;
}

.shared-toolbar {
  margin-bottom: 12px;
}

.shared-list {
  flex: 1;
  overflow-y: auto;
}

.shared-file-item {
  margin-bottom: 8px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.shared-file-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.shared-file-head > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shared-file-head span {
  font-size: 16px;
}

.shared-file-head strong {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.shared-file-preview {
  max-height: 60px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  white-space: pre-wrap;
}

.shared-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.file-editor-modal {
  min-width: 500px;
}

.file-editor-modal textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 13px;
  resize: vertical;
  outline: none;
}

@media (max-width: 640px) {
  .shared-file-head {
    flex-direction: column;
    gap: 10px;
  }

  .shared-file-head > div:last-child {
    width: 100%;
    flex-wrap: wrap;
  }

  .file-editor-modal textarea {
    min-height: 180px;
    box-sizing: border-box;
  }
}
</style>
