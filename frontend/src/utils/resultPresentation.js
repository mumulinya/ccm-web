/** 全局 / 群聊可见结果三档：reply | plan | delivery */

export const PRESENTATION_REPLY = 'reply'
export const PRESENTATION_PLAN = 'plan'
export const PRESENTATION_DELIVERY = 'delivery'

/** 浏览器 UI 副作用工具：不构成开发交付 */
export const LIGHT_UI_TOOL_NAMES = new Set([
  'play_music',
  'stop_music',
  'navigate',
])

export const GLOBAL_DISPATCH_TOOL_NAMES = new Set([
  'orchestrate_development',
  'create_requirement_epic',
  'send_group_cmd',
  'send_project_cmd',
  'create_task',
])

const asList = (value) => (Array.isArray(value) ? value : [])

const toolName = (tool) => String(tool?.name || tool?.tool_name || tool?.toolName || '').trim()
const toolRisk = (tool) => String(tool?.risk || tool?.tool_risk || tool?.toolRisk || '').trim().toLowerCase()

export const isLightUiToolName = (name) => LIGHT_UI_TOOL_NAMES.has(String(name || '').trim())

export const collectRunTools = (run = {}) => {
  const fromSteps = asList(run.steps)
    .map((step) => step?.tool || step?.pending_tool || step?.pendingTool || null)
    .filter(Boolean)
  const pending = run.pending_tool || run.pendingTool
  if (pending) fromSteps.push(pending)
  return fromSteps
}

export const hasUserVisiblePlan = (source = {}) => {
  const plan = source.plan_mode || source.planMode || source.workflow_meta?.plan_mode || source.workflowMeta?.planMode || null
  if (plan) {
    const steps = asList(plan.steps || plan.plan_steps || plan.planSteps)
    if (steps.length) return true
    if (String(plan.content || plan.summary || plan.markdown || plan.title || plan.next_step || plan.nextStep || '').trim()) return true
    if (asList(plan.clarification_questions || plan.clarificationQuestions).length) return true
  }
  const todo = source.todo_plan || source.todoPlan || source.live_todo_plan || source.liveTodoPlan
    || source.workchain?.todo_plan || source.workchain?.todoPlan
    || source.display_stream?.todo_plan || source.displayStream?.todoPlan
    || null
  if (todo) {
    const steps = asList(todo.steps || todo.items || todo.todos || todo.user_plan_steps || todo.userPlanSteps)
    if (steps.length) return true
  }
  const decision = source.main_agent_decision || source.mainAgentDecision || null
  if (asList(decision?.user_plan_steps || decision?.userPlanSteps).length) return true
  return false
}

export const hasDeliveryEvidence = (source = {}) => {
  if (source.mission_id || source.missionId || source.supervisor_id || source.supervisorId) return true
  const delivery = source.delivery || source.delivery_report || source.deliveryReport || null
  if (asList(delivery?.files || delivery?.changes).length) return true
  if (asList(source.files_modified || source.filesModified).length) return true
  if (asList(source.work_items || source.workItems).some((item) => ['completed', 'running', 'failed', 'in_progress'].includes(String(item?.status || '')))) return true
  if (asList(source.agents).some((agent) => ['done', 'running', 'failed', 'partial', 'reviewing'].includes(String(agent?.status || '')))) return true
  const tools = collectRunTools(source)
  if (tools.some((tool) => ['write', 'high'].includes(toolRisk(tool)) || GLOBAL_DISPATCH_TOOL_NAMES.has(toolName(tool)))) return true
  return false
}

export const isLightReadOrUiTool = (tool) => {
  const name = toolName(tool)
  if (isLightUiToolName(name)) return true
  const risk = toolRisk(tool)
  return !risk || risk === 'read'
}

export const normalizePresentation = (value) => {
  const text = String(value || '').trim().toLowerCase()
  if (text === PRESENTATION_REPLY || text === PRESENTATION_PLAN || text === PRESENTATION_DELIVERY) return text
  return ''
}

/**
 * 全局 Agent run 展示档位。
 * delivery > plan > reply；显式 presentation 优先。
 */
