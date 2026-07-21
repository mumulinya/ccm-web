import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { projectsApi, groupsApi } from '../../api/index.js'
import { toast, confirmDialog } from '../../utils/toast.js'

export function useCronJobs(emit) {

const jobs = ref([])
const projects = ref([])
const groups = ref([])
const scheduler = ref({ running: false, running_job_ids: [] })
const orchestratorDiagnostics = ref(null)
const showCreate = ref(false)
const editingId = ref('')
const showArchived = ref(false)
const archivedCount = ref(0)
const runningJobIds = ref(new Set())
const selectedRunJobId = ref('')
const searchQuery = ref('')
const statusFilter = ref('all')
const targetFilter = ref('all')
const selectedJobIds = ref(new Set())
const bulkLoading = ref(false)
let refreshTimer = null

const selectedRunJob = computed(() => jobs.value.find(job => job.id === selectedRunJobId.value) || null)
const filteredJobs = computed(() => jobs.value.filter(job => {
  const query = searchQuery.value.trim().toLowerCase()
  const matchesQuery = !query || [job.name, job.prompt, targetLabel(job)].some(value => String(value || '').toLowerCase().includes(query))
  const matchesStatus = statusFilter.value === 'all'
    || (statusFilter.value === 'enabled' ? job.enabled : statusFilter.value === 'disabled' ? !job.enabled : job.last_status === statusFilter.value)
  const matchesTarget = targetFilter.value === 'all' || job.target_type === targetFilter.value
  return matchesQuery && matchesStatus && matchesTarget
}))
const enabledJobCount = computed(() => jobs.value.filter(job => job.enabled !== false).length)
const disabledJobCount = computed(() => jobs.value.filter(job => job.enabled === false).length)
const issueJobCount = computed(() => jobs.value.filter(job => ['failed', 'invalid_schedule', 'retry_waiting'].includes(job.last_status)).length)
const activeRunCount = computed(() => jobs.value.filter(job => isJobRunning(job.id) || ['running', 'triggering', 'running_task'].includes(job.last_status)).length)
const allFilteredSelected = computed(() => filteredJobs.value.length > 0 && filteredJobs.value.every(job => selectedJobIds.value.has(job.id)))

const newJob = ref({
  name: '',
  targetType: 'project',
  project: '',
  groupId: '',
  scheduleMode: 'daily',
  intervalMinutes: 30,
  dailyTime: '09:00',
  weeklyDay: '1',
  weeklyTime: '09:00',
  monthlyDay: 1,
  monthlyTime: '09:00',
  customSchedule: '',
  priority: 'normal',
  workflowType: 'general',
  requiresCodeChanges: false,
  backlogBatchLimit: 1,
  importSharedDocs: true,
  continueGaps: true,
  gapContinueLimit: 3,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
  retryLimit: 2,
  retryIntervalMinutes: 10,
  misfirePolicy: 'run_once',
  misfireGraceMinutes: 1440,
  notificationEnabled: false,
  notifyOn: ['failed', 'waiting', 'done'],
  prompt: ''
})

const weekOptions = [
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
  { value: '0', label: '周日' }
]

const intervalOptions = [
  { value: 5, label: '每 5 分钟' },
  { value: 10, label: '每 10 分钟' },
  { value: 15, label: '每 15 分钟' },
  { value: 30, label: '每 30 分钟' }
]

const dailyDevCronPrompt = `请按日常开发主 Agent 工作流执行：
1. 检查群聊共享文档、任务描述或 backlog 中优先级最高且状态为 ready 的业务需求。
2. 先理解业务目标、接口/字段、影响范围和验收标准，再拆给对应项目子 Agent 开发。
3. 子 Agent 必须修改代码后返回结构化结果说明，写清动作、文件、验证和阻塞点。
4. 主 Agent 必须等待结果说明并复盘；发现缺口时继续返工或说明需要用户补充的信息。
5. 最终报告要包含完成内容、涉及项目/文件、验证结果、风险和下一步。`

const defaultJob = () => ({
  name: '',
  targetType: 'project',
  project: projects.value[0]?.name || '',
  groupId: groups.value[0]?.id || '',
  scheduleMode: 'daily',
  intervalMinutes: 30,
  dailyTime: '09:00',
  weeklyDay: '1',
  weeklyTime: '09:00',
  monthlyDay: 1,
  monthlyTime: '09:00',
  customSchedule: '',
  priority: 'normal',
  workflowType: 'general',
  requiresCodeChanges: false,
  backlogBatchLimit: 1,
  importSharedDocs: true,
  continueGaps: true,
  gapContinueLimit: 3,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
  retryLimit: 2,
  retryIntervalMinutes: 10,
  misfirePolicy: 'run_once',
  misfireGraceMinutes: 1440,
  notificationEnabled: false,
  notifyOn: ['failed', 'waiting', 'done'],
  prompt: ''
})

const parseTime = (value) => {
  const [hourRaw, minuteRaw] = String(value || '09:00').split(':')
  const hour = Math.max(0, Math.min(23, Number(hourRaw) || 0))
  const minute = Math.max(0, Math.min(59, Number(minuteRaw) || 0))
  return { hour, minute }
}

const buildSchedule = () => {
  const mode = newJob.value.scheduleMode
  if (mode === 'interval') return `*/${newJob.value.intervalMinutes} * * * *`
  if (mode === 'hourly') return '0 * * * *'
  if (mode === 'daily') {
    const { hour, minute } = parseTime(newJob.value.dailyTime)
    return `${minute} ${hour} * * *`
  }
  if (mode === 'workdays') {
    const { hour, minute } = parseTime(newJob.value.dailyTime)
    return `${minute} ${hour} * * 1-5`
  }
  if (mode === 'weekly') {
    const { hour, minute } = parseTime(newJob.value.weeklyTime)
    return `${minute} ${hour} * * ${newJob.value.weeklyDay}`
  }
  if (mode === 'monthly') {
    const { hour, minute } = parseTime(newJob.value.monthlyTime)
    const day = Math.max(1, Math.min(31, Number(newJob.value.monthlyDay) || 1))
    return `${minute} ${hour} ${day} * *`
  }
  return String(newJob.value.customSchedule || '').trim()
}

const schedulePreview = computed(buildSchedule)

const applyDailyDevPrompt = () => {
  newJob.value.targetType = 'group'
  if (!newJob.value.name) newJob.value.name = '日常业务开发'
  if (!newJob.value.groupId && groups.value.length > 0) newJob.value.groupId = groups.value[0].id
  newJob.value.priority = 'normal'
  newJob.value.workflowType = 'daily_dev'
  newJob.value.requiresCodeChanges = true
  newJob.value.backlogBatchLimit = Math.max(1, Number(newJob.value.backlogBatchLimit || 3))
  newJob.value.importSharedDocs = true
  newJob.value.continueGaps = true
  newJob.value.gapContinueLimit = Math.max(1, Number(newJob.value.gapContinueLimit || 3))
  newJob.value.prompt = dailyDevCronPrompt
}

const readResponse = async (res) => {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return data
}

const loadJobs = async () => {
  const res = await fetch(showArchived.value ? '/api/cron?archived=true' : '/api/cron')
  const data = await readResponse(res)
  jobs.value = data.jobs || []
  selectedJobIds.value = new Set([...selectedJobIds.value].filter(id => jobs.value.some(job => job.id === id)))
  archivedCount.value = Number(data.archived_count || 0)
  scheduler.value = data.scheduler || { running: false, running_job_ids: [] }
}

const scheduleFormFromCron = (schedule) => {
  const value = String(schedule || '').trim()
  let match = value.match(/^\*\/(\d+) \* \* \* \*$/)
  if (match) return { scheduleMode: 'interval', intervalMinutes: Number(match[1]) }
  if (value === '0 * * * *') return { scheduleMode: 'hourly' }
  match = value.match(/^(\d+) (\d+) \* \* \*$/)
  if (match) return { scheduleMode: 'daily', dailyTime: `${String(match[2]).padStart(2, '0')}:${String(match[1]).padStart(2, '0')}` }
  match = value.match(/^(\d+) (\d+) \* \* 1-5$/)
  if (match) return { scheduleMode: 'workdays', dailyTime: `${String(match[2]).padStart(2, '0')}:${String(match[1]).padStart(2, '0')}` }
  return { scheduleMode: 'custom', customSchedule: value }
}

const openCreateJob = () => {
  editingId.value = ''
  newJob.value = defaultJob()
  showCreate.value = true
}

const editJob = (job) => {
  editingId.value = job.id
  newJob.value = {
    ...defaultJob(),
    name: job.name,
    targetType: job.target_type || 'project',
    project: job.project || '',
    groupId: job.group_id || '',
    priority: job.priority || 'normal',
    workflowType: job.workflow_type || 'general',
    requiresCodeChanges: job.requires_code_changes !== false,
    backlogBatchLimit: job.backlog_batch_limit || 1,
    importSharedDocs: job.import_shared_docs !== false,
    continueGaps: job.continue_gaps !== false,
    gapContinueLimit: job.gap_continue_limit || 3,
    timezone: job.timezone || 'Asia/Shanghai',
    retryLimit: Number(job.retry_limit ?? 2),
    retryIntervalMinutes: Number(job.retry_interval_minutes || 10),
    misfirePolicy: job.misfire_policy || 'run_once',
    misfireGraceMinutes: Number(job.misfire_grace_minutes || 1440),
    notificationEnabled: job.notification_enabled === true,
    notifyOn: Array.isArray(job.notify_on) ? [...job.notify_on] : ['failed', 'waiting', 'done'],
    prompt: job.prompt || '',
    ...scheduleFormFromCron(job.schedule),
  }
  showCreate.value = true
}

const loadOrchestratorDiagnostics = async () => {
  try {
    const res = await fetch('/api/orchestrator/diagnostics')
    orchestratorDiagnostics.value = await readResponse(res)
  } catch {
    orchestratorDiagnostics.value = null
  }
}

const loadProjects = async () => {
  const data = await projectsApi.list()
  projects.value = data.projects || []
  if (!newJob.value.project && projects.value.length > 0) {
    newJob.value.project = projects.value[0].name
  }
}

const loadGroups = async () => {
  const data = await groupsApi.list()
  groups.value = data.groups || []
  if (!newJob.value.groupId && groups.value.length > 0) {
    newJob.value.groupId = groups.value[0].id
  }
}

const targetLabel = (job) => {
  if (job.target_type === 'group') {
    return groups.value.find(g => g.id === job.group_id)?.name || job.group_id || '群聊'
  }
  return job.project || '项目'
}

const scheduleLabel = (job) => {
  const value = String(job?.schedule || '').trim()
  let match = value.match(/^\*\/(\d+) \* \* \* \*$/)
  if (match) return `每 ${match[1]} 分钟`
  if (value === '0 * * * *') return '每小时整点'
  match = value.match(/^(\d+) (\d+) \* \* 1-5$/)
  if (match) return `工作日 ${String(match[2]).padStart(2, '0')}:${String(match[1]).padStart(2, '0')}`
  match = value.match(/^(\d+) (\d+) \* \* \*$/)
  if (match) return `每天 ${String(match[2]).padStart(2, '0')}:${String(match[1]).padStart(2, '0')}`
  match = value.match(/^(\d+) (\d+) \* \* ([0-6])$/)
  if (match) return `每${weekOptions.find(item => item.value === match[3])?.label || '周'} ${String(match[2]).padStart(2, '0')}:${String(match[1]).padStart(2, '0')}`
  match = value.match(/^(\d+) (\d+) (\d+) \* \*$/)
  if (match) return `每月 ${match[3]} 日 ${String(match[2]).padStart(2, '0')}:${String(match[1]).padStart(2, '0')}`
  return value || '未设置计划'
}

const statusLabel = (status) => ({
  never: '未执行',
  triggering: '触发中',
  running: '触发中',
  running_task: '执行中',
  queued: '已入队',
  waiting: '等待执行',
  retry_waiting: '等待重试',
  done: '已完成',
  cancelled: '已取消',
  skipped: '已跳过',
  failed: '失败',
  invalid_schedule: '表达式错误'
}[status || 'never'] || status)

const formatTime = (value) => {
  if (!value) return '未设置'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatTimeInZone = (value, timezone) => {
  if (!value) return '未设置'
  try { return new Intl.DateTimeFormat('zh-CN', { timeZone: timezone || 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) }
  catch { return formatTime(value) }
}

const cronRunMetaItems = (job) => {
  const meta = job?.last_run_meta || {}
  const imported = meta.imported_shared_docs
  const continued = meta.continued_gap_tasks
  const items = []
  if (continued) items.push(`续跑 ${Number(continued.continued || 0)} 任务`)
  if (imported) items.push(`导入 ${Number(imported.imported || 0)} 文档`)
  if (Array.isArray(meta.claimed_backlogs)) items.push(`认领 ${meta.claimed_backlogs.length} 需求`)
  return items
}

const isJobRunning = (id) => runningJobIds.value.has(id) || scheduler.value.running_job_ids?.includes(id)

const agentProcessCheck = () => orchestratorDiagnostics.value?.checks?.find(check => check.id === 'agent-process') || null

const isExecutionBlocked = () => agentProcessCheck()?.status === 'fail'

const executionBlockReason = () => {
  const check = agentProcessCheck()
  return check?.detail?.probe?.message || check?.message || 'Agent CLI 执行通道不可用'
}

const hasEnabledDailyDevJobs = () => jobs.value.some(job => job.enabled !== false && job.workflow_type === 'daily_dev')

const openRunHistory = (job) => {
  selectedRunJobId.value = job.id
}

const handleRunNavigate = (target) => {
  selectedRunJobId.value = ''
  emit('navigate', target)
}

const handleRunControl = async ({ action, run }) => {
  if (!selectedRunJob.value || !run?.id) return
  const label = action === 'cancel' ? '取消本轮运行' : action === 'resume' ? '继续本轮运行' : '重试本轮运行'
  if (action === 'cancel' && !await confirmDialog('确定取消本轮运行及其未完成任务？')) return
  try {
    await readResponse(await fetch(`/api/cron/run/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: selectedRunJob.value.id, run_id: run.id }) }))
    await loadJobs()
    toast.success(`${label}请求已处理`)
  } catch (error) { toast.error(error.message) }
}

const toggleJobSelection = (id) => {
  const next = new Set(selectedJobIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedJobIds.value = next
}

const toggleAllFiltered = () => {
  const next = new Set(selectedJobIds.value)
  if (allFilteredSelected.value) filteredJobs.value.forEach(job => next.delete(job.id))
  else filteredJobs.value.forEach(job => next.add(job.id))
  selectedJobIds.value = next
}

const runBulkAction = async (action) => {
  const ids = [...selectedJobIds.value]
  if (!ids.length) return
  if (action === 'archive' && !await confirmDialog(`确定归档选中的 ${ids.length} 个定时任务？`)) return
  bulkLoading.value = true
  try {
    const data = await readResponse(await fetch('/api/cron/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, action }) }))
    const succeeded = (data.results || []).filter(item => item.success).length
    selectedJobIds.value = new Set()
    await loadJobs()
    toast.success(`已处理 ${succeeded} 个定时任务`)
  } catch (error) { toast.error(error.message) }
  finally { bulkLoading.value = false }
}

const refreshJobsAndDiagnostics = async () => {
  await Promise.all([loadJobs(), loadOrchestratorDiagnostics()])
}

const toggleJob = async (id, enabled) => {
  try {
    const res = await fetch('/api/cron/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled })
    })
    await readResponse(res)
    await loadJobs()
  } catch (e) {
    toast.error(e.message)
  }
}

const runJob = async (id) => {
  const next = new Set(runningJobIds.value)
  next.add(id)
  runningJobIds.value = next
  try {
    const res = await fetch('/api/cron/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const data = await readResponse(res)
    toast.success(data.queued ? '定时任务已创建并加入队列' : data.message || '定时任务已触发')
    await loadJobs()
  } catch (e) {
    toast.error(e.message)
  } finally {
    const done = new Set(runningJobIds.value)
    done.delete(id)
    runningJobIds.value = done
  }
}

const deleteJob = async (id) => {
  const confirmed = await confirmDialog('确定删除此定时任务？它会停止调度并移入归档，可稍后恢复。')
  if (!confirmed) return
  try {
    const res = await fetch('/api/cron/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    await readResponse(res)
    await loadJobs()
    toast.success('定时任务已停止并移入归档')
  } catch (e) {
    toast.error(e.message)
  }
}

const restoreJob = async (id) => {
  try {
    await readResponse(await fetch('/api/cron/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }))
    await loadJobs(); toast.success('定时任务已恢复')
  } catch (e) { toast.error(e.message) }
}

const purgeJob = async (id) => {
  if (!await confirmDialog('永久清除此定时任务？此操作无法恢复。')) return
  try {
    await readResponse(await fetch('/api/cron/purge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }))
    await loadJobs(); toast.success('定时任务已永久清除')
  } catch (e) { toast.error(e.message) }
}

const submitCreate = async () => {
  const schedule = buildSchedule()
  if (!newJob.value.name || !schedule || !newJob.value.prompt) {
    toast.warning('请填写完整信息')
    return
  }
  if (newJob.value.targetType === 'project' && !newJob.value.project) {
    toast.warning('请选择项目 Agent')
    return
  }
  if (newJob.value.targetType === 'group' && !newJob.value.groupId) {
    toast.warning('请选择群聊')
    return
  }

  const payload = {
    name: newJob.value.name,
    target_type: newJob.value.targetType,
    project: newJob.value.targetType === 'project' ? newJob.value.project : '',
    group_id: newJob.value.targetType === 'group' ? newJob.value.groupId : null,
    schedule,
    priority: newJob.value.priority,
    workflow_type: newJob.value.targetType === 'group' ? newJob.value.workflowType : 'general',
    requires_code_changes: newJob.value.targetType === 'group' && newJob.value.workflowType === 'daily_dev'
      ? newJob.value.requiresCodeChanges
      : false,
    backlog_batch_limit: newJob.value.targetType === 'group' && newJob.value.workflowType === 'daily_dev'
      ? Math.max(1, Math.min(20, Number(newJob.value.backlogBatchLimit || 1)))
      : 1,
    import_shared_docs: newJob.value.targetType === 'group' && newJob.value.workflowType === 'daily_dev'
      ? newJob.value.importSharedDocs
      : false,
    continue_gaps: newJob.value.targetType === 'group' && newJob.value.workflowType === 'daily_dev'
      ? newJob.value.continueGaps
      : false,
    gap_continue_limit: newJob.value.targetType === 'group' && newJob.value.workflowType === 'daily_dev'
      ? Math.max(1, Math.min(20, Number(newJob.value.gapContinueLimit || 3)))
      : 0,
    timezone: newJob.value.timezone,
    retry_limit: Math.max(0, Math.min(10, Number(newJob.value.retryLimit || 0))),
    retry_interval_minutes: Math.max(1, Math.min(1440, Number(newJob.value.retryIntervalMinutes || 10))),
    misfire_policy: newJob.value.misfirePolicy,
    misfire_grace_minutes: Math.max(1, Math.min(10080, Number(newJob.value.misfireGraceMinutes || 1440))),
    notification_enabled: newJob.value.notificationEnabled,
    notify_on: newJob.value.notifyOn,
    prompt: newJob.value.prompt
  }

  try {
    const res = await fetch(editingId.value ? '/api/cron/update' : '/api/cron/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId.value ? { id: editingId.value, ...payload } : payload)
    })
    await readResponse(res)
    showCreate.value = false
    newJob.value = defaultJob()
    await loadJobs()
    toast.success(editingId.value ? '定时任务修改成功' : '定时任务创建成功')
    editingId.value = ''
  } catch (e) {
    toast.error(e.message)
  }
}

onMounted(async () => {
  await Promise.all([loadProjects(), loadGroups()])
  await refreshJobsAndDiagnostics()
  refreshTimer = setInterval(refreshJobsAndDiagnostics, 30000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

  return {
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
    enabledJobCount,
    disabledJobCount,
    issueJobCount,
    activeRunCount,
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
    scheduleLabel,
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
  }
}
