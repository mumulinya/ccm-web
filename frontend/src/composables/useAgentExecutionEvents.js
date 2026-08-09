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
  let source = null
  let identityVersion = 0

  const merge = rows => {
    const map = new Map(events.value.map(item => [item.eventId, item]))
    for (const item of Array.isArray(rows) ? rows : []) {
      if (!item || item.schema !== 'ccm-user-visible-agent-event-v1' || !item.eventId) continue
      map.set(item.eventId, item)
    }
    events.value = [...map.values()]
      .sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0) || String(left.createdAt || '').localeCompare(String(right.createdAt || '')))
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
      merge(payload.events)
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
      try { merge([JSON.parse(event.data)]) } catch {}
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
  return { events, loading, connected, enabled, error, refresh: connect, close }
}
