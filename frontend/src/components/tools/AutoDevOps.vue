<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AutoDevReportDocument from '../auto-dev/AutoDevReportDocument.vue'
import { toast, confirmDialog } from '../../utils/toast.js'

const emit = defineEmits(['navigate'])

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
</script>

<template>
  <div ref="pageRoot" class="auto-dev-page">
    <header class="command-bar">
      <div class="command-title">
        <div class="title-line">
          <h3>自动开发</h3>
          <span :class="['readiness-badge', readinessTone]">
            {{ readinessTone === 'ready' ? '可运行' : readinessTone === 'partial' ? '需关注' : readinessTone === 'checking' ? '检查中' : '暂不可用' }}
          </span>
        </div>
        <p>主 Agent 认领需求、派发项目子 Agent，并在验收后生成报告。</p>
      </div>
      <div class="command-actions">
        <button class="btn btn-outline" :disabled="isBusy" title="重新读取自动开发状态" @click="refreshAll">
          {{ activeAction === 'refresh' ? '刷新中' : '刷新' }}
        </button>
        <button class="btn btn-primary" :disabled="isBusy || readinessLoading" @click="runAutopilot">
          {{ activeAction === 'run' ? '正在运行' : '立即运行' }}
        </button>
      </div>
    </header>

    <nav class="view-tabs" role="tablist" aria-label="自动开发视图">
      <button
        v-for="view in views"
        :key="view.id"
        role="tab"
        :aria-selected="activeView === view.id"
        :class="{ active: activeView === view.id }"
        @click="switchView(view.id)"
      >
        {{ view.label }}
      </button>
    </nav>

    <main class="auto-dev-content">
      <div v-if="activeView === 'overview'" class="overview-view">
        <section :class="['readiness-strip', readinessTone]">
          <span class="status-dot" aria-hidden="true"></span>
          <div>
            <strong>{{ readinessTitle }}</strong>
            <p>{{ readinessDescription }}</p>
          </div>
          <button class="text-action" :disabled="readinessLoading" @click="loadDiagnostics()">
            {{ readinessLoading ? '检查中' : '重新检查' }}
          </button>
        </section>

        <section class="metric-strip" aria-label="今日自动开发概况">
          <div>
            <span>执行中</span>
            <strong>{{ summary.running_tasks || 0 }}</strong>
          </div>
          <div>
            <span>待处理需求</span>
            <strong>{{ backlog.counts?.ready || 0 }}</strong>
          </div>
          <div>
            <span>今日完成</span>
            <strong>{{ summary.done_tasks || 0 }}</strong>
          </div>
          <div>
            <span>需要关注</span>
            <strong>{{ summary.blocked_tasks || 0 }}</strong>
          </div>
        </section>

        <div class="overview-layout">
          <div class="overview-main">
            <section v-if="latestRun" class="section-block latest-run">
              <div class="section-heading">
                <div>
                  <span class="eyebrow">最近一次手动运行</span>
                  <h4>{{ friendlyAction(latestRun.outcome?.message || '运行已完成') }}</h4>
                </div>
                <button class="text-action" @click="emit('navigate', { tab: 'tasks' })">查看任务</button>
              </div>
              <div class="run-stats">
                <span>续跑 <strong>{{ latestRun.continued || 0 }}</strong></span>
                <span>整理资料 <strong>{{ latestRun.imported || 0 }}</strong></span>
                <span>派发 <strong>{{ latestRun.dispatched || 0 }}</strong></span>
                <span>入队 <strong>{{ latestRun.queued || latestRun.gap_queued || 0 }}</strong></span>
              </div>
            </section>

            <section class="section-block">
              <div class="section-heading">
                <div>
                  <span class="eyebrow">今日进展</span>
                  <h4>开发活动</h4>
                </div>
                <span class="section-meta">{{ formatTime(overview?.today?.generated_at) }}</span>
              </div>
              <p v-if="overviewLoading" class="empty-state">正在读取今日进展...</p>
              <p v-else-if="!activities.length" class="empty-state">今天还没有新的开发活动</p>
              <div v-else class="activity-list">
                <article v-for="item in activities.slice(0, 8)" :key="item.id" class="activity-row">
                  <div>
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.actor_label || '系统记录' }} · {{ item.source_label }} · {{ item.location }}</span>
                  </div>
                  <span class="activity-status">{{ item.status_label }}</span>
                </article>
              </div>
            </section>

            <section class="section-block">
              <div class="section-heading">
                <div>
                  <span class="eyebrow">待处理</span>
                  <h4>阻塞与续跑</h4>
                </div>
              </div>
              <p v-if="!blockers.length" class="empty-state success">当前没有需要处理的阻塞</p>
              <div v-else class="blocker-list">
                <article v-for="item in blockers.slice(0, 6)" :key="item.id" class="blocker-row">
                  <strong>{{ item.title }}</strong>
                  <span>{{ friendlyAction(item.reason) }}</span>
                </article>
              </div>
            </section>
          </div>

          <aside class="overview-side">
            <section class="section-block readiness-panel">
              <div class="section-heading">
                <div>
                  <span class="eyebrow">运行准备</span>
                  <h4>自动开发链路</h4>
                </div>
              </div>
              <div class="check-list">
                <div v-for="check in readinessChecks" :key="check.id" class="check-row">
                  <span :class="['check-indicator', check.state]"></span>
                  <span>{{ check.label }}</span>
                  <strong>{{ check.value }}</strong>
                </div>
              </div>
              <div v-if="nextActions.length" class="next-actions">
                <span>接下来</span>
                <ol>
                  <li v-for="action in nextActions" :key="action">{{ action }}</li>
                </ol>
              </div>
            </section>

            <section class="section-block unattended-panel">
              <div class="section-heading compact">
                <div>
                  <span class="eyebrow">无人值守</span>
                  <h4>{{ enabledDailyDevJobs.length ? `已启用 ${enabledDailyDevJobs.length} 个计划` : '尚未启用' }}</h4>
                </div>
                <button class="text-action" @click="emit('navigate', { tab: 'cron' })">管理</button>
              </div>
              <p>调度时间、启停和运行记录统一在定时任务页面管理。</p>
            </section>

            <section class="section-block backlog-panel">
              <div class="section-heading compact">
                <div>
                  <span class="eyebrow">需求池</span>
                  <h4>{{ backlog.total || 0 }} 条业务需求</h4>
                </div>
                <button class="text-action" @click="emit('navigate', { tab: 'tasks' })">查看</button>
              </div>
              <div class="backlog-summary">
                <span>可接活 <strong>{{ backlog.counts?.ready || 0 }}</strong></span>
                <span>待补充 <strong>{{ backlog.counts?.needs_user || 0 }}</strong></span>
                <span>阻塞 <strong>{{ backlog.counts?.blocked || 0 }}</strong></span>
                <span>完成 <strong>{{ backlog.counts?.done || 0 }}</strong></span>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <div v-else-if="activeView === 'reports'" class="reports-view">
        <header class="view-heading">
          <div>
            <h4>工作复盘</h4>
            <p>根据任务、对话、代码变更和验收记录还原真实工作。</p>
          </div>
          <div class="report-actions">
            <button class="btn btn-outline" :disabled="isBusy" @click="reportKind === 'daily' ? generateDailyReport() : generateWeeklyReport()">
              {{ activeAction.includes('report') ? '生成中' : '刷新复盘' }}
            </button>
            <button class="btn btn-primary" :disabled="isBusy || !feishu.notification_ready" @click="sendNotification(reportKind)">
              {{ activeAction.startsWith('send-') ? '发送中' : '发送到飞书' }}
            </button>
          </div>
        </header>

        <div class="report-toolbar">
          <div class="segmented-control" aria-label="报告类型">
            <button :class="{ active: reportKind === 'daily' }" @click="reportKind = 'daily'">日报</button>
            <button :class="{ active: reportKind === 'weekly' }" @click="reportKind = 'weekly'">周报</button>
          </div>
          <select v-if="reportKind === 'daily'" v-model="selectedDailyReportId" aria-label="选择日报日期">
            <option v-for="item in dailyReports" :key="item.id" :value="item.id">{{ item.date }}</option>
          </select>
          <select v-else v-model="selectedWeeklyReportId" aria-label="选择周报周期">
            <option v-for="item in weeklyReports" :key="item.id" :value="item.id">{{ item.start_date }} 至 {{ item.end_date }}</option>
          </select>
        </div>

        <section v-if="activeReport" class="evidence-strip" aria-label="工作复盘数据依据">
          <div>
            <span>工作事件</span>
            <strong>{{ reportEvidence.event_count || 0 }}</strong>
          </div>
          <div>
            <span>强证据</span>
            <strong>{{ reportEvidence.strong_evidence || 0 }}</strong>
          </div>
          <div>
            <span>数据来源</span>
            <strong>{{ reportEvidence.source_count || reportEvidenceSources.length || 0 }}</strong>
          </div>
          <div class="ownership-cell">
            <span>工作归属</span>
            <p>你 {{ reportOwnership.user_actions || 0 }} · Agent {{ reportOwnership.agent_actions || 0 }} · TestAgent {{ reportOwnership.test_agent_actions || 0 }} · 自动化 {{ reportOwnership.system_actions || 0 }}</p>
          </div>
        </section>

        <section class="report-surface">
          <AutoDevReportDocument
            :markdown="activeReportMarkdown"
            :empty-text="reportKind === 'daily' ? '暂无开发日报' : '暂无开发周报'"
          />
          <details v-if="reportHasTechnicalDetails" class="technical-details">
            <summary>技术详情</summary>
            <pre>{{ reportTechnicalDetails }}</pre>
          </details>
        </section>
      </div>

      <div v-else class="notifications-view">
        <header class="view-heading">
          <div>
            <h4>报告通知</h4>
            <p>日报和周报发送到固定飞书通知群。</p>
          </div>
          <span :class="['channel-state', feishu.notification_ready ? 'ready' : 'missing']">
            {{ feishu.notification_ready ? '通道已就绪' : '通道待配置' }}
          </span>
        </header>

        <div class="notification-layout">
          <section class="notification-form">
            <div class="field-row">
              <label class="toggle-field">
                <input v-model="notification.daily_enabled" type="checkbox">
                <span>
                  <strong>每日日报</strong>
                  <small>自动发送当天开发进展</small>
                </span>
              </label>
              <input v-model="notification.daily_time" type="time" aria-label="每日日报发送时间">
            </div>
            <div class="field-row weekly-field-row">
              <label class="toggle-field">
                <input v-model="notification.weekly_enabled" type="checkbox">
                <span>
                  <strong>每周周报</strong>
                  <small>自动发送本周交付总结</small>
                </span>
              </label>
              <select v-model.number="notification.weekly_day" aria-label="周报发送星期">
                <option :value="1">周一</option><option :value="2">周二</option><option :value="3">周三</option>
                <option :value="4">周四</option><option :value="5">周五</option><option :value="6">周六</option><option :value="0">周日</option>
              </select>
              <input v-model="notification.weekly_time" type="time" aria-label="周报发送时间">
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" :disabled="isBusy" @click="saveNotification">
                {{ activeAction === 'save-notification' ? '保存中' : '保存通知计划' }}
              </button>
              <button class="btn btn-outline" :disabled="isBusy || !feishu.notification_ready" @click="sendNotification('daily')">发送今日日报</button>
              <button class="btn btn-outline" :disabled="isBusy || !feishu.notification_ready" @click="sendNotification('weekly')">发送本周周报</button>
            </div>
            <p v-if="!feishu.notification_ready" class="channel-hint">请先到系统设置配置报告通知通道。</p>
          </section>

          <aside class="notification-history">
            <div class="section-heading">
              <div>
                <span class="eyebrow">最近发送</span>
                <h4>通知记录</h4>
              </div>
            </div>
            <p v-if="!notificationHistory.length" class="empty-state">还没有通知记录</p>
            <div v-else class="history-list">
              <article v-for="item in notificationHistory" :key="item.id">
                <span :class="['history-dot', item.success ? 'ok' : 'fail']"></span>
                <div>
                  <strong>{{ item.kind === 'weekly' ? '周报' : '日报' }} · {{ item.success ? '发送成功' : '发送失败' }}</strong>
                  <span>{{ formatShortTime(item.attempted_at) }}</span>
                </div>
              </article>
            </div>
          </aside>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auto-dev-page {
  height: 100%;
  min-height: 0;
  overflow: auto;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.command-bar,
.view-tabs,
.auto-dev-content {
  width: min(100%, 1280px);
  margin: 0 auto;
}

.command-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px 16px;
}

