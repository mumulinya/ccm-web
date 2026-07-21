<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { toast, confirmDialog } from '../../utils/toast.js'
import AttachmentChips from './AttachmentChips.vue'
import EmptyState from './EmptyState.vue'
import LoadingSkeleton from './LoadingSkeleton.vue'
import { useUsabilityWorkbenchLive } from '../../composables/useUsabilityWorkbenchLive.js'
import { useWorkbenchPreferences } from '../../composables/useWorkbenchPreferences.js'
import {
  AlertTriangle, ArrowDown, ArrowUp, Bot, CalendarClock, CheckCircle2, ChevronRight, Clock3,
  FolderKanban, ListTodo, MessageSquare, Paperclip, Play, RefreshCw, RotateCcw, Search,
  Settings2, Sparkles, Square, Wifi, WifiOff, Wrench,
} from '@lucide/vue'

const emit = defineEmits(['navigate'])
const {
  data, loading, refreshing, realtimeConnected, stale, lastError, cachedAt,
  hydrateCache, load, connect, disconnect,
} = useUsabilityWorkbenchLive()
const requirement = ref('')
const target = ref('')
const intakeBusy = ref(false)
const confirmation = ref(null)
const actionBusy = ref('')
const intakeFiles = ref([])
const intakeFileInput = ref(null)
const resourceBusy = ref('')
const attentionFilter = ref('all')
const now = ref(Date.now())
let elapsedTimer = null

