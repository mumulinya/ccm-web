import { ref, onMounted, onUnmounted, nextTick, watch, inject, computed } from 'vue'
import { groupsApi, projectsApi } from '../../api/index.js'
import { toast, confirmDialog } from '../../utils/toast.js'
import { shouldShowGroupMainAgentStatus } from '../../utils/groupStatusVisibility.js'
import { useSlashCommands } from '../../composables/useSlashCommands.js'
import { createSlashCommandClientActions } from '../../composables/useSlashCommandClientActions.js'
import { buildGroupClarificationResponseFields, buildWaitingUserTaskContinuationFields, createGroupTaskCardActionHandler } from '../../composables/useGroupTaskCardActions.js'
import { useChatTemplates } from '../../composables/useChatTemplates.js'
import { useCodeChangeDrawer } from '../../composables/useCodeChangeDrawer.js'
import { useMessageNavigation } from '../../composables/useMessageNavigation.js'
import { usePinnedScroll } from '../../composables/usePinnedScroll.js'
import { useConversationTurnControl } from '../../composables/useConversationTurnControl.js'
import { buildGroupConversationKnowledgePayload, postKnowledgeCapture } from '../../utils/knowledgeCapture.js'
import { normalizeTestAgentExecutionPlanSummary, sanitizeUserFacingAgentText, sanitizeUserFacingLegacyTerminology, sanitizeUserFacingPlanText, sanitizeUserFacingStructure } from '../../utils/agentDisplay.js'

