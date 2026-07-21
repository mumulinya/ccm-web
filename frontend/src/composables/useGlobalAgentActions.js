import { nextTick } from 'vue'
import { globalAgentRunTaskCard, globalMissionTaskCard } from '../utils/taskExperience.js'
import { buildGlobalConversationKnowledgePayload, buildGlobalTaskKnowledgePayload, postKnowledgeCapture } from '../utils/knowledgeCapture.js'
import { getTechnicalDetailSections, sanitizeUserFacingAgentText } from '../utils/agentDisplay.js'
import { globalExecutionIntentConfirmed, visibleGlobalText } from '../utils/globalAgentExecutionStream.js'
import { classifyGlobalAgentRunPresentation, PRESENTATION_REPLY } from '../utils/resultPresentation.js'

export function useGlobalAgentActions(context) {
  const {
    currentSessionId, currentSession, messages, saveHistory, toast, scrollToBottom, emit, formatGlobalRunVisibleReply,
    sanitizeGlobalVisibleStreamText, chatInput, pendingGlobalClarificationInput, chatInputElement, sendMessage,
    beginGlobalMissionInput, openCodeChangeDrawer, trackGlobalMission, executingAction, addAssistantMessage,
    getActionParam, normalizeMusicAction, systemResultMessage, confirmDialog,
  } = context

const managementActionTypes = new Set(['manage_cron', 'manage_group', 'manage_project', 'manage_task', 'manage_tool', 'system_status'])

const requestJson = async (url, options = {}) => {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!res.ok || data.success === false || data.error) throw new Error(data.error || '管理操作失败')
  return data
}

const postJson = (url, body = {}) => requestJson(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})

const controlAgenticRun = async (msg, operation, approved = true, feedback = '', source = '') => {
  const runId = msg?.agenticRun?.id
  if (!runId || msg.agenticRunLoading) return
  msg.agenticRunLoading = true
  try {
    const endpoint = operation === 'confirm'
      ? '/api/global-agent/runs/confirm'
      : `/api/global-agent/runs/${operation}`
    const data = await postJson(endpoint, { id: runId, approved, accept_feedback: String(feedback || '').trim(), source: String(source || '').trim() })
    const run = data.run || {}
    msg.agenticRun = run
    msg.content = formatGlobalRunVisibleReply(run, run.status === 'paused' ? '我已暂停这次运行。' : '运行状态已更新。')
    if (run.status === 'waiting_confirmation') {
      const pendingToolName = sanitizeGlobalVisibleStreamText(run.pending_tool?.name || '写入操作', '写入操作', 80)
      msg.content += `\n\n⚠️ 等待确认：${pendingToolName}。请使用下方按钮决定是否继续。`
    }
    for (const effect of (run.client_effects || [])) {
      if (effect?.type === 'navigate' && effect.params?.tab) emit('switch-tab', effect.params.tab)
      if (effect?.type === 'play_music') {
        const keyword = String(effect.params?.keyword || '').trim()
        const mode = String(effect.params?.mode || '').trim()
        const commandId = String(effect.params?.command_id || '').trim()
        const requestText = String(effect.params?.request_text || keyword).trim()
        if (keyword) {
          void (async () => {
            try {
              const { playMusicFromClientEffect } = await import('./useMusicRemotePlayback.js')
              await playMusicFromClientEffect({ keyword, mode, commandId, requestText })
            } catch {}
          })()
        }
      }
      if (effect?.type === 'stop_music') {
        const commandId = String(effect.params?.command_id || '').trim()
        void (async () => {
          try {
            const { stopMusicFromClientEffect } = await import('./useMusicRemotePlayback.js')
            await stopMusicFromClientEffect({ commandId })
          } catch {}
        })()
      }
    }
    saveHistory()
    toast.success(operation === 'confirm' ? (approved ? '已确认，Agent 继续执行' : '已取消操作') : '运行状态已更新')
  } catch (error) {
    toast.error(error?.message || '全局 Agent 运行控制失败')
  } finally {
    msg.agenticRunLoading = false
    scrollToBottom()
  }
}

const saveCurrentGlobalSessionKnowledge = async () => {
  if (!currentSession.value || messages.value.length <= 1) return toast.info('当前全局会话还没有可沉淀的内容')
  try {
    const data = await postKnowledgeCapture(buildGlobalConversationKnowledgePayload({
      sessionId: currentSessionId.value,
      messages: messages.value,
    }))
    toast.success(`已保存到知识库：${data.entry?.title || '全局会话'}`)
  } catch (error) {
    toast.error(error?.message || '保存全局会话知识失败')
  }
}

const applyGlobalMissionPayload = (msg, payload = {}) => {
  if (!msg) return
  const missionEnvelope = payload.mission?.mission ? payload.mission : payload
  const mission = missionEnvelope.mission || payload.mission
  const children = missionEnvelope.children || payload.children || []
  if (mission?.id) msg.globalMission = mission
  if (Array.isArray(children)) msg.globalMissionChildren = children.map(task => task?.task ? task : ({ task, target: task?.mission_target || null }))
  if (payload.supervisor) msg.globalMissionSupervisor = payload.supervisor
  if (mission?.status === 'cancelled') msg.content = '全局任务已取消。'
  else if (payload.supervisor?.status === 'paused') msg.content = '全局任务跟进已暂停。'
  else if (payload.supervisor?.status === 'monitoring') msg.content = '全局任务跟进已恢复，会继续跟踪执行与验收。'
}

const getGlobalTaskCard = (msg) => {
  if (!msg || msg.role !== 'assistant') return null
  return globalMissionTaskCard(msg) || globalAgentRunTaskCard(msg)
}

