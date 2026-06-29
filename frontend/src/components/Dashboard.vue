<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { projectsApi, groupsApi, tasksApi } from '../api/index.js'
import { toast, confirmDialog } from '../utils/toast.js'

const stats = ref({
  total_tasks: 0,
  pending_tasks: 0,
  in_progress_tasks: 0,
  done_tasks: 0,
  completion_rate: 0,
  groups_count: 0,
  recent_activities: []
})

const groups = ref([])
const projects = ref([])
const tasks = ref([])

// 弹窗状态
const showDecompose = ref(false)
const showReview = ref(false)

// 智能分解表单
const decomposeRequirement = ref('')
const decomposeGroupId = ref('')

// 代码审查表单
const reviewProject = ref('')
const reviewDiff = ref('')

// 看板任务分类
const pendingTasks = computed(() => {
  return [...tasks.value]
    .filter(t => t.status === 'pending')
    .sort((a, b) => {
      const aHigh = a.priority === 'high' ? 1 : 0
      const bHigh = b.priority === 'high' ? 1 : 0
      if (bHigh !== aHigh) {
        return bHigh - aHigh
      }
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })
})
const inProgressTasks = computed(() => tasks.value.filter(t => t.status === 'in_progress'))
const doneTasks = computed(() => tasks.value.filter(t => t.status === 'done'))
const failedTasks = computed(() => tasks.value.filter(t => t.status === 'failed'))

const loadStats = async () => {
  try {
    const res = await fetch('/api/collaboration/stats')
    const data = await res.json()
    stats.value = data
  } catch (e) {
    console.error('加载统计数据失败:', e)
  }
}

const loadGroups = async () => {
  try {
    const data = await groupsApi.list()
    groups.value = data.groups || []
  } catch (e) {
    console.error('加载群聊失败:', e)
  }
}

const loadProjects = async () => {
  try {
    const data = await projectsApi.list()
    projects.value = data.projects || []
  } catch (e) {
    console.error('加载项目失败:', e)
  }
}

const loadTasks = async () => {
  try {
    const data = await tasksApi.list()
    tasks.value = (data.tasks || []).slice().reverse()
  } catch (e) {
    console.error('加载任务列表失败:', e)
  }
}

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return m + '-' + date + ' ' + h + ':' + min;
}

const isAgentMonitorOpen = ref(true)
const isKanbanOpen = ref(true)
const isTimelineOpen = ref(false)

