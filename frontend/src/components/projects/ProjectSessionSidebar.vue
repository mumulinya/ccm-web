<script setup>
import { computed, ref, watch } from 'vue'
import { Link2, ListTodo, MessageSquare, Pencil, Plus, RefreshCw, Send, Trash2, X } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'
import AutomationSessionBindingDialog from '../common/AutomationSessionBindingDialog.vue'
import ConversationSessionGroup from '../common/ConversationSessionGroup.vue'
const props = defineProps({
  project: { type: String, default: '' },
  sessions: { type: Array, default: () => [] },
  feishuTargets: { type: Array, default: () => [] },
  currentSession: { type: String, default: '' },
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'create', 'create-feishu', 'bind-feishu', 'refresh', 'rename', 'delete', 'close'])
const sourceOf = (session) => String(session?.source || 'web') === 'feishu' ? 'feishu' : 'web'
const kindOf = (session) => String(session?.session_kind || session?.sessionKind || 'conversation') === 'automation' ? 'automation' : 'conversation'
const conversationSessions = computed(() => props.sessions.filter(session => sourceOf(session) === 'web' && kindOf(session) === 'conversation'))
const automationSessions = computed(() => props.sessions.filter(session => sourceOf(session) === 'web' && kindOf(session) === 'automation'))
const feishuSessions = computed(() => props.sessions.filter(session => sourceOf(session) === 'feishu'))
const groupStorageKey = 'ccm:project-session-groups:v2'
const readGroupState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(groupStorageKey) || '{}')
    const hasConversationPreference = Object.prototype.hasOwnProperty.call(saved, 'conversation') || Object.prototype.hasOwnProperty.call(saved, 'web')
    return {
      conversation: hasConversationPreference ? (saved.conversation === true || saved.web === true) : true,
      automation: saved.automation === true,
      feishu: saved.feishu === true,
    }
  } catch {
    return { conversation: true, automation: false, feishu: false }
  }
}
const expandedGroups = ref(readGroupState())
const bindingDialogOpen = ref(false)
const bindingSession = ref(null)
const automationBindings = ref([])
const loadAutomationBindings = async () => {
  if (!props.project) { automationBindings.value = []; return }
  try {
    const query = new URLSearchParams({ scope: 'project', scope_id: props.project })
    const response = await fetch(`/api/automation-session-bindings?${query}`)
    const data = await response.json()
    automationBindings.value = response.ok && data.success !== false ? (data.bindings || []) : []
  } catch { automationBindings.value = [] }
}
watch(() => props.project, loadAutomationBindings, { immediate: true })
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
const toggleGroup = (source) => {
  expandedGroups.value = { ...expandedGroups.value, [source]: !expandedGroups.value[source] }
}
watch(expandedGroups, value => {
  try { localStorage.setItem(groupStorageKey, JSON.stringify(value)) } catch {}
}, { deep: true })
const bindingsFor = (session) => {
  if (Array.isArray(session?.feishu_bindings)) return session.feishu_bindings
  return props.feishuTargets.filter(target => String(target.active_session_id || '') === String(session?.id || ''))
}
const bindingText = (session) => {
  const bindings = bindingsFor(session)
  if (!bindings.length) return '未绑定飞书目标'
  const first = bindings[0]
  const label = String(first.label || first.chat_id || first.open_id || '飞书目标')
  return bindings.length > 1 ? `${label} 等 ${bindings.length} 个目标` : label
}
</script>

