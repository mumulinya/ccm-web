import { onMounted, onUnmounted, ref, unref, watch } from 'vue'

const resolveValue = value => typeof value === 'function' ? value() : unref(value)
export const SESSION_CONTEXT_USAGE_EVENT = 'ccm:session-context-usage'

export function notifySessionContextUsage(scope, scopeId, detail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SESSION_CONTEXT_USAGE_EVENT, {
    detail: { scope: String(scope || ''), scopeId: String(scopeId || ''), ...detail },
  }))
}

export function useSessionContextUsage(options = {}) {
  const usage = ref(null)
  const loading = ref(false)
  const error = ref('')
  const compacting = ref(false)
  let controller = null
  let pollTimer = null
  let refreshTimer = null
  let activityTimer = null
  let requestVersion = 0

  const clearPendingRequest = () => {
    if (controller) controller.abort()
    controller = null
  }

  const refresh = async () => {
    const scope = String(resolveValue(options.scope) || '').trim()
    const scopeId = String(resolveValue(options.scopeId) || '').trim()
    const enabled = resolveValue(options.enabled) !== false
    if (!enabled || !scope || !scopeId) {
      clearPendingRequest()
      usage.value = null
      error.value = ''
      loading.value = false
      return null
    }

    clearPendingRequest()
    controller = new AbortController()
    const version = ++requestVersion
    loading.value = !usage.value
    error.value = ''
    try {
      const response = await fetch(`/api/memory-center/scope?scope=${encodeURIComponent(scope)}&id=${encodeURIComponent(scopeId)}`, {
        signal: controller.signal,
      })
      const data = await response.json()
      if (!response.ok || data.success === false) throw new Error(data.error || '上下文信息暂不可用')
      if (version === requestVersion) usage.value = data.summary || null
      return data.summary || null
    } catch (cause) {
      if (cause?.name !== 'AbortError' && version === requestVersion) {
        error.value = cause?.message || '上下文信息暂不可用'
      }
      return null
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  const scheduleRefresh = (delay = 700) => {
    if (refreshTimer) window.clearTimeout(refreshTimer)
    refreshTimer = window.setTimeout(refresh, delay)
  }

  const onContextUsageEvent = event => {
    const detail = event.detail || {}
    if (String(detail.scope || '') !== String(resolveValue(options.scope) || '')) return
    if (String(detail.scopeId || '') !== String(resolveValue(options.scopeId) || '')) return
    if (detail.active !== undefined) compacting.value = detail.active === true
    scheduleRefresh(detail.active === true ? 0 : 120)
  }

  const syncActivityPolling = active => {
    if (activityTimer) window.clearInterval(activityTimer)
    activityTimer = null
    if (active && resolveValue(options.enabled) !== false) {
      refresh()
      activityTimer = window.setInterval(refresh, 2_000)
    }
  }

  watch(
    () => [resolveValue(options.scope), resolveValue(options.scopeId), resolveValue(options.enabled)],
    () => {
      scheduleRefresh(0)
      if (options.activeRequest !== undefined) syncActivityPolling(resolveValue(options.activeRequest) === true)
    },
    { immediate: true },
  )

  if (options.refreshKey !== undefined) {
    watch(() => resolveValue(options.refreshKey), () => scheduleRefresh())
  }

  if (options.activeRequest !== undefined) {
    watch(() => resolveValue(options.activeRequest), value => syncActivityPolling(value === true), { immediate: true })
  }

  onMounted(() => {
    window.addEventListener(SESSION_CONTEXT_USAGE_EVENT, onContextUsageEvent)
    const interval = Math.max(10_000, Number(options.pollInterval || 15_000))
    pollTimer = window.setInterval(refresh, interval)
  })

  onUnmounted(() => {
    window.removeEventListener(SESSION_CONTEXT_USAGE_EVENT, onContextUsageEvent)
    clearPendingRequest()
    if (pollTimer) window.clearInterval(pollTimer)
    if (refreshTimer) window.clearTimeout(refreshTimer)
    if (activityTimer) window.clearInterval(activityTimer)
  })

  return { usage, loading, error, compacting, refresh }
}
