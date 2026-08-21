<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import AgentCodeChangeDrawer from '../agents/AgentCodeChangeDrawer.vue'
import TaskReplayDelivery from '../replay/TaskReplayDelivery.vue'
import TaskReplayExecutiveSummary from '../replay/TaskReplayExecutiveSummary.vue'
import TaskReplayChapters from '../replay/TaskReplayChapters.vue'
import TaskReplayAcceptanceMatrix from '../replay/TaskReplayAcceptanceMatrix.vue'
import TaskReplayEvidence from '../replay/TaskReplayEvidence.vue'
import TaskReplayPlanBoard from '../replay/TaskReplayPlanBoard.vue'
import TaskReplayTimeline from '../replay/TaskReplayTimeline.vue'
import TaskReplayInsights from '../replay/TaskReplayInsights.vue'
import WorkspacePageShell from '../common/WorkspacePageShell.vue'
import WorkspaceSectionNav from '../common/WorkspaceSectionNav.vue'
import { subscribeRuntimeEvents } from '../../utils/runtimeEventBus.js'
import { compactTaskReplayEvents, replayCompactionStats } from '../../utils/taskReplayEventCompaction.js'
import { isReplayDiagnosticEvent, replayEventSummary, replayEventTitle, replayStageLabel } from '../../utils/taskReplayPresentation.js'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigate'])
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
const pendingReplayTarget = ref(null)
const issuePosition = ref(-1)
const includeSystemEvents = ref(false)
const replayView = ref(sessionStorage.getItem('ccm:replay-layout:v1:view') || 'summary')
const currentReplaySection = ref('result')
const replayViews = [{ id: 'summary', label: '摘要' }, { id: 'advanced', label: '完整记录' }]
const replaySections = [
  { id: 'result', label: '结果与下一步' },
  { id: 'integrity', label: '完整度与因果链' },
  { id: 'acceptance', label: '验收标准' },
  { id: 'attempts', label: '尝试对比' },
  { id: 'timeline', label: '完整时间线' },
]
const selectReplaySection = id => {
  currentReplaySection.value = id
  requestAnimationFrame(() => document.getElementById(`replay-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
watch(replayView, value => sessionStorage.setItem('ccm:replay-layout:v1:view', value))
const timelineMode = ref('key')
const chapterFilter = ref('all')
const codeChangeDrawer = ref({ visible: false, title: '', subtitle: '', project: '', files: [] })
const freshness = ref(null)
const freshnessLoading = ref(false)
const indexPage = ref(1)
const indexFilters = reactive({ project: '', groupId: '', status: '', range: 'all' })
const loadingOlder = ref(false)
const liveRefreshing = ref(false)
const lastLiveUpdateAt = ref('')
const EVENT_PAGE_SIZE = 120
const INDEX_PAGE_SIZE = 24
let unsubscribeRuntimeEvents = null
let indexReloadTimer = null
let eventReloadTimer = null
let liveRefreshTimer = null
let fallbackTimer = null
let requestGeneration = 0
const requestControllers = new Map()

const beginRequest = (kind) => {
  requestControllers.get(kind)?.abort()
  const controller = new AbortController()
  const generation = ++requestGeneration
  requestControllers.set(kind, controller)
  return { kind, controller, generation }
}
const requestIsCurrent = request => requestControllers.get(request.kind) === request.controller && !request.controller.signal.aborted
const finishRequest = request => { if (requestControllers.get(request.kind) === request.controller) requestControllers.delete(request.kind) }

const taskRows = computed(() => index.value?.tasks || [])
const visibleTaskRows = computed(() => taskRows.value)
const indexFacets = computed(() => index.value?.facets || { projects: [], groups: [], statuses: [] })
const eventPage = computed(() => replay.value?.event_page || { offset: 0, returned: allEvents.value.length, total: allEvents.value.length, has_previous: false, has_more: false })
const allEvents = computed(() => replay.value?.events || [])
const presentation = computed(() => replay.value?.presentation || null)
const canManageReplay = computed(() => replay.value?.replay_capabilities?.technical_events !== false)
const CHAPTER_STAGES = { requirement: ['intake'], planning: ['planning'], implementation: ['dispatch', 'execution', 'change'], verification: ['test', 'review'], rework: ['rework'], delivery: ['completion'] }
const issueEvents = computed(() => allEvents.value.filter(item => ['failed', 'blocked', 'warning'].includes(item.status)))
const diagnosticEventCount = computed(() => Math.max(
  Number(replay.value?.summary?.technical_event_count || 0),
  allEvents.value.filter(isReplayDiagnosticEvent).length,
))
const overviewKeyEventCount = computed(() => compactTaskReplayEvents(allEvents.value.filter(item => !isReplayDiagnosticEvent(item))).length)
const visibleEvents = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return allEvents.value.filter(item => {
    if (chapterFilter.value !== 'all' && !(CHAPTER_STAGES[chapterFilter.value] || []).includes(item.stage)) return false
    if (!includeSystemEvents.value && isReplayDiagnosticEvent(item)) return false
    if (stageFilter.value !== 'all' && item.stage !== stageFilter.value) return false
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) return false
    if (actorFilter.value !== 'all' && item.actor?.type !== actorFilter.value) return false
    if (taskFilter.value !== 'all' && item.task_id !== taskFilter.value) return false
    const haystack = `${replayEventTitle(item)} ${replayEventSummary(item)} ${item.title} ${item.summary} ${item.actor?.label} ${item.project} ${item.category}`.toLowerCase()
    if (needle && !haystack.includes(needle)) return false
    if (preset.value === 'issues' && !['failed', 'blocked', 'warning'].includes(item.status)) return false
    if (preset.value === 'failed' && item.status !== 'failed') return false
    if (preset.value === 'test' && !(item.actor?.type === 'test_agent' || item.stage === 'test')) return false
    if (preset.value === 'browser' && !/browser|playwright|screenshot|页面|浏览器/i.test(haystack)) return false
    if (preset.value === 'changes' && !['change', 'execution', 'rework'].includes(item.stage)) return false
    return true
  })
})
const compactEvents = computed(() => compactTaskReplayEvents(visibleEvents.value))
const timelineEvents = computed(() => timelineMode.value === 'raw' ? visibleEvents.value : compactEvents.value)
const timelineStats = computed(() => replayCompactionStats(visibleEvents.value, compactEvents.value))
const durationLabel = computed(() => {
  const start = Date.parse(replay.value?.started_at || '')
  const end = Date.parse(replay.value?.finished_at || '') || Date.now()
  if (!Number.isFinite(start)) return '时间未知'
  const seconds = Math.max(0, Math.round((end - start) / 1000))
  if (seconds < 60) return `${seconds} 秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
  return `${Math.floor(seconds / 3600)} 小时 ${Math.floor((seconds % 3600) / 60)} 分`
})
const usageLabel = (value, suffix = '') => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '未记录'
  const count = Number(value)
  if (suffix) return `${count} ${suffix}`
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}K`
  return String(count)
}
const isReplayRunning = computed(() => !!replay.value && replay.value.completed !== true)
const loadedEventLabel = computed(() => `${allEvents.value.length} / ${eventPage.value.total ?? replay.value?.summary?.event_count ?? allEvents.value.length}`)
const statusLabel = (value) => ({ pending: '待执行', in_progress: '执行中', running: '执行中', done: '已完成', completed: '已完成', failed: '失败', blocked: '受阻', cancelled: '已取消', passed: '通过', warning: '注意', info: '记录' }[value] || value || '未知')
const stageLabel = replayStageLabel
const recoveryPhaseLabel = value => {
  const phase = String(value || '').toLowerCase()
  if (/accept|verify|review|summary|deliver|test/.test(phase)) return '验证与交付'
  if (/dispatch|queue|dependency|merge|wake/.test(phase)) return '协调与分派'
  if (/execut|work|rework/.test(phase)) return '实施处理'
  return '当前阶段'
}
const dateLabel = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false })
}
const retentionLabel = (key) => ({ task_record: '任务记录', trace: '完整执行记录', test_agent: 'TestAgent（独立验收）证据' }[key] || key)
const freshnessLabel = value => ({ current: '与当前代码一致', drifted: '当前代码已变化', deleted: '文件已删除', permission_revoked: '权限已撤销', unavailable: '当前不可读取', unknown: '缺少可比较基线' }[value] || value || '尚未检查')
const selectChapter = chapter => {
  chapterFilter.value = chapter?.kind || 'all'
  stageFilter.value = 'all'
  preset.value = 'all'
  requestAnimationFrame(() => document.querySelector('.full-replay-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
const openConversationLink = link => {
  if (!link) return
  if (link.url) {
    window.open(link.url, '_blank', 'noopener,noreferrer')
    return
  }
  emit('navigate', { tab: 'group-chat', groupId: link.groupId, messageId: link.messageId })
}
const focusReplayEvent = eventId => {
  if (!eventId) return
  focusedEventId.value = String(eventId)
  preset.value = 'all'
  chapterFilter.value = 'all'
  stageFilter.value = 'all'
  statusFilter.value = 'all'
  actorFilter.value = 'all'
  taskFilter.value = 'all'
  search.value = ''
  requestAnimationFrame(() => document.querySelector('.full-replay-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
const handleReplayAction = async action => {
  if (!action) return
  if (action.type === 'open-code-changes') {
    openCodeChanges({
      title: action.title || '任务交付代码改动',
      subtitle: action.subtitle || '查看任务关联的代码变更',
      project: action.project || '',
      files: action.files || [],
    })
    return
  }
  if (action.type === 'navigate-task') {
    emit('navigate', { tab: 'tasks', taskId: action.taskId || taskId.value })
    return
  }
  if (action.type === 'open-evidence') {
    openEvidence(action.evidenceId)
    return
  }
  const kind = String(action.kind || '').toLowerCase()
  if (['retry', 'resume_interrupted', 'resume_paused', 'continue'].includes(kind)) {
    const id = String(action.taskId || action.task_id || taskId.value || '').trim()
    if (!id) return
    error.value = ''
    try {
      const response = await fetch('/api/tasks/resume-interrupted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: id,
          revision: Number(action.revision || 0),
          generation: Number(action.generation || 0),
          binding_checksum: action.bindingChecksum || action.binding_checksum || '',
          idempotency_key: `replay-resume:${id}:${action.revision || 0}:${action.generation || 0}`,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) throw new Error(data.error || '任务恢复前检查未通过')
      emit('navigate', { tab: 'tasks', taskId: id, recovery: data.user_session || data.recovery_preflight || null })
      await loadReplay(id)
    } catch (e) {
      error.value = e?.message || '任务恢复失败'
    }
  }
}
const navigateToExecution = event => {
  if (!event?.task_id) return
  emit('navigate', { tab: 'tasks', taskId: event.task_id })
}
const printUserReport = () => {
  window.print()
}
const loadFreshness = async () => {
  if (!taskId.value || freshnessLoading.value) return
  freshnessLoading.value = true
  try {
    const response = await fetch(`/api/tasks/replay/freshness?task_id=${encodeURIComponent(taskId.value)}`)
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '代码新鲜度校验失败')
    freshness.value = data.freshness
  } catch (e) {
    error.value = e.message || '代码新鲜度校验失败'
  } finally {
    freshnessLoading.value = false
  }
}
const downloadAuditJson = () => {
  if (!replay.value) return
  const blob = new Blob([JSON.stringify(replay.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `trace-audit-${taskId.value || 'export'}-${Date.now()}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const indexDateRange = () => {
  if (indexFilters.range === '7') return { range: '7' }
  if (indexFilters.range === '30') return { range: '30' }
  if (indexFilters.range === '90') return { range: '90' }
  return {}
}
const loadIndex = async ({ resetPage = false } = {}) => {
  const request = beginRequest('index')
  if (resetPage) indexPage.value = 1
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ limit: String(INDEX_PAGE_SIZE), page: String(indexPage.value) })
    if (listSearch.value.trim()) params.set('q', listSearch.value.trim())
    if (indexFilters.project) params.set('project', indexFilters.project)
    if (indexFilters.groupId) params.set('group_id', indexFilters.groupId)
    if (indexFilters.status) params.set('status', indexFilters.status)
    for (const [key, value] of Object.entries(indexDateRange())) params.set(key, value)
    const response = await fetch(`/api/tasks/replay?${params}`, { signal: request.controller.signal })
    const data = await response.json()
    if (!requestIsCurrent(request)) return
    if (!response.ok || data.success === false) throw new Error(data.error || '任务记录读取失败')
    index.value = data.index
  } catch (e) {
    if (e?.name === 'AbortError') return
    if (!requestIsCurrent(request)) return
    error.value = e.message || '任务记录读取失败'
  } finally {
    if (requestIsCurrent(request)) loading.value = false
    finishRequest(request)
  }
}

