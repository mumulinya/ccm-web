<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDot,
  Clock3,
  FileCode2,
  FileDiff,
  FolderOpen,
  Gauge,
  KeyRound,
  ListChecks,
  LoaderCircle,
  PlayCircle,
  RotateCcw,
  Settings2,
  ShieldCheck,
  UserRound,
  XCircle,
} from '@lucide/vue'
import TaskExperiencePanel from './TaskExperiencePanel.vue'
import { getDeliveryReport, sanitizeUserFacingAgentText } from '../../utils/agentDisplay.js'
import { replayActorLabel, replayFileStatusLabel, replayWorkStatusLabel } from '../../utils/taskReplayPresentation.js'
import {
  buildTaskJourneyPresentation,
  taskStageLabelForContext,
} from '../../utils/taskJourneyPresentation.js'
import { useTaskRuntimeStatus } from '../../composables/useTaskRuntimeStatus.js'

const props = defineProps({
  card: { type: Object, required: true },
  context: { type: String, default: 'task' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['action'])
const fullRecordOpen = ref(false)

const asList = (value) => Array.isArray(value)
  ? value.filter(Boolean)
  : value === undefined || value === null || value === '' ? [] : [value]
const clean = (value, fallback = '', max = 320) => sanitizeUserFacingAgentText(value, fallback, max)
const isSelfVerificationMode = () => props.card.acceptance_mode === 'main_agent_self_verification'
  || props.card.acceptanceMode === 'main_agent_self_verification'
  || props.card.test_agent_enabled === false
  || props.card.testAgentEnabled === false
const friendlyText = (value, fallback = '', max = 320) => clean(value, fallback, max)
  .replace(/TestAgent(?:（独立验收）)?/gi, isSelfVerificationMode() ? '主 Agent自验' : 'TestAgent（独立验收）')
  .replace(/\bACK\b/g, '接单确认')
  .replace(/子\s*Agent/g, '执行成员')
  .replace(/工作单/g, '执行任务')
  .replace(/工作项/g, '执行步骤')
  .replace(/回执/g, '执行结果')
const itemText = (item, fallback = '') => {
  if (typeof item === 'string' || typeof item === 'number') return friendlyText(String(item), fallback, 360)
  if (!item || typeof item !== 'object') return fallback
  return friendlyText(
    item.headline || item.title || item.label || item.summary || item.detail || item.result
      || item.message || item.command || item.name || item.path || item.subject || item.description,
    fallback,
    360,
  )
}
const uniqueText = (items, limit = 12) => [...new Set(asList(items).map(item => itemText(item)).filter(Boolean))].slice(0, limit)

const {
  elapsedLabel,
  heartbeatText,
  heartbeatTone,
  lastActivityLabel,
  nextAction,
  phase,
  retrySummary,
  terminal,
} = useTaskRuntimeStatus(() => props.card)
const progress = computed(() => {
  if (terminal.value) return 100
  const raw = Number(props.card.progress)
  if (Number.isFinite(raw)) return Math.max(0, Math.min(100, Math.round(raw)))
  return ({ understanding: 6, planning: 10, queued: 18, dispatching: 28, executing: 55, in_progress: 55, running: 55, reviewing: 85, testing: 85, accepting: 92, reworking: 68, needs_user: 72, environment_blocked: 72, recovery_required: 72, blocked: 62, completed: 100, done: 100, succeeded: 100, failed: 100, cancelled: 100, reverted: 100 })[phase.value] ?? 10
})

const report = computed(() => getDeliveryReport(props.card) || {})
const completion = computed(() => props.card.completion_card || props.card.completionCard || report.value.completion_card || report.value.completionCard || {})
const successfulTerminal = computed(() => ['completed', 'done', 'succeeded'].includes(phase.value))
const unsuccessfulTerminal = computed(() => ['failed', 'blocked', 'environment_blocked', 'recovery_required', 'cancelled', 'canceled', 'reverted'].includes(phase.value))
const journey = computed(() => buildTaskJourneyPresentation(props.card, props.context, phase.value))
const phaseMeta = computed(() => {
  const meta = journey.value.role.phaseMeta
  const icon = meta.kind === 'planning' || meta.kind === 'queued'
    ? Clock3
    : meta.kind === 'reviewing'
      ? ShieldCheck
      : meta.kind === 'success'
        ? CheckCircle2
        : meta.kind === 'muted'
          ? CircleDot
          : meta.kind === 'warning' && phase.value === 'reworking'
            ? RotateCcw
            : ['warning', 'danger'].includes(meta.kind)
              ? AlertTriangle
              : LoaderCircle
  const tone = ({
    planning: 'active',
    queued: 'pending',
    running: 'active',
    reviewing: 'review',
    warning: 'warning',
    danger: 'danger',
    success: 'success',
    muted: 'muted',
  })[meta.kind] || 'active'
  return [meta.label, icon, tone]
})
const reportSection = (ids) => asList(report.value.sections)
  .filter(section => ids.includes(String(section?.id || '').toLowerCase()))
  .flatMap(section => asList(section?.items))

const headline = computed(() => friendlyText(
  completion.value.headline || report.value.headline || props.card.delivery?.headline || props.card.current_focus
    || props.card.currentFocus || props.card.status_detail || props.card.statusDetail || props.card.summary
    || props.card.goal || '任务状态已整理。',
  '任务状态已整理。',
  420,
))
const userGoal = computed(() => friendlyText(
  props.card.goal || props.card.user_goal || props.card.userGoal || props.card.request || report.value.goal || props.card.title,
  '本任务未记录单独的用户目标。',
  520,
))
const completedItems = computed(() => uniqueText([
  ...asList(completion.value.highlights),
  ...asList(props.card.completed),
  ...asList(props.card.delivery?.completed),
  ...reportSection(['completed', 'outcome', 'delivery']),
], 8))
const verificationItems = computed(() => uniqueText([
  ...asList(completion.value.verification),
  ...asList(report.value.verification),
  ...asList(props.card.delivery?.verification),
  ...reportSection(['verification', 'acceptance', 'independent_review']),
], 12))
const riskItems = computed(() => uniqueText([
  ...asList(completion.value.risks),
  ...asList(report.value.risks),
  ...asList(props.card.delivery?.risks),
  ...asList(props.card.blockers),
  ...reportSection(['risks', 'unresolved', 'blockers']),
], 8))

const workItems = computed(() => asList(props.card.work_items || props.card.workItems))
const workCounts = computed(() => {
  const configured = props.card.work_item_summary?.counts || props.card.workItemSummary?.counts || {}
  const completed = Number(configured.completed ?? workItems.value.filter(item => ['completed', 'done', 'succeeded'].includes(String(item?.status || '').toLowerCase())).length)
  return { completed, total: Number(props.card.work_item_summary?.total || props.card.workItemSummary?.total || workItems.value.length || 0) }
})

const sourceStages = computed(() => {
  const workchain = props.card.display_stream?.workchain || props.card.displayStream?.workchain || props.card.workchain || {}
  const candidates = [
    props.card.lifecycle_stages,
    props.card.lifecycleStages,
    workchain.stages,
  ]
  return candidates.find(value => Array.isArray(value) && value.length) || []
})
const normalizeStageStatus = (status) => {
  const value = String(status || '').toLowerCase()
  if (['done', 'completed', 'succeeded', 'passed', 'approved'].includes(value)) return 'done'
  if (['failed', 'blocked', 'needs_user', 'needs_confirmation'].includes(value)) return 'warning'
  if (['running', 'active', 'in_progress', 'reviewing', 'testing', 'reworking', 'accepting'].includes(value)) return 'active'
  return 'pending'
}
const inferredStages = computed(() => {
  const labels = journey.value.role.stages
  const current = journey.value.role.currentStage
  return labels.map((label, index) => ({
    label,
    detail: index === current ? headline.value : '',
    status: index < current || (current === 5 && index === current) ? 'done' : index === current ? (['failed', 'blocked', 'needs_user', 'environment_blocked', 'recovery_required'].includes(phase.value) ? 'warning' : 'active') : 'pending',
  }))
})
const normalizeDeliveryStage = (stage) => {
  if (!/完成交付|交付完成|最终交付|总结交付|汇总交付/.test(stage.label) || successfulTerminal.value) return stage
  if (['cancelled', 'canceled'].includes(phase.value)) return { ...stage, label: '已停止，未交付', status: 'warning' }
  if (phase.value === 'reverted') return { ...stage, label: '已撤销，未交付', status: 'warning' }
  if (unsuccessfulTerminal.value) return { ...stage, label: '未完成交付', status: 'warning' }
  return { ...stage, status: 'pending' }
}
const stages = computed(() => (sourceStages.value.length
  ? sourceStages.value.slice(0, 10).map((stage, index) => ({
      label: taskStageLabelForContext(itemText(stage, `阶段 ${index + 1}`), props.context, props.card),
      detail: friendlyText(stage?.detail || stage?.active_form || stage?.activeForm || stage?.next_action || stage?.nextAction || '', '', 260),
      status: normalizeStageStatus(stage?.status || stage?.state),
    }))
  : inferredStages.value).map(normalizeDeliveryStage))

const acceptanceSource = computed(() => {
  const alignmentChecks = asList(props.card.plan_alignment?.checks || props.card.planAlignment?.checks)
    .filter(item => String(item?.id || '').startsWith('criterion_'))
  if (alignmentChecks.length) return alignmentChecks
  return asList(props.card.acceptance_review?.checks || props.card.acceptanceReview?.checks)
})
const acceptanceMethod = (item) => {
  const explicit = item?.verification_method || item?.verificationMethod || item?.method
  if (explicit) {
    const label = friendlyText(explicit, '', 140)
    return props.context === 'global' && /TestAgent|独立验收/i.test(label)
      ? `核对下游${label}`
      : label
  }
  const id = String(item?.id || '').toLowerCase()
  if (props.context === 'global') {
    if (id.includes('browser') || id.includes('ui')) return '核对下游页面验收证据'
    if (id.includes('test') || id.includes('verification') || id.includes('build')) return '核对下游测试或构建结果'
    if (id.includes('code') || id.includes('file') || id.includes('change')) return '汇总下游真实文件改动'
    return '全局 Agent 汇总下游验收结果'
  }
  if (id.includes('browser') || id.includes('ui')) return isSelfVerificationMode() ? '主 Agent页面自验' : 'TestAgent 页面验收'
  if (id.includes('test') || id.includes('verification') || id.includes('build')) return '测试或构建结果核对'
  if (id.includes('code') || id.includes('file') || id.includes('change')) return '真实文件改动核对'
  return '主 Agent 按验收标准核对'
}
const acceptanceRows = computed(() => acceptanceSource.value.slice(0, 10).map((item, index) => {
  const evidenceItems = uniqueText(item?.evidence || item?.evidence_items || item?.evidenceItems, 4)
  const pending = item?.ok !== true && !unsuccessfulTerminal.value && !successfulTerminal.value
  return {
    id: item?.id || `criterion_${index + 1}`,
    criterion: itemText(item, `验收标准 ${index + 1}`),
    method: acceptanceMethod(item),
    evidence: evidenceItems.length ? evidenceItems.join('；') : friendlyText(item?.detail, pending ? '等待执行后生成验证证据' : '未记录可核验证据', 260),
    status: item?.ok === true ? 'passed' : pending ? 'pending' : 'failed',
    evidenceId: item?.evidence_id || item?.evidenceId || '',
  }
}))

const finiteNumber = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed)
  }
  return null
}
const usageOverview = computed(() => {
  const usage = props.card.usage_summary || props.card.usageSummary || props.card.provider_usage || props.card.providerUsage || {}
  const runtime = props.card.runtime_status || props.card.runtimeStatus || {}
  const kernel = props.card.technical?.runtime_kernel || props.card.technical?.runtimeKernel || {}
  const input = finiteNumber(usage.input_tokens, usage.inputTokens, props.card.input_tokens, props.card.inputTokens)
  const output = finiteNumber(usage.output_tokens, usage.outputTokens, props.card.output_tokens, props.card.outputTokens)
  const cacheRead = finiteNumber(usage.cache_read_input_tokens, usage.cacheReadInputTokens)
  const cacheCreate = finiteNumber(usage.cache_creation_input_tokens, usage.cacheCreationInputTokens)
  const explicitTotal = finiteNumber(usage.total_tokens, usage.totalTokens, usage.accounted_total_tokens)
  const recordedParts = [input, output, cacheRead, cacheCreate].filter(value => value !== null)
  const tokens = explicitTotal ?? (recordedParts.length ? recordedParts.reduce((sum, value) => sum + value, 0) : null)
  return {
    modelCalls: finiteNumber(usage.model_calls, usage.modelCalls, props.card.model_calls, props.card.modelCalls, kernel.model_calls, kernel.modelCalls),
    retries: finiteNumber(usage.retry_count, usage.retryCount, props.card.retry_count, props.card.retryCount, runtime.provider_retry?.attempts),
    reviewRounds: finiteNumber(usage.test_agent_rounds, usage.testAgentRounds, runtime.review_round, props.card.review_round, props.card.reviewRound),
    tokens,
  }
})
const formatTokens = (value) => {
  if (value === null) return '未记录'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`
  return String(value)
}

const normalizeFile = (value) => {
  if (!value) return null
  if (typeof value === 'string') return { path: value.replace(/\\/g, '/'), status: '已变更', additions: 0, deletions: 0, project: '' }
  const path = String(value.path || value.file || value.name || '').trim().replace(/\\/g, '/')
  if (!path) return null
  return {
    ...value,
    path,
    status: replayFileStatusLabel(value.status_label || value.statusLabel || value.status),
    additions: Number(value.additions || value.diff?.additions || 0),
    deletions: Number(value.deletions || value.diff?.deletions || 0),
    project: value.project || value.projectName || value.target_project || '',
  }
}
const files = computed(() => {
  const sources = [
    props.card.change_summary?.files,
    props.card.changeSummary?.files,
    props.card.delivery?.changes,
    props.card.delivery?.files,
    report.value.files,
  ]
  const byPath = new Map()
  for (const source of sources) {
    for (const raw of asList(source)) {
      const file = normalizeFile(raw)
      if (!file) continue
      const key = file.path.toLowerCase()
      byPath.set(key, { ...(byPath.get(key) || {}), ...file })
    }
  }
  return [...byPath.values()]
})
const fileGroups = computed(() => {
  const groups = new Map()
  for (const file of files.value) {
    const parts = file.path.split('/')
    const directory = parts.length > 1 ? parts.slice(0, -1).join('/') : '项目根目录'
    const key = `${file.project || ''}:${directory}`
    if (!groups.has(key)) groups.set(key, { project: file.project, directory, files: [] })
    groups.get(key).files.push(file)
  }
  return [...groups.values()]
})

const agents = computed(() => {
  const rows = asList(props.card.agents || props.card.agent_progress_summary?.rows || props.card.agentProgressSummary?.rows)
  return rows.map(row => typeof row === 'string' ? row : row.agent || row.name || row.project || row.role).filter(Boolean)
})
const owner = computed(() => replayActorLabel({
  label: friendlyText(props.card.owner || props.card.assignee || props.card.responsible_agent || props.card.responsibleAgent || agents.value[0] || '主 Agent', '主 Agent', 80),
}))
const dateValue = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
const contextLabel = computed(() => ({ global: '全局任务', group: '群聊任务', project: '项目任务' }[props.context] || 'Agent 任务'))
const taskId = computed(() => props.card.task_id || props.card.taskId || props.card.id || '')
const traceId = computed(() => props.card.trace_id || props.card.traceId || props.card.technical?.trace_id || '')
const replayPlanLoading = ref(false)
const replayPlanError = ref('')
const replayPlans = ref([])
const cardPlanMode = computed(() => props.card.plan_mode || props.card.planMode || {})
const fallbackPlan = computed(() => {
  const plan = cardPlanMode.value || {}
  const steps = asList(plan.steps || plan.plan_steps || plan.planSteps).map((step, index) => ({
    id: step?.id || `plan-step-${index + 1}`,
    title: itemText(step, `计划步骤 ${index + 1}`),
    detail: friendlyText(step?.detail || step?.activeForm || step?.active_form || '', '', 360),
    status: String(step?.status || 'pending').toLowerCase(),
    source: step?.source || '',
  }))
  if (!steps.length && !plan.title && !plan.risk && !plan.acceptance) return null
  return {
    task_id: taskId.value,
    source: 'task_card_preview',
    title: friendlyText(plan.title || props.card.title || '执行计划', '执行计划', 180),
    strategy: friendlyText(plan.architecture_plan?.goal || plan.risk?.summary || '', '', 420),
    status: plan.requires_confirmation === true && !plan.confirmed_at && !plan.accepted_at ? 'awaiting_confirmation' : terminal.value ? 'completed' : 'in_progress',
    steps,
    step_count: steps.length + Number(plan.steps_hidden_count || 0),
    completed_count: steps.filter(step => ['completed', 'done', 'succeeded'].includes(step.status)).length,
    acceptance: asList(plan.acceptance).map(item => friendlyText(item, '', 260)).filter(Boolean),
    impact_projects: asList(plan.impact_scope?.projects),
    impact_areas: asList(plan.impact_scope?.areas),
    revision_count: Number(plan.revision_count || props.card.plan_revision_count || 0),
    revisions: asList(plan.revisions || props.card.plan_revisions),
  }
})
const activePlan = computed(() => {
  if (replayPlans.value.length) {
    const exact = replayPlans.value.filter(plan => String(plan?.task_id || '') === String(taskId.value))
    const candidates = exact.length ? exact : replayPlans.value
    return candidates.find(plan => plan.source === 'live_todo')
      || candidates.find(plan => plan.source === 'coordination_plan')
      || candidates[candidates.length - 1]
  }
  return fallbackPlan.value
})
const planSteps = computed(() => asList(activePlan.value?.steps))
const planCompletedCount = computed(() => Number(activePlan.value?.completed_count ?? planSteps.value.filter(step => ['completed', 'done', 'succeeded'].includes(String(step?.status || '').toLowerCase())).length))
const planTotalCount = computed(() => Number(activePlan.value?.step_count || planSteps.value.length || 0))
const planCurrentStep = computed(() => planSteps.value.find(step => ['failed', 'blocked', 'needs_confirmation', 'reworking', 'reviewing', 'in_progress'].includes(String(step?.status || '').toLowerCase())) || planSteps.value.find(step => String(step?.status || '').toLowerCase() === 'pending') || null)
const planNextStep = computed(() => {
  const index = planSteps.value.indexOf(planCurrentStep.value)
  return planSteps.value.find((step, stepIndex) => stepIndex > index && ['pending', 'in_progress', 'reviewing', 'reworking', 'needs_confirmation'].includes(String(step?.status || '').toLowerCase())) || null
})
const planSourceEvidence = computed(() => props.card.source_evidence || props.card.sourceEvidence || cardPlanMode.value?.read_only_exploration || null)
const loadCompletePlan = async () => {
  if (!taskId.value) return
  replayPlanLoading.value = true
  replayPlanError.value = ''
  try {
    const response = await fetch(`/api/tasks/replay?task_id=${encodeURIComponent(taskId.value)}`)
    const payload = await response.json()
    if (!response.ok || !payload.success || !payload.replay) throw new Error(payload.error || '完整计划暂时无法读取')
    replayPlans.value = asList(payload.replay.plans)
  } catch (error) {
    replayPlanError.value = error?.message || '完整计划暂时无法读取'
  } finally {
    replayPlanLoading.value = false
  }
}
onMounted(loadCompletePlan)
const actions = computed(() => asList(props.card.actions).filter(action => action?.kind !== 'view_changes').slice(0, 5))
const resolutionActions = computed(() => {
  const configuredKinds = new Set(actions.value.map(action => action?.kind))
  const rows = []
  if (phase.value === 'environment_blocked') {
    rows.push({
      id: 'configure-runtime-conditions',
      kind: props.context === 'global' ? 'open_project_settings' : 'open_test_targets',
      label: props.context === 'group' ? '配置群聊测试目标' : '配置登录与测试目标',
      tone: 'primary',
    })
  }
  if (phase.value === 'needs_user' && !configuredKinds.has('continue')) {
    rows.push({ id: 'provide-task-input', kind: 'continue', label: '补充任务信息', tone: 'primary' })
  }
  if (['recovery_required', 'blocked', 'failed'].includes(phase.value) && !configuredKinds.has('retry')) {
    rows.push({ id: 'retry-task', kind: 'retry', label: '重新执行', tone: 'primary' })
  }
  return rows
})
const emitChanges = (selectedPath = '') => emit('action', {
  id: 'changes',
  kind: 'view_changes',
  label: '查看改动',
  files: files.value,
  selectedPath: selectedPath || files.value[0]?.path || '',
  project: files.value.find(item => item.project)?.project || '',
  change_summary: props.card.change_summary || props.card.changeSummary || {},
})
const emitReplay = (options = {}) => emit('action', {
  id: 'task-replay',
  kind: 'view_trace',
  label: '任务回放',
  task_id: taskId.value,
  trace_id: traceId.value,
  ...options,
})
const onFullRecordToggle = (event) => { fullRecordOpen.value = event.currentTarget.open === true }
</script>

<template>
  <div class="task-detail-shell">
    <div class="task-detail-scroll">
      <section class="detail-overview" :class="`tone-${phaseMeta[2]}`">
        <div class="overview-state">
          <component :is="phaseMeta[1]" :class="{ spinning: phaseMeta[2] === 'active' }" :size="18" />
          <strong>{{ phaseMeta[0] }}</strong>
          <span>{{ progress }}%</span>
        </div>
        <div class="overview-progress"><span :style="{ width: `${progress}%` }"></span></div>
        <div class="overview-goal">
          <small>用户目标</small>
          <p>{{ userGoal }}</p>
        </div>
        <p class="overview-current">{{ headline }}</p>
        <div :class="['overview-live', `tone-${heartbeatTone}`]">
          <Activity :size="15" aria-hidden="true" />
          <div>
            <strong>{{ heartbeatText }}</strong>
            <small v-if="retrySummary">{{ retrySummary }}</small>
          </div>
          <span v-if="!terminal">{{ lastActivityLabel }}</span>
        </div>
        <p v-if="nextAction" class="overview-next"><strong>接下来</strong>{{ nextAction }}</p>
        <div v-if="unsuccessfulTerminal" class="delivery-notice">
          <XCircle :size="15" />
          <span><strong>流程已结束，但未达到交付条件</strong>已完成部分和失败证据会继续保留，不会显示为成功交付。</span>
        </div>
        <div class="overview-facts">
          <span><small>任务来源</small><b>{{ contextLabel }}</b></span>
          <span><small>负责人</small><b><UserRound :size="13" />{{ owner }}</b></span>
          <span><small>执行步骤</small><b>{{ workCounts.completed }}/{{ workCounts.total }}</b></span>
          <span><small>处理耗时</small><b>{{ elapsedLabel }}</b></span>
        </div>
      </section>

      <section class="detail-section request-section">
        <header>
          <div><small>执行依据</small><h3>需求确认</h3></div>
          <span class="request-mode">{{ journey.request.executionMode }}</span>
        </header>
        <div class="request-goal">
          <small>我理解的目标</small>
          <p>{{ journey.request.goal }}</p>
        </div>
        <div class="request-grid">
          <section v-if="journey.request.projects.length || journey.request.scope.length">
            <strong>执行范围</strong>
            <ul><li v-for="item in (journey.request.projects.length ? journey.request.projects : journey.request.scope)" :key="item">{{ item }}</li></ul>
          </section>
          <section v-if="journey.request.acceptance.length">
            <strong>验收标准</strong>
            <ul><li v-for="item in journey.request.acceptance" :key="item">{{ item }}</li></ul>
          </section>
          <section v-if="journey.request.exclusions.length">
            <strong>不包含的内容</strong>
            <ul><li v-for="item in journey.request.exclusions" :key="item">{{ item }}</li></ul>
          </section>
          <section v-if="journey.request.clarification.length" class="request-warning">
            <strong>仍需确认</strong>
            <ul><li v-for="item in journey.request.clarification" :key="item">{{ item }}</li></ul>
          </section>
        </div>
      </section>

      <section v-if="activePlan || replayPlanLoading || replayPlanError" class="detail-section execution-plan-section">
        <header>
          <div><small>模型计划</small><h3>执行计划</h3></div>
          <span>{{ replayPlanLoading ? '正在读取' : `${planCompletedCount}/${planTotalCount} 已完成` }}</span>
        </header>
        <p v-if="activePlan?.strategy" class="plan-strategy">{{ activePlan.strategy }}</p>
        <div v-if="planCurrentStep" class="plan-current-step">
          <small>当前步骤</small>
          <strong>{{ itemText(planCurrentStep, '当前计划步骤') }}</strong>
          <span v-if="planNextStep">下一步：{{ itemText(planNextStep, '继续执行计划') }}</span>
        </div>
        <div v-if="planSteps.length" class="complete-plan-steps">
          <article v-for="(step, index) in planSteps" :key="step.id || index" :class="`status-${normalizeStageStatus(step.status)}`">
            <span>{{ index + 1 }}</span>
            <div><strong>{{ itemText(step, `计划步骤 ${index + 1}`) }}</strong><small v-if="step.detail">{{ friendlyText(step.detail, '', 360) }}</small></div>
            <b>{{ replayWorkStatusLabel(step.status) }}</b>
          </article>
        </div>
        <p v-if="replayPlanError" class="plan-load-error">{{ replayPlanError }}；当前显示任务卡中已保存的计划预览。</p>
        <div v-if="activePlan?.acceptance?.length || activePlan?.impact_projects?.length || activePlan?.impact_areas?.length || activePlan?.revisions?.length || planSourceEvidence" class="plan-supporting-details">
          <section v-if="activePlan?.impact_projects?.length || activePlan?.impact_areas?.length"><strong>影响范围</strong><p>{{ [...asList(activePlan.impact_projects), ...asList(activePlan.impact_areas)].join('、') }}</p></section>
          <section v-if="planSourceEvidence"><strong>源码依据</strong><p>{{ planSourceEvidence.summary || `${planSourceEvidence.selectedPaths?.length || planSourceEvidence.selected_paths?.length || planSourceEvidence.manifestFiles || 0} 个源码文件已用于规划` }}</p></section>
          <section v-if="activePlan?.acceptance?.length"><strong>验收标准</strong><ul><li v-for="item in activePlan.acceptance" :key="item">{{ friendlyText(item, '', 300) }}</li></ul></section>
          <section v-if="activePlan?.revisions?.length"><strong>修订记录</strong><ul><li v-for="revision in activePlan.revisions" :key="revision.revision || revision.count">第 {{ revision.revision || revision.count }} 次：{{ friendlyText(revision.feedback, '计划已调整', 300) }}</li></ul></section>
        </div>
      </section>

      <section v-if="journey.sources" class="detail-section source-section">
        <header>
          <div><small>资料覆盖</small><h3>文档与附件读取情况</h3></div>
          <span :class="{ warning: journey.sources.attention }">{{ journey.sources.label }}</span>
        </header>
        <p>{{ journey.sources.headline }}</p>
        <div class="source-list">
          <article v-for="source in journey.sources.rows" :key="source.id" :class="`source-${source.kind}`">
            <span></span>
            <div><strong>{{ source.name }}</strong><small>{{ source.detail }}</small></div>
            <b>{{ source.status }}</b>
          </article>
        </div>
      </section>

      <section v-if="journey.intervention" class="detail-section intervention-section">
        <header><div><small>等待处理</small><h3>{{ journey.intervention.title }}</h3></div><AlertTriangle :size="18" /></header>
        <strong>{{ journey.intervention.reason }}</strong>
        <p>{{ journey.intervention.action }}</p>
        <small>{{ journey.intervention.impact }}</small>
      </section>

      <section v-else-if="journey.queue && phase === 'queued'" class="detail-section queue-section">
        <header><div><small>执行顺序</small><h3>{{ journey.queue.label }}</h3></div><Clock3 :size="18" /></header>
        <p>{{ journey.queue.reason }}</p>
        <div v-if="journey.queue.waiting.length" class="queue-tags">
          <span v-for="item in journey.queue.waiting" :key="item">{{ item }}</span>
        </div>
      </section>

      <section v-if="journey.rework && phase === 'reworking'" class="detail-section rework-section">
        <header><div><small>定向修复</small><h3>{{ journey.rework.label }}</h3></div><RotateCcw :size="18" /></header>
        <p>{{ journey.rework.headline }}</p>
        <ul v-if="journey.rework.failures.length"><li v-for="item in journey.rework.failures" :key="item">{{ item }}</li></ul>
      </section>

      <section class="detail-section stage-section">
        <header><div><small>执行链路</small><h3>任务阶段</h3></div><span>{{ stages.filter(item => item.status === 'done').length }}/{{ stages.length }}</span></header>
        <ol class="stage-timeline">
          <li v-for="(stage, index) in stages" :key="`${stage.label}-${index}`" :class="`status-${stage.status}`">
            <span class="stage-marker">
              <CheckCircle2 v-if="stage.status === 'done'" :size="16" />
              <LoaderCircle v-else-if="stage.status === 'active'" :size="16" class="spinning" />
              <AlertTriangle v-else-if="stage.status === 'warning'" :size="16" />
              <Circle v-else :size="16" />
            </span>
            <div><strong>{{ stage.label }}</strong><p v-if="stage.detail">{{ stage.detail }}</p></div>
          </li>
        </ol>
      </section>

      <section v-if="acceptanceRows.length" class="detail-section acceptance-section">
        <header>
          <div><small>逐项核对</small><h3>验收标准对照</h3></div>
          <button type="button" class="header-command" @click="emitReplay({ preset: 'test' })">查看验收回放 <ChevronRight :size="14" /></button>
        </header>
        <div class="acceptance-table">
          <div class="acceptance-head"><span>验收标准</span><span>验证方式</span><span>证据</span><span>结果</span></div>
          <button
            v-for="row in acceptanceRows"
            :key="row.id"
            type="button"
            class="acceptance-row"
            @click="emitReplay({ preset: 'test', evidence_id: row.evidenceId, event_query: row.criterion })"
          >
            <strong>{{ row.criterion }}</strong>
            <span>{{ row.method }}</span>
            <span>{{ row.evidence }}</span>
            <b :class="`status-${row.status}`">
              <CheckCircle2 v-if="row.status === 'passed'" :size="14" />
              <XCircle v-else-if="row.status === 'failed'" :size="14" />
              <Clock3 v-else :size="14" />
              {{ row.status === 'passed' ? '通过' : row.status === 'failed' ? '未通过' : '待验证' }}
            </b>
          </button>
        </div>
      </section>

      <section v-if="completedItems.length || verificationItems.length || riskItems.length" class="detail-section result-section">
        <header><div><small>交付结论</small><h3>结果与验收</h3></div><ShieldCheck :size="18" /></header>
        <div class="result-grid">
          <div v-if="completedItems.length">
            <strong><CheckCircle2 :size="15" />完成内容</strong>
            <ul><li v-for="item in completedItems" :key="item">{{ item }}</li></ul>
          </div>
          <div v-if="verificationItems.length">
            <strong><ListChecks :size="15" />真实验证</strong>
            <ul><li v-for="item in verificationItems" :key="item">{{ item }}</li></ul>
          </div>
          <div v-if="riskItems.length" class="risk-block">
            <strong><AlertTriangle :size="15" />风险与未完成</strong>
            <ul><li v-for="item in riskItems" :key="item">{{ item }}</li></ul>
          </div>
        </div>
      </section>

      <section class="detail-section usage-section">
        <header><div><small>真实记录</small><h3>任务消耗</h3></div><Gauge :size="18" /></header>
        <div class="usage-grid">
          <span><small>处理耗时</small><b>{{ elapsedLabel }}</b></span>
          <span><small>模型调用</small><b>{{ usageOverview.modelCalls === null ? '未记录' : `${usageOverview.modelCalls} 次` }}</b></span>
          <span><small>Provider 重试</small><b>{{ usageOverview.retries === null ? '未记录' : `${usageOverview.retries} 次` }}</b></span>
          <span><small>{{ isSelfVerificationMode() ? '主 Agent自验轮次' : 'TestAgent 轮次' }}</small><b>{{ usageOverview.reviewRounds === null ? '未记录' : `${usageOverview.reviewRounds} 轮` }}</b></span>
          <span><small>已记录 Token</small><b>{{ formatTokens(usageOverview.tokens) }}</b></span>
        </div>
        <p>这里只展示系统实际保存的调用数据；未记录的项目不会用估算值代替。任务 ID、Provider、generation、session、MCP 与 Skill 位于下方“更多执行记录”的排障信息中。</p>
      </section>

      <details v-if="files.length" class="detail-section detail-disclosure" open>
        <summary>
          <span><FileDiff :size="17" /><b>变更文件</b><small>{{ files.length }} 个文件</small></span>
          <ChevronRight :size="16" />
        </summary>
        <div class="file-groups">
          <section v-for="group in fileGroups.slice(0, 6)" :key="`${group.project}:${group.directory}`">
            <header><span><FolderOpen :size="14" />{{ group.project ? `${group.project} / ` : '' }}{{ group.directory }}</span><small>{{ group.files.length }}</small></header>
            <button v-for="file in group.files.slice(0, 6)" :key="file.path" type="button" @click="emitChanges(file.path)">
              <FileCode2 :size="14" />
              <span>{{ file.path.split('/').pop() }}</span>
              <small>{{ file.status }}<i v-if="file.additions || file.deletions">+{{ file.additions }} / -{{ file.deletions }}</i></small>
            </button>
          </section>
        </div>
        <button v-if="files.length > 6" type="button" class="section-command" @click="emitChanges()">查看全部改动 <ChevronRight :size="14" /></button>
      </details>

      <details v-if="workItems.length" class="detail-section detail-disclosure">
        <summary>
          <span><ListChecks :size="17" /><b>执行步骤</b><small>{{ workCounts.completed }}/{{ workCounts.total }} 已完成</small></span>
          <ChevronRight :size="16" />
        </summary>
        <div class="work-item-list">
          <article v-for="(item, index) in workItems.slice(0, 12)" :key="item.id || item.key || index">
            <span :class="`work-status status-${normalizeStageStatus(item.status)}`"></span>
            <div><strong>{{ itemText(item, `执行步骤 ${index + 1}`) }}</strong><small>{{ replayActorLabel({ label: item.owner || item.target || item.agent || '执行成员' }) }}<template v-if="item.attempt > 1"> · 第 {{ item.attempt }} 轮</template></small></div>
            <b>{{ replayWorkStatusLabel(item.status_label || item.statusLabel || item.status) }}</b>
          </article>
        </div>
      </details>

      <details class="detail-section detail-disclosure full-record" @toggle="onFullRecordToggle">
        <summary>
          <span><PlayCircle :size="17" /><b>更多执行记录</b><small>计划、执行结果、权限与验证材料</small></span>
          <ChevronRight :size="16" />
        </summary>
        <div v-if="fullRecordOpen" class="legacy-record">
          <TaskExperiencePanel :card="card" :context="context" :busy="busy" @action="emit('action', $event)" />
        </div>
      </details>
    </div>

    <footer class="detail-actions">
      <button v-for="action in resolutionActions" :key="action.id" type="button" :disabled="busy" :class="action.tone || 'outline'" @click="emit('action', action)">
        <Settings2 v-if="action.kind !== 'continue'" :size="15" />
        <KeyRound v-else :size="15" />
        {{ action.label }}
      </button>
      <button v-for="action in actions" :key="action.id || action.kind" type="button" :disabled="busy" :class="action.tone || 'outline'" @click="emit('action', action)">{{ action.label || '继续' }}</button>
      <button v-if="files.length" type="button" class="outline" @click="emitChanges()"><FileDiff :size="15" />查看改动</button>
      <button v-if="taskId" type="button" class="outline" @click="emitReplay"><ListChecks :size="15" />任务回放</button>
    </footer>
  </div>
</template>

<style scoped>
.task-detail-shell { min-height: 0; height: 100%; display: grid; grid-template-rows: minmax(0, 1fr) auto; color: var(--text-primary); }
.task-detail-scroll { min-height: 0; overflow: auto; padding: 16px; scrollbar-gutter: stable; }
.detail-overview,.detail-section { border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface); }
.detail-overview { padding: 15px; border-left: 3px solid var(--accent-blue); }
.overview-state { display: flex; align-items: center; gap: 7px; color: var(--accent-blue); }
.overview-state strong { font-size: 13px; }
.overview-state span { margin-left: auto; color: var(--text-muted); font-size: 11px; font-weight: 800; }
.overview-progress { height: 3px; margin: 10px 0 12px; overflow: hidden; border-radius: 3px; background: var(--panel-muted); }
.overview-progress span { display: block; height: 100%; background: var(--accent-blue); }
.overview-goal { display: grid; gap: 4px; margin-top: 2px; padding: 10px 11px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--panel-muted); }
.overview-goal small { color: var(--text-muted); font-size: 10px; font-weight: 800; }
.overview-goal p { margin: 0; color: var(--text-primary); font-size: 12.5px; font-weight: 750; line-height: 1.55; overflow-wrap: anywhere; }
.overview-current { margin: 10px 0 0; color: var(--text-secondary); font-size: 12px; font-weight: 700; line-height: 1.55; overflow-wrap: anywhere; }
.overview-live { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; margin-top: 10px; padding: 8px 9px; border: 1px solid color-mix(in srgb, var(--accent-blue) 20%, var(--border-color)); border-radius: 6px; color: var(--accent-blue); background: color-mix(in srgb, var(--accent-blue) 5%, var(--surface)); }
.overview-live > div { display: grid; min-width: 0; gap: 2px; }.overview-live strong { color: var(--text-secondary); font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; }.overview-live small,.overview-live > span { color: var(--text-muted); font-size: 9.5px; }.overview-live > span { white-space: nowrap; }
.overview-live.tone-warning { border-color: color-mix(in srgb, #f59e0b 30%, var(--border-color)); color: #d97706; }.overview-live.tone-danger { border-color: color-mix(in srgb, #ef4444 30%, var(--border-color)); color: #dc2626; }.overview-live.tone-success { border-color: color-mix(in srgb, #22c55e 28%, var(--border-color)); color: #16a34a; }.overview-live.tone-muted { color: var(--text-muted); }
.request-section,.source-section,.intervention-section,.queue-section,.rework-section { padding-bottom: 12px; }
.execution-plan-section { padding-bottom: 12px; }
.execution-plan-section>header>span { color: var(--accent-blue); font-size: 10px; font-weight: 800; }
.plan-strategy { margin: 0; padding: 10px 12px 0; color: var(--text-secondary); font-size: 11.5px; line-height: 1.55; overflow-wrap: anywhere; }
.plan-current-step { display: grid; gap: 3px; margin: 10px 12px 0; padding: 9px 10px; border: 1px solid color-mix(in srgb, var(--accent-blue) 25%, var(--border-color)); border-radius: 6px; background: color-mix(in srgb, var(--accent-blue) 5%, var(--surface)); }
.plan-current-step small,.plan-current-step span { color: var(--text-muted); font-size: 9.5px; }.plan-current-step strong { color: var(--text-primary); font-size: 11.5px; overflow-wrap: anywhere; }
.complete-plan-steps { display: grid; gap: 5px; max-height: 360px; margin: 10px 12px 0; overflow: auto; scrollbar-gutter: stable; }
.complete-plan-steps article { display: grid; grid-template-columns: 22px minmax(0,1fr) auto; align-items: start; gap: 8px; padding: 8px 9px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--panel-muted); }
.complete-plan-steps article>span { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 4px; background: var(--surface); color: var(--text-muted); font-size: 9px; font-weight: 800; }
.complete-plan-steps article>div { display: grid; min-width: 0; gap: 2px; }.complete-plan-steps strong { font-size: 10.5px; overflow-wrap: anywhere; }.complete-plan-steps small { color: var(--text-muted); font-size: 9.5px; line-height: 1.45; overflow-wrap: anywhere; }.complete-plan-steps b { color: var(--text-muted); font-size: 9px; white-space: nowrap; }
.complete-plan-steps article.status-done { border-color: color-mix(in srgb, #22c55e 28%, var(--border-color)); }.complete-plan-steps article.status-active { border-color: color-mix(in srgb, var(--accent-blue) 35%, var(--border-color)); }.complete-plan-steps article.status-warning { border-color: color-mix(in srgb, #f59e0b 35%, var(--border-color)); }
.plan-load-error { margin: 9px 12px 0; color: #b45309; font-size: 10px; line-height: 1.5; }
.plan-supporting-details { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 7px; margin: 10px 12px 0; }.plan-supporting-details section { padding: 8px 9px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--surface); }.plan-supporting-details strong { display: block; margin-bottom: 4px; font-size: 10px; }.plan-supporting-details p,.plan-supporting-details ul { margin: 0; color: var(--text-secondary); font-size: 9.5px; line-height: 1.5; overflow-wrap: anywhere; }.plan-supporting-details ul { padding-left: 16px; }
.request-mode,.source-section > header > span { padding: 3px 6px; border-radius: 4px; background: var(--accent-soft); color: var(--accent-blue); font-size: 9.5px; font-weight: 800; }
.source-section > header > span.warning { color: #b45309; background: color-mix(in srgb, #f59e0b 10%, var(--surface)); }
.request-goal { display: grid; gap: 4px; margin: 11px 12px 0; padding: 9px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--panel-muted); }
.request-goal small { color: var(--text-muted); font-size: 9.5px; font-weight: 800; }
.request-goal p,.source-section > p,.queue-section > p,.rework-section > p { margin: 0; color: var(--text-secondary); font-size: 11.5px; line-height: 1.55; overflow-wrap: anywhere; }
.request-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin: 9px 12px 0; }
.request-grid > section { padding: 9px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--surface); }
.request-grid strong { color: var(--text-primary); font-size: 10.5px; }
.request-grid ul,.rework-section ul { display: grid; gap: 3px; margin: 5px 0 0; padding-left: 17px; }
.request-grid li,.rework-section li { color: var(--text-secondary); font-size: 10.5px; line-height: 1.45; overflow-wrap: anywhere; }
.request-grid .request-warning { border-color: color-mix(in srgb, #f59e0b 35%, var(--border-color)); background: color-mix(in srgb, #f59e0b 6%, var(--surface)); }
.source-section > p,.queue-section > p,.rework-section > p { padding: 10px 12px 0; }
.source-list { display: grid; gap: 6px; margin: 9px 12px 0; }
.source-list article { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 8px 9px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--panel-muted); }
.source-list article > span { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; }
.source-list article.source-partial > span { background: #f59e0b; }.source-list article.source-attention > span,.source-list article.source-failed > span { background: #ef4444; }
.source-list article > div { display: grid; min-width: 0; gap: 2px; }
.source-list strong { overflow: hidden; color: var(--text-primary); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
.source-list small { color: var(--text-muted); font-size: 9.5px; line-height: 1.4; overflow-wrap: anywhere; }
.source-list b { color: var(--text-secondary); font-size: 9.5px; white-space: nowrap; }
.source-list .source-attention b,.source-list .source-failed b { color: #dc2626; }
.intervention-section { border-color: color-mix(in srgb, #f59e0b 42%, var(--border-color)); background: color-mix(in srgb, #f59e0b 7%, var(--surface)); }
.intervention-section > strong { display: block; padding: 10px 12px 0; color: var(--text-primary); font-size: 11.5px; line-height: 1.5; }
.intervention-section > p { margin: 6px 12px; color: #b45309; font-size: 11px; font-weight: 750; line-height: 1.5; }
.intervention-section > small { display: block; padding: 0 12px; color: var(--text-muted); font-size: 10px; line-height: 1.45; }
.queue-tags { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 12px 0; }.queue-tags span { padding: 3px 6px; border-radius: 4px; background: var(--panel-muted); color: var(--text-secondary); font-size: 9.5px; }
.rework-section { border-color: color-mix(in srgb, #f59e0b 30%, var(--border-color)); }
.rework-section ul { margin-inline: 12px; }
.overview-next { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; margin: 9px 0 0; color: var(--text-secondary); font-size: 10.5px; line-height: 1.5; }.overview-next strong { color: var(--accent-blue); }
.delivery-notice { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 7px; align-items: start; margin-top: 10px; padding: 9px 10px; border: 1px solid color-mix(in srgb, #ef4444 32%, var(--border-color)); border-radius: 6px; background: color-mix(in srgb, #ef4444 6%, var(--surface)); color: #dc2626; }
.delivery-notice span { color: var(--text-secondary); font-size: 10.5px; line-height: 1.5; }.delivery-notice strong { display: block; margin-bottom: 2px; color: #dc2626; }
.overview-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
.overview-facts span { display: grid; gap: 3px; min-width: 0; padding: 8px 9px; border-radius: 6px; background: var(--panel-muted); }
.overview-facts small { color: var(--text-muted); font-size: 10px; }
.overview-facts b { display: flex; align-items: center; gap: 4px; overflow: hidden; color: var(--text-secondary); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
.tone-success { border-left-color: #22c55e; }.tone-success .overview-state { color: #16a34a; }.tone-success .overview-progress span { background: #22c55e; }
.tone-warning { border-left-color: #f59e0b; }.tone-warning .overview-state { color: #d97706; }.tone-warning .overview-progress span { background: #f59e0b; }
.tone-danger { border-left-color: #ef4444; }.tone-danger .overview-state { color: #dc2626; }.tone-danger .overview-progress span { background: #ef4444; }
.detail-section { margin-top: 12px; overflow: hidden; }
.detail-section > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--border-color); }
.detail-section > header > div { display: grid; gap: 2px; }.detail-section > header small { color: var(--text-muted); font-size: 10px; }.detail-section h3 { margin: 0; font-size: 13px; }
.detail-section > header > span { color: var(--text-muted); font-size: 11px; font-weight: 800; }
.stage-timeline { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); margin: 0; padding: 15px 14px 16px; list-style: none; }
.stage-timeline li { position: relative; display: grid; align-content: start; gap: 7px; min-width: 0; padding-right: 10px; }
.stage-timeline li:not(:last-child)::after { content: ''; position: absolute; top: 8px; left: 22px; right: 5px; height: 1px; background: var(--border-color); }
.stage-marker { position: relative; z-index: 1; width: 17px; height: 17px; display: grid; place-items: center; background: var(--surface); color: var(--text-muted); }
.stage-timeline strong { display: block; color: var(--text-secondary); font-size: 11px; line-height: 1.35; }
.stage-timeline p { margin: 4px 0 0; color: var(--text-muted); font-size: 10px; line-height: 1.4; overflow-wrap: anywhere; }
.stage-timeline .status-done .stage-marker { color: #16a34a; }.stage-timeline .status-active .stage-marker { color: var(--accent-blue); }.stage-timeline .status-warning .stage-marker { color: #d97706; }
.header-command { display: inline-flex; align-items: center; gap: 4px; padding: 5px 7px; border: 0; border-radius: 5px; background: transparent; color: var(--accent-blue); font-size: 10.5px; font-weight: 800; cursor: pointer; }
.acceptance-table { overflow-x: auto; }
.acceptance-head,.acceptance-row { min-width: 660px; display: grid; grid-template-columns: minmax(150px, 1.15fr) minmax(120px, .8fr) minmax(190px, 1.35fr) 88px; gap: 10px; align-items: center; padding: 9px 12px; }
.acceptance-head { border-bottom: 1px solid var(--border-color); background: var(--panel-muted); color: var(--text-muted); font-size: 9.5px; font-weight: 800; }
.acceptance-row { width: 100%; border: 0; border-bottom: 1px solid var(--border-color); background: var(--surface); color: var(--text-secondary); text-align: left; cursor: pointer; }
.acceptance-row:last-child { border-bottom: 0; }.acceptance-row:hover { background: var(--panel-muted); }
.acceptance-row strong { color: var(--text-primary); font-size: 11px; line-height: 1.45; }.acceptance-row span { font-size: 10.5px; line-height: 1.45; overflow-wrap: anywhere; }
.acceptance-row b { display: inline-flex; align-items: center; gap: 4px; justify-self: start; font-size: 10.5px; white-space: nowrap; }.acceptance-row .status-passed { color: #16a34a; }.acceptance-row .status-failed { color: #dc2626; }.acceptance-row .status-pending { color: #d97706; }
.result-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: var(--border-color); }
.result-grid > div { min-width: 0; padding: 13px 14px; background: var(--surface); }
.result-grid > div:last-child:nth-child(odd) { grid-column: 1 / -1; }
.result-grid strong { display: flex; align-items: center; gap: 6px; color: var(--text-primary); font-size: 11.5px; }
.result-grid ul { display: grid; gap: 5px; margin: 8px 0 0; padding-left: 18px; }
.result-grid li { color: var(--text-secondary); font-size: 11.5px; line-height: 1.5; overflow-wrap: anywhere; }
.risk-block strong { color: #d97706; }
.usage-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1px; background: var(--border-color); }
.usage-grid span { display: grid; min-width: 0; gap: 3px; padding: 10px 12px; background: var(--surface); }.usage-grid small { color: var(--text-muted); font-size: 9.5px; }.usage-grid b { overflow: hidden; color: var(--text-secondary); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
.usage-section > p { margin: 0; padding: 9px 12px; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: 10px; line-height: 1.5; }
.detail-disclosure > summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; cursor: pointer; list-style: none; }
.detail-disclosure > summary::-webkit-details-marker { display: none; }
.detail-disclosure > summary > span { display: flex; min-width: 0; align-items: center; gap: 7px; }
.detail-disclosure > summary b { font-size: 12px; }.detail-disclosure > summary small { overflow: hidden; color: var(--text-muted); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
.detail-disclosure > summary > svg { flex: none; transition: transform .18s ease; }.detail-disclosure[open] > summary > svg { transform: rotate(90deg); }
.detail-disclosure[open] > summary { border-bottom: 1px solid var(--border-color); }
.file-groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 12px; }
.file-groups section { min-width: 0; overflow: hidden; border: 1px solid var(--border-color); border-radius: 6px; }
.file-groups section > header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 9px; background: var(--panel-muted); }
.file-groups section > header span { display: flex; min-width: 0; align-items: center; gap: 5px; overflow: hidden; color: var(--text-secondary); font-size: 10.5px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.file-groups section > header small { color: var(--text-muted); font-size: 10px; }
.file-groups section > button { width: 100%; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 6px; padding: 7px 9px; border: 0; border-top: 1px solid var(--border-color); background: var(--surface); color: var(--text-secondary); text-align: left; cursor: pointer; }
.file-groups section > button:hover { background: var(--panel-muted); }.file-groups section > button > span { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.file-groups section > button > small { display: flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 9.5px; }.file-groups i { color: #16a34a; font-style: normal; }
.section-command { display: flex; align-items: center; gap: 4px; margin: 0 12px 12px auto; padding: 6px 8px; border: 0; border-radius: 5px; background: transparent; color: var(--accent-blue); font-size: 10.5px; font-weight: 800; cursor: pointer; }
.work-item-list { display: grid; gap: 0; }.work-item-list article { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 9px; padding: 9px 12px; border-bottom: 1px solid var(--border-color); }
.work-item-list article:last-child { border-bottom: 0; }.work-status { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); }.work-status.status-done { background: #22c55e; }.work-status.status-active { background: var(--accent-blue); }.work-status.status-warning { background: #f59e0b; }
.work-item-list article > div { display: grid; min-width: 0; gap: 2px; }.work-item-list strong { overflow: hidden; font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }.work-item-list small { color: var(--text-muted); font-size: 10px; }.work-item-list article > b { color: var(--text-muted); font-size: 10px; }
.legacy-record { padding: 12px; background: var(--bg-primary); }.legacy-record :deep(.task-experience-card) { width: 100%; max-width: none; margin: 0; }
.detail-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; min-height: 58px; padding: 10px 14px; border-top: 1px solid var(--border-color); background: var(--surface); box-shadow: 0 -8px 24px rgba(0,0,0,.06); }
.detail-actions button { min-height: 32px; display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--surface); color: var(--text-secondary); font-family: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
.detail-actions button:hover { background: var(--panel-muted); color: var(--text-primary); }.detail-actions button:disabled { cursor: not-allowed; opacity: .5; }.detail-actions button.primary { border-color: var(--accent-blue); background: var(--accent-blue); color: #fff; }.detail-actions button.warning { border-color: rgba(245,158,11,.4); color: #d97706; }.detail-actions button.danger { border-color: rgba(239,68,68,.4); color: #dc2626; }
.spinning { animation: task-detail-spin 1.2s linear infinite; } @keyframes task-detail-spin { to { transform: rotate(360deg); } }
@media (max-width: 680px) {
  .plan-supporting-details { grid-template-columns: 1fr; }
  .complete-plan-steps { max-height: 300px; }
  .task-detail-scroll { padding: 10px; }
  .request-grid { grid-template-columns: 1fr; }
  .overview-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .overview-live { grid-template-columns: auto minmax(0, 1fr); }
  .overview-live > span { grid-column: 2; }
  .stage-timeline { grid-template-columns: 1fr; gap: 0; }
  .stage-timeline li { grid-template-columns: auto minmax(0, 1fr); gap: 9px; padding: 0 0 13px; }
  .stage-timeline li:not(:last-child)::after { top: 17px; bottom: 0; left: 8px; right: auto; width: 1px; height: auto; }
  .result-grid,.file-groups { grid-template-columns: 1fr; }
  .usage-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .usage-grid span:last-child { grid-column: 1 / -1; }
  .result-grid > div:last-child:nth-child(odd) { grid-column: auto; }
  .detail-actions { flex-wrap: nowrap; overflow-x: auto; }
  .detail-actions button { flex: none; }
}
</style>
