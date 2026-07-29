import { computed, onBeforeUnmount, onMounted, ref, unref } from 'vue'

const TERMINAL = new Set(['completed', 'done', 'succeeded', 'failed', 'cancelled', 'canceled', 'reverted'])
const ACTIVE = new Set(['understanding', 'planning', 'dispatching', 'executing', 'in_progress', 'running', 'testing', 'reviewing', 'reworking', 'accepting'])

const valueOf = source => typeof source === 'function' ? source() : unref(source)
const parseTime = value => {
  const time = Date.parse(String(value || ''))
  return Number.isFinite(time) ? time : 0
}
const durationLabel = milliseconds => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  return `${hours} 小时 ${minutes % 60} 分钟`
}
const freshnessLabel = milliseconds => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  if (seconds < 10) return '刚刚更新'
  if (seconds < 60) return `${seconds} 秒前更新`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前更新`
  return `${Math.floor(minutes / 60)} 小时前更新`
}

export const normalizeTaskRuntimePhase = card => {
  const runtime = card?.runtime_status || card?.runtimeStatus || {}
  if (runtime.phase) return String(runtime.phase).toLowerCase()
  const acceptance = String(card?.acceptance_state || card?.acceptanceState || '').toLowerCase()
  if (acceptance === 'accepted') return 'completed'
  if (acceptance === 'environment_blocked') return 'environment_blocked'
  if (acceptance === 'recovery_required') return 'recovery_required'
  if (['test_agent_running', 'test_agent_recheck', 'awaiting_test_agent'].includes(acceptance)) return 'testing'
  if (['reworking', 'rework_required'].includes(acceptance)) return 'reworking'
  if (['main_agent_accepting', 'test_agent_passed'].includes(acceptance)) return 'accepting'
  if (['needs_user', 'waiting_confirmation'].includes(acceptance)) return 'needs_user'
  return String(card?.phase || card?.status || 'planning').toLowerCase()
}

export function useTaskRuntimeStatus(source) {
  const now = ref(Date.now())
  let timer = null
  onMounted(() => {
    now.value = Date.now()
    timer = window.setInterval(() => { now.value = Date.now() }, 1000)
  })
  onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer)
  })

  const card = computed(() => valueOf(source) || {})
  const runtime = computed(() => card.value.runtime_status || card.value.runtimeStatus || {})
  const phase = computed(() => normalizeTaskRuntimePhase(card.value))
  const terminal = computed(() => runtime.value.terminal === true || TERMINAL.has(phase.value))
  const active = computed(() => runtime.value.active === true || (!terminal.value && ACTIVE.has(phase.value)))
  const startedAt = computed(() => parseTime(
    runtime.value.started_at
      || runtime.value.startedAt
      || card.value.started_at
      || card.value.startedAt
      || card.value.created_at
      || card.value.createdAt,
  ))
  const lastActivityAt = computed(() => parseTime(
    runtime.value.last_activity_at
      || runtime.value.lastActivityAt
      || card.value.project_main_execution?.heartbeat_at
      || card.value.updated_at
      || card.value.updatedAt
      || card.value.started_at
      || card.value.created_at,
  ))
  const completedAt = computed(() => parseTime(
    runtime.value.completed_at
      || runtime.value.completedAt
      || card.value.completed_at
      || card.value.completedAt
      || (terminal.value ? card.value.updated_at || card.value.updatedAt : ''),
  ))
  const activityAgeMs = computed(() => lastActivityAt.value ? Math.max(0, now.value - lastActivityAt.value) : 0)
  const elapsedLabel = computed(() => {
    if (!startedAt.value) return '未记录'
    return durationLabel(Math.max(0, (completedAt.value || now.value) - startedAt.value))
  })
  const lastActivityLabel = computed(() => lastActivityAt.value ? freshnessLabel(activityAgeMs.value) : '等待首次进展')
  const queuePosition = computed(() => Math.max(0, Number(runtime.value.queue_position || card.value.queue?.position || card.value.queue_position || 0)))
  const reviewRound = computed(() => Math.max(0, Number(runtime.value.review_round || card.value.review_round || 0)))
  const maxReviewRounds = computed(() => Math.max(reviewRound.value, Number(runtime.value.max_review_rounds || 3)))
  const nextAction = computed(() => String(
    runtime.value.next_action
      || runtime.value.nextAction
      || card.value.next_action
      || card.value.nextAction
      || '',
  ).trim())
  const heartbeatTone = computed(() => {
    if (terminal.value) return phase.value === 'completed' || phase.value === 'done' ? 'success' : phase.value === 'failed' ? 'danger' : 'muted'
    if (['needs_user', 'environment_blocked', 'recovery_required', 'blocked'].includes(phase.value)) return 'warning'
    if (active.value && activityAgeMs.value > 3 * 60_000) return 'warning'
    return 'active'
  })
  const heartbeatText = computed(() => {
    if (terminal.value) return `任务已收口 · ${lastActivityLabel.value}`
    if (queuePosition.value > 0 || phase.value === 'queued') {
      return queuePosition.value > 0 ? `正在排队，第 ${queuePosition.value} 位` : '正在排队，等待执行通道'
    }
    if (phase.value === 'needs_user') return '任务已暂停，正在等待你的确认'
    if (phase.value === 'environment_blocked') return '任务已安全暂停，等待补充运行或登录条件'
    if (phase.value === 'recovery_required') return '任务没有继续执行，等待安全恢复'
    if (phase.value === 'blocked') return '任务已停止自动推进，等待处理阻塞项'
    if (active.value && activityAgeMs.value <= 30_000) return `实时执行中 · ${lastActivityLabel.value}`
    if (active.value && activityAgeMs.value <= 3 * 60_000) return `当前步骤仍在执行 · ${lastActivityLabel.value}`
    if (active.value) return `暂时没有新进展 · ${lastActivityLabel.value}，系统会按超时规则自动恢复或收口`
    return lastActivityLabel.value
  })
  const retrySummary = computed(() => {
    const provider = runtime.value.provider_retry || runtime.value.providerRetry
    if (provider?.attempts) return `模型已尝试 ${provider.attempts} 次${provider.state === 'open' ? '，当前处于冷却' : ''}`
    if (reviewRound.value > 0) return `验收第 ${reviewRound.value}/${maxReviewRounds.value} 轮`
    const recoveryCount = Number(runtime.value.recovery_count || 0)
    return recoveryCount > 0 ? `已自动恢复 ${recoveryCount} 次` : ''
  })

  return {
    active,
    elapsedLabel,
    heartbeatText,
    heartbeatTone,
    lastActivityLabel,
    maxReviewRounds,
    nextAction,
    phase,
    queuePosition,
    retrySummary,
    reviewRound,
    terminal,
  }
}
