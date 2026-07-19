<script setup>
import { ref } from 'vue'
import {
  Archive, CheckCircle2, CircleAlert, Clock3, Inbox, LayoutDashboard,
  ListTodo, Plus, Radio, Settings2,
} from '@lucide/vue'

const props = defineProps({
  stats: { type: Object, required: true },
  archivedCount: { type: Number, default: 0 },
  activeView: { type: String, default: 'overview' },
})

const emit = defineEmits(['change-view', 'create', 'open-backlog'])
const createMenuOpen = ref(false)

const views = [
  { id: 'overview', label: '任务概览', icon: LayoutDashboard },
  { id: 'all', label: '全部任务', icon: ListTodo },
  { id: 'advanced', label: '运行管理', icon: Settings2 },
]

const summaryItems = [
  { key: 'total', label: '全部任务', icon: ListTodo, tone: 'neutral' },
  { key: 'pending', label: '等待处理', icon: Clock3, tone: 'pending' },
  { key: 'inProgress', label: '正在执行', icon: Radio, tone: 'running' },
  { key: 'done', label: '已经交付', icon: CheckCircle2, tone: 'done' },
  { key: 'failed', label: '执行失败', icon: CircleAlert, tone: 'failed' },
]

const chooseCreateType = (type) => {
  createMenuOpen.value = false
  emit('create', type)
}
</script>

<template>
  <header class="task-dispatch-header">
    <div class="dispatch-intro-row">
      <div class="dispatch-intro">
        <span class="dispatch-eyebrow">任务控制台</span>
        <h1>派发、跟进与验收</h1>
        <p>集中查看执行状态，处理阻塞，并核对最终交付。</p>
      </div>

      <div class="task-primary-actions">
        <button type="button" class="secondary-action" @click="emit('open-backlog')"><Inbox :size="16" />需求池</button>
        <div class="create-menu-wrap">
          <button
            type="button"
            class="primary-action"
            :aria-expanded="createMenuOpen"
            aria-haspopup="menu"
            @click="createMenuOpen = !createMenuOpen"
          >
            <Plus :size="16" />新建任务
          </button>
          <div v-if="createMenuOpen" class="create-menu" role="menu">
            <button type="button" role="menuitem" @click="chooseCreateType('business')">
              <strong>业务开发任务</strong>
              <small>由群聊主 Agent 拆分、派发并组织验收</small>
            </button>
            <button type="button" role="menuitem" @click="chooseCreateType('standard')">
              <strong>普通任务</strong>
              <small>快速分配给指定群聊或项目</small>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="task-summary" aria-label="任务统计">
      <div v-for="item in summaryItems" :key="item.key" :class="['summary-item', item.tone]">
        <span class="summary-icon"><component :is="item.icon" :size="16" /></span>
        <span><small>{{ item.label }}</small><strong>{{ props.stats[item.key] || 0 }}</strong></span>
      </div>
    </div>

    <nav class="task-view-tabs" aria-label="任务派发视图">
      <button
        v-for="view in views"
        :key="view.id"
        type="button"
        :class="{ active: props.activeView === view.id }"
        @click="emit('change-view', view.id)"
      >
        <component :is="view.icon" :size="15" />{{ view.label }}
        <span v-if="view.id === 'overview'">{{ props.stats.pending + props.stats.inProgress }}</span>
        <span v-else-if="view.id === 'all'">{{ props.stats.total }}</span>
      </button>
      <span class="archive-summary"><Archive :size="13" />已归档 {{ props.archivedCount }}</span>
    </nav>
  </header>
</template>

