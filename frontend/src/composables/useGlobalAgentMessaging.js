import { nextTick, watch } from 'vue'
import { mergeGlobalRunTestAgentExecutionPlan } from '../utils/globalAgentExecutionStream.js'
import { notifySessionContextUsage } from './useSessionContextUsage.js'
import {
  mergeGlobalMessageAttachments,
  normalizeGlobalMessageAttachments,
} from '../utils/globalAgentAttachments.js'

export function useGlobalAgentMessaging(context) {
  const {
    chatInput, isSteering, activeGlobalRunId, findActiveGlobalRunMessage, currentSession, toast,
    applyGlobalMissionPayload, appendGlobalStreamEvent, saveHistory, scrollToBottom, globalTurnBusy,
    stoppingGlobalTurn, globalActiveRunId, globalStreamController, currentSessionId, globalTurnControl,
    currentSupervisedRunMessage, activeGlobalRunMessage, activeGlobalExecutionConfirmed,
    isExplicitSupervisionContinuation,
    pendingGlobalMissionInput, selectedFiles, chatInputElement, postJson, visibleGlobalText, isSending,
    pendingGlobalClarificationInput, createNewSession, pendingGlobalRequestRetry, globalRequestRetrySignature,
    ensureGlobalStreamMessage, sanitizeGlobalVisibleStreamText, GLOBAL_VISIBLE_INTERNAL_TEXT_PATTERN,
    GLOBAL_RESULT_VISIBLE_FALLBACK, trackGlobalMission, emit,
  } = context

const sendGlobalRunSteer = async (options = {}) => {
  const userText = String(options.userText ?? chatInput.value).trim()
  const runId = options.runId || activeGlobalRunId.value
  if (!userText || !runId || isSteering.value) return
  const agentMsg = options.agentMsg || findActiveGlobalRunMessage(runId)
  if (!agentMsg || !currentSession.value) {
    toast.error('当前任务还没有准备好接收补充要求')
    return { success: false, error: '当前任务还没有准备好接收补充要求' }
  }

  const supervisionSteer = options.supervision === true
  const source = supervisionSteer ? 'global_web_supervision_steer' : 'global_web_mid_turn'
  const requestId = `steer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const userMessage = {
    role: 'user',
    content: userText,
    timestamp: new Date().toISOString(),
    type: supervisionSteer ? 'global_supervision_steer' : 'global_run_steer',
    run_id: runId,
    delivery_status: 'sending'
  }
  currentSession.value.messages.push(userMessage)
  chatInput.value = ''
  isSteering.value = true
  saveHistory()
  scrollToBottom()
  let accepted = false
  let failure = ''

  try {
    const res = await fetch('/api/global-agent/runs/steer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: runId,
        message: userText,
        kind: 'auto',
        source,
        request_id: requestId
      })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`)
    userMessage.delivery_status = 'accepted'
    accepted = true
    if (data.run) {
      agentMsg.agenticRun = mergeGlobalRunTestAgentExecutionPlan(data.run, agentMsg.agenticRun || {})
      activeGlobalRunId.value = agentMsg.agenticRun.id || runId
      activeGlobalRunMessage.value = agentMsg
    }
    if (data.mission) applyGlobalMissionPayload(agentMsg, data)
    else if (data.supervisor) agentMsg.globalMissionSupervisor = data.supervisor
    if (supervisionSteer) {
      agentMsg.type = 'global_stream'
      agentMsg.streaming = false
    }
    appendGlobalStreamEvent(agentMsg, {
      type: data.applied === true ? 'user_steer_applied' : 'user_steer_queued',
      run_id: runId,
      status: data.run?.status || 'running',
      phase: data.run?.phase || 'plan',
      steering: data.steering || { message: userText, kind: 'supplement', status: 'queued' },
      replan_required: data.steering?.kind === 'revise_goal',
      message: data.message || ''
    })
    saveHistory()
    scrollToBottom()
  } catch (error) {
    failure = error?.message || '补充要求发送失败'
    userMessage.delivery_status = 'failed'
    if (!chatInput.value.trim()) chatInput.value = userText
    appendGlobalStreamEvent(agentMsg, {
      type: 'user_steer_failed',
      run_id: runId,
      message: error?.message || '这条补充没有接入当前任务，请重新发送。'
    })
    toast.error(error?.message || '补充要求发送失败')
    saveHistory()
  } finally {
    isSteering.value = false
    if (supervisionSteer) {
      activeGlobalRunId.value = ''
      activeGlobalRunMessage.value = null
    }
    scrollToBottom()
  }
  return { success: accepted, error: failure }
}