const appendEventFilters = (params) => {
  if (stageFilter.value !== 'all') params.set('stage', stageFilter.value)
  if (statusFilter.value !== 'all') params.set('event_status', statusFilter.value)
  if (actorFilter.value !== 'all') params.set('actor', actorFilter.value)
  if (taskFilter.value !== 'all') params.set('event_task_id', taskFilter.value)
  if (preset.value === 'failed') params.set('event_status', 'failed')
  else if (preset.value !== 'all') params.set('preset', preset.value)
  if (search.value.trim()) params.set('event_query', search.value.trim())
  if (includeSystemEvents.value) params.set('include_system_events', '1')
  return params
}

const replayRequestParams = (id, extra = {}) => {
  const params = new URLSearchParams({ task_id: id, event_limit: String(extra.limit || EVENT_PAGE_SIZE) })
  if (extra.tail) params.set('event_tail', '1')
  if (Number.isFinite(extra.offset)) params.set('event_offset', String(extra.offset))
  if (extra.after?.at) {
    params.set('after_event_at', extra.after.at)
    params.set('after_event_id', extra.after.id || '')
  }
  return appendEventFilters(params)
}

const mergeEvents = (...groups) => {
  const rows = new Map()
  for (const item of groups.flat()) if (item?.id) rows.set(item.id, item)
  return [...rows.values()].sort((a, b) => String(a.at).localeCompare(String(b.at)) || String(a.id).localeCompare(String(b.id)))
}

