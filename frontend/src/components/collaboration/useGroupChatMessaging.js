import { ref } from 'vue'
import { getAssignmentIdentity, getAssignmentStatusLabel } from './groupChatHelpers.js'

const asPositiveInteger = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0
}

// An execution anchor identifies the logical request. It is intentionally not
// used as the assistant message identity because every recovery attempt keeps
// the same anchor.
export const groupMessageAnchor = (message) => String(
  message?.execution_anchor_message_id
    || message?.executionAnchorMessageId
    || message?.recovery?.anchorMessageId
    || message?.recovery?.anchor_message_id
    || '',
).trim()

export const groupMessageStableId = (message) => String(
  message?.responseMessageId
    || message?.response_message_id
    || message?.id
    || message?.message_id
    || '',
).trim()

export const groupMessageTurnId = (message) => String(
  message?.executionTurnId
    || message?.execution_turn_id
    || message?.turnId
    || message?.turn_id
    || '',
).trim()

export const groupMessageAttempt = (message) => asPositiveInteger(
  message?.executionAttempt
    ?? message?.execution_attempt
    ?? message?.attempt
    ?? message?.recovery?.attempt,
)

export const groupMessageGeneration = (message) => asPositiveInteger(
  message?.generation
    ?? message?.taskRuntime?.generation
    ?? message?.task_runtime?.generation
    ?? message?.taskCard?.generation
    ?? message?.task_card?.generation,
)

export const groupMessageSequence = (message) => asPositiveInteger(
  message?.sequence
    ?? message?.eventSequence
    ?? message?.event_sequence
    ?? message?.executionSequence
    ?? message?.execution_sequence,
)

export const isTransientGroupMessage = (message) => {
  if (!message || message.role !== 'assistant') return false
  if (message.__groupTransient === true || message.transient === true || message.optimistic === true) return true
  const id = String(message.id || '').trim()
  if (id.startsWith('group-reply:')) return true
  // A stream envelope created before the server assigns a response id is
  // replaceable; persisted assistant rows always have a stable id.
  return message.streaming === true && !groupMessageStableId(message)
}

export function compareGroupMessageVersion(incoming, current) {
  const incomingGeneration = groupMessageGeneration(incoming)
  const currentGeneration = groupMessageGeneration(current)
  if (incomingGeneration !== currentGeneration && (incomingGeneration || currentGeneration)) {
    return incomingGeneration > currentGeneration ? 1 : -1
  }
  const incomingAttempt = groupMessageAttempt(incoming)
  const currentAttempt = groupMessageAttempt(current)
  if (incomingAttempt !== currentAttempt && (incomingAttempt || currentAttempt)) {
    return incomingAttempt > currentAttempt ? 1 : -1
  }
  const incomingSequence = groupMessageSequence(incoming)
  const currentSequence = groupMessageSequence(current)
  if (incomingSequence !== currentSequence && (incomingSequence || currentSequence)) {
    return incomingSequence > currentSequence ? 1 : -1
  }
  return 0
}

export function shouldIgnoreStaleGroupMessage(incoming, current) {
  const version = compareGroupMessageVersion(incoming, current)
  if (version < 0) return true
  // Old records created before per-attempt fields were added have no version.
  // Their timestamp still lets us reject a late replay once a newer attempt is
  // already visible for the same logical request.
  if (version === 0
    && groupMessageAttempt(current) > 0
    && groupMessageAttempt(incoming) === 0
    && groupMessageAnchor(incoming)
    && groupMessageAnchor(incoming) === groupMessageAnchor(current)) {
    const incomingTime = Date.parse(String(incoming?.timestamp || incoming?.created_at || incoming?.createdAt || ''))
    const currentTime = Date.parse(String(current?.timestamp || current?.created_at || current?.createdAt || ''))
    if (Number.isFinite(incomingTime) && Number.isFinite(currentTime) && incomingTime <= currentTime) return true
  }
  return false
}

export function canMergeGroupMessage(current, incoming) {
  if (!current || !incoming) return false
  const currentId = groupMessageStableId(current)
  const incomingId = groupMessageStableId(incoming)
  if (currentId && incomingId && currentId === incomingId) return true
  const currentAnchor = groupMessageAnchor(current)
  const incomingAnchor = groupMessageAnchor(incoming)
  if (!currentAnchor || currentAnchor !== incomingAnchor) return false
  // Same-anchor authoritative messages are separate recovery attempts. Only
  // replace a local stream envelope with the authoritative server response.
  if (isTransientGroupMessage(current) && !isTransientGroupMessage(incoming)) return true
  if (isTransientGroupMessage(incoming) && !isTransientGroupMessage(current)) return false
  return false
}