<template>
  <div v-if="open" class="sidebar-backdrop" @click="emit('close')"></div>
  <aside :class="['session-sidebar', { open }]">
    <header>
      <strong>会话 <small>{{ sessions.length }}</small></strong>
      <div>
        <button :disabled="!project" title="刷新会话" @click="emit('refresh')"><RefreshCw :size="17" /></button>
        <button class="mobile-close" title="关闭会话栏" @click="emit('close')"><X :size="18" /></button>
      </div>
    </header>
    <button class="new-session-button" type="button" :disabled="!project" @click="emit('create')">
      <Plus :size="16" />
      <span>新建会话</span>
    </button>
    <div class="session-list">
      <EmptyState v-if="!project" icon="📂" title="选择项目后查看会话" />
      <template v-else>
        <ConversationSessionGroup label="普通会话" :count="conversationSessions.length" :expanded="expandedGroups.conversation" empty-label="暂无普通会话" @toggle="toggleGroup('conversation')">
          <template #icon><MessageSquare :size="12" /></template>
            <div
              v-for="session in conversationSessions"
              :key="session.id"
              :class="['session-item', { active: currentSession === session.id }]"
              role="button"
              tabindex="0"
              @click="emit('select', session.id)"
              @keydown.enter="emit('select', session.id)"
            >
              <MessageSquare class="session-source-icon" :size="14" />
              <span class="session-copy"><strong>{{ session.name || '未命名会话' }}</strong><small>{{ session.message_count }} 条消息</small></span>
              <span class="session-actions">
                <button title="重命名会话" @click.stop="emit('rename', session.id)"><Pencil :size="14" /></button>
                <button title="删除会话" @click.stop="emit('delete', session.id)"><Trash2 :size="14" /></button>
              </span>
            </div>
        </ConversationSessionGroup>
        <ConversationSessionGroup label="自动化任务会话" :count="automationSessions.length" :expanded="expandedGroups.automation" empty-label="暂无自动化任务会话" create-label="新建自动化任务会话" @toggle="toggleGroup('automation')" @create="openBindingDialog(null)">
          <template #icon><ListTodo :size="12" /></template>
            <div
              v-for="session in automationSessions"
              :key="session.id"
              :class="['session-item', 'automation-session', { active: currentSession === session.id }]"
              role="button"
              tabindex="0"
              @click="emit('select', session.id)"
              @keydown.enter="emit('select', session.id)"
            >
              <ListTodo class="session-source-icon" :size="14" />
              <span class="session-copy"><strong>{{ session.name || '自动开发任务' }}</strong><small>{{ session.message_count }} 条消息 · {{ automationSourceText(session) }}</small></span>
              <span class="session-actions">
                <button title="管理任务来源绑定" @click.stop="openBindingDialog(session)"><Link2 :size="14" /></button>
                <button title="重命名会话" @click.stop="emit('rename', session.id)"><Pencil :size="14" /></button>
                <button title="删除会话" @click.stop="emit('delete', session.id)"><Trash2 :size="14" /></button>
              </span>
            </div>
        </ConversationSessionGroup>
        <ConversationSessionGroup label="飞书会话" tone="feishu" :count="feishuSessions.length" :expanded="expandedGroups.feishu" empty-label="暂无飞书会话" create-label="新建并绑定飞书会话" @toggle="toggleGroup('feishu')" @create="emit('create-feishu')">
          <template #icon><Send :size="12" /></template>
            <div
              v-for="session in feishuSessions"
              :key="session.id"
              :class="['session-item', 'feishu-session', { active: currentSession === session.id, bound: bindingsFor(session).length }]"
              role="button"
              tabindex="0"
              @click="emit('select', session.id)"
              @keydown.enter="emit('select', session.id)"
            >
              <Send class="session-source-icon" :size="14" />
              <span class="session-copy">
                <strong>{{ session.name || '未命名飞书会话' }}</strong>
                <small :class="{ bound: bindingsFor(session).length }" :title="bindingText(session)">{{ bindingText(session) }}</small>
              </span>
              <span class="session-actions">
                <button :title="bindingsFor(session).length ? '管理飞书绑定' : '绑定飞书目标'" @click.stop="emit('bind-feishu', session)"><Link2 :size="14" /></button>
                <button title="重命名会话" @click.stop="emit('rename', session.id)"><Pencil :size="14" /></button>
                <button title="删除飞书会话" @click.stop="emit('delete', session.id)"><Trash2 :size="14" /></button>
              </span>
            </div>
        </ConversationSessionGroup>
      </template>
    </div>
  </aside>
  <AutomationSessionBindingDialog
    :open="bindingDialogOpen"
    scope="project"
    :scope-id="project"
    :session="bindingSession"
    @close="bindingDialogOpen = false"
    @saved="handleBindingSaved"
  />
</template>