const applyReplayPayload = (nextReplay, events, page = nextReplay?.event_page) => {
  replay.value = { ...(replay.value || {}), ...nextReplay, events, event_page: page }
}
const replayViewStorageKey = id => `ccm:task-replay-view:${id}`
const saveReplayViewState = () => {
  if (!taskId.value || !replay.value) return
  const state = { search: search.value, stage: stageFilter.value, status: statusFilter.value, actor: actorFilter.value, task: taskFilter.value, preset: preset.value, chapter: chapterFilter.value, event: focusedEventId.value, evidence: focusedEvidenceId.value, timeline: timelineMode.value, scrollTop: document.querySelector('.task-replay-page')?.scrollTop || 0 }
  try { sessionStorage.setItem(replayViewStorageKey(taskId.value), JSON.stringify(state)) } catch {}
  const url = new URL(window.location.href)
  const values = { replay_event: state.event, replay_preset: state.preset === 'all' ? '' : state.preset, replay_stage: state.stage === 'all' ? '' : state.stage, replay_query: state.search }
  for (const [key, value] of Object.entries(values)) value ? url.searchParams.set(key, value) : url.searchParams.delete(key)
  window.history.replaceState(window.history.state, '', url)
}
const restoreReplayViewState = () => {
  let state = null
  try { state = JSON.parse(sessionStorage.getItem(replayViewStorageKey(taskId.value)) || 'null') } catch {}
  const url = new URL(window.location.href)
  state = { ...(state || {}), ...(url.searchParams.get('replay_event') ? { event: url.searchParams.get('replay_event') } : {}), ...(url.searchParams.get('replay_preset') ? { preset: url.searchParams.get('replay_preset') } : {}), ...(url.searchParams.get('replay_stage') ? { stage: url.searchParams.get('replay_stage') } : {}), ...(url.searchParams.get('replay_query') ? { search: url.searchParams.get('replay_query') } : {}) }
  if (!state) return
  search.value = state.search || ''; stageFilter.value = state.stage || 'all'; statusFilter.value = state.status || 'all'; actorFilter.value = state.actor || 'all'; taskFilter.value = state.task || 'all'; preset.value = state.preset || 'all'; chapterFilter.value = state.chapter || 'all'; focusedEventId.value = state.event || ''; focusedEvidenceId.value = state.evidence || ''; timelineMode.value = state.timeline || 'key'
  requestAnimationFrame(() => { const page = document.querySelector('.task-replay-page'); if (page && Number.isFinite(Number(state.scrollTop))) page.scrollTop = Number(state.scrollTop) })
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

const loadLegacyTrace = async (signal) => {
  const base = scope.value === 'global' ? '/api/global-agent/trace-replay' : '/api/orchestrator/trace-replay'
  const response = await fetch(`${base}?trace_id=${encodeURIComponent(traceId.value)}`, { signal })
  const data = await response.json()
  if (!response.ok || data.success === false) throw new Error(data.error || 'Trace 不存在')
  replay.value = syntheticLegacyReplay(data.replay)
}

const loadReplay = async (id = taskId.value) => {
  const selected = String(id || '').trim()
  const request = beginRequest('replay')
  if (selected) taskId.value = selected
  loading.value = true
  error.value = ''
  focusedEventId.value = ''
  focusedEvidenceId.value = ''
  freshness.value = null
  try {
    if (!selected && traceId.value.trim()) {
      if (!index.value) await loadIndex()
      const target = taskRows.value.find(item => item.trace_id === traceId.value.trim())
      if (target) return await loadReplay(target.id)
      await loadLegacyTrace(request.controller.signal)
      if (!requestIsCurrent(request)) return
      return
    }
    if (!selected) {
      replay.value = null
      await loadIndex()
      return
    }
    const response = await fetch(`/api/tasks/replay?${replayRequestParams(selected, { tail: true })}`, { signal: request.controller.signal })
    const data = await response.json()
    if (!requestIsCurrent(request) || selected !== String(taskId.value || selected)) return
    if (!response.ok || data.success === false) throw new Error(data.error || '任务回放读取失败')
    taskId.value = selected
    replay.value = data.replay
    lastLiveUpdateAt.value = new Date().toISOString()
    traceId.value = data.replay?.tasks?.find(item => item.id === selected)?.trace_id || data.replay?.tasks?.[0]?.trace_id || traceId.value
    stageFilter.value = 'all'; chapterFilter.value = 'all'; statusFilter.value = 'all'; actorFilter.value = 'all'; taskFilter.value = 'all'; preset.value = 'all'; search.value = ''; includeSystemEvents.value = false; timelineMode.value = 'key'
    if (pendingReplayTarget.value) applyReplayFocus(pendingReplayTarget.value)
    else restoreReplayViewState()
    pendingReplayTarget.value = null
  } catch (e) {
    if (e?.name === 'AbortError') return
    if (!requestIsCurrent(request)) return
    error.value = e.message || '任务回放读取失败'
  } finally {
    if (requestIsCurrent(request)) loading.value = false
    finishRequest(request)
  }
}

const loadOlderEvents = async () => {
  if (!replay.value || !eventPage.value.has_previous || loadingOlder.value) return
  loadingOlder.value = true
  const selectedTaskId = taskId.value
  const request = beginRequest('older-events')
  error.value = ''
  try {
    const previousOffset = Math.max(0, Number(eventPage.value.previous_offset || 0))
    const limit = Math.max(1, Number(eventPage.value.offset || 0) - previousOffset)
    const response = await fetch(`/api/tasks/replay/events?${replayRequestParams(selectedTaskId, { offset: previousOffset, limit })}`, { signal: request.controller.signal })
    const data = await response.json()
    if (!requestIsCurrent(request) || selectedTaskId !== taskId.value) return
    if (!response.ok || data.success === false) throw new Error(data.error || '更早记录读取失败')
    const events = mergeEvents(data.replay?.events || [], allEvents.value)
    applyReplayPayload(data.replay, events, {
      ...data.replay.event_page,
      returned: events.length,
      has_more: false,
      next_offset: Number(data.replay.event_page?.offset || 0) + events.length,
      last_cursor: events.at(-1) ? { at: events.at(-1).at, id: events.at(-1).id } : null,
    })
  } catch (e) {
    if (e?.name === 'AbortError') return
    if (!requestIsCurrent(request)) return
    error.value = e.message || '更早记录读取失败'
  } finally {
    if (requestIsCurrent(request)) loadingOlder.value = false
    finishRequest(request)
  }
}

const reloadEventWindow = async () => {
  if (!replay.value || !taskId.value) return
  loading.value = true
  const selectedTaskId = taskId.value
  const request = beginRequest('event-window')
  error.value = ''
  try {
    const response = await fetch(`/api/tasks/replay/events?${replayRequestParams(selectedTaskId, { tail: true })}`, { signal: request.controller.signal })
    const data = await response.json()
    if (!requestIsCurrent(request) || selectedTaskId !== taskId.value) return
    if (!response.ok || data.success === false) throw new Error(data.error || '任务记录筛选失败')
    applyReplayPayload(data.replay, data.replay?.events || [], data.replay?.event_page)
    issuePosition.value = -1
  } catch (e) {
    if (e?.name === 'AbortError') return
    if (!requestIsCurrent(request)) return
    error.value = e.message || '任务记录筛选失败'
  } finally {
    if (requestIsCurrent(request)) loading.value = false
    finishRequest(request)
  }
}

const refreshLiveReplay = async () => {
  if (!replay.value || !taskId.value || liveRefreshing.value) return
  liveRefreshing.value = true
  const selectedTaskId = taskId.value
  const request = beginRequest('live-events')
  let morePending = false
  try {
    const cursor = eventPage.value.last_cursor || (allEvents.value.at(-1) ? { at: allEvents.value.at(-1).at, id: allEvents.value.at(-1).id } : null)
    const params = replayRequestParams(selectedTaskId, cursor ? { after: cursor, limit: 200 } : { tail: true })
    const response = await fetch(`/api/tasks/replay/events?${params}`, { signal: request.controller.signal })
    const data = await response.json()
    if (!requestIsCurrent(request) || selectedTaskId !== taskId.value) return
    if (!response.ok || data.success === false || !data.replay) return
    const events = mergeEvents(allEvents.value, data.replay.events || [])
    const firstOffset = Number(eventPage.value.offset || 0)
    applyReplayPayload(data.replay, events, {
      ...data.replay.event_page,
      mode: 'live',
      offset: firstOffset,
      returned: events.length,
      has_previous: firstOffset > 0,
      previous_offset: Math.max(0, firstOffset - EVENT_PAGE_SIZE),
      last_cursor: events.at(-1) ? { at: events.at(-1).at, id: events.at(-1).id } : data.replay.event_page?.last_cursor,
    })
    morePending = data.replay.event_page?.has_more === true
    lastLiveUpdateAt.value = new Date().toISOString()
  } catch (e) {
    if (e?.name === 'AbortError') return
  } finally {
    if (requestIsCurrent(request)) liveRefreshing.value = false
    finishRequest(request)
    if (morePending && selectedTaskId === taskId.value) scheduleLiveRefresh(40)
  }
}

const showIndex = async () => {
  for (const controller of requestControllers.values()) controller.abort()
  requestControllers.clear()
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
const changeIndexPage = async (direction) => {
  const next = indexPage.value + direction
  if (next < 1 || next > Number(index.value?.page_count || 1)) return
  indexPage.value = next
  await loadIndex()
}
const clearIndexFilters = () => {
  listSearch.value = ''
  indexFilters.project = ''
  indexFilters.groupId = ''
  indexFilters.status = ''
  indexFilters.range = 'all'
}
const scheduleIndexReload = () => {
  if (replay.value) return
  window.clearTimeout(indexReloadTimer)
  indexReloadTimer = window.setTimeout(() => loadIndex({ resetPage: true }), 280)
}
const scheduleEventReload = () => {
  if (!replay.value) return
  window.clearTimeout(eventReloadTimer)
  eventReloadTimer = window.setTimeout(reloadEventWindow, 240)
}
const scheduleLiveRefresh = (delay = 180) => {
  window.clearTimeout(liveRefreshTimer)
  liveRefreshTimer = window.setTimeout(refreshLiveReplay, delay)
}

const applyReplayFocus = (target = {}) => {
  if (!target) return
  if (['all', 'failed', 'issues', 'test', 'browser', 'changes'].includes(target.preset)) preset.value = target.preset
  if (['all', 'failed', 'blocked', 'warning', 'running', 'passed'].includes(target.event_status || target.eventStatus)) statusFilter.value = target.event_status || target.eventStatus
  search.value = String(target.event_query || target.eventQuery || '')
  focusedEventId.value = String(target.event_id || target.eventId || '')
  focusedEvidenceId.value = String(target.evidence_id || target.evidenceId || '')
  if (target.timeline_mode === 'raw' || target.timelineMode === 'raw') timelineMode.value = 'raw'
}
const applyReplayTarget = (target = {}) => {
  if (!target) return false
  if (target.scope) scope.value = target.scope === 'global' ? 'global' : 'orchestrator'
  pendingReplayTarget.value = { ...target }
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
  unsubscribeRuntimeEvents = subscribeRuntimeEvents(['task', 'agent'], event => {
    const changedTaskId = String(event?.data?.taskId || event?.data?.task_id || '')
    const familyIds = new Set((replay.value?.tasks || []).map(item => String(item.id)))
    if (!replay.value) {
      scheduleIndexReload()
      return
    }
    if (!changedTaskId || familyIds.has(changedTaskId)) scheduleLiveRefresh()
  })
  fallbackTimer = window.setInterval(() => {
    if (replay.value) refreshLiveReplay()
    else loadIndex()
  }, 60000)
  await loadIndex()
  if (taskId.value || traceId.value) await loadReplay()
})
onUnmounted(() => {
  window.removeEventListener('trace-replay-target', handleReplayTarget)
  unsubscribeRuntimeEvents?.()
  window.clearInterval(fallbackTimer)
  window.clearTimeout(indexReloadTimer)
  window.clearTimeout(eventReloadTimer)
  window.clearTimeout(liveRefreshTimer)
  for (const controller of requestControllers.values()) controller.abort()
  requestControllers.clear()
})
watch(() => props.navigateTo, (target) => { if (target?.tab === 'trace-replay' && applyReplayTarget(target)) loadReplay() })
watch([listSearch, () => indexFilters.project, () => indexFilters.groupId, () => indexFilters.status, () => indexFilters.range], scheduleIndexReload)
watch([search, stageFilter, statusFilter, actorFilter, taskFilter, preset, includeSystemEvents], scheduleEventReload)
watch([search, stageFilter, statusFilter, actorFilter, taskFilter, preset, chapterFilter, focusedEventId, focusedEvidenceId, timelineMode], saveReplayViewState)
</script>

<template>
  <WorkspacePageShell
    v-model:active-view="replayView"
    title="任务回放"
    description="从最终结果向下查看验收、因果链和完整执行证据"
    :views="replayViews"
    storage-key="ccm:replay-layout:v1"
  >
    <template #actions>
      <details v-if="replayView === 'advanced'" class="toolbar-diagnostic-lookup">
        <summary>按任务编号查找</summary>
        <div class="toolbar-lookup">
          <input v-model="taskId" aria-label="任务编号" placeholder="输入任务编号" @keyup.enter="loadReplay()" />
          <button type="button" :disabled="loading" @click="loadReplay()">{{ loading ? '读取中' : '打开' }}</button>
        </div>
      </details>
    </template>
  <section class="task-replay-page">
    <div v-if="error" class="replay-error">{{ error }}</div>

    <template v-if="!replay">
      <div class="replay-index-head">
        <div>
          <strong>任务记录</strong>
          <span class="font-mono">找到 {{ index?.total || 0 }} 条，全部 {{ index?.total_all || 0 }} 条</span>
        </div>
        <button v-if="listSearch || indexFilters.project || indexFilters.groupId || indexFilters.status || indexFilters.range !== 'all'" type="button" class="clear-filters" @click="clearIndexFilters">清除筛选</button>
      </div>
      <div class="replay-index-filters">
        <label class="index-search">
          <span>搜索</span>
          <input v-model="listSearch" placeholder="标题、目标或任务编号..." />
        </label>
        <label>
          <span>项目</span>
          <select v-model="indexFilters.project">
            <option value="">全部项目</option>
            <option v-for="item in indexFacets.projects" :key="item.value" :value="item.value">{{ item.label }} · {{ item.count }}</option>
          </select>
        </label>
        <label>
          <span>群聊</span>
          <select v-model="indexFilters.groupId">
            <option value="">全部群聊</option>
            <option v-for="item in indexFacets.groups" :key="item.value" :value="item.value">{{ item.label }} · {{ item.count }}</option>
          </select>
        </label>
        <label>
          <span>状态</span>
          <select v-model="indexFilters.status">
            <option value="">全部状态</option>
            <option v-for="item in indexFacets.statuses" :key="item.value" :value="item.value">{{ statusLabel(item.label) }} · {{ item.count }}</option>
          </select>
        </label>
        <label>
          <span>时间</span>
          <select v-model="indexFilters.range">
            <option value="all">全部时间</option>
            <option value="7">最近 7 天</option>
            <option value="30">最近 30 天</option>
            <option value="90">最近 90 天</option>
          </select>
        </label>
      </div>
      <div v-if="loading && !taskRows.length" class="replay-loading">正在整理任务记录…</div>
      <div v-else class="replay-index-list">
        <button v-for="item in visibleTaskRows" :key="item.id" type="button" class="replay-index-row" @click="loadReplay(item.id)">
          <span :class="['task-state-dot', item.status]"></span>
          <span class="task-index-copy">
            <strong>{{ item.title }}</strong>
            <small>{{ item.goal || '未记录任务目标' }}</small>
            <span class="task-index-tags">
              <em v-if="item.group_name">{{ item.group_name }}</em>
              <em v-for="project in item.projects || []" :key="project">{{ project }}</em>
            </span>
          </span>
          <span class="task-index-meta font-mono">
            <em>{{ item.current_stage_label || statusLabel(item.status) }}</em>
            <small><b v-if="item.unresolved_issue_count">{{ item.unresolved_issue_count }} 项待处理 · </b>{{ item.child_count }} 个子任务 · {{ dateLabel(item.updated_at) }}</small>
          </span>
        </button>
        <div v-if="!visibleTaskRows.length" class="replay-loading">没有匹配的任务</div>
      </div>
      <div v-if="(index?.page_count || 1) > 1" class="index-pagination font-mono">
        <button type="button" :disabled="!index?.has_previous || loading" @click="changeIndexPage(-1)">上一页</button>
        <span>第 {{ index?.page || 1 }} / {{ index?.page_count || 1 }} 页</span>
        <button type="button" :disabled="!index?.has_more || loading" @click="changeIndexPage(1)">下一页</button>
      </div>
    </template>

    <template v-else>
      <div class="replay-chapter-nav"><WorkspaceSectionNav :sections="replaySections" :active-section="currentReplaySection" collapsible-on-mobile @update:active-section="selectReplaySection" /></div>
      <div class="replay-overview">
        <div class="overview-heading">
          <button type="button" class="back-button" @click="showIndex">返回任务列表</button>
          <div>
            <span>完整任务链</span>
            <h1>{{ replay.title }}</h1>
            <p>{{ replay.goal }}</p>
          </div>
          <div class="overview-state font-mono">
            <span :class="['overview-status', replay.status]">{{ statusLabel(replay.status) }}</span>
            <span :class="['live-state', { active: isReplayRunning }]">{{ liveRefreshing ? '正在同步' : isReplayRunning ? '实时更新' : '记录已完成' }}</span>
          </div>
        </div>
        <div v-if="replay.legacy" class="legacy-notice">这条旧记录没有完整任务关联，因此只能显示系统仍保留的诊断事件。</div>
      </div>

      <div id="replay-section-result" class="replay-section-anchor"><TaskReplayExecutiveSummary v-if="presentation" :presentation="presentation" :navigation="replay.navigation || []" @navigate="openConversationLink" /></div>
      <section v-if="replay.schedule_origin" class="schedule-origin-card">
        <div>
          <strong>由定时规则生成</strong>
          <span class="font-mono">计划时间 {{ dateLabel(replay.schedule_origin.scheduledFor) }} · {{ replay.schedule_origin.trigger === 'manual' ? '立即运行' : replay.schedule_origin.trigger === 'recovery' ? '停机补跑' : '计划触发' }}</span>
        </div>
        <button type="button" @click="emit('navigate', { tab: 'cron', cronJobId: replay.schedule_origin.cronJobId, cronRunId: replay.schedule_origin.cronRunId })">返回定时任务运行记录</button>
      </section>

      <div class="replay-report-actions">
        <button type="button" @click="printUserReport">打印用户报告 / 保存 PDF</button>
        <button type="button" :disabled="freshnessLoading" @click="loadFreshness">{{ freshnessLoading ? '正在校验…' : '校验当前代码状态' }}</button>
        <button v-if="canManageReplay" type="button" @click="downloadAuditJson">导出安全审计 JSON</button>
      </div>

      <div id="replay-section-integrity" class="replay-section-anchor"><TaskReplayInsights v-if="presentation" :presentation="presentation" section="overview" @focus-event="focusReplayEvent" @handle-action="handleReplayAction" /></div>

      <section v-if="freshness" class="replay-freshness">
        <header>
          <div>
            <strong>历史证据与当前代码</strong>
            <small>保留执行时结论，同时重新读取当前权威仓库状态</small>
          </div>
          <em class="font-mono">{{ dateLabel(freshness.checkedAt) }}</em>
        </header>
        <div class="freshness-grid">
          <article v-for="row in freshness.projects || []" :key="row.project" :class="row.freshness">
            <strong>{{ row.project }}</strong>
            <b>{{ freshnessLabel(row.freshness) }}</b>
            <small class="font-mono">{{ row.files?.length || 0 }} 个交付文件</small>
          </article>
          <article v-if="!(freshness.projects || []).length">
            <strong>没有项目文件证据</strong>
            <b>无需校验仓库</b>
          </article>
        </div>
      </section>

      <details class="replay-summary-metrics" open>
        <summary>任务统计与资源使用</summary>
        <dl class="overview-metrics font-mono">
          <div><dt>总耗时</dt><dd>{{ durationLabel }}</dd></div>
          <div><dt>关键节点</dt><dd>{{ overviewKeyEventCount }}</dd></div>
          <div><dt>执行任务</dt><dd>{{ Math.max(0, (replay.summary?.task_count || 1) - 1) }}</dd></div>
          <div><dt>TestAgent 验收</dt><dd>{{ replay.summary?.test_run_count || 0 }}</dd></div>
          <div :class="{ attention: presentation?.outcome?.unresolvedIssueCount || replay.summary?.issue_count }"><dt>当前未解决</dt><dd>{{ presentation?.outcome?.unresolvedIssueCount ?? replay.summary?.issue_count ?? 0 }}</dd></div>
          <div><dt>验证材料</dt><dd>{{ replay.summary?.evidence_count || 0 }}</dd></div>
        </dl>
        <div class="replay-consumption font-mono">
          <span><small>模型调用</small><b>{{ usageLabel(replay.summary?.model_call_count, '次') }}</b></span>
          <span><small>Provider 重试</small><b>{{ usageLabel(replay.summary?.provider_retry_count, '次') }}</b></span>
          <span><small>TestAgent 轮次</small><b>{{ usageLabel(replay.summary?.test_run_count, '轮') }}</b></span>
          <span><small>已记录 Token</small><b>{{ usageLabel(replay.summary?.token_count) }}</b></span>
          <p>只显示任务账本中实际记录的数据，缺失项不会估算。</p>
        </div>
      </details>

      <div id="replay-section-acceptance" class="replay-section-anchor"><TaskReplayAcceptanceMatrix v-if="presentation" :rows="presentation.acceptanceMatrix || []" @open-evidence="openEvidence" /></div>

      <div id="replay-section-attempts" class="replay-section-anchor"><TaskReplayInsights v-if="presentation" :presentation="presentation" section="attempts" /></div>

      <TaskReplayDelivery :deliveries="replay.deliveries || []" :tasks="replay.tasks || []" />

      <TaskReplayPlanBoard :plans="replay.plans || []" :work-items="replay.work_items || []" :tasks="replay.tasks || []" @open-evidence="openEvidence" />

      <section v-if="presentation?.recoveryJourney?.length" class="recovery-journey" aria-label="暂停、中断与恢复记录">
        <header>
          <div>
            <strong>暂停与恢复</strong>
            <span>区分安全暂停、强制中断和检查点续接</span>
          </div>
          <em class="font-mono">{{ presentation.recoveryJourney.length }} 次</em>
        </header>
        <article v-for="(row, index) in presentation.recoveryJourney" :key="`${row.taskId}:${row.interruptedAt}:${index}`">
          <span :class="['recovery-dot', row.result]"></span>
          <div>
            <strong>{{ row.reasonLabel }}</strong>
            <p>现场已保留，从“{{ recoveryPhaseLabel(row.resumePhase) }}”继续<span v-if="row.completedWorkItemCount">；跳过 {{ row.completedWorkItemCount }} 个已完成工作项</span><span v-if="row.suspendedSessionCount">；保留 {{ row.suspendedSessionCount }} 个子 Agent 会话</span></p>
            <small>{{ row.kind === 'pause' ? '协作式安全暂停' : row.mode === 'safe_auto' ? `安全自动恢复 · 第 ${row.attempt + 1}/${row.maxAttempts} 轮` : '人工恢复门禁' }}<span v-if="row.recoveredAt"> · 已接上原任务</span><span v-else-if="row.nextRetryAt"> · 下次 {{ dateLabel(row.nextRetryAt) }}</span></small>
          </div>
          <b>{{ row.result === 'resumed' ? '已继续' : row.result === 'paused' ? '已暂停' : row.result === 'needs_user' ? '需要处理' : '等待恢复' }}</b>
        </article>
      </section>

      <TaskReplayChapters
        v-if="presentation"
        :chapters="presentation.chapters || []"
        :attempts="[]"
        :issues="presentation.issues || []"
        @select="selectChapter"
      />

      <details id="replay-section-timeline" class="full-replay-timeline replay-section-anchor" :open="replayView === 'advanced' || isReplayRunning">
        <summary>
          <span>
            <strong>完整时间线</strong>
            <small class="font-mono">{{ replay.summary?.event_count || 0 }} 条记录 · 总耗时 {{ durationLabel }}</small>
          </span>
          <em>{{ isReplayRunning ? '任务运行中，实时更新' : '展开查看完整过程' }}</em>
        </summary>

        <nav v-if="replay.phases?.length" class="phase-strip" aria-label="任务阶段">
          <button v-for="phase in replay.phases" :key="phase.id" type="button" :class="[phase.status, { active: stageFilter === phase.id }]" @click="selectPhase(phase)">
            <span></span>
            <strong>{{ stageLabel(phase.id) }}</strong>
            <small class="font-mono">{{ phase.event_count }}</small>
          </button>
        </nav>

        <div v-if="replayView === 'advanced'" class="replay-controls">
          <div class="preset-control" role="group" aria-label="快速筛选">
            <button v-for="item in [{id:'all',label:'全部'},{id:'failed',label:'只看失败'},{id:'issues',label:'问题'},{id:'test',label:'TestAgent 验收'},{id:'browser',label:'页面验证'},{id:'changes',label:'改动与返工'}]" :key="item.id" type="button" :class="{ active: preset === item.id }" @click="setPreset(item.id)">{{ item.label }}</button>
          </div>
          <input v-model="search" class="event-search" placeholder="搜索事件内容..." />
          <button v-if="chapterFilter !== 'all'" type="button" class="clear-filters" @click="chapterFilter = 'all'">清除章节筛选</button>
          <select v-model="actorFilter" class="filter-select" aria-label="参与者">
            <option value="all">全部参与者</option><option value="global_agent">全局主 Agent</option><option value="group_agent">群聊主 Agent</option><option value="project_agent">项目执行 Agent</option><option value="test_agent">TestAgent（独立验收）</option><option value="user">用户</option><option value="system">系统</option>
          </select>
          <select v-model="statusFilter" class="filter-select" aria-label="状态">
            <option value="all">全部状态</option><option value="failed">失败</option><option value="blocked">受阻</option><option value="warning">注意</option><option value="running">进行中</option><option value="passed">通过</option>
          </select>
          <select v-if="replay.tasks?.length > 1" v-model="taskFilter" class="filter-select" aria-label="任务">
            <option value="all">全部父子任务</option><option v-for="item in replay.tasks" :key="item.id" :value="item.id">{{ item.project || item.title }}</option>
          </select>
          <label v-if="canManageReplay" class="system-event-toggle" :title="`显示内部事件编号、持久化、租约和运行诊断记录`">
            <input v-model="includeSystemEvents" type="checkbox" />
            <span>排障记录<em v-if="diagnosticEventCount" class="font-mono">{{ diagnosticEventCount }}</em></span>
          </label>
          <div class="issue-nav font-mono">
            <button type="button" :disabled="!issueEvents.length" title="上一个问题" @click="focusIssue(-1)">上一项</button>
            <span>{{ issueEvents.length ? `${Math.max(0, issuePosition) + 1}/${issueEvents.length}` : '无问题' }}</span>
            <button type="button" :disabled="!issueEvents.length" title="下一个问题" @click="focusIssue(1)">下一项</button>
          </div>
        </div>

        <div v-if="replayView === 'advanced' && replay.tasks?.length" class="task-family-strip font-mono">
          <button v-for="item in replay.tasks" :key="item.id" type="button" :class="{ active: taskFilter === item.id }" @click="taskFilter = taskFilter === item.id ? 'all' : item.id">
            <span>{{ item.is_root ? '主任务' : item.project || '执行任务' }}</span>
            <strong>{{ item.title }}</strong>
            <em>{{ statusLabel(item.status) }}</em>
          </button>
        </div>

        <div class="replay-workspace">
          <main>
            <div class="timeline-head">
              <div>
                <strong>执行时间线</strong>
                <span class="font-mono">已加载 {{ loadedEventLabel }} 条<span v-if="lastLiveUpdateAt"> · 更新于 {{ dateLabel(lastLiveUpdateAt) }}</span></span>
              </div>
              <div class="timeline-mode font-mono" role="group" aria-label="时间线视图">
                <button type="button" :class="{ active: timelineMode === 'key' }" @click="timelineMode = 'key'">关键节点 <em>{{ timelineStats.visible }}</em></button>
                <button type="button" :class="{ active: timelineMode === 'raw' }" @click="timelineMode = 'raw'">全部记录 <em>{{ timelineStats.raw }}</em></button>
              </div>
            </div>
            <div v-if="timelineMode === 'key' && timelineStats.merged" class="timeline-compaction-note font-mono">已整理 {{ timelineStats.merged }} 条重复状态更新；需要时可展开合并记录或切换到全部记录。</div>
            <button v-if="eventPage.has_previous" type="button" class="load-older font-mono" :disabled="loadingOlder" @click="loadOlderEvents">{{ loadingOlder ? '正在读取…' : `加载更早记录（前面还有 ${eventPage.offset} 条）` }}</button>
            <TaskReplayTimeline :events="timelineEvents" :focused-event-id="focusedEventId" :show-raw-groups="timelineMode === 'key'" @open-evidence="openEvidence" @return-execution="navigateToExecution" />
          </main>
          <TaskReplayEvidence :evidence="replay.evidence || []" :focused-evidence-id="focusedEvidenceId" @open-code-changes="openCodeChanges" />
        </div>
      </details>

      <details class="retention-details">
        <summary>技术详情与记录保留</summary>
        <div>
          <p>任务时间线会保留到任务被永久删除。TestAgent（独立验收）的截图、报告和日志默认保留 14 天，并受运行次数及总容量限制。</p>
          <dl class="font-mono">
            <template v-for="(value, key) in replay.retention || {}" :key="key">
              <dt>{{ retentionLabel(key) }}</dt>
              <dd>{{ value.policy }}<span v-if="value.earliest_expiry"> · 最早于 {{ dateLabel(value.earliest_expiry) }} 到期</span></dd>
            </template>
          </dl>
        </div>
      </details>
    </template>
  </section>
  </WorkspacePageShell>
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
.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.task-replay-page {
  min-height: 100%;
  padding: 16px 20px;
  background: var(--bg-primary);
  color: var(--text-primary);
  letter-spacing: 0;
}

.replay-chapter-nav {
  position: sticky;
  top: -16px;
  z-index: 12;
  margin: -16px -20px 14px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 94%, transparent);
  backdrop-filter: blur(10px);
}

