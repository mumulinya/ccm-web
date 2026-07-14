<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { confirmDialog, toast } from '../../utils/toast.js'
import KnowledgeChunksDrawer from './KnowledgeChunksDrawer.vue'
import KnowledgeDocumentList from './KnowledgeDocumentList.vue'
import KnowledgeHealthOverview from './KnowledgeHealthOverview.vue'
import KnowledgeImportPanel from './KnowledgeImportPanel.vue'
import KnowledgeQueryWorkspace from './KnowledgeQueryWorkspace.vue'
import KnowledgeSettingsModal from './KnowledgeSettingsModal.vue'
import KnowledgeTagEditorModal from './KnowledgeTagEditorModal.vue'

const documents = ref([])
const status = ref({ state: 'idle', chunks: 0, parseFailures: [] })
const embedding = ref({ enabled: false, hasKey: false, apiUrl: 'https://api.openai.com/v1', model: 'text-embedding-3-small' })
const watchPaths = ref([])
const loading = ref(true)
const rebuilding = ref(false)
const uploading = ref(false)
const importingUrl = ref(false)
const pathAdding = ref(false)
const settingsVisible = ref(false)
const settingsSaving = ref(false)

const searchQuery = ref('')
const scopeFilter = ref('all')
const statusFilter = ref('all')

const drawerVisible = ref(false)
const previewFileName = ref('')
const docChunks = ref([])
const docOriginalContent = ref('')
const chunksLoading = ref(false)
const originalLoading = ref(false)
const drawerSubTab = ref('chunks')
const activeDrawerChunkIndex = ref(-1)
const docVersions = ref([])
const versionsLoading = ref(false)
const versionPreview = ref(null)
const versionPreviewLoading = ref(false)
const previewDocument = computed(() => documents.value.find(doc => doc.name === previewFileName.value) || null)

const editorVisible = ref(false)
const editorDocument = ref(null)
const editorTags = ref([])
const editorNewTag = ref('')
const editorScopeType = ref('global')
const editorScopeId = ref('')
const editorVisibility = ref('shared')
const editorSaving = ref(false)

let pollTimer = null

const availableTags = computed(() => Array.from(new Set(documents.value.flatMap(doc => doc.tags || []).filter(tag => !tag.startsWith('#scope:')))).sort())
const filteredDocuments = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return documents.value.filter(doc => {
    if (scopeFilter.value !== 'all' && (doc.scope?.type || 'global') !== scopeFilter.value) return false
    if (statusFilter.value !== 'all' && (doc.parseStatus || 'ready') !== statusFilter.value) return false
    if (!query) return true
    return `${doc.name} ${(doc.tags || []).join(' ')} ${doc.scope?.id || ''} ${doc.source?.url || ''}`.toLowerCase().includes(query)
  })
})

const readJson = async response => {
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) throw new Error(data.error || data.message || `请求失败 (${response.status})`)
  return data
}

const loadStatus = async () => {
  const data = await readJson(await fetch('/api/rag/status'))
  status.value = data.status || status.value
  embedding.value = { ...embedding.value, ...(data.embedding || {}) }
  watchPaths.value = data.watchPaths || watchPaths.value
  return data
}

const loadDocuments = async () => {
  const data = await readJson(await fetch('/api/rag/documents'))
  documents.value = data.documents || []
  if (data.status) status.value = data.status
}

const refreshWorkspace = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    await Promise.all([loadStatus(), loadDocuments()])
  } catch (error) {
    if (!silent) toast.error(error?.message || '加载知识库失败')
  } finally {
    if (!silent) loading.value = false
  }
}

const rebuildIndex = async () => {
  rebuilding.value = true
  try {
    const data = await readJson(await fetch('/api/rag/rebuild', { method: 'POST' }))
    status.value = data.status || status.value
    await loadDocuments()
    toast.success(`知识索引已更新，共 ${data.chunksCount || 0} 个分片`)
  } catch (error) {
    toast.error(error?.message || '索引更新失败')
  } finally {
    rebuilding.value = false
  }
}

const uploadFiles = async ({ files, options }) => {
  if (!files?.length) return
  uploading.value = true
  const body = new FormData()
  files.forEach(file => body.append('files', file))
  body.append('scopeType', options.scopeType)
  body.append('scopeId', options.scopeId || '')
  body.append('visibility', options.visibility)
  body.append('tags', (options.tags || []).join(','))
  try {
    const data = await readJson(await fetch('/api/rag/upload', { method: 'POST', body }))
    status.value = data.status || status.value
    await loadDocuments()
    const duplicates = (data.uploaded || []).filter(item => item.duplicate).length
    toast.success(duplicates ? `已更新 ${data.uploaded.length} 份文档，其中 ${duplicates} 份内容未变化` : `已导入 ${data.uploaded?.length || files.length} 份文档`)
  } catch (error) {
    toast.error(error?.message || '文档导入失败')
  } finally {
    uploading.value = false
  }
}

