import { ref } from 'vue'
import { sanitizeUserFacingAgentText } from '../utils/agentDisplay.js'

const DEFAULT_AGENT_PROBE_TIMEOUT_MS = 45000

export const receiptStatusText = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'done') return '完成'
  if (value === 'partial') return '部分完成'
  if (value === 'blocked') return '阻塞'
  if (value === 'failed') return '失败'
  if (value === 'needs_info') return '需补充'
  return value || '未知'
}

export const workflowStatusTone = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'done' || value === 'success') return 'ok'
  if (value === 'running' || value === 'in_progress') return 'active'
  if (value === 'failed' || value === 'error') return 'fail'
  if (value === 'blocked' || value === 'partial' || value === 'needs_info') return 'warn'
  return 'muted'
}

export const phaseLabel = (phase) => ({
  pending: '待执行',
  queued: '队列中',
  running: '执行中',
  blocked: '需要处理',
  done: '已完成',
  failed: '失败',
  unknown: '未知'
}[phase || 'unknown'] || phase)

export const phaseTone = (phase) => ({
  pending: 'muted',
  queued: 'active',
  running: 'active',
  blocked: 'warn',
  done: 'ok',
  failed: 'fail'
}[phase || 'unknown'] || 'muted')

export const actionClass = (action) => {
  if (action?.tone === 'primary') return 'btn btn-primary btn-sm'
  if (action?.tone === 'success') return 'btn btn-primary btn-sm'
  if (action?.tone === 'warning') return 'btn btn-outline btn-sm dashboard-action-warning'
  return 'btn btn-outline btn-sm'
}

export const compactDashboardText = (value, max = 120) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return sanitizeUserFacingAgentText(text.length > max ? `${text.slice(0, max)}...` : text, '任务状态已整理。', max)
}

export const actionVisible = (item, kind) => (item?.actions || []).some(action => action.kind === kind)

export function useTaskExecutionDashboard(options = {}) {
  const tasks = options.tasks || ref([])
  const toast = options.toast || { success: () => {}, error: () => {}, warning: () => {}, info: () => {} }
  const confirmDialog = options.confirmDialog || (async () => true)
  const refreshTaskWork = options.refreshTaskWork || (async () => {})
  const probeTimeoutMs = options.probeTimeoutMs || DEFAULT_AGENT_PROBE_TIMEOUT_MS

  const executionDashboard = ref(null)
  const executionDashboardLoading = ref(false)
  const activeAgentRuns = ref([])
  const activeAgentRunsLoading = ref(false)
  const runtimeDebtPreview = ref(null)
  const runtimeDebtLoading = ref(false)
  const dashboardFilter = ref('all')
  const expandedDashboardTaskId = ref('')

  const dashboardSummary = () => executionDashboard.value?.summary || {}
  const dashboardItems = () => executionDashboard.value?.items || []
  const dashboardQueue = () => executionDashboard.value?.queue_status || {}
  const dashboardFilterOptions = () => {
    const items = dashboardItems()
    return [
      { key: 'active', label: '活跃', count: items.filter(item => item.phase !== 'done').length },
      { key: 'done', label: '已完成', count: items.filter(item => item.phase === 'done').length },
      { key: 'blocked', label: '需要处理', count: items.filter(item => item.phase === 'blocked' || item.phase === 'failed').length },
      { key: 'all', label: '最近记录', count: items.length }
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
  const findTaskByDashboardItem = (item) => item?.raw_task || tasks.value.find(task => task.id === item?.id) || null

  const workflowAgentPreview = (task) => {
    const summary = task?.delivery_summary
    if (!summary) return []
    const receipts = summary.receipts?.length ? summary.receipts : (summary.receipt_statuses || [])
    return (summary.assignment_evidence || []).slice(0, 4).map((assignment, index) => {
      const project = assignment.project || assignment.agent || `执行成员 ${index + 1}`
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

  const loadActiveAgentRuns = async () => {
    activeAgentRunsLoading.value = true
    try {
      const res = await fetch('/api/agent-runs')
      const data = await res.json()
      activeAgentRuns.value = data.runs || []
    } catch {
      activeAgentRuns.value = []
    }
    activeAgentRunsLoading.value = false
  }

  const stopAgentRun = async (run) => {
    const confirmed = await confirmDialog(`确定停止 ${run.project || 'Agent'} 当前运行吗？这会尝试终止底层 CLI 进程，并把关联任务标记为等待人工处理。`)
    if (!confirmed) return
    try {
      const res = await fetch('/api/agent-runs/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: run.id, task_id: run.taskId, reason: '用户在运行治理中心停止 Agent 运行' })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || '停止失败')
      toast.success(`已发送停止请求：匹配 ${data.matched || 0} 个运行，终止 ${data.killed || 0} 个进程`)
      await refreshTaskWork()
    } catch (e) {
      toast.error(e.message || '停止 Agent 运行失败')
    }
  }

  const previewRuntimeDebtCleanup = async () => {
    runtimeDebtLoading.value = true
    try {
      const res = await fetch('/api/tasks/runtime-debt/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: true })
      })
      const data = await res.json()
      runtimeDebtPreview.value = data
      if (data.total > 0) toast.info(`发现 ${data.total} 个可清理运行债务`)
      else toast.success('没有发现需要清理的运行债务')
    } catch (e) {
      toast.error(e.message || '预览运行债务失败')
    }
    runtimeDebtLoading.value = false
  }

  const cleanupRuntimeDebt = async () => {
    const count = runtimeDebtPreview.value?.total ?? '若干'
    const confirmed = await confirmDialog(`确定清理 ${count} 个运行债务吗？系统会暂停旧任务、释放租约并移出队列，不会删除任务数据。`)
    if (!confirmed) return
    runtimeDebtLoading.value = true
    try {
      const res = await fetch('/api/tasks/runtime-debt/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: false })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || '清理失败')
      runtimeDebtPreview.value = data
      toast.success(`运行债务已清理：${data.cleaned || 0}/${data.total || 0}`)
      await refreshTaskWork()
    } catch (e) {
      toast.error(e.message || '清理运行债务失败')
    }
    runtimeDebtLoading.value = false
  }

  const runDashboardProbe = async () => {
    const confirmed = await confirmDialog('复检执行通道会真实启动底层 Agent CLI 做探针，可能消耗少量模型 token；本次只检查通道，不会自动恢复或续跑任务。确定继续？')
    if (!confirmed) return
    try {
      const res = await fetch('/api/orchestrator/agent-cli-probe/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10, timeout_ms: probeTimeoutMs })
      })
      const data = await res.json()
      if (data.success) toast.success(`复检完成：通过 ${data.passed || 0}/${data.total || 0}；未自动恢复任务`)
      else toast.warning(data.message || `复检完成：通过 ${data.passed || 0}/${data.total || 0}`)
      await refreshTaskWork()
    } catch {
      toast.error('复检执行通道失败')
    }
  }

  return {
    executionDashboard,
    executionDashboardLoading,
    activeAgentRuns,
    activeAgentRunsLoading,
    runtimeDebtPreview,
    runtimeDebtLoading,
    dashboardFilter,
    expandedDashboardTaskId,
    dashboardSummary,
    dashboardItems,
    dashboardQueue,
    dashboardFilterOptions,
    filteredDashboardItems,
    syncExpandedDashboardItem,
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
  }
}