.replay-chapter-nav :deep(.workspace-section-nav) {
  width: 100%;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 0;
  border: 0;
  background: transparent;
}

.replay-chapter-nav :deep(.workspace-section-nav button) {
  flex: 0 0 auto;
}

.replay-section-anchor {
  scroll-margin-top: 62px;
}

.toolbar-diagnostic-lookup {
  position: relative;
}

.toolbar-diagnostic-lookup > summary {
  min-height: 32px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}

.toolbar-diagnostic-lookup > summary::-webkit-details-marker { display: none; }
.toolbar-diagnostic-lookup[open] > summary {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.toolbar-diagnostic-lookup .toolbar-lookup {
  position: absolute;
  z-index: 20;
  top: calc(100% + 6px);
  right: 0;
  min-width: 270px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.14);
}

.toolbar-lookup {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-lookup input,
.replay-index-filters input,
.replay-index-filters select,
.event-search,
.filter-select {
  height: 34px;
  box-sizing: border-box;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 10px;
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

.toolbar-lookup input:focus,
.replay-index-filters input:focus,
.replay-index-filters select:focus,
.event-search:focus,
.filter-select:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.toolbar-lookup input { width: 170px; }
.toolbar-lookup button,
.back-button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--accent-blue);
  border-radius: 6px;
  background: var(--accent-blue);
  color: #fff;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar-lookup button:disabled { opacity: 0.6; }

.replay-error,
.legacy-notice {
  margin-top: 12px;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--accent-red) 35%, var(--border-color));
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  color: var(--accent-red);
  font-size: 12px;
}

