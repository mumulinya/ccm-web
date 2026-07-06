<script setup>
defineProps({
  task: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  showArchived: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    default: ''
  },
  priorityText: {
    type: String,
    default: ''
  },
  workflowItems: {
    type: Array,
    default: () => []
  },
  agentPreview: {
    type: Array,
    default: () => []
  },
  evidenceItems: {
    type: Array,
    default: () => []
  },
  executionBlocked: {
    type: Boolean,
    default: false
  },
  executionBlockedText: {
    type: String,
    default: ''
  },
  executionFixActions: {
    type: Array,
    default: () => []
  },
  kernelState: {
    type: String,
    default: ''
  },
  kernelStateText: {
    type: String,
    default: ''
  },
  kernelGreen: {
    type: String,
    default: ''
  },
  kernelGreenText: {
    type: String,
    default: ''
  },
  canManualComplete: {
    type: Boolean,
    default: false
  },
  canCancel: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'toggle-selected',
  'status-change',
  'restore',
  'purge',
  'cancel',
  'queue',
  'report',
  'pipeline',
  'continue',
  'logs',
  'resend',
  'edit',
  'delete'
])
</script>

<template>
  <div class="task-card">
    <div class="task-main">
      <input
        type="checkbox"
        :checked="selected"
        :value="task.id"
        aria-label="选择任务"
        @change="emit('toggle-selected', task.id, $event.target.checked)"
      >
      <div class="task-info">
        <div class="task-title-row">
          <span class="task-title">{{ task.title }}</span>
          <span :class="'priority-tag priority-' + task.priority">{{ priorityText }}</span>
        </div>
        <div v-if="task.description" class="task-desc">{{ task.description?.substring(0, 100) }}</div>
        <div v-if="task.delivery_summary?.headline" class="task-delivery-headline">{{ task.delivery_summary.headline }}</div>
        <div v-if="workflowItems.length" class="agent-workflow-row">
          <span v-for="item in workflowItems" :key="item.key" :class="['workflow-chip', item.tone]">{{ item.label }}</span>
        </div>
        <div v-if="agentPreview.length" class="agent-preview-row">
          <span v-for="agent in agentPreview" :key="agent.project" :class="['agent-preview-chip', agent.tone]">
            {{ agent.project }} · {{ agent.statusText }}
          </span>
        </div>
        <div v-if="evidenceItems.length" class="task-evidence-row">
          <span v-for="item in evidenceItems" :key="item.key" :class="['evidence-chip', item.tone]">{{ item.label }}</span>
        </div>
        <div v-if="executionBlocked" class="task-execution-block">
          <strong>等待执行通道恢复</strong>
          <span>{{ executionBlockedText }}</span>
          <ul v-if="executionFixActions.length" class="execution-fix-list">
            <li v-for="action in executionFixActions" :key="action">{{ action }}</li>
          </ul>
        </div>
        <div v-if="task.status_detail" class="task-status-detail">{{ task.status_detail }}</div>
        <div v-if="task.execution_kernel" class="kernel-summary-row">
          <span :class="['kernel-chip', kernelState]">{{ kernelStateText }}</span>
          <span :class="['kernel-chip', 'green-' + kernelGreen]">{{ kernelGreenText }}</span>
        </div>
        <div v-if="task.final_report || task.result" class="task-result">{{ (task.final_report || task.result)?.substring(0, 180) }}</div>
        <div class="task-meta">
          <span class="meta-item">{{ task.assign_type === 'group' ? '💬' : '🤖' }} {{ task.assign_type === 'group' ? groupName : task.target_project }}</span>
          <span class="meta-item">🕐 {{ new Date(task.created_at).toLocaleString('zh-CN') }}</span>
        </div>
      </div>
      <div class="task-right">
        <select
          :value="task.status"
          class="status-select"
          @change="emit('status-change', task.id, $event.target.value)"
        >
          <option value="pending">待处理</option>
          <option value="in_progress">进行中</option>
          <option value="done" :disabled="task.status !== 'done' && !canManualComplete">已完成</option>
          <option value="failed">失败</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>
    </div>
    <div class="task-actions">
      <button v-if="showArchived" class="btn btn-primary btn-sm" @click="emit('restore', task.id)">恢复</button>
      <button v-if="showArchived" class="btn btn-danger btn-sm" @click="emit('purge', task.id)">永久清除</button>
      <template v-if="!showArchived">
        <button v-if="canCancel" class="btn btn-danger btn-sm" @click="emit('cancel', task)">停止任务</button>
        <button v-if="task.status === 'pending' || task.status === 'failed'" class="btn btn-primary btn-sm" @click="emit('queue', task.id)">📥 加入队列</button>
        <button v-if="task.final_report || task.result || task.receipt || task.review" class="btn btn-outline btn-sm" @click="emit('report', task)">📄 报告</button>
        <button v-if="task.delivery_summary" class="btn btn-outline btn-sm pipeline-btn" @click="emit('pipeline', task)">协作看板</button>
        <button v-if="task.status !== 'done'" class="btn btn-outline btn-sm" @click="emit('continue', task)">补充</button>
        <button class="btn btn-outline btn-sm" @click="emit('logs', task.id)">📋 日志</button>
        <button v-if="task.status !== 'done'" class="btn btn-outline btn-sm" @click="emit('resend', task)">🔄 重派</button>
        <button class="btn btn-outline btn-sm" @click="emit('edit', task)">编辑</button>
        <button class="btn btn-danger btn-sm" @click="emit('delete', task.id)">🗑️ 删除</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.task-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 16px;
  transition: border-color 0.2s;
}

