import { onUnmounted, ref, watch } from 'vue'
import { api } from '../api/index.js'
import { toast } from '../utils/toast.js'
import { subscribeRuntimeEvents } from '../utils/runtimeEventBus.js'

function readValue(value) {
  return typeof value === 'function' ? value() : value?.value ?? value
}

export function usePermissionApprovals({ scope, active, onApproved } = {}) {
  const requests = ref([])
  const loading = ref(false)
  const busyId = ref('')
  let pollTimer = null
  let eventTimer = null
  let unsubscribeEvents = null
  let loadGeneration = 0

  const currentScope = () => ({ ...(readValue(scope) || {}) })
  const isActive = () => readValue(active) !== false
  const hasScope = (value) => !!(value.originType && value.originSessionId)

  const load = async ({ quiet = false } = {}) => {
    const selected = currentScope()
    if (!isActive() || !hasScope(selected)) {
      requests.value = []
      return
    }
    const generation = ++loadGeneration
    if (!quiet) loading.value = true
    try {
      const query = new URLSearchParams({
        state: 'awaiting_user',
        origin_type: selected.originType,
        origin_session_id: selected.originSessionId,
      })
      if (selected.originGroupId) query.set('origin_group_id', selected.originGroupId)
      if (selected.originProject) query.set('origin_project', selected.originProject)
      const result = await api(`/api/tasks/permission-requests?${query.toString()}`)
      if (generation === loadGeneration) requests.value = Array.isArray(result.requests) ? result.requests : []
    } catch (error) {
      if (!quiet) toast.error(error?.message || '读取权限申请失败')
    } finally {
      if (generation === loadGeneration) loading.value = false
    }
  }

  const decide = async (request, decision) => {
    if (!request?.id || busyId.value) return
    busyId.value = request.id
    try {
      const result = await api('/api/tasks/permission-requests/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request.id,
          decision,
          maxUses: 1,
          expiresInMinutes: 15,
        }),
      })
      requests.value = requests.value.filter(item => item.id !== request.id)
      toast.success(decision === 'approve' ? '已批准一次，授权将在 15 分钟内失效' : '已拒绝这项权限申请')
      if (decision === 'approve') await onApproved?.(request, result)
    } catch (error) {
      toast.error(error?.message || '权限处理失败')
    } finally {
      busyId.value = ''
      void load({ quiet: true })
    }
  }

  const restartPolling = () => {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
    unsubscribeEvents?.()
    unsubscribeEvents = null
    if (eventTimer) clearTimeout(eventTimer)
    eventTimer = null
    void load()
    if (isActive() && hasScope(currentScope())) {
      pollTimer = setInterval(() => void load({ quiet: true }), 60_000)
      unsubscribeEvents = subscribeRuntimeEvents(['permission', 'system'], event => {
        if (event.type === 'disconnected' || event.type === 'heartbeat') return
        const selected = currentScope()
        const data = event.data || {}
        if (event.topic === 'permission') {
          if (data.originType && data.originType !== selected.originType) return
          if (data.originSessionId && data.originSessionId !== selected.originSessionId) return
        }
        if (eventTimer) clearTimeout(eventTimer)
        eventTimer = setTimeout(() => void load({ quiet: true }), 120)
      })
    }
  }

  watch(
    () => JSON.stringify({ active: isActive(), scope: currentScope() }),
    restartPolling,
    { immediate: true },
  )
  onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer)
    unsubscribeEvents?.()
    unsubscribeEvents = null
    if (eventTimer) clearTimeout(eventTimer)
    loadGeneration += 1
  })

  return {
    requests,
    loading,
    busyId,
    refresh: load,
    approve: request => decide(request, 'approve'),
    reject: request => decide(request, 'reject'),
  }
}
