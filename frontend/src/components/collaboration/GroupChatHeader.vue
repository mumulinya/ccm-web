<script setup>
import {
  Activity,
  BookOpen,
  FileText,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  MonitorCheck,
  Trash2,
  Users,
  X,
  MessageSquare,
} from '@lucide/vue'
import ConversationFindBar from '../common/ConversationFindBar.vue'

const props = defineProps({
  groups: { type: Array, default: () => [] },
  currentGroup: { type: Object, default: null },
  collaborationProtocol: { type: Object, default: null },
  memoryActive: { type: Boolean, default: false },
  memoryLabel: { type: String, default: '' },
  memoryMeta: { type: String, default: '' },
  memoryTitle: { type: String, default: '' },
  messages: { type: Array, default: () => [] },
  scrollContainer: { type: Object, default: null },
  scopeKey: { type: String, default: '' },
  active: { type: Boolean, default: true },
  isMessageSearchable: { type: Function, default: null },
})

const emit = defineEmits([
  'select-group',
  'create-group',
  'load-tools',
  'load-test-targets',
  'load-files',
  'load-logs',
  'show-members',
  'refresh',
  'save-knowledge',
  'rename',
  'clear-messages',
  'delete-group'
])

function onSelectGroup(id) {
  if (!id || id === props.currentGroup?.id) return
  emit('select-group', id)
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <span class="label">群聊空间</span>
      <div class="group-select-wrap">
        <MessageSquare :size="15" />
        <select
          :value="currentGroup?.id || ''"
          aria-label="选择群聊"
          title="选择群聊"
          @change="onSelectGroup($event.target.value)"
        >
          <option v-if="!groups.length" value="">暂无群聊</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </div>
    </div>
    <button class="btn btn-primary create-group-button" @click="emit('create-group')"><Plus :size="15" />新建群聊</button>
  </div>

  <div class="content-header">
    <div class="group-title-line">
      <span class="group-name"><MessageSquare :size="15" />{{ currentGroup ? currentGroup.name : '选择或创建一个群聊' }}</span>
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
      <ConversationFindBar
        :messages="messages"
        :scroll-container="scrollContainer"
        target-id-prefix="gc-msg-"
        :scope-key="scopeKey"
        :active="active"
        :is-message-searchable="isMessageSearchable"
      />
      <button class="btn btn-outline btn-sm" @click="emit('load-tools')"><Settings2 :size="14" />工具</button>
      <button class="btn btn-outline btn-sm" @click="emit('load-test-targets')"><MonitorCheck :size="14" />测试目标</button>
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
.toolbar {
  min-height: 46px;
  display: flex;
  align-items: center;
  padding: 6px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-color);
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.label {
  font-size: 10.5px;
  color: var(--text-muted);
  white-space: nowrap;
  font-weight: 700;
  text-transform: uppercase;
}

.group-select-wrap {
  position: relative;
  display: flex;
  width: min(380px, 44vw);
  min-width: 200px;
  align-items: center;
  gap: 6px;
  padding-left: 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-muted);
  transition: all 0.15s ease;
}

.group-select-wrap:focus-within {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.group-select-wrap select {
  width: 100%;
  height: 30px;
  min-width: 0;
  padding: 0 24px 0 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  text-overflow: ellipsis;
}

.content-header {
  min-height: 44px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.group-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.group-name {
  min-width: 0;
  max-width: 300px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.memory-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
}

.memory-chip-dot.active {
  background: var(--accent-green, #10b981);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.18);
}

.memory-chip-dot.protocol {
  background: var(--accent-blue);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.btn {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-sm {
  min-height: 30px;
  padding: 0 9px;
  font-size: 11px;
}

.btn-primary {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: #fff;
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--accent-blue) 88%, #000);
}

.create-group-button {
  min-height: 30px;
}

.btn-outline {
  background: var(--surface);
  color: var(--text-secondary);
}

.btn-outline:hover {
  background: var(--control-hover);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.icon-only {
  width: 30px;
  padding: 0;
}

.btn-danger {
  background: var(--danger-soft);
  border: 1px solid color-mix(in srgb, var(--accent-red, #ef4444) 30%, var(--border-color));
  color: var(--accent-red);
}

.action-menu, .collaboration-status {
  position: relative;
}

.action-menu summary, .collaboration-status summary {
  list-style: none;
  cursor: pointer;
}

.action-menu summary::-webkit-details-marker,
.collaboration-status summary::-webkit-details-marker {
  display: none;
}

.action-menu > summary {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.action-menu[open] > summary, .action-menu > summary:hover {
  background: var(--control-hover);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.action-menu-popover, .collaboration-status-popover {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 40;
  min-width: 165px;
  padding: 4px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.action-menu-popover button {
  width: 100%;
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
  transition: all 0.12s ease;
}

.action-menu-popover button:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

.action-menu-popover button.danger { color: var(--accent-red, #ef4444); }
.action-menu-popover button.danger:hover { background: var(--danger-soft); }

.collaboration-status > summary {
  min-height: 26px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 7px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.collaboration-status[open] > summary, .collaboration-status > summary:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.collaboration-status-popover {
  left: 0;
  right: auto;
  min-width: 220px;
}

.status-row {
  min-height: 28px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  padding: 0 7px;
  color: var(--text-secondary);
  font-size: 10px;
}

.status-row + .status-row { border-top: 1px solid var(--border-color); }
.status-row strong { color: var(--text-muted); font-size: 10px; font-weight: 600; }

.action-menu:not([open]) > .action-menu-popover,
.collaboration-status:not([open]) > .collaboration-status-popover {
  display: none;
}

@media (max-width: 768px) {
  .toolbar { min-height: 48px; padding: 6px 10px; flex-wrap: wrap; }
  .toolbar .label { display: none; }
  .toolbar-left { gap: 5px; min-width: 0; }
  .group-select-wrap { width: 100%; min-width: 0; flex: 1; }
  .content-header { min-height: auto; padding: 6px 10px; align-items: flex-start; flex-direction: column; gap: 8px; }
  .group-title-line { width: 100%; gap: 5px; }
  .collaboration-status { margin-left: auto; }
  .collaboration-status-popover { left: auto; right: 0; max-width: calc(100vw - 16px); }
  .header-actions { width: 100%; display: flex; flex-wrap: wrap; gap: 6px; }
  .header-actions .btn { min-height: 32px; padding: 0 8px; }
  .header-actions .group-action-menu > summary { width: 32px; height: 32px; }
}
</style>
