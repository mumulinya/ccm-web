<script setup>
defineProps({
  path: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  drives: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'load', 'go-up', 'refresh', 'select'])
</script>

<template>
  <div class="modal-overlay folder-overlay" @click.self="emit('close')">
    <div class="modal folder-modal">
      <div class="folder-header">
        <h3><span>📂</span> 选择项目目录</h3>
        <button class="modal-close folder-close" @click="emit('close')">&times;</button>
      </div>

      <div class="folder-body">
        <div class="drive-list">
          <button v-for="d in drives" :key="d.name" class="btn btn-outline" @click="emit('load', d.path)">
            <span>💽</span> {{ d.name }}:
          </button>
          <button class="btn btn-outline" @click="emit('load', '/')">
            <span>🌐</span> / 根目录
          </button>
        </div>

        <div class="path-bar">
          <span>>_</span>
          <strong>{{ path || '正在加载...' }}</strong>
        </div>

        <div class="folder-list">
          <div v-if="items.length === 0" class="folder-empty">
            <span>🕳️</span>
            <span>空空如也</span>
          </div>

          <div
            v-for="item in items"
            :key="item.path"
            class="folder-item"
            :class="{ disabled: !item.isDirectory }"
            @click="item.isDirectory && emit('load', item.path)"
          >
            <div class="folder-item-icon">{{ item.isDirectory ? '📁' : '📄' }}</div>
            <span>{{ item.name }}</span>
            <small v-if="item.isDirectory">进入</small>
          </div>
        </div>

        <div class="folder-actions">
          <button class="btn btn-outline" @click="emit('go-up')">⬆ 返回上级</button>
          <button class="btn btn-outline" @click="emit('refresh')">🔄 刷新</button>
          <div></div>
          <button class="btn btn-cancel" @click="emit('close')">取消</button>
          <button class="btn btn-primary select-folder" @click="emit('select')">✓ 选择此目录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.folder-overlay {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
}

.folder-modal {
  min-width: 650px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  background: rgba(20, 20, 25, 0.85) !important;
  border: 1px solid rgba(56, 189, 248, 0.3) !important;
  border-radius: 12px;
  box-shadow: 0 0 30px rgba(56, 189, 248, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.02);
}

.folder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.1) 0%, transparent 100%);
}

.folder-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
}

.folder-header h3 span {
  font-size: 20px;
}

.folder-close {
  position: static;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
}

.folder-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.drive-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.drive-list .btn,
.folder-actions .btn {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
}

.drive-list .btn {
  padding: 6px 14px;
  font-size: 12px;
}

.drive-list span {
  color: var(--accent-blue);
}

.path-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 13px;
}

.path-bar span {
  color: var(--accent-blue);
  opacity: 0.7;
}

.path-bar strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.5px;
  font-weight: 400;
}

.folder-list {
  flex: 1;
  min-height: 300px;
  max-height: 45vh;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
}

.folder-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  opacity: 0.5;
}

.folder-empty span:first-child {
  margin-bottom: 8px;
  font-size: 32px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 2px;
  padding: 10px 16px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.folder-item:not(.disabled):hover {
  transform: translateX(4px);
  border-color: rgba(56, 189, 248, 0.2);
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.1) 0%, transparent 100%);
}

.folder-item.disabled {
  cursor: default;
  opacity: 0.4;
}

.folder-item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  font-size: 18px;
}

.folder-item span {
  flex: 1;
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  letter-spacing: 0.3px;
}

.folder-item small {
  color: var(--accent-blue);
  font-size: 12px;
  opacity: 0.5;
}

.folder-actions {
  display: grid;
  grid-template-columns: auto auto 1fr auto auto;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.select-folder {
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);
  font-weight: 600;
}

@media (max-width: 640px) {
  .folder-header,
  .folder-body {
    padding-right: 14px;
    padding-left: 14px;
  }

  .folder-list {
    min-height: 220px;
  }

  .folder-actions {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .folder-actions > span {
    display: none;
  }

  .folder-actions .btn {
    min-width: 0;
    width: 100%;
  }
}
</style>
