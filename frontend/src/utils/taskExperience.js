const asArray = (value) => Array.isArray(value) ? value : []
const uniq = (items) => [...new Set(asArray(items).map(item => String(item || '').trim()).filter(Boolean))]
const normalizeDeliveryFile = (item, fallbackProject = '') => {
  if (!item) return null
  if (typeof item === 'string') {
    const text = item.trim()
    return text ? { path: text, project: fallbackProject, statusText: '变更', statusColor: '#64748b' } : null
  }
  const path = String(item.path || item.file || item.name || '').trim()
  if (!path) return null
  return {
    ...item,
    path,
    project: item.project || item.target_project || item.projectName || item.agent || fallbackProject || '',
    statusText: item.statusText || item.status || item.status_kind || '变更',
    statusColor: item.statusColor || '#64748b',
    additions: Number(item.additions || item.diff?.additions || 0),
    deletions: Number(item.deletions || item.diff?.deletions || 0),
  }
}
const uniqDeliveryFiles = (items) => {
  const seen = new Set()
  return asArray(items).map(item => normalizeDeliveryFile(item)).filter(file => {
    if (!file) return false
    const key = `${file.project || ''}|${file.path}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
const compact = (value, max = 220) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export const taskPhasePresentation = (status, fallback = 'planning') => {
  const key = String(status || '').toLowerCase()
  const phase = ({
    pending: 'queued', queued: 'queued', planning: 'planning',
    running: 'executing', in_progress: 'executing', executing: 'executing', supervising: 'executing',
    reviewing: 'reviewing', testing: 'reviewing',
    reworking: 'reworking', retrying: 'reworking', recovering: 'blocked', blocked: 'blocked',
    waiting_confirmation: 'needs_user', waiting_clarification: 'needs_user', waiting_user: 'needs_user',
    manual_takeover: 'needs_user', paused: 'needs_user', done: 'completed', completed: 'completed', succeeded: 'completed',
    failed: 'failed', cancelled: 'cancelled', reverted: 'reverted',
  })[key] || fallback
  return {
    phase,
    label: ({ planning: '正在分析', queued: '准备开始', executing: '正在修改', reviewing: '正在运行测试', reworking: '正在修复问题', needs_user: '需要你确认', blocked: '正在恢复', completed: '已完成', failed: '失败', cancelled: '已取消', reverted: '已安全撤销' })[phase] || '正在处理',
    progress: ({ planning: 10, queued: 18, executing: 55, reviewing: 85, reworking: 68, needs_user: 72, blocked: 62, completed: 100, failed: 100, cancelled: 0, reverted: 100 })[phase] ?? 10,
  }
}

const taskActions = (phase, capabilities = {}) => {
  const actions = []
  if (capabilities.viewChanges) actions.push({ id: 'changes', kind: 'view_changes', label: '查看改动', tone: 'outline' })
  if (capabilities.saveKnowledge && ['completed', 'failed', 'cancelled', 'reverted'].includes(phase)) actions.push({ id: 'save_knowledge', kind: 'save_knowledge', label: '保存知识', tone: 'outline' })
  if (phase === 'completed' && capabilities.continue) actions.push({ id: 'continue', kind: 'continue', label: '继续修改', tone: 'primary' })
  if (['planning', 'queued', 'executing', 'reviewing', 'reworking', 'blocked'].includes(phase) && capabilities.cancel) actions.push({ id: 'cancel', kind: 'cancel', label: '停止', tone: 'danger' })
  if (phase === 'needs_user' && capabilities.resume) actions.push({ id: 'resume', kind: 'resume', label: '继续', tone: 'primary' })
  if (phase === 'failed' && capabilities.retry) actions.push({ id: 'retry', kind: 'retry', label: '重新执行', tone: 'primary' })
  if (phase === 'completed' && capabilities.rollback) actions.push({ id: 'rollback', kind: 'rollback', label: '安全撤销', tone: 'danger' })
  return actions
}

export const globalMissionTaskCard = (message = {}) => {
  const mission = message.globalMission || {}
  if (!mission.id) return null
  const children = asArray(message.globalMissionChildren)
  const summary = mission.mission_summary || {}
  const missionDelivery = mission.delivery_summary || {}
  const supervisor = message.globalMissionSupervisor || {}
  const finalReport = supervisor.final_report || mission.final_report || {}
  const supervisorStatus = supervisor.status || ''
  const presentationStatus = mission.rolled_back_at
    ? 'reverted'
    : ['paused', 'waiting_user', 'manual_takeover', 'cancelled', 'failed', 'completed'].includes(supervisorStatus)
      ? supervisorStatus
      : mission.status
  const presentation = taskPhasePresentation(presentationStatus, mission.status === 'done' ? 'completed' : 'executing')
  const total = Number(summary.total || children.length || 0)
  const passed = Number(summary.passed || children.filter(row => row.task?.status === 'done').length || 0)
  const blocked = Number(summary.blocked || children.filter(row => ['blocked', 'failed'].includes(row.task?.status)).length || 0)
  const agents = children.map(row => {
    const task = row.task || {}
    const target = row.target || task.mission_target || {}
    const targetType = target.type === 'group' ? '协作群' : '项目'
    return {
      id: task.id,
      name: `${targetType} · ${target.name || task.target_project || '执行目标'}`,
      status: task.status || 'pending',
      summary: compact(task.status_detail || target.reason || (task.status === 'done' ? '工作已完成' : '等待开始'), 120),
    }
  })
  const childDeliveryFiles = [
    ...asArray(missionDelivery.actual_file_changes),
    ...asArray(missionDelivery.child_tasks).flatMap(child => asArray(child?.actual_file_changes)),
    ...asArray(summary.children).flatMap(child => asArray(child?.actual_file_changes)),
    ...children.flatMap(row => {
      const task = row.task || {}
      const fallbackProject = row.target?.name || task.target_project || task.mission_target?.name || ''
      return [
        ...asArray(task.delivery_summary?.actual_file_changes).map(item => normalizeDeliveryFile(item, fallbackProject)),
        ...asArray(task.file_changes?.files).map(item => normalizeDeliveryFile(item, fallbackProject)),
      ]
    }),
  ].filter(Boolean)
  const files = uniqDeliveryFiles([
    ...childDeliveryFiles,
    ...(finalReport.actual_file_changes || []),
    ...(finalReport.file_changes || []),
    ...(finalReport.files_modified || finalReport.files || []),
  ])
  const verification = uniq(finalReport.verification_results || finalReport.verification || [])
  const risks = uniq([...(finalReport.risks || []), ...(finalReport.remaining_items || [])])
  const active = agents.filter(item => ['in_progress', 'running', 'pending'].includes(item.status)).map(item => `${item.name} 正在处理`)
  const actions = taskActions(presentation.phase, {
    viewChanges: files.length > 0,
    continue: true,
    cancel: true,
    resume: ['paused', 'waiting_user', 'manual_takeover'].includes(supervisor.status),
    retry: true,
    rollback: !!mission.rollback_available,
    saveKnowledge: true,
  })
  return {
    version: 1,
    task_id: mission.id,
    title: mission.title || '跨项目开发任务',
    goal: mission.business_goal || mission.goal || mission.title || '',
    phase: presentation.phase,
    phase_label: presentation.label,
    status: mission.status,
    progress: total ? Math.max(presentation.progress === 100 ? 100 : 10, Math.round(passed / total * 100)) : presentation.progress,
    active_agents: active,
    agents,
    completed: uniq([passed ? `${passed}/${total || passed} 个执行目标已完成` : '', files.length ? `修改了 ${files.length} 个文件` : '', verification.length ? `${verification.length} 项检查已执行` : '']),
    blockers: blocked ? [`${blocked} 个执行目标需要处理`] : risks.slice(0, 4),
    next_action: presentation.phase === 'completed' ? '可以查看改动或继续修改' : presentation.phase === 'needs_user' ? '请确认后继续' : presentation.phase === 'failed' ? '可以重新执行，系统会复用已有证据' : '主 Agent 正在协调各执行目标',
    delivery: { headline: finalReport.summary || missionDelivery.headline || mission.status_detail || '', files, changes: files, verification, risks, acceptance_passed: finalReport.acceptance_gate_passed === true || missionDelivery.acceptance_gate_passed === true },
    actions,
    technical: { trace_id: mission.trace_id || '', execution_ids: children.map(row => row.task?.id).filter(Boolean), session_ids: [], supervisor_id: supervisor.id || mission.supervisor_id || '' },
  }
}

export const globalAgentRunTaskCard = (message = {}) => {
  const run = message.agenticRun || {}
  if (!run.id) return null
  const category = run.decision_summary?.intent?.category
  const ordinaryReply = ['conversation', 'question', 'analysis'].includes(category) && Number(run.tool_calls || 0) === 0 && !run.mission_id
  if (ordinaryReply) return null
  const presentation = taskPhasePresentation(run.status, 'executing')
  const report = run.final_report || {}
  const files = uniqDeliveryFiles(report.actual_file_changes || report.file_changes || report.files_modified || run.files_modified || [])
  const verification = uniq(report.verification_results || run.verification_results || [])
  const risks = uniq(report.risks || run.risks || [])
  let actions = taskActions(presentation.phase, { viewChanges: files.length > 0, continue: !!run.mission_id, cancel: true, resume: true, retry: true, rollback: false, saveKnowledge: true })
  if (run.status === 'waiting_confirmation') actions = [
    { id: 'reject', kind: 'reject_confirmation', label: '取消', tone: 'outline' },
    { id: 'confirm', kind: 'confirm', label: '确认并继续', tone: 'primary' },
  ]
  return {
    version: 1,
    task_id: run.mission_id || run.id,
    title: compact(run.goal || run.user_message || message.content || '全局任务', 90),
    goal: compact(run.goal || run.user_message || '', 240),
    phase: presentation.phase,
    phase_label: presentation.label,
    status: run.status,
    progress: presentation.progress,
    active_agents: presentation.phase === 'executing' ? ['全局主 Agent 正在处理'] : [],
    agents: [],
    completed: uniq([files.length ? `修改了 ${files.length} 个文件` : '', verification.length ? `${verification.length} 项检查已执行` : '']),
    blockers: uniq([run.clarification_question, run.last_error]).slice(0, 4),
    next_action: presentation.phase === 'needs_user' ? (run.clarification_question || '请确认后继续') : presentation.phase === 'completed' ? '任务已处理完成' : presentation.phase === 'failed' ? '可以重新执行' : '系统会继续处理并更新结果',
    delivery: { headline: report.summary || (presentation.phase === 'completed' ? compact(message.content, 240) : ''), files, changes: files, verification, risks, acceptance_passed: report.acceptance_gate_passed === true },
    actions,
    technical: { trace_id: run.trace_id || '', execution_ids: [], session_ids: [], run_id: run.id, supervisor_id: run.supervisor_id || '' },
  }
}

export const projectExecutionTaskCard = (message = {}, project = '') => {
  const task = message.taskExperience || {}
  const events = asArray(message.workEvents)
  const files = asArray(message.fileChanges?.files).map(item => item.path || item.file || item).filter(Boolean)
  const failed = events.some(item => item.kind === 'error') || /^❌/.test(String(message.content || ''))
  const done = !message.streaming && events.some(item => item.kind === 'done')
  const taskId = task.task_id || message.task_id || message.run_id || ''
  if (!message.streaming && !files.length && !failed && !task.requires_card) return null
  const presentation = taskPhasePresentation(task.phase || (failed ? 'failed' : done ? 'completed' : 'running'), message.streaming ? 'executing' : 'completed')
  const verification = uniq(task.verification || events.filter(item => item.kind === 'verification').map(item => item.text))
  const risks = uniq(task.risks || (failed ? [compact(message.content || events.find(item => item.kind === 'error')?.text, 180)] : []))
  return {
    version: 1,
    task_id: taskId,
    title: task.title || compact(message.requestText || `处理 ${project} 项目`, 90),
    goal: task.goal || compact(message.requestText || '', 240),
    phase: presentation.phase,
    phase_label: presentation.label,
    status: task.status || (failed ? 'failed' : done ? 'done' : 'in_progress'),
    progress: presentation.progress,
    active_agents: presentation.phase === 'executing' ? [`项目 Agent · ${project} 正在处理`] : [],
    agents: [{ name: `项目 Agent · ${project}`, status: failed ? 'failed' : done ? 'done' : 'running', summary: failed ? '执行遇到问题' : done ? '项目工作已完成' : '正在处理项目文件' }],
    completed: uniq([files.length ? `修改了 ${files.length} 个文件` : '', verification.length ? `${verification.length} 项检查已执行` : '']),
    blockers: risks.slice(0, 4),
    next_action: presentation.phase === 'completed' ? '可以查看改动或继续修改' : presentation.phase === 'failed' ? '可以重新执行' : '完成后会汇总改动和检查结果',
    delivery: { headline: task.headline || (done ? '项目 Agent 已完成本轮处理' : ''), files, changes: asArray(message.fileChanges?.files), verification, risks, acceptance_passed: done && !failed },
    actions: [
      ...taskActions(presentation.phase, { viewChanges: files.length > 0, continue: !!taskId, cancel: !!taskId, retry: !!taskId, rollback: !!task.rollback_available, saveKnowledge: !message.streaming }),
      ...(!message.streaming && taskId ? [
        { id: 'archive', kind: 'archive', label: '删除记录', tone: 'outline' },
        { id: 'purge', kind: 'purge', label: '永久清除', tone: 'danger' },
      ] : []),
    ],
    technical: taskId ? { trace_id: task.trace_id || message.projectRun?.trace_id || '', execution_ids: task.execution_ids || [], session_ids: task.session_ids || [], run_id: message.projectRun?.id || taskId, parent_run_id: message.projectRun?.parent_run_id || task.parent_run_id || '' } : null,
  }
}
