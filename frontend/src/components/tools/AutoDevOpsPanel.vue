<script setup>
import EmptyState from '../common/EmptyState.vue'
import LoadingSkeleton from '../common/LoadingSkeleton.vue'
import { useAutoDevOps } from './useAutoDevOps.js'
import {
  Activity, AlertTriangle, Bell, CheckCircle2, Clock3, FileText,
  Play, RefreshCw, ShieldCheck, Workflow,
} from '@lucide/vue'

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

const viewIcons = { overview: Activity, reports: FileText, notifications: Bell }
</script>

<template src="./AutoDevOps.template.html"></template>

<style scoped src="./AutoDevOps.css"></style>
