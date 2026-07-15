import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { conversationTurnsApi } from '../api/index.js'

export function useConversationTurnControl(options = {}) {
  const mode = ref(options.defaultMode || 'steer')
  const turns = ref([])
  const loading = ref(false)
  const draining = ref(false)
  let pollTimer = null

  const readValue = (value) => typeof value === 'function' ? value() : value?.value ?? value
  const scope = () => String(readValue(options.scope) || '').trim()
  const conversationId = () => String(readValue(options.conversationId) || '').trim()
  const busy = () => Boolean(readValue(options.busy))
  const activeTurns = computed(() => turns.value.filter(turn => ['queued', 'sending', 'failed'].includes(turn.status)))

  const refresh = async () => {
    const currentScope = scope()
    const currentConversation = conversationId()
    if (!currentScope || !currentConversation) {
      turns.value = []
      return []
    }
    loading.value = true
    try {
      const data = await conversationTurnsApi.list({
        scope: currentScope,
        conversationId: currentConversation,
        statuses: 'queued,sending,failed',
      })
      turns.value = data.turns || []
      return turns.value
    } finally {
      loading.value = false
    }
  }

  const enqueue = async ({ message, attachments = [], mode: requestedMode = mode.value, activeRunId = '', metadata = {}, requestId = '' }) => {
    const data = await conversationTurnsApi.enqueue({
      scope: scope(),
      conversation_id: conversationId(),
      mode: requestedMode,
      message,
      attachments,
      active_run_id: activeRunId,
      request_id: requestId || `turn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      metadata,
    })
    await refresh()
    return data.turn
  }

  const settle = async (turn, status, extra = {}) => {
    if (!turn?.id) return null
    const data = await conversationTurnsApi.settle({ id: turn.id, status, ...extra })
    await refresh()
    return data.turn
  }

  const cancel = async (turn) => {
    if (!turn?.id) return
    await conversationTurnsApi.cancel(turn.id)
    await refresh()
  }

  const retry = async (turn) => {
    if (!turn?.id) return
    await conversationTurnsApi.retry(turn.id)
    await refresh()
  }

  const drain = async (handler) => {
    if (draining.value || busy() || !scope() || !conversationId()) return false
    draining.value = true
    let handled = false
    try {
      while (!busy()) {
        const data = await conversationTurnsApi.claim({ scope: scope(), conversation_id: conversationId() })
        const turn = data.turn
        if (!turn) break
        handled = true
        await refresh()
        try {
          const result = await handler(turn)
          await settle(turn, 'completed', { result: result || null })
        } catch (error) {
          await settle(turn, 'failed', { error: error?.message || String(error) })
          break
        }
      }
    } finally {
      draining.value = false
      await refresh().catch(() => {})
    }
    return handled
  }

  const startPolling = () => {
    if (pollTimer) return
    pollTimer = window.setInterval(() => refresh().catch(() => {}), 2500)
  }
  const stopPolling = () => {
    if (pollTimer) window.clearInterval(pollTimer)
    pollTimer = null
  }

  onMounted(() => {
    refresh().catch(() => {})
    startPolling()
  })
  onUnmounted(stopPolling)
  watch(() => conversationId(), () => refresh().catch(() => {}))

  return { mode, turns, activeTurns, loading, draining, refresh, enqueue, settle, cancel, retry, drain }
}
