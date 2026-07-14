<script setup>
import { MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Trash2, X } from '@lucide/vue'

defineProps({
  sessions: {
    type: Array,
    default: () => []
  },
  currentSessionId: {
    type: String,
    default: ''
  },
  open: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'new-session',
  'toggle',
  'expand',
  'select-session',
  'delete-session',
  'clear-all'
])
</script>

<template>
  <aside class="assistant-sidebar" :class="{ collapsed: !open }">
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="emit('new-session')">
        <Plus :size="16" />
        <span>新建会话</span>
      </button>
      <button class="toggle-sidebar-btn" aria-label="折叠会话栏" @click="emit('toggle')" title="折叠会话栏">
        <PanelLeftClose :size="16" />
      </button>
    </div>

    <div class="session-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: currentSessionId === session.id }"
        @click="emit('select-session', session.id)"
      >
        <MessageSquare class="session-icon" :size="15" />
        <span class="session-name" :title="session.name">{{ session.name }}</span>
        <button
          class="delete-session-btn"
          title="删除会话"
          @click.stop="emit('delete-session', session.id)"
        >
          <X :size="14" />
        </button>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="clear-all-btn" @click="emit('clear-all')">
        <Trash2 :size="14" />
        <span>清空所有会话</span>
      </button>
    </div>
  </aside>

  <button
    v-if="!open"
    class="expand-sidebar-btn"
    title="展开侧边栏"
    @click="emit('expand')"
  >
    <PanelLeftOpen :size="16" />
  </button>
</template>

<style scoped>
.assistant-sidebar {
  width: 224px;
  border-right: 1px solid var(--border-color);
  background: var(--panel-muted);
  display: flex;
  flex-direction: column;
  z-index: 5;
  transition: width 0.2s ease, transform 0.2s ease, background 0.2s ease;
  position: relative;
}

:global([data-theme="dark"]) .assistant-sidebar {
  background: var(--panel-muted);
  border-right-color: var(--border-color);
}

.assistant-sidebar.collapsed {
  width: 0;
  transform: translateX(-224px);
  overflow: hidden;
  border-right: none;
}

.sidebar-header {
  min-height: 52px;
  padding: 8px 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.new-chat-btn {
  flex: 1;
  min-height: 34px;
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  background: color-mix(in srgb, var(--accent-blue) 86%, #000);
}

.toggle-sidebar-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.toggle-sidebar-btn:hover {
  background: var(--control-hover);
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.expand-sidebar-btn {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 10;
  background: var(--surface);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  transition: background 0.15s ease, border-color 0.15s ease;
}

:global([data-theme="dark"]) .expand-sidebar-btn {
  background: var(--surface);
  border-color: var(--border-color);
}

.expand-sidebar-btn:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-width: thin;
}

.session-item {
  display: flex;
  align-items: center;
  min-height: 38px;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  position: relative;
  border: 1px solid transparent;
}

.session-item:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

:global([data-theme="dark"]) .session-item:hover {
  background: var(--control-hover);
}

.session-item.active {
  background: var(--accent-soft);
  color: var(--accent-blue);
  font-weight: 600;
  border-color: color-mix(in srgb, var(--accent-blue) 24%, transparent);
}

:global([data-theme="dark"]) .session-item.active {
  background: var(--accent-soft);
  color: var(--accent-blue);
  border-color: color-mix(in srgb, var(--accent-blue) 28%, transparent);
}

.session-icon {
  flex: 0 0 auto;
  opacity: 0.85;
}

.session-name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 18px;
}

.delete-session-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 5px;
}

.session-item:hover .delete-session-btn {
  opacity: 1;
}

.delete-session-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.sidebar-footer {
  padding: 10px;
  border-top: 1px solid var(--border-color);
}

.clear-all-btn {
  width: 100%;
  background: transparent;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 0 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-all-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.04);
}
</style>
