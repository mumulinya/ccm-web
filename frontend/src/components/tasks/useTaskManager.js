import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { tasksApi, groupsApi, projectsApi } from '../../api/index.js'
import AgentPipeline from '../agents/AgentPipeline.vue'
import TaskListItem from './TaskListItem.vue'
import TaskBacklogModal from './TaskBacklogModal.vue'
import DailyDevTaskModal from './DailyDevTaskModal.vue'
import TaskDispatchHeader from './TaskDispatchHeader.vue'
import { toast, confirmDialog } from '../../utils/toast.js'
import { useTaskBacklog } from '../../composables/useTaskBacklog.js'
import { useTaskExecutionDashboard } from '../../composables/useTaskExecutionDashboard.js'
import { sanitizeUserFacingAgentText, sanitizeUserFacingStructure } from '../../utils/agentDisplay.js'
import { subscribeRuntimeEvents } from '../../utils/runtimeEventBus.js'

export function useTaskManager(props, emit) {
  const tasks = ref([])
  const permissionRequests = ref([])
  const permissionDecisionBusyId = ref('')
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
  const activeTaskView = ref('overview')
  const taskSearch = ref('')
  const taskStatusFilter = ref('all')
  let unsubscribeRuntimeEvents = null
  let runtimeRefreshTimer = null
  let fallbackRefreshTimer = null

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
    autoExecute: true,
    files: [],
    existingAttachments: []
  })

  const addTaskFiles = (incoming) => {
    const rows = Array.from(incoming || []).filter(file => file?.name)
    const keys = new Set(newTask.value.files.map(file => `${file.name}:${file.size}:${file.lastModified || 0}`))
    for (const file of rows) {
      if (newTask.value.files.length + newTask.value.existingAttachments.length >= 10) break
      const key = `${file.name}:${file.size}:${file.lastModified || 0}`
      if (file.size > 25 * 1024 * 1024 || keys.has(key)) continue
      keys.add(key)
      newTask.value.files.push(file)
    }
  }

  const handleTaskPaste = (event) => {
    const files = Array.from(event.clipboardData?.files || [])
    if (!files.length) return
    event.preventDefault()
    addTaskFiles(files)
  }

  const removeExistingTaskAttachment = (id) => {
    newTask.value.existingAttachments = newTask.value.existingAttachments.filter(item => item.id !== id)
  }

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
    autoExecute: true,
    files: []
  })
  const dailyDevTask = ref(defaultDailyDevTask())

  const updateDailyDevTaskField = ({ field, value }) => {
    if (!field) return
    dailyDevTask.value[field] = value
  }

  // 加载数据
  const loadTasks = async () => {
    const [response, permissionResponse] = await Promise.all([
      fetch(showArchivedTasks.value ? '/api/tasks?archived=true' : '/api/tasks'),
      fetch('/api/tasks/permission-requests')
    ])
    const data = await response.json()
    const permissionData = await permissionResponse.json().catch(() => ({ requests: [] }))
    permissionRequests.value = Array.isArray(permissionData.requests) ? permissionData.requests : []
    const permissionsByTask = new Map()
    for (const request of permissionData.requests || []) {
      const rows = permissionsByTask.get(request.taskId) || []
      rows.push(request)
      permissionsByTask.set(request.taskId, rows)
    }
    tasks.value = (data.tasks || []).slice().reverse().map(task => ({ ...task, permission_requests: permissionsByTask.get(task.id) || [] }))
    archivedTaskCount.value = Number(data.archived_count || 0)
    selectedTaskIds.value = selectedTaskIds.value.filter(id => tasks.value.some(task => task.id === id))
    updateStats()
  }

  const decideTaskPermission = async (request, decision) => {
    const label = decision === 'approve' ? '批准' : '拒绝'
    if (!request?.id || permissionDecisionBusyId.value) return
    permissionDecisionBusyId.value = request.id
    try {
      const response = await fetch('/api/tasks/permission-requests/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: request.id, decision, reason: `用户在任务派发中心明确${label}`, maxUses: 1, expiresInMinutes: 15 })
      })
      const data = await response.json()
      if (!response.ok || data.success === false) throw new Error(data.error || `${label}失败`)
      toast.success(`已${label} ${request.project || 'Agent'} 的限时权限`)
      if (decision === 'approve' && request.originType === 'project' && request.originProject && request.originSessionId) {
        emit('resume-project-permission', {
          tab: 'projects',
          project: request.originProject,
          sessionId: request.originSessionId,
          autoMessage: `权限申请 ${request.id} 已获用户批准。请继续当前未完成任务；仅通过 ccm__permission_broker 使用这项精确、限时、单次授权。`,
        })
      }
      await loadTasks()
    } catch (error) {
      toast.error(error.message || `${label}失败`)
    } finally {
      permissionDecisionBusyId.value = ''
    }
  }

  const pendingPermissionRequests = computed(() => permissionRequests.value.filter(item => item.state === 'awaiting_user'))
  const standalonePermissionRequests = computed(() => pendingPermissionRequests.value.filter(request => !tasks.value.some(task => task.id === request.taskId)))

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
      { key: 'documents', ok: len(dailyDevTask.value.documents) >= 12 || dailyDevTask.value.files.length > 0, label: '业务/接口文档或附件' },
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
    const requestPayload = editingTaskId.value ? { id: editingTaskId.value, ...payload } : payload
    requestPayload.retained_attachment_ids = newTask.value.existingAttachments.map(item => item.id)
    const form = new FormData()
    form.append('payload', JSON.stringify(requestPayload))
    newTask.value.files.forEach(file => form.append('files', file, file.name))
    const res = editingTaskId.value ? await tasksApi.update(form) : await tasksApi.create(form)

    if (res.success) {
      showCreate.value = false
      newTask.value = {
        title: '',
        description: '',
        assignType: 'group',
        groupId: groups.value[0]?.id || '',
        projectId: projects.value[0]?.name || '',
        priority: 'normal',
        autoExecute: true,
        files: [],
        existingAttachments: []
      }
      refreshTaskWork()
      if (res.task?.source_attachment_warnings?.length) {
        toast.warning(`任务已保存，但有 ${res.task.source_attachment_warnings.length} 个附件未完整解析；执行 Agent 会按原文件路径继续核验`)
      } else {
        toast.success(editingTaskId.value ? '任务修改成功' : res.queued ? '任务已创建并加入执行队列' : '任务创建成功')
      }
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
      const form = new FormData()
      form.append('payload', JSON.stringify(buildDailyDevCreatePayload(forceQualityGate)))
      dailyDevTask.value.files.forEach(file => form.append('files', file, file.name))
      const res = await fetch('/api/tasks/create-daily-dev', { method: 'POST', body: form })
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
      if (data.task?.source_attachment_warnings?.length) toast.warning(`业务开发任务已保存，但有 ${data.task.source_attachment_warnings.length} 个附件未完整解析；主 Agent 会按原文件路径继续核验${backlogText}`)
      else if (data.queued) toast.success(`业务开发任务已交给主 Agent${backlogText}`)
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

  // 归档任务
  const deleteTask = async (id) => {
    const confirmed = await confirmDialog('确定归档此任务？系统会安全取消执行、清理运行现场并移入归档，可稍后恢复。')
    if (!confirmed) return
    await tasksApi.delete(id)
    refreshTaskWork()
    toast.success('任务已清理并移入归档')
  }

  const openCreateTask = () => {
    editingTaskId.value = ''
    newTask.value = { title: '', description: '', assignType: 'group', groupId: groups.value[0]?.id || '', projectId: projects.value[0]?.name || '', priority: 'normal', autoExecute: true, files: [], existingAttachments: [] }
    showCreate.value = true
  }

  const editTask = (task) => {
    editingTaskId.value = task.id
    newTask.value = {
      title: task.title || '', description: task.description || '', assignType: task.assign_type || 'group',
      groupId: task.group_id || groups.value[0]?.id || '', projectId: task.target_project || projects.value[0]?.name || '',
      priority: task.priority || 'normal', autoExecute: task.auto_execute !== false,
      files: [], existingAttachments: Array.isArray(task.source_attachments) ? [...task.source_attachments] : [],
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
    const labels = { archive: '归档', restore: '恢复', purge: '永久清除', pause: '暂停', resume: '恢复执行', cancel: '取消' }
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
  const loadQueueStatus = async () => {
    const res = await fetch('/api/tasks/queue/status')
    queueStatus.value = await res.json()
    const watchdogRes = await fetch('/api/tasks/watchdog')
    watchdogStatus.value = await watchdogRes.json()
  }

  const showQueueStatus = async () => {
    await loadQueueStatus()
    showQueue.value = true
  }

  const resumeQueue = async () => {
    const res = await fetch('/api/tasks/queue/resume', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      const resumed = Number(data.auto_resumed ?? data.resumed ?? 0)
      const manualPending = Number(data.manual_pending || 0)
      const skipped = Number(data.skipped || 0)
      const parts = [`已自动接上 ${resumed} 个任务`]
      if (manualPending) parts.push(`${manualPending} 个仍等待确认`)
      if (skipped) parts.push(`${skipped} 个已跳过`)
      toast.success(parts.join('，'))
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

  const visibleTasks = computed(() => {
    const query = taskSearch.value.trim().toLowerCase()
    return tasks.value.filter((task) => {
      const statusMatches = taskStatusFilter.value === 'all' || String(task.status || 'pending') === taskStatusFilter.value
      if (!statusMatches) return false
      if (!query) return true
      const targetName = groups.value.find(group => group.id === task.group_id)?.name || task.group_id || task.project || task.target_project || ''
      return [task.title, task.description, targetName].some(value => String(value || '').toLowerCase().includes(query))
    })
  })

  const handleCreateType = (type) => {
    if (type === 'business') {
      showDailyDevCreate.value = true
      return
    }
    openCreateTask()
  }

  const changeTaskView = async (view) => {
    activeTaskView.value = view
    if (view === 'overview') await loadExecutionDashboard()
    if (view === 'advanced') await Promise.all([loadActiveAgentRuns(), loadQueueStatus()])
  }

  const toggleArchivedTasks = async () => {
    showArchivedTasks.value = !showArchivedTasks.value
    selectedTaskIds.value = []
    await loadTasks()
  }

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
    unsubscribeRuntimeEvents = subscribeRuntimeEvents(['task', 'permission', 'agent', 'feishu'], event => {
      if (!['task', 'permission', 'agent', 'feishu'].includes(event.topic)) return
      if (runtimeRefreshTimer) window.clearTimeout(runtimeRefreshTimer)
      runtimeRefreshTimer = window.setTimeout(() => {
        if (event.topic === 'permission') void loadTasks()
        else if (event.topic === 'agent') void Promise.all([loadActiveAgentRuns(), loadExecutionDashboard()])
        else void Promise.all([loadTasks(), loadExecutionDashboard()])
      }, 180)
    })
    fallbackRefreshTimer = window.setInterval(() => void loadTasks(), 60_000)
  })

  onUnmounted(() => {
    unsubscribeRuntimeEvents?.()
    unsubscribeRuntimeEvents = null
    if (runtimeRefreshTimer) window.clearTimeout(runtimeRefreshTimer)
    if (fallbackRefreshTimer) window.clearInterval(fallbackRefreshTimer)
  })

  return {
    AgentPipeline, TaskListItem, TaskBacklogModal, DailyDevTaskModal, TaskDispatchHeader, tasks,
    permissionRequests, pendingPermissionRequests, standalonePermissionRequests, permissionDecisionBusyId,
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
  }
}
