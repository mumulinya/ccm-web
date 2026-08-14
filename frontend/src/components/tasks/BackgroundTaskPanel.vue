<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Activity, ChevronRight, CircleStop, Clock3, LoaderCircle, Pause, Play, ShieldAlert, X } from '@lucide/vue'
import { subscribeRuntimeEvents } from '../../utils/runtimeEventBus.js'
import { toast } from '../../utils/toast.js'
import { recheckTaskStop, stopTaskWithPreview, undoTaskStop } from '../../utils/taskStopFlow.js'
import { resolveTaskMutationGuard } from '../../utils/taskMutationGuard.js'
import { taskRecoveryPresentation } from '../../composables/useTaskRecoveryPresentation.js'

const emit = defineEmits(['navigate'])
const open = ref(false)
const loading = ref(false)
const active = ref([])
const recent = ref([])
const actionBusyId = ref('')
let unsubscribe = null
let pollTimer = null
let refreshTimer = null
let stopPollTimer = null
let recoveryClockTimer = null
const recoveryClock = ref(Date.now())

const activeCount = computed(() => active.value.length)
const running = computed(() => active.value.filter(item => ['running', 'pausing', 'stopping'].includes(item.state)))
const attention = computed(() => active.value.filter(item => item.state === 'needs_user'))
const waiting = computed(() => active.value.filter(item => ['waiting', 'paused'].includes(item.state)))

const duration = value => {
  const seconds = Math.max(0, Math.floor(Number(value || 0) / 1000))
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  return minutes < 60 ? `${minutes}分${seconds % 60}秒` : `${Math.floor(minutes / 60)}时${minutes % 60}分`
}
const stateLabel = item => ({ running: '运行中', pausing: '正在暂停', paused: '已暂停', stopping: '正在停止', waiting: '等待中', needs_user: '需要处理', completed: '已完成', failed: '未完成', cancelled: '已停止' }[item?.state] || '处理中')
const sourceIcon = type => type === 'project' ? '▣' : type === 'group' ? '◉' : '✦'
const recoveryPresentation = item => taskRecoveryPresentation(item, recoveryClock.value)

