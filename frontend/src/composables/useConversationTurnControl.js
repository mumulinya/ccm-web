import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { conversationTurnsApi } from '../api/index.js'
import { subscribeRuntimeEvents } from '../utils/runtimeEventBus.js'

export function useConversationTurnControl(options = {}) {
  const mode = ref(options.defaultMode || 'queue')
  const turns = ref([])
  const loading = ref(false)
  const draining = ref(false)
  let pollTimer = null
  let refreshTimer = null
  let unsubscribeRuntime = null

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
    const payload = {
      scope: scope(),
      conversation_id: conversationId(),
      mode: requestedMode,
      message,
      active_run_id: activeRunId,
      request_id: requestId || `turn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      metadata,
    }
    let request = payload
    if (attachments.some(item => typeof File !== 'undefined' && item instanceof File)) {
      const form = new FormData()
      form.append('payload', JSON.stringify(payload))
      attachments.forEach(file => form.append('files', file, file.name))
      request = form
    } else if (attachments.length) request = { ...payload, attachments }
    const data = await conversationTurnsApi.enqueue(request)
    await refresh()
    return data.turn
  }

  const hydrateClaimedAttachments = async (turn) => {
    const refs = Array.isArray(turn?.attachmentRefs) ? turn.attachmentRefs : []
    if (!refs.length) return turn
    const files = await Promise.all(refs.map(async ref => {
      const response = await fetch(ref.url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`无法读取排队附件：${ref.name || '附件'}`)
      const blob = await response.blob()
      return new File([blob], ref.name || '附件', { type: ref.contentType || blob.type || 'application/octet-stream' })
    }))
    return { ...turn, files }
  }

  const settle = async (turn, status, extra = {}) => {
    if (!turn?.id) return null
    const data = await conversationTurnsApi.settle({ id: turn.id, status, revision: turn.revision, ...extra })
    await refresh()
    return data.turn
  }

  const cancel = async (turn) => {
    if (!turn?.id) return
    try { await conversationTurnsApi.cancel(turn.id, '', turn.revision) }
    finally { await refresh().catch(() => {}) }
  }

  const guide = async (turn) => {
    if (!turn?.id) return null
    try {
      const data = await conversationTurnsApi.guide(turn.id, turn.revision)
      return data.turn
    } finally { await refresh().catch(() => {}) }
  }

  const retry = async (turn) => {
    if (!turn?.id) return
    try { await conversationTurnsApi.retry(turn.id, turn.revision) }
    finally { await refresh().catch(() => {}) }
  }

  const drain = async (handler) => {
    if (draining.value || busy() || !scope() || !conversationId()) return false
    draining.value = true
    let handled = false
    try {
      while (!busy()) {
        const data = await conversationTurnsApi.claim({ scope: scope(), conversation_id: conversationId() })
        const claimed = data.turn
        if (!claimed) break
        let turn
        try { turn = await hydrateClaimedAttachments(claimed) }
        catch (error) {
          await settle(claimed, 'failed', { error: error?.message || String(error) })
          break
        }
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

  const apply = async (turn, handler) => {
    if (!turn?.id || draining.value) return false
    draining.value = true
    try {
      const data = await conversationTurnsApi.claim({ scope: scope(), conversation_id: conversationId(), id: turn.id, revision: turn.revision })
      const rawClaimed = data.turn
      if (!rawClaimed) throw new Error('这条消息已被处理或当前执行仍未到达安全调整点')
      let claimed
      try { claimed = await hydrateClaimedAttachments(rawClaimed) }
      catch (error) {
        await settle(rawClaimed, 'failed', { error: error?.message || String(error) })
        throw error
      }
      await refresh()
      try {
        const result = await handler(claimed)
        await settle(claimed, 'completed', { result: result || null })
      } catch (error) {
        await settle(claimed, 'failed', { error: error?.message || String(error) })
        throw error
      }
      return true
    } finally {
      draining.value = false
      await refresh().catch(() => {})
    }
  }

  const startPolling = () => {
    if (pollTimer) return
    pollTimer = window.setInterval(() => refresh().catch(() => {}), 15_000)
  }
  const stopPolling = () => {
    if (pollTimer) window.clearInterval(pollTimer)
    pollTimer = null
  }

  onMounted(() => {
    refresh().catch(() => {})
    startPolling()
    unsubscribeRuntime = subscribeRuntimeEvents(['system'], event => {
      if (event?.type !== 'conversation.turn.changed') return
      if (String(event?.data?.sessionId || '') !== conversationId()) return
      if (refreshTimer) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null
        refresh().catch(() => {})
      }, 120)
    })
  })
  onUnmounted(() => {
    stopPolling()
    unsubscribeRuntime?.()
    unsubscribeRuntime = null
    if (refreshTimer) window.clearTimeout(refreshTimer)
    refreshTimer = null
  })
  watch(() => conversationId(), () => refresh().catch(() => {}))

  return { mode, turns, activeTurns, loading, draining, refresh, enqueue, settle, cancel, guide, retry, drain, apply }
}