const importOnlineDocument = async payload => {
  importingUrl.value = true
  try {
    const data = await readJson(await fetch('/api/rag/import-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }))
    status.value = data.status || status.value
    await loadDocuments()
    toast.success(`已导入在线文档：${data.document?.name || payload.title || '在线资料'}`)
  } catch (error) {
    toast.error(error?.message || '在线文档导入失败')
  } finally {
    importingUrl.value = false
  }
}

const addWatchPath = async path => {
  pathAdding.value = true
  try {
    const data = await readJson(await fetch('/api/rag/watch-paths', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) }))
    watchPaths.value = data.paths || []
    toast.success(data.message || '同步目录已添加')
  } catch (error) {
    toast.error(error?.message || '添加同步目录失败')
  } finally {
    pathAdding.value = false
  }
}

const removeWatchPath = async path => {
  const confirmed = await confirmDialog(`停止监控“${path}”？已归档文档会继续保留。`)
  if (!confirmed) return
  try {
    const data = await readJson(await fetch(`/api/rag/watch-paths?path=${encodeURIComponent(path)}`, { method: 'DELETE' }))
    watchPaths.value = data.paths || []
    toast.success(data.message || '已停止监控')
  } catch (error) {
    toast.error(error?.message || '停止监控失败')
  }
}

const deleteDocument = async name => {
  const confirmed = await confirmDialog(`删除文档“${name}”？历史版本和当前检索内容将不再可用。`)
  if (!confirmed) return
  try {
    const data = await readJson(await fetch(`/api/rag/document?name=${encodeURIComponent(name)}`, { method: 'DELETE' }))
    status.value = data.status || status.value
    await loadDocuments()
    if (previewFileName.value === name) drawerVisible.value = false
    toast.success('文档已删除')
  } catch (error) {
    toast.error(error?.message || '删除文档失败')
  }
}

const viewDocument = async (filename, chunkIndex = -1) => {
  previewFileName.value = filename
  drawerVisible.value = true
  drawerSubTab.value = 'chunks'
  activeDrawerChunkIndex.value = Number.isFinite(chunkIndex) ? chunkIndex : -1
  docChunks.value = []
  docOriginalContent.value = ''
  docVersions.value = []
  versionPreview.value = null
  chunksLoading.value = true
  versionsLoading.value = true
  try {
    const [chunksData, versionsData] = await Promise.all([
      readJson(await fetch(`/api/rag/chunks?filename=${encodeURIComponent(filename)}`)),
      readJson(await fetch(`/api/rag/document-versions?name=${encodeURIComponent(filename)}`))
    ])
    docChunks.value = chunksData.chunks || []
    docVersions.value = versionsData.versions || []
  } catch (error) {
    toast.error(error?.message || '读取文档分片失败')
  } finally {
    chunksLoading.value = false
    versionsLoading.value = false
  }
}

const showOriginal = async () => {
  drawerSubTab.value = 'original'
  if (docOriginalContent.value) return
  originalLoading.value = true
  try {
    const data = await readJson(await fetch(`/api/rag/document-content?name=${encodeURIComponent(previewFileName.value)}`))
    docOriginalContent.value = data.content || '文档没有可读取的正文。'
  } catch (error) {
    docOriginalContent.value = error?.message || '读取原文失败。'
  } finally {
    originalLoading.value = false
  }
}

const previewVersion = async version => {
  versionPreviewLoading.value = true
  versionPreview.value = null
  try {
    const data = await readJson(await fetch(`/api/rag/document-version-content?name=${encodeURIComponent(previewFileName.value)}&file=${encodeURIComponent(version.file)}`))
    versionPreview.value = { version, content: data.content || '该版本没有可读取的正文。' }
  } catch (error) {
    toast.error(error?.message || '读取历史版本失败')
  } finally {
    versionPreviewLoading.value = false
  }
}

const restoreVersion = async version => {
  const confirmed = await confirmDialog(`恢复文档“${previewFileName.value}”的 v${version.version}？当前内容会自动归档为新的历史版本。`)
  if (!confirmed) return
  try {
    const data = await readJson(await fetch('/api/rag/restore-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: previewFileName.value, file: version.file })
    }))
    status.value = data.status || status.value
    await loadDocuments()
    await viewDocument(previewFileName.value)
    drawerSubTab.value = 'versions'
    toast.success(`已恢复为 v${data.document?.version || ''}`)
  } catch (error) {
    toast.error(error?.message || '恢复历史版本失败')
  }
}

const openEditor = doc => {
  editorDocument.value = doc
  editorTags.value = [...(doc.tags || [])]
  editorNewTag.value = ''
  editorScopeType.value = doc.scope?.type || 'global'
  editorScopeId.value = doc.scope?.id || ''
  editorVisibility.value = doc.visibility || 'shared'
  editorVisible.value = true
}

const addEditorTag = () => {
  let tag = editorNewTag.value.trim()
  if (!tag) return
  if (!tag.startsWith('#')) tag = `#${tag}`
  if (!editorTags.value.includes(tag)) editorTags.value.push(tag)
  editorNewTag.value = ''
}

