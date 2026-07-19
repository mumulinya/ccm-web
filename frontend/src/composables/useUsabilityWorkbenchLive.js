import { computed, ref } from 'vue'

const CACHE_KEY = 'ccm:usability-workbench:snapshot:v2'
const STALE_AFTER_MS = 25_000

export function useUsabilityWorkbenchLive() {
  const data = ref(null)
  const loading = ref(true)
  const refreshing = ref(false)
  const realtimeConnected = ref(false)
  const stale = ref(false)
  const lastError = ref('')
  const lastSuccessfulAt = ref(0)
  let source = null
  let watchdog = null
  let recoveryTimer = null

  const cachedAt = computed(() => lastSuccessfulAt.value ? new Date(lastSuccessfulAt.value) : null)

  const cacheSnapshot = snapshot => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ saved_at: Date.now(), data: snapshot }))
    } catch {}
  }

  const applySnapshot = (snapshot, options = {}) => {
    if (!snapshot || typeof snapshot !== 'object') return false
    data.value = snapshot
    lastSuccessfulAt.value = Date.now()
    stale.value = false
    lastError.value = ''
    loading.value = false
    if (options.cache !== false) cacheSnapshot(snapshot)
    return true
  }

  const hydrateCache = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      if (!cached?.data) return false
      data.value = cached.data
      lastSuccessfulAt.value = Number(cached.saved_at || 0)
      stale.value = true
      loading.value = false
      return true
    } catch {
      return false
    }
  }

  const load = async (quiet = false) => {
    if (!quiet) refreshing.value = true
    try {
      const response = await fetch('/api/usability/workbench', { headers: { Accept: 'application/json' } })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || `工作台请求失败 (${response.status})`)
      applySnapshot(result)
      return true
    } catch (error) {
      lastError.value = error?.message || '工作台暂时无法连接'
      stale.value = !!data.value
      loading.value = false
      return false
    } finally {
      refreshing.value = false
    }
  }

  const scheduleRecovery = () => {
    if (recoveryTimer) return
    recoveryTimer = window.setTimeout(async () => {
      recoveryTimer = null
      await load(true)
    }, 3000)
  }

  const connect = () => {
    if (source) source.close()
    if (typeof EventSource === 'undefined') {
      stale.value = !!data.value
      return
    }
    source = new EventSource('/api/usability/workbench/stream')
    source.onopen = () => {
      realtimeConnected.value = true
      lastError.value = ''
    }
    source.onmessage = event => {
      try {
        const payload = JSON.parse(event.data)
        realtimeConnected.value = true
        lastSuccessfulAt.value = Date.now()
        if (payload.type === 'snapshot' || payload.type === 'update') applySnapshot(payload.data)
        else if (payload.type === 'heartbeat') stale.value = false
        else if (payload.type === 'warning') lastError.value = payload.message || '实时数据更新异常'
      } catch {}
    }
    source.onerror = () => {
      realtimeConnected.value = false
      stale.value = !!data.value
      lastError.value = '实时连接中断，正在尝试恢复'
      scheduleRecovery()
    }
    if (watchdog) window.clearInterval(watchdog)
    watchdog = window.setInterval(() => {
      if (lastSuccessfulAt.value && Date.now() - lastSuccessfulAt.value > STALE_AFTER_MS) stale.value = true
    }, 5000)
  }

  const disconnect = () => {
    source?.close()
    source = null
    if (watchdog) window.clearInterval(watchdog)
    if (recoveryTimer) window.clearTimeout(recoveryTimer)
    watchdog = null
    recoveryTimer = null
  }

  return {
    data, loading, refreshing, realtimeConnected, stale, lastError, cachedAt,
    hydrateCache, load, connect, disconnect, applySnapshot,
  }
}
