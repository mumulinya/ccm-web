<script setup>
import { computed } from 'vue'
import {
  compactStatusText,
  mainDecisionActionSummary,
  mainDecisionModeLabel,
  mainDecisionNextStep,
  mainDecisionPlanSummary,
  mainDecisionTone,
} from '../../composables/useMainAgentDisplay.js'
import { sanitizeUserFacingStructure } from '../../utils/agentDisplay.js'

const props = defineProps({
  status: { type: Object, default: null },
  groupAgentQa: { type: Array, default: () => [] },
  latestDecision: { type: Object, default: null },
})

const emit = defineEmits(['open-pipeline', 'locate-decision'])

const openQaCount = computed(() => {
  const statusCount = Number(props.status?.open_qa_count || 0)
  if (statusCount) return statusCount
  return props.groupAgentQa.filter(q => ['waiting', 'asking', 'queued', 'needs_user', 'timeout', 'manual'].includes(q.status)).length
})
const runningAgents = computed(() => {
  const agents = props.status?.running_child_agents || []
  return agents.length ? agents.join('、') : '无'
})
const blockerText = computed(() => {
  return [...(props.status?.blockers || []), ...(props.status?.needs || [])]
    .slice(0, 3)
    .map(x => compactStatusText(x))
    .join('；')
})
const latestCheckpoint = computed(() => props.status?.latest_progress_checkpoint || props.status?.latestProgressCheckpoint || null)
const recentCheckpoints = computed(() => {
  const items = props.status?.recent_progress_checkpoints || props.status?.recentProgressCheckpoints || props.status?.progress_checkpoints || props.status?.progressCheckpoints || []
  const latestKey = latestCheckpoint.value?.id || `${latestCheckpoint.value?.label || ''}:${latestCheckpoint.value?.detail || ''}`
  return (Array.isArray(items) ? items : [])
    .filter(item => item?.label)
    .filter(item => (item.id || `${item.label || ''}:${item.detail || ''}`) !== latestKey)
    .slice(-2)
})
const checkpointStatusText = (status) => ({
  done: '完成',
  active: '进行中',
  warning: '需关注',
  failed: '失败',
  pending: '等待',
}[status] || '更新')
const currentTodoSummary = computed(() => props.status?.current_todo_summary || props.status?.currentTodoSummary || null)
const currentTodoTone = computed(() => {
  const status = String(currentTodoSummary.value?.status || '').toLowerCase()
  if (['failed', 'error'].includes(status)) return 'failed'
  if (['needs_confirmation', 'needs_user', 'blocked'].includes(status)) return 'warning'
  if (['reviewing', 'reworking', 'in_progress', 'active', 'running'].includes(status)) return 'active'
  if (['completed', 'done'].includes(status)) return 'done'
  return 'pending'
})
const progressRefreshSummary = computed(() => {
  const summary = props.status?.progress_refresh_summary
    || props.status?.progressRefreshSummary
    || props.status?.latest_delivery_summary?.progress_refresh_summary
    || props.status?.latestDeliverySummary?.progressRefreshSummary
    || null
  const policy = summary?.display_policy || summary?.displayPolicy || {}
  if (!summary || policy.user_visible === false) return null
  return sanitizeUserFacingStructure(summary, {
    fallback: '进度刷新提醒已整理，技术细节已放入技术详情。',
    max: 260,
  })
})
const progressRefreshItems = computed(() => {
  const items = progressRefreshSummary.value?.review_items || progressRefreshSummary.value?.reviewItems || []
  return Array.isArray(items)
    ? items.map(item => compactStatusText(item, 180)).filter(Boolean).slice(0, 5)
    : []
})
const progressRefreshTone = computed(() => {
  const status = String(progressRefreshSummary.value?.status || '').toLowerCase()
  if (['requeued', 'connected', 'resumed'].includes(status)) return 'active'
  if (['failed', 'error'].includes(status)) return 'failed'
  if (['needs_refresh', 'stalled', 'blocked', 'waiting'].includes(status)) return 'warning'
  return 'active'
})
const childAgentStatusSummary = computed(() => props.status?.child_agent_status_summary || props.status?.childAgentStatusSummary || null)
const childAgentStatusTone = computed(() => {
  const status = String(childAgentStatusSummary.value?.status || '').toLowerCase()
  if (['needs_attention', 'failed', 'blocked'].includes(status)) return 'warning'
  if (['completed', 'done'].includes(status)) return 'done'
  return 'active'
})
const childAgentRows = computed(() => {
  const rows = Array.isArray(childAgentStatusSummary.value?.rows) ? childAgentStatusSummary.value.rows : []
  const priority = { failed: 5, blocked: 4, running: 3, pending: 2, completed: 1 }
  return [...rows]
    .filter(row => row?.agent)
    .sort((a, b) => (priority[String(b.status || '')] || 0) - (priority[String(a.status || '')] || 0))
    .slice(0, 4)
})
const childAgentStatusMeta = computed(() => {
  const summary = childAgentStatusSummary.value || {}
  const bits = []
  const running = summary.running_agents?.length || summary.runningAgents?.length || 0
  const waiting = summary.waiting_agents?.length || summary.waitingAgents?.length || 0
  const attention = summary.attention_agents?.length || summary.attentionAgents?.length || 0
  const completed = summary.completed_agents?.length || summary.completedAgents?.length || 0
  if (running) bits.push(`处理中 ${running}`)
  if (waiting) bits.push(`等待 ${waiting}`)
  if (attention) bits.push(`待补齐 ${attention}`)
  if (completed) bits.push(`完成 ${completed}`)
  return bits.join(' · ')
})
const deliveryReport = computed(() => props.status?.latest_delivery_summary?.delivery_report || props.status?.latestDeliverySummary?.deliveryReport || null)
const pickupSummary = computed(() => {
  const summary = props.status?.pickup_summary
    || props.status?.pickupSummary
    || props.status?.latest_delivery_summary?.pickup_summary
    || props.status?.latestDeliverySummary?.pickupSummary
    || deliveryReport.value?.pickup_summary
    || deliveryReport.value?.pickupSummary
    || null
  const policy = summary?.display_policy || summary?.displayPolicy || {}
  if (!summary || policy.user_visible === false) return null
  return sanitizeUserFacingStructure(summary, {
    fallback: '回来继续看的摘要已整理，技术细节已放入技术详情。',
    max: 260,
  })
})
const pickupReviewItems = computed(() => {
  const items = pickupSummary.value?.review_items || pickupSummary.value?.reviewItems || []
  return Array.isArray(items)
    ? items.map(item => compactStatusText(item, 180)).filter(Boolean).slice(0, 5)
    : []
})
const pickupTone = computed(() => {
  const status = String(pickupSummary.value?.status || '').toLowerCase()
  if (['failed', 'error'].includes(status)) return 'failed'
  if (['cancelled', 'canceled', 'stopped'].includes(status)) return 'cancelled'
  if (['needs_attention', 'needs_rework', 'blocked'].includes(status)) return 'warning'
  if (['done', 'completed', 'success', 'succeeded'].includes(status)) return 'done'
  return 'active'
})
const completionSummary = computed(() => {
  const summary = props.status?.completion_summary || props.status?.completionSummary || props.status?.latest_delivery_summary?.completion_summary || props.status?.latestDeliverySummary?.completionSummary || null
  if (summary) return summary
  if (!deliveryReport.value) return null
  return {
    status: deliveryReport.value.status,
    status_label: deliveryReport.value.status_label,
    headline: deliveryReport.value.headline,
    file_change_count: deliveryReport.value.files?.length || 0,
    verification_count: deliveryReport.value.verification?.length || 0,
    risk_count: deliveryReport.value.risks?.length || 0,
    next_action: Array.isArray(deliveryReport.value.next_action) ? deliveryReport.value.next_action[0] : deliveryReport.value.next_action,
  }
})
const completionMeta = computed(() => {
  const summary = completionSummary.value || {}
  const bits = []
  bits.push(`${summary.file_change_count || 0} 个文件`)
  bits.push(`${summary.verification_count || 0} 项验证`)
  if (summary.risk_count) bits.push(`${summary.risk_count} 个待关注`)
  return bits.join(' · ')
})
const isTerminalCompletion = computed(() => {
  const status = completionSummary.value?.status || props.status?.phase || ''
  return ['done', 'completed', 'failed', 'cancelled', 'canceled'].includes(String(status).toLowerCase())
})
const showLatestDecision = computed(() => !!props.latestDecision && !isTerminalCompletion.value)
const sessionContinuityText = computed(() => {
  return props.status?.latest_delivery_summary?.session_continuity
    ?.slice(0, 3)
    .map(s => `${s.project}:${s.executor}/${s.resume_mode}#${s.turn_count}`)
    .join('；') || ''
})
const failedGateText = computed(() => {
  const gates = props.status?.failed_gates || props.status?.failedGates || []
  return sanitizeUserFacingStructure(
    gates.map(g => g?.label || g?.reason || g?.id || g).join('、'),
    { fallback: '仍有验收检查需要补齐。', max: 220 }
  )
})
</script>

