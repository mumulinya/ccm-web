<script setup>
import { computed } from 'vue'

const props = defineProps({
  assignments: {
    type: Array,
    default: () => []
  },
  coordinationPlan: {
    type: Object,
    default: () => null
  },
  taskStatus: {
    type: String,
    default: 'pending'
  },
  fileChanges: {
    type: Object,
    default: () => null
  },
  receipts: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: 'Agent 协作看板'
  },
  deliverySummary: {
    type: Object,
    default: () => null
  },
  task: {
    type: Object,
    default: () => null
  }
})

const asArray = (value) => Array.isArray(value) ? value.filter(Boolean) : []
const summary = computed(() => props.deliverySummary || props.task?.delivery_summary || {})
const sandboxRehearsal = computed(() => summary.value.sandbox_rehearsal || props.task?.workflow_meta?.sandbox_rehearsal || props.task?.sandbox_rehearsal || null)
const acceptanceGate = computed(() => summary.value.acceptance_gate || null)
const timelineRows = computed(() => {
  const source = asArray(summary.value.timeline).length ? asArray(summary.value.timeline) : asArray(props.task?.workflow_timeline)
  return source.slice(-30).map((item) => ({
    ...item,
    tone: timelineTone(item.status || item.type),
    label: timelineLabel(item.type)
  }))
})

const mainPlan = computed(() => {
  return summary.value.latest_coordination_plan || props.coordinationPlan || {}
})

const planPhases = computed(() => {
  const direct = asArray(mainPlan.value?.phases)
  const fallback = asArray(summary.value.coordination_plans)
  const source = direct.length ? direct : fallback
  return source.map((item, index) => normalizePhase(item, index))
})

const assignmentRows = computed(() => {
  const source = asArray(summary.value.assignment_evidence).length
    ? asArray(summary.value.assignment_evidence)
    : asArray(props.assignments)
  return source.map((item, index) => normalizeAssignment(item, index))
})

const receiptRows = computed(() => {
  const source = asArray(summary.value.receipts).length
    ? asArray(summary.value.receipts)
    : (asArray(summary.value.receipt_statuses).length ? asArray(summary.value.receipt_statuses) : asArray(props.receipts))
  return source.map((item) => normalizeReceipt(item))
})

const notificationRows = computed(() => asArray(summary.value.worker_notifications))
const agentQaRows = computed(() => asArray(summary.value.agent_qa).map((item) => ({
  ...item,
  statusLabel: qaStatusText(item.status),
  tone: qaStatusTone(item.status)
})))
const changedFiles = computed(() => asArray(summary.value.actual_file_changes).length
  ? asArray(summary.value.actual_file_changes)
  : asArray(props.fileChanges?.files))
const executedVerification = computed(() => asArray(summary.value.verification_executed))
const failedVerification = computed(() => asArray(summary.value.verification_failed))
const missingVerification = computed(() => asArray(summary.value.verification_required_missing))
const blockers = computed(() => [...asArray(summary.value.blockers), ...asArray(summary.value.needs)])

const fileChangeCount = computed(() => {
  return summary.value.actual_file_change_count || props.fileChanges?.count || changedFiles.value.length || 0
})

const overviewItems = computed(() => [
  { key: 'plan', label: '主计划', value: planPhases.value.length || summary.value.coordination_plan_count || 0 },
  { key: 'assign', label: '已派发', value: assignmentRows.value.length || summary.value.assignment_count || 0 },
  { key: 'sandbox', label: '沙盘', value: sandboxRehearsal.value ? 1 : 0 },
  { key: 'notify', label: '子 Agent', value: notificationRows.value.length || assignmentRows.value.length || 0 },
  { key: 'qa', label: '问答', value: agentQaRows.value.length || summary.value.agent_qa_count || 0 },
  { key: 'receipt', label: '回执', value: receiptRows.value.length || summary.value.receipt_count || 0 },
  { key: 'verify', label: '已验证', value: executedVerification.value.length }
])

