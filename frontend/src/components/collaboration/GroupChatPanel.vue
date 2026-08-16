<script setup>
import { computed, ref, watch } from 'vue'
import ChatComposer from '../common/ChatComposer.vue'
import SessionContextUsage from '../common/SessionContextUsage.vue'
import ConversationAwayRecap from '../common/ConversationAwayRecap.vue'
import PermissionApprovalCards from '../common/PermissionApprovalCards.vue'
import ConversationTurnControls from '../common/ConversationTurnControls.vue'
import CommandResultCard from '../common/CommandResultCard.vue'
import EmptyState from '../common/EmptyState.vue'
import MessageNavigator from '../common/MessageNavigator.vue'
import ConversationMessageShell from '../common/ConversationMessageShell.vue'
import ConflictPlanMessage from './ConflictPlanMessage.vue'
import ContextCompactionEvent from './ContextCompactionEvent.vue'
import ProjectTaskIntakeMessage from './ProjectTaskIntakeMessage.vue'
import TaskCollaborationCard from './TaskCollaborationCard.vue'
import AgentCodeChangeDrawer from '../agents/AgentCodeChangeDrawer.vue'
import AgentExecutionMessage from '../agents/AgentExecutionMessage.vue'
import AgentQaMessage from '../agents/AgentQaMessage.vue'
import GroupMainAgentStatusCard from './GroupMainAgentStatusCard.vue'
import MainAgentDecisionCard from '../agents/MainAgentDecisionCard.vue'
import AgentExecutionTranscript from '../common/AgentExecutionTranscript.vue'
import PresentedPlanCard from '../common/PresentedPlanCard.vue'
import ActiveTaskPlanDock from '../common/ActiveTaskPlanDock.vue'
import PrePlanClarificationDock from '../common/PrePlanClarificationDock.vue'
import ConversationAsideDock from '../common/ConversationAsideDock.vue'
import ConversationHistoryBranches from '../common/ConversationHistoryBranches.vue'
import ConversationModeToolbar from '../common/ConversationModeToolbar.vue'
import ConversationSummaryBoundary from '../common/ConversationSummaryBoundary.vue'
import NewProgressIndicator from '../common/NewProgressIndicator.vue'
import GroupChatHeader from './GroupChatHeader.vue'
import GroupChatSessionSidebar from './GroupChatSessionSidebar.vue'
import GroupLogsModal from './GroupLogsModal.vue'
import GroupToolsModal from './GroupToolsModal.vue'
import GroupTestTargetsModal from './GroupTestTargetsModal.vue'
import GroupSharedFilesModal from './GroupSharedFilesModal.vue'
import GroupMembersModal from './GroupMembersModal.vue'
import GroupCreateModal from './GroupCreateModal.vue'
import GroupRenameModal from './GroupRenameModal.vue'
import UnifiedDiffModal from '../common/UnifiedDiffModal.vue'
import AgentPipelineModal from '../agents/AgentPipelineModal.vue'
import { useGroupChat } from './useGroupChat.js'
import { useSessionContextUsage } from '../../composables/useSessionContextUsage.js'
import { usePermissionApprovals } from '../../composables/usePermissionApprovals.js'
import { useAgentExecutionEvents } from '../../composables/useAgentExecutionEvents.js'
import { getCopyableMessageText } from '../../utils/messageActions.js'
import { countExecutionToolItems, executionEventsForMessage, hasAcceptedExecutionForMessage, liveAssistantInProgressText, liveAssistantProvisionalText } from '../../utils/agentExecutionEvents.js'
import { consumeAsideCommand, rewindConversationTurn } from '../../utils/conversationRewind.js'
import { toast } from '../../utils/toast.js'
import { findActivePrePlanClarification, validatePrePlanClarificationAction } from '../../utils/prePlanClarification.js'
import { usePresentedPlanConfirmExecute } from '../../composables/usePresentedPlanConfirmExecute.js'

