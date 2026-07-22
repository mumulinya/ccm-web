<script setup>
import { computed } from 'vue'
import EmptyState from '../common/EmptyState.vue'
import ChatAvatar from '../common/ChatAvatar.vue'
import SessionContextUsage from '../common/SessionContextUsage.vue'
import ConversationFindBar from '../common/ConversationFindBar.vue'
import PermissionApprovalCards from '../common/PermissionApprovalCards.vue'
import { useProjectManager } from './useProjectManager.js'
import { useSessionContextUsage } from '../../composables/useSessionContextUsage.js'
import { usePermissionApprovals } from '../../composables/usePermissionApprovals.js'

const props = defineProps({
  navigateTo: { type: Object, default: null },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['navigated'])

const {
  ChatComposer, ConversationTurnControls, CommandResultCard, MessageNavigator, AgentCodeChangeDrawer, ProjectAgentMessage,
  UnifiedDiffModal, TemplateVariablesModal, ProjectFormModal, ProjectFeishuQrModal, ProjectFolderBrowserModal, ProjectToolsModal,
  ProjectSharedFilesModal, ProjectAgentSwitchModal, ProjectWorkspaceHeader, ProjectSessionSidebar, ProjectArchiveManager, PanelLeft,
  highlightMsgIndex, handleNavigation, scrollToMessage, projects, currentProject, currentSession,
  sessions, messages, messagesEl, chatInput, isMessagesPinnedToBottom, updateMessageScrollState,
  scrollToBottom, attachMessagesResizeObserver, detachMessagesResizeObserver, navMessages, codeChangeDrawer, openCodeChangeDrawer,
  openSingleFileChange, closeCodeChangeDrawer, slashNavigate, runProjectClientCommand, slash, focusProjectInput,
  showTemplateSelector, allTemplates, templateSearchQuery, activeTemplateIndex, recommendedTemplate, activeTemplate,
  templateVariables, showVariableModal, openTemplateSelector, selectChatTemplate, applyTemplateVariables, detectRecommendation,
  applyRecommendation, handleTemplateKeydown, hideTemplateAssist, chatFiles, diffViewer, pageInfo,
  agentOptions, loadAgentOptions, messageKeyMap, messageKeySeq, getMessageKey,
  showCreate, showEdit, showSwitchAgent, showTools, showSharedFiles, showArchives,
  mobileSessionsOpen, projectActionBusy, showFeishuQr, editProject, feishuQrUrl, feishuQrStatus,
  feishuQrLoading, feishuProjectSetupToken, browsePath, browseItems, browseTarget, drives, browseHome, browseLoading, browseError,
  showFolderBrowser, form, updateProjectFormField, platforms, loadProjects, activeSelectedTemplate,
  pendingTemplateToApply, selectProject, loadSessions, selectSession, startProject, stopProject,
  deleteProject, handleArchiveNotify, openCreateModal, submitCreate, openEditModal, submitEdit, loadProjectGitStatus,
  openSwitchAgent, switchAgent, startProjectWithAgent, createSession, renameSession, deleteSession,
  saveCurrentProjectSessionKnowledge, getProjectTaskCard, postTaskAction, removeMessageFromCurrentSession, handleProjectTaskAction, isStreaming,
  thinkingMessages, pendingProjectParentRunId, streamController, activeProjectRunId, stoppingProjectTurn, makeProjectMessageId,
  projectTurnConversationId, projectTurnControl, projectComposerSendLabel, stopStreaming, drainProjectTurnQueue, submitProjectMessageWhileBusy,
  sendMessage, formatFileSize, onChatFilesSelected, removeChatFile, openFileDiff, openProjectChangesTab,
  closeFileDiff, currentSessionNew, autoNameSession, chatTarget, showLogsPanel, logsContent,
  toggleLogs, loadLogs, openFeishuQr, startFeishuQrSetup, openFolderBrowser, loadDrives,
  loadFolderContents, browseGoUp, createBrowseFolder, selectFolder, projectTools, allTools, projectToolAudit,
  projectAuthorizationReadiness, projectConnectionPreflight, projectToolVerification, projectVerificationCommands, inferredProjectVerificationCommands, projectVerificationSource,
  projectResponsibility, projectCapabilities, projectWritablePaths, projectForbiddenPaths, projectDeliveryContract, normalizeProjectTools,
  loadProjectTools, saveProjectTools, applyInferredVerificationCommands, updateProjectToolField, toggleProjectTool, projectFiles,
  showAddFile, showEditFile, editFileName, editFileContent, updateProjectSharedFileField, loadProjectSharedFiles,
  addProjectFile, submitAddProjectFile, editProjectFile, submitEditProjectFile, deleteProjectFile, handleInput,
  handleKeydown
} = useProjectManager(props, emit)

const projectContextScopeId = computed(() => currentProject.value && currentSession.value
  ? `${currentProject.value}::${currentSession.value}`
  : '')
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
