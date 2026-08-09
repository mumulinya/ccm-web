<script setup>
import { computed } from 'vue'
import ConversationMessageShell from '../common/ConversationMessageShell.vue'
import ConversationProcessingState from '../common/ConversationProcessingState.vue'
import SessionContextUsage from '../common/SessionContextUsage.vue'
import ConversationFindBar from '../common/ConversationFindBar.vue'
import PermissionApprovalCards from '../common/PermissionApprovalCards.vue'
import { useProjectManager } from './useProjectManager.js'
import { useSessionContextUsage } from '../../composables/useSessionContextUsage.js'
import { usePermissionApprovals } from '../../composables/usePermissionApprovals.js'
import { MessageSquareText, Plus } from '@lucide/vue'
import GlobalAgentFeishuBindingModal from '../global/GlobalAgentFeishuBindingModal.vue'
import AgentExecutionTranscript from '../common/AgentExecutionTranscript.vue'
import { useAgentExecutionEvents } from '../../composables/useAgentExecutionEvents.js'
import { getCopyableMessageText } from '../../utils/messageActions.js'
import { hasTerminalExecutionForMessage, shouldShowCompactProcessingState } from '../../utils/agentExecutionEvents.js'

const props = defineProps({
  navigateTo: { type: Object, default: null },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['navigated'])

const {
  ChatComposer, ConversationTurnControls, CommandResultCard, MessageNavigator, AgentCodeChangeDrawer, ProjectAgentMessage,
  UnifiedDiffModal, ProjectFormModal, ProjectFeishuQrModal, ProjectFolderBrowserModal, ProjectToolsModal,
  ProjectSharedFilesModal, ProjectAgentSwitchModal, ProjectWorkspaceHeader, ProjectSessionSidebar, ProjectArchiveManager, ProjectRuntimeBar, ProjectRuntimeConfigModal, ProjectRunConsole, GroupTestTargetsModal, PanelLeft,
  highlightMsgIndex, handleNavigation, scrollToMessage, projects, currentProject, currentSession, currentSessionDraft, hasProjectConversation,
  sessions, projectFeishuTargets, projectFeishuBindingSession, projectFeishuBindingOpen, projectFeishuBindingBusy,
  messages, messagesEl, chatInput, isMessagesPinnedToBottom, updateMessageScrollState,
  scrollToBottom, attachMessagesResizeObserver, detachMessagesResizeObserver, navMessages, codeChangeDrawer, openCodeChangeDrawer,
  openSingleFileChange, closeCodeChangeDrawer, slashNavigate, runProjectClientCommand, slash,
  chatFiles, diffViewer, pageInfo,
  agentOptions, loadAgentOptions, messageKeyMap, messageKeySeq, getMessageKey,
  showCreate, showEdit, showSwitchAgent, showTools, showProjectTestTargets, showSharedFiles, showArchives, projectCreateBusy, projectCloneStatus,
  mobileSessionsOpen, projectActionBusy, projectRuntime, projectRuntimeLoading, projectRuntimeBusy, selectedRuntimeProfileId, selectedRuntimeProcess, showRuntimeConfig, projectToolchainTestResult, showFeishuQr, editProject, feishuQrUrl, feishuQrStatus,
  feishuQrLoading, feishuProjectSetupToken, browsePath, browseItems, browseTarget, drives, browseHome, browseLoading, browseError,
  showFolderBrowser, form, updateProjectFormField, platforms, loadProjects, loadProjectRuntime, rescanProjectRuntime, saveProjectRuntime, testProjectRuntimeToolchain, runProjectRuntimeAction,
  selectProject, loadSessions, selectSession, startProject, stopProject,
  deleteProject, handleArchiveNotify, openCreateModal, submitCreate, cancelProjectClone, openEditModal, submitEdit, loadProjectGitStatus,
  openSwitchAgent, switchAgent, startProjectWithAgent, createSession, openProjectFeishuBinding, updateProjectFeishuBinding, renameSession, deleteSession,
  saveCurrentProjectSessionKnowledge, getProjectTaskCard, postTaskAction, removeMessageFromCurrentSession, handleProjectTaskAction, isStreaming,
  pendingProjectParentRunId, streamController, activeProjectRunId, stoppingProjectTurn, makeProjectMessageId,
  projectTurnConversationId, projectTurnControl, projectComposerSendLabel, stopStreaming, drainProjectTurnQueue, guideProjectQueuedTurn, submitProjectMessageWhileBusy,
  sendMessage, editProjectUserMessage, formatFileSize, onChatFilesSelected, removeChatFile, openFileDiff, openProjectChangesTab,
  closeFileDiff, currentSessionNew, autoNameSession, chatTarget, showLogsPanel, logsTitle, logsProfileId, logsKind, logsRuntimeProcess,
  openProjectRuntimeLogs, openFeishuQr, startFeishuQrSetup, openFolderBrowser, loadDrives,
  loadFolderContents, browseGoUp, createBrowseFolder, selectFolder, projectTools, allTools, projectToolAudit,
  projectAuthorizationReadiness, projectConnectionPreflight, projectToolVerification, projectVerificationCommands, inferredProjectVerificationCommands, projectVerificationSource,
  projectResponsibility, projectCapabilities, projectWritablePaths, projectForbiddenPaths, projectDeliveryContract, projectContextPolicy, normalizeProjectTools,
  projectTestTargets, projectTestAuth, projectTestTargetsLoading, projectTestTargetsSaving, loadProjectTestTargets, saveProjectTestTarget, deleteProjectTestTarget,
  loadProjectTools, saveProjectTools, applyInferredVerificationCommands, updateProjectToolField, updateProjectContextPolicy, toggleProjectTool, projectFiles,
  showAddFile, showEditFile, editFileName, editFileContent, updateProjectSharedFileField, loadProjectSharedFiles,
  addProjectFile, submitAddProjectFile, editProjectFile, submitEditProjectFile, deleteProjectFile, handleInput,
  handleKeydown
} = useProjectManager(props, emit)

const projectContextScopeId = computed(() => currentProject.value && currentSession.value
  ? `${currentProject.value}::${currentSession.value}`
  : '')
const {
  events: projectAgentExecutionEvents,
  enabled: projectAgentExecutionEnabled,
} = useAgentExecutionEvents({
  scope: computed(() => 'project'),
  scopeId: currentProject,
  exactSessionId: currentSession,
  active: computed(() => props.active !== false && !!currentProject.value && !!currentSession.value),
})
const {
  usage: projectContextUsage,
  loading: projectContextLoading,
  error: projectContextError,
  compacting: projectContextCompacting,
  refresh: refreshProjectContextUsage,
} = useSessionContextUsage({
  scope: 'project_session',
  scopeId: projectContextScopeId,
  enabled: computed(() => props.active !== false && !!projectContextScopeId.value),
  refreshKey: computed(() => `${messages.value.length}:${isStreaming.value}`),
  activeRequest: isStreaming,
})

const continueProjectAfterPermission = async (request) => {
  const draft = chatInput.value
  chatInput.value = `权限申请 ${request.id} 已获用户批准。请继续当前未完成任务；仅通过 ccm__permission_broker 使用这项精确、限时、单次授权。`
  await sendMessage()
  if (!chatInput.value && draft) chatInput.value = draft
}

const {
  requests: projectPermissionRequests,
  busyId: projectPermissionBusyId,
  approve: approveProjectPermission,
  reject: rejectProjectPermission,
} = usePermissionApprovals({
  scope: computed(() => ({
    originType: 'project',
    originSessionId: currentSession.value || '',
    originProject: currentProject.value || '',
  })),
  active: computed(() => props.active !== false && !!currentProject.value && !!currentSession.value),
  onApproved: continueProjectAfterPermission,
})
</script>

<template src="./ProjectManager.template.html"></template>

<style scoped src="./ProjectManager.css"></style>