const props = defineProps({
  navigateTo: { type: Object, default: null },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['navigated', 'switch-tab', 'set-navigation'])
const prePlanClarificationBusy = ref(false)

const {
  GROUP_VISIBLE_INTERNAL_TEXT_PATTERN, GROUP_INTERNAL_PROTOCOL_FALLBACK, GROUP_STREAM_ERROR_FALLBACK,
  sanitizeGroupVisibleText, buildGroupStreamErrorText, getVisibleGroupMessageContent, handleGroupNavigation,
  highlightMsgIndex, groups, projects, currentGroup, messages, groupSessions, currentGroupSessionId, isGroupSessionDraft,
  groupMemory, mainAgentStatus, groupAgentQa, collaborationProtocol, groupMessagesEl, groupMessagesContentEl,
  isGroupMessagesPinnedToBottom, updateGroupMessageScrollState, scrollToBottom,
  pendingGroupProgressCount, notifyGroupProgress, jumpToLatestGroupProgress, resetGroupPinnedScroll,
  attachGroupMessagesResizeObserver, detachGroupMessagesResizeObserver, navMessages, scrollToMessage,
  newMessage, slashNavigate, runGroupClientCommand, pendingDirectMemoryCommand, slash, focusGroupInput,
  messageFiles, messageMode, pendingGroupTaskInput,
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
  getTaskCard, shouldShowOrchestrationPlan, isGroupModelFailureMessage, isInternalProtocolMessage, getMessageTaskId,
  isPrimaryTaskMessage, shouldShowGroupMessage, isPrimaryTaskCard, handleTaskCardAction,
  taskRuntimeStatusLabel, taskRuntimeAgentState, taskRuntimeGreenLabel, applyTransientTaskRuntime,
  latestTestAgentFallbackTaskId, resolveTestAgentFallbackTaskId, createTestAgentExecutionPlanFallbackMessage,
  applyTestAgentExecutionPlanReady, getTestAgentReviewPayload, testAgentReviewPhase,
  createTestAgentReviewFallbackMessage, applyTestAgentReviewReady, appendAgentWorkEvent,
  isAgentQaMessage, runAgentQaAction, appendAgentQaMessage,
  applyMainAgentProgressCheckpoint, groupMessageKeyMap, groupMessageKeySeq, getGroupMessageKey, showCreate,
  showRename, showMembers, showTools, showTestTargets, showSharedFiles, showLogs, groupTools, groupAllTools, groupToolAudit,
  groupAuthorizationReadiness, groupConnectionPreflight, groupToolVerification, groupContextPolicy, newGroupName, renameName,
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
  stoppingGroupTurn, groupTurnConversationId, groupTurnControl, groupTurnBusy, stopGroupCurrentWork, drainGroupTurnQueue, guideGroupQueuedTurn, resolveGroupQueuedRoute,
  submitGroupMessageWhileBusy, groupSendRetrySignature, sendMessage, editGroupUserMessage, handleGroupModelFailureAction, waitingCrossReply, pullNewMessages,
  logs, logFilter, logEventSource, logsResizeObserver, scrollLogsToBottom, loadLogs, startLogStream,
  stopLogStream, clearLogs, normalizeGroupTools, loadAvailableGroupTools, loadGroupTools, toggleGroupTool, updateGroupContextPolicy,
  saveGroupTools, groupTestTargets, groupTestTargetProjects, groupTestTargetsLoading, groupTestTargetsSaving,
  loadGroupTestTargets, saveGroupTestTarget, deleteGroupTestTarget, groupFiles, loadGroupFiles, addGroupFile, submitAddGroupFile, deleteGroupFile,
  getAvailableProjects, addGroupMember, removeGroupMember, groupPollTimer, lastGroupMsgCount,
  startGroupPolling, stopGroupPolling, origSelectGroup,
} = useGroupChat(props, emit)

const activeGroupPrePlanRow = computed(() => findActivePrePlanClarification(messages.value, { purpose: 'pre_plan' }))
const activeGroupPrePlanClarification = computed(() => activeGroupPrePlanRow.value?.clarification || null)
const submitGroupPrePlanClarification = async payload => {
  const row = activeGroupPrePlanRow.value
  if (!row?.message || !payload?.answerText || prePlanClarificationBusy.value) return
  prePlanClarificationBusy.value = true
  try {
    await validatePrePlanClarificationAction({ clarification: payload.clarification, action: payload.useDefaults ? 'defaults' : 'answer', scope: 'group', scopeId: currentGroup.value?.id, exactSessionId: currentGroupSessionId.value, answers: payload.answers, additionalNote: payload.additionalNote })
    beginGroupClarificationInput(row.message, { focus: false, clear: true })
    newMessage.value = payload.answerText
    await sendGroupMessage()
  } finally { prePlanClarificationBusy.value = false }
}
const cancelGroupPrePlanClarification = async () => {
  try {
    await validatePrePlanClarificationAction({ clarification: activeGroupPrePlanClarification.value, action: 'cancel', scope: 'group', scopeId: currentGroup.value?.id, exactSessionId: currentGroupSessionId.value })
  } catch (error) { return toast.error(error?.message || '取消失败') }
  cancelGroupClarificationInput()
  const clarification = activeGroupPrePlanClarification.value
  if (clarification) clarification.status = 'cancelled'
  toast.info('已取消本次计划前澄清')
}
const submitInlineGroupClarification = async payload => {
  if (!payload?.answerText || prePlanClarificationBusy.value) return
  prePlanClarificationBusy.value = true
  try {
    if (payload.clarification?.id) {
      await validatePrePlanClarificationAction({ clarification: payload.clarification, action: 'answer', scope: 'group', scopeId: currentGroup.value?.id, exactSessionId: currentGroupSessionId.value, answers: payload.answers, additionalNote: payload.additionalNote })
    }
    newMessage.value = payload.answerText
    await sendGroupMessage()
  } finally { prePlanClarificationBusy.value = false }
}

const liveGroupAssistantProgress = messageIndex => liveAssistantProvisionalText(
  groupAgentExecutionEvents.value,
  messages.value,
  messageIndex,
) || liveAssistantInProgressText(
  groupAgentExecutionEvents.value,
  messages.value,
  messageIndex,
)
const visibleGroupAssistantContent = (msg, messageIndex, fallback) => {
  const live = liveGroupAssistantProgress(messageIndex)
  if (live) return live
  if (String(msg?.runtime || '').toLowerCase() === 'llm-error') {
    const tools = countExecutionToolItems(executionEventsForMessage(groupAgentExecutionEvents.value, messages.value, messageIndex))
    return getVisibleGroupMessageContent(msg, fallback, { toolCount: tools.completed + tools.failed })
  }
  return getVisibleGroupMessageContent(msg, fallback)
}

const groupSessionSidebarOpen = ref(typeof window === 'undefined' || window.innerWidth > 768)
const selectSessionFromSidebar = async (sessionId) => {
  await selectGroupSession(sessionId)
  if (typeof window !== 'undefined' && window.innerWidth <= 768) groupSessionSidebarOpen.value = false
}

const groupContextScopeId = computed(() => currentGroup.value?.id && currentGroupSessionId.value
  ? `${currentGroup.value.id}::${currentGroupSessionId.value}`
  : '')
const {
  events: groupAgentExecutionEvents,
  enabled: groupAgentExecutionEnabled,
  meaningfulRevision: groupMeaningfulRevision,
  latestMeaningfulKey: groupLatestMeaningfulKey,
  refresh: refreshGroupAgentExecutionEvents,
} = useAgentExecutionEvents({
  scope: computed(() => 'group'),
  scopeId: computed(() => currentGroup.value?.id || ''),
  exactSessionId: currentGroupSessionId,
  active: computed(() => props.active !== false && !!currentGroup.value?.id && !!currentGroupSessionId.value),
})
watch(
  () => `${currentGroup.value?.id || ''}:${currentGroupSessionId.value || ''}:${messages.value.length}:${messages.value.at(-1)?.id || ''}`,
  () => { if (currentGroup.value?.id && currentGroupSessionId.value && messages.value.length) void refreshGroupAgentExecutionEvents({ notify: false }) },
  { flush: 'post' },
)
const groupTaskExecutionActive = computed(() => {
  if (activeGroupTaskId.value) return true
  return messages.value.some(message => {
    const taskId = String(getMessageTaskId(message) || '')
    if (!taskId) return false
    const runtime = getTaskRuntime(message) || message?.task || message?.taskCard || {}
    const status = String(runtime?.status || runtime?.phase || '').toLowerCase()
    return !['completed', 'done', 'succeeded', 'failed', 'cancelled', 'canceled', 'reverted'].includes(status)
  })
})
const rewindGroupMessage = async (message) => {
  try {
    const receipt = await rewindConversationTurn({ scope: 'group', scopeId: currentGroup.value?.id || '', exactSessionId: currentGroupSessionId.value, anchorMessageId: message?.id })
    if (!receipt) return
    await loadMessages()
    newMessage.value = receipt.originalPrompt || ''
    toast.success(receipt.action ? `已总结 ${receipt.summarizedMessages || 0} 条消息` : '已回退到本轮开始前，原需求已放回输入框')
  } catch (error) { toast.error(error?.message || '回退失败') }
}
const sendGroupMessage = async () => {
  if (consumeAsideCommand(newMessage.value, { scope: 'group', scopeId: currentGroup.value?.id || '', exactSessionId: currentGroupSessionId.value })) {
    newMessage.value = ''
    return
  }
  await sendMessage()
}
const handleGroupKeydown = async (event) => {
  if (event.key === 'Enter' && !event.shiftKey && /^\/btw(?:\s|$)/i.test(newMessage.value)) {
    event.preventDefault()
    await sendGroupMessage()
    return
  }
  await handleKeydown(event)
}
watch(groupMeaningfulRevision, () => notifyGroupProgress({ key: groupLatestMeaningfulKey.value }))
watch(currentGroupSessionId, () => resetGroupPinnedScroll())
const locateGroupPlanStep = ({ messageIndex }) => {
  if (Number.isInteger(messageIndex) && messageIndex >= 0) scrollToMessage(messageIndex)
}
const handleGroupPlanAction = ({ messageIndex, action }) => {
  const message = Number.isInteger(messageIndex) && messageIndex >= 0 ? messages.value[messageIndex] : {}
  return handleTaskCardAction(message || {}, action)
}
const {
  usage: groupContextUsage,
  loading: groupContextLoading,
  error: groupContextError,
  compacting: groupContextCompacting,
  refresh: refreshGroupContextUsage,
} = useSessionContextUsage({
  scope: 'group',
  scopeId: groupContextScopeId,
  enabled: computed(() => props.active !== false && !!groupContextScopeId.value),
  refreshKey: computed(() => `${messages.value.length}:${isStreaming.value}`),
  activeRequest: isStreaming,
})

const {
  requests: groupPermissionRequests,
  busyId: groupPermissionBusyId,
  approve: approveGroupPermission,
  reject: rejectGroupPermission,
} = usePermissionApprovals({
  scope: computed(() => ({
    originType: 'group',
    originSessionId: currentGroupSessionId.value || '',
    originGroupId: currentGroup.value?.id || '',
  })),
  active: computed(() => props.active !== false && !!currentGroup.value?.id && !!currentGroupSessionId.value),
})

const {
  confirmBusy: presentedPlanConfirmBusy,
  planForMessage,
  canConfirmOnPlanCard,
  confirmExecute: confirmPresentedPlanExecute,
} = usePresentedPlanConfirmExecute({
  scope: 'group',
  scopeId: computed(() => currentGroup.value?.id || ''),
  exactSessionId: currentGroupSessionId,
  messages,
  executionEvents: groupAgentExecutionEvents,
  turnBusy: isStreaming,
  send: (options) => sendMessage(options),
})
</script>

<template src="./GroupChat.template.html"></template>

<style scoped src="./GroupChat.css"></style>
