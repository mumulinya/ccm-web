<script setup>
import { ref } from 'vue'

const props = defineProps({
  stats: { type: Object, required: true },
  archivedCount: { type: Number, default: 0 },
  activeView: { type: String, default: 'overview' },
})

const emit = defineEmits(['change-view', 'create', 'open-backlog'])
const createMenuOpen = ref(false)

const views = [
  { id: 'overview', label: '任务概览' },
  { id: 'all', label: '全部任务' },
  { id: 'advanced', label: '运行管理' },
]

const chooseCreateType = (type) => {
  createMenuOpen.value = false
  emit('create', type)
}
</script>

<template>
  <header class="task-dispatch-header">
    <div class="task-summary-row">
      <div class="task-summary" aria-label="任务统计">
        <span><small>总计</small><strong>{{ props.stats.total }}</strong></span>
        <span><small>待处理</small><strong class="pending">{{ props.stats.pending }}</strong></span>
        <span><small>进行中</small><strong class="running">{{ props.stats.inProgress }}</strong></span>
        <span><small>已完成</small><strong class="done">{{ props.stats.done }}</strong></span>
        <span><small>失败</small><strong class="failed">{{ props.stats.failed }}</strong></span>
      </div>

      <div class="task-primary-actions">
        <button type="button" class="secondary-action" @click="emit('open-backlog')">需求池</button>
        <div class="create-menu-wrap">
          <button
            type="button"
            class="primary-action"
            :aria-expanded="createMenuOpen"
            aria-haspopup="menu"
            @click="createMenuOpen = !createMenuOpen"
          >
            <span aria-hidden="true">＋</span> 新建任务
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

    <nav class="task-view-tabs" aria-label="任务派发视图">
      <button
        v-for="view in views"
        :key="view.id"
        type="button"
        :class="{ active: props.activeView === view.id }"
        @click="emit('change-view', view.id)"
      >
        {{ view.label }}
        <span v-if="view.id === 'overview'">{{ props.stats.pending + props.stats.inProgress }}</span>
        <span v-else-if="view.id === 'all'">{{ props.stats.total }}</span>
      </button>
      <span class="archive-summary">已归档 {{ props.archivedCount }}</span>
    </nav>
  </header>
</template>

<style scoped>
.task-dispatch-header {
  position: relative;
  flex: 0 0 auto;
  padding: 14px 18px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.07);
  background: rgba(255, 255, 255, 0.5);
}
.task-summary-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-width: 0; }
.task-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 22px; min-width: 0; }
.task-summary > span { display: inline-flex; align-items: baseline; gap: 6px; white-space: nowrap; }
.task-summary small { color: var(--text-muted); font-size: 11px; }
.task-summary strong { color: var(--text-primary); font-size: 15px; }
.task-summary strong.pending { color: #a16207; }
.task-summary strong.running { color: var(--accent-blue); }
.task-summary strong.done { color: var(--accent-green); }
.task-summary strong.failed { color: var(--accent-red); }
.task-primary-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.task-primary-actions button { min-height: 36px; border-radius: 7px; padding: 0 13px; font-size: 12px; font-weight: 700; cursor: pointer; }
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
.task-view-tabs button { display: inline-flex; align-items: center; gap: 7px; min-height: 35px; padding: 0 11px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--text-muted); font-size: 12px; font-weight: 700; cursor: pointer; }
.task-view-tabs button.active { border-bottom-color: var(--accent-blue); color: var(--accent-blue); }
.task-view-tabs button span { min-width: 18px; padding: 1px 5px; border-radius: 9px; background: rgba(100, 116, 139, 0.1); font-size: 10px; text-align: center; }
.archive-summary { margin-left: auto; color: var(--text-muted); font-size: 11px; }

@media (max-width: 768px) {
  .task-dispatch-header { padding: 12px 12px 0; }
  .task-summary-row { align-items: stretch; flex-direction: column; gap: 11px; }
  .task-summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
  .task-summary > span { min-width: 0; flex-direction: column; align-items: center; gap: 1px; }
  .task-summary small { font-size: 9.5px; }
  .task-summary strong { font-size: 14px; }
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
