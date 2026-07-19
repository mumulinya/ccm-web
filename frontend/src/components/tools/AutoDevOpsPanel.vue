<script setup>
import EmptyState from '../common/EmptyState.vue'
import LoadingSkeleton from '../common/LoadingSkeleton.vue'
import { useAutoDevOps } from './useAutoDevOps.js'

const emit = defineEmits(['navigate'])

const {
  AutoDevReportDocument,
  pageRoot,
  activeView,
  reportKind,
  overviewLoading,
  readinessLoading,
  activeAction,
  overview,
  latestRun,
  selectedDailyReportId,
  selectedWeeklyReportId,
  notification,
  feishu,
  views,
  dailyReports,
  weeklyReports,
  activeReport,
  reportEvidence,
  reportOwnership,
  reportEvidenceSources,
  summary,
  backlog,
  activities,
  blockers,
  enabledDailyDevJobs,
  notificationHistory,
  isBusy,
  readinessTone,
  readinessTitle,
  readinessDescription,
  readinessChecks,
  nextActions,
  activeReportMarkdown,
  reportTechnicalDetails,
  reportHasTechnicalDetails,
  friendlyAction,
  loadDiagnostics,
  refreshAll,
  runAutopilot,
  generateDailyReport,
  generateWeeklyReport,
  saveNotification,
  sendNotification,
  formatTime,
  formatShortTime,
  switchView,
} = useAutoDevOps(emit)
</script>

<template src="./AutoDevOps.template.html"></template>

<style scoped src="./AutoDevOps.css"></style>