<style scoped>
.task-dispatch-header {
  position: relative;
  flex: 0 0 auto;
  padding: 22px 28px 0;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface);
}
.dispatch-intro-row { display:flex;align-items:flex-start;justify-content:space-between;gap:24px;min-width:0 }
.dispatch-intro{min-width:0}.dispatch-eyebrow{display:block;margin-bottom:4px;color:var(--accent-blue);font-size:11px;font-weight:800}.dispatch-intro h1{margin:0;color:var(--text-primary);font-size:24px;line-height:1.2;letter-spacing:0}.dispatch-intro p{margin:7px 0 0;color:var(--text-muted);font-size:12px}
.task-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));margin-top:18px;border:1px solid var(--border-color);border-radius:8px;overflow:hidden;background:var(--surface)}
.summary-item{display:flex;align-items:center;gap:10px;min-width:0;padding:12px 14px;border-right:1px solid var(--border-color)}.summary-item:last-child{border-right:0}.summary-icon{flex:0 0 auto;width:30px;height:30px;display:grid;place-items:center;border-radius:7px;background:var(--panel-muted);color:var(--text-muted)}.summary-item>span:last-child{min-width:0;display:grid;gap:2px}.summary-item small{overflow:hidden;color:var(--text-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.summary-item strong{color:var(--text-primary);font-size:20px;line-height:1}.summary-item.pending .summary-icon,.summary-item.pending strong{color:#b54708}.summary-item.running .summary-icon,.summary-item.running strong{color:var(--accent-blue)}.summary-item.done .summary-icon,.summary-item.done strong{color:#067647}.summary-item.failed .summary-icon,.summary-item.failed strong{color:#b42318}
.task-primary-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.task-primary-actions button { min-height: 38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:7px;padding:0 13px;font-size:12px;font-weight:700;cursor:pointer }
.secondary-action { border: 1px solid var(--border-color); background: var(--surface); color: var(--text-secondary); }
.primary-action { border: 1px solid var(--accent-blue); background: var(--accent-blue); color: #fff; }
.create-menu-wrap { position: relative; }
.create-menu {
  position: absolute;
  z-index: 80;
  top: calc(100% + 7px);
  right: 0;
  width: 280px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, #fff);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.16);
}
.create-menu button { display: flex; width: 100%; height: auto; min-height: 58px; flex-direction: column; align-items: flex-start; justify-content: center; gap: 3px; border: 0; background: transparent; color: var(--text-primary); text-align: left; }
.create-menu button:hover { background: rgba(59, 130, 246, 0.07); }
.create-menu small { color: var(--text-muted); font-size: 11px; font-weight: 400; line-height: 1.4; }
.task-view-tabs { display: flex; align-items: center; gap: 4px; min-width: 0; margin-top: 12px; }
.task-view-tabs button { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 11px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--text-muted); font-size: 12px; font-weight: 700; cursor: pointer; }
.task-view-tabs button.active { border-bottom-color: var(--accent-blue); color: var(--accent-blue); }
.task-view-tabs button span { min-width: 18px; padding: 1px 5px; border-radius: 9px; background: rgba(100, 116, 139, 0.1); font-size: 10px; text-align: center; }
.archive-summary { margin-left: auto;display:inline-flex;align-items:center;gap:5px;color:var(--text-muted);font-size:11px }

@media (max-width: 768px) {
  .task-dispatch-header { padding: 16px 12px 0; }
  .dispatch-intro-row{align-items:stretch;flex-direction:column;gap:14px}.dispatch-intro h1{font-size:21px}.task-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.summary-item{border-right:1px solid var(--border-color);border-bottom:1px solid var(--border-color)}.summary-item:nth-child(2n){border-right:0}.summary-item:last-child{grid-column:1/-1;border-right:0;border-bottom:0}.summary-item strong{font-size:18px}
  .task-primary-actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); }
  .task-primary-actions > button, .create-menu-wrap, .primary-action { width: 100%; }
  .create-menu { left: auto; right: 0; width: min(280px, calc(100vw - 24px)); }
  .task-view-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .task-view-tabs button { justify-content: center; min-width: 0; padding: 0 4px; }
  .archive-summary { display: none; }
}

[data-theme="dark"] .task-dispatch-header,
[data-theme="dark"] .create-menu { background: var(--surface); border-color: var(--border-color); }
</style>