.command-title {
  min-width: 0;
}

.title-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.command-title h3,
.view-heading h4,
.section-heading h4 {
  margin: 0;
  letter-spacing: 0;
}

.command-title h3 {
  font-size: 20px;
}

.command-title p,
.view-heading p,
.unattended-panel p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.readiness-badge,
.channel-state {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 9px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
}

.readiness-badge.ready,
.channel-state.ready {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.readiness-badge.partial,
.readiness-badge.checking {
  background: rgba(234, 179, 8, 0.14);
  color: #a16207;
}

.readiness-badge.blocked,
.channel-state.missing {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}

.command-actions,
.report-actions,
.form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  min-height: 36px;
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 7px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn:disabled,
.text-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-primary {
  color: white;
  background: var(--accent-blue);
}

.btn-outline {
  color: var(--text-secondary);
  background: var(--surface);
  border-color: var(--border-color);
}

.view-tabs {
  display: flex;
  gap: 4px;
  padding: 0 22px;
  border-bottom: 1px solid var(--border-color);
}

.view-tabs button,
.segmented-control button,
.text-action {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.view-tabs button {
  position: relative;
  padding: 10px 14px 12px;
  color: var(--text-muted);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
}

.view-tabs button.active {
  color: var(--accent-blue);
}

.view-tabs button.active::after {
  position: absolute;
  right: 10px;
  bottom: -1px;
  left: 10px;
  height: 2px;
  background: var(--accent-blue);
  content: '';
}

.auto-dev-content {
  padding: 18px 22px 28px;
}

.readiness-strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-left-width: 3px;
  background: var(--surface);
}

.readiness-strip.ready { border-left-color: #22c55e; }
.readiness-strip.partial,
.readiness-strip.checking { border-left-color: #eab308; }
.readiness-strip.blocked { border-left-color: #ef4444; }

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ef4444;
}

.readiness-strip.ready .status-dot { background: #22c55e; }
.readiness-strip.partial .status-dot,
.readiness-strip.checking .status-dot { background: #eab308; }

.readiness-strip strong {
  font-size: 13px;
}

.readiness-strip p {
  margin: 3px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.text-action {
  flex: 0 0 auto;
  padding: 4px;
  color: var(--accent-blue);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
}

.metric-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 14px;
  border: 1px solid var(--border-color);
  background: var(--surface);
}

.metric-strip > div {
  min-width: 0;
  padding: 14px 16px;
  border-right: 1px solid var(--border-color);
}

.metric-strip > div:last-child { border-right: 0; }

.metric-strip span,
.eyebrow,
.section-meta {
  color: var(--text-muted);
  font-size: 11px;
}

.metric-strip strong {
  display: block;
  margin-top: 5px;
  font-size: 22px;
}

.overview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  margin-top: 16px;
}

.overview-main,
.overview-side {
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
}

.section-block,
.report-surface,
.notification-form,
.notification-history {
  min-width: 0;
  border: 1px solid var(--border-color);
  background: var(--surface);
}

.section-block,
.notification-form,
.notification-history {
  padding: 16px;
}

.section-heading,
.view-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-heading > div,
.view-heading > div {
  min-width: 0;
}

.section-heading h4 {
  margin-top: 3px;
  font-size: 14px;
}

.section-heading.compact {
  align-items: center;
}

.latest-run {
  border-left: 3px solid var(--accent-blue);
}

.latest-run .section-heading h4 {
  font-weight: 600;
  line-height: 1.5;
}

.run-stats,
.backlog-summary {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.run-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.run-stats span,
.backlog-summary span {
  color: var(--text-muted);
  font-size: 11px;
}

.run-stats strong,
.backlog-summary strong {
  color: var(--text-primary);
}

.activity-list,
.blocker-list,
.history-list {
  display: grid;
  gap: 0;
  margin-top: 12px;
}

.activity-row,
.blocker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 11px 0;
  border-top: 1px solid var(--border-color);
}

.activity-row > div,
.blocker-row {
  min-width: 0;
}

.activity-row > div {
  flex: 1 1 auto;
  overflow: hidden;
}

.activity-row strong,
.blocker-row strong {
  display: block;
  overflow: hidden;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-row span,
.blocker-row span {
  display: block;
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 11px;
}

.activity-status {
  flex: 0 0 auto;
  color: var(--accent-blue) !important;
  font-weight: 700;
}

.blocker-row {
  display: block;
}

.empty-state {
  margin: 12px 0 0;
  padding: 22px 0;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}

.empty-state.success { color: #15803d; }

.check-list {
  display: grid;
  gap: 0;
  margin-top: 12px;
}

.check-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 10px 0;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
}

.check-indicator,
.history-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.check-indicator.ok,
.history-dot.ok { background: #22c55e; }
.check-indicator.warn,
.history-dot.fail { background: #ef4444; }
.check-indicator.active { background: var(--accent-blue); }

.check-row strong {
  font-size: 11px;
}

.next-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.next-actions > span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.next-actions ol {
  display: grid;
  gap: 7px;
  margin: 9px 0 0;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: 11.5px;
  line-height: 1.5;
}

.backlog-summary {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.view-heading {
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.view-heading h4 {
  font-size: 17px;
}

.report-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
}

.evidence-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(90px, 0.55fr)) minmax(260px, 1.6fr);
  margin-bottom: 14px;
  border: 1px solid var(--border-color);
  background: var(--surface);
}

.evidence-strip > div {
  min-width: 0;
  padding: 12px 14px;
  border-right: 1px solid var(--border-color);
}

.evidence-strip > div:last-child { border-right: 0; }

.evidence-strip span {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
}

.evidence-strip strong {
  display: block;
  margin-top: 4px;
  font-size: 17px;
}

.evidence-strip .ownership-cell p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 11.5px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.segmented-control {
  display: inline-flex;
  padding: 3px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 7px;
}

.segmented-control button {
  min-width: 64px;
  padding: 6px 12px;
  border-radius: 5px;
  color: var(--text-muted);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
}

.segmented-control button.active {
  color: var(--text-primary);
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.report-toolbar select,
.field-row input[type='time'],
.field-row select {
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  background: var(--surface);
  font: inherit;
  font-size: 12px;
}

.report-surface {
  min-height: 460px;
  padding: 22px 26px;
}

.technical-details {
  margin-top: 24px;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);
}

.technical-details summary {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.technical-details pre {
  max-height: 320px;
  margin: 12px 0 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.notification-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  margin-top: 16px;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
}

.weekly-field-row {
  grid-template-columns: minmax(0, 1fr) 100px 130px;
}

.toggle-field {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-field input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-blue);
}

.toggle-field strong,
.toggle-field small {
  display: block;
}

.toggle-field strong {
  font-size: 13px;
}

.toggle-field small {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 11px;
}

.form-actions {
  flex-wrap: wrap;
  margin-top: 18px;
}

.channel-hint {
  margin: 12px 0 0;
  color: #a16207;
  font-size: 11px;
}

.history-list article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 11px 0;
  border-top: 1px solid var(--border-color);
}

.history-list strong,
.history-list span {
  display: block;
}

.history-list strong {
  font-size: 12px;
}

.history-list span {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 11px;
}

@media (max-width: 980px) {
  .overview-layout,
  .notification-layout {
    grid-template-columns: 1fr;
  }

  .overview-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .readiness-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .command-bar {
    align-items: flex-start;
    padding: 15px 14px 12px;
  }

  .command-title p {
    display: none;
  }

  .command-actions {
    flex: 0 0 auto;
  }

  .command-actions .btn {
    min-height: 34px;
    padding: 7px 10px;
  }

  .view-tabs {
    padding: 0 10px;
  }

  .view-tabs button {
    flex: 1;
    padding-right: 8px;
    padding-left: 8px;
  }

  .auto-dev-content {
    padding: 12px 10px 92px;
  }

  .readiness-strip {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: flex-start;
    padding: 12px;
  }

  .readiness-strip .text-action {
    grid-column: 2;
    justify-self: start;
    padding-left: 0;
  }

  .metric-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-strip > div:nth-child(2) { border-right: 0; }
  .metric-strip > div:nth-child(-n + 2) { border-bottom: 1px solid var(--border-color); }

  .overview-side {
    grid-template-columns: 1fr;
  }

  .readiness-panel {
    grid-column: auto;
  }

  .run-stats,
  .backlog-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .activity-row {
    align-items: flex-start;
  }

  .view-heading {
    align-items: flex-start;
    gap: 10px;
  }

  .report-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .report-actions .btn {
    min-height: 32px;
    padding: 6px 9px;
  }

  .report-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .report-toolbar select {
    width: 100%;
  }

  .evidence-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .evidence-strip > div:nth-child(3) { border-right: 0; }
  .evidence-strip > div:nth-child(-n + 3) { border-bottom: 1px solid var(--border-color); }
  .evidence-strip .ownership-cell {
    grid-column: 1 / -1;
    border-right: 0;
  }

  .report-surface {
    min-height: 360px;
    padding: 16px;
  }

  .weekly-field-row,
  .field-row {
    grid-template-columns: 1fr;
  }

  .weekly-field-row > select,
  .weekly-field-row > input[type='time'],
  .field-row > input[type='time'] {
    width: 100%;
  }

  .form-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .form-actions .btn {
    width: 100%;
  }
}

[data-theme='dark'] .readiness-badge.ready,
[data-theme='dark'] .channel-state.ready { color: #86efac; }
[data-theme='dark'] .readiness-badge.partial,
[data-theme='dark'] .readiness-badge.checking,
[data-theme='dark'] .channel-hint { color: #fde047; }
[data-theme='dark'] .readiness-badge.blocked,
[data-theme='dark'] .channel-state.missing { color: #fca5a5; }
</style>