const saveDocumentMetadata = async () => {
  if (!editorDocument.value) return
  editorSaving.value = true
  try {
    const data = await readJson(await fetch('/api/rag/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editorDocument.value.name,
        tags: editorTags.value.filter(tag => !tag.startsWith('#scope:')),
        scope: { type: editorScopeType.value, id: editorScopeId.value.trim() },
        visibility: editorVisibility.value
      })
    }))
    status.value = data.status || status.value
    editorVisible.value = false
    await loadDocuments()
    toast.success('文档范围与标签已更新')
  } catch (error) {
    toast.error(error?.message || '保存文档信息失败')
  } finally {
    editorSaving.value = false
  }
}

const saveEmbeddingSettings = async payload => {
  settingsSaving.value = true
  try {
    const data = await readJson(await fetch('/api/rag/embedding-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }))
    embedding.value = { ...embedding.value, ...(data.config || {}) }
    status.value = data.status || status.value
    settingsVisible.value = false
    await loadDocuments()
    toast.success(payload.enabled ? '语义检索配置已保存' : '已切换为本地混合检索')
  } catch (error) {
    toast.error(error?.message || '保存检索设置失败')
  } finally {
    settingsSaving.value = false
  }
}

const formatSize = bytes => {
  const value = Number(bytes || 0)
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)))
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

const formatDate = value => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

onMounted(async () => {
  await refreshWorkspace()
  pollTimer = window.setInterval(() => {
    if (status.value.state === 'building') void refreshWorkspace(true)
  }, 1500)
})

onBeforeUnmount(() => { if (pollTimer) window.clearInterval(pollTimer) })
</script>

<template>
  <main class="knowledge-page">
    <KnowledgeHealthOverview :status="status" :embedding="embedding" :document-count="documents.length" :watch-count="watchPaths.length" :rebuilding="rebuilding" @rebuild="rebuildIndex" @open-settings="settingsVisible = true" />

    <div class="workspace-layout">
      <div class="top-grid">
        <KnowledgeImportPanel :uploading="uploading" :importing-url="importingUrl" :path-adding="pathAdding" :watch-paths="watchPaths" @upload="uploadFiles" @import-url="importOnlineDocument" @add-path="addWatchPath" @remove-path="removeWatchPath" />
        <KnowledgeQueryWorkspace :available-tags="availableTags" @open-source="viewDocument($event.filename, $event.chunkIndex)" />
      </div>
      <KnowledgeDocumentList v-model:search-query="searchQuery" v-model:scope-filter="scopeFilter" v-model:status-filter="statusFilter" :documents="filteredDocuments" :loading="loading" :format-size="formatSize" :format-date="formatDate" @preview="viewDocument" @delete="deleteDocument" @edit-tags="openEditor" />
    </div>

    <KnowledgeChunksDrawer :visible="drawerVisible" :preview-file-name="previewFileName" :doc-chunks="docChunks" :doc-original-content="docOriginalContent" :chunks-loading="chunksLoading" :original-loading="originalLoading" :drawer-sub-tab="drawerSubTab" :active-chunk-index="activeDrawerChunkIndex" :parse-status="previewDocument?.parseStatus" :parse-error="previewDocument?.parseError" :versions="docVersions" :versions-loading="versionsLoading" :version-preview="versionPreview" :version-preview-loading="versionPreviewLoading" @close="drawerVisible = false" @show-chunks="drawerSubTab = 'chunks'" @show-original="showOriginal" @show-versions="drawerSubTab = 'versions'" @preview-version="previewVersion" @restore-version="restoreVersion" />
    <KnowledgeTagEditorModal v-model:new-tag="editorNewTag" v-model:scope-type="editorScopeType" v-model:scope-id="editorScopeId" v-model:visibility="editorVisibility" :visible="editorVisible" :doc="editorDocument" :tags="editorTags" :saving="editorSaving" @close="editorVisible = false" @add-tag="addEditorTag" @remove-tag="editorTags = editorTags.filter(item => item !== $event)" @save="saveDocumentMetadata" />
    <KnowledgeSettingsModal :visible="settingsVisible" :config="embedding" :saving="settingsSaving" @close="settingsVisible = false" @save="saveEmbeddingSettings" />
  </main>
</template>

<style scoped>
.knowledge-page { min-height: 100%; overflow-y: auto; background: var(--bg-primary, #f4f7fb); color: var(--text-primary, #0f172a); }
.workspace-layout { display: grid; gap: 16px; width: min(1560px, 100%); margin: 0 auto; padding: 18px 24px 28px; box-sizing: border-box; }
.top-grid { display: grid; grid-template-columns: minmax(360px, .82fr) minmax(480px, 1.18fr); gap: 16px; align-items: start; }
@media (max-width: 1080px) { .top-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .workspace-layout { padding: 12px; gap: 12px; }.top-grid { gap: 12px; } }
</style>
