import { computed, ref } from 'vue'

const SESSIONS_STORAGE_KEY = 'cc_global_assistant_sessions_v2'
const CURRENT_ID_STORAGE_KEY = 'cc_global_assistant_current_id_v2'
const SESSION_MESSAGE_LIMIT = 120

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

const normalizeMessage = (message) => {
  if (!message || !['user', 'assistant'].includes(String(message.role || ''))) return null
  const content = String(message.content || '').trim()
  if (!content) return null
  return {
    ...message,
    role: String(message.role),
    content,
    timestamp: message.timestamp || new Date().toISOString(),
  }
}

const messageKey = (message) => [
  String(message?.role || ''),
  String(message?.timestamp || ''),
  String(message?.content || ''),
].join('\u0001')

const messageSignature = (message) => {
  try {
    return JSON.stringify(message || {})
  } catch {
    return messageKey(message)
  }
}

const mergeHistoryMessages = (current = [], incoming = []) => {
  const byKey = new Map()
  for (const raw of [...(current || []), ...(incoming || [])]) {
    const message = normalizeMessage(raw)
    if (!message) continue
    const key = messageKey(message)
    const previous = byKey.get(key)
    byKey.set(key, previous ? {
      ...previous,
      ...message,
      role: previous.role,
      content: previous.content,
      timestamp: previous.timestamp,
    } : message)
  }
  return [...byKey.values()]
    .sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')))
    .slice(-SESSION_MESSAGE_LIMIT)
}

const messagesChanged = (before = [], after = []) => {
  if (before.length !== after.length) return true
  return before.some((message, index) => messageSignature(message) !== messageSignature(after[index]))
}

const sessionUpdatedAt = (session) => {
  const messages = Array.isArray(session?.messages) ? session.messages : []
  return session?.updatedAt || session?.updated_at || messages[messages.length - 1]?.timestamp || session?.createdAt || ''
}

const normalizeSession = (session) => {
  const id = String(session?.id || '').trim()
  if (!id) return null
  const messages = mergeHistoryMessages([], Array.isArray(session.messages) ? session.messages : [])
  if (!messages.length) return null
  return {
    ...session,
    id,
    name: session.name || '全局 Agent 会话',
    messages,
    createdAt: session.createdAt || session.created_at || new Date().toISOString(),
    updatedAt: sessionUpdatedAt(session) || new Date().toISOString(),
  }
}

export const __globalAgentSessionTestHooks = {
  normalizeMessage,
  mergeHistoryMessages,
  messagesChanged,
}

export function useGlobalAgentSessions(options = {}) {
  const sessions = ref([])
  const currentSessionId = ref('')
  let syncInFlight = false

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

  const persistLocalHistory = () => {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.value))
    localStorage.setItem(CURRENT_ID_STORAGE_KEY, currentSessionId.value)
  }

  const loadHistory = () => {
    try {
      const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY)
      const savedCurrentId = localStorage.getItem(CURRENT_ID_STORAGE_KEY)

      if (savedSessions) {
        sessions.value = (JSON.parse(savedSessions) || []).map(normalizeSession).filter(Boolean)
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
      persistLocalHistory()
      fetch('/api/global-agent/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions: sessions.value, currentSessionId: currentSessionId.value })
      }).catch(() => {})
    } catch {}
  }

  const syncHistoryFromServer = async (syncOptions = {}) => {
    if (syncInFlight) return false
    syncInFlight = true
    try {
      const res = await fetch('/api/global-agent/history', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || data.success === false) return false
      const incoming = Array.isArray(data.sessions) ? data.sessions.map(normalizeSession).filter(Boolean) : []
      if (!incoming.length) return false

      const byId = new Map(sessions.value.map(session => [session.id, session]))
      let changed = false
      for (const serverSession of incoming) {
        const existing = byId.get(serverSession.id)
        if (!existing) {
          sessions.value.push(serverSession)
          byId.set(serverSession.id, serverSession)
          changed = true
          continue
        }
        const merged = mergeHistoryMessages(existing.messages || [], serverSession.messages || [])
        if (messagesChanged(existing.messages || [], merged)) changed = true
        existing.messages = merged
        existing.name = existing.name || serverSession.name
        existing.createdAt = existing.createdAt || serverSession.createdAt
        existing.updatedAt = [sessionUpdatedAt(existing), sessionUpdatedAt(serverSession)].sort().pop() || existing.updatedAt
      }

      const serverCurrentId = String(data.current_session_id || data.currentSessionId || '').trim()
      if (
        serverCurrentId
        && byId.has(serverCurrentId)
        && (syncOptions.preferServerCurrent || !currentSessionId.value || !byId.has(currentSessionId.value))
      ) {
        if (currentSessionId.value !== serverCurrentId) changed = true
        currentSessionId.value = serverCurrentId
      }
      if (!currentSessionId.value && sessions.value[0]) {
        currentSessionId.value = sessions.value[0].id
        changed = true
      }
      if (changed) persistLocalHistory()
      return changed
    } catch {
      return false
    } finally {
      syncInFlight = false
    }
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
    syncHistoryFromServer,
    createNewSession,
    selectSession,
    deleteSession,
    clearAllSessions,
  }
}