const GLOBAL_MISSION_TASK_MESSAGE_TYPES = new Set([
  'global_mission',
  'global_mission_complete',
  'global_mission_waiting_user',
  'global_mission_terminal',
])

const isGlobalMissionTaskMessage = (msg) => GLOBAL_MISSION_TASK_MESSAGE_TYPES.has(String(msg?.type || ''))

const runtimeDebugRows = (msg) => {
  const debug = msg?.agenticRun?.runtime_debug || null
  if (!debug) return []
  const rows = []
  if (msg?.agenticRun?.id) rows.push({ label: '运行 ID', value: msg.agenticRun.id })
  rows.push({ label: '状态', value: `${debug.status || '-'} / ${debug.phase || '-'}` })
  if (debug.pending_tool?.name) rows.push({ label: '待确认工具', value: `${debug.pending_tool.name} · ${debug.pending_tool.risk || ''}` })
  rows.push({ label: '调用', value: `模型 ${debug.model_calls || 0} · 工具 ${debug.tool_calls || 0} · 恢复 ${debug.resume_count || 0}` })
  if (debug.todos?.length) rows.push({ label: 'Todo', value: debug.todos.slice(-4).map(item => `${item.status}:${item.text}`).join(' / ') })
  if (debug.permissions?.length) rows.push({ label: '权限', value: debug.permissions.slice(-2).map(item => item.result?.rule?.decision || (item.result?.allowed ? 'allow' : item.result?.denied ? 'deny' : 'ask')).join(' / ') })
  if (debug.hooks?.length) rows.push({ label: 'Hook', value: debug.hooks.slice(-2).map(item => `${item.phase}:${item.blocked ? 'blocked' : 'ok'}`).join(' / ') })
  if (debug.output_tail?.length) rows.push({ label: '输出', value: debug.output_tail.slice(-2).map(item => item.type || 'event').join(' / ') })
  return rows
}

const runtimeDebugSections = (msg) => {
  // 简单业务短气泡：不挂「技术详情」折叠块
  if (!globalExecutionIntentConfirmed(msg)) return []
  if (classifyGlobalAgentRunPresentation(msg?.agenticRun || {}, msg) === PRESENTATION_REPLY) return []
  const debug = msg?.agenticRun?.runtime_debug || null
  if (!debug) return []
  const fallback = {
    run_id: msg?.agenticRun?.id || '',
    blockers: debug.failed_gates || [],
    trace_id: debug.trace_id || msg?.agenticRun?.trace_id || '',
  }
  const sections = getTechnicalDetailSections({ technical: fallback }, fallback)
  const records = sections.find(section => section.id === 'records') || { id: 'records', title: '完整记录', items: [] }
  for (const row of runtimeDebugRows(msg)) {
    if (!records.items.some(item => item.label === row.label && item.value === row.value)) records.items.push(row)
  }
  if (!sections.includes(records)) sections.push(records)
  return sections.map(section => ({
    ...section,
    items: section.items.map(item => ({ ...item, value: sanitizeUserFacingAgentText(item.value, String(item.value || ''), 420) }))
  }))
}

const inferGlobalChangeProject = (msg) => {
  const direct = msg?.agenticRun?.project || msg?.agenticRun?.target_project || msg?.globalMission?.target_project
  if (direct) return direct
  const children = Array.isArray(msg?.globalMissionChildren) ? msg.globalMissionChildren : []
  const projects = [...new Set(children.map(row => row?.target?.name || row?.task?.target_project || row?.task?.mission_target?.name).filter(Boolean))]
  return projects.length === 1 ? projects[0] : ''
}

const openGlobalCodeChangeDrawer = (msg, card, action = {}) => {
  const project = action.project || inferGlobalChangeProject(msg)
  const sourceFiles = action.files?.length
    ? action.files
    : card?.change_summary?.files?.length
      ? card.change_summary.files
      : card?.changeSummary?.files?.length
        ? card.changeSummary.files
        : card?.delivery?.changes?.length
          ? card.delivery.changes
          : card?.delivery?.files || []
  const files = sourceFiles.map(item => {
    if (typeof item === 'string') return { path: item, project, statusText: '变更', statusColor: '#64748b' }
    return { ...item, project: item.project || project, statusText: item.statusText || item.status || '变更', statusColor: item.statusColor || '#64748b' }
  }).filter(item => item.path)
  openCodeChangeDrawer(
    { files, count: files.length },
    {
      title: card?.title || '全局 Agent 代码改动',
      subtitle: card?.goal || '',
      project,
      files,
      selectedPath: action.selectedPath || files[0]?.path || '',
    }
  )
}

const openGlobalChangesTab = () => {
  emit('switch-tab', 'changes')
}

