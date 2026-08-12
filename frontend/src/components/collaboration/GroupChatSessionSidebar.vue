<script setup>
import { computed, ref, watch } from 'vue'
import {
  Archive,
  Link2,
  ListTodo,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
} from '@lucide/vue'
import AutomationSessionBindingDialog from '../common/AutomationSessionBindingDialog.vue'
import ConversationSessionGroup from '../common/ConversationSessionGroup.vue'

const props = defineProps({
  groupId: { type: String, default: '' },
  groupName: { type: String, default: '' },
  sessions: { type: Array, default: () => [] },
  currentSessionId: { type: String, default: '' },
  open: { type: Boolean, default: true },
})

const emit = defineEmits([
  'create',
  'toggle',
  'expand',
  'select',
  'rename',
  'archive',
  'delete',
  'refresh',
])

const sessionKind = session => String(session?.session_kind || session?.sessionKind || 'conversation') === 'automation' ? 'automation' : 'conversation'
const conversationSessions = computed(() => props.sessions.filter(session => !session.archived && sessionKind(session) === 'conversation'))
const automationSessions = computed(() => props.sessions.filter(session => !session.archived && sessionKind(session) === 'automation'))
const archivedSessions = computed(() => props.sessions.filter(session => session.archived))

const groupStateKey = () => `ccm:group-session-sections:v3:${props.groupId || 'default'}`
const readExpandedGroups = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(groupStateKey()) || '{}')
    return { conversation: saved.conversation !== false, automation: saved.automation === true }
  } catch {
    return { conversation: true, automation: false }
  }
}
const expandedGroups = ref(readExpandedGroups())
const bindingDialogOpen = ref(false)
const bindingSession = ref(null)
const automationBindings = ref([])
const loadAutomationBindings = async () => {
  if (!props.groupId) { automationBindings.value = []; return }
  try {
    const query = new URLSearchParams({ scope: 'group', scope_id: props.groupId })
    const response = await fetch(`/api/automation-session-bindings?${query}`)
    const data = await response.json()
    automationBindings.value = response.ok && data.success !== false ? (data.bindings || []) : []
  } catch { automationBindings.value = [] }
}
watch(() => props.groupId, loadAutomationBindings, { immediate: true })
const automationSourceText = session => {
  const binding = automationBindings.value.find(item => String(item.exactSessionId || item.exact_session_id || '') === String(session?.id || '') && item.status !== 'archived')
  const labels = { requirement_pool: '需求池', workbench: '工作台', global_agent: '全局 Agent' }
  return binding?.sources?.length ? binding.sources.map(source => labels[source] || source).join('、') : '未绑定来源'
}
const handleBindingSaved = () => {
  loadAutomationBindings()
  emit('refresh')
}
const openBindingDialog = session => {
  bindingSession.value = session || null
  bindingDialogOpen.value = true
}
const toggleGroup = kind => { expandedGroups.value = { ...expandedGroups.value, [kind]: !expandedGroups.value[kind] } }
watch(() => props.groupId, () => { expandedGroups.value = readExpandedGroups() })
watch(expandedGroups, value => {
  try { localStorage.setItem(groupStateKey(), JSON.stringify(value)) } catch {}
}, { deep: true })

const sessionTitle = session => session?.title || session?.name || '新会话'
</script>

