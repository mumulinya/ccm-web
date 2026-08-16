<script setup>
import { computed } from 'vue'
import {
  AlertCircle,
  Clock,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  Layers,
  Search,
  Settings2,
  Trash2,
} from '@lucide/vue'

defineProps({
  documents: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  scopeFilter: { type: String, default: 'all' },
  statusFilter: { type: String, default: 'all' },
  formatSize: { type: Function, required: true },
  formatDate: { type: Function, required: true },
})

const emit = defineEmits(['update:searchQuery', 'update:scopeFilter', 'update:statusFilter', 'preview', 'delete', 'edit-tags'])

const extension = (name) => {
  const ext = String(name || '').split('.').pop()?.slice(0, 5).toUpperCase()
  return ext || 'FILE'
}

const fileIconTheme = (name) => {
  const ext = String(name || '').split('.').pop()?.toLowerCase() || ''
  if (['md', 'txt', 'doc', 'docx'].includes(ext)) return 'doc-theme'
  if (['pdf'].includes(ext)) return 'pdf-theme'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'sheet-theme'
  if (['js', 'ts', 'vue', 'json', 'py', 'go', 'rs', 'java', 'html', 'css', 'yaml', 'yml'].includes(ext)) return 'code-theme'
  return 'default-theme'
}

const scopeLabel = scope => ({ global: '全局知识', group: '群聊会话', project: '项目知识', agent: 'Agent' })[scope?.type] || '全局知识'
const sourceLabel = source => ({ upload: '手动上传', manual: '会话沉淀', online_document: '在线抓取', watched_directory: '本地同步', conversation: '会话', task: '任务' })[source?.type] || '业务资料'
</script>

<template>
  <section class="document-panel">
    <!-- 头部工具栏 -->
    <div class="document-header">
      <div class="header-left">
        <div class="title-row">
          <FileText :size="16" class="doc-icon" />
          <h2>归档知识文档</h2>
        </div>
        <span class="count-badge">已索引 {{ documents.length }} 份资料</span>
      </div>

      <div class="filters-bar">
        <div class="search-input-wrap">
          <Search :size="13" class="search-icon" />
          <input
            :value="searchQuery"
            type="search"
            placeholder="搜索文档名称或标签..."
            aria-label="搜索文档"
            @input="emit('update:searchQuery', $event.target.value)"
          >
        </div>

        <select :value="scopeFilter" aria-label="范围筛选" @change="emit('update:scopeFilter', $event.target.value)">
          <option value="all">全部知识范围</option>
          <option value="global">仅全局</option>
          <option value="group">仅群聊</option>
          <option value="project">仅项目</option>
          <option value="agent">仅 Agent</option>
        </select>

        <select :value="statusFilter" aria-label="状态筛选" @change="emit('update:statusFilter', $event.target.value)">
          <option value="all">全部解析状态</option>
          <option value="ready">可用就绪</option>
          <option value="partial">部分解析</option>
          <option value="failed">解析失败</option>
        </select>
      </div>
    </div>

    <!-- 状态切换 -->
    <div v-if="loading" class="state-container">
      <div class="spinner"></div>
      <p>正在读取文档列表与向量元数据...</p>
    </div>

    <div v-else-if="!documents.length" class="state-container">
      <FileText :size="32" class="empty-icon" />
      <strong>没有找到符合条件的文档</strong>
      <p>请调整搜索关键词、范围筛选条件，或在上方添加新资料</p>
    </div>

    <!-- 真实文档列表 -->
    <div v-else class="document-list">
      <article
        v-for="doc in documents"
        :key="doc.name"
        class="document-card"
        :data-status="doc.parseStatus"
      >
        <div class="document-main" @click="emit('preview', doc.name)">
          <!-- 文件类型徽章 -->
          <div class="file-type-badge" :class="fileIconTheme(doc.name)">
            <span>{{ extension(doc.name) }}</span>
          </div>

          <div class="document-copy">
            <!-- 第一行：文件名 + 状态微标签 -->
            <div class="name-line">
              <strong class="doc-title" :title="doc.name">{{ doc.name }}</strong>
              <span v-if="doc.parseStatus === 'failed'" class="status-badge failed">解析失败</span>
              <span v-else-if="doc.parseStatus === 'partial'" class="status-badge partial">部分解析</span>
              <span v-if="doc.duplicateOf" class="status-badge duplicate" :title="`内容与 ${doc.duplicateOf} 相同`">内容重复</span>
            </div>

            <!-- 第二行：元数据面包屑 -->
            <div class="provenance-row font-mono">
              <span class="scope-pill">
                <b>{{ scopeLabel(doc.scope) }}</b>
                <template v-if="doc.scope?.id"> · {{ doc.scope.id }}</template>
              </span>
              <span class="source-tag">{{ sourceLabel(doc.source) }}</span>
              <span class="meta-item">v{{ doc.version || 1 }}</span>
              <span class="meta-item">{{ doc.chunksCount || 0 }} 分片</span>
              <span class="meta-item">{{ formatSize(doc.size) }}</span>
              <span class="meta-item time-item">
                <Clock :size="10" />
                {{ formatDate(doc.indexedAt || doc.uploadedAt) }}
              </span>
            </div>

            <!-- 标签列表 -->
            <div v-if="doc.tags?.length" class="tags-row">
              <span v-for="tag in doc.tags.filter(item => !item.startsWith('#scope:')).slice(0, 6)" :key="tag" class="doc-tag">
                {{ tag }}
              </span>
            </div>

            <p v-if="doc.parseError" class="parse-error-hint">
              <AlertCircle :size="11" />
              <span>{{ doc.parseError }}</span>
            </p>
          </div>
        </div>

        <!-- 卡片右侧动作按钮 -->
        <div class="card-actions">
          <button type="button" class="btn-action" title="查看文档全文与分片" @click="emit('preview', doc.name)">
            <Eye :size="12" />
            <span>查看</span>
          </button>
          <button type="button" class="btn-action" title="配置权限范围与分类标签" @click="emit('edit-tags', doc)">
            <Settings2 :size="12" />
            <span>管理</span>
          </button>
          <button type="button" class="btn-action danger" title="删除文档" @click="emit('delete', doc.name)">
            <Trash2 :size="12" />
            <span>删除</span>
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.document-panel {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}

