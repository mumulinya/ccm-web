import { ref, computed, watch, nextTick } from 'vue'
import { groupsApi } from '../../api/index.js'
import { toast } from '../../utils/toast.js'
import { useConversationTurnControl } from '../../composables/useConversationTurnControl.js'
import { notifySessionContextUsage } from '../../composables/useSessionContextUsage.js'
import { buildGroupClarificationResponseFields, buildWaitingUserTaskContinuationFields } from '../../composables/useGroupTaskCardActions.js'
import {
  GROUP_VISIBLE_INTERNAL_TEXT_PATTERN,
  sanitizeGroupVisibleText,
  buildGroupStreamErrorText,
  formatFileSize,
  getMessageTaskId,
  getTaskCard,
  groupSendRetrySignature,
} from './groupChatHelpers.js'

export function useGroupChatStream({
  messages,
  currentGroup,
  currentGroupSessionId,
  mainAgentStatus,
  groupAgentQa,
  lastGroupMsgCount,
  newMessage,
  messageFiles,
  targetAgent,
  messageMode,
  pendingGroupTaskInput,
  pendingGroupClarificationInput,
  pendingDirectMemoryCommand,
  isTaskSupplementMode,
  isClarificationResponseMode,
  mergeIncomingMessage,
  waitingCrossReply,
  pullNewMessages,
  createLocalMessageId,
  attachMainAgentDecision,
  applyAssignmentStatus,
  applyTransientTaskRuntime,
  applyTestAgentExecutionPlanReady,
  applyTestAgentReviewReady,
  getTestAgentReviewPayload,
  beginGroupClarificationInput,
  focusGroupInput,
  scrollToBottom,
}) {
  let activeAgentStreamMsgs = {}

  const appendAgentWorkEvent = (agent, event) => {
    if (!agent || !event) return
    let streamMsg = activeAgentStreamMsgs[agent]
    if (!streamMsg) {
      streamMsg = {
        role: 'assistant',
        agent,
        content: '',
        streaming: true,
        workEvents: [],
        timestamp: new Date().toISOString()
      }
      activeAgentStreamMsgs[agent] = streamMsg
      messages.value.push(streamMsg)
    }
    if (!Array.isArray(streamMsg.workEvents)) streamMsg.workEvents = []
    const key = event.id || `${event.kind}:${event.time}:${event.text}`
    if (!streamMsg.workEvents.some(item => (item.id || `${item.kind}:${item.time}:${item.text}`) === key)) {
      streamMsg.workEvents.push(event)
      if (streamMsg.workEvents.length > 80) streamMsg.workEvents.splice(0, streamMsg.workEvents.length - 80)
    }
    streamMsg.timestamp = event.time || streamMsg.timestamp
  }

  const appendAgentQaMessage = (payload) => {
    const qa = payload?.qa || {}
    if (!qa.id && !qa.content) return
    const kind = payload.kind || qa.kind || 'question'
    const id = `${qa.id || Date.now().toString(36)}-${kind}`
    const msg = {
      id,
      role: 'assistant',
      agent: kind === 'answer' ? qa.to_agent : qa.from_agent,
      type: kind === 'resume' ? 'agent_qa_resume' : 'agent_qa',
      content: qa.content || qa.answer || qa.question || '',
      timestamp: new Date().toISOString(),
      qa: { ...qa, kind }
    }
    mergeIncomingMessage(msg)
  }


  const applyMainAgentProgressCheckpoint = (payload = {}) => {
    const checkpoint = payload.progressCheckpoint || payload.progress_checkpoint || payload.latest_progress_checkpoint || payload.latestProgressCheckpoint || null
    if (!checkpoint?.label) return false
    const current = mainAgentStatus.value || {}
    const existing = Array.isArray(current.progress_checkpoints || current.progressCheckpoints)
      ? [...(current.progress_checkpoints || current.progressCheckpoints)]
      : []
    const key = checkpoint.id || `${checkpoint.label}:${checkpoint.detail || ''}:${checkpoint.phase || ''}`
    const nextItems = [...existing.filter(item => (item.id || `${item.label}:${item.detail || ''}:${item.phase || ''}`) !== key), checkpoint].slice(-6)
    mainAgentStatus.value = {
      ...current,
      schema: current.schema || 'ccm-group-main-agent-status-v1',
      phase: checkpoint.phase || current.phase || 'running',
      label: current.label || checkpoint.label || '正在处理',
      task_id: payload.taskId || payload.task_id || checkpoint.task_id || current.task_id || '',
      latest_progress_checkpoint: checkpoint,
      latestProgressCheckpoint: checkpoint,
      recent_progress_checkpoints: nextItems.slice(-3),
      recentProgressCheckpoints: nextItems.slice(-3),
      progress_checkpoints: nextItems,
      progressCheckpoints: nextItems,
      updated_at: checkpoint.at || new Date().toISOString(),
    }
    return true
  }

  const isStreaming = ref(false)
  const thinkingMessages = ref([])
  const pendingGroupSendRetry = ref(null)
  const groupStreamController = ref(null)
  const activeGroupTaskId = ref('')
  const stoppingGroupTurn = ref(false)
  const groupTurnConversationId = computed(() => currentGroup.value?.id && currentGroupSessionId.value
    ? `${currentGroup.value.id}:${currentGroupSessionId.value}`
    : '')
  const groupTurnControl = useConversationTurnControl({
    scope: 'group',
    conversationId: groupTurnConversationId,
    busy: isStreaming,
  })

  const stopGroupCurrentWork = async ({ preserveTask = false } = {}) => {
    if (!isStreaming.value || stoppingGroupTurn.value) return
    stoppingGroupTurn.value = true
    try {
      const groupId = currentGroup.value?.id
      const sessionId = currentGroupSessionId.value
      if (groupId && sessionId) {
        await fetch('/api/conversation-turns/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'group',
            group_id: groupId,
            group_session_id: sessionId,
            task_id: activeGroupTaskId.value,
            reason: preserveTask ? '用户引导当前群聊任务，停止旧执行后续接' : '用户停止群聊主 Agent 当前工作',
            actor: preserveTask ? 'group-chat-steer' : 'group-chat-stop',
          }),
        }).catch(() => null)
      }
      if (!preserveTask && activeGroupTaskId.value) {
        await fetch('/api/tasks/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeGroupTaskId.value, reason: '用户从群聊会话停止当前工作' }),
        }).catch(() => null)
      }
      groupStreamController.value?.abort()
    } finally {
      stoppingGroupTurn.value = false
    }
  }

  const drainGroupTurnQueue = () => groupTurnControl.drain(async (turn) => {
    const result = await sendMessage({ queueTurn: turn })
    if (result?.success === false) throw new Error(result.error || '群聊消息没有完成')
    return { task_id: result?.taskId || '' }
  })
  watch(
    () => [groupTurnConversationId.value, isStreaming.value, groupTurnControl.turns.value.filter(turn => turn.status === 'queued').length],
    ([conversationId, busy, queued]) => {
      if (conversationId && !busy && queued) window.setTimeout(() => drainGroupTurnQueue().catch(() => {}), 0)
    },
    { flush: 'post' },
  )

  const submitGroupMessageWhileBusy = async () => {
    const message = newMessage.value.trim()
    if (!message) return
    if (messageFiles.value.length) {
      toast.info('工作中的排队消息暂不保存本地附件，请停止当前工作后连同附件发送')
      return
    }
    const requestedMode = groupTurnControl.mode.value
    await groupTurnControl.enqueue({
      message,
      mode: requestedMode,
      activeRunId: activeGroupTaskId.value,
      metadata: {
        group_id: currentGroup.value.id,
        group_session_id: currentGroupSessionId.value,
        target_project: targetAgent.value,
        message_mode: messageMode.value,
        continuation_task_id: activeGroupTaskId.value,
        requested_mode: requestedMode,
      },
    })
    newMessage.value = ''
    toast.success(requestedMode === 'steer' ? '已接收引导，正在停止旧执行并沿用当前任务继续' : '已加入队列，当前协作结束后会自动发送')
    if (requestedMode === 'steer') await stopGroupCurrentWork({ preserveTask: true })
    window.setTimeout(() => drainGroupTurnQueue().catch(() => {}), 0)
  }

  const sendMessage = async (options = {}) => {
    const queuedTurn = options?.queueTurn || null
    if (isStreaming.value && !queuedTurn) return submitGroupMessageWhileBusy()
    if ((!queuedTurn && !newMessage.value.trim() && messageFiles.value.length === 0) || !currentGroup.value) return
    const msg = queuedTurn ? String(queuedTurn.message || '').trim() : newMessage.value.trim()
    const filesToSend = queuedTurn ? [] : [...messageFiles.value]
    const taskSupplementTarget = isTaskSupplementMode.value ? { ...pendingGroupTaskInput.value } : null
    const clarificationResponseTarget = !taskSupplementTarget && isClarificationResponseMode.value
      ? { ...pendingGroupClarificationInput.value }
      : null
    const directMemoryCommand = !taskSupplementTarget && !clarificationResponseTarget && pendingDirectMemoryCommand.value
      ? { ...pendingDirectMemoryCommand.value }
      : null
    const queuedSteerFields = queuedTurn?.metadata?.requested_mode === 'steer' && queuedTurn?.metadata?.continuation_task_id ? {
      continuation_task_id: queuedTurn.metadata.continuation_task_id,
      continuation_kind: 'supplement',
      interrupt_current_run: false,
      message_mode: 'project_task',
    } : null
    const taskContinuationFields = queuedSteerFields || (taskSupplementTarget
      ? buildWaitingUserTaskContinuationFields(taskSupplementTarget)
      : null)
    const clarificationResponseFields = clarificationResponseTarget
      ? buildGroupClarificationResponseFields(clarificationResponseTarget)
      : null
    const directedInputFields = taskContinuationFields || clarificationResponseFields || (directMemoryCommand ? {
      memory_action: directMemoryCommand.action,
      memory_content: directMemoryCommand.content,
      message_mode: 'conversation',
    } : null)
    const retrySignature = groupSendRetrySignature({
      groupId: currentGroup.value.id,
      target: queuedTurn?.metadata?.target_project || targetAgent.value,
      mode: directedInputFields?.message_mode || queuedTurn?.metadata?.message_mode || messageMode.value,
      message: msg,
      files: filesToSend,
      directed: directedInputFields,
    })
    const clientMessageId = pendingGroupSendRetry.value?.signature === retrySignature
      ? pendingGroupSendRetry.value.clientMessageId
      : createLocalMessageId()
    pendingGroupSendRetry.value = { signature: retrySignature, clientMessageId }
    newMessage.value = ''
    messageFiles.value = []

    const attachmentText = filesToSend.length
      ? `

  [附件]
  ${filesToSend.map(f => `- ${f.name}（${formatFileSize(f.size)}）`).join('\n')}`
      : ''
    if (!messages.value.some(item => item.id === clientMessageId)) {
      messages.value.push({
        id: clientMessageId,
        role: 'user',
        target: (queuedTurn?.metadata?.target_project || targetAgent.value) === 'all' ? 'coordinator' : (queuedTurn?.metadata?.target_project || targetAgent.value),
        content: `${msg || '请处理附件'}${attachmentText}`,
        timestamp: new Date().toISOString(),
        ...(taskSupplementTarget ? { task_id: taskSupplementTarget.taskId } : {}),
        ...(clarificationResponseTarget ? {
          clarification_request_id: clarificationResponseTarget.requestId,
          clarification_response_to: clarificationResponseTarget.messageId,
        } : {})
      })
    }
    scrollToBottom()

    // 创建思考过程消息
    const thinkingMsg = {
      role: 'thinking',
      content: '',
      timestamp: new Date().toISOString()
    }
    messages.value.push(thinkingMsg)

    // 创建 Agent 回复消息
    const agentMsg = {
      role: 'assistant',
      agent: (queuedTurn?.metadata?.target_project || targetAgent.value) === 'all' ? 'coordinator' : (queuedTurn?.metadata?.target_project || targetAgent.value),
      content: '',
      timestamp: new Date().toISOString()
    }

    isStreaming.value = true
    thinkingMessages.value = []

    // 跟踪每个 Agent 的流式消息
    activeAgentStreamMsgs = {}
    const agentStreamMsgs = activeAgentStreamMsgs
    const agentStreamRawBuffers = {}
    const agentStreamHiddenBuffers = {}
    let hasMention = false
    let agentMsgAdded = false
    let singleStreamRawBuffer = ''
    let singleStreamHiddenBuffer = false

    let payload
    if (filesToSend.length > 0) {
      payload = new FormData()
      payload.append('group_id', currentGroup.value.id)
      payload.append('group_session_id', currentGroupSessionId.value)
      payload.append('target_project', (queuedTurn?.metadata?.target_project || targetAgent.value) === 'all' ? 'all' : (queuedTurn?.metadata?.target_project || targetAgent.value))
      payload.append('message', msg)
      payload.append('client_message_id', clientMessageId)
      payload.append('message_mode', directedInputFields?.message_mode || queuedTurn?.metadata?.message_mode || messageMode.value)
      if (directedInputFields) {
        Object.entries(directedInputFields)
          .filter(([key]) => key !== 'message_mode')
          .forEach(([key, value]) => payload.append(key, String(value)))
      }
      filesToSend.forEach(file => payload.append('files', file))
    } else {
      payload = {
        group_id: currentGroup.value.id,
        group_session_id: currentGroupSessionId.value,
        target_project: (queuedTurn?.metadata?.target_project || targetAgent.value) === 'all' ? undefined : (queuedTurn?.metadata?.target_project || targetAgent.value),
        message: msg,
        client_message_id: clientMessageId,
        message_mode: queuedTurn?.metadata?.message_mode || messageMode.value,
        ...(directedInputFields || {})
      }
    }

    let res
    const controller = new AbortController()
    groupStreamController.value = controller
    try {
      res = await groupsApi.send(payload, { signal: controller.signal })
    } catch (error) {
      const stopped = error?.name === 'AbortError'
      if (!stopped) {
        newMessage.value = msg
        messageFiles.value = filesToSend
      }
      const optimisticIdx = messages.value.findIndex(item => item.id === clientMessageId)
      if (optimisticIdx !== -1) messages.value.splice(optimisticIdx, 1)
      isStreaming.value = false
      const thinkingIdx = messages.value.indexOf(thinkingMsg)
      if (thinkingIdx !== -1) messages.value.splice(thinkingIdx, 1)
      if (!stopped) toast.error(error?.message || '消息提交失败，请检查后重试')
      nextTick(focusGroupInput)
      if (groupStreamController.value === controller) groupStreamController.value = null
      return { success: false, error: stopped ? '当前工作已停止' : (error?.message || '消息提交失败') }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let sseBuffer = ''
    let streamFailed = false
    let streamStopped = false
    const seenStreamEventIds = new Set()

    const handleStreamLine = (line) => {
      if (!line.startsWith('data: ')) return
      try {
        const data = JSON.parse(line.slice(6))
        const eventId = String(data.event_id || data.eventId || '')
        if (eventId && seenStreamEventIds.has(eventId)) return
        if (eventId) seenStreamEventIds.add(eventId)
        if (data.type === 'status') {
          applyMainAgentProgressCheckpoint(data)
          // 更新思考状态
          thinkingMsg.content = sanitizeGroupVisibleText(data.text, '我正在整理当前进展。', 600)
          if (String(data.text || '').includes('分派') || String(data.text || '').includes('等待')) {
            waitingCrossReply.value = true
          }
          scrollToBottom()
        } else if (data.type === 'test_agent_execution_plan_ready') {
          applyTestAgentExecutionPlanReady(data)
          thinkingMsg.content = sanitizeGroupVisibleText(data.detail || 'TestAgent 复核计划已生成。', 'TestAgent 复核计划已整理。', 600)
          waitingCrossReply.value = true
          scrollToBottom()
        } else if (data.type === 'test_agent_review_ready') {
          const result = applyTestAgentReviewReady(data)
          const attached = result === true || result?.mode === 'attached'
          const rejected = result === false || result?.mode === 'rejected'
          const payload = getTestAgentReviewPayload(data)
          const headline = payload?.summary?.headline || data.detail || 'TestAgent 独立复核结论已整理。'
          thinkingMsg.content = sanitizeGroupVisibleText(
            rejected
              ? `${headline}（未绑定到现有任务卡）`
              : headline,
            'TestAgent 独立复核结论已整理。',
            600,
          )
          if (attached) waitingCrossReply.value = true
          scrollToBottom()
        } else if (data.type === 'task_created') {
          activeGroupTaskId.value = data.task?.id || activeGroupTaskId.value
          applyMainAgentProgressCheckpoint(data)
          const taskMessage = {
            id: data.messageId,
            role: 'assistant',
            agent: data.agent || 'coordinator',
            type: 'project_task_intake',
            content: data.text || '我已接管项目任务',
            timestamp: new Date().toISOString(),
            task_id: data.task?.id,
            task: data.task || null,
            queue: data.queue || null,
            intakeSummary: data.intakeSummary || data.intake_summary || null,
            intake_summary: data.intake_summary || data.intakeSummary || null,
            workflow: data.workflow || null,
            planMode: data.planMode || data.plan_mode || null,
            plan_mode: data.plan_mode || data.planMode || null,
            taskCard: data.taskCard || data.task_card || null,
            task_card: data.task_card || data.taskCard || null,
            taskRuntime: data.taskRuntime || data.task_runtime || null,
            task_runtime: data.task_runtime || data.taskRuntime || null,
            mainAgentDecision: data.mainAgentDecision || data.main_agent_decision || null,
            main_agent_decision: data.main_agent_decision || data.mainAgentDecision || null
          }
          mergeIncomingMessage(taskMessage)
          waitingCrossReply.value = true
          toast.success('项目任务已创建：' + (data.task?.id || ''))
          scrollToBottom()
        } else if (data.type === 'task_updated') {
          const taskId = data.taskId || data.task_id || data.task?.id || ''
          activeGroupTaskId.value = taskId || activeGroupTaskId.value
          const taskMessageIndex = messages.value.findIndex(item => getMessageTaskId(item) === taskId && getTaskCard(item))
          if (taskMessageIndex >= 0) {
            const current = messages.value[taskMessageIndex]
            messages.value[taskMessageIndex] = {
              ...current,
              task: data.task || current.task,
              workflow: {
                ...(current.workflow || {}),
                phase: data.task?.collaboration_state?.phase || current.workflow?.phase || 'reworking',
                label: '补充信息已收到',
              },
            }
          }
          thinkingMsg.content = sanitizeGroupVisibleText(data.text || '补充信息已收到，正在沿用原任务继续处理。', '补充信息已收到，正在沿用原任务继续处理。', 600)
          waitingCrossReply.value = true
          scrollToBottom()
        } else if (data.type === 'main_agent_decision') {
          if (attachMainAgentDecision(data.decision)) {
            scrollToBottom()
          }
        } else if (data.type === 'assignment_status') {
          if (applyAssignmentStatus(data)) {
            scrollToBottom()
          }
        } else if (data.type === 'native_session') {
          applyTransientTaskRuntime(data.taskId, (runtime) => {
            const sessions = runtime.sessions || []
            const index = sessions.findIndex(item => item.project === data.session?.project && item.agentType === data.session?.agentType)
            const session = { ...data.session, status: 'open', native: data.session?.mode === 'native', degraded: data.session?.mode !== 'native' }
            if (index >= 0) sessions[index] = { ...sessions[index], ...session }
            else sessions.push(session)
            return { ...runtime, status: 'in_progress', sessions, statusText: `${data.agent} ${data.session?.resumed ? '恢复原生会话' : '创建原生会话'}` }
          })
          scrollToBottom()
        } else if (data.type === 'runtime_fallback') {
          const fallbackText = sanitizeGroupVisibleText(data.text || '执行通道正在切换，我会保留当前任务进度；排障信息已放入技术详情。', '执行通道正在切换，我会保留当前任务进度；排障信息已放入技术详情。', 600)
          applyTransientTaskRuntime(data.taskId, (runtime) => {
            const agents = runtime.agents || []
            const index = agents.findIndex(item => item.project === data.agent)
            const patch = { project: data.agent, state: 'spawning', runtimeFallbacks: Number(agents[index]?.runtimeFallbacks || 0) + 1, runtime: data.toRuntime }
            if (index >= 0) agents[index] = { ...agents[index], ...patch }
            else agents.push(patch)
            return { ...runtime, status: 'in_progress', agents, statusText: fallbackText }
          })
          appendAgentWorkEvent(data.agent, { id: `fallback-${Date.now()}`, time: new Date().toISOString(), kind: 'warning', text: fallbackText })
          scrollToBottom()
        } else if (data.type === 'conflict_plan') {
          messages.value.push({
            id: `conflict-${Date.now()}`,
            role: 'assistant',
            agent: 'system',
            type: 'conflict_plan',
            content: data.text,
            conflictPlan: data.conflictPlan,
            task_id: data.taskId,
            timestamp: new Date().toISOString()
          })
          waitingCrossReply.value = true
          scrollToBottom()
        } else if (data.type === 'agent_work_event') {
          appendAgentWorkEvent(data.agent, data.event)
          waitingCrossReply.value = true
          scrollToBottom()
        } else if (data.type === 'agent_qa') {
          appendAgentQaMessage(data)
          waitingCrossReply.value = true
          scrollToBottom()
        } else if (data.type === 'chunk' && data.agent) {
          // 流式 chunk：为每个 Agent 创建独立的流式消息
          const agentKey = data.agent
          if (!agentStreamMsgs[agentKey]) {
            const streamMsg = {
              role: 'assistant',
              agent: agentKey,
              content: '',
              streaming: true,
              workEvents: [],
              timestamp: new Date().toISOString()
            }
            agentStreamMsgs[agentKey] = streamMsg
            messages.value.push(streamMsg)
          }
          const chunkText = String(data.text || '')
          const nextRaw = `${agentStreamRawBuffers[agentKey] || ''}${chunkText}`
          agentStreamRawBuffers[agentKey] = nextRaw
          if (agentStreamHiddenBuffers[agentKey] || GROUP_VISIBLE_INTERNAL_TEXT_PATTERN.test(nextRaw)) {
            agentStreamHiddenBuffers[agentKey] = true
            agentStreamMsgs[agentKey].content = sanitizeGroupVisibleText(nextRaw, '执行成员已提交技术执行信息，我正在整理用户可读结论。', 1200)
          } else {
            agentStreamMsgs[agentKey].content += sanitizeGroupVisibleText(chunkText)
          }
          if (chunkText.includes('@')) {
            hasMention = true
            waitingCrossReply.value = true
          }
          scrollToBottom()
        } else if (data.type === 'agent_done') {
          // 某个 Agent 完成：用最终完整内容替换流式消息
          const agentKey = data.agent
          const streamMsg = agentStreamMsgs[agentKey]
          const finalText = sanitizeGroupVisibleText(data.text || agentStreamRawBuffers[agentKey], '执行成员已提交结果说明，我正在汇总验收。', 3000)
          if (streamMsg) {
            if (data.messageId) streamMsg.id = data.messageId
            streamMsg.content = finalText
            streamMsg.streaming = false
            if (Array.isArray(data.assignments)) streamMsg.assignments = data.assignments
            streamMsg.executionOrder = data.executionOrder || streamMsg.executionOrder || ''
            streamMsg.runtime = data.runtime || streamMsg.runtime || ''
            streamMsg.dispatchPolicy = data.dispatchPolicy || streamMsg.dispatchPolicy || null
            streamMsg.coordinationPlan = data.coordinationPlan || streamMsg.coordinationPlan || null
            streamMsg.workflow = data.workflow || streamMsg.workflow
            streamMsg.mainAgentDecision = data.mainAgentDecision || data.main_agent_decision || streamMsg.mainAgentDecision || streamMsg.main_agent_decision
            streamMsg.main_agent_decision = data.main_agent_decision || data.mainAgentDecision || streamMsg.main_agent_decision || streamMsg.mainAgentDecision
            streamMsg.clarificationSummary = data.clarificationSummary || data.clarification_summary || streamMsg.clarificationSummary || streamMsg.clarification_summary
            streamMsg.clarification_summary = data.clarification_summary || data.clarificationSummary || streamMsg.clarification_summary || streamMsg.clarificationSummary
            streamMsg.clarificationContext = data.clarificationContext || data.clarification_context || streamMsg.clarificationContext || streamMsg.clarification_context
            streamMsg.clarification_context = data.clarification_context || data.clarificationContext || streamMsg.clarification_context || streamMsg.clarificationContext
            streamMsg.workEvents = data.workEvents || streamMsg.workEvents
            if (data.fileChanges && data.fileChanges.count > 0) {
              streamMsg.fileChanges = data.fileChanges
            }
          } else {
            if ((finalText && finalText.trim()) || (data.fileChanges && data.fileChanges.count > 0)) {
              messages.value.push({
                id: data.messageId,
                role: 'assistant',
                agent: data.agent,
                content: finalText,
                timestamp: new Date().toISOString(),
                assignments: data.assignments || null,
                executionOrder: data.executionOrder || '',
                runtime: data.runtime || '',
                dispatchPolicy: data.dispatchPolicy || null,
                coordinationPlan: data.coordinationPlan || null,
                workflow: data.workflow || null,
                mainAgentDecision: data.mainAgentDecision || data.main_agent_decision || null,
                main_agent_decision: data.main_agent_decision || data.mainAgentDecision || null,
                clarificationSummary: data.clarificationSummary || data.clarification_summary || null,
                clarification_summary: data.clarification_summary || data.clarificationSummary || null,
                clarificationContext: data.clarificationContext || data.clarification_context || null,
                clarification_context: data.clarification_context || data.clarificationContext || null,
                fileChanges: data.fileChanges || null,
                workEvents: data.workEvents || []
              })
            }
          }
          delete agentStreamRawBuffers[agentKey]
          delete agentStreamHiddenBuffers[agentKey]
          if (data.clarificationContext || data.clarification_context) {
            const clarificationMessage = (data.messageId ? messages.value.find(item => item.id === data.messageId) : null)
              || streamMsg
              || messages.value[messages.value.length - 1]
            beginGroupClarificationInput(clarificationMessage)
          }
          if (String(data.text || '').includes('@')) {
            hasMention = true
            waitingCrossReply.value = true
          }
          scrollToBottom()
        } else if (data.type === 'chunk') {
          // 单 Agent 模式的 chunk
          if (!agentMsgAdded) {
            messages.value.push(agentMsg)
            agentMsgAdded = true
          }
          const chunkText = String(data.text || '')
          singleStreamRawBuffer += chunkText
          if (singleStreamHiddenBuffer || GROUP_VISIBLE_INTERNAL_TEXT_PATTERN.test(singleStreamRawBuffer)) {
            singleStreamHiddenBuffer = true
            agentMsg.content = sanitizeGroupVisibleText(singleStreamRawBuffer, '执行成员已提交技术执行信息，我正在整理用户可读结论。', 1200)
          } else {
            agentMsg.content += sanitizeGroupVisibleText(chunkText)
          }
          if (chunkText.includes('@')) hasMention = true
          scrollToBottom()
        } else if (data.type === 'done') {
          isStreaming.value = false
          if (currentGroup.value?.id && currentGroupSessionId.value) {
            notifySessionContextUsage('group', `${currentGroup.value.id}::${currentGroupSessionId.value}`, { reason: 'provider_usage_updated' })
          }
          const thinkingIdx = messages.value.indexOf(thinkingMsg)
          if (thinkingIdx !== -1) messages.value.splice(thinkingIdx, 1)
          // 附加文件变更到当前 Agent 消息
          if (data.messageId) {
            agentMsg.id = data.messageId
          }
          if (data.fileChanges && data.fileChanges.count > 0) {
            agentMsg.fileChanges = data.fileChanges
          }
        } else if (data.type === 'error') {
          messages.value.push({
            role: 'assistant',
            agent: 'system',
            content: buildGroupStreamErrorText(data.text),
            timestamp: new Date().toISOString()
          })
          streamFailed = true
          isStreaming.value = false
        }
      } catch {}
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        sseBuffer += decoder.decode(value, { stream: true })
        const lines = sseBuffer.split('\n')
        sseBuffer = lines.pop() || ''
        for (const line of lines) {
          handleStreamLine(line.trimEnd())
        }
      }
      sseBuffer += decoder.decode()
      if (sseBuffer.trim()) {
        for (const line of sseBuffer.split('\n')) {
          handleStreamLine(line.trimEnd())
        }
      }
    } catch (error) {
      streamFailed = true
      const stopped = error?.name === 'AbortError'
      streamStopped = stopped
      if (!stopped) {
        newMessage.value = msg
        messageFiles.value = filesToSend
        toast.error('连接中断，重新发送会继续同一次请求')
      }
    }

    isStreaming.value = false
    if (groupStreamController.value === controller) groupStreamController.value = null
    const thinkingIdx = messages.value.indexOf(thinkingMsg)
    if (thinkingIdx !== -1) messages.value.splice(thinkingIdx, 1)

    // 既然所有协作已经在同一个 SSE 请求中同步完成，重置等待标志，并主动拉取一次做最终同步
    waitingCrossReply.value = false
    if (currentGroup.value) {
      await pullNewMessages()
    }
    // 更新轮询基准计数
    if (currentGroup.value) {
      try {
        const res = await fetch(`/api/groups/messages?id=${currentGroup.value.id}&limit=100&session_id=${encodeURIComponent(currentGroupSessionId.value)}`)
        const data = await res.json()
        mainAgentStatus.value = data.mainAgentStatus || mainAgentStatus.value
        groupAgentQa.value = data.agentQa || groupAgentQa.value
        lastGroupMsgCount.value = (data.messages || []).length
      } catch {}
    }
    if (!streamFailed && taskSupplementTarget
      && pendingGroupTaskInput.value?.taskId === taskSupplementTarget.taskId
      && pendingGroupTaskInput.value?.groupId === taskSupplementTarget.groupId) {
      pendingGroupTaskInput.value = null
    }
    if (!streamFailed && clarificationResponseTarget
      && pendingGroupClarificationInput.value?.requestId === clarificationResponseTarget.requestId
      && pendingGroupClarificationInput.value?.groupId === clarificationResponseTarget.groupId) {
      pendingGroupClarificationInput.value = null
    }
    if (!streamFailed && pendingGroupSendRetry.value?.clientMessageId === clientMessageId) {
      pendingGroupSendRetry.value = null
      if (directMemoryCommand && pendingDirectMemoryCommand.value?.action === directMemoryCommand.action
        && pendingDirectMemoryCommand.value?.content === directMemoryCommand.content) {
        pendingDirectMemoryCommand.value = null
      }
    } else if (streamFailed && !streamStopped && !newMessage.value.trim()) {
      newMessage.value = msg
      messageFiles.value = filesToSend
    }
    if (!queuedTurn) window.setTimeout(() => drainGroupTurnQueue().catch(() => {}), 0)
    return { success: !streamFailed, error: streamFailed ? '群聊消息没有完成' : '', taskId: activeGroupTaskId.value }
  }

  return {
    activeAgentStreamMsgs,
    appendAgentWorkEvent,
    appendAgentQaMessage,
    applyMainAgentProgressCheckpoint,
    isStreaming,
    thinkingMessages,
    pendingGroupSendRetry,
    groupStreamController,
    activeGroupTaskId,
    stoppingGroupTurn,
    groupTurnConversationId,
    groupTurnControl,
    stopGroupCurrentWork,
    drainGroupTurnQueue,
    submitGroupMessageWhileBusy,
    sendMessage,
  }
}
