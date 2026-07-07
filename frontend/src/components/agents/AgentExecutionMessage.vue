<script setup>
import MainAgentDecisionCard from './MainAgentDecisionCard.vue'
import TaskCollaborationCard from '../collaboration/TaskCollaborationCard.vue'
import AgentWorkEventDetails from './AgentWorkEventDetails.vue'

const props = defineProps({
  msg: { type: Object, required: true },
  displayContent: { type: String, default: '' },
  accentStyle: { type: Object, default: () => ({}) },
  status: { type: Object, default: () => ({ tone: 'idle', label: '回复' }) },
  agentInitials: { type: String, default: 'A' },
  agentDisplayName: { type: String, default: 'Agent' },
  mainAgentDecision: { type: Object, default: null },
  taskCard: { type: Object, default: null },
  taskRuntime: { type: Object, default: null },
  primaryTaskCard: { type: Boolean, default: false },
  showOrchestrationPlan: { type: Boolean, default: false },
  workEvents: { type: Array, default: () => [] },
  mainAgent: { type: Boolean, default: false },
  fileChangesTitle: { type: String, default: '' },
  workflowSteps: { type: Array, default: () => [] },
  highlightMentions: { type: Function, default: (value) => value || '' },
  getPlanTitle: { type: Function, default: () => '协作计划' },
  getExecutionOrderLabel: { type: Function, default: (value) => value || '并行' },
  getDispatchActionLabel: { type: Function, default: (value) => value || '派发' },
  compactPlanText: { type: Function, default: (value) => value || '' },
  getWorkflowLabel: { type: Function, default: () => '执行流程' },
  getWorkflowStepState: { type: Function, default: () => '' },
  getAssignmentKey: { type: Function, default: (_msg, item) => item?.id || item?.project || item?.task },
  getAssignmentStatusClass: { type: Function, default: (value) => value || 'pending' },
  getAssignmentStatusLabel: { type: Function, default: (value) => value || '待执行' },
  getAgentDisplayName: { type: Function, default: (value) => value || 'Agent' },
})

const emit = defineEmits(['step-action', 'task-action', 'open-pipeline', 'open-file-diff'])

const deliverySummary = () => props.msg.delivery_summary || props.msg.deliverySummary || null
const clarificationSummary = () => props.msg.clarification_summary || props.msg.clarificationSummary || null
</script>