const workerRows = computed(() => {
  const rows = assignmentRows.value.map((assignment) => {
    const receipt = findReceipt(assignment.project)
    const notification = findNotification(assignment.project)
    const rawStatus = receipt?.status || assignment.status || notification?.status || inferPendingStatus()
    return {
      ...assignment,
      receipt,
      notification,
      status: rawStatus,
      statusLabel: statusText(rawStatus),
      tone: statusTone(rawStatus),
      summary: receipt?.summary || notification?.summary || assignment.reason || '',
      actions: asArray(receipt?.actions),
      filesChanged: asArray(receipt?.filesChanged || receipt?.files_changed || receipt?.files),
      verification: asArray(receipt?.verification || receipt?.tests),
      blockers: asArray(receipt?.blockers),
      needs: asArray(receipt?.needs || receipt?.followUps || receipt?.follow_ups)
    }
  })

  if (rows.length) return rows

  return [...receiptRows.value, ...notificationRows.value].map((item, index) => {
    const status = item.status || inferPendingStatus()
    return {
      project: item.agent || item.project || `子 Agent ${index + 1}`,
      task: item.task || item.summary || '等待任务描述',
      status,
      statusLabel: statusText(status),
      tone: statusTone(status),
      summary: item.summary || '',
      actions: asArray(item.actions),
      filesChanged: asArray(item.filesChanged || item.files_changed || item.files),
      verification: asArray(item.verification || item.tests),
      blockers: asArray(item.blockers),
      needs: asArray(item.needs || item.followUps || item.follow_ups)
    }
  })
})

const deliveryState = computed(() => {
  if (failedVerification.value.length || blockers.value.length) return { label: '需要处理', tone: 'warn' }
  if (props.taskStatus === 'done' && summary.value.has_final_review) return { label: '已复盘交付', tone: 'ok' }
  if (props.taskStatus === 'in_progress' || props.taskStatus === 'running') return { label: '执行中', tone: 'active' }
  if (props.taskStatus === 'failed') return { label: '失败', tone: 'fail' }
  return { label: '等待推进', tone: 'muted' }
})

function normalizePhase(item, index) {
  if (typeof item === 'string') {
    return { title: `阶段 ${index + 1}`, detail: item, owner: '', status: '' }
  }
  return {
    title: item.title || item.name || item.phase || `阶段 ${index + 1}`,
    detail: item.detail || item.description || item.task || item.summary || item.goal || '',
    owner: item.owner || item.agent || item.project || '',
    status: item.status || ''
  }
}

function normalizeAssignment(item, index) {
  return {
    project: item.project || item.agent || item.target_project || `子 Agent ${index + 1}`,
    task: item.task || item.summary || item.description || '',
    reason: item.reason || '',
    status: item.status || '',
    statusText: item.statusText || item.status_text || '',
    dependsOn: asArray(item.dependsOn || item.depends_on),
    attempt: item.attempt || 1,
    rework: !!item.rework
  }
}

function normalizeReceipt(item) {
  return {
    ...item,
    agent: item.agent || item.project || item.target_project || '',
    status: item.status || 'unknown',
    summary: item.summary || ''
  }
}

function findReceipt(project) {
  return receiptRows.value.find((item) => sameAgent(item.agent || item.project, project))
}

function findNotification(project) {
  return notificationRows.value.find((item) => sameAgent(item.agent || item.project, project))
}

function sameAgent(a, b) {
  if (!a || !b) return false
  return String(a).toLowerCase() === String(b).toLowerCase()
}

function inferPendingStatus() {
  if (props.taskStatus === 'in_progress' || props.taskStatus === 'running') return 'running'
  return props.taskStatus || 'pending'
}

function statusText(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'done' || value === 'success') return '完成'
  if (value === 'running' || value === 'in_progress') return '执行中'
  if (value === 'failed' || value === 'error') return '失败'
  if (value === 'blocked') return '阻塞'
  if (value === 'partial') return '部分完成'
  if (value === 'needs_info') return '需补充'
  if (value === 'pending' || value === 'queued') return '等待'
  return status || '未知'
}