const attention = computed(() => data.value?.attention || [])
const active = computed(() => data.value?.active || [])
const completed = computed(() => data.value?.completed || [])
const resources = computed(() => data.value?.resources || { projects: [], groups: [], cron: [] })
const counts = computed(() => data.value?.counts || {})
const updatedLabel = computed(() => data.value?.generated_at
  ? new Date(data.value.generated_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  : '--:--')
const enabledCron = computed(() => resources.value.cron.filter(item => item.enabled))
const runningProjects = computed(() => resources.value.projects.filter(item => item.running))
const targetOptions = computed(() => [
  ...resources.value.groups.map(item => ({ value: `group:${item.id}`, label: `协作群 · ${item.name}` })),
  ...resources.value.projects.map(item => ({ value: `project:${item.name}`, label: `项目 · ${item.name}` })),
])
watch(targetOptions, options => {
  if (!target.value && options.length) target.value = options[0].value
}, { immediate: true })
const quickActions = [
  { label: '全局助手', detail: '直接讨论与分派', tab: 'global-agent', icon: Bot },
  { label: '任务中心', detail: '查看执行与阻塞', tab: 'tasks', icon: ListTodo },
  { label: '协作群', detail: '进入多 Agent 协作', tab: 'groups', icon: MessageSquare },
  { label: '对话搜索', detail: '跨会话查找内容', tab: 'search', icon: Search },
  { label: '工具配置', detail: '管理 MCP 与 Skill', tab: 'tools', icon: Wrench },
]
const quickActionIds = quickActions.map(item => item.tab)
const { sections, quickActionOrder, setSection, moveQuickAction, reset: resetLayout } = useWorkbenchPreferences(quickActionIds)
const orderedQuickActions = computed(() => quickActionOrder.value.map(id => quickActions.find(item => item.tab === id)).filter(Boolean))
const sectionOptions = [
  { key: 'command', label: '发起新目标' },
  { key: 'quickActions', label: '快捷入口' },
  { key: 'attention', label: '待处理事项' },
  { key: 'active', label: '执行中任务' },
  { key: 'completed', label: '近期交付' },
  { key: 'resources', label: '工作资源' },
]
const attentionTabs = computed(() => [
  { key: 'all', label: '全部', count: attention.value.length },
  { key: 'confirmation', label: '需要确认', count: data.value?.attention_counts?.confirmation || 0 },
  { key: 'failed', label: '执行失败', count: data.value?.attention_counts?.failed || 0 },
  { key: 'supplement', label: '等待补充', count: data.value?.attention_counts?.supplement || 0 },
])
const filteredAttention = computed(() => attentionFilter.value === 'all'
  ? attention.value
  : attention.value.filter(task => task.attention_kind === attentionFilter.value))

const api = async (path, body) => {
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData
  const response = await fetch(path, body === undefined ? undefined : {
    method: 'POST',
    ...(multipart ? { body } : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.success === false) throw new Error(result.error || result.message || `请求失败 (${response.status})`)
  return result
}

const refreshWorkbench = async () => {
  const success = await load(false)
  if (!success) toast.error(lastError.value || '工作台刷新失败，已保留最近数据')
  if (!target.value && targetOptions.value.length) target.value = targetOptions.value[0].value
}

const createPreview = async () => {
  if (!requirement.value.trim() && intakeFiles.value.length === 0) return toast.warning('请说说目标，或者上传需求资料')
  if (!target.value) return toast.warning('请先选择一个项目或协作群')
  intakeBusy.value = true
  try {
    const [kind, id] = target.value.split(':')
    const form = new FormData()
    form.append('requirement', requirement.value.trim())
    form.append('group_id', kind === 'group' ? id : '')
    form.append('target_project', kind === 'project' ? id : '')
    intakeFiles.value.forEach(file => form.append('files', file))
    const result = await api('/api/usability/intake/preview', form)
    confirmation.value = { ...result.task, intake: result.confirmation || result.task?.intake_draft || null }
    toast.success('执行计划已整理好，确认前不会开始')
    await load(true)
  } catch (error) { toast.error(error.message) }
  intakeBusy.value = false
}

const confirmIntake = async () => {
  if (!confirmation.value?.id) return
  intakeBusy.value = true
  try {
    const result = await api('/api/usability/intake/confirm', { task_id: confirmation.value.id })
    toast.success(result.queued ? '已确认，任务开始推进' : (result.queue_result?.message || '已确认执行'))
    requirement.value = ''
    intakeFiles.value = []
    confirmation.value = null
    await load()
  } catch (error) { toast.error(error.message) }
  intakeBusy.value = false
}

const chooseIntakeFiles = () => intakeFileInput.value?.click()
const addIntakeFiles = (event) => {
  const incoming = Array.from(event.target.files || [])
  for (const file of incoming) {
    if (file.size > 25 * 1024 * 1024) {
      toast.warning(`${file.name} 超过 25 MB，未添加`)
      continue
    }
    if (!intakeFiles.value.some(item => item.name === file.name && item.size === file.size)) intakeFiles.value.push(file)
  }
  event.target.value = ''
}
const removeIntakeFile = index => intakeFiles.value.splice(index, 1)

const reviseIntake = async () => {
  if (!confirmation.value?.id) return
  const feedback = window.prompt('希望我怎么调整这份执行前计划？', '')
  if (!feedback?.trim()) return
  intakeBusy.value = true
  try {
    const result = await api('/api/usability/intake/revise', { task_id: confirmation.value.id, feedback: feedback.trim() })
    confirmation.value = {
      ...result.task,
      intake: result.plan_mode || result.task?.intake_draft || confirmation.value.intake || null,
    }
    toast.success('执行前计划已调整，确认前仍不会开始')
    await load(true)
  } catch (error) { toast.error(error.message) }
  intakeBusy.value = false
}

const discardIntake = async () => {
  if (!confirmation.value?.id) return
  try {
    await api('/api/tasks/delete', { id: confirmation.value.id, reason: '用户放弃执行前确认卡' })
    confirmation.value = null
    toast.info('确认卡已放弃，没有开始执行')
    await load(true)
  } catch (error) { toast.error(error.message) }
}

const navigateTask = task => emit('navigate', { tab: 'tasks', taskId: task.id })
const navigateResource = (tab, extra = {}) => emit('navigate', { tab, ...extra })

const toggleProject = async project => {
  const operation = project.running ? 'stop' : 'start'
  if (project.running) {
    const confirmed = await confirmDialog(`确定停止项目“${project.name}”吗？正在运行的 Agent 会停止。`)
    if (!confirmed) return
  }
  resourceBusy.value = `project:${project.name}`
  try {
    await api(operation === 'start' ? '/api/start' : '/api/stop', operation === 'start'
      ? { project: project.name, agent: project.agent }
      : { project: project.name })
    toast.success(operation === 'start' ? '项目已启动' : '项目已停止')
    await load(true)
  } catch (error) { toast.error(error.message) }
  finally { resourceBusy.value = '' }
}

const toggleCron = async job => {
  resourceBusy.value = `cron:${job.id}`
  try {
    await api('/api/cron/update', { id: job.id, enabled: !job.enabled })
    toast.success(job.enabled ? '定时任务已停用' : '定时任务已启用')
    await load(true)
  } catch (error) { toast.error(error.message) }
  finally { resourceBusy.value = '' }
}

const actionLabel = action => ({
  confirm: '确认执行', edit: '调整计划', cancel: '取消', supplement: '补充说明', resume: '恢复', retry: '重试',
  switch_executor: '切换执行器', pause: '暂停', start: '开始', view_report: '查看交付', archive: '归档', view: '查看',
})[action] || action

const runAction = async (task, action) => {
  if (['supplement', 'switch_executor', 'view_report', 'view'].includes(action)) return navigateTask(task)
  actionBusy.value = `${task.id}:${action}`
  try {
    if (action === 'confirm') {
      confirmation.value = task
      return await confirmIntake()
    }
    if (action === 'edit') {
      const feedback = window.prompt('希望我怎么调整这份执行前计划？', '')
      if (!feedback?.trim()) return
      await api('/api/usability/intake/revise', { task_id: task.id, feedback: feedback.trim() })
    }
    if (action === 'retry') await api('/api/tasks/retry', { task_id: task.id, reason: '用户从工作台重试', auto_execute: true })
    if (action === 'start') await api('/api/tasks/queue', { task_id: task.id })
    if (action === 'pause' || action === 'resume') await api('/api/tasks/bulk', { ids: [task.id], action })
    if (action === 'archive') await api('/api/tasks/delete', { id: task.id, reason: '用户从工作台归档已完成任务' })
    if (action === 'cancel') {
      const ok = await confirmDialog(`确定取消“${task.title}”吗？已产生的执行证据会保留。`)
      if (!ok) return
      await api('/api/tasks/cancel', { task_id: task.id, reason: '用户从工作台取消任务' })
    }
    toast.success(`${actionLabel(action)}操作已提交`)
    await load(true)
  } catch (error) { toast.error(error.message) }
  finally { actionBusy.value = '' }
}

const phaseMeta = phase => ({
  needs_user: ['需要你决定', 'decision'], failed: ['执行遇到问题', 'danger'], in_progress: ['正在推进', 'active'],
  queued: ['等待开始', 'queued'], recently_completed: ['刚刚完成', 'success'],
})[phase] || ['历史事项', 'muted']

const formatTime = value => {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formatNextRun = value => {
  if (!value) return '等待调度'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formatDuration = milliseconds => {
  const totalMinutes = Math.max(0, Math.floor(Number(milliseconds || 0) / 60000))
  if (totalMinutes < 1) return '刚刚开始'
  if (totalMinutes < 60) return `${totalMinutes} 分钟`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
}

const taskElapsed = task => {
  const started = Date.parse(task.progress?.started_at || '')
  return formatDuration(Number.isFinite(started) ? now.value - started : task.progress?.elapsed_ms)
}

const cacheLabel = computed(() => cachedAt.value
  ? cachedAt.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  : '--:--')

onMounted(() => {
  hydrateCache()
  connect()
  elapsedTimer = window.setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => {
  disconnect()
  if (elapsedTimer) window.clearInterval(elapsedTimer)
})
</script>

<template>
  <div class="workbench">
    <header class="workbench-header">
      <div class="header-copy">
        <span class="eyebrow">我的工作台</span>
        <h1>今天的工作，一处看清</h1>
        <p>发起目标、处理阻塞、跟进执行和查看交付，都从这里开始。</p>
      </div>
      <div class="header-actions">
        <button v-if="attention.length" class="attention-counter" @click="navigateResource('tasks')"><AlertTriangle :size="14" />{{ attention.length }} 项待处理</button>
        <span class="sync-state" :class="{ stale }"><i></i>{{ realtimeConnected ? '实时连接' : stale ? `缓存于 ${cacheLabel}` : `更新于 ${updatedLabel}` }}</span>
        <details class="layout-menu">
          <summary class="icon-command" title="自定义工作台"><Settings2 :size="16" />布局</summary>
          <div class="layout-popover">
            <div class="layout-popover-head"><strong>显示区域</strong><button title="恢复默认布局" @click.prevent="resetLayout"><RotateCcw :size="14" /></button></div>
            <label v-for="item in sectionOptions" :key="item.key"><input type="checkbox" :checked="sections[item.key]" @change="setSection(item.key, $event.target.checked)">{{ item.label }}</label>
            <div class="layout-order-title">快捷入口顺序</div>
            <div v-for="(item, index) in orderedQuickActions" :key="item.tab" class="layout-order-row"><span>{{ item.label }}</span><button :disabled="index === 0" :title="`上移${item.label}`" @click.prevent="moveQuickAction(item.tab, -1)"><ArrowUp :size="13" /></button><button :disabled="index === orderedQuickActions.length - 1" :title="`下移${item.label}`" @click.prevent="moveQuickAction(item.tab, 1)"><ArrowDown :size="13" /></button></div>
          </div>
        </details>
        <button class="icon-command" :disabled="refreshing" title="刷新工作台" @click="refreshWorkbench">
          <RefreshCw :size="16" :class="{ spinning: refreshing }" />{{ refreshing ? '刷新中' : '刷新' }}
        </button>
      </div>
    </header>

    <div v-if="stale || lastError" class="stale-banner" role="status">
      <WifiOff :size="16" /><span><strong>正在显示最近一次可用数据</strong><small>{{ lastError || '实时连接正在恢复' }}，恢复后会自动更新。</small></span><button @click="refreshWorkbench">立即重试</button>
    </div>

    <section class="pulse-strip" aria-label="今日工作概览">
      <button class="pulse-item attention-pulse" @click="navigateResource('tasks')">
        <span><ListTodo :size="17" />需要处理</span><strong>{{ attention.length }}</strong><small>决策或失败事项</small>
      </button>
      <button class="pulse-item active-pulse" @click="navigateResource('tasks')">
        <span><Clock3 :size="17" />正在推进</span><strong>{{ active.length }}</strong><small>{{ counts.queued || 0 }} 个等待开始</small>
      </button>
      <button class="pulse-item success-pulse" @click="navigateResource('tasks')">
        <span><CheckCircle2 :size="17" />今日交付</span><strong>{{ completed.length }}</strong><small>24 小时内完成</small>
      </button>
      <button class="pulse-item resource-pulse" @click="navigateResource('projects')">
        <span><FolderKanban :size="17" />运行资源</span><strong>{{ runningProjects.length }}</strong><small>{{ resources.projects.length }} 个项目</small>
      </button>
    </section>

    <section v-if="sections.command" class="command-surface" aria-labelledby="new-goal-title">
      <div class="command-heading">
        <div><Sparkles :size="18" /><span><strong id="new-goal-title">发起一个新目标</strong><small>先生成可确认的范围、验收标准与风险，不会直接修改项目</small></span></div>
        <span class="keyboard-hint">Ctrl + Enter</span>
      </div>
      <textarea v-model="requirement" rows="3" placeholder="描述你希望完成的结果，例如：给项目增加支付退款功能，前后端都要完成并通过测试" @keydown.ctrl.enter.prevent="createPreview" />
      <AttachmentChips :files="intakeFiles" @remove="removeIntakeFile" />
      <div class="intake-footer">
        <input ref="intakeFileInput" class="hidden-file-input" type="file" multiple accept="image/*,.txt,.md,.json,.csv,.pdf,.docx,.pptx,.xlsx" @change="addIntakeFiles">
        <div class="intake-tools">
          <button class="attach-action" type="button" :disabled="intakeBusy" title="添加图片或文档" @click="chooseIntakeFiles"><Paperclip :size="16" /><span>添加资料</span></button>
          <label class="target-select"><span>执行位置</span><select v-model="target">
            <option value="" disabled>选择项目或协作群</option>
            <option v-for="item in targetOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select></label>
        </div>
        <button class="primary intake-submit" :disabled="intakeBusy || (!requirement.trim() && intakeFiles.length === 0)" @click="createPreview"><Sparkles :size="16" />{{ intakeBusy ? '正在整理' : '整理执行计划' }}</button>
      </div>
    </section>

    <nav v-if="sections.quickActions" class="quick-actions" aria-label="常用入口">
      <button v-for="item in orderedQuickActions" :key="item.tab" @click="navigateResource(item.tab)">
        <component :is="item.icon" :size="17" /><span><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span><ChevronRight :size="15" />
      </button>
    </nav>

    <section v-if="confirmation" class="confirm-card">
      <div class="confirm-head">
        <div><span class="status decision">执行前确认</span><h2>{{ confirmation.title }}</h2></div>
        <span class="safe-note">尚未开始，不会修改项目</span>
      </div>
      <div class="confirm-grid">
        <div><label>目标项目</label><strong>{{ confirmation.intake?.group_name || confirmation.intake?.project }}</strong></div>
        <div><label>影响范围</label><strong>{{ (confirmation.intake?.scope || confirmation.intake?.impact_scope?.areas || []).join('、') }}</strong></div>
        <div class="wide"><label>验收标准</label><p>{{ Array.isArray(confirmation.intake?.acceptance) ? confirmation.intake.acceptance.join('；') : confirmation.intake?.acceptance }}</p></div>
        <div class="wide"><label>主要风险</label><p>{{ (confirmation.intake?.risks || confirmation.intake?.risk?.reasons || [confirmation.intake?.risk?.summary]).filter(Boolean).join('；') }}</p></div>
        <div v-if="confirmation.intake?.source_summary" class="wide source-summary"><label>需求资料</label><p>{{ confirmation.intake.source_summary }}</p></div>
        <div v-if="confirmation.intake?.clarification_questions?.length" class="wide">
          <label>需要确认</label>
          <p v-for="(item, index) in confirmation.intake.clarification_questions.slice(0, 4)" :key="item.id || item.question || index">{{ typeof item === 'string' ? item : item.question }}</p>
        </div>
      </div>
      <details><summary>技术记录</summary>
        <code>任务 {{ confirmation.id }} · 执行记录已关联</code>
        <p v-if="confirmation.intake?.source_ingestion?.fallback_used" class="source-fallback-notice">需求已改用本地规则整理，请确认计划后再开始。</p>
        <code v-if="confirmation.intake?.source_ingestion?.extraction_error">需求提取错误：{{ confirmation.intake.source_ingestion.extraction_error }}</code>
        <ul v-if="confirmation.intake?.source_ingestion?.sources?.length" class="source-technical-list">
          <li v-for="source in confirmation.intake.source_ingestion.sources" :key="source.id">
            <strong>{{ source.name }}</strong><span>{{ source.status }} · {{ source.parser }}</span><small v-if="source.error">{{ source.error }}</small>
          </li>
        </ul>
      </details>
      <div class="confirm-actions">
        <button class="ghost" :disabled="intakeBusy" @click="reviseIntake">调整计划</button>
        <button class="ghost danger-text" @click="discardIntake">放弃</button>
        <button class="primary" :disabled="intakeBusy" @click="confirmIntake">确认并开始</button>
      </div>
    </section>

    <LoadingSkeleton v-if="loading" variant="cards" :cards="3" />
    <template v-else>
      <div class="workspace-grid">
        <main class="workstream">
          <section v-if="sections.attention && attention.length" class="section-block attention-section">
            <div class="section-title"><div><span class="eyebrow warn">优先处理</span><h2>需要你的决定</h2><p>{{ attention.length }} 项工作正在等待确认、补充或处理失败</p></div></div>
            <div class="attention-tabs" role="tablist" aria-label="待处理分类">
              <button v-for="item in attentionTabs" :key="item.key" :class="{ active: attentionFilter === item.key }" role="tab" :aria-selected="attentionFilter === item.key" @click="attentionFilter = item.key">{{ item.label }} <span>{{ item.count }}</span></button>
            </div>
            <div class="task-list">
              <article v-for="task in filteredAttention" :key="task.id" class="task-card" :class="task.phase">
                <div class="task-main">
                  <div class="task-meta"><span class="status" :class="phaseMeta(task.phase)[1]">{{ phaseMeta(task.phase)[0] }}</span><small>{{ task.intake?.group_name || task.target_project || '协作任务' }} · {{ formatTime(task.updated_at) }}</small></div>
                  <h3>{{ task.title }}</h3><p>{{ task.reason }}</p>
                </div>
                <div class="task-actions"><button v-for="action in task.actions.slice(0, 3)" :key="action" :class="action === 'retry' || action === 'confirm' ? 'primary small' : 'ghost small'" :disabled="actionBusy === `${task.id}:${action}`" @click="runAction(task, action)">{{ actionLabel(action) }}</button></div>
              </article>
            </div>
          </section>

          <section v-if="sections.active" class="section-block active-section">
            <div class="section-title"><div><span class="eyebrow">执行流</span><h2>正在推进</h2><p>运行中与等待开始的任务</p></div><button class="text-btn" @click="navigateResource('tasks')">全部任务<ChevronRight :size="15" /></button></div>
            <div v-if="active.length" class="task-grid">
              <article v-for="task in active.slice(0, 6)" :key="task.id" class="task-card compact">
                <div class="task-meta"><span class="status" :class="phaseMeta(task.phase)[1]">{{ phaseMeta(task.phase)[0] }}</span><small>{{ formatTime(task.updated_at) }}</small></div>
                <h3>{{ task.title }}</h3><p>{{ task.progress?.current_step || task.reason }}</p>
                <div class="progress-row" :class="{ indeterminate: task.progress?.percent == null }"><i :style="task.progress?.percent == null ? {} : { width: `${task.progress.percent}%` }"></i></div>
                <div class="progress-facts"><span><Clock3 :size="12" />{{ task.phase === 'queued' ? '等待执行' : `已运行 ${taskElapsed(task)}` }}</span><span v-if="task.progress?.last_action">最近：{{ task.progress.last_action }}</span></div>
                <div class="task-bottom"><small>{{ task.target_project || task.intake?.group_name || '协作任务' }}</small><button class="text-btn" @click="navigateTask(task)">查看进度<ChevronRight :size="14" /></button></div>
              </article>
            </div>
            <div v-else class="compact-empty">
              <EmptyState icon="◎" title="当前执行队列为空" hint="可以从上方发起目标，或进入任务中心处理待启动事项。" />
              <button class="ghost small" @click="navigateResource('tasks')">打开任务中心</button>
            </div>
          </section>

          <section v-if="sections.completed" class="section-block completed-section">
            <div class="section-title"><div><span class="eyebrow success-text">最近交付</span><h2>刚刚完成</h2><p>24 小时内形成的可查看交付</p></div></div>
            <div v-if="completed.length" class="completed-list">
              <button v-for="task in completed.slice(0, 5)" :key="task.id" @click="navigateTask(task)">
                <CheckCircle2 :size="18" /><div><strong>{{ task.title }}</strong><small>{{ task.delivery.files_changed }} 个文件 · {{ task.delivery.verification_count }} 项验证</small></div><time>{{ formatTime(task.updated_at) }}</time><ChevronRight :size="15" />
              </button>
            </div>
            <div v-else class="inline-empty"><CheckCircle2 :size="18" /><span><strong>暂无最近交付</strong><small>完成的任务会在这里保留快捷入口。</small></span></div>
          </section>
        </main>

        <aside v-if="sections.resources" class="workspace-rail">
          <section class="rail-section">
            <div class="rail-heading"><div><span class="eyebrow">工作资源</span><h2>项目</h2></div><button class="text-btn" title="查看全部项目" @click="navigateResource('projects')"><ChevronRight :size="17" /></button></div>
            <div class="resource-list">
              <div v-for="project in resources.projects.slice(0, 5)" :key="project.name" class="resource-row">
                <button class="resource-link" @click="navigateResource('projects', { project: project.name })"><span class="resource-icon project-icon"><FolderKanban :size="16" /></span><span><strong>{{ project.name }}</strong><small>{{ project.agent }} · {{ project.running ? '正在运行' : '当前空闲' }}</small></span></button>
                <button class="resource-command" :class="{ stop: project.running }" :disabled="resourceBusy === `project:${project.name}`" :title="project.running ? '停止项目' : '启动项目'" @click="toggleProject(project)"><Square v-if="project.running" :size="13" /><Play v-else :size="13" /></button>
              </div>
              <div v-if="!resources.projects.length" class="rail-empty">还没有项目</div>
            </div>
          </section>

          <section class="rail-section">
            <div class="rail-heading"><div><span class="eyebrow">协作空间</span><h2>群聊</h2></div><button class="text-btn" title="查看全部群聊" @click="navigateResource('groups')"><ChevronRight :size="17" /></button></div>
            <div class="resource-list">
              <div v-for="group in resources.groups.slice(0, 4)" :key="group.id" class="resource-row">
                <button class="resource-link" @click="navigateResource('groups', { groupId: group.id })"><span class="resource-icon group-icon"><MessageSquare :size="16" /></span><span><strong>{{ group.name }}</strong><small>{{ group.members }} 位成员 · 主 Agent 协作</small></span></button>
                <button class="resource-command" title="打开群聊" @click="navigateResource('groups', { groupId: group.id })"><ChevronRight :size="14" /></button>
              </div>
              <div v-if="!resources.groups.length" class="rail-empty">还没有协作群</div>
            </div>
          </section>

          <section class="rail-section">
            <div class="rail-heading"><div><span class="eyebrow">自动运行</span><h2>定时任务</h2></div><button class="text-btn" title="查看定时任务" @click="navigateResource('cron')"><ChevronRight :size="17" /></button></div>
            <div class="cron-summary"><CalendarClock :size="18" /><span><strong>{{ enabledCron.length }} 个已启用</strong><small>{{ resources.cron.length }} 个任务已配置</small></span></div>
            <div class="cron-list">
              <div v-for="job in resources.cron.slice(0, 4)" :key="job.id" class="resource-row cron-row">
                <button class="resource-link" @click="navigateResource('cron')"><span><strong>{{ job.name }}</strong><small>{{ job.enabled ? `下次 ${formatNextRun(job.next_run)}` : '当前已停用' }}</small></span></button>
                <button class="resource-command" :class="{ stop: job.enabled }" :disabled="resourceBusy === `cron:${job.id}`" :title="job.enabled ? '停用定时任务' : '启用定时任务'" @click="toggleCron(job)"><Square v-if="job.enabled" :size="12" /><Play v-else :size="12" /></button>
              </div>
              <div v-if="!resources.cron.length" class="rail-empty">还没有定时任务</div>
            </div>
          </section>

          <details class="technical"><summary>系统与数据说明</summary><p><Wifi :size="13" />工作台通过实时事件流同步，连接中断时保留最近一次数据。完成或取消超过 {{ data.archive?.retention_days || 30 }} 天的任务会自动归档；原始结果和 Trace 可在任务中心查看。</p></details>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.workbench{box-sizing:border-box;width:min(1320px,100%);min-height:100%;margin:0 auto;padding:26px 32px 64px;color:var(--text-primary,#172033)}
.workbench-header,.header-actions,.pulse-item span,.command-heading,.command-heading>div,.intake-footer,.intake-tools,.quick-actions button,.section-title,.confirm-head,.confirm-actions,.task-meta,.task-bottom,.text-btn,.rail-heading,.resource-list button,.cron-summary,.cron-list button,.inline-empty{display:flex;align-items:center}
.workbench-header{justify-content:space-between;gap:24px;padding:4px 0 20px}.header-copy{min-width:0}.header-copy h1{margin:5px 0 7px;font-size:30px;line-height:1.2;letter-spacing:0}.header-copy p,.section-title p{margin:0;color:var(--text-secondary,#667085)}
.eyebrow{display:block;color:var(--accent-blue,#2563eb);font-size:11px;font-weight:800;letter-spacing:0}.eyebrow.warn{color:#b54708}.success-text{color:#067647}.header-actions{flex:0 0 auto;gap:10px}.sync-state{display:inline-flex;align-items:center;gap:7px;color:#7a8496;font-size:12px}.sync-state i{width:7px;height:7px;border-radius:50%;background:#12b76a}.icon-command{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:7px 11px;border:1px solid var(--border-color,#dfe4ec);border-radius:7px;background:var(--surface,#fff);color:inherit;font-weight:700}.spinning{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.sync-state.stale{color:#b54708}.sync-state.stale i{background:#f79009}.attention-counter{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:5px 9px;border:1px solid #fedf89;border-radius:7px;background:#fffaeb;color:#b54708;font-size:11px;font-weight:800}.layout-menu{position:relative}.layout-menu>summary{list-style:none;cursor:pointer}.layout-menu>summary::-webkit-details-marker{display:none}.layout-popover{position:absolute;z-index:20;top:43px;right:0;width:250px;padding:12px;border:1px solid var(--border-color,#dfe4ec);border-radius:8px;background:var(--surface,#fff);box-shadow:0 16px 38px rgba(16,24,40,.16)}.layout-popover-head,.layout-order-row{display:flex;align-items:center}.layout-popover-head{justify-content:space-between;margin-bottom:8px}.layout-popover-head button,.layout-order-row button{display:grid;place-items:center;width:26px;height:26px;padding:0;border:1px solid var(--border-color,#dfe4ec);border-radius:6px;background:transparent;color:inherit}.layout-popover label{display:flex;align-items:center;gap:8px;padding:6px 2px;font-size:12px}.layout-order-title{margin:9px 0 5px;padding-top:9px;border-top:1px solid var(--border-color,#edf0f5);color:#7a8496;font-size:10px;font-weight:800}.layout-order-row{gap:5px;padding:3px 0}.layout-order-row span{min-width:0;flex:1;font-size:11px}.layout-order-row button:disabled{opacity:.35;cursor:not-allowed}.stale-banner{display:flex;align-items:center;gap:10px;margin:-6px 0 14px;padding:10px 12px;border:1px solid #fedf89;border-radius:7px;background:#fffaeb;color:#b54708}.stale-banner span{min-width:0;display:grid;gap:1px}.stale-banner strong{font-size:12px}.stale-banner small{font-size:10px}.stale-banner button{margin-left:auto;padding:5px 8px;border:1px solid #fdb022;border-radius:6px;background:#fff;color:#b54708;font-size:11px;font-weight:700}
button{font:inherit;cursor:pointer}.primary,.ghost{display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:7px;padding:9px 14px;font-weight:700}.primary{border:1px solid var(--accent-blue,#2563eb);background:var(--accent-blue,#2563eb);color:white}.primary:disabled,.ghost:disabled,.icon-command:disabled{opacity:.5;cursor:not-allowed}.ghost{border:1px solid var(--border-color,#dfe4ec);background:var(--surface,#fff);color:inherit}.small{padding:6px 10px;font-size:12px}.danger-text{color:#b42318}
.pulse-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--border-color,#e5e9f2);border-radius:8px;background:var(--surface,var(--bg-card,#fff));overflow:hidden}.pulse-item{min-width:0;display:grid;grid-template-columns:1fr auto;gap:3px 12px;padding:14px 16px;border:0;border-right:1px solid var(--border-color,#e5e9f2);background:transparent;color:inherit;text-align:left}.pulse-item:last-child{border-right:0}.pulse-item span{gap:7px;min-width:0;color:#667085;font-size:12px;font-weight:700}.pulse-item strong{grid-row:1/3;grid-column:2;font-size:25px;line-height:1}.pulse-item small{color:#98a2b3;font-size:11px}.attention-pulse strong{color:#b54708}.active-pulse strong{color:#3157c8}.success-pulse strong{color:#067647}.resource-pulse strong{color:#0e7490}
.command-surface{margin-top:16px;padding:16px;border:1px solid #b8c7e8;border-radius:8px;background:var(--surface,var(--bg-card,#fff));box-shadow:0 8px 24px rgba(32,55,92,.07)}.command-heading{justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--border-color,#edf0f5)}.command-heading>div{gap:9px;color:#3157c8}.command-heading span span{display:grid;gap:2px}.command-heading strong{color:var(--text-primary,#172033);font-size:13px}.command-heading small{color:#7a8496;font-size:11px;font-weight:500}.keyboard-hint{color:#98a2b3;font-size:11px}.command-surface textarea{width:100%;min-height:92px;box-sizing:border-box;padding:14px 4px 10px;border:0;resize:vertical;background:transparent;color:inherit;font:500 16px/1.6 inherit;outline:0}.command-surface :deep(.attachment-row){margin:6px 0 10px}.hidden-file-input{display:none}.intake-footer{justify-content:space-between;gap:12px;padding-top:11px;border-top:1px solid var(--border-color,#edf0f5)}.intake-tools{min-width:0;gap:9px}.attach-action{display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:7px 10px;border:1px solid var(--border-color,#dfe4ec);border-radius:7px;background:var(--surface,#fff);color:inherit;font-weight:700}.target-select{display:flex;align-items:center;gap:8px;min-width:0;padding-left:10px;border-left:1px solid var(--border-color,#e5e9f2);color:#7a8496;font-size:11px}.target-select select{width:min(330px,32vw);min-height:38px;border:0;border-radius:7px;background:var(--bg-secondary,#f5f7fb);color:var(--text-primary,#172033);padding:7px 10px}.intake-submit{flex:0 0 auto;min-height:40px}
.quick-actions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:12px}.quick-actions button{min-width:0;gap:9px;padding:10px 11px;border:1px solid var(--border-color,#e5e9f2);border-radius:7px;background:var(--surface,#fff);color:inherit;text-align:left}.quick-actions button>svg:first-child{flex:0 0 auto;color:#52657d}.quick-actions button>svg:last-child{margin-left:auto;color:#98a2b3}.quick-actions span{min-width:0;display:grid;gap:2px}.quick-actions strong,.quick-actions small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.quick-actions strong{font-size:12px}.quick-actions small{color:#98a2b3;font-size:10px}
.confirm-card,.task-card{background:var(--surface,var(--bg-card,#fff));border:1px solid var(--border-color,#e5e9f2);border-radius:8px}.confirm-card{margin-top:18px;padding:20px;border-color:#9fb3e2}.confirm-head{justify-content:space-between;gap:16px}.confirm-head h2{margin:7px 0 0;font-size:19px}.safe-note{font-size:12px;color:#067647}.confirm-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.confirm-grid>div{padding:12px;border:1px solid var(--border-color,#e5e9f2);border-radius:7px;background:var(--bg-secondary,#f7f8fb)}.confirm-grid .wide{grid-column:1/-1}.confirm-grid label{display:block;margin-bottom:5px;color:#7a8496;font-size:11px}.confirm-grid p{margin:0;line-height:1.55}.confirm-card details{font-size:12px;color:#7a8496}.confirm-card details:not([open])>:not(summary){display:none}.confirm-actions{justify-content:flex-end;gap:8px;margin-top:15px}.source-summary{border-left:3px solid #12b76a!important}.source-fallback-notice{margin:8px 0 0;color:#b54708}.confirm-card details>code{display:block;margin-top:7px;overflow-wrap:anywhere}.source-technical-list{display:grid;gap:7px;margin:10px 0 0;padding:0;list-style:none}.source-technical-list li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;padding:7px 8px;border:1px solid var(--border-color,#e5e9f2);border-radius:7px}.source-technical-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.source-technical-list span{color:#667085}.source-technical-list small{grid-column:1/-1;color:#b54708;overflow-wrap:anywhere}
.workspace-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,.72fr);gap:28px;margin-top:28px}.workstream{min-width:0}.workspace-rail{min-width:0;padding-left:24px;border-left:1px solid var(--border-color,#e5e9f2)}.section-block{margin-bottom:30px}.section-title{justify-content:space-between;gap:16px;margin-bottom:12px}.section-title h2,.rail-heading h2{margin:3px 0 2px;font-size:19px;letter-spacing:0}.section-title p{font-size:12px}.text-btn{gap:3px;padding:4px;border:0;background:transparent;color:var(--accent-blue,#2563eb);font-size:12px;font-weight:700}.task-list{display:grid;gap:9px}.task-card{padding:14px 15px}.task-list .task-card{display:flex;justify-content:space-between;gap:18px}.task-card.needs_user{border-left:3px solid #f79009}.task-card.failed{border-left:3px solid #f04438}.task-main{min-width:0}.task-meta{justify-content:space-between;gap:9px}.task-main h3,.task-card.compact h3{margin:8px 0 5px;font-size:15px;line-height:1.4;letter-spacing:0}.task-main p,.task-card.compact p{display:-webkit-box;overflow:hidden;margin:0;color:var(--text-secondary,#667085);font-size:12px;line-height:1.5;-webkit-line-clamp:2;-webkit-box-orient:vertical}.task-meta small,.task-card small{color:#98a2b3;font-size:10px}.task-actions{flex:0 0 auto;display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap}.status{display:inline-flex;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:800}.status.decision{background:#fff3e0;color:#b54708}.status.danger{background:#fee4e2;color:#b42318}.status.active{background:#e8edff;color:#3157c8}.status.queued{background:#f2f4f7;color:#475467}.status.success{background:#dcfae6;color:#067647}.task-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.task-card.compact{min-height:128px;display:flex;flex-direction:column}.task-card.compact p{margin-bottom:12px}.task-bottom{justify-content:space-between;gap:8px;margin-top:auto;padding-top:9px;border-top:1px solid var(--border-color,#edf0f5)}.compact-empty{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 15px;border:1px dashed var(--border-color,#cfd6e1);border-radius:8px}.compact-empty :deep(.ccm-empty-state){min-height:0;padding:0;text-align:left}.compact-empty :deep(.ccm-empty-state__icon){display:none}.compact-empty :deep(.ccm-empty-state__title),.compact-empty :deep(.ccm-empty-state__hint){margin:2px 0}.completed-list{overflow:hidden;border:1px solid var(--border-color,#e5e9f2);border-radius:8px}.completed-list button{width:100%;display:grid;grid-template-columns:22px minmax(0,1fr) auto 16px;align-items:center;gap:9px;padding:11px 13px;border:0;border-bottom:1px solid var(--border-color,#edf0f5);background:var(--surface,#fff);color:inherit;text-align:left}.completed-list button:last-child{border-bottom:0}.completed-list button>svg:first-child{color:#12b76a}.completed-list strong,.completed-list small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.completed-list strong{font-size:12px}.completed-list small,.completed-list time{margin-top:2px;color:#98a2b3;font-size:10px}.completed-list button>svg:last-child{color:#98a2b3}.inline-empty{gap:10px;padding:13px;border:1px dashed var(--border-color,#cfd6e1);border-radius:8px;color:#7a8496}.inline-empty span{display:grid;gap:2px}.inline-empty strong{font-size:12px}.inline-empty small{font-size:10px}
.attention-tabs{display:flex;gap:5px;margin:-2px 0 10px;overflow-x:auto}.attention-tabs button{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;padding:6px 8px;border:1px solid var(--border-color,#dfe4ec);border-radius:6px;background:transparent;color:#667085;font-size:11px}.attention-tabs button.active{border-color:#fdb022;background:#fffaeb;color:#b54708;font-weight:800}.attention-tabs span{min-width:17px;padding:1px 4px;border-radius:9px;background:var(--bg-secondary,#f2f4f7);text-align:center;font-size:9px}.progress-row{position:relative;height:3px;margin:1px 0 8px;overflow:hidden;border-radius:2px;background:#e8edf5}.progress-row i{display:block;height:100%;min-width:4px;border-radius:inherit;background:#3157c8}.progress-row.indeterminate i{width:35%;animation:workbench-progress 1.6s ease-in-out infinite}@keyframes workbench-progress{0%{transform:translateX(-110%)}100%{transform:translateX(310%)}}.progress-facts{display:grid;gap:3px;margin-bottom:9px;color:#7a8496;font-size:10px}.progress-facts span{display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rail-section{padding:0 0 22px;margin-bottom:22px;border-bottom:1px solid var(--border-color,#e5e9f2)}.rail-heading{justify-content:space-between;gap:10px;margin-bottom:10px}.resource-list,.cron-list{display:grid;gap:4px}.resource-list button,.cron-list button{width:100%;min-width:0;gap:9px;padding:8px;border:0;border-radius:7px;background:transparent;color:inherit;text-align:left}.resource-list button:hover,.cron-list button:hover,.quick-actions button:hover{background:var(--bg-secondary,#f5f7fb)}.resource-icon{flex:0 0 auto;width:30px;height:30px;display:grid;place-items:center;border-radius:7px}.project-icon{background:#e8f0fe;color:#3157c8}.group-icon{background:#e6f6f3;color:#0f766e}.resource-list button>span:nth-child(2),.cron-list button>span{min-width:0;display:grid;gap:2px}.resource-list strong,.resource-list small,.cron-list strong,.cron-list small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.resource-list strong,.cron-list strong{font-size:12px}.resource-list small,.cron-list small{color:#98a2b3;font-size:10px}.resource-list button>i{width:7px;height:7px;margin-left:auto;border-radius:50%;background:#cbd5e1}.resource-list button>i.online{background:#12b76a}.resource-list button>svg{margin-left:auto;color:#98a2b3}.cron-summary{gap:9px;padding:10px;margin-bottom:6px;border-radius:7px;background:var(--bg-secondary,#f5f7fb);color:#9a6700}.cron-summary span{display:grid;gap:2px}.cron-summary strong{font-size:12px;color:var(--text-primary,#172033)}.cron-summary small{font-size:10px;color:#7a8496}.cron-list button>i{width:6px;height:6px;margin-left:auto;border-radius:50%;background:#f79009}.rail-empty{padding:10px;color:#98a2b3;font-size:11px}.technical{padding:2px 0;color:#667085;font-size:11px}.technical summary{cursor:pointer;font-weight:700}.technical p{margin:10px 0 0;line-height:1.6}
.resource-row{display:flex;align-items:center;gap:3px;min-width:0;border-radius:7px}.resource-row:hover{background:var(--bg-secondary,#f5f7fb)}.resource-row .resource-link{flex:1;display:flex;align-items:center;min-width:0}.resource-row .resource-command{flex:0 0 auto;display:grid;place-items:center;width:30px;height:30px;padding:0;border:1px solid var(--border-color,#dfe4ec);border-radius:6px;background:var(--surface,#fff);color:#067647}.resource-row .resource-command.stop{color:#b54708}.resource-row .resource-command:disabled{opacity:.45;cursor:wait}.cron-row .resource-link>span{min-width:0;display:grid;gap:2px}.technical p{display:flex;align-items:flex-start;gap:6px}.technical p svg{flex:0 0 auto;margin-top:2px}
@media(max-width:1050px){.quick-actions{grid-template-columns:repeat(3,minmax(0,1fr))}.workspace-grid{grid-template-columns:1fr}.workspace-rail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;padding:22px 0 0;border-top:1px solid var(--border-color,#e5e9f2);border-left:0}.rail-section{margin:0;padding:0;border:0}.technical{grid-column:1/-1}}
@media(max-width:760px){.workbench{padding:18px 14px 42px}.workbench-header{align-items:flex-start}.header-copy h1{font-size:24px}.header-copy p{font-size:12px}.header-actions{flex-wrap:wrap;justify-content:flex-end}.sync-state,.attention-counter{display:none}.layout-popover{position:fixed;top:60px;right:12px;left:12px;width:auto}.stale-banner{align-items:flex-start}.stale-banner button{white-space:nowrap}.pulse-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.pulse-item:nth-child(2){border-right:0}.pulse-item:nth-child(-n+2){border-bottom:1px solid var(--border-color,#e5e9f2)}.command-heading small,.keyboard-hint{display:none}.intake-footer,.intake-tools{align-items:stretch;flex-direction:column}.target-select{padding:0;border-left:0}.target-select span{display:none}.target-select select{width:100%}.intake-submit{width:100%}.quick-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.quick-actions button:last-child:nth-child(odd){grid-column:1/-1}.confirm-grid,.task-grid{grid-template-columns:1fr}.task-list .task-card{display:block}.task-actions{justify-content:flex-start;margin-top:12px}.compact-empty{align-items:flex-start;flex-direction:column}.completed-list button{grid-template-columns:22px minmax(0,1fr) 15px}.completed-list time{display:none}.workspace-rail{grid-template-columns:1fr}.technical{grid-column:auto}}
</style>
