<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  previewFileName: { type: String, default: '' },
  docChunks: { type: Array, default: () => [] },
  docOriginalContent: { type: String, default: '' },
  chunksLoading: { type: Boolean, default: false },
  originalLoading: { type: Boolean, default: false },
  drawerSubTab: { type: String, default: 'chunks' }
})

const emit = defineEmits(['close', 'show-chunks', 'show-original'])
</script>

<template>
  <transition name="slide-in">
    <div v-if="visible" class="chunks-preview-drawer">
      <div class="drawer-overlay" @click="emit('close')"></div>
      <div class="drawer-container">
        <div class="drawer-header">
          <div class="drawer-title-info">
            <h3>📄 {{ previewFileName }}</h3>
            <div class="drawer-tabs">
              <button
                class="drawer-tab-btn"
                :class="{ active: drawerSubTab === 'chunks' }"
                @click="emit('show-chunks')"
              >
                🗂️ 文档分片 ({{ docChunks.length }})
              </button>
              <button
                class="drawer-tab-btn"
                :class="{ active: drawerSubTab === 'original' }"
                @click="emit('show-original')"
              >
                📝 完整原文
              </button>
            </div>
          </div>
          <button class="btn-close-drawer" @click="emit('close')">×</button>
        </div>

        <div class="drawer-body">
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
                :key="chunk.index"
                class="drawer-chunk-card"
              >
                <div class="chunk-card-meta">
                  <span class="chunk-badge">分片 #{{ chunk.index }}</span>
                  <span class="tokens-badge">估算词数: {{ chunk.tokenCount }}</span>
                </div>
                <div class="chunk-card-content">
                  <pre>{{ chunk.text }}</pre>
                </div>
              </div>
            </div>
          </div>

          <div v-else>
            <div v-if="originalLoading" class="drawer-loading">
              <span class="spinner-icon">🌀</span> 正在提取文档全文 (支持 PDF 解析)...
            </div>
            <div v-else class="original-content-viewer">
              <pre class="original-pre-box">{{ docOriginalContent }}</pre>
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
.drawer-tabs { display: flex; gap: 16px; margin-top: 8px; }
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
</style>
