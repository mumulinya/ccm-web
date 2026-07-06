import { ref } from 'vue'

const postJson = async (url, body = {}) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok || data.success === false) throw new Error(data.error || '请求失败')
  return data
}

export function useGlobalAgentControlCenter(options = {}) {
  const chatInput = options.chatInput || ref('')
  const toast = options.toast || { success: () => {}, error: () => {} }

  const qualitySnapshot = ref(null)
  const qualityLoading = ref(false)
  const qualityExpanded = ref(false)
  const controlCenterExpanded = ref(false)
  const controlCenterLoading = ref(false)
  const controlCenter = ref(null)
  const intentPreviewText = ref('')
  const runtimePermissionForm = ref({ tool: '*', decision: 'deny', target: '', reason: '' })
  const runtimeHookForm = ref({ phase: 'pre_tool_use', tool: '*', effect: 'annotate', message: '' })

  const loadQualitySnapshot = async () => {
    qualityLoading.value = true
    try {
      const res = await fetch('/api/global-agent/quality')
      const data = await res.json()
      if (data.success) qualitySnapshot.value = data.quality
    } catch {} finally {
      qualityLoading.value = false
    }
  }

  const toggleShadowMode = async () => {
    if (!qualitySnapshot.value) return
    qualityLoading.value = true
    try {
      const next = !qualitySnapshot.value.policy?.shadowMode
      const res = await fetch('/api/global-agent/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shadowMode: next, reason: next ? '用户在评测中心启用影子模式' : '用户在评测中心关闭影子模式' })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || '更新失败')
      qualitySnapshot.value = data.quality
      toast.success(next ? '影子模式已启用：写工具只记录不执行' : '影子模式已关闭')
    } catch (error) {
      toast.error(error.message || '影子模式更新失败')
    } finally {
      qualityLoading.value = false
    }
  }

  const loadGlobalControlCenter = async (message = '') => {
    controlCenterLoading.value = true
    try {
      const query = message ? `?message=${encodeURIComponent(message)}` : ''
      const res = await fetch('/api/global-agent/control-center' + query)
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || '加载总控状态失败')
      controlCenter.value = data.control
      if (!intentPreviewText.value) intentPreviewText.value = chatInput.value || ''
    } catch (error) {
      toast.error(error?.message || '加载总控状态失败')
    } finally {
      controlCenterLoading.value = false
    }
  }

  const toggleControlCenter = async () => {
    controlCenterExpanded.value = !controlCenterExpanded.value
    if (controlCenterExpanded.value && !controlCenter.value) await loadGlobalControlCenter(chatInput.value)
  }

  const previewGlobalIntent = async () => {
    await loadGlobalControlCenter(intentPreviewText.value || chatInput.value || '')
  }

  const saveRuntimePermission = async () => {
    try {
      const data = await postJson('/api/global-agent/runtime/permissions', runtimePermissionForm.value)
      if (controlCenter.value) controlCenter.value.governance.permissions = data.rules || []
      toast.success('权限规则已保存')
    } catch (error) {
      toast.error(error?.message || '保存权限规则失败')
    }
  }

  const deleteRuntimePermission = async (rule) => {
    try {
      const data = await postJson('/api/global-agent/runtime/permissions', { operation: 'delete', id: rule.id })
      if (controlCenter.value) controlCenter.value.governance.permissions = data.rules || []
      toast.success('权限规则已删除')
    } catch (error) {
      toast.error(error?.message || '删除权限规则失败')
    }
  }

  const saveRuntimeHook = async () => {
    try {
      const data = await postJson('/api/global-agent/runtime/hooks', runtimeHookForm.value)
      if (controlCenter.value) controlCenter.value.governance.hooks = data.hooks || []
      toast.success('Hook 规则已保存')
    } catch (error) {
      toast.error(error?.message || '保存 Hook 失败')
    }
  }

  const deleteRuntimeHook = async (hook) => {
    try {
      const data = await postJson('/api/global-agent/runtime/hooks', { operation: 'delete', id: hook.id })
      if (controlCenter.value) controlCenter.value.governance.hooks = data.hooks || []
      toast.success('Hook 已删除')
    } catch (error) {
      toast.error(error?.message || '删除 Hook 失败')
    }
  }

  const controlSupervisorFromCenter = async (row, operation) => {
    if (!row?.id) return
    try {
      await postJson('/api/global-agent/supervisors/control', { id: row.id, operation, reason: '全局 Agent 总控面板操作' })
      await loadGlobalControlCenter(intentPreviewText.value || chatInput.value || '')
      toast.success('监工状态已更新')
    } catch (error) {
      toast.error(error?.message || '监工控制失败')
    }
  }

  return {
    qualitySnapshot,
    qualityLoading,
    qualityExpanded,
    controlCenterExpanded,
    controlCenterLoading,
    controlCenter,
    intentPreviewText,
    runtimePermissionForm,
    runtimeHookForm,
    loadQualitySnapshot,
    toggleShadowMode,
    loadGlobalControlCenter,
    toggleControlCenter,
    previewGlobalIntent,
    saveRuntimePermission,
    deleteRuntimePermission,
    saveRuntimeHook,
    deleteRuntimeHook,
    controlSupervisorFromCenter,
  }
}
