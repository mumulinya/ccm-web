export function notifyConversationPlanModeChanged(detail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('ccm-conversation-plan-mode-changed', { detail }))
}

export function openTaskPlanDetail(taskId, extra = {}) {
  if (typeof window === 'undefined' || !taskId) return
  window.dispatchEvent(new CustomEvent('ccm:open-task-plan-detail', {
    detail: { taskId, task_id: taskId, ...extra },
  }))
}
