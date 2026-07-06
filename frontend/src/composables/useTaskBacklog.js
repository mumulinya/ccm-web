import { ref } from 'vue'

export const backlogStatusLabel = {
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

export function useTaskBacklog(options = {}) {
  const toast = options.toast || { success: () => {}, error: () => {}, warning: () => {}, info: () => {} }
  const confirmDialog = options.confirmDialog || (async () => true)
  const refreshTaskWork = options.refreshTaskWork || (async () => {})
  const loadOrchestratorDiagnostics = options.loadOrchestratorDiagnostics || (async () => {})

  const showBacklog = ref(false)
  const dailyDevBacklogs = ref([])
  const backlogCounts = ref({})
  const backlogBulkDispatchLoading = ref(false)
  const backlogBulkDispatchResult = ref(null)
  const backlogImportLoading = ref(false)
  const backlogImportResult = ref(null)

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
    } catch (error) {
      toast.error(error.message || '加载需求池失败')
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
    } catch (error) {
      toast.error(error.message || '更新需求池状态失败')
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
    } catch (error) {
      toast.error(error.message || '派发需求失败')
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
    } catch (error) {
      toast.error(error.message || '批量派发失败')
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
    } catch (error) {
      toast.error(error.message || '导入共享文档失败')
    }
    backlogImportLoading.value = false
  }

  return {
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
  }
}
