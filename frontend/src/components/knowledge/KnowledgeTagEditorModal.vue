<script setup>
import {
  FolderLock,
  Plus,
  Tag,
  X,
} from '@lucide/vue'

defineProps({
  visible: { type: Boolean, default: false },
  doc: { type: Object, default: null },
  tags: { type: Array, default: () => [] },
  newTag: { type: String, default: '' },
  scopeType: { type: String, default: 'global' },
  scopeId: { type: String, default: '' },
  visibility: { type: String, default: 'shared' },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'update:newTag', 'update:scopeType', 'update:scopeId', 'update:visibility', 'add-tag', 'remove-tag', 'save'])
</script>

<template>
  <teleport to="body">
    <div v-if="visible" class="modal-layer" @click.self="emit('close')">
      <section class="metadata-modal" role="dialog" aria-modal="true" aria-labelledby="document-metadata-title">
        <header class="modal-header">
          <div class="header-titles">
            <div class="title-with-icon">
              <FolderLock :size="16" class="header-icon" />
              <h2 id="document-metadata-title">文档范围与分类标签</h2>
            </div>
            <p :title="doc?.name">{{ doc?.name }}</p>
          </div>
          <button type="button" class="btn-close" title="关闭" @click="emit('close')">
            <X :size="16" />
          </button>
        </header>

        <div class="modal-body">
          <div class="scope-grid">
            <div class="field-item">
              <label>知识范围</label>
              <select :value="scopeType" @change="emit('update:scopeType', $event.target.value)">
                <option value="global">全局 (全系统)</option>
                <option value="group">群聊会话</option>
                <option value="project">指定项目</option>
                <option value="agent">指定 Agent</option>
              </select>
            </div>

            <div v-if="scopeType !== 'global'" class="field-item">
              <label>范围标识</label>
              <input
                :value="scopeId"
                type="text"
                placeholder="群聊 ID、项目名或 Agent 名称"
                @input="emit('update:scopeId', $event.target.value)"
              >
            </div>

            <div class="field-item">
              <label>可见性规则</label>
              <select :value="visibility" @change="emit('update:visibility', $event.target.value)">
                <option value="shared">范围内共享</option>
                <option value="restricted">仅限定范围</option>
              </select>
            </div>
          </div>

          <div class="tag-section">
            <label class="field-label">分类标签 (Tags)</label>
            <div class="tag-list">
              <span v-for="tag in tags.filter(item => !item.startsWith('#scope:'))" :key="tag" class="tag-item">
                <Tag :size="11" />
                <span>{{ tag }}</span>
                <button type="button" class="tag-del-btn" title="移除标签" @click="emit('remove-tag', tag)">
                  <X :size="10" />
                </button>
              </span>
              <i v-if="!tags.filter(item => !item.startsWith('#scope:')).length" class="empty-tag-hint">暂无自定义标签</i>
            </div>
            <div class="tag-input-row">
              <input
                :value="newTag"
                type="text"
                placeholder="输入新标签名..."
                @input="emit('update:newTag', $event.target.value)"
                @keyup.enter="emit('add-tag')"
              >
              <button type="button" class="btn-add-tag" @click="emit('add-tag')">
                <Plus :size="13" />
                <span>添加</span>
              </button>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn-cancel" @click="emit('close')">取消</button>
          <button
            type="button"
            class="btn-save"
            :disabled="saving || (scopeType !== 'global' && !scopeId.trim())"
            @click="emit('save')"
          >
            {{ saving ? '正在保存...' : '保存更改' }}
          </button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<style scoped>
.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 1210;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--overlay-scrim, rgba(15, 23, 42, 0.55));
  backdrop-filter: blur(3px);
}

.metadata-modal {
  width: min(520px, 100%);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 10px);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-lg, 0 24px 60px rgba(15, 23, 42, 0.24));
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: var(--accent-blue);
}

.modal-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
}

.modal-header p {
  max-width: 420px;
  overflow: hidden;
  margin: 3px 0 0;
  color: var(--text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.btn-close:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
}

.scope-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-item label,
.field-label {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

input,
select {
  width: 100%;
  height: var(--control-height, 34px);
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

input:focus,
select:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.tag-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-list {
  min-height: 52px;
  display: flex;
  align-content: flex-start;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--panel-muted, rgba(148, 163, 184, 0.05));
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--accent-blue) 30%, var(--border-color));
  border-radius: 4px;
  background: var(--accent-soft, rgba(37, 99, 235, 0.08));
  color: var(--accent-blue);
  font-size: 11px;
  font-weight: 600;
}

.tag-del-btn {
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.tag-del-btn:hover {
  color: var(--accent-red, #ef4444);
}

.empty-tag-hint {
  color: var(--text-muted);
  font-size: 11px;
  font-style: normal;
  padding: 4px;
}

.tag-input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.btn-add-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--surface);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-add-tag:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.btn-cancel,
.btn-save {
  height: 34px;
  padding: 0 16px;
  border-radius: var(--radius-md, 6px);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel {
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
}

.btn-save {
  border: 0;
  background: var(--accent-blue, #2563eb);
  color: #fff;
}

.btn-save:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .scope-grid {
    grid-template-columns: 1fr;
  }
}
</style>