<template>
  <div class="main-agent-status-card">
    <div class="main-agent-status-head">
      <div>
        <span class="main-agent-status-title" title="群聊主 Agent 只负责当前群聊内的计划、派发、结果验收和交付报告；规则兜底协调器是本地运行时，不是新的群成员。">主 Agent 状态</span>
        <span class="main-agent-phase">{{ status?.label || '空闲' }}</span>
      </div>
      <button v-if="status?.latest_delivery_summary" class="btn btn-outline btn-xs" @click="emit('open-pipeline')">协作看板</button>
    </div>
    <div class="main-agent-status-grid">
      <div v-if="showLatestDecision" class="main-agent-status-item latest-decision" :class="mainDecisionTone(latestDecision)">
        <span class="item-label">最近决策</span>
        <span class="item-value">
          {{ mainDecisionModeLabel(latestDecision.mode) }} · {{ mainDecisionActionSummary(latestDecision) }}
        </span>
        <small>{{ mainDecisionNextStep(latestDecision) }}</small>
        <small v-if="mainDecisionPlanSummary(latestDecision)" class="decision-plan-preview">{{ mainDecisionPlanSummary(latestDecision) }}</small>
        <button class="btn btn-outline btn-xs" @click="emit('locate-decision')">定位到消息</button>
      </div>
      <div v-if="currentTodoSummary" class="main-agent-status-item current-todo" :class="currentTodoTone">
        <span class="item-label">当前步骤</span>
        <span class="item-value">{{ currentTodoSummary.active_form || currentTodoSummary.label }}</span>
        <small v-if="currentTodoSummary.detail">{{ currentTodoSummary.detail }}</small>
        <small v-if="currentTodoSummary.next_action" class="todo-next">下一步：{{ currentTodoSummary.next_action }}</small>
        <div class="todo-progress">
          <span>{{ currentTodoSummary.status_label || '进行中' }}</span>
          <strong>{{ currentTodoSummary.progress_label || `${currentTodoSummary.completed_count || 0}/${currentTodoSummary.total_count || 0}` }}</strong>
        </div>
      </div>
      <div v-if="progressRefreshSummary" class="main-agent-status-item progress-refresh-summary" :class="progressRefreshTone">
        <span class="item-label">{{ progressRefreshSummary.title || '进度刷新提醒' }}</span>
        <span class="item-value">{{ progressRefreshSummary.current_state || progressRefreshSummary.currentState || progressRefreshSummary.headline || '主 Agent 已整理当前进度刷新状态。' }}</span>
        <div v-if="progressRefreshItems.length" class="progress-refresh-list">
          <span v-for="item in progressRefreshItems" :key="item">{{ item }}</span>
        </div>
        <small v-if="progressRefreshSummary.next_action || progressRefreshSummary.nextAction" class="progress-refresh-next">下一步：{{ progressRefreshSummary.next_action || progressRefreshSummary.nextAction }}</small>
        <em>{{ progressRefreshSummary.status_label || progressRefreshSummary.statusLabel || '已整理' }}</em>
      </div>
      <div v-if="childAgentStatusSummary" class="main-agent-status-item child-agent-summary" :class="childAgentStatusTone">
        <span class="item-label">子 Agent 状态</span>
        <span class="item-value">{{ childAgentStatusSummary.summary_text || childAgentStatusSummary.summaryText || childAgentStatusSummary.title || '子 Agent 状态已整理。' }}</span>
        <small v-if="childAgentStatusSummary.next_action || childAgentStatusSummary.nextAction" class="child-agent-next">下一步：{{ childAgentStatusSummary.next_action || childAgentStatusSummary.nextAction }}</small>
        <div v-if="childAgentRows.length" class="child-agent-rows">
          <span v-for="row in childAgentRows" :key="row.agent" :class="row.status">
            <strong>{{ row.agent }}</strong>
            <em>{{ row.status_label || row.statusLabel || '处理中' }}</em>
            <small v-if="row.detail">{{ row.detail }}</small>
          </span>
        </div>
        <em class="child-agent-meta">{{ childAgentStatusMeta || childAgentStatusSummary.status_label || childAgentStatusSummary.statusLabel || '已整理' }}</em>
      </div>
      <div v-if="latestCheckpoint" class="main-agent-status-item progress-checkpoint" :class="latestCheckpoint.status">
        <span class="item-label">最近进展</span>
        <span class="item-value">{{ latestCheckpoint.label }}</span>
        <small v-if="latestCheckpoint.detail">{{ latestCheckpoint.detail }}</small>
        <div v-if="recentCheckpoints.length" class="recent-checkpoint-list">
          <span v-for="item in recentCheckpoints" :key="item.id || item.label">{{ item.label }}</span>
        </div>
        <em>{{ checkpointStatusText(latestCheckpoint.status) }}</em>
      </div>
      <div v-if="completionSummary" class="main-agent-status-item completion-summary" :class="completionSummary.status">
        <span class="item-label">交付总结</span>
        <span class="item-value">{{ completionSummary.headline || '主 Agent 已整理本轮交付结果。' }}</span>
        <small>{{ completionMeta }}</small>
        <small v-if="completionSummary.next_action">下一步：{{ completionSummary.next_action }}</small>
        <em>{{ completionSummary.status_label || '已整理' }}</em>
      </div>
      <div v-if="pickupSummary" class="main-agent-status-item pickup-summary" :class="pickupTone">
        <span class="item-label">{{ pickupSummary.title || '回来继续看这里' }}</span>
        <span class="item-value">{{ pickupSummary.current_state || pickupSummary.currentState || pickupSummary.headline || '主 Agent 已整理当前任务状态。' }}</span>
        <div v-if="pickupReviewItems.length" class="pickup-review-list">
          <span v-for="item in pickupReviewItems" :key="item">{{ item }}</span>
        </div>
        <small v-if="pickupSummary.resume_action || pickupSummary.resumeAction" class="pickup-next">下一步：{{ pickupSummary.resume_action || pickupSummary.resumeAction }}</small>
        <small v-if="pickupSummary.technical_hint || pickupSummary.technicalHint" class="pickup-tech-hint">{{ pickupSummary.technical_hint || pickupSummary.technicalHint }}</small>
        <em>{{ pickupSummary.status_label || pickupSummary.statusLabel || '已整理' }}</em>
      </div>
      <div class="main-agent-status-item">
        <span class="item-label">执行中</span>
        <span class="item-value">{{ runningAgents }}</span>
      </div>
      <div class="main-agent-status-item">
        <span class="item-label">开放问答</span>
        <span class="item-value">{{ openQaCount }} 个</span>
      </div>
      <div class="main-agent-status-item" v-if="status?.latest_delivery_summary && !completionSummary">
        <span class="item-label">交付进度</span>
        <span class="item-value">{{ status.latest_delivery_summary.actual_file_change_count || 0 }} 个文件 · {{ status.latest_delivery_summary.external_runner_verification_count || 0 }} 项验证</span>
      </div>
      <details class="main-agent-technical-detail">
        <summary>技术详情</summary>
        <div class="main-agent-status-item" v-if="status?.latest_delivery_summary?.lifecycle">
          <span class="item-label">任务阶段</span>
          <span class="item-value">{{ status.latest_delivery_summary.lifecycle.state }} · {{ status.latest_delivery_summary.lifecycle.terminal ? '终态' : '会话保留' }}</span>
        </div>
        <div class="main-agent-status-item" v-if="sessionContinuityText">
          <span class="item-label">执行器 / 会话</span>
          <span class="item-value">{{ sessionContinuityText }}</span>
        </div>
        <div class="main-agent-status-item" v-if="status?.latest_delivery_summary">
          <span class="item-label">文件 / 验证</span>
          <span class="item-value">{{ status.latest_delivery_summary.actual_file_change_count || 0 }} 个文件 · {{ status.latest_delivery_summary.external_runner_verification_count || 0 }} 条外部验证</span>
        </div>
        <div class="main-agent-status-item" v-if="status?.latest_delivery_summary?.reasoning_loop">
          <span class="item-label">推理闭环</span>
          <span class="item-value">计划 v{{ status.latest_delivery_summary.reasoning_loop.plan_version || 0 }} · 待证明 {{ status.latest_delivery_summary.reasoning_open_assertions || 0 }} · 偏差 {{ status.latest_delivery_summary.reasoning_deviation_count || 0 }} · 复盘 {{ status.latest_delivery_summary.reasoning_loop.postmortems?.length || 0 }}</span>
        </div>
        <div class="main-agent-status-item warning" v-if="status?.failed_gates?.length || status?.failedGates?.length">
          <span class="item-label">待补验收</span>
          <span class="item-value">{{ failedGateText }}</span>
        </div>
      </details>
      <div class="main-agent-status-item warning" v-if="status?.blockers?.length || status?.needs?.length">
        <span class="item-label">阻塞/待补</span>
        <span class="item-value">{{ blockerText }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-agent-status-card { margin: 0 0 16px; padding: 14px; border-radius: 14px; border: 1px solid rgba(59, 130, 246, 0.18); background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(14, 165, 233, 0.05)); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
.main-agent-status-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
.main-agent-status-title { font-size: 12px; font-weight: 900; color: var(--text-primary); margin-right: 8px; }
.main-agent-phase { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; background: rgba(59, 130, 246, 0.12); color: var(--accent-blue); font-size: 11px; font-weight: 800; }
.main-agent-status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
.main-agent-technical-detail{grid-column:1/-1;padding:7px 9px;border:1px solid var(--border-color);border-radius:9px;color:var(--text-muted)}
.main-agent-technical-detail>summary{cursor:pointer;font-size:10px;font-weight:800;user-select:none}
.main-agent-technical-detail[open]{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
.main-agent-technical-detail[open]>summary{grid-column:1/-1;margin-bottom:2px}
.main-agent-status-item { min-width: 0; padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(148, 163, 184, 0.16); }
.main-agent-status-item.latest-decision { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; border-color: rgba(59, 130, 246, 0.22); background: linear-gradient(135deg, rgba(255,255,255,.72), rgba(239,246,255,.58)); }
.main-agent-status-item.latest-decision .item-label,
.main-agent-status-item.latest-decision .item-value,
.main-agent-status-item.latest-decision small { grid-column: 1; }
.main-agent-status-item.latest-decision button { grid-column: 2; grid-row: 1 / span 4; align-self: center; }
.decision-plan-preview { color: var(--accent-blue) !important; font-weight: 800; }
.main-agent-status-item.latest-decision.active { border-color: rgba(124, 58, 237, 0.28); background: linear-gradient(135deg, rgba(250,245,255,.82), rgba(239,246,255,.64)); }
.main-agent-status-item.latest-decision.analysis { border-color: rgba(14, 165, 233, 0.25); background: linear-gradient(135deg, rgba(240,249,255,.82), rgba(224,242,254,.58)); }
.main-agent-status-item.latest-decision.idle { border-color: rgba(148, 163, 184, 0.18); background: rgba(255, 255, 255, 0.56); }
.main-agent-status-item.current-todo { grid-column:1/-1; position:relative; padding-right:92px; border-color:rgba(37,99,235,.22); background:rgba(239,246,255,.72); }
.main-agent-status-item.current-todo.done { border-color:rgba(34,197,94,.22); background:rgba(240,253,244,.74); }
.main-agent-status-item.current-todo.warning { border-color:rgba(245,158,11,.26); background:rgba(255,251,235,.78); }
.main-agent-status-item.current-todo.failed { border-color:rgba(239,68,68,.22); background:rgba(254,242,242,.78); }
.main-agent-status-item.current-todo .item-value { white-space:normal; line-height:1.4; }
.todo-next { color:var(--accent-blue) !important; font-weight:800; }
.todo-progress { position:absolute; right:10px; top:10px; display:grid; gap:2px; justify-items:end; }
.todo-progress span { color:var(--text-muted); font-size:10px; font-weight:900; white-space:nowrap; }
.todo-progress strong { padding:2px 7px; border-radius:999px; background:rgba(255,255,255,.72); color:var(--text-primary); font-size:10px; font-weight:900; }
.main-agent-status-item.progress-refresh-summary { grid-column:1/-1; position:relative; padding-right:92px; border-color:rgba(245,158,11,.24); background:rgba(255,251,235,.78); }
.main-agent-status-item.progress-refresh-summary.active { border-color:rgba(37,99,235,.22); background:rgba(239,246,255,.74); }
.main-agent-status-item.progress-refresh-summary.failed { border-color:rgba(239,68,68,.22); background:rgba(254,242,242,.78); }
.main-agent-status-item.progress-refresh-summary .item-value { white-space:normal; line-height:1.4; padding-right:0; }
.main-agent-status-item.progress-refresh-summary em { position:absolute; right:10px; top:10px; color:var(--text-muted); font-size:10px; font-style:normal; font-weight:900; white-space:nowrap; }
.progress-refresh-list { display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; }
.progress-refresh-list span { max-width:100%; padding:2px 7px; border-radius:999px; background:rgba(255,255,255,.7); border:1px solid rgba(148,163,184,.16); color:var(--text-muted); font-size:10.5px; font-weight:800; overflow-wrap:anywhere; }
.progress-refresh-next { color:var(--accent-blue) !important; font-weight:800; }
.main-agent-status-item.child-agent-summary { grid-column:1/-1; position:relative; padding-right:198px; border-color:rgba(20,184,166,.2); background:rgba(240,253,250,.72); }
.main-agent-status-item.child-agent-summary.done { border-color:rgba(34,197,94,.22); background:rgba(240,253,244,.74); }
.main-agent-status-item.child-agent-summary.warning { border-color:rgba(245,158,11,.26); background:rgba(255,251,235,.78); }
.main-agent-status-item.child-agent-summary .item-value { white-space:normal; line-height:1.4; }
.child-agent-next { color:var(--accent-blue) !important; font-weight:800; }
.child-agent-meta { position:absolute; right:10px; top:10px; max-width:180px; color:var(--text-muted); font-size:10px; font-style:normal; font-weight:900; line-height:1.35; text-align:right; overflow-wrap:anywhere; }
.child-agent-rows { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:6px; margin-top:8px; }
.child-agent-rows span { min-width:0; display:grid; gap:2px; padding:6px 7px; border:1px solid rgba(20,184,166,.14); border-left:3px solid #14b8a6; border-radius:8px; background:rgba(255,255,255,.66); }
.child-agent-rows span.completed { border-left-color:#22c55e; }
.child-agent-rows span.running { border-left-color:#0ea5e9; }
.child-agent-rows span.pending { border-left-color:#f59e0b; }
.child-agent-rows span.blocked,
.child-agent-rows span.failed { border-left-color:#ef4444; }
.child-agent-rows strong { min-width:0; color:var(--text-primary); font-size:11.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.child-agent-rows em { color:var(--text-muted); font-size:10px; font-style:normal; font-weight:900; }
.child-agent-rows small { color:var(--text-muted); font-size:10.5px; line-height:1.3; overflow-wrap:anywhere; }
.main-agent-status-item.progress-checkpoint { grid-column: 1 / -1; position: relative; padding-right: 72px; border-color: rgba(14, 165, 233, 0.22); background: rgba(240, 249, 255, 0.72); }
.main-agent-status-item.progress-checkpoint.done { border-color: rgba(34, 197, 94, 0.22); background: rgba(240, 253, 244, 0.74); }
.main-agent-status-item.progress-checkpoint.warning { border-color: rgba(245, 158, 11, 0.26); background: rgba(255, 251, 235, 0.78); }
.main-agent-status-item.progress-checkpoint.failed { border-color: rgba(239, 68, 68, 0.22); background: rgba(254, 242, 242, 0.78); }
.main-agent-status-item.progress-checkpoint em { position:absolute; right:10px; top:10px; color:var(--text-muted); font-size:10px; font-style:normal; font-weight:900; white-space:nowrap; }
.recent-checkpoint-list { display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; }
.recent-checkpoint-list span { min-width:0; max-width:220px; padding:2px 7px; border-radius:999px; background:rgba(255,255,255,.64); border:1px solid rgba(148,163,184,.18); color:var(--text-muted); font-size:10px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.main-agent-status-item.completion-summary { grid-column:1/-1; position:relative; padding-right:74px; border-color:rgba(34,197,94,.2); background:rgba(240,253,244,.72); }
.main-agent-status-item.completion-summary.failed { border-color:rgba(239,68,68,.22); background:rgba(254,242,242,.78); }
.main-agent-status-item.completion-summary.cancelled { border-color:rgba(148,163,184,.24); background:rgba(248,250,252,.78); }
.main-agent-status-item.completion-summary.active { border-color:rgba(14,165,233,.22); background:rgba(240,249,255,.72); }
.main-agent-status-item.completion-summary .item-value { white-space:normal; line-height:1.4; padding-right:0; }
.main-agent-status-item.completion-summary em { position:absolute; right:10px; top:10px; color:var(--text-muted); font-size:10px; font-style:normal; font-weight:900; white-space:nowrap; }
.main-agent-status-item.pickup-summary { grid-column:1/-1; position:relative; padding-right:78px; border-color:rgba(37,99,235,.2); background:rgba(239,246,255,.74); }
.main-agent-status-item.pickup-summary.done { border-color:rgba(34,197,94,.22); background:rgba(240,253,244,.74); }
.main-agent-status-item.pickup-summary.warning { border-color:rgba(245,158,11,.26); background:rgba(255,251,235,.78); }
.main-agent-status-item.pickup-summary.failed { border-color:rgba(239,68,68,.22); background:rgba(254,242,242,.78); }
.main-agent-status-item.pickup-summary.cancelled { border-color:rgba(148,163,184,.24); background:rgba(248,250,252,.78); }
.main-agent-status-item.pickup-summary .item-value { white-space:normal; line-height:1.4; padding-right:0; }
.main-agent-status-item.pickup-summary em { position:absolute; right:10px; top:10px; color:var(--text-muted); font-size:10px; font-style:normal; font-weight:900; white-space:nowrap; }
.pickup-review-list { display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; }
.pickup-review-list span { max-width:100%; padding:2px 7px; border-radius:999px; background:rgba(255,255,255,.68); border:1px solid rgba(148,163,184,.16); color:var(--text-muted); font-size:10.5px; font-weight:800; overflow-wrap:anywhere; }
.pickup-next { color:var(--accent-blue) !important; font-weight:800; }
.pickup-tech-hint { color:var(--text-muted) !important; font-weight:700; }
.main-agent-status-item.warning { border-color: rgba(245, 158, 11, 0.25); background: rgba(245, 158, 11, 0.08); }
.main-agent-status-item .item-label { display: block; font-size: 10px; color: var(--text-muted); font-weight: 800; margin-bottom: 4px; }
.main-agent-status-item .item-value { display: block; font-size: 12px; color: var(--text-primary); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.main-agent-status-item small { display:block; color: var(--text-muted); font-size: 11px; line-height: 1.35; overflow-wrap: anywhere; }
@media (max-width: 620px) {
  .main-agent-status-item.child-agent-summary { padding-right:10px; }
  .main-agent-status-item.progress-refresh-summary { padding-right:10px; }
  .main-agent-status-item.progress-refresh-summary em { position:static; display:block; margin-top:6px; }
  .main-agent-status-item.pickup-summary { padding-right:10px; }
  .main-agent-status-item.pickup-summary em { position:static; display:block; margin-top:6px; }
  .child-agent-meta { position:static; display:block; max-width:none; margin-top:6px; text-align:left; }
}
</style>