const refresh = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const response = await fetch('/api/tasks/active-runs', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok || payload?.success === false) throw new Error(payload?.error || '读取后台任务失败')
    active.value = Array.isArray(payload.active) ? payload.active : []
    recent.value = Array.isArray(payload.recent) ? payload.recent : []
    if (stopPollTimer) { window.clearTimeout(stopPollTimer); stopPollTimer = null }
    const stoppingIds = active.value.filter(item => item.state === 'stopping').map(item => item.taskId)
    if (stoppingIds.length) {
      stopPollTimer = window.setTimeout(async () => {
        stopPollTimer = null
        await Promise.all(stoppingIds.map(taskId => fetch(`/api/tasks/cancel/status?task_id=${encodeURIComponent(taskId)}`, { cache: 'no-store' }).catch(() => null)))
        void refresh()
      }, 1_500)
    }
  } catch (error) {
    // A transient panel refresh should not interrupt the active conversation.
  } finally {
    loading.value = false
  }
}
const scheduleRefresh = () => {
  if (refreshTimer) window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => { refreshTimer = null; void refresh() }, 160)
}
const view = async item => {
  open.value = false
  try {
    const response = await fetch(`/api/tasks/${encodeURIComponent(item.taskId)}/conversation-links`, { cache: 'no-store' })
    const payload = await response.json()
    const link = (payload?.links || []).find(value => value.relation === 'target' && value.available) || (payload?.links || []).find(value => value.available)
    if (response.ok && link) {
      emit('navigate', {
        kind: 'task', task_id: item.taskId, scope_type: link.scope,
        scope_id: link.scopeId, project_id: link.scope === 'project' ? link.scopeId : '', group_id: link.scope === 'group' ? link.scopeId : '',
        session_id: link.exactSessionId, anchor_message_id: link.messageId || '', generation: link.generation,
      })
      return
    }
  } catch {}
  emit('navigate', { kind: 'task', task_id: item.taskId })
}
const cancel = async item => {
  const action = item?.availableActions?.find(value => value.kind === 'cancel' && value.enabled)
  if (!action) return
  actionBusyId.value = item.taskId
  try {
    const payload = await stopTaskWithPreview({ ...item, id: item.taskId }, {
      reason: '用户从后台任务面板停止任务', actor: 'background-task-panel',
      onConflict: () => toast.info('任务状态已更新，请重新确认停止范围'),
    })
    if (!payload) return
    toast.success(payload.running ? '正在安全停止任务' : payload.undoAvailable ? '任务已停止，可在 10 秒内撤销' : '任务已停止')
    await refresh()
  } catch (error) {
    toast.error(error?.message || '停止任务失败')
  } finally {
    actionBusyId.value = ''
  }
}
const resume = async item => {
  const action = item?.availableActions?.find(value => value.kind === 'resume_interrupted' && value.enabled)
  if (!action) return
  actionBusyId.value = item.taskId
  try {
    const guard = await resolveTaskMutationGuard(item.taskId, item)
    const response = await fetch('/api/tasks/resume-interrupted', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.taskId, ...guard }),
    })
    const payload = await response.json()
    if (!response.ok || payload?.success === false) throw new Error(payload?.error || '恢复任务失败')
    toast.success('已接上原任务，正在从最近检查点继续')
    await refresh()
  } catch (error) {
    toast.error(error?.message || '恢复任务失败')
  } finally {
    actionBusyId.value = ''
  }
}
const pauseControl = async (item, kind) => {
  const action = item?.availableActions?.find(value => value.kind === kind && value.enabled)
  if (!action) return
  actionBusyId.value = item.taskId
  try {
    const guard = await resolveTaskMutationGuard(item.taskId, item)
    const endpoint = kind === 'pause' ? '/api/tasks/pause'
      : kind === 'resume_paused' ? '/api/tasks/resume-paused'
        : '/api/tasks/interrupt'
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.taskId,
        ...guard,
        pauseSequence: item?.pauseStatus?.pauseSequence || 0,
        ...(kind === 'force_interrupt' ? { reason: '安全暂停超过30秒后由用户强制中断' } : {}),
      }),
    })
    const payload = await response.json()
    if (!response.ok || payload?.success === false) throw new Error(payload?.error || '暂停操作失败')
    toast[kind === 'resume_paused' ? 'success' : 'info'](kind === 'pause'
      ? '正在等待当前操作安全收口'
      : kind === 'resume_paused' ? '已通过核验，正在原位继续' : '已进入强制中断恢复流程')
    await refresh()
  } catch (error) {
    toast.error(error?.message || '暂停操作失败')
  } finally {
    actionBusyId.value = ''
  }
}
const handleStopAction = async (item, kind) => {
  actionBusyId.value = item.taskId
  try {
    if (kind === 'undo_stop') {
      await undoTaskStop({ ...item, id: item.taskId })
      toast.success('已撤销停止，任务恢复到原状态')
    } else if (kind === 'recheck' && item?.pauseStatus?.state === 'blocked') {
      const guard = await resolveTaskMutationGuard(item.taskId, item)
      const response = await fetch('/api/tasks/resume-paused', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.taskId, ...guard, pauseSequence: item.pauseStatus.pauseSequence || 0 }),
      })
      const payload = await response.json()
      if (!response.ok || payload?.success === false) throw new Error(payload?.error || '重新核验失败')
      toast.success('重新核验已通过，正在从原任务继续')
    } else {
      await recheckTaskStop({ ...item, id: item.taskId }, kind)
      toast.info(kind === 'takeover' ? '已转为人工接管' : '已重新检查停止状态')
    }
    await refresh()
  } catch (error) {
    toast.error(error?.message || '处理停止状态失败')
  } finally {
    actionBusyId.value = ''
  }
}

