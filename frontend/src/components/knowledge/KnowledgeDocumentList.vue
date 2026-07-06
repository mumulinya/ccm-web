<script setup>
defineProps({
  documents: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  formatSize: { type: Function, required: true },
  formatDate: { type: Function, required: true }
})

const emit = defineEmits(['update:searchQuery', 'preview', 'delete', 'edit-tags'])
</script>

<template>
  <div class="panel-header search-header-flex">
    <div class="panel-card-title">
      <span class="card-title-icon">🗂️</span>
      <h3>已归档文档 ({{ documents.length }})</h3>
    </div>
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input
        :value="searchQuery"
        type="text"
        placeholder="检索已导入文档..."
        class="search-input"
        @input="emit('update:searchQuery', $event.target.value)"
      >
    </div>
  </div>

  <div class="doc-list-section">
    <div v-if="loading" class="list-state-loading">
      <span class="spinner-icon">🌀</span> 正在载入知识库...
    </div>

    <div v-else-if="documents.length === 0" class="list-state-empty">
      <div class="empty-icon">📭</div>
      <p>{{ searchQuery ? '未找到匹配的文档' : '暂无已归档文档' }}</p>
    </div>

    <div v-else class="doc-items-container">
      <div
        v-for="doc in documents"
        :key="doc.name"
        class="doc-item-card"
      >
        <div class="doc-meta-info">
          <span class="doc-icon">📄</span>
          <div class="doc-details">
            <div class="doc-name" :title="doc.name">{{ doc.name }}</div>

            <div class="doc-tags-wrapper">
              <span v-for="tag in doc.tags" :key="tag" class="doc-tag">{{ tag }}</span>
              <button class="btn-add-tag-inline" @click.stop="emit('edit-tags', doc)">
                {{ doc.tags?.length ? '✏️ 编辑标签' : '🏷️ 打标签' }}
              </button>
            </div>

            <div class="doc-sub-details">
              <span>{{ formatSize(doc.size) }}</span>
              <span class="separator">•</span>
              <span>{{ doc.chunksCount || 0 }} 分片</span>
              <span class="separator">•</span>
              <span class="doc-time">{{ formatDate(doc.uploadedAt) }}</span>
            </div>
          </div>
        </div>
        <div class="doc-item-actions">
          <button class="btn btn-icon-only preview-btn" title="查看内容与分片" @click="emit('preview', doc.name)">
            👁️
          </button>
          <button class="btn btn-icon-only delete-btn" title="删除文档" @click="emit('delete', doc.name)">
            🗑️
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.search-header-flex { flex-wrap: wrap; }
.panel-card-title { display: flex; align-items: center; gap: 8px; }
.panel-card-title h3 { margin: 0; font-size: 14px; color: var(--text-primary); }
.card-title-icon { font-size: 16px; }
.search-bar {
  display: flex;
  align-items: center;
  background: var(--bg-primary, #f1f5f9);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 8px;
  padding: 6px 10px;
  gap: 8px;
  width: 180px;
}
.search-icon { color: var(--text-secondary, #94a3b8); font-size: 12px; }
.search-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 12.5px;
  width: 100%;
  outline: none;
}
.doc-list-section { min-height: 220px; margin-top: 12px; }
.doc-items-container { display: flex; flex-direction: column; gap: 8px; max-height: 380px; overflow-y: auto; }
.doc-item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 8px;
  transition: all 0.2s ease;
}
.doc-item-card:hover { background: var(--control-hover, #f8fafc); border-color: var(--accent-blue, #0072ff); }
.doc-meta-info { display: flex; align-items: flex-start; gap: 10px; min-width: 0; flex: 1; }
.doc-icon { font-size: 18px; margin-top: 2px; }
.doc-details { overflow: hidden; flex: 1; }
.doc-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.doc-tags-wrapper { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 6px; }
.doc-tag {
  background: rgba(0, 114, 255, 0.05);
  color: var(--accent-blue, #0072ff);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(0, 114, 255, 0.12);
  white-space: nowrap;
  font-weight: 500;
}
.btn-add-tag-inline {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  font-size: 10px;
  cursor: pointer;
  padding: 1px 4px;
  transition: color 0.2s;
}
.btn-add-tag-inline:hover { color: var(--accent-blue, #0072ff); }
.doc-sub-details {
  font-size: 11px;
  color: var(--text-secondary, #94a3b8);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}
.doc-item-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.btn-icon-only { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
.preview-btn { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); }
.delete-btn { background: rgba(239, 68, 68, 0.08); color: #dc2626; }
.list-state-loading, .list-state-empty {
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  gap: 8px;
  text-align: center;
}
.empty-icon { font-size: 30px; opacity: 0.7; }
:global([data-theme='dark']) .search-bar { background: rgba(0,0,0,0.2); }
:global([data-theme='dark']) .doc-item-card:hover { background: rgba(255,255,255,0.02); }
</style>