const stopGlobalCurrentWork = async () => {
  if (!globalTurnBusy.value || stoppingGlobalTurn.value) return
  stoppingGlobalTurn.value = true
  try {
    let runId = globalActiveRunId.value
    if (!runId && currentSessionId.value) {
      const params = new URLSearchParams({ session_id: currentSessionId.value, limit: '20' })
      const listing = await fetch(`/api/global-agent/runs?${params.toString()}`).then(response => response.json()).catch(() => ({}))
      runId = (listing.runs || []).find(run => ['running', 'supervising', 'paused'].includes(String(run?.status || '')))?.id || ''
    }
    if (runId) {
      await fetch('/api/global-agent/runs/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: runId, reason: '用户从全局 Agent 会话停止当前工作' }),
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || data.success === false) throw new Error(data.error || '停止失败')
      }).catch((error) => toast.warning(error?.message || '后端停止请求未完成，正在中断当前连接'))
    }
    globalStreamController.value?.abort()
  } finally {
    stoppingGlobalTurn.value = false
  }
}

const drainGlobalTurnQueue = () => globalTurnControl.drain(async (turn) => {
  const result = await sendMessage({ queueTurn: turn })
  if (result?.success === false) throw new Error(result.error || '全局消息没有完成')
  return { run_id: result?.runId || '' }
})
watch(
  () => [currentSessionId.value, globalTurnBusy.value, globalTurnControl.turns.value.filter(turn => turn.status === 'queued').length],
  ([conversationId, busy, queued]) => {
    if (conversationId && !busy && queued) window.setTimeout(() => drainGlobalTurnQueue().catch(() => {}), 0)
  },
  { flush: 'post' },
)

const submitGlobalMessageWhileBusy = async () => {
  const message = chatInput.value.trim()
  if (!message) return
  const requestedMode = globalTurnControl.mode.value
  const supervisedMessage = currentSupervisedRunMessage.value
  const activeMessage = activeGlobalRunMessage.value?.agenticRun?.id === activeGlobalRunId.value
    ? activeGlobalRunMessage.value
    : null
  const runId = globalActiveRunId.value
  const targetMessage = activeMessage || supervisedMessage
  const supervision = !activeMessage && !!supervisedMessage
  const canSteer = !!runId && (activeGlobalExecutionConfirmed.value || supervision)
  if (requestedMode === 'steer' && !canSteer) {
    toast.info('当前运行还在启动，这条消息已改为排队，启动完成后不会丢失')
  }
  const effectiveMode = requestedMode === 'steer' && canSteer ? 'steer' : 'queue'
  const turn = await globalTurnControl.enqueue({
    message,
    mode: effectiveMode,
    activeRunId: runId,
    metadata: { session_id: currentSessionId.value, requested_mode: requestedMode },
  })
  chatInput.value = ''
  if (effectiveMode === 'steer') {
    const result = await sendGlobalRunSteer({ userText: message, runId, agentMsg: targetMessage || undefined, supervision })
    await globalTurnControl.settle(turn, result?.success ? 'applied' : 'failed', result?.success ? {} : { error: result?.error || '引导没有接入当前工作' })
  } else {
    toast.success('已加入队列，当前回复结束后会自动发送')
  }
  return turn
}

