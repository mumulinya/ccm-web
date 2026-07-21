import { ref, onMounted, onUnmounted, nextTick, watch, inject, computed } from 'vue'
import { groupsApi, projectsApi } from '../../api/index.js'
import { toast, confirmDialog } from '../../utils/toast.js'
import { mergeUniqueAttachmentFiles } from '../../utils/clipboardAttachments.js'
import { shouldShowGroupMainAgentStatus } from '../../utils/groupStatusVisibility.js'
import { useSlashCommands } from '../../composables/useSlashCommands.js'
import { createSlashCommandClientActions } from '../../composables/useSlashCommandClientActions.js'
import { buildGroupClarificationResponseFields, buildWaitingUserTaskContinuationFields, createGroupTaskCardActionHandler } from '../../composables/useGroupTaskCardActions.js'
import { useChatTemplates } from '../../composables/useChatTemplates.js'
import { useCodeChangeDrawer } from '../../composables/useCodeChangeDrawer.js'
import { useMessageNavigation } from '../../composables/useMessageNavigation.js'
import { usePinnedScroll } from '../../composables/usePinnedScroll.js'
import { useConversationTurnControl } from '../../composables/useConversationTurnControl.js'
import { notifySessionContextUsage } from '../../composables/useSessionContextUsage.js'
import { buildGroupConversationKnowledgePayload, postKnowledgeCapture } from '../../utils/knowledgeCapture.js'
import { normalizeTestAgentExecutionPlanSummary, sanitizeUserFacingStructure } from '../../utils/agentDisplay.js'
import {
  GROUP_VISIBLE_INTERNAL_TEXT_PATTERN,
  GROUP_INTERNAL_PROTOCOL_FALLBACK,
  GROUP_STREAM_ERROR_FALLBACK,
  sanitizeGroupVisibleText,
  escapeGroupMessageHtml,
  buildGroupStreamErrorText,
  getVisibleGroupMessageContent,
  isCoordinatorProject,
  getCoordinatorMember as getCoordinatorMemberPure,
  getRoutableMembers as getRoutableMembersPure,
  getMemberCountLabel,
  getAgentDisplayName,
  getWorkEvents,
  agentAccentPalette,
  hashAgent,
  getAgentAccent,
  getAgentAccentStyle,
  getAgentInitials,
  getWorkPanelState,
  getAgentMessageStatus,
  isGroupMainAgentMessage,
  getTaskRuntime,
  isLegacyNonTaskCard,
  getTaskCard,
  shouldShowOrchestrationPlan,
  isInternalProtocolMessage,
  getMessageTaskId,
  isPrimaryTaskMessage as isPrimaryTaskMessagePure,
  shouldShowGroupMessage as shouldShowGroupMessagePure,
  buildGroupContextCompactionEvent,
  isPrimaryTaskCard as isPrimaryTaskCardPure,
  taskRuntimeStatusLabel,
  taskRuntimeAgentState,
  taskRuntimeGreenLabel,
  testAgentReviewPhase,
  formatFileSize,
  getFileChangesTitle,
  getExecutionOrderLabel,
  workflowSteps,
  getWorkflowPhase,
  getWorkflowStepState,
  getWorkflowLabel,
  getDispatchActionLabel,
  getPlanTitle,
  compactPlanText,
  getAssignmentStatusLabel,
  getAssignmentStatusClass,
  getAssignmentIdentity,
  getDiffLineClass,
  normalizeGroupTools,
  getGroupClarificationContext,
  getGroupClarificationSummary,
  isPendingGroupClarification,
  groupSendRetrySignature,
  resolveTestAgentFallbackTaskId as resolveTestAgentFallbackTaskIdPure,
  getTestAgentReviewPayload,
  createTestAgentExecutionPlanFallbackMessage as createTestAgentExecutionPlanFallbackMessagePure,
  createTestAgentReviewFallbackMessage as createTestAgentReviewFallbackMessagePure,
} from './groupChatHelpers.js'
import { useGroupChatMessaging } from './useGroupChatMessaging.js'
import { useGroupChatTasks } from './useGroupChatTasks.js'
import { useGroupChatAdmin } from './useGroupChatAdmin.js'
import { useGroupChatStream } from './useGroupChatStream.js'

