<script setup>
import EmptyState from '../common/EmptyState.vue'

defineProps({
  groupName: { type: String, default: '' },
  files: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'add-file', 'delete-file'])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal resource-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>📁 群聊共享文件 - {{ groupName }}</h3>
      <div class="modal-desc">Agent 可以直接读取这些文件</div>
      <div class="file-actions">
        <button class="btn btn-primary btn-sm" @click="emit('add-file')">+ 新建文件</button>
      </div>
      <div class="resource-body">
        <EmptyState v-if="files.length === 0" icon="📁" title="暂无共享文件" />
        <div v-for="file in files" :key="file.name" class="file-row">
          <div>
            <div class="file-name">📄 {{ file.name }}</div>
            <div class="file-time">{{ new Date(file.created_at).toLocaleString('zh-CN') }}</div>
          </div>
          <button class="btn btn-danger btn-sm" @click="emit('delete-file', file.name)">删除</button>
        </div>
      </div>
      <div class="resource-footer single">
        <button class="btn btn-primary" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; min-width: 420px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; position: relative; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; }
.resource-modal { min-width: 500px; max-height: 80vh; display: flex; flex-direction: column; }
.modal h3 { margin: 0 0 8px; font-size: 16px; color: var(--text-primary); }
.modal-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 16px; }
.file-actions { margin-bottom: 12px; }
.resource-body { flex: 1; overflow-y: auto; }
.file-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; }
.file-name { font-size: 13px; color: var(--text-primary); }
.file-time { font-size: 11px; color: var(--text-muted); }
.resource-footer { display: flex; justify-content: flex-end; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-primary { background: var(--gradient-blue); color: white; }
.btn-danger { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.18); color: #dc2626; }
</style>
