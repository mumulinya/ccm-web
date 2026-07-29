<script setup>
import { computed } from 'vue'
import { replayActorLabel, sanitizeReplayText } from '../../utils/taskReplayPresentation.js'

const props = defineProps({
  plans: { type: Array, default: () => [] },
  workItems: { type: Array, default: () => [] },
  tasks: { type: Array, default: () => [] },
})
const emit = defineEmits(['open-evidence'])

const PLAN_STATUS = { awaiting_confirmation: '等待确认', in_progress: '执行中', completed: '已完成' }
const STEP_STATUS = { pending: '待执行', in_progress: '进行中', completed: '已完成', cancelled: '已取消', skipped: '已跳过', needs_confirmation: '待确认', reviewing: '验收中', reworking: '返工中', blocked: '受阻', failed: '失败' }
const ITEM_STATUS = { pending: '等待安排', in_progress: '执行中', completed: '已完成', blocked: '需处理', failed: '未完成', cancelled: '已取消' }
const RECEIPT_STATUS = { passed: '通过', running: '进行中', warning: '部分完成', failed: '未完成', blocked: '需处理', cancelled: '已取消', info: '已提交' }

const showTaskTags = computed(() => (props.tasks || []).length > 1)
const taskLabelFor = (taskId) => {
  if (!showTaskTags.value) return ''
  const task = (props.tasks || []).find(item => String(item.id) === String(taskId))
  if (!task) return ''
  return task.is_root ? '主任务' : (task.project || task.title || '')
}
const planStatusLabel = (plan) => PLAN_STATUS[plan.status] || plan.status
const stepStatusLabel = (step) => STEP_STATUS[step.status] || step.status
const itemStatusLabel = (item) => ITEM_STATUS[item.status] || item.status
const receiptStatusLabel = (item) => RECEIPT_STATUS[item.receipt_status] || item.receipt_status
const displayText = value => sanitizeReplayText(value)
const planPercent = (plan) => {
  const total = Number(plan.step_count || plan.steps?.length || 0)
  if (!total) return 0
  return Math.round((Number(plan.completed_count || 0) / total) * 100)
}
const workItemTag = (item) => {
  const label = taskLabelFor(item.task_id)
  return label && label !== (item.target || item.owner) ? label : ''
}
// 文件与验证的明细由证据面板唯一承载，这里只显示计数，点按钮跳过去看，避免同一批数据两处各列一遍。
const itemMeta = (item) => {
  const rows = []
  if (item.files_changed_count) rows.push(`修改文件 ${item.files_changed_count} 个`)
  if (item.verification_count ?? item.verification?.length) rows.push(`验证 ${item.verification_count ?? item.verification.length} 项`)
  if (item.attempt > 1) rows.push(`第 ${item.attempt} 次尝试`)
  return rows
}
const planSourceNote = (plan) => {
  if (plan.source === 'coordination_plan') return '主 Agent 执行计划'
  if (plan.source === 'live_todo') return '实时执行计划'
  return ''
}
</script>

