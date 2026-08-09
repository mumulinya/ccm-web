<script setup>
import { computed, ref } from 'vue'
import ChatComposer from '../common/ChatComposer.vue'
import SessionContextUsage from '../common/SessionContextUsage.vue'
import PermissionApprovalCards from '../common/PermissionApprovalCards.vue'
import ConversationTurnControls from '../common/ConversationTurnControls.vue'
import CommandResultCard from '../common/CommandResultCard.vue'
import EmptyState from '../common/EmptyState.vue'
import MessageNavigator from '../common/MessageNavigator.vue'
import ConversationMessageShell from '../common/ConversationMessageShell.vue'
import ConversationProcessingState from '../common/ConversationProcessingState.vue'
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
import { shouldShowCompactProcessingState } from '../../utils/agentExecutionEvents.js'

const props = defineProps({
  navigateTo: { type: Object, default: null },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['navigated'])

const {
  GROUP_VISIBLE_INTERNAL_TEXT_PATTERN, GROUP_INTERNAL_PROTOCOL_FALLBACK, GROUP_STREAM_ERROR_FALLBACK,
  sanitizeGroupVisibleText, buildGroupStreamErrorText, getVisibleGroupMessageContent, handleGroupNavigation,
  highlightMsgIndex, groups, projects, currentGroup, messages, groupSessions, currentGroupSessionId, isGroupSessionDraft,
  groupMemory, mainAgentStatus, groupAgentQa, collaborationProtocol, groupMessagesEl, groupMessagesContentEl,
  isGroupMessagesPinnedToBottom, updateGroupMessageScrollState, scrollToBottom,
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
  getTaskCard, shouldShowOrchestrationPlan, isInternalProtocolMessage, getMessageTaskId,
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
  stoppingGroupTurn, groupTurnConversationId, groupTurnControl, stopGroupCurrentWork, drainGroupTurnQueue, guideGroupQueuedTurn,
  submitGroupMessageWhileBusy, groupSendRetrySignature, sendMessage, editGroupUserMessage, waitingCrossReply, pullNewMessages,
  logs, logFilter, logEventSource, logsResizeObserver, scrollLogsToBottom, loadLogs, startLogStream,
  stopLogStream, clearLogs, normalizeGroupTools, loadAvailableGroupTools, loadGroupTools, toggleGroupTool, updateGroupContextPolicy,
  saveGroupTools, groupTestTargets, groupTestTargetProjects, groupTestTargetsLoading, groupTestTargetsSaving,
  loadGroupTestTargets, saveGroupTestTarget, deleteGroupTestTarget, groupFiles, loadGroupFiles, addGroupFile, submitAddGroupFile, deleteGroupFile,
  getAvailableProjects, addGroupMember, removeGroupMember, groupPollTimer, lastGroupMsgCount,
  startGroupPolling, stopGroupPolling, origSelectGroup,
} = useGroupChat(props, emit)

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
} = useAgentExecutionEvents({
  scope: computed(() => 'group'),
  scopeId: computed(() => currentGroup.value?.id || ''),
  exactSessionId: currentGroupSessionId,
  active: computed(() => props.active !== false && !!currentGroup.value?.id && !!currentGroupSessionId.value),
})
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
</script>

<template src="./GroupChat.template.html"></template>

<style scoped src="./GroupChat.css"></style>
