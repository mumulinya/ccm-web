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
  isGroupModelRecoveryContinuePhrase,
  findUnrecoveredGroupModelFailure,
  groupModelRecoveryAnchorId,
} from './groupChatHelpers.js'

export function useGroupChatStream({
  messages,
  currentGroup,
  currentGroupSessionId,
  ensureGroupSession,
  refreshWritableGroupSession,
  mainAgentStatus,
  groupAgentQa,
  lastGroupMsgCount,
  newMessage,
  messageFiles,
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

  const applyExecutionIdentity = (message, data = {}) => {
    if (!message || !data) return message
    const responseId = data.responseMessageId || data.response_message_id || data.messageId || data.message_id || ''
    const turnId = data.executionTurnId || data.execution_turn_id || data.turnId || data.turn_id || ''
    const attempt = data.executionAttempt ?? data.execution_attempt ?? data.attempt
    const generation = data.generation
    const anchor = data.executionAnchorMessageId || data.execution_anchor_message_id || data.anchorMessageId || data.anchor_message_id || ''
    if (responseId) {
      message.responseMessageId = responseId
      message.response_message_id = responseId
    }
    if (turnId) {
      message.executionTurnId = turnId
      message.execution_turn_id = turnId
      message.turnId = turnId
      message.turn_id = turnId
    }
    if (attempt !== undefined && attempt !== null && Number.isFinite(Number(attempt))) {
      message.executionAttempt = Number(attempt)
      message.execution_attempt = Number(attempt)
      message.attempt = Number(attempt)
    }
    if (generation !== undefined && generation !== null && Number.isFinite(Number(generation))) message.generation = Number(generation)
    if (anchor) {
      message.executionAnchorMessageId = anchor
      message.execution_anchor_message_id = anchor
    }
    return message
  }

  const appendAgentWorkEvent = (agent, event) => {
    if (!agent || !event) return
    let streamMsg = activeAgentStreamMsgs[agent]
    if (!streamMsg) {
      streamMsg = {
        role: 'assistant',
        agent,
        content: '',
        streaming: true,
        __groupTransient: true,
        workEvents: [],
        timestamp: new Date().toISOString()
      }
      activeAgentStreamMsgs[agent] = streamMsg
      rememberLiveGroupStreamMessage(streamMsg)
    }
    if (!Array.isArray(streamMsg.workEvents)) streamMsg.workEvents = []
    const key = event.id || `${event.kind}:${event.time}:${event.text}`
    if (!streamMsg.workEvents.some(item => (item.id || `${item.kind}:${item.time}:${item.text}`) === key)) {
      streamMsg.workEvents.push(event)
      if (streamMsg.workEvents.length > 80) streamMsg.workEvents.splice(0, streamMsg.workEvents.length - 80)
    }
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
    if (groupStreamSessionId.value && !isViewingGroupStreamSession()) {
      rememberLiveGroupStreamMessage(msg)
      return
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
    const nextStatus = {
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
    liveGroupStreamStatus = nextStatus
    if (!groupStreamActive.value || isViewingGroupStreamSession()) mainAgentStatus.value = nextStatus
    return true
  }

  const groupStreamActive = ref(false)
  const groupStreamGroupId = ref('')
  const groupStreamSessionId = ref('')
  const liveGroupStreamMessages = []
  let liveGroupStreamStatus = null
  const isViewingGroupStreamSession = (groupId = currentGroup.value?.id, sessionId = currentGroupSessionId.value) => (
    !!groupStreamGroupId.value
    && !!groupStreamSessionId.value
    && String(groupId || '') === String(groupStreamGroupId.value)
    && String(sessionId || '') === String(groupStreamSessionId.value)
  )
  const isStreaming = computed(() => groupStreamActive.value && isViewingGroupStreamSession())
  const rememberLiveGroupStreamMessage = (msg) => {
    if (!msg) return
    if (groupStreamSessionId.value && !liveGroupStreamMessages.includes(msg)) liveGroupStreamMessages.push(msg)
    if (groupStreamSessionId.value && !isViewingGroupStreamSession()) return
    if (messages.value.includes(msg)) return
    const id = String(msg.id || '')
    const idx = id ? messages.value.findIndex(item => String(item.id || '') === id) : -1
    if (idx >= 0) messages.value.splice(idx, 1, msg)
    else messages.value.push(msg)
  }
  const restoreLiveGroupStreamIfCurrent = () => {
    if (!isViewingGroupStreamSession() || !liveGroupStreamMessages.length) return false
    if (liveGroupStreamStatus) mainAgentStatus.value = liveGroupStreamStatus
    for (const msg of liveGroupStreamMessages) {
      if (messages.value.includes(msg)) continue
      const id = String(msg.id || '')
      const idx = id ? messages.value.findIndex(item => String(item.id || '') === id) : -1
      if (idx >= 0) messages.value.splice(idx, 1, msg)
      else messages.value.push(msg)
    }
    return true
  }
  const beginLiveGroupStream = (groupId, sessionId, seedMessages = []) => {
    liveGroupStreamMessages.length = 0
    liveGroupStreamStatus = null
    groupStreamGroupId.value = String(groupId || '')
    groupStreamSessionId.value = String(sessionId || '')
    groupStreamActive.value = true
    for (const msg of seedMessages) rememberLiveGroupStreamMessage(msg)
  }
  const finishLiveGroupStream = ({ keepTranscript = false } = {}) => {
    groupStreamActive.value = false
    if (keepTranscript) return
    liveGroupStreamMessages.length = 0
    liveGroupStreamStatus = null
    groupStreamGroupId.value = ''
    groupStreamSessionId.value = ''
  }
  const scrollIfViewingStream = () => {
    if (isViewingGroupStreamSession()) scrollToBottom()
  }
  const thinkingMessages = ref([])
  const pendingGroupSendRetry = ref(null)
  const groupStreamController = ref(null)
  const activeGroupTaskId = ref('')
  const stoppingGroupTurn = ref(false)
  const groupConversationTask = computed(() => [...messages.value].reverse().map(message => getTaskCard(message)).find(card => {
    if (!card) return false
    return !['done', 'completed', 'success', 'accepted', 'failed', 'cancelled', 'canceled', 'archived'].includes(String(card.status || '').toLowerCase())
  }) || null)
  const groupCurrentTaskId = computed(() => activeGroupTaskId.value || groupConversationTask.value?.task_id || groupConversationTask.value?.id || mainAgentStatus.value?.task_id || '')
  const groupTurnBusy = computed(() => isStreaming.value || !!groupConversationTask.value || ['planning', 'dispatching', 'executing', 'reviewing', 'reworking', 'waiting_user', 'blocked', 'interrupted'].includes(String(mainAgentStatus.value?.phase || '').toLowerCase()))
  const groupTurnConversationId = computed(() => currentGroup.value?.id && currentGroupSessionId.value
    ? `${currentGroup.value.id}:${currentGroupSessionId.value}`
    : '')
  const groupTurnControl = useConversationTurnControl({
    scope: 'group',
    conversationId: groupTurnConversationId,
    busy: groupTurnBusy,
  })

  const stopGroupCurrentWork = async ({ preserveTask = false } = {}) => {
    if ((!groupStreamActive.value && !isStreaming.value && !(preserveTask && groupCurrentTaskId.value)) || stoppingGroupTurn.value) return
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
            task_id: groupCurrentTaskId.value,
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
    () => [groupTurnConversationId.value, groupTurnBusy.value, groupTurnControl.turns.value.filter(turn => turn.status === 'queued').length],
    ([conversationId, busy, queued]) => {
      if (conversationId && !busy && queued) window.setTimeout(() => drainGroupTurnQueue().catch(() => {}), 0)
    },
    { flush: 'post' },
  )

  const submitGroupMessageWhileBusy = async () => {
    const message = newMessage.value.trim()
    if (!message && !messageFiles.value.length) return
    const requestedMode = groupTurnControl.mode.value
    const continuationTaskId = requestedMode === 'steer' ? activeGroupTaskId.value : ''
    await groupTurnControl.enqueue({
      message,
      attachments: [...messageFiles.value],
      mode: requestedMode,
      activeRunId: activeGroupTaskId.value,
      metadata: {
        group_id: currentGroup.value.id,
        group_session_id: currentGroupSessionId.value,
        message_mode: messageMode.value,
        // Ordinary queued requirements become independent turns after the
        // current task releases the conversation slot. Only an explicit steer
        // may bind to the running task.
        continuation_task_id: continuationTaskId,
        requested_mode: requestedMode,
      },
    })
    newMessage.value = ''
    messageFiles.value = []
    toast.success(requestedMode === 'steer' ? '已接收引导，正在停止旧执行并沿用当前任务继续' : '已加入队列，当前协作结束后会自动发送')
    if (requestedMode === 'steer') await stopGroupCurrentWork({ preserveTask: true })
    window.setTimeout(() => drainGroupTurnQueue().catch(() => {}), 0)
  }

  const guideGroupQueuedTurn = async (turn) => {
    if (!turn?.id) return
    const guidedTurn = await groupTurnControl.guide(turn)
    toast.success('这条消息已移到队首，将作为当前任务的补充要求')
    const currentTaskId = groupCurrentTaskId.value
    await stopGroupCurrentWork({ preserveTask: true })
    await groupTurnControl.apply(guidedTurn, async claimed => {
      const result = await sendMessage({ queueTurn: claimed })
      if (result?.success === false) throw new Error(result.error || '调整方向没有接入当前任务')
      return { task_id: result?.taskId || currentTaskId, continuation_task_id: currentTaskId }
    })
    return guidedTurn
  }

  const resolveGroupQueuedRoute = async (turn, choice) => {
    try {
      const resolved = await groupTurnControl.resolveRoute(turn, choice)
      if (!resolved) return
      toast.success(choice === 'continue_original' ? '正在继续原任务' : choice === 'answer_only' ? '正在回答这条消息' : '正在作为新任务处理')
      await drainGroupTurnQueue()
    } catch (error) {
      toast.error(error?.message || '消息处理方式提交失败，请重试')
      await groupTurnControl.refresh().catch(() => {})
    }
  }

  const sendMessage = async (options = {}) => {
    const queuedTurn = options?.queueTurn || null
    const resumeInterruption = options?.resumeInterruption || null
    if (groupStreamActive.value && !queuedTurn) {
      if (isViewingGroupStreamSession()) return submitGroupMessageWhileBusy()
      toast.info('另一个会话还在回复，先回到那个会话查看，或等它结束后再发')
      return
    }
    if (groupTurnBusy.value && !queuedTurn) return submitGroupMessageWhileBusy()
    if ((!queuedTurn && !newMessage.value.trim() && messageFiles.value.length === 0) || !currentGroup.value) return
    if (!currentGroupSessionId.value) {
      try {
        await ensureGroupSession?.()
      } catch (error) {
        toast.error(error?.message || '创建群聊会话失败')
        return { success: false, error: error?.message || '创建群聊会话失败' }
      }
    }
    if (!currentGroupSessionId.value) {
      toast.error('当前群聊会话尚未创建')
      return { success: false, error: '当前群聊会话尚未创建' }
    }
    const groupAtSend = String(queuedTurn?.metadata?.group_id || currentGroup.value.id || '')
    const sessionAtSend = String(queuedTurn?.metadata?.group_session_id || currentGroupSessionId.value || '')
    const msg = queuedTurn ? String(queuedTurn.message || '').trim() : newMessage.value.trim()
    const filesToSend = queuedTurn ? [...(queuedTurn.files || [])] : [...messageFiles.value]
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
    const typedResume = !resumeInterruption
      && !queuedTurn
      && !directedInputFields
      && isGroupModelRecoveryContinuePhrase(msg)
      ? findUnrecoveredGroupModelFailure(messages.value)
      : null
    const recoveredFailure = resumeInterruption || typedResume
    if (recoveredFailure && recoveredFailure.recovery?.state !== 'retrying') {
      recoveredFailure.recovery = {
        ...(recoveredFailure.recovery || {}),
        state: 'retrying',
        retryingAt: new Date().toISOString(),
      }
    }
    if (recoveredFailure) recoveredFailure.workEvents = []
    const recoveryAnchorId = recoveredFailure ? groupModelRecoveryAnchorId(recoveredFailure) : ''
    const retrySignature = groupSendRetrySignature({
      groupId: groupAtSend,
      target: 'coordinator',
      mode: directedInputFields?.message_mode || queuedTurn?.metadata?.message_mode || messageMode.value,
      message: msg,
      files: filesToSend,
      directed: directedInputFields,
    })
    const clientMessageId = queuedTurn?.metadata?.original_message_id
      || (pendingGroupSendRetry.value?.signature === retrySignature
        ? pendingGroupSendRetry.value.clientMessageId
        : createLocalMessageId())
    pendingGroupSendRetry.value = { signature: retrySignature, clientMessageId }
    newMessage.value = ''
    messageFiles.value = []

    const attachmentText = filesToSend.length
      ? `

  [附件]
  ${filesToSend.map(f => `- ${f.name}（${formatFileSize(f.size)}）`).join('\n')}`
      : ''
    const userMsg = {
      id: clientMessageId,
      role: 'user',
      target: 'coordinator',
      message_mode: directedInputFields?.message_mode || queuedTurn?.metadata?.message_mode || messageMode.value,
      content: `${msg || '请处理附件'}${attachmentText}`,
      timestamp: new Date().toISOString(),
      ...(taskSupplementTarget ? { task_id: taskSupplementTarget.taskId } : {}),
      ...(clarificationResponseTarget ? {
        clarification_request_id: clarificationResponseTarget.requestId,
        clarification_response_to: clarificationResponseTarget.messageId,
      } : {})
    }

    // Create the authoritative assistant envelope immediately. It renders as
    // “正在思考…” until the first safe chunk arrives, then the same row streams
    // the coordinator reply instead of replacing a separate thinking message.
    const agentMsg = {
      id: `group-reply:${clientMessageId}`,
      role: 'assistant',
      agent: 'coordinator',
      content: '',
      processingDetail: recoveredFailure ? '正在接着刚才的检查继续' : '正在理解你的问题并检查群聊上下文',
      // Resume reuses the interrupted turn's execution anchor so the query
      // process and plan move down onto this new envelope, matching Cursor.
      execution_anchor_message_id: recoveryAnchorId || clientMessageId,
      streaming: true,
      __groupTransient: true,
      timestamp: new Date().toISOString(),
      ...(recoveredFailure ? {
        assignments: recoveredFailure.assignments || null,
        dispatchPolicy: recoveredFailure.dispatchPolicy || null,
        coordinationPlan: recoveredFailure.coordinationPlan || null,
        presentedPlan: recoveredFailure.presentedPlan || recoveredFailure.presented_plan || null,
        presented_plan: recoveredFailure.presented_plan || recoveredFailure.presentedPlan || null,
        mainAgentDecision: recoveredFailure.mainAgentDecision || recoveredFailure.main_agent_decision || null,
        main_agent_decision: recoveredFailure.main_agent_decision || recoveredFailure.mainAgentDecision || null,
        workEvents: Array.isArray(recoveredFailure.workEvents) ? [...recoveredFailure.workEvents] : [],
      } : {}),
    }
    beginLiveGroupStream(groupAtSend, sessionAtSend, [userMsg, agentMsg])
    thinkingMessages.value = []
    scrollIfViewingStream()

    // 跟踪每个 Agent 的流式消息
    activeAgentStreamMsgs = {}
    const agentStreamMsgs = activeAgentStreamMsgs
    const agentStreamRawBuffers = {}
    const agentStreamHiddenBuffers = {}
    let hasMention = false
    let agentMsgAdded = true
    let primaryStreamAgentKey = ''
    let singleStreamRawBuffer = ''
    let singleStreamHiddenBuffer = false

    let payload
    if (filesToSend.length > 0) {
      payload = new FormData()
      payload.append('group_id', groupAtSend)
      payload.append('group_session_id', sessionAtSend)
      payload.append('message', msg)
      payload.append('client_message_id', clientMessageId)
      payload.append('message_mode', directedInputFields?.message_mode || queuedTurn?.metadata?.message_mode || messageMode.value)
      if (queuedTurn?.id) payload.append('conversation_turn_id', queuedTurn.id)
      if (queuedTurn?.metadata?.resolved_route) payload.append('resolved_route', queuedTurn.metadata.resolved_route)
      if (queuedTurn?.metadata?.resolved_candidate_task_id) payload.append('resolved_candidate_task_id', queuedTurn.metadata.resolved_candidate_task_id)
      if (resumeInterruption?.id) payload.append('resume_interruption_message_id', String(resumeInterruption.id))
      else if (recoveredFailure?.id) payload.append('resume_interruption_message_id', String(recoveredFailure.id))
      if (directedInputFields) {
        Object.entries(directedInputFields)
          .filter(([key]) => key !== 'message_mode')
          .forEach(([key, value]) => payload.append(key, String(value)))
      }
      filesToSend.forEach(file => payload.append('files', file))
    } else {
      payload = {
        group_id: groupAtSend,
        group_session_id: sessionAtSend,
        message: msg,
        client_message_id: clientMessageId,
        message_mode: queuedTurn?.metadata?.message_mode || messageMode.value,
        conversation_turn_id: queuedTurn?.id || '',
        resolved_route: queuedTurn?.metadata?.resolved_route || '',
        resolved_candidate_task_id: queuedTurn?.metadata?.resolved_candidate_task_id || '',
        ...(resumeInterruption?.id ? { resume_interruption_message_id: String(resumeInterruption.id) } : {}),
        ...(recoveredFailure?.id && !resumeInterruption?.id ? { resume_interruption_message_id: String(recoveredFailure.id) } : {}),
        ...(directedInputFields || {})
      }
    }

    let res
    const controller = new AbortController()
    groupStreamController.value = controller
    const sendRequest = async () => {
      const res = await groupsApi.send(payload, { signal: controller.signal })
      // `groupsApi.send` returns raw SSE responses, so an HTTP error must be
      // decoded before it reaches the reader.
      if (!res.ok) {
      const responseType = String(res.headers.get('content-type') || '').toLowerCase()
      let body = null
      if (responseType.includes('application/json')) body = await res.json().catch(() => null)
      else {
        const text = await res.text().catch(() => '')
        try { body = JSON.parse(text) } catch { body = text ? { error: text } : null }
      }
      const error = new Error(String(body?.error || body?.message || `发送失败（HTTP ${res.status}）`).trim())
      error.code = body?.code || ''
      error.status = res.status
      error.groupSessionUnavailable = error.code === 'GROUP_SESSION_UNAVAILABLE'
      throw error
      }
      return res
    }
    // An exact continuation must never move to another session. Ordinary web
    // conversation may refresh a stale session id and retry exactly once.
    const canRefreshUnavailableSession = !resumeInterruption?.id
      && !recoveredFailure?.id
      && !directedInputFields
      && queuedTurn?.metadata?.requested_mode !== 'steer'
      && !queuedTurn?.metadata?.continuation_task_id
    let requestError = null
    try {
      res = await sendRequest()
    } catch (error) {
      if (error?.groupSessionUnavailable && canRefreshUnavailableSession && isViewingGroupStreamSession(groupAtSend, sessionAtSend)) {
        try {
          const previousSessionId = sessionAtSend
          const refreshedSessionId = String(await refreshWritableGroupSession?.() || '')
          if (!refreshedSessionId || refreshedSessionId === previousSessionId) throw error
          if (payload instanceof FormData) payload.set('group_session_id', refreshedSessionId)
          else payload.group_session_id = refreshedSessionId
          groupStreamSessionId.value = refreshedSessionId
          res = await sendRequest()
          toast.info('原群聊会话已不可用，已切换到当前会话继续发送')
        } catch (retryError) {
          requestError = retryError
        }
      } else {
        requestError = error
      }
      if (requestError) {
        const error = requestError
      const stopped = error?.name === 'AbortError'
      const viewingSendSession = isViewingGroupStreamSession(groupAtSend, sessionAtSend)
      if (!stopped && viewingSendSession) {
        newMessage.value = msg
        messageFiles.value = filesToSend
      }
      const optimisticIdx = messages.value.findIndex(item => item.id === clientMessageId)
      if (optimisticIdx !== -1) messages.value.splice(optimisticIdx, 1)
      const assistantIdx = messages.value.indexOf(agentMsg)
      if (assistantIdx !== -1) messages.value.splice(assistantIdx, 1)
      finishLiveGroupStream()
      if (!stopped) toast.error(error?.message || '消息提交失败，请检查后重试')
      nextTick(focusGroupInput)
      if (groupStreamController.value === controller) groupStreamController.value = null
      return { success: false, error: stopped ? '当前工作已停止' : (error?.message || '消息提交失败') }
      }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let sseBuffer = ''
    let streamFailed = false
    let streamStopped = false
    let routeRequired = false
    const seenStreamEventIds = new Set()

    const handleStreamLine = (line) => {
      if (!line.startsWith('data: ')) return
      try {
        const data = JSON.parse(line.slice(6))
        const eventId = String(data.event_id || data.eventId || '')
        if (eventId && seenStreamEventIds.has(eventId)) return
        if (eventId) seenStreamEventIds.add(eventId)
        restoreLiveGroupStreamIfCurrent()
        if (data.type === 'route_required') {
          routeRequired = true
          agentMsg.streaming = false
          groupTurnControl.refresh().catch(() => {})
        } else if (data.type === 'status') {
          applyMainAgentProgressCheckpoint(data)
          agentMsg.processingDetail = sanitizeGroupVisibleText(data.text, '我正在整理当前进展。', 120)
          if (String(data.text || '').includes('分派') || String(data.text || '').includes('等待')) {
            waitingCrossReply.value = true
          }
          scrollIfViewingStream()
        } else if (data.type === 'test_agent_execution_plan_ready') {
          applyTestAgentExecutionPlanReady(data)
          agentMsg.processingDetail = sanitizeGroupVisibleText(data.detail || 'TestAgent 复核计划已生成。', 'TestAgent 复核计划已整理。', 120)
          waitingCrossReply.value = true
          scrollIfViewingStream()
        } else if (data.type === 'test_agent_review_ready') {
          const result = applyTestAgentReviewReady(data)
          const attached = result === true || result?.mode === 'attached'
          const rejected = result === false || result?.mode === 'rejected'
          const payload = getTestAgentReviewPayload(data)
          const headline = payload?.summary?.headline || data.detail || 'TestAgent 独立复核结论已整理。'
          agentMsg.processingDetail = sanitizeGroupVisibleText(
            rejected
              ? `${headline}（未绑定到现有任务卡）`
              : headline,
            'TestAgent 独立复核结论已整理。',
            120,
          )
          if (attached) waitingCrossReply.value = true
          scrollIfViewingStream()
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
          rememberLiveGroupStreamMessage(taskMessage)
          waitingCrossReply.value = true
          toast.success('项目任务已创建：' + (data.task?.id || ''))
          scrollIfViewingStream()
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
          agentMsg.processingDetail = sanitizeGroupVisibleText(data.text || '补充信息已收到，正在沿用原任务继续处理。', '补充信息已收到，正在沿用原任务继续处理。', 120)
          waitingCrossReply.value = true
          scrollIfViewingStream()
        } else if (data.type === 'main_agent_decision') {
          if (attachMainAgentDecision(data.decision)) {
            scrollIfViewingStream()
          }
        } else if (data.type === 'assignment_status') {
          if (applyAssignmentStatus(data)) {
            scrollIfViewingStream()
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
          scrollIfViewingStream()
        } else if (data.type === 'runtime_fallback') {
          const fallbackText = sanitizeGroupVisibleText(data.text || '执行通道正在切换，我会保留当前任务进度。', '执行通道正在切换，我会保留当前任务进度。', 600)
          applyTransientTaskRuntime(data.taskId, (runtime) => {
            const agents = runtime.agents || []
            const index = agents.findIndex(item => item.project === data.agent)
            const patch = { project: data.agent, state: 'spawning', runtimeFallbacks: Number(agents[index]?.runtimeFallbacks || 0) + 1, runtime: data.toRuntime }
            if (index >= 0) agents[index] = { ...agents[index], ...patch }
            else agents.push(patch)
            return { ...runtime, status: 'in_progress', agents, statusText: fallbackText }
          })
          appendAgentWorkEvent(data.agent, { id: `fallback-${Date.now()}`, time: new Date().toISOString(), kind: 'warning', text: fallbackText })
          scrollIfViewingStream()
        } else if (data.type === 'conflict_plan') {
          rememberLiveGroupStreamMessage({
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
          scrollIfViewingStream()
        } else if (data.type === 'agent_work_event') {
          appendAgentWorkEvent(data.agent, data.event)
          waitingCrossReply.value = true
          scrollIfViewingStream()
        } else if (data.type === 'agent_qa') {
          appendAgentQaMessage(data)
          waitingCrossReply.value = true
          scrollIfViewingStream()
        } else if ((data.type === 'chunk' || data.type === 'response_delta') && data.agent) {
          // 流式 chunk：为每个 Agent 创建独立的流式消息
          const agentKey = data.agent
          if (!agentStreamMsgs[agentKey]) {
            const reusePrimaryEnvelope = !primaryStreamAgentKey && agentMsgAdded
            const streamMsg = reusePrimaryEnvelope ? agentMsg : {
                role: 'assistant',
                agent: agentKey,
                content: '',
                streaming: true,
                __groupTransient: true,
                workEvents: [],
                timestamp: new Date().toISOString()
              }
            if (reusePrimaryEnvelope) {
              primaryStreamAgentKey = agentKey
              streamMsg.agent = agentKey
              streamMsg.processingDetail = ''
            }
            agentStreamMsgs[agentKey] = streamMsg
            if (!reusePrimaryEnvelope) rememberLiveGroupStreamMessage(streamMsg)
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
          scrollIfViewingStream()
        } else if (data.type === 'agent_done') {
          // 某个 Agent 完成：用最终完整内容替换流式消息
          const agentKey = data.agent
          let streamMsg = agentStreamMsgs[agentKey]
          if (!streamMsg && !primaryStreamAgentKey && agentMsgAdded) {
            primaryStreamAgentKey = primaryStreamAgentKey || agentKey
            agentMsg.agent = agentKey
            streamMsg = agentMsg
            agentStreamMsgs[agentKey] = streamMsg
          }
          const finalText = sanitizeGroupVisibleText(data.text || agentStreamRawBuffers[agentKey], '执行成员已提交结果说明，我正在汇总验收。', 3000)
          if (streamMsg) {
            if (data.messageId) streamMsg.id = data.messageId
            applyExecutionIdentity(streamMsg, data)
            streamMsg.content = finalText
            streamMsg.streaming = false
            streamMsg.__groupTransient = false
            streamMsg.transient = false
            streamMsg.optimistic = false
            streamMsg.timestamp = new Date().toISOString()
            if (Array.isArray(data.assignments)) streamMsg.assignments = data.assignments
            streamMsg.executionOrder = data.executionOrder || streamMsg.executionOrder || ''
            streamMsg.runtime = data.runtime || streamMsg.runtime || ''
            streamMsg.providerFailure = data.providerFailure || streamMsg.providerFailure || null
            streamMsg.providerFailureTechnical = data.providerFailureTechnical || streamMsg.providerFailureTechnical || null
            streamMsg.recovery = data.recovery || streamMsg.recovery || null
            streamMsg.execution_anchor_message_id = data.executionAnchorMessageId || data.execution_anchor_message_id || streamMsg.execution_anchor_message_id || ''
            streamMsg.dispatchPolicy = data.dispatchPolicy || streamMsg.dispatchPolicy || null
            streamMsg.coordinationPlan = data.coordinationPlan || streamMsg.coordinationPlan || null
            streamMsg.presentedPlan = data.presentedPlan || data.presented_plan || streamMsg.presentedPlan || streamMsg.presented_plan || null
            streamMsg.presented_plan = streamMsg.presentedPlan
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
              const completedMsg = {
                id: data.messageId,
                role: 'assistant',
                agent: data.agent,
                content: finalText,
                timestamp: new Date().toISOString(),
                __groupTransient: false,
                assignments: data.assignments || null,
                executionOrder: data.executionOrder || '',
                runtime: data.runtime || '',
                providerFailure: data.providerFailure || null,
                providerFailureTechnical: data.providerFailureTechnical || null,
                recovery: data.recovery || null,
                execution_anchor_message_id: data.executionAnchorMessageId || data.execution_anchor_message_id || '',
                dispatchPolicy: data.dispatchPolicy || null,
                coordinationPlan: data.coordinationPlan || null,
                presentedPlan: data.presentedPlan || data.presented_plan || null,
                presented_plan: data.presentedPlan || data.presented_plan || null,
                workflow: data.workflow || null,
                mainAgentDecision: data.mainAgentDecision || data.main_agent_decision || null,
                main_agent_decision: data.main_agent_decision || data.mainAgentDecision || null,
                clarificationSummary: data.clarificationSummary || data.clarification_summary || null,
                clarification_summary: data.clarification_summary || data.clarificationSummary || null,
                clarificationContext: data.clarificationContext || data.clarification_context || null,
                clarification_context: data.clarification_context || data.clarificationContext || null,
                fileChanges: data.fileChanges || null,
                workEvents: data.workEvents || []
              }
              applyExecutionIdentity(completedMsg, data)
              rememberLiveGroupStreamMessage(completedMsg)
            }
          }
          delete agentStreamRawBuffers[agentKey]
          delete agentStreamHiddenBuffers[agentKey]
          if (data.clarificationContext || data.clarification_context) {
            const clarificationMessage = (data.messageId
              ? (messages.value.find(item => item.id === data.messageId) || liveGroupStreamMessages.find(item => item.id === data.messageId))
              : null)
              || streamMsg
              || liveGroupStreamMessages[liveGroupStreamMessages.length - 1]
              || messages.value[messages.value.length - 1]
            if (isViewingGroupStreamSession()) beginGroupClarificationInput(clarificationMessage)
          }
          if (String(data.text || '').includes('@')) {
            hasMention = true
            waitingCrossReply.value = true
          }
          scrollIfViewingStream()
        } else if (data.type === 'chunk' || data.type === 'response_delta') {
          // 单 Agent 模式的 chunk
          if (!agentMsgAdded) {
            rememberLiveGroupStreamMessage(agentMsg)
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
          scrollIfViewingStream()
        } else if (data.type === 'done') {
          groupStreamActive.value = false
          agentMsg.streaming = false
          notifySessionContextUsage('group', `${groupAtSend}::${sessionAtSend}`, { reason: 'provider_usage_updated' })
          // 附加文件变更到当前 Agent 消息
          if (data.messageId) {
            agentMsg.id = data.messageId
          }
          applyExecutionIdentity(agentMsg, data)
          agentMsg.__groupTransient = false
          agentMsg.transient = false
          agentMsg.optimistic = false
          if (data.fileChanges && data.fileChanges.count > 0) {
            agentMsg.fileChanges = data.fileChanges
          }
        } else if (data.type === 'error') {
          agentMsg.agent = 'system'
          agentMsg.content = buildGroupStreamErrorText(data.text)
          agentMsg.streaming = false
          streamFailed = true
          groupStreamActive.value = false
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
      if (!stopped && isViewingGroupStreamSession(groupAtSend, sessionAtSend)) {
        newMessage.value = msg
        messageFiles.value = filesToSend
        toast.error('连接中断，重新发送会继续同一次请求')
      }
    }

    const viewingSendSession = isViewingGroupStreamSession(groupAtSend, sessionAtSend)
    finishLiveGroupStream({ keepTranscript: !viewingSendSession })
    agentMsg.streaming = false
    if (routeRequired) {
      const assistantIndex = messages.value.indexOf(agentMsg)
      if (assistantIndex >= 0) messages.value.splice(assistantIndex, 1)
    }
    if (groupStreamController.value === controller) groupStreamController.value = null

    // 既然所有协作已经在同一个 SSE 请求中同步完成，重置等待标志，并主动拉取一次做最终同步
    waitingCrossReply.value = false
    if (viewingSendSession && currentGroup.value) {
      await pullNewMessages()
      try {
        const res = await fetch(`/api/groups/messages?id=${encodeURIComponent(groupAtSend)}&limit=100&session_id=${encodeURIComponent(sessionAtSend)}`)
        const data = await res.json()
        if (String(currentGroup.value?.id || '') === groupAtSend && String(currentGroupSessionId.value || '') === sessionAtSend) {
          mainAgentStatus.value = data.mainAgentStatus || mainAgentStatus.value
          groupAgentQa.value = data.agentQa || groupAgentQa.value
          lastGroupMsgCount.value = (data.messages || []).length
        }
      } catch {}
      finishLiveGroupStream()
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
    } else if (streamFailed && !streamStopped && !newMessage.value.trim() && viewingSendSession) {
      newMessage.value = msg
      messageFiles.value = filesToSend
    }
    if (!queuedTurn && viewingSendSession) window.setTimeout(() => drainGroupTurnQueue().catch(() => {}), 0)
    return { success: !streamFailed, error: streamFailed ? '群聊消息没有完成' : '', taskId: activeGroupTaskId.value, routeRequired }
  }

  return {
    activeAgentStreamMsgs,
    appendAgentWorkEvent,
    appendAgentQaMessage,
    applyMainAgentProgressCheckpoint,
    restoreLiveGroupStreamIfCurrent,
    isStreaming,
    thinkingMessages,
    pendingGroupSendRetry,
    groupStreamController,
    activeGroupTaskId,
    groupTurnBusy,
    stoppingGroupTurn,
    groupTurnConversationId,
    groupTurnControl,
    guideGroupQueuedTurn,
    resolveGroupQueuedRoute,
    stopGroupCurrentWork,
    drainGroupTurnQueue,
    submitGroupMessageWhileBusy,
    sendMessage,
  }
}
