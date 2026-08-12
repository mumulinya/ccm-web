<script setup>
import { computed, ref, watch } from 'vue'
import { Link2, MessageSquare, Monitor, PanelLeftClose, PanelLeftOpen, Plus, Send, Trash2, X } from '@lucide/vue'
import ConversationSessionGroup from '../common/ConversationSessionGroup.vue'

const props = defineProps({
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
  'new-feishu-session',
  'bind-session',
  'toggle',
  'expand',
  'select-session',
  'delete-session',
  'clear-all'
])

const sourceOf = (session) => String(session?.source || (String(session?.id || '').startsWith('feishu:') ? 'feishu' : 'web')) === 'feishu' ? 'feishu' : 'web'
const webSessions = computed(() => props.sessions.filter(session => sourceOf(session) === 'web' && session?.draft !== true))
const feishuSessions = computed(() => props.sessions.filter(session => sourceOf(session) === 'feishu'))
const groupStorageKey = 'ccm:global-session-groups:v2'
const readGroupState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(groupStorageKey) || '{}')
    return { web: saved.web !== false, feishu: saved.feishu === true }
  } catch {
    return { web: true, feishu: false }
  }
}
const expandedGroups = ref(readGroupState())
const toggleGroup = (source) => {
  expandedGroups.value = { ...expandedGroups.value, [source]: !expandedGroups.value[source] }
}
watch(expandedGroups, value => {
  try { localStorage.setItem(groupStorageKey, JSON.stringify(value)) } catch {}
}, { deep: true })
const activeBindings = (session) => Array.isArray(session?.feishuBindings) ? session.feishuBindings : []
const bindingText = (session) => {
  const bindings = activeBindings(session)
  if (!bindings.length) return '未绑定飞书目标'
  const first = bindings[0]
  const label = String(first.label || first.chat_id || first.open_id || '飞书目标')
  return bindings.length > 1 ? `${label} 等 ${bindings.length} 个目标` : label
}
</script>

<template>
  <aside class="assistant-sidebar" :class="{ collapsed: !open }">
    <div class="sidebar-header">
      <strong>会话 <small>{{ sessions.length }}</small></strong>
      <button class="header-icon-btn" aria-label="折叠会话栏" @click="emit('toggle')" title="折叠会话栏">
        <PanelLeftClose :size="16" />
      </button>
    </div>
    <button class="new-chat-btn" @click="emit('new-session')">
      <Plus :size="16" />
      <span>新建会话</span>
    </button>

    <div class="session-list">
      <ConversationSessionGroup label="普通会话" :count="webSessions.length" :expanded="expandedGroups.web" empty-label="暂无普通会话" @toggle="toggleGroup('web')">
        <template #icon><MessageSquare :size="12" /></template>
          <button
            v-for="session in webSessions"
            :key="session.id"
            class="session-item"
            :class="{ active: currentSessionId === session.id }"
            @click="emit('select-session', session.id)"
          >
            <MessageSquare class="session-icon" :size="15" />
            <span class="session-copy">
              <span class="session-name" :title="session.name">{{ session.name }}</span>
              <span class="session-meta">仅网页</span>
            </span>
            <span class="session-actions">
              <span class="source-mark web" title="网页会话"><Monitor :size="12" /></span>
              <span class="delete-session-btn" title="删除网页会话" @click.stop="emit('delete-session', session.id)"><X :size="14" /></span>
            </span>
          </button>
      </ConversationSessionGroup>

      <ConversationSessionGroup label="飞书会话" tone="feishu" :count="feishuSessions.length" :expanded="expandedGroups.feishu" empty-label="暂无飞书会话" create-label="新建并绑定飞书会话" @toggle="toggleGroup('feishu')" @create="emit('new-feishu-session')">
        <template #icon><Send :size="12" /></template>
          <button
            v-for="session in feishuSessions"
            :key="session.id"
            class="session-item feishu-session"
            :class="{ active: currentSessionId === session.id, bound: activeBindings(session).length }"
            @click="emit('select-session', session.id)"
          >
            <Send class="session-icon" :size="15" />
            <span class="session-copy">
              <span class="session-name" :title="session.name">{{ session.name }}</span>
              <span class="session-meta" :class="{ bound: activeBindings(session).length }" :title="bindingText(session)">
                {{ bindingText(session) }}
              </span>
            </span>
            <span class="session-actions">
              <span class="bind-session-btn" :title="activeBindings(session).length ? '管理飞书绑定' : '绑定飞书目标'" @click.stop="emit('bind-session', session)">
                <Link2 :size="14" />
              </span>
              <span class="delete-session-btn" title="删除飞书会话" @click.stop="emit('delete-session', session.id)"><X :size="14" /></span>
            </span>
          </button>
      </ConversationSessionGroup>
    </div>

    <div class="sidebar-footer">
      <button class="clear-all-btn" @click="emit('clear-all')">
        <Trash2 :size="14" />
        <span>清空网页会话</span>
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
  width: 252px;
  min-width: 252px;
  border-right: 1px solid var(--border-color);
  background: var(--panel-muted);
  display: flex;
  flex-direction: column;
  z-index: 5;
  transition: width 0.2s ease, transform 0.2s ease, background 0.2s ease;
  position: relative;
}