export const classifyGlobalAgentRunPresentation = (run = {}, message = {}) => {
  // 显式传入 null 时默认参数不生效，需先兜底
  const safeRun = run && typeof run === 'object' ? run : {}
  const safeMessage = message && typeof message === 'object' ? message : {}
  const explicit = normalizePresentation(safeRun.presentation || safeMessage.presentation || safeRun.display_policy?.presentation)
  if (explicit) return explicit

  const status = String(safeRun.status || '').toLowerCase()
  if (safeRun.mission_id || safeRun.missionId || safeRun.supervisor_id || safeRun.supervisorId) return PRESENTATION_DELIVERY
  if (status === 'supervising') return PRESENTATION_DELIVERY

  const tools = collectRunTools(safeRun)
  if (tools.some((tool) => ['write', 'high'].includes(toolRisk(tool)) || GLOBAL_DISPATCH_TOOL_NAMES.has(toolName(tool)))) {
    return PRESENTATION_DELIVERY
  }

  if (['waiting_confirmation', 'waiting_clarification'].includes(status)) {
    return hasUserVisiblePlan(safeRun) || hasUserVisiblePlan(safeMessage) ? PRESENTATION_PLAN : PRESENTATION_DELIVERY
  }

  const toolCalls = Number(safeRun.tool_calls || safeRun.toolCalls || 0)
  if (toolCalls === 0 && !tools.length) return PRESENTATION_REPLY
  // 轻量 UI/只读优先 reply，避免误挂 plan_mode 仍出「执行前计划」卡
  if (tools.length && tools.every(isLightReadOrUiTool)) return PRESENTATION_REPLY
  if (asList(safeRun.client_effects || safeRun.clientEffects).length && !hasDeliveryEvidence(safeRun)) return PRESENTATION_REPLY

  if (hasUserVisiblePlan(safeRun) || hasUserVisiblePlan(safeMessage)) return PRESENTATION_PLAN

  // 保守：无写交付证据时按轻量气泡，避免点歌/问答挂满脚手架
  if (!hasDeliveryEvidence(safeRun)) return PRESENTATION_REPLY
  return PRESENTATION_DELIVERY
}

/**
 * 群聊任务卡展示档位。
 */
export const classifyGroupTaskCardPresentation = (card = {}, msg = {}) => {
  // 显式传入 null 时默认参数不生效，需先兜底（群聊无 taskCard 时会传 null）
  const safeCard = card && typeof card === 'object' ? card : {}
  const safeMsg = msg && typeof msg === 'object' ? msg : {}
  const explicit = normalizePresentation(safeCard.presentation || safeMsg.presentation || safeCard.display_policy?.presentation)
  if (explicit) return explicit
  if (!card || safeCard.visible === false) return PRESENTATION_REPLY

  if (hasDeliveryEvidence(safeCard) || hasDeliveryEvidence(safeMsg.task || {}) || Number(safeMsg.taskRuntime?.executions?.length || 0) > 0) {
    return PRESENTATION_DELIVERY
  }
  if (hasUserVisiblePlan(safeCard) || hasUserVisiblePlan(safeMsg)) return PRESENTATION_PLAN
  return PRESENTATION_REPLY
}

export const shouldAttachTaskExperienceCard = (presentation) => {
  const value = normalizePresentation(presentation) || presentation
  return value === PRESENTATION_PLAN || value === PRESENTATION_DELIVERY
}

export const showDeliveryScaffold = (presentation) => normalizePresentation(presentation) === PRESENTATION_DELIVERY

export const showPlanScaffold = (presentation) => {
  const value = normalizePresentation(presentation)
  return value === PRESENTATION_PLAN || value === PRESENTATION_DELIVERY
}

/** 简单业务气泡：去掉验证证据 / 交付报告栏目（与后端 stripNonExecutionReportSections 对齐） */
export const stripDeliveryScaffoldSections = (value) => String(value || '')
  .replace(/\n*验证\/证据\s*[:：][\s\S]*?(?=\n+\s*(?:风险|下一步|处理总结|验证与验收|需要留意)\s*[:：]|$)/g, '')
  .replace(/\n*风险\s*[:：][\s\S]*?(?=\n+\s*(?:下一步|处理总结|验证与验收|需要留意)\s*[:：]|$)/g, '')
  .replace(/\n*处理总结\s*[:：][\s\S]*?(?=\n+\s*(?:验证与验收|需要留意|下一步|风险)\s*[:：]|$)/g, '')
  .replace(/\n*验证与验收\s*[:：][\s\S]*?(?=\n+\s*(?:需要留意|下一步|风险)\s*[:：]|$)/g, '')
  .replace(/\n*需要留意\s*[:：][\s\S]*?(?=\n+\s*(?:下一步)\s*[:：]|$)/g, '')
  .replace(/\n*下一步\s*[:：][^\n]*(?:\n|$)/g, '')
  .replace(/\n*[-•]?\s*指令\s*ID\s*[:：]\s*\S+/gi, '')
  .replace(/\n*【(?:任务交付完成|任务交付|交付完成)】[\s\S]*$/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim()