const handleGlobalTaskAction = async (msg, action) => {
  const card = getGlobalTaskCard(msg)
  try {
    if (action.kind === 'view_changes') {
      openGlobalCodeChangeDrawer(msg, card, action)
      return
    }
    if (action.kind === 'save_knowledge') {
      const data = await postKnowledgeCapture(buildGlobalTaskKnowledgePayload({
        msg,
        card,
        sessionId: currentSessionId.value,
      }))
      toast.success(`已保存到知识库：${data.entry?.title || card?.title || '全局任务'}`)
      return
    }
    if (action.kind === 'view_trace') {
      const replayTaskId = action.task_id || action.taskId || card?.task_id || card?.taskId || card?.technical?.task_id || ''
      localStorage.setItem('trace-replay-target', JSON.stringify({ scope: 'global', task_id: replayTaskId, trace_id: action.trace_id || card?.technical?.trace_id || '', at: Date.now() }))
      emit('switch-tab', 'trace-replay')
      window.dispatchEvent(new CustomEvent('trace-replay-target', { detail: { scope: 'global', task_id: replayTaskId, trace_id: action.trace_id || card?.technical?.trace_id || '' } }))
      return
    }
    if (action.kind === 'approve_epic') {
      const epicId = msg?.globalMission?.id || card?.task_id || msg?.agenticRun?.mission_id
      if (!epicId) throw new Error('当前需求 Epic 没有任务 ID')
      if (!await confirmDialog(`确认批准“${card?.title || epicId}”的整批变更并完成 Epic 交付？`)) return
      const data = await postJson('/api/tasks/requirement-epic/review', { id: epicId, operation: 'approve' })
      if (data.task) msg.globalMission = data.task
      saveHistory()
      toast.success('需求 Epic 已批准交付')
      return
    }
    if (action.kind === 'targeted_rework' && (action.requirement_epic || card?.requirement_epic)) {
      const epicId = msg?.globalMission?.id || card?.task_id || msg?.agenticRun?.mission_id
      const items = card?.requirement_epic?.items || []
      const itemHint = items.map(item => `${item.item_key}: ${item.title}`).join('\n')
      const itemKey = window.prompt(`输入要退回的子任务 item_key：\n${itemHint}`, items[0]?.item_key || '')
      if (!itemKey?.trim()) return
      const feedback = window.prompt('说明需要返工的内容：', '')
      if (!feedback?.trim()) return
      const data = await postJson('/api/tasks/requirement-epic/review', { id: epicId, operation: 'rework', item_key: itemKey.trim(), feedback: feedback.trim() })
      if (data.task) msg.globalMission = data.task
      saveHistory()
      toast.success('已退回指定子任务返工')
      return
    }
    if (action.kind === 'confirm_plan') {
      const taskId = card?.task_id || msg?.task_id
      const feedback = String(action.accept_feedback || action.acceptFeedback || action.feedback || '').trim()
      if (!await confirmDialog(`确认执行“${card?.title || taskId}”的需求拆单计划？`)) return
      const data = await postJson('/api/usability/intake/confirm', { id: taskId, ...(feedback ? { accept_feedback: feedback } : {}) })
      if (data.epic || data.task) msg.globalMission = data.epic || data.task
      if (data.children) msg.globalMissionChildren = data.children.map(task => ({ task, target: task.mission_target || null }))
      saveHistory()
      toast.success('需求任务图已确认并开始派发')
      return
    }
    if (action.kind === 'continue_work_item') {
      const targetLine = `${action.target || '已解锁工作项'}：${action.reason || '继续处理已解锁工作项'}`
      const missionId = msg?.globalMission?.id || card?.task_id || msg?.agenticRun?.mission_id
      const supervisorId = msg?.globalMissionSupervisor?.id || msg?.agenticRun?.supervisor_id || missionId
      if (missionId || supervisorId) {
        const data = await postJson('/api/global-agent/supervisors/control', {
          id: supervisorId || missionId,
          mission_id: missionId,
          operation: 'update_goal',
          business_goal: `${card?.goal || msg?.globalMission?.business_goal || msg?.globalMission?.title || ''}\n继续派发已解锁工作项：${targetLine}`.trim(),
          reason: '用户从全局任务卡继续派发已解锁工作项',
          continuation: {
            rework_kind: 'next_claimable_work_item',
            target: action.target || '',
            reason: action.reason || '',
            title: action.label || '继续派发',
            work_item_id: action.work_item_id || '',
            source: 'user_next_work_item',
          },
          actor: 'global-agent-task-card',
        })
        applyGlobalMissionPayload(msg, data)
        saveHistory()
        scrollToBottom()
        toast.success('已提交，我会继续安排')
        return
      }
      chatInput.value = `继续处理这个全局任务的已解锁工作项：${targetLine}`
      await nextTick()
      return sendMessage()
    }
    if (
      action.kind === 'continue'
      && card?.phase === 'needs_user'
      && (msg?.globalMission?.id || msg?.globalMissionSupervisor?.mission_id)
    ) {
      return beginGlobalMissionInput(msg, card)
    }
    if (msg?.agenticRun?.id) {
      if (action.kind === 'provide_clarification') {
        pendingGlobalClarificationInput.value = {
          runId: msg.agenticRun.id,
          title: msg.agenticRun?.clarification_summary?.question
            || msg.agenticRun?.clarificationSummary?.question
            || msg.agenticRun?.clarification_question
            || card?.next_action
            || '补充当前请求',
        }
        chatInput.value = ''
        await nextTick()
        chatInputElement.value?.focus?.()
        toast.info('请直接在输入框补充目标、范围或验收标准，我会接着同一个运行继续。')
        return
      }
      if (action.kind === 'confirm') return controlAgenticRun(msg, 'confirm', true, action.accept_feedback || action.acceptFeedback || action.feedback || '')
      if (action.kind === 'reject_confirmation') return controlAgenticRun(msg, 'confirm', false)
      if (action.kind === 'cancel') return controlAgenticRun(msg, 'cancel')
      if (action.kind === 'resume' || action.kind === 'continue') {
        const preset = action.kind === 'continue' ? String(action.message || action.prompt || '').trim() : ''
        return controlAgenticRun(msg, 'resume', true, preset, action.source || '')
      }
      if (action.kind === 'retry') {
        chatInput.value = msg.agenticRun.user_message || card?.goal || card?.title || '继续处理这个全局任务'
        await nextTick()
        return sendMessage()
      }
    }
    const missionId = msg?.globalMission?.id || card?.task_id || msg?.agenticRun?.mission_id
    const supervisorId = msg?.globalMissionSupervisor?.id || msg?.agenticRun?.supervisor_id || missionId
    const controlMission = async (operation, extra = {}) => {
      if (!supervisorId && !missionId) throw new Error('当前全局任务没有可控制的任务 ID')
      const data = await postJson('/api/global-agent/supervisors/control', {
        id: supervisorId || missionId,
        mission_id: missionId,
        operation,
        actor: 'global-agent-task-card',
        ...extra,
      })
      applyGlobalMissionPayload(msg, data)
      saveHistory()
      scrollToBottom()
      toast.success(operation === 'cancel' ? '全局任务已取消' : operation === 'resume' ? '全局任务已恢复' : '全局任务已更新')
      return data
    }
    if (action.kind === 'continue') {
      const preset = String(action.message || action.prompt || '').trim()
      const requirement = preset || window.prompt('继续补充什么要求？', '')
      if (!requirement) return
      if (missionId && card?.phase !== 'completed') {
        return controlMission('update_goal', {
          business_goal: `${card?.goal || msg?.globalMission?.business_goal || msg?.globalMission?.title || ''}\n补充要求：${requirement}`.trim(),
          reason: '用户从全局任务卡继续修改',
        })
      }
      chatInput.value = missionId ? `继续全局任务 ${missionId}：${requirement}` : requirement
      await nextTick()
      return sendMessage()
    }
    if (action.kind === 'cancel') {
      if (!await confirmDialog(`确定取消全局任务“${card?.title || missionId}”？`)) return
      return controlMission('cancel', { reason: '用户从全局任务卡取消' })
    }
    if (action.kind === 'retry') {
      if (missionId) return controlMission('resume', { reason: '用户从全局任务卡重新执行/恢复' })
      chatInput.value = card?.goal || card?.title || '重新执行这个全局任务'
      await nextTick()
      return sendMessage()
    }
    if (action.kind === 'resume') {
      return controlMission('resume', { reason: '用户从全局任务卡恢复' })
    }
    if (action.kind === 'rollback') {
      toast.info('跨项目安全撤销需要在具体任务/项目的交付卡中执行，以避免误回滚无关改动。')
    }
  } catch (error) {
    toast.error(error?.message || `${action.label || '操作'}失败`)
  }
}