function statusTone(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'done' || value === 'success') return 'ok'
  if (value === 'running' || value === 'in_progress') return 'active'
  if (value === 'failed' || value === 'error') return 'fail'
  if (value === 'blocked' || value === 'partial' || value === 'needs_info') return 'warn'
  return 'muted'
}

function qaStatusText(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'waiting') return '等待'
  if (value === 'asking') return '询问中'
  if (value === 'answered') return '已回答'
  if (value === 'injected') return '已注入'
  if (value === 'resumed') return '已续跑'
  if (value === 'needs_user') return '等用户'
  if (value === 'manual') return '人工接管'
  if (value === 'timeout') return '超时'
  if (value === 'failed') return '失败'
  return status || '问答中'
}

function qaStatusTone(status) {
  const value = String(status || '').toLowerCase()
  if (['answered', 'injected', 'resumed'].includes(value)) return 'ok'
  if (['timeout', 'failed', 'rejected'].includes(value)) return 'fail'
  if (['needs_user', 'manual'].includes(value)) return 'warn'
  return 'active'
}

function timelineTone(status) {
  const value = String(status || '').toLowerCase()
  if (['ok', 'done', 'passed', 'success', 'child_agent_receipt', 'agent_qa_resume'].includes(value)) return 'ok'
  if (['fail', 'failed', 'error', 'child_agent_failed'].includes(value)) return 'fail'
  if (['warn', 'warning', 'blocked', 'needs_user', 'acceptance_gate'].includes(value)) return 'warn'
  return 'active'
}

function timelineLabel(type) {
  const value = String(type || '')
  const labels = {
    queued_group_task: '入队',
    coordinator_plan: '计划',
    sandbox_rehearsal: '沙盘',
    dispatch: '派发',
    child_agent_start: '执行',
    child_agent_rework: '返工',
    child_agent_receipt: '回执',
    agent_qa_question: '问答',
    agent_qa_resume: '续跑',
    coordinator_review: '验收',
    acceptance_gate: '门禁',
    direct_task: '直接任务'
  }
  return labels[value] || value || '事件'
}

function compactText(text, max = 140) {
  if (!text) return ''
  const value = String(text).trim()
  return value.length > max ? `${value.slice(0, max)}...` : value
}

function formatListItem(item) {
  if (typeof item === 'string') return item
  return item.command || item.path || item.file || item.summary || item.name || JSON.stringify(item)
}
</script>