export function useGroupChat(props, emit) {
  const GROUP_VISIBLE_INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|trace_id|session_id|WorkerContextPacket|raw\s+receipt|raw\s+payload|raw_report|scratchpad|Runtime Kernel|workflow_timeline/i
  const GROUP_INTERNAL_PROTOCOL_FALLBACK = '执行成员已提交技术执行信息，我正在整理用户可读结论。'
  const GROUP_STREAM_ERROR_FALLBACK = '请求没有完成，我会保留当前进度；排障信息已放入技术详情。'
  const sanitizeGroupVisibleText = (value, fallback = '我正在处理当前请求。', max = 4000) => {
    const raw = String(value || '')
    if (!raw) return ''
    if (GROUP_VISIBLE_INTERNAL_TEXT_PATTERN.test(raw)) {
      const visible = sanitizeUserFacingLegacyTerminology(sanitizeUserFacingAgentText(raw, GROUP_INTERNAL_PROTOCOL_FALLBACK, Math.min(max, 1200)))
      return sanitizeUserFacingPlanText(visible, fallback || GROUP_INTERNAL_PROTOCOL_FALLBACK, Math.min(max, 1200))
    }
    const text = sanitizeUserFacingPlanText(raw, fallback, max)
    return text.length > max ? `${text.slice(0, max)}...` : text
  }
  const buildGroupStreamErrorText = (value) => `这次没有完成：${sanitizeGroupVisibleText(value || GROUP_STREAM_ERROR_FALLBACK, GROUP_STREAM_ERROR_FALLBACK, 800) || GROUP_STREAM_ERROR_FALLBACK}`
  function getVisibleGroupMessageContent(msg, fallback = '我已整理这条消息。') {
    if (!msg) return ''
    if (msg.role === 'user') return String(msg.content || '')
    return sanitizeGroupVisibleText(msg.content, fallback, 4000)
  }

  // 处理搜索结果跳转
  const handleGroupNavigation = async () => {
    const target = props.navigateTo
    if (!target || target.tab !== 'groups') return
    await nextTick()
    if (target.groupId) {
      await selectGroup(target.groupId)
      if (target.groupSessionId && target.groupSessionId !== currentGroupSessionId.value) {
        await selectGroupSession(target.groupSessionId)
      }
      if (target.messageId || Number.isInteger(target.messageIndex)) await loadMessages(1000)
      
      if (target.autoMessage) {
        await nextTick()
        newMessage.value = target.autoMessage
        await nextTick()
        sendMessage()
      } else if (target.messageId || Number.isInteger(target.messageIndex) || target.keyword) {
        await nextTick()
        const kw = String(target.keyword || '').toLowerCase()
        let idx = target.messageId ? messages.value.findIndex(m => String(m.id || m.message_id || m.messageId || '') === String(target.messageId)) : -1
        if (idx < 0 && Number.isInteger(target.messageIndex) && target.messageIndex >= 0 && target.messageIndex < messages.value.length) idx = target.messageIndex
        if (idx < 0 && kw) idx = messages.value.findIndex(m => (m.content || '').toLowerCase().includes(kw))
        if (idx !== -1) {
          highlightMsgIndex.value = idx
          const el = document.getElementById(`gc-msg-${idx}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => { highlightMsgIndex.value = -1 }, 3000)
        }
      }
    }
    emit('navigated')
  }

  watch(() => props.navigateTo, () => {
    if (props.navigateTo) setTimeout(handleGroupNavigation, 100)
  }, { immediate: true })

  const highlightMsgIndex = ref(-1)

  // 数据
  const groups = ref([])
  const projects = ref([])
  const currentGroup = ref(null)
  const messages = ref([])
  const groupSessions = ref([])
  const currentGroupSessionId = ref('')
  const groupMemory = ref(null)
  const mainAgentStatus = ref(null)
  const groupAgentQa = ref([])
  const collaborationProtocol = ref(null)
  const groupMessagesEl = ref(null)
  const groupMessagesContentEl = ref(null)
  const {
    isPinnedToBottom: isGroupMessagesPinnedToBottom,
    updateScrollState: updateGroupMessageScrollState,
    scrollToBottom,
    attachResizeObserver: attachGroupMessagesResizeObserver,
    detachResizeObserver: detachGroupMessagesResizeObserver,
  } = usePinnedScroll(groupMessagesEl, { observeRef: groupMessagesContentEl })
  const { navMessages } = useMessageNavigation(messages, { getAssistantContent: (message) => getVisibleGroupMessageContent(message, '这条回复已整理，技术细节已放入技术详情。') })

  const scrollToMessage = (originalIndex) => {
    const el = document.getElementById(`gc-msg-${originalIndex}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  const newMessage = ref('')
  const slashNavigate = inject('slashNavigate', () => {})
  const runGroupClientCommand = createSlashCommandClientActions({
    scope: 'group',
    messages: () => messages.value,
    sessions: () => groupSessions.value,
    currentSessionId: () => currentGroupSessionId.value,
    context: () => ({ group: currentGroup.value?.name || '', groupId: currentGroup.value?.id || '', sessionId: currentGroupSessionId.value || '' }),
    statusSummary: () => `群聊“${currentGroup.value?.name || '未选择'}”当前加载了 ${messages.value.length} 条消息。`,
    contextMetrics: () => ({ 群聊: currentGroup.value?.name || '未选择', 群聊ID: currentGroup.value?.id || '', 成员: currentGroup.value?.members?.length || 0 }),
    exportFilename: () => `ccm-group-${currentGroup.value?.id || 'context'}`,
    newSession: async () => {
      if (!currentGroup.value) throw new Error('请先选择群聊')
      await createGroupSession()
      return { success: true, summary: '已新建独立群聊会话。', metrics: { 群聊: currentGroup.value.name, 会话: currentGroupSessionId.value } }
    },
    clearSession: async () => {
      if (!currentGroup.value || !currentGroupSessionId.value) throw new Error('请先选择群聊会话')
      const response = await fetch('/api/groups/messages/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: currentGroup.value.id, session_id: currentGroupSessionId.value, clear_memory: false }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || '清空群聊会话失败')
      messages.value = []
      return { success: true, summary: `已清空当前群聊会话的 ${data.cleared || 0} 条消息，群聊记忆保持不变。`, metrics: { 已清空: data.cleared || 0 } }
    },
    renameSession: async (name) => {
      if (!currentGroup.value || !currentGroupSessionId.value) throw new Error('请先选择群聊会话')
      const data = await groupsApi.sessionAction(currentGroup.value.id, currentGroupSessionId.value, 'rename', { title: name })
      groupSessions.value = data.sessions || groupSessions.value
      return { success: true, summary: `当前群聊会话已重命名为“${name}”。`, metrics: { 群聊: currentGroup.value.name, 会话: currentGroupSessionId.value } }
    },
  })
  const pendingDirectMemoryCommand = ref(null)
  const slash = useSlashCommands({
    scope: 'group',
    input: newMessage,
    context: () => ({ group: currentGroup.value?.name || '', groupId: currentGroup.value?.id || '', sessionId: currentGroupSessionId.value || '', target: targetAgent.value }),
    focus: () => nextTick(() => document.getElementById('groupChatInput')?.focus()),
    onNavigate: (tab) => slashNavigate(tab),
    onPrompt: async (prompt, command, result) => {
      const commandName = String(command?.name || '').toLowerCase()
      if (['remember', 'forget'].includes(commandName)) {
        pendingDirectMemoryCommand.value = { action: commandName, content: String(result?.args || '').trim() }
        newMessage.value = pendingDirectMemoryCommand.value.content
      } else {
        pendingDirectMemoryCommand.value = null
        newMessage.value = prompt
      }
      await nextTick()
      await sendMessage()
    },
    onClientAction: runGroupClientCommand,
    onResult: (result) => {
      messages.value.push({ role: 'assistant', agent: 'command-center', type: 'command_result', commandResult: result, content: '', timestamp: new Date().toISOString() })
      nextTick(() => scrollToBottom())
    },
    onError: (message) => toast.error(message),
    onConfirm: (message) => confirmDialog(message)
  })
  const focusGroupInput = () => {
    const el = document.getElementById('groupChatInput')
    if (!el) return
    el.focus()
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
  const {
    showTemplateSelector,
    allTemplates,
    templateSearchQuery,
    activeTemplateIndex,
    recommendedTemplate,
    activeTemplate,
    templateVariables,
    showVariableModal,
    openTemplateSelector,
    selectChatTemplate,
    applyTemplateVariables,
    detectRecommendation,
    applyRecommendation,
    handleTemplateKeydown,
    hideTemplateAssist,
  } = useChatTemplates({
    input: newMessage,
    focusInput: focusGroupInput,
    onError: (message) => toast.error(message),
  })
  const messageFiles = ref([])
  const targetAgent = ref('all')
  const messageMode = ref('conversation')
  const pendingGroupTaskInput = ref(null)
  const pendingGroupClarificationInput = ref(null)
  const isTaskSupplementMode = computed(() => !!pendingGroupTaskInput.value
    && pendingGroupTaskInput.value.groupId === currentGroup.value?.id)
  const isClarificationResponseMode = computed(() => !!pendingGroupClarificationInput.value
    && pendingGroupClarificationInput.value.groupId === currentGroup.value?.id)
  const isDirectedGroupInputMode = computed(() => isTaskSupplementMode.value || isClarificationResponseMode.value)
  const groupComposerPlaceholder = computed(() => isTaskSupplementMode.value
    ? '补充当前任务需要的信息，发送后会沿用原任务继续执行和验收...'
    : isClarificationResponseMode.value
      ? '补充主 Agent 刚才询问的信息，发送后会接着原请求继续判断...'
      : '输入消息...（可 @ 项目执行成员，输入 / 打开命令中心）')
  const groupComposerSendLabel = computed(() => isStreaming.value
    ? '正在提交...'
    : isTaskSupplementMode.value ? '提交并继续' : isClarificationResponseMode.value ? '提交补充' : '发送 ➤')
  const cancelTaskSupplementInput = () => {
    pendingGroupTaskInput.value = null
    newMessage.value = ''
    messageFiles.value = []
    nextTick(focusGroupInput)
  }
  const beginTaskSupplementInput = (msg, card, action = {}) => {
    const taskId = String(action.task_id || card?.task_id || msg?.task_id || '').trim()
    const groupId = String(currentGroup.value?.id || '').trim()
    if (!taskId || !groupId) return
    pendingGroupClarificationInput.value = null
    pendingGroupTaskInput.value = {
      taskId,
      groupId,
      title: card?.title || '当前任务',
    }
    newMessage.value = ''
    messageFiles.value = []
    targetAgent.value = 'all'
    messageMode.value = 'project_task'
    mentionDropdown.value = false
    hideTemplateAssist()
    nextTick(focusGroupInput)
  }
  const getGroupClarificationContext = (msg) => msg?.clarificationContext || msg?.clarification_context || null
  const getGroupClarificationSummary = (msg) => msg?.clarificationSummary || msg?.clarification_summary || null
  const isPendingGroupClarification = (msg) => {
    const context = getGroupClarificationContext(msg)
    return !!context
      && String(context.status || 'pending') === 'pending'
      && !context.resolved_at
      && !context.resolvedAt
  }
  const beginGroupClarificationInput = (msg, { focus = true, clear = true } = {}) => {
    const context = getGroupClarificationContext(msg)
    if (!context || !isPendingGroupClarification(msg) || !currentGroup.value?.id) return false
    const summary = getGroupClarificationSummary(msg)
    pendingGroupTaskInput.value = null
    pendingGroupClarificationInput.value = {
      requestId: context.id || context.request_id || context.requestId || '',
      messageId: msg.id || context.response_message_id || context.responseMessageId || '',
      groupId: currentGroup.value.id,
      title: summary?.question || summary?.title || '补充当前请求',
      messageMode: context.message_mode || context.messageMode || 'conversation',
    }
    if (clear) {
      newMessage.value = ''
      messageFiles.value = []
    }
    targetAgent.value = 'all'
    messageMode.value = pendingGroupClarificationInput.value.messageMode
    mentionDropdown.value = false
    hideTemplateAssist()
    if (focus) nextTick(focusGroupInput)
    return true
  }
  const cancelGroupClarificationInput = () => {
    pendingGroupClarificationInput.value = null
    newMessage.value = ''
    messageFiles.value = []
    nextTick(focusGroupInput)
  }
  const syncPendingGroupClarificationInput = () => {
    const pending = [...messages.value].reverse().find(isPendingGroupClarification)
    if (!pending) {
      pendingGroupClarificationInput.value = null
      return
    }
    beginGroupClarificationInput(pending, { focus: false, clear: false })
  }
  let activeAgentStreamMsgs = {}
  const diffViewer = ref({ visible: false, file: null })
  const {
    codeChangeDrawer,
    openCodeChangeDrawer,
    openSingleFileChange,
    closeCodeChangeDrawer,
  } = useCodeChangeDrawer({ title: '群聊代码改动' })

  const pipelineViewer = ref({ visible: false, assignments: [], coordinationPlan: null, fileChanges: null, receipts: [], deliverySummary: null, status: 'pending', title: 'Agent 协作流' })
  const agentQaActionLoading = ref({})
  const openPipelineViewer = (msg) => {
    pipelineViewer.value = {
      visible: true,
      assignments: msg.assignments || [],
      coordinationPlan: msg.coordinationPlan || null,
      fileChanges: msg.fileChanges || null,
      receipts: msg.receipts || [],
      deliverySummary: msg.delivery_summary || msg.deliverySummary || null,
      status: msg.status || (msg.streaming ? 'running' : 'done'),
      title: 'Agent 协同流看板'
    }
  }
  const openMainAgentPipeline = () => {
    if (!mainAgentStatus.value?.latest_delivery_summary) return
    openPipelineViewer({
      delivery_summary: mainAgentStatus.value.latest_delivery_summary,
      status: mainAgentStatus.value.latest_delivery_summary.status || 'waiting'
    })
  }
  const hasMainAgentStatusDetail = computed(() => {
    return shouldShowGroupMainAgentStatus({
      hasGroup: !!currentGroup.value,
      status: mainAgentStatus.value,
      latestDecision: latestMainAgentDecision.value,
      groupAgentQa: groupAgentQa.value,
    })
  })
  const latestMainAgentDecisionEntry = computed(() => {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const card = getTaskCard(messages.value[i])
      const decision = card?.mainAgentDecision || card?.main_agent_decision || card?.technical?.mainAgentDecision || card?.technical?.main_agent_decision || getMainAgentDecision(messages.value[i])
      if (decision) return { decision, index: i, msg: messages.value[i] }
    }
    return null
  })
  const latestMainAgentDecision = computed(() => latestMainAgentDecisionEntry.value?.decision || null)
  const scrollToLatestMainDecision = () => {
    const entry = latestMainAgentDecisionEntry.value
    if (!entry) return
    scrollToMessage(entry.index)
  }

  const isCoordinatorProject = (project) => String(project || '') === 'coordinator'
  const getCoordinatorMember = (group = currentGroup.value) => {
    return group?.members?.find(m => m.role === 'coordinator' || isCoordinatorProject(m.project)) || null
  }
  const getRoutableMembers = (group = currentGroup.value) => {
    return (group?.members || []).filter(m => !isCoordinatorProject(m.project) && m.role !== 'coordinator')
  }
  const getMemberCountLabel = (group) => {
    const count = getRoutableMembers(group).length
    return `${count}成员 + 协调者`
  }
  const getMemoryCompression = () => groupMemory.value?.messageCompression || {}
  const getAgentMemoryCount = () => Object.keys(groupMemory.value?.agentMemories || {}).filter(Boolean).length
  const hasCompressedMemory = () => Number(getMemoryCompression().compressedMessages || 0) > 0 || getAgentMemoryCount() > 0
  const getMemoryCompressionLabel = () => {
    const stats = getMemoryCompression()
    const total = Number(stats.totalMessages || messages.value.length || 0)
    const compressed = Number(stats.compressedMessages || 0)
    const recent = Number(stats.recentMessages || stats.recentLimit || 0)
    return compressed > 0
      ? '上下文已压缩'
      : `上下文 ${total || messages.value.length} 条`
  }
  const getMemoryCompressionMeta = () => {
    const stats = getMemoryCompression()
    const compressed = Number(stats.compressedMessages || 0)
    const recent = Number(stats.recentMessages || stats.recentLimit || 0)
    return compressed > 0 ? `${compressed} → ${recent}` : '原文'
  }
  const getMemoryCompressionTitle = () => {
    const stats = getMemoryCompression()
    return `总消息 ${stats.totalMessages || messages.value.length || 0}；旧消息压缩 ${stats.compressedMessages || 0}；近期原文 ${stats.recentMessages || stats.recentLimit || 0}；执行成员记忆 ${getAgentMemoryCount()} 个`
  }
  const getAgentDisplayName = (agent) => {
    if (agent === 'system') return '系统'
    if (isCoordinatorProject(agent)) return '协调者'
    return agent || 'Agent'
  }
  const getWorkEvents = (msg) => Array.isArray(msg?.workEvents) ? msg.workEvents.filter(Boolean) : []
  const agentAccentPalette = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#be185d', '#4f46e5']
  const hashAgent = (agent) => String(agent || 'agent').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const getAgentAccent = (agent) => agentAccentPalette[hashAgent(agent) % agentAccentPalette.length]
  const getAgentAccentStyle = (agent) => ({ '--agent-accent': getAgentAccent(agent) })
  const getAgentInitials = (agent) => {
    const name = getAgentDisplayName(agent).replace(/[（）()]/g, ' ').trim()
    const parts = name.split(/\s+|[-_/]/).filter(Boolean)
    if (!parts.length) return 'A'
    return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
  }
  const getWorkPanelState = (msg) => {
    const events = getWorkEvents(msg)
    if (events.some(event => event.kind === 'error')) return { tone: 'fail', label: '失败' }
    if (msg?.streaming) return { tone: 'running', label: '执行中' }
    if (events.some(event => event.kind === 'done')) return { tone: 'ok', label: '完成' }
    return { tone: 'idle', label: events.length ? '等待结果说明' : '待执行' }
  }
  const getAgentMessageStatus = (msg) => {
    if (msg?.agent === 'system') return { tone: 'fail', label: '系统' }
    const state = getWorkPanelState(msg)
    if (getWorkEvents(msg).length) return state
    if (msg?.streaming) return { tone: 'running', label: '思考中' }
    return { tone: 'idle', label: '回复' }
  }
  const isGroupMainAgentMessage = (msg) => isCoordinatorProject(msg?.agent) || msg?.type === 'project_task_intake'
  const getTaskRuntime = (msg) => msg?.taskRuntime || msg?.task_runtime || null
  const isLegacyNonTaskCard = (card) => {
    if (!card) return false
    const text = String(`${card.title || ''} ${card.goal || ''}`).replace(/\s+/g, '')
    const greetingOnly = /^(你好|您好|hi|hello|hey|在吗|在不在|早上好|下午好|晚上好|谢谢|感谢|ok|好的|嗯|哦|哈喽)+[。.!！?？]*$/i.test(text)
    const hasEvidence = card.delivery?.files?.length || card.delivery?.verification?.length || card.completed?.length || card.agents?.some?.(agent => ['done', 'running', 'failed', 'partial', 'reviewing'].includes(String(agent.status || '')))
    return greetingOnly && !hasEvidence
  }
  const getTaskCard = (msg) => {
    const card = msg?.taskCard || msg?.task_card || getTaskRuntime(msg)?.taskCard || getTaskRuntime(msg)?.task_card || null
    if (card?.visible === false) return null
    if (isLegacyNonTaskCard(card)) return null
    return card
  }
  const shouldShowOrchestrationPlan = (msg) => {
    if (!msg || getTaskCard(msg)) return false
    const assignments = Array.isArray(msg.assignments) ? msg.assignments : []
    if (assignments.length > 0) return true
    if (msg.coordinationPlan?.phases?.length) return true
    const action = String(msg.dispatchPolicy?.action || '')
    return action === 'delegate'
  }
  const isInternalProtocolMessage = (msg) => {
    const content = String(msg?.content || '')
    if (msg?.task_id && ['agent_qa', 'agent_qa_resume', 'conflict_plan', 'task_rehearsal'].includes(String(msg?.type || ''))) return true
    const protocolPayload = /CCM_AGENT_RECEIPT|"ccm_receipt"|<task-notification>|【主 Agent 业务开发工作单】|主 Agent 返工工作单|任务前沙盘演练|主 Agent 派发修复|【任务需要继续处理】|📋\s*\*{0,2}(?:规则)?协调复盘/i.test(content)
    const generatedContinuation = /^任务补充说明[：:]\s*请继续推进任务/.test(content)
      || (content.includes('需要补齐的主 Agent 协作证据') && content.includes('继续执行要求'))
    return protocolPayload || generatedContinuation
  }
  const getMessageTaskId = (msg) => msg?.task_id || msg?.task?.id || ''
  const isPrimaryTaskMessage = (msg, index) => {
    const taskId = getMessageTaskId(msg)
    if (!taskId || isInternalProtocolMessage(msg)) return false
    return messages.value.findIndex((item) => getMessageTaskId(item) === taskId && !isInternalProtocolMessage(item)) === index
  }
  const shouldShowGroupMessage = (msg, index) => {
    if (isInternalProtocolMessage(msg)) return false
    const taskId = getMessageTaskId(msg)
    if (!taskId) return true
    if (isPrimaryTaskMessage(msg, index)) return true
    // 用户主动补充仍属于对话；Agent 工作单、结果说明、执行输出统一进入任务卡技术详情。
    return msg.role === 'user' && !/【主 Agent 业务开发工作单】|任务前沙盘演练|CCM_AGENT_RECEIPT|task-notification/i.test(String(msg.content || ''))
  }
  const isPrimaryTaskCard = (msg, index) => {
    return !!getTaskCard(msg) && isPrimaryTaskMessage(msg, index)
  }
  const handleTaskCardAction = createGroupTaskCardActionHandler({
    getTaskCard,
    getCurrentGroup: () => currentGroup.value,
    openCodeChangeDrawer: (...args) => openCodeChangeDrawer(...args),
    openPipelineViewer,
    openTraceReplay: (target = {}) => {
      localStorage.setItem('trace-replay-target', JSON.stringify({ scope: target.scope || 'orchestrator', task_id: target.task_id || target.taskId || '', trace_id: target.trace_id || '', at: Date.now() }))
      slashNavigate?.('trace-replay')
      window.dispatchEvent(new CustomEvent('trace-replay-target', { detail: { scope: target.scope || 'orchestrator', task_id: target.task_id || target.taskId || '', trace_id: target.trace_id || '' } }))
    },
    beginTaskInput: beginTaskSupplementInput,
    loadMessages: () => loadMessages(),
  })
  const taskRuntimeStatusLabel = (status) => ({ pending: '待执行', in_progress: '执行中', blocked: '受阻', done: '已完成', failed: '失败', cancelled: '已取消' }[status] || status || '执行中')
  const taskRuntimeAgentState = (state) => ({ queued: '排队', spawning: '启动', ready: '就绪', prompt_accepted: '已接单', running: '执行中', reviewing: '验收', succeeded: '完成', failed: '失败', cancel_requested: '停止中', cancelled: '已取消' }[state] || state || '等待')
  const taskRuntimeGreenLabel = (green) => ({ none: '未验收', targeted: '局部绿', project: '项目绿', workspace: '工作区绿', merge_ready: '可合并' }[green] || green || '未验收')
  const applyTransientTaskRuntime = (taskId, updater) => {
    if (!taskId) return
    messages.value.forEach((msg) => {
      if (msg.task_id !== taskId) return
      const current = getTaskRuntime(msg) || { taskId, status: msg.task?.status || 'in_progress', counts: {}, agents: [], sessions: [] }
      const next = updater({ ...current, agents: [...(current.agents || [])], sessions: [...(current.sessions || [])] })
      msg.taskRuntime = next
      msg.task_runtime = next
      msg.taskCard = next?.taskCard || next?.task_card || msg.taskCard || msg.task_card || null
      msg.task_card = next?.task_card || next?.taskCard || msg.task_card || msg.taskCard || null
    })
  }
  let latestTestAgentFallbackTaskId = ''
  const resolveTestAgentFallbackTaskId = (data = {}, source = {}, prefix = 'test-agent-review') => {
    const explicit = data.taskId
      || data.task_id
      || data.workOrderId
      || data.work_order_id
      || source?.workOrderId
      || source?.work_order_id
      || ''
    if (explicit) {
      latestTestAgentFallbackTaskId = explicit
      return explicit
    }
    if (latestTestAgentFallbackTaskId && prefix === 'test-agent-review') return latestTestAgentFallbackTaskId
    const generated = `${prefix}-${data.trace_id || data.traceId || Date.now()}`
    latestTestAgentFallbackTaskId = generated
    return generated
  }
  const createTestAgentExecutionPlanFallbackMessage = (data = {}, summary = {}, plan = null) => {
    const taskId = resolveTestAgentFallbackTaskId(data, plan, 'test-agent-plan')
    const blocked = summary.status === 'blocked'
    const headline = sanitizeGroupVisibleText(summary.headline || data.detail, 'TestAgent 复核计划已整理。', 360)
    const nextAction = sanitizeGroupVisibleText(summary.next_action || summary.nextAction || (blocked ? '先修复复核计划里的阻塞项。' : '按计划启动 TestAgent 独立复核。'), blocked ? '先修复复核计划里的阻塞项。' : '按计划启动 TestAgent 独立复核。', 260)
    const taskCard = {
      version: 1,
      visible: true,
      task_id: taskId,
      title: data.title || 'TestAgent 复核计划',
      goal: data.goal || '展示 TestAgent 复核计划，并跟进后续独立复核结果。',
      phase: blocked ? 'blocked' : 'reviewing',
      phase_label: blocked ? '需修复' : '复核准备中',
      progress: blocked ? 38 : 58,
      active_agents: [blocked ? '等待修复复核计划' : '等待 TestAgent 复核'],
      agents: [{ name: 'TestAgent', status: blocked ? 'blocked' : 'reviewing', summary: headline }],
      completed: ['已生成 TestAgent 复核计划'],
      blockers: blocked ? [...(Array.isArray(summary.issues) ? summary.issues : [])].slice(0, 4) : [],
      next_action: nextAction,
      test_agent_execution_plan: plan,
      testAgentExecutionPlan: plan,
      test_agent_execution_plan_summary: summary,
      testAgentExecutionPlanSummary: summary,
      test_agent_execution_plan_detail: data.detail || '',
      testAgentExecutionPlanDetail: data.detail || '',
      display_stream: {
        schema: 'ccm-streamlined-display-v2',
        user_visible_text: headline,
        tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: 'TestAgent 复核计划已返回' },
      },
      technical: {
        trace_id: data.trace_id || data.traceId || '',
        test_agent_execution_plan: plan,
        raw_event_type: 'test_agent_execution_plan_ready',
      },
    }
    const taskRuntime = {
      taskId,
      status: blocked ? 'blocked' : 'in_progress',
      statusText: headline,
      taskCard,
      task_card: taskCard,
      testAgentExecutionPlan: plan,
      test_agent_execution_plan: plan,
      testAgentExecutionPlanSummary: summary,
      test_agent_execution_plan_summary: summary,
    }
    return {
      id: `test-agent-plan-${taskId}`,
      role: 'assistant',
      agent: 'coordinator',
      type: 'project_task_intake',
      content: headline,
      timestamp: new Date().toISOString(),
      task_id: taskId,
      task: {
        id: taskId,
        title: taskCard.title,
        status: taskRuntime.status,
        status_detail: headline,
        workflow_type: 'test_agent_review',
      },
      taskCard,
      task_card: taskCard,
      taskRuntime,
      task_runtime: taskRuntime,
    }
  }
  const applyTestAgentExecutionPlanReady = (data = {}) => {
    const plan = data.test_agent_execution_plan || data.testAgentExecutionPlan || data.technical?.test_agent_execution_plan || null
    const summary = normalizeTestAgentExecutionPlanSummary(plan, data.test_agent_execution_plan_summary || data.testAgentExecutionPlanSummary || data.detail || null, data.detail || '')
    if (!summary) return false
    const runtimeStatus = summary.status === 'blocked' ? 'blocked' : 'in_progress'
    const taskId = data.taskId || data.task_id || ''
    let applied = false
    applyTransientTaskRuntime(taskId, (runtime) => {
      const currentCard = runtime.taskCard || runtime.task_card || {}
      const nextCard = {
        ...currentCard,
        test_agent_execution_plan: plan,
        testAgentExecutionPlan: plan,
        test_agent_execution_plan_summary: summary,
        testAgentExecutionPlanSummary: summary,
        test_agent_execution_plan_detail: data.detail || '',
        testAgentExecutionPlanDetail: data.detail || '',
      }
      applied = true
      return {
        ...runtime,
        status: runtimeStatus,
        statusText: summary.headline,
        taskCard: nextCard,
        task_card: nextCard,
        testAgentExecutionPlan: plan,
        test_agent_execution_plan: plan,
        testAgentExecutionPlanSummary: summary,
        test_agent_execution_plan_summary: summary,
      }
    })
    if (!applied) {
      mergeIncomingMessage(createTestAgentExecutionPlanFallbackMessage(data, summary, plan))
      applied = true
    }
    return applied
  }
  const getTestAgentReviewPayload = (data = {}) => {
    const summary = data.test_agent_review_summary
      || data.testAgentReviewSummary
      || data.independent_review_summary
      || data.independentReviewSummary
      || null
    const rows = Array.isArray(data.independent_review)
      ? data.independent_review
      : Array.isArray(data.independentReview)
        ? data.independentReview
        : []
    if (!summary && !rows.length) return null
    return {
      summary: summary ? sanitizeUserFacingStructure(summary, { fallback: 'TestAgent 独立复核结论已整理。', max: 420 }) : null,
      rows: sanitizeUserFacingStructure(rows, { fallback: 'TestAgent 独立复核证据已整理。', max: 240 }),
      report: data.test_agent_report || data.testAgentReport || data.technical?.test_agent_report || null,
      detail: data.detail || data.message || data.text || '',
    }
  }

  const testAgentReviewPhase = (status) => {
    const value = String(status || '').toLowerCase()
    if (value === 'needs_rework') return { phase: 'failed', phaseLabel: '需返工', runtimeStatus: 'blocked', agentStatus: 'failed' }
    if (value === 'needs_recheck') return { phase: 'reviewing', phaseLabel: '需复验', runtimeStatus: 'blocked', agentStatus: 'blocked' }
    if (value === 'needs_user') return { phase: 'needs_user', phaseLabel: '等你确认', runtimeStatus: 'blocked', agentStatus: 'blocked' }
    if (value === 'passed') return { phase: 'reviewing', phaseLabel: '复核已返回', runtimeStatus: 'in_progress', agentStatus: 'done' }
    return { phase: 'reviewing', phaseLabel: '复核已记录', runtimeStatus: 'in_progress', agentStatus: 'reviewing' }
  }

  const createTestAgentReviewFallbackMessage = (data = {}, summary = {}, payload = {}) => {
    const taskId = resolveTestAgentFallbackTaskId(data, payload.report, 'test-agent-review')
    const phase = testAgentReviewPhase(summary.status)
    const rows = Array.isArray(payload.rows) && payload.rows.length ? payload.rows : Array.isArray(summary.rows) ? summary.rows : []
    const headline = sanitizeGroupVisibleText(summary.headline || payload.detail, 'TestAgent 独立复核结论已整理。', 360)
    const nextAction = sanitizeGroupVisibleText(summary.next_action || summary.nextAction || '继续等待完整复核证据或最终总结。', '继续等待完整复核证据或最终总结。', 260)
    const taskCard = {
      version: 1,
      visible: true,
      task_id: taskId,
      title: data.title || 'TestAgent 独立复核',
      goal: data.goal || '展示 TestAgent 返回的独立复核结论，并等待后续验收或返工。',
      phase: phase.phase,
      phase_label: phase.phaseLabel,
      progress: phase.runtimeStatus === 'blocked' ? 72 : 84,
      active_agents: phase.phase === 'failed'
        ? ['正在安排返工']
        : summary.status === 'needs_recheck'
          ? ['正在安排重新复验']
        : phase.phase === 'needs_user'
          ? ['等待你确认复核问题']
          : ['正在纳入复核结论'],
      agents: [{ name: 'TestAgent', status: phase.agentStatus, summary: headline }],
      completed: ['已收到 TestAgent 独立复核结论'],
      blockers: phase.runtimeStatus === 'blocked' ? rows.slice(0, 4) : [],
      next_action: nextAction,
      independent_review_summary: summary,
      independentReviewSummary: summary,
      test_agent_review_summary: summary,
      testAgentReviewSummary: summary,
      independent_review: rows,
      independentReview: rows,
      test_agent_report: payload.report || null,
      testAgentReport: payload.report || null,
      display_stream: {
        schema: 'ccm-streamlined-display-v2',
        user_visible_text: headline,
        tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: 'TestAgent 独立复核结论已返回' },
      },
      technical: {
        trace_id: data.trace_id || data.traceId || '',
        test_agent_report: payload.report || data.test_agent_report || data.testAgentReport || null,
        raw_event_type: 'test_agent_review_ready',
      },
    }
    const taskRuntime = {
      taskId,
      status: phase.runtimeStatus,
      statusText: headline,
      taskCard,
      task_card: taskCard,
      independent_review_summary: summary,
      independentReviewSummary: summary,
      test_agent_review_summary: summary,
      testAgentReviewSummary: summary,
    }
    return {
      id: `test-agent-review-${taskId}`,
      role: 'assistant',
      agent: 'coordinator',
      type: 'project_task_intake',
      content: headline,
      timestamp: new Date().toISOString(),
      task_id: taskId,
      task: {
        id: taskId,
        title: taskCard.title,
        status: phase.runtimeStatus,
        status_detail: headline,
        workflow_type: 'test_agent_review',
      },
      taskCard,
      task_card: taskCard,
      taskRuntime,
      task_runtime: taskRuntime,
    }
  }

  const applyTestAgentReviewReady = (data = {}) => {
    const payload = getTestAgentReviewPayload(data)
    if (!payload) return false
    const summary = payload.summary || {
      schema: 'ccm-main-agent-independent-review-summary-v1',
      title: '独立复核',
      status: 'recorded',
      status_label: '已记录',
      headline: sanitizeGroupVisibleText(payload.detail, 'TestAgent 独立复核结论已整理。', 360),
      rows: payload.rows,
      next_action: '继续等待完整复核证据或最终总结。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    }
    const taskId = data.taskId || data.task_id || ''
    const runtimeStatus = summary.status === 'needs_rework'
      ? 'blocked'
      : summary.status === 'needs_recheck' || summary.status === 'needs_user'
        ? 'blocked'
        : summary.status === 'passed'
          ? 'in_progress'
          : 'in_progress'
    let applied = false
    applyTransientTaskRuntime(taskId, (runtime) => {
      const currentCard = runtime.taskCard || runtime.task_card || {}
      const existingRows = Array.isArray(currentCard.independent_review)
        ? currentCard.independent_review
        : Array.isArray(currentCard.independentReview)
          ? currentCard.independentReview
          : []
      const nextRows = payload.rows.length ? payload.rows : existingRows
      const nextCard = {
        ...currentCard,
        independent_review_summary: summary,
        independentReviewSummary: summary,
        test_agent_review_summary: summary,
        testAgentReviewSummary: summary,
        independent_review: nextRows,
        independentReview: nextRows,
        test_agent_report: payload.report || currentCard.test_agent_report || currentCard.testAgentReport || null,
        testAgentReport: payload.report || currentCard.testAgentReport || currentCard.test_agent_report || null,
      }
      applied = true
      return {
        ...runtime,
        status: runtimeStatus,
        statusText: summary.headline,
        taskCard: nextCard,
        task_card: nextCard,
        independent_review_summary: summary,
        independentReviewSummary: summary,
        test_agent_review_summary: summary,
        testAgentReviewSummary: summary,
      }
    })
    if (!applied) {
      mergeIncomingMessage(createTestAgentReviewFallbackMessage(data, summary, payload))
      applied = true
    }
    return applied
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
  const getTargetDisplayName = (target) => {
    if (target === 'all' || isCoordinatorProject(target)) return '协调者'
    return target || 'Agent'
  }

  const isAgentQaMessage = (msg) => msg?.type === 'agent_qa' || msg?.type === 'agent_qa_resume'
  const runAgentQaAction = async (msg, action) => {
    const qa = msg?.qa || {}
    if (!qa.id) return
    if (action === 'retry') {
      const confirmed = await confirmDialog(`确定重试 ${getAgentDisplayName(qa.to_agent)} 的回答？`)
      if (!confirmed) return
    }
    if (action === 'manual') {
      const confirmed = await confirmDialog('确定将这条协作问答标记为人工接手？')
      if (!confirmed) return
    }
    const key = `${qa.id}:${action}`
    agentQaActionLoading.value = { ...agentQaActionLoading.value, [key]: true }
    try {
      const endpoint = action === 'retry'
        ? '/api/agent-qa/retry'
        : action === 'manual'
          ? '/api/agent-qa/manual-takeover'
          : '/api/agent-qa/arbitrate'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: qa.id, decision: action, reason: action === 'accept' ? '用户在群聊界面采纳该回答' : action === 'reject' ? '用户在群聊界面拒绝该回答' : '用户在群聊界面接管该问答' })
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || '操作失败')
      toast.success(action === 'retry' ? '已重试协作问答' : action === 'manual' ? '已标记人工接手' : action === 'accept' ? '已采纳回答' : '已拒绝回答')
      await loadMessages()
    } catch (err) {
      toast.error((action === 'retry' ? '重试失败：' : '接管失败：') + (err?.message || err))
    } finally {
      const next = { ...agentQaActionLoading.value }
      delete next[key]
      agentQaActionLoading.value = next
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

  // 弹窗状态
  const showCreate = ref(false)
  const showRename = ref(false)
  const showMembers = ref(false)
  const showTools = ref(false)
  const showSharedFiles = ref(false)
  const showLogs = ref(false)
  const groupTools = ref({ mcp: [], skill: [] })
  const groupAllTools = ref({ mcp: [], skill: [] })
  const groupToolAudit = ref(null)
  const groupAuthorizationReadiness = ref(null)
  const groupConnectionPreflight = ref(null)
  const groupToolVerification = ref(null)

  // 表单
  const newGroupName = ref('')
  const renameName = ref('')
  const mentionDropdown = ref(false)
  const mentionFilter = ref('')
  const mentionIndex = ref(0)

  // 加载数据
  const loadGroups = async () => {
    const data = await groupsApi.list()
    groups.value = data.groups || []
    // 自动选择第一个群聊
    if (groups.value.length > 0 && !currentGroup.value) {
      selectGroup(groups.value[0].id)
    }
  }

  const loadProjects = async () => {
    const data = await projectsApi.list()
    projects.value = data.projects || []
  }

  // 选择群聊
  let selectGroup = async (id) => {
    if (pendingGroupTaskInput.value && pendingGroupTaskInput.value.groupId !== id) {
      pendingGroupTaskInput.value = null
      newMessage.value = ''
      messageFiles.value = []
    }
    if (pendingGroupClarificationInput.value && pendingGroupClarificationInput.value.groupId !== id) {
      pendingGroupClarificationInput.value = null
      newMessage.value = ''
      messageFiles.value = []
    }
    const changedGroup = currentGroup.value?.id !== id
    currentGroup.value = groups.value.find(g => g.id === id)
    if (changedGroup) {
      currentGroupSessionId.value = ''
      groupSessions.value = []
    }
    isGroupMessagesPinnedToBottom.value = true
    await loadMessages()
    // 如果有挂起的待使用模板，在此应用
    if (pendingTemplateToApply.value) {
      selectChatTemplate(pendingTemplateToApply.value)
      pendingTemplateToApply.value = null
      if (activeSelectedTemplate) {
        activeSelectedTemplate.value = null
      }
    }
  }

  // 加载消息
  const loadMessages = async (limit = 100) => {
    if (!currentGroup.value) return
    const data = await groupsApi.messages(currentGroup.value.id, limit, currentGroupSessionId.value)
    groupSessions.value = data.sessions || groupSessions.value
    currentGroupSessionId.value = data.sessionId || currentGroupSessionId.value || groupSessions.value[0]?.id || ''
    try {
      const protocolRes = await fetch(`/api/agent-collaboration/protocol?group_id=${encodeURIComponent(currentGroup.value.id)}&limit=100`)
      collaborationProtocol.value = protocolRes.ok ? await protocolRes.json() : null
    } catch {
      collaborationProtocol.value = null
    }
    groupMemory.value = data.memory || null
    mainAgentStatus.value = data.mainAgentStatus || null
    groupAgentQa.value = data.agentQa || []
    messages.value = (data.messages || []).filter(m => !m.content?.startsWith('📤'))
    syncPendingGroupClarificationInput()
    scrollToBottom({ force: true })
    // 延迟多次滚动，防范 Markdown/Diff 渲染等重排引起的高度时差
    setTimeout(() => scrollToBottom({ force: true }), 60)
    setTimeout(() => scrollToBottom({ force: true }), 220)
  }

  const selectGroupSession = async sessionId => {
    if (!currentGroup.value || !sessionId || sessionId === currentGroupSessionId.value) return
    await groupsApi.selectSession(currentGroup.value.id, sessionId)
    currentGroupSessionId.value = sessionId
    messages.value = []
    await loadMessages()
  }

  const createGroupSession = async () => {
    if (!currentGroup.value) return
    try {
      const data = await groupsApi.createSession(currentGroup.value.id)
      groupSessions.value = data.sessions || []
      currentGroupSessionId.value = data.session?.id || data.activeSessionId || ''
      messages.value = []
      groupMemory.value = null
      await loadMessages()
      toast.success('已新建独立群聊会话')
    } catch (error) {
      toast.error(error.message || '新建会话失败')
    }
  }

  const renameGroupSession = async () => {
    if (!currentGroup.value || !currentGroupSessionId.value) return
    const current = groupSessions.value.find(item => item.id === currentGroupSessionId.value)
    const title = window.prompt('会话名称', current?.title || '新会话')
    if (!title?.trim()) return
    try {
      const data = await groupsApi.sessionAction(currentGroup.value.id, currentGroupSessionId.value, 'rename', { title: title.trim() })
      groupSessions.value = data.sessions || groupSessions.value
      toast.success('会话已重命名')
    } catch (error) {
      toast.error(error.message || '重命名会话失败')
    }
  }

  const archiveGroupSession = async () => {
    if (!currentGroup.value || !currentGroupSessionId.value) return
    if (!await confirmDialog('归档当前会话？归档后会切换到其他可用会话。')) return
    try {
      const data = await groupsApi.sessionAction(currentGroup.value.id, currentGroupSessionId.value, 'archive')
      groupSessions.value = data.sessions || []
      currentGroupSessionId.value = data.activeSessionId || groupSessions.value.find(item => !item.archived)?.id || ''
      messages.value = []
      await loadMessages()
      toast.success('会话已归档')
    } catch (error) {
      toast.error(error.message || '归档会话失败')
    }
  }

  const deleteGroupSession = async () => {
    if (!currentGroup.value || !currentGroupSessionId.value) return
    const current = groupSessions.value.find(item => item.id === currentGroupSessionId.value)
    if (!await confirmDialog(`确定删除会话“${current?.title || '当前会话'}”？消息、压缩状态和会话记忆将一起删除。`)) return
    try {
      const data = await groupsApi.sessionAction(currentGroup.value.id, currentGroupSessionId.value, 'delete')
      groupSessions.value = data.sessions || []
      currentGroupSessionId.value = data.activeSessionId || groupSessions.value.find(item => !item.archived)?.id || groupSessions.value[0]?.id || ''
      messages.value = []
      await loadMessages()
      toast.success('会话及其记忆已删除')
    } catch (error) {
      toast.error(error.message || '删除会话失败')
    }
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
    const existingIndex = messages.value.findIndex(m => (msg.id && m.id === msg.id) || isEquivalentMessage(m, msg))
    if (existingIndex >= 0) {
      const current = messages.value[existingIndex]
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

  const formatFileSize = (size) => {
    if (!size) return '0 B'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }

  const onMessageFilesSelected = (files) => {
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        toast.warning(`${file.name} 超过 25 MB，未添加`)
        continue
      }
      if (!messageFiles.value.some(item => item.name === file.name && item.size === file.size)) messageFiles.value.push(file)
    }
  }

  const removeMessageFile = (index) => {
    messageFiles.value.splice(index, 1)
  }

  const openFileDiff = (file) => {
    openSingleFileChange(file)
  }

  const openDrawerChangesTab = (project) => {
    if (project) toast.info(`已在抽屉展示 ${project} 的本轮改动`)
  }


  const closeFileDiff = () => {
    diffViewer.value = { visible: false, file: null }
  }

  const getFileChangesTitle = (fileChanges) => {
    const files = fileChanges?.files || []
    const counts = files.reduce((acc, file) => {
      const kind = file.statusKind || ''
      if (kind === 'added') acc.added++
      else if (kind === 'deleted') acc.deleted++
      else acc.modified++
      return acc
    }, { added: 0, modified: 0, deleted: 0 })
    const parts = []
    if (counts.added) parts.push(`新增 ${counts.added}`)
    if (counts.modified) parts.push(`修改 ${counts.modified}`)
    if (counts.deleted) parts.push(`删除 ${counts.deleted}`)
    return parts.length ? `📁 变更了 ${files.length} 个文件（${parts.join('，')}）` : `📁 变更了 ${fileChanges?.count || 0} 个文件`
  }

  const getExecutionOrderLabel = (order) => {
    if (order === 'backend_first') return '后端优先'
    if (order === 'sequential') return '顺序执行'
    return '并行执行'
  }

  const workflowSteps = [
    { key: 'understanding', label: '理解' },
    { key: 'dispatching', label: '拆分' },
    { key: 'executing', label: '执行' },
    { key: 'reviewing', label: '验收' },
    { key: 'complete', label: '完成' }
  ]

  const getWorkflowPhase = (msg) => {
    const explicit = msg?.workflow?.phase
    if (explicit) return explicit
    const assignments = msg?.assignments || []
    if (!assignments.length) return 'understanding'
    const statuses = assignments.map(item => item.status || 'pending')
    if (statuses.some(status => ['failed', 'blocked', 'needs_info', 'partial'].includes(status))) return 'needs_rework'
    if (statuses.some(status => status === 'running')) return 'executing'
    if (statuses.every(status => status === 'done')) return 'reviewing'
    return 'dispatching'
  }

  const getWorkflowStepState = (msg, stepKey) => {
    const phase = getWorkflowPhase(msg)
    if (phase === 'rework' || phase === 'needs_rework' || phase === 'needs_recheck') {
      if (stepKey === 'reviewing') return 'active warning'
      if (['understanding', 'dispatching', 'executing'].includes(stepKey)) return 'done'
      return ''
    }
    if (phase === 'needs_user') {
      if (stepKey === 'reviewing') return 'active warning'
      if (['understanding', 'dispatching', 'executing'].includes(stepKey)) return 'done'
      return ''
    }
    const order = workflowSteps.map(step => step.key)
    const current = order.indexOf(phase)
    const idx = order.indexOf(stepKey)
    if (current === -1 || idx === -1) return ''
    if (idx < current) return 'done'
    if (idx === current) return 'active'
    return ''
  }

  const getWorkflowLabel = (msg) => {
    const phase = getWorkflowPhase(msg)
    if (msg?.workflow?.label) return msg.workflow.label
    if (phase === 'rework' || phase === 'needs_rework') return '验收返工'
    if (phase === 'needs_recheck') return '重新复验'
    if (phase === 'needs_user') return '等待用户'
    if (phase === 'reviewing') return '最终验收'
    if (phase === 'complete') return '协作完成'
    if (phase === 'executing') return '执行成员执行中'
    if (phase === 'dispatching') return '任务拆分'
    return '需求理解'
  }

  const getDispatchActionLabel = (action) => {
    if (action === 'delegate') return '安排执行成员'
    if (action === 'ask_user') return '先问用户'
    if (action === 'hold') return '暂不执行'
    if (action === 'direct_answer') return '直接回复'
    return '派发决策'
  }

  const getPlanTitle = (msg) => {
    if (getWorkflowPhase(msg) === 'rework' || (msg.assignments || []).some(item => item.rework)) return '返工计划'
    if (msg?.workflow?.label) return msg.workflow.label
    return '执行计划'
  }

  const compactPlanText = (text, max = 180) => {
    const value = sanitizeGroupVisibleText(text, '计划详情已整理，可在技术详情查看。', max).replace(/\s+/g, ' ').trim()
    return value.length > max ? value.slice(0, max) + '...' : value
  }

  const getAssignmentStatusLabel = (status) => {
    if (status === 'running') return '执行中'
    if (status === 'done') return '已完成'
    if (status === 'partial') return '部分完成'
    if (status === 'blocked') return '阻塞'
    if (status === 'needs_info') return '需补充信息'
    if (status === 'failed') return '失败'
    return '待处理'
  }

  const getAssignmentStatusClass = (status) => {
    if (status === 'running') return 'running'
    if (status === 'done') return 'done'
    if (status === 'partial') return 'partial'
    if (status === 'blocked') return 'blocked'
    if (status === 'needs_info') return 'needs-info'
    if (status === 'failed') return 'failed'
    return 'pending'
  }

  const getAssignmentIdentity = (item = {}) => ({
    assignmentId: String(item.assignmentId || item.assignment_id || item.id || ''),
    dispatchKey: String(item.dispatchKey || item.dispatch_key || ''),
    project: String(item.project || item.agent || item.target_project || item.targetName || '')
  })

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

  const getDiffLineClass = (line) => {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return 'meta'
    if (line.startsWith('+')) return 'add'
    if (line.startsWith('-')) return 'remove'
    return 'context'
  }

  // @提及处理
  const handleInput = (e) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    const beforeCursor = value.substring(0, cursorPos)

    if (isDirectedGroupInputMode.value) {
      mentionDropdown.value = false
      hideTemplateAssist()
      return
    }

    if (slash.onInput()) {
      mentionDropdown.value = false
      hideTemplateAssist()
      return
    }
    if (value.startsWith('/')) {
      mentionDropdown.value = false
      hideTemplateAssist()
      return
    }

    // @提及指令拦截
    const atIndex = beforeCursor.lastIndexOf('@')
    if (atIndex >= 0 && !beforeCursor.substring(atIndex).includes(' ')) {
      mentionFilter.value = beforeCursor.substring(atIndex + 1).toLowerCase()
      mentionDropdown.value = true
      mentionIndex.value = 0
      hideTemplateAssist()
    } else {
      mentionDropdown.value = false
      showTemplateSelector.value = false
      detectRecommendation(value)
    }
  }

  const insertMention = (agent) => {
    const value = newMessage.value
    const atIndex = value.lastIndexOf('@')
    newMessage.value = value.substring(0, atIndex) + `@${agent} `
    mentionDropdown.value = false
    nextTick(() => document.getElementById('groupChatInput')?.focus())
  }

  const handleKeydown = async (e) => {
    if (isDirectedGroupInputMode.value) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
      return
    }
    if (await slash.onKeydown(e)) return
    // 1. 处理 @提及下拉菜单键盘控制
    if (mentionDropdown.value) {
      const agents = getFilteredAgents()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        mentionIndex.value = (mentionIndex.value + 1) % agents.length
        return
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        mentionIndex.value = (mentionIndex.value - 1 + agents.length) % agents.length
        return
      } else if (e.key === 'Enter' && !e.shiftKey) {
        if (agents.length > 0) {
          e.preventDefault()
          insertMention(agents[mentionIndex.value])
          return
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        mentionDropdown.value = false
        return
      }
    } 
    
    if (handleTemplateKeydown(e)) return

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getFilteredAgents = () => {
    if (!currentGroup.value) return []
    return getRoutableMembers()
      .map(m => m.project)
      .filter(p => p.toLowerCase().includes(mentionFilter.value))
  }

  // 高亮 @mentions
  const highlightMentions = (text) => {
    if (!text) return ''
    return text.replace(/@([\w-]+)/g, (_match, name) => {
      const label = getAgentDisplayName(name)
      return `<span style="color:var(--accent-blue);font-weight:600">@${label}</span>`
    })
  }

  const updateCreateGroupProjectSelection = ({ name, selected }) => {
    const project = projects.value.find(p => p.name === name)
    if (project) project.selected = selected
  }

  // 创建群聊
  const submitCreateGroup = async () => {
    if (!newGroupName.value.trim()) { toast.warning('请输入群聊名称'); return }

    const selectedProjects = projects.value.filter(p => p.selected).map(p => ({
      project: p.name,
      agent: p.agent || 'claudecode'
    }))

    const res = await groupsApi.create({ name: newGroupName.value, members: selectedProjects })
    if (res.success) {
      showCreate.value = false
      newGroupName.value = ''
      await loadGroups()
      selectGroup(res.group.id)
      toast.success('群聊创建成功！')
    } else {
      toast.error('创建失败: ' + (res.error || '未知错误'))
    }
  }

  // 重命名群聊
  const submitRename = async () => {
    if (!renameName.value.trim()) { toast.warning('请输入名称'); return }
    await groupsApi.rename({ id: currentGroup.value.id, name: renameName.value })
    currentGroup.value.name = renameName.value
    showRename.value = false
    loadGroups()
    toast.success('群聊已重命名')
  }

  // 删除群聊
  const deleteGroup = async () => {
    const confirmed = await confirmDialog(`确定删除群聊 "${currentGroup.value.name}"？删除后无法恢复。`)
    if (!confirmed) return
    await groupsApi.delete(currentGroup.value.id)
    currentGroup.value = null
    messages.value = []
    groupMemory.value = null
    loadGroups()
    toast.success('群聊已删除')
  }

  const clearGroupMessages = async () => {
    if (!currentGroup.value) return
    const clearMemory = await confirmDialog(`是否同时清空群聊“${currentGroup.value.name}”的压缩记忆？\n选择“确定”会清消息和记忆；选择“取消”只清消息。`)
    const confirmed = clearMemory || await confirmDialog(`确定只清空群聊“${currentGroup.value.name}”的聊天消息？`)
    if (!confirmed) return
    const res = await fetch('/api/groups/messages/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: currentGroup.value.id, session_id: currentGroupSessionId.value, clear_memory: clearMemory })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      toast.error(data.error || '清空群聊失败')
      return
    }
    messages.value = []
    if (data.memory_cleared) groupMemory.value = null
    toast.success(`已清空 ${data.cleared || 0} 条群聊消息`)
  }

  const saveCurrentGroupConversationKnowledge = async () => {
    if (!currentGroup.value || messages.value.length === 0) return toast.info('当前群聊还没有可沉淀的内容')
    try {
      const data = await postKnowledgeCapture(buildGroupConversationKnowledgePayload({
        group: currentGroup.value,
        messages: messages.value,
      }))
      toast.success(`已保存到知识库：${data.entry?.title || '群聊对话'}`)
    } catch (error) {
      toast.error(error?.message || '保存群聊知识失败')
    }
  }

  // 发送消息
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

  const groupSendRetrySignature = ({ groupId, target, mode, message, files, directed }) => JSON.stringify({
    groupId,
    target,
    mode,
    message,
    files: (files || []).map(file => [file.name, file.size]),
    continuationTaskId: directed?.continuation_task_id || '',
    clarificationRequestId: directed?.clarification_request_id || '',
    memoryAction: directed?.memory_action || '',
    memoryContent: directed?.memory_content || '',
  })

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
    mentionDropdown.value = false

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
          const applied = applyTestAgentReviewReady(data)
          const payload = getTestAgentReviewPayload(data)
          const headline = payload?.summary?.headline || data.detail || 'TestAgent 独立复核结论已整理。'
          thinkingMsg.content = sanitizeGroupVisibleText(headline, 'TestAgent 独立复核结论已整理。', 600)
          waitingCrossReply.value = applied || waitingCrossReply.value
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

  // 等待跨 Agent 回复状态
  const waitingCrossReply = ref(false)

  // 主动拉取新消息（带去重）
  const pullNewMessages = async () => {
    if (!currentGroup.value) return
    try {
      const res = await fetch(`/api/groups/messages?id=${currentGroup.value.id}&limit=100&session_id=${encodeURIComponent(currentGroupSessionId.value)}`)
      const data = await res.json()
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
    } catch {}
  }

  // 加载群聊日志
  const logs = ref([])
  const logFilter = ref('')
  let logEventSource = null
  let logsResizeObserver = null

  watch(showLogs, (newVal) => {
    if (newVal) {
      nextTick(() => {
        if (typeof ResizeObserver === 'undefined') return
        const outer = document.getElementById('logsContent')
        const inner = document.getElementById('logsContentInner')
        if (outer && inner) {
          if (logsResizeObserver) logsResizeObserver.disconnect()
          logsResizeObserver = new ResizeObserver(() => {
            outer.scrollTop = outer.scrollHeight
          })
          logsResizeObserver.observe(inner)
        }
      })
    } else {
      if (logsResizeObserver) {
        logsResizeObserver.disconnect()
        logsResizeObserver = null
      }
    }
  })

  const scrollLogsToBottom = () => {
    nextTick(() => {
      const el = document.getElementById('logsContent')
      if (el) el.scrollTop = el.scrollHeight
    })
    setTimeout(() => {
      const el = document.getElementById('logsContent')
      if (el) el.scrollTop = el.scrollHeight
    }, 60)
    setTimeout(() => {
      const el = document.getElementById('logsContent')
      if (el) el.scrollTop = el.scrollHeight
    }, 220)
  }

  watch(logFilter, () => {
    scrollLogsToBottom()
  })

  const loadLogs = async () => {
    if (!currentGroup.value) return

    // 加载历史日志
    const res = await fetch(`/api/groups/logs?id=${currentGroup.value.id}&limit=100`)
    const data = await res.json()
    logs.value = data.logs || []
    showLogs.value = true

    // 启动实时日志流
    startLogStream()

    scrollLogsToBottom()
  }

  const startLogStream = () => {
    if (logEventSource) logEventSource.close()
    if (!currentGroup.value) return

    logEventSource = new EventSource(`/api/groups/logs/stream?id=${currentGroup.value.id}`)

    logEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'log') {
          logs.value.push(data.log)
          // 滚动到底部
          nextTick(() => {
            const el = document.getElementById('logsContent')
            if (el) el.scrollTop = el.scrollHeight
          })
        }
      } catch {}
    }

    logEventSource.onerror = () => {
      console.log('日志流连接断开')
    }
  }

  const stopLogStream = () => {
    if (logEventSource) {
      logEventSource.close()
      logEventSource = null
    }
  }

  const clearLogs = async () => {
    const confirmed = await confirmDialog('确定清空群聊日志？清空后无法恢复。')
    if (!confirmed) return
    await fetch('/api/groups/logs/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: currentGroup.value.id })
    })
    logs.value = []
    toast.success('日志已清空')
  }

  // 群聊成员管理
  const normalizeGroupTools = (tools = {}) => ({
    mcp: Array.from(new Set((Array.isArray(tools.mcp) ? tools.mcp : []).map(item => String(item || '').trim()).filter(Boolean))),
    skill: Array.from(new Set((Array.isArray(tools.skill) ? tools.skill : []).map(item => String(item || '').trim()).filter(Boolean)))
  })

  const loadAvailableGroupTools = async () => {
    const options = await fetch('/api/tools/authorization-options').then(r => r.json()).catch(() => ({ mcp: [], skill: [] }))
    groupAllTools.value = {
      mcp: options.mcp || [],
      skill: options.skill || []
    }
  }

  const loadGroupTools = async () => {
    if (!currentGroup.value) return
    const [data] = await Promise.all([
      fetch(`/api/groups/tools?id=${currentGroup.value.id}`).then(r => r.json()),
      loadAvailableGroupTools()
    ])
    groupTools.value = normalizeGroupTools(data.tools)
    groupToolAudit.value = data.tool_audit || null
    groupAuthorizationReadiness.value = data.authorization_readiness || null
    groupConnectionPreflight.value = data.connection_preflight || null
    const verification = await fetch(`/api/tools/chain-verification?groupId=${encodeURIComponent(currentGroup.value.id)}`).then(r => r.json()).catch(() => ({ rows: [] }))
    groupToolVerification.value = verification.rows?.[0] || null
    showTools.value = true
  }

  const toggleGroupTool = (type, name) => {
    const normalized = normalizeGroupTools(groupTools.value)
    const list = normalized[type] || []
    const index = list.indexOf(name)
    if (index >= 0) {
      list.splice(index, 1)
    } else {
      list.push(name)
      if (type === 'mcp' && !String(name).includes('/')) {
        normalized.mcp = normalized.mcp.filter(item => item === name || !item.startsWith(`${name}/`))
      }
    }
    groupTools.value = normalized
  }

  const saveGroupTools = async () => {
    groupTools.value = normalizeGroupTools(groupTools.value)
    const res = await fetch('/api/groups/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: currentGroup.value.id, tools: groupTools.value })
    })
    const data = await res.json()
    if (!data.success) {
      toast.error('工具配置保存失败: ' + (data.error || '未知错误'))
      return
    }
    groupTools.value = normalizeGroupTools(data.tools)
    groupToolAudit.value = data.tool_audit || null
    groupAuthorizationReadiness.value = data.authorization_readiness || null
    groupConnectionPreflight.value = data.connection_preflight || null
    showTools.value = false
    if (data.authorization_readiness && data.authorization_readiness.dispatchReady === false) {
      toast.warning('工具配置已保存，但有授权项当前不可用')
    } else {
      toast.success('工具配置已保存')
    }
  }

  // 群聊共享文件
  const groupFiles = ref([])

  const loadGroupFiles = async () => {
    if (!currentGroup.value) return
    const data = await fetch(`/api/groups/shared?id=${currentGroup.value.id}`).then(r => r.json())
    groupFiles.value = data.files || []
    showSharedFiles.value = true
  }

  const addGroupFile = async () => {
    // 使用弹窗代替 prompt
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `<div class="modal">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      <h3>新建共享文件</h3>
      <div class="form-group">
        <label>文件名</label>
        <input type="text" id="newGroupFileName" placeholder="如 api-docs.md">
      </div>
      <div class="form-group">
        <label>文件内容</label>
        <textarea id="newGroupFileContent" rows="8" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:rgba(15,23,42,0.6);color:var(--text-primary);font-size:13px;resize:vertical;outline:none" placeholder="输入文件内容..."></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="submitAddGroupFile()">创建</button>
      </div>
    </div>`;
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  const submitAddGroupFile = async () => {
    const name = document.getElementById("newGroupFileName")?.value?.trim();
    const content = document.getElementById("newGroupFileContent")?.value || "";
    if (!name) { toast.warning('请输入文件名'); return }

    await fetch('/api/groups/shared/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: currentGroup.value.id, name, content })
    });
    document.querySelector('.modal-overlay')?.remove();
    loadGroupFiles();
    toast.success('文件创建成功');
  }

  const deleteGroupFile = async (name) => {
    const confirmed = await confirmDialog(`确定删除文件 "${name}"？删除后无法恢复。`)
    if (!confirmed) return
    await fetch('/api/groups/shared/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: currentGroup.value.id, name })
    })
    loadGroupFiles()
    toast.success('文件已删除')
  }

  // 获取可添加的项目
  const getAvailableProjects = () => {
    if (!currentGroup.value) return []
    const currentMembers = currentGroup.value.members?.map(m => m.project) || []
    return projects.value.filter(p => !currentMembers.includes(p.name))
  }

  // 群聊成员管理
  const addGroupMember = async (project, agent) => {
    const res = await fetch('/api/groups/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentGroup.value.id, add: [{ project, agent }] })
    })
    const data = await res.json()
    if (data.success) {
      currentGroup.value = data.group
      loadGroups()
      toast.success(`已添加 ${project} 到群聊`)
      // 刷新成员列表
      showMembers.value = false
      nextTick(() => { showMembers.value = true })
    } else {
      toast.error('添加失败: ' + (data.error || '未知错误'))
    }
  }

  const removeGroupMember = async (project) => {
    const confirmed = await confirmDialog(`确定移除 ${project}？`)
    if (!confirmed) return
    const res = await fetch('/api/groups/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentGroup.value.id, remove: [project] })
    })
    const data = await res.json()
    if (data.success) {
      currentGroup.value = data.group
      loadGroups()
      toast.success(`已移除 ${project}`)
      // 刷新成员列表
      showMembers.value = false
      nextTick(() => { showMembers.value = true })
    } else {
      toast.error('移除失败: ' + (data.error || '未知错误'))
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
    }, 3000) // 每 3 秒检查一次
  }

  const stopGroupPolling = () => {
    if (groupPollTimer) {
      clearInterval(groupPollTimer)
      groupPollTimer = null
    }
  }

  onMounted(() => {
    loadGroups()
    loadProjects()
    nextTick(attachGroupMessagesResizeObserver)
  })

  onUnmounted(() => {
    detachGroupMessagesResizeObserver()
  })

  // 监听群聊切换，启动/停止轮询和日志流
  const origSelectGroup = selectGroup
  selectGroup = async (id) => {
    stopGroupPolling()
    stopLogStream()
    await origSelectGroup(id)
    lastGroupMsgCount.value = messages.value.length
    startGroupPolling()
  }

  // --- 对话模板相关逻辑开始 ---
  const activeSelectedTemplate = inject('activeSelectedTemplate', null)
  const pendingTemplateToApply = ref(null)

  if (activeSelectedTemplate) {
    watch(activeSelectedTemplate, (newVal) => {
      if (newVal && newVal.targetTab === 'groups' && newVal.targetId) {
        if (currentGroup.value?.id === newVal.targetId) {
          selectChatTemplate(newVal.template)
          activeSelectedTemplate.value = null
        } else {
          pendingTemplateToApply.value = newVal.template
        }
      }
    })
  }

  return {
    GROUP_VISIBLE_INTERNAL_TEXT_PATTERN, GROUP_INTERNAL_PROTOCOL_FALLBACK, GROUP_STREAM_ERROR_FALLBACK,
    sanitizeGroupVisibleText, buildGroupStreamErrorText, getVisibleGroupMessageContent,
    handleGroupNavigation, highlightMsgIndex, groups, projects, currentGroup, messages, groupSessions,
    currentGroupSessionId, groupMemory, mainAgentStatus, groupAgentQa, collaborationProtocol,
    groupMessagesEl, groupMessagesContentEl, isGroupMessagesPinnedToBottom, updateGroupMessageScrollState,
    scrollToBottom, attachGroupMessagesResizeObserver, detachGroupMessagesResizeObserver, navMessages,
    scrollToMessage, newMessage, slashNavigate, runGroupClientCommand, pendingDirectMemoryCommand, slash,
    focusGroupInput, showTemplateSelector, allTemplates, templateSearchQuery, activeTemplateIndex,
    recommendedTemplate, activeTemplate, templateVariables, showVariableModal, openTemplateSelector,
    selectChatTemplate, applyTemplateVariables, detectRecommendation, applyRecommendation,
    handleTemplateKeydown, hideTemplateAssist, messageFiles, targetAgent, messageMode, pendingGroupTaskInput,
    pendingGroupClarificationInput, isTaskSupplementMode, isClarificationResponseMode,
    isDirectedGroupInputMode, groupComposerPlaceholder, groupComposerSendLabel, cancelTaskSupplementInput,
    beginTaskSupplementInput, getGroupClarificationContext, getGroupClarificationSummary,
    isPendingGroupClarification, beginGroupClarificationInput, cancelGroupClarificationInput,
    syncPendingGroupClarificationInput, activeAgentStreamMsgs, diffViewer, codeChangeDrawer,
    openCodeChangeDrawer, openSingleFileChange, closeCodeChangeDrawer, pipelineViewer, agentQaActionLoading,
    openPipelineViewer, openMainAgentPipeline, hasMainAgentStatusDetail, latestMainAgentDecisionEntry,
    latestMainAgentDecision, scrollToLatestMainDecision, isCoordinatorProject, getCoordinatorMember,
    getRoutableMembers, getMemberCountLabel, getMemoryCompression, getAgentMemoryCount, hasCompressedMemory,
    getMemoryCompressionLabel, getMemoryCompressionMeta, getMemoryCompressionTitle, getAgentDisplayName,
    getWorkEvents, agentAccentPalette, hashAgent, getAgentAccent, getAgentAccentStyle, getAgentInitials,
    getWorkPanelState, getAgentMessageStatus, isGroupMainAgentMessage, getTaskRuntime, isLegacyNonTaskCard,
    getTaskCard, shouldShowOrchestrationPlan, isInternalProtocolMessage, getMessageTaskId,
    isPrimaryTaskMessage, shouldShowGroupMessage, isPrimaryTaskCard, handleTaskCardAction,
    taskRuntimeStatusLabel, taskRuntimeAgentState, taskRuntimeGreenLabel, applyTransientTaskRuntime,
    latestTestAgentFallbackTaskId, resolveTestAgentFallbackTaskId,
    createTestAgentExecutionPlanFallbackMessage, applyTestAgentExecutionPlanReady, getTestAgentReviewPayload,
    testAgentReviewPhase, createTestAgentReviewFallbackMessage, applyTestAgentReviewReady,
    appendAgentWorkEvent, getTargetDisplayName, isAgentQaMessage, runAgentQaAction, appendAgentQaMessage,
    applyMainAgentProgressCheckpoint, groupMessageKeyMap, groupMessageKeySeq, getGroupMessageKey, showCreate,
    showRename, showMembers, showTools, showSharedFiles, showLogs, groupTools, groupAllTools, groupToolAudit,
    groupAuthorizationReadiness, groupConnectionPreflight, groupToolVerification, newGroupName, renameName,
    mentionDropdown, mentionFilter, mentionIndex, loadGroups, loadProjects, selectGroup, loadMessages,
    selectGroupSession, createGroupSession, renameGroupSession, archiveGroupSession, deleteGroupSession,
    createLocalMessageId, normalizeMessageContent, isEquivalentMessage, mergeIncomingMessage,
    getMainAgentDecision, attachMainAgentDecision, formatFileSize, onMessageFilesSelected, removeMessageFile,
    openFileDiff, openDrawerChangesTab, closeFileDiff, getFileChangesTitle, getExecutionOrderLabel,
    workflowSteps, getWorkflowPhase, getWorkflowStepState, getWorkflowLabel, getDispatchActionLabel,
    getPlanTitle, compactPlanText, getAssignmentStatusLabel, getAssignmentStatusClass, getAssignmentIdentity,
    findAssignmentMessageIndex, getAssignmentKey, applyAssignmentStatus, getDiffLineClass, handleInput,
    insertMention, handleKeydown, getFilteredAgents, highlightMentions, updateCreateGroupProjectSelection,
    submitCreateGroup, submitRename, deleteGroup, clearGroupMessages, saveCurrentGroupConversationKnowledge,
    isStreaming, thinkingMessages, pendingGroupSendRetry, groupStreamController, activeGroupTaskId,
    stoppingGroupTurn, groupTurnConversationId, groupTurnControl, stopGroupCurrentWork, drainGroupTurnQueue,
    submitGroupMessageWhileBusy, groupSendRetrySignature, sendMessage, waitingCrossReply, pullNewMessages,
    logs, logFilter, logEventSource, logsResizeObserver, scrollLogsToBottom, loadLogs, startLogStream,
    stopLogStream, clearLogs, normalizeGroupTools, loadAvailableGroupTools, loadGroupTools, toggleGroupTool,
    saveGroupTools, groupFiles, loadGroupFiles, addGroupFile, submitAddGroupFile, deleteGroupFile,
    getAvailableProjects, addGroupMember, removeGroupMember, groupPollTimer, lastGroupMsgCount,
    startGroupPolling, stopGroupPolling, origSelectGroup, activeSelectedTemplate, pendingTemplateToApply,
  }
}
