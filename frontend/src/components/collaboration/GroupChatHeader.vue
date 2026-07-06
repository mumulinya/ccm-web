<script setup>
defineProps({
  groups: { type: Array, default: () => [] },
  currentGroup: { type: Object, default: null },
  collaborationProtocol: { type: Object, default: null },
  memoryActive: { type: Boolean, default: false },
  memoryLabel: { type: String, default: '' },
  memoryMeta: { type: String, default: '' },
  memoryTitle: { type: String, default: '' },
  getMemberCountLabel: { type: Function, required: true }
})

const emit = defineEmits([
  'select-group',
  'create-group',
  'load-tools',
  'load-files',
  'load-logs',
  'show-members',
  'refresh',
  'save-knowledge',
  'rename',
  'clear-messages',
  'delete-group'
])
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <span class="label">群聊：</span>
      <div class="group-list">
        <div
          v-for="group in groups"
          :key="group.id"
          class="group-card"
          :class="{ active: currentGroup?.id === group.id }"
          @click="emit('select-group', group.id)"
        >
          <span>💬</span>
          <span>{{ group.name }}</span>
          <span class="badge">{{ getMemberCountLabel(group) }}</span>
        </div>
      </div>
    </div>
    <button class="btn btn-primary" @click="emit('create-group')">+ 新建群聊</button>
  </div>

  <div class="content-header">
    <div class="group-title-line">
      <span>{{ currentGroup ? '💬 ' + currentGroup.name : '选择或创建一个群聊' }}</span>
      <span v-if="currentGroup" class="memory-chip" :class="{ active: memoryActive }" :title="memoryTitle">
        <span class="memory-chip-dot"></span>
        <span class="memory-chip-label">{{ memoryLabel }}</span>
        <span class="memory-chip-meta">{{ memoryMeta }}</span>
      </span>
      <span
        v-if="currentGroup && collaborationProtocol?.success"
        class="memory-chip protocol"
        :title="`开放 ${collaborationProtocol.summary?.open || 0}；采纳 ${collaborationProtocol.summary?.accepted || 0}；权限违规 ${collaborationProtocol.summary?.permission_violations || 0}`"
      >
        <span class="memory-chip-dot"></span>
        <span class="memory-chip-label">Agent 协作 {{ collaborationProtocol.version }}</span>
        <span class="memory-chip-meta">开放 {{ collaborationProtocol.summary?.open || 0 }}</span>
      </span>
    </div>
    <div v-if="currentGroup" class="header-actions">
      <button class="btn btn-outline btn-sm" @click="emit('load-tools')">🔧 工具</button>
      <button class="btn btn-outline btn-sm" @click="emit('load-files')">📁 共享文件</button>
      <button class="btn btn-outline btn-sm" @click="emit('load-logs')">📋 日志</button>
      <button class="btn btn-outline btn-sm" @click="emit('show-members')">👥 成员</button>
      <button class="btn btn-outline btn-sm" @click="emit('refresh')">↻ 刷新</button>
      <button class="btn btn-outline btn-sm" @click="emit('save-knowledge')">保存知识</button>
      <button class="btn btn-outline btn-sm" @click="emit('rename', currentGroup.name)">✏️ 重命名</button>
      <button class="btn btn-outline btn-sm" @click="emit('clear-messages')">🧹 清空聊天</button>
      <button class="btn btn-danger btn-sm" @click="emit('delete-group')">🗑️ 删除</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; padding: 14px 20px; background: rgba(255, 255, 255, 0.25); border-bottom: 1px solid rgba(0, 0, 0, 0.05); gap: 12px; }
.toolbar-left { display: flex; align-items: center; gap: 12px; flex: 1; overflow-x: auto; }
.toolbar-left::-webkit-scrollbar { display: none; }
.label { font-size: 12px; color: var(--text-muted); white-space: nowrap; font-weight: 500; }
.group-list { display: flex; gap: 10px; overflow-x: auto; }
.group-list::-webkit-scrollbar { display: none; }
.group-card { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 10px; cursor: pointer; white-space: nowrap; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); font-size: 13px; color: var(--text-secondary); }
.group-card:hover { border-color: rgba(59, 130, 246, 0.2); background: rgba(59, 130, 246, 0.02); }
.group-card.active { border-color: rgba(59, 130, 246, 0.35); background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.03); }
.badge { font-size: 9.5px; padding: 2px 6px; background: rgba(0,0,0,0.04); border-radius: 4px; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; }
.content-header { padding: 14px 20px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); font-size: 13px; font-weight: 600; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.group-title-line { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
.header-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.memory-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 7px 4px 9px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.62);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 700;
}
.memory-chip:hover { border-color: rgba(59, 130, 246, 0.2); }
.memory-chip.active { color: #334155; }
.memory-chip.protocol { color: #475569; }
.memory-chip-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--text-muted); }
.memory-chip.active .memory-chip-dot { background: var(--accent-green); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12); }
.memory-chip.protocol .memory-chip-dot { background: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12); }
.memory-chip-label { letter-spacing: -0.01em; }
.memory-chip-meta { color: var(--text-muted); font-size: 10.5px; font-weight: 600; }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-primary { background: var(--gradient-blue); color: white; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-danger { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.18); color: #dc2626; }

:global([data-theme="dark"]) .toolbar { background: rgba(10, 10, 20, 0.3); border-bottom-color: rgba(255,255,255,0.05); }
:global([data-theme="dark"]) .group-card { background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.06); }
:global([data-theme="dark"]) .group-card:hover { background: rgba(255,255,255,0.05); }
:global([data-theme="dark"]) .group-card.active { background: rgba(59, 130, 246, 0.14); border-color: rgba(59, 130, 246, 0.3); }
:global([data-theme="dark"]) .badge { background: rgba(255,255,255,0.06); }
:global([data-theme="dark"]) .content-header { border-bottom-color: rgba(255,255,255,0.05); }
:global([data-theme="dark"]) .memory-chip { background: rgba(15, 23, 42, 0.5); border-color: rgba(148, 163, 184, 0.16); }
:global([data-theme="dark"]) .memory-chip:hover { border-color: rgba(59, 130, 246, 0.3); }
:global([data-theme="dark"]) .memory-chip-meta { color: rgba(148, 163, 184, 0.85); }

@media (max-width: 768px) {
  .content-header { flex-wrap: wrap; gap: 6px; }
  .toolbar { overflow-x: auto; flex-wrap: nowrap; }
}
</style>