.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

/* 头部 */
.document-header {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.doc-icon {
  color: var(--accent-blue);
}

.header-left h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.count-badge {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--panel-muted);
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 600;
}

.filters-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 9px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input-wrap input {
  height: 32px;
  padding: 0 10px 0 28px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 11.5px;
  outline: none;
  width: 180px;
  transition: width 0.2s ease, border-color 0.15s ease;
}

.search-input-wrap input:focus {
  width: 220px;
  border-color: var(--accent-blue);
}

.filters-bar select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 11.5px;
  outline: none;
  transition: border-color 0.15s ease;
}

.filters-bar select:focus {
  border-color: var(--accent-blue);
}

/* 文档列表 */
.document-list {
  max-height: 560px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.document-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.15s ease;
}

.document-card:last-child {
  border-bottom: none;
}

.document-card:hover {
  background: var(--control-hover, rgba(148, 163, 184, 0.04));
}

.document-card[data-status="failed"] {
  border-left: 3px solid #ef4444;
}

.document-card[data-status="partial"] {
  border-left: 3px solid #f59e0b;
}

.document-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
  padding: 0;
  text-align: left;
}

.file-type-badge {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.05em;
  flex-shrink: 0;
  border: 1px solid transparent;
}

.file-type-badge.doc-theme {
  background: rgba(37, 99, 235, 0.1);
  color: var(--accent-blue, #2563eb);
  border-color: rgba(37, 99, 235, 0.2);
}
.file-type-badge.pdf-theme {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.2);
}
.file-type-badge.sheet-theme {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.2);
}
.file-type-badge.code-theme {
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
  border-color: rgba(139, 92, 246, 0.2);
}
.file-type-badge.default-theme {
  background: var(--panel-muted);
  color: var(--text-secondary);
}

.document-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.doc-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.status-badge.failed { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
.status-badge.partial { background: rgba(245, 158, 11, 0.12); color: #d97706; }
.status-badge.duplicate { background: var(--panel-muted); color: var(--text-muted); }

.provenance-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 11px;
  color: var(--text-muted);
}

.scope-pill {
  color: var(--accent-blue);
  font-weight: 600;
}

.source-tag {
  color: var(--text-secondary);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.tags-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 1px;
}

.doc-tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--panel-muted);
  color: var(--text-secondary);
  font-size: 10px;
}

.parse-error-hint {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-red, #ef4444);
  font-size: 10.5px;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-action {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 9px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-action:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.btn-action.danger:hover {
  border-color: var(--accent-red, #ef4444);
  color: var(--accent-red, #ef4444);
  background: rgba(239, 68, 68, 0.05);
}

/* 状态容器 */
.state-container {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  color: var(--text-muted);
  opacity: 0.5;
}

.state-container strong {
  color: var(--text-primary);
  font-size: 13px;
}

.state-container p {
  margin: 0;
  font-size: 11.5px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(37, 99, 235, 0.2);
  border-top-color: var(--accent-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 800px) {
  .document-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .filters-bar {
    width: 100%;
    flex-wrap: wrap;
  }
  .search-input-wrap input {
    width: 100%;
  }
  .search-input-wrap input:focus {
    width: 100%;
  }
  .document-card {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .card-actions {
    justify-content: flex-end;
  }
}
</style>
