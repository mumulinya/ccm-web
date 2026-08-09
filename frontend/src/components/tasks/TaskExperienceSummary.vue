<script setup>
import { computed } from 'vue'
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileDiff,
  ListChecks,
  LoaderCircle,
  ExternalLink,
  ShieldCheck,
} from '@lucide/vue'
import {
  getDeliveryReport,
  getStreamlinedUserText,
  sanitizeUserFacingAgentText,
} from '../../utils/agentDisplay.js'
import { buildTaskJourneyPresentation } from '../../utils/taskJourneyPresentation.js'
import { useTaskRuntimeStatus } from '../../composables/useTaskRuntimeStatus.js'

const props = defineProps({
  card: { type: Object, required: true },
  context: { type: String, default: 'task' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['action', 'open-details'])

const asList = (value) => Array.isArray(value)
  ? value.filter(Boolean)
  : value === undefined || value === null || value === '' ? [] : [value]
const unique = (items) => [...new Set(items.map(item => String(item || '').trim()).filter(Boolean))]
const clean = (value, fallback = '', max = 260) => sanitizeUserFacingAgentText(value, fallback, max)

const {
  elapsedLabel,
  heartbeatText,
  heartbeatTone,
  nextAction,
  phase,
  queuePosition,
  retrySummary,
  terminal,
} = useTaskRuntimeStatus(() => props.card)
const failed = computed(() => phase.value === 'failed')
const cancelled = computed(() => ['cancelled', 'canceled', 'reverted'].includes(phase.value))
const needsUser = computed(() => ['needs_user', 'environment_blocked', 'recovery_required', 'blocked'].includes(phase.value))
const journey = computed(() => buildTaskJourneyPresentation(props.card, props.context, phase.value))
const showRequestContract = computed(() => [
  'understanding',
  'planning',
  'queued',
  'dispatching',
  'needs_user',
].includes(phase.value) || journey.value.sources?.attention > 0)

const phaseMeta = computed(() => {
  const configured = journey.value.role.phaseMeta
  const icon = configured.kind === 'planning' || configured.kind === 'queued'
    ? Clock3
    : configured.kind === 'reviewing'
      ? (props.context === 'global' ? ListChecks : ShieldCheck)
      : configured.kind === 'success'
        ? CheckCircle2
        : configured.kind === 'muted'
          ? CircleDot
          : ['warning', 'danger'].includes(configured.kind) && phase.value !== 'reworking'
            ? AlertTriangle
            : LoaderCircle
  const runtimeLabel = props.context === 'global'
    ? ''
    : props.card.runtime_status?.phase_label || props.card.runtimeStatus?.phaseLabel
  return {
    label: clean(
      runtimeLabel || configured.label,
      configured.label,
      40,
    ),
    icon,
    tone: configured.kind,
  }
})

const contextLabel = computed(() => ({
  global: '全局任务',
  group: '群聊任务',
  project: '项目任务',
}[props.context] || 'Agent 任务'))

const title = computed(() => clean(
  props.card.title || props.card.goal || props.card.business_goal || contextLabel.value,
  contextLabel.value,
  120,
))

const progress = computed(() => {
  if (terminal.value) return 100
  const raw = Number(props.card.progress)
  if (Number.isFinite(raw)) return Math.max(0, Math.min(100, Math.round(raw)))
  return ({ understanding: 6, planning: 10, queued: 18, dispatching: 28, executing: 55, in_progress: 55, running: 55, reviewing: 85, testing: 85, accepting: 94, reworking: 68, needs_user: 72, environment_blocked: 72, recovery_required: 72, blocked: 62, completed: 100, done: 100, succeeded: 100, failed: 100, reverted: 100 })[phase.value] ?? 10
})

const report = computed(() => getDeliveryReport(props.card) || {})
const completion = computed(() => props.card.completion_card || props.card.completionCard || report.value.completion_card || report.value.completionCard || {})
const workItems = computed(() => asList(props.card.work_items || props.card.workItems))
const workSummary = computed(() => props.card.work_item_summary || props.card.workItemSummary || {})
const completedWorkCount = computed(() => Number(
  workSummary.value?.counts?.completed
  ?? workItems.value.filter(item => ['completed', 'done', 'succeeded'].includes(String(item?.status || '').toLowerCase())).length
))
const totalWorkCount = computed(() => Number(workSummary.value.total || workItems.value.length || 0))

const reportSection = (ids) => asList(report.value.sections)
  .filter(section => ids.includes(String(section?.id || '').toLowerCase()))
  .flatMap(section => asList(section?.items))

const completionItems = computed(() => unique([
  ...asList(completion.value.highlights),
  ...asList(props.card.completed),
  ...asList(props.card.delivery?.completed),
  ...reportSection(['completed', 'outcome', 'delivery']),
]).map(item => clean(item, '', 220)).filter(Boolean).slice(0, 4))

const verificationItems = computed(() => unique([
  ...asList(completion.value.verification),
  ...asList(report.value.verification),
  ...asList(props.card.delivery?.verification),
  ...reportSection(['verification', 'acceptance', 'independent_review']),
]).map(item => clean(item, '', 220)).filter(Boolean).slice(0, 4))

const riskItems = computed(() => unique([
  ...asList(completion.value.risks),
  ...asList(report.value.risks),
  ...asList(props.card.delivery?.risks),
  ...asList(props.card.blockers),
]).map(item => clean(item, '', 220)).filter(Boolean).slice(0, 2))

const liveSummary = computed(() => clean(
  props.card.current_focus
    || props.card.currentFocus
    || props.card.status_detail
    || props.card.statusDetail
    || props.card.user_handoff?.headline
    || props.card.userHandoff?.headline
    || getStreamlinedUserText(props.card, props.card.next_action || props.card.goal || '任务正在处理。'),
  '任务正在处理。',
  280,
))

const terminalSummary = computed(() => clean(
  completion.value.headline
    || report.value.headline
    || props.card.delivery?.headline
    || props.card.summary
    || (failed.value ? '任务未能完成，失败原因和保留证据已整理。' : cancelled.value ? '任务已停止，已有进展和停止原因已保留。' : '任务已完成并通过交付检查。'),
  terminal.value ? '任务结果已整理。' : '任务正在处理。',
  300,
))

const verificationTotal = computed(() => verificationItems.value.length)
const requiresConfirmation = computed(() => props.card.requires_confirmation === true
  || (props.card.plan_mode?.requires_confirmation === true
    && !props.card.plan_mode?.accepted_at
    && !props.card.plan_mode?.confirmed_at))
const responsibleProjects = computed(() => unique([
  ...asList(props.card.responsible_projects || props.card.responsibleProjects),
]).map(item => clean(item, '', 80)).filter(Boolean).slice(0, 4))
const responsibleLabel = computed(() => responsibleProjects.value.join('、'))
const reworkRound = computed(() => Math.max(
  Number(props.card.rework_round || props.card.reworkRound || 0),
  ...workItems.value.map(item => Number(item?.attempt || 0)),
))

const metrics = computed(() => {
  const rows = [{ label: '阶段', value: phaseMeta.value.label }]
  if (queuePosition.value > 0 && !terminal.value) rows.push({ label: '队列', value: `第 ${queuePosition.value} 位` })
  if (totalWorkCount.value > 0) rows.push({ label: '执行步骤', value: `${completedWorkCount.value}/${totalWorkCount.value}` })
  if (verificationTotal.value > 0) rows.push({ label: '验证', value: `${verificationTotal.value} 项` })
  if (requiresConfirmation.value) rows.push({ label: '确认', value: '等待你确认' })
  if (retrySummary.value) rows.push({ label: '处理情况', value: retrySummary.value })
  else if (reworkRound.value > 1) rows.push({ label: '返工', value: `${reworkRound.value - 1} 轮` })
  if (rows.length < 5) rows.push({ label: '已用时间', value: elapsedLabel.value })
  const agentCount = asList(props.card.agents).length
  if (rows.length < 5 && agentCount) rows.push({ label: '成员', value: `${agentCount} 名` })
  return rows.slice(0, 5)
})

const fileCount = computed(() => {
  const candidates = [
    props.card.change_summary?.files,
    props.card.changeSummary?.files,
    props.card.delivery?.changes,
    props.card.delivery?.files,
    report.value.files,
  ]
  return Math.max(0, ...candidates.map(value => asList(value).length))
})

const conversationLinks = computed(() => asList(props.card.conversation_links || props.card.conversationLinks))
const sourceLink = computed(() => conversationLinks.value.find(item => item?.relation === 'source') || null)
const targetLink = computed(() => conversationLinks.value.find(item => item?.relation === 'target') || null)
const scopeLabel = (link, fallback) => {
  if (!link) return fallback
  if (link.scope === 'global') return '全局 Agent'
  return clean(link.scopeId || link.scope_id || link.title, fallback, 80)
}
const sourceLabel = computed(() => scopeLabel(sourceLink.value, '原任务'))
const targetLabel = computed(() => scopeLabel(targetLink.value, props.context === 'group' ? '当前群聊' : '当前项目'))
const unavailableLinkReason = computed(() => clean(
  sourceLink.value?.available === false ? sourceLink.value?.unavailableReason : targetLink.value?.available === false ? targetLink.value?.unavailableReason : '',
  '',
  160,
))

const normalizePlanItem = (item, index) => {
  const text = clean(
    typeof item === 'string' ? item : item?.title || item?.label || item?.description || item?.goal || item?.text,
    '',
    180,
  )
  if (!text) return null
  const status = String(typeof item === 'object' ? item?.status || item?.state || '' : '').toLowerCase()
  const completed = ['completed', 'done', 'succeeded', 'accepted', 'passed'].includes(status)
  const active = ['running', 'in_progress', 'executing', 'active', 'reviewing', 'testing', 'reworking'].includes(status)
  return { id: String(item?.id || item?.key || `${index}:${text}`), text, completed, active }
}
const executionPlan = computed(() => {
  const plan = props.card.plan_mode || props.card.planMode || props.card.todo_plan || props.card.todoPlan || props.card.execution_plan || props.card.executionPlan || {}
  const raw = asList(plan.steps || plan.items || plan.plan_steps || plan.planSteps || plan.todos)
  const candidates = raw.length ? raw : workItems.value
  return candidates.map(normalizePlanItem).filter(Boolean).slice(0, 5)
})

const actionKinds = new Set(['confirm', 'confirm_plan', 'revise_plan', 'approve_epic', 'targeted_rework', 'continue', 'continue_work_item', 'retry', 'resume', 'interrupt', 'resume_interrupted', 'gap_continue', 'cancel', 'rollback', 'save_knowledge'])
const primaryActions = computed(() => asList(props.card.actions)
  .filter(action => actionKinds.has(action?.kind))
  .slice(0, needsUser.value ? 2 : 1))

const taskId = computed(() => props.card.task_id || props.card.taskId || props.card.id || '')
const traceId = computed(() => props.card.trace_id || props.card.traceId || props.card.technical?.trace_id || '')

const emitReplay = () => emit('action', {
  id: 'task-replay',
  kind: 'view_trace',
  label: '任务回放',
  task_id: taskId.value,
  trace_id: traceId.value,
})
const openSource = () => emit('action', sourceLink.value?.available === false
  ? { kind: 'open_task_center', id: 'source-unavailable', label: '打开任务中心', reason: unavailableLinkReason.value }
  : { kind: 'open_source_session', id: 'open-source-session', label: '返回原任务', link: sourceLink.value })
const openTaskCenter = () => emit('action', { kind: 'open_task_center', id: 'target-unavailable', label: '打开任务中心', reason: unavailableLinkReason.value })
</script>

<template>
  <article class="task-summary" :class="[`context-${context}`, `tone-${phaseMeta.tone}`, { terminal }]">
    <header class="task-summary-head">
      <div class="task-summary-title">
        <component :is="phaseMeta.icon" :class="{ spinning: ['running', 'reviewing'].includes(phaseMeta.tone) && !terminal }" :size="17" aria-hidden="true" />
        <div>
          <span>{{ contextLabel }}</span>
          <strong>{{ title }}</strong>
        </div>
      </div>
      <div class="task-summary-state">
        <span>{{ phaseMeta.label }}</span>
        <b>{{ progress }}%</b>
      </div>
    </header>

    <div class="task-summary-progress" aria-label="任务进度">
      <span :style="{ width: `${progress}%` }"></span>
    </div>

    <section v-if="sourceLink || targetLink" class="task-conversation-route" aria-label="任务来源与目标">
      <div><small>来源</small><strong>{{ sourceLabel }}</strong></div>
      <ChevronRight :size="13" aria-hidden="true" />
      <div><small>目标</small><strong>{{ targetLabel }}</strong></div>
      <button v-if="sourceLink" type="button" @click="openSource">
        {{ sourceLink.available === false ? '打开任务中心' : '返回原任务' }}<ExternalLink :size="12" aria-hidden="true" />
      </button>
      <button v-if="targetLink?.available === false" type="button" @click="openTaskCenter">
        打开任务中心<ExternalLink :size="12" aria-hidden="true" />
      </button>
      <p v-if="unavailableLinkReason">{{ unavailableLinkReason }}</p>
    </section>

    <section v-if="showRequestContract" class="task-request-contract">
      <header>
        <span>需求确认</span>
        <b>{{ journey.request.executionMode }}</b>
      </header>
      <p>{{ journey.request.goal }}</p>
      <div class="request-contract-facts">
        <span v-if="journey.request.projects.length"><small>执行范围</small>{{ journey.request.projects.join('、') }}</span>
        <span v-else-if="journey.request.scope.length"><small>影响范围</small>{{ journey.request.scope.join('、') }}</span>
        <span v-if="journey.request.acceptance.length"><small>验收标准</small>{{ journey.request.acceptance.length }} 项</span>
        <span v-if="journey.sources"><small>提交资料</small>{{ journey.sources.label }}</span>
      </div>
      <p v-if="journey.request.clarification.length" class="request-contract-warning">
        还需确认：{{ journey.request.clarification.join('；') }}
      </p>
      <p v-else-if="journey.sources?.attention" class="request-contract-warning">
        {{ journey.sources.headline }}
      </p>
    </section>

    <section v-if="journey.intervention" class="task-intervention">
      <AlertTriangle :size="16" aria-hidden="true" />
      <div>
        <strong>{{ journey.intervention.title }}</strong>
        <p>{{ journey.intervention.reason }}</p>
        <small>{{ journey.intervention.action }}</small>
        <em>{{ journey.intervention.impact }}</em>
      </div>
    </section>

    <section v-else-if="journey.queue && phase === 'queued'" class="task-queue-overview">
      <Clock3 :size="15" aria-hidden="true" />
      <div><strong>{{ journey.queue.label }}</strong><span>{{ journey.queue.reason }}</span></div>
    </section>

    <section v-if="journey.rework && phase === 'reworking'" class="task-rework-overview">
      <ListChecks :size="15" aria-hidden="true" />
      <div><strong>{{ journey.rework.label }}</strong><span>{{ journey.rework.headline }}</span></div>
    </section>

    <section v-if="executionPlan.length" class="task-readable-plan">
      <header><ListChecks :size="14" aria-hidden="true" /><strong>执行计划</strong><small>{{ completedWorkCount }}/{{ executionPlan.length }}</small></header>
      <ol>
        <li v-for="item in executionPlan" :key="item.id" :class="{ completed: item.completed, active: item.active }">
          <span>{{ item.completed ? '✓' : item.active ? '●' : '○' }}</span>{{ item.text }}
        </li>
      </ol>
    </section>

    <p class="task-summary-copy">{{ terminal ? terminalSummary : liveSummary }}</p>
    <div :class="['task-runtime-pulse', `tone-${heartbeatTone}`]">
      <Activity :size="14" aria-hidden="true" />
      <span>{{ heartbeatText }}</span>
      <small>{{ elapsedLabel }}</small>
    </div>
    <p
      v-if="nextAction"
      class="task-summary-next"
    ><strong>下一步</strong>{{ nextAction }}</p>
    <p v-if="responsibleLabel" class="task-summary-responsible"><small>负责项目</small><strong>{{ responsibleLabel }}</strong></p>

    <div v-if="metrics.length" class="task-summary-metrics">
      <span v-for="item in metrics" :key="item.label"><small>{{ item.label }}</small><b>{{ item.value }}</b></span>
    </div>

    <div v-if="terminal && (completionItems.length || verificationItems.length || riskItems.length)" class="task-summary-result">
      <section v-if="completionItems.length">
        <strong>{{ failed ? '已完成部分' : cancelled ? '已保留进展' : '主要完成' }}</strong>
        <ul><li v-for="item in completionItems" :key="item">{{ item }}</li></ul>
      </section>
      <section v-if="verificationItems.length">
        <strong>验证结果</strong>
        <ul><li v-for="item in verificationItems" :key="item">{{ item }}</li></ul>
      </section>
      <section v-if="riskItems.length" class="risks">
        <strong>{{ failed ? '失败原因' : '风险与待确认' }}</strong>
        <ul><li v-for="item in riskItems" :key="item">{{ item }}</li></ul>
      </section>
    </div>

    <footer class="task-summary-actions">
      <button
        v-for="action in primaryActions"
        :key="action.id || action.kind"
        type="button"
        :disabled="busy"
        :class="['summary-command', action.tone || 'outline']"
        @click="emit('action', action)"
      >{{ action.label || '继续' }}</button>
      <button v-if="fileCount" type="button" class="summary-link" @click="emit('action', { kind: 'view_changes', id: 'changes', label: '查看改动' })">
        <FileDiff :size="14" aria-hidden="true" />查看改动
      </button>
      <button v-if="taskId" type="button" class="summary-link" @click="emitReplay">
        <ListChecks :size="14" aria-hidden="true" />任务回放
      </button>
      <button type="button" class="summary-link details" @click="emit('open-details')">
        查看详情<ChevronRight :size="14" aria-hidden="true" />
      </button>
    </footer>
  </article>
</template>

<style scoped>
.task-summary {
  width: min(100%, 760px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-blue) 28%, var(--border-color));
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-primary);
}
.task-summary-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 14px 10px;
}
.task-summary-title { display: flex; min-width: 0; gap: 9px; align-items: flex-start; color: var(--accent-blue); }
.task-summary-title > div { display: grid; min-width: 0; gap: 2px; }
.task-summary-title span { color: var(--text-muted); font-size: 10px; font-weight: 800; }
.task-summary-title strong { overflow: hidden; color: var(--text-primary); font-size: 14px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.task-summary-state { display: flex; flex: none; align-items: center; gap: 8px; }
.task-summary-state span { padding: 3px 7px; border-radius: 5px; background: var(--accent-soft); color: var(--accent-blue); font-size: 10px; font-weight: 800; }
.task-summary-state b { color: var(--text-secondary); font-size: 11px; }
.task-summary-progress { height: 2px; background: var(--panel-muted); }
.task-summary-progress span { display: block; height: 100%; background: var(--accent-blue); transition: width .25s ease; }
.task-conversation-route { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin: 10px 14px 0; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--panel-muted); }
.task-conversation-route > div { display: inline-flex; min-width: 0; align-items: baseline; gap: 5px; }
.task-conversation-route small { color: var(--text-muted); font-size: 9.5px; }
.task-conversation-route strong { overflow: hidden; max-width: 180px; color: var(--text-secondary); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
.task-conversation-route > svg { flex: none; color: var(--text-muted); }
.task-conversation-route button { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 3px 5px; border: 0; background: transparent; color: var(--accent-blue); font: inherit; font-size: 10px; font-weight: 800; cursor: pointer; }
.task-conversation-route button:hover { text-decoration: underline; }
.task-conversation-route p { flex-basis: 100%; margin: 0; color: #b45309; font-size: 9.5px; line-height: 1.4; }
.task-request-contract { display: grid; gap: 7px; margin: 11px 14px 2px; padding: 10px 11px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--panel-muted); }
.task-request-contract header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.task-request-contract header span { color: var(--text-primary); font-size: 11px; font-weight: 850; }
.task-request-contract header b { color: var(--accent-blue); font-size: 10px; }
.task-request-contract > p { margin: 0; color: var(--text-secondary); font-size: 11.5px; font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
.request-contract-facts { display: flex; flex-wrap: wrap; gap: 5px 14px; }
.request-contract-facts span { color: var(--text-secondary); font-size: 10.5px; }
.request-contract-facts small { margin-right: 5px; color: var(--text-muted); font-size: 10px; }
.task-request-contract .request-contract-warning { color: #b45309; font-size: 10.5px; }
.task-intervention { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 9px; margin: 11px 14px 2px; padding: 10px 11px; border: 1px solid color-mix(in srgb, #f59e0b 42%, var(--border-color)); border-radius: 6px; background: color-mix(in srgb, #f59e0b 8%, var(--surface)); color: #d97706; }
.task-intervention > div { display: grid; gap: 3px; }
.task-intervention strong { color: var(--text-primary); font-size: 11.5px; }
.task-intervention p,.task-intervention small,.task-intervention em { margin: 0; font-size: 10.5px; line-height: 1.45; overflow-wrap: anywhere; }
.task-intervention p { color: var(--text-secondary); }.task-intervention small { color: #b45309; font-weight: 750; }.task-intervention em { color: var(--text-muted); font-style: normal; }
.task-queue-overview,.task-rework-overview { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: 8px; margin: 10px 14px 1px; padding: 8px 9px; border: 1px solid var(--border-color); border-radius: 6px; color: var(--accent-blue); background: var(--panel-muted); }
.task-queue-overview > div,.task-rework-overview > div { display: grid; gap: 2px; }
.task-queue-overview strong,.task-rework-overview strong { color: var(--text-primary); font-size: 10.5px; }
.task-queue-overview span,.task-rework-overview span { color: var(--text-secondary); font-size: 10px; line-height: 1.4; overflow-wrap: anywhere; }
.task-rework-overview { border-color: color-mix(in srgb, #f59e0b 30%, var(--border-color)); color: #d97706; }
.task-readable-plan { display: grid; gap: 6px; margin: 10px 14px 1px; padding: 9px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: color-mix(in srgb, var(--surface) 82%, var(--panel-muted)); }
.task-readable-plan header { display: flex; align-items: center; gap: 6px; color: var(--accent-blue); }
.task-readable-plan header strong { color: var(--text-primary); font-size: 10.5px; }
.task-readable-plan header small { margin-left: auto; color: var(--text-muted); font-size: 9.5px; }
.task-readable-plan ol { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.task-readable-plan li { display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 4px; color: var(--text-secondary); font-size: 10.5px; line-height: 1.4; overflow-wrap: anywhere; }
.task-readable-plan li > span { color: var(--text-muted); text-align: center; }
.task-readable-plan li.completed { color: var(--text-muted); text-decoration: line-through; }
.task-readable-plan li.completed > span { color: #16a34a; }
.task-readable-plan li.active { color: var(--text-primary); font-weight: 750; }
.task-readable-plan li.active > span { color: var(--accent-blue); }
.task-summary-copy { margin: 0; padding: 12px 14px 8px; color: var(--text-secondary); font-size: 12.5px; font-weight: 700; line-height: 1.55; overflow-wrap: anywhere; }
.task-runtime-pulse { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 7px; margin: 0 14px 9px; padding: 7px 9px; border: 1px solid color-mix(in srgb, var(--accent-blue) 18%, var(--border-color)); border-radius: 6px; background: color-mix(in srgb, var(--accent-blue) 5%, var(--surface)); color: var(--accent-blue); }
.task-runtime-pulse span { min-width: 0; color: var(--text-secondary); font-size: 10.5px; font-weight: 750; line-height: 1.4; overflow-wrap: anywhere; }
.task-runtime-pulse small { color: var(--text-muted); font-size: 10px; white-space: nowrap; }
.task-runtime-pulse.tone-success { border-color: color-mix(in srgb, #22c55e 28%, var(--border-color)); color: #16a34a; }
.task-runtime-pulse.tone-warning { border-color: color-mix(in srgb, #f59e0b 32%, var(--border-color)); color: #d97706; }
.task-runtime-pulse.tone-danger { border-color: color-mix(in srgb, #ef4444 32%, var(--border-color)); color: #dc2626; }
.task-runtime-pulse.tone-muted { color: var(--text-muted); }
.task-summary-next { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 7px; margin: 0; padding: 0 14px 9px; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.task-summary-next strong { color: #d97706; font-size: 10.5px; }
.task-summary-responsible { display: flex; min-width: 0; align-items: center; gap: 7px; margin: 0; padding: 0 14px 7px; }
.task-summary-responsible small { flex: none; color: var(--text-muted); font-size: 10.5px; }
.task-summary-responsible strong { overflow: hidden; color: var(--text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.task-summary-metrics { display: flex; flex-wrap: wrap; gap: 6px 18px; padding: 4px 14px 11px; }
.task-summary-metrics span { display: inline-flex; align-items: baseline; gap: 5px; }
.task-summary-metrics small { color: var(--text-muted); font-size: 10.5px; }
.task-summary-metrics b { color: var(--text-secondary); font-size: 11.5px; }
.task-summary-result { display: grid; gap: 10px; padding: 2px 14px 12px; }
.task-summary-result section { min-width: 0; }
.task-summary-result strong { color: var(--text-primary); font-size: 11.5px; }
.task-summary-result ul { display: grid; gap: 3px; margin: 5px 0 0; padding-left: 18px; }
.task-summary-result li { color: var(--text-secondary); font-size: 11.5px; line-height: 1.45; overflow-wrap: anywhere; }
.task-summary-result .risks strong, .tone-danger .task-summary-title { color: #dc2626; }
.task-summary-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 9px 12px; border-top: 1px solid var(--border-color); }
.task-summary-actions button { min-height: 30px; border-radius: 6px; font-family: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
.summary-link { display: inline-flex; align-items: center; gap: 5px; padding: 5px 8px; border: 0; background: transparent; color: var(--text-secondary); }
.summary-link:hover { background: var(--panel-muted); color: var(--text-primary); }
.summary-link.details { margin-left: auto; color: var(--accent-blue); }
.summary-command { padding: 5px 9px; border: 1px solid var(--border-color); background: var(--surface); color: var(--text-secondary); }
.summary-command.primary { border-color: var(--accent-blue); background: var(--accent-blue); color: #fff; }
.summary-command.warning { border-color: rgba(245,158,11,.35); color: #b45309; }
.summary-command.danger { border-color: rgba(239,68,68,.35); color: #dc2626; }
.summary-command:disabled { cursor: not-allowed; opacity: .55; }
.tone-success { border-color: color-mix(in srgb, #22c55e 32%, var(--border-color)); }
.tone-success .task-summary-title, .tone-success .task-summary-state span { color: #16a34a; }
.tone-success .task-summary-progress span { background: #22c55e; }
.tone-warning { border-color: color-mix(in srgb, #f59e0b 35%, var(--border-color)); }
.tone-warning .task-summary-title, .tone-warning .task-summary-state span { color: #d97706; }
.tone-warning .task-summary-progress span { background: #f59e0b; }
.tone-danger .task-summary-progress span { background: #ef4444; }
.context-global { border-left: 3px solid #8b5cf6; }
.context-project { border-left: 3px solid #10b981; }
.context-group { border-left: 3px solid var(--accent-blue); }
.spinning { animation: summary-spin 1.2s linear infinite; }
@keyframes summary-spin { to { transform: rotate(360deg); } }
@media (max-width: 680px) {
  .task-summary-head { gap: 8px; padding: 11px 12px 9px; }
  .task-summary-state b { display: none; }
  .task-summary-copy { padding-inline: 12px; }
  .task-conversation-route,.task-request-contract,.task-intervention,.task-queue-overview,.task-rework-overview,.task-readable-plan { margin-inline: 12px; }
  .task-conversation-route button { flex-basis: 100%; justify-content: flex-start; margin-left: 0; }
  .task-runtime-pulse { grid-template-columns: auto minmax(0, 1fr); margin-inline: 12px; }
  .task-runtime-pulse small { grid-column: 2; }
  .task-summary-metrics { padding-inline: 12px; gap: 5px 12px; }
  .task-summary-result { padding-inline: 12px; }
  .summary-link.details { margin-left: 0; }
}
</style>