onMounted(() => {
  void refresh()
  unsubscribe = subscribeRuntimeEvents(['task'], event => {
    if (event?.type === 'task.changed') scheduleRefresh()
  })
  pollTimer = window.setInterval(() => void refresh(), 60_000)
  recoveryClockTimer = window.setInterval(() => { recoveryClock.value = Date.now() }, 1_000)
})
onBeforeUnmount(() => {
  unsubscribe?.()
  if (pollTimer) window.clearInterval(pollTimer)
  if (refreshTimer) window.clearTimeout(refreshTimer)
  if (stopPollTimer) window.clearTimeout(stopPollTimer)
  if (recoveryClockTimer) window.clearInterval(recoveryClockTimer)
})
</script>

<template>
  <div class="background-task-panel">
    <button type="button" class="background-task-trigger" :class="{ active: open }" title="后台任务" aria-label="查看后台任务" :aria-expanded="open" @click="open = !open">
      <Activity :size="17" />
      <span v-if="activeCount" class="background-task-badge">{{ activeCount > 99 ? '99+' : activeCount }}</span>
    </button>

    <Teleport to="body">
      <div v-if="open" class="background-task-scrim" @click.self="open = false">
        <aside class="background-task-drawer" aria-label="后台任务">
          <header>
            <div><strong>后台任务</strong><small>{{ activeCount ? `${activeCount} 个正在跟进` : '当前没有后台任务' }}</small></div>
            <button type="button" title="关闭" aria-label="关闭后台任务" @click="open = false"><X :size="18" /></button>
          </header>
          <div class="background-task-body">
            <section v-if="running.length">
              <h3><LoaderCircle :size="14" />运行中</h3>
              <article v-for="item in running" :key="item.taskId" class="background-task-row">
                <div class="background-task-source"><span>{{ sourceIcon(item.source?.type) }}</span><small>{{ item.source?.label }}</small></div>
                <strong>{{ item.title }}</strong>
                <div v-if="recoveryPresentation(item).visible" class="background-recovery"><strong>{{ recoveryPresentation(item).title }}</strong><span>{{ recoveryPresentation(item).statusText }}</span><small>{{ recoveryPresentation(item).detail }}</small></div>
                <p v-else>{{ item.stage }} · {{ item.progress }}</p>
                <footer><span><Clock3 :size="12" /> {{ duration(item.elapsedMs) }}</span><button type="button" @click="view(item)">查看 <ChevronRight :size="13" /></button><button v-if="item.availableActions?.some(action => action.kind === 'pause' && action.enabled)" type="button" :disabled="actionBusyId === item.taskId" @click="pauseControl(item, 'pause')"><Pause :size="12" />暂停</button><button v-if="item.availableActions?.some(action => action.kind === 'force_interrupt' && action.enabled)" type="button" class="danger" :disabled="actionBusyId === item.taskId" @click="pauseControl(item, 'force_interrupt')">强制中断</button><button v-if="item.availableActions?.some(action => action.kind === 'resume_interrupted' && action.enabled)" type="button" :disabled="actionBusyId === item.taskId" @click="resume(item)">{{ actionBusyId === item.taskId ? '恢复中…' : '立即重试' }}</button><button v-if="item.availableActions?.some(action => action.kind === 'cancel' && action.enabled)" type="button" class="danger" :disabled="actionBusyId === item.taskId" @click="cancel(item)"><CircleStop :size="13" />{{ actionBusyId === item.taskId ? '处理中…' : '停止任务' }}</button><button v-for="action in (item.availableActions || []).filter(value => ['recheck','takeover'].includes(value.kind))" :key="action.id" type="button" :class="{ danger: action.kind === 'takeover' }" :disabled="actionBusyId === item.taskId" @click="handleStopAction(item, action.kind)">{{ action.label }}</button></footer>
              </article>
            </section>
            <section v-if="attention.length">
              <h3 class="attention"><ShieldAlert :size="14" />等待处理</h3>
              <article v-for="item in attention" :key="item.taskId" class="background-task-row attention-row">
                <div class="background-task-source"><span>{{ sourceIcon(item.source?.type) }}</span><small>{{ item.source?.label }}</small></div>
                <strong>{{ item.title }}</strong>
                <div v-if="recoveryPresentation(item).visible" class="background-recovery"><strong>{{ recoveryPresentation(item).title }}</strong><span>{{ recoveryPresentation(item).statusText }}</span><small>{{ recoveryPresentation(item).detail }}</small></div><p v-else>{{ item.progress }}</p>
                <footer><span>{{ item.stage }}</span><button type="button" @click="view(item)">查看需要处理 <ChevronRight :size="13" /></button><button v-if="item.availableActions?.some(action => action.kind === 'resume_interrupted' && action.enabled)" type="button" :disabled="actionBusyId === item.taskId" @click="resume(item)">{{ actionBusyId === item.taskId ? '恢复中…' : recoveryPresentation(item).safeAuto ? '立即重试' : '恢复任务' }}</button><button v-if="item.availableActions?.some(action => action.kind === 'force_interrupt' && action.enabled)" type="button" class="danger" :disabled="actionBusyId === item.taskId" @click="pauseControl(item, 'force_interrupt')">强制中断</button><button v-if="item.availableActions?.some(action => action.kind === 'cancel' && action.enabled)" type="button" class="danger" :disabled="actionBusyId === item.taskId" @click="cancel(item)">停止任务</button><button v-for="action in (item.availableActions || []).filter(value => ['recheck','takeover'].includes(value.kind))" :key="action.id" type="button" :class="{ danger: action.kind === 'takeover' }" :disabled="actionBusyId === item.taskId" @click="handleStopAction(item, action.kind)">{{ action.label }}</button></footer>
              </article>
            </section>
            <section v-if="waiting.length">
              <h3><Clock3 :size="14" />等待中</h3>
              <article v-for="item in waiting" :key="item.taskId" class="background-task-row">
                <div class="background-task-source"><span>{{ sourceIcon(item.source?.type) }}</span><small>{{ item.source?.label }}</small></div>
                <strong>{{ item.title }}</strong>
                <div v-if="recoveryPresentation(item).visible" class="background-recovery"><strong>{{ recoveryPresentation(item).title }}</strong><span>{{ recoveryPresentation(item).statusText }}</span><small>{{ recoveryPresentation(item).detail }}</small></div><p v-else>{{ item.stage }} · {{ item.progress }}</p>
                <footer><span>{{ stateLabel(item) }}</span><button type="button" @click="view(item)">查看 <ChevronRight :size="13" /></button><button v-if="item.availableActions?.some(action => action.kind === 'resume_paused' && action.enabled)" type="button" :disabled="actionBusyId === item.taskId" @click="pauseControl(item, 'resume_paused')"><Play :size="12" />{{ actionBusyId === item.taskId ? '核验中…' : '继续' }}</button><button v-if="item.availableActions?.some(action => action.kind === 'resume_interrupted' && action.enabled)" type="button" :disabled="actionBusyId === item.taskId" @click="resume(item)">{{ actionBusyId === item.taskId ? '恢复中…' : recoveryPresentation(item).safeAuto ? '立即重试' : '恢复任务' }}</button><button v-if="item.availableActions?.some(action => action.kind === 'cancel' && action.enabled)" type="button" class="danger" :disabled="actionBusyId === item.taskId" @click="cancel(item)">停止任务</button></footer>
              </article>
            </section>
            <section v-if="recent.length">
              <h3>最近结束</h3>
              <article v-for="item in recent" :key="item.taskId" class="background-task-row recent-row">
                <div class="background-task-source"><span>{{ sourceIcon(item.source?.type) }}</span><small>{{ item.source?.label }}</small></div>
                <strong>{{ item.title }}</strong><p>{{ stateLabel(item) }} · {{ item.progress }}</p>
                <footer><span>{{ item.stage }}</span><button type="button" @click="view(item)">查看结果 <ChevronRight :size="13" /></button><button v-if="item.availableActions?.some(action => action.kind === 'undo_stop' && action.enabled)" type="button" :disabled="actionBusyId === item.taskId" @click="handleStopAction(item, 'undo_stop')">撤销停止</button></footer>
              </article>
            </section>
            <p v-if="!loading && !activeCount && !recent.length" class="background-task-empty">任务开始后，会在这里显示当前进度和需要处理的事项。</p>
          </div>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.background-task-trigger { position:relative; width:34px; height:34px; display:grid; place-items:center; border:1px solid var(--border-color); border-radius:8px; color:var(--text-secondary); background:var(--surface); cursor:pointer; }
