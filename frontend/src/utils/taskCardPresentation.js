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

export const taskCardNeedsConversationControl = card => !!card && (
  card?.requires_confirmation === true
  || card?.requiresConfirmation === true
  || values(card).some(value => CONTROL_STATES.has(value))
  || actions(card).some(action => action?.enabled !== false && CONTROL_ACTIONS.has(String(action?.kind || action?.id || '').trim().toLowerCase()))
)
