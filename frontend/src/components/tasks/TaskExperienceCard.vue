<script setup>
import { computed } from 'vue'
import MainAgentDecisionCard from '../agents/MainAgentDecisionCard.vue'
import { getStreamlinedToolSummary, getStreamlinedUserText, getTechnicalDetailSections } from '../../utils/agentDisplay.js'

const props = defineProps({
  card: { type: Object, required: true },
  context: { type: String, default: 'task' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['action'])

const kicker = computed(() => props.card.kicker || ({
  group: 'AI 编程任务',
  project: '项目 Agent 任务',
  global: '跨项目 AI 任务',
}[props.context] || 'AI 编程任务'))

const agentLabel = (status) => ({
  done: '已完成', completed: '已完成', succeeded: '已完成',
  running: '执行中', in_progress: '执行中', reviewing: '检查中',
  pending: '等待中', queued: '等待中', blocked: '受阻',
  failed: '失败', partial: '需修复', cancelled: '已取消',
}[status] || status || '等待中')

const hasDelivery = computed(() => {
  const delivery = props.card.delivery || {}
  return delivery.acceptance_passed || delivery.headline || delivery.files?.length || delivery.verification?.length || delivery.risks?.length
})

const timelineStatusLabel = (status) => ({
  done: '完成',
  active: '进行中',
  warning: '注意',
  failed: '失败',
  pending: '等待',
}[status] || '等待')

const mainAgentDecision = computed(() => props.card.mainAgentDecision || props.card.main_agent_decision || props.card.technical?.mainAgentDecision || props.card.technical?.main_agent_decision || null)
const streamlinedText = computed(() => getStreamlinedUserText(props.card, props.card.next_action || props.card.goal || '任务正在处理。'))
const streamlinedToolSummary = computed(() => getStreamlinedToolSummary(props.card, props.card.completed?.join('，') || ''))
const technicalSections = computed(() => getTechnicalDetailSections(props.card, props.card.technical || {}))
const planMode = computed(() => props.card.plan_mode || props.card.planMode || null)
const workOrderPreview = computed(() => props.card.work_order_preview || props.card.workOrderPreview || null)
const executionStory = computed(() => props.card.execution_story || props.card.executionStory || null)
const acceptanceReview = computed(() => props.card.acceptance_review || props.card.acceptanceReview || null)
const agentCoordination = computed(() => props.card.agent_coordination || props.card.agentCoordination || null)
const runtimeKernel = computed(() => props.card.runtime_kernel || props.card.runtimeKernel || props.card.technical?.runtime_kernel || agentCoordination.value?.runtime_kernel || null)
const runtimeTooling = computed(() => runtimeKernel.value?.runtime_tooling || runtimeKernel.value?.runtimeTooling || null)
const riskLabel = (level) => ({
  high: '高风险',
  medium: '需确认',
  low: '低风险',
}[level] || level || '待评估')
const workOrderStatusLabel = (status) => ({
  planned: '计划中',
  waiting_confirmation: '待确认',
  dispatched: '已派发',
  running: '执行中',
  done: '已完成',
  failed: '失败',
  blocked: '受阻',
}[status] || status || '计划中')
const acceptanceStatusLabel = (status) => ({
  passed: '已通过',
  reviewing: '验收中',
  needs_rework: '需返工',
  pending: '等待证据',
}[status] || status || '等待证据')
const coordinationStatusLabel = (status) => ({
  healthy: '健康',
  needs_attention: '需关注',
  blocked: '受阻',
}[status] || status || '跟踪中')
const receiptGradeLabel = (grade) => ({
  good: '高质量',
  partial: '需补充',
  weak: '较弱',
}[grade] || grade || '待评分')
const contractInjectionLabel = (status) => ({
  ready: '待注入',
  ready_to_inject: '待注入',
  needs_target: '缺目标',
  needs_contract_changes: '缺契约',
  needs_injection: '待注入',
  needs_consumption: '待消费',
  needs_consumption_receipt: '待消费',
  needs_consumption_evidence: '待消费证据',
  injected: '已注入',
  consumed: '已消费',
  not_required: '不需要',
}[status] || status || '待同步')
const contractRowStatus = (row) => row?.consumed ? 'consumed' : row?.missing_reason || (row?.injected ? 'injected' : row?.status)
const formatRuntimePressure = (value) => {
  const n = Number(value || 0)
  if (!Number.isFinite(n) || n <= 0) return '0%'
  return `${Math.round(n * 10) / 10}%`
}
const runtimeToolingLabel = (status) => ({
  ready: '已同步',
  needs_attention: '需处理',
  not_recorded: '未记录',
}[status] || status || '未记录')
</script>

<template>
  <section class="task-experience-card" :class="[`context-${context}`, `phase-${card.phase}`]">
    <header class="task-card-head">
      <div>
        <span class="task-card-kicker">{{ kicker }}</span>
        <h4>{{ card.title || '开发任务' }}</h4>
      </div>
      <span class="task-card-phase">{{ card.phase_label || '正在处理' }}</span>
    </header>

    <div v-if="card.goal" class="task-card-goal">{{ card.goal }}</div>
    <div class="task-card-streamlined">
      <strong>{{ streamlinedText }}</strong>
      <small>{{ streamlinedToolSummary }}</small>
    </div>
    <div class="task-card-progress"><span :style="{ width: `${Math.max(0, Math.min(100, Number(card.progress || 0)))}%` }"></span></div>
    <div class="task-card-progress-label"><span>总体进度</span><strong>{{ Math.max(0, Math.min(100, Number(card.progress || 0))) }}%</strong></div>

    <div v-if="planMode" class="task-card-section plan-mode">
      <div class="plan-mode-head">
        <label>{{ planMode.title || '执行前计划' }}</label>
        <span :class="['plan-risk', planMode.risk?.level || 'low']">{{ riskLabel(planMode.risk?.level) }}</span>
      </div>
      <p v-if="planMode.risk?.summary">{{ planMode.risk.summary }}</p>
      <div class="plan-mode-grid">
        <div v-if="planMode.impact_scope?.projects?.length || planMode.impact_scope?.areas?.length">
          <strong>影响范围</strong>
          <small v-if="planMode.impact_scope?.projects?.length">项目：{{ planMode.impact_scope.projects.join('、') }}</small>
          <small v-if="planMode.impact_scope?.areas?.length">区域：{{ planMode.impact_scope.areas.join('、') }}</small>
        </div>
        <div v-if="planMode.read_only_exploration?.summary">
          <strong>只读探索</strong>
          <small>{{ planMode.read_only_exploration.summary }}</small>
        </div>
      </div>
      <div v-if="planMode.acceptance?.length" class="plan-mode-list">
        <strong>验收标准</strong>
        <ul><li v-for="item in planMode.acceptance" :key="item">{{ item }}</li></ul>
      </div>
      <div v-if="planMode.permission_boundaries?.length && card.phase === 'needs_user'" class="plan-mode-list permission">
        <strong>执行边界</strong>
        <ul><li v-for="item in planMode.permission_boundaries" :key="item">{{ item }}</li></ul>
      </div>
    </div>

    <div v-if="workOrderPreview?.orders?.length" class="task-card-section work-orders">
      <div class="section-head">
        <label>{{ workOrderPreview.title || '子 Agent 工作单' }}</label>
        <span>{{ workOrderPreview.requires_confirmation ? '确认后派发' : '可执行' }}</span>
      </div>
      <p v-if="workOrderPreview.summary">{{ workOrderPreview.summary }}</p>
      <div class="work-order-list">
        <article v-for="order in workOrderPreview.orders" :key="order.id || order.project" class="work-order">
          <header>
            <strong>{{ order.title || order.project }}</strong>
            <em>{{ workOrderStatusLabel(order.status) }}</em>
          </header>
          <small v-if="order.objective">{{ order.objective }}</small>
          <div class="work-order-cols">
            <div v-if="order.allowed_scope?.length">
              <b>允许范围</b>
              <ul><li v-for="item in order.allowed_scope.slice(0, 4)" :key="item">{{ item }}</li></ul>
            </div>
            <div v-if="order.forbidden_scope?.length">
              <b>不要做</b>
              <ul><li v-for="item in order.forbidden_scope.slice(0, 4)" :key="item">{{ item }}</li></ul>
            </div>
            <div v-if="order.acceptance?.length">
              <b>验收</b>
              <ul><li v-for="item in order.acceptance.slice(0, 4)" :key="item">{{ item }}</li></ul>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div v-if="agentCoordination" class="task-card-section agent-coordination" :class="agentCoordination.status">
      <div class="section-head">
        <label>{{ agentCoordination.title || '协作状态' }}</label>
        <span>{{ coordinationStatusLabel(agentCoordination.status) }} · {{ agentCoordination.health || 0 }}</span>
      </div>
      <div class="coord-grid">
        <div v-if="agentCoordination.handoff?.length">
          <strong>任务交接</strong>
          <small v-for="item in agentCoordination.handoff.slice(0, 4)" :key="item.agent">{{ item.agent }}：{{ item.detail }}</small>
        </div>
        <div v-if="agentCoordination.heartbeat?.length">
          <strong>进度</strong>
          <small v-for="item in agentCoordination.heartbeat.slice(0, 4)" :key="item.id">{{ item.text }}</small>
        </div>
        <div v-if="agentCoordination.contract_sync">
          <strong>接口/契约同步</strong>
          <small>{{ agentCoordination.contract_sync.summary }}</small>
        </div>
        <div v-if="agentCoordination.ack_review?.rows?.length">
          <strong>回执检查</strong>
          <small v-for="row in agentCoordination.ack_review.rows.slice(0, 4)" :key="row.agent">{{ row.agent }}：{{ row.reason }}</small>
        </div>
        <div v-if="agentCoordination.contract_transfer?.rows?.length">
          <strong>接口/契约传递</strong>
          <small v-if="agentCoordination.contract_injection_gate">{{ agentCoordination.contract_injection_gate.summary }}</small>
          <small v-for="row in (agentCoordination.contract_injection_gate?.rows?.length ? agentCoordination.contract_injection_gate.rows : agentCoordination.contract_transfer.rows).slice(0, 4)" :key="row.id || row.injection_id">
            {{ row.target }}：{{ row.endpoint || row.type }} · {{ contractInjectionLabel(contractRowStatus(row)) }}
            <code v-if="row.injection_id">{{ row.injection_id }}</code>
            <span v-if="row.consumption_reason"> · {{ row.consumption_reason }}</span>
          </small>
        </div>
      </div>
      <div v-if="agentCoordination.receipt_quality?.length" class="receipt-quality">
        <strong>回执质量</strong>
        <span v-for="row in agentCoordination.receipt_quality.slice(0, 5)" :key="row.agent">
          {{ row.agent || 'Agent' }} · {{ row.quality?.score || 0 }} · {{ receiptGradeLabel(row.quality?.grade) }}
        </span>
      </div>
      <div v-if="agentCoordination.targeted_rework?.length" class="targeted-rework">
        <strong>精准返工建议</strong>
        <ul>
          <li v-for="item in agentCoordination.targeted_rework.slice(0, 5)" :key="`${item.id}-${item.target}`">
            <span>{{ item.title }}<small v-if="item.target"> · {{ item.target }}</small>：{{ item.reason }}</span>
            <button type="button" :disabled="busy" @click="emit('action', { ...item, kind: 'targeted_rework', label: item.title || '精准返工', tone: item.tone || 'warning' })">执行</button>
          </li>
        </ul>
      </div>
      <div v-if="agentCoordination.coordination_events?.length" class="coord-events">
        <strong>协作记录</strong>
        <ol>
          <li v-for="event in agentCoordination.coordination_events.slice(-8)" :key="event.id" :class="event.status">
            <span>{{ event.label }}</span>
            <small v-if="event.detail">{{ event.detail }}</small>
          </li>
        </ol>
      </div>
      <small v-if="agentCoordination.next_action" class="coord-next">下一步：{{ agentCoordination.next_action }}</small>
    </div>

    <details v-if="runtimeKernel" class="task-card-section runtime-kernel" :class="{ active: runtimeKernel.ack_only?.active }">
      <summary class="runtime-kernel-summary">
        <strong>技术详情</strong>
        <span>可展开排查</span>
      </summary>
      <div class="runtime-grid">
        <div>
          <strong>生命周期</strong>
          <small>{{ runtimeKernel.lifecycle_count || 0 }} 条 · 阻塞 {{ runtimeKernel.blocked_count || 0 }}</small>
        </div>
        <div>
          <strong>ACK Gate</strong>
          <small>{{ runtimeKernel.ack_only?.active ? '只允许重写 ACK' : '未处于 ACK-only' }} · {{ runtimeKernel.ack_only?.count || 0 }}</small>
        </div>
        <div>
          <strong>派发</strong>
          <small>dispatch_worker {{ runtimeKernel.dispatch_worker_count || 0 }}</small>
        </div>
        <div>
          <strong>上下文</strong>
          <small>压力 {{ formatRuntimePressure(runtimeKernel.context_budget?.max_pressure) }}{{ runtimeKernel.context_budget?.compact_recommended ? ' · 建议压缩' : '' }}</small>
        </div>
        <div v-if="runtimeTooling">
          <strong>MCP/Skill Gate</strong>
          <small>{{ runtimeToolingLabel(runtimeTooling.status) }} · 快照 {{ runtimeTooling.snapshots?.length || 0 }} · Skill {{ runtimeTooling.invoked_skills?.length || 0 }}</small>
        </div>
      </div>
      <div v-if="runtimeKernel.worker_context_packet_ids?.length || runtimeKernel.injection_ids?.length || runtimeTooling?.snapshots?.length || runtimeTooling?.invoked_skills?.length" class="runtime-tags">
        <code v-for="id in runtimeKernel.worker_context_packet_ids?.slice(0, 4)" :key="`packet-${id}`">{{ id }}</code>
        <code v-for="id in runtimeKernel.injection_ids?.slice(0, 6)" :key="`inject-${id}`">{{ id }}</code>
        <code v-for="id in runtimeTooling?.snapshots?.slice(0, 4)" :key="`runtime-snapshot-${id}`">snapshot:{{ id }}</code>
        <code v-for="skill in runtimeTooling?.invoked_skills?.slice(0, 4)" :key="`runtime-skill-${skill.name || skill}`">Skill:{{ skill.name || skill }}</code>
      </div>
      <div v-if="runtimeTooling?.missing?.mcp?.length || runtimeTooling?.missing?.skill?.length || runtimeTooling?.errors?.length" class="runtime-tool-warnings">
        <small v-for="item in runtimeTooling.missing?.mcp?.slice(0, 3)" :key="`missing-mcp-${item}`">缺 MCP：{{ item }}</small>
        <small v-for="item in runtimeTooling.missing?.skill?.slice(0, 3)" :key="`missing-skill-${item}`">缺 Skill：{{ item }}</small>
        <small v-for="item in runtimeTooling.errors?.slice(0, 2)" :key="`runtime-error-${item}`">{{ item }}</small>
      </div>
      <ol v-if="runtimeKernel.latest_lifecycle?.length" class="runtime-events">
        <li v-for="event in runtimeKernel.latest_lifecycle.slice(-4)" :key="event.id || event.trace_event_id || `${event.action}-${event.phase}`">
          <span>{{ event.action || 'runtime' }}</span>
          <small>{{ event.phase || 'execute' }} · {{ event.status || 'planned' }}</small>
        </li>
      </ol>
    </details>

    <div v-if="card.active_agents?.length" class="task-card-section">
      <label>正在工作</label>
      <div class="task-card-pills"><span v-for="agent in card.active_agents" :key="agent">{{ agent }}</span></div>
    </div>

    <div v-if="card.agents?.length" class="task-card-agents">
      <div v-for="agent in card.agents" :key="agent.id || agent.name" class="task-card-agent">
        <strong>{{ agent.name }}</strong><span>{{ agentLabel(agent.status) }}</span>
        <small v-if="agent.summary">{{ agent.summary }}</small>
      </div>
    </div>

    <div v-if="executionStory?.steps?.length" class="task-card-section execution-story">
      <label>{{ executionStory.title || '执行过程' }}</label>
      <div class="execution-steps">
        <div v-for="step in executionStory.steps" :key="step.id" :class="['execution-step', step.status]">
          <span></span>
          <div>
            <strong>{{ step.label }}</strong>
            <small>{{ step.detail }}</small>
            <code v-if="step.evidence">{{ step.evidence }}</code>
          </div>
          <em>{{ timelineStatusLabel(step.status) }}</em>
        </div>
      </div>
    </div>

    <div v-if="card.workflow_timeline?.length" class="task-card-section task-card-flow">
      <label>协作流程</label>
      <ol>
        <li v-for="step in card.workflow_timeline" :key="step.id" :class="step.status">
          <span class="flow-dot"></span>
          <div>
            <strong>{{ step.label }}</strong>
            <small v-if="step.detail">{{ step.detail }}</small>
          </div>
          <em>{{ timelineStatusLabel(step.status) }}</em>
        </li>
      </ol>
    </div>

    <div v-if="card.agent_questions?.length" class="task-card-section task-card-qa">
      <label>Agent 问答</label>
      <div v-for="qa in card.agent_questions" :key="qa.id" class="task-card-qa-row" :class="qa.status">
        <strong>{{ qa.from }} → {{ qa.to }}</strong>
        <span>{{ qa.label }}</span>
        <small>{{ qa.question }}</small>
        <small v-if="qa.answer">答：{{ qa.answer }}</small>
      </div>
    </div>

    <div v-if="card.conflict_warnings?.length" class="task-card-section task-card-conflicts">
      <label>冲突保护</label>
      <div v-for="conflict in card.conflict_warnings" :key="conflict.id" class="task-card-conflict">
        <strong>{{ conflict.title }}</strong>
        <span>{{ conflict.detail }}</span>
        <code v-if="conflict.scopes?.length">{{ conflict.scopes.join('、') }}</code>
      </div>
    </div>

    <div v-if="card.completed?.length" class="task-card-section completed">
      <label>已完成</label>
      <ul><li v-for="item in card.completed" :key="item">{{ item }}</li></ul>
    </div>

    <div v-if="card.blockers?.length" class="task-card-section blockers">
      <label>{{ card.phase === 'needs_user' ? '需要你的决定' : '当前阻塞' }}</label>
      <ul><li v-for="item in card.blockers" :key="item">{{ item }}</li></ul>
    </div>

    <div v-if="card.next_action" class="task-card-next"><span>下一步</span><strong>{{ card.next_action }}</strong></div>

    <MainAgentDecisionCard v-if="mainAgentDecision" :decision="mainAgentDecision" compact @step-action="emit('action', $event)" />

    <div v-if="acceptanceReview" class="task-card-section acceptance-review" :class="acceptanceReview.status">
      <div class="section-head">
        <label>{{ acceptanceReview.title || '主 Agent 验收' }}</label>
        <span>{{ acceptanceStatusLabel(acceptanceReview.status) }}</span>
      </div>
      <p>{{ acceptanceReview.headline }}</p>
      <div class="acceptance-checks">
        <div v-for="check in acceptanceReview.checks" :key="check.id" :class="{ ok: check.ok }">
          <span>{{ check.ok ? '✓' : '!' }}</span>
          <strong>{{ check.label }}</strong>
          <small>{{ check.detail }}</small>
        </div>
      </div>
      <small v-if="acceptanceReview.next_action" class="acceptance-next">下一步：{{ acceptanceReview.next_action }}</small>
    </div>

    <div v-if="hasDelivery" class="task-card-delivery">
      <span>{{ card.delivery?.headline || (card.delivery?.acceptance_passed ? '改动和检查均已完成' : '已有交付进展') }}</span>
      <strong>{{ card.delivery?.files?.length || 0 }} 个文件 · {{ card.delivery?.verification?.length || 0 }} 项检查</strong>
    </div>

    <div v-if="card.delivery?.risks?.length" class="task-card-section blockers">
      <label>需要留意</label>
      <ul><li v-for="item in card.delivery.risks" :key="item">{{ item }}</li></ul>
    </div>

    <div v-if="card.actions?.length" class="task-card-actions">
      <button v-for="action in card.actions" :key="action.id" type="button" :disabled="busy" :class="['task-card-button', action.tone]" @click="emit('action', action)">{{ action.label }}</button>
    </div>

    <details v-if="card.technical" class="task-card-technical">
      <summary>技术详情</summary>
      <section v-for="section in technicalSections" :key="section.id" class="technical-section">
        <strong>{{ section.title }}</strong>
        <div v-for="item in section.items" :key="`${section.id}-${item.label}-${item.value}`">
          <span>{{ item.label }}</span>
          <code>{{ item.value }}</code>
          <button v-if="item.label === 'Trace' && card.technical.trace_id" type="button" :disabled="busy" @click="emit('action', { kind: 'view_trace', label: 'Trace 回放', trace_id: card.technical.trace_id })">回放</button>
        </div>
      </section>
      <section class="technical-section">
        <strong>任务记录</strong>
        <div v-if="card.task_id"><span>Task</span><code>{{ card.task_id }}</code></div>
        <div v-if="mainAgentDecision"><span>主Agent</span><code>{{ mainAgentDecision.mode }} / {{ mainAgentDecision.verify?.passed ? 'verified' : 'needs-check' }}</code></div>
      </section>
    </details>
  </section>
</template>

<style scoped>
.task-experience-card { margin-top:12px; padding:16px; border:1px solid rgba(37,99,235,.22); border-radius:14px; background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(239,246,255,.88)); color:var(--text-primary); box-shadow:0 10px 30px rgba(15,23,42,.05); }
.context-global { border-color:rgba(124,58,237,.24); background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(245,243,255,.9)); }
.context-project { border-color:rgba(5,150,105,.24); background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(236,253,245,.9)); }
.task-card-streamlined { display:grid; gap:3px; margin:9px 0 10px; padding:9px 10px; border:1px solid rgba(148,163,184,.16); border-radius:8px; background:rgba(255,255,255,.58); }
.task-card-streamlined strong { color:#334155; font-size:12.5px; line-height:1.45; overflow-wrap:anywhere; }
.task-card-streamlined small { color:#2563eb; font-size:11px; font-weight:800; line-height:1.35; overflow-wrap:anywhere; }
.task-card-head,.task-card-progress-label,.task-card-next,.task-card-delivery { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.task-card-head h4 { margin:3px 0 0; font-size:15px; }.task-card-kicker { font-size:11px; color:#64748b; }
.task-card-phase { padding:4px 9px; border-radius:999px; background:#dbeafe; color:#1d4ed8; font-size:12px; font-weight:700; white-space:nowrap; }
.phase-needs_user .task-card-phase,.phase-blocked .task-card-phase { background:#fef3c7; color:#92400e; }.phase-completed .task-card-phase { background:#dcfce7; color:#166534; }.phase-failed .task-card-phase { background:#fee2e2; color:#991b1b; }.phase-reverted .task-card-phase,.phase-cancelled .task-card-phase { background:#e2e8f0; color:#475569; }
.task-card-goal { margin-top:10px; color:#334155; line-height:1.55; }.task-card-progress { height:7px; margin-top:13px; overflow:hidden; border-radius:999px; background:#e2e8f0; }.task-card-progress span { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#2563eb,#06b6d4); transition:width .25s ease; }.context-global .task-card-progress span { background:linear-gradient(90deg,#7c3aed,#2563eb); }.context-project .task-card-progress span { background:linear-gradient(90deg,#059669,#06b6d4); }
.task-card-progress-label { margin-top:5px; font-size:11px; color:#64748b; }.task-card-section { margin-top:13px; }.task-card-section label { display:block; margin-bottom:6px; font-size:12px; font-weight:700; color:#475569; }.task-card-pills { display:flex; gap:6px; flex-wrap:wrap; }.task-card-pills span { padding:4px 8px; border-radius:999px; background:#e0f2fe; color:#0369a1; font-size:12px; }
.plan-mode { padding:12px; border:1px solid rgba(37,99,235,.16); border-radius:11px; background:rgba(239,246,255,.72); }.plan-mode-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }.plan-mode-head label { margin:0; }.plan-risk { padding:3px 8px; border-radius:999px; background:#dcfce7; color:#166534; font-size:11px; font-weight:800; white-space:nowrap; }.plan-risk.medium { background:#fef3c7; color:#92400e; }.plan-risk.high { background:#fee2e2; color:#991b1b; }.plan-mode p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; }.plan-mode-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:8px; margin-top:10px; }.plan-mode-grid div,.plan-mode-list { padding:8px 9px; border-radius:9px; background:rgba(255,255,255,.76); border:1px solid rgba(148,163,184,.22); }.plan-mode strong { display:block; margin-bottom:3px; color:#1e40af; font-size:12px; }.plan-mode small { display:block; color:#475569; font-size:12px; line-height:1.45; overflow-wrap:anywhere; }.plan-mode-list { margin-top:8px; }.plan-mode-list ul { margin:0; padding-left:18px; color:#475569; font-size:12px; line-height:1.55; }.plan-mode-list.permission strong { color:#92400e; }
.section-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }.section-head label { margin:0; }.section-head span { padding:3px 8px; border-radius:999px; background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:800; white-space:nowrap; }
.work-orders { padding:12px; border:1px solid rgba(14,165,233,.18); border-radius:11px; background:rgba(240,249,255,.72); }.work-orders p,.acceptance-review p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; }.work-order-list { display:grid; gap:8px; margin-top:10px; }.work-order { padding:10px; border-radius:10px; background:rgba(255,255,255,.8); border:1px solid rgba(148,163,184,.24); }.work-order header { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:5px; }.work-order header strong { color:#0f172a; font-size:12px; }.work-order header em { font-style:normal; color:#2563eb; font-size:11px; font-weight:800; white-space:nowrap; }.work-order > small { display:block; color:#475569; font-size:12px; line-height:1.45; }.work-order-cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:7px; margin-top:8px; }.work-order-cols div { padding:7px; border-radius:8px; background:rgba(248,250,252,.88); }.work-order-cols b { display:block; margin-bottom:3px; color:#0369a1; font-size:11px; }.work-order-cols ul { margin:0; padding-left:15px; color:#64748b; font-size:11px; line-height:1.45; }
.agent-coordination { padding:12px; border-radius:11px; border:1px solid rgba(99,102,241,.18); background:rgba(238,242,255,.68); }.agent-coordination.needs_attention { border-color:rgba(245,158,11,.24); background:#fffbeb; }.agent-coordination.blocked { border-color:rgba(239,68,68,.22); background:#fef2f2; }.coord-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(165px,1fr)); gap:8px; margin-top:10px; }.coord-grid div,.receipt-quality,.targeted-rework,.coord-events { padding:8px 9px; border-radius:9px; border:1px solid rgba(148,163,184,.22); background:rgba(255,255,255,.74); }.coord-grid strong,.receipt-quality strong,.targeted-rework strong,.coord-events strong { display:block; margin-bottom:4px; color:#3730a3; font-size:12px; }.coord-grid small { display:block; color:#475569; font-size:11px; line-height:1.45; overflow-wrap:anywhere; }.coord-grid small code { display:block; width:max-content; max-width:100%; margin-top:3px; padding:2px 5px; border-radius:6px; background:#eef2ff; color:#3730a3; font-size:10px; white-space:normal; overflow-wrap:anywhere; }.receipt-quality,.targeted-rework,.coord-events { margin-top:8px; }.receipt-quality { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }.receipt-quality strong { width:100%; margin-bottom:0; }.receipt-quality span { padding:3px 7px; border-radius:999px; background:#eef2ff; color:#3730a3; font-size:11px; font-weight:800; }.targeted-rework ul { display:grid; gap:6px; margin:0; padding-left:0; color:#475569; font-size:11px; line-height:1.5; list-style:none; }.targeted-rework li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; }.targeted-rework small { color:#64748b; }.targeted-rework button { padding:3px 8px; border:1px solid #fde68a; border-radius:7px; background:#fffbeb; color:#92400e; font-size:11px; font-weight:800; cursor:pointer; }.targeted-rework button:disabled { opacity:.55; cursor:not-allowed; }.coord-events ol { display:grid; gap:5px; margin:0; padding:0; list-style:none; }.coord-events li { display:grid; grid-template-columns:minmax(0,1fr); padding:6px 7px; border-radius:7px; background:#f8fafc; border-left:3px solid #cbd5e1; }.coord-events li.ok { border-left-color:#22c55e; }.coord-events li.warn { border-left-color:#f59e0b; }.coord-events span { color:#334155; font-size:11px; font-weight:800; }.coord-events small { color:#64748b; font-size:10.5px; line-height:1.35; }.coord-next { display:block; margin-top:8px; color:#4338ca; font-size:11px; font-weight:800; }
.runtime-kernel { padding:10px 12px; border-radius:11px; border:1px solid rgba(15,118,110,.2); background:rgba(240,253,250,.72); }.runtime-kernel.active { border-color:rgba(217,119,6,.28); background:#fffbeb; }.runtime-kernel-summary { display:flex; align-items:center; justify-content:space-between; gap:10px; cursor:pointer; user-select:none; }.runtime-kernel-summary strong { color:#0f766e; font-size:12px; }.runtime-kernel-summary span { color:#64748b; font-size:10.5px; font-weight:800; }.runtime-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:8px; margin-top:10px; }.runtime-grid div { padding:8px 9px; border-radius:9px; border:1px solid rgba(148,163,184,.22); background:rgba(255,255,255,.78); }.runtime-grid strong { display:block; margin-bottom:4px; color:#0f766e; font-size:12px; }.runtime-grid small { display:block; color:#475569; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.runtime-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }.runtime-tags code { max-width:100%; padding:3px 6px; border-radius:6px; background:#ccfbf1; color:#0f766e; font-size:10.5px; white-space:normal; overflow-wrap:anywhere; }.runtime-tool-warnings { display:grid; gap:4px; margin-top:8px; padding:7px 8px; border-radius:8px; background:#fffbeb; border:1px solid rgba(245,158,11,.22); }.runtime-tool-warnings small { color:#92400e; font-size:10.5px; line-height:1.35; overflow-wrap:anywhere; }.runtime-events { display:grid; gap:5px; margin:9px 0 0; padding:0; list-style:none; }.runtime-events li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; padding:6px 7px; border-radius:7px; background:rgba(255,255,255,.78); border-left:3px solid #14b8a6; }.runtime-events span { color:#134e4a; font-size:11px; font-weight:800; overflow-wrap:anywhere; }.runtime-events small { color:#64748b; font-size:10.5px; white-space:nowrap; }
.execution-story { padding:12px; border-radius:11px; background:rgba(248,250,252,.84); border:1px solid rgba(148,163,184,.22); }.execution-steps { display:grid; gap:6px; }.execution-step { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:8px; align-items:start; padding:8px; border-radius:9px; background:rgba(255,255,255,.8); border:1px solid transparent; }.execution-step > span { width:9px; height:9px; margin-top:4px; border-radius:999px; background:#cbd5e1; box-shadow:0 0 0 3px rgba(148,163,184,.14); }.execution-step.done > span { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.14); }.execution-step.active { border-color:rgba(37,99,235,.18); }.execution-step.active > span { background:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.16); }.execution-step.warning > span { background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.16); }.execution-step.failed > span { background:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.16); }.execution-step strong { display:block; color:#334155; font-size:12px; }.execution-step small { display:block; margin-top:2px; color:#64748b; font-size:11px; line-height:1.45; }.execution-step code { display:block; width:max-content; max-width:100%; margin-top:4px; padding:2px 5px; border-radius:6px; background:#f1f5f9; color:#475569; font-size:10px; overflow-wrap:anywhere; white-space:normal; }.execution-step em { align-self:center; font-style:normal; color:#64748b; font-size:10px; white-space:nowrap; }
.acceptance-review { padding:12px; border-radius:11px; border:1px solid rgba(245,158,11,.24); background:#fffbeb; }.acceptance-review.passed { border-color:rgba(34,197,94,.24); background:#f0fdf4; }.acceptance-review .section-head span { background:#fef3c7; color:#92400e; }.acceptance-review.passed .section-head span { background:#dcfce7; color:#166534; }.acceptance-checks { display:grid; grid-template-columns:repeat(auto-fit,minmax(145px,1fr)); gap:7px; margin-top:10px; }.acceptance-checks div { display:grid; grid-template-columns:auto 1fr; gap:2px 6px; padding:8px; border-radius:9px; background:rgba(255,255,255,.72); border:1px solid rgba(245,158,11,.18); }.acceptance-checks div.ok { border-color:rgba(34,197,94,.18); }.acceptance-checks span { grid-row:1/3; width:17px; height:17px; border-radius:999px; display:grid; place-items:center; background:#fef3c7; color:#92400e; font-size:11px; font-weight:900; }.acceptance-checks div.ok span { background:#dcfce7; color:#166534; }.acceptance-checks strong { color:#334155; font-size:12px; }.acceptance-checks small { color:#64748b; font-size:11px; line-height:1.35; }.acceptance-next { display:block; margin-top:8px; color:#92400e; font-size:11px; font-weight:700; }
.task-card-agents { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:7px; margin-top:12px; }.task-card-agent { display:grid; grid-template-columns:1fr auto; gap:3px 8px; padding:8px 10px; border-radius:9px; background:rgba(255,255,255,.82); border:1px solid #e2e8f0; font-size:12px; }.task-card-agent small { grid-column:1/-1; color:#64748b; }.task-card-section ul { margin:0; padding-left:18px; color:#475569; font-size:12px; line-height:1.65; }.task-card-section.completed li::marker { color:#16a34a; }.task-card-section.blockers { padding:10px; border-radius:9px; background:#fff7ed; }
.task-card-flow ol { display:grid; gap:7px; margin:0; padding:0; list-style:none; }.task-card-flow li { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:start; gap:8px; padding:8px 9px; border:1px solid #e2e8f0; border-radius:9px; background:rgba(255,255,255,.74); font-size:12px; }.task-card-flow strong { display:block; color:#334155; }.task-card-flow small { display:block; margin-top:2px; color:#64748b; line-height:1.45; }.task-card-flow em { align-self:center; font-style:normal; font-size:10px; color:#64748b; }.flow-dot { width:9px; height:9px; margin-top:4px; border-radius:999px; background:#cbd5e1; box-shadow:0 0 0 3px rgba(148,163,184,.16); }.task-card-flow li.done .flow-dot { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.14); }.task-card-flow li.active .flow-dot { background:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.16); }.task-card-flow li.warning .flow-dot { background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.18); }.task-card-flow li.failed .flow-dot { background:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.16); }
.task-card-qa { display:grid; gap:7px; }.task-card-qa-row { display:grid; grid-template-columns:1fr auto; gap:3px 8px; padding:8px 9px; border-radius:9px; border:1px solid #e2e8f0; background:rgba(255,255,255,.72); font-size:12px; }.task-card-qa-row strong { color:#334155; }.task-card-qa-row span { color:#2563eb; font-weight:700; font-size:11px; }.task-card-qa-row small { grid-column:1/-1; color:#64748b; line-height:1.45; }.task-card-qa-row.waiting span { color:#92400e; }.task-card-qa-row.accepted span { color:#166534; }
.task-card-conflicts { padding:10px; border-radius:9px; background:#fffbeb; }.task-card-conflict { display:grid; gap:4px; font-size:12px; }.task-card-conflict + .task-card-conflict { margin-top:8px; padding-top:8px; border-top:1px solid rgba(245,158,11,.22); }.task-card-conflict strong { color:#92400e; }.task-card-conflict span { color:#64748b; line-height:1.45; }.task-card-conflict code { width:max-content; max-width:100%; padding:3px 6px; border-radius:6px; background:rgba(245,158,11,.12); color:#92400e; overflow-wrap:anywhere; }
.task-card-next { margin-top:13px; padding:10px 12px; border-radius:9px; background:#eff6ff; font-size:12px; }.task-card-next span { color:#64748b; }.task-card-next strong { color:#1e40af; text-align:right; }.task-card-delivery { margin-top:10px; color:#166534; font-size:12px; }.task-card-delivery span { max-width:70%; }.task-card-actions { display:flex; flex-wrap:wrap; gap:7px; margin-top:13px; }.task-card-button { padding:6px 10px; border:1px solid #cbd5e1; border-radius:7px; background:#fff; color:#334155; cursor:pointer; font-size:12px; }.task-card-button:disabled { opacity:.55; cursor:not-allowed; }.task-card-button.primary { background:#2563eb; border-color:#2563eb; color:#fff; }.task-card-button.danger { color:#b91c1c; border-color:#fecaca; }.task-card-button.warning { color:#92400e; border-color:#fde68a; background:#fffbeb; }
.task-card-technical { margin-top:12px; font-size:11px; color:#64748b; }.task-card-technical summary { cursor:pointer; font-weight:800; }.technical-section { display:grid; gap:5px; margin-top:8px; padding:8px; border:1px solid rgba(148,163,184,.18); border-radius:8px; background:rgba(248,250,252,.72); }.technical-section>strong { color:#334155; font-size:11.5px; }.task-card-technical div { display:grid; grid-template-columns:70px minmax(0,1fr) auto; gap:8px; align-items:center; margin-top:0; }.task-card-technical code { overflow-wrap:anywhere; color:#475569; }.task-card-technical button { padding:2px 7px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; color:#334155; font-size:10.5px; font-weight:800; cursor:pointer; }.task-card-technical button:disabled { opacity:.55; cursor:not-allowed; }
:global([data-theme="dark"]) .task-experience-card { background:linear-gradient(145deg,rgba(15,23,42,.96),rgba(30,41,59,.92)); border-color:rgba(96,165,250,.3); }.context-global:global([data-theme="dark"]) { border-color:rgba(167,139,250,.35); }.context-project:global([data-theme="dark"]) { border-color:rgba(52,211,153,.32); }.task-experience-card :is(.task-card-goal,.task-card-agent,.task-card-section ul,.task-card-next strong,.task-card-technical code) { color:inherit; }
</style>
