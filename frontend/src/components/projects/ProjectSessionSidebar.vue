<script setup>
import { MessageSquarePlus, Pencil, RefreshCw, Trash2, X } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'
defineProps({ project: { type: String, default: '' }, sessions: { type: Array, default: () => [] }, currentSession: { type: String, default: '' }, open: { type: Boolean, default: false } })
const emit = defineEmits(['select', 'create', 'refresh', 'rename', 'delete', 'close'])
</script>

<template>
  <div v-if="open" class="sidebar-backdrop" @click="emit('close')"></div>
  <aside :class="['session-sidebar', { open }]">
    <header>
      <strong>会话</strong>
      <div>
        <button :disabled="!project" title="新建会话" @click="emit('create')"><MessageSquarePlus :size="17" /></button>
        <button :disabled="!project" title="刷新会话" @click="emit('refresh')"><RefreshCw :size="17" /></button>
        <button class="mobile-close" title="关闭会话栏" @click="emit('close')"><X :size="18" /></button>
      </div>
    </header>
    <div class="session-list">
      <EmptyState v-if="!project" icon="📂" title="选择项目后查看会话" />
      <EmptyState v-else-if="sessions.length === 0" icon="💬" title="暂无会话" hint="新建一个开始工作" />
      <template v-else>
        <div
          v-for="session in sessions"
          :key="session.id"
          :class="['session-item', { active: currentSession === session.id }]"
          role="button"
          tabindex="0"
          @click="emit('select', session.id)"
          @keydown.enter="emit('select', session.id)"
        >
          <span class="session-copy"><strong>{{ session.name || '未命名会话' }}</strong><small>{{ session.message_count }} 条消息</small></span>
          <span class="session-actions">
            <button title="重命名会话" @click.stop="emit('rename', session.id)"><Pencil :size="14" /></button>
            <button title="删除会话" @click.stop="emit('delete', session.id)"><Trash2 :size="14" /></button>
          </span>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.session-sidebar { width:268px; min-width:268px; display:flex; flex-direction:column; border-right:1px solid rgba(15,23,42,.08); background:color-mix(in srgb,var(--surface,#fff) 78%,transparent); }
header { height:52px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; border-bottom:1px solid rgba(15,23,42,.07); }
header>div { display:flex; gap:5px; }
header button,.session-actions button { width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; padding:0; border:0; border-radius:6px; background:transparent; color:var(--text-secondary); cursor:pointer; }
header button:hover,.session-actions button:hover { background:rgba(37,99,235,.08); color:#2563eb; }
.mobile-close { display:none; }
.session-list { flex:1; overflow:auto; padding:8px; }
.session-item { width:100%; min-height:56px; display:flex; align-items:center; gap:8px; margin:2px 0; padding:9px 9px 9px 11px; border:0; border-radius:7px; background:transparent; color:var(--text-primary); text-align:left; cursor:pointer; }
.session-item:hover { background:rgba(15,23,42,.045); }
.session-item.active { background:rgba(37,99,235,.09); box-shadow:inset 2px 0 #2563eb; }
.session-copy { min-width:0; flex:1; display:flex; flex-direction:column; gap:4px; }
.session-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
.session-copy small { color:var(--text-muted); font-size:11px; }
.session-actions { display:none; flex-shrink:0; }
.session-item:hover .session-actions,.session-item.active .session-actions { display:flex; }
.sidebar-backdrop { display:none; }
@media (max-width:768px) {
  .sidebar-backdrop { display:block; position:fixed; inset:0; background:rgba(15,23,42,.35); z-index:49; }
  .session-sidebar { position:fixed; inset:0 auto 0 0; width:min(84vw,320px); min-width:0; transform:translateX(-102%); transition:transform .2s ease; z-index:50; box-shadow:12px 0 30px rgba(15,23,42,.15); }
  .session-sidebar.open { transform:translateX(0); }
  .mobile-close { display:inline-flex; }
  .session-actions { display:flex; }
}
</style>