<template>
  <div
    class="bubble agent-exec-bubble"
    :class="['agent-state-' + status.tone]"
    :style="accentStyle"
  >
    <div class="agent-message-head">
      <div class="agent-identity">
        <span class="agent-avatar">{{ msg.agent === 'system' ? '!' : agentInitials }}</span>
        <span class="agent-title">{{ msg.agent === 'system' ? '系统' : agentDisplayName }}</span>
      </div>
      <span :class="['agent-status-pill', status.tone]">
        {{ status.label }}
      </span>
    </div>
    <div v-if="displayContent || msg.content" class="agent-message-content" v-html="highlightMentions(displayContent || msg.content)"></div>
    <div v-if="clarificationSummary()" class="clarification-summary" :class="clarificationSummary().status">
      <div class="clarification-head">
        <strong>{{ clarificationSummary().title || '需要你补充信息' }}</strong>
        <span>{{ clarificationSummary().status_label || '等待你回复' }}</span>
      </div>
      <p v-if="clarificationSummary().headline">{{ clarificationSummary().headline }}</p>
      <div class="clarification-question">
        <small>需要确认</small>
        <strong>{{ clarificationSummary().question }}</strong>
      </div>
      <p v-if="clarificationSummary().reason" class="clarification-reason">{{ clarificationSummary().reason }}</p>
      <ul v-if="clarificationSummary().answer_suggestions?.length" class="clarification-suggestions">
        <li v-for="item in clarificationSummary().answer_suggestions" :key="item">{{ item }}</li>
      </ul>
      <small v-if="clarificationSummary().next_action" class="clarification-next">下一步：{{ clarificationSummary().next_action }}</small>
    </div>
    <MainAgentDecisionCard
      v-if="mainAgentDecision"
      :decision="mainAgentDecision"
      compact
      @step-action="emit('step-action', $event)"
    />
    <TaskCollaborationCard
      v-if="primaryTaskCard"
      :card="taskCard"
      :runtime="taskRuntime"
      @action="emit('task-action', $event)"
    />
    <div v-if="deliverySummary() && !taskCard" class="delivery-summary-actions">
      <button class="btn btn-sm btn-outline" @click="emit('open-pipeline')">查看交付协作看板</button>
      <span v-if="deliverySummary()?.acceptance_gate_passed === false" class="delivery-gate-warning">验收检查未通过</span>
    </div>
    <div v-if="showOrchestrationPlan" class="orchestration-plan">
      <div class="plan-header">
        <span>{{ getPlanTitle(msg) }}</span>
        <span class="plan-order">{{ getExecutionOrderLabel(msg.executionOrder) }}</span>
      </div>
      <div v-if="msg.dispatchPolicy" class="dispatch-policy">
        <div class="dispatch-action">{{ getDispatchActionLabel(msg.dispatchPolicy.action) }}</div>
        <div v-if="msg.dispatchPolicy.reason" class="dispatch-line">{{ compactPlanText(msg.dispatchPolicy.reason, 160) }}</div>
        <div v-if="msg.dispatchPolicy.risk" class="dispatch-risk">{{ compactPlanText(msg.dispatchPolicy.risk, 160) }}</div>
        <div v-if="msg.dispatchPolicy.nextStep" class="dispatch-line">下一步：{{ compactPlanText(msg.dispatchPolicy.nextStep, 140) }}</div>
        <div v-if="msg.dispatchPolicy.requiresConfirmation" class="dispatch-confirm">需要确认后执行</div>
      </div>
      <div v-if="msg.coordinationPlan?.phases?.length" class="coordination-plan">
        <div class="coordination-title">协作计划</div>
        <div v-for="phase in msg.coordinationPlan.phases" :key="phase" class="coordination-phase">
          {{ compactPlanText(phase, 120) }}
        </div>
      </div>
      <div class="workflow-board">
        <div class="workflow-title">{{ getWorkflowLabel(msg) }}</div>
        <div class="workflow-steps">
          <div
            v-for="step in workflowSteps"
            :key="step.key"
            class="workflow-step"
            :class="getWorkflowStepState(msg, step.key)"
          >
            <span class="workflow-dot"></span>
            <span>{{ step.label }}</span>
          </div>
        </div>
      </div>
      <div v-for="item in msg.assignments" :key="getAssignmentKey(msg, item)" class="plan-item">
        <div class="plan-item-top">
          <span class="plan-project">{{ getAgentDisplayName(item.project) }}</span>
          <span v-if="item.rework" class="plan-rework">返工 #{{ item.attempt || 2 }}</span>
          <span v-if="item.dependsOn" class="plan-dep">等待 {{ item.dependsOn }}</span>
          <span class="plan-status" :class="getAssignmentStatusClass(item.status)">
            {{ item.statusText || getAssignmentStatusLabel(item.status) }}
          </span>
        </div>
        <div class="plan-actions">
          <button class="btn btn-sm plan-board-button" @click="emit('open-pipeline')">
            查看协作看板
          </button>
        </div>
        <div class="plan-task">{{ compactPlanText(item.userTaskPreview || item.user_task_preview || item.task) }}</div>
        <div v-if="item.reason" class="plan-reason">{{ compactPlanText(item.reason, 120) }}</div>
      </div>
    </div>
    <span v-if="msg.streaming" class="stream-cursor">▌</span>
    <AgentWorkEventDetails
      v-if="workEvents.length && !taskCard"
      :msg="msg"
      :main-agent="mainAgent"
      :accent-style="accentStyle"
    />
    <div v-if="msg.fileChanges && msg.fileChanges.count > 0" class="file-changes">
      <div class="file-changes-header">{{ fileChangesTitle }}</div>
      <button v-for="f in msg.fileChanges.files" :key="f.path" class="file-change-item" @click="emit('open-file-diff', f)">
        <span class="fc-dot" :style="{ background: f.statusColor }"></span>
        <span class="fc-path">{{ f.path }}</span>
        <span v-if="f.diff?.available" class="fc-diff-stat">
          +{{ f.diff.additions || 0 }} -{{ f.diff.deletions || 0 }}
        </span>
        <span class="fc-status" :style="{ color: f.statusColor }">{{ f.statusText }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.agent-exec-bubble {
  position: relative;
  border-left: 3px solid var(--agent-accent) !important;
}
.agent-exec-bubble::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 56px;
  pointer-events: none;
  background: linear-gradient(90deg, color-mix(in srgb, var(--agent-accent) 10%, transparent), transparent);
  opacity: 0.7;
}
.agent-exec-bubble.agent-state-fail {
  border-color: rgba(239, 68, 68, 0.36) !important;
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.08) !important;
}
.agent-exec-bubble.agent-state-running {
  box-shadow: 0 6px 18px color-mix(in srgb, var(--agent-accent) 12%, transparent) !important;
}
.agent-message-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.agent-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.agent-avatar {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--agent-accent) 14%, white);
  color: var(--agent-accent);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 25%, transparent);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}
