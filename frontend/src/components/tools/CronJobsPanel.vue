<script setup>
import { computed, ref, watch } from 'vue'
import EmptyState from '../common/EmptyState.vue'
import WorkspacePageShell from '../common/WorkspacePageShell.vue'
import TaskAttachmentPicker from '../common/TaskAttachmentPicker.vue'
import CronRunHistoryDrawer from './CronRunHistoryDrawer.vue'
import {
  Activity,
  Archive,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  History,
  MessagesSquare,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  X
} from '@lucide/vue'
import { useCronJobs } from './useCronJobs.js'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigate', 'navigated'])

const {
  jobs,
  projects,
  groups,
  scheduler,
  orchestratorDiagnostics,
  showCreate,
  editingId,
  showArchived,
  archivedCount,
  runningJobIds,
  selectedRunJobId,
  searchQuery,
  statusFilter,
  targetFilter,
  selectedJobIds,
  bulkLoading,
  templates,
  cronPreview,
  previewLoading,
  selectedTemplate,
  refreshTimer,
  selectedRunJob,
  filteredJobs,
  enabledJobCount,
  disabledJobCount,
  issueJobCount,
  activeRunCount,
  allFilteredSelected,
  newJob,
  weekOptions,
  intervalOptions,
  dailyDevCronPrompt,
  defaultJob,
  parseTime,
  buildSchedule,
  schedulePreview,
  applyDailyDevPrompt,
  addCronFiles,
  handleCronPaste,
  removeExistingCronAttachment,
  readResponse,
  loadJobs,
  scheduleFormFromCron,
  openCreateJob,
  editJob,
  loadOrchestratorDiagnostics,
  loadProjects,
  loadGroups,
  loadTemplates,
  applyCronTemplate,
  targetLabel,
  scheduleLabel,
  statusLabel,
  formatTime,
  formatTimeInZone,
  cronRunMetaItems,
  isJobRunning,
  agentProcessCheck,
  isExecutionBlocked,
  executionBlockReason,
  hasEnabledDailyDevJobs,
  openRunHistory,
  handleRunNavigate,
  handleRunControl,
  toggleJobSelection,
  toggleAllFiltered,
  runBulkAction,
  refreshJobsAndDiagnostics,
  toggleJob,
  runJob,
  deleteJob,
  restoreJob,
  purgeJob,
  copyJobToDispatch,
  handleMisfire,
  buildJobPayload,
  refreshCronPreview,
  submitCreate
} = useCronJobs(props, emit)

const cronView = ref(sessionStorage.getItem('ccm:cron-layout:v1:view') || 'rules')
const cronFormStep = ref(1)
const needsAttentionJob = job => Boolean(job?.paused_reason || job?.schedule_error || job?.pending_misfires?.length || ['failed', 'retry_waiting'].includes(job?.last_status))
const visibleCronJobs = computed(() => {
  if (cronView.value === 'runs') return filteredJobs.value.filter(job => job.run_count || job.last_run || isJobRunning(job.id))
  if (cronView.value === 'needs') return filteredJobs.value.filter(needsAttentionJob)
  return filteredJobs.value
})
const cronViews = computed(() => ([
  { id: 'rules', label: '规则', count: jobs.value.length },
  { id: 'runs', label: '运行记录', count: jobs.value.filter(job => job.run_count || job.last_run || isJobRunning(job.id)).length },
  { id: 'needs', label: '需要处理', count: jobs.value.filter(needsAttentionJob).length },
]))
const cronPrimaryAction = computed(() => showArchived.value || cronView.value !== 'rules' ? null : { id: 'create', label: '新建定时任务', icon: Plus })
const cronSecondaryActions = computed(() => ([
  { id: 'refresh', label: '刷新调度状态', icon: RefreshCw },
  { id: 'archive', label: showArchived.value ? '返回活动规则' : `查看归档（${archivedCount.value}）`, icon: showArchived.value ? RotateCcw : Archive },
]))
const openCronCreate = () => { cronFormStep.value = 1; openCreateJob() }
const editCronJob = job => { cronFormStep.value = 1; editJob(job) }
const handleCronSecondaryAction = action => {
  if (action?.id === 'refresh') refreshJobsAndDiagnostics()
  if (action?.id === 'archive') { showArchived.value = !showArchived.value; loadJobs() }
}
watch(cronView, value => sessionStorage.setItem('ccm:cron-layout:v1:view', value))
</script>

<template src="./CronJobs.template.html"></template>

<style scoped src="./CronJobs.css"></style>
