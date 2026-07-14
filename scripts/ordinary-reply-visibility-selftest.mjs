import { isQuietMainAgentConversationDecision } from '../frontend/src/composables/useMainAgentDisplay.js'

const ordinary = {
  mode: 'conversation',
  decision: { selected_actions: ['read_group_context', 'generate_final_reply'] },
  permissions: [
    { action_id: 'read_group_context', allowed: true },
    { action_id: 'generate_final_reply', allowed: true },
  ],
  verify: { passed: true, blocked_actions: [] },
  todo_plan: {
    display: { user_visible: false, hide_for_simple_conversation: true },
    steps: [
      { id: 'understand', status: 'completed' },
      { id: 'dispatch', status: 'skipped' },
      { id: 'reply', status: 'completed' },
    ],
  },
}

const checks = {
  ordinaryReplyIsQuiet: isQuietMainAgentConversationDecision(ordinary),
  greetingIsQuiet: isQuietMainAgentConversationDecision({ ...ordinary, reply: { preview: '你好！' } }),
  clarificationStaysVisible: !isQuietMainAgentConversationDecision({
    ...ordinary,
    decision: { selected_actions: ['read_group_context', 'ask_user_clarification', 'generate_final_reply'] },
  }),
  blockedPermissionStaysVisible: !isQuietMainAgentConversationDecision({
    ...ordinary,
    permissions: [{ action_id: 'govern_task_lifecycle', allowed: false }],
    verify: { passed: false, blocked_actions: ['govern_task_lifecycle'] },
  }),
  activeStepStaysVisible: !isQuietMainAgentConversationDecision({
    ...ordinary,
    todo_plan: { steps: [{ id: 'reply', status: 'needs_confirmation' }] },
  }),
  projectTaskStaysVisible: !isQuietMainAgentConversationDecision({ mode: 'project_task' }),
  delegationStaysVisible: !isQuietMainAgentConversationDecision({ mode: 'delegation' }),
}

const pass = Object.values(checks).every(Boolean)
console.log(JSON.stringify({ pass, checks }, null, 2))
if (!pass) process.exit(1)

