const ACTIVE_PHASES = new Set([
  'pending',
  'queued',
  'in_progress',
  'running',
  'reviewing',
  'reworking',
  'needs_rework',
  'blocked',
  'needs_user',
  'waiting_user',
  'needs_confirmation',
])

const ACTIVE_TODO_STATUSES = new Set([
  'pending',
  'in_progress',
  'running',
  'reviewing',
  'reworking',
  'blocked',
  'needs_user',
  'needs_confirmation',
  'failed',
])

const WORKFLOW_ACTIONS = new Set([
  'create_project_task',
  'dispatch_child_agent',
  'ask_user_clarification',
  'govern_task_lifecycle',
  'replan_from_observation',
])

const hasItems = (value) => Array.isArray(value) && value.length > 0

const hasWorkflowDecision = (decision) => {
  if (!decision) return false
  if (['project_task', 'delegation', 'followup', 'governance'].includes(String(decision.mode || '').toLowerCase())) return true
  const actions = decision?.decision?.selected_actions || decision?.decision?.selectedActions || []
  if (actions.some(action => WORKFLOW_ACTIONS.has(String(action)))) return true
  const steps = decision?.todo_plan?.steps || decision?.todoPlan?.steps || decision?.user_plan_steps || decision?.userPlanSteps || []
  return steps.some(step => ACTIVE_TODO_STATUSES.has(String(step?.status || '').toLowerCase()))
}

export const shouldShowGroupMainAgentStatus = ({ hasGroup, status, latestDecision, groupAgentQa = [] }) => {
  if (!hasGroup) return false
  const current = status || {}
  const phase = String(current.phase || '').toLowerCase()
  const todo = current.current_todo_summary || current.currentTodoSummary || null
  const todoStatus = String(todo?.status || '').toLowerCase()
  const openQaCount = Number(current.open_qa_count || current.openQaCount || 0)
  const hasLiveQa = groupAgentQa.some(item => ['waiting', 'asking', 'queued', 'needs_user', 'timeout', 'manual'].includes(String(item?.status || '').toLowerCase()))

  return ACTIVE_PHASES.has(phase)
    || Number(current.active_task_count || current.activeTaskCount || 0) > 0
    || hasItems(current.running_child_agents || current.runningChildAgents)
    || openQaCount > 0
    || hasLiveQa
    || hasItems(current.failed_gates || current.failedGates)
    || hasItems(current.blockers)
    || hasItems(current.needs)
    || ACTIVE_TODO_STATUSES.has(todoStatus)
    || hasWorkflowDecision(latestDecision)
}