export function useGroupChatMessaging({ messages, currentGroup, currentGroupSessionId, isGroupSessionDraft, groupSessions, mainAgentStatus, groupAgentQa, scrollToBottom }) {
  const groupMessageKeyMap = new WeakMap()
  let groupMessageKeySeq = 0
  const getGroupMessageKey = (msg) => {
    if (!msg || typeof msg !== 'object') return `empty-${groupMessageKeySeq++}`
    const existing = groupMessageKeyMap.get(msg)
    if (existing) return existing
    const explicit = msg.id || msg.client_message_id
    const key = explicit
      ? `msg-${explicit}`
      : `local-${Date.now().toString(36)}-${groupMessageKeySeq++}`
    groupMessageKeyMap.set(msg, key)
    return key
  }

  const createLocalMessageId = () => `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  const normalizeMessageContent = (content) => String(content || '').replace(/\s+/g, ' ').trim()

  const isEquivalentMessage = (a, b) => {
    if (!a || !b) return false
    if (a.role !== b.role) return false
    if (a.role === 'user' && a.target !== b.target) return false
    if (a.role !== 'user' && (a.agent || '') !== (b.agent || '')) return false
    if (normalizeMessageContent(a.content) !== normalizeMessageContent(b.content)) return false
    const at = new Date(a.timestamp || 0).getTime()
    const bt = new Date(b.timestamp || 0).getTime()
    return !at || !bt || Math.abs(at - bt) < 120000
  }

  const mergeIncomingMessage = (msg) => {
    if (!msg || msg.content?.startsWith('📤')) return false
    const incomingId = groupMessageStableId(msg)
    const incomingAnchor = groupMessageAnchor(msg)

    // Reject a late replay before it can be appended as a second visible
    // answer. This is especially important for legacy rows that share an
    // anchor but predate executionAttempt/turn fields.
    if (incomingAnchor) {
      const latestSameAnchor = [...messages.value].reverse().find(current => (
        current !== msg
        && groupMessageAnchor(current) === incomingAnchor
        && !isTransientGroupMessage(current)
      ))
      if (latestSameAnchor && shouldIgnoreStaleGroupMessage(msg, latestSameAnchor)) return false
    }

    let existingIndex = -1
    // Stable server ids are the strongest identity and must be checked first.
    if (incomingId) {
      for (let index = messages.value.length - 1; index >= 0; index -= 1) {
        if (groupMessageStableId(messages.value[index]) === incomingId) {
          existingIndex = index
          break
        }
      }
    }
    // Then, and only then, allow an authoritative response to close its local
    // optimistic stream envelope. Never merge two persisted rows by anchor.
    if (existingIndex < 0) {
      for (let index = messages.value.length - 1; index >= 0; index -= 1) {
        if (canMergeGroupMessage(messages.value[index], msg)) {
          existingIndex = index
          break
        }
      }
    }
    // Content equivalence is safe only when one side is transient. Two
    // historical assistant replies can legitimately contain the same text.
    if (existingIndex < 0) {
      for (let index = messages.value.length - 1; index >= 0; index -= 1) {
        const current = messages.value[index]
        if ((isTransientGroupMessage(current) || isTransientGroupMessage(msg)) && isEquivalentMessage(current, msg)) {
          existingIndex = index
          break
        }
      }
    }
    if (existingIndex >= 0) {
      const current = messages.value[existingIndex]
      // 重连或轮询可能带回旧代次/旧 attempt 的投影；旧版本只能留在
      // 后端审计，不能覆盖当前卡片或把当前回复降级成错误。
      if (shouldIgnoreStaleGroupMessage(msg, current)) return false
      if (current.streaming === true || current.__groupTransient === true) return false
      const currentKey = getGroupMessageKey(current)
      const next = {
        ...current,
        ...msg,
        fileChanges: msg.fileChanges || current.fileChanges,
        workEvents: msg.workEvents || current.workEvents,
        assignments: Array.isArray(msg.assignments) ? msg.assignments : current.assignments,
        executionOrder: msg.executionOrder || current.executionOrder,
        runtime: msg.runtime || current.runtime,
        dispatchPolicy: msg.dispatchPolicy || current.dispatchPolicy,
        coordinationPlan: msg.coordinationPlan || current.coordinationPlan,
        presentedPlan: msg.presentedPlan || msg.presented_plan || current.presentedPlan || current.presented_plan,
        presented_plan: msg.presented_plan || msg.presentedPlan || current.presented_plan || current.presentedPlan,
        workflow: msg.workflow || current.workflow,
        mainAgentDecision: msg.mainAgentDecision || msg.main_agent_decision || current.mainAgentDecision || current.main_agent_decision,
        main_agent_decision: msg.main_agent_decision || msg.mainAgentDecision || current.main_agent_decision || current.mainAgentDecision,
        clarificationSummary: msg.clarificationSummary || msg.clarification_summary || current.clarificationSummary || current.clarification_summary,
        clarification_summary: msg.clarification_summary || msg.clarificationSummary || current.clarification_summary || current.clarificationSummary,
        clarificationContext: msg.clarificationContext || msg.clarification_context || current.clarificationContext || current.clarification_context,
        clarification_context: msg.clarification_context || msg.clarificationContext || current.clarification_context || current.clarificationContext,
        taskRuntime: msg.taskRuntime || msg.task_runtime || current.taskRuntime || current.task_runtime,
        task_runtime: msg.task_runtime || msg.taskRuntime || current.task_runtime || current.taskRuntime,
        // 服务端重拉的 taskRuntime 带有按当前任务状态重建的卡片（含修订后的计划书）；
        // 必须同步刷新消息上固化的 taskCard，否则 getTaskCard 会一直优先读到 SSE 建卡时的旧卡。
        taskCard: (msg.taskRuntime || msg.task_runtime)?.taskCard || msg.taskCard || msg.task_card || current.taskCard || current.task_card,
        task_card: (msg.task_runtime || msg.taskRuntime)?.task_card || (msg.taskRuntime || msg.task_runtime)?.taskCard || msg.task_card || msg.taskCard || current.task_card || current.taskCard,
        delivery_summary: msg.delivery_summary || current.delivery_summary,
        deliverySummary: msg.deliverySummary || current.deliverySummary,
        receipts: msg.receipts || current.receipts,
        streaming: current.streaming && !msg.content ? current.streaming : false,
        // Once the server response has arrived the envelope is no longer
        // eligible for same-anchor replacement by another persisted row.
        ...(isTransientGroupMessage(current) && !isTransientGroupMessage(msg) ? { __groupTransient: false, transient: false, optimistic: false } : {}),
      }
      groupMessageKeyMap.set(next, currentKey)
      messages.value[existingIndex] = next
      return false
    }
    messages.value.push(msg)
    return true
  }

  const getMainAgentDecision = (msg) => msg?.mainAgentDecision || msg?.main_agent_decision || null
  const attachMainAgentDecision = (decision) => {
    if (!decision) return false
    const messageId = decision.reply?.message_id || decision.message_id || ''
    const taskId = decision.task_id || ''
    let index = -1
    if (messageId) index = messages.value.findIndex(m => m.id === messageId)
    if (index < 0 && taskId) index = messages.value.findIndex(m => getMessageTaskId(m) === taskId)
    if (index < 0) index = [...messages.value].reverse().findIndex(m => m.role === 'assistant')
    if (index < 0) return false
    if (!messageId && !taskId) index = messages.value.length - 1 - index
    const current = messages.value[index]
    messages.value[index] = {
      ...current,
      mainAgentDecision: decision,
      main_agent_decision: decision,
    }
    return true
  }


  const findAssignmentMessageIndex = (data) => {
    if (data?.planMessageId) {
      const idx = messages.value.findIndex(m => m.id === data.planMessageId)
      if (idx !== -1) return idx
    }
    const identity = getAssignmentIdentity(data || {})
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const assignments = messages.value[i]?.assignments
      if (!Array.isArray(assignments)) continue
      if (identity.assignmentId && assignments.some(item => getAssignmentIdentity(item).assignmentId === identity.assignmentId)) return i
      if (identity.dispatchKey && assignments.some(item => getAssignmentIdentity(item).dispatchKey === identity.dispatchKey)) return i
      if (identity.project && assignments.filter(item => getAssignmentIdentity(item).project === identity.project).length === 1) return i
    }
    return -1
  }

  const getAssignmentKey = (msg, item) => `${msg?.id || getGroupMessageKey(msg)}-${item?.assignmentId || item?.dispatchKey || `${item?.project || 'agent'}-${item?.attempt || 1}-${item?.task || ''}`}`

  const applyAssignmentStatus = (data) => {
    if (!data?.project && !data?.assignmentId && !data?.dispatchKey) return false
    const msgIndex = findAssignmentMessageIndex(data)
    if (msgIndex === -1) return false
    const msg = messages.value[msgIndex]
    if (!Array.isArray(msg.assignments)) return false
    let changed = false
    const incoming = getAssignmentIdentity(data)
    const projectMatches = msg.assignments.filter(item => getAssignmentIdentity(item).project === incoming.project).length
    const assignments = msg.assignments.map(item => {
      const current = getAssignmentIdentity(item)
      const matchesIdentity = incoming.assignmentId && current.assignmentId === incoming.assignmentId
      const matchesDispatch = !incoming.assignmentId && incoming.dispatchKey && current.dispatchKey === incoming.dispatchKey
      const matchesProject = !incoming.assignmentId && !incoming.dispatchKey && incoming.project && current.project === incoming.project && projectMatches === 1
      if (!matchesIdentity && !matchesDispatch && !matchesProject) return item
      changed = true
      return {
        ...item,
        status: data.status || item.status || 'pending',
        statusText: data.statusText || getAssignmentStatusLabel(data.status || item.status),
        updated_at: new Date().toISOString()
      }
    })
    if (!changed) return false
    const currentKey = getGroupMessageKey(msg)
    const next = { ...msg, assignments }
    if (data.workflow) next.workflow = data.workflow
    groupMessageKeyMap.set(next, currentKey)
    messages.value[msgIndex] = next
    return true
  }

  // 等待跨 Agent 回复状态
  const waitingCrossReply = ref(false)

  // 主动拉取新消息（带去重）
  let pullInFlight = false
  const pullNewMessages = async () => {
    if (!currentGroup.value || isGroupSessionDraft?.value || pullInFlight) return
    const groupId = currentGroup.value.id
    const sessionId = String(currentGroupSessionId.value || '')
    pullInFlight = true
    try {
      const res = await fetch(`/api/groups/messages?id=${encodeURIComponent(groupId)}&limit=100&session_id=${encodeURIComponent(sessionId)}`)
      const data = await res.json()
      if (currentGroup.value?.id !== groupId || String(currentGroupSessionId.value || '') !== sessionId) return
      if (Array.isArray(data.sessions)) groupSessions.value = data.sessions
      mainAgentStatus.value = data.mainAgentStatus || mainAgentStatus.value
      groupAgentQa.value = data.agentQa || groupAgentQa.value
      const msgs = data.messages || []
      let appended = 0
      for (const m of msgs) {
        if (mergeIncomingMessage(m)) appended++
      }
      if (appended > 0) {
        scrollToBottom()
        // 收到新消息后停止等待提示
        waitingCrossReply.value = false
      }
      lastGroupMsgCount.value = msgs.length
    } catch {
    } finally {
      pullInFlight = false
    }
  }

  // 群聊消息轮询
  let groupPollTimer = null
  const lastGroupMsgCount = ref(0)

  const startGroupPolling = () => {
    if (groupPollTimer) clearInterval(groupPollTimer)
    if (!currentGroup.value) return

    groupPollTimer = setInterval(async () => {
      if (!currentGroup.value) {
        clearInterval(groupPollTimer)
        return
      }
      await pullNewMessages()
    }, 15000) // 实时状态主要由 runtime events 驱动；这里只做断线和重启恢复兜底
  }

  const stopGroupPolling = () => {
    if (groupPollTimer) {
      clearInterval(groupPollTimer)
      groupPollTimer = null
    }
  }

  return {
    groupMessageKeyMap,
    groupMessageKeySeq,
    getGroupMessageKey,
    createLocalMessageId,
    normalizeMessageContent,
    isEquivalentMessage,
    mergeIncomingMessage,
    getMainAgentDecision,
    attachMainAgentDecision,
    findAssignmentMessageIndex,
    getAssignmentKey,
    applyAssignmentStatus,
    waitingCrossReply,
    pullNewMessages,
    groupPollTimer,
    lastGroupMsgCount,
    startGroupPolling,
    stopGroupPolling,
  }
}