const beginGlobalMissionInput = async (msg, card = {}) => {
  const missionId = msg?.globalMission?.id || card?.task_id || ''
  const supervisorId = msg?.globalMissionSupervisor?.id || msg?.globalMission?.supervisor_id || missionId
  if (!missionId || !supervisorId) {
    toast.error('当前任务还没有准备好接收补充信息')
    return
  }
  pendingGlobalMissionInput.value = {
    msg,
    missionId,
    supervisorId,
    title: card?.title || msg?.globalMission?.title || '当前任务',
    businessGoal: card?.goal || msg?.globalMission?.business_goal || msg?.globalMission?.title || '',
    acceptance: msg?.globalMissionSupervisor?.acceptance || msg?.globalMission?.acceptance_criteria || '',
  }
  chatInput.value = ''
  selectedFiles.value = []
  await nextTick()
  chatInputElement.value?.focus?.()
  toast.info('请在输入框补充所需信息；发送后我会接着原任务继续执行和验收')
}

const sendGlobalMissionInput = async () => {
  const target = pendingGlobalMissionInput.value
  const userText = chatInput.value.trim()
  if (!target || !userText || isSteering.value || !currentSession.value) return
  const timestamp = new Date().toISOString()
  const requestId = `mission-input-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const userMessage = {
    id: `global-mission-input:${requestId}`,
    role: 'user',
    type: 'global_mission_user_input',
    content: userText,
    timestamp,
    mission_id: target.missionId,
    delivery_status: 'sending',
  }
  currentSession.value.messages.push(userMessage)
  chatInput.value = ''
  pendingGlobalMissionInput.value = null
  isSteering.value = true
  saveHistory()
  scrollToBottom()

  try {
    const businessGoal = String(target.businessGoal || target.title || '继续当前任务').slice(0, 50_000)
    const data = await postJson('/api/global-agent/supervisors/control', {
      id: target.supervisorId,
      mission_id: target.missionId,
      operation: 'update_goal',
      business_goal: businessGoal,
      acceptance: target.acceptance,
      message: userText,
      message_id: userMessage.id,
      message_timestamp: timestamp,
      request_id: requestId,
      continuation_kind: 'supplement',
      resolve_waiting_user: true,
      source: 'global_web_waiting_user_resolution',
      actor: 'global-agent-task-card',
      continuation: {
        kind: 'supplement',
        source: 'global_web_waiting_user_resolution',
        reason: userText,
        title: '补充任务条件',
        resolve_waiting_user: true,
        interrupt_current_run: false,
      },
    })
    userMessage.delivery_status = 'accepted'
    const sessionMessages = currentSession.value?.messages || []
    for (const message of sessionMessages) {
      const sameMission = message?.globalMission?.id === target.missionId
        || message?.globalMissionSupervisor?.mission_id === target.missionId
        || message?.agenticRun?.mission_id === target.missionId
      if (!sameMission) continue
      applyGlobalMissionPayload(message, data)
      if (data.run && message?.agenticRun?.id === data.run.id) message.agenticRun = data.run
    }
    applyGlobalMissionPayload(target.msg, data)
    if (data.run && target.msg?.agenticRun?.id === data.run.id) target.msg.agenticRun = data.run
    target.msg.type = 'global_mission'
    target.msg.missionNotificationState = 'resolved'
    target.msg.mission_notification_state = 'resolved'
    target.msg.content = `已收到你补充的信息，“${visibleGlobalText(target.title, '当前任务', 100)}”会沿用原计划和验收条件继续执行。`
    target.msg.updated_at = data.supervisor?.updated_at || new Date().toISOString()
    saveHistory()
    scrollToBottom()
    toast.success('补充信息已接入原任务，我会继续执行和验收')
  } catch (error) {
    userMessage.delivery_status = 'failed'
    pendingGlobalMissionInput.value = target
    if (!chatInput.value.trim()) chatInput.value = userText
    toast.error(error?.message || '补充信息没有接入当前任务，请重新发送')
    saveHistory()
  } finally {
    isSteering.value = false
    await nextTick()
    if (pendingGlobalMissionInput.value) chatInputElement.value?.focus?.()
    scrollToBottom()
  }
}

const sendMessage = async (options = {}) => {
  const queuedTurn = options?.queueTurn || null
  if (globalTurnBusy.value && !queuedTurn && !pendingGlobalMissionInput.value && !pendingGlobalClarificationInput.value) return submitGlobalMessageWhileBusy()
  if (!queuedTurn && !chatInput.value.trim() && selectedFiles.value.length === 0) return
  if (pendingGlobalMissionInput.value) return sendGlobalMissionInput()
  const supervisionTarget = currentSupervisedRunMessage.value
  if (
    selectedFiles.value.length === 0
    && supervisionTarget?.agenticRun?.id
    && isExplicitSupervisionContinuation(chatInput.value)
  ) {
    return sendGlobalRunSteer({
      runId: supervisionTarget.agenticRun.id,
      agentMsg: supervisionTarget,
      supervision: true,
    })
  }
  if (!currentSession.value) {
    createNewSession()
  }
  
  const userText = queuedTurn ? String(queuedTurn.message || '').trim() : chatInput.value.trim()
  const clarificationTarget = pendingGlobalClarificationInput.value
  const attachedFiles = queuedTurn ? [] : [...selectedFiles.value]
  const retrySignature = globalRequestRetrySignature({
    sessionId: currentSessionId.value,
    message: userText,
    files: attachedFiles,
    clarificationRunId: clarificationTarget?.runId,
  })
  const requestId = pendingGlobalRequestRetry.value?.signature === retrySignature
    ? pendingGlobalRequestRetry.value.requestId
    : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  pendingGlobalRequestRetry.value = { signature: retrySignature, requestId }
  
  chatInput.value = ''
  selectedFiles.value = []
  
  // 构建前端渲染的历史消息（带附件）
  const newMessage = {
    id: `global-request:${requestId}`,
    role: 'user',
    content: userText,
    timestamp: new Date().toISOString(),
    files: attachedFiles.map(f => ({
      name: f.name,
      size: f.size,
      preview: f.preview,
      type: f.type,
      attachment_owner: 'user'
    }))
  }
  const previousRequestMessageIndex = currentSession.value.messages.findIndex(message => message.id === newMessage.id)
  if (previousRequestMessageIndex >= 0) currentSession.value.messages.splice(previousRequestMessageIndex, 1)
  currentSession.value.messages.push(newMessage)
  saveHistory()
  scrollToBottom()
  
  isSending.value = true
  
  try {
    const historyPayload = currentSession.value.messages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }))
    
    const agentMsg = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      files: [],
      type: 'global_stream',
      streaming: true,
      executionIntentConfirmed: false,
      streamEvents: [],
      user_message: userText,
      userMessage: userText
    }
    activeGlobalRunMessage.value = agentMsg
    activeGlobalRunId.value = ''
    activeGlobalExecutionConfirmed.value = false
    const agentMsgAdded = { value: false }
    
    let res
    if (attachedFiles.length > 0) {
      const formData = new FormData()
      formData.append('message', userText)
      formData.append('history', JSON.stringify(historyPayload))
      formData.append('session_id', currentSessionId.value)
      formData.append('request_id', requestId)
      if (clarificationTarget?.runId) formData.append('clarification_run_id', clarificationTarget.runId)
      formData.append('stream', 'true')
      attachedFiles.forEach((f, idx) => {
        formData.append(`file_${idx}`, f.file)
      })
      const controller = new AbortController()
      globalStreamController.value = controller
      res = await fetch('/api/global-agent/run?stream=true', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
    } else {
      const controller = new AbortController()
      globalStreamController.value = controller
      res = await fetch('/api/global-agent/run?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        signal: controller.signal,
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
          session_id: currentSessionId.value,
          request_id: requestId,
          clarification_run_id: clarificationTarget?.runId || '',
          stream: true
        })
      })
    }

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(errText || `HTTP ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let sseBuffer = ''
    let globalStreamRawBuffer = ''
    let globalStreamHiddenBuffer = false
    const seenGlobalStreamEventIds = new Set()
    let globalResultReceived = false
    let globalStreamFailed = false

    const handleGlobalSseEvent = (rawEvent) => {
      const dataText = rawEvent
        .split(/\r?\n/)
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart())
        .join('\n')
      if (!dataText) return
      try {
        const data = JSON.parse(dataText)
        const eventId = String(data.event_id || data.eventId || '')
        if (eventId && seenGlobalStreamEventIds.has(eventId)) return
        if (eventId) seenGlobalStreamEventIds.add(eventId)
        if (data.type === 'text') {
          ensureGlobalStreamMessage(agentMsg, agentMsgAdded)
          const chunkText = String(data.text || '')
          globalStreamRawBuffer += chunkText
          if (globalStreamHiddenBuffer || GLOBAL_VISIBLE_INTERNAL_TEXT_PATTERN.test(globalStreamRawBuffer)) {
            globalStreamHiddenBuffer = true
            agentMsg.content = sanitizeGlobalVisibleStreamText(globalStreamRawBuffer, '我已收到技术执行信息，正在整理用户可读结论。', 1200)
          } else {
            agentMsg.content += sanitizeGlobalVisibleStreamText(chunkText)
          }
          scrollToBottom()
        } else if (data.type === 'result') {
          globalResultReceived = true
          ensureGlobalStreamMessage(agentMsg, agentMsgAdded)
          const run = mergeGlobalRunTestAgentExecutionPlan(data.run || {}, agentMsg.agenticRun || {})
          const pendingToolName = sanitizeGlobalVisibleStreamText(run.pending_tool?.name || '写入操作', '写入操作', 80)
          const confirmationHint = run.status === 'waiting_confirmation'
            ? `\n\n⚠️ 等待确认：${pendingToolName}。请使用下方按钮决定是否继续。`
            : ''
          agentMsg.content = sanitizeGlobalVisibleStreamText(run.final_reply || GLOBAL_RESULT_VISIBLE_FALLBACK, GLOBAL_RESULT_VISIBLE_FALLBACK, 8000) + confirmationHint
          const sourceFiles = data.source_files || data.sourceFiles || []
          newMessage.files = mergeGlobalMessageAttachments(newMessage.files, sourceFiles, 'user')
          const assistantFiles = data.assistant_files || data.assistantFiles || data.output_files || data.outputFiles || []
          agentMsg.files = normalizeGlobalMessageAttachments(
            Array.isArray(assistantFiles)
              ? assistantFiles.map(file => ({ ...file, attachment_owner: 'assistant' }))
              : [],
            'assistant'
          )
          agentMsg.agenticRun = run
          activeGlobalRunId.value = run.id || activeGlobalRunId.value
          activeGlobalRunMessage.value = agentMsg
          agentMsg.streaming = false
          agentMsg.type = 'global_agent_result'
          if (run.status === 'supervising' && run.mission_id) trackGlobalMission(run.mission_id, currentSessionId.value)
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
                    const result = await playMusicFromClientEffect({ keyword, mode, commandId, requestText })
                    if (result?.skipped) return
                    if (result?.success) {
                      toast.success(`已开始播放：${result.title || keyword}`)
                      try {
                        if (typeof window.__cc_global_sync_music_ui === 'function') window.__cc_global_sync_music_ui()
                      } catch {}
                      emit('switch-tab', 'music')
                      setTimeout(() => {
                        try {
                          if (typeof window.__cc_global_sync_music_ui === 'function') window.__cc_global_sync_music_ui()
                        } catch {}
                      }, 80)
                    } else if (result?.error) toast.error(`播放失败：${result.error}`)
                  } catch (err) {
                    toast.error(`播放失败：${err?.message || err}`)
                  }
                })()
              }
            }
            if (effect?.type === 'stop_music') {
              const commandId = String(effect.params?.command_id || '').trim()
              void (async () => {
                try {
                  const { stopMusicFromClientEffect } = await import('./useMusicRemotePlayback.js')
                  const result = await stopMusicFromClientEffect({ commandId })
                  if (result?.skipped) return
                  if (result?.success) toast.success('已停止音乐播放')
                  else if (result?.error) toast.error(`停止失败：${result.error}`)
                } catch (err) {
                  toast.error(`停止失败：${err?.message || err}`)
                }
              })()
            }
          }
        } else if (data.type === 'error') {
          globalStreamFailed = true
          ensureGlobalStreamMessage(agentMsg, agentMsgAdded)
          agentMsg.content = `出错啦：${sanitizeGlobalVisibleStreamText(data.text, '这次处理没有完成，排障信息已放入技术详情。', 1200)}`
          agentMsg.streaming = false
          agentMsg.type = 'global_agent_error'
        } else if (data.type !== 'done') {
          ensureGlobalStreamMessage(agentMsg, agentMsgAdded)
          if (appendGlobalStreamEvent(agentMsg, data)) scrollToBottom()
        } else {
          agentMsg.streaming = false
          if (currentSessionId.value) {
            notifySessionContextUsage('global_session', `session:${currentSessionId.value}`, { reason: 'provider_usage_updated' })
          }
        }
      } catch {}
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      sseBuffer += decoder.decode(value, { stream: true })
      const events = sseBuffer.split(/\r?\n\r?\n/)
      sseBuffer = events.pop() || ''
      for (const event of events) {
        handleGlobalSseEvent(event)
      }
    }
    sseBuffer += decoder.decode()
    if (sseBuffer.trim()) handleGlobalSseEvent(sseBuffer)

    if (globalResultReceived && pendingGlobalRequestRetry.value?.requestId === requestId) {
      pendingGlobalRequestRetry.value = null
    } else if (globalStreamFailed && !chatInput.value.trim()) {
      chatInput.value = userText
    }

    saveHistory()
    return { success: !globalStreamFailed, error: globalStreamFailed ? '全局消息没有完成' : '', runId: agentMsg.agenticRun?.id || '' }

  } catch (err) {
    const stopped = err?.name === 'AbortError'
    if (currentSession.value) {
      const last = currentSession.value.messages[currentSession.value.messages.length - 1]
      if (last?.type === 'global_stream' && last.streaming) {
        last.streaming = false
        last.type = 'global_agent_error'
        last.content = stopped ? '本次处理已停止，你可以调整需求后继续。' : `❌ 连接服务器失败：${err.message || '请检查网络或配置'}`
        if (!chatInput.value.trim()) chatInput.value = userText
        saveHistory()
        scrollToBottom()
        return { success: false, error: stopped ? '当前工作已停止' : (err.message || '连接服务器失败') }
      }
    }
    currentSession.value.messages.push({
      role: 'assistant',
      content: `❌ 连接服务器失败：${err.message || '请检查网络或配置'}`,
      timestamp: new Date().toISOString()
    })
    saveHistory()
    return { success: false, error: err?.message || '连接服务器失败' }
  } finally {
    isSending.value = false
    activeGlobalRunId.value = ''
    activeGlobalRunMessage.value = null
    activeGlobalExecutionConfirmed.value = false
    globalStreamController.value = null
    scrollToBottom()
    if (!queuedTurn) window.setTimeout(() => drainGlobalTurnQueue().catch(() => {}), 0)
  }
}


  return { sendGlobalRunSteer, stopGlobalCurrentWork, drainGlobalTurnQueue, submitGlobalMessageWhileBusy, beginGlobalMissionInput, sendGlobalMissionInput, sendMessage }
}
