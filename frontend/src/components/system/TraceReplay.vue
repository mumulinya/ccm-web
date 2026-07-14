<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AgentCodeChangeDrawer from '../agents/AgentCodeChangeDrawer.vue'
import TaskReplayEvidence from '../replay/TaskReplayEvidence.vue'
import TaskReplayTimeline from '../replay/TaskReplayTimeline.vue'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const loading = ref(false)
const error = ref('')
const taskId = ref('')
const traceId = ref('')
const scope = ref('orchestrator')
const index = ref(null)
const replay = ref(null)
const listSearch = ref('')
const search = ref('')
const stageFilter = ref('all')
const statusFilter = ref('all')
const actorFilter = ref('all')
const taskFilter = ref('all')
const preset = ref('all')
const focusedEventId = ref('')
const focusedEvidenceId = ref('')
const issuePosition = ref(-1)
const includeSystemEvents = ref(false)
const codeChangeDrawer = ref({ visible: false, title: '', subtitle: '', project: '', files: [] })

const taskRows = computed(() => index.value?.tasks || [])
const visibleTaskRows = computed(() => {
  const needle = listSearch.value.trim().toLowerCase()
  return needle ? taskRows.value.filter(item => `${item.title} ${item.goal} ${item.id}`.toLowerCase().includes(needle)) : taskRows.value
})
const allEvents = computed(() => replay.value?.events || [])
const issueEvents = computed(() => allEvents.value.filter(item => ['failed', 'blocked', 'warning'].includes(item.status)))
const visibleEvents = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return allEvents.value.filter(item => {
    const lowLevelSource = ['trace', 'journal', 'task_log', 'execution'].includes(item.source)
    if (!includeSystemEvents.value && lowLevelSource && !['failed', 'blocked', 'warning'].includes(item.status)) return false
    if (stageFilter.value !== 'all' && item.stage !== stageFilter.value) return false
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) return false
    if (actorFilter.value !== 'all' && item.actor?.type !== actorFilter.value) return false
    if (taskFilter.value !== 'all' && item.task_id !== taskFilter.value) return false
    const haystack = `${item.title} ${item.summary} ${item.actor?.label} ${item.project} ${item.category}`.toLowerCase()
    if (needle && !haystack.includes(needle)) return false
    if (preset.value === 'issues' && !['failed', 'blocked', 'warning'].includes(item.status)) return false
    if (preset.value === 'test' && !(item.actor?.type === 'test_agent' || item.stage === 'test')) return false
    if (preset.value === 'browser' && !/browser|playwright|screenshot|页面|浏览器/i.test(haystack)) return false
    if (preset.value === 'changes' && !['change', 'execution', 'rework'].includes(item.stage)) return false
    return true
  })
})
const durationLabel = computed(() => {
  const start = Date.parse(replay.value?.started_at || '')
  const end = Date.parse(replay.value?.finished_at || '') || Date.now()
  if (!Number.isFinite(start)) return '时间未知'
  const seconds = Math.max(0, Math.round((end - start) / 1000))
  if (seconds < 60) return `${seconds} 秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
  return `${Math.floor(seconds / 3600)} 小时 ${Math.floor((seconds % 3600) / 60)} 分`
})
const statusLabel = (value) => ({ pending: '待执行', in_progress: '执行中', running: '执行中', done: '已完成', completed: '已完成', failed: '失败', blocked: '受阻', cancelled: '已取消', passed: '通过', warning: '注意', info: '记录' }[value] || value || '未知')
const stageLabel = (value) => ({ intake: '需求', planning: '计划', dispatch: '派发', execution: '执行', change: '改动', test: '测试', rework: '返工', review: '验收', completion: '交付', system: '系统' }[value] || value)
const dateLabel = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false })
}
const retentionLabel = (key) => ({ task_record: '任务记录', trace: '完整执行记录', test_agent: 'TestAgent 证据' }[key] || key)

const loadIndex = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/tasks/replay?limit=100')
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '任务记录读取失败')
    index.value = data.index
  } catch (e) {
    error.value = e.message || '任务记录读取失败'
  } finally {
    loading.value = false
  }
}

const syntheticLegacyReplay = (payload) => {
  const rows = Array.isArray(payload?.replays) ? payload.replays : payload ? [payload] : []
  const events = rows.flatMap(row => (row.latest_events || []).map(item => ({
    id: `${row.trace_id}:${item.id || item.type || Math.random()}`,
    at: item.at || new Date(0).toISOString(),
    stage: /test|verify/i.test(item.type || '') ? 'test' : /dispatch|agent/i.test(item.type || '') ? 'execution' : 'system',
    category: item.type || 'trace',
    status: item.status === 'ok' ? 'passed' : item.status === 'error' ? 'failed' : item.status === 'warning' ? 'warning' : 'info',
    title: item.message || item.type || 'Trace 记录',
    summary: item.message || '',
    actor: { type: item.agent ? 'project_agent' : 'system', label: item.agent || '系统' },
    task_id: item.task_id || '', parent_task_id: '', trace_id: row.trace_id || traceId.value, project: item.agent || '', source: 'legacy_trace', evidence_ids: [], technical: { type: item.type || '' },
  })))
  return { schema: 'ccm-legacy-trace-replay-view-v1', title: '旧任务诊断记录', goal: '这条旧记录没有完整任务关联，只显示系统仍保留的诊断过程。', status: rows.every(row => row.verdict === 'pass') ? 'completed' : 'warning', completed: true, tasks: [], actors: [], phases: [], evidence: [], events, summary: { event_count: events.length, issue_count: events.filter(item => ['failed', 'warning', 'blocked'].includes(item.status)).length, failed_count: events.filter(item => item.status === 'failed').length, task_count: 0, evidence_count: 0, test_run_count: 0 }, retention: { trace: { status: 'available', policy: '系统诊断记录' } }, legacy: true }
}

const loadLegacyTrace = async () => {
  const base = scope.value === 'global' ? '/api/global-agent/trace-replay' : '/api/orchestrator/trace-replay'
  const response = await fetch(`${base}?trace_id=${encodeURIComponent(traceId.value)}`)
  const data = await response.json()
  if (!response.ok || data.success === false) throw new Error(data.error || 'Trace 不存在')
  replay.value = syntheticLegacyReplay(data.replay)
}

const loadReplay = async (id = taskId.value) => {
  const selected = String(id || '').trim()
  loading.value = true
  error.value = ''
  focusedEventId.value = ''
  focusedEvidenceId.value = ''
  try {
    if (!selected && traceId.value.trim()) {
      if (!index.value) await loadIndex()
      const target = taskRows.value.find(item => item.trace_id === traceId.value.trim())
      if (target) return await loadReplay(target.id)
      await loadLegacyTrace()
      return
    }
    if (!selected) {
      replay.value = null
      await loadIndex()
      return
    }
    const response = await fetch(`/api/tasks/replay?task_id=${encodeURIComponent(selected)}`)
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '任务回放读取失败')
    taskId.value = selected
    replay.value = data.replay
    traceId.value = data.replay?.tasks?.find(item => item.id === selected)?.trace_id || data.replay?.tasks?.[0]?.trace_id || traceId.value
    stageFilter.value = 'all'; statusFilter.value = 'all'; actorFilter.value = 'all'; taskFilter.value = 'all'; preset.value = 'all'; search.value = ''; includeSystemEvents.value = false
  } catch (e) {
    error.value = e.message || '任务回放读取失败'
  } finally {
    loading.value = false
  }
}

const showIndex = async () => {
  taskId.value = ''; traceId.value = ''; replay.value = null
  await loadIndex()
}
const selectPhase = (phase) => { stageFilter.value = stageFilter.value === phase.id ? 'all' : phase.id; preset.value = 'all' }
const setPreset = (value) => { preset.value = value; if (value !== 'all') stageFilter.value = 'all' }
const focusIssue = (direction) => {
  if (!issueEvents.value.length) return
  issuePosition.value = (issuePosition.value + direction + issueEvents.value.length) % issueEvents.value.length
  const item = issueEvents.value[issuePosition.value]
  preset.value = 'issues'; stageFilter.value = 'all'; statusFilter.value = 'all'; actorFilter.value = 'all'; taskFilter.value = 'all'; search.value = ''
  focusedEventId.value = item.id
}
const openEvidence = (id) => { focusedEvidenceId.value = ''; requestAnimationFrame(() => { focusedEvidenceId.value = id }) }
const openCodeChanges = (item) => {
  codeChangeDrawer.value = {
    visible: true,
    title: item?.title || '任务代码改动',
    subtitle: '查看任务执行时保存的逐行代码变更',
    project: item?.project || '',
    files: Array.isArray(item?.files) ? item.files : [],
  }
}

const applyReplayTarget = (target = {}) => {
  if (!target) return false
  if (target.scope) scope.value = target.scope === 'global' ? 'global' : 'orchestrator'
  if (['all', 'issues', 'test', 'browser', 'changes'].includes(target.preset)) preset.value = target.preset
  taskId.value = String(target.task_id || target.taskId || '')
  traceId.value = String(target.trace_id || target.traceId || '')
  return !!(taskId.value || traceId.value)
}
const readStoredReplayTarget = () => {
  try {
    const raw = localStorage.getItem('trace-replay-target')
    if (!raw) return false
    localStorage.removeItem('trace-replay-target')
    return applyReplayTarget(JSON.parse(raw))
  } catch { return false }
}
const handleReplayTarget = (event) => { if (applyReplayTarget(event.detail || {})) loadReplay() }

onMounted(async () => {
  if (props.navigateTo?.tab === 'trace-replay') applyReplayTarget(props.navigateTo)
  readStoredReplayTarget()
  window.addEventListener('trace-replay-target', handleReplayTarget)
  await loadIndex()
  if (taskId.value || traceId.value) await loadReplay()
})
onUnmounted(() => window.removeEventListener('trace-replay-target', handleReplayTarget))
watch(() => props.navigateTo, (target) => { if (target?.tab === 'trace-replay' && applyReplayTarget(target)) loadReplay() })
</script>

<template>
  <section class="task-replay-page">
    <header class="replay-toolbar">
      <div class="toolbar-title">
        <strong>任务回放</strong>
        <span>查看从需求到交付的完整工作记录</span>
      </div>
      <div class="toolbar-lookup">
        <input v-model="taskId" aria-label="任务 ID" placeholder="输入任务 ID" @keyup.enter="loadReplay()" />
        <button type="button" :disabled="loading" @click="loadReplay()">{{ loading ? '读取中' : '打开' }}</button>
      </div>
    </header>

    <div v-if="error" class="replay-error">{{ error }}</div>

    <template v-if="!replay">
      <div class="replay-index-head">
        <div><strong>最近任务</strong><span>{{ taskRows.length }} 条可回放记录</span></div>
        <input v-model="listSearch" placeholder="搜索标题、目标或任务 ID" />
      </div>
      <div v-if="loading && !taskRows.length" class="replay-loading">正在整理任务记录…</div>
      <div v-else class="replay-index-list">
        <button v-for="item in visibleTaskRows" :key="item.id" type="button" class="replay-index-row" @click="loadReplay(item.id)">
          <span :class="['task-state-dot', item.status]"></span>
          <span class="task-index-copy"><strong>{{ item.title }}</strong><small>{{ item.goal || `任务 ${item.id}` }}</small></span>
          <span class="task-index-meta"><em>{{ statusLabel(item.status) }}</em><small>{{ item.child_count }} 个子任务 · {{ dateLabel(item.updated_at) }}</small></span>
        </button>
        <div v-if="!visibleTaskRows.length" class="replay-loading">没有匹配的任务</div>
      </div>
    </template>

    <template v-else>
      <div class="replay-overview">
        <div class="overview-heading">
          <button type="button" class="back-button" @click="showIndex">返回任务列表</button>
          <div><span>完整任务链</span><h1>{{ replay.title }}</h1><p>{{ replay.goal }}</p></div>
          <span :class="['overview-status', replay.status]">{{ statusLabel(replay.status) }}</span>
        </div>
        <div v-if="replay.legacy" class="legacy-notice">这条旧记录没有完整任务关联，因此只能显示系统仍保留的诊断事件。</div>
        <dl class="overview-metrics">
          <div><dt>总耗时</dt><dd>{{ durationLabel }}</dd></div>
          <div><dt>事件</dt><dd>{{ replay.summary?.event_count || 0 }}</dd></div>
          <div><dt>子任务</dt><dd>{{ Math.max(0, (replay.summary?.task_count || 1) - 1) }}</dd></div>
          <div><dt>TestAgent 运行</dt><dd>{{ replay.summary?.test_run_count || 0 }}</dd></div>
          <div :class="{ attention: replay.summary?.issue_count }"><dt>需排查</dt><dd>{{ replay.summary?.issue_count || 0 }}</dd></div>
          <div><dt>原始证据</dt><dd>{{ replay.summary?.evidence_count || 0 }}</dd></div>
        </dl>
      </div>

      <nav v-if="replay.phases?.length" class="phase-strip" aria-label="任务阶段">
        <button v-for="phase in replay.phases" :key="phase.id" type="button" :class="[phase.status, { active: stageFilter === phase.id }]" @click="selectPhase(phase)">
          <span></span><strong>{{ stageLabel(phase.id) }}</strong><small>{{ phase.event_count }}</small>
        </button>
      </nav>

      <div class="replay-controls">
        <div class="preset-control" role="group" aria-label="快速筛选">
          <button v-for="item in [{id:'all',label:'全部'},{id:'issues',label:'问题'},{id:'test',label:'TestAgent'},{id:'browser',label:'浏览器验证'},{id:'changes',label:'改动与返工'}]" :key="item.id" type="button" :class="{ active: preset === item.id }" @click="setPreset(item.id)">{{ item.label }}</button>
        </div>
        <input v-model="search" class="event-search" placeholder="搜索事件内容" />
        <select v-model="actorFilter" aria-label="参与者">
          <option value="all">全部参与者</option><option value="global_agent">全局主 Agent</option><option value="group_agent">群聊主 Agent</option><option value="project_agent">项目子 Agent</option><option value="test_agent">TestAgent</option><option value="user">用户</option><option value="system">系统</option>
        </select>
        <select v-model="statusFilter" aria-label="状态"><option value="all">全部状态</option><option value="failed">失败</option><option value="blocked">受阻</option><option value="warning">注意</option><option value="running">进行中</option><option value="passed">通过</option></select>
        <select v-if="replay.tasks?.length > 1" v-model="taskFilter" aria-label="任务"><option value="all">全部父子任务</option><option v-for="item in replay.tasks" :key="item.id" :value="item.id">{{ item.project || item.title }}</option></select>
        <label class="system-event-toggle"><input v-model="includeSystemEvents" type="checkbox" /><span>底层事件</span></label>
        <div class="issue-nav">
          <button type="button" :disabled="!issueEvents.length" title="上一个问题" @click="focusIssue(-1)">上一项</button>
          <span>{{ issueEvents.length ? `${Math.max(0, issuePosition) + 1}/${issueEvents.length}` : '无问题' }}</span>
          <button type="button" :disabled="!issueEvents.length" title="下一个问题" @click="focusIssue(1)">下一项</button>
        </div>
      </div>

      <div v-if="replay.tasks?.length" class="task-family-strip">
        <button v-for="item in replay.tasks" :key="item.id" type="button" :class="{ active: taskFilter === item.id }" @click="taskFilter = taskFilter === item.id ? 'all' : item.id">
          <span>{{ item.is_root ? '父任务' : item.project || '子任务' }}</span><strong>{{ item.title }}</strong><em>{{ statusLabel(item.status) }}</em>
        </button>
      </div>

      <div class="replay-workspace">
        <main>
          <div class="timeline-head"><strong>执行时间线</strong><span>显示 {{ visibleEvents.length }} / {{ allEvents.length }} 条</span></div>
          <TaskReplayTimeline :events="visibleEvents" :focused-event-id="focusedEventId" @open-evidence="openEvidence" />
        </main>
        <TaskReplayEvidence :evidence="replay.evidence || []" :focused-evidence-id="focusedEvidenceId" @open-code-changes="openCodeChanges" />
      </div>

      <details class="retention-details">
        <summary>记录保留与排查说明</summary>
        <div><p>任务时间线会保留到任务被永久删除。TestAgent 的截图、报告和日志默认保留 14 天，并受运行次数及总容量限制。</p><dl><template v-for="(value, key) in replay.retention || {}" :key="key"><dt>{{ retentionLabel(key) }}</dt><dd>{{ value.policy }}<span v-if="value.earliest_expiry"> · 最早于 {{ dateLabel(value.earliest_expiry) }} 到期</span></dd></template></dl></div>
      </details>
    </template>
  </section>
  <AgentCodeChangeDrawer
    :visible="codeChangeDrawer.visible"
    :title="codeChangeDrawer.title"
    :subtitle="codeChangeDrawer.subtitle"
    :project="codeChangeDrawer.project"
    :files="codeChangeDrawer.files"
    @close="codeChangeDrawer.visible = false"
  />
</template>

<style scoped>
.task-replay-page { height:100%; overflow:auto; padding:16px; background:var(--bg-primary); color:var(--text-primary); letter-spacing:0; }
.replay-toolbar { display:flex; justify-content:space-between; align-items:end; gap:16px; padding-bottom:14px; border-bottom:1px solid var(--border-color); }.toolbar-title strong { display:block; font-size:18px; }.toolbar-title span { display:block; margin-top:3px; color:var(--text-muted); font-size:12px; }.toolbar-lookup { display:flex; align-items:center; gap:6px; }.toolbar-lookup>span { color:var(--text-muted); font-size:11px; }.toolbar-lookup input,.replay-index-head input,.event-search,.replay-controls select { height:34px; min-width:0; border:1px solid var(--border-color); border-radius:6px; padding:0 9px; background:var(--surface); color:var(--text-primary); font-size:12px; }.toolbar-lookup input { width:170px; }.toolbar-lookup button,.back-button { height:34px; padding:0 12px; border:1px solid var(--accent-blue); border-radius:6px; background:var(--accent-blue); color:#fff; font-size:12px; font-weight:750; cursor:pointer; }.toolbar-lookup button:disabled { opacity:.6; }
.replay-error,.legacy-notice { margin-top:12px; padding:10px 12px; border:1px solid #fecaca; border-radius:8px; background:#fef2f2; color:#991b1b; font-size:12px; }.legacy-notice { margin:12px 0 0; border-color:#fde68a; background:#fffbeb; color:#92400e; }
.replay-index-head { display:flex; justify-content:space-between; align-items:center; gap:14px; padding:18px 0 10px; }.replay-index-head>div strong { display:block; font-size:14px; }.replay-index-head>div span { display:block; margin-top:2px; color:var(--text-muted); font-size:11px; }.replay-index-head input { width:min(330px,45vw); }.replay-index-list { border-top:1px solid var(--border-color); }.replay-index-row { display:grid; width:100%; grid-template-columns:10px minmax(0,1fr) auto; gap:12px; align-items:center; padding:13px 4px; border:0; border-bottom:1px solid var(--border-color); background:transparent; color:inherit; text-align:left; cursor:pointer; }.replay-index-row:hover { background:var(--bg-secondary); }.task-state-dot { width:8px; height:8px; border-radius:50%; background:#94a3b8; }.task-state-dot.done,.task-state-dot.completed { background:#16a34a; }.task-state-dot.in_progress,.task-state-dot.running { background:#2563eb; }.task-state-dot.failed,.task-state-dot.blocked { background:#dc2626; }.task-index-copy { min-width:0; }.task-index-copy strong,.task-index-copy small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.task-index-copy strong { font-size:13px; }.task-index-copy small { margin-top:3px; color:var(--text-muted); font-size:11px; }.task-index-meta { text-align:right; }.task-index-meta em,.task-index-meta small { display:block; }.task-index-meta em { color:var(--text-secondary); font-size:11px; font-style:normal; font-weight:750; }.task-index-meta small { margin-top:3px; color:var(--text-muted); font-size:10px; }.replay-loading { padding:50px 12px; color:var(--text-muted); text-align:center; font-size:13px; }
.replay-overview { padding:16px 0 12px; }.overview-heading { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:start; gap:14px; }.back-button { height:30px; border-color:var(--border-color); background:transparent; color:var(--text-secondary); }.overview-heading>div>span { color:var(--text-muted); font-size:11px; font-weight:750; }.overview-heading h1 { margin:2px 0 0; font-size:20px; line-height:1.35; overflow-wrap:anywhere; }.overview-heading p { max-width:850px; margin:5px 0 0; color:var(--text-secondary); font-size:12px; line-height:1.55; white-space:pre-wrap; }.overview-status { padding:4px 8px; border-radius:5px; background:var(--bg-secondary); color:var(--text-secondary); font-size:11px; font-weight:800; }.overview-status.done,.overview-status.completed { background:#dcfce7; color:#166534; }.overview-status.failed,.overview-status.blocked { background:#fee2e2; color:#991b1b; }.overview-metrics { display:grid; grid-template-columns:repeat(6,minmax(90px,1fr)); margin:15px 0 0; border:1px solid var(--border-color); border-radius:8px; overflow:hidden; background:var(--surface); }.overview-metrics>div { padding:10px 12px; border-right:1px solid var(--border-color); }.overview-metrics>div:last-child { border-right:0; }.overview-metrics>div.attention { background:#fffbeb; }.overview-metrics dt { color:var(--text-muted); font-size:10px; }.overview-metrics dd { margin:4px 0 0; font-size:16px; font-weight:800; }
.phase-strip { display:flex; overflow:auto; border-block:1px solid var(--border-color); background:var(--surface); }.phase-strip button { display:grid; flex:1 0 82px; grid-template-columns:8px minmax(0,1fr) auto; gap:6px; align-items:center; min-height:42px; padding:0 9px; border:0; border-right:1px solid var(--border-color); background:transparent; color:var(--text-secondary); cursor:pointer; }.phase-strip button.active { background:var(--accent-soft); color:var(--accent-blue); }.phase-strip button>span { width:7px; height:7px; border-radius:50%; background:#94a3b8; }.phase-strip button.passed>span { background:#16a34a; }.phase-strip button.running>span { background:#2563eb; }.phase-strip button.warning>span,.phase-strip button.blocked>span { background:#d97706; }.phase-strip button.failed>span { background:#dc2626; }.phase-strip strong { font-size:11px; }.phase-strip small { color:var(--text-muted); font-size:9px; }
.replay-controls { display:flex; flex-wrap:wrap; align-items:center; gap:7px; padding:12px 0; }.preset-control { display:flex; border:1px solid var(--border-color); border-radius:6px; overflow:hidden; }.preset-control button { height:32px; padding:0 9px; border:0; border-right:1px solid var(--border-color); background:var(--surface); color:var(--text-secondary); font-size:11px; cursor:pointer; }.preset-control button:last-child { border-right:0; }.preset-control button.active { background:var(--accent-blue); color:#fff; }.event-search { flex:1; min-width:160px; }.replay-controls select { max-width:150px; }.issue-nav { display:flex; align-items:center; gap:5px; margin-left:auto; }.issue-nav button { height:30px; padding:0 8px; border:1px solid var(--border-color); border-radius:5px; background:var(--surface); color:var(--text-secondary); font-size:10px; cursor:pointer; }.issue-nav button:disabled { opacity:.45; }.issue-nav span { min-width:44px; color:var(--text-muted); font-size:10px; text-align:center; }
.system-event-toggle { display:flex; align-items:center; gap:5px; height:32px; padding:0 8px; border:1px solid var(--border-color); border-radius:6px; background:var(--surface); color:var(--text-secondary); font-size:10px; font-weight:700; cursor:pointer; }.system-event-toggle input { width:14px; height:14px; margin:0; accent-color:var(--accent-blue); }
.task-family-strip { display:flex; gap:7px; overflow:auto; padding:0 0 12px; }.task-family-strip button { display:grid; grid-template-columns:auto minmax(110px,1fr) auto; align-items:center; gap:7px; flex:0 0 auto; max-width:300px; height:34px; padding:0 8px; border:1px solid var(--border-color); border-radius:6px; background:var(--surface); color:var(--text-secondary); cursor:pointer; }.task-family-strip button.active { border-color:var(--accent-blue); background:var(--accent-soft); }.task-family-strip span { color:var(--text-muted); font-size:9px; }.task-family-strip strong { overflow:hidden; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }.task-family-strip em { color:var(--text-muted); font-size:9px; font-style:normal; }
.replay-workspace { display:grid; grid-template-columns:minmax(0,1fr) minmax(250px,320px); gap:14px; align-items:start; }.replay-workspace>main { min-width:0; }.timeline-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:7px; padding-left:122px; }.timeline-head strong { font-size:13px; }.timeline-head span { color:var(--text-muted); font-size:10px; }
.retention-details { margin-top:16px; border-top:1px solid var(--border-color); padding-top:10px; }.retention-details summary { color:var(--text-muted); font-size:11px; font-weight:700; cursor:pointer; }.retention-details>div { padding:9px 0; color:var(--text-secondary); font-size:11px; line-height:1.55; }.retention-details p { margin:0 0 7px; }.retention-details dl { display:grid; grid-template-columns:110px minmax(0,1fr); gap:4px 10px; margin:0; }.retention-details dt { color:var(--text-muted); }.retention-details dd { margin:0; }.retention-details span { color:var(--text-muted); }
@media (max-width:1100px) { .replay-toolbar { align-items:start; }.toolbar-lookup { flex-wrap:wrap; justify-content:end; }.overview-metrics { grid-template-columns:repeat(3,1fr); }.overview-metrics>div:nth-child(3) { border-right:0; }.overview-metrics>div:nth-child(-n+3) { border-bottom:1px solid var(--border-color); }.replay-workspace { grid-template-columns:1fr; }.timeline-head { padding-left:0; } }
@media (max-width:720px) { .task-replay-page { padding:12px; }.replay-toolbar { display:grid; }.toolbar-lookup { display:grid; grid-template-columns:minmax(0,1fr) auto; }.toolbar-lookup input { width:100%; }.overview-heading { grid-template-columns:1fr auto; }.overview-heading .back-button { grid-column:1/-1; justify-self:start; }.overview-metrics { grid-template-columns:repeat(2,1fr); }.overview-metrics>div { border-bottom:1px solid var(--border-color); }.overview-metrics>div:nth-child(2n) { border-right:0; }.overview-metrics>div:nth-last-child(-n+2) { border-bottom:0; }.replay-index-head { display:grid; }.replay-index-head input { width:100%; }.replay-index-row { grid-template-columns:10px minmax(0,1fr); }.task-index-meta { grid-column:2; display:flex; justify-content:space-between; text-align:left; }.preset-control { width:100%; overflow:auto; }.preset-control button { flex:1 0 auto; }.event-search { flex-basis:100%; }.issue-nav { margin-left:0; }.retention-details dl { grid-template-columns:1fr; } }
</style>