// 智能任务分解
const submitDecompose = async () => {
  if (!decomposeRequirement.value.trim()) { toast.warning('请输入需求描述'); return }
  if (!decomposeGroupId.value) { toast.warning('请选择群聊'); return }

  toast.info('正在分解任务，请稍候...')

  try {
    const res = await fetch('/api/groups/decompose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: decomposeGroupId.value, requirement: decomposeRequirement.value })
    })
    const data = await res.json()

    if (data.success) {
      showDecompose.value = false
      decomposeRequirement.value = ''
      toast.success(`任务分解完成！共创建 ${data.tasks?.length || 0} 个任务`)
      refreshAllData()
    } else {
      toast.error('分解失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('请求出错')
  }
}

// 执行指定任务
const runTask = async (task) => {
  toast.info(`正在将任务加入 ${task.target_project} 的执行队列...`)
  try {
    const res = await fetch('/api/tasks/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task.id })
    })
    const data = await res.json()

    if (data.success) {
      toast.success(data.queued ? `任务 "${task.title}" 已加入执行队列` : (data.message || '任务已处理'))
      refreshAllData()
    } else {
      toast.error('派发执行失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('请求出错')
  }
}

// 执行所有待处理任务
const executeAllTasks = async () => {
  if (pendingTasks.value.length === 0) {
    toast.warning('没有待处理的任务')
    return
  }
  const confirmed = await confirmDialog(`确定要执行所有待处理任务（共 ${pendingTasks.value.length} 个）？这可能需要较长时间。`)
  if (!confirmed) return

  toast.info('正在执行任务，请稍候...')

  try {
    const res = await fetch('/api/tasks/auto-execute-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groups.value[0]?.id })
    })
    const data = await res.json()

    if (data.success) {
      const queued = data.results?.filter(r => r.queued).length || 0
      toast.success(data.message || `${queued}/${data.results?.length || 0} 个任务已加入队列`)
      refreshAllData()
    } else {
      toast.error('执行失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('请求出错')
  }
}

// 代码审查
const submitReview = async () => {
  if (!reviewDiff.value.trim()) { toast.warning('请输入代码变更'); return }

  toast.info('正在进行多 Agent 联合审查，请稍候...')

  const reviewers = groups.value[0]?.members?.filter(m => m.project !== 'coordinator').map(m => m.project) || []

  try {
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: groups.value[0]?.id,
        project: reviewProject.value || projects.value[0]?.name,
        diff: reviewDiff.value,
        reviewers
      })
    })
    const data = await res.json()

    if (data.success) {
      showReview.value = false
      reviewDiff.value = ''
      toast.success('代码审查完成！请查看群聊消息')
      refreshAllData()
    } else {
      toast.error('审查失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('请求出错')
  }
}

const togglePriority = async (task) => {
  const newPriority = task.priority === 'high' ? 'normal' : 'high'
  try {
    const res = await tasksApi.update({ id: task.id, priority: newPriority })
    if (res.success) {
      toast.success(newPriority === 'high' ? '⚡ 任务已紧急插队置顶！' : '⭐ 任务取消紧急插队')
      refreshAllData()
    } else {
      toast.error('操作失败: ' + (res.error || '未知错误'))
    }
  } catch (e) {
    toast.error('网络请求失败')
  }
}

const togglePause = async (task, isPaused) => {
  try {
    const res = await tasksApi.update({ id: task.id, is_paused: isPaused })
    if (res.success) {
      toast.success(isPaused ? '⏸️ 任务已挂起暂停' : '▶️ 任务已恢复执行')
      refreshAllData()
    } else {
      toast.error('操作失败: ' + (res.error || '未知错误'))
    }
  } catch (e) {
    toast.error('网络请求失败')
  }
}

const refreshAllData = () => {
  loadStats()
  loadGroups()
  loadProjects()
  loadTasks()
}

let poller = null

const restartPoller = () => {
  if (poller) clearInterval(poller)
  const interval = parseInt(localStorage.getItem('app-polling-interval') || '10', 10)
  if (interval > 0) {
    poller = setInterval(refreshAllData, interval * 1000)
  }
}

const handleStorageChange = (e) => {
  if (e.key === 'app-polling-interval') {
    restartPoller()
  }
}

onMounted(() => {
  refreshAllData()
  restartPoller()
  window.addEventListener('storage', handleStorageChange)
})

onUnmounted(() => {
  if (poller) clearInterval(poller)
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<template>
  <div class="dashboard">
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="btn btn-primary btn-sm" @click="showDecompose = true">📋 智能分解</button>
        <button class="btn btn-outline btn-sm" @click="executeAllTasks()">🚀 批量执行</button>
        <button class="btn btn-outline btn-sm" @click="showReview = true">🔍 代码审查</button>
      </div>
      <button class="btn btn-outline btn-sm" @click="refreshAllData()">↻ 刷新</button>
    </div>

    <div class="dashboard-content">
      <!-- 总览区 (指标卡与 SVG 进度环并排) -->
      <div class="overview-section">
        <!-- 统计卡片网格 -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon stats-blue">📋</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total_tasks }}</div>
              <div class="stat-label">总任务数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stats-yellow">⏳</div>
            <div class="stat-info">
              <div class="stat-value text-yellow">{{ stats.pending_tasks }}</div>
              <div class="stat-label">待处理</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stats-purple">🔄</div>
            <div class="stat-info">
              <div class="stat-value text-purple">{{ stats.in_progress_tasks }}</div>
              <div class="stat-label">进行中</div>
            </div>
          </div>
        </div>

        <!-- SVG 渐变圆环卡片 -->
        <div class="progress-ring-card">
          <div class="progress-ring-wrapper">
            <svg class="progress-ring" width="130" height="130">
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#3b82f6" />
                  <stop offset="100%" stop-color="#818cf8" />
                </linearGradient>
              </defs>
              <circle class="ring-bg" stroke="rgba(0,0,0,0.03)" stroke-width="8" fill="transparent" r="52" cx="65" cy="65" />
              <circle class="ring-fill" 
                      stroke="url(#ringGradient)" 
                      stroke-width="9" 
                      fill="transparent" 
                      r="52" cx="65" cy="65"
                      :stroke-dasharray="2 * Math.PI * 52"
                      :stroke-dashoffset="2 * Math.PI * 52 * (1 - (stats.completion_rate || 0) / 100)"
                      stroke-linecap="round" />
            </svg>
            <div class="ring-text">
              <span class="pct">{{ stats.completion_rate }}%</span>
              <span class="label">完成进度</span>
            </div>
          </div>
          <div class="progress-meta">
            <div class="meta-title">任务交付率</div>
            <div class="meta-desc">已交付 {{ stats.done_tasks }} / {{ stats.total_tasks }} 个任务</div>
          </div>
        </div>
      </div>

      <!-- 中间区：Agent 状态实时监控墙 & 群聊信息 -->
      <div class="mid-section">
        <!-- Agent 实时状态卡片墙 -->
        <div class="card agent-monitor-card">
          <div class="card-header" @click="isAgentMonitorOpen = !isAgentMonitorOpen" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>🤖 Agent 状态监控墙</span>
              <span class="info-badge">{{ projects.length }} 个节点</span>
            </div>
            <span style="font-size: 13px; color: #888;">{{ isAgentMonitorOpen ? '▼ 收起' : '▲ 展开' }}</span>
          </div>
          <div v-show="isAgentMonitorOpen" style="margin-top: 12px;">
            <div v-if="projects.length === 0" class="empty-sm">暂无项目配置</div>
            <div v-else class="agent-grid">
            <div v-for="p in projects" :key="p.name" class="agent-card" :class="{ running: p.running, working: p.running && p.state === 'working' }">
              <div class="agent-card-header">
                <div class="agent-avatar" :class="p.agent">{{ p.agent.substring(0,2).toUpperCase() }}</div>
                <div style="flex:1; min-width:0; margin-left:10px;">
                  <div class="agent-name" :title="p.name">{{ p.name }}</div>
                  <div class="agent-badge">{{ p.agent }}</div>
                </div>
                <div class="agent-status-indicator" :class="{ running: p.running, working: p.running && p.state === 'working' }">
                  <span class="dot"></span>
                  <span class="text">{{ p.running ? (p.state === 'working' ? '思考中' : '就绪') : '停止' }}</span>
                </div>
              </div>
              <div class="agent-card-body">
                <div class="info-row">
                  <span class="lbl">目录:</span>
                  <span class="val font-mono" :title="p.work_dir">{{ p.work_dir.split(/[/\\]/).pop() || '根目录' }}</span>
                </div>
                <div class="info-row">
                  <span class="lbl">平台:</span>
                  <span class="val">{{ p.platform }}</span>
                </div>
                <div v-if="p.running" class="info-row status-msg-row">
                  <span class="lbl">活动:</span>
                  <span class="val activity-text" :title="p.stateDetail || '闲置中'">{{ p.stateDetail || '闲置中' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

          </div>

        <!-- 群聊协作 -->
        <div class="card group-collab-card">
          <div class="card-header">
            <span>💬 群聊协作空间</span>
            <span class="info-badge">{{ groups.length }} 个空间</span>
          </div>
          <div class="groups-list">
            <div v-for="g in groups" :key="g.id" class="group-row">
              <span class="group-icon">💬</span>
              <div class="group-info">
                <div class="group-name">{{ g.name }}</div>
                <div class="group-sub">{{ g.id }}</div>
              </div>
              <span class="group-member-count">{{ g.members?.length || 0 }} 成员</span>
            </div>
            <div v-if="groups.length === 0" class="empty-sm">暂无协作群聊</div>
          </div>
        </div>
      </div>

      <!-- 下方区：协作任务卡片看板 (Kanban) -->
      <div class="kanban-section">
        <div class="section-title" @click="isKanbanOpen = !isKanbanOpen" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <span>📋 协作开发任务看板</span>
            <span class="subtitle" style="margin-left: 12px;">实时派发任务与状态跟踪</span>
          </div>
          <span style="font-size: 13px; color: #888;">{{ isKanbanOpen ? '▼ 收起看板' : '▲ 展开看板' }}</span>
        </div>
        <div v-show="isKanbanOpen" class="kanban-columns">
          <!-- 待处理 -->
          <div class="kanban-column">
            <div class="col-title col-pending">
              <span class="icon">⏳</span>
              <span>待处理</span>
              <span class="count-pill">{{ pendingTasks.length }}</span>
            </div>
            <div class="column-cards-wrapper">
              <div v-for="t in pendingTasks" :key="t.id" class="kanban-card card-prio-high" :class="{ 'high-priority-neon': t.priority === 'high', 'paused-card': t.is_paused }">
                <div class="kcard-header">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="kcard-tag" :class="t.priority || 'normal'">{{ t.priority || 'normal' }}</span>
                    <div class="kcard-header-actions" v-if="!t.is_paused">
                      <button class="btn-action shadow-none" :class="{ 'btn-urgent': t.priority !== 'high', 'btn-normal': t.priority === 'high' }" @click.stop="togglePriority(t)">
                        {{ t.priority === 'high' ? '⭐ 取消' : '⚡ 插队' }}
                      </button>
                      <button class="btn-action shadow-none btn-pause" @click.stop="togglePause(t, true)">⏸️</button>
                    </div>
                  </div>
                  <span class="kcard-agent">🤖 {{ t.target_project }}</span>
                </div>
                <div class="kcard-title">{{ t.title }}</div>
                <div class="kcard-desc">{{ t.description }}</div>
                <div class="kcard-footer" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <button class="btn btn-primary btn-sm run-btn" :disabled="t.is_paused" @click="runTask(t)">派发执行</button>
                  <span class="kcard-time" style="font-size: 11px; color: #777;">🕒 {{ formatTime(t.created_at) }}</span>
                </div>
                <!-- 挂起遮罩层 -->
                <div v-if="t.is_paused" class="paused-overlay">
                  <span class="paused-text">⏸️ 任务已挂起暂停</span>
                  <button class="btn btn-xs btn-primary resume-btn" @click.stop="togglePause(t, false)">▶️ 恢复执行</button>
                </div>
              </div>
              <div v-if="pendingTasks.length === 0" class="empty-kanban-column">暂无任务</div>
            </div>
          </div>

          <!-- 进行中 -->
          <div class="kanban-column">
            <div class="col-title col-working">
              <span class="icon">🔄</span>
              <span>进行中</span>
              <span class="count-pill">{{ inProgressTasks.length }}</span>
            </div>
            <div class="column-cards-wrapper">
              <div v-for="t in inProgressTasks" :key="t.id" class="kanban-card card-working" :class="{ 'high-priority-neon': t.priority === 'high', 'paused-card': t.is_paused }">
                <div class="kcard-header">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="kcard-tag" :class="t.priority || 'normal'">{{ t.priority || 'normal' }}</span>
                    <div class="kcard-header-actions" v-if="!t.is_paused">
                      <button class="btn-action shadow-none btn-pause" @click.stop="togglePause(t, true)">⏸️ 暂停</button>
                    </div>
                  </div>
                  <span class="kcard-agent">🤖 {{ t.target_project }}</span>
                </div>
                <div class="kcard-title">{{ t.title }}</div>
                <div class="kcard-desc">{{ t.description }}</div>
                <div class="kcard-footer" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <div class="status-working-animation" v-if="!t.is_paused">
                    <span class="running-dots"></span>
                    <span>正在执行...</span>
                  </div>
                  <span class="kcard-time" style="font-size: 11px; color: #777; margin-left: auto;">🕒 {{ formatTime(t.created_at) }}</span>
                </div>
                <!-- 挂起遮罩层 -->
                <div v-if="t.is_paused" class="paused-overlay">
                  <span class="paused-text">⏸️ 任务已挂起暂停</span>
                  <button class="btn btn-xs btn-primary resume-btn" @click.stop="togglePause(t, false)">▶️ 恢复执行</button>
                </div>
              </div>
              <div v-if="inProgressTasks.length === 0" class="empty-kanban-column">暂无执行中任务</div>
            </div>
          </div>

          <!-- 已完成 -->
          <div class="kanban-column">
            <div class="col-title col-done">
              <span class="icon">✅</span>
              <span>已完成</span>
              <span class="count-pill">{{ doneTasks.length }}</span>
            </div>
            <div class="column-cards-wrapper">
              <div v-for="t in doneTasks" :key="t.id" class="kanban-card card-done">
                <div class="kcard-header">
                  <span class="kcard-tag" :class="t.priority || 'normal'">{{ t.priority || 'normal' }}</span>
                  <span class="kcard-agent">🤖 {{ t.target_project }}</span>
                </div>
                <div class="kcard-title">{{ t.title }}</div>
                <div class="kcard-desc">{{ t.description }}</div>
                <div class="kcard-footer" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span class="status-done-tag">已交付</span>
                  <span class="kcard-time" style="font-size: 11px; color: #777;">🕒 {{ formatTime(t.created_at) }}</span>
                </div>
              </div>
              <div v-if="doneTasks.length === 0" class="empty-kanban-column">暂无已完成任务</div>
            </div>
          </div>

          <!-- 失败 -->
          <div class="kanban-column">
            <div class="col-title col-failed">
              <span class="icon">❌</span>
              <span>失败</span>
              <span class="count-pill">{{ failedTasks.length }}</span>
            </div>
            <div class="column-cards-wrapper">
              <div v-for="t in failedTasks" :key="t.id" class="kanban-card card-failed">
                <div class="kcard-header">
                  <span class="kcard-tag" :class="t.priority || 'normal'">{{ t.priority || 'normal' }}</span>
                  <span class="kcard-agent">🤖 {{ t.target_project }}</span>
                </div>
                <div class="kcard-title">{{ t.title }}</div>
                <div class="kcard-desc">{{ t.result || t.description }}</div>
                <div class="kcard-footer" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <button class="btn btn-primary btn-sm run-btn" @click="runTask(t)">重新加入队列</button>
                  <span class="kcard-time" style="font-size: 11px; color: #777;">🕒 {{ formatTime(t.created_at) }}</span>
                </div>
              </div>
              <div v-if="failedTasks.length === 0" class="empty-kanban-column">暂无失败任务</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 实时协作活动流时间轴 (Timeline) -->
      <div class="card timeline-card" style="margin-top:24px">
        <div class="card-header" @click="isTimelineOpen = !isTimelineOpen" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>⚡ 实时协作活动流</span>
            <span class="info-badge">时间轴</span>
          </div>
          <span style="font-size: 13px; color: #888;">{{ isTimelineOpen ? '▼ 收起' : '▲ 展开' }}</span>
        </div>
        <div v-show="isTimelineOpen" style="margin-top: 12px;">
          <div v-if="stats.recent_activities.length === 0" class="empty-sm">暂无活动记录</div>
          <div v-else class="timeline">
            <div v-for="(act, i) in stats.recent_activities" :key="i" class="timeline-item">
              <div class="timeline-node" :class="act.agent === 'user' ? 'user' : 'agent'">
                {{ act.agent === 'user' ? '👤' : '🤖' }}
              </div>
              <div class="timeline-panel">
                <div class="timeline-meta">
                  <span class="actor" :class="{ 'user-actor': act.agent === 'user' }">{{ act.agent }}</span>
                  <span class="channel">在 [{{ act.group }}] 发送了消息</span>
                  <span class="time">{{ new Date(act.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</span>
                </div>
                <div class="timeline-content">{{ act.content }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 智能分解弹窗 -->
    <div v-if="showDecompose" class="modal-overlay" @click.self="showDecompose = false">
      <div class="modal" style="min-width:500px">
        <button class="modal-close" @click="showDecompose = false">&times;</button>
        <h3>📋 智能任务分解</h3>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">输入开发需求，代码协调器会自动将其分解为多个开发任务</div>
        <div class="form-group">
          <label>选择协作空间</label>
          <select v-model="decomposeGroupId">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>需求描述</label>
          <textarea v-model="decomposeRequirement" rows="5" placeholder="描述您的完整开发需求，例如：开发用户头像上传功能，包含前端文件上传按钮和后端存储接口。"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showDecompose = false">取消</button>
          <button class="btn btn-primary" @click="submitDecompose">开始分解</button>
        </div>
      </div>
    </div>

    <!-- 代码审查弹窗 -->
    <div v-if="showReview" class="modal-overlay" @click.self="showReview = false">
      <div class="modal" style="min-width:520px">
        <button class="modal-close" @click="showReview = false">&times;</button>
        <h3>🔍 多 Agent 代码联合审查</h3>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">粘贴代码变更 Diff，通知群组里所有的 Agent 分别站在各自的职责角度进行安全和质量审查</div>
        <div class="form-group">
          <label>审查的目标项目</label>
          <select v-model="reviewProject">
            <option v-for="p in projects" :key="p.name" :value="p.name">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Git Diff 代码变更</label>
          <textarea v-model="reviewDiff" rows="8" class="font-mono" placeholder="粘贴 git diff 或者是您修改的代码块..."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showReview = false">取消</button>
          <button class="btn btn-primary" @click="submitReview">开始审查</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { display: flex; flex-direction: column; height: 100%; position: relative; }

/* 顶部玻璃工具栏 */
.toolbar { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  padding: 12px 24px; 
  background: rgba(255, 255, 255, 0.45); 
  backdrop-filter: blur(20px); 
  border-bottom: 1px solid rgba(0, 0, 0, 0.05); 
}
.toolbar-left {
  display: flex;
  gap: 8px;
}

.dashboard-content { flex: 1; overflow-y: auto; padding: 24px; }

/* 1. 总览区与 SVG 渐变圆环 */
.overview-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}
.stats-grid { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 16px; 
}
.stat-card { 
  background: rgba(255, 255, 255, 0.45); 
  backdrop-filter: blur(25px); 
  border: 1px solid rgba(0, 0, 0, 0.04); 
  border-radius: 14px; 
  padding: 20px; 
  display: flex; 
  align-items: center; 
  gap: 16px; 
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); 
  box-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.02); 
}
.stat-card:hover { 
  transform: translateY(-3.5px); 
  border-color: rgba(59, 130, 246, 0.2); 
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.06); 
}
.stat-icon { 
  width: 48px; 
  height: 48px; 
  border-radius: 12px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 20px; 
}
.stats-blue { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); }
.stats-yellow { background: rgba(250, 204, 21, 0.08); color: var(--accent-yellow); }
.stats-purple { background: rgba(168, 85, 247, 0.08); color: var(--accent-purple); }

.stat-value { 
  font-size: 28px; 
  font-weight: 700; 
  color: var(--text-primary); 
  font-family: 'Orbitron', monospace; 
  text-shadow: 0 0 10px rgba(59, 130, 246, 0.18);
  letter-spacing: -0.5px;
}
.text-yellow { color: var(--accent-yellow) !important; }
.text-purple { color: var(--accent-purple) !important; }

.stat-label { 
  font-size: 11.5px; 
  color: var(--text-muted); 
  margin-top: 4px; 
  font-weight: 600; 
}

/* 环形进度盘卡片 */
.progress-ring-card {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.02);
}
.progress-ring-wrapper {
  position: relative;
  width: 130px;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ring-fill {
  transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  transform: rotate(-90deg);
  transform-origin: 65px 65px;
}
.ring-text {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ring-text .pct {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-blue);
  font-family: 'Orbitron', monospace;
  text-shadow: 0 2px 6px rgba(59, 130, 246, 0.1);
}
.ring-text .label {
  font-size: 9px;
  color: var(--text-muted);
  font-weight: 600;
  margin-top: 1px;
}
.progress-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.progress-meta .meta-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.progress-meta .meta-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* 2. 中间 Agent 与群聊 */
.mid-section {
  display: grid;
  grid-template-columns: 2fr 1.2fr;
  gap: 20px;
  margin-bottom: 24px;
}
.card { 
  background: rgba(255, 255, 255, 0.45); 
  backdrop-filter: blur(25px); 
  border: 1px solid rgba(0, 0, 0, 0.04); 
  border-radius: 14px; 
  padding: 20px; 
  box-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.02); 
}
.card-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  font-size: 13.5px; 
  font-weight: 700; 
  color: var(--text-secondary); 
  margin-bottom: 16px; 
  letter-spacing: 0.3px; 
}
.info-badge {
  background: rgba(59, 130, 246, 0.08);
  color: var(--accent-blue);
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: 'Share Tech Mono', monospace;
}

/* Agent 卡片墙 */
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.agent-card {
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.agent-card.running {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(34, 197, 94, 0.25);
  animation: agent-running-glow 2s infinite ease-in-out;
}
@keyframes agent-running-glow {
  0%, 100% { border-color: rgba(34, 197, 94, 0.25); box-shadow: 0 0 4px rgba(34, 197, 94, 0.05); }
  50% { border-color: rgba(34, 197, 94, 0.55); box-shadow: 0 0 16px rgba(34, 197, 94, 0.15); }
}
.agent-card.working {
  border-color: rgba(234, 179, 8, 0.25);
  box-shadow: 0 0 12px rgba(234, 179, 8, 0.06);
  animation: agent-working-glow 2s infinite linear;
}
@keyframes agent-working-glow {
  0%, 100% { border-color: rgba(234, 179, 8, 0.25); box-shadow: 0 0 8px rgba(234, 179, 8, 0.03); }
  50% { border-color: rgba(234, 179, 8, 0.55); box-shadow: 0 0 16px rgba(234, 179, 8, 0.12); }
}

.agent-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.agent-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: white;
  background: var(--gradient-blue);
}
.agent-avatar.claudecode { background: linear-gradient(135deg, #f97316, #ea580c); }
.agent-avatar.gemini { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
.agent-avatar.cursor { background: linear-gradient(135deg, #06b6d4, #0891b2); }
.agent-avatar.codex { background: linear-gradient(135deg, #10b981, #059669); }

.agent-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-badge {
  font-size: 9.5px;
  color: var(--text-muted);
  margin-top: 1px;
}
.agent-status-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.03);
  font-size: 10px;
  color: var(--text-muted);
}
.agent-status-indicator.running {
  background: rgba(34, 197, 94, 0.08);
  color: var(--accent-green);
}
.agent-status-indicator.working {
  background: rgba(234, 179, 8, 0.08);
  color: var(--accent-yellow);
}
.agent-status-indicator .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #9ca3af;
}
.agent-status-indicator.running .dot {
  background: #22c55e;
  animation: indicator-pulse 1.8s infinite ease-in-out;
}
.agent-status-indicator.working .dot {
  background: #eab308;
  animation: indicator-pulse 1.2s infinite ease-in-out;
}
@keyframes indicator-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.15); }
}

.agent-card-body {
  margin-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.03);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  line-height: 1.4;
}
.info-row .lbl { color: var(--text-muted); }
.info-row .val { color: var(--text-secondary); text-align: right; }
.status-msg-row {
  margin-top: 2px;
  background: rgba(0,0,0,0.01);
  padding: 3px 6px;
  border-radius: 4px;
}
.activity-text {
  color: var(--accent-blue) !important;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

/* 群聊列表行 */
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.group-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(0,0,0,0.03);
  border-radius: 10px;
  transition: all 0.2s;
}
.group-row:hover {
  background: rgba(59, 130, 246, 0.03);
  border-color: rgba(59, 130, 246, 0.1);
}
.group-icon {
  font-size: 18px;
}
.group-info {
  flex: 1;
  min-width: 0;
}
.group-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.group-sub {
  font-size: 9.5px;
  color: var(--text-muted);
  font-family: 'Share Tech Mono', monospace;
  margin-top: 1px;
}
.group-member-count {
  font-size: 11px;
  background: rgba(0,0,0,0.04);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-muted);
}

/* 3. 协作看板区域 */
.kanban-section {
  margin-top: 8px;
}
.section-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 16px;
}
.section-title span:first-child {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}
.section-title .subtitle {
  font-size: 11.5px;
  color: var(--text-muted);
}

