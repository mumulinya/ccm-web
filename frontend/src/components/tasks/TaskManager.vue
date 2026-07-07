<script setup>
import { ref, onMounted, watch } from 'vue'
import { tasksApi, groupsApi, projectsApi } from '../../api/index.js'
import AgentPipeline from '../agents/AgentPipeline.vue'
import TaskListItem from './TaskListItem.vue'
import TaskBacklogModal from './TaskBacklogModal.vue'
import DailyDevTaskModal from './DailyDevTaskModal.vue'
import { toast, confirmDialog } from '../../utils/toast.js'
import { useTaskBacklog } from '../../composables/useTaskBacklog.js'
import { useTaskExecutionDashboard } from '../../composables/useTaskExecutionDashboard.js'
import { sanitizeUserFacingAgentText, sanitizeUserFacingStructure } from '../../utils/agentDisplay.js'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigated'])

const tasks = ref([])
const groups = ref([])
const projects = ref([])
const stats = ref({ total: 0, pending: 0, inProgress: 0, done: 0, failed: 0 })
const orchestratorDiagnostics = ref(null)
const taskExecutions = ref({})
const executionActionBusy = ref('')
const showArchivedTasks = ref(false)
const archivedTaskCount = ref(0)
const selectedTaskIds = ref([])
const editingTaskId = ref('')

// 弹窗状态
const showCreate = ref(false)
const showDailyDevCreate = ref(false)
const showQueue = ref(false)
const showLogs = ref(false)
const showReport = ref(false)
const showContinue = ref(false)
const currentTaskLogs = ref([])
const currentTaskId = ref(null)
const currentTaskReport = ref(null)
const currentTaskTrace = ref(null)
const taskTraceLoading = ref(false)
const currentContinueTask = ref(null)
const continueMessage = ref('')
const {
  executionDashboard,
  executionDashboardLoading,
  activeAgentRuns,
  activeAgentRunsLoading,
  runtimeDebtPreview,
  runtimeDebtLoading,
  dashboardFilter,
  dashboardSummary,
  dashboardItems,
  dashboardQueue,
  dashboardFilterOptions,
  filteredDashboardItems,
  setDashboardFilter,
  isDashboardItemExpanded,
  toggleDashboardItem,
  phaseLabel,
  phaseTone,
  actionClass,
  findTaskByDashboardItem,
  compactDashboardText,
  actionVisible,
  workflowAgentPreview,
  receiptStatusText,
  workflowStatusTone,
  loadExecutionDashboard,
  loadActiveAgentRuns,
  stopAgentRun,
  previewRuntimeDebtCleanup,
  cleanupRuntimeDebt,
  runDashboardProbe,
} = useTaskExecutionDashboard({
  tasks,
  toast,
  confirmDialog,
  refreshTaskWork: () => refreshTaskWork(),
})
const {
  showBacklog,
  dailyDevBacklogs,
  backlogCounts,
  backlogBulkDispatchLoading,
  backlogBulkDispatchResult,
  backlogImportLoading,
  backlogImportResult,
  backlogStatusLabel,
  formatBacklogTime,
  backlogState,
  backlogCount,
  backlogQualityText,
  backlogLatestHistory,
  backlogCanDispatch,
  backlogCanRestoreReady,
  loadDailyDevBacklogs,
  openBacklog,
  updateBacklogStatus,
  dispatchBacklog,
  dispatchReadyBacklogs,
  importSharedDocsToBacklog,
} = useTaskBacklog({
  toast,
  confirmDialog,
  refreshTaskWork: () => refreshTaskWork(),
  loadOrchestratorDiagnostics: () => loadOrchestratorDiagnostics(),
})

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

const updateDailyDevTaskField = ({ field, value }) => {
  if (!field) return
  dailyDevTask.value[field] = value
}

// 加载数据
const loadTasks = async () => {
  const response = await fetch(showArchivedTasks.value ? '/api/tasks?archived=true' : '/api/tasks')
  const data = await response.json()
  tasks.value = (data.tasks || []).slice().reverse()
  archivedTaskCount.value = Number(data.archived_count || 0)
  selectedTaskIds.value = selectedTaskIds.value.filter(id => tasks.value.some(task => task.id === id))
  updateStats()
}

