export const compactStatusText = (value, max = 80) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max) + '...' : text
}

export const mainDecisionModeLabel = (mode) => ({
  conversation: '普通回复',
  project_analysis: '项目分析',
  project_task: '创建任务',
  delegation: '派发子 Agent',
  followup: '追加要求',
  governance: '任务治理'
}[mode] || '主 Agent 决策')

export const mainDecisionTone = (decision) => {
  if (!decision?.verify?.passed) return 'warning'
  if (['project_task', 'delegation', 'followup'].includes(decision.mode)) return 'active'
  if (decision.mode === 'project_analysis') return 'analysis'
  return 'idle'
}

export const mainDecisionNextStep = (decision) => decision?.decision?.dispatch_policy?.nextStep || decision?.verify?.conclusion || '等待下一条消息'

export const mainDecisionActionSummary = (decision) => {
  const actions = decision?.decision?.selected_actions || []
  const labels = {
    read_group_context: '读群聊',
    read_project_code_snapshot: '读代码',
    query_knowledge_base: '查知识库',
    inspect_task_status: '看任务',
    create_project_task: '建任务',
    dispatch_child_agent: '派发',
    ask_user_clarification: '追问',
    govern_task_lifecycle: '治理',
    read_child_agent_receipts: '读回执',
    replan_from_observation: '重规划',
    generate_final_reply: '回复'
  }
  return actions.map(a => labels[a] || a).slice(0, 5).join(' → ') || '等待动作'
}

export const mainDecisionPlanSummary = (decision) => {
  const display = decision?.todo_plan?.display || {}
  if (decision?.mode === 'conversation' && (display.user_visible === false || display.hide_for_simple_conversation === true)) return ''
  const steps = Array.isArray(decision?.user_plan_steps)
    ? decision.user_plan_steps
    : Array.isArray(decision?.todo_plan?.steps)
      ? decision.todo_plan.steps
      : []
  const active = steps.find(step => ['in_progress', 'reviewing', 'reworking', 'needs_confirmation', 'failed'].includes(step.status))
  const current = active || steps.find(step => step.status === 'pending') || steps[steps.length - 1]
  const preview = (['in_progress', 'reviewing', 'reworking'].includes(current?.status) && (current?.activeForm || current?.active_form))
    ? (current.activeForm || current.active_form)
    : current?.summary || current?.content || ''
  const done = steps.filter(step => ['completed', 'skipped', 'cancelled', 'failed'].includes(step.status)).length
  return preview ? `计划 ${done}/${steps.length}：${compactStatusText(preview, 56)}` : ''
}