.background-task-trigger:hover,.background-task-trigger.active { border-color:var(--accent-blue); color:var(--text-primary); background:var(--control-hover); }
.background-task-badge { position:absolute; top:-6px; right:-7px; min-width:16px; height:16px; padding:0 4px; display:grid; place-items:center; border:2px solid var(--surface); border-radius:999px; color:#fff; background:#dc2626; font-size:9px; font-weight:750; line-height:1; }
</style>

<style>
.background-task-scrim { position:fixed; inset:0; z-index:2100; display:flex; justify-content:flex-end; background:rgba(15,23,42,.18); }
.background-task-drawer { width:min(400px,100vw); height:100%; display:flex; flex-direction:column; border-left:1px solid var(--border-color); background:var(--bg-primary); box-shadow:-12px 0 32px rgba(15,23,42,.18); }
.background-task-drawer > header { min-height:58px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; border-bottom:1px solid var(--border-color); }
.background-task-drawer > header div { display:grid; gap:2px; }.background-task-drawer > header strong { color:var(--text-primary); font-size:14px; }.background-task-drawer > header small { color:var(--text-muted); font-size:10px; }
.background-task-drawer > header button { width:30px; height:30px; display:grid; place-items:center; border:0; border-radius:6px; color:var(--text-secondary); background:transparent; cursor:pointer; }.background-task-drawer > header button:hover { background:var(--control-hover); }
.background-task-body { flex:1; overflow:auto; padding:12px; }.background-task-body section { margin:0 0 18px; }.background-task-body h3 { display:flex; align-items:center; gap:6px; margin:0 0 7px; color:var(--text-muted); font-size:11px; font-weight:700; }.background-task-body h3.attention { color:#b45309; }
.background-task-row { display:grid; gap:5px; margin:0 0 7px; padding:10px; border:1px solid color-mix(in srgb,var(--border-color) 80%,transparent); border-radius:7px; background:var(--surface); }.background-task-row.attention-row { border-color:rgba(217,119,6,.35); }.background-task-row.recent-row { opacity:.82; }
.background-task-source { display:flex; align-items:center; gap:5px; color:var(--text-muted); font-size:10px; }.background-task-source span { width:15px; color:var(--accent-blue); text-align:center; }.background-task-row strong { overflow:hidden; color:var(--text-primary); font-size:12px; text-overflow:ellipsis; white-space:nowrap; }.background-task-row p { display:-webkit-box; margin:0; overflow:hidden; color:var(--text-secondary); font-size:11px; line-height:1.5; -webkit-box-orient:vertical; -webkit-line-clamp:2; }.background-task-row footer { display:flex; align-items:center; gap:7px; min-width:0; }.background-task-row footer > span { display:inline-flex; align-items:center; gap:3px; min-width:0; margin-right:auto; color:var(--text-muted); font-size:10px; }.background-task-row footer button { display:inline-flex; align-items:center; gap:2px; border:0; color:var(--accent-blue); background:transparent; font-size:10px; font-weight:700; cursor:pointer; }.background-task-row footer button:disabled { opacity:.5;cursor:not-allowed }.background-task-row footer button.danger { color:#dc2626; }.background-task-empty { margin:42px 16px; color:var(--text-muted); font-size:12px; line-height:1.65; text-align:center; }
.background-recovery { display:grid; gap:2px; padding:7px 8px; border:1px solid rgba(217,119,6,.24); border-radius:7px; background:rgba(245,158,11,.07); }.background-recovery strong { color:var(--text-primary); font-size:11px; }.background-recovery span { color:#b45309; font-size:10.5px; font-weight:700; }.background-recovery small { color:var(--text-muted); font-size:10px; line-height:1.4; }
@media (max-width:768px) { .background-task-scrim { align-items:flex-end; }.background-task-drawer { width:100%; height:min(78vh,680px); border-top:1px solid var(--border-color); border-left:0; border-radius:10px 10px 0 0; } }
</style>