const toggleTaskSelection = (id, checked) => {
  if (checked) {
    if (!selectedTaskIds.value.includes(id)) selectedTaskIds.value.push(id)
    return
  }
  selectedTaskIds.value = selectedTaskIds.value.filter(taskId => taskId !== id)
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

const refreshTaskWork = async () => {
  await Promise.all([loadTasks(), loadExecutionDashboard(), loadOrchestratorDiagnostics(), loadActiveAgentRuns()])
}

const formatDuration = (ms) => {
  const value = Math.max(0, Number(ms || 0))
  const minutes = Math.floor(value / 60000)
  const seconds = Math.floor((value % 60000) / 1000)
  return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`
}

const visibleReportText = (value, fallback = '信息已整理。', max = 420) => sanitizeUserFacingAgentText(value, fallback, max)
const visibleReportObject = (value, fallback = '信息已整理。', max = 420) => sanitizeUserFacingStructure(value, { fallback, max })
const visibleReportList = (value, fallback = '信息已整理。', max = 260) => {
  const list = Array.isArray(value) ? value : value === undefined || value === null || value === '' ? [] : [value]
  return list.map(item => visibleReportText(item, fallback, max)).filter(Boolean)
}
const continuationStrategyLabel = (item = {}) => {
  const route = item.reworkRoute || item.rework_route || item.routing || {}
  const value = String(route.user_label || route.userLabel || item.continuationStrategy || item.continuation_strategy || '').trim()
  if (!value) return ''
  if (value === 'same_worker_scratchpad' || value === 'continue_same_worker') return '继续同一子 Agent'
  if (value === 'fresh_verification_worker' || value === 'independent_verification') return '独立验证复核'
  if (value === 'spawn_fresh_worker') return '重新派发'
  if (value === 'stop_wrong_direction_then_continue') return '停止旧方向后继续'
  return visibleReportText(value, '继续处理缺口。', 80)
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
    { key: 'receipt', label: `结果说明 ${receiptCount}`, tone: receiptCount ? 'ok' : 'warn' },
    { key: 'verify', label: `验证 ${verificationCount}`, tone: verificationCount ? 'ok' : (summary.requires_verification ? 'warn' : 'muted') }
  ]
}

const normalizeReceiptEvidence = (receipt, fallbackAgent = '') => {
  if (!receipt) return null
  return {
    agent: visibleReportText(receipt.agent || fallbackAgent || '子 Agent', '子 Agent', 80),
    status: receipt.status || 'unknown',
    summary: visibleReportText(receipt.summary || '', '', 260),
    actions: visibleReportList(receipt.actions, '已执行动作。', 160),
    filesChanged: Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files)
      ? (receipt.filesChanged || receipt.files_changed || receipt.files)
      : [],
    verification: visibleReportList(Array.isArray(receipt.verification || receipt.tests) ? (receipt.verification || receipt.tests) : [], '验证结果已整理。', 180),
    memoryUsed: visibleReportList(Array.isArray(receipt.memoryUsed || receipt.memory_used || receipt.used)
      ? (receipt.memoryUsed || receipt.memory_used || receipt.used)
      : [], '记忆记录已整理。', 160),
    memoryIgnored: visibleReportList(Array.isArray(receipt.memoryIgnored || receipt.memory_ignored || receipt.ignored)
      ? (receipt.memoryIgnored || receipt.memory_ignored || receipt.ignored)
      : [], '记忆记录已整理。', 160),
    blockers: visibleReportList(Array.isArray(receipt.blockers) ? receipt.blockers : [], '阻塞信息已整理。', 220),
    needs: visibleReportList(Array.isArray(receipt.needs || receipt.followUps || receipt.follow_ups) ? (receipt.needs || receipt.followUps || receipt.follow_ups) : [], '待补充信息已整理。', 220)
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
      lines.push(`- ${item.agent || '未知 Agent'}：请实际运行并补充结果说明 ${item.required?.join(' / ') || '项目配置验证命令'}`)
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
    lines.push('需要跟进的子 Agent 结果说明：')
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
  lines.push('- 完成后仍需子 Agent 结果说明、主 Agent 复盘、实际变更证据和已执行验证记录。')
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

// 创建任务
const submitCreateTask = async () => {
  if (!newTask.value.title) { alert('请输入任务标题'); return }
  if (newTask.value.assignType === 'group' && !newTask.value.groupId) { toast.warning('请选择群聊'); return }
  if (newTask.value.assignType === 'project' && !newTask.value.projectId) { toast.warning('请选择项目 Agent'); return }

  const payload = {
    title: newTask.value.title,
    description: newTask.value.description,
    target_project: newTask.value.assignType === 'project' ? newTask.value.projectId : 'coordinator',
    group_id: newTask.value.assignType === 'group' ? newTask.value.groupId : null,
    priority: newTask.value.priority,
    assign_type: newTask.value.assignType,
    auto_execute: newTask.value.autoExecute
  }
  const res = editingTaskId.value
    ? await tasksApi.update({ id: editingTaskId.value, ...payload })
    : await tasksApi.create(payload)

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
    toast.success(editingTaskId.value ? '任务修改成功' : res.queued ? '任务已创建并加入执行队列' : '任务创建成功')
    editingTaskId.value = ''
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
  const confirmed = await confirmDialog('确定删除此任务？系统会安全取消执行、清理运行现场并移入归档，可稍后恢复。')
  if (!confirmed) return
  await tasksApi.delete(id)
  refreshTaskWork()
  toast.success('任务已清理并移入归档')
}

const openCreateTask = () => {
  editingTaskId.value = ''
  newTask.value = { title: '', description: '', assignType: 'group', groupId: groups.value[0]?.id || '', projectId: projects.value[0]?.name || '', priority: 'normal', autoExecute: true }
  showCreate.value = true
}

const editTask = (task) => {
  editingTaskId.value = task.id
  newTask.value = {
    title: task.title || '', description: task.description || '', assignType: task.assign_type || 'group',
    groupId: task.group_id || groups.value[0]?.id || '', projectId: task.target_project || projects.value[0]?.name || '',
    priority: task.priority || 'normal', autoExecute: task.auto_execute !== false,
  }
  showCreate.value = true
}

const restoreTask = async (id) => {
  const res = await fetch('/api/tasks/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  const data = await res.json(); if (!res.ok || !data.success) return toast.error(data.error || '恢复失败')
  await refreshTaskWork(); toast.success('任务已从归档恢复')
}

const purgeTask = async (id) => {
  if (!await confirmDialog('永久清除此任务及其归档记录？此操作无法恢复。')) return
  const res = await fetch('/api/tasks/purge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  const data = await res.json(); if (!res.ok || !data.success) return toast.error(data.error || '永久清除失败')
  await refreshTaskWork(); toast.success('任务已永久清除')
}

const runBulkTaskAction = async (action) => {
  if (!selectedTaskIds.value.length) return toast.warning('请先选择任务')
  const labels = { archive: '删除归档', restore: '恢复', purge: '永久清除', pause: '暂停', resume: '恢复执行', cancel: '取消' }
  if (['archive', 'purge', 'cancel'].includes(action) && !await confirmDialog(`确定批量${labels[action]} ${selectedTaskIds.value.length} 个任务？`)) return
  const res = await fetch('/api/tasks/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ids: selectedTaskIds.value }) })
  const data = await res.json()
  if (!res.ok && !data.results?.some(item => item.success)) return toast.error(data.error || '批量操作失败')
  selectedTaskIds.value = []; await refreshTaskWork(); toast.success(`批量${labels[action]}完成`)
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
    '- 重新读取业务目标、验收标准、上一轮计划、子 Agent 结果说明和阻塞项。',
    '- 按当前项目 Agent 能力边界重新拆分任务。',
    '- 重新派发时写清每个子 Agent 的目标、允许修改范围、验证命令和交付结果要求。',
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
const currentDeliverySummary = () => visibleReportObject(currentTaskReport.value?.delivery_summary || null, '交付摘要已整理。')
const currentReviewSummary = () => visibleReportObject(currentTaskReport.value?.review || null, '主 Agent 复盘已整理。')
const currentWorkerNotifications = () => {
  const notifications = currentDeliverySummary()?.worker_notifications || []
  return Array.isArray(notifications) ? notifications : []
}
const visibleTaskTitle = () => visibleReportText(currentTaskReport.value?.title || '任务', '任务', 120)
const visibleTaskStatusDetail = () => visibleReportText(currentTaskReport.value?.status_detail || '暂无状态说明', '暂无状态说明', 260)
const visibleRequiredVerification = (item = {}) => {
  const agent = visibleReportText(item.agent || '未知 Agent', '未知 Agent', 80)
  const required = visibleReportList(item.required, '项目配置验证命令', 160)
  return `${agent}：${required.length ? required.join(' / ') : '未配置命令'}`
}
const visibleDeliveryBlockers = () => {
  const summary = currentDeliverySummary() || {}
  return visibleReportList([...(summary.blockers || []), ...(summary.needs || [])], '待补充信息已整理。', 220)
}
const visibleUserDeliveryReport = () => visibleReportText(currentDeliverySummary()?.user_report || '', '交付报告已整理。', 1600)

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

watch(() => props.navigateTo, async (target) => {
  if (!target?.taskId || target.tab !== 'tasks') return
  await loadTasks()
  const task = tasks.value.find(item => item.id === target.taskId)
  if (task) await viewReport(task)
  else toast.warning('该任务可能已归档或删除')
  emit('navigated')
}, { deep: true, immediate: true })

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
        <button class="btn btn-outline btn-sm" @click="showArchivedTasks = !showArchivedTasks; selectedTaskIds = []; loadTasks()">{{ showArchivedTasks ? '返回活动任务' : `归档 (${archivedTaskCount})` }}</button>
        <button v-if="selectedTaskIds.length && !showArchivedTasks" class="btn btn-outline btn-sm" @click="runBulkTaskAction('pause')">批量暂停</button>
        <button v-if="selectedTaskIds.length && !showArchivedTasks" class="btn btn-danger btn-sm" @click="runBulkTaskAction('archive')">批量删除</button>
        <button v-if="selectedTaskIds.length && showArchivedTasks" class="btn btn-primary btn-sm" @click="runBulkTaskAction('restore')">批量恢复</button>
        <button v-if="selectedTaskIds.length && showArchivedTasks" class="btn btn-danger btn-sm" @click="runBulkTaskAction('purge')">永久清除</button>
        <button class="btn btn-outline btn-sm" @click="showQueueStatus()">📊 队列状态</button>
        <button class="btn btn-outline btn-sm" @click="openBacklog()">需求池</button>
        <button class="btn btn-outline btn-sm" @click="resumeQueue()">▶ 恢复队列</button>
        <button class="btn btn-outline btn-sm" @click="retryRuntimeFailures()">恢复执行失败</button>
        <button class="btn btn-outline btn-sm" @click="addAllToQueue()">📥 全部加入队列</button>
        <button v-if="!showArchivedTasks" class="btn btn-primary" @click="showDailyDevCreate = true">业务开发任务</button>
        <button v-if="!showArchivedTasks" class="btn btn-primary" @click="openCreateTask">+ 新建任务</button>
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

      <div class="runtime-governance-card">
        <div class="runtime-governance-head">
          <div>
            <strong>Agent 运行治理</strong>
            <span>查看正在运行的底层 Agent CLI，必要时停止进程；清理旧的无租约任务不会删除数据。</span>
          </div>
          <div class="runtime-governance-actions">
            <button class="btn btn-outline btn-sm" :disabled="activeAgentRunsLoading" @click="loadActiveAgentRuns">{{ activeAgentRunsLoading ? '刷新中...' : '刷新运行' }}</button>
            <button class="btn btn-outline btn-sm" :disabled="runtimeDebtLoading" @click="previewRuntimeDebtCleanup">预览运行债务</button>
            <button class="btn btn-outline btn-sm" :disabled="runtimeDebtLoading || !(runtimeDebtPreview?.total > 0)" @click="cleanupRuntimeDebt">清理运行债务</button>
          </div>
        </div>
        <div v-if="activeAgentRuns.length" class="runtime-run-list">
          <div v-for="run in activeAgentRuns" :key="run.id" class="runtime-run-row">
            <div>
              <strong>{{ run.project || 'Agent' }} · {{ run.agentType || 'runtime' }}</strong>
              <span>{{ run.source || 'agent' }} · PID {{ run.pid || '未知' }} · 已运行 {{ formatDuration(run.ageMs) }}</span>
              <small>{{ run.title || run.cwd || run.id }}</small>
            </div>
            <button class="btn btn-outline btn-sm danger" @click="stopAgentRun(run)">停止</button>
          </div>
        </div>
        <div v-else class="runtime-governance-empty">当前没有正在运行的底层 Agent。</div>
        <div v-if="runtimeDebtPreview" class="runtime-debt-result">
          <span>可清理 {{ runtimeDebtPreview.total || 0 }}</span>
          <span>已清理 {{ runtimeDebtPreview.cleaned || 0 }}</span>
          <span>{{ runtimeDebtPreview.dry_run ? '预览模式' : '已执行清理' }}</span>
        </div>
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
              <div v-else class="dashboard-muted">等待派发或结果说明。</div>
            </div>

            <div class="dashboard-panel evidence">
              <div class="dashboard-panel-title">验收证据</div>
              <div class="dashboard-evidence-grid">
                <span>实变 <strong>{{ item.evidence?.actual_file_change_count || 0 }}</strong></span>
                <span>结果说明 <strong>{{ item.evidence?.receipt_count || 0 }}</strong></span>
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

    <TaskBacklogModal
      v-if="showBacklog"
      :backlogs="dailyDevBacklogs"
      :counts="backlogCounts"
      :import-loading="backlogImportLoading"
      :bulk-dispatch-loading="backlogBulkDispatchLoading"
      :import-result="backlogImportResult"
      :bulk-dispatch-result="backlogBulkDispatchResult"
      :status-label="backlogStatusLabel"
      :priority-label="priorityLabel"
      :backlog-state="backlogState"
      :backlog-count="backlogCount"
      :backlog-quality-text="backlogQualityText"
      :backlog-latest-history="backlogLatestHistory"
      :backlog-can-dispatch="backlogCanDispatch"
      :backlog-can-restore-ready="backlogCanRestoreReady"
      :daily-dev-group-can-execute="dailyDevGroupCanExecute"
      :daily-dev-group-readiness-message="dailyDevGroupReadinessMessage"
      :format-backlog-time="formatBacklogTime"
      @import-shared-docs="importSharedDocsToBacklog"
      @dispatch-ready="dispatchReadyBacklogs"
      @dispatch="dispatchBacklog"
      @restore-ready="(item) => updateBacklogStatus(item, 'ready')"
      @mark-blocked="(item) => updateBacklogStatus(item, 'blocked')"
      @close="showBacklog = false"
    />

    <!-- 任务列表 -->
    <div class="content">
      <div v-if="tasks.length === 0" class="empty">
        <span class="icon">📋</span>
        <span>暂无任务</span>
        <span class="sub">点击右上角创建并派发任务</span>
      </div>
      <div v-else class="task-list">
        <TaskListItem
          v-for="task in tasks"
          :key="task.id"
          :task="task"
          :selected="selectedTaskIds.includes(task.id)"
          :show-archived="showArchivedTasks"
          :group-name="groups.find(g => g.id === task.group_id)?.name || task.group_id"
          :priority-text="priorityLabel[task.priority] || task.priority"
          :workflow-items="workflowSummaryItems(task)"
          :agent-preview="workflowAgentPreview(task)"
          :evidence-items="deliveryEvidenceItems(task)"
          :execution-blocked="isExecutionBlockedTask(task)"
          :execution-blocked-text="executionBlockedMessage(task)"
          :execution-fix-actions="executionFixActions(task)"
          :kernel-state="taskKernelState(task)"
          :kernel-state-text="executionStateLabel(taskKernelState(task))"
          :kernel-green="taskKernelGreen(task)"
          :kernel-green-text="greenLevelLabel(taskKernelGreen(task))"
          :can-manual-complete="canManualCompleteDailyDev(task)"
          :can-cancel="canCancelTask(task)"
          @toggle-selected="toggleTaskSelection"
          @status-change="updateStatus"
          @restore="restoreTask"
          @purge="purgeTask"
          @cancel="cancelTask"
          @queue="addToQueue"
          @report="viewReport"
          @pipeline="viewPipeline"
          @continue="openContinueTask"
          @logs="viewTaskLogs"
          @resend="resendTask"
          @edit="editTask"
          @delete="deleteTask"
        />
      </div>
    </div>

    <DailyDevTaskModal
      v-if="showDailyDevCreate"
      :task="dailyDevTask"
      :groups="groups"
      :quality="dailyDevIntakeQuality()"
      :group-can-execute="selectedDailyDevGroupCanExecute()"
      :group-message="selectedDailyDevGroupMessage()"
      @update-field="updateDailyDevTaskField"
      @submit="submitDailyDevTask"
      @close="showDailyDevCreate = false"
    />

    <!-- 新建任务弹窗 -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal" style="min-width:500px">
        <button class="modal-close" @click="showCreate = false">&times;</button>
        <h3>{{ editingTaskId ? '编辑任务' : '📋 新建任务' }}</h3>
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
          <button class="btn btn-primary" @click="submitCreateTask">{{ editingTaskId ? '保存修改' : newTask.autoExecute ? '创建并加入队列' : '仅创建任务' }}</button>
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
          <div><strong>{{ visibleTaskTitle() }}</strong></div>
          <div>{{ visibleTaskStatusDetail() }}</div>
        </div>
        <details v-if="currentTaskReport?.trace_id || taskTraceLoading || currentTaskTrace?.events?.length" class="technical-report-details">
          <summary>Trace 技术详情</summary>
          <div v-if="currentTaskReport?.trace_id" class="trace-identity">
            <span>Trace ID</span>
            <code>{{ currentTaskReport.trace_id }}</code>
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
        </details>
        <div v-if="currentDeliverySummary()" class="delivery-summary">
          <div class="delivery-grid">
            <div>
              <span class="delivery-label">交付状态</span>
              <strong>{{ currentDeliverySummary().headline || '交付状态已整理。' }}</strong>
            </div>
            <div>
              <span class="delivery-label">参与 Agent</span>
              <strong>{{ currentDeliverySummary().agents?.join('、') || '暂无' }}</strong>
            </div>
            <div>
              <span class="delivery-label">文件变更</span>
              <strong>{{ currentDeliverySummary().files_changed?.length || 0 }} 个</strong>
            </div>
            <div>
              <span class="delivery-label">实际捕获</span>
              <strong>{{ currentDeliverySummary().actual_file_change_count || 0 }} 个</strong>
            </div>
            <div>
              <span class="delivery-label">验证记录</span>
              <strong>{{ currentDeliverySummary().verification?.length || 0 }} 条</strong>
            </div>
            <div>
              <span class="delivery-label">已执行验证</span>
              <strong>{{ currentDeliverySummary().verification_executed?.length || 0 }} 条</strong>
            </div>
            <div>
              <span class="delivery-label">失败验证</span>
              <strong>{{ currentDeliverySummary().verification_failed?.length || 0 }} 条</strong>
            </div>
          </div>
          <div v-if="currentDeliverySummary().actual_file_changes?.length" class="delivery-list">
            <span class="delivery-label">实际文件变更</span>
            <code v-for="file in currentDeliverySummary().actual_file_changes" :key="`${file.agent || ''}:${file.path}:${file.status_kind || file.status}`">
              {{ file.agent ? `${file.agent} · ` : '' }}{{ file.path }}{{ file.status ? ` (${file.status})` : '' }}
            </code>
          </div>
          <div v-if="currentDeliverySummary().files_changed?.length" class="delivery-list">
            <span class="delivery-label">变更文件</span>
            <code v-for="file in currentDeliverySummary().files_changed" :key="file">{{ file }}</code>
          </div>
          <div v-if="currentDeliverySummary().verification_executed?.length" class="delivery-list ok">
            <span class="delivery-label">已执行验证</span>
            <span v-for="item in visibleReportList(currentDeliverySummary().verification_executed, '验证结果已整理。', 180)" :key="item" class="delivery-pill">{{ item }}</span>
          </div>
          <div v-if="currentDeliverySummary().verification_suggested?.length" class="delivery-list muted">
            <span class="delivery-label">建议/未执行</span>
            <span v-for="item in visibleReportList(currentDeliverySummary().verification_suggested, '建议验证已整理。', 180)" :key="item" class="delivery-pill">{{ item }}</span>
          </div>
          <div v-if="currentDeliverySummary().verification_failed?.length" class="delivery-list danger">
            <span class="delivery-label">失败验证</span>
            <span v-for="item in visibleReportList(currentDeliverySummary().verification_failed, '失败验证已整理。', 180)" :key="item" class="delivery-pill">{{ item }}</span>
          </div>
          <div v-if="currentDeliverySummary().verification_required_missing?.length" class="delivery-list warning">
            <span class="delivery-label">缺命令验证</span>
            <span v-for="item in currentDeliverySummary().verification_required_missing" :key="item.agent" class="delivery-pill">
              {{ visibleRequiredVerification(item) }}
            </span>
          </div>
          <div v-if="!hasCategorizedVerification(currentDeliverySummary()) && currentDeliverySummary().verification?.length" class="delivery-list">
            <span class="delivery-label">验证</span>
            <span v-for="item in visibleReportList(currentDeliverySummary().verification, '验证结果已整理。', 180)" :key="item" class="delivery-pill">{{ item }}</span>
          </div>
          <div v-if="visibleDeliveryBlockers().length" class="delivery-list warning">
            <span class="delivery-label">阻塞/待补充</span>
            <span v-for="item in visibleDeliveryBlockers()" :key="item" class="delivery-pill">{{ item }}</span>
          </div>
          <div v-if="currentDeliverySummary()?.user_report" class="report-section user-delivery-report">
            <h4>交付报告</h4>
            <pre class="report-block">{{ visibleUserDeliveryReport() }}</pre>
          </div>
          <details class="technical-report-details">
            <summary>技术执行详情</summary>
          <div v-if="currentDeliverySummary().latest_coordination_plan?.phases?.length" class="delivery-list">
            <span class="delivery-label">主 Agent 计划</span>
            <span v-for="phase in visibleReportList(currentDeliverySummary().latest_coordination_plan.phases, '计划阶段已整理。', 180)" :key="phase" class="delivery-pill plan-pill">{{ phase }}</span>
          </div>
          <div v-if="currentDeliverySummary().assignment_evidence?.length" class="delivery-list">
            <span class="delivery-label">派发证据</span>
            <span
              v-for="item in currentDeliverySummary().assignment_evidence"
              :key="`${item.project || ''}:${item.message_id || ''}:${item.task}`"
              class="delivery-pill plan-pill"
            >
              {{ visibleReportText(item.project || '未知 Agent', '未知 Agent', 80) }}{{ item.status ? ` · ${item.statusText || item.status}` : '' }}{{ item.dependsOn ? ` · 依赖 ${item.dependsOn}` : '' }}{{ continuationStrategyLabel(item) ? ` · ${continuationStrategyLabel(item)}` : '' }}
            </span>
          </div>
          <div v-if="currentDeliverySummary().dependency_evidence?.length" class="delivery-list warning">
            <span class="delivery-label">依赖证据</span>
            <span
              v-for="item in currentDeliverySummary().dependency_evidence"
              :key="`${item.project || ''}:${item.dependsOn}:${item.task}`"
              class="delivery-pill"
            >
              {{ visibleReportText(item.project || '未知 Agent', '未知 Agent', 80) }} 等待 {{ item.dependsOn }}{{ item.status ? ` · ${item.statusText || item.status}` : '' }}
            </span>
          </div>
          <div v-if="currentDeliverySummary().rework_evidence?.length" class="delivery-list warning">
            <span class="delivery-label">返工证据</span>
            <span
              v-for="item in currentDeliverySummary().rework_evidence"
              :key="`${item.project || ''}:${item.message_id || ''}:${item.task || item.reason}`"
              class="delivery-pill"
            >
              {{ item.project ? `${visibleReportText(item.project, '子 Agent', 80)}：` : '' }}{{ item.attempt ? `第 ${item.attempt} 轮 ` : '' }}{{ visibleReportText(item.reason || item.task, '返工信息已整理。', 180) }}
            </span>
          </div>
          </details>
        </div>
        <details class="technical-report-details">
          <summary>Agent、执行器与原始结果说明</summary>
        <div v-if="hasExecutionEvidence(currentTaskReport)" class="execution-evidence">
          <div class="evidence-head">
            <strong>Agent 执行证据</strong>
            <span>主 Agent 复盘、子 Agent 结果说明和实际变更会共同决定任务能否完成</span>
          </div>
          <div v-if="currentWorkerNotifications().length" class="receipt-card-list">
            <div
              v-for="item in currentWorkerNotifications()"
              :key="`${item.task_id}:${item.status}:${item.summary}`"
              class="receipt-card"
              :class="receiptTone(item.receipt_status === 'done' ? 'done' : item.status)"
            >
              <div class="receipt-top">
                <strong>{{ item.task_id || 'Worker' }}</strong>
                <span>通知 {{ item.status || 'unknown' }} · 结果说明 {{ item.receipt_status || 'missing' }}</span>
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
              <div v-if="item.memoryUsed.length || item.memoryIgnored.length" class="receipt-row memory">
                <span class="receipt-label">记忆</span>
                <span v-for="memory in item.memoryUsed" :key="memory" class="delivery-pill">{{ memory }}</span>
                <span v-for="memory in item.memoryIgnored" :key="`ignored:${memory}`" class="delivery-pill muted">未用：{{ memory }}</span>
              </div>
              <div v-if="item.blockers.length || item.needs.length" class="receipt-row warning">
                <span class="receipt-label">阻塞</span>
                <span v-for="need in [...item.blockers, ...item.needs]" :key="need" class="delivery-pill">{{ need }}</span>
              </div>
            </div>
          </div>
          <div v-if="currentReviewSummary()" class="review-card">
            <div class="receipt-top">
              <strong>主 Agent 复盘</strong>
              <span>{{ currentReviewSummary().status || '已记录' }}</span>
            </div>
            <div class="receipt-summary">{{ currentReviewSummary().content || currentReviewSummary().summary || '暂无复盘摘要' }}</div>
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
        <pre class="report-block">{{ currentTaskReport?.final_report || currentTaskReport?.result || '暂无执行报告' }}</pre>
        <div v-if="currentTaskReport?.receipt" class="report-section">
          <h4>结构化结果说明</h4>
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
          </details>
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
          <div class="continue-hint">已根据任务阻塞、子 Agent 结果说明和主 Agent 复盘生成草稿，可直接修改后继续执行。</div>
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
.task-manager { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: rgba(255, 255, 255, 0.25); border-bottom: 1px solid rgba(0, 0, 0, 0.05); flex-wrap: wrap; gap: 12px; }
.stats { display: flex; gap: 20px; }
.stat { display: flex; align-items: center; gap: 6px; }
.stat-label { font-size: 11px; color: var(--text-muted); }
.stat-value { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.content { flex: 0 0 auto; min-height: auto; overflow: visible; padding: 16px; }
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
.runtime-governance-card { margin-bottom: 12px; padding: 12px; border: 1px solid rgba(59, 130, 246, 0.14); border-radius: 10px; background: rgba(59, 130, 246, 0.05); }
.runtime-governance-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.runtime-governance-head strong { display: block; color: var(--text-primary); font-size: 13px; }
.runtime-governance-head span { display: block; margin-top: 3px; color: var(--text-muted); font-size: 11px; line-height: 1.5; }
.runtime-governance-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 6px; }
.runtime-run-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.runtime-run-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.72); border: 1px solid rgba(15, 23, 42, 0.06); }
.runtime-run-row div { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.runtime-run-row strong { color: var(--text-primary); font-size: 12px; overflow-wrap: anywhere; }
.runtime-run-row span { color: var(--text-secondary); font-size: 11px; }
.runtime-run-row small { color: var(--text-muted); font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.runtime-governance-empty { margin-top: 10px; padding: 10px; border-radius: 8px; color: var(--text-muted); font-size: 12px; background: rgba(255,255,255,0.55); }
.runtime-debt-result { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
.runtime-debt-result span { padding: 4px 8px; border-radius: 999px; color: var(--text-secondary); font-size: 11px; font-weight: 700; background: rgba(15,23,42,0.06); }
.btn.danger { color: #dc2626; border-color: rgba(239, 68, 68, 0.28); background: rgba(239, 68, 68, 0.06); }
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
.table { width: 100%; border-collapse: collapse; }
.desc { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.tag { padding: 2px 8px; background: rgba(0, 0, 0, 0.04); color: var(--text-secondary); border-radius: 4px; font-size: 11px; }
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
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.continue-modal { min-width: min(620px, calc(100vw - 32px)) !important; }
.report-modal { min-width: min(760px, calc(100vw - 32px)) !important; max-height: 86vh; display: flex; flex-direction: column; overflow: hidden !important; }
.report-meta { display: flex; flex-direction: column; gap: 4px; color: var(--text-secondary); font-size: 13px; margin: 10px 0 12px; }
.report-section { margin-top: 14px; }
.report-section h4 { margin: 0 0 8px; font-size: 13px; color: var(--text-primary); }
.report-block { margin: 0; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255, 255, 255, 0.78); color: var(--text-primary); font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; max-height: 260px; overflow-y: auto; }
.technical-report-details{margin-top:10px;padding:10px 12px;border:1px solid var(--border-color);border-radius:8px;background:rgba(15,23,42,.025)}
.technical-report-details>summary{cursor:pointer;color:var(--text-muted);font-size:12px;font-weight:700;user-select:none}
.technical-report-details[open]>summary{margin-bottom:10px}
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
.receipt-row.memory .delivery-pill.muted { background: rgba(100, 116, 139, 0.1); color: var(--text-muted); }
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
  .modal-overlay { padding: 0 !important; align-items: flex-end !important; }
  .modal { min-width: 0 !important; width: 100% !important; max-height: 90vh; border-radius: 16px 16px 0 0 !important; }
}
/* 暗黑模式深度适配 */
[data-theme="dark"] .execution-dashboard,
[data-theme="dark"] .runtime-governance-card,
[data-theme="dark"] .runtime-run-row,
[data-theme="dark"] .runtime-governance-empty,
[data-theme="dark"] .dashboard-metric,
[data-theme="dark"] .dashboard-task,
[data-theme="dark"] .dashboard-panel,
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

[data-theme="dark"] .dashboard-task:hover {
  border-color: rgba(59, 130, 246, 0.4);
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

[data-theme="dark"] .dashboard-metric.warn strong,
[data-theme="dark"] .dashboard-phase.warn,
[data-theme="dark"] .dashboard-agent.warn,
[data-theme="dark"] .dashboard-warning-line {
  color: var(--accent-yellow);
}

[data-theme="dark"] .dashboard-phase.fail,
[data-theme="dark"] .dashboard-agent.fail {
  color: var(--accent-red);
}
</style>

