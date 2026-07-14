<script setup>
import {
  Activity,
  Archive,
  BookOpen,
  FileText,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Users,
  X,
  MessageSquare,
} from '@lucide/vue'

defineProps({
  groups: { type: Array, default: () => [] },
  currentGroup: { type: Object, default: null },
  sessions: { type: Array, default: () => [] },
  currentSessionId: { type: String, default: '' },
  collaborationProtocol: { type: Object, default: null },
  memoryActive: { type: Boolean, default: false },
  memoryLabel: { type: String, default: '' },
  memoryMeta: { type: String, default: '' },
  memoryTitle: { type: String, default: '' },
  getMemberCountLabel: { type: Function, required: true }
})

const emit = defineEmits([
  'select-group',
  'select-session',
  'create-session',
  'rename-session',
  'archive-session',
  'delete-session',
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
          <MessageSquare :size="15" />
          <span>{{ group.name }}</span>
          <span class="badge">{{ getMemberCountLabel(group) }}</span>
        </div>
      </div>
    </div>
    <button class="btn btn-primary" @click="emit('create-group')"><Plus :size="15" />新建群聊</button>
  </div>

  <div class="content-header">
    <div class="group-title-line">
      <span class="group-name"><MessageSquare :size="15" />{{ currentGroup ? currentGroup.name : '选择或创建一个群聊' }}</span>
      <div v-if="currentGroup" class="session-switcher">
        <select :value="currentSessionId" title="切换群聊会话" @change="emit('select-session', $event.target.value)">
          <option v-for="session in sessions" :key="session.id" :value="session.id">{{ session.archived ? '[已归档] ' : '' }}{{ session.title }} · {{ session.messageCount || 0 }}</option>
        </select>
        <button class="session-add" title="新建会话" aria-label="新建会话" @click="emit('create-session')"><Plus :size="16" /></button>
        <details class="action-menu session-action-menu">
          <summary title="更多会话操作" aria-label="更多会话操作"><MoreHorizontal :size="17" /></summary>
          <div class="action-menu-popover">
            <button type="button" @click="emit('rename-session')"><Pencil :size="14" />重命名会话</button>
            <button type="button" @click="emit('archive-session')"><Archive :size="14" />归档会话</button>
            <button type="button" class="danger" @click="emit('delete-session')"><X :size="14" />删除会话</button>
          </div>
        </details>
      </div>
      <details v-if="currentGroup" class="collaboration-status">
        <summary><Activity :size="14" />协作状态</summary>
        <div class="collaboration-status-popover">
          <div class="status-row" :title="memoryTitle">
            <span class="memory-chip-dot" :class="{ active: memoryActive }"></span>
            <span>{{ memoryLabel }}</span>
            <strong>{{ memoryMeta }}</strong>
          </div>
          <div v-if="collaborationProtocol?.success" class="status-row">
            <span class="memory-chip-dot protocol"></span>
            <span>Agent 协作 {{ collaborationProtocol.version }}</span>
            <strong>开放 {{ collaborationProtocol.summary?.open || 0 }}</strong>
          </div>
        </div>
      </details>
    </div>
    <div v-if="currentGroup" class="header-actions">
      <button class="btn btn-outline btn-sm" @click="emit('load-tools')"><Settings2 :size="14" />工具</button>
      <button class="btn btn-outline btn-sm" @click="emit('load-files')"><FolderOpen :size="14" />共享文件</button>
      <button class="btn btn-outline btn-sm" @click="emit('show-members')"><Users :size="14" />成员</button>
      <button class="btn btn-outline btn-sm icon-only" title="刷新消息" aria-label="刷新消息" @click="emit('refresh')"><RefreshCw :size="14" /></button>
      <details class="action-menu group-action-menu">
        <summary title="更多群聊操作" aria-label="更多群聊操作"><MoreHorizontal :size="17" /></summary>
        <div class="action-menu-popover">
          <button type="button" @click="emit('load-logs')"><FileText :size="14" />查看日志</button>
          <button type="button" @click="emit('save-knowledge')"><BookOpen :size="14" />保存到知识库</button>
          <button type="button" @click="emit('rename', currentGroup.name)"><Pencil :size="14" />重命名群聊</button>
          <button type="button" class="danger" @click="emit('clear-messages')"><Trash2 :size="14" />清空聊天</button>
          <button type="button" class="danger" @click="emit('delete-group')"><X :size="14" />删除群聊</button>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.toolbar { min-height: 56px; display: flex; align-items: center; padding: 8px 12px; background: var(--surface); border-bottom: 1px solid var(--border-color); gap: 10px; }
.toolbar-left { display: flex; align-items: center; gap: 12px; flex: 1; overflow-x: auto; }
.toolbar-left::-webkit-scrollbar { display: none; }
.label { font-size: 12px; color: var(--text-muted); white-space: nowrap; font-weight: 500; }
.group-list { display: flex; gap: 6px; overflow-x: auto; }
.group-list::-webkit-scrollbar { display: none; }
.group-card { min-height: 34px; display: flex; align-items: center; gap: 7px; padding: 0 11px; background: var(--surface); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; white-space: nowrap; transition: background .15s ease, border-color .15s ease, color .15s ease; font-size: 12px; color: var(--text-secondary); }
.group-card:hover { border-color: var(--border-strong); background: var(--control-hover); }
.group-card.active { border-color: color-mix(in srgb, var(--accent-blue) 28%, transparent); background: var(--accent-soft); color: var(--accent-blue); }
.badge { font-size: 9.5px; padding: 2px 6px; background: rgba(0,0,0,0.04); border-radius: 4px; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; }
.content-header { min-height: 52px; padding: 8px 12px; border-bottom: 1px solid var(--border-color); background: var(--panel-muted); font-size: 13px; font-weight: 600; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.group-title-line { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
.group-name{min-width:0;display:inline-flex;align-items:center;gap:6px;color:var(--text-primary);font-weight:750}.session-switcher{display:flex;align-items:center;gap:5px}.session-switcher select{min-width:140px;max-width:230px;height:30px;padding:0 28px 0 9px;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-secondary);font-size:11px}.session-add{width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--accent-blue);cursor:pointer}.session-add:hover{border-color:var(--border-strong);background:var(--control-hover)}
.header-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.memory-chip-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--text-muted); }
.memory-chip-dot.active { background: var(--accent-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-green) 14%, transparent); }
.memory-chip-dot.protocol { background: var(--accent-blue); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-blue) 14%, transparent); }
.btn { min-height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;border-radius:6px;border:1px solid var(--border-color);cursor:pointer;font-size:12px;font-weight:650;transition:background .15s ease,border-color .15s ease,color .15s ease;white-space:nowrap }
.btn-sm { min-height:30px;padding:0 9px;font-size:11px }
.btn-primary { background:var(--accent-blue);border-color:var(--accent-blue);color:white }
.btn-outline { background:var(--surface);color:var(--text-secondary) }
.btn-outline:hover{background:var(--control-hover);border-color:var(--border-strong);color:var(--text-primary)}
.icon-only{width:30px;padding:0}
.btn-danger { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.18); color: #dc2626; }