<template>
  <section v-if="plans.length || workItems.length" class="task-replay-plan-board" aria-label="计划与执行步骤">
    <div v-if="plans.length" class="board-column">
      <header><strong>计划书</strong><span>{{ plans.length }} 份</span></header>
      <article v-for="plan in plans" :key="`${plan.task_id}:${plan.source}`" class="plan-card">
        <div class="card-head">
          <strong>{{ displayText(plan.title) }}</strong>
          <em v-if="taskLabelFor(plan.task_id)" class="task-tag">{{ taskLabelFor(plan.task_id) }}</em>
          <b :class="['status-chip', plan.status]">{{ planStatusLabel(plan) }}</b>
        </div>
        <div class="plan-progress">
          <div class="progress-track"><i :style="{ width: `${planPercent(plan)}%` }"></i></div>
          <span>{{ plan.progress_label }}</span>
          <span v-if="plan.revision_count">修订 {{ plan.revision_count }} 次</span>
          <span v-if="planSourceNote(plan)">{{ planSourceNote(plan) }}</span>
        </div>
        <p v-if="plan.strategy" class="plan-strategy">执行方式：{{ displayText(plan.strategy) }}</p>
        <ol class="plan-steps">
          <li v-for="step in plan.steps" :key="step.id" :class="step.status">
            <span class="step-dot"></span>
            <div class="step-copy">
              <p><strong>{{ displayText(step.title) }}</strong><em v-if="step.source === 'user_followup'">追加要求</em></p>
              <small v-if="step.detail">{{ displayText(step.detail) }}</small>
            </div>
            <b>{{ stepStatusLabel(step) }}</b>
          </li>
        </ol>
        <details v-if="plan.acceptance?.length || plan.impact_areas?.length || plan.impact_projects?.length || plan.revisions?.length">
          <summary>验收标准与修订记录</summary>
          <div class="plan-extra">
            <div v-if="plan.impact_projects?.length || plan.impact_areas?.length"><strong>影响范围</strong><p>{{ [...(plan.impact_projects || []), ...(plan.impact_areas || [])].join('、') }}</p></div>
            <div v-if="plan.acceptance?.length"><strong>验收标准</strong><ul><li v-for="row in plan.acceptance" :key="row">{{ row }}</li></ul></div>
            <div v-if="plan.revisions?.length"><strong>修订记录</strong><ul><li v-for="row in plan.revisions" :key="row.count">第 {{ row.count }} 次：{{ row.feedback }}</li></ul></div>
          </div>
        </details>
      </article>
    </div>
    <div v-if="workItems.length" class="board-column">
      <header><strong>执行分工</strong><span>{{ workItems.length }} 项</span></header>
      <div class="work-list">
      <article v-for="item in workItems" :key="`${item.task_id}:${item.id}`" class="work-card" :class="item.status">
        <div class="card-head">
          <strong>{{ replayActorLabel({ label: item.target || item.owner || '执行成员' }) }}</strong>
          <em v-if="workItemTag(item)" class="task-tag">{{ workItemTag(item) }}</em>
          <b :class="['status-chip', item.status]">{{ itemStatusLabel(item) }}</b>
        </div>
        <p class="work-subject">{{ displayText(item.subject) }}</p>
        <small v-if="item.description && item.description !== item.subject" class="work-description">{{ displayText(item.description) }}</small>
        <div v-if="itemMeta(item).length" class="work-meta"><span v-for="row in itemMeta(item)" :key="row">{{ row }}</span></div>
        <p v-if="item.receipt_summary" class="work-receipt"><b v-if="item.receipt_status">执行结果 · {{ receiptStatusLabel(item) }}：</b>{{ displayText(item.receipt_summary) }}</p>
        <p v-if="item.blockers?.length" class="work-blockers">需要处理：{{ displayText(item.blockers.join('；')) }}</p>
        <p v-if="item.blocked_by?.length" class="work-depends">等待前置：{{ item.blocked_by.join('、') }}</p>
        <button v-if="item.evidence_ids?.length" type="button" class="work-evidence-link" @click="emit('open-evidence', item.evidence_ids[0])">查看这名成员的改动与验证</button>
      </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.task-replay-plan-board { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:12px; margin-bottom:14px; }