.kanban-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.kanban-column {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.03);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 250px;
}
.col-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 700;
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
}
.col-pending { border-bottom-color: var(--accent-yellow); color: var(--text-secondary); }
.col-working { border-bottom-color: var(--accent-blue); color: var(--accent-blue); }
.col-done { border-bottom-color: var(--accent-green); color: var(--accent-green); }
.col-failed { border-bottom-color: var(--accent-red); color: var(--accent-red); }

.count-pill {
  font-size: 10px;
  padding: 1px 6px;
  background: rgba(0,0,0,0.04);
  color: var(--text-muted);
  border-radius: 8px;
  margin-left: auto;
  font-family: 'Orbitron', monospace;
}

.column-cards-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.empty-kanban-column {
  text-align: center;
  padding: 40px 10px;
  font-size: 12px;
  color: var(--text-muted);
  border: 2px dashed rgba(0,0,0,0.02);
  border-radius: 10px;
  background: rgba(0,0,0,0.005);
}

/* 任务卡片 */
.kanban-card {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.01);
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.03);
}
.card-prio-high { border-left: 3px solid var(--accent-red); }
.card-working { border-left: 3px solid var(--accent-blue); }
.card-done { border-left: 3px solid var(--accent-green); }
.card-failed { border-left: 3px solid var(--accent-red); }

