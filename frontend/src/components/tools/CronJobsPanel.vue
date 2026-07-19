<script setup>
import EmptyState from '../common/EmptyState.vue'
import { useCronJobs } from './useCronJobs.js'

const emit = defineEmits(['navigate'])

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
  refreshTimer,
  selectedRunJob,
  filteredJobs,
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
  readResponse,
  loadJobs,
  scheduleFormFromCron,
  openCreateJob,
  editJob,
  loadOrchestratorDiagnostics,
  loadProjects,
  loadGroups,
  targetLabel,
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
  submitCreate
} = useCronJobs(emit)
</script>

<template src="./CronJobs.template.html"></template>

<style scoped src="./CronJobs.css"></style>
