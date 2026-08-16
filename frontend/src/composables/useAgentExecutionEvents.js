import { markRaw, onBeforeUnmount, ref, shallowRef, unref, watch } from 'vue'

const normalizedIdentity = options => ({
  scope: String(unref(options.scope) || ''),
  scopeId: String(unref(options.scopeId) || ''),
  exactSessionId: String(unref(options.exactSessionId) || ''),
  active: unref(options.active) !== false,
})

export function useAgentExecutionEvents(options) {
  const events = shallowRef([])
  const loading = ref(false)
  const connected = ref(false)
  const enabled = ref(true)
  const error = ref('')
  const meaningfulRevision = ref(0)
  const latestMeaningfulKey = ref('')
  const knownMeaningfulKeys = new Set()
  let source = null
  let identityVersion = 0
  let snapshotTimer = null
  let snapshotRetryTimer = null
  let pendingLiveRows = []
  let liveMergeFrame = 0

  const snapshotQueryFor = identity => new URLSearchParams({
    scope: identity.scope,
    scope_id: identity.scopeId,
    exact_session_id: identity.exactSessionId,
    limit: '500',
  })

  const logicalMeaningfulKey = item => {
    const type = String(item?.eventType || '')
    if (type === 'assistant_progress' || type === 'model_activity' || type === 'requirement_plan' || type === 'permission_required' || type === 'context_compacted') return `${type}:${item.eventId}`
    if (type.startsWith('tool_')) return item?.toolCallId ? `tool:${item.toolCallId}` : `tool:${item.eventId}`
    if (type.startsWith('agent_')) return `agent:${item?.agentRunId || [item?.taskId, item?.workItemId, item?.detail?.agentDisplay?.projectId, item?.generation].join(':')}`
    if (item?.display?.status === 'failed') return `failed:${item.eventId}`
    return ''
  }

  const belongsToIdentity = (item, identity) => {
    if (!item || typeof item !== 'object') return false
    if (item.scope && identity.scope && item.scope !== identity.scope) return false
    if (item.scopeId && identity.scopeId && item.scopeId !== identity.scopeId) return false
    if (item.exactSessionId && identity.exactSessionId && item.exactSessionId !== identity.exactSessionId) return false
    return true
  }

  const merge = (rows, notify = true) => {
    const identity = normalizedIdentity(options)
    const map = new Map()
    for (const item of events.value) {
      if (!item?.eventId || !belongsToIdentity(item, identity)) continue
      map.set(item.eventId, item)
    }
    for (const item of Array.isArray(rows) ? rows : []) {
      if (!item || item.schema !== 'ccm-user-visible-agent-event-v1' || !item.eventId) continue
      if (!belongsToIdentity(item, identity)) continue
      map.set(item.eventId, markRaw(item))
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

  const flushLiveMerges = () => {
    liveMergeFrame = 0
    if (!pendingLiveRows.length) return
    const queued = pendingLiveRows
    pendingLiveRows = []
    merge(queued, true)
  }

  const enqueueLiveEvent = item => {
    pendingLiveRows.push(item)
    if (liveMergeFrame || typeof requestAnimationFrame === 'undefined') {
      if (!liveMergeFrame) flushLiveMerges()
      return
    }
    liveMergeFrame = requestAnimationFrame(flushLiveMerges)
  }

  const close = () => {
    source?.close()
    source = null
    connected.value = false
    if (liveMergeFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(liveMergeFrame)
    liveMergeFrame = 0
    pendingLiveRows = []
    if (snapshotTimer) window.clearInterval(snapshotTimer)
    if (snapshotRetryTimer) window.clearTimeout(snapshotRetryTimer)
    snapshotTimer = null
    snapshotRetryTimer = null
  }

  // SSE is the fast path, while this snapshot request is the authority repair
  // path. A turn may finish between the initial list request and the stream
  // subscription, or a proxy may reconnect SSE without replaying every event.
  // Merging a low-frequency no-store snapshot makes completed query records
  // appear without requiring the user to refresh the whole conversation.
  const refreshSnapshot = async ({ notify = false, version = identityVersion } = {}) => {
    const identity = normalizedIdentity(options)
    if (!identity.active || !identity.scope || !identity.scopeId || !identity.exactSessionId) return
    try {
      const response = await fetch(`/api/agent-execution/events?${snapshotQueryFor(identity)}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) throw new Error(payload.error || '读取执行记录失败')
      if (version !== identityVersion) return
      enabled.value = payload.enabled !== false
      merge(payload.events, notify)
      error.value = ''
    } catch (cause) {
      if (version === identityVersion) error.value = cause?.message || '读取执行记录失败'
    }
  }

  const scheduleSnapshotRecovery = (version, delay = 1500) => {
    if (typeof window === 'undefined' || snapshotRetryTimer) return
    snapshotRetryTimer = window.setTimeout(async () => {
      snapshotRetryTimer = null
      if (version !== identityVersion) return
      await refreshSnapshot({ notify: true, version })
    }, delay)
  }

  const handlePageReturn = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    void refreshSnapshot({ notify: true })
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
    merge(unref(options.seedEvents), false)
    const query = snapshotQueryFor(identity)
    loading.value = true
    try {
      await refreshSnapshot({ notify: false, version })
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
      try { enqueueLiveEvent(JSON.parse(event.data)) } catch {}
    })
    source.onerror = () => {
      if (version !== identityVersion) return
      connected.value = false
      error.value = '执行记录连接正在重试'
      scheduleSnapshotRecovery(version)
    }
    if (typeof window !== 'undefined') {
      snapshotTimer = window.setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
        void refreshSnapshot({ notify: true, version })
      }, 15000)
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

  watch(
    () => unref(options.seedEvents),
    rows => merge(rows, false),
    { deep: false },
  )

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handlePageReturn)
    document.addEventListener('visibilitychange', handlePageReturn)
  }
  onBeforeUnmount(() => {
    close()
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handlePageReturn)
      document.removeEventListener('visibilitychange', handlePageReturn)
    }
  })
  return { events, loading, connected, enabled, error, meaningfulRevision, latestMeaningfulKey, refresh: refreshSnapshot, close }
}