<template>
  <div class="agent-workboard">
    <header class="workboard-header">
      <div>
        <p class="eyebrow">真实 Agent 协作状态</p>
        <h4>{{ title }}</h4>
      </div>
      <span :class="['delivery-state', deliveryState.tone]">{{ deliveryState.label }}</span>
    </header>

    <div class="metric-grid">
      <div v-for="item in overviewItems" :key="item.key" class="metric-item">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <section v-if="sandboxRehearsal" class="panel sandbox-panel">
      <div class="panel-head">
        <h5>任务前沙盘演练</h5>
        <span :class="['status-pill', sandboxRehearsal.status === 'ready' ? 'ok' : 'warn']">{{ sandboxRehearsal.status === 'ready' ? '可执行' : '需确认' }}</span>
      </div>
      <div class="sandbox-grid">
        <div>
          <span class="section-label">影响范围</span>
          <div class="chip-row">
            <span v-for="area in asArray(sandboxRehearsal.impact_scope?.areas)" :key="area">{{ area }}</span>
          </div>
          <p v-if="asArray(sandboxRehearsal.impact_scope?.file_hints).length" class="muted-line">文件线索：{{ sandboxRehearsal.impact_scope.file_hints.slice(0, 6).join(', ') }}</p>
        </div>
        <div>
          <span class="section-label">预演分工</span>
          <ul v-if="asArray(sandboxRehearsal.agent_plan).length" class="fact-list">
            <li v-for="agent in sandboxRehearsal.agent_plan.slice(0, 5)" :key="`${agent.order}-${agent.project}`">{{ agent.project }}：{{ compactText(agent.task, 90) }}</li>
          </ul>
          <p v-else class="empty-note small">等待主 Agent 生成可执行分工。</p>
        </div>
        <div>
          <span class="section-label">门禁要求</span>
          <div class="chip-row">
            <span v-for="gate in asArray(sandboxRehearsal.gate_requirements)" :key="gate">{{ gate }}</span>
          </div>
        </div>
      </div>
      <div v-if="asArray(sandboxRehearsal.risks).length" class="sandbox-risks">
        <span v-for="risk in sandboxRehearsal.risks.slice(0, 5)" :key="risk">{{ compactText(risk, 120) }}</span>
      </div>
    </section>

    <div class="workboard-grid">
      <section class="panel main-plan">
        <div class="panel-head">
          <h5>主 Agent 生成计划</h5>
          <span v-if="mainPlan.strategy" class="subtle">{{ mainPlan.strategy }}</span>
        </div>
        <div v-if="planPhases.length" class="phase-list">
          <div v-for="(phase, index) in planPhases" :key="`${phase.title}-${index}`" class="phase-item">
            <span class="phase-index">{{ index + 1 }}</span>
            <div class="phase-body">
              <div class="phase-title-row">
                <strong>{{ phase.title }}</strong>
                <span v-if="phase.owner" class="mini-chip">{{ phase.owner }}</span>
              </div>
              <p v-if="phase.detail">{{ compactText(phase.detail, 220) }}</p>
              <span v-if="phase.status" :class="['status-pill', statusTone(phase.status)]">{{ statusText(phase.status) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="empty-note">还没有拿到主 Agent 的计划证据。</p>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h5>派发给子 Agent</h5>
          <span class="subtle">{{ assignmentRows.length }} 个任务</span>
        </div>
        <div v-if="assignmentRows.length" class="assignment-list">
          <div v-for="assignment in assignmentRows" :key="assignment.project" class="assignment-item">
            <div class="assignment-top">
              <strong>{{ assignment.project }}</strong>
              <span :class="['status-pill', statusTone(assignment.status || inferPendingStatus())]">
                {{ assignment.statusText || statusText(assignment.status || inferPendingStatus()) }}
              </span>
            </div>
            <p v-if="assignment.task">{{ compactText(assignment.task, 180) }}</p>
            <p v-if="assignment.reason" class="muted-line">派发依据：{{ compactText(assignment.reason, 160) }}</p>
            <div v-if="assignment.dependsOn.length || assignment.rework || assignment.attempt > 1" class="assignment-meta">
              <span v-if="assignment.dependsOn.length">依赖 {{ assignment.dependsOn.join(', ') }}</span>
              <span v-if="assignment.rework">返工</span>
              <span v-if="assignment.attempt > 1">第 {{ assignment.attempt }} 次</span>
            </div>
          </div>
        </div>
        <p v-else class="empty-note">等待主 Agent 派发子任务。</p>
      </section>
    </div>

    <section class="panel">
      <div class="panel-head">
        <h5>子 Agent 执行状态</h5>
        <span class="subtle">按回执和通知合并</span>
      </div>
      <div v-if="workerRows.length" class="worker-list">
        <div v-for="worker in workerRows" :key="worker.project" class="worker-row">
          <div class="worker-main">
            <div class="worker-title">
              <strong>{{ worker.project }}</strong>
              <span :class="['status-pill', worker.tone]">{{ worker.statusLabel }}</span>
            </div>
            <p v-if="worker.task">{{ compactText(worker.task, 180) }}</p>
            <p v-if="worker.summary" class="muted-line">回执：{{ compactText(worker.summary, 220) }}</p>
          </div>
          <div class="worker-facts">
            <span>动作 {{ worker.actions.length }}</span>
            <span>文件 {{ worker.filesChanged.length }}</span>
            <span>验证 {{ worker.verification.length }}</span>
          </div>
          <div v-if="worker.blockers.length || worker.needs.length" class="worker-blockers">
            <span v-for="item in [...worker.blockers, ...worker.needs].slice(0, 3)" :key="item">{{ item }}</span>
          </div>
        </div>
      </div>
      <p v-else class="empty-note">暂未收到子 Agent 通知或回执。</p>
    </section>

    <section class="panel agent-qa-panel">
      <div class="panel-head">
        <h5>Agent-to-Agent 问答</h5>
        <span class="subtle">开放 {{ summary.agent_qa_open_count || 0 }} · 已恢复 {{ summary.agent_qa_resolved_count || 0 }}</span>
      </div>
      <div v-if="agentQaRows.length" class="qa-list">
        <div v-for="qa in agentQaRows" :key="qa.id" class="qa-row">
          <div class="qa-top">
            <strong>{{ qa.from_agent }} → {{ qa.to_agent }}</strong>
            <span :class="['status-pill', qa.tone]">{{ qa.statusLabel }}</span>
          </div>
          <p class="muted-line">{{ qa.type === 'request_review' ? '评审' : '询问' }}：{{ compactText(qa.question, 180) }}</p>
          <p v-if="qa.answer" class="muted-line">回答：{{ compactText(qa.answer, 220) }}</p>
          <div v-if="qa.injected_at || qa.resumed_at || qa.retry_count || qa.manual_takeover" class="assignment-meta">
            <span v-if="qa.injected_at">已注入</span>
            <span v-if="qa.resumed_at">已续跑</span>
            <span v-if="qa.retry_count">重试 {{ qa.retry_count }} 次</span>
            <span v-if="qa.manual_takeover">人工接管</span>
          </div>
        </div>
      </div>
      <p v-else class="empty-note">本次任务暂无子 Agent 工作中问答。</p>
    </section>
    <section class="panel delivery-panel">
      <div class="panel-head">
        <h5>验收与交付证据</h5>
        <span class="subtle">真实文件变更 {{ fileChangeCount }}</span>
      </div>
      <div v-if="acceptanceGate" class="gate-grid">
        <div v-for="check in acceptanceGate.checks" :key="check.id" :class="['gate-check', check.ok ? 'ok' : 'fail']">
          <span>{{ check.ok ? '通过' : '未过' }}</span>
          <strong>{{ check.label }}</strong>
          <small v-if="check.detail">{{ check.detail }}</small>
        </div>
      </div>
      <div class="delivery-grid">
        <div>
          <span class="section-label">已执行验证</span>
          <ul v-if="executedVerification.length" class="fact-list">
            <li v-for="item in executedVerification.slice(0, 6)" :key="formatListItem(item)">{{ formatListItem(item) }}</li>
          </ul>
          <p v-else class="empty-note small">暂无实际执行验证记录。</p>
        </div>
        <div>
          <span class="section-label">文件变更</span>
          <ul v-if="changedFiles.length" class="fact-list">
            <li v-for="file in changedFiles.slice(0, 8)" :key="file.path || file">{{ file.path || file }}</li>
          </ul>
          <p v-else class="empty-note small">暂无真实文件变更记录。</p>
        </div>
        <div v-if="failedVerification.length || missingVerification.length || blockers.length">
          <span class="section-label">待处理问题</span>
          <ul class="fact-list warn">
            <li v-for="item in failedVerification.slice(0, 4)" :key="formatListItem(item)">验证失败：{{ formatListItem(item) }}</li>
            <li v-for="item in missingVerification.slice(0, 4)" :key="formatListItem(item)">缺验证：{{ formatListItem(item) }}</li>
            <li v-for="item in blockers.slice(0, 4)" :key="item">{{ item }}</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="panel timeline-panel">
      <div class="panel-head">
        <h5>任务时间线</h5>
        <span class="subtle">{{ timelineRows.length }} 个关键事件</span>
      </div>
      <div v-if="timelineRows.length" class="timeline-list">
        <div v-for="event in timelineRows" :key="event.id || `${event.at}-${event.title}`" class="timeline-row">
          <span :class="['timeline-dot', event.tone]"></span>
          <div class="timeline-body">
            <div class="timeline-top">
              <strong>{{ event.title }}</strong>
              <span :class="['status-pill', event.tone]">{{ event.label }}</span>
            </div>
            <p v-if="event.detail">{{ compactText(event.detail, 220) }}</p>
            <small>{{ event.agent || 'system' }} · {{ event.phase || 'workflow' }} · {{ event.at }}</small>
          </div>
        </div>
      </div>
      <p v-else class="empty-note">暂无任务时间线事件。</p>
    </section>
  </div>
</template>

<style scoped>
.agent-workboard {
  width: 100%;
  box-sizing: border-box;
  color: var(--text-primary);
}

.workboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 14px;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.workboard-header h4,
.panel h5 {
  margin: 0;
  color: var(--text-primary);
}

.workboard-header h4 {
  font-size: 16px;
}

.delivery-state,
.status-pill,
.mini-chip {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.delivery-state {
  padding: 5px 10px;
}

.status-pill,
.mini-chip {
  padding: 2px 7px;
}

.ok {
  color: var(--accent-green);
  background: rgba(34, 197, 94, 0.12);
}

.active {
  color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.12);
}

.warn {
  color: #854d0e;
  background: rgba(234, 179, 8, 0.14);
}

.fail {
  color: var(--accent-red);
  background: rgba(239, 68, 68, 0.12);
}

.muted {
  color: var(--text-muted);
  background: rgba(100, 116, 139, 0.12);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.metric-item {
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.45);
  border-radius: 8px;
  padding: 10px;
  min-width: 0;
}

.metric-item span {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.metric-item strong {
  font-size: 18px;
  color: var(--text-primary);
}

.workboard-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 12px;
  margin-bottom: 12px;
}

.panel {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.52);
  padding: 12px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.panel h5 {
  font-size: 13px;
}

.subtle,
.section-label {
  font-size: 11px;
  color: var(--text-muted);
}

.phase-list,
.assignment-list,
.worker-list,
.qa-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phase-item {
  display: flex;
  gap: 10px;
}

.phase-index {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.phase-body,
.assignment-item,
.worker-row,
.qa-row {
  min-width: 0;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
}

.phase-body {
  flex: 1;
  padding: 8px 10px;
}

.phase-title-row,
.assignment-top,
.worker-title,
.qa-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.phase-title-row strong,
.assignment-top strong,
.worker-title strong,
.qa-top strong {
  font-size: 12px;
  overflow-wrap: anywhere;
}

.phase-body p,
.assignment-item p,
.worker-main p,
.qa-row p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.assignment-item,
.worker-row,
.qa-row {
  padding: 9px 10px;
}

.muted-line {
  color: var(--text-muted) !important;
}

.assignment-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}

.assignment-meta span {
  font-size: 10.5px;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 2px 7px;
}

.worker-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.worker-main {
  min-width: 0;
}

.worker-facts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  font-size: 11px;
  color: var(--text-muted);
}

.worker-blockers {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.worker-blockers span {
  font-size: 11px;
  color: #854d0e;
  background: rgba(234, 179, 8, 0.12);
  border-radius: 6px;
  padding: 3px 7px;
}

.delivery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.fact-list {
  margin: 7px 0 0;
  padding-left: 16px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.fact-list li {
  overflow-wrap: anywhere;
}

.empty-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.empty-note.small {
  margin-top: 7px;
}

@media (max-width: 860px) {
  .metric-grid,
  .workboard-grid,
  .delivery-grid {
    grid-template-columns: 1fr;
  }

  .worker-row {
    grid-template-columns: 1fr;
  }

  .worker-facts {
    flex-direction: row;
    align-items: center;
  }
}
</style>
