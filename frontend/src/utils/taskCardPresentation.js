const CONTROL_STATES = new Set([
  'waiting_confirmation', 'needs_confirmation', 'waiting_user', 'needs_user',
  'permission_required', 'waiting_permission', 'paused', 'blocked', 'failed',
  'interrupted', 'recovery_required', 'needs_recheck', 'needs_environment',
])

const CONTROL_ACTIONS = new Set([
  'confirm_plan', 'revise_plan', 'resolve_permission', 'approve', 'reject',
  'resume_paused', 'resume_interrupted', 'retry', 'recheck', 'takeover',
  'provide_input', 'continue_work_item',
])
const PLAN_ACTIONS = new Set(['confirm_plan', 'revise_plan'])
const PLAN_ONLY_STATES = new Set(['waiting_confirmation', 'needs_confirmation'])

const values = card => [
  card?.phase,
  card?.status,
  card?.state,
  card?.task_state,
  card?.taskState,
  card?.collaboration_state?.phase,
  card?.collaborationState?.phase,
].map(value => String(value || '').trim().toLowerCase()).filter(Boolean)

const actions = card => [
  ...(Array.isArray(card?.actions) ? card.actions : []),
  ...(Array.isArray(card?.availableActions) ? card.availableActions : []),
  ...(Array.isArray(card?.available_actions) ? card.available_actions : []),
  ...(Array.isArray(card?.actionCenter) ? card.actionCenter : []),
].filter(Boolean)

export const taskCardNeedsConversationControl = (card, options = {}) => {
  if (!card) return false
  const planOwnedByDock = options?.planOwnedByDock === true
  const cardActions = actions(card)
  const enabledControlActions = cardActions.filter(action => (
    action?.enabled !== false && CONTROL_ACTIONS.has(String(action?.kind || action?.id || '').trim().toLowerCase())
  ))
  if (!planOwnedByDock) return (
    card?.requires_confirmation === true
    || card?.requiresConfirmation === true
    || values(card).some(value => CONTROL_STATES.has(value))
    || enabledControlActions.length > 0
  )
  const nonPlanActions = enabledControlActions.filter(action => !PLAN_ACTIONS.has(String(action?.kind || action?.id || '').trim().toLowerCase()))
  const hasPlanAction = enabledControlActions.length !== nonPlanActions.length
  const confirmationFlag = card?.requires_confirmation === true || card?.requiresConfirmation === true || hasPlanAction
  const hasNonPlanState = values(card).some(value => (
    CONTROL_STATES.has(value)
    && !PLAN_ONLY_STATES.has(value)
    && !(['waiting_user', 'needs_user'].includes(value) && confirmationFlag && !nonPlanActions.length)
  ))
  return hasNonPlanState || nonPlanActions.length > 0
}
