<script setup>
defineProps({
  backlogs: { type: Array, default: () => [] },
  counts: { type: Object, default: () => ({}) },
  importLoading: { type: Boolean, default: false },
  bulkDispatchLoading: { type: Boolean, default: false },
  importResult: { type: Object, default: null },
  bulkDispatchResult: { type: Object, default: null },
  statusLabel: { type: Object, default: () => ({}) },
  priorityLabel: { type: Object, default: () => ({}) },
  backlogState: { type: Function, required: true },
  backlogCount: { type: Function, required: true },
  backlogQualityText: { type: Function, required: true },
  backlogLatestHistory: { type: Function, required: true },
  backlogCanDispatch: { type: Function, required: true },
  backlogCanRestoreReady: { type: Function, required: true },
  dailyDevGroupCanExecute: { type: Function, required: true },
  dailyDevGroupReadinessMessage: { type: Function, required: true },
  formatBacklogTime: { type: Function, required: true },
})

const emit = defineEmits(['close', 'import-shared-docs', 'dispatch-ready', 'dispatch', 'restore-ready', 'mark-blocked'])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal backlog-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>业务需求池</h3>
      <div class="backlog-stats">
        <span>待补充 {{ backlogCount('needs_user') }}</span>
        <span>可接活 {{ backlogCount('ready') }}</span>
        <span>已派发 {{ backlogCount('planned', 'dispatched', 'queued') }}</span>
        <span>执行中 {{ backlogCount('running', 'in_progress') }}</span>
        <span>验收中 {{ backlogCount('reviewing') }}</span>
        <span>阻塞/失败 {{ backlogCount('blocked', 'failed') }}</span>
        <span>完成 {{ backlogCount('done') }}</span>
      </div>

      <div class="backlog-toolbar-grid">
        <div class="backlog-toolbar">
          <div>
            <strong>导入共享文档</strong>
            <span>把群聊里的 PRD、接口说明或业务文档转成需求卡，信息不足会进入待补充</span>
          </div>
          <button class="btn btn-outline btn-sm" :disabled="importLoading" @click="emit('import-shared-docs')">
            {{ importLoading ? '导入中...' : '导入共享文档' }}
          </button>
        </div>
        <div class="backlog-toolbar">
          <div>
            <strong>自动派发</strong>
            <span>只派发可接活需求，后续由主 Agent 拆分计划并交给子 Agent</span>
          </div>
          <button class="btn btn-primary btn-sm" :disabled="bulkDispatchLoading || !(counts.ready > 0)" @click="emit('dispatch-ready')">
            {{ bulkDispatchLoading ? '派发中...' : '派发可接活' }}
          </button>
        </div>
      </div>

      <div v-if="importResult || bulkDispatchResult" class="backlog-bulk-result">
        <template v-if="importResult">
          <span>导入 {{ importResult.imported || 0 }}</span>
          <span>跳过 {{ importResult.skipped || 0 }}</span>
        </template>
        <template v-if="bulkDispatchResult">
          <span>候选 {{ bulkDispatchResult.total_candidates || 0 }}</span>
          <span>派发 {{ bulkDispatchResult.dispatched || 0 }}</span>
          <span>入队 {{ bulkDispatchResult.queued || 0 }}</span>
          <span>失败 {{ bulkDispatchResult.failed || 0 }}</span>
        </template>
      </div>

      <div v-if="backlogs.length === 0" class="empty-mini">暂无业务开发需求池文件</div>
      <div v-else class="backlog-list">
        <div v-for="item in backlogs" :key="item.group_id + ':' + item.name" :class="['backlog-item', backlogState(item)]">
          <div class="backlog-main">
            <div class="backlog-title-row">
              <span :class="['backlog-status', backlogState(item)]">{{ item.state_label || statusLabel[backlogState(item)] || backlogState(item) }}</span>
              <strong>{{ item.title }}</strong>
              <span :class="'priority-tag priority-' + item.priority">{{ priorityLabel[item.priority] || item.priority }}</span>
            </div>
            <div class="backlog-goal">{{ item.business_goal }}</div>
            <div class="backlog-state-grid">
              <div><span>下一步</span><strong>{{ item.next_action || '等待系统推进' }}</strong></div>
              <div><span>负责人</span><strong>{{ item.owner || '主 Agent' }}</strong></div>
              <div><span>所属群聊</span><strong>{{ item.group_name }}</strong></div>
              <div><span>更新时间</span><strong>{{ formatBacklogTime(item.updated_at || item.created_at) }}</strong></div>
            </div>
            <div v-if="backlogQualityText(item)" :class="['backlog-readiness', item.quality?.pass ? 'ok' : 'warn']">
              {{ backlogQualityText(item) }}
            </div>
            <div :class="['backlog-readiness', dailyDevGroupCanExecute(item.group_id) ? 'ok' : 'warn']">
              {{ dailyDevGroupReadinessMessage(item.group_id) }}
            </div>
            <div v-if="item.question_to_user" class="backlog-result ask">需要用户补充：{{ item.question_to_user }}</div>
            <div v-if="item.blocker" class="backlog-result danger">阻塞原因：{{ item.blocker }}</div>
            <div v-else-if="item.last_result" class="backlog-result">{{ item.last_result }}</div>
            <div v-if="item.evidence?.length" class="backlog-evidence">
              <span v-for="entry in item.evidence" :key="entry">{{ entry }}</span>
            </div>
            <div v-if="backlogLatestHistory(item).length" class="backlog-history">
              <span v-for="history in backlogLatestHistory(item)" :key="history.at + history.state">
                {{ statusLabel[history.state] || history.state }} · {{ history.reason || '状态流转' }}
              </span>
            </div>
            <div class="backlog-meta">
              <span>{{ item.name }}</span>
              <span v-if="item.task_id">任务 {{ item.task_id }}</span>
              <span v-if="item.raw_status && item.raw_status !== backlogState(item)">原始状态 {{ item.raw_status }}</span>
            </div>
          </div>
          <div class="backlog-actions">
            <button v-if="backlogCanDispatch(item)" class="btn btn-primary btn-sm" :disabled="!dailyDevGroupCanExecute(item.group_id)" @click="emit('dispatch', item)">立即派发</button>
            <button v-if="backlogCanRestoreReady(item)" class="btn btn-outline btn-sm" @click="emit('restore-ready', item)">恢复可接活</button>
            <button v-if="backlogState(item) === 'ready'" class="btn btn-outline btn-sm" @click="emit('mark-blocked', item)">标记阻塞</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backlog-modal { min-width: min(1040px, calc(100vw - 32px)) !important; max-height: 86vh; overflow-y: auto; }
