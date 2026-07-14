<script setup>
import { nextTick, watch } from 'vue'

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
  versionPreviewLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'show-chunks', 'show-original', 'show-versions', 'preview-version', 'restore-version'])

const formatVersionTime = value => {
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
        <div class="drawer-header">
          <div class="drawer-title-info">
            <h3>{{ previewFileName }}</h3>
            <div class="drawer-tabs">
              <button
                class="drawer-tab-btn"
                :class="{ active: drawerSubTab === 'chunks' }"
                @click="emit('show-chunks')"
              >
                文档分片 ({{ docChunks.length }})
              </button>
              <button
                class="drawer-tab-btn"
                :class="{ active: drawerSubTab === 'original' }"
                @click="emit('show-original')"
              >
                完整原文
              </button>
              <button
                class="drawer-tab-btn"
                :class="{ active: drawerSubTab === 'versions' }"
                @click="emit('show-versions')"
              >
                历史版本 ({{ versions.length }})
              </button>
            </div>
          </div>
          <button class="btn-close-drawer" @click="emit('close')">×</button>
        </div>

        <div class="drawer-body">
          <div v-if="parseStatus === 'failed'" class="parse-alert">{{ parseError || '文档解析失败' }}</div>
          <div v-if="drawerSubTab === 'chunks'">
            <div v-if="chunksLoading" class="drawer-loading">
              <span class="spinner-icon">🌀</span> 正在载入分片数据...
            </div>

            <div v-else-if="docChunks.length === 0" class="drawer-empty">
              未找到此文档的分片，这可能是个空文件。
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
                  <span class="tokens-badge">估算词数: {{ chunk.tokenCount }}</span>
                </div>
                <div class="chunk-card-content">
                  <pre>{{ chunk.text }}</pre>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="drawerSubTab === 'original'">
            <div v-if="originalLoading" class="drawer-loading">
              <span class="spinner-icon">🌀</span> 正在提取文档全文 (支持 PDF 解析)...
            </div>
            <div v-else class="original-content-viewer">
              <pre class="original-pre-box">{{ docOriginalContent }}</pre>
            </div>
          </div>

          <div v-else class="version-panel">
            <div v-if="versionsLoading" class="drawer-loading">正在读取历史版本...</div>
            <div v-else-if="!versions.length" class="drawer-empty">当前文档还没有历史版本。</div>
            <div v-else class="version-list">
              <div v-for="version in versions" :key="version.file" class="version-row">
                <div><strong>v{{ version.version }}</strong><span>{{ formatVersionTime(version.archived_at) }}</span><code>{{ version.hash?.slice(0, 12) }}</code></div>
                <div class="version-actions"><button type="button" @click="emit('preview-version', version)">预览</button><button type="button" class="restore" @click="emit('restore-version', version)">恢复</button></div>
              </div>
            </div>
            <div v-if="versionPreviewLoading" class="version-preview loading">正在读取版本内容...</div>
            <div v-else-if="versionPreview" class="version-preview"><div><strong>v{{ versionPreview.version?.version }} 预览</strong><span>{{ versionPreview.version?.file }}</span></div><pre>{{ versionPreview.content }}</pre></div>
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
.drawer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}
.drawer-container {
  position: relative;
  width: 600px;
  height: 100%;
  background: var(--surface, #ffffff);
  border-left: 1px solid var(--border-color);
  box-shadow: -10px 0 30px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  z-index: 2;
}
.drawer-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.drawer-title-info h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  max-width: 460px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.drawer-tabs { display: flex; gap: 14px; margin-top: 8px; overflow-x: auto; }
.drawer-tab-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 0;
  position: relative;
}
.drawer-tab-btn:hover { color: var(--text-primary); }
.drawer-tab-btn.active { color: var(--accent-blue, #0072ff); }
.drawer-tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--accent-blue, #0072ff);
}
.btn-close-drawer {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}
.btn-close-drawer:hover { color: var(--text-primary); }
.drawer-body { flex: 1; overflow-y: auto; padding: 24px; }
.parse-alert { margin-bottom: 14px; padding: 10px 12px; border-left: 3px solid #dc2626; background: rgba(220,38,38,.07); color: #b91c1c; font-size: 11px; line-height: 1.5; }
.drawer-loading, .drawer-empty {
  padding: 80px 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}
.drawer-chunks-list { display: flex; flex-direction: column; gap: 16px; }
.drawer-chunk-card {
  background: var(--bg-primary, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 14px;
}
.drawer-chunk-card.selected { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.1); }
.chunk-card-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 11px;
}
.chunk-badge {
  background: rgba(0, 114, 255, 0.08);
  color: var(--accent-blue, #0072ff);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}
.tokens-badge { color: var(--text-secondary); }
.chunk-heading { min-width: 0; flex: 1; overflow: hidden; color: var(--text-primary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.chunk-card-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.6;
  background: var(--surface, #ffffff);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}
.original-content-viewer {
  background: var(--bg-primary, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
}
.original-pre-box {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.6;
}
.version-panel { display: grid; gap: 14px; }
.version-list { display: grid; gap: 8px; }
.version-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 12px; border: 1px solid var(--border-color); border-radius: 7px; background: var(--bg-primary, #f8fafc); }
.version-row > div:first-child { min-width: 0; display: flex; align-items: center; gap: 9px; }
.version-row strong { color: var(--text-primary); font-size: 11px; }.version-row span, .version-row code { color: var(--text-secondary); font-size: 10px; }.version-row code { overflow: hidden; text-overflow: ellipsis; }
.version-actions { display: flex; gap: 5px; }.version-actions button { height: 27px; padding: 0 8px; border: 1px solid var(--border-color); border-radius: 5px; background: var(--surface, #fff); color: var(--text-secondary); font-size: 10px; cursor: pointer; }.version-actions button.restore { border-color: #2563eb; color: #1d4ed8; }
.version-preview { min-width: 0; border: 1px solid var(--border-color); border-radius: 7px; overflow: hidden; }.version-preview > div { display: flex; justify-content: space-between; gap: 10px; padding: 9px 11px; border-bottom: 1px solid var(--border-color); }.version-preview strong { color: var(--text-primary); font-size: 11px; }.version-preview span { color: var(--text-secondary); font-size: 10px; }.version-preview pre { max-height: 360px; overflow: auto; margin: 0; padding: 12px; background: var(--bg-primary, #f8fafc); color: var(--text-primary); font-size: 11px; line-height: 1.6; white-space: pre-wrap; }.version-preview.loading { padding: 24px; color: var(--text-secondary); font-size: 11px; text-align: center; }
.slide-in-enter-active, .slide-in-leave-active {
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.slide-in-enter-from, .slide-in-leave-to {
  transform: translateX(100%);
  opacity: 0.9;
}
:global([data-theme='dark']) .drawer-chunk-card { background: rgba(255,255,255,0.01); }
:global([data-theme='dark']) .chunk-card-content pre,
:global([data-theme='dark']) .original-content-viewer { background: rgba(0,0,0,0.15); }
@media (max-width: 680px) { .drawer-container { width: 100%; } .drawer-header, .drawer-body { padding: 16px; } .drawer-title-info { min-width: 0; }.drawer-title-info h3 { max-width: calc(100vw - 80px); } .version-row { align-items: flex-start; flex-direction: column; }.version-actions { align-self: stretch; }.version-actions button { flex: 1; } }
</style>