const recordManagementAudit = async (action, status, result = {}) => {
  try {
    await postJson('/api/global-agent/audit', {
      action,
      status,
      result,
      session_id: currentSessionId.value
    })
  } catch {}
}

const managementTargetLabel = (action) => {
  const params = action?.params || {}
  return params.name || params.project || params.id || params.group_id || params.kind || 'CCM 系统'
}

const managementDetails = (action, result) => {
  const params = action?.params || {}
  const operation = params.operation || 'inspect'
  const details = [
    { label: '能力', value: action.capability || action.type },
    { label: '操作', value: operation },
    { label: '目标', value: managementTargetLabel(action) }
  ]
  if (action.type === 'system_status') {
    details.push(
      { label: '项目', value: String(result.projects?.projects?.length || 0) + ' 个，运行 ' + String((result.projects?.projects || []).filter(item => item.running).length) + ' 个' },
      { label: '群聊', value: String(result.groups?.groups?.length || 0) + ' 个' },
      { label: '任务', value: String(result.tasks?.tasks?.length || 0) + ' 个，进行中 ' + String((result.tasks?.tasks || []).filter(item => item.status === 'in_progress').length) + ' 个' },
      { label: '定时任务', value: String(result.cron?.jobs?.length || 0) + ' 个，启用 ' + String((result.cron?.jobs || []).filter(item => item.enabled).length) + ' 个' }
    )
  } else if (operation === 'list') {
    const rows = result.jobs || result.groups || result.projects || result.tasks || result.tools || result.skills || []
    details.push({ label: '数量', value: String(rows.length || 0) })
    const names = rows.slice(0, 8).map(item => item.name || item.title || item.id).filter(Boolean)
    if (names.length) details.push({ label: '项目', value: names.join('、') })
  } else if (result.message) {
    details.push({ label: '结果', value: result.message })
  } else {
    details.push({ label: '结果', value: '操作执行成功' })
  }
  return details
}