.backlog-stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 14px; }
.backlog-stats span { padding: 5px 9px; border-radius: 6px; background: rgba(15, 23, 42, 0.06); color: var(--text-secondary); font-size: 12px; font-weight: 700; }
.backlog-toolbar-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
.backlog-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; padding: 10px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.12); background: rgba(59, 130, 246, 0.04); }
.backlog-toolbar > div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.backlog-toolbar strong { color: var(--text-primary); font-size: 12.5px; }
.backlog-toolbar span { color: var(--text-muted); font-size: 11px; line-height: 1.45; overflow-wrap: anywhere; }
.backlog-bulk-result { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.backlog-bulk-result span { padding: 4px 8px; border-radius: 6px; background: rgba(34, 197, 94, 0.08); color: var(--accent-green); font-size: 11px; font-weight: 700; }
.empty-mini { padding: 32px 12px; text-align: center; color: var(--text-muted); font-size: 13px; }
.backlog-list { display: flex; flex-direction: column; gap: 10px; }
.backlog-item { display: flex; justify-content: space-between; gap: 12px; padding: 12px; border: 1px solid var(--border-color); border-left: 4px solid rgba(100, 116, 139, 0.28); border-radius: 8px; background: rgba(255,255,255,0.7); }
.backlog-item.needs_user, .backlog-item.blocked, .backlog-item.failed { border-left-color: #f59e0b; }
.backlog-item.ready { border-left-color: #22c55e; }
.backlog-item.planned, .backlog-item.dispatched, .backlog-item.queued, .backlog-item.running, .backlog-item.in_progress, .backlog-item.reviewing { border-left-color: #3b82f6; }
.backlog-item.done { border-left-color: #94a3b8; opacity: 0.86; }
.backlog-main { min-width: 0; flex: 1; }
.backlog-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.backlog-title-row strong { max-width: 100%; color: var(--text-primary); font-size: 13px; overflow-wrap: anywhere; }
.backlog-status { flex-shrink: 0; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; background: rgba(100, 116, 139, 0.1); color: var(--text-muted); }
.backlog-status.needs_user, .backlog-status.blocked, .backlog-status.failed { background: rgba(234, 179, 8, 0.12); color: #854d0e; }
.backlog-status.ready { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
.backlog-status.planned, .backlog-status.dispatched, .backlog-status.queued, .backlog-status.running, .backlog-status.in_progress, .backlog-status.reviewing { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
.backlog-status.running, .backlog-status.in_progress { animation: glow-pulse 1.8s infinite ease-in-out !important; }
.backlog-status.done { background: rgba(15, 23, 42, 0.06); color: var(--text-muted); }
.priority-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
.priority-high { background: rgba(239,68,68,0.1); color: #ef4444; }
.priority-normal { background: rgba(59,130,246,0.1); color: #3b82f6; }
.priority-low { background: rgba(100,116,139,0.1); color: #64748b; }
.backlog-goal { color: var(--text-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.backlog-state-grid { display: grid; grid-template-columns: 1.4fr 0.8fr 0.9fr 1fr; gap: 8px; margin-top: 10px; }
.backlog-state-grid > div { min-width: 0; padding: 8px; border-radius: 7px; background: rgba(15, 23, 42, 0.04); }
.backlog-state-grid span { display: block; margin-bottom: 3px; color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.backlog-state-grid strong { display: block; color: var(--text-primary); font-size: 11.5px; line-height: 1.35; overflow-wrap: anywhere; }
.backlog-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 7px; color: var(--text-muted); font-size: 11px; }
.backlog-readiness { display: inline-flex; max-width: 100%; margin-top: 8px; margin-right: 6px; padding: 5px 8px; border-radius: 6px; font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; }
.backlog-readiness.ok { border: 1px solid rgba(34, 197, 94, 0.16); background: rgba(34, 197, 94, 0.08); color: var(--accent-green); }
.backlog-readiness.warn { border: 1px solid rgba(234, 179, 8, 0.22); background: rgba(234, 179, 8, 0.09); color: #854d0e; }
.backlog-result { margin-top: 8px; padding: 7px 9px; border-radius: 6px; background: rgba(234, 179, 8, 0.08); color: #854d0e; font-size: 11px; line-height: 1.45; overflow-wrap: anywhere; }
.backlog-result.ask { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); }
.backlog-result.danger { background: rgba(239, 68, 68, 0.09); color: #b91c1c; }
.backlog-evidence, .backlog-history { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.backlog-evidence span, .backlog-history span { max-width: 100%; padding: 4px 7px; border-radius: 6px; background: rgba(15, 23, 42, 0.055); color: var(--text-secondary); font-size: 10.5px; line-height: 1.35; overflow-wrap: anywhere; }
.backlog-history span { background: rgba(59, 130, 246, 0.07); color: var(--accent-blue); }
.backlog-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0; }
@media (max-width: 900px) {
  .backlog-item { flex-direction: column; }
  .backlog-actions { flex-direction: row; align-items: flex-start; flex-wrap: wrap; }
  .backlog-toolbar-grid, .backlog-state-grid { grid-template-columns: 1fr; }
  .backlog-toolbar { flex-direction: column; align-items: stretch; }
}

:global([data-theme="dark"] .backlog-item){
  background: var(--surface);
  border-color: var(--border-color);
}

:global([data-theme="dark"] .backlog-item:hover){
  border-color: rgba(59, 130, 246, 0.4);
}
</style>
