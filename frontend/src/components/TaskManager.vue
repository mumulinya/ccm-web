<script setup>
import { ref, onMounted } from 'vue'
import { tasksApi, groupsApi, projectsApi } from '../api/index.js'
import AgentPipeline from './AgentPipeline.vue'
import { toast, confirmDialog } from '../utils/toast.js'

const tasks = ref([])
const groups = ref([])
const projects = ref([])
const stats = ref({ total: 0, pending: 0, inProgress: 0, done: 0, failed: 0 })
const orchestratorDiagnostics = ref(null)
const executionDashboard = ref(null)
const executionDashboardLoading = ref(false)
const dashboardFilter = ref('all')
const expandedDashboardTaskId = ref('')
const taskExecutions = ref({})
const executionActionBusy = ref('')

// 弹窗状态
const showCreate = ref(false)
const showDailyDevCreate = ref(false)
const showQueue = ref(false)
const showLogs = ref(false)
const showReport = ref(false)
const showContinue = ref(false)
const showBacklog = ref(false)
const currentTaskLogs = ref([])
const currentTaskId = ref(null)
const currentTaskReport = ref(null)
const currentTaskTrace = ref(null)
const taskTraceLoading = ref(false)
const currentContinueTask = ref(null)
const continueMessage = ref('')
const dailyDevBacklogs = ref([])
const backlogCounts = ref({})
const backlogBulkDispatchLoading = ref(false)
const backlogBulkDispatchResult = ref(null)
const backlogImportLoading = ref(false)
const backlogImportResult = ref(null)

// 新建任务表单
const newTask = ref({
  title: '',
  description: '',
  assignType: 'group',
  groupId: '',
  projectId: '',
  priority: 'normal',
  autoExecute: true
})

const defaultDailyDevTask = () => ({
  title: '',
  businessGoal: '',
  scope: '',
  documents: '',
  acceptance: '',
  constraints: '',
  groupId: groups.value[0]?.id || '',
  priority: 'normal',
  requiresCodeChanges: true,
  persistDocuments: true,
  autoExecute: true
})
const dailyDevTask = ref(defaultDailyDevTask())

// 加载数据
const loadTasks = async () => {
  const data = await tasksApi.list()
  tasks.value = (data.tasks || []).slice().reverse()
  updateStats()
}

const loadGroups = async () => {
  const data = await groupsApi.list()
  groups.value = data.groups || []
  if (!newTask.value.groupId && groups.value.length > 0) {
    newTask.value.groupId = groups.value[0].id
  }
  if (!dailyDevTask.value.groupId && groups.value.length > 0) {
    dailyDevTask.value.groupId = groups.value[0].id
  }
}

const loadProjects = async () => {
  const data = await projectsApi.list()
  projects.value = data.projects || []
  if (!newTask.value.projectId && projects.value.length > 0) {
    newTask.value.projectId = projects.value[0].name
  }
}

const loadOrchestratorDiagnostics = async () => {
  try {
    const res = await fetch('/api/orchestrator/diagnostics')
    const data = await res.json()
    if (data.success) orchestratorDiagnostics.value = data
  } catch {
    orchestratorDiagnostics.value = null
  }
}

const loadExecutionDashboard = async () => {
  executionDashboardLoading.value = true
  try {
    const res = await fetch('/api/tasks/execution-dashboard?limit=12')
    const data = await res.json()
    if (data.success) {
      executionDashboard.value = data
      syncExpandedDashboardItem()
    }
  } catch {
    executionDashboard.value = null
  }
  executionDashboardLoading.value = false
}

const refreshTaskWork = async () => {
  await Promise.all([loadTasks(), loadExecutionDashboard(), loadOrchestratorDiagnostics()])
}

const updateStats = () => {
  stats.value = {
    total: tasks.value.length,
    pending: tasks.value.filter(t => t.status === 'pending').length,
    inProgress: tasks.value.filter(t => t.status === 'in_progress').length,
    done: tasks.value.filter(t => t.status === 'done').length,
    failed: tasks.value.filter(t => t.status === 'failed').length
  }
}

const deliveryEvidenceItems = (task) => {
  const summary = task?.delivery_summary
  const items = []
  if (isExecutionBlockedTask(task)) items.push({ key: 'execution-blocked', label: '执行通道阻塞', tone: 'warn' })
  if (!summary) return items
  if (summary.has_final_review) items.push({ key: 'review', label: '主复盘', tone: 'ok' })
  if (summary.actual_file_change_count > 0) items.push({ key: 'changes', label: `实变 ${summary.actual_file_change_count}`, tone: 'ok' })
  else if (summary.requires_code_changes) items.push({ key: 'changes-missing', label: '缺实变', tone: 'warn' })
  if (summary.verification_failed?.length) items.push({ key: 'verify-failed', label: `验证失败 ${summary.verification_failed.length}`, tone: 'fail' })
  else if (summary.verification_required_missing?.length) items.push({ key: 'verify-required-missing', label: `缺命令验证 ${summary.verification_required_missing.length}`, tone: 'warn' })
  else if (summary.verification_executed?.length) items.push({ key: 'verify', label: `已验 ${summary.verification_executed.length}`, tone: 'ok' })
  else if (summary.requires_verification) items.push({ key: 'verify-missing', label: '缺验证', tone: 'warn' })
  else if (summary.verification?.length) items.push({ key: 'verify', label: `验证 ${summary.verification.length}`, tone: 'ok' })
  if (summary.blockers?.length || summary.needs?.length) items.push({ key: 'needs', label: '待补充', tone: 'warn' })
  return items
}

const isExecutionBlockedTask = (task) => {
  if (!task?.execution_readiness) return false
  return task.execution_readiness.ready === false || task.execution_readiness.mode === 'blocked' || task.execution_readiness.mode === 'external-runner-blocked'
}

const executionBlockedMessage = (task) => {
  return task?.execution_readiness?.message || task?.status_detail || 'Agent CLI 执行通道不可用，等待复检通过后重试'
}

const executionFixActions = (task) => {
  const actions = task?.execution_readiness?.fix_actions
  return Array.isArray(actions) ? actions.filter(Boolean).slice(0, 4) : []
}

const executionStateLabel = (state) => ({
  queued: '排队', spawning: '启动中', ready: '已就绪', prompt_accepted: '已接单', running: '执行中',
  waiting_input: '等待输入', reviewing: '验收中', succeeded: '已成功', failed: '失败',
  cancel_requested: '正在停止', cancelled: '已取消'
}[state] || state || '未启动')

const greenLevelLabel = (level) => ({
  none: '未验收', targeted: '局部绿', project: '项目绿', workspace: '工作区绿', merge_ready: '可合并'
}[level] || level || '未验收')

const taskKernelState = (task) => task?.execution_kernel?.state || (task?.status === 'in_progress' ? 'running' : '')
const taskKernelGreen = (task) => task?.execution_kernel?.green?.level || 'none'
const canCancelTask = (task) => ['pending', 'in_progress'].includes(task?.status) && taskKernelState(task) !== 'cancel_requested'

const canManualCompleteDailyDev = (task) => {
  if (task?.workflow_type !== 'daily_dev') return true
  const summary = task.delivery_summary
  if (!summary) return false
  const hasDoneReceipt = summary.receipt_statuses?.some(item => item.status === 'done') || task.receipt?.status === 'done'
  const hasReview = summary.has_final_review || !!task.review
  const hasActualChanges = !summary.requires_code_changes || (summary.actual_file_change_count || task.file_changes?.count || 0) > 0
  const hasVerification = !summary.requires_verification || (summary.verification_executed?.length || 0) > 0
  const hasRequiredVerification = summary.verification_required_gate_passed !== false
  return !!(hasDoneReceipt && hasReview && hasActualChanges && hasVerification && hasRequiredVerification)
}

const hasCategorizedVerification = (summary) => {
  return !!(
    summary?.verification_executed?.length ||
    summary?.verification_suggested?.length ||
    summary?.verification_failed?.length ||
    summary?.verification_required_missing?.length
  )
}

const receiptStatusText = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'done') return '完成'
  if (value === 'partial') return '部分完成'
  if (value === 'blocked') return '阻塞'
  if (value === 'failed') return '失败'
  if (value === 'needs_info') return '需补充'
  return value || '未知'
}

const receiptTone = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'done') return 'ok'
  if (value === 'failed') return 'fail'
  return 'warn'
}

const workflowSummaryItems = (task) => {
  const summary = task?.delivery_summary
  if (!summary && task?.workflow_type !== 'daily_dev') return []
  if (!summary) return [{ key: 'waiting-plan', label: '等待主 Agent 计划', tone: 'muted' }]
  const planCount = summary.latest_coordination_plan?.phases?.length || summary.coordination_plan_count || summary.coordination_plans?.length || 0
  const assignmentCount = summary.assignment_evidence?.length || summary.assignment_count || 0
  const workerCount = summary.worker_notifications?.length || assignmentCount
  const receiptCount = summary.receipts?.length || summary.receipt_statuses?.length || summary.receipt_count || 0
  const verificationCount = summary.verification_executed?.length || 0
  return [
    { key: 'plan', label: `主计划 ${planCount}`, tone: planCount ? 'ok' : 'muted' },
    { key: 'assign', label: `已派发 ${assignmentCount}`, tone: assignmentCount ? 'ok' : 'muted' },
    { key: 'worker', label: `子 Agent ${workerCount}`, tone: workerCount ? 'ok' : 'muted' },
    { key: 'receipt', label: `回执 ${receiptCount}`, tone: receiptCount ? 'ok' : 'warn' },
    { key: 'verify', label: `验证 ${verificationCount}`, tone: verificationCount ? 'ok' : (summary.requires_verification ? 'warn' : 'muted') }
  ]
}

const workflowStatusTone = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'done' || value === 'success') return 'ok'
  if (value === 'running' || value === 'in_progress') return 'active'
  if (value === 'failed' || value === 'error') return 'fail'
  if (value === 'blocked' || value === 'partial' || value === 'needs_info') return 'warn'
  return 'muted'
}

const dashboardSummary = () => executionDashboard.value?.summary || {}
const dashboardItems = () => executionDashboard.value?.items || []
const dashboardQueue = () => executionDashboard.value?.queue_status || {}
const dashboardFilterOptions = () => {
  const summary = dashboardSummary()
  return [
    { key: 'active', label: '活跃', count: summary.active || 0 },
    { key: 'done', label: '已完成', count: summary.done || 0 },
    { key: 'blocked', label: '需接管', count: summary.blocked || 0 },
    { key: 'all', label: '全部', count: summary.total || dashboardItems().length || 0 }
  ]
}
const dashboardItemsForFilter = (filter = dashboardFilter.value) => {
  const items = dashboardItems()
  if (filter === 'all') return items
  if (filter === 'done') return items.filter(item => item.phase === 'done')
  if (filter === 'blocked') return items.filter(item => item.phase === 'blocked' || item.phase === 'failed')
  return items.filter(item => item.phase !== 'done')
}
const filteredDashboardItems = () => dashboardItemsForFilter()
const syncExpandedDashboardItem = () => {
  const items = filteredDashboardItems()
  if (!items.length) {
    expandedDashboardTaskId.value = ''
    return
  }
  if (!items.some(item => item.id === expandedDashboardTaskId.value)) {
    expandedDashboardTaskId.value = items[0].id
  }
}
const setDashboardFilter = (filter) => {
  dashboardFilter.value = filter
  const items = dashboardItemsForFilter(filter)
  expandedDashboardTaskId.value = items[0]?.id || ''
}
const isDashboardItemExpanded = (item) => item?.id && expandedDashboardTaskId.value === item.id
const toggleDashboardItem = (item) => {
  expandedDashboardTaskId.value = isDashboardItemExpanded(item) ? '' : item.id
}

const phaseLabel = (phase) => ({
  pending: '待执行',
  queued: '队列中',
  running: '执行中',
  blocked: '需接管',
  done: '已完成',
  failed: '失败',
  unknown: '未知'
}[phase || 'unknown'] || phase)

const phaseTone = (phase) => ({
  pending: 'muted',
  queued: 'active',
  running: 'active',
  blocked: 'warn',
  done: 'ok',
  failed: 'fail'
}[phase || 'unknown'] || 'muted')

const actionClass = (action) => {
  if (action?.tone === 'primary') return 'btn btn-primary btn-sm'
  if (action?.tone === 'success') return 'btn btn-primary btn-sm'
  if (action?.tone === 'warning') return 'btn btn-outline btn-sm dashboard-action-warning'
  return 'btn btn-outline btn-sm'
}

const findTaskByDashboardItem = (item) => item?.raw_task || tasks.value.find(task => task.id === item?.id) || null

