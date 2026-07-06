import { computed, ref } from 'vue'

const SESSIONS_STORAGE_KEY = 'cc_global_assistant_sessions_v2'
const CURRENT_ID_STORAGE_KEY = 'cc_global_assistant_current_id_v2'

const createWelcomeMessage = (welcome) => ({
  ...(welcome || {}),
  timestamp: new Date().toISOString(),
})

const createSession = (name, welcome) => ({
  id: 'session_' + Date.now(),
  name,
  messages: [createWelcomeMessage(welcome)],
  createdAt: new Date().toISOString(),
})

export function useGlobalAgentSessions(options = {}) {
  const sessions = ref([])
  const currentSessionId = ref('')

  const currentSession = computed(() => {
    return sessions.value.find(s => s.id === currentSessionId.value) || null
  })

  const messages = computed(() => {
    return currentSession.value ? currentSession.value.messages : []
  })

  const resetToDefaultSession = () => {
    const defaultSession = createSession('默认会话', options.defaultWelcome)
    sessions.value = [defaultSession]
    currentSessionId.value = defaultSession.id
  }

  const loadHistory = () => {
    try {
      const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY)
      const savedCurrentId = localStorage.getItem(CURRENT_ID_STORAGE_KEY)

      if (savedSessions) {
        sessions.value = JSON.parse(savedSessions)
      }

      if (sessions.value.length === 0) {
        resetToDefaultSession()
      } else {
        currentSessionId.value = savedCurrentId || sessions.value[0].id
        if (!sessions.value.some(s => s.id === currentSessionId.value)) {
          currentSessionId.value = sessions.value[0].id
        }
      }
    } catch {
      resetToDefaultSession()
    }
  }

  const saveHistory = () => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.value))
      localStorage.setItem(CURRENT_ID_STORAGE_KEY, currentSessionId.value)
      fetch('/api/global-agent/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions: sessions.value, currentSessionId: currentSessionId.value })
      }).catch(() => {})
    } catch {}
  }

  const createNewSession = () => {
    const newSession = createSession('新会话', options.defaultWelcome)
    sessions.value.unshift(newSession)
    currentSessionId.value = newSession.id
    saveHistory()
    options.onCreated?.(newSession)
    return newSession
  }

  const selectSession = (id) => {
    currentSessionId.value = id
    saveHistory()
    options.onSelected?.(id)
  }

  const deleteSession = async (id, event) => {
    if (event) event.stopPropagation()

    const targetSession = sessions.value.find(s => s.id === id)
    const sessionName = targetSession ? targetSession.name : '该会话'

    const confirmed = options.confirmDelete
      ? await options.confirmDelete(sessionName)
      : true
    if (!confirmed) return null

    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx === -1) return null

    const [deleted] = sessions.value.splice(idx, 1)
    if (sessions.value.length === 0) {
      resetToDefaultSession()
    } else if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0].id
    }
    saveHistory()
    options.onDeleted?.(deleted)
    return deleted
  }

  const clearAllSessions = () => {
    const confirmed = options.confirmClear
      ? options.confirmClear()
      : true
    if (!confirmed) return false

    resetToDefaultSession()
    saveHistory()
    options.onCleared?.()
    return true
  }

  return {
    sessions,
    currentSessionId,
    currentSession,
    messages,
    loadHistory,
    saveHistory,
    createNewSession,
    selectSession,
    deleteSession,
    clearAllSessions,
  }
}