.legacy-notice {
  margin: 12px 0 0;
  border-color: color-mix(in srgb, #d97706 35%, var(--border-color));
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
}

.replay-index-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 14px 0 10px;
}

.replay-index-head > div strong {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.replay-index-head > div span {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 11px;
}

.clear-filters {
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.clear-filters:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.replay-index-filters {
  display: grid;
  grid-template-columns: minmax(200px, 1.6fr) repeat(4, minmax(120px, 1fr));
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.replay-index-filters label {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.replay-index-filters label > span {
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 600;
}

.replay-index-list {
  margin-top: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.replay-index-row {
  display: grid;
  width: 100%;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 0;
  border-bottom: 1px solid var(--border-color);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.replay-index-row:last-child {
  border-bottom: 0;
}

.replay-index-row:hover {
  background: var(--control-hover, rgba(148, 163, 184, 0.04));
}

.task-state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.task-state-dot.done,
.task-state-dot.completed { background: var(--accent-green, #10b981); }
.task-state-dot.in_progress,
.task-state-dot.running { background: var(--accent-blue); }
.task-state-dot.failed,
.task-state-dot.blocked { background: var(--accent-red, #ef4444); }

.task-index-copy { min-width: 0; }
.task-index-copy strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.task-index-copy small {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
  font-size: 11px;
}

.task-index-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.task-index-tags em {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--panel-muted);
  color: var(--text-muted);
  font-size: 10px;
  font-style: normal;
  font-weight: 500;
}

.task-index-meta {
  text-align: right;
}

.task-index-meta em {
  display: block;
  color: var(--text-secondary);
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
}

.task-index-meta small {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 10.5px;
}

.task-index-meta b {
  color: #d97706;
  font-weight: 600;
}

.replay-loading {
  padding: 40px 12px;
  color: var(--text-muted);
  text-align: center;
  font-size: 12px;
}

.index-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 12px 0 2px;
}

.index-pagination button {
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.index-pagination button:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.index-pagination button:disabled {
  opacity: 0.45;
  cursor: default;
}

.index-pagination span {
  color: var(--text-muted);
  font-size: 11px;
}

/* 回放概览区 */
.replay-overview {
  padding: 12px 0 10px;
}

.overview-heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 14px;
}

.back-button {
  height: 30px;
  border-color: var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
}

.back-button:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.overview-heading > div > span {
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.overview-heading h1 {
  margin: 2px 0 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.overview-heading p {
  max-width: 850px;
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.overview-status {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--panel-muted);
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
}

.overview-status.done,
.overview-status.completed {
  background: rgba(16, 185, 129, 0.1);
  color: var(--accent-green, #10b981);
}

.overview-status.failed,
.overview-status.blocked {
  background: rgba(239, 68, 68, 0.1);
  color: var(--accent-red, #ef4444);
}

/* 6 格 KPI 微卡片 */
.overview-metrics {
  display: grid;
  grid-template-columns: repeat(6, minmax(80px, 1fr));
  margin: 10px 12px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
}

.overview-metrics > div {
  padding: 10px 12px;
  border-right: 1px solid var(--border-color);
}

.overview-metrics > div:last-child {
  border-right: 0;
}

.overview-metrics > div.attention {
  background: rgba(245, 158, 11, 0.08);
}

.overview-metrics dt {
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 500;
}

.overview-metrics dd {
  margin: 3px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.replay-consumption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1px;
  margin: 0 12px 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--border-color);
}

.replay-consumption span {
  min-width: 110px;
  display: grid;
  flex: 1;
  gap: 2px;
  padding: 8px 10px;
  background: var(--surface);
}

.replay-consumption small {
  color: var(--text-muted);
  font-size: 10px;
}

.replay-consumption b {
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 600;
}

.replay-consumption p {
  flex-basis: 100%;
  margin: 0;
  padding: 6px 10px;
  background: var(--panel-muted);
  color: var(--text-muted);
  font-size: 10px;
}

.replay-summary-metrics {
  margin: 0 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.replay-summary-metrics > summary {
  padding: 10px 14px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.replay-report-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 0 0 14px;
}

.replay-report-actions button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.replay-report-actions button:first-child {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.replay-report-actions button:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.replay-report-actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.replay-freshness {
  margin: 0 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.replay-freshness > header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.replay-freshness > header strong {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
}

.replay-freshness > header small {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 10.5px;
}

.freshness-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1px;
  background: var(--border-color);
}

.freshness-grid article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 8px;
  padding: 10px 12px;
  background: var(--surface);
}

.freshness-grid strong {
  font-size: 12px;
  font-weight: 600;
}

.freshness-grid b {
  color: var(--text-secondary);
  font-size: 10.5px;
}

.freshness-grid article.drifted b,
.freshness-grid article.deleted b,
.freshness-grid article.permission_revoked b { color: #d97706; }
.freshness-grid article.current b { color: var(--accent-green, #10b981); }
.freshness-grid small { grid-column: 1 / -1; color: var(--text-muted); font-size: 10px; }

.schedule-origin-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin: 0 0 14px;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
}

.schedule-origin-card strong {
  display: block;
  font-size: 12px;
  font-weight: 600;
}

.schedule-origin-card span {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 10.5px;
}

.schedule-origin-card button {
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--accent-blue);
  border-radius: 6px;
  background: transparent;
  color: var(--accent-blue);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.recovery-journey {
  margin: 0 0 14px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.recovery-journey > header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.recovery-journey > header strong {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
}

.recovery-journey > header span {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 10.5px;
}

.recovery-journey article {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.recovery-journey article:last-child {
  border-bottom: 0;
}

.recovery-dot {
  width: 7px;
  height: 7px;
  margin-top: 4px;
  border-radius: 50%;
  background: #d97706;
}

.recovery-dot.resumed { background: var(--accent-green, #10b981); }
.recovery-dot.needs_user { background: var(--accent-red, #ef4444); }

.recovery-journey article strong {
  display: block;
  font-size: 12px;
  font-weight: 600;
}

.recovery-journey article p {
  margin: 2px 0;
  color: var(--text-secondary);
  font-size: 11px;
}

.recovery-journey article small {
  color: var(--text-muted);
  font-size: 10px;
}

.recovery-journey article > b {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--panel-muted);
  color: var(--text-secondary);
  font-size: 10px;
}

.full-replay-timeline {
  margin-top: 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.full-replay-timeline > summary {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  list-style: none;
}

.full-replay-timeline > summary::-webkit-details-marker { display: none; }
.full-replay-timeline > summary strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
}

.full-replay-timeline > summary small {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 11px;
}

.full-replay-timeline > summary em {
  color: var(--text-muted);
  font-size: 11px;
  font-style: normal;
}

.full-replay-timeline > .phase-strip,
.full-replay-timeline > .replay-controls,
.full-replay-timeline > .task-family-strip,
.full-replay-timeline > .replay-workspace {
  margin-left: 14px;
  margin-right: 14px;
}

.full-replay-timeline > .replay-workspace {
  margin-bottom: 14px;
}

.overview-state {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.overview-state .live-state {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 600;
}

.overview-state .live-state::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
}

.overview-state .live-state.active::before {
  background: var(--accent-green, #10b981);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.phase-strip {
  display: flex;
  overflow: auto;
  border-block: 1px solid var(--border-color);
  background: var(--surface);
}

.phase-strip button {
  display: grid;
  flex: 1 0 80px;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
  min-height: 38px;
  padding: 0 10px;
  border: 0;
  border-right: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.phase-strip button.active {
  background: var(--accent-soft);
  color: var(--accent-blue);
}

.phase-strip button > span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
}

.phase-strip button.passed > span { background: var(--accent-green, #10b981); }
.phase-strip button.running > span { background: var(--accent-blue); }
.phase-strip button.warning > span,
.phase-strip button.blocked > span { background: #d97706; }
.phase-strip button.failed > span { background: var(--accent-red, #ef4444); }

.phase-strip strong { font-size: 11.5px; }
.phase-strip small { color: var(--text-muted); font-size: 10px; }

/* 快速筛选药丸组 */
.replay-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
}

.preset-control {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--control-bg, var(--bg-primary));
}

.preset-control button {
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-control button:hover {
  color: var(--text-primary);
}

.preset-control button.active {
  background: var(--surface);
  color: var(--accent-blue);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.event-search {
  flex: 1;
  min-width: 160px;
}

.issue-nav {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
}

.issue-nav button {
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
}

.issue-nav button:disabled { opacity: 0.45; }
.issue-nav span {
  min-width: 44px;
  color: var(--text-muted);
  font-size: 10.5px;
  text-align: center;
}

.system-event-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.system-event-toggle input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--accent-blue);
}

.system-event-toggle em {
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--panel-muted);
  color: var(--text-muted);
  font-size: 9.5px;
  font-style: normal;
}

.task-family-strip {
  display: flex;
  gap: 6px;
  overflow: auto;
  padding: 0 0 12px;
}

.task-family-strip button {
  display: grid;
  grid-template-columns: auto minmax(100px, 1fr) auto;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  max-width: 300px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.task-family-strip button.active {
  border-color: var(--accent-blue);
  background: var(--accent-soft);
  color: var(--accent-blue);
}

.task-family-strip span { color: var(--text-muted); font-size: 9.5px; }
.task-family-strip strong { overflow: hidden; font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
.task-family-strip em { color: var(--text-muted); font-size: 9.5px; font-style: normal; }

.replay-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 14px;
  align-items: start;
}

.replay-workspace > main { min-width: 0; }
.timeline-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding-left: 122px;
}

.timeline-head strong { font-size: 13px; font-weight: 700; }
.timeline-head span { color: var(--text-muted); font-size: 10.5px; }

.timeline-mode {
  display: flex;
  flex: none;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
}

.timeline-mode button {
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border: 0;
  border-right: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
}

.timeline-mode button:last-child { border-right: 0; }
.timeline-mode button.active {
  background: var(--accent-soft);
  color: var(--accent-blue);
}

.timeline-mode em {
  font-size: 9.5px;
  font-style: normal;
  opacity: 0.8;
}

.timeline-compaction-note {
  margin: 0 0 8px 122px;
  padding: 6px 10px;
  border-left: 2px solid var(--accent-blue);
  border-radius: 0 6px 6px 0;
  background: var(--accent-soft);
  color: var(--text-secondary);
  font-size: 10.5px;
  line-height: 1.45;
}

.load-older {
  display: block;
  width: calc(100% - 122px);
  height: 32px;
  margin: 0 0 8px 122px;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.load-older:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.load-older:disabled { opacity: 0.55; cursor: default; }

.retention-details {
  margin-top: 14px;
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
}

.retention-details summary {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.retention-details > div {
  padding: 8px 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.5;
}

.retention-details dl {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 4px 10px;
  margin: 4px 0 0;
}

.retention-details dt { color: var(--text-muted); }
.retention-details dd { margin: 0; }

@media (max-width: 1100px) {
  .replay-index-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .index-search { grid-column: 1 / -1; }
  .overview-metrics { grid-template-columns: repeat(3, 1fr); }
  .overview-metrics > div:nth-child(3) { border-right: 0; }
  .overview-metrics > div:nth-child(-n+3) { border-bottom: 1px solid var(--border-color); }
  .replay-workspace { grid-template-columns: 1fr; }
  .timeline-head { padding-left: 0; }
  .timeline-compaction-note { margin-left: 0; }
  .load-older { width: 100%; margin-left: 0; }
}

@media (max-width: 720px) {
  .task-replay-page { padding: 12px; }
  .overview-heading { grid-template-columns: 1fr auto; }
  .overview-heading .back-button { grid-column: 1 / -1; justify-self: start; }
  .overview-metrics { grid-template-columns: repeat(2, 1fr); }
  .replay-index-filters { grid-template-columns: 1fr; }
  .replay-index-row { grid-template-columns: 10px minmax(0, 1fr); }
  .task-index-meta { grid-column: 2; display: flex; justify-content: space-between; text-align: left; }
  .preset-control { width: 100%; overflow-x: auto; }
  .event-search { flex-basis: 100%; }
  .issue-nav { margin-left: 0; }
}
</style>
