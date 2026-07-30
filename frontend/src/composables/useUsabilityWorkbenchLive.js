import { computed, ref } from 'vue'
import { subscribeRuntimeEvents } from '../utils/runtimeEventBus.js'

const STALE_AFTER_MS = 25_000

export function useUsabilityWorkbenchLive() {
  const data = ref(null)
  const loading = ref(true)
  const refreshing = ref(false)
  const realtimeConnected = ref(false)
  const stale = ref(false)
  const lastError = ref('')
  const lastSuccessfulAt = ref(0)
  let unsubscribeEvents = null
  let watchdog = null
  let recoveryTimer = null
  let fallbackTimer = null
  let refreshDebounce = null
  let requestGeneration = 0
  let activeController = null

  const cachedAt = computed(() => lastSuccessfulAt.value ? new Date(lastSuccessfulAt.value) : null)
  const cacheKey = () => {
    const userId = String(window.__CCM_AUTH__?.user?.id || window.__CCM_AUTH__?.user?.username || 'anonymous')
    return `ccm:usability-workbench:snapshot:v3:${userId}`
  }

  const cacheSnapshot = snapshot => {
    try {
      localStorage.setItem(cacheKey(), JSON.stringify({ saved_at: Date.now(), data: snapshot }))
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
      const cached = JSON.parse(localStorage.getItem(cacheKey()) || 'null')
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
    const generation = ++requestGeneration
    activeController?.abort()
    const controller = new AbortController()
    activeController = controller
    if (!quiet) refreshing.value = true
    try {
      const response = await fetch('/api/usability/workbench', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || `工作台请求失败 (${response.status})`)
      if (generation !== requestGeneration) return false
      applySnapshot(result)
      return true
    } catch (error) {
      if (error?.name === 'AbortError' || generation !== requestGeneration) return false
      lastError.value = error?.message || '工作台暂时无法连接'
      stale.value = !!data.value
      loading.value = false
      return false
    } finally {
      if (generation === requestGeneration) {
        refreshing.value = false
        if (activeController === controller) activeController = null
      }
    }
  }

  const loadPage = async (section, cursor = '', limit = 50) => {
    const params = new URLSearchParams({ section, limit: String(limit) })
    if (cursor) params.set('cursor', cursor)
    const response = await fetch(`/api/usability/workbench/items?${params}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.success === false) throw new Error(result.error || `工作台分页请求失败 (${response.status})`)
    return result
  }

  const scheduleRecovery = () => {
    if (recoveryTimer) return
    recoveryTimer = window.setTimeout(async () => {
      recoveryTimer = null
      await load(true)
    }, 3000)
  }

  const connect = () => {
    unsubscribeEvents?.()
    unsubscribeEvents = subscribeRuntimeEvents(['task', 'permission', 'agent', 'feishu', 'project', 'group', 'cron', 'system'], payload => {
      if (payload.type === 'connected' || payload.type === 'ready') {
        realtimeConnected.value = true
        lastError.value = ''
        return
      }
      if (payload.type === 'heartbeat') {
        realtimeConnected.value = true
        stale.value = false
        return
      }
      if (payload.type === 'disconnected') {
        realtimeConnected.value = false
        stale.value = !!data.value
        lastError.value = '实时连接中断，正在尝试恢复'
        scheduleRecovery()
        return
      }
      if (refreshDebounce) window.clearTimeout(refreshDebounce)
      refreshDebounce = window.setTimeout(() => load(true), 180)
    })
    void load(true)
    if (fallbackTimer) window.clearInterval(fallbackTimer)
    fallbackTimer = window.setInterval(() => load(true), 60_000)
    if (watchdog) window.clearInterval(watchdog)
    watchdog = window.setInterval(() => {
      if (lastSuccessfulAt.value && Date.now() - lastSuccessfulAt.value > STALE_AFTER_MS) stale.value = true
    }, 5000)
  }

  const disconnect = () => {
    requestGeneration++
    activeController?.abort()
    activeController = null
    unsubscribeEvents?.()
    unsubscribeEvents = null
    if (watchdog) window.clearInterval(watchdog)
    if (recoveryTimer) window.clearTimeout(recoveryTimer)
    if (fallbackTimer) window.clearInterval(fallbackTimer)
    if (refreshDebounce) window.clearTimeout(refreshDebounce)
    watchdog = null
    recoveryTimer = null
    fallbackTimer = null
    refreshDebounce = null
  }

  return {
    data, loading, refreshing, realtimeConnected, stale, lastError, cachedAt,
    hydrateCache, load, loadPage, connect, disconnect, applySnapshot,
  }
}
