import { computed, onMounted, onUnmounted, ref } from 'vue'
import AutoDevReportDocument from '../auto-dev/AutoDevReportDocument.vue'
import { toast, confirmDialog } from '../../utils/toast.js'

export function useAutoDevOps(emit) {
  const pageRoot = ref(null)
  const activeView = ref('overview')
  const reportKind = ref('daily')
  const overviewLoading = ref(false)
  const readinessLoading = ref(false)
  const activeAction = ref('')
  const overview = ref(null)
  const diagnostics = ref(null)
  const latestRun = ref(null)
  const selectedDailyReportId = ref('')
  const selectedWeeklyReportId = ref('')
  const notification = ref({
    daily_enabled: false,
    daily_time: '18:30',
    weekly_enabled: false,
    weekly_day: 5,
    weekly_time: '18:40',
    retry_limit: 3,
    retry_interval_minutes: 10,
    history: [],
  })
  const feishu = ref({ notification_ready: false, webhook_ready: false })
  let refreshTimer = null

  const views = [
    { id: 'overview', label: '运行概览' },
    { id: 'reports', label: '工作复盘' },
    { id: 'notifications', label: '通知设置' },
  ]

  const dailyReports = computed(() => overview.value?.reports || [])
  const weeklyReports = computed(() => overview.value?.weekly_reports || [])
  const dailyReport = computed(() => {
    if (!selectedDailyReportId.value) return overview.value?.today || null
    return dailyReports.value.find(item => item.id === selectedDailyReportId.value) || overview.value?.today || null
  })
  const weeklyReport = computed(() => {
    if (!selectedWeeklyReportId.value) return weeklyReports.value[0] || null
    return weeklyReports.value.find(item => item.id === selectedWeeklyReportId.value) || weeklyReports.value[0] || null
  })
  const activeReport = computed(() => reportKind.value === 'weekly' ? weeklyReport.value : dailyReport.value)
  const reportEvidence = computed(() => activeReport.value?.evidence_summary || {})
  const reportOwnership = computed(() => activeReport.value?.ownership || {})
  const reportEvidenceSources = computed(() => reportEvidence.value.captured_sources || [])
  const summary = computed(() => overview.value?.today?.summary || {})
  const backlog = computed(() => overview.value?.backlog || overview.value?.today?.backlog || { counts: {}, total: 0 })
  const activities = computed(() => overview.value?.today?.activities || [])
  const blockers = computed(() => overview.value?.today?.blockers || [])
  const autopilot = computed(() => diagnostics.value?.autopilot || latestRun.value?.autopilot || null)
  const autopilotCounts = computed(() => autopilot.value?.counts || {})
  const dailyDevJobs = computed(() => overview.value?.daily_dev_jobs || [])
  const enabledDailyDevJobs = computed(() => dailyDevJobs.value.filter(job => job.enabled !== false))
  const notificationHistory = computed(() => [...(notification.value.history || [])].reverse().slice(0, 6))
  const isBusy = computed(() => !!activeAction.value)

  const readinessTone = computed(() => {
    if (readinessLoading.value && !diagnostics.value) return 'checking'
    if (diagnostics.value?.readiness === 'ready') return 'ready'
    if (diagnostics.value?.readiness === 'partial') return 'partial'
    return 'blocked'
  })

  const readinessTitle = computed(() => {
    if (readinessLoading.value && !diagnostics.value) return '正在检查自动开发链路'
    if (autopilot.value?.mode === 'ready_to_continue') return '有未完成任务可以继续推进'
    if (autopilot.value?.mode === 'ready_to_dispatch') return '有业务需求可以开始开发'
    if (autopilot.value?.mode === 'ready_to_import') return '有业务资料可以整理成需求'
    if (autopilot.value?.mode === 'waiting_input') return '系统已就绪，正在等待新需求'
    return '自动开发暂时不能稳定运行'
  })

  const readinessDescription = computed(() => {
    if (readinessLoading.value && !diagnostics.value) return '正在核对群聊、项目子 Agent、验收和执行队列。'
    if (autopilot.value?.mode === 'ready_to_continue') return `发现 ${autopilotCounts.value.continuationGaps || 0} 个交付缺口，运行后会优先续跑。`
    if (autopilot.value?.mode === 'ready_to_dispatch') return `当前有 ${autopilotCounts.value.readyBacklogs || 0} 条可接活需求，运行后会交给群聊主 Agent。`
    if (autopilot.value?.mode === 'ready_to_import') return `当前有 ${autopilotCounts.value.sharedFiles || 0} 份共享资料，可先整理成业务需求。`
    if (autopilot.value?.mode === 'waiting_input') return '新的业务资料或 ready 需求进入后即可自动处理。'
    return '至少一个项目子 Agent 的真实执行检查尚未通过，当前不会误派发任务。'
  })

  const readinessChecks = computed(() => {
    const counts = autopilotCounts.value
    const probeTotal = Number(counts.agentProbeExecutable || 0)
    const probeReady = Number(counts.agentProbeReady || 0)
    return [
      {
        id: 'groups',
        label: '可工作的协作群',
        value: `${counts.executableGroups || 0} 个`,
        state: Number(counts.executableGroups || 0) > 0 ? 'ok' : 'warn',
      },
      {
        id: 'demand',
        label: '等待处理的需求',
        value: `${Number(counts.readyBacklogs || 0) + Number(counts.continuationGaps || 0)} 个`,
        state: Number(counts.readyBacklogs || 0) + Number(counts.continuationGaps || 0) > 0 ? 'active' : 'muted',
      },
      {
        id: 'agents',
        label: '可运行的项目子 Agent',
        value: `${probeReady}/${probeTotal}`,
        state: probeTotal > 0 && probeReady === probeTotal ? 'ok' : 'warn',
      },
      {
        id: 'verification',
        label: '项目验收准备',
        value: Number(counts.verificationMissing || 0) > 0 ? `缺 ${counts.verificationMissing}` : '已配置',
        state: Number(counts.verificationMissing || 0) > 0 ? 'warn' : 'ok',
      },
    ]
  })

  const nextActions = computed(() => (autopilot.value?.next_actions || []).slice(0, 3).map(friendlyAction))

  const activeReportMarkdown = computed(() => sanitizeReport(activeReport.value?.markdown || ''))
  const reportTechnicalDetails = computed(() => JSON.stringify({
    schema: activeReport.value?.schema || 'legacy-report',
    immutable_source: activeReport.value?.immutable_source === true,
    generated_at: activeReport.value?.generated_at || '',
    evidence_summary: reportEvidence.value,
    event_ids: activeReport.value?.event_ids || [],
  }, null, 2))
  const reportHasTechnicalDetails = computed(() => {
    const raw = String(activeReport.value?.markdown || '')
    return !!activeReport.value && (
      activeReport.value?.schema === 'ccm-evidence-work-report-v2'
      || (!!raw && raw !== activeReportMarkdown.value)
    )
  })

  function friendlyAction(value) {
    return String(value || '')
      .replace(/先在设置页对目标开发群点击“复检全部”，至少让一个开发群聊的所有可执行项目 Agent 全员通过真实 CLI 探针/g, '先修复项目子 Agent 的执行通道，再重新检查')
      .replace(/等待 daily_dev 定时任务自动导入共享文档，或在需求池里点击“导入共享文档”/g, '等待无人值守任务整理共享资料，或到任务派发页手动导入')
      .replace(/创建并启用 daily_dev 定时任务，让系统定时认领 ready 需求/g, '到定时任务页面启用无人值守接活')
      .replace(/daily_dev/gi, '自动开发')
      .replace(/ready/gi, '可接活')
      .replace(/Agent CLI/gi, '子 Agent 执行通道')
      .replace(/CLI 探针/g, '真实执行检查')
  }

  function sanitizeReport(value) {
    return String(value || '')
      .split(/\r?\n/)
      .map(line => {
        if (/Agent 错误:\s*Command failed:|\|\s*(claude|cursor|codex)\b/i.test(line)) {
          return '- 项目子 Agent 执行曾失败，技术原因请在任务详情中查看'
        }
        return friendlyAction(line)
          .replace(/CCM_AGENT_RECEIPT/g, '结构化结果说明')
          .replace(/cron/gi, '无人值守任务')
      })
      .filter((line, index, all) => index === 0 || line !== all[index - 1])
      .join('\n')
  }

  async function readResponse(res) {
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error || data.success === false) throw new Error(data.error || data.message || `HTTP ${res.status}`)
    return data
  }

  async function loadOverview({ silent = false } = {}) {
    if (!silent) overviewLoading.value = true
    try {
      const data = await readResponse(await fetch('/api/auto-dev/overview'))
      overview.value = data
      notification.value = { ...notification.value, ...(data.notification || {}) }
      if (!selectedDailyReportId.value && data.today?.id) selectedDailyReportId.value = data.today.id
      if (!selectedWeeklyReportId.value && data.weekly_reports?.[0]?.id) selectedWeeklyReportId.value = data.weekly_reports[0].id
    } catch (error) {
      if (!silent) toast.error(error.message || '加载自动开发状态失败')
    } finally {
      if (!silent) overviewLoading.value = false
    }
  }

  async function loadDiagnostics({ silent = false } = {}) {
    readinessLoading.value = true
    try {
      diagnostics.value = await readResponse(await fetch('/api/orchestrator/diagnostics'))
    } catch (error) {
      if (!silent) toast.error(error.message || '自动开发链路检查失败')
    } finally {
      readinessLoading.value = false
    }
  }

  async function loadFeishuStatus() {
    try {
      const data = await readResponse(await fetch('/api/feishu/config'))
      feishu.value = data.config || {}
    } catch {
      feishu.value = { notification_ready: false, webhook_ready: false }
    }
  }

  async function refreshAll() {
    activeAction.value = 'refresh'
    await Promise.all([loadOverview({ silent: true }), loadFeishuStatus(), loadDiagnostics({ silent: true })])
    activeAction.value = ''
  }

  async function runAutopilot() {
    const confirmed = await confirmDialog('立即运行会认领可接活需求、续跑未完成任务，并交给对应项目子 Agent 执行。确定继续？')
    if (!confirmed) return
    activeAction.value = 'run'
    try {
      const data = await readResponse(await fetch('/api/orchestrator/daily-dev-autopilot/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 20,
          gap_continue_limit: 5,
          continue_gaps: true,
          import_shared_docs: true,
          auto_execute: true,
          only_executable_groups: true,
          requires_code_changes: true,
        }),
      }))
      latestRun.value = data
      if (data.outcome?.blocked) toast.warning(data.outcome.message || '任务正在等待执行通道恢复')
      else if (data.continued > 0) toast.success(`已续跑 ${data.continued} 个任务，入队 ${data.gap_queued || 0} 个`)
      else if (data.dispatched > 0) toast.success(`已派发 ${data.dispatched} 条需求，入队 ${data.queued || 0} 条`)
      else if (data.imported > 0) toast.info(`已整理 ${data.imported} 份业务资料`)
      else toast.info('本次没有新的可处理需求')
      await loadOverview({ silent: true })
      loadDiagnostics({ silent: true })
    } catch (error) {
      toast.error(error.message || '自动开发运行失败')
    } finally {
      activeAction.value = ''
    }
  }

  async function generateDailyReport() {
    activeAction.value = 'daily-report'
    try {
      const data = await readResponse(await fetch('/api/auto-dev/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dailyReport.value?.date }),
      }))
      overview.value = { ...(overview.value || {}), today: data.report, reports: data.reports || [] }
      selectedDailyReportId.value = data.report.id
      toast.success('今日日报已更新')
    } catch (error) {
      toast.error(error.message || '生成开发日报失败')
    } finally {
      activeAction.value = ''
    }
  }

  async function generateWeeklyReport() {
    activeAction.value = 'weekly-report'
    try {
      const data = await readResponse(await fetch('/api/auto-dev/weekly-report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }))
      overview.value = { ...(overview.value || {}), weekly_reports: data.reports || [data.report] }
      selectedWeeklyReportId.value = data.report.id
      toast.success('本周周报已更新')
    } catch (error) {
      toast.error(error.message || '生成周报失败')
    } finally {
      activeAction.value = ''
    }
  }

  async function saveNotification() {
    activeAction.value = 'save-notification'
    try {
      const data = await readResponse(await fetch('/api/auto-dev/notification/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification.value),
      }))
      notification.value = data.config
      toast.success('报告通知计划已保存')
    } catch (error) {
      toast.error(error.message || '保存通知计划失败')
    } finally {
      activeAction.value = ''
    }
  }

  async function sendNotification(kind) {
    if (!feishu.value.notification_ready) {
      toast.warning('请先在系统设置中配置报告通知通道')
      return
    }
    activeAction.value = `send-${kind}`
    try {
      const data = await readResponse(await fetch('/api/auto-dev/notification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      }))
      notification.value = data.config || notification.value
      if (kind === 'weekly' && data.report) {
        overview.value = {
          ...(overview.value || {}),
          weekly_reports: [data.report, ...weeklyReports.value.filter(item => item.id !== data.report.id)],
        }
      }
      toast.success(kind === 'weekly' ? '周报已发送' : '今日日报已发送')
    } catch (error) {
      toast.error(error.message || '飞书通知发送失败')
    } finally {
      activeAction.value = ''
    }
  }

  function formatTime(value) {
    return value ? new Date(value).toLocaleString('zh-CN') : '尚未更新'
  }

  function formatShortTime(value) {
    return value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未记录'
  }

  function switchView(viewId) {
    activeView.value = viewId
    window.requestAnimationFrame(() => pageRoot.value?.scrollTo({ top: 0, left: 0 }))
  }

  onMounted(() => {
    loadOverview()
    loadFeishuStatus()
    loadDiagnostics()
    refreshTimer = window.setInterval(() => loadOverview({ silent: true }), 15_000)
  })

  onUnmounted(() => {
    if (refreshTimer) window.clearInterval(refreshTimer)
  })

  return {
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
  }
}