const executeManagementAction = async (action) => {
  const params = { ...(action.params || {}) }
  const operation = params.operation || (action.type === 'system_status' ? 'inspect' : '')
  const target = managementTargetLabel(action)
  if (action.needs_user_input || action.validated === false) {
    const missing = (action.missing_params || []).join('、') || '必要参数'
    await recordManagementAudit(action, 'invalid', { missing_params: action.missing_params || [] })
    addAssistantMessage('管理操作需要补充参数：' + missing, {
      type: 'management_action',
      managementReceipt: {
        success: false,
        title: '需要补充参数',
        details: [...managementDetails(action, {}), { label: '缺少参数', value: missing }]
      }
    })
    toast.info('请补充管理操作参数')
    return
  }
  if (action.requires_confirmation) {
    const confirmed = window.confirm('高风险操作确认\n\n能力：' + (action.capability || action.type) + '\n操作：' + operation + '\n目标：' + target + '\n\n此操作可能不可恢复，确定继续吗？')
    if (!confirmed) {
      await recordManagementAudit(action, 'cancelled', { reason: 'user_cancelled' })
      addAssistantMessage('管理操作已取消：' + operation + ' ' + target, {
        type: 'management_action',
        managementReceipt: { success: false, cancelled: true, title: '操作已取消', details: managementDetails(action, {}) }
      })
      return
    }
  }

  let result
  try {
    if (action.type === 'system_status') {
      const [projects, groups, tasks, cron, tools] = await Promise.all([
        requestJson('/api/projects'),
        requestJson('/api/groups'),
        requestJson('/api/tasks'),
        requestJson('/api/cron'),
        requestJson('/api/tools/status')
      ])
      result = { success: true, projects, groups, tasks, cron, tools }
    } else if (action.type === 'manage_cron') {
      if (operation === 'list') result = await requestJson('/api/cron')
      else if (operation === 'create') result = await postJson('/api/cron/create', params)
      else if (operation === 'update') result = await postJson('/api/cron/update', params)
      else if (operation === 'enable' || operation === 'disable') result = await postJson('/api/cron/update', { id: params.id, enabled: operation === 'enable' })
      else if (operation === 'run') result = await postJson('/api/cron/run', { id: params.id })
      else if (operation === 'delete') result = await postJson('/api/cron/delete', { id: params.id })
    } else if (action.type === 'manage_group') {
      if (operation === 'list') result = await requestJson('/api/groups')
      else if (operation === 'create') result = await postJson('/api/groups/create', { name: params.name, members: params.members || (params.project ? [{ project: params.project }] : []) })
      else if (operation === 'rename') result = await postJson('/api/groups/rename', { id: params.id || params.group_id, name: params.name })
      else if (operation === 'add_member') result = await postJson('/api/groups/members', { id: params.id || params.group_id, add: params.members || [{ project: params.project }] })
      else if (operation === 'remove_member') result = await postJson('/api/groups/members', { id: params.id || params.group_id, remove: params.projects || [params.project] })
      else if (operation === 'delete') result = await postJson('/api/groups/delete', { id: params.id || params.group_id })
    } else if (action.type === 'manage_project') {
      const project = params.project || params.name
      if (operation === 'list') result = await requestJson('/api/projects')
      else if (operation === 'create') result = await postJson('/api/projects/create', params)
      else if (operation === 'update') result = await postJson('/api/projects/update', { ...params, name: project })
      else if (operation === 'start') result = await postJson('/api/start', { project, agent: params.agent })
      else if (operation === 'stop') result = await postJson('/api/stop', { project })
      else if (operation === 'delete') result = await postJson('/api/projects/archive', { name: project })
    } else if (action.type === 'manage_task') {
      const id = params.id || params.task_id
      if (operation === 'list') result = await requestJson('/api/tasks')
      else if (operation === 'pause') result = await postJson('/api/tasks/update', { id, status: 'paused', status_detail: '由全局 Agent暂停' })
      else if (operation === 'resume') {
        await postJson('/api/tasks/update', { id, status: 'pending', status_detail: '由全局 Agent恢复' })
        result = await postJson('/api/tasks/queue', { task_id: id })
      } else if (operation === 'continue') result = await postJson('/api/tasks/continue', { id, message: params.message || '由全局 Agent继续推进', auto_execute: true })
      else if (operation === 'retry') result = await postJson('/api/tasks/retry', { id, reason: params.message || '由全局 Agent发起重试', auto_execute: true })
      else if (operation === 'queue') result = await postJson('/api/tasks/queue', { task_id: id })
      else if (operation === 'delete') result = await postJson('/api/tasks/delete', { id })
    } else if (action.type === 'manage_tool') {
      const kind = params.kind === 'skill' ? 'skill' : 'mcp'
      if (operation === 'status') result = await requestJson('/api/tools/status')
      else if (operation === 'reload') result = await postJson('/api/tools/reload')
      else if (operation === 'list') result = await requestJson(kind === 'skill' ? '/api/skills' : '/api/mcp')
      else if (operation === 'create') {
        const payload = { ...params }
        delete payload.operation
        delete payload.kind
        result = await postJson(kind === 'skill' ? '/api/skills' : '/api/mcp', payload)
      } else if (operation === 'delete') {
        result = await postJson(kind === 'skill' ? '/api/skills/delete' : '/api/mcp/delete', { name: params.name })
      }
    }
    if (!result) throw new Error('不支持的管理操作：' + action.type + '/' + operation)
    await recordManagementAudit(action, 'success', result)
    const completionText = action.type === 'manage_project' && operation === 'delete'
      ? `${result.message || '项目已归档，可随时恢复。'}${result.audit_id ? `\n审计编号：${result.audit_id}` : ''}`
      : '系统管理操作已完成：' + operation + ' ' + target
    addAssistantMessage(completionText, {
      type: 'management_action',
      managementReceipt: { success: true, title: action.capability || '系统管理', details: managementDetails(action, result) }
    })
    toast.success('系统管理操作已完成')
  } catch (error) {
    await recordManagementAudit(action, 'failed', { error: error?.message || String(error) })
    addAssistantMessage('系统管理操作失败：' + (error?.message || error), {
      type: 'management_action',
      managementReceipt: {
        success: false,
        title: (action.capability || '系统管理') + '失败',
        details: [...managementDetails(action, {}), { label: '错误', value: error?.message || String(error) }]
      }
    })
    toast.error(error?.message || '系统管理操作失败')
  }
}

const inferGlobalProjectCommandRequiresCodeChanges = (message) => {
  const text = String(message || '').trim()
  const explicitCodeChange = /(修改|修复|实现|新增|删除|重构|改代码|开发|接入|对接|bug|页面|接口|字段|schema|配置)/i.test(text)
  const readOnlyOnly = /(只读|仅分析|只分析|不要修改|不修改|不改代码|无需代码|无需修改|运行测试|执行测试|跑测试|检查|审查|review)/i.test(text)
  return !(readOnlyOnly && !explicitCodeChange)
}