export function useGroupChat(props, emit) {

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
    compactSession: async (payload = {}) => {
      if (!currentGroup.value || !currentGroupSessionId.value) throw new Error('请先选择群聊会话')
      const groupId = currentGroup.value.id
      const sessionId = currentGroupSessionId.value
      const scopeId = `${groupId}::${sessionId}`
      notifySessionContextUsage('group', scopeId, { active: true, reason: 'manual_compact' })
      try {
        const data = await groupsApi.compact(groupId, sessionId, String(payload.args || '').trim())
        await loadMessages()
        return data
      } finally {
        notifySessionContextUsage('group', scopeId, { active: false, reason: 'manual_compact_complete' })
      }
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
    context: () => ({ group: currentGroup.value?.name || '', groupId: currentGroup.value?.id || '', sessionId: currentGroupSessionId.value || '', target: 'coordinator' }),
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
      : '输入消息...（输入 / 打开命令中心）')
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
    messageMode.value = 'project_task'
    hideTemplateAssist()
    nextTick(focusGroupInput)
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
    messageMode.value = pendingGroupClarificationInput.value.messageMode
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
  const diffViewer = ref({ visible: false, file: null })
  const {
    codeChangeDrawer,
    openCodeChangeDrawer,
    openSingleFileChange,
    closeCodeChangeDrawer,
  } = useCodeChangeDrawer({ title: '群聊代码改动' })

  const onMessageFilesSelected = (files) => {
    messageFiles.value = mergeUniqueAttachmentFiles(messageFiles.value, files)
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

  const getCoordinatorMember = (group = currentGroup.value) => getCoordinatorMemberPure(group)
  const getRoutableMembers = (group = currentGroup.value) => getRoutableMembersPure(group)

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
  const contextCompactionEvent = computed(() => buildGroupContextCompactionEvent(groupMemory.value, messages.value))
  const isPrimaryTaskMessage = (msg, index) => isPrimaryTaskMessagePure(messages.value, msg, index)
  const shouldShowGroupMessage = (msg, index) => shouldShowGroupMessagePure(messages.value, msg, index)
  const isPrimaryTaskCard = (msg, index) => isPrimaryTaskCardPure(messages.value, msg, index)

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


  // 弹窗状态
  const showCreate = ref(false)
  const showRename = ref(false)
  const showMembers = ref(false)
  const showTools = ref(false)
  const showTestTargets = ref(false)
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

  let loadGroups = async () => {}
  let selectGroup = async () => {}

  const {
    groupMessageKeyMap, groupMessageKeySeq, getGroupMessageKey, createLocalMessageId,
    normalizeMessageContent, isEquivalentMessage, mergeIncomingMessage, getMainAgentDecision,
    attachMainAgentDecision, findAssignmentMessageIndex, getAssignmentKey, applyAssignmentStatus,
    waitingCrossReply, pullNewMessages, groupPollTimer, lastGroupMsgCount, startGroupPolling,
    stopGroupPolling
  } = useGroupChatMessaging({
    messages,
    currentGroup,
    currentGroupSessionId,
    groupSessions,
    mainAgentStatus,
    groupAgentQa,
    scrollToBottom,
  })

  const {
    applyTransientTaskRuntime, latestTestAgentFallbackTaskId, resolveTestAgentFallbackTaskId,
    createTestAgentExecutionPlanFallbackMessage, applyTestAgentExecutionPlanReady,
    createTestAgentReviewFallbackMessage, applyTestAgentReviewReady
  } = useGroupChatTasks({
    messages,
    mergeIncomingMessage,
  })

  const {
    updateCreateGroupProjectSelection, submitCreateGroup, submitRename, deleteGroup,
    clearGroupMessages, saveCurrentGroupConversationKnowledge, logs, logFilter, logEventSource,
    logsResizeObserver, scrollLogsToBottom, loadLogs, startLogStream, stopLogStream, clearLogs,
    loadAvailableGroupTools, loadGroupTools, toggleGroupTool, saveGroupTools, groupTestTargets,
    groupTestTargetProjects, groupTestTargetsLoading, groupTestTargetsSaving, loadGroupTestTargets,
    saveGroupTestTarget, deleteGroupTestTarget, groupFiles,
    loadGroupFiles, addGroupFile, submitAddGroupFile, deleteGroupFile, getAvailableProjects,
    addGroupMember, removeGroupMember
  } = useGroupChatAdmin({
    currentGroup,
    groups,
    projects,
    messages,
    groupMemory,
    currentGroupSessionId,
    showCreate,
    showRename,
    showMembers,
    showTools,
    showTestTargets,
    showSharedFiles,
    showLogs,
    newGroupName,
    renameName,
    groupTools,
    groupAllTools,
    groupToolAudit,
    groupAuthorizationReadiness,
    groupConnectionPreflight,
    groupToolVerification,
    loadGroups: (...args) => loadGroups(...args),
    selectGroup: (...args) => selectGroup(...args),
  })

  const {
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
  } = useGroupChatStream({
    messages,
    currentGroup,
    currentGroupSessionId,
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
  })

  // 加载数据
  loadGroups = async () => {
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
  selectGroup = async (id) => {
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

  const openTraceReplay = (target = {}) => {
    const payload = {
      tab: 'trace-replay',
      task_id: target.task_id || target.taskId || '',
      trace_id: target.trace_id || target.traceId || '',
      scope: target.scope || 'orchestrator',
      at: Date.now(),
    }
    try {
      localStorage.setItem('trace-replay-target', JSON.stringify(payload))
    } catch {}
    slashNavigate?.('trace-replay')
    window.dispatchEvent(new CustomEvent('trace-replay-target', { detail: payload }))
  }

  const handleTaskCardAction = createGroupTaskCardActionHandler({
    getTaskCard,
    getCurrentGroup: () => currentGroup.value,
    openCodeChangeDrawer,
    openPipelineViewer,
    openTraceReplay,
    beginTaskInput: beginTaskSupplementInput,
    loadMessages,
  })

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

  const renameGroupSession = async (sessionId = currentGroupSessionId.value) => {
    if (!currentGroup.value || !sessionId) return
    const current = groupSessions.value.find(item => item.id === sessionId)
    const title = window.prompt('会话名称', current?.title || '新会话')
    if (!title?.trim()) return
    try {
      const data = await groupsApi.sessionAction(currentGroup.value.id, sessionId, 'rename', { title: title.trim() })
      groupSessions.value = data.sessions || groupSessions.value
      toast.success('会话已重命名')
    } catch (error) {
      toast.error(error.message || '重命名会话失败')
    }
  }

  const archiveGroupSession = async (sessionId = currentGroupSessionId.value) => {
    if (!currentGroup.value || !sessionId) return
    const current = groupSessions.value.find(item => item.id === sessionId)
    const isCurrent = sessionId === currentGroupSessionId.value
    if (!await confirmDialog(`归档会话“${current?.title || '当前会话'}”？${isCurrent ? '归档后会切换到其他可用会话。' : ''}`)) return
    try {
      const data = await groupsApi.sessionAction(currentGroup.value.id, sessionId, 'archive')
      groupSessions.value = data.sessions || []
      if (isCurrent) {
        currentGroupSessionId.value = data.activeSessionId || groupSessions.value.find(item => !item.archived)?.id || ''
        messages.value = []
        await loadMessages()
      }
      toast.success('会话已归档')
    } catch (error) {
      toast.error(error.message || '归档会话失败')
    }
  }

  const deleteGroupSession = async (sessionId = currentGroupSessionId.value) => {
    if (!currentGroup.value || !sessionId) return
    const current = groupSessions.value.find(item => item.id === sessionId)
    const isCurrent = sessionId === currentGroupSessionId.value
    if (!await confirmDialog(`确定删除会话“${current?.title || '当前会话'}”？消息、压缩状态和会话记忆将一起删除。`)) return
    try {
      const data = await groupsApi.sessionAction(currentGroup.value.id, sessionId, 'delete')
      groupSessions.value = data.sessions || []
      if (isCurrent) {
        currentGroupSessionId.value = data.activeSessionId || groupSessions.value.find(item => !item.archived)?.id || groupSessions.value[0]?.id || ''
        messages.value = []
        await loadMessages()
      }
      toast.success('会话及其记忆已删除')
    } catch (error) {
      toast.error(error.message || '删除会话失败')
    }
  }



  // 输入联动
  const handleInput = (e) => {
    const value = e.target.value

    if (isDirectedGroupInputMode.value) {
      hideTemplateAssist()
      return
    }

    if (slash.onInput()) {
      hideTemplateAssist()
      return
    }
    if (value.startsWith('/')) {
      hideTemplateAssist()
      return
    }
    showTemplateSelector.value = false
    detectRecommendation(value)
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
    if (handleTemplateKeydown(e)) return

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 高亮 @mentions
  const highlightMentions = (text) => {
    if (!text) return ''
    return escapeGroupMessageHtml(text).replace(/@([\w-]+)/g, (_match, name) => {
      const label = getAgentDisplayName(name)
      return `<span style="color:var(--accent-blue);font-weight:600">@${label}</span>`
    })
  }


  // 发送消息




  onMounted(() => {
    loadGroups()
    loadProjects()
    nextTick(attachGroupMessagesResizeObserver)
  })

  onUnmounted(() => {
    stopGroupPolling()
    stopLogStream()
    detachGroupMessagesResizeObserver()
  })

  // 监听群聊切换，启动/停止轮询和日志流
  const origSelectGroup = selectGroup
  selectGroup = async (id) => {
    stopGroupPolling()
    stopLogStream()
    await origSelectGroup(id)
    lastGroupMsgCount.value = messages.value.length
    if (props.active !== false) startGroupPolling()
  }

  watch(() => props.active, (isActive) => {
    if (isActive === false) {
      stopGroupPolling()
      return
    }
    if (currentGroup.value) startGroupPolling()
  })

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
    handleTemplateKeydown, hideTemplateAssist, messageFiles, messageMode, pendingGroupTaskInput,
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
    contextCompactionEvent,
    getWorkEvents, agentAccentPalette, hashAgent, getAgentAccent, getAgentAccentStyle, getAgentInitials,
    getWorkPanelState, getAgentMessageStatus, isGroupMainAgentMessage, getTaskRuntime, isLegacyNonTaskCard,
    getTaskCard, shouldShowOrchestrationPlan, isInternalProtocolMessage, getMessageTaskId,
    isPrimaryTaskMessage, shouldShowGroupMessage, isPrimaryTaskCard, handleTaskCardAction,
    taskRuntimeStatusLabel, taskRuntimeAgentState, taskRuntimeGreenLabel, applyTransientTaskRuntime,
    latestTestAgentFallbackTaskId, resolveTestAgentFallbackTaskId,
    createTestAgentExecutionPlanFallbackMessage, applyTestAgentExecutionPlanReady, getTestAgentReviewPayload,
    testAgentReviewPhase, createTestAgentReviewFallbackMessage, applyTestAgentReviewReady,
    appendAgentWorkEvent, isAgentQaMessage, runAgentQaAction, appendAgentQaMessage,
    applyMainAgentProgressCheckpoint, groupMessageKeyMap, groupMessageKeySeq, getGroupMessageKey, showCreate,
    showRename, showMembers, showTools, showTestTargets, showSharedFiles, showLogs, groupTools, groupAllTools, groupToolAudit,
    groupAuthorizationReadiness, groupConnectionPreflight, groupToolVerification, newGroupName, renameName,
    loadGroups, loadProjects, selectGroup, loadMessages,
    selectGroupSession, createGroupSession, renameGroupSession, archiveGroupSession, deleteGroupSession,
    createLocalMessageId, normalizeMessageContent, isEquivalentMessage, mergeIncomingMessage,
    getMainAgentDecision, attachMainAgentDecision, formatFileSize, onMessageFilesSelected, removeMessageFile,
    openFileDiff, openDrawerChangesTab, closeFileDiff, getFileChangesTitle, getExecutionOrderLabel,
    workflowSteps, getWorkflowPhase, getWorkflowStepState, getWorkflowLabel, getDispatchActionLabel,
    getPlanTitle, compactPlanText, getAssignmentStatusLabel, getAssignmentStatusClass, getAssignmentIdentity,
    findAssignmentMessageIndex, getAssignmentKey, applyAssignmentStatus, getDiffLineClass, handleInput,
    handleKeydown, highlightMentions, updateCreateGroupProjectSelection,
    submitCreateGroup, submitRename, deleteGroup, clearGroupMessages, saveCurrentGroupConversationKnowledge,
    isStreaming, thinkingMessages, pendingGroupSendRetry, groupStreamController, activeGroupTaskId,
    stoppingGroupTurn, groupTurnConversationId, groupTurnControl, stopGroupCurrentWork, drainGroupTurnQueue,
    submitGroupMessageWhileBusy, groupSendRetrySignature, sendMessage, waitingCrossReply, pullNewMessages,
    logs, logFilter, logEventSource, logsResizeObserver, scrollLogsToBottom, loadLogs, startLogStream,
    stopLogStream, clearLogs, normalizeGroupTools, loadAvailableGroupTools, loadGroupTools, toggleGroupTool,
    saveGroupTools, groupTestTargets, groupTestTargetProjects, groupTestTargetsLoading, groupTestTargetsSaving,
    loadGroupTestTargets, saveGroupTestTarget, deleteGroupTestTarget, groupFiles, loadGroupFiles, addGroupFile, submitAddGroupFile, deleteGroupFile,
    getAvailableProjects, addGroupMember, removeGroupMember, groupPollTimer, lastGroupMsgCount,
    startGroupPolling, stopGroupPolling, origSelectGroup, activeSelectedTemplate, pendingTemplateToApply,
  }
}
