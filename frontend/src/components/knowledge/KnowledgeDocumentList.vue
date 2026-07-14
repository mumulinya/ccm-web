<script setup>
defineProps({
  documents: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  scopeFilter: { type: String, default: 'all' },
  statusFilter: { type: String, default: 'all' },
  formatSize: { type: Function, required: true },
  formatDate: { type: Function, required: true }
})

const emit = defineEmits(['update:searchQuery', 'update:scopeFilter', 'update:statusFilter', 'preview', 'delete', 'edit-tags'])

const extension = name => String(name || '').split('.').pop()?.slice(0, 5).toUpperCase() || 'FILE'
const scopeLabel = scope => ({ global: '全局', group: '群聊', project: '项目', agent: 'Agent' })[scope?.type] || '全局'
const sourceLabel = source => ({ upload: '上传', manual: '手动沉淀', online_document: '在线文档', watched_directory: '目录同步', conversation: '会话', task: '任务' })[source?.type] || '知识资料'
</script>

<template>
  <section class="document-panel">
    <div class="document-header">
      <div><h2>归档文档</h2><span>{{ documents.length }} 份资料</span></div>
      <div class="filters">
        <input :value="searchQuery" type="search" placeholder="搜索文档或标签" aria-label="搜索文档" @input="emit('update:searchQuery', $event.target.value)">
        <select :value="scopeFilter" aria-label="范围筛选" @change="emit('update:scopeFilter', $event.target.value)">
          <option value="all">全部范围</option><option value="global">全局</option><option value="group">群聊</option><option value="project">项目</option><option value="agent">Agent</option>
        </select>
        <select :value="statusFilter" aria-label="状态筛选" @change="emit('update:statusFilter', $event.target.value)">
          <option value="all">全部状态</option><option value="ready">可用</option><option value="partial">部分解析</option><option value="failed">解析失败</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="state"><span class="spinner"></span><p>正在读取文档</p></div>
    <div v-else-if="!documents.length" class="state"><strong>没有符合条件的文档</strong><p>调整筛选条件或导入新资料</p></div>
    <div v-else class="document-list">
      <article v-for="doc in documents" :key="doc.name" class="document-row" :data-status="doc.parseStatus">
        <button class="document-main" type="button" @click="emit('preview', doc.name)">
          <span class="file-type">{{ extension(doc.name) }}</span>
          <span class="document-copy">
            <span class="name-line"><strong :title="doc.name">{{ doc.name }}</strong><span v-if="doc.parseStatus === 'failed'" class="status failed">解析失败</span><span v-else-if="doc.parseStatus === 'partial'" class="status partial">部分解析</span></span>
            <span class="provenance"><b>{{ scopeLabel(doc.scope) }}<template v-if="doc.scope?.id"> · {{ doc.scope.id }}</template></b><span>{{ sourceLabel(doc.source) }}</span><span>v{{ doc.version || 1 }}</span><span>{{ doc.chunksCount || 0 }} 分片</span><span>{{ formatSize(doc.size) }}</span><span>{{ formatDate(doc.indexedAt || doc.uploadedAt) }}</span></span>
            <span v-if="doc.tags?.length" class="tags"><i v-for="tag in doc.tags.filter(item => !item.startsWith('#scope:')).slice(0, 5)" :key="tag">{{ tag }}</i></span>
            <span v-if="doc.parseError" class="parse-error">{{ doc.parseError }}</span>
          </span>
        </button>
        <div class="row-actions">
          <button type="button" title="查看文档内容" @click="emit('preview', doc.name)">查看</button>
          <button type="button" title="编辑范围与标签" @click="emit('edit-tags', doc)">管理</button>
          <button type="button" class="danger" title="删除文档" @click="emit('delete', doc.name)">删除</button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.document-panel { border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; overflow: hidden; background: var(--surface, #fff); }
.document-header { min-height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 0 18px; border-bottom: 1px solid var(--border-color, #e2e8f0); }
.document-header h2 { margin: 0; color: var(--text-primary, #0f172a); font-size: 14px; letter-spacing: 0; }.document-header > div > span { display: block; margin-top: 2px; color: var(--text-secondary, #64748b); font-size: 10.5px; }
.filters { display: flex; gap: 7px; }.filters input, .filters select { height: 31px; box-sizing: border-box; border: 1px solid var(--border-color, #dbe2ea); border-radius: 6px; background: var(--bg-primary, #f8fafc); color: var(--text-primary, #334155); padding: 0 8px; outline: none; font: inherit; font-size: 10.5px; }.filters input { width: 180px; }.filters input:focus, .filters select:focus { border-color: #2563eb; }
.document-list { max-height: 520px; overflow: auto; }.document-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 11px 14px; border-bottom: 1px solid var(--border-color, #edf2f7); }.document-row:last-child { border-bottom: none; }.document-row:hover { background: var(--bg-primary, #f8fafc); }.document-row[data-status="failed"] { border-left: 3px solid #dc2626; }.document-row[data-status="partial"] { border-left: 3px solid #d97706; }
.document-main { min-width: 0; display: flex; align-items: flex-start; gap: 11px; padding: 0; border: none; background: transparent; text-align: left; cursor: pointer; }.file-type { width: 38px; height: 38px; flex: 0 0 38px; display: grid; place-items: center; border: 1px solid #bfdbfe; border-radius: 6px; background: #eff6ff; color: #1d4ed8; font-size: 8px; font-weight: 800; }.document-copy { min-width: 0; display: flex; flex-direction: column; gap: 4px; }.name-line { min-width: 0; display: flex; align-items: center; gap: 7px; }.name-line strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary, #1e293b); font-size: 12px; }.status { padding: 2px 5px; border-radius: 4px; font-size: 9px; white-space: nowrap; }.status.failed { background: #fef2f2; color: #b91c1c; }.status.partial { background: #fffbeb; color: #b45309; }
.provenance { display: flex; flex-wrap: wrap; gap: 5px 10px; color: var(--text-secondary, #64748b); font-size: 9.5px; }.provenance b { color: #1d4ed8; font-weight: 600; }.tags { display: flex; gap: 4px; flex-wrap: wrap; }.tags i { padding: 1px 5px; border: 1px solid var(--border-color, #dbe2ea); border-radius: 4px; color: var(--text-secondary, #64748b); font-size: 9px; font-style: normal; }.parse-error { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #b91c1c; font-size: 9.5px; }
.row-actions { display: flex; gap: 4px; }.row-actions button { height: 27px; padding: 0 7px; border: 1px solid var(--border-color, #dbe2ea); border-radius: 5px; background: var(--surface, #fff); color: var(--text-secondary, #64748b); font: inherit; font-size: 9.5px; cursor: pointer; }.row-actions button:hover { border-color: #2563eb; color: #1d4ed8; }.row-actions button.danger:hover { border-color: #dc2626; color: #b91c1c; }
.state { min-height: 230px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; color: var(--text-secondary, #64748b); text-align: center; }.state strong { color: var(--text-primary, #334155); font-size: 12px; }.state p { margin: 0; font-size: 10.5px; }.spinner { width: 17px; height: 17px; border: 2px solid #bfdbfe; border-top-color: #2563eb; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 760px) { .document-header { align-items: flex-start; flex-direction: column; padding: 13px; }.filters { width: 100%; flex-wrap: wrap; }.filters input { width: 100%; }.filters select { flex: 1; }.document-row { grid-template-columns: 1fr; }.row-actions { padding-left: 49px; } }
</style>
