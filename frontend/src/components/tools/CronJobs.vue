<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { projectsApi, groupsApi } from '../../api/index.js'
import { toast, confirmDialog } from '../../utils/toast.js'
import CronRunHistoryDrawer from './CronRunHistoryDrawer.vue'

const emit = defineEmits(['navigate'])

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
</script>

<template>
  <div class="cron-jobs">
    <div class="toolbar">
      <div class="stats">
        <div class="stat"><span class="stat-label">总计</span><span class="stat-value">{{ jobs.length }}</span></div>
        <div class="stat"><span class="stat-label ok">启用</span><span class="stat-value ok">{{ jobs.filter(j => j.enabled).length }}</span></div>
        <div class="stat"><span class="stat-label muted">禁用</span><span class="stat-value muted">{{ jobs.filter(j => !j.enabled).length }}</span></div>
        <div class="scheduler-pill" :class="{ online: scheduler.running }">{{ scheduler.running ? '调度器运行中' : '调度器未启动' }}</div>
      </div>
      <div class="actions">
        <button class="btn btn-outline" @click="showArchived = !showArchived; loadJobs()">{{ showArchived ? '返回运行中' : `归档 (${archivedCount})` }}</button>
        <button v-if="!showArchived" class="btn btn-primary" @click="openCreateJob">新建定时任务</button>
      </div>
    </div>

    <div class="cron-filter-bar">
      <input v-model="searchQuery" type="search" placeholder="搜索名称、目标或提示词" aria-label="搜索定时任务">
      <select v-model="statusFilter" aria-label="状态筛选">
        <option value="all">全部状态</option><option value="enabled">已启用</option><option value="disabled">已禁用</option>
        <option value="running_task">执行中</option><option value="retry_waiting">等待重试</option><option value="failed">失败</option><option value="done">已完成</option>
      </select>
      <select v-model="targetFilter" aria-label="目标筛选"><option value="all">全部目标</option><option value="project">项目 Agent</option><option value="group">群聊协作</option></select>
      <div v-if="selectedJobIds.size" class="bulk-actions">
        <span>已选 {{ selectedJobIds.size }}</span>
        <button :disabled="bulkLoading" @click="runBulkAction('enable')">启用</button>
        <button :disabled="bulkLoading" @click="runBulkAction('disable')">禁用</button>
        <button :disabled="bulkLoading" @click="runBulkAction(showArchived ? 'restore' : 'archive')">{{ showArchived ? '恢复' : '归档' }}</button>
      </div>
    </div>

    <div v-if="hasEnabledDailyDevJobs() && isExecutionBlocked()" class="cron-execution-warning">
      <strong>业务开发定时任务暂不能自动执行</strong>
      <span>{{ executionBlockReason() }}</span>
      <code>npm run agent-runner:ps</code>
      <code>claude -p</code>
    </div>

    <div class="content">
      <div v-if="jobs.length === 0" class="empty">
        <span class="icon">⏰</span>
        <span>暂无定时任务</span>
      </div>

      <div v-else-if="filteredJobs.length === 0" class="empty"><span>没有符合筛选条件的定时任务</span></div>
      <div v-else class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th class="select-column"><input type="checkbox" :checked="allFilteredSelected" aria-label="选择当前结果" @change="toggleAllFiltered"></th>
              <th>名称</th>
              <th>目标</th>
              <th>调度</th>
              <th>提示词</th>
              <th>状态</th>
              <th>运行记录</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in filteredJobs" :key="job.id">
              <td class="select-column"><input type="checkbox" :checked="selectedJobIds.has(job.id)" :aria-label="`选择 ${job.name}`" @change="toggleJobSelection(job.id)"></td>
              <td data-label="名称">
                <strong>{{ job.name }}</strong>
                <div class="job-subtitle">已触发 {{ job.run_count || 0 }} 次</div>
                <div v-if="job.workflow_type === 'daily_dev'" class="job-subtitle dev-flow">业务开发 · {{ job.requires_code_changes === false ? '允许无代码变更' : '必须有代码变更' }}</div>
                <div v-if="job.workflow_type === 'daily_dev'" class="job-subtitle">{{ job.continue_gaps === false ? '不自动续跑缺口' : `自动续跑缺口，每次最多 ${job.gap_continue_limit || 3} 个` }}</div>
                <div v-if="job.workflow_type === 'daily_dev'" class="job-subtitle">每次最多认领 {{ job.backlog_batch_limit || 1 }} 条需求</div>
                <div v-if="job.workflow_type === 'daily_dev'" class="job-subtitle">{{ job.import_shared_docs === false ? '仅认领已有需求池' : '自动导入共享文档' }}</div>
                <div v-if="job.workflow_type === 'daily_dev' && isExecutionBlocked()" class="job-runtime-warning">执行通道阻塞，触发后任务会等待复检通过</div>
                <div class="job-subtitle">{{ job.timezone }} · 失败最多重试 {{ job.retry_limit || 0 }} 次</div>
                <div v-if="job.notification_enabled" class="job-subtitle">飞书通知 · {{ (job.notify_on || []).map(statusLabel).join('、') }}</div>
              </td>
              <td data-label="目标"><span class="tag" :class="{ group: job.target_type === 'group' }">{{ targetLabel(job) }}</span></td>
              <td data-label="调度">
                <code>{{ job.schedule }}</code>
                <div v-if="job.schedule_error" class="error-text">{{ job.schedule_error }}</div>
              </td>
              <td class="prompt-cell" data-label="提示词" :title="job.prompt">{{ job.prompt }}</td>
              <td data-label="状态">
                <label class="toggle">
                  <input type="checkbox" :checked="job.enabled" @change="toggleJob(job.id, $event.target.checked)">
                  <span>{{ job.enabled ? '启用' : '禁用' }}</span>
                </label>
                <span class="status" :class="`status-${job.last_status || 'never'}`">{{ statusLabel(job.last_status) }}</span>
              </td>
              <td class="run-cell" data-label="运行记录">
                <div>上次 {{ formatTimeInZone(job.last_run, job.timezone) }}</div>
                <div>下次 {{ formatTimeInZone(job.next_run, job.timezone) }}</div>
                <div v-if="cronRunMetaItems(job).length" class="cron-meta-row">
                  <span v-for="item in cronRunMetaItems(job)" :key="item">{{ item }}</span>
                </div>
                <div class="result-text" :title="job.last_result">{{ job.last_result || '暂无结果' }}</div>
              </td>
              <td data-label="操作">
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="openRunHistory(job)">运行记录</button>
                  <button v-if="!showArchived" class="btn btn-secondary btn-sm" :disabled="isJobRunning(job.id)" @click="runJob(job.id)">
                    {{ isJobRunning(job.id) ? '运行中' : '立即运行' }}
                  </button>
                  <button v-if="!showArchived" class="btn btn-outline btn-sm" @click="editJob(job)">编辑</button>
                  <button v-if="!showArchived" class="btn btn-danger btn-sm" @click="deleteJob(job.id)">删除</button>
                  <button v-if="showArchived" class="btn btn-primary btn-sm" @click="restoreJob(job.id)">恢复</button>
                  <button v-if="showArchived" class="btn btn-danger btn-sm" @click="purgeJob(job.id)">永久清除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <CronRunHistoryDrawer
      :visible="!!selectedRunJob"
      :job="selectedRunJob"
      @close="selectedRunJobId = ''"
      @navigate="handleRunNavigate"
      @control="handleRunControl"
    />

    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <button class="modal-close" @click="showCreate = false">&times;</button>
        <h3>{{ editingId ? '编辑定时任务' : '新建定时任务' }}</h3>
        <div class="form-group">
          <label>任务名称</label>
          <input v-model="newJob.name" placeholder="如 每日代码检查">
        </div>
        <div class="form-group">
          <label>目标类型</label>
          <select v-model="newJob.targetType">
            <option value="project">项目 Agent</option>
            <option value="group">群聊协作</option>
          </select>
        </div>
        <div v-if="newJob.targetType === 'project'" class="form-group">
          <label>目标项目</label>
          <select v-model="newJob.project">
            <option v-for="p in projects" :key="p.name" :value="p.name">{{ p.name }}</option>
          </select>
        </div>
        <div v-else class="form-group">
          <label>目标群聊</label>
          <select v-model="newJob.groupId">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>优先级</label>
          <select v-model="newJob.priority">
            <option value="normal">普通</option>
            <option value="high">高</option>
            <option value="low">低</option>
          </select>
        </div>
        <div class="form-section-title">可靠运行</div>
        <div class="schedule-grid">
          <div class="form-group">
            <label>执行时区</label>
            <select v-model="newJob.timezone"><option value="Asia/Shanghai">中国标准时间</option><option value="UTC">UTC</option><option value="Asia/Tokyo">东京</option><option value="Europe/London">伦敦</option><option value="America/Los_Angeles">洛杉矶</option></select>
          </div>
          <div class="form-group">
            <label>失败重试次数</label>
            <input v-model.number="newJob.retryLimit" type="number" min="0" max="10">
          </div>
          <div class="form-group">
            <label>重试间隔（分钟）</label>
            <input v-model.number="newJob.retryIntervalMinutes" type="number" min="1" max="1440">
          </div>
          <div class="form-group">
            <label>错过执行时间</label>
            <select v-model="newJob.misfirePolicy"><option value="run_once">恢复后补跑一次</option><option value="skip">记录并跳过</option></select>
          </div>
          <div v-if="newJob.misfirePolicy === 'run_once'" class="form-group">
            <label>最长补跑窗口（分钟）</label>
            <input v-model.number="newJob.misfireGraceMinutes" type="number" min="1" max="10080">
          </div>
        </div>
        <div class="form-group">
          <label class="checkbox-label"><input v-model="newJob.notificationEnabled" type="checkbox">发送飞书运行通知</label>
          <div v-if="newJob.notificationEnabled" class="notification-events">
            <label v-for="item in [{ id: 'started', label: '开始' }, { id: 'done', label: '完成' }, { id: 'failed', label: '失败' }, { id: 'waiting', label: '等待处理' }, { id: 'recovered', label: '补跑' }, { id: 'cancelled', label: '取消' }]" :key="item.id"><input v-model="newJob.notifyOn" type="checkbox" :value="item.id">{{ item.label }}</label>
          </div>
          <div class="field-hint">使用设置页面已配置的飞书通知机器人，每个定时任务可独立选择通知时机。</div>
        </div>
        <div v-if="newJob.targetType === 'group'" class="form-group">
          <label>工作流类型</label>
          <select v-model="newJob.workflowType">
            <option value="general">普通群聊任务</option>
            <option value="daily_dev">业务开发任务</option>
          </select>
        </div>
        <div v-if="newJob.targetType === 'group' && newJob.workflowType === 'daily_dev'" class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="newJob.requiresCodeChanges">
            完成时必须有实际代码变更
          </label>
        </div>
        <div v-if="newJob.targetType === 'group' && newJob.workflowType === 'daily_dev'" class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="newJob.importSharedDocs">
            触发时自动导入群聊共享文档
          </label>
          <div class="field-hint">开启后，定时任务会先把未导入过的 PRD、接口说明或业务描述转成 ready 需求，再按优先级认领。</div>
        </div>
        <div v-if="newJob.targetType === 'group' && newJob.workflowType === 'daily_dev'" class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="newJob.continueGaps">
            触发时自动续跑未完成缺口
          </label>
          <div class="field-hint">开启后，定时任务会先把已有任务报告里的阻塞、失败验证和缺失验证交回主 Agent 返工。</div>
        </div>
        <div v-if="newJob.targetType === 'group' && newJob.workflowType === 'daily_dev' && newJob.continueGaps" class="form-group">
          <label>每次续跑缺口任务数</label>
          <input type="number" v-model.number="newJob.gapContinueLimit" min="1" max="20">
          <div class="field-hint">定时触发时最多续跑多少个已有缺口任务；单个任务有自动续跑次数保护，避免反复空转。</div>
        </div>
        <div v-if="newJob.targetType === 'group' && newJob.workflowType === 'daily_dev'" class="form-group">
          <label>每次认领需求数</label>
          <input type="number" v-model.number="newJob.backlogBatchLimit" min="1" max="20">
          <div class="field-hint">定时触发时最多从需求池认领多少条 ready 需求；每条会创建独立日常开发任务。</div>
        </div>
        <div class="form-group">
          <label>执行频率</label>
          <select v-model="newJob.scheduleMode">
            <option value="daily">每天指定时间</option>
            <option value="workdays">工作日指定时间</option>
            <option value="weekly">每周指定时间</option>
            <option value="monthly">每月指定日期</option>
            <option value="interval">按分钟间隔</option>
            <option value="hourly">每小时</option>
            <option value="custom">自定义 Cron</option>
          </select>
        </div>
        <div v-if="newJob.scheduleMode === 'interval'" class="form-group">
          <label>间隔</label>
          <select v-model.number="newJob.intervalMinutes">
            <option v-for="option in intervalOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
        <div v-if="newJob.scheduleMode === 'daily' || newJob.scheduleMode === 'workdays'" class="form-group">
          <label>执行时间</label>
          <input v-model="newJob.dailyTime" type="time">
        </div>
        <div v-if="newJob.scheduleMode === 'weekly'" class="schedule-grid">
          <div class="form-group">
            <label>星期</label>
            <select v-model="newJob.weeklyDay">
              <option v-for="option in weekOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>执行时间</label>
            <input v-model="newJob.weeklyTime" type="time">
          </div>
        </div>
        <div v-if="newJob.scheduleMode === 'monthly'" class="schedule-grid">
          <div class="form-group">
            <label>日期</label>
            <input v-model.number="newJob.monthlyDay" type="number" min="1" max="31">
          </div>
          <div class="form-group">
            <label>执行时间</label>
            <input v-model="newJob.monthlyTime" type="time">
          </div>
        </div>
        <div v-if="newJob.scheduleMode === 'custom'" class="form-group">
          <label>Cron 表达式</label>
          <input v-model="newJob.customSchedule" placeholder="如 0 9 * * 1-5">
          <div class="hint">格式：分 时 日 月 周，例如 */30 * * * *</div>
        </div>
        <div class="schedule-preview">
          <span>生成表达式</span>
          <code>{{ schedulePreview || '请选择执行频率' }}</code>
        </div>
        <div class="form-group">
          <div class="label-row">
            <label>执行提示词</label>
            <button class="btn btn-secondary btn-sm" @click="applyDailyDevPrompt">套用日常开发模板</button>
          </div>
          <textarea v-model="newJob.prompt" rows="4" placeholder="告诉 Agent 到点后要做什么"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showCreate = false">取消</button>
          <button class="btn btn-primary" @click="submitCreate">{{ editingId ? '保存修改' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cron-jobs {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: var(--surface-nav);
  border-bottom: 1px solid var(--border-color);
}

.cron-filter-bar { display: grid; grid-template-columns: minmax(220px, 1fr) 150px 150px auto; gap: 8px; align-items: center; padding: 10px 20px; border-bottom: 1px solid var(--border-color); background: var(--surface); }
.cron-filter-bar > input, .cron-filter-bar > select { min-width: 0; min-height: 36px; padding: 7px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary); font: inherit; font-size: 12px; }
.bulk-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; color: var(--text-muted); font-size: 11.5px; }
.bulk-actions button { min-height: 32px; padding: 5px 9px; border: 1px solid var(--border-color); border-radius: 5px; background: var(--surface); color: var(--text-secondary); cursor: pointer; }

.stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.ok {
  color: var(--accent-green, #10b981) !important;
}

.muted {
  color: var(--text-muted) !important;
}

.scheduler-pill {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 12px;
  background: var(--surface);
  transition: all 0.2s ease;
}

.scheduler-pill.online {
  color: var(--accent-green, #10b981);
  border-color: rgba(16, 185, 129, 0.24);
  background: rgba(16, 185, 129, 0.08);
}

.cron-execution-warning {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: 14px 20px 0;
  padding: 12px 16px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.08);
  color: var(--text-secondary);
  font-size: 12.5px;
}

.cron-execution-warning strong {
  color: var(--accent-orange, #d97706);
}

.cron-execution-warning span {
  flex: 1 1 260px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.cron-execution-warning code {
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent-orange, #d97706);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 10px;
  color: var(--text-muted);
}

.icon {
  font-size: 40px;
  opacity: 0.5;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}
.select-column { width: 38px; text-align: center !important; }
.select-column input { width: 15px; height: 15px; }

.table th, .table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  vertical-align: top;
}

.table th {
  color: var(--text-muted);
  font-size: 11.5px;
  text-transform: uppercase;
  font-weight: 600;
  background: var(--bg-primary);
  letter-spacing: 0.5px;
}

.table tbody tr {
  transition: background-color 0.15s ease;
}

.table tbody tr:hover {
  background-color: var(--bg-secondary);
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.job-subtitle {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 11.5px;
}

.job-subtitle.dev-flow {
  color: var(--accent-green, #10b981);
  font-weight: 700;
}

.job-runtime-warning {
  margin-top: 6px;
  color: var(--accent-orange, #d97706);
  font-size: 11.5px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.tag {
  display: inline-flex;
  max-width: 160px;
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue, #3b82f6);
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag.group {
  background: rgba(16, 185, 129, 0.1);
  color: var(--accent-green, #10b981);
}

code {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--accent-blue);
  border-radius: 4px;
  font-size: 12px;
}

.prompt-cell {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  cursor: pointer;
  margin-bottom: 8px;
}

.toggle input {
  accent-color: var(--accent-blue);
  cursor: pointer;
}

.status {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--bg-secondary);
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
}

.status-running,
.status-running_task {
  color: var(--accent-blue, #3b82f6);
  background: rgba(59, 130, 246, 0.1);
}

.status-queued {
  color: var(--accent-green, #10b981);
  background: rgba(16, 185, 129, 0.1);
}

.status-waiting, .status-retry_waiting {
  color: var(--accent-orange, #d97706);
  background: rgba(245, 158, 11, 0.12);
}

.status-failed, .status-invalid_schedule {
  color: var(--accent-red, #ef4444);
  background: rgba(239, 68, 68, 0.1);
}

.run-cell {
  min-width: 180px;
  color: var(--text-muted);
  font-size: 12.5px;
  line-height: 1.6;
}

.cron-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.cron-meta-row span {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.1);
  color: var(--accent-green, #10b981);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
}

.result-text {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
}

.error-text {
  margin-top: 6px;
  max-width: 220px;
  color: var(--accent-red, #ef4444);
  font-size: 11.5px;
  line-height: 1.4;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

/* 按钮通用 */
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.btn-primary {
  background: var(--gradient-blue);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.btn-primary:not(:disabled):hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  opacity: 0.95;
}

.btn-secondary {
  background: rgba(59, 130, 246, 0.05);
  border-color: rgba(59, 130, 246, 0.2);
  color: var(--accent-blue);
}

.btn-secondary:not(:disabled):hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.2);
  color: var(--accent-red);
}

.btn-danger:not(:disabled):hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.btn-cancel {
  background: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.btn-cancel:not(:disabled):hover {
  background: var(--bg-primary);
  border-color: rgba(0,0,0,0.15);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 28px;
  min-width: 480px;
  max-width: 560px;
  width: min(560px, calc(100vw - 32px));
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
  max-height: 88vh;
  overflow-y: auto;
}

.modal::before, .modal::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid var(--accent-blue);
  pointer-events: none;
  opacity: 0.6;
}

.modal::before {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
  border-radius: 12px 0 0 0;
}

.modal::after {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
  border-radius: 0 0 12px 0;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 600;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.label-row label {
  margin-bottom: 0;
}

.form-group input, 
.form-group select, 
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group .checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
  font-weight: normal;
}

.form-group .checkbox-label input {
  width: auto;
  accent-color: var(--accent-blue);
  cursor: pointer;
}

.form-group textarea {
  resize: vertical;
  min-height: 96px;
  line-height: 1.5;
}

.form-group input:focus, 
.form-group select:focus, 
.form-group textarea:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.hint, .field-hint {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 6px;
  line-height: 1.45;
}

.schedule-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.schedule-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: -2px 0 16px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.05);
  color: var(--text-secondary);
  font-size: 12.5px;
}
.form-section-title { margin: 18px 0 8px; padding-top: 14px; border-top: 1px solid var(--border-color); color: var(--text-primary); font-size: 13px; font-weight: 700; }
.notification-events { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 9px; }
.notification-events label { display: inline-flex; align-items: center; gap: 5px; color: var(--text-secondary); font-size: 12px; }

.schedule-preview code {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .cron-filter-bar { grid-template-columns: 1fr 1fr; padding: 10px; }
  .cron-filter-bar > input { grid-column: 1 / -1; }
  .bulk-actions { grid-column: 1 / -1; justify-content: flex-start; overflow-x: auto; }
  .content { padding: 10px; }
  .table-wrapper { overflow: visible; }
  .table { min-width: 0; }
  .table thead { display: none; }
  .table tbody, .table tr, .table td { display: block; width: 100%; }
  .table tr { position: relative; padding: 12px 12px 12px 42px; border-bottom: 1px solid var(--border-color); }
  .table tr:last-child { border-bottom: 0; }
  .table td { padding: 7px 0; border: 0; }
  .table td.select-column { position: absolute; top: 12px; left: 13px; width: 18px; padding: 0; }
  .table td[data-label]::before { display: block; margin-bottom: 4px; color: var(--text-muted); font-size: 10.5px; font-weight: 700; content: attr(data-label); }
  .table .prompt-cell { max-width: none; white-space: normal; }
  .table td[data-label="操作"] .actions { justify-content: flex-start; }
  .toolbar { align-items: flex-start; flex-direction: column; }
  .schedule-grid { grid-template-columns: 1fr; gap: 0; }
  .label-row { align-items: flex-start; flex-direction: column; }
  .modal-overlay { padding: 0; align-items: flex-end; }
  .modal { 
    min-width: 0; 
    width: 100%; 
    max-height: 90vh; 
    border-radius: 16px 16px 0 0; 
    border-bottom: none;
    box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
  }
}

/* 暗色主题深度适配 */
[data-theme="dark"] .table-wrapper { background: var(--surface); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
[data-theme="dark"] .table th { background: var(--surface-nav); border-color: var(--border-color); }
[data-theme="dark"] .table tbody tr:hover { background: rgba(255,255,255,0.03); }
[data-theme="dark"] .modal { background: var(--surface); box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
[data-theme="dark"] .btn-cancel { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
[data-theme="dark"] .btn-cancel:hover { background: rgba(255,255,255,0.1); }
[data-theme="dark"] .form-group input, 
[data-theme="dark"] .form-group select, 
[data-theme="dark"] .form-group textarea { background: var(--bg-primary); border-color: var(--border-color); }
[data-theme="dark"] .modal-overlay { background: rgba(0,0,0,0.5); }
[data-theme="dark"] .scheduler-pill { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
[data-theme="dark"] .scheduler-pill.online { background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); }
[data-theme="dark"] .cron-execution-warning { background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); }
</style>
