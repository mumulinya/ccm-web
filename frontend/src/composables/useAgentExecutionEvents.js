import { onBeforeUnmount, ref, unref, watch } from 'vue'

const normalizedIdentity = options => ({
  scope: String(unref(options.scope) || ''),
  scopeId: String(unref(options.scopeId) || ''),
  exactSessionId: String(unref(options.exactSessionId) || ''),
  active: unref(options.active) !== false,
})

export function useAgentExecutionEvents(options) {
  const events = ref([])
  const loading = ref(false)
  const connected = ref(false)
  const enabled = ref(true)
  const error = ref('')
  const meaningfulRevision = ref(0)
  const latestMeaningfulKey = ref('')
  const knownMeaningfulKeys = new Set()
  let source = null
  let identityVersion = 0

  const logicalMeaningfulKey = item => {
    const type = String(item?.eventType || '')
    if (type === 'assistant_progress' || type === 'model_activity' || type === 'requirement_plan' || type === 'permission_required' || type === 'context_compacted') return `${type}:${item.eventId}`
    if (type.startsWith('tool_')) return item?.toolCallId ? `tool:${item.toolCallId}` : `tool:${item.eventId}`
    if (type.startsWith('agent_')) return `agent:${item?.agentRunId || [item?.taskId, item?.workItemId, item?.detail?.agentDisplay?.projectId, item?.generation].join(':')}`
    if (item?.display?.status === 'failed') return `failed:${item.eventId}`
    return ''
  }

  const merge = (rows, notify = true) => {
    const map = new Map(events.value.map(item => [item.eventId, item]))
    for (const item of Array.isArray(rows) ? rows : []) {
      if (!item || item.schema !== 'ccm-user-visible-agent-event-v1' || !item.eventId) continue
      map.set(item.eventId, item)
      const meaningfulKey = logicalMeaningfulKey(item)
      if (meaningfulKey && !knownMeaningfulKeys.has(meaningfulKey)) {
        knownMeaningfulKeys.add(meaningfulKey)
        if (notify) {
          latestMeaningfulKey.value = meaningfulKey
          meaningfulRevision.value += 1
        }
      }
    }
    events.value = [...map.values()]
      .sort((left, right) => {
        const leftSequence = Number(left.sequence || 0) || Number.MAX_SAFE_INTEGER
        const rightSequence = Number(right.sequence || 0) || Number.MAX_SAFE_INTEGER
        return leftSequence - rightSequence || String(left.createdAt || '').localeCompare(String(right.createdAt || ''))
      })
      .slice(-3000)
  }

  const close = () => {
    source?.close()
    source = null
    connected.value = false
  }

  const connect = async () => {
    const identity = normalizedIdentity(options)
    const version = ++identityVersion
    close()
    events.value = []
    knownMeaningfulKeys.clear()
    meaningfulRevision.value = 0
    latestMeaningfulKey.value = ''
    error.value = ''
    if (!identity.active || !identity.scope || !identity.scopeId || !identity.exactSessionId) return
    const query = new URLSearchParams({
      scope: identity.scope,
      scope_id: identity.scopeId,
      exact_session_id: identity.exactSessionId,
      limit: '500',
    })
    loading.value = true
    try {
      const response = await fetch(`/api/agent-execution/events?${query}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || payload.success === false) throw new Error(payload.error || '读取执行记录失败')
      if (version !== identityVersion) return
      enabled.value = payload.enabled !== false
      merge(payload.events, false)
    } catch (cause) {
      if (version === identityVersion) error.value = cause?.message || '读取执行记录失败'
    } finally {
      if (version === identityVersion) loading.value = false
    }
    if (version !== identityVersion || typeof EventSource === 'undefined') return
    const cursor = events.value.at(-1)?.sequence || 0
    query.set('cursor', String(cursor))
    source = new EventSource(`/api/agent-execution/events/stream?${query}`)
    source.onopen = () => {
      if (version !== identityVersion) return
      connected.value = true
      error.value = ''
    }
    source.addEventListener('agent_execution', event => {
      if (version !== identityVersion) return
      try { merge([JSON.parse(event.data)], true) } catch {}
    })
    source.onerror = () => {
      if (version !== identityVersion) return
      connected.value = false
      error.value = '执行记录连接正在重试'
    }
  }

  watch(
    () => {
      const identity = normalizedIdentity(options)
      return `${identity.scope}:${identity.scopeId}:${identity.exactSessionId}:${identity.active}`
    },
    connect,
    { immediate: true },
  )

  onBeforeUnmount(close)
  return { events, loading, connected, enabled, error, meaningfulRevision, latestMeaningfulKey, refresh: connect, close }
}