.action-menu,.collaboration-status{position:relative}.action-menu summary,.collaboration-status summary{list-style:none;cursor:pointer}.action-menu summary::-webkit-details-marker,.collaboration-status summary::-webkit-details-marker{display:none}.action-menu>summary{width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-secondary)}.action-menu[open]>summary,.action-menu>summary:hover{background:var(--control-hover);border-color:var(--border-strong);color:var(--text-primary)}.action-menu-popover,.collaboration-status-popover{position:absolute;top:calc(100% + 6px);right:0;z-index:40;min-width:172px;padding:5px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);box-shadow:var(--shadow-md)}.action-menu-popover button{width:100%;min-height:32px;display:flex;align-items:center;gap:8px;padding:0 9px;border:0;border-radius:5px;background:transparent;color:var(--text-secondary);font:inherit;font-size:11px;text-align:left;cursor:pointer}.action-menu-popover button:hover{background:var(--control-hover);color:var(--text-primary)}.action-menu-popover button.danger{color:var(--accent-red)}.session-action-menu .action-menu-popover{left:0;right:auto}.collaboration-status>summary{min-height:28px;display:flex;align-items:center;gap:5px;padding:0 8px;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-muted);font-size:10px}.collaboration-status[open]>summary,.collaboration-status>summary:hover{border-color:var(--border-strong);color:var(--text-secondary)}.collaboration-status-popover{left:0;right:auto;min-width:230px}.status-row{min-height:32px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:0 8px;color:var(--text-secondary);font-size:10px}.status-row+ .status-row{border-top:1px solid var(--border-color)}.status-row strong{color:var(--text-muted);font-size:10px;font-weight:650}

:global([data-theme="dark"] .toolbar),:global([data-theme="dark"] .content-header){background:var(--surface);border-color:var(--border-color)}
:global([data-theme="dark"] .content-header){background:var(--panel-muted)}
:global([data-theme="dark"] .group-card),:global([data-theme="dark"] .session-switcher select),:global([data-theme="dark"] .session-add){background:var(--surface);border-color:var(--border-color);color:var(--text-secondary)}
:global([data-theme="dark"] .group-card.active){background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent-blue) 28%,transparent);color:var(--accent-blue)}
:global([data-theme="dark"] .badge){background:var(--control-hover)}

@media (max-width: 768px) {
  .toolbar{min-height:52px;padding:7px 8px}.toolbar .label{display:none}.toolbar-left{gap:6px}.group-list{gap:5px}.group-card{padding:0 9px}.content-header{min-height:auto;padding:7px 8px;align-items:flex-start;flex-direction:column}.group-title-line{width:100%;gap:6px}.session-switcher{flex:1;min-width:0}.session-switcher select{min-width:0;max-width:none;flex:1}.collaboration-status{margin-left:auto}.header-actions{width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.header-actions .btn{padding:0 6px}.header-actions .group-action-menu>summary{width:100%}.group-action-menu .action-menu-popover{right:0;left:auto}.toolbar>.btn-primary{width:34px;padding:0;font-size:0}.toolbar>.btn-primary svg{width:16px;height:16px}
}
</style>
