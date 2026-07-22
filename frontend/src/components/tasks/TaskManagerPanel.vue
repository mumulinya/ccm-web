<script setup>
import EmptyState from '../common/EmptyState.vue'
import LoadingSkeleton from '../common/LoadingSkeleton.vue'
import TaskAttachmentPicker from '../common/TaskAttachmentPicker.vue'
import PermissionApprovalCards from '../common/PermissionApprovalCards.vue'
import { useTaskManager } from './useTaskManager.js'
import { Inbox, ListTodo, Plus, RefreshCw, Route, Sparkles } from '@lucide/vue'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigated', 'resume-project-permission'])

const {
  AgentPipeline, TaskListItem, TaskBacklogModal, DailyDevTaskModal, TaskDispatchHeader, tasks,
  pendingPermissionRequests, standalonePermissionRequests, permissionDecisionBusyId,
  groups, projects, stats, orchestratorDiagnostics, taskExecutions, executionActionBusy,
  showArchivedTasks, archivedTaskCount, selectedTaskIds, editingTaskId, activeTaskView, taskSearch,
  taskStatusFilter, showCreate, showDailyDevCreate, showQueue, showLogs, showReport,
  showContinue, currentTaskLogs, currentTaskId, currentTaskReport, currentTaskTrace, taskTraceLoading,
  currentContinueTask, continueMessage, executionDashboard, executionDashboardLoading, activeAgentRuns, activeAgentRunsLoading,
  runtimeDebtPreview, runtimeDebtLoading, dashboardFilter, dashboardSummary, dashboardItems, dashboardQueue,
  dashboardFilterOptions, filteredDashboardItems, setDashboardFilter, isDashboardItemExpanded, toggleDashboardItem, phaseLabel,
  phaseTone, actionClass, findTaskByDashboardItem, compactDashboardText, actionVisible, workflowAgentPreview,
  receiptStatusText, workflowStatusTone, loadExecutionDashboard, loadActiveAgentRuns, stopAgentRun, previewRuntimeDebtCleanup,
  cleanupRuntimeDebt, runDashboardProbe, showBacklog, dailyDevBacklogs, backlogCounts, backlogBulkDispatchLoading,
  backlogBulkDispatchResult, backlogImportLoading, backlogImportResult, backlogStatusLabel, formatBacklogTime, backlogState,
  backlogCount, backlogQualityText, backlogLatestHistory, backlogCanDispatch, backlogCanRestoreReady, loadDailyDevBacklogs,
  openBacklog, updateBacklogStatus, dispatchBacklog, dispatchReadyBacklogs, importSharedDocsToBacklog, newTask,
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
  autoContinueDashboardItem, confirmDashboardDone, handleDashboardAction, viewTaskLogs, showPipeline, currentPipelineTask,
  viewPipeline, loadTaskExecutions, currentExecutions, currentDeliverySummary, currentReviewSummary, currentWorkerNotifications,
  visibleTaskTitle, visibleTaskStatusDetail, visibleRequiredVerification, visibleDeliveryBlockers, visibleUserDeliveryReport, loadTaskTrace,
  viewReport, cancelTask, rollbackExecution, mergeExecution, cleanupExecution, openContinueTask,
  continueFromReport, submitContinuationPayload, submitTaskContinuation, autoContinueFromReport, resendTask, priorityLabel,
  visibleTasks, handleCreateType, changeTaskView, toggleArchivedTasks, decideTaskPermission
} = useTaskManager(props, emit)
</script>

<template src="./TaskManager.template.html"></template>

<style scoped src="./TaskManager.css"></style>
