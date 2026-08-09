import { ref } from 'vue'
import { getAssignmentIdentity, getAssignmentStatusLabel } from './groupChatHelpers.js'

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

  const messageGeneration = (msg) => Math.max(0, Number(
    msg?.generation
      ?? msg?.taskRuntime?.generation
      ?? msg?.task_runtime?.generation
      ?? msg?.taskCard?.generation
      ?? msg?.task_card?.generation
      ?? 0,
  ))

  const mergeIncomingMessage = (msg) => {
    if (!msg || msg.content?.startsWith('📤')) return false
    const existingIndex = messages.value.findIndex(m => (msg.id && m.id === msg.id) || isEquivalentMessage(m, msg))
    if (existingIndex >= 0) {
      const current = messages.value[existingIndex]
      // 重连或轮询可能带回旧代次的投影；旧 generation 只能留在后端审计，不能覆盖当前卡片。
      if (messageGeneration(msg) > 0 && messageGeneration(current) > messageGeneration(msg)) return false
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
        streaming: current.streaming && !msg.content ? current.streaming : false
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
    pullInFlight = true
    try {
      const res = await fetch(`/api/groups/messages?id=${currentGroup.value.id}&limit=100&session_id=${encodeURIComponent(currentGroupSessionId.value)}`)
      const data = await res.json()
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