const dispatchTrackedGlobalMission = async ({ params = {}, title, businessGoal, source, attachments = [] }) => {
  const missionRes = await fetch('/api/global-agent/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      title,
      business_goal: businessGoal,
      source_documents: params.documents || params.source_documents || params.sourceDocuments || '',
      source_attachments: attachments,
      auto_execute: true,
      source,
    })
  })
  const missionData = await missionRes.json()
  if (!missionRes.ok || missionData.success === false) throw new Error(missionData.error || '全局任务创建失败')
  const childRows = (missionData.children || []).map(item => ({
    task: item.task,
    target: item.target,
    queue_result: item.queue_result,
  }))
  addAssistantMessage(
    `全局任务「${visibleGlobalText(missionData.mission?.title || title, '全局任务', 120)}」已进入持续跟进。\n\n当前只是已派发，不代表最终完成；我会继续跟踪执行、独立复核、验收和最终总结。`,
    {
      type: 'global_mission',
      globalMission: missionData.mission,
      globalMissionChildren: childRows,
      globalMissionSupervisor: missionData.supervisor || null,
    }
  )
  trackGlobalMission(missionData.mission.id, currentSessionId.value)
  return { missionData, childRows }
}

const executeAction = async (action, actionFiles = []) => {
  executingAction.value = action
  scrollToBottom()

  try {
    if (managementActionTypes.has(action.type)) {
      await executeManagementAction(action)
    } else if (action.type === 'play_music') {
      const { keyword, isRandom, requestLabel } = normalizeMusicAction(action)
      toast.info(isRandom ? '正在为您随机播放音乐...' : `正在为您后台检索并播放${requestLabel}...`)
      if (typeof window.__cc_global_play_music === 'function') {
        try {
          const result = await window.__cc_global_play_music(keyword, { requestText: String(action?.params?.request_text || keyword) })
          if (result?.skipped) {
            return
          } else if (result.success) {
            const playedTitle = result.title ? `《${result.title}》` : requestLabel
            toast.success(`${isRandom ? '已随机播放' : '找到音乐'}${playedTitle}(${result.source})，已开始播放！`)
            addAssistantMessage(systemResultMessage('🎵', `${isRandom ? '随机播放成功' : '成功点歌'}${playedTitle}！\n- **来源**: ${result.source}\n- **状态**: 正在后台播放中...`))
          } else {
            toast.error(`播放失败: ${result.error}`)
            addAssistantMessage(`❌ [音乐播放失败]: ${result.error || '未找到可播放的音乐'}`)
          }
        } catch (err) {
          toast.error(`播放出错: ${err.message || err}`)
          addAssistantMessage(`❌ [音乐播放失败]: ${err.message || err}`)
        }
      } else {
        try {
          const res = await fetch('/api/music/remote-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword, request_text: String(action?.params?.request_text || keyword), source: 'global-agent-web' })
          })
          const data = await res.json()
          if (!res.ok || data.success === false) throw new Error(data.error || '创建音乐播放指令失败')
          toast.success('已发送播放指令，音乐引擎就绪后会自动播放')
          addAssistantMessage(systemResultMessage('🎵', `已把${requestLabel}发送给音乐播放器。\n- **状态**: 等待常驻音乐引擎消费指令\n- **指令ID**: ${data.command?.id || '已创建'}`))
        } catch (err) {
          toast.error(`播放出错: ${err.message || err}`)
          addAssistantMessage(`❌ [音乐播放失败]: ${err.message || err}`)
        }
      }
    } else if (action.type === 'toggle_pet') {
      const petAction = getActionParam(action, 'action', 'operation')
      const isLaunch = petAction !== 'close'
      toast.info(isLaunch ? '正在拉起桌面宠物...' : '正在关闭桌面宠物...')
      const petRes = await fetch(isLaunch ? '/api/pets/launch' : '/api/pets/close', {
        method: 'POST'
      })
      const petData = await petRes.json()
      if (petData.success) {
        toast.success(isLaunch ? '桌面宠物已成功在桌面唤醒！🐾' : '桌面宠物已成功隐藏。')
        addAssistantMessage(systemResultMessage('🐾', `桌面宠物已成功${isLaunch ? '在您的桌面唤醒且可见' : '从桌面隐藏关闭'}。`))
      } else {
        toast.error(`宠物控制失败: ${petData.error || '未知原因'}`)
        addAssistantMessage(`❌ [宠物控制失败]: ${petData.error || '未知原因'}`)
      }
    } else if (action.type === 'navigate') {
      const tab = getActionParam(action, 'tab')
      toast.success('正在为您跳转页面...')
      addAssistantMessage(systemResultMessage('🧭', `已为您切换到「${tab}」页面。`))
      setTimeout(() => {
        emit('switch-tab', tab)
      }, 300)
    } else if (action.type === 'orchestrate_development') {
      const params = action.params || {}
      const title = getActionParam(action, 'title', 'name') || '全局跨项目开发任务'
      const businessGoal = getActionParam(action, 'business_goal', 'businessGoal', 'goal') || title
      toast.info('全局 Agent正在建立跨项目总计划...')
      const { childRows } = await dispatchTrackedGlobalMission({ params, title, businessGoal, source: 'global-agent-chat', attachments: actionFiles })
      toast.success('全局任务已派发给 ' + childRows.length + ' 个执行目标')
    } else if (action.type === 'create_task') {
      const title = getActionParam(action, 'title', 'name') || '全局助手派发任务'
      const groupId = getActionParam(action, 'group_id', 'groupId') || 'gmps7ha15'
      const businessGoal = getActionParam(action, 'business_goal', 'businessGoal') || title
      const acceptance = getActionParam(action, 'acceptance', 'acceptance_criteria', 'acceptanceCriteria') || '执行成员提供结果说明；我输出最终报告'
      toast.info(`正在为您派发协作任务: ${title}...`)
      const taskRes = await fetch('/api/tasks/create-daily-dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          group_id: groupId,
          business_goal: businessGoal,
          scope: getActionParam(action, 'scope') || '',
          documents: '',
          acceptance,
          persist_documents: true,
          auto_execute: true
        })
      })
      const taskData = await taskRes.json()
      if (taskData.success) {
        toast.success('任务派发成功！')
        addAssistantMessage(systemResultMessage('📋', `协作开发任务已成功派发并进入后台自动执行队列！\n- **任务标题**: ${title}\n- **业务目标**: ${businessGoal}\n- **分发群聊**: ${groupId}\n- **验收标准**: ${acceptance}`))
      } else {
        toast.error(`任务派发失败: ${taskData.error || '未知错误'}`)
        addAssistantMessage(`❌ [任务派发失败]: ${taskData.error || '未知错误'}`)
      }
    } else if (action.type === 'send_project_cmd') {
      const project = getActionParam(action, 'project', 'projectName')
      const message = getActionParam(action, 'message', 'prompt', 'command')
      const requiresCodeChanges = inferGlobalProjectCommandRequiresCodeChanges(message)
      toast.info(`正在为 ${project} 建立持续监督任务...`)
      await dispatchTrackedGlobalMission({
        title: `${project} 项目任务`,
        businessGoal: message,
        source: 'global-agent-chat-single-project',
        attachments: actionFiles,
        params: {
          targets: [{
            type: 'project',
            project,
            task: message,
            reason: '全局主 Agent 指定该项目执行，并持续跟踪独立复核和最终验收。',
            requires_code_changes: requiresCodeChanges,
            requires_verification: true,
            requires_independent_review: true,
          }],
          acceptance: '项目执行成员必须说明实际动作、文件变化、已执行验证和风险；TestAgent 独立复核和主 Agent 完成前抽查通过后才能输出最终总结。',
          requires_code_changes: requiresCodeChanges,
          requires_verification: true,
          requires_independent_review: true,
          single_project_supervision: {
            schema: 'ccm-global-single-project-supervision-v1',
            project,
            independent_review_required: true,
            post_review_spot_check_required: true,
          },
        },
      })
      toast.success(`${project} 已进入持续监督`)
    } else if (action.type === 'send_group_cmd') {
      const groupId = getActionParam(action, 'group_id', 'groupId')
      const message = getActionParam(action, 'message', 'prompt', 'command')
      const targetProject = getActionParam(action, 'target_project', 'targetProject') || 'coordinator'
      toast.info(`正在向群聊协调者 [${groupId}] 安排指令...`)
      addAssistantMessage(systemResultMessage('⚙️', `正在向群聊协作组 [ID: ${groupId}] 安排协作指令：\n> "${message}"`))

      try {
        const groupRes = await fetch('/api/groups/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: groupId,
            target_project: targetProject,
            message,
            message_mode: 'project_task',
            force_task: true,
            auto_execute: true,
            requires_code_changes: inferGlobalProjectCommandRequiresCodeChanges(message),
            global_direct_dispatch: {
              schema: 'ccm-global-direct-dispatch-v1',
              source: 'global-agent-web-direct-dispatch',
              session_id: currentSessionId.value,
              original_text: message,
              user_goal: message,
            },
          })
        })
        const groupData = await groupRes.json()
        if (groupData.success) {
          addAssistantMessage('协作群已收到任务并进入任务链路。\n\n当前只是已派发，不代表最终完成；计划、执行、验收和最终总结会在任务卡中持续更新。')
        } else {
          addAssistantMessage(`❌ [安排协作指令失败]: ${groupData.error || '未知原因'}`)
        }
      } catch (err) {
        addAssistantMessage('❌ 安排协作指令到群聊时，网络连接出错')
      }
    } else if (action.type === 'create_cron_task') {
      const name = getActionParam(action, 'name', 'title') || '全局助手定时任务'
      const targetType = getActionParam(action, 'target_type', 'targetType') || (getActionParam(action, 'group_id', 'groupId') ? 'group' : 'project')
      const groupId = getActionParam(action, 'group_id', 'groupId') || null
      const project = getActionParam(action, 'project', 'projectName')
      const schedule = getActionParam(action, 'schedule', 'cron')
      const prompt = getActionParam(action, 'prompt', 'message', 'command')
      toast.info(`正在为您自动创建定时任务: ${name}...`)
      const cronRes = await fetch('/api/cron/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          schedule,
          prompt,
          target_type: targetType,
          group_id: groupId,
          project,
          workflow_type: 'general',
          enabled: true
        })
      })
      const cronData = await cronRes.json()
      if (cronData.success) {
        toast.success(`定时任务「${name}」创建成功！`)
        addAssistantMessage(systemResultMessage('⏰', `定时任务「${name}」已成功配置并创建！\n- **周期表达式**: \`${schedule}\`\n- **目标类型**: ${targetType === 'group' ? '群聊' : '项目'}\n- **执行提示词**: "${prompt}"`))
      } else {
        toast.error(`创建定时任务失败: ${cronData.error || '未知错误'}`)
        addAssistantMessage(`❌ [定时任务创建失败]: ${cronData.error || '未知错误'}`)
      }
    } else if (action.type === 'control_project') {
      const project = getActionParam(action, 'project', 'projectName')
      const lifecycleAction = getActionParam(action, 'action', 'operation') || 'start'
      const isStart = lifecycleAction !== 'stop'
      const agent = getActionParam(action, 'agent') || 'claudecode'
      toast.info(isStart ? `正在启动项目「${project}」...` : `正在停止项目「${project}」...`)
      const projectRes = await fetch(isStart ? '/api/start' : '/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isStart ? { project, agent } : { project })
      })
      const projectData = await projectRes.json()
      if (projectData.success) {
        const detail = isStart && projectData.pid ? `\n- **进程 PID**: ${projectData.pid}` : ''
        toast.success(isStart ? `项目「${project}」已启动` : `项目「${project}」已停止`)
        addAssistantMessage(systemResultMessage('🚀', `项目「${project}」已${isStart ? '启动' : '停止'}。\n- **动作**: ${isStart ? '启动项目' : '停止项目'}\n- **运行时**: ${agent}${detail}`))
      } else {
        const reason = projectData.error || '未知错误'
        toast.error(isStart ? `启动项目失败: ${reason}` : `停止项目失败: ${reason}`)
        addAssistantMessage(`❌ [项目${isStart ? '启动' : '停止'}失败]: ${reason}`)
      }
    } else if (action.type === 'create_project') {
      toast.info(`正在为您自动创建项目: ${action.params.name}...`)
      const projRes = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: action.params.name,
          work_dir: action.params.work_dir,
          agent: action.params.agent || 'claudecode',
          platform: '',
          platform_options: {}
        })
      })
      const projData = await projRes.json()
      if (projData.success) {
        toast.success(`项目「${action.params.name}」创建成功！`)
        addAssistantMessage(systemResultMessage('📂', `项目「${action.params.name}」已成功创建并绑定！\n- **物理路径**: \`${action.params.work_dir}\`\n- **内置 Agent 运行时**: \`${action.params.agent || 'claudecode'}\``))
      } else {
        toast.error(`创建项目失败: ${projData.error || '未知错误'}`)
        addAssistantMessage(`❌ [项目创建失败]: ${projData.error || '未知错误'}`)
      }
    } else if (action.type === 'create_template') {
      const templateContent = getActionParam(action, 'content', 'prompt', 'message')
      toast.info(`正在为您自动创建对话模板: ${action.params.name}...`)
      const tplRes = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: action.params.name,
          category: action.params.category || 'custom',
          prompt: templateContent
        })
      })
      const tplData = await tplRes.json()
      if (tplData.success) {
        toast.success(`对话模板「${action.params.name}」创建成功！`)
        addAssistantMessage(systemResultMessage('📚', `对话模板「${action.params.name}」已成功创建并保存！\n- **分类**: ${action.params.category || 'custom'}\n- **模板内容**:\n> ${templateContent}`))
      } else {
        toast.error(`创建对话模板失败: ${tplData.error || '未知错误'}`)
        addAssistantMessage(`❌ [对话模板创建失败]: ${tplData.error || '未知错误'}`)
      }
    } else if (action.type === 'git_review') {
      const project = getActionParam(action, 'project', 'projectName')
      if (!project) {
        addAssistantMessage('❌ [动作执行失败]: 动作 `git_review` 缺少必须的 `project` 参数。')
        return
      }

      addAssistantMessage('', {
        type: 'git_review',
        project,
        loading: true
      })

      // 释放执行指示器
      setTimeout(() => { executingAction.value = null; }, 500);

      const msgs = currentSession.value.messages
      const lastMsg = msgs[msgs.length - 1]
      try {
        const res = await fetch('/api/global-agent/git-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project })
        })
        const data = await res.json()
        lastMsg.loading = false
        if (data.success) {
          lastMsg.content = data.review
        } else {
          lastMsg.error = data.error || '未获取到审查报告'
        }
      } catch (err) {
        lastMsg.loading = false
        lastMsg.error = err.message || err || '请求代码审查失败'
      }
      saveHistory()

    } else if (action.type === 'git_commit') {
      const project = getActionParam(action, 'project', 'projectName')
      const defaultMsg = getActionParam(action, 'message', 'commitMessage') || ''
      if (!project) {
        addAssistantMessage('❌ [动作执行失败]: 动作 `git_commit` 缺少必须的 `project` 参数。')
        return
      }

      addAssistantMessage('', {
        type: 'git_commit',
        project,
        commitMessage: defaultMsg,
        loadingFiles: true,
        gitFiles: [],
        submitting: false,
        submitSuccess: false,
        submitError: null
      })

      // 释放执行指示器
      setTimeout(() => { executingAction.value = null; }, 500);

      const msgs = currentSession.value.messages
      const lastMsg = msgs[msgs.length - 1]
      try {
        const res = await fetch(`/api/git/status?project=${encodeURIComponent(project)}`)
        const data = await res.json()
        lastMsg.loadingFiles = false
        if (data.success) {
          lastMsg.gitFiles = (data.files || []).map(f => ({
            path: f.path,
            status: f.status,
            selected: true
          }))
          if (!lastMsg.commitMessage) {
            lastMsg.commitMessage = 'feat: 自动代码变更提交'
          }
        } else {
          lastMsg.fetchError = '获取 Git 状态失败: ' + (data.error || '未知原因')
        }
      } catch (err) {
        lastMsg.loadingFiles = false
        lastMsg.fetchError = '拉取 Git 状态出错: ' + err.message
      }
      saveHistory()
    }
  } catch (err) {
    toast.error('动作执行出错，请检查系统日志')
    addAssistantMessage(`❌ [动作执行出错]: ${err.message || err || '未知错误'}`)
  } finally {
    setTimeout(() => {
      executingAction.value = null
    }, 2000)
  }
}


  return {
    requestJson, postJson, controlAgenticRun, saveCurrentGlobalSessionKnowledge, applyGlobalMissionPayload, getGlobalTaskCard,
    isGlobalMissionTaskMessage, runtimeDebugSections, openGlobalCodeChangeDrawer, openGlobalChangesTab,
    handleGlobalTaskAction, executeManagementAction, dispatchTrackedGlobalMission, executeAction,
  }
}