<template>
  <button
    v-if="open"
    type="button"
    class="session-sidebar-scrim"
    aria-label="收起会话列表"
    @click="emit('toggle')"
  ></button>

  <aside class="group-session-sidebar" :class="{ collapsed: !open }">
    <header class="session-sidebar-header">
      <div class="session-sidebar-title">
        <strong>会话</strong>
        <span>{{ sessions.length }}</span>
      </div>
      <button type="button" class="sidebar-icon-button" title="收起会话栏" aria-label="收起会话栏" @click="emit('toggle')">
        <PanelLeftClose :size="16" />
      </button>
    </header>

    <button type="button" class="new-session-button" @click="emit('create')">
      <Plus :size="16" />
      <span>新建会话</span>
    </button>

    <div class="group-session-list">
      <ConversationSessionGroup label="普通会话" :count="conversationSessions.length" :expanded="expandedGroups.conversation" empty-label="暂无普通会话" @toggle="toggleGroup('conversation')">
        <template #icon><MessageSquare :size="12" /></template>
          <div
            v-for="session in conversationSessions"
            :key="session.id"
            class="group-session-item"
            :class="{ active: currentSessionId === session.id }"
            @click="emit('select', session.id)"
          >
            <MessageSquare :size="15" class="session-item-icon" />
            <div class="session-item-copy">
              <strong :title="sessionTitle(session)">{{ sessionTitle(session) }}</strong>
              <small>{{ Number(session.messageCount || 0) }} 条消息</small>
            </div>
            <details class="session-item-menu" @click.stop>
              <summary title="会话操作" aria-label="会话操作"><MoreHorizontal :size="16" /></summary>
              <div class="session-item-menu-popover">
                <button type="button" @click="emit('rename', session.id)"><Pencil :size="14" />重命名</button>
                <button type="button" @click="emit('archive', session.id)"><Archive :size="14" />归档</button>
                <button type="button" class="danger" @click="emit('delete', session.id)"><Trash2 :size="14" />删除</button>
              </div>
            </details>
          </div>
      </ConversationSessionGroup>

      <ConversationSessionGroup label="自动化任务会话" :count="automationSessions.length" :expanded="expandedGroups.automation" empty-label="暂无自动化任务会话" create-label="新建自动化任务会话" @toggle="toggleGroup('automation')" @create="openBindingDialog(null)">
        <template #icon><ListTodo :size="12" /></template>
          <div
            v-for="session in automationSessions"
            :key="session.id"
            class="group-session-item automation"
            :class="{ active: currentSessionId === session.id }"
            @click="emit('select', session.id)"
          >
            <ListTodo :size="15" class="session-item-icon" />
            <div class="session-item-copy">
              <strong :title="sessionTitle(session)">{{ sessionTitle(session) }}</strong>
              <small>{{ Number(session.messageCount || 0) }} 条消息 · {{ automationSourceText(session) }}</small>
            </div>
            <details class="session-item-menu" @click.stop>
              <summary title="会话操作" aria-label="会话操作"><MoreHorizontal :size="16" /></summary>
              <div class="session-item-menu-popover">
                <button type="button" @click="openBindingDialog(session)"><Link2 :size="14" />来源绑定</button>
                <button type="button" @click="emit('rename', session.id)"><Pencil :size="14" />重命名</button>
                <button type="button" @click="emit('archive', session.id)"><Archive :size="14" />归档</button>
                <button type="button" class="danger" @click="emit('delete', session.id)"><Trash2 :size="14" />删除</button>
              </div>
            </details>
          </div>
      </ConversationSessionGroup>

      <section v-if="archivedSessions.length" class="archived-session-section">
        <div class="archived-session-label">已归档 {{ archivedSessions.length }}</div>
        <div
          v-for="session in archivedSessions"
          :key="session.id"
          class="group-session-item archived"
          :class="{ active: currentSessionId === session.id }"
          @click="emit('select', session.id)"
        >
          <Archive :size="14" class="session-item-icon" />
          <div class="session-item-copy">
            <strong :title="sessionTitle(session)">{{ sessionTitle(session) }}</strong>
            <small>{{ Number(session.messageCount || 0) }} 条消息</small>
          </div>
          <details class="session-item-menu" @click.stop>
            <summary title="会话操作" aria-label="会话操作"><MoreHorizontal :size="16" /></summary>
            <div class="session-item-menu-popover">
              <button type="button" @click="emit('rename', session.id)"><Pencil :size="14" />重命名</button>
              <button type="button" class="danger" @click="emit('delete', session.id)"><Trash2 :size="14" />删除</button>
            </div>
          </details>
        </div>
      </section>
    </div>
  </aside>

  <button
    v-if="!open"
    type="button"
    class="expand-session-sidebar"
    title="展开会话栏"
    aria-label="展开会话栏"
    @click="emit('expand')"
  >
    <PanelLeftOpen :size="17" />
  </button>
  <AutomationSessionBindingDialog
    :open="bindingDialogOpen"
    scope="group"
    :scope-id="groupId"
    :session="bindingSession"
    @close="bindingDialogOpen = false"
    @saved="handleBindingSaved"
  />
</template>

<style scoped>
.group-session-sidebar {
  position: relative;
  z-index: 12;
  display: flex;
  width: 252px;
  min-width: 252px;
  min-height: 0;
  flex-direction: column;
  overflow: visible;
  border-right: 1px solid var(--border-color);
  background: var(--panel-muted);
  transition: width .18s ease, min-width .18s ease, transform .18s ease;
}

.group-session-sidebar.collapsed {
  width: 0;
  min-width: 0;
  transform: translateX(-252px);
  overflow: hidden;
  border-right: 0;
}

.session-sidebar-header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px 7px 14px;
  border-bottom: 1px solid var(--border-color);
}

.session-sidebar-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  color: var(--text-primary);
}

.session-sidebar-title strong { font-size: 12px; }
.session-sidebar-title span { min-width:18px; padding:1px 5px; border-radius:999px; background:var(--control-bg); color:var(--text-muted); font-size:9px; font-weight:700; text-align:center; }

