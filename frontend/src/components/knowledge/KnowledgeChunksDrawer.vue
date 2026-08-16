<script setup>
import { nextTick, watch } from 'vue'
import {
  Eye,
  FileCode,
  FileText,
  History,
  Layers,
  LoaderCircle,
  RotateCcw,
  X,
} from '@lucide/vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  previewFileName: { type: String, default: '' },
  docChunks: { type: Array, default: () => [] },
  docOriginalContent: { type: String, default: '' },
  chunksLoading: { type: Boolean, default: false },
  originalLoading: { type: Boolean, default: false },
  drawerSubTab: { type: String, default: 'chunks' },
  activeChunkIndex: { type: Number, default: -1 },
  parseStatus: { type: String, default: '' },
  parseError: { type: String, default: '' },
  versions: { type: Array, default: () => [] },
  versionsLoading: { type: Boolean, default: false },
  versionPreview: { type: Object, default: null },
  versionPreviewLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'show-chunks', 'show-original', 'show-versions', 'preview-version', 'restore-version'])

const formatVersionTime = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

watch(() => [props.visible, props.activeChunkIndex, props.docChunks.length], async () => {
  if (!props.visible || props.activeChunkIndex < 0) return
  await nextTick()
  document.querySelector(`[data-knowledge-chunk="${props.activeChunkIndex}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
})
</script>

<template>
  <transition name="slide-in">
    <div v-if="visible" class="chunks-preview-drawer">
      <div class="drawer-overlay" @click="emit('close')"></div>
      <div class="drawer-container">
        <!-- 抽屉头部 -->
        <div class="drawer-header">
          <div class="drawer-title-info">
            <h3 :title="previewFileName">{{ previewFileName }}</h3>
            <!-- 胶囊 Tab 切换 -->
            <div class="drawer-segmented-tabs">
              <button
                type="button"
                class="tab-btn"
                :class="{ active: drawerSubTab === 'chunks' }"
                @click="emit('show-chunks')"
              >
                <Layers :size="12" />
                <span>分片 ({{ docChunks.length }})</span>
              </button>
              <button
                type="button"
                class="tab-btn"
                :class="{ active: drawerSubTab === 'original' }"
                @click="emit('show-original')"
              >
                <FileText :size="12" />
                <span>完整全文</span>
              </button>
              <button
                type="button"
                class="tab-btn"
                :class="{ active: drawerSubTab === 'versions' }"
                @click="emit('show-versions')"
              >
                <History :size="12" />
                <span>历史版本 ({{ versions.length }})</span>
              </button>
            </div>
          </div>
          <button type="button" class="btn-close-drawer" title="关闭抽屉" @click="emit('close')">
            <X :size="18" />
          </button>
        </div>

        <!-- 抽屉主体 -->
        <div class="drawer-body">
          <div v-if="parseStatus === 'failed'" class="parse-alert">
            {{ parseError || '文档解析失败，建议重新上传' }}
          </div>

          <!-- 1. 文档分片列表 -->
          <div v-if="drawerSubTab === 'chunks'">
            <div v-if="chunksLoading" class="drawer-state">
              <LoaderCircle :size="24" class="spinning" />
              <p>正在载入文档分片数据...</p>
            </div>

            <div v-else-if="docChunks.length === 0" class="drawer-state">
              <p>未找到此文档的分片，这可能是个空文件。</p>
            </div>

            <div v-else class="drawer-chunks-list">
              <div
                v-for="chunk in docChunks"
                :key="chunk.id || chunk.index"
                class="drawer-chunk-card"
                :class="{ selected: activeChunkIndex === chunk.index }"
                :data-knowledge-chunk="chunk.index"
              >
                <div class="chunk-card-meta">
                  <span class="chunk-badge">分片 #{{ Number(chunk.index) + 1 }}</span>
                  <span v-if="chunk.heading" class="chunk-heading">{{ chunk.heading }}</span>
                  <span class="tokens-badge font-mono">估算 Token: {{ chunk.tokenCount }}</span>
                </div>
                <div class="chunk-card-content">
                  <pre>{{ chunk.text }}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. 完整原文预览 -->
          <div v-else-if="drawerSubTab === 'original'">
            <div v-if="originalLoading" class="drawer-state">
              <LoaderCircle :size="24" class="spinning" />
              <p>正在提取文档全文 (支持 PDF/Office 解析)...</p>
            </div>
            <div v-else class="original-content-viewer">
              <pre class="original-pre-box">{{ docOriginalContent }}</pre>
            </div>
          </div>

          <!-- 3. 历史版本管理 -->
          <div v-else class="version-panel">
            <div v-if="versionsLoading" class="drawer-state">
              <LoaderCircle :size="24" class="spinning" />
              <p>正在读取历史版本记录...</p>
            </div>
            <div v-else-if="!versions.length" class="drawer-state">
              <p>当前文档还没有归档历史版本。</p>
            </div>
            <div v-else class="version-list">
              <div v-for="version in versions" :key="version.file" class="version-row">
                <div class="version-info">
                  <strong class="font-mono">v{{ version.version }}</strong>
                  <span class="version-time">{{ formatVersionTime(version.archived_at) }}</span>
                  <code class="font-mono">{{ version.hash?.slice(0, 12) }}</code>
                </div>
                <div class="version-actions">
                  <button type="button" class="btn-v-action" @click="emit('preview-version', version)">
                    <Eye :size="12" />
                    <span>预览</span>
                  </button>
                  <button type="button" class="btn-v-action restore" @click="emit('restore-version', version)">
                    <RotateCcw :size="12" />
                    <span>恢复</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 版本内容预览 -->
            <div v-if="versionPreviewLoading" class="version-preview-box loading">
              <LoaderCircle :size="18" class="spinning" />
              <span>正在读取该版本内容...</span>
            </div>
            <div v-else-if="versionPreview" class="version-preview-box">
              <div class="preview-head">
                <strong>v{{ versionPreview.version?.version }} 版本内容预览</strong>
                <span>{{ versionPreview.version?.file }}</span>
              </div>
              <pre>{{ versionPreview.content }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.chunks-preview-drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.drawer-overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay-scrim, rgba(15, 23, 42, 0.45));
  backdrop-filter: blur(4px);
}

.drawer-container {
  position: relative;
  width: 640px;
  max-width: 100%;
  height: 100%;
  background: var(--surface, var(--bg-card));
  border-left: 1px solid var(--border-color);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 2;
}

/* 头部 */
.drawer-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.drawer-title-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.drawer-title-info h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-segmented-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--surface);
}

.tab-btn.active {
  background: var(--surface, var(--bg-card));
  color: var(--accent-blue, #2563eb);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.btn-close-drawer {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-close-drawer:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

/* 主体 */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: var(--bg-primary);
}

.parse-alert {
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-size: 11.5px;
  margin-bottom: 12px;
}

.drawer-state {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

.drawer-chunks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drawer-chunk-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  padding: 12px;
  transition: border-color 0.15s ease;
}

.drawer-chunk-card.selected {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.chunk-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.chunk-badge {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--accent-blue);
  background: var(--accent-soft);
  padding: 2px 6px;
  border-radius: 4px;
}

.chunk-heading {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tokens-badge {
  font-size: 10.5px;
  color: var(--text-muted);
  margin-left: auto;
}

.chunk-card-content pre,
.original-pre-box {
  margin: 0;
  font-family: var(--font-mono, monospace);
  font-size: 11.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
  background: var(--panel-muted, rgba(148, 163, 184, 0.05));
  padding: 10px;
  border-radius: 6px;
}

.original-pre-box {
  background: var(--surface);
  border: 1px solid var(--border-color);
  padding: 14px;
}

/* 版本列表 */
.version-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.version-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--surface);
}

.version-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-info strong {
  font-size: 12.5px;
  color: var(--accent-blue);
}

.version-time {
  font-size: 11px;
  color: var(--text-muted);
}

.version-info code {
  font-size: 10.5px;
  color: var(--text-secondary);
  background: var(--panel-muted);
  padding: 1px 5px;
  border-radius: 4px;
}

.version-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-v-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-v-action:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.btn-v-action.restore:hover {
  border-color: #10b981;
  color: #10b981;
}

.version-preview-box {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-preview-box.loading {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 11.5px;
}

.preview-head {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
}

.preview-head strong { color: var(--text-primary); }
.preview-head span { color: var(--text-muted); }

.version-preview-box pre {
  margin: 0;
  padding: 10px;
  border-radius: 6px;
  background: var(--bg-primary);
  font-size: 11.5px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
}

.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.slide-in-enter-active,
.slide-in-leave-active {
  transition: opacity 0.2s ease;
}

.slide-in-enter-active .drawer-container,
.slide-in-leave-active .drawer-container {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-in-enter-from,
.slide-in-leave-to {
  opacity: 0;
}

.slide-in-enter-from .drawer-container,
.slide-in-leave-to .drawer-container {
  transform: translateX(100%);
}
</style>