const compactDashboardText = (value, max = 120) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}...` : text
}

const actionVisible = (item, kind) => (item?.actions || []).some(action => action.kind === kind)

const workflowAgentPreview = (task) => {
  const summary = task?.delivery_summary
  if (!summary) return []
  const receipts = summary.receipts?.length ? summary.receipts : (summary.receipt_statuses || [])
  return (summary.assignment_evidence || []).slice(0, 4).map((assignment, index) => {
    const project = assignment.project || assignment.agent || `子 Agent ${index + 1}`
    const receipt = receipts.find(item => String(item.agent || item.project || '').toLowerCase() === String(project).toLowerCase())
    const status = receipt?.status || assignment.status || (task.status === 'in_progress' ? 'running' : 'pending')
    return {
      project,
      status,
      statusText: receiptStatusText(status),
      tone: workflowStatusTone(status)
    }
  })
}

const normalizeReceiptEvidence = (receipt, fallbackAgent = '') => {
  if (!receipt) return null
  return {
    agent: receipt.agent || fallbackAgent || '子 Agent',
    status: receipt.status || 'unknown',
    summary: receipt.summary || '',
    actions: Array.isArray(receipt.actions) ? receipt.actions : [],
    filesChanged: Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files)
      ? (receipt.filesChanged || receipt.files_changed || receipt.files)
      : [],
    verification: Array.isArray(receipt.verification || receipt.tests) ? (receipt.verification || receipt.tests) : [],
    blockers: Array.isArray(receipt.blockers) ? receipt.blockers : [],
    needs: Array.isArray(receipt.needs || receipt.followUps || receipt.follow_ups) ? (receipt.needs || receipt.followUps || receipt.follow_ups) : []
  }
}

const receiptEvidenceItems = (task) => {
  const seen = new Set()
  const items = []
  const add = (item) => {
    if (!item) return
    const key = `${item.agent}:${item.status}:${item.summary}`
    if (seen.has(key)) return
    seen.add(key)
    items.push(item)
  }
  const receipts = task?.delivery_summary?.receipts || []
  if (receipts.length) receipts.forEach(item => add(normalizeReceiptEvidence(item, item.agent)))
  else (task?.delivery_summary?.receipt_statuses || []).forEach(item => add(normalizeReceiptEvidence(item, item.agent)))
  add(normalizeReceiptEvidence(task?.receipt))
  return items
}

const hasExecutionEvidence = (task) => {
  return receiptEvidenceItems(task).length > 0 || !!task?.review || !!task?.delivery_summary
}

const buildContinuationDraft = (task) => {
  const summary = task?.delivery_summary || {}
  const lines = [
    `请继续推进任务：${task?.title || ''}`,
    ''
  ]
  const blockers = [...(summary.blockers || []), ...(summary.needs || [])].filter(Boolean)
  if (blockers.length) {
    lines.push('需要处理的阻塞/待补充：')
    blockers.slice(0, 10).forEach(item => lines.push(`- ${item}`))
    lines.push('')
  }
  if (summary.verification_required_missing?.length) {
    lines.push('需要补齐的项目验证命令证据：')
    summary.verification_required_missing.slice(0, 10).forEach(item => {
      lines.push(`- ${item.agent || '未知 Agent'}：请实际运行并回执 ${item.required?.join(' / ') || '项目配置验证命令'}`)
    })
    lines.push('')
  }
  if (summary.verification_suggested?.length) {
    lines.push('以下验证只是建议或未执行，需要改为实际执行结果：')
    summary.verification_suggested.slice(0, 10).forEach(item => lines.push(`- ${item}`))
    lines.push('')
  }
  if (summary.verification_failed?.length) {
    lines.push('以下验证失败，需要修复后重新验证：')
    summary.verification_failed.slice(0, 10).forEach(item => lines.push(`- ${item}`))
    lines.push('')
  }
  const receipts = receiptEvidenceItems(task).filter(item => item.status !== 'done')
  if (receipts.length) {
    lines.push('需要跟进的子 Agent 回执：')
    receipts.slice(0, 8).forEach(item => {
      lines.push(`- ${item.agent}：${receiptStatusText(item.status)}；${item.summary || '无摘要'}`)
      ;[...item.blockers, ...item.needs].filter(Boolean).slice(0, 5).forEach(need => lines.push(`  - ${need}`))
    })
    lines.push('')
  }
  if (task?.review?.content || task?.review?.summary) {
    lines.push('主 Agent 复盘提示：')
    lines.push(String(task.review.content || task.review.summary).slice(0, 1200))
    lines.push('')
  }
  lines.push('继续执行要求：')
  lines.push('- 主 Agent 先判断这些阻塞是否已被本次补充消解。')
  lines.push('- 如可继续，优先派发给相关子 Agent 返工。')
  lines.push('- 完成后仍需子 Agent 回执、主 Agent 复盘、实际变更证据和已执行验证记录。')
  return lines.filter((line, index, arr) => line || arr[index - 1]).join('\n').trim()
}

const dailyDevGroupReadiness = (groupId) => {
  const groupsDetail = orchestratorDiagnostics.value?.checks?.find(check => check.id === 'groups')?.detail || []
  return groupsDetail.find(group => group.id === groupId) || null
}

const selectedDailyDevGroupReadiness = () => {
  return dailyDevGroupReadiness(dailyDevTask.value.groupId)
}

const dailyDevGroupCanExecute = (groupId) => {
  const readiness = dailyDevGroupReadiness(groupId)
  return !!(readiness?.orchestratorEnabled && readiness.readyMemberCount > 0)
}

const selectedDailyDevGroupCanExecute = () => dailyDevGroupCanExecute(dailyDevTask.value.groupId)

const dailyDevGroupReadinessMessage = (groupId) => {
  const readiness = dailyDevGroupReadiness(groupId)
  if (!readiness) return '尚未完成开发群聊自检'
  if (!readiness.orchestratorEnabled) return '该群聊未启用主 Agent 协调'
  if (readiness.memberCount <= 0) return '该群聊没有可派发的项目子 Agent'
  if (readiness.readyMemberCount <= 0) return '项目子 Agent 配置或工作目录不可读写'
  return `可派发 ${readiness.readyMemberCount}/${readiness.memberCount} 个子 Agent，ready 需求 ${readiness.readyBacklogs || 0} 条`
}

const selectedDailyDevGroupMessage = () => dailyDevGroupReadinessMessage(dailyDevTask.value.groupId)

const dailyDevIntakeQuality = () => {
  const len = (value) => String(value || '').replace(/\s+/g, ' ').trim().length
  const checks = [
    { key: 'goal', ok: len(dailyDevTask.value.businessGoal) >= 8, label: '业务目标' },
    { key: 'scope', ok: len(dailyDevTask.value.scope) >= 8, label: '开发范围' },
    { key: 'documents', ok: len(dailyDevTask.value.documents) >= 12, label: '业务/接口文档' },
    { key: 'acceptance', ok: len(dailyDevTask.value.acceptance) >= 8, label: '验收标准' }
  ]
  const pass = checks[0].ok && checks[3].ok && (checks[1].ok || checks[2].ok)
  return {
    pass,
    score: checks.filter(item => item.ok).length,
    total: checks.length,
    missing: checks.filter(item => !item.ok).map(item => item.label)
  }
}

const backlogStatusLabel = {
  draft: '草稿',
  needs_user: '待补充',
  ready: '可接活',
  planned: '已计划',
  dispatched: '已派发',
  queued: '已派发',
  running: '执行中',
  in_progress: '执行中',
  reviewing: '验收中',
  blocked: '阻塞',
  done: '完成',
  failed: '失败',
  unknown: '未知'
}

const formatBacklogTime = (value) => value ? new Date(value).toLocaleString('zh-CN') : '未记录'
const backlogState = (item) => item?.state || item?.status || 'unknown'
const backlogCount = (...states) => states.reduce((sum, state) => sum + Number(backlogCounts.value[state] || 0), 0)
const backlogQualityText = (item) => {
  const quality = item?.quality
  if (!quality) return ''
  if (quality.pass) return `信息完整 ${quality.score || 0}/${quality.total || 0}`
  const missing = Array.isArray(quality.missing) ? quality.missing.join('、') : ''
  return missing ? `待补充：${missing}` : '需求信息待补充'
}
const backlogLatestHistory = (item) => Array.isArray(item?.state_history) ? item.state_history.slice(-3).reverse() : []
const backlogCanDispatch = (item) => ['ready', 'blocked', 'failed'].includes(backlogState(item))
const backlogCanRestoreReady = (item) => !['ready', 'done'].includes(backlogState(item))

const loadDailyDevBacklogs = async () => {
  const res = await fetch('/api/tasks/daily-dev-backlog')
  const data = await res.json()
  if (!data.success) throw new Error(data.error || '加载需求池失败')
  dailyDevBacklogs.value = data.items || []
  backlogCounts.value = data.counts || {}
}

const openBacklog = async () => {
  showBacklog.value = true
  try {
    await loadDailyDevBacklogs()
  } catch (e) {
    toast.error(e.message || '加载需求池失败')
  }
}

const updateBacklogStatus = async (item, status) => {
  try {
    const res = await fetch('/api/tasks/daily-dev-backlog/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: item.group_id,
        name: item.name,
        status,
        reason: status === 'ready' ? '用户恢复为 ready，等待主 Agent 或定时任务重新认领' : `用户设置为 ${status}`
      })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '更新需求池状态失败')
    await loadDailyDevBacklogs()
    toast.success(status === 'ready' ? '需求已恢复为可接活' : '需求池状态已更新')
  } catch (e) {
    toast.error(e.message || '更新需求池状态失败')
  }
}

const dispatchBacklog = async (item) => {
  try {
    const res = await fetch('/api/tasks/daily-dev-backlog/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: item.group_id,
        name: item.name,
        auto_execute: true
      })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '派发需求失败')
    await Promise.all([loadDailyDevBacklogs(), refreshTaskWork()])
    if (data.queued) toast.success('需求已立即派发给主 Agent')
    else toast.warning(data.queue_result?.message || '需求任务已创建，等待执行通道')
  } catch (e) {
    toast.error(e.message || '派发需求失败')
  }
}

const dispatchReadyBacklogs = async () => {
  const readyCount = Number(backlogCounts.value.ready || 0)
  if (readyCount <= 0) {
    toast.info('当前没有可接活需求')
    return
  }
  const confirmed = await confirmDialog(`确定批量派发 ${readyCount} 条可接活业务需求？系统会按优先级创建日常开发任务并加入队列。`)
  if (!confirmed) return
  backlogBulkDispatchLoading.value = true
  try {
    const res = await fetch('/api/tasks/daily-dev-backlog/dispatch-ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 20,
        auto_execute: true,
        only_executable_groups: true
      })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '批量派发失败')
    backlogBulkDispatchResult.value = data
    await Promise.all([loadDailyDevBacklogs(), refreshTaskWork()])
    if (data.dispatched > 0) {
      toast.success(`已派发 ${data.dispatched} 条需求，入队 ${data.queued} 条`)
    } else {
      toast.warning('没有可派发的可接活需求，请检查群聊和子 Agent 配置')
    }
  } catch (e) {
    toast.error(e.message || '批量派发失败')
  }
  backlogBulkDispatchLoading.value = false
}

const importSharedDocsToBacklog = async () => {
  backlogImportLoading.value = true
  try {
    const res = await fetch('/api/tasks/daily-dev-backlog/import-shared', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 20,
        priority: 'normal',
        requires_code_changes: true
      })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '导入共享文档失败')
    backlogImportResult.value = data
    await Promise.all([loadDailyDevBacklogs(), loadOrchestratorDiagnostics()])
    if (data.imported > 0) {
      toast.success(`已导入 ${data.imported} 份共享文档为需求卡`)
    } else {
      toast.info('没有可导入的新共享文档')
    }
  } catch (e) {
    toast.error(e.message || '导入共享文档失败')
  }
  backlogImportLoading.value = false
}

// 创建任务
const submitCreateTask = async () => {
  if (!newTask.value.title) { alert('请输入任务标题'); return }
  if (newTask.value.assignType === 'group' && !newTask.value.groupId) { toast.warning('请选择群聊'); return }
  if (newTask.value.assignType === 'project' && !newTask.value.projectId) { toast.warning('请选择项目 Agent'); return }

  const res = await tasksApi.create({
    title: newTask.value.title,
    description: newTask.value.description,
    target_project: newTask.value.assignType === 'project' ? newTask.value.projectId : 'coordinator',
    group_id: newTask.value.assignType === 'group' ? newTask.value.groupId : null,
    priority: newTask.value.priority,
    assign_type: newTask.value.assignType,
    auto_execute: newTask.value.autoExecute
  })

  if (res.success) {
    showCreate.value = false
    newTask.value = {
      title: '',
      description: '',
      assignType: 'group',
      groupId: groups.value[0]?.id || '',
      projectId: projects.value[0]?.name || '',
      priority: 'normal',
      autoExecute: true
    }
    refreshTaskWork()
    toast.success(res.queued ? '任务已创建并加入执行队列' : '任务创建成功')
  } else {
    toast.error('创建失败: ' + (res.error || '未知错误'))
  }
}

const buildDailyDevCreatePayload = (forceQualityGate = false) => ({
  title: dailyDevTask.value.title,
  business_goal: dailyDevTask.value.businessGoal,
  scope: dailyDevTask.value.scope,
  documents: dailyDevTask.value.documents,
  acceptance: dailyDevTask.value.acceptance,
  constraints: dailyDevTask.value.constraints,
  group_id: dailyDevTask.value.groupId,
  priority: dailyDevTask.value.priority,
  requires_code_changes: dailyDevTask.value.requiresCodeChanges,
  persist_documents: dailyDevTask.value.persistDocuments,
  auto_execute: dailyDevTask.value.autoExecute,
  force_quality_gate: forceQualityGate
})

const formatQualityMissing = (quality) => {
  const missing = quality?.missing || []
  if (!missing.length) return '业务需求信息不完整'
  return missing.map(item => `- ${item}`).join('\n')
}

const submitDailyDevTask = async (forceQualityGate = false) => {
  if (!dailyDevTask.value.businessGoal.trim()) { toast.warning('请输入业务目标'); return }
  if (!dailyDevTask.value.groupId) { toast.warning('请选择开发群聊'); return }

  try {
    const res = await fetch('/api/tasks/create-daily-dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildDailyDevCreatePayload(forceQualityGate))
    })
    const data = await res.json()
    if (!data.success) {
      if (data.needs_confirmation && !forceQualityGate) {
        const ok = await confirmDialog(`业务需求信息可能不足，主 Agent 可能难以稳定拆分。\n\n${formatQualityMissing(data.quality)}\n\n仍要创建并交给主 Agent 吗？`)
        if (ok) return submitDailyDevTask(true)
      }
      toast.error('创建失败: ' + (data.error || '未知错误'))
      return
    }
    showDailyDevCreate.value = false
    dailyDevTask.value = defaultDailyDevTask()
    refreshTaskWork()
    const backlogText = data.backlog_file ? `，已写入需求池 ${data.backlog_file}` : ''
    if (data.queued) toast.success(`业务开发任务已交给主 Agent${backlogText}`)
    else toast.warning((data.queue_result?.message || '业务开发任务已创建，但尚未入队') + backlogText)
  } catch (e) {
    toast.error('创建业务开发任务失败')
  }
}

// 更新任务状态
const updateStatus = async (id, status) => {
  try {
    await tasksApi.update({ id, status })
    refreshTaskWork()
    toast.info('任务状态已更新')
  } catch (e) {
    refreshTaskWork()
    toast.error(e.message || '任务状态更新失败')
  }
}

// 删除任务
const deleteTask = async (id) => {
  const confirmed = await confirmDialog('确定删除此任务？删除后无法恢复。')
  if (!confirmed) return
  await tasksApi.delete(id)
  refreshTaskWork()
  toast.success('任务已删除')
}

// 加入队列
const addToQueue = async (taskId) => {
  const res = await fetch('/api/tasks/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId })
  })
  const data = await res.json()
  if (data.success) {
    if (data.queued) toast.success('任务已加入队列')
    else toast.warning(data.message || '任务未入队')
    refreshTaskWork()
  } else {
    toast.error('加入队列失败: ' + (data.error || '未知错误'))
  }
}

// 批量加入队列
const addAllToQueue = async () => {
  const pendingTasks = tasks.value.filter(t => t.status === 'pending' || t.status === 'failed')
  if (pendingTasks.length === 0) { alert('没有待处理的任务'); return }
  if (!confirm(`确定将 ${pendingTasks.length} 个任务加入队列？`)) return

  const res = await fetch('/api/tasks/queue-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_ids: pendingTasks.map(t => t.id) })
  })
  const data = await res.json()
  if (data.success) {
    const queuedCount = data.results?.filter(r => r.queued).length ?? 0
    const blockedCount = data.results?.filter(r => r.blocked).length ?? 0
    toast.info(`批量入队完成：入队 ${queuedCount} 个，阻塞 ${blockedCount} 个`)
    refreshTaskWork()
  }
}

// 查看队列状态
const queueStatus = ref(null)
const watchdogStatus = ref(null)
const showQueueStatus = async () => {
  const res = await fetch('/api/tasks/queue/status')
  queueStatus.value = await res.json()
  const watchdogRes = await fetch('/api/tasks/watchdog')
  watchdogStatus.value = await watchdogRes.json()
  showQueue.value = true
}

const resumeQueue = async () => {
  const res = await fetch('/api/tasks/queue/resume', { method: 'POST' })
  const data = await res.json()
  if (data.success) {
    toast.success(`已恢复 ${data.resumed || 0}/${data.total || 0} 个自动任务`)
    queueStatus.value = data.queue_status || queueStatus.value
    refreshTaskWork()
  } else {
    toast.error('恢复队列失败: ' + (data.error || '未知错误'))
  }
}

const resumeWatchdog = async () => {
  const res = await fetch('/api/tasks/watchdog/resume', { method: 'POST' })
  const data = await res.json()
  if (data.success) {
    toast.success(`看门狗已恢复 ${data.recovered || 0}/${data.total_recoverable || 0} 个自动任务`)
    watchdogStatus.value = data.status || watchdogStatus.value
    queueStatus.value = data.status?.queue_status || queueStatus.value
    refreshTaskWork()
  } else {
    toast.error('看门狗恢复失败: ' + (data.error || '未知错误'))
  }
}

const retryRuntimeFailures = async () => {
  const count = watchdogStatus.value?.runtime_failed?.length ?? tasks.value.filter(t => t.status === 'failed').length
  const confirmed = await confirmDialog(`确定重试执行通道失败任务？系统只会筛选 Runner、CLI、超时等环境类失败，预计候选 ${count} 个。`)
  if (!confirmed) return
  try {
    const res = await fetch('/api/tasks/retry-runtime-failures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: '执行通道恢复后批量重试' })
    })
    const data = await res.json()
    if (!data.success) {
      toast.error('恢复执行失败任务失败: ' + (data.error || '未知错误'))
      return
    }
    toast.success(`已重试 ${data.retried || 0}/${data.total_recoverable || 0} 个执行失败任务，入队 ${data.queued || 0} 个`)
    queueStatus.value = data.queue_status || queueStatus.value
    await refreshTaskWork()
  } catch (e) {
    toast.error('恢复执行失败任务失败')
  }
}

const replanDashboardTask = async (item) => {
  const task = findTaskByDashboardItem(item)
  if (!task) return
  const message = [
    `请主 Agent 重新规划任务：${task.title}`,
    '',
    '重新规划要求：',
    '- 重新读取业务目标、验收标准、上一轮计划、子 Agent 回执和阻塞项。',
    '- 按当前项目 Agent 能力边界重新拆分任务。',
    '- 重新派发时写清每个子 Agent 的目标、允许修改范围、验证命令和交付回执要求。',
    '- 如果仍然无法继续，必须明确列出需要用户确认的信息。'
  ].join('\n')
  const ok = await submitContinuationPayload(task, message, { source: 'user_replan' })
  if (ok) await refreshTaskWork()
}

const autoContinueDashboardItem = async (item) => {
  const task = findTaskByDashboardItem(item)
  if (!task) return
  try {
    const res = await fetch('/api/tasks/continue-from-gaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task.id, auto_execute: true, source: 'dashboard_gap_rework' })
    })
    const data = await res.json()
    if (!data.success) {
      toast.error('按缺口返工失败: ' + (data.error || '未知错误'))
      return
    }
    toast.success(data.queued ? '已按缺口生成返工并入队' : data.message || '已生成返工说明')
    await refreshTaskWork()
  } catch {
    toast.error('按缺口返工失败')
  }
}

const runDashboardProbe = async () => {
  try {
    const res = await fetch('/api/orchestrator/agent-cli-probe/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 10 })
    })
    const data = await res.json()
    if (data.success) toast.success(`复检完成：通过 ${data.passed || 0}/${data.total || 0}`)
    else toast.warning(data.message || `复检完成：通过 ${data.passed || 0}/${data.total || 0}`)
    try { await fetch('/api/tasks/watchdog/resume', { method: 'POST' }) } catch {}
    await refreshTaskWork()
  } catch {
    toast.error('复检执行通道失败')
  }
}

const confirmDashboardDone = async (item) => {
  const task = findTaskByDashboardItem(item)
  if (!task) return
  const confirmed = await confirmDialog(`确认将任务 "${task.title}" 标记完成？系统仍会执行验收门禁校验。`)
  if (!confirmed) return
  await updateStatus(task.id, 'done')
  await refreshTaskWork()
}

const handleDashboardAction = async (item, action) => {
  const task = findTaskByDashboardItem(item)
  if (!task) return
  if (action.kind === 'continue') {
    if (action.id === 'replan') return replanDashboardTask(item)
    openContinueTask(task)
    return
  }
  if (action.kind === 'retry') return resendTask(task)
  if (action.kind === 'gap_continue') return autoContinueDashboardItem(item)
  if (action.kind === 'queue') return addToQueue(task.id)
  if (action.kind === 'view_pipeline') return viewPipeline(task)
  if (action.kind === 'view_report') return viewReport(task)
  if (action.kind === 'confirm_done') return confirmDashboardDone(item)
  if (action.kind === 'probe') return runDashboardProbe()
}

// 查看任务日志
const viewTaskLogs = async (taskId) => {
  currentTaskId.value = taskId
  const res = await fetch(`/api/tasks/logs?task_id=${taskId}&limit=100`)
  const data = await res.json()
  currentTaskLogs.value = data.logs || []
  showLogs.value = true
}

const showPipeline = ref(false)
const currentPipelineTask = ref(null)
const viewPipeline = (task) => {
  currentPipelineTask.value = task
  showPipeline.value = true
}

const loadTaskExecutions = async (taskId) => {
  if (!taskId) return []
  try {
    const data = await tasksApi.executions(taskId)
    taskExecutions.value = { ...taskExecutions.value, [taskId]: data.executions || [] }
    return data.executions || []
  } catch (e) {
    toast.error(e.message || '读取执行内核记录失败')
    return []
  }
}

const currentExecutions = () => taskExecutions.value[currentTaskReport.value?.id] || []

const loadTaskTrace = async (task) => {
  currentTaskTrace.value = null
  if (!task?.trace_id) return
  taskTraceLoading.value = true
  try {
    const response = await fetch(`/api/reliability/traces?id=${encodeURIComponent(task.trace_id)}`)
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '读取 Trace 失败')
    currentTaskTrace.value = data.trace || null
  } catch (e) {
    toast.error(e.message || '读取 Trace 失败')
  } finally {
    taskTraceLoading.value = false
  }
}

const viewReport = async (task) => {
  currentTaskReport.value = task
  showReport.value = true
  await Promise.all([loadTaskExecutions(task.id), loadTaskTrace(task)])
}

const cancelTask = async (task) => {
  const confirmed = await confirmDialog(`确定停止任务“${task.title}”？系统会终止正在运行的 Agent 子进程，并保留检查点供回滚。`)
  if (!confirmed) return
  try {
    await tasksApi.cancel({ task_id: task.id, reason: '用户从任务管理页主动停止' })
    toast.warning('停止请求已发送，正在终止 Agent 进程')
    await refreshTaskWork()
  } catch (e) {
    toast.error(e.message || '停止任务失败')
  }
}

const rollbackExecution = async (execution) => {
  const checkpointId = execution?.checkpointIds?.[execution.checkpointIds.length - 1]
  if (!checkpointId) return toast.warning('这个执行没有可用检查点')
  const reason = window.prompt('请输入回滚原因（会写入审计记录）', '放弃本轮未验收变更')
  if (!reason?.trim()) return
  const shared = execution.workspace?.mode !== 'worktree'
  const confirmed = await confirmDialog(shared
    ? '这是共享工作目录。回滚可能覆盖同目录中的其他未完成修改，仍要继续吗？'
    : `确定把 ${execution.project} 回滚到任务开始前的检查点吗？`)
  if (!confirmed) return
  executionActionBusy.value = `rollback:${execution.id}`
  try {
    await tasksApi.rollbackExecution({ checkpoint_id: checkpointId, reason: reason.trim(), allow_shared: shared })
    toast.success('已回滚到任务检查点')
    await loadTaskExecutions(currentTaskReport.value?.id)
  } catch (e) { toast.error(e.message || '回滚失败') }
  executionActionBusy.value = ''
}

const mergeExecution = async (execution) => {
  const confirmed = await confirmDialog(`确定把 ${execution.project} 的 worktree 分支安全合并回主工作目录吗？系统会先检查绿灯和分支新鲜度。`)
  if (!confirmed) return
  executionActionBusy.value = `merge:${execution.id}`
  try {
    await tasksApi.mergeExecution({ execution_id: execution.id, commit: true })
    toast.success('worktree 已安全合并')
    await loadTaskExecutions(currentTaskReport.value?.id)
  } catch (e) { toast.error(e.message || '合并失败') }
  executionActionBusy.value = ''
}

const cleanupExecution = async (execution) => {
  const confirmed = await confirmDialog(`确定清理 ${execution.project} 已合并的 worktree 和临时分支吗？`)
  if (!confirmed) return
  executionActionBusy.value = `cleanup:${execution.id}`
  try {
    await tasksApi.cleanupExecution({ execution_id: execution.id })
    toast.success('worktree 已清理')
    await loadTaskExecutions(currentTaskReport.value?.id)
  } catch (e) { toast.error(e.message || '清理失败') }
  executionActionBusy.value = ''
}

const openContinueTask = (task) => {
  currentContinueTask.value = task
  continueMessage.value = buildContinuationDraft(task)
  showContinue.value = true
}

const continueFromReport = () => {
  if (!currentTaskReport.value) return
  showReport.value = false
  openContinueTask(currentTaskReport.value)
}

const submitContinuationPayload = async (task, message, options = {}) => {
  if (!task?.id) { toast.warning('请选择任务'); return false }
  if (!String(message || '').trim()) { toast.warning('请输入补充说明'); return false }
  try {
    const res = await fetch('/api/tasks/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: task.id,
        message,
        auto_execute: true,
        source: options.source || 'user'
      })
    })
    const data = await res.json()
    if (!data.success) {
      toast.error('继续执行失败: ' + (data.error || '未知错误'))
      return false
    }
    await refreshTaskWork()
    toast.success(data.queued ? '补充说明已提交，任务已重新入队' : data.message || '补充说明已提交')
    return true
  } catch (e) {
    toast.error('提交补充说明失败')
    return false
  }
}

const submitTaskContinuation = async () => {
  const ok = await submitContinuationPayload(currentContinueTask.value, continueMessage.value, { source: 'user' })
  if (ok) {
    showContinue.value = false
    currentContinueTask.value = null
    continueMessage.value = ''
  }
}

const autoContinueFromReport = async () => {
  if (!currentTaskReport.value) return
  try {
    const res = await fetch('/api/tasks/continue-from-gaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: currentTaskReport.value.id,
        auto_execute: true,
        source: 'auto_gap_rework'
      })
    })
    const data = await res.json()
    if (!data.success) {
      toast.error('按缺口继续失败: ' + (data.error || '未知错误'))
      return
    }
    await refreshTaskWork()
    toast.success(data.queued ? '已按报告缺口重新入队' : data.message || '已生成缺口续跑说明')
    showReport.value = false
  } catch (e) {
    toast.error('按缺口继续失败')
  }
}

// 重新派发任务
const resendTask = async (task) => {
  const confirmed = await confirmDialog(`确定重新派发任务 "${task.title}"？系统会清理上一次失败报告并重新入队。`)
  if (!confirmed) return
  try {
    const data = await tasksApi.retry({
      task_id: task.id,
      reason: task.status === 'failed' ? '失败后手动重试' : '手动重新派发'
    })
    refreshTaskWork()
    toast.success(data.queued ? '任务已重新加入执行队列' : data.queue_result?.message || '任务已重新派发')
  } catch (e) {
    refreshTaskWork()
    toast.error(e.message || '重新派发失败')
  }
}

const priorityLabel = { high: '🔴 高', normal: '🟡 中', low: '⚪ 低' }

onMounted(() => {
  loadTasks()
  loadGroups()
  loadProjects()
  loadOrchestratorDiagnostics()
  loadExecutionDashboard()
})
</script>

<template>
  <div class="task-manager">
    <!-- 顶部统计栏 -->
    <div class="toolbar">
      <div class="stats">
        <div class="stat"><span class="stat-label">总计</span><span class="stat-value">{{ stats.total }}</span></div>
        <div class="stat"><span class="stat-label" style="color:var(--accent-yellow)">待处理</span><span class="stat-value" style="color:var(--accent-yellow)">{{ stats.pending }}</span></div>
        <div class="stat"><span class="stat-label" style="color:var(--accent-blue)">进行中</span><span class="stat-value" style="color:var(--accent-blue)">{{ stats.inProgress }}</span></div>
        <div class="stat"><span class="stat-label" style="color:var(--accent-green)">已完成</span><span class="stat-value" style="color:var(--accent-green)">{{ stats.done }}</span></div>
        <div class="stat"><span class="stat-label" style="color:var(--accent-red)">失败</span><span class="stat-value" style="color:var(--accent-red)">{{ stats.failed }}</span></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" @click="showQueueStatus()">📊 队列状态</button>
        <button class="btn btn-outline btn-sm" @click="openBacklog()">需求池</button>
        <button class="btn btn-outline btn-sm" @click="resumeQueue()">▶ 恢复队列</button>
        <button class="btn btn-outline btn-sm" @click="retryRuntimeFailures()">恢复执行失败</button>
        <button class="btn btn-outline btn-sm" @click="addAllToQueue()">📥 全部加入队列</button>
        <button class="btn btn-primary" @click="showDailyDevCreate = true">业务开发任务</button>
        <button class="btn btn-primary" @click="showCreate = true">+ 新建任务</button>
      </div>
    </div>

    <section class="execution-dashboard">
      <div class="dashboard-head">
        <div>
          <div class="dashboard-kicker">任务执行驾驶舱</div>
          <h3>主 Agent 计划、子 Agent 执行和接管入口</h3>
        </div>
        <div class="dashboard-head-actions">
          <span v-if="executionDashboard?.generated_at" class="dashboard-updated">更新 {{ new Date(executionDashboard.generated_at).toLocaleTimeString('zh-CN') }}</span>
          <button class="btn btn-outline btn-sm" :disabled="executionDashboardLoading" @click="refreshTaskWork">{{ executionDashboardLoading ? '刷新中...' : '刷新' }}</button>
          <button class="btn btn-outline btn-sm" @click="runDashboardProbe">复检执行通道</button>
        </div>
      </div>

      <div class="dashboard-metrics">
        <div class="dashboard-metric"><span>活跃任务</span><strong>{{ dashboardSummary().active || 0 }}</strong></div>
        <div class="dashboard-metric"><span>执行中</span><strong>{{ dashboardSummary().running || 0 }}</strong></div>
        <div class="dashboard-metric"><span>队列中</span><strong>{{ dashboardSummary().queued || dashboardQueue().total_queued || 0 }}</strong></div>
        <div class="dashboard-metric warn"><span>需接管</span><strong>{{ dashboardSummary().blocked || 0 }}</strong></div>
        <div class="dashboard-metric"><span>已完成</span><strong>{{ dashboardSummary().done || 0 }}</strong></div>
      </div>

      <div class="dashboard-queue-row">
        <span>队列 {{ dashboardQueue().total_queued || 0 }}</span>
        <span>运行目标 {{ dashboardQueue().running_targets || 0 }}</span>
        <span>待处理 {{ dashboardQueue().pending_tasks || 0 }}</span>
        <span>失败 {{ dashboardQueue().failed_tasks || 0 }}</span>
      </div>

      <div class="dashboard-filter-row">
        <div class="dashboard-filter-tabs" role="tablist" aria-label="任务驾驶舱筛选">
          <button
            v-for="option in dashboardFilterOptions()"
            :key="option.key"
            type="button"
            :class="['dashboard-filter-tab', { active: dashboardFilter === option.key }]"
            @click="setDashboardFilter(option.key)"
          >
            <span>{{ option.label }}</span>
            <strong>{{ option.count }}</strong>
          </button>
        </div>
        <span class="dashboard-filter-count">显示 {{ filteredDashboardItems().length }} / {{ dashboardItems().length }} 条最近执行记录</span>
      </div>

      <div v-if="executionDashboardLoading && !filteredDashboardItems().length" class="dashboard-empty">正在读取真实执行链路...</div>
      <div v-else-if="!filteredDashboardItems().length" class="dashboard-empty">当前筛选下没有可展示的执行任务。</div>
      <div v-else class="dashboard-task-list">
        <article v-for="item in filteredDashboardItems()" :key="item.id" :class="['dashboard-task', phaseTone(item.phase), { expanded: isDashboardItemExpanded(item) }]">
          <div class="dashboard-task-top">
            <div class="dashboard-task-title">
              <span :class="['dashboard-phase', phaseTone(item.phase)]">{{ phaseLabel(item.phase) }}</span>
              <strong>{{ item.title }}</strong>
            </div>
            <div class="dashboard-task-meta">
              <span>{{ item.workflow_type === 'daily_dev' ? '日常开发' : item.assign_type || '任务' }}</span>
              <span>{{ item.target_project || item.group_id || '未指定目标' }}</span>
              <span>{{ item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : '未记录更新时间' }}</span>
              <button type="button" class="dashboard-expand-button" @click="toggleDashboardItem(item)">{{ isDashboardItemExpanded(item) ? '收起' : '查看详情' }}</button>
            </div>
          </div>

          <div v-if="!isDashboardItemExpanded(item)" class="dashboard-compact-line" @click="toggleDashboardItem(item)">
            <span>{{ compactDashboardText(item.status_detail || item.headline || '暂无执行摘要', 150) }}</span>
            <strong>{{ item.workers?.length || item.assignments?.length || 0 }} Agent · 验证 {{ item.evidence?.verification_executed?.length || 0 }} · 实变 {{ item.evidence?.actual_file_change_count || 0 }}</strong>
          </div>

          <div v-else class="dashboard-detail-body">
            <div v-if="item.status_detail || item.headline" class="dashboard-status-line">
              {{ compactDashboardText(item.status_detail || item.headline, 220) }}
            </div>

            <div class="dashboard-work-grid">
            <div class="dashboard-panel">
              <div class="dashboard-panel-title">主 Agent 计划</div>
              <div class="dashboard-panel-count">{{ item.main_plan?.count || 0 }} 条计划证据</div>
              <ul v-if="item.main_plan?.phases?.length" class="dashboard-list">
                <li v-for="(phase, index) in item.main_plan.phases.slice(0, 4)" :key="index">{{ compactDashboardText(phase.title || phase.name || phase.phase || phase, 90) }}</li>
              </ul>
              <div v-else class="dashboard-muted">等待主 Agent 输出计划。</div>
            </div>

            <div class="dashboard-panel">
              <div class="dashboard-panel-title">子 Agent 执行</div>
              <div class="dashboard-panel-count">{{ item.workers?.length || item.assignments?.length || 0 }} 个 Agent</div>
              <div v-if="item.workers?.length" class="dashboard-agent-stack">
                <span v-for="worker in item.workers.slice(0, 5)" :key="worker.agent" :class="['dashboard-agent', workflowStatusTone(worker.status)]">
                  {{ worker.agent }} · {{ receiptStatusText(worker.status) }}
                </span>
              </div>
              <div v-else class="dashboard-muted">等待派发或回执。</div>
            </div>

            <div class="dashboard-panel evidence">
              <div class="dashboard-panel-title">验收证据</div>
              <div class="dashboard-evidence-grid">
                <span>实变 <strong>{{ item.evidence?.actual_file_change_count || 0 }}</strong></span>
                <span>回执 <strong>{{ item.evidence?.receipt_count || 0 }}</strong></span>
                <span>验证 <strong>{{ item.evidence?.verification_executed?.length || 0 }}</strong></span>
                <span>返工 <strong>{{ item.rework_records?.length || 0 }}</strong></span>
              </div>
              <div v-if="item.evidence?.actual_file_changes?.length" class="dashboard-evidence-detail">
                <span>文件</span>
                <code v-for="file in item.evidence.actual_file_changes.slice(0, 3)" :key="file.path || file">{{ file.path || file }}</code>
              </div>
              <div v-if="item.evidence?.verification_executed?.length" class="dashboard-evidence-detail ok">
                <span>验证</span>
                <code v-for="verify in item.evidence.verification_executed.slice(0, 2)" :key="verify.command || verify">{{ compactDashboardText(verify.command || verify, 80) }}</code>
              </div>
              <div v-if="item.rework_records?.length" class="dashboard-evidence-detail warn">
                <span>返工</span>
                <code v-for="record in item.rework_records.slice(0, 2)" :key="record.time || record.summary || record.reason">{{ compactDashboardText(record.summary || record.reason || record.message || record.source, 90) }}</code>
              </div>
              <div v-if="item.evidence?.verification_failed?.length || item.evidence?.verification_required_missing?.length" class="dashboard-warning-line">
                验证问题 {{ (item.evidence.verification_failed?.length || 0) + (item.evidence.verification_required_missing?.length || 0) }} 项
              </div>
            </div>

            <div class="dashboard-panel blockers">
              <div class="dashboard-panel-title">阻塞/接管</div>
              <ul v-if="item.blockers?.length" class="dashboard-list warn">
                <li v-for="blocker in item.blockers.slice(0, 4)" :key="blocker">{{ compactDashboardText(blocker, 110) }}</li>
              </ul>
              <div v-else class="dashboard-muted">暂无阻塞项。</div>
            </div>
          </div>

            <div class="dashboard-actions">
              <button
                v-for="action in item.actions"
                :key="action.id"
                :class="actionClass(action)"
                @click.stop="handleDashboardAction(item, action)"
              >{{ action.label }}</button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- 需求池弹窗 -->
    <div v-if="showBacklog" class="modal-overlay" @click.self="showBacklog = false">
      <div class="modal backlog-modal">
        <button class="modal-close" @click="showBacklog = false">&times;</button>
        <h3>业务需求池</h3>
        <div class="backlog-stats">
          <span>待补充 {{ backlogCount('needs_user') }}</span>
          <span>可接活 {{ backlogCount('ready') }}</span>
          <span>已派发 {{ backlogCount('planned', 'dispatched', 'queued') }}</span>
          <span>执行中 {{ backlogCount('running', 'in_progress') }}</span>
          <span>验收中 {{ backlogCount('reviewing') }}</span>
          <span>阻塞/失败 {{ backlogCount('blocked', 'failed') }}</span>
          <span>完成 {{ backlogCount('done') }}</span>
        </div>
        <div class="backlog-toolbar-grid">
          <div class="backlog-toolbar">
            <div>
              <strong>导入共享文档</strong>
              <span>把群聊里的 PRD、接口说明或业务文档转成需求卡，信息不足会进入待补充</span>
            </div>
            <button class="btn btn-outline btn-sm" :disabled="backlogImportLoading" @click="importSharedDocsToBacklog">
              {{ backlogImportLoading ? '导入中...' : '导入共享文档' }}
            </button>
          </div>
          <div class="backlog-toolbar">
            <div>
              <strong>自动派发</strong>
              <span>只派发可接活需求，后续由主 Agent 拆分计划并交给子 Agent</span>
            </div>
            <button class="btn btn-primary btn-sm" :disabled="backlogBulkDispatchLoading || !(backlogCounts.ready > 0)" @click="dispatchReadyBacklogs">
              {{ backlogBulkDispatchLoading ? '派发中...' : '派发可接活' }}
            </button>
          </div>
        </div>
        <div v-if="backlogImportResult || backlogBulkDispatchResult" class="backlog-bulk-result">
          <template v-if="backlogImportResult">
            <span>导入 {{ backlogImportResult.imported || 0 }}</span>
            <span>跳过 {{ backlogImportResult.skipped || 0 }}</span>
          </template>
          <template v-if="backlogBulkDispatchResult">
            <span>候选 {{ backlogBulkDispatchResult.total_candidates || 0 }}</span>
            <span>派发 {{ backlogBulkDispatchResult.dispatched || 0 }}</span>
            <span>入队 {{ backlogBulkDispatchResult.queued || 0 }}</span>
            <span>失败 {{ backlogBulkDispatchResult.failed || 0 }}</span>
          </template>
        </div>
        <div v-if="dailyDevBacklogs.length === 0" class="empty-mini">暂无业务开发需求池文件</div>
        <div v-else class="backlog-list">
          <div v-for="item in dailyDevBacklogs" :key="item.group_id + ':' + item.name" :class="['backlog-item', backlogState(item)]">
            <div class="backlog-main">
              <div class="backlog-title-row">
                <span :class="['backlog-status', backlogState(item)]">{{ item.state_label || backlogStatusLabel[backlogState(item)] || backlogState(item) }}</span>
                <strong>{{ item.title }}</strong>
                <span :class="'priority-tag priority-' + item.priority">{{ priorityLabel[item.priority] || item.priority }}</span>
              </div>
              <div class="backlog-goal">{{ item.business_goal }}</div>
              <div class="backlog-state-grid">
                <div>
                  <span>下一步</span>
                  <strong>{{ item.next_action || '等待系统推进' }}</strong>
                </div>
                <div>
                  <span>负责人</span>
                  <strong>{{ item.owner || '主 Agent' }}</strong>
                </div>
                <div>
                  <span>所属群聊</span>
                  <strong>{{ item.group_name }}</strong>
                </div>
                <div>
                  <span>更新时间</span>
                  <strong>{{ formatBacklogTime(item.updated_at || item.created_at) }}</strong>
                </div>
              </div>
              <div v-if="backlogQualityText(item)" :class="['backlog-readiness', item.quality?.pass ? 'ok' : 'warn']">
                {{ backlogQualityText(item) }}
              </div>
              <div :class="['backlog-readiness', dailyDevGroupCanExecute(item.group_id) ? 'ok' : 'warn']">
                {{ dailyDevGroupReadinessMessage(item.group_id) }}
              </div>
              <div v-if="item.question_to_user" class="backlog-result ask">需要用户补充：{{ item.question_to_user }}</div>
              <div v-if="item.blocker" class="backlog-result danger">阻塞原因：{{ item.blocker }}</div>
              <div v-else-if="item.last_result" class="backlog-result">{{ item.last_result }}</div>
              <div v-if="item.evidence?.length" class="backlog-evidence">
                <span v-for="entry in item.evidence" :key="entry">{{ entry }}</span>
              </div>
              <div v-if="backlogLatestHistory(item).length" class="backlog-history">
                <span v-for="history in backlogLatestHistory(item)" :key="history.at + history.state">
                  {{ backlogStatusLabel[history.state] || history.state }} · {{ history.reason || '状态流转' }}
                </span>
              </div>
              <div class="backlog-meta">
                <span>{{ item.name }}</span>
                <span v-if="item.task_id">任务 {{ item.task_id }}</span>
                <span v-if="item.raw_status && item.raw_status !== backlogState(item)">原始状态 {{ item.raw_status }}</span>
              </div>
            </div>
            <div class="backlog-actions">
              <button v-if="backlogCanDispatch(item)" class="btn btn-primary btn-sm" :disabled="!dailyDevGroupCanExecute(item.group_id)" @click="dispatchBacklog(item)">立即派发</button>
              <button v-if="backlogCanRestoreReady(item)" class="btn btn-outline btn-sm" @click="updateBacklogStatus(item, 'ready')">恢复可接活</button>
              <button v-if="backlogState(item) === 'ready'" class="btn btn-outline btn-sm" @click="updateBacklogStatus(item, 'blocked')">标记阻塞</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="content">
      <div v-if="tasks.length === 0" class="empty">
        <span class="icon">📋</span>
        <span>暂无任务</span>
        <span class="sub">点击右上角创建并派发任务</span>
      </div>
      <div v-else class="task-list">
        <div v-for="task in tasks" :key="task.id" class="task-card">
          <div class="task-main">
            <div class="task-info">
              <div class="task-title-row">
                <span class="task-title">{{ task.title }}</span>
                <span :class="'priority-tag priority-' + task.priority">{{ priorityLabel[task.priority] }}</span>
              </div>
              <div v-if="task.description" class="task-desc">{{ task.description?.substring(0, 100) }}</div>
              <div v-if="task.delivery_summary?.headline" class="task-delivery-headline">{{ task.delivery_summary.headline }}</div>
              <div v-if="workflowSummaryItems(task).length" class="agent-workflow-row">
                <span v-for="item in workflowSummaryItems(task)" :key="item.key" :class="['workflow-chip', item.tone]">{{ item.label }}</span>
              </div>
              <div v-if="workflowAgentPreview(task).length" class="agent-preview-row">
                <span v-for="agent in workflowAgentPreview(task)" :key="agent.project" :class="['agent-preview-chip', agent.tone]">
                  {{ agent.project }} · {{ agent.statusText }}
                </span>
              </div>
              <div v-if="deliveryEvidenceItems(task).length" class="task-evidence-row">
                <span v-for="item in deliveryEvidenceItems(task)" :key="item.key" :class="['evidence-chip', item.tone]">{{ item.label }}</span>
              </div>
              <div v-if="isExecutionBlockedTask(task)" class="task-execution-block">
                <strong>等待执行通道恢复</strong>
                <span>{{ executionBlockedMessage(task) }}</span>
                <ul v-if="executionFixActions(task).length" class="execution-fix-list">
                  <li v-for="action in executionFixActions(task)" :key="action">{{ action }}</li>
                </ul>
              </div>
              <div v-if="task.status_detail" class="task-status-detail">{{ task.status_detail }}</div>
              <div v-if="task.execution_kernel" class="kernel-summary-row">
                <span :class="['kernel-chip', taskKernelState(task)]">{{ executionStateLabel(taskKernelState(task)) }}</span>
                <span :class="['kernel-chip', 'green-' + taskKernelGreen(task)]">{{ greenLevelLabel(taskKernelGreen(task)) }}</span>
              </div>
              <div v-if="task.final_report || task.result" class="task-result">{{ (task.final_report || task.result)?.substring(0, 180) }}</div>
              <div class="task-meta">
                <span class="meta-item">{{ task.assign_type === 'group' ? '💬' : '🤖' }} {{ task.assign_type === 'group' ? (groups.find(g => g.id === task.group_id)?.name || task.group_id) : task.target_project }}</span>
                <span class="meta-item">🕐 {{ new Date(task.created_at).toLocaleString('zh-CN') }}</span>
                <span v-if="task.trace_id" class="meta-item trace-meta" :title="task.trace_id">Trace {{ task.trace_id.slice(-12) }}</span>
              </div>
            </div>
            <div class="task-right">
              <select :value="task.status" @change="updateStatus(task.id, $event.target.value)" class="status-select">
                <option value="pending">待处理</option>
                <option value="in_progress">进行中</option>
                <option value="done" :disabled="task.status !== 'done' && !canManualCompleteDailyDev(task)">已完成</option>
                <option value="failed">失败</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
          <div class="task-actions">
            <button v-if="canCancelTask(task)" class="btn btn-danger btn-sm" @click="cancelTask(task)">停止任务</button>
            <button v-if="task.status === 'pending' || task.status === 'failed'" class="btn btn-primary btn-sm" @click="addToQueue(task.id)">📥 加入队列</button>
            <button v-if="task.final_report || task.result || task.receipt || task.review" class="btn btn-outline btn-sm" @click="viewReport(task)">📄 报告</button>
                    <button v-if="task.delivery_summary" class="btn btn-outline btn-sm" style="color: #00bcd4; border-color: rgba(0, 188, 212, 0.3); background: rgba(0, 188, 212, 0.08);" @click="viewPipeline(task)">协作看板</button>
            <button v-if="task.status !== 'done'" class="btn btn-outline btn-sm" @click="openContinueTask(task)">补充</button>
            <button class="btn btn-outline btn-sm" @click="viewTaskLogs(task.id)">📋 日志</button>
            <button v-if="task.status !== 'done'" class="btn btn-outline btn-sm" @click="resendTask(task)">🔄 重派</button>
            <button class="btn btn-danger btn-sm" @click="deleteTask(task.id)">🗑️ 删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 业务开发任务弹窗 -->
    <div v-if="showDailyDevCreate" class="modal-overlay" @click.self="showDailyDevCreate = false">
      <div class="modal daily-dev-modal">
        <button class="modal-close" @click="showDailyDevCreate = false">&times;</button>
        <h3>业务开发任务</h3>
        <div class="form-group">
          <label>任务标题</label>
          <input v-model="dailyDevTask.title" placeholder="如 订单退款审核功能">
        </div>
        <div class="form-group">
          <label>业务目标</label>
          <textarea v-model="dailyDevTask.businessGoal" rows="3" placeholder="说明你希望最终实现的业务能力"></textarea>
        </div>
        <div class="form-group">
          <label>开发范围</label>
          <textarea v-model="dailyDevTask.scope" rows="3" placeholder="例如后端接口、前端页面、权限、日志、测试等范围"></textarea>
        </div>
        <div class="form-group">
          <label>业务/接口文档</label>
          <textarea v-model="dailyDevTask.documents" rows="3" placeholder="粘贴 PRD、接口字段、共享文件名或文档链接"></textarea>
        </div>
        <div class="form-group">
          <label>验收标准</label>
          <textarea v-model="dailyDevTask.acceptance" rows="3" placeholder="列出主 Agent 最终报告必须证明的完成标准"></textarea>
        </div>
        <div class="form-group">
          <label>约束/注意事项</label>
          <textarea v-model="dailyDevTask.constraints" rows="2" placeholder="例如不要改动某模块、必须兼容旧接口、需要保留现有样式"></textarea>
        </div>
        <div class="form-group">
          <label>开发群聊</label>
          <select v-model="dailyDevTask.groupId">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
          <div :class="['daily-dev-readiness', selectedDailyDevGroupCanExecute() ? 'ok' : 'warn']">
            {{ selectedDailyDevGroupMessage() }}
          </div>
        </div>
        <div :class="['daily-dev-quality', dailyDevIntakeQuality().pass ? 'ok' : 'warn']">
          <strong>需求质量 {{ dailyDevIntakeQuality().score }}/{{ dailyDevIntakeQuality().total }}</strong>
          <span v-if="dailyDevIntakeQuality().pass">信息足够，主 Agent 可以稳定拆分执行。</span>
          <span v-else>建议补充：{{ dailyDevIntakeQuality().missing.join('、') }}</span>
        </div>
        <div class="form-group">
          <label>优先级</label>
          <select v-model="dailyDevTask.priority">
            <option value="high">🔴 高</option>
            <option value="normal">🟡 中</option>
            <option value="low">⚪ 低</option>
          </select>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" v-model="dailyDevTask.autoExecute" style="accent-color:var(--accent-blue)">
            创建后立即交给主 Agent 执行
          </label>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" v-model="dailyDevTask.requiresCodeChanges" style="accent-color:var(--accent-blue)">
            完成时必须有实际代码变更
          </label>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" v-model="dailyDevTask.persistDocuments" style="accent-color:var(--accent-blue)">
            写入群聊需求池，供主 Agent 和定时任务后续读取
          </label>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showDailyDevCreate = false">取消</button>
          <button class="btn btn-primary" :disabled="!selectedDailyDevGroupCanExecute()" @click="submitDailyDevTask">{{ dailyDevTask.autoExecute ? '交给主 Agent' : '仅创建任务' }}</button>
        </div>
      </div>
    </div>

    <!-- 新建任务弹窗 -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal" style="min-width:500px">
        <button class="modal-close" @click="showCreate = false">&times;</button>
        <h3>📋 新建任务</h3>
        <div class="form-group">
          <label>任务标题</label>
          <input v-model="newTask.title" placeholder="简要描述任务">
        </div>
        <div class="form-group">
          <label>详细描述</label>
          <textarea v-model="newTask.description" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.85);color:var(--text-primary);font-size:13px;resize:vertical;outline:none" placeholder="可选，详细描述任务需求"></textarea>
        </div>
        <div class="form-group">
          <label>分配方式</label>
          <select v-model="newTask.assignType">
            <option value="group">分配给群聊（由主 Agent 协调）</option>
            <option value="project">直接分配给项目 Agent</option>
          </select>
        </div>
        <div v-if="newTask.assignType === 'group'" class="form-group">
          <label>选择群聊</label>
          <select v-model="newTask.groupId">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div v-else class="form-group">
          <label>选择项目</label>
          <select v-model="newTask.projectId">
            <option v-for="p in projects" :key="p.name" :value="p.name">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>优先级</label>
          <select v-model="newTask.priority">
            <option value="high">🔴 高</option>
            <option value="normal">🟡 中</option>
            <option value="low">⚪ 低</option>
          </select>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" v-model="newTask.autoExecute" style="accent-color:var(--accent-blue)">
            创建后立即加入执行队列
          </label>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showCreate = false">取消</button>
          <button class="btn btn-primary" @click="submitCreateTask">{{ newTask.autoExecute ? '创建并加入队列' : '仅创建任务' }}</button>
        </div>
      </div>
    </div>

    <!-- 队列状态弹窗 -->
    <div v-if="showQueue" class="modal-overlay" @click.self="showQueue = false">
      <div class="modal" style="min-width:450px">
        <button class="modal-close" @click="showQueue = false">&times;</button>
        <h3>📊 任务队列状态</h3>
        <div style="margin-top:16px">
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
            <div style="padding:16px;background:var(--bg-glass);border-radius:8px;text-align:center">
              <div style="font-size:28px;font-weight:600;color:var(--accent-blue)">{{ queueStatus?.total_queued || 0 }}</div>
              <div style="font-size:12px;color:var(--text-muted)">队列中</div>
            </div>
            <div style="padding:16px;background:var(--bg-glass);border-radius:8px;text-align:center">
              <div style="font-size:28px;font-weight:600;color:var(--accent-green)">{{ queueStatus?.running_targets || 0 }}</div>
              <div style="font-size:12px;color:var(--text-muted)">并行执行</div>
            </div>
          </div>
          <div class="watchdog-box">
            <div class="watchdog-title">任务看门狗</div>
            <div class="watchdog-grid">
              <span>待入队卡住：{{ watchdogStatus?.stale_pending?.length || 0 }}</span>
              <span>执行中断：{{ watchdogStatus?.stalled_in_progress?.length || 0 }}</span>
              <span>长时间运行：{{ watchdogStatus?.running_long?.length || 0 }}</span>
              <span>执行通道失败：{{ watchdogStatus?.runtime_failed?.length || 0 }}</span>
            </div>
          </div>
        </div>
        <div class="form-actions" style="margin-top:20px">
          <button class="btn btn-outline" @click="resumeQueue()">恢复自动任务</button>
          <button class="btn btn-outline" @click="resumeWatchdog()">看门狗恢复</button>
          <button class="btn btn-outline" @click="retryRuntimeFailures()">恢复执行失败</button>
          <button class="btn btn-primary" @click="showQueue = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 任务报告弹窗 -->
    <!-- Agent 协作流 Pipeline 弹窗 -->
    <div v-if="showPipeline" class="modal-overlay" style="z-index: 999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(12px);" @click.self="showPipeline = false">
      <div class="modal" style="width: 860px; max-width: 90vw; background: rgba(18, 22, 33, 0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; max-height: 90vh;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 15px; color: #fff; display: flex; align-items: center; gap: 8px;">
            Agent 协作看板
          </h3>
          <button class="modal-close" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer; line-height: 1;" @click="showPipeline = false">&times;</button>
        </div>
        <div style="flex: 1; overflow-y: auto;">
          <AgentPipeline
            :task="currentPipelineTask"
            :deliverySummary="currentPipelineTask?.delivery_summary || null"
            :assignments="currentPipelineTask?.delivery_summary?.assignment_evidence || []"
            :coordinationPlan="currentPipelineTask?.delivery_summary?.latest_coordination_plan || null"
            :taskStatus="currentPipelineTask?.status || 'pending'"
            :fileChanges="currentPipelineTask?.delivery_summary ? { count: currentPipelineTask.delivery_summary.actual_file_change_count || 0, files: currentPipelineTask.delivery_summary.actual_file_changes || [] } : null"
            :receipts="currentPipelineTask?.delivery_summary?.receipts || currentPipelineTask?.delivery_summary?.receipt_statuses || []"
            :title="currentPipelineTask?.title || 'Agent 协作看板'"
          />
        </div>
      </div>
    </div>

    <div v-if="showReport" class="modal-overlay" @click.self="showReport = false">
      <div class="modal report-modal">
        <button class="modal-close" @click="showReport = false">&times;</button>
        <h3>📄 任务执行报告</h3>
        <div class="modal-body" style="flex: 1; overflow-y: auto; padding-right: 4px; margin-top: 12px; display: flex; flex-direction: column; gap: 16px;">
        <div class="report-meta">
          <div><strong>{{ currentTaskReport?.title }}</strong></div>
          <div>{{ currentTaskReport?.status_detail || '暂无状态说明' }}</div>
          <div v-if="currentTaskReport?.trace_id" class="trace-identity">
            <span>Trace ID</span>
            <code>{{ currentTaskReport.trace_id }}</code>
          </div>
        </div>
        <div v-if="taskTraceLoading" class="trace-panel muted">正在读取全链路记录…</div>
        <div v-else-if="currentTaskTrace?.events?.length" class="trace-panel">
          <div class="trace-panel-head">
            <strong>全链路 Trace</strong>
            <span>{{ currentTaskTrace.events.length }} 个事件</span>
          </div>
          <div class="kernel-timeline trace-events">
            <div v-for="event in currentTaskTrace.events.slice(-16)" :key="event.id" class="kernel-event">
              <div><strong>{{ event.type }}</strong><span>{{ new Date(event.at).toLocaleString('zh-CN') }}</span></div>
              <p>{{ event.message || event.status }}</p>
            </div>
          </div>
        </div>
        <div v-if="currentTaskReport?.delivery_summary" class="delivery-summary">
          <div class="delivery-grid">
            <div>
              <span class="delivery-label">交付状态</span>
              <strong>{{ currentTaskReport.delivery_summary.headline }}</strong>
            </div>
            <div>
              <span class="delivery-label">参与 Agent</span>
              <strong>{{ currentTaskReport.delivery_summary.agents?.join('、') || '暂无' }}</strong>
            </div>
            <div>
              <span class="delivery-label">文件变更</span>
              <strong>{{ currentTaskReport.delivery_summary.files_changed?.length || 0 }} 个</strong>
            </div>
            <div>
              <span class="delivery-label">实际捕获</span>
              <strong>{{ currentTaskReport.delivery_summary.actual_file_change_count || 0 }} 个</strong>
            </div>
            <div>
              <span class="delivery-label">验证记录</span>
              <strong>{{ currentTaskReport.delivery_summary.verification?.length || 0 }} 条</strong>
            </div>
            <div>
              <span class="delivery-label">已执行验证</span>
              <strong>{{ currentTaskReport.delivery_summary.verification_executed?.length || 0 }} 条</strong>
            </div>
            <div>
              <span class="delivery-label">失败验证</span>
              <strong>{{ currentTaskReport.delivery_summary.verification_failed?.length || 0 }} 条</strong>
            </div>
          </div>
          <div v-if="currentTaskReport.delivery_summary.actual_file_changes?.length" class="delivery-list">
            <span class="delivery-label">实际文件变更</span>
            <code v-for="file in currentTaskReport.delivery_summary.actual_file_changes" :key="`${file.agent || ''}:${file.path}:${file.status_kind || file.status}`">
              {{ file.agent ? `${file.agent} · ` : '' }}{{ file.path }}{{ file.status ? ` (${file.status})` : '' }}
            </code>
          </div>
          <div v-if="currentTaskReport.delivery_summary.files_changed?.length" class="delivery-list">
            <span class="delivery-label">变更文件</span>
            <code v-for="file in currentTaskReport.delivery_summary.files_changed" :key="file">{{ file }}</code>
          </div>
          <div v-if="currentTaskReport.delivery_summary.verification_executed?.length" class="delivery-list ok">
            <span class="delivery-label">已执行验证</span>
            <span v-for="item in currentTaskReport.delivery_summary.verification_executed" :key="item" class="delivery-pill">{{ item }}</span>
          </div>
          <div v-if="currentTaskReport.delivery_summary.verification_suggested?.length" class="delivery-list muted">
            <span class="delivery-label">建议/未执行</span>
            <span v-for="item in currentTaskReport.delivery_summary.verification_suggested" :key="item" class="delivery-pill">{{ item }}</span>
          </div>
          <div v-if="currentTaskReport.delivery_summary.verification_failed?.length" class="delivery-list danger">
            <span class="delivery-label">失败验证</span>
            <span v-for="item in currentTaskReport.delivery_summary.verification_failed" :key="item" class="delivery-pill">{{ item }}</span>
          </div>
          <div v-if="currentTaskReport.delivery_summary.verification_required_missing?.length" class="delivery-list warning">
            <span class="delivery-label">缺命令验证</span>
            <span v-for="item in currentTaskReport.delivery_summary.verification_required_missing" :key="item.agent" class="delivery-pill">
              {{ item.agent }}：{{ item.required?.join(' / ') || '未配置命令' }}
            </span>
          </div>
          <div v-if="!hasCategorizedVerification(currentTaskReport.delivery_summary) && currentTaskReport.delivery_summary.verification?.length" class="delivery-list">
            <span class="delivery-label">验证</span>
            <span v-for="item in currentTaskReport.delivery_summary.verification" :key="item" class="delivery-pill">{{ item }}</span>
          </div>
          <div v-if="currentTaskReport.delivery_summary.blockers?.length || currentTaskReport.delivery_summary.needs?.length" class="delivery-list warning">
            <span class="delivery-label">阻塞/待补充</span>
            <span v-for="item in [...(currentTaskReport.delivery_summary.blockers || []), ...(currentTaskReport.delivery_summary.needs || [])]" :key="item" class="delivery-pill">{{ item }}</span>
          </div>
          <div v-if="currentTaskReport.delivery_summary.latest_coordination_plan?.phases?.length" class="delivery-list">
            <span class="delivery-label">主 Agent 计划</span>
            <span v-for="phase in currentTaskReport.delivery_summary.latest_coordination_plan.phases" :key="phase" class="delivery-pill plan-pill">{{ phase }}</span>
          </div>
          <div v-if="currentTaskReport.delivery_summary.assignment_evidence?.length" class="delivery-list">
            <span class="delivery-label">派发证据</span>
            <span
              v-for="item in currentTaskReport.delivery_summary.assignment_evidence"
              :key="`${item.project || ''}:${item.message_id || ''}:${item.task}`"
              class="delivery-pill plan-pill"
            >
              {{ item.project || '未知 Agent' }}{{ item.status ? ` · ${item.statusText || item.status}` : '' }}{{ item.dependsOn ? ` · 依赖 ${item.dependsOn}` : '' }}{{ item.continuationStrategy ? ` · 续跑 ${item.continuationStrategy}` : '' }}
            </span>
          </div>
          <div v-if="currentTaskReport.delivery_summary.dependency_evidence?.length" class="delivery-list warning">
            <span class="delivery-label">依赖证据</span>
            <span
              v-for="item in currentTaskReport.delivery_summary.dependency_evidence"
              :key="`${item.project || ''}:${item.dependsOn}:${item.task}`"
              class="delivery-pill"
            >
              {{ item.project || '未知 Agent' }} 等待 {{ item.dependsOn }}{{ item.status ? ` · ${item.statusText || item.status}` : '' }}
            </span>
          </div>
          <div v-if="currentTaskReport.delivery_summary.rework_evidence?.length" class="delivery-list warning">
            <span class="delivery-label">返工证据</span>
            <span
              v-for="item in currentTaskReport.delivery_summary.rework_evidence"
              :key="`${item.project || ''}:${item.message_id || ''}:${item.task || item.reason}`"
              class="delivery-pill"
            >
              {{ item.project ? `${item.project}：` : '' }}{{ item.attempt ? `第 ${item.attempt} 轮 ` : '' }}{{ item.reason || item.task }}
            </span>
          </div>
        </div>
        <div v-if="hasExecutionEvidence(currentTaskReport)" class="execution-evidence">
          <div class="evidence-head">
            <strong>Agent 执行证据</strong>
            <span>主 Agent 复盘、子 Agent 回执和实际变更会共同决定任务能否完成</span>
          </div>
          <div v-if="currentTaskReport.delivery_summary?.worker_notifications?.length" class="receipt-card-list">
            <div
              v-for="item in currentTaskReport.delivery_summary.worker_notifications"
              :key="`${item.task_id}:${item.status}:${item.summary}`"
              class="receipt-card"
              :class="receiptTone(item.receipt_status === 'done' ? 'done' : item.status)"
            >
              <div class="receipt-top">
                <strong>{{ item.task_id || 'Worker' }}</strong>
                <span>通知 {{ item.status || 'unknown' }} · 回执 {{ item.receipt_status || 'missing' }}</span>
              </div>
              <div v-if="item.summary" class="receipt-summary">{{ item.summary }}</div>
              <div v-if="item.result" class="receipt-row">
                <span class="receipt-label">结果</span>
                <span class="delivery-pill">{{ item.result }}</span>
              </div>
            </div>
          </div>
          <div v-if="receiptEvidenceItems(currentTaskReport).length" class="receipt-card-list">
            <div v-for="item in receiptEvidenceItems(currentTaskReport)" :key="`${item.agent}:${item.status}:${item.summary}`" class="receipt-card" :class="receiptTone(item.status)">
              <div class="receipt-top">
                <strong>{{ item.agent }}</strong>
                <span>{{ receiptStatusText(item.status) }}</span>
              </div>
              <div v-if="item.summary" class="receipt-summary">{{ item.summary }}</div>
              <div v-if="item.actions.length" class="receipt-row">
                <span class="receipt-label">动作</span>
                <span v-for="action in item.actions" :key="action" class="delivery-pill">{{ action }}</span>
              </div>
              <div v-if="item.filesChanged.length" class="receipt-row">
                <span class="receipt-label">文件</span>
                <code v-for="file in item.filesChanged" :key="file">{{ file }}</code>
              </div>
              <div v-if="item.verification.length" class="receipt-row">
                <span class="receipt-label">验证</span>
                <span v-for="verify in item.verification" :key="verify" class="delivery-pill">{{ verify }}</span>
              </div>
              <div v-if="item.blockers.length || item.needs.length" class="receipt-row warning">
                <span class="receipt-label">阻塞</span>
                <span v-for="need in [...item.blockers, ...item.needs]" :key="need" class="delivery-pill">{{ need }}</span>
              </div>
            </div>
          </div>
          <div v-if="currentTaskReport?.review" class="review-card">
            <div class="receipt-top">
              <strong>主 Agent 复盘</strong>
              <span>{{ currentTaskReport.review.status || '已记录' }}</span>
            </div>
            <div class="receipt-summary">{{ currentTaskReport.review.content || currentTaskReport.review.summary || '暂无复盘摘要' }}</div>
          </div>
        </div>
        <div v-if="currentExecutions().length" class="kernel-execution-section">
          <div class="evidence-head">
            <strong>开发执行内核</strong>
            <span>真实进程、检查点、验收绿灯与 worktree 生命周期</span>
          </div>
          <div class="kernel-execution-list">
            <div v-for="execution in currentExecutions()" :key="execution.id" class="kernel-execution-card">
              <div class="kernel-execution-head">
                <div>
                  <strong>{{ execution.project }}</strong>
                  <span>{{ execution.id }}</span>
                </div>
                <div class="kernel-summary-row">
                  <span :class="['kernel-chip', execution.state]">{{ executionStateLabel(execution.state) }}</span>
                  <span :class="['kernel-chip', 'green-' + (execution.green?.level || 'none')]">{{ greenLevelLabel(execution.green?.level) }}</span>
                </div>
              </div>
              <div class="kernel-facts">
                <span>工作区：{{ execution.workspace?.mode === 'worktree' ? '独立 worktree' : '共享目录' }}</span>
                <span v-if="execution.processIds?.length">进程：{{ execution.processIds.join('、') }}</span>
                <span>检查点：{{ execution.checkpointIds?.length || 0 }}</span>
              </div>
              <code v-if="execution.workspace?.worktreePath" class="kernel-path">{{ execution.workspace.worktreePath }}</code>
              <div v-if="execution.failure" class="kernel-failure">{{ execution.failure.failureClass || 'unknown' }}：{{ execution.failure.message }}</div>
              <div v-if="execution.events?.length" class="kernel-timeline">
                <div v-for="event in execution.events.slice(-8).reverse()" :key="event.id" class="kernel-event">
                  <span>{{ new Date(event.at).toLocaleTimeString('zh-CN') }}</span>
                  <strong>{{ event.message }}</strong>
                </div>
              </div>
              <div class="kernel-actions">
                <button v-if="execution.checkpointIds?.length && !['running', 'spawning', 'cancel_requested'].includes(execution.state)" class="btn btn-outline btn-sm" :disabled="!!executionActionBusy" @click="rollbackExecution(execution)">回滚检查点</button>
                <button v-if="execution.workspace?.mode === 'worktree' && execution.workspace?.mergeOwner !== false && execution.green?.level === 'merge_ready' && !execution.workspace?.mergedAt" class="btn btn-primary btn-sm" :disabled="!!executionActionBusy" @click="mergeExecution(execution)">安全合并</button>
                <button v-if="execution.workspace?.mergedAt && !execution.workspace?.cleanedAt" class="btn btn-outline btn-sm" :disabled="!!executionActionBusy" @click="cleanupExecution(execution)">清理 worktree</button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="currentTaskReport?.delivery_summary?.user_report" class="report-section">
          <h4>用户交付报告</h4>
          <pre class="report-block">{{ currentTaskReport.delivery_summary.user_report }}</pre>
        </div>
        <pre class="report-block">{{ currentTaskReport?.final_report || currentTaskReport?.result || '暂无执行报告' }}</pre>
        <div v-if="currentTaskReport?.receipt" class="report-section">
          <h4>结构化回执</h4>
          <pre class="report-block">{{ JSON.stringify(currentTaskReport.receipt, null, 2) }}</pre>
        </div>
        <div v-if="currentTaskReport?.review" class="report-section">
          <h4>主 Agent 复盘</h4>
          <pre class="report-block">{{ JSON.stringify(currentTaskReport.review, null, 2) }}</pre>
        </div>
        <div v-if="currentTaskReport?.followups?.length" class="report-section">
          <h4>补充说明历史</h4>
          <pre class="report-block">{{ JSON.stringify(currentTaskReport.followups, null, 2) }}</pre>
        </div>
        <div class="form-actions">
          <button v-if="canCancelTask(currentTaskReport)" class="btn btn-danger" @click="cancelTask(currentTaskReport)">停止任务</button>
          <button v-if="currentTaskReport?.status !== 'done'" class="btn btn-primary" @click="autoContinueFromReport">按缺口自动继续</button>
          <button v-if="currentTaskReport?.status !== 'done'" class="btn btn-outline" @click="continueFromReport">按阻塞项继续</button>
          <button class="btn btn-primary" @click="showReport = false">关闭</button>
        </div>
      </div>
    </div>
  </div>

    <!-- 继续执行弹窗 -->
    <div v-if="showContinue" class="modal-overlay" @click.self="showContinue = false">
      <div class="modal continue-modal">
        <button class="modal-close" @click="showContinue = false">&times;</button>
        <h3>补充说明并继续执行</h3>
        <div class="report-meta">
          <div><strong>{{ currentContinueTask?.title }}</strong></div>
          <div>{{ currentContinueTask?.status_detail || '把主 Agent 需要的信息补齐后继续推进同一任务' }}</div>
        </div>
        <div class="form-group">
          <label>补充说明</label>
          <textarea v-model="continueMessage" rows="5" placeholder="补充接口字段、业务规则、验收要求、用户确认结果或返工方向"></textarea>
          <div class="continue-hint">已根据任务阻塞、子 Agent 回执和主 Agent 复盘生成草稿，可直接修改后继续执行。</div>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showContinue = false">取消</button>
          <button class="btn btn-primary" @click="submitTaskContinuation">提交并继续</button>
        </div>
      </div>
    </div>

    <!-- 任务日志弹窗 -->
    <div v-if="showLogs" class="modal-overlay" @click.self="showLogs = false">
      <div class="modal" style="min-width:600px;max-height:80vh;display:flex;flex-direction:column">
        <button class="modal-close" @click="showLogs = false">&times;</button>
        <h3>📋 任务日志</h3>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">共 {{ currentTaskLogs.length }} 条日志</div>
        <div style="flex:1;overflow-y:auto;background:rgba(255,255,255,0.85);border-radius:8px;border:1px solid var(--border-color);padding:12px;font-family:monospace;font-size:12px;line-height:1.6;color:var(--text-primary)">
          <div v-if="currentTaskLogs.length === 0" style="text-align:center;padding:40px;color:var(--text-muted)">暂无日志</div>
          <div v-for="(log, i) in currentTaskLogs" :key="i" style="margin-bottom:8px;padding:8px;border-radius:4px;border-left:3px solid" :style="{ borderColor: log.level === 'error' ? 'var(--accent-red)' : log.level === 'success' ? 'var(--accent-green)' : log.level === 'warning' ? 'var(--accent-yellow)' : 'var(--accent-blue)' }">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span>{{ log.level === 'error' ? '❌' : log.level === 'success' ? '✅' : log.level === 'warning' ? '⚠️' : 'ℹ️' }}</span>
              <span style="font-weight:500" :style="{ color: log.level === 'error' ? 'var(--accent-red)' : log.level === 'success' ? 'var(--accent-green)' : log.level === 'warning' ? 'var(--accent-yellow)' : 'var(--accent-blue)' }">{{ log.level?.toUpperCase() }}</span>
              <span style="color:var(--text-muted);margin-left:auto">{{ new Date(log.timestamp).toLocaleString('zh-CN') }}</span>
            </div>
            <div style="color:var(--text-secondary);white-space:pre-wrap;word-break:break-all">{{ log.message }}</div>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color)">
          <button class="btn btn-primary" @click="showLogs = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-manager { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow-y: auto; }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: rgba(255, 255, 255, 0.25); border-bottom: 1px solid rgba(0, 0, 0, 0.05); flex-wrap: wrap; gap: 12px; }
.stats { display: flex; gap: 20px; }
.stat { display: flex; align-items: center; gap: 6px; }
.stat-label { font-size: 11px; color: var(--text-muted); }
.stat-value { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.content { flex: 1; overflow-y: auto; padding: 16px; }
.execution-dashboard { flex: 0 0 auto; margin: 14px 16px 0; padding: 14px; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 10px; background: rgba(255, 255, 255, 0.56); box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05); }
.dashboard-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
.dashboard-kicker { margin-bottom: 3px; font-size: 11px; font-weight: 700; color: var(--accent-blue); }
.dashboard-head h3 { margin: 0; font-size: 15px; color: var(--text-primary); }
.dashboard-head-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.dashboard-updated { color: var(--text-muted); font-size: 11px; }
.dashboard-metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.dashboard-metric { min-width: 0; padding: 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.66); border: 1px solid rgba(15, 23, 42, 0.05); }
.dashboard-metric span { display: block; margin-bottom: 4px; color: var(--text-muted); font-size: 11px; }
.dashboard-metric strong { color: var(--text-primary); font-size: 18px; }
.dashboard-metric.warn strong { color: #854d0e; }
.dashboard-queue-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.dashboard-queue-row span { padding: 4px 8px; border-radius: 999px; background: rgba(59, 130, 246, 0.08); color: var(--text-secondary); font-size: 11px; font-weight: 700; }
.dashboard-filter-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.dashboard-filter-tabs { display: inline-flex; gap: 4px; padding: 3px; border-radius: 8px; background: rgba(15, 23, 42, 0.05); }
.dashboard-filter-tab { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 4px 9px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); font-size: 12px; font-weight: 700; cursor: pointer; }
.dashboard-filter-tab strong { color: inherit; font-size: 12px; }
.dashboard-filter-tab.active { background: rgba(255, 255, 255, 0.9); color: var(--accent-blue); box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08); }
.dashboard-filter-count { color: var(--text-muted); font-size: 11px; }
.dashboard-empty { padding: 24px 12px; text-align: center; color: var(--text-muted); font-size: 13px; }
.dashboard-task-list { display: flex; flex-direction: column; gap: 10px; }
.dashboard-task { padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(15, 23, 42, 0.07); background: rgba(255, 255, 255, 0.72); }
.dashboard-task.warn { border-color: rgba(234, 179, 8, 0.28); background: rgba(255, 251, 235, 0.72); }
.dashboard-task.fail { border-color: rgba(239, 68, 68, 0.22); }
.dashboard-task.active { border-color: rgba(59, 130, 246, 0.24); }
.dashboard-task.ok { border-color: rgba(34, 197, 94, 0.2); }
.dashboard-task.expanded { padding: 12px; box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.08); }
.dashboard-detail-body { margin-top: 8px; }
.dashboard-compact-line { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-height: 26px; margin-top: 5px; color: var(--text-secondary); font-size: 12px; cursor: pointer; }
.dashboard-compact-line span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dashboard-compact-line strong { flex: 0 0 auto; color: var(--text-muted); font-size: 11px; font-weight: 700; }
.dashboard-expand-button { flex: 0 0 auto; min-height: 26px; padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.2); background: rgba(59, 130, 246, 0.06); color: var(--accent-blue); font-size: 11px; font-weight: 800; cursor: pointer; }
.dashboard-task-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.dashboard-task-title { min-width: 0; display: flex; align-items: center; gap: 8px; }
.dashboard-task-title strong { color: var(--text-primary); font-size: 13px; overflow-wrap: anywhere; }
.dashboard-task-meta { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px 10px; color: var(--text-muted); font-size: 11px; }
.dashboard-phase { flex: 0 0 auto; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; background: rgba(100, 116, 139, 0.1); color: var(--text-muted); }
.dashboard-phase.active { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
.dashboard-phase.warn { background: rgba(234, 179, 8, 0.14); color: #854d0e; }
.dashboard-phase.fail { background: rgba(239, 68, 68, 0.12); color: #b91c1c; }
.dashboard-phase.ok { background: rgba(34, 197, 94, 0.12); color: var(--accent-green); }
.dashboard-status-line { margin-bottom: 9px; color: var(--text-secondary); font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }
.dashboard-work-grid { display: grid; grid-template-columns: 1.15fr 1.2fr 1fr 1.2fr; gap: 8px; }
.dashboard-panel { min-width: 0; padding: 9px; border-radius: 8px; background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(15, 23, 42, 0.05); }
.dashboard-panel-title { margin-bottom: 4px; color: var(--text-primary); font-size: 11.5px; font-weight: 800; }
.dashboard-panel-count { margin-bottom: 6px; color: var(--text-muted); font-size: 11px; }
.dashboard-list { margin: 0; padding-left: 16px; color: var(--text-secondary); font-size: 11.5px; line-height: 1.5; }
.dashboard-list li { overflow-wrap: anywhere; }
.dashboard-list.warn { color: #854d0e; }
.dashboard-muted { color: var(--text-muted); font-size: 11.5px; line-height: 1.45; }
.dashboard-agent-stack { display: flex; flex-wrap: wrap; gap: 5px; }
.dashboard-agent { max-width: 100%; padding: 3px 7px; border-radius: 999px; background: rgba(100, 116, 139, 0.08); color: var(--text-secondary); font-size: 10.5px; font-weight: 700; overflow-wrap: anywhere; }
.dashboard-agent.ok { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
.dashboard-agent.active { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
.dashboard-agent.warn { background: rgba(234, 179, 8, 0.14); color: #854d0e; }
.dashboard-agent.fail { background: rgba(239, 68, 68, 0.12); color: #b91c1c; }
.dashboard-evidence-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.dashboard-evidence-grid span { padding: 5px 6px; border-radius: 6px; background: rgba(15, 23, 42, 0.04); color: var(--text-muted); font-size: 11px; }
.dashboard-evidence-grid strong { color: var(--text-primary); }
.dashboard-evidence-detail { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; align-items: flex-start; }
.dashboard-evidence-detail span { flex: 0 0 auto; padding-top: 3px; color: var(--text-muted); font-size: 10.5px; font-weight: 800; }
.dashboard-evidence-detail code { max-width: 100%; padding: 3px 6px; border-radius: 5px; background: rgba(15, 23, 42, 0.06); color: var(--text-secondary); font-size: 10.5px; overflow-wrap: anywhere; }
.dashboard-evidence-detail.ok code { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
.dashboard-evidence-detail.warn code { background: rgba(234, 179, 8, 0.12); color: #854d0e; }
.dashboard-warning-line { margin-top: 6px; color: #854d0e; font-size: 11px; font-weight: 700; }
.dashboard-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; padding-top: 9px; border-top: 1px solid rgba(15, 23, 42, 0.06); }
.dashboard-action-warning { color: #854d0e; border-color: rgba(234, 179, 8, 0.32); background: rgba(234, 179, 8, 0.08); }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; gap: 8px; color: var(--text-muted); }
.icon { font-size: 40px; opacity: 0.5; }
.sub { font-size: 13px; }
.task-list { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
.task-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px 16px; transition: border-color 0.2s; }
.task-card:hover { border-color: rgba(59,130,246,0.3); }
.task-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.task-info { flex: 1; min-width: 0; }
.task-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.task-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.priority-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
.priority-high { background: rgba(239,68,68,0.1); color: #ef4444; }
.priority-normal { background: rgba(59,130,246,0.1); color: #3b82f6; }
.priority-low { background: rgba(100,116,139,0.1); color: #64748b; }
.task-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.task-delivery-headline { font-size: 12px; color: var(--accent-green); margin-bottom: 6px; font-weight: 600; }
.task-evidence-row { display: flex; flex-wrap: wrap; gap: 5px; margin: -1px 0 7px; }
.agent-workflow-row,
.agent-preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0 0 7px;
}
.workflow-chip,
.agent-preview-chip {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(100, 116, 139, 0.08);
  color: var(--text-secondary);
}
.workflow-chip.ok,
.agent-preview-chip.ok { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
.workflow-chip.active,
.agent-preview-chip.active { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
.workflow-chip.warn,
.agent-preview-chip.warn { background: rgba(234, 179, 8, 0.12); color: #854d0e; }
.workflow-chip.fail,
.agent-preview-chip.fail { background: rgba(239, 68, 68, 0.1); color: var(--accent-red); }
.workflow-chip.muted,
.agent-preview-chip.muted { background: rgba(100, 116, 139, 0.08); color: var(--text-muted); }
.evidence-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(100, 116, 139, 0.08);
  color: var(--text-secondary);
}
.evidence-chip.ok { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
.evidence-chip.warn { background: rgba(234, 179, 8, 0.12); color: #854d0e; }
.evidence-chip.fail { background: rgba(239, 68, 68, 0.1); color: var(--accent-red); }
.task-execution-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0 0 7px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(234, 179, 8, 0.2);
  background: rgba(234, 179, 8, 0.08);
}
.task-execution-block strong {
  font-size: 11px;
  color: #854d0e;
}
.task-execution-block span {
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.execution-fix-list {
  margin: 2px 0 0;
  padding-left: 16px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.5;
}
.execution-fix-list li {
  overflow-wrap: anywhere;
}
.task-status-detail { font-size: 12px; color: var(--accent-blue); margin-bottom: 6px; }
.kernel-summary-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.kernel-chip { padding: 3px 8px; border-radius: 999px; background: rgba(100, 116, 139, 0.12); color: var(--text-muted); font-size: 10.5px; font-weight: 800; }
.kernel-chip.running, .kernel-chip.spawning, .kernel-chip.ready, .kernel-chip.prompt_accepted, .kernel-chip.reviewing { background: rgba(59, 130, 246, 0.11); color: var(--accent-blue); }
.kernel-chip.succeeded, .kernel-chip.green-project, .kernel-chip.green-workspace, .kernel-chip.green-merge_ready { background: rgba(34, 197, 94, 0.12); color: var(--accent-green); }
.kernel-chip.failed, .kernel-chip.cancelled, .kernel-chip.cancel_requested { background: rgba(239, 68, 68, 0.11); color: #b91c1c; }
.kernel-execution-section { display: flex; flex-direction: column; gap: 10px; }
.kernel-execution-list { display: flex; flex-direction: column; gap: 10px; }
.kernel-execution-card { padding: 12px; border: 1px solid var(--border-color); border-radius: 10px; background: rgba(255, 255, 255, 0.48); }
.kernel-execution-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.kernel-execution-head > div:first-child { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.kernel-execution-head > div:first-child span { color: var(--text-muted); font-size: 10.5px; overflow-wrap: anywhere; }
.kernel-facts { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 8px; color: var(--text-secondary); font-size: 11px; }
.kernel-path { display: block; margin-top: 8px; padding: 6px 8px; border-radius: 6px; background: rgba(15, 23, 42, 0.06); color: var(--text-secondary); font-size: 10.5px; overflow-wrap: anywhere; }
.kernel-failure { margin-top: 8px; padding: 7px 9px; border-radius: 7px; background: rgba(239, 68, 68, 0.09); color: #991b1b; font-size: 11px; }
.kernel-timeline { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; padding-left: 9px; border-left: 2px solid rgba(59, 130, 246, 0.18); }
.kernel-event { display: grid; grid-template-columns: 70px 1fr; gap: 8px; color: var(--text-secondary); font-size: 10.5px; }
.kernel-event span { color: var(--text-muted); }
.kernel-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.task-result { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; white-space: pre-wrap; word-break: break-word; }
.task-meta { display: flex; gap: 12px; font-size: 11px; color: var(--text-muted); }
.meta-item { display: flex; align-items: center; gap: 4px; }
.trace-meta { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
.trace-identity { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.trace-identity span { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.trace-identity code { padding: 4px 7px; border-radius: 6px; background: rgba(15, 23, 42, 0.06); color: var(--text-secondary); overflow-wrap: anywhere; }
.trace-panel { padding: 12px; border: 1px solid var(--border-color); border-radius: 10px; background: rgba(255, 255, 255, 0.48); }
.trace-panel.muted { color: var(--text-muted); font-size: 12px; }
.trace-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.trace-panel-head span { color: var(--text-muted); font-size: 11px; }
.trace-events .kernel-event { display: block; padding: 5px 0; }
.trace-events .kernel-event > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.trace-events .kernel-event strong { font-size: 11px; color: var(--text-primary); }
.trace-events .kernel-event p { margin: 3px 0 0; color: var(--text-secondary); font-size: 10.5px; }
.task-right { flex-shrink: 0; }
.task-actions { display: flex; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color); }
.table { width: 100%; border-collapse: collapse; }
.desc { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.tag { padding: 2px 8px; background: rgba(0, 0, 0, 0.04); color: var(--text-secondary); border-radius: 4px; font-size: 11px; }
.status-select { background: rgba(255, 255, 255, 0.85); color: var(--text-primary); border: 1px solid rgba(0, 0, 0, 0.08); padding: 4px 8px; border-radius: 6px; font-size: 11px; outline: none; transition: border-color 0.2s; }
.status-select:focus { border-color: rgba(59, 130, 246, 0.4); }
.time { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-primary { background: var(--gradient-blue); color: white; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-danger { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.18); color: #dc2626; }
.btn-cancel { background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0, 0, 0, 0.06); color: var(--text-secondary); }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; min-width: 420px; position: relative; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; max-height: 88vh; overflow-y: auto; }
.modal::before, .modal::after { content: ''; position: absolute; width: 10px; height: 10px; border: 2px solid rgba(59, 130, 246, 0.45); pointer-events: none; }
.modal::before { top: -1px; left: -1px; border-right: none; border-bottom: none; }
.modal::after { bottom: -1px; right: -1px; border-left: none; border-top: none; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.8); color: var(--text-primary); font-size: 13px; outline: none; }
.form-group textarea { resize: vertical; line-height: 1.5; min-height: 76px; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: rgba(59, 130, 246, 0.3); box-shadow: 0 0 12px rgba(59, 130, 246, 0.12); }
.continue-hint { margin-top: 6px; color: var(--text-muted); font-size: 11px; line-height: 1.45; }
.daily-dev-readiness { margin-top: 7px; padding: 7px 9px; border-radius: 6px; font-size: 11.5px; line-height: 1.45; overflow-wrap: anywhere; }
.daily-dev-readiness.ok { border: 1px solid rgba(34, 197, 94, 0.18); background: rgba(34, 197, 94, 0.08); color: var(--accent-green); }
.daily-dev-readiness.warn { border: 1px solid rgba(234, 179, 8, 0.24); background: rgba(234, 179, 8, 0.09); color: #854d0e; }
.daily-dev-quality { display: flex; flex-direction: column; gap: 3px; margin-bottom: 16px; padding: 8px 10px; border-radius: 7px; font-size: 11.5px; line-height: 1.45; }
.daily-dev-quality.ok { border: 1px solid rgba(34, 197, 94, 0.18); background: rgba(34, 197, 94, 0.07); color: var(--accent-green); }
.daily-dev-quality.warn { border: 1px solid rgba(234, 179, 8, 0.24); background: rgba(234, 179, 8, 0.09); color: #854d0e; }
.daily-dev-quality strong { font-size: 12px; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.daily-dev-modal { min-width: min(720px, calc(100vw - 32px)) !important; max-height: 88vh; overflow-y: auto; }
.backlog-modal { min-width: min(1040px, calc(100vw - 32px)) !important; max-height: 86vh; overflow-y: auto; }
.backlog-stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 14px; }
.backlog-stats span { padding: 5px 9px; border-radius: 6px; background: rgba(15, 23, 42, 0.06); color: var(--text-secondary); font-size: 12px; font-weight: 700; }
.backlog-toolbar-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
.backlog-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; padding: 10px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.12); background: rgba(59, 130, 246, 0.04); }
.backlog-toolbar > div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.backlog-toolbar strong { color: var(--text-primary); font-size: 12.5px; }
.backlog-toolbar span { color: var(--text-muted); font-size: 11px; line-height: 1.45; overflow-wrap: anywhere; }
.backlog-bulk-result { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.backlog-bulk-result span { padding: 4px 8px; border-radius: 6px; background: rgba(34, 197, 94, 0.08); color: var(--accent-green); font-size: 11px; font-weight: 700; }
.empty-mini { padding: 32px 12px; text-align: center; color: var(--text-muted); font-size: 13px; }
.backlog-list { display: flex; flex-direction: column; gap: 10px; }
.backlog-item { display: flex; justify-content: space-between; gap: 12px; padding: 12px; border: 1px solid var(--border-color); border-left: 4px solid rgba(100, 116, 139, 0.28); border-radius: 8px; background: rgba(255,255,255,0.7); }
.backlog-item.needs_user, .backlog-item.blocked, .backlog-item.failed { border-left-color: #f59e0b; }
.backlog-item.ready { border-left-color: #22c55e; }
.backlog-item.planned, .backlog-item.dispatched, .backlog-item.queued, .backlog-item.running, .backlog-item.in_progress, .backlog-item.reviewing { border-left-color: #3b82f6; }
.backlog-item.done { border-left-color: #94a3b8; opacity: 0.86; }
.backlog-main { min-width: 0; flex: 1; }
.backlog-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.backlog-title-row strong { max-width: 100%; color: var(--text-primary); font-size: 13px; overflow-wrap: anywhere; }
.backlog-status { flex-shrink: 0; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; background: rgba(100, 116, 139, 0.1); color: var(--text-muted); }
.backlog-status.needs_user, .backlog-status.blocked, .backlog-status.failed { background: rgba(234, 179, 8, 0.12); color: #854d0e; }
.backlog-status.ready { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
.backlog-status.planned, .backlog-status.dispatched, .backlog-status.queued, .backlog-status.running, .backlog-status.in_progress, .backlog-status.reviewing { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
.backlog-status.running, .backlog-status.in_progress {
  animation: glow-pulse 1.8s infinite ease-in-out !important;
}
.backlog-status.done { background: rgba(15, 23, 42, 0.06); color: var(--text-muted); }
.backlog-goal { color: var(--text-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.backlog-state-grid { display: grid; grid-template-columns: 1.4fr 0.8fr 0.9fr 1fr; gap: 8px; margin-top: 10px; }
.backlog-state-grid > div { min-width: 0; padding: 8px; border-radius: 7px; background: rgba(15, 23, 42, 0.04); }
.backlog-state-grid span { display: block; margin-bottom: 3px; color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.backlog-state-grid strong { display: block; color: var(--text-primary); font-size: 11.5px; line-height: 1.35; overflow-wrap: anywhere; }
.backlog-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 7px; color: var(--text-muted); font-size: 11px; }
.backlog-readiness { display: inline-flex; max-width: 100%; margin-top: 8px; margin-right: 6px; padding: 5px 8px; border-radius: 6px; font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; }
.backlog-readiness.ok { border: 1px solid rgba(34, 197, 94, 0.16); background: rgba(34, 197, 94, 0.08); color: var(--accent-green); }
.backlog-readiness.warn { border: 1px solid rgba(234, 179, 8, 0.22); background: rgba(234, 179, 8, 0.09); color: #854d0e; }
.backlog-result { margin-top: 8px; padding: 7px 9px; border-radius: 6px; background: rgba(234, 179, 8, 0.08); color: #854d0e; font-size: 11px; line-height: 1.45; overflow-wrap: anywhere; }
.backlog-result.ask { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); }
.backlog-result.danger { background: rgba(239, 68, 68, 0.09); color: #b91c1c; }
.backlog-evidence, .backlog-history { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.backlog-evidence span, .backlog-history span { max-width: 100%; padding: 4px 7px; border-radius: 6px; background: rgba(15, 23, 42, 0.055); color: var(--text-secondary); font-size: 10.5px; line-height: 1.35; overflow-wrap: anywhere; }
.backlog-history span { background: rgba(59, 130, 246, 0.07); color: var(--accent-blue); }
.backlog-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0; }
.continue-modal { min-width: min(620px, calc(100vw - 32px)) !important; }
.report-modal { min-width: min(760px, calc(100vw - 32px)) !important; max-height: 86vh; display: flex; flex-direction: column; overflow: hidden !important; }
.report-meta { display: flex; flex-direction: column; gap: 4px; color: var(--text-secondary); font-size: 13px; margin: 10px 0 12px; }
.report-section { margin-top: 14px; }
.report-section h4 { margin: 0 0 8px; font-size: 13px; color: var(--text-primary); }
.report-block { margin: 0; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255, 255, 255, 0.78); color: var(--text-primary); font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; max-height: 260px; overflow-y: auto; }
.delivery-summary { display: flex; flex-direction: column; gap: 10px; margin: 12px 0; padding: 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.12); background: rgba(59, 130, 246, 0.04); }
.delivery-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.delivery-grid > div { min-width: 0; display: flex; flex-direction: column; gap: 4px; padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.64); }
.delivery-label { font-size: 10.5px; color: var(--text-muted); font-weight: 700; }
.delivery-grid strong { color: var(--text-primary); font-size: 12px; overflow-wrap: anywhere; }
.delivery-list { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 6px; }
.delivery-list .delivery-label { width: 64px; padding-top: 3px; }
.delivery-list code, .delivery-pill { max-width: 100%; padding: 3px 7px; border-radius: 6px; background: rgba(15, 23, 42, 0.06); color: var(--text-secondary); font-size: 11px; overflow-wrap: anywhere; }
.delivery-pill.plan-pill { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
.delivery-list.ok .delivery-pill { background: rgba(34, 197, 94, 0.12); color: var(--accent-green); }
.delivery-list.muted .delivery-pill { background: rgba(100, 116, 139, 0.1); color: var(--text-muted); }
.delivery-list.warning .delivery-pill { background: rgba(234, 179, 8, 0.12); color: #854d0e; }
.delivery-list.danger .delivery-pill { background: rgba(239, 68, 68, 0.12); color: #b91c1c; }
.execution-evidence { display: flex; flex-direction: column; gap: 10px; margin: 12px 0; padding: 12px; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.14); background: rgba(34, 197, 94, 0.04); }
.evidence-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.evidence-head strong { color: var(--text-primary); font-size: 13px; }
.evidence-head span { color: var(--text-muted); font-size: 11px; line-height: 1.45; text-align: right; }
.receipt-card-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.receipt-card, .review-card { min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 8px; border: 1px solid rgba(15, 23, 42, 0.07); background: rgba(255,255,255,0.72); }
.receipt-card.ok { border-color: rgba(34, 197, 94, 0.22); }
.receipt-card.warn { border-color: rgba(234, 179, 8, 0.22); }
.receipt-card.fail { border-color: rgba(239, 68, 68, 0.22); }
.receipt-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.receipt-top strong { min-width: 0; color: var(--text-primary); font-size: 12px; overflow-wrap: anywhere; }
.receipt-top span { flex: 0 0 auto; padding: 2px 7px; border-radius: 999px; background: rgba(15, 23, 42, 0.07); color: var(--text-secondary); font-size: 10.5px; font-weight: 700; }
.receipt-card.ok .receipt-top span { background: rgba(34, 197, 94, 0.12); color: var(--accent-green); }
.receipt-card.warn .receipt-top span { background: rgba(234, 179, 8, 0.14); color: #854d0e; }
.receipt-card.fail .receipt-top span { background: rgba(239, 68, 68, 0.12); color: #b91c1c; }
.receipt-summary { color: var(--text-secondary); font-size: 11.5px; line-height: 1.5; overflow-wrap: anywhere; }
.receipt-row { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 6px; }
.receipt-row code { max-width: 100%; padding: 3px 7px; border-radius: 6px; background: rgba(15, 23, 42, 0.06); color: var(--text-secondary); font-size: 11px; overflow-wrap: anywhere; }
.receipt-row.warning .delivery-pill { background: rgba(234, 179, 8, 0.12); color: #854d0e; }
.receipt-label { flex: 0 0 36px; padding-top: 3px; color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.watchdog-box { margin-top: 12px; padding: 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.12); background: rgba(59, 130, 246, 0.04); }
.watchdog-title { font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.watchdog-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; font-size: 11.5px; color: var(--text-secondary); }
.watchdog-grid span { min-width: 0; padding: 6px 8px; border-radius: 6px; background: rgba(255,255,255,0.64); overflow-wrap: anywhere; }
@media (max-width: 768px) {
  .table-wrapper { overflow-x: auto; }
  table { min-width: 600px; }
  .delivery-grid { grid-template-columns: 1fr 1fr; }
  .receipt-card-list { grid-template-columns: 1fr; }
  .evidence-head { flex-direction: column; }
  .evidence-head span { text-align: left; }
  .watchdog-grid { grid-template-columns: 1fr; }
  .dashboard-head, .dashboard-task-top { flex-direction: column; align-items: stretch; }
  .dashboard-head-actions, .dashboard-task-meta { justify-content: flex-start; }
  .dashboard-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dashboard-work-grid { grid-template-columns: 1fr; }
  .execution-dashboard { margin: 12px 10px 0; }
  .backlog-item { flex-direction: column; }
  .backlog-actions { flex-direction: row; align-items: flex-start; flex-wrap: wrap; }
  .backlog-toolbar-grid, .backlog-state-grid { grid-template-columns: 1fr; }
  .backlog-toolbar { flex-direction: column; align-items: stretch; }
  .modal-overlay { padding: 0 !important; align-items: flex-end !important; }
  .modal { min-width: 0 !important; width: 100% !important; max-height: 90vh; border-radius: 16px 16px 0 0 !important; }
}
/* 暗黑模式深度适配 */
[data-theme="dark"] .execution-dashboard,
[data-theme="dark"] .dashboard-metric,
[data-theme="dark"] .dashboard-task,
[data-theme="dark"] .dashboard-panel,
[data-theme="dark"] .backlog-item,
[data-theme="dark"] .watchdog-grid span,
[data-theme="dark"] .receipt-card,
[data-theme="dark"] .review-card,
[data-theme="dark"] .report-block,
[data-theme="dark"] .delivery-grid > div {
  background: var(--surface);
  border-color: var(--border-color);
}

[data-theme="dark"] .dashboard-task.expanded {
  box-shadow: inset 0 0 0 1px var(--accent-blue);
}

[data-theme="dark"] .dashboard-task:hover,
[data-theme="dark"] .backlog-item:hover {
  border-color: rgba(59, 130, 246, 0.4);
}

[data-theme="dark"] .status-select {
  background: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .dashboard-filter-tab.active {
  background: var(--surface);
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

[data-theme="dark"] .delivery-summary,
[data-theme="dark"] .execution-evidence,
[data-theme="dark"] .watchdog-box {
  background: rgba(255, 255, 255, 0.02);
}

[data-theme="dark"] .task-execution-block {
  background: rgba(234, 179, 8, 0.15);
  border-color: rgba(234, 179, 8, 0.3);
}

[data-theme="dark"] .dashboard-metric.warn strong,
[data-theme="dark"] .dashboard-phase.warn,
[data-theme="dark"] .dashboard-agent.warn,
[data-theme="dark"] .dashboard-warning-line,
[data-theme="dark"] .task-execution-block strong {
  color: var(--accent-yellow);
}

[data-theme="dark"] .priority-high,
[data-theme="dark"] .dashboard-phase.fail,
[data-theme="dark"] .dashboard-agent.fail {
  color: var(--accent-red);
}
</style>

