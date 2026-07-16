import {
  GLOBAL_STREAM_EVENT_LIMIT,
  applyGlobalTestAgentExecutionPlanReady,
  applyGlobalTestAgentReviewReady,
  globalEventConfirmsExecution,
  globalEventToVisibleLine,
  updateGlobalStreamToolUseSummary,
} from '../utils/globalAgentExecutionStream.js'

export function useGlobalAgentTurnRuntime(options = {}) {
  const ensureGlobalStreamMessage = (agentMsg, addedRef) => {
    if (!addedRef.value && options.currentSession.value) {
      options.currentSession.value.messages.push(agentMsg)
      addedRef.value = true
    }
  }

  const syncActiveGlobalRunEnvelope = (agentMsg, event = {}) => {
    const runId = event.run_id || event.runId || event.run?.id || ''
    if (!runId) return
    const previousRun = agentMsg.agenticRun || {}
    const steering = event.steering || event.user_steer || event.userSteer || null
    agentMsg.agenticRun = {
      ...previousRun,
      id: previousRun.id || runId,
      trace_id: previousRun.trace_id || event.trace_id || event.traceId || '',
      status: event.status || event.run?.status || previousRun.status || 'running',
      phase: event.phase || event.run?.phase || previousRun.phase || 'plan',
      user_message: previousRun.user_message || agentMsg.user_message || agentMsg.userMessage || '',
      original_user_message: previousRun.original_user_message || agentMsg.user_message || agentMsg.userMessage || '',
      ...(steering ? {
        last_user_steer: steering,
        lastUserSteer: steering,
        pending_user_messages: event.run?.pending_user_messages || previousRun.pending_user_messages || [],
        pendingUserMessages: event.run?.pendingUserMessages || previousRun.pendingUserMessages || [],
      } : {}),
    }
    options.activeGlobalRunId.value = runId
    options.activeGlobalRunMessage.value = agentMsg
  }

  const appendGlobalStreamEvent = (agentMsg, event) => {
    if (globalEventConfirmsExecution(event)) {
      agentMsg.executionIntentConfirmed = true
      options.activeGlobalExecutionConfirmed.value = true
      if (options.activeGlobalRunMessage.value) options.activeGlobalRunMessage.value.executionIntentConfirmed = true
    }
    syncActiveGlobalRunEnvelope(agentMsg, event)
    const visible = globalEventToVisibleLine(event)
    if (!visible) return false
    if (!Array.isArray(agentMsg.streamEvents)) agentMsg.streamEvents = []
    const eventType = String(event.type || '')
    const steering = event.steering || event.user_steer || event.userSteer || null
    const steeringId = String(steering?.id || '')
    if (steeringId && ['user_steer_queued', 'user_steer_applied'].includes(eventType)) {
      const alreadyQueued = agentMsg.streamEvents.some(item => item.eventType === 'user_steer_queued' && item.steeringId === steeringId)
      const alreadyApplied = agentMsg.streamEvents.some(item => item.eventType === 'user_steer_applied' && item.steeringId === steeringId)
      if (eventType === 'user_steer_queued' && (alreadyQueued || alreadyApplied)) return false
      if (eventType === 'user_steer_applied' && alreadyApplied) return false
      if (eventType === 'user_steer_applied' && !alreadyQueued) {
        const queuedVisible = globalEventToVisibleLine({ type: 'user_steer_queued', steering })
        if (queuedVisible) {
          agentMsg.streamEvents.push({
            ...queuedVisible,
            eventType: 'user_steer_queued',
            steeringId,
            at: steering.at || new Date().toISOString(),
          })
        }
      }
    }
    updateGlobalStreamToolUseSummary(agentMsg, event)
    if (event.type === 'test_agent_execution_plan_ready') applyGlobalTestAgentExecutionPlanReady(agentMsg, event)
    if (event.type === 'test_agent_review_ready' || event.type === 'post_review_spot_check_ready') {
      applyGlobalTestAgentReviewReady(agentMsg, event)
    }
    const dispatchLaunchSummary = event.dispatch_launch_summary || event.dispatchLaunchSummary || null
    if (dispatchLaunchSummary?.rows?.length) {
      agentMsg.dispatch_launch_summary = dispatchLaunchSummary
      agentMsg.dispatchLaunchSummary = dispatchLaunchSummary
    }
    const clarificationSummary = event.clarification_summary || event.clarificationSummary || null
    if (clarificationSummary) {
      agentMsg.clarification_summary = clarificationSummary
      agentMsg.clarificationSummary = clarificationSummary
    }
    const confirmationSummary = event.confirmation_summary || event.confirmationSummary || null
    if (confirmationSummary) {
      agentMsg.confirmation_summary = confirmationSummary
      agentMsg.confirmationSummary = confirmationSummary
    }
    const planMode = event.plan_mode || event.planMode || null
    if (planMode) {
      agentMsg.plan_mode = planMode
      agentMsg.planMode = planMode
    }
    if ((planMode || confirmationSummary || clarificationSummary) && event.run_id) {
      const previousRun = agentMsg.agenticRun || {}
      const userMessage = previousRun.user_message || agentMsg.user_message || agentMsg.userMessage || planMode?.requirement || ''
      agentMsg.agenticRun = {
        ...previousRun,
        id: previousRun.id || event.run_id,
        trace_id: previousRun.trace_id || event.trace_id || '',
        status: event.status || previousRun.status || (confirmationSummary ? 'waiting_confirmation' : clarificationSummary ? 'waiting_clarification' : 'running'),
        phase: event.phase || previousRun.phase || 'needs_confirmation',
        user_message: userMessage,
        original_user_message: previousRun.original_user_message || userMessage,
        pending_tool: event.pending_tool || previousRun.pending_tool || null,
        final_reply: event.reply || previousRun.final_reply || '',
        clarification_summary: clarificationSummary || previousRun.clarification_summary || null,
        clarificationSummary: clarificationSummary || previousRun.clarificationSummary || null,
        confirmation_summary: confirmationSummary || previousRun.confirmation_summary || null,
        confirmationSummary: confirmationSummary || previousRun.confirmationSummary || null,
        plan_mode: planMode || previousRun.plan_mode || null,
        planMode: planMode || previousRun.planMode || null,
        tool_calls: Number(previousRun.tool_calls || 0),
        model_calls: Number(previousRun.model_calls || 0),
        resume_count: Number(previousRun.resume_count || 0),
      }
    }
    const checkpoint = event.ui?.checkpoint || event.progress_checkpoint || event.progressCheckpoint || null
    if (checkpoint?.label) {
      if (!Array.isArray(agentMsg.progressCheckpoints)) agentMsg.progressCheckpoints = []
      const checkpointKey = checkpoint.id || `${checkpoint.label}:${checkpoint.detail || ''}:${checkpoint.phase || ''}`
      agentMsg.progressCheckpoints = [
        ...agentMsg.progressCheckpoints.filter(item => (item.id || `${item.label}:${item.detail || ''}:${item.phase || ''}`) !== checkpointKey),
        checkpoint,
      ].slice(-12)
      agentMsg.progress_checkpoints = {
        schema: 'ccm-main-agent-live-checkpoints-v1',
        items: agentMsg.progressCheckpoints,
      }
    }
    const key = `${visible.title}:${visible.text}`
    const previous = agentMsg.streamEvents[agentMsg.streamEvents.length - 1]
    if (previous && `${previous.title}:${previous.text}` === key) return false
    agentMsg.streamEvents.push({ ...visible, eventType, steeringId, at: new Date().toISOString() })
    if (agentMsg.streamEvents.length > GLOBAL_STREAM_EVENT_LIMIT) {
      agentMsg.streamEvents.splice(0, agentMsg.streamEvents.length - GLOBAL_STREAM_EVENT_LIMIT)
    }
    agentMsg.content = agentMsg.streamEvents.map(item => `${item.icon} ${item.title}：${item.text}`).join('\n')
    return true
  }

  const findActiveGlobalRunMessage = (runId = options.activeGlobalRunId.value) => {
    if (options.activeGlobalRunMessage.value?.agenticRun?.id === runId) return options.activeGlobalRunMessage.value
    const rows = options.currentSession.value?.messages || []
    return [...rows].reverse().find(message => message?.role === 'assistant' && message?.agenticRun?.id === runId) || null
  }

  return {
    ensureGlobalStreamMessage,
    syncActiveGlobalRunEnvelope,
    appendGlobalStreamEvent,
    findActiveGlobalRunMessage,
  }
}