.kcard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kcard-tag {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
}
.kcard-tag.high { background: rgba(239, 68, 68, 0.08); color: var(--accent-red); }
.kcard-tag.normal { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); }
.kcard-tag.low { background: rgba(156, 163, 175, 0.1); color: var(--text-muted); }

.kcard-agent {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 500;
}
.kcard-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}
.kcard-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.kcard-footer {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-top: 1px solid rgba(0,0,0,0.02);
  padding-top: 8px;
}
.run-btn {
  padding: 3px 8px;
  font-size: 10.5px;
  border-radius: 6px;
}
.status-working-animation {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--accent-blue);
  font-weight: 500;
}
.running-dots {
  width: 6px;
  height: 6px;
  background: var(--accent-blue);
  border-radius: 50%;
  animation: pulse-dot-anim 1s infinite alternate;
}
@keyframes pulse-dot-anim {
  from { opacity: 0.3; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1.15); }
}

.status-done-tag {
  font-size: 10px;
  color: var(--accent-green);
  background: rgba(34, 197, 94, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

/* 4. 时间轴 Activity Timeline */
.timeline {
  position: relative;
  padding: 10px 0;
}
.timeline::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 17px;
  width: 2px;
  background: rgba(0, 0, 0, 0.04);
}
.timeline-item {
  position: relative;
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.timeline-node {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  z-index: 2;
  box-shadow: 0 4px 10px rgba(0,0,0,0.02);
}
.timeline-node.user {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}
.timeline-node.agent {
  border-color: var(--accent-purple);
  color: var(--accent-purple);
}
.timeline-panel {
  flex: 1;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(0,0,0,0.03);
  border-radius: 10px;
  padding: 10px 14px;
}
.timeline-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  margin-bottom: 4px;
}
.timeline-meta .actor {
  font-weight: 700;
  color: var(--accent-purple);
}
.timeline-meta .actor.user-actor {
  color: var(--accent-blue);
}
.timeline-meta .channel {
  color: var(--text-muted);
}
.timeline-meta .time {
  margin-left: auto;
  color: var(--text-muted);
  font-family: 'Share Tech Mono', monospace;
}
.timeline-content {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  word-break: break-all;
}

/* 弹窗通用样式覆盖 */
.form-group textarea {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-primary);
  font-size: 13px;
  resize: vertical;
  outline: none;
}
.font-mono {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace !important;
}

