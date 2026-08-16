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
        <button type="button" class="secondary-action" @click="emit('open-backlog')">
          <Inbox :size="15" />需求池
        </button>
        <div class="create-menu-wrap">
          <button
            type="button"
            class="primary-action"
            :aria-expanded="createMenuOpen"
            aria-haspopup="menu"
            @click="createMenuOpen = !createMenuOpen"
          >
            <Plus :size="15" />新建任务
          </button>
          <div v-if="createMenuOpen" class="create-menu" role="menu">
            <button type="button" role="menuitem" @click="chooseCreateType('business')">
              <strong>自动开发任务</strong>
              <small>提交描述或资料，由模型拆分、顺序执行并验收</small>
            </button>
            <button type="button" role="menuitem" @click="chooseCreateType('standard')">
              <strong>普通任务</strong>
              <small>快速分配给指定群聊或项目</small>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 5 格 KPI 微卡片 -->
    <div class="task-summary" aria-label="任务统计">
      <div v-for="item in summaryItems" :key="item.key" :class="['summary-item', item.tone]">
        <span class="summary-icon"><component :is="item.icon" :size="16" /></span>
        <span class="summary-copy">
          <small>{{ item.label }}</small>
          <strong class="font-mono">{{ props.stats[item.key] || 0 }}</strong>
        </span>
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
        <span v-if="view.id === 'overview'" class="font-mono">{{ props.stats.pending + props.stats.inProgress }}</span>
        <span v-else-if="view.id === 'all'" class="font-mono">{{ props.stats.total }}</span>
      </button>
      <span class="archive-summary font-mono"><Archive :size="13" />已归档 {{ props.archivedCount }}</span>
    </nav>
  </header>
</template>

<style scoped>
.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.task-dispatch-header {
  position: relative;
  flex: 0 0 auto;
  padding: 18px 24px 0;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
}

.dispatch-intro-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  min-width: 0;
}

.dispatch-intro { min-width: 0; }
.dispatch-eyebrow {
  display: block;
  margin-bottom: 2px;
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.dispatch-intro h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0;
}

.dispatch-intro p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}

/* 5 格 KPI 卡片 */
.task-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.summary-icon {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: var(--panel-muted);
  color: var(--text-muted);
}

.summary-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.summary-copy small {
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-copy strong {
  margin-top: 1px;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
}

.summary-item.pending .summary-icon { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.summary-item.pending strong { color: #d97706; }
.summary-item.running .summary-icon { background: var(--accent-soft); color: var(--accent-blue); }
.summary-item.running strong { color: var(--accent-blue); }
.summary-item.done .summary-icon { background: rgba(16, 185, 129, 0.1); color: var(--accent-green, #10b981); }
.summary-item.done strong { color: var(--accent-green, #10b981); }
.summary-item.failed .summary-icon { background: rgba(239, 68, 68, 0.1); color: var(--accent-red, #ef4444); }
.summary-item.failed strong { color: var(--accent-red, #ef4444); }

.task-primary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.task-primary-actions button {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.secondary-action {
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
}

.secondary-action:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.primary-action {
  border: 1px solid var(--accent-blue);
  background: var(--accent-blue);
  color: #fff;
}

.primary-action:hover {
  background: color-mix(in srgb, var(--accent-blue) 88%, #000);
}

.create-menu-wrap { position: relative; }
.create-menu {
  position: absolute;
  z-index: 80;
  top: calc(100% + 6px);
  right: 0;
  width: 270px;
  padding: 5px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, #fff);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
}

.create-menu button {
  display: flex;
  width: 100%;
  height: auto;
  min-height: 52px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.create-menu button:hover {
  background: var(--accent-soft);
}

.create-menu strong {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.create-menu small {
  color: var(--text-muted);
  font-size: 10.5px;
  line-height: 1.4;
}

.task-view-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  margin-top: 10px;
}

.task-view-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease;
}

.task-view-tabs button:hover {
  color: var(--text-primary);
}

.task-view-tabs button.active {
  border-bottom-color: var(--accent-blue);
  color: var(--accent-blue);
  font-weight: 700;
}

.task-view-tabs button span {
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--panel-muted);
  font-size: 10px;
  text-align: center;
  font-weight: 600;
}

.archive-summary {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-muted);
  font-size: 11px;
}

@media (max-width: 768px) {
  .task-dispatch-header { padding: 14px 12px 0; }
  .dispatch-intro-row { align-items: stretch; flex-direction: column; gap: 12px; }
  .task-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .task-summary .summary-item:last-child { grid-column: 1 / -1; }
  .task-primary-actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); }
  .task-primary-actions > button, .create-menu-wrap, .primary-action { width: 100%; }
  .create-menu { left: auto; right: 0; width: min(270px, calc(100vw - 24px)); }
  .task-view-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .task-view-tabs button { justify-content: center; min-width: 0; padding: 0 4px; }
  .archive-summary { display: none; }
}
</style>