.session-sidebar-group {
  overflow: hidden;
  padding: 10px 14px 4px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-icon-button,
.expand-session-sidebar {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
}

.sidebar-icon-button:hover,
.expand-session-sidebar:hover { border-color: var(--border-strong); background: var(--control-hover); color: var(--text-primary); }

.new-session-button {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 10px 10px 5px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--accent-blue) 25%, var(--border-color));
  border-radius: 8px;
  background: color-mix(in srgb,var(--accent-blue) 7%,var(--surface));
  color: var(--accent-blue);
  font-size: 11.5px;
  font-weight: 750;
  cursor: pointer;
}

.new-session-button:hover { border-color: var(--accent-blue); background: color-mix(in srgb, var(--accent-soft) 76%, var(--surface)); }

.group-session-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  padding: 5px 8px 12px;
  scrollbar-width: thin;
}

.live-session-section { display:flex; flex-direction:column; }
.live-session-section.automation-section { margin-top:4px; }
.live-session-label { display:flex; width:100%; height:28px; align-items:center; justify-content:space-between; padding:0 7px; border:0; border-radius:5px; background:transparent; color:var(--text-muted); font:inherit; font-size:10px; font-weight:700; cursor:pointer; }
.live-session-label:hover { background:var(--control-hover); color:var(--text-primary); }
.live-session-label span { display:inline-flex; align-items:center; gap:5px; }
.live-session-label strong { font-size:9px; }
.live-session-label svg:first-child { transition:transform .16s ease; }
.live-session-label svg:first-child.expanded { transform:rotate(90deg); }
.live-session-content { display:flex; flex-direction:column; gap:2px; }
.empty-automation { width:100%; min-height:34px; display:flex; align-items:center; justify-content:center; gap:6px; margin:3px 0; border:1px dashed color-mix(in srgb,var(--accent-blue) 32%,var(--border-color)); border-radius:6px; background:transparent; color:var(--accent-blue); font-size:10px; cursor:pointer; }
.empty-automation:hover { background:color-mix(in srgb,var(--accent-blue) 6%,transparent); border-color:var(--accent-blue); }

.group-session-item {
  position: relative;
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 8px;
  padding: 6px 34px 6px 9px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: var(--text-secondary);
  cursor: pointer;
}

.group-session-item:hover { background: var(--control-hover); color: var(--text-primary); }
.group-session-item.active { border-color: color-mix(in srgb, var(--accent-blue) 24%, var(--border-color)); background: var(--accent-soft); color: var(--accent-blue); }
.group-session-item.archived { opacity: .76; }
.group-session-item.automation:not(.active) .session-item-icon { color:var(--accent-blue); }
.group-session-item.archived.active { opacity: 1; }
.session-item-icon { flex: 0 0 auto; }

.session-item-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.session-item-copy strong { overflow: hidden; color: inherit; font-size: 12px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.session-item-copy small { color: var(--text-muted); font-size: 9.5px; }

.session-item-menu { position: absolute; top: 50%; right: 5px; z-index: 4; transform: translateY(-50%); }
.session-item-menu summary { display: grid; width: 28px; height: 28px; place-items: center; list-style: none; border-radius: 6px; color: var(--text-muted); cursor: pointer; opacity: 0; }
.session-item-menu summary::-webkit-details-marker { display: none; }
.group-session-item:hover .session-item-menu summary,
.group-session-item.active .session-item-menu summary,
.session-item-menu[open] summary { opacity: 1; }
.session-item-menu summary:hover,
.session-item-menu[open] summary { background: var(--surface); color: var(--text-primary); }

.session-item-menu-popover {
  position: absolute;
  top: 30px;
  right: 0;
  z-index: 30;
  width: 136px;
  padding: 5px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.session-item-menu-popover button {
  display: flex;
  width: 100%;
  min-height: 31px;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.session-item-menu-popover button:hover { background: var(--control-hover); color: var(--text-primary); }
.session-item-menu-popover button.danger { color: var(--accent-red); }

.archived-session-section { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); }
.archived-session-label { padding: 0 8px 3px; color: var(--text-muted); font-size: 9.5px; font-weight: 700; }
.session-list-empty { padding: 20px 10px; color: var(--text-muted); font-size: 11px; text-align: center; }

.expand-session-sidebar { position: absolute; top: 10px; left: 10px; z-index: 10; box-shadow: var(--shadow-sm); }
.session-sidebar-scrim { display: none; }

@media (max-width: 768px) {
  .group-session-sidebar { position: absolute; inset: 0 auto 0 0; width: min(82vw, 280px); min-width: min(82vw, 280px); box-shadow: var(--shadow-lg); }
  .group-session-sidebar.collapsed { width: 0; min-width: 0; transform: translateX(-100%); box-shadow: none; }
  .session-sidebar-scrim { position: absolute; inset: 0; z-index: 11; display: block; padding: 0; border: 0; background: rgba(15, 23, 42, .22); }
  .expand-session-sidebar { top: 8px; left: 8px; }
}
</style>
