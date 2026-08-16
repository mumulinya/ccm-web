<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import ConversationMessageShell from '../common/ConversationMessageShell.vue'
import SessionContextUsage from '../common/SessionContextUsage.vue'
import ConversationAwayRecap from '../common/ConversationAwayRecap.vue'
import ConversationFindBar from '../common/ConversationFindBar.vue'
import PermissionApprovalCards from '../common/PermissionApprovalCards.vue'
import { useProjectManager } from './useProjectManager.js'
import { useSessionContextUsage } from '../../composables/useSessionContextUsage.js'
import { usePermissionApprovals } from '../../composables/usePermissionApprovals.js'
import { AlertCircle, CheckCircle2, MessageSquareText, Paperclip, Plus } from '@lucide/vue'
import GlobalAgentFeishuBindingModal from '../global/GlobalAgentFeishuBindingModal.vue'
import AgentExecutionTranscript from '../common/AgentExecutionTranscript.vue'
import PresentedPlanCard from '../common/PresentedPlanCard.vue'
import ActiveTaskPlanDock from '../common/ActiveTaskPlanDock.vue'
import PrePlanClarificationDock from '../common/PrePlanClarificationDock.vue'
import ConversationAsideDock from '../common/ConversationAsideDock.vue'
import ConversationHistoryBranches from '../common/ConversationHistoryBranches.vue'
import ConversationModeToolbar from '../common/ConversationModeToolbar.vue'
import ConversationSummaryBoundary from '../common/ConversationSummaryBoundary.vue'
import NewProgressIndicator from '../common/NewProgressIndicator.vue'
import { useAgentExecutionEvents } from '../../composables/useAgentExecutionEvents.js'
import { getCopyableMessageText } from '../../utils/messageActions.js'
import { hasAcceptedExecutionForMessage, liveAssistantInProgressText, liveAssistantProvisionalText, shouldRenderExecutionTranscript } from '../../utils/agentExecutionEvents.js'
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
const attachmentSizeLabel = (size) => {
  const value = Math.max(0, Number(size || 0))
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
const attachmentReadOk = (file) => file?.readable === true || ['parsed', 'partial', 'received'].includes(String(file?.status || '').toLowerCase())
const attachmentStatusLabel = (file) => {
  const status = String(file?.status || '').toLowerCase()
  if (status === 'partial') return '部分读取'
  if (file?.readable === true || status === 'parsed') return '已读取'
  if (['failed', 'blocked', 'unreadable'].includes(status)) return '未读取'
  return '已接收'
}

const {
  ChatComposer, ConversationTurnControls, CommandResultCard, MessageNavigator, AgentCodeChangeDrawer, ProjectAgentMessage,
  UnifiedDiffModal, ProjectFormModal, ProjectFeishuQrModal, ProjectFolderBrowserModal, ProjectToolsModal,
  ProjectSharedFilesModal, ProjectAgentSwitchModal, ProjectWorkspaceHeader, ProjectSessionSidebar, ProjectArchiveManager, ProjectRuntimeBar, ProjectRuntimeConfigModal, ProjectRunConsole, GroupTestTargetsModal, PanelLeft,
  highlightMsgIndex, handleNavigation, scrollToMessage, projects, currentProject, currentSession, currentSessionDraft, hasProjectConversation,
  sessions, projectFeishuTargets, projectFeishuBindingSession, projectFeishuBindingOpen, projectFeishuBindingBusy,
  messages, projectSessionExecutionEvents, messagesEl, chatInput, isMessagesPinnedToBottom, updateMessageScrollState,
  pendingProjectProgressCount, notifyProjectProgress, jumpToLatestProjectProgress, resetProjectPinnedScroll,
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
  pendingProjectParentRunId, streamController, activeProjectRunId, activeProjectMainTaskId, stoppingProjectTurn, makeProjectMessageId,
  projectTurnConversationId, projectTurnControl, projectTurnBusy, projectComposerSendLabel, stopStreaming, drainProjectTurnQueue, guideProjectQueuedTurn, submitProjectMessageWhileBusy,
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

const activeProjectPrePlanRow = computed(() => findActivePrePlanClarification(messages.value, { purpose: 'pre_plan' }))
const activeProjectPrePlanClarification = computed(() => activeProjectPrePlanRow.value?.clarification || null)
const submitProjectPrePlanClarification = async payload => {
  const row = activeProjectPrePlanRow.value
  if (!row?.message || !payload?.answerText || prePlanClarificationBusy.value) return
  prePlanClarificationBusy.value = true
  try {
    await validatePrePlanClarificationAction({ clarification: payload.clarification, action: payload.useDefaults ? 'defaults' : 'answer', scope: 'project', scopeId: currentProject.value, exactSessionId: currentSession.value, answers: payload.answers, additionalNote: payload.additionalNote })
    chatInput.value = payload.answerText
    await nextTick()
    await sendMessage({ prePlanClarification: { ...payload, messageId: row.message.id } })
  } finally { prePlanClarificationBusy.value = false }
}
const cancelProjectPrePlanClarification = async () => {
  try {
    await validatePrePlanClarificationAction({ clarification: activeProjectPrePlanClarification.value, action: 'cancel', scope: 'project', scopeId: currentProject.value, exactSessionId: currentSession.value })
  } catch (error) { return toast.error(error?.message || '取消失败') }
  const clarification = activeProjectPrePlanClarification.value
  if (clarification) clarification.status = 'cancelled'
  toast.info('已取消本次计划前澄清')
}
const submitInlineProjectClarification = async payload => {
  if (!payload?.answerText || prePlanClarificationBusy.value) return
  prePlanClarificationBusy.value = true
  try {
    if (payload.clarification?.id) {
      await validatePrePlanClarificationAction({ clarification: payload.clarification, action: 'answer', scope: 'project', scopeId: currentProject.value, exactSessionId: currentSession.value, answers: payload.answers, additionalNote: payload.additionalNote })
    }
    chatInput.value = payload.answerText
    await nextTick()
    await sendMessage()
  } finally { prePlanClarificationBusy.value = false }
}

const projectContextScopeId = computed(() => currentProject.value && currentSession.value
  ? `${currentProject.value}::${currentSession.value}`
  : '')
const {
  events: projectAgentExecutionEvents,
  enabled: projectAgentExecutionEnabled,
  meaningfulRevision: projectMeaningfulRevision,
  latestMeaningfulKey: projectLatestMeaningfulKey,
  refresh: refreshProjectAgentExecutionEvents,
} = useAgentExecutionEvents({
  scope: computed(() => 'project'),
  scopeId: currentProject,
  exactSessionId: currentSession,
  seedEvents: projectSessionExecutionEvents,
  active: computed(() => props.active !== false && !!currentProject.value && !!currentSession.value),
})
// Session history and the execution ledger are loaded independently. Re-read
// the ledger once the authoritative message envelope arrives so a completed
// read-only turn cannot miss its "查询过程" because the first event request
// raced ahead of session hydration.
watch(
  () => `${currentProject.value || ''}:${currentSession.value || ''}:${messages.value.length}:${messages.value.at(-1)?.id || ''}`,
  () => { if (currentProject.value && currentSession.value && messages.value.length) void refreshProjectAgentExecutionEvents({ notify: false }) },
  { flush: 'post' },
)
const projectTaskExecutionActive = computed(() => {
  if (activeProjectRunId.value || activeProjectMainTaskId.value) return true
  return messages.value.some(message => {
    const taskId = String(message?.task_id || message?.taskId || message?.taskExperience?.task_id || '')
    if (!taskId) return false
    const status = String(message?.taskExperience?.status || message?.taskExperience?.phase || '').toLowerCase()
    return !['completed', 'done', 'succeeded', 'failed', 'cancelled', 'canceled', 'reverted'].includes(status)
  })
})
// The streaming envelope is created before the first text chunk. Once the
// turn has real execution events, it must not also show the legacy thinking UI.
const hasLiveProjectExecutionForMessage = messageIndex => shouldRenderExecutionTranscript(
  projectAgentExecutionEvents.value,
  messages.value,
  messageIndex,
)
const liveProjectAssistantProgress = messageIndex => liveAssistantProvisionalText(
  projectAgentExecutionEvents.value,
  messages.value,
  messageIndex,
) || liveAssistantInProgressText(
  projectAgentExecutionEvents.value,
  messages.value,
  messageIndex,
)
watch(projectMeaningfulRevision, () => notifyProjectProgress({ key: projectLatestMeaningfulKey.value }))
watch(currentSession, () => resetProjectPinnedScroll())
const locateProjectPlanStep = ({ messageIndex }) => {
  if (Number.isInteger(messageIndex) && messageIndex >= 0) scrollToMessage(messageIndex)
}
const handleProjectPlanAction = ({ messageIndex, action }) => {
  const message = Number.isInteger(messageIndex) && messageIndex >= 0 ? messages.value[messageIndex] : {}
  return handleProjectTaskAction(message || {}, action)
}
const rewindProjectMessage = async (message) => {
  try {
    const receipt = await rewindConversationTurn({ scope: 'project', scopeId: currentProject.value, exactSessionId: currentSession.value, anchorMessageId: message?.id })
    if (!receipt) return
    await selectSession(currentSession.value)
    chatInput.value = receipt.originalPrompt || ''
    toast.success(receipt.action ? `已总结 ${receipt.summarizedMessages || 0} 条消息` : '已回退到本轮开始前，原需求已放回输入框')
  } catch (error) { toast.error(error?.message || '回退失败') }
}
const sendProjectMessage = async () => {
  if (consumeAsideCommand(chatInput.value, { scope: 'project', scopeId: currentProject.value, exactSessionId: currentSession.value })) {
    chatInput.value = ''
    return
  }
  await sendMessage()
}
const handleProjectKeydown = async (event) => {
  if (event.key === 'Enter' && !event.shiftKey && /^\/btw(?:\s|$)/i.test(chatInput.value)) {
    event.preventDefault()
    await sendProjectMessage()
    return
  }
  await handleKeydown(event)
}
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

const {
  confirmBusy: presentedPlanConfirmBusy,
  planForMessage,
  canConfirmOnPlanCard,
  confirmExecute: confirmPresentedPlanExecute,
} = usePresentedPlanConfirmExecute({
  scope: 'project',
  scopeId: currentProject,
  exactSessionId: currentSession,
  messages,
  executionEvents: projectAgentExecutionEvents,
  turnBusy: isStreaming,
  send: (options) => sendMessage(options),
})
</script>

<template src="./ProjectManager.template.html"></template>

<style scoped src="./ProjectManager.css"></style>