.task-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
}

.task-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.priority-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.priority-high {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.priority-normal {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.priority-low {
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
}

.task-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.task-delivery-headline {
  font-size: 12px;
  color: var(--accent-green);
  margin-bottom: 6px;
  font-weight: 600;
}

.task-evidence-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: -1px 0 7px;
}

.agent-workflow-row,
.agent-preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0 0 7px;
}

.workflow-chip,
.agent-preview-chip {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(100, 116, 139, 0.08);
  color: var(--text-secondary);
}

.workflow-chip.ok,
.agent-preview-chip.ok {
  background: rgba(34, 197, 94, 0.1);
  color: var(--accent-green);
}

.workflow-chip.active,
.agent-preview-chip.active {
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
}

.workflow-chip.warn,
.agent-preview-chip.warn {
  background: rgba(234, 179, 8, 0.12);
  color: #854d0e;
}

.workflow-chip.fail,
.agent-preview-chip.fail {
  background: rgba(239, 68, 68, 0.1);
  color: var(--accent-red);
}

.workflow-chip.muted,
.agent-preview-chip.muted {
  background: rgba(100, 116, 139, 0.08);
  color: var(--text-muted);
}

.evidence-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(100, 116, 139, 0.08);
  color: var(--text-secondary);
}

.evidence-chip.ok {
  background: rgba(34, 197, 94, 0.1);
  color: var(--accent-green);
}

.evidence-chip.warn {
  background: rgba(234, 179, 8, 0.12);
  color: #854d0e;
}

.evidence-chip.fail {
  background: rgba(239, 68, 68, 0.1);
  color: var(--accent-red);
}

.task-execution-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0 0 7px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(234, 179, 8, 0.2);
  background: rgba(234, 179, 8, 0.08);
}

.task-execution-block strong {
  font-size: 11px;
  color: #854d0e;
}

.task-execution-block span {
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.execution-fix-list {
  margin: 2px 0 0;
  padding-left: 16px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.5;
}

.execution-fix-list li {
  overflow-wrap: anywhere;
}

.task-status-detail {
  font-size: 12px;
  color: var(--accent-blue);
  margin-bottom: 6px;
}

.kernel-summary-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
}

.kernel-chip {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.12);
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 800;
}

.kernel-chip.running,
.kernel-chip.spawning,
.kernel-chip.ready,
.kernel-chip.prompt_accepted,
.kernel-chip.reviewing {
  background: rgba(59, 130, 246, 0.11);
  color: var(--accent-blue);
}

.kernel-chip.succeeded,
.kernel-chip.green-project,
.kernel-chip.green-workspace,
.kernel-chip.green-merge_ready {
  background: rgba(34, 197, 94, 0.12);
  color: var(--accent-green);
}

.kernel-chip.failed,
.kernel-chip.cancelled,
.kernel-chip.cancel_requested {
  background: rgba(239, 68, 68, 0.11);
  color: #b91c1c;
}

.task-result {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}

.task-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-right {
  flex-shrink: 0;
}

.task-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.status-select {
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-primary);
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  outline: none;
  transition: border-color 0.2s;
}

.status-select:focus {
  border-color: rgba(59, 130, 246, 0.4);
}

.pipeline-btn {
  color: #00bcd4;
  border-color: rgba(0, 188, 212, 0.3);
  background: rgba(0, 188, 212, 0.08);
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

.btn-primary {
  background: var(--gradient-blue);
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: var(--text-secondary);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.18);
  color: #dc2626;
}

:global([data-theme="dark"]) .priority-high,
:global([data-theme="dark"]) .priority-normal,
:global([data-theme="dark"]) .priority-low,
:global([data-theme="dark"]) .workflow-chip,
:global([data-theme="dark"]) .agent-preview-chip,
:global([data-theme="dark"]) .evidence-chip,
:global([data-theme="dark"]) .task-execution-block,
:global([data-theme="dark"]) .kernel-chip {
  filter: brightness(1.08);
}

@media (max-width: 768px) {
  .task-main {
    flex-direction: column;
  }

  .task-actions {
    flex-wrap: wrap;
  }
}
</style>
