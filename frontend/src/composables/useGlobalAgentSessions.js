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

const messageStableIdentity = (message) => {
  const explicitId = message?.id || message?.message_id || message?.messageId
  if (explicitId) return `message:${explicitId}`
  const runId = message?.agenticRun?.id || message?.agentic_run?.id || message?.run_id || message?.runId
  if (runId && (message?.type === 'global_stream' || message?.agenticRun || message?.agentic_run)) {
    return `run:${runId}`
  }
  const missionId = message?.globalMission?.id || message?.global_mission?.id
  if (missionId && message?.type === 'global_mission') return `mission:${missionId}`
  return ''
}

const messageLegacyKey = (message) => [
  String(message?.role || ''),
  String(message?.timestamp || ''),
  String(message?.content || ''),
].join('\u0001')

const messageKey = (message) => {
  const stableIdentity = messageStableIdentity(message)
  return stableIdentity
    ? [String(message?.role || ''), stableIdentity].join('\u0001')
    : messageLegacyKey(message)
}

const addStableLegacyCandidate = (candidatesByLegacy, legacyKey, record) => {
  const candidates = candidatesByLegacy.get(legacyKey) || new Set()
  candidates.add(record)
  candidatesByLegacy.set(legacyKey, candidates)
}

const uniqueStableLegacyCandidate = (candidatesByLegacy, legacyKey) => {
  const candidates = candidatesByLegacy.get(legacyKey)
  return candidates?.size === 1 ? [...candidates][0] : null
}

const plainLegacyRecord = (recordsByPlainLegacyKey, legacyKey) => {
  const record = recordsByPlainLegacyKey.get(legacyKey)
  return record && !messageStableIdentity(record.message) ? record : null
}

const messageRevisionAt = (message) => {
  const run = message?.agenticRun || message?.agentic_run || {}
  const mission = message?.globalMission || message?.global_mission || {}
  const values = [
    message?.updated_at,
    message?.updatedAt,
    run?.updated_at,
    run?.updatedAt,
    run?.completed_at,
    run?.completedAt,
    mission?.updated_at,
    mission?.updatedAt,
    message?.timestamp,
  ]
  return Math.max(0, ...values.map(value => Date.parse(String(value || '')) || 0))
}

const mergeMessageVersions = (previous, incoming) => {
  const previousRevision = messageRevisionAt(previous)
  const incomingRevision = messageRevisionAt(incoming)
  if (previousRevision > incomingRevision) return { ...incoming, ...previous }
  if (incomingRevision > previousRevision) return { ...previous, ...incoming }
  return {
    ...previous,
    ...incoming,
    role: previous.role,
    content: previous.content,
    timestamp: previous.timestamp,
  }
}

const messageSignature = (message) => {
  try {
    return JSON.stringify(message || {})
  } catch {
    return messageKey(message)
  }
}

const mergeHistoryMessages = (current = [], incoming = []) => {
  const records = []
  const recordsByStableKey = new Map()
  const recordsByPlainLegacyKey = new Map()
  const stableCandidatesByLegacyKey = new Map()
  for (const raw of [...(current || []), ...(incoming || [])]) {
    const message = normalizeMessage(raw)
    if (!message) continue
    const stableKey = messageStableIdentity(message)
      ? messageKey(message)
      : ''
    const legacyKey = messageLegacyKey(message)
    let record = stableKey
      ? recordsByStableKey.get(stableKey) || plainLegacyRecord(recordsByPlainLegacyKey, legacyKey)
      : plainLegacyRecord(recordsByPlainLegacyKey, legacyKey) || uniqueStableLegacyCandidate(stableCandidatesByLegacyKey, legacyKey)
    if (!record) {
      record = { message }
      records.push(record)
    } else {
      record.message = mergeMessageVersions(record.message, message)
    }

    const mergedStableKey = messageStableIdentity(record.message)
      ? messageKey(record.message)
      : ''
    const mergedLegacyKey = messageLegacyKey(record.message)
    if (mergedStableKey) {
      recordsByStableKey.set(mergedStableKey, record)
      addStableLegacyCandidate(stableCandidatesByLegacyKey, mergedLegacyKey, record)
      if (stableKey) addStableLegacyCandidate(stableCandidatesByLegacyKey, legacyKey, record)
    } else {
      recordsByPlainLegacyKey.set(mergedLegacyKey, record)
      recordsByPlainLegacyKey.set(legacyKey, record)
    }
  }
  return records
    .map(record => record.message)
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
  messageKey,
  messageRevisionAt,
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