.agent-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}
.agent-status-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  background: rgba(100, 116, 139, 0.1);
  color: var(--text-muted);
}
.agent-status-pill.running {
  background: color-mix(in srgb, var(--agent-accent) 13%, transparent);
  color: var(--agent-accent);
}
.agent-status-pill.ok {
  background: rgba(34, 197, 94, 0.12);
  color: var(--accent-green);
}
.agent-status-pill.fail {
  background: rgba(239, 68, 68, 0.12);
  color: var(--accent-red);
}
.agent-message-content {
  position: relative;
  z-index: 1;
}
.clarification-summary {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 11px 12px;
  border: 1px solid rgba(245, 158, 11, 0.24);
  border-radius: 9px;
  background: #fffbeb;
}
.clarification-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.clarification-head strong {
  color: #92400e;
  font-size: 12px;
}
.clarification-head span {
  flex: 0 0 auto;
  padding: 2px 7px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 10.5px;
  font-weight: 800;
  white-space: nowrap;
}
.clarification-summary p,
.clarification-summary small,
.clarification-summary li {
  color: #475569;
  font-size: 11.5px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.clarification-summary p {
  margin: 0;
}
.clarification-question {
  display: grid;
  gap: 3px;
  padding: 8px 9px;
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
}
.clarification-question small {
  color: #92400e;
  font-weight: 800;
}
.clarification-question strong {
  color: #1f2937;
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.clarification-suggestions {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 16px;
}
.clarification-next {
  color: #92400e !important;
  font-weight: 800;
}
:global([data-theme="dark"]) .agent-avatar {
  background: color-mix(in srgb, var(--agent-accent) 20%, rgba(15, 23, 42, 0.9));
  border-color: color-mix(in srgb, var(--agent-accent) 32%, rgba(255, 255, 255, 0.08));
}
:global([data-theme="dark"]) .clarification-summary {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(69, 49, 17, 0.42);
}
:global([data-theme="dark"]) .clarification-question {
  background: rgba(15, 23, 42, 0.48);
  border-color: rgba(245, 158, 11, 0.24);
}
:global([data-theme="dark"]) .clarification-question strong {
  color: #f8fafc;
}
.delivery-summary-actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.delivery-gate-warning { font-size: 11px; font-weight: 800; color: #d97706; }
.file-changes { margin-top: 10px; padding: 10px 12px; background: rgba(59, 130, 246, 0.03); border: 1px solid rgba(59, 130, 246, 0.1); border-radius: 10px; }
.file-changes-header { font-size: 11px; color: var(--accent-blue); font-weight: 600; margin-bottom: 8px; letter-spacing: 0.3px; }
.file-change-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}
.file-change-item:hover { background: rgba(59, 130, 246, 0.05); }
.fc-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.fc-path { flex: 1; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fc-diff-stat { color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-size: 10.5px; white-space: nowrap; }
.fc-status { font-size: 10px; flex-shrink: 0; font-weight: 500; }
.orchestration-plan {
  margin-top: 12px;
  border: 1px solid rgba(59, 130, 246, 0.16);
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.035);
  overflow: hidden;
}
.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  font-size: 12px;
  font-weight: 700;
}
.plan-order {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}
.dispatch-policy {
  padding: 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  background: rgba(15, 23, 42, 0.025);
}
.dispatch-action {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  margin-bottom: 6px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.09);
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 800;
}
.dispatch-line {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.5;
}
.dispatch-risk,
.dispatch-confirm {
  margin-top: 5px;
  color: #d97706;
  font-size: 11px;
  line-height: 1.45;
}
.dispatch-confirm { font-weight: 700; }
.coordination-plan {
  padding: 9px 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  background: rgba(14, 165, 233, 0.05);
}
.coordination-title {
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
}
.coordination-phase {
  position: relative;
  padding-left: 14px;
  color: var(--text-primary);
  font-size: 11px;
  line-height: 1.45;
}
.coordination-phase::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-blue);
}
.workflow-board {
  padding: 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  background: rgba(255, 255, 255, 0.35);
}
.workflow-title {
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}
.workflow-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.workflow-step {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  padding: 5px 4px;
  border: 1px solid rgba(100, 116, 139, 0.12);
  border-radius: 6px;
  color: var(--text-muted);
  background: rgba(100, 116, 139, 0.04);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.workflow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(100, 116, 139, 0.35);
  flex-shrink: 0;
}
.workflow-step.done {
  color: #059669;
  border-color: rgba(16, 185, 129, 0.18);
  background: rgba(16, 185, 129, 0.07);
}
.workflow-step.done .workflow-dot { background: #10b981; }
.workflow-step.active {
  color: var(--accent-blue);
  border-color: rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.09);
}
.workflow-step.active .workflow-dot { background: var(--accent-blue); }
.workflow-step.warning {
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.24);
  background: rgba(245, 158, 11, 0.09);
}
.workflow-step.warning .workflow-dot { background: #f59e0b; }
.plan-item {
  padding: 9px 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.05);
}
.plan-item:first-of-type { border-top: none; }
.plan-item-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.plan-project {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
}
.plan-dep {
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(167, 139, 250, 0.1);
  color: var(--accent-purple);
  font-size: 10px;
}
.plan-rework {
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  font-size: 10px;
  font-weight: 700;
}
.plan-status {
  margin-left: auto;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.plan-status.pending {
  background: rgba(100, 116, 139, 0.08);
  border-color: rgba(100, 116, 139, 0.14);
  color: var(--text-muted);
}
.plan-status.running {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
  color: var(--accent-blue);
}
.plan-status.done {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
  color: #059669;
}
.plan-status.partial {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.22);
  color: #d97706;
}
.plan-status.blocked,
.plan-status.needs-info {
  background: rgba(167, 139, 250, 0.1);
  border-color: rgba(167, 139, 250, 0.22);
  color: var(--accent-purple);
}
.plan-status.failed {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.22);
  color: #dc2626;
}
.plan-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
.plan-board-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid rgba(0, 188, 212, 0.25);
  border-radius: 4px;
  background: rgba(0, 188, 212, 0.12);
  color: #00bcd4;
  font-size: 11px;
  cursor: pointer;
}
.plan-task {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}
.plan-reason {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}
</style>
