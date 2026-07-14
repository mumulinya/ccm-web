import { shouldShowGroupMainAgentStatus } from '../frontend/src/utils/groupStatusVisibility.js'

const ordinaryDecision = {
  mode: 'conversation',
  decision: { selected_actions: ['read_group_context', 'generate_final_reply'] },
}

const checks = {
  noGroupHidden: !shouldShowGroupMainAgentStatus({ hasGroup: false, status: { phase: 'running' } }),
  emptyIdleHidden: !shouldShowGroupMainAgentStatus({ hasGroup: true, status: { phase: 'idle', label: '空闲' } }),
  ordinaryReplyHidden: !shouldShowGroupMainAgentStatus({ hasGroup: true, status: { phase: 'idle', label: '空闲' }, latestDecision: ordinaryDecision }),
  completedTaskHidden: !shouldShowGroupMainAgentStatus({ hasGroup: true, status: { phase: 'completed', active_task_count: 0 } }),
  activeTaskVisible: shouldShowGroupMainAgentStatus({ hasGroup: true, status: { phase: 'running', active_task_count: 1 } }),
  runningAgentVisible: shouldShowGroupMainAgentStatus({ hasGroup: true, status: { phase: 'idle', running_child_agents: ['web'] } }),
  pendingQaVisible: shouldShowGroupMainAgentStatus({ hasGroup: true, status: { phase: 'idle' }, groupAgentQa: [{ status: 'needs_user' }] }),
  blockerVisible: shouldShowGroupMainAgentStatus({ hasGroup: true, status: { phase: 'idle', blockers: ['等待授权'] } }),
  taskDecisionVisible: shouldShowGroupMainAgentStatus({ hasGroup: true, status: { phase: 'idle' }, latestDecision: { mode: 'project_task' } }),
  clarificationDecisionVisible: shouldShowGroupMainAgentStatus({
    hasGroup: true,
    status: { phase: 'idle' },
    latestDecision: { mode: 'conversation', decision: { selected_actions: ['ask_user_clarification'] } },
  }),
}

const pass = Object.values(checks).every(Boolean)
console.log(JSON.stringify({ pass, checks }, null, 2))
if (!pass) process.exit(1)

