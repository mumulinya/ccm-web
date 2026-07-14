<script setup>
import { computed } from 'vue'
import { getDisplayStream, getStreamlinedToolSummary, getStreamlinedUserText, getTechnicalDetailSections, sanitizeUserFacingPlanStructure, sanitizeUserFacingPlanText, sanitizeUserFacingStructure } from '../../utils/agentDisplay.js'
import { isQuietMainAgentConversationDecision } from '../../composables/useMainAgentDisplay.js'

const props = defineProps({
  decision: { type: Object, default: null },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['step-action'])
const shouldHideDecisionCard = computed(() => isQuietMainAgentConversationDecision(props.decision))

const displayPlanText = (value, fallback = '计划信息已整理。', max = 260) => sanitizeUserFacingPlanText(value, fallback, max)
const displayPlanStructure = (value, fallback = '计划信息已整理。', max = 260) => sanitizeUserFacingPlanStructure(value, { fallback, max })

const actionLabels = {
  read_group_context: '读取群聊上下文',
  read_project_code_snapshot: '读取项目代码快照',
  query_knowledge_base: '查询知识库',
  inspect_task_status: '查看任务状态',
  create_project_task: '创建项目任务',
  dispatch_child_agent: '安排执行成员',
  ask_user_clarification: '追问用户',
  govern_task_lifecycle: '任务治理',
  read_child_agent_receipts: '读取执行成员结果说明',
  replan_from_observation: '重新规划',
  generate_final_reply: '生成回复',
}

const modeInfo = computed(() => {
  const mode = props.decision?.mode || ''
  if (mode === 'project_analysis') return { label: '项目分析', tone: 'analysis', icon: '🔎', summary: '只读查看项目上下文并回答，不创建任务。' }
  if (mode === 'project_task') return { label: '项目任务', tone: 'task', icon: '🧩', summary: '已把明确需求转成项目任务，并进入执行队列。' }
  if (mode === 'delegation') return { label: '协调安排', tone: 'task', icon: '🧠', summary: '我正在拆分计划并安排执行成员。' }
  if (mode === 'goal_revision') return { label: '目标调整', tone: 'task', icon: '🧭', summary: '旧方向已停止，我正在按新目标重新规划。' }
  if (mode === 'followup') return { label: '追加要求', tone: 'task', icon: '🔁', summary: '已并入原任务，我会基于当前状态继续。' }
  if (mode === 'governance') return { label: '任务治理', tone: 'govern', icon: '🛡️', summary: '停止、取消、归档等动作需要显式授权。' }
  return { label: '普通回复', tone: 'chat', icon: '💬', summary: '只处理当前对话，不创建任务。' }
})

const selectedActions = computed(() => Array.isArray(props.decision?.decision?.selected_actions) ? props.decision.decision.selected_actions : [])
const visibleActions = computed(() => selectedActions.value.map(id => actionLabels[id] || id).slice(0, props.compact ? 4 : 6))
const observation = computed(() => props.decision?.observation || {})
const permissions = computed(() => Array.isArray(props.decision?.permissions) ? props.decision.permissions : [])
const blockedPermissions = computed(() => permissions.value.filter(item => item.allowed === false))
const allowedWrites = computed(() => permissions.value.filter(item => item.allowed && ['write', 'high'].includes(item.risk)))
const dispatchPolicy = computed(() => props.decision?.decision?.dispatch_policy || null)
const verify = computed(() => props.decision?.verify || {})
const internalLoop = computed(() => props.decision?.internal_loop || props.decision?.loop || null)
const loopStages = computed(() => Array.isArray(internalLoop.value?.stages) ? internalLoop.value.stages : [])
const PLAN_VISIBLE_LIMIT = 7
const todoPlan = computed(() => props.decision?.todo_plan || props.decision?.todoPlan || null)
const isQuietCompletedStatus = (status) => ['completed', 'skipped', 'cancelled'].includes(status)
const prioritizePlanSteps = (steps) => {
  const raw = Array.isArray(steps) ? steps : []
  if (raw.length <= PLAN_VISIBLE_LIMIT) return raw
  const activeIndex = raw.findIndex(step => ['failed', 'needs_confirmation', 'reworking', 'reviewing', 'in_progress'].includes(step.status))
  const finalIndex = raw.length - 1
  const selected = new Set()
  const addIndex = (index) => {
    if (index >= 0 && index < raw.length) selected.add(index)
  }
  addIndex(activeIndex)
  addIndex(finalIndex)
  addIndex(raw.findIndex(step => step.status === 'pending'))
  raw.forEach((step, index) => {
    if (!isQuietCompletedStatus(step.status)) addIndex(index)
  })
  raw
    .map((step, index) => ({ step, index }))
    .filter(item => isQuietCompletedStatus(item.step.status))
    .slice(-2)
    .forEach(item => addIndex(item.index))
  const ordered = [...selected].sort((a, b) => a - b)
  while (ordered.length > PLAN_VISIBLE_LIMIT) {
    const removable = ordered.findIndex(index => isQuietCompletedStatus(raw[index]?.status) && index !== finalIndex)
    if (removable >= 0) ordered.splice(removable, 1)
    else ordered.splice(0, 1)
  }
  return ordered.map(index => raw[index])
}
const rawPlanSteps = computed(() => {
  const raw = Array.isArray(props.decision?.user_plan_steps)
    ? props.decision.user_plan_steps
    : Array.isArray(todoPlan.value?.steps)
      ? todoPlan.value.steps
      : []
  return Array.isArray(raw) ? displayPlanStructure(raw, '计划步骤已整理。', 260) : []
})
const todoPlanPolicy = computed(() => ({
  ...(todoPlan.value?.display || {}),
  ...(todoPlan.value?.display_policy || todoPlan.value?.displayPolicy || {}),
}))
const hasTodoVerificationNudge = computed(() => Boolean(
  todoPlan.value?.verification_nudge === true
    || todoPlan.value?.verificationNudge === true
    || todoPlan.value?.verification_reminder
    || todoPlan.value?.verificationReminder
))
const shouldArchiveCompletedPlan = computed(() => {
  const policy = todoPlanPolicy.value
  const archiveCompleted = policy.archive_completed_todo === true
    || policy.archiveCompletedTodo === true
    || policy.archived_when_complete === true
    || policy.archivedWhenComplete === true
    || policy.visible_when_completed === false
    || policy.visibleWhenCompleted === false
  if (!archiveCompleted || hasTodoVerificationNudge.value) return false
  return rawPlanSteps.value.length > 0 && rawPlanSteps.value.every(step => ['completed', 'skipped', 'cancelled'].includes(String(step?.status || '').toLowerCase()))
})
const planSteps = computed(() => prioritizePlanSteps(rawPlanSteps.value))
const shouldHideSimpleConversationPlan = computed(() => {
  if (shouldArchiveCompletedPlan.value) return true
  const display = todoPlan.value?.display || {}
  const policy = todoPlan.value?.display_policy || todoPlan.value?.displayPolicy || {}
  if (policy.user_visible === false || policy.hide_for_ordinary_conversation === true || policy.hideForOrdinaryConversation === true) return true
  if (props.decision?.mode !== 'conversation') return false
  if (display.user_visible === true && display.hide_for_simple_conversation !== true) return false
  const hasBlockingOrAction = blockedPermissions.value.length > 0 || planSteps.value.some(step => ['failed', 'needs_confirmation', 'reworking', 'reviewing', 'in_progress'].includes(step.status))
  return display.user_visible === false || display.hide_for_simple_conversation === true || !hasBlockingOrAction
})
const hasExplicitPlan = computed(() => planSteps.value.length > 0 && !shouldHideSimpleConversationPlan.value)
const planTitle = computed(() => todoPlan.value?.title ? displayPlanText(todoPlan.value.title, '我准备这样处理', 90) : (hasExplicitPlan.value ? '我准备这样处理' : '处理步骤'))
const visiblePlanSteps = computed(() => {
  if (shouldHideSimpleConversationPlan.value) return []
  if (hasExplicitPlan.value) return planSteps.value
  if (props.decision?.mode === 'conversation') return []
  return selectedActions.value.map((id, index) => ({
    id,
    content: actionLabels[id] || id,
    status: index === 0 ? 'completed' : 'pending',
    activeForm: actionLabels[id] || id,
  }))
})
const hiddenPlanCount = computed(() => hasExplicitPlan.value ? Math.max(0, rawPlanSteps.value.length - planSteps.value.length) : 0)
const fallbackVerificationReminder = () => ({
  schema: 'ccm-main-agent-plan-verification-reminder-v1',
  status: 'needs_verification_step',
  title: '还缺验收步骤',
  headline: '完成前需要补一项真实验证，或者说明为什么当前不能验证。',
  next_action: '我会把验收补进计划，再继续交付总结。',
})
const verificationReminder = computed(() => {
  if (!visiblePlanSteps.value.length || props.decision?.mode === 'conversation') return null
  const raw = todoPlan.value?.verification_reminder
    || todoPlan.value?.verificationReminder
    || props.decision?.verification_reminder
    || props.decision?.verificationReminder
    || null
  const legacyNudge = todoPlan.value?.verification_nudge === true || todoPlan.value?.verificationNudge === true
  const reminder = raw || (legacyNudge ? fallbackVerificationReminder() : null)
  const policy = reminder?.display_policy || reminder?.displayPolicy || {}
  if (!reminder || policy.user_visible === false || policy.show_for_ordinary_conversation === true && props.decision?.mode === 'conversation') return null
  return sanitizeUserFacingStructure(reminder, {
    fallback: '完成前需要补一项真实验证，或者说明为什么当前不能验证。',
    max: 260,
  })
})
const planProgress = computed(() => {
  const steps = visiblePlanSteps.value
  if (!steps.length) return { done: 0, total: 0 }
  const done = steps.filter(step => ['completed', 'skipped', 'cancelled', 'failed'].includes(step.status)).length
  return { done, total: steps.length }
})
const planActiveStatuses = ['failed', 'needs_confirmation', 'reworking', 'reviewing', 'in_progress']
const currentPlanStep = computed(() => visiblePlanSteps.value.find(step => planActiveStatuses.includes(step.status)) || visiblePlanSteps.value.find(step => step.status === 'pending') || null)
const nextPlanStep = computed(() => {
  const currentIndex = visiblePlanSteps.value.findIndex(step => step === currentPlanStep.value)
  return visiblePlanSteps.value.find((step, index) => index > currentIndex && ['pending', 'in_progress', 'reviewing', 'reworking', 'needs_confirmation'].includes(step.status)) || null
})
const currentPlanActions = computed(() => Array.isArray(currentPlanStep.value?.actions) ? currentPlanStep.value.actions : [])
const livePlanActiveStatus = computed(() => visiblePlanSteps.value.find(step => ['failed', 'needs_confirmation', 'reworking', 'reviewing', 'in_progress'].includes(step.status))?.status || '')
const verifyBadge = computed(() => {
  if (verify.value?.passed) return { label: '已检查', tone: 'ok' }
  if (['failed', 'needs_confirmation'].includes(livePlanActiveStatus.value)) return { label: '需处理', tone: 'warn' }
  if (livePlanActiveStatus.value === 'reworking') return { label: '返工中', tone: 'work' }
  if (livePlanActiveStatus.value === 'reviewing') return { label: '验收中', tone: 'work' }
  if (livePlanActiveStatus.value === 'in_progress') return { label: '进行中', tone: 'work' }
  return { label: '需确认', tone: 'warn' }
})
const statusLabels = {
  pending: '待执行',
  in_progress: '进行中',
  reviewing: '验收中',
  reworking: '返工中',
  completed: '已完成',
  skipped: '跳过',
  needs_confirmation: '需确认',
  failed: '失败',
  cancelled: '已取消',
}
const statusIcon = (status) => ({
  pending: '○',
  in_progress: '◐',
  reviewing: '◇',
  reworking: '↻',
  completed: '✓',
  skipped: '−',
  needs_confirmation: '!',
  failed: '×',
  cancelled: '×',
}[status] || '○')
const statusText = (status) => statusLabels[status] || status || '待执行'
const planFocusLabel = (status) => ({
  failed: '需要处理',
  needs_confirmation: '等待确认',
  reworking: '正在返工',
  reviewing: '正在验收',
  in_progress: '正在处理',
  pending: '下一步',
}[status] || '当前步骤')
const stepActiveText = (step) => {
  const text = step?.activeForm || step?.active_form || ''
  return text ? displayPlanText(text, '当前动作已整理。', 180) : ''
}
const stepContentText = (step) => {
  const text = step?.content || step?.title || step?.subject || stepActiveText(step) || ''
  return text ? displayPlanText(text, '待处理', 220) : '待处理'
}
const stepDisplayText = (step) => {
  const activeText = stepActiveText(step)
  if (activeText && ['in_progress', 'reviewing', 'reworking'].includes(step?.status)) return activeText
  return stepContentText(step)
}
const evidenceTypeLabel = (type) => ({
  task: '任务',
  trace: '技术记录',
  agent: 'Agent',
  execution: '执行',
  receipt: '结果说明',
  verification: '验证',
  acceptance: '验收',
  blocker: '阻塞',
  files: '文件',
  report: '报告',
}[type] || type || '证据')
const loopStatusText = (status) => ({
  pending: '等待',
  in_progress: '进行中',
  completed: '完成',
  skipped: '跳过',
  needs_confirmation: '需确认',
  reviewing: '验收',
  reworking: '返工',
  failed: '失败',
}[status] || status || '等待')

const contextLabels = computed(() => {
  const labels = []
  if (selectedActions.value.includes('read_group_context')) labels.push('群聊上下文')
  if (selectedActions.value.includes('read_project_code_snapshot')) labels.push('项目代码快照')
  if (selectedActions.value.includes('query_knowledge_base')) labels.push('知识库')
  if (selectedActions.value.includes('inspect_task_status')) labels.push('任务状态')
  if (selectedActions.value.includes('read_child_agent_receipts')) labels.push('执行成员结果说明')
  return labels
})

const nextStep = computed(() => displayPlanText(dispatchPolicy.value?.nextStep || (verify.value?.passed ? '已完成本轮回复' : '等待用户确认或补充信息'), '等待下一步。', 180))
const reason = computed(() => dispatchPolicy.value?.reason || props.decision?.decision?.reason || modeInfo.value.summary)
const publicHeaderNote = computed(() => modeInfo.value.summary)
const rawJson = computed(() => JSON.stringify(props.decision || {}, null, 2))
const displayStream = computed(() => getDisplayStream(props.decision))
const workchain = computed(() => displayPlanStructure(displayStream.value?.workchain || props.decision?.workchain || null, '处理链路已整理。', 260))
const workchainStages = computed(() => Array.isArray(workchain.value?.stages) ? workchain.value.stages : [])
const streamlinedText = computed(() => getStreamlinedUserText(props.decision, modeInfo.value.summary))
const streamlinedToolSummary = computed(() => getStreamlinedToolSummary(props.decision, visibleActions.value.join('、')))
const dispatchLaunchSummary = computed(() => sanitizeUserFacingPlanStructure(
  props.decision?.dispatch_launch_summary
    || props.decision?.dispatchLaunchSummary
    || displayStream.value?.dispatch_launch_summary
    || displayStream.value?.dispatchLaunchSummary
    || null,
  { fallback: '派发信息已整理，技术细节已放入技术详情。', max: 260 }
))
const dispatchLaunchRows = computed(() => Array.isArray(dispatchLaunchSummary.value?.rows)
  ? dispatchLaunchSummary.value.rows.map(row => ({
    ...row,
    role: sanitizeUserFacingPlanText(row.role || '执行成员', '执行成员', 80),
    task: row.task ? sanitizeUserFacingPlanText(row.task, '执行任务已整理。', 220) : row.task,
    reason: row.reason ? sanitizeUserFacingPlanText(row.reason, '安排原因已整理。', 180) : row.reason,
  }))
  : [])
const technicalSections = computed(() => getTechnicalDetailSections(props.decision, {
  trace_id: props.decision?.trace_id,
  blockers: blockedPermissions.value.map(item => item.reason || item.action_id),
}))
const decisionExplanation = computed(() => {
  if (blockedPermissions.value.length) return `需要确认：${blockedPermissions.value.map(p => displayPlanText(p.reason || actionLabels[p.action_id] || p.action_id, '确认项已整理。', 120)).join('；')}`
  if (!selectedActions.value.includes('dispatch_child_agent') && props.decision?.mode === 'conversation') return '没有安排：这轮是普通对话，我只回复用户，不创建任务。'
  if (!selectedActions.value.includes('dispatch_child_agent') && props.decision?.mode === 'project_analysis') return '没有派发：这轮是只读项目分析，只读取上下文和代码快照，不修改项目。'
  if (selectedActions.value.includes('create_project_task')) return '已创建任务：当前消息包含明确执行意图，允许进入项目任务流程。'
  if (selectedActions.value.includes('dispatch_child_agent')) return '已安排：我已生成执行任务，等待执行成员执行并提交结果说明。'
  return modeInfo.value.summary
})
const userSummary = computed(() => {
  if (displayStream.value?.user_visible_text) return streamlinedText.value
  if (blockedPermissions.value.length) return decisionExplanation.value
  if (props.decision?.mode === 'conversation') return '已判断为普通对话，我会直接回复用户，不创建任务。'
  if (props.decision?.mode === 'project_analysis') return '已判断为只读项目分析，只读取必要上下文并回答，不派发开发任务。'
  return decisionExplanation.value || modeInfo.value.summary
})
const actionRows = computed(() => selectedActions.value.map(id => {
  const permission = permissions.value.find(item => item.action_id === id) || {}
  return {
    id,
    label: actionLabels[id] || id,
    allowed: permission.allowed !== false,
    risk: permission.risk || 'safe',
    reason: permission.reason || '',
  }
}))
</script>

<template>
  <section v-if="decision && !shouldHideDecisionCard" class="main-agent-decision-card" :class="[`tone-${modeInfo.tone}`, { compact }]">
    <header>
      <div class="decision-title">
        <span class="decision-icon">{{ modeInfo.icon }}</span>
        <div>
          <strong>处理方式：{{ modeInfo.label }}</strong>
          <small>{{ publicHeaderNote }}</small>
        </div>
      </div>
      <span class="decision-verify" :class="verifyBadge.tone">
        {{ verifyBadge.label }}
      </span>
    </header>

    <div class="decision-public-summary">
      <strong>{{ userSummary }}</strong>
      <small v-if="nextStep">下一步：{{ nextStep }}</small>
      <small v-if="streamlinedToolSummary" class="tool-use-summary">工具摘要：{{ streamlinedToolSummary }}</small>
    </div>

    <div v-if="dispatchLaunchRows.length" class="dispatch-launch-summary">
      <div class="dispatch-launch-head">
        <strong>{{ dispatchLaunchSummary.title || '已派发的工作' }}</strong>
        <span>{{ dispatchLaunchSummary.count_label || `${dispatchLaunchRows.length} 个执行成员目标` }}</span>
      </div>
      <p v-if="dispatchLaunchSummary.headline">{{ dispatchLaunchSummary.headline }}</p>
      <div class="dispatch-launch-list">
        <div v-for="row in dispatchLaunchRows" :key="row.id || row.agent" class="dispatch-launch-row">
          <div>
            <span>{{ row.role || '执行成员' }} · {{ row.agent }}</span>
            <em>{{ row.status_label || '已派发' }}</em>
          </div>
          <strong>{{ row.task }}</strong>
          <small v-if="row.reason">{{ row.reason }}</small>
          <small v-if="row.depends_on?.length">依赖：{{ row.depends_on.join('、') }}</small>
        </div>
      </div>
      <small v-if="dispatchLaunchSummary.next_action" class="dispatch-launch-next">下一步：{{ dispatchLaunchSummary.next_action }}</small>
    </div>
    <div v-if="workchainStages.length" class="decision-workchain" aria-label="处理链路">
      <div v-for="stage in workchainStages" :key="stage.id" :class="['workchain-stage', stage.status]">
        <span>{{ stage.label }}</span>
        <small>{{ loopStatusText(stage.status) }}</small>
      </div>
    </div>

    <div class="decision-plan" v-if="visiblePlanSteps.length">
      <div class="plan-head">
        <strong>{{ planTitle }}</strong>
        <span>{{ planProgress.done }}/{{ planProgress.total }}</span>
      </div>
      <div v-if="currentPlanStep" class="plan-focus" :class="`status-${currentPlanStep.status || 'pending'}`">
        <span>{{ planFocusLabel(currentPlanStep.status) }}</span>
        <strong>{{ stepDisplayText(currentPlanStep) }}</strong>
        <small v-if="nextPlanStep">然后：{{ stepDisplayText(nextPlanStep) }}</small>
        <div v-if="currentPlanActions.length" class="plan-focus-actions">
          <button
            v-for="action in currentPlanActions"
            :key="action.id || action.kind"
            type="button"
            :class="['step-action-button', action.tone || 'outline']"
            @click.stop="emit('step-action', action)"
          >{{ action.label }}</button>
        </div>
      </div>
      <div v-if="verificationReminder" class="plan-verification-reminder">
        <span>{{ verificationReminder.title || '还缺验收步骤' }}</span>
        <strong>{{ verificationReminder.headline || '完成前需要补一项真实验证，或者说明为什么当前不能验证。' }}</strong>
        <small v-if="verificationReminder.next_action || verificationReminder.nextAction">下一步：{{ verificationReminder.next_action || verificationReminder.nextAction }}</small>
      </div>
      <ol>
        <li v-for="(step, index) in visiblePlanSteps" :key="step.id || index" :class="`status-${step.status || 'pending'}`">
          <span class="plan-index">{{ statusIcon(step.status) }}</span>
          <div>
            <strong>{{ stepDisplayText(step) }}</strong>
            <small v-if="stepActiveText(step) && stepDisplayText(step) !== stepContentText(step)">{{ stepContentText(step) }}</small>
            <small v-if="step.detail">{{ step.detail }}</small>
            <details v-if="step.evidence?.length || step.actions?.length" class="plan-step-evidence">
              <summary>证据与处理</summary>
              <div v-if="step.evidence?.length" class="evidence-list">
                <div v-for="(item, evidenceIndex) in step.evidence" :key="`${step.id}-ev-${evidenceIndex}`" class="evidence-row">
                  <span>{{ evidenceTypeLabel(item.type) }}</span>
                  <strong>{{ item.title }}</strong>
                  <small v-if="item.detail">{{ item.detail }}</small>
                </div>
              </div>
              <div v-if="step.actions?.length" class="step-actions">
                <button
                  v-for="action in step.actions"
                  :key="action.id || action.kind"
                  type="button"
                  :class="['step-action-button', action.tone || 'outline']"
                  @click.stop="emit('step-action', action)"
                >{{ action.label }}</button>
              </div>
            </details>
          </div>
          <em>{{ statusText(step.status) }}</em>
        </li>
      </ol>
      <small v-if="hiddenPlanCount" class="plan-hidden-summary">还有 {{ hiddenPlanCount }} 个步骤，可在任务详情中继续查看。</small>
    </div>

    <details class="decision-technical">
      <summary>技术详情</summary>

      <div v-if="loopStages.length" class="decision-loop">
        <div class="loop-head">
          <strong>内部工作循环</strong>
          <span>{{ internalLoop.current_label || internalLoop.current_stage }}</span>
        </div>
        <div class="loop-rail">
          <div v-for="stage in loopStages" :key="stage.id" :class="['loop-stage', stage.status]">
            <i>{{ stage.label }}</i>
            <small>{{ loopStatusText(stage.status) }}</small>
          </div>
        </div>
        <div v-if="!compact" class="loop-details">
          <div v-for="stage in loopStages" :key="`detail-${stage.id}`" class="loop-detail-row">
            <strong>{{ stage.title }}</strong>
            <span>{{ stage.tool_choice }}</span>
            <small v-if="stage.evidence?.length">{{ stage.evidence.join('；') }}</small>
          </div>
        </div>
      </div>

      <div class="decision-grid">
        <div>
          <span>读取内容</span>
          <strong>{{ contextLabels.length ? contextLabels.join('、') : '无额外读取' }}</strong>
        </div>
        <div>
          <span>本轮动作</span>
          <strong>{{ visibleActions.join(' → ') }}</strong>
        </div>
        <div>
          <span>权限判断</span>
          <strong v-if="blockedPermissions.length" class="warn-text">{{ blockedPermissions.map(p => actionLabels[p.action_id] || p.action_id).join('、') }} 需要确认</strong>
          <strong v-else>{{ allowedWrites.length ? '执行动作已获得当前消息授权' : '只读/安全动作' }}</strong>
        </div>
        <div>
          <span>决策说明</span>
          <strong>{{ decisionExplanation }}</strong>
        </div>
        <div>
          <span>下一步</span>
          <strong>{{ nextStep }}</strong>
        </div>
      </div>

      <div v-if="technicalSections.length" class="technical-sections">
        <section v-for="section in technicalSections" :key="section.id">
          <strong>{{ section.title }}</strong>
          <div v-for="item in section.items" :key="`${section.id}-${item.label}-${item.value}`" class="tech-row">
            <span>{{ item.label }}</span>
            <code>{{ item.value }}</code>
          </div>
        </section>
      </div>

      <div class="tech-row"><span>执行记录</span><code>{{ decision.trace_id ? '已关联' : '无' }}</code></div>
      <div class="tech-row"><span>动作</span><code>{{ selectedActions.join(', ') }}</code></div>
      <div class="tech-row"><span>观察</span><code>{{ observation.dispatch_action || observation.intent_kind || decision.mode }}</code></div>
      <div class="action-trace-list">
        <div v-for="row in actionRows" :key="row.id" class="action-trace-row" :class="{ blocked: !row.allowed }">
          <strong>{{ row.label }}</strong>
          <span>{{ row.risk }} · {{ row.allowed ? '允许' : '需确认' }}</span>
          <small v-if="row.reason">{{ row.reason }}</small>
        </div>
      </div>
      <pre>{{ rawJson }}</pre>
    </details>
  </section>
</template>

<style scoped>
.main-agent-decision-card { margin-top:10px; padding:12px; border:1px solid rgba(59,130,246,.2); border-radius:13px; background:linear-gradient(145deg,rgba(248,250,252,.96),rgba(239,246,255,.8)); color:var(--text-primary); box-shadow:0 8px 24px rgba(15,23,42,.04); }
.main-agent-decision-card.compact { padding:10px; }
.tone-analysis { border-color:rgba(14,165,233,.24); background:linear-gradient(145deg,rgba(240,249,255,.96),rgba(224,242,254,.78)); }
.tone-task { border-color:rgba(124,58,237,.24); background:linear-gradient(145deg,rgba(250,245,255,.96),rgba(239,246,255,.76)); }
.tone-govern { border-color:rgba(245,158,11,.28); background:linear-gradient(145deg,rgba(255,251,235,.96),rgba(254,243,199,.72)); }
header { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
.decision-title { display:flex; gap:9px; min-width:0; }
.decision-icon { width:26px; height:26px; display:grid; place-items:center; border-radius:9px; background:rgba(255,255,255,.7); }
.decision-title strong { display:block; font-size:13px; }
.decision-title small { display:block; margin-top:2px; color:#64748b; line-height:1.45; }
.decision-verify { flex:0 0 auto; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:700; }
.decision-verify.ok { background:#dcfce7; color:#166534; }.decision-verify.warn { background:#fef3c7; color:#92400e; }.decision-verify.work { background:#dbeafe; color:#1d4ed8; }
.decision-public-summary { margin-top:10px; padding:9px 10px; border-radius:10px; background:rgba(255,255,255,.62); border:1px solid rgba(148,163,184,.18); }
.decision-public-summary strong { display:block; color:#334155; font-size:12.5px; line-height:1.45; }
.decision-public-summary small { display:block; margin-top:3px; color:#64748b; font-size:11.5px; line-height:1.4; overflow-wrap:anywhere; }
.decision-public-summary .tool-use-summary { color:#2563eb; font-weight:800; }
.dispatch-launch-summary { display:grid; gap:8px; margin-top:9px; padding:10px; border:1px solid rgba(14,165,233,.18); border-radius:11px; background:rgba(240,249,255,.72); }
.dispatch-launch-head { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.dispatch-launch-head strong { color:#0f172a; font-size:12px; }
.dispatch-launch-head span { padding:2px 7px; border-radius:999px; background:rgba(14,165,233,.12); color:#0369a1; font-size:10px; font-weight:900; white-space:nowrap; }
.dispatch-launch-summary p { margin:0; color:#334155; font-size:12px; line-height:1.45; overflow-wrap:anywhere; }
.dispatch-launch-list { display:grid; gap:6px; }
.dispatch-launch-row { display:grid; gap:3px; padding:8px; border:1px solid rgba(14,165,233,.14); border-radius:9px; background:rgba(255,255,255,.68); }
.dispatch-launch-row div { display:flex; justify-content:space-between; gap:8px; align-items:center; }
.dispatch-launch-row span { color:#0369a1; font-size:10.5px; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dispatch-launch-row em { flex:0 0 auto; font-style:normal; color:#0f766e; font-size:10px; font-weight:900; }
.dispatch-launch-row strong { color:#1e293b; font-size:12px; line-height:1.4; overflow-wrap:anywhere; }
.dispatch-launch-row small,.dispatch-launch-next { color:#64748b; font-size:10.5px; line-height:1.35; overflow-wrap:anywhere; }
.decision-workchain { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:5px; margin-top:8px; }
.workchain-stage { min-width:0; padding:6px 5px; border:1px solid rgba(148,163,184,.18); border-radius:7px; background:rgba(248,250,252,.8); text-align:center; }
.workchain-stage span,.workchain-stage small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.workchain-stage span { color:#334155; font-size:10.5px; font-weight:800; }
.workchain-stage small { margin-top:2px; color:#64748b; font-size:9.8px; }
.workchain-stage.completed { border-color:rgba(34,197,94,.22); background:#f0fdf4; }
.workchain-stage.in_progress { border-color:rgba(37,99,235,.22); background:#eff6ff; }
.workchain-stage.needs_confirmation { border-color:rgba(245,158,11,.24); background:#fffbeb; }
.workchain-stage.failed { border-color:rgba(239,68,68,.22); background:#fef2f2; }
@media (max-width:640px){ .decision-workchain { grid-template-columns:repeat(2,minmax(0,1fr)); } }
.decision-loop { margin-top:10px; padding:9px; border:1px solid rgba(148,163,184,.18); border-radius:11px; background:rgba(255,255,255,.5); }
.loop-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:7px; }
.loop-head strong { font-size:12px; color:#334155; }
.loop-head span { padding:2px 7px; border-radius:999px; background:rgba(59,130,246,.1); color:#2563eb; font-size:10px; font-weight:800; }
.loop-rail { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:5px; }
.loop-stage { min-width:0; padding:6px 5px; border-radius:8px; background:#f8fafc; border:1px solid rgba(148,163,184,.16); text-align:center; }
.loop-stage i { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-style:normal; color:#475569; font-size:10px; font-weight:900; }
.loop-stage small { display:block; margin-top:2px; color:#94a3b8; font-size:9px; font-weight:800; }
.loop-stage.completed { background:#f0fdf4; border-color:#bbf7d0; }.loop-stage.completed i,.loop-stage.completed small { color:#166534; }
.loop-stage.in_progress,.loop-stage.reviewing,.loop-stage.reworking { background:#eff6ff; border-color:#bfdbfe; }.loop-stage.in_progress i,.loop-stage.in_progress small,.loop-stage.reviewing i,.loop-stage.reviewing small,.loop-stage.reworking i,.loop-stage.reworking small { color:#1d4ed8; }
.loop-stage.needs_confirmation { background:#fffbeb; border-color:#fde68a; }.loop-stage.needs_confirmation i,.loop-stage.needs_confirmation small { color:#92400e; }
.loop-stage.failed { background:#fef2f2; border-color:#fecaca; }.loop-stage.failed i,.loop-stage.failed small { color:#b91c1c; }
.loop-stage.skipped { opacity:.62; }
.loop-details { margin-top:7px; font-size:10.5px; color:#64748b; }
.loop-details summary { cursor:pointer; font-weight:800; color:#475569; }
.loop-detail-row { display:grid; grid-template-columns:86px minmax(0,1fr); gap:2px 8px; padding:6px 7px; margin-top:5px; border-radius:7px; background:rgba(248,250,252,.78); }
.loop-detail-row strong { color:#334155; font-size:11px; }
.loop-detail-row span { color:#64748b; line-height:1.35; }
.loop-detail-row small { grid-column:2; color:#2563eb; overflow-wrap:anywhere; }
.decision-plan { margin-top:10px; padding:10px; border:1px solid rgba(59,130,246,.16); border-radius:11px; background:rgba(255,255,255,.58); }
.plan-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:7px; }
.plan-head strong { font-size:12px; color:#1e293b; }
.plan-head span { padding:2px 7px; border-radius:999px; background:rgba(59,130,246,.1); color:#2563eb; font-size:10px; font-weight:800; }
.plan-focus { display:grid; gap:3px; margin-bottom:8px; padding:8px 9px; border-radius:9px; border:1px solid rgba(59,130,246,.18); background:rgba(239,246,255,.72); }
.plan-focus span { color:#2563eb; font-size:10px; font-weight:900; }
.plan-focus strong { color:#1e293b; font-size:12.5px; line-height:1.4; overflow-wrap:anywhere; }
.plan-focus small { color:#64748b; font-size:10.5px; line-height:1.35; overflow-wrap:anywhere; }
.plan-focus-actions { display:flex; flex-wrap:wrap; gap:5px; margin-top:4px; }
.plan-focus.status-needs_confirmation,.plan-focus.status-reworking { border-color:#fde68a; background:#fffbeb; }
.plan-focus.status-needs_confirmation span,.plan-focus.status-reworking span { color:#b45309; }
.plan-focus.status-failed { border-color:#fecaca; background:#fef2f2; }
.plan-focus.status-failed span { color:#dc2626; }
.plan-verification-reminder { display:grid; gap:3px; margin-bottom:8px; padding:8px 9px; border-radius:9px; border:1px solid #fde68a; background:#fffbeb; }
.plan-verification-reminder span { color:#b45309; font-size:10px; font-weight:900; }
.plan-verification-reminder strong { color:#78350f; font-size:12px; line-height:1.4; overflow-wrap:anywhere; }
.plan-verification-reminder small { color:#92400e; font-size:10.5px; line-height:1.35; overflow-wrap:anywhere; }
.decision-plan ol { list-style:none; margin:0; padding:0; display:grid; gap:6px; }
.decision-plan li { display:grid; grid-template-columns:20px minmax(0,1fr) auto; gap:7px; align-items:start; padding:6px 7px; border-radius:9px; background:rgba(248,250,252,.78); border:1px solid rgba(148,163,184,.14); }
.plan-index { width:18px; height:18px; display:grid; place-items:center; border-radius:999px; background:#e2e8f0; color:#475569; font-size:11px; font-weight:900; }
.decision-plan li strong { display:block; font-size:12px; color:#334155; line-height:1.4; }
.decision-plan li small { display:block; margin-top:2px; font-size:10.5px; color:#64748b; line-height:1.35; }
.decision-plan li em { font-style:normal; font-size:10px; font-weight:800; color:#64748b; white-space:nowrap; }
.plan-step-evidence { margin-top:6px; font-size:10.5px; color:#64748b; }
.plan-step-evidence summary { cursor:pointer; user-select:none; font-weight:800; color:#475569; }
.evidence-list { display:grid; gap:5px; margin-top:6px; }
.evidence-row { display:grid; grid-template-columns:46px minmax(0,1fr); gap:2px 7px; padding:6px 7px; border-radius:7px; background:rgba(255,255,255,.7); border:1px solid rgba(148,163,184,.14); }
.evidence-row span { color:#2563eb; font-weight:900; font-size:10px; }
.evidence-row strong { font-size:11px !important; color:#334155 !important; }
.evidence-row small { grid-column:2; margin:0 !important; overflow-wrap:anywhere; }
.step-actions { display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; }
.step-action-button { padding:4px 7px; border-radius:7px; border:1px solid #cbd5e1; background:#fff; color:#334155; font-size:10.5px; font-weight:800; cursor:pointer; }
.step-action-button.primary { background:#2563eb; border-color:#2563eb; color:#fff; }
.step-action-button.warning { background:#fffbeb; border-color:#fde68a; color:#92400e; }
.step-action-button.danger { border-color:#fecaca; color:#b91c1c; }
.step-action-button.success { background:#dcfce7; border-color:#bbf7d0; color:#166534; }
.decision-plan li.status-completed .plan-index { background:#dcfce7; color:#15803d; }
.decision-plan li.status-completed { opacity:.68; }
.decision-plan li.status-completed strong { text-decoration:line-through; color:#64748b; }
.decision-plan li.status-in_progress { border-color:rgba(59,130,246,.22); background:rgba(239,246,255,.82); }
.decision-plan li.status-in_progress .plan-index { background:#dbeafe; color:#2563eb; }
.decision-plan li.status-reviewing { border-color:rgba(14,165,233,.24); background:rgba(240,249,255,.86); }
.decision-plan li.status-reviewing .plan-index { background:#cffafe; color:#0891b2; }
.decision-plan li.status-reworking { border-color:rgba(245,158,11,.26); background:#fffbeb; }
.decision-plan li.status-reworking .plan-index { background:#fef3c7; color:#b45309; }
.decision-plan li.status-needs_confirmation { border-color:#fde68a; background:#fffbeb; }
.decision-plan li.status-needs_confirmation .plan-index { background:#fef3c7; color:#b45309; }
.decision-plan li.status-failed { border-color:#fecaca; background:#fef2f2; }
.decision-plan li.status-failed .plan-index { background:#fee2e2; color:#dc2626; }
.decision-plan li.status-cancelled { border-color:#cbd5e1; background:#f8fafc; }
.decision-plan li.status-cancelled .plan-index { background:#e2e8f0; color:#64748b; }
.decision-plan li.status-skipped { opacity:.74; }
.decision-plan li.status-skipped .plan-index { background:#f1f5f9; color:#94a3b8; }
.plan-hidden-summary { display:block; margin-top:7px; color:#64748b; font-size:10.5px; line-height:1.35; }
.decision-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:10px; }
.decision-grid div { padding:8px; border:1px solid rgba(148,163,184,.2); border-radius:9px; background:rgba(255,255,255,.58); }
.decision-grid span { display:block; margin-bottom:3px; font-size:11px; color:#64748b; }
.decision-grid strong { display:block; font-size:12px; color:#334155; line-height:1.45; overflow-wrap:anywhere; }
.warn-text { color:#92400e !important; }
.decision-technical { margin-top:9px; color:#64748b; font-size:11px; }
.decision-technical summary { cursor:pointer; font-weight:800; color:#475569; }
.technical-sections { display:grid; gap:8px; margin-top:9px; }
.technical-sections section { display:grid; gap:5px; padding:8px; border:1px solid rgba(148,163,184,.18); border-radius:8px; background:rgba(248,250,252,.72); }
.technical-sections section>strong { color:#334155; font-size:11.5px; }
.tech-row { display:grid; grid-template-columns:54px 1fr; gap:8px; margin-top:6px; }
.action-trace-list { display:grid; gap:6px; margin-top:8px; }
.action-trace-row { display:grid; grid-template-columns:1fr auto; gap:2px 8px; padding:7px 8px; border-radius:8px; background:rgba(255,255,255,.56); border:1px solid rgba(148,163,184,.18); }
.action-trace-row strong { font-size:11px; color:#334155; }.action-trace-row span { font-size:10px; color:#64748b; }.action-trace-row small { grid-column:1/-1; color:#64748b; line-height:1.4; }.action-trace-row.blocked { background:#fffbeb; border-color:#fde68a; }
code { overflow-wrap:anywhere; color:#475569; }
pre { max-height:180px; overflow:auto; margin:8px 0 0; padding:8px; border-radius:8px; background:rgba(15,23,42,.06); white-space:pre-wrap; }
:global([data-theme="dark"] .main-agent-decision-card){ background:linear-gradient(145deg,rgba(15,23,42,.95),rgba(30,41,59,.88)); border-color:rgba(96,165,250,.28); }
:global([data-theme="dark"] .decision-plan){ background:rgba(15,23,42,.55); border-color:rgba(148,163,184,.18); }
:global([data-theme="dark"] .decision-public-summary){ background:rgba(15,23,42,.55); border-color:rgba(148,163,184,.18); }
:global([data-theme="dark"] .decision-public-summary strong){ color:#e2e8f0; }
:global([data-theme="dark"] .dispatch-launch-summary){ background:rgba(14,116,144,.16); border-color:rgba(125,211,252,.2); }
:global([data-theme="dark"] .dispatch-launch-head strong),:global([data-theme="dark"] .dispatch-launch-summary p),:global([data-theme="dark"] .dispatch-launch-row strong){ color:#e2e8f0; }
:global([data-theme="dark"] .dispatch-launch-row){ background:rgba(15,23,42,.56); border-color:rgba(125,211,252,.16); }
:global([data-theme="dark"] .decision-loop){ background:rgba(15,23,42,.55); border-color:rgba(148,163,184,.18); }
:global([data-theme="dark"] .loop-head strong),:global([data-theme="dark"] .loop-details summary),:global([data-theme="dark"] .loop-detail-row strong){ color:#e2e8f0; }
:global([data-theme="dark"] .loop-stage),:global([data-theme="dark"] .loop-detail-row){ background:rgba(15,23,42,.5); border-color:rgba(148,163,184,.16); }
:global([data-theme="dark"] .plan-head strong),:global([data-theme="dark"] .decision-plan li strong){ color:#e2e8f0; }
:global([data-theme="dark"] .plan-focus){ background:rgba(30,41,59,.72); border-color:rgba(96,165,250,.22); }
:global([data-theme="dark"] .plan-focus strong){ color:#e2e8f0; }
:global([data-theme="dark"] .decision-plan li){ background:rgba(15,23,42,.5); border-color:rgba(148,163,184,.16); }
:global([data-theme="dark"] .decision-plan li.status-completed strong){ color:#94a3b8; }
:global([data-theme="dark"] .evidence-row){ background:rgba(15,23,42,.55); border-color:rgba(148,163,184,.16); }
:global([data-theme="dark"] .plan-step-evidence summary),:global([data-theme="dark"] .evidence-row strong){ color:#e2e8f0 !important; }
:global([data-theme="dark"] .plan-verification-reminder){ background:rgba(120,53,15,.28); border-color:rgba(251,191,36,.32); }
:global([data-theme="dark"] .plan-verification-reminder strong){ color:#fde68a; }
:global([data-theme="dark"] .decision-grid div){ background:rgba(15,23,42,.55); border-color:rgba(148,163,184,.18); }
:global([data-theme="dark"] .decision-grid strong),:global([data-theme="dark"] code){ color:#e2e8f0; }
@media (max-width: 720px) { .decision-grid { grid-template-columns:1fr; } .loop-rail { grid-template-columns:repeat(4,minmax(0,1fr)); } }
</style>