<style scoped>
.session-sidebar { width:252px; min-width:252px; min-height:0; display:flex; flex-direction:column; border-right:1px solid var(--border-color); background:color-mix(in srgb,var(--surface) 99%,var(--bg-secondary) 1%); }
header { height:50px; flex:0 0 50px; display:flex; align-items:center; justify-content:space-between; padding:0 10px 0 14px; border-bottom:1px solid var(--border-color); }
header strong { display:inline-flex; align-items:center; gap:7px; color:var(--text-primary); font-size:12px; }
header strong small { min-width:18px; padding:1px 5px; border-radius:999px; background:var(--control-bg); color:var(--text-muted); font-size:9px; text-align:center; }
header>div { display:flex; gap:5px; }
header button,.session-actions button { width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; padding:0; border:1px solid transparent; border-radius:6px; background:transparent; color:var(--text-muted); cursor:pointer; }
header button:hover,.session-actions button:hover { background:var(--control-hover); color:var(--accent-blue); }
.new-session-button { min-height:36px; flex:0 0 36px; display:flex; align-items:center; justify-content:center; gap:7px; margin:10px 10px 5px; padding:0 10px; border:1px solid color-mix(in srgb,var(--accent-blue) 25%,var(--border-color)); border-radius:8px; background:color-mix(in srgb,var(--accent-blue) 7%,var(--surface)); color:var(--accent-blue); font:inherit; font-size:11.5px; font-weight:750; cursor:pointer; }
.new-session-button:hover:not(:disabled) { border-color:var(--accent-blue); background:color-mix(in srgb,var(--accent-soft) 76%,var(--surface)); }
.new-session-button:disabled { cursor:not-allowed; opacity:.48; }
.mobile-close { display:none; }
.session-list { min-height:0; flex:1; overflow:auto; padding:5px 8px 12px; }
.session-section { display:flex; flex-direction:column; }
.session-section.automation-section,.session-section.feishu-section { margin-top:4px; }
.session-section-heading { display:flex; align-items:center; gap:2px; border-radius:6px; }
.session-section-heading .session-section-title { flex:1; }
.session-section-title { width:100%; height:32px; display:flex; align-items:center; justify-content:space-between; padding:0 7px; border:0; border-radius:6px; background:transparent; color:var(--text-muted); font:inherit; font-size:10px; font-weight:700; text-align:left; cursor:pointer; transition:background .15s ease,color .15s ease; }
.session-section-title:hover { background:var(--control-hover); color:var(--text-primary); }
.session-section-title span { display:inline-flex; align-items:center; gap:5px; }
.session-section-title strong { font-size:9px; }
.section-create { width:26px; height:26px; flex:0 0 26px; display:grid; place-items:center; padding:0; border:0; border-radius:6px; background:transparent; color:var(--text-muted); cursor:pointer; opacity:0; transition:opacity .15s ease,background .15s ease,color .15s ease; }
.session-section-heading:hover .section-create,.section-create:focus-visible { opacity:1; }
.section-create:hover { background:var(--control-hover); color:var(--accent-blue); }
.section-create.feishu:hover { color:#00a870; }
.section-chevron { flex:0 0 auto; transition:transform .16s ease; }
.section-chevron.expanded { transform:rotate(90deg); }
.session-section-content { display:flex; flex-direction:column; }
.session-item { position:relative; width:100%; min-height:50px; display:flex; align-items:center; gap:8px; margin:2px 0; padding:7px 8px 7px 11px; border:1px solid transparent; border-radius:8px; background:transparent; color:var(--text-primary); text-align:left; cursor:pointer; }
.session-item:hover { border-color:var(--border-color); background:var(--control-hover); }
.session-item.active { border-color:color-mix(in srgb,var(--accent-blue) 22%,var(--border-color)); background:color-mix(in srgb,var(--accent-blue) 6%,var(--surface)); }
.session-item.active::before { content:''; position:absolute; top:9px; bottom:9px; left:0; width:2px; border-radius:2px; background:var(--accent-blue); }
.session-copy { min-width:0; flex:1; display:flex; flex-direction:column; gap:4px; }
.session-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; }
.session-copy small { color:var(--text-muted); font-size:9.5px; }
.session-copy small.bound { color:#00a870; }
.session-source-icon { flex:0 0 auto; color:var(--text-muted); }
.feishu-session.bound:not(.active) { border-color:color-mix(in srgb,#00a870 18%,transparent); }
.automation-session:not(.active) .session-source-icon { color:var(--accent-blue); }
.session-actions { display:none; flex-shrink:0; }
.session-item:hover .session-actions,.session-item:focus-within .session-actions { display:flex; }
.sidebar-backdrop { display:none; }
.session-section-empty { margin:2px 8px 5px 27px; color:var(--text-muted); font-size:9.5px; line-height:24px; }
@media (hover:none) { .section-create { opacity:1; } }
@media (max-width:768px) {
  .sidebar-backdrop { display:block; position:fixed; inset:0; background:rgba(15,23,42,.35); z-index:49; }
  .session-sidebar { position:fixed; inset:0 auto 0 0; width:min(84vw,320px); min-width:0; transform:translateX(-102%); transition:transform .2s ease; z-index:50; box-shadow:12px 0 30px rgba(15,23,42,.15); }
  .session-sidebar.open { transform:translateX(0); }
  .mobile-close { display:inline-flex; }
  .session-actions { display:flex; }
}
</style>
