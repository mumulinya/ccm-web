import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const TRANSIENT_MODEL_REASONS = new Set([
  'temporary_network',
  'provider_overload',
  'provider_unavailable',
  'model_stream_interrupted',
])

const sourceValue = (source) => typeof source === 'function' ? source() : source?.value ?? source

export const taskRecoveryPresentation = (input, now = Date.now()) => {
  const card = input?.raw_task || input?.rawTask || input || {}
  const summary = card.recovery_summary || card.recoverySummary || card.technical?.recovery_summary || card.technical?.recoverySummary || {}
  const receipt = card.interruption_receipt || card.interruptionReceipt || {}
  const recovery = card.recovery || receipt.recovery || {}
  const reasonCode = String(summary.reason_code || summary.reasonCode || receipt.reason_code || receipt.reasonCode || recovery.reason_code || recovery.reasonCode || '')
  const recoveryState = String(recovery.state || summary.technical?.recovery_state || '')
  const safeAuto = summary.auto_retry === true || summary.autoRetry === true || recovery.auto_retry === true || recovery.autoRetry === true || (
    recovery.mode === 'safe_auto'
    && ['waiting_provider', 'validating', 'queued'].includes(recoveryState)
  )
  const recoverable = receipt.recoverable === true || summary.auto_retry === true || summary.autoRetry === true || recovery.auto_retry === true || recovery.autoRetry === true || TRANSIENT_MODEL_REASONS.has(reasonCode)
  const visible = TRANSIENT_MODEL_REASONS.has(reasonCode) && recoverable
  const nextRetryAt = String(summary.next_retry_at || summary.nextRetryAt || recovery.nextRetryAt || recovery.next_retry_at || '')
  const retryAtMs = Date.parse(nextRetryAt) || 0
  const remainingSeconds = retryAtMs ? Math.max(0, Math.ceil((retryAtMs - now) / 1000)) : 0
  const countdown = remainingSeconds >= 60
    ? `${Math.floor(remainingSeconds / 60)}分${remainingSeconds % 60 ? `${remainingSeconds % 60}秒` : ''}`
    : `${remainingSeconds}秒`
  return {
    visible,
    safeAuto,
    reasonCode,
    remainingSeconds,
    title: '模型服务暂时不可用',
    statusText: safeAuto
      ? remainingSeconds > 0
        ? `将在 ${countdown} 后自动重试`
        : '正在检查模型服务，恢复后会自动继续'
      : '自动重试已暂停，可以手动恢复原任务',
    detail: '任务现场、已完成工作和子 Agent 会话均已保留。',
  }
}

export function useTaskRecoveryPresentation(source) {
  const now = ref(Date.now())
  let timer = null
  const presentation = computed(() => taskRecoveryPresentation(sourceValue(source), now.value))
  onMounted(() => {
    timer = window.setInterval(() => { now.value = Date.now() }, 1000)
  })
  onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer)
    timer = null
  })
  return { recoveryPresentation: presentation }
}