:global([data-theme="dark"] .assistant-sidebar){
  background: var(--panel-muted);
  border-right-color: var(--border-color);
}

.assistant-sidebar.collapsed {
  width: 0;
  min-width: 0;
  transform: translateX(-252px);
  overflow: hidden;
  border-right: none;
}

.sidebar-header {
  min-height: 50px;
  padding: 7px 10px 7px 14px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}
.sidebar-header strong { display:inline-flex; align-items:center; gap:7px; color:var(--text-primary); font-size:12px; }
.sidebar-header strong small { min-width:18px; padding:1px 5px; border-radius:999px; background:var(--control-bg); color:var(--text-muted); font-size:9px; text-align:center; }

.new-chat-btn {
  min-height: 36px;
  flex: 0 0 36px;
  margin: 10px 10px 5px;
  background: color-mix(in srgb,var(--accent-blue) 7%,var(--surface));
  color: var(--accent-blue);
  border: 1px solid color-mix(in srgb,var(--accent-blue) 25%,var(--border-color));
  border-radius: 8px;
  padding: 0 12px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  border-color:var(--accent-blue);
  background:color-mix(in srgb,var(--accent-blue) 10%,var(--surface));
}

.header-icon-btn {
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

.header-icon-btn:hover {
  background: var(--control-hover);
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.feishu-create-btn {
  color: #00a870;
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

:global([data-theme="dark"] .expand-sidebar-btn){
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
  padding: 5px 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 0;
  scrollbar-width: thin;
}

.session-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.session-group-heading {
  width: 100%;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 7px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  border: 0;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.session-group-heading:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

.session-group-heading span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.session-group-heading strong {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
}

.group-chevron {
  flex: 0 0 auto;
  transition: transform 0.16s ease;
}

.group-chevron.expanded {
  transform: rotate(90deg);
}

.session-group-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.feishu-group {
  padding-top: 4px;
  border-top: 1px solid var(--border-color);
}

.session-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 48px;
  gap: 9px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  position: relative;
  border: 1px solid transparent;
  background: transparent;
  font: inherit;
  text-align: left;
}

.session-item.bound:not(.active) {
  border-color: color-mix(in srgb, #00a870 20%, transparent);
}

.session-item:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

:global([data-theme="dark"] .session-item:hover){
  background: var(--control-hover);
}

.session-item.active {
  background: var(--accent-soft);
  color: var(--accent-blue);
  font-weight: 600;
  border-color: color-mix(in srgb, var(--accent-blue) 24%, transparent);
}

:global([data-theme="dark"] .session-item.active){
  background: var(--accent-soft);
  color: var(--accent-blue);
  border-color: color-mix(in srgb, var(--accent-blue) 28%, transparent);
}

.session-icon {
  flex: 0 0 auto;
  opacity: 0.85;
}

.session-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.session-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  color: var(--text-muted);
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta.bound {
  color: #00a870;
}

.session-actions {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.source-mark,
.bind-session-btn,
.delete-session-btn {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 5px;
}

.source-mark {
  color: var(--text-muted);
}

.bind-session-btn {
  color: #00a870;
  cursor: pointer;
}

.bind-session-btn:hover {
  background: color-mix(in srgb, #00a870 12%, transparent);
}

.delete-session-btn {
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
}

.session-item:hover .delete-session-btn {
  opacity: 1;
}

.empty-feishu {
  min-height: 42px;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  color: var(--text-muted);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 11px;
  cursor: pointer;
}

.empty-feishu:hover {
  color: #00a870;
  border-color: color-mix(in srgb, #00a870 55%, var(--border-color));
  background: color-mix(in srgb, #00a870 7%, transparent);
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

@media (max-width: 768px) {
  .assistant-sidebar {
    position: absolute;
    inset: 0 auto 0 0;
    width: min(82vw, 280px);
    z-index: 60;
    box-shadow: var(--shadow-lg);
  }

  .assistant-sidebar.collapsed {
    width: 0;
    transform: translateX(-100%);
    box-shadow: none;
  }

  .expand-sidebar-btn {
    left: 8px;
    top: 60px;
  }
}
</style>
