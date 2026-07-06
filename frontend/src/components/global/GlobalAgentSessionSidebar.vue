<script setup>
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
        <span class="btn-icon">➕</span>
        <span>新建会话</span>
      </button>
      <button class="toggle-sidebar-btn" @click="emit('toggle')" title="折叠侧边栏">
        ◀
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
        <span class="session-icon">💬</span>
        <span class="session-name" :title="session.name">{{ session.name }}</span>
        <button
          class="delete-session-btn"
          title="删除会话"
          @click.stop="emit('delete-session', session.id)"
        >
          &times;
        </button>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="clear-all-btn" @click="emit('clear-all')">
        <span>🧹 清空所有会话</span>
      </button>
    </div>
  </aside>

  <button
    v-if="!open"
    class="expand-sidebar-btn"
    title="展开侧边栏"
    @click="emit('expand')"
  >
    ▶
  </button>
</template>

<style scoped>
.assistant-sidebar {
  width: 250px;
  border-right: 1px solid rgba(99, 102, 241, 0.08);
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  display: flex;
  flex-direction: column;
  z-index: 5;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s;
  position: relative;
}

:global([data-theme="dark"]) .assistant-sidebar {
  background: rgba(12, 12, 20, 0.65);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.assistant-sidebar.collapsed {
  width: 0;
  transform: translateX(-250px);
  overflow: hidden;
  border-right: none;
}

.sidebar-header {
  padding: 20px 16px;
  display: flex;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid rgba(99, 102, 241, 0.06);
}

.new-chat-btn {
  flex: 1;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  background: #4338ca;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
}

.toggle-sidebar-btn {
  background: transparent;
  border: 1px solid rgba(99, 102, 241, 0.12);
  color: var(--text-secondary);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s;
}

.toggle-sidebar-btn:hover {
  background: rgba(99, 102, 241, 0.05);
  color: var(--text-primary);
}

.expand-sidebar-btn {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99, 102, 241, 0.12);
  color: var(--text-secondary);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.06);
  transition: all 0.2s;
}

:global([data-theme="dark"]) .expand-sidebar-btn {
  background: rgba(15, 15, 25, 0.7);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.expand-sidebar-btn:hover {
  background: rgba(99, 102, 241, 0.08);
  color: var(--text-primary);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-width: thin;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  border: 1px solid transparent;
}

.session-item:hover {
  background: rgba(99, 102, 241, 0.04);
  color: var(--text-primary);
  transform: translateX(2px);
}

:global([data-theme="dark"]) .session-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.session-item.active {
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  font-weight: 600;
  border-color: rgba(99, 102, 241, 0.18);
  box-shadow: inset 0 0 8px rgba(99, 102, 241, 0.02);
}

:global([data-theme="dark"]) .session-item.active {
  background: rgba(99, 102, 241, 0.16);
  color: #818cf8;
  border-color: rgba(99, 102, 241, 0.3);
}

.session-icon {
  font-size: 15px;
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
  font-size: 16px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
  padding: 2px 6px;
  border-radius: 6px;
}

.session-item:hover .delete-session-btn {
  opacity: 1;
}

.delete-session-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.sidebar-footer {
  padding: 14px;
  border-top: 1px solid rgba(99, 102, 241, 0.06);
}

.clear-all-btn {
  width: 100%;
  background: transparent;
  border: 1px dashed rgba(99, 102, 241, 0.15);
  color: var(--text-muted);
  padding: 10px;
  border-radius: 10px;
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
