import { onBeforeUnmount, onMounted, ref, unref, watch } from 'vue'
import { toast } from '../utils/toast.js'
import { executionEventsForMessage } from '../utils/agentExecutionEvents.js'
import {
  PRESENTED_PLAN_CONFIRM_EXECUTE_LABEL,
  GLOBAL_CONVERSATION_PLAN_MODE_UNSUPPORTED,
  buildPresentedPlanConfirmExecuteMessage,
  conversationPlanModeSupported,
  exitConversationPlanMode,
  isLatestUnansweredPresentedPlan,
  presentedPlanFromMessage,
} from '../utils/presentedPlanConfirmExecute.js'

const resolve = value => (typeof value === 'function' ? value() : unref(value))

const usablePlan = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (value.isTrusted || value.target) return null
  const steps = Array.isArray(value.steps) ? value.steps.filter(step => String(step?.title || '').trim()) : []
  if (!steps.length && !String(value.title || value.overview || value.goal || '').trim()) return null
  return value
}

export function usePresentedPlanConfirmExecute(options = {}) {
  const planModeEnabled = ref(false)
  const loading = ref(false)
  const confirmBusy = ref(false)

  const identity = () => ({
    scope: String(resolve(options.scope) || ''),
    scopeId: String(resolve(options.scopeId) || '') || (String(resolve(options.scope) || '') === 'global' ? 'global' : ''),
    exactSessionId: String(resolve(options.exactSessionId) || ''),
  })

  const load = async () => {
    const id = identity()
    if (!id.exactSessionId || !conversationPlanModeSupported(id.scope)) {
      planModeEnabled.value = false
      return null
    }
    loading.value = true
    try {
      const query = new URLSearchParams(id).toString()
      const response = await fetch(`/api/conversations/plan-mode?${query}`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data?.success === false) throw new Error(data?.error || '会话模式读取失败')
      planModeEnabled.value = data.planMode?.enabled === true
      return data
    } catch {
      planModeEnabled.value = false
      return null
    } finally {
      loading.value = false
    }
  }

  const onExternalChange = event => {
    const detail = event?.detail || {}
    const id = identity()
    if (detail.scope && detail.scope !== id.scope) return
    if (detail.scopeId && String(detail.scopeId || '') !== String(id.scopeId || '')) return
    if (detail.exactSessionId && String(detail.exactSessionId || '') !== String(id.exactSessionId || '')) return
    if (!conversationPlanModeSupported(id.scope)) {
      planModeEnabled.value = false
      return
    }
    if (detail.enabled === false || detail.mode === 'agent') {
      planModeEnabled.value = false
      return
    }
    if (detail.enabled === true || detail.mode === 'plan') {
      planModeEnabled.value = true
      return
    }
    void load()
  }

  watch(
    () => [identity().scope, identity().scopeId, identity().exactSessionId],
    () => { void load() },
    { immediate: true },
  )

  onMounted(() => {
    window.addEventListener('ccm-conversation-plan-mode-changed', onExternalChange)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('ccm-conversation-plan-mode-changed', onExternalChange)
  })

  const messageHasPlan = (msg, index) => {
    if (presentedPlanFromMessage(msg)) return true
    const events = resolve(options.executionEvents)
    const messages = resolve(options.messages)
    if (!events || !messages) return false
    return executionEventsForMessage(events, messages, index).some(event => (
      event?.eventType === 'requirement_plan' && event?.detail?.requirementPlan
    ))
  }

  const canConfirmExecute = (msg, index) => {
    if (!conversationPlanModeSupported(identity().scope)) return false
    if (confirmBusy.value) return false
    if (resolve(options.turnBusy)) return false
    if (msg?.streaming) return false
    const messages = resolve(options.messages) || []
    return isLatestUnansweredPresentedPlan(messages, msg, messageHasPlan, index)
  }

  const planForMessage = (msg, index) => {
    const fromMessage = presentedPlanFromMessage(msg)
    if (fromMessage) return fromMessage
    const messages = resolve(options.messages) || []
    const resolvedIndex = Number.isInteger(index) ? index : messages.indexOf(msg)
    if (resolvedIndex < 0) return null
    const events = resolve(options.executionEvents)
    if (!events) return null
    const event = [...executionEventsForMessage(events, messages, resolvedIndex)].reverse().find(item => (
      item?.eventType === 'requirement_plan' && item?.detail?.requirementPlan
    ))
    const plan = event?.detail?.requirementPlan
    const steps = Array.isArray(plan?.steps) ? plan.steps.filter(step => String(step?.title || '').trim()) : []
    return steps.length ? plan : null
  }

  const canConfirmOnPlanCard = (msg, index) => canConfirmExecute(msg, index) && !!planForMessage(msg, index)

  const confirmExecute = async (msg, planOverride, index) => {
    const plan = usablePlan(planOverride) || planForMessage(msg, index)
    if (!plan || confirmBusy.value) return
    const id = identity()
    if (!id.exactSessionId) {
      toast.error('当前会话尚未创建')
      return
    }
    if (!conversationPlanModeSupported(id.scope)) {
      toast.error(GLOBAL_CONVERSATION_PLAN_MODE_UNSUPPORTED)
      return
    }
    confirmBusy.value = true
    try {
      await exitConversationPlanMode(id)
      planModeEnabled.value = false
      const result = await options.send?.({ queueTurn: { message: buildPresentedPlanConfirmExecuteMessage(plan) } })
      if (result?.success === false) throw new Error(result.error || '发送失败')
    } catch (error) {
      toast.error(error?.message || '确认并执行失败')
    } finally {
      confirmBusy.value = false
    }
  }

  return {
    planModeEnabled,
    confirmBusy,
    loading,
    confirmExecuteLabel: PRESENTED_PLAN_CONFIRM_EXECUTE_LABEL,
    canConfirmExecute,
    planForMessage,
    canConfirmOnPlanCard,
    confirmExecute,
    load,
  }
}