.board-column { min-width:0; border:1px solid var(--border-color); border-radius:8px; padding:10px 12px; background:var(--surface); }
.board-column>header { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px; }
.board-column>header strong { font-size:13px; }
.board-column>header span { color:var(--text-muted); font-size:11px; }
.plan-card,.work-card { border-top:1px solid var(--border-color); padding:9px 0; }
.plan-card:first-of-type,.work-card:first-of-type { border-top:0; }
.work-list { max-height:420px; overflow:auto; }
.card-head { display:flex; flex-wrap:wrap; align-items:center; gap:7px; }
.card-head>strong { min-width:0; font-size:12px; overflow-wrap:anywhere; }
.task-tag { padding:2px 5px; border-radius:4px; background:var(--bg-secondary); color:var(--text-muted); font-size:9px; font-style:normal; }
.status-chip { margin-left:auto; padding:3px 7px; border-radius:5px; background:var(--bg-secondary); color:var(--text-secondary); font-size:10px; font-weight:750; white-space:nowrap; }
.status-chip.completed { background:var(--success-soft); color:var(--accent-green); }
.status-chip.in_progress,.status-chip.reviewing,.status-chip.reworking { background:var(--accent-soft); color:var(--accent-blue); }
.status-chip.failed,.status-chip.blocked { background:var(--danger-soft); color:var(--accent-red); }
.status-chip.awaiting_confirmation,.status-chip.needs_confirmation { background:var(--warning-soft); color:var(--accent-yellow); }
.plan-progress { display:flex; align-items:center; gap:8px; margin-top:8px; color:var(--text-muted); font-size:10px; }
.progress-track { flex:1; height:5px; min-width:60px; border-radius:99px; background:var(--bg-secondary); overflow:hidden; }
.progress-track i { display:block; height:100%; border-radius:99px; background:var(--accent-blue); transition:width .3s; }
.plan-steps { display:grid; gap:6px; max-height:280px; margin:9px 0 0; padding:0; overflow:auto; list-style:none; }
.plan-steps li { display:grid; grid-template-columns:8px minmax(0,1fr) auto; gap:8px; align-items:start; }
.step-dot { width:7px; height:7px; margin-top:4px; border-radius:50%; background:#94a3b8; }
.plan-steps li.completed .step-dot { background:#16a34a; }
.plan-steps li.in_progress .step-dot,.plan-steps li.reviewing .step-dot,.plan-steps li.reworking .step-dot { background:#2563eb; }
.plan-steps li.needs_confirmation .step-dot,.plan-steps li.blocked .step-dot { background:#d97706; }
.plan-steps li.failed .step-dot { background:#dc2626; }
.plan-steps li.cancelled .step-dot,.plan-steps li.skipped .step-dot { background:#cbd5e1; }
.step-copy { min-width:0; }
.step-copy p { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:0; }
.step-copy strong { font-size:11px; font-weight:600; overflow-wrap:anywhere; }
.plan-steps li.completed .step-copy strong { color:var(--text-muted); }
.step-copy em { padding:1px 4px; border-radius:3px; background:var(--warning-soft); color:var(--accent-yellow); font-size:9px; font-style:normal; }
.step-copy small { display:block; margin-top:2px; color:var(--text-muted); font-size:10px; line-height:1.45; overflow-wrap:anywhere; }
.plan-steps li>b { color:var(--text-muted); font-size:9px; font-weight:700; white-space:nowrap; }
.plan-card details { margin-top:8px; }
.plan-card summary { color:var(--text-muted); font-size:10px; font-weight:700; cursor:pointer; }
.plan-extra { display:grid; gap:7px; padding:7px 0 0; font-size:10px; }
.plan-extra strong { display:block; margin-bottom:2px; color:var(--text-muted); }
.plan-extra p { margin:0; color:var(--text-secondary); overflow-wrap:anywhere; }
.plan-extra ul { margin:0; padding-left:16px; color:var(--text-secondary); }
.plan-extra li { margin:2px 0; overflow-wrap:anywhere; }
.work-subject { margin:6px 0 0; font-size:11px; line-height:1.5; overflow-wrap:anywhere; }
.work-description { display:block; margin-top:3px; color:var(--text-muted); font-size:10px; line-height:1.5; overflow-wrap:anywhere; }
.work-meta { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
.work-meta span { padding:2px 6px; border-radius:4px; background:var(--bg-secondary); color:var(--text-muted); font-size:9px; }
.work-receipt { margin:6px 0 0; padding:6px 8px; border-left:2px solid var(--accent-blue); background:var(--bg-secondary); color:var(--text-secondary); font-size:10px; line-height:1.5; overflow-wrap:anywhere; }
.work-receipt b { font-weight:750; }
.work-blockers { margin:6px 0 0; color:var(--accent-red); font-size:10px; overflow-wrap:anywhere; }
.work-depends { margin:4px 0 0; color:var(--text-muted); font-size:10px; overflow-wrap:anywhere; }
.plan-strategy { margin:5px 0 0; color:var(--text-muted); font-size:10px; overflow-wrap:anywhere; }
.work-evidence-link { margin-top:7px; padding:4px 8px; border:1px solid var(--accent-blue); border-radius:5px; background:transparent; color:var(--accent-blue); font-size:10px; font-weight:750; cursor:pointer; }
@media (max-width:720px) { .task-replay-plan-board { grid-template-columns:1fr; } .plan-steps { max-height:220px; } .work-list { max-height:320px; } }
</style>
