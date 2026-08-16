const DONE_STATUSES = ['completed', 'skipped', 'cancelled']
const ACTIVE_STATUSES = ['in_progress', 'running', 'reviewing', 'reworking', 'needs_confirmation', 'needs_user', 'blocked', 'failed']
const QUIET_MODES = new Set(['conversation', 'project_analysis'])
const GENERIC_COORDINATOR_STEP_IDS = new Set([
  'intake',
  'plan',
  'execute',
  'verify',
  'summarize',
  'understand_intent',
  'understand_goal',
  'read_group_context',
  'read_only_explore',
  'read_project_code_snapshot',
  'query_knowledge_base',
  'restore_task_context',
  'inspect_task_status',
  'create_project_task',
  'decide_dispatch',
  'dispatch_child_agent',
  'dispatch_sub_agents',
  'confirm_boundary',
  'ask_user_clarification',
  'child_agent_execution',
  'read_child_agent_receipts',
  'replan_from_observation',
  'govern_task_lifecycle',
  'coordinator_review',
  'verify_and_reply',
  'verify_and_summarize',
  'final_delivery_report',
  'generate_final_reply',
])
const USER_ACTION_STATUSES = new Set(['needs_confirmation', 'needs_user', 'blocked', 'failed'])
const WORKFLOW_ACTIONS = new Set([
  'create_project_task',
  'dispatch_child_agent',
  'govern_task_lifecycle',
  'replan_from_observation',
])

const statusOf = step => String(step?.status || step?.state || '').toLowerCase()

const asList = value => Array.isArray(value) ? value : []

export function todoPlanFromSource(source) {
  if (!source || typeof source !== 'object') return null
  return source.todo_plan
    || source.todoPlan
    || source.mainAgentDecision?.todo_plan
    || source.mainAgentDecision?.todoPlan
    || source.main_agent_decision?.todo_plan
    || source.main_agent_decision?.todoPlan
    || source.agenticRun?.todo_plan
    || source.agenticRun?.todoPlan
    || source.display_stream?.todo_plan
    || source.displayStream?.todoPlan
    || source.display_stream?.workchain?.todo_plan
    || source.displayStream?.workchain?.todoPlan
    || source.workchain?.todo_plan
    || source.workchain?.todoPlan
    || null
}

export function conversationTodoSteps(plan, decision) {
  const fromPlan = asList(plan?.steps)
  if (fromPlan.length) return fromPlan
  return asList(decision?.user_plan_steps || decision?.userPlanSteps)
}

function isUserTaskPlanStep(step) {
  const id = String(step?.id || step?.key || '')
  const source = String(step?.source || '')
  if (source === 'model' || source === 'user_followup') return true
  return /^model_plan_\d+$/.test(id) || /^followup_requirement_\d+$/.test(id)
}

function isGenericCoordinatorPlan(plan, decision) {
  const steps = conversationTodoSteps(plan, decision)
  if (!steps.length) return false
  return steps.every(step => !isUserTaskPlanStep(step) && GENERIC_COORDINATOR_STEP_IDS.has(String(step?.id || step?.key || '')))
}

export function shouldShowConversationTodo(plan, decision) {
  const steps = conversationTodoSteps(plan, decision)
  if (steps.length < 2) return false
  const policy = {
    ...(plan?.display || {}),
    ...(plan?.display_policy || plan?.displayPolicy || {}),
  }
  if (policy.user_visible === false) return false
  if (
    policy.hide_for_ordinary_conversation === true
    || policy.hideForOrdinaryConversation === true
    || policy.hide_for_simple_conversation === true
  ) return false
  const archiveCompleted = policy.archive_completed_todo === true
    || policy.archiveCompletedTodo === true
    || policy.archived_when_complete === true
    || policy.archivedWhenComplete === true
    || policy.visible_when_completed === false
    || policy.visibleWhenCompleted === false
  const hasVerificationNudge = plan?.verification_nudge === true
    || plan?.verificationNudge === true
    || Boolean(plan?.verification_reminder || plan?.verificationReminder)
  const allDone = steps.every(step => DONE_STATUSES.includes(statusOf(step)))
  if (archiveCompleted && !hasVerificationNudge && allDone) return false
  const needsUserAction = steps.some(step => USER_ACTION_STATUSES.has(statusOf(step)))
  if (isGenericCoordinatorPlan(plan, decision) && !hasVerificationNudge && !needsUserAction) return false
  const mode = String(decision?.mode || plan?.mode || '').toLowerCase()
  const actions = decision?.decision?.selected_actions || decision?.decision?.selectedActions || []
  const permissions = Array.isArray(decision?.permissions) ? decision.permissions : []
  const blockedActions = decision?.verify?.blocked_actions || decision?.verify?.blockedActions || []
  const quietCompleted = policy.quiet_completed === true || policy.quietCompleted === true
  const quietReadOnly = QUIET_MODES.has(mode)
    && !actions.some(action => WORKFLOW_ACTIONS.has(String(action)))
    && !permissions.some(item => item?.allowed === false)
    && !(Array.isArray(blockedActions) && blockedActions.length > 0)
  if (allDone && !hasVerificationNudge && (quietCompleted || quietReadOnly)) return false
  return true
}

export function conversationTodoModel(source, decision) {
  const resolvedDecision = decision || source?.mainAgentDecision || source?.main_agent_decision || null
  const plan = todoPlanFromSource(source) || resolvedDecision?.todo_plan || resolvedDecision?.todoPlan || null
  if (!shouldShowConversationTodo(plan, resolvedDecision)) return null
  const steps = conversationTodoSteps(plan, resolvedDecision).map((step, index) => {
    const status = statusOf(step) || (index === 0 ? 'in_progress' : 'pending')
    const label = String(step?.content || step?.title || step?.label || step?.summary || step?.activeForm || step?.active_form || `步骤 ${index + 1}`).replace(/\s+/g, ' ').trim()
    return {
      id: step?.id || step?.key || `todo-${index + 1}`,
      label: label || `步骤 ${index + 1}`,
      status,
      active: ACTIVE_STATUSES.includes(status),
      done: DONE_STATUSES.includes(status),
    }
  })
  const done = steps.filter(step => step.done).length
  return {
    title: String(plan?.title || '').trim() || '待办',
    steps,
    done,
    total: steps.length,
  }
}
