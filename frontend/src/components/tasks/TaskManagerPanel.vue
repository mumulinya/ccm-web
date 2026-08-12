<script setup>
import { computed } from 'vue'
import EmptyState from '../common/EmptyState.vue'
import LoadingSkeleton from '../common/LoadingSkeleton.vue'
import TaskAttachmentPicker from '../common/TaskAttachmentPicker.vue'
import PermissionApprovalCards from '../common/PermissionApprovalCards.vue'
import WorkspacePageShell from '../common/WorkspacePageShell.vue'
import ResponsiveDetailDrawer from '../common/ResponsiveDetailDrawer.vue'
import { useTaskManager } from './useTaskManager.js'
import { Inbox, ListTodo, Plus, RefreshCw, Route, Sparkles } from '@lucide/vue'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigated', 'resume-project-permission', 'navigate'])

const {
  AgentPipeline, TaskListItem, TaskBacklogModal, DailyDevTaskModal, TaskDispatchHeader, AutomatedTaskIntakeModal, tasks,
  pendingPermissionRequests, standalonePermissionRequests, permissionDecisionBusyId,
  groups, projects, stats, orchestratorDiagnostics, taskExecutions, executionActionBusy, taskCancelBusyId, taskStopNotice,
  showArchivedTasks, archivedTaskCount, selectedTaskIds, editingTaskId, activeTaskView, taskSearch,
  taskStatusFilter, showCreate, showDailyDevCreate, showAutomatedIntake, showQueue, showLogs, showReport,
  showContinue, currentTaskLogs, currentTaskId, currentTaskReport, currentTaskTrace, taskTraceLoading,
  currentContinueTask, continueMessage, executionDashboard, executionDashboardLoading, activeAgentRuns, activeAgentRunsLoading,
  runtimeDebtPreview, runtimeDebtLoading, dashboardFilter, dashboardSummary, dashboardItems, dashboardQueue,
  dashboardFilterOptions, filteredDashboardItems, setDashboardFilter, isDashboardItemExpanded, toggleDashboardItem, phaseLabel,
  phaseTone, actionClass, findTaskByDashboardItem, compactDashboardText, actionVisible, workflowAgentPreview,
  receiptStatusText, workflowStatusTone, loadExecutionDashboard, loadActiveAgentRuns, stopAgentRun, previewRuntimeDebtCleanup,
  cleanupRuntimeDebt, runDashboardProbe, showBacklog, dailyDevBacklogs, requirementCollections, backlogCounts,
  requirementCollectionCounts, backlogBulkDispatchLoading,
  backlogBulkDispatchResult, backlogImportLoading, backlogImportResult, backlogStatusLabel, formatBacklogTime, backlogState,
  backlogCount, backlogQualityText, backlogLatestHistory, backlogCanDispatch, backlogCanRestoreReady, loadDailyDevBacklogs,
  openBacklog, updateBacklogStatus, dispatchBacklog, dispatchReadyBacklogs, importSharedDocsToBacklog, newTask,
  taskTemplates, selectedTaskTemplate, taskPreflight, taskPreflightLoading, loadTaskTemplates, applySelectedTaskTemplate,
  runTaskPreflight, saveCurrentTaskTemplate, convertTaskToCron,
  addTaskFiles, handleTaskPaste, removeExistingTaskAttachment,
  defaultDailyDevTask, dailyDevTask, updateDailyDevTaskField, loadTasks, toggleTaskSelection, loadGroups,
  loadProjects, loadOrchestratorDiagnostics, refreshTaskWork, formatDuration, visibleReportText, visibleReportObject,
  visibleReportList, continuationStrategyLabel, updateStats, deliveryEvidenceItems, isExecutionBlockedTask, executionBlockedMessage,
  executionFixActions, executionStateLabel, greenLevelLabel, taskKernelState, taskKernelGreen, canCancelTask,
  canManualCompleteDailyDev, hasCategorizedVerification, receiptTone, workflowSummaryItems, normalizeReceiptEvidence, receiptEvidenceItems,
  hasExecutionEvidence, buildContinuationDraft, dailyDevGroupReadiness, selectedDailyDevGroupReadiness, dailyDevGroupCanExecute, selectedDailyDevGroupCanExecute,
  dailyDevGroupReadinessMessage, selectedDailyDevGroupMessage, dailyDevIntakeQuality, submitCreateTask, buildDailyDevCreatePayload, formatQualityMissing,
  submitDailyDevTask, updateStatus, deleteTask, openCreateTask, editTask, restoreTask,
  purgeTask, runBulkTaskAction, addToQueue, addAllToQueue, queueStatus, watchdogStatus,
  loadQueueStatus, showQueueStatus, resumeQueue, resumeWatchdog, retryRuntimeFailures, replanDashboardTask,
  autoContinueDashboardItem, confirmDashboardDone, dashboardRecoveryPresentation, handleDashboardAction, viewTaskLogs, showPipeline, currentPipelineTask,
  viewPipeline, loadTaskExecutions, currentExecutions, currentDeliverySummary, currentReviewSummary, currentWorkerNotifications,
  visibleTaskTitle, visibleTaskStatusDetail, visibleRequiredVerification, visibleDeliveryBlockers, visibleUserDeliveryReport, loadTaskTrace,
  viewReport, cancelTask, undoStoppedTask, handleTaskStopRecovery, rollbackExecution, rewindExecutionFiles, mergeExecution, cleanupExecution, openContinueTask,
  continueFromReport, submitContinuationPayload, submitTaskContinuation, autoContinueFromReport, resendTask, priorityLabel,
  visibleTasks, handleCreateType, changeTaskView, toggleArchivedTasks, decideTaskPermission, openTaskReplay,
  openRequirementIntake, openRequirementCollection, changeTaskPriority
} = useTaskManager(props, emit)

const taskViews = computed(() => [
  { id: 'overview', label: '概况', count: Number(stats.pending || 0) + Number(stats.inProgress || 0) },
  { id: 'all', label: '全部任务', count: stats.total || 0 },
  { id: 'needs', label: '需要处理', count: pendingPermissionRequests.value?.length || 0 },
  { id: 'advanced', label: '高级治理' },
])
const taskPrimaryAction = computed(() => ({ id: 'create', label: '新建任务', icon: Plus }))
const taskSecondaryActions = computed(() => [
  { id: 'standard', label: '新建普通任务', icon: ListTodo },
  { id: 'backlog', label: '打开需求池', icon: Inbox },
  { id: 'refresh', label: '刷新任务数据', icon: RefreshCw },
])
const handleTaskSecondaryAction = action => {
  if (action?.id === 'standard') return handleCreateType('standard')
  if (action?.id === 'backlog') return openBacklog()
  if (action?.id === 'refresh') return refreshTaskWork()
}
const needsAttentionItems = computed(() => dashboardItems().filter(item =>
  (item.blockers || []).length || (item.actions || []).some(action => actionVisible(action)) || ['failed', 'blocked', 'needs_user'].includes(String(item.phase || item.status || '').toLowerCase())
))
</script>

<template src="./TaskManager.template.html"></template>

<style scoped src="./TaskManager.css"></style>