/* 暗色主题深度兼容 */
[data-theme="dark"] .toolbar,
[data-theme="dark"] .stat-card,
[data-theme="dark"] .progress-ring-card,
[data-theme="dark"] .card,
[data-theme="dark"] .group-row,
[data-theme="dark"] .agent-card,
[data-theme="dark"] .kanban-column,
[data-theme="dark"] .kanban-card,
[data-theme="dark"] .timeline-panel {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
}
[data-theme="dark"] .kanban-card {
  background: var(--bg-glass) !important;
}
[data-theme="dark"] .agent-card.running {
  background: var(--surface) !important;
  border-color: rgba(34, 197, 94, 0.2) !important;
}
[data-theme="dark"] .timeline::before {
  background: rgba(255,255,255,0.05);
}
[data-theme="dark"] .timeline-node {
  background: #111827;
  border-color: rgba(255,255,255,0.08);
}
[data-theme="dark"] .form-group input,
[data-theme="dark"] .form-group select,
[data-theme="dark"] .form-group textarea {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

@media (max-width: 992px) {
  .overview-section, .mid-section { grid-template-columns: 1fr !important; }
  .kanban-columns { grid-template-columns: 1fr !important; }
}
@media (max-width: 576px) {
  .stats-grid { grid-template-columns: 1fr !important; }
  .toolbar { flex-wrap: wrap; gap: 8px; }
}

/* 高优先置顶霓虹流光 */
.high-priority-neon {
  border: 1px solid rgba(239, 68, 68, 0.4) !important;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.25), inset 0 0 10px rgba(239, 68, 68, 0.1) !important;
  animation: neon-pulse 2s infinite alternate;
}
@keyframes neon-pulse {
  from {
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.2), inset 0 0 4px rgba(239, 68, 68, 0.05);
  }
  to {
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.45), inset 0 0 10px rgba(239, 68, 68, 0.15);
  }
}

/* 任务暂停/挂起毛玻璃遮罩 */
.paused-card {
  opacity: 0.85;
  position: relative;
  overflow: hidden;
}
.paused-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 10;
  border-radius: 10px;
  animation: fadeIn 0.2s ease;
}
[data-theme="dark"] .paused-overlay {
  background: rgba(17, 24, 39, 0.8);
}
.paused-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
}
.resume-btn {
  padding: 3px 8px;
  font-size: 10px;
  border-radius: 6px;
}
.kcard-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.btn-action {
  background: rgba(0, 0, 0, 0.04);
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 9px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.btn-action:hover {
  background: rgba(0, 0, 0, 0.08);
}
[data-theme="dark"] .btn-action {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}
[data-theme="dark"] .btn-action:hover {
  background: rgba(255, 255, 255, 0.12);
}
.btn-urgent {
  color: var(--accent-red);
  background: rgba(239, 68, 68, 0.08);
}
.btn-urgent:hover {
  background: rgba(239, 68, 68, 0.15);
}
.btn-normal {
  color: var(--text-muted);
}
.btn-pause {
  padding: 2px 4px;
}
</style>
