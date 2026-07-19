<script setup>
import { computed } from 'vue'
import ChatComposer from '../common/ChatComposer.vue'
import SessionContextUsage from '../common/SessionContextUsage.vue'
import ConversationTurnControls from '../common/ConversationTurnControls.vue'
import CommandResultCard from '../common/CommandResultCard.vue'
import EmptyState from '../common/EmptyState.vue'
import ChatAvatar from '../common/ChatAvatar.vue'
import MessageNavigator from '../common/MessageNavigator.vue'
import ConflictPlanMessage from './ConflictPlanMessage.vue'
import ContextCompactionEvent from './ContextCompactionEvent.vue'
import ProjectTaskIntakeMessage from './ProjectTaskIntakeMessage.vue'
import TaskCollaborationCard from './TaskCollaborationCard.vue'
import AgentCodeChangeDrawer from '../agents/AgentCodeChangeDrawer.vue'
import AgentExecutionMessage from '../agents/AgentExecutionMessage.vue'
import AgentQaMessage from '../agents/AgentQaMessage.vue'
import GroupMainAgentStatusCard from './GroupMainAgentStatusCard.vue'
import MainAgentDecisionCard from '../agents/MainAgentDecisionCard.vue'
import GroupChatHeader from './GroupChatHeader.vue'
import GroupLogsModal from './GroupLogsModal.vue'
import GroupToolsModal from './GroupToolsModal.vue'
import GroupSharedFilesModal from './GroupSharedFilesModal.vue'
import GroupMembersModal from './GroupMembersModal.vue'
import GroupCreateModal from './GroupCreateModal.vue'
import GroupRenameModal from './GroupRenameModal.vue'
import UnifiedDiffModal from '../common/UnifiedDiffModal.vue'
import TemplateVariablesModal from '../common/TemplateVariablesModal.vue'
import AgentPipelineModal from '../agents/AgentPipelineModal.vue'
import { useGroupChat } from './useGroupChat.js'
import { useSessionContextUsage } from '../../composables/useSessionContextUsage.js'

const props = defineProps({
  navigateTo: { type: Object, default: null },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['navigated'])

const {
  GROUP_VISIBLE_INTERNAL_TEXT_PATTERN, GROUP_INTERNAL_PROTOCOL_FALLBACK, GROUP_STREAM_ERROR_FALLBACK,
  sanitizeGroupVisibleText, buildGroupStreamErrorText, getVisibleGroupMessageContent, handleGroupNavigation,
  highlightMsgIndex, groups, projects, currentGroup, messages, groupSessions, currentGroupSessionId,
  groupMemory, mainAgentStatus, groupAgentQa, collaborationProtocol, groupMessagesEl, groupMessagesContentEl,
  isGroupMessagesPinnedToBottom, updateGroupMessageScrollState, scrollToBottom,
  attachGroupMessagesResizeObserver, detachGroupMessagesResizeObserver, navMessages, scrollToMessage,
  newMessage, slashNavigate, runGroupClientCommand, pendingDirectMemoryCommand, slash, focusGroupInput,
  showTemplateSelector, allTemplates, templateSearchQuery, activeTemplateIndex, recommendedTemplate,
  activeTemplate, templateVariables, showVariableModal, openTemplateSelector, selectChatTemplate,
  applyTemplateVariables, detectRecommendation, applyRecommendation, handleTemplateKeydown,
  hideTemplateAssist, messageFiles, messageMode, pendingGroupTaskInput,
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
  showRename, showMembers, showTools, showSharedFiles, showLogs, groupTools, groupAllTools, groupToolAudit,
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
  saveGroupTools, groupFiles, loadGroupFiles, addGroupFile, submitAddGroupFile, deleteGroupFile,
  getAvailableProjects, addGroupMember, removeGroupMember, groupPollTimer, lastGroupMsgCount,
  startGroupPolling, stopGroupPolling, origSelectGroup, activeSelectedTemplate, pendingTemplateToApply,
} = useGroupChat(props, emit)

const groupContextScopeId = computed(() => currentGroup.value?.id && currentGroupSessionId.value
  ? `${currentGroup.value.id}::${currentGroupSessionId.value}`
  : '')
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
</script>

<template src="./GroupChat.template.html"></template>

<style scoped src="./GroupChat.css"></style>
