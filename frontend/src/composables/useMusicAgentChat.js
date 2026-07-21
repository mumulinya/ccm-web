import { nextTick, ref } from 'vue'

const DEFAULT_GREETING = '你好！我是你的音乐助手\n告诉我你想听什么，我帮你找。\n\n支持：\n• B站音乐搜索与转码播放\n• 网易云音乐搜索与下载播放\n• 本地音乐库播放\n• 播放时歌词同步给音乐宠物'

export function useMusicAgentChat(options = {}) {
  const agentMessages = ref([])
  const agentInput = ref('')
  const agentLoading = ref(false)
  const musicMemoryContext = ref(null)
  const agentChatEl = ref(null)
  const isAgentChatPinnedToBottom = ref(true)
  const agentRequestStopped = ref(false)

  const agentMessageKeyMap = new WeakMap()
  let agentMessageKeySeq = 0
  let agentMessageIdSeq = 0
  let agentChatResizeObserver = null
  let activeRequestController = null

  const nowLabel = () => options.nowLabel?.() || '00:00:00'
  const greetingMessage = (time = '00:00:00') => ({ role: 'agent', content: options.greeting || DEFAULT_GREETING, time })
  const createAgentMessageId = () => `music-chat-${Date.now().toString(36)}-${agentMessageIdSeq++}`

  const normalizeAgentMessage = (msg) => {
    const item = { ...(msg || {}) }
    if (!item._localId) item._localId = createAgentMessageId()
    return item
  }

  const normalizeAgentMessages = (messages) => {
    return (messages || []).filter(msg => msg?.role !== 'bash').map(normalizeAgentMessage)
  }

  const pushAgentMessage = (msg) => {
    const item = normalizeAgentMessage(msg)
    agentMessages.value.push(item)
    return item
  }

  const updateAgentMessage = (target, updater) => {
    const idx = agentMessages.value.findIndex((item) => item._localId === target?._localId)
    if (idx === -1) return
    updater(agentMessages.value[idx])
  }

  const appendAgentMessageContent = (target, text) => {
    updateAgentMessage(target, (item) => {
      item.content = `${item.content || ''}${text || ''}`
    })
  }

  const setAgentMessageContent = (target, text) => {
    updateAgentMessage(target, (item) => {
      item.content = text || ''
    })
  }

  const setAgentMessageResults = (target, results) => {
    updateAgentMessage(target, (item) => { item.results = Array.isArray(results) ? results : [] })
  }

  const buildAgentRequestHistory = ({ exclude = null, limit = 10 } = {}) => {
    return agentMessages.value
      .filter((item) => item !== exclude && item?._localId !== exclude?._localId)
      .map((item) => ({
        role: item?.role,
        content: typeof item?.content === 'string' ? item.content.trim() : '',
      }))
      .filter((item) => ['operator', 'user', 'agent', 'assistant'].includes(item.role) && item.content)
      .slice(-Math.max(1, limit))
  }

  const getAgentMessageKey = (msg) => {
    if (!msg || typeof msg !== 'object') return `empty-${agentMessageKeySeq++}`
    const existing = agentMessageKeyMap.get(msg)
    if (existing) return existing
    const key = msg.id
      ? `msg-${msg.id}`
      : msg._localId
        ? `local-${msg._localId}`
        : `local-${Date.now().toString(36)}-${agentMessageKeySeq++}`
    agentMessageKeyMap.set(msg, key)
    return key
  }

  const isNearAgentChatBottom = () => {
    const el = agentChatEl.value
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight <= 120
  }

  const captureAgentChatScroll = () => {
    const el = agentChatEl.value
    if (!el) return null
    return {
      pinned: isNearAgentChatBottom(),
      bottomOffset: Math.max(0, el.scrollHeight - el.scrollTop),
    }
  }

  const updateAgentChatScrollState = () => {
    isAgentChatPinnedToBottom.value = isNearAgentChatBottom()
  }

  const scrollChat = ({ force = false, anchor = null } = {}) => {
    const scrollAnchor = force ? null : (anchor || captureAgentChatScroll())
    nextTick(() => {
      const el = agentChatEl.value
      if (!el) return
      if (force || scrollAnchor?.pinned || (!scrollAnchor && isAgentChatPinnedToBottom.value)) {
        el.scrollTop = el.scrollHeight
        isAgentChatPinnedToBottom.value = true
      } else if (scrollAnchor) {
        el.scrollTop = Math.max(0, el.scrollHeight - scrollAnchor.bottomOffset)
        isAgentChatPinnedToBottom.value = isNearAgentChatBottom()
      }
    })
  }

  const attachAgentChatResizeObserver = () => {
    if (!agentChatEl.value || agentChatResizeObserver || typeof ResizeObserver === 'undefined') return
    agentChatResizeObserver = new ResizeObserver(() => {
      if (isAgentChatPinnedToBottom.value && agentChatEl.value?.clientHeight > 0) {
        scrollChat({ force: true })
      }
    })
    agentChatResizeObserver.observe(agentChatEl.value)
  }

  const detachAgentChatResizeObserver = () => {
    if (!agentChatResizeObserver) return
    agentChatResizeObserver.disconnect()
    agentChatResizeObserver = null
  }

  const serverMessage = (message) => ({
    _localId: String(message?.id || createAgentMessageId()),
    id: String(message?.id || ''),
    role: message?.role === 'assistant' ? 'agent' : 'operator',
    content: String(message?.content || ''),
    time: (() => {
      const date = new Date(message?.timestamp || '')
      return Number.isNaN(date.getTime()) ? nowLabel() : date.toLocaleTimeString('zh-CN', { hour12: false })
    })(),
    ...(message?.action ? { action: message.action } : {}),
    ...(Array.isArray(message?.results) ? { results: message.results } : {}),
  })

  const loadChatMessages = async () => {
    try {
      const response = await fetch('/api/music/memory')
      const data = await response.json()
      if (data?.success && data.memory) {
        musicMemoryContext.value = data.memory.context || null
        const messages = Array.isArray(data.memory.messages) ? data.memory.messages.map(serverMessage) : []
        agentMessages.value = normalizeAgentMessages(messages.length ? messages : [greetingMessage(nowLabel())])
        try { localStorage.removeItem('aura-music-chat-messages') } catch {}
        return
      }
    } catch (e) {
      console.error('Failed to load chat messages:', e)
    }
    agentMessages.value = normalizeAgentMessages([greetingMessage(nowLabel())])
  }

  const saveChatMessages = () => undefined

  const persistAssistantMessage = async (content, input = {}) => {
    const text = String(content || '').trim()
    if (!text) return null
    const response = await fetch('/api/music/memory/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, action: input.action || null, results: input.results || [] }),
    })
    const data = await response.json()
    if (!response.ok || data?.success === false) throw new Error(data?.error || '保存音乐助手记忆失败')
    musicMemoryContext.value = data.memory?.context || musicMemoryContext.value
    return data.message || null
  }

  const compactMusicMemory = async (instructions = '') => {
    const response = await fetch('/api/music/memory/compact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructions }),
    })
    const data = await response.json()
    if (!response.ok || data?.success === false) throw new Error(data?.error || '音乐记忆压缩失败')
    musicMemoryContext.value = data.memory?.context || musicMemoryContext.value
    return data.result || null
  }

  const clearChatHistory = async () => {
    const confirmed = options.confirmClear
      ? await options.confirmClear()
      : true
    if (!confirmed) return false
    try {
      const response = await fetch('/api/music/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeLongTerm: false }),
      })
      const data = await response.json()
      if (!response.ok || data?.success === false) throw new Error(data?.error || '清空音乐助手历史失败')
      agentMessages.value = normalizeAgentMessages([greetingMessage(nowLabel())])
      musicMemoryContext.value = null
    } catch (error) {
      console.error('Failed to clear music memory:', error)
      return false
    }
    scrollChat({ force: true })
    return true
  }

  const beginAgentRequest = () => {
    activeRequestController?.abort()
    activeRequestController = new AbortController()
    agentRequestStopped.value = false
    return activeRequestController.signal
  }

  const finishAgentRequest = () => {
    activeRequestController = null
  }

  const stopAgentRequest = () => {
    if (!activeRequestController) return false
    agentRequestStopped.value = true
    activeRequestController.abort()
    activeRequestController = null
    return true
  }

  const lastUserMessage = () => [...agentMessages.value].reverse().find(item => ['operator', 'user'].includes(item?.role) && String(item?.content || '').trim()) || null

  return {
    agentMessages,
    agentInput,
    agentLoading,
    agentChatEl,
    isAgentChatPinnedToBottom,
    pushAgentMessage,
    appendAgentMessageContent,
    setAgentMessageContent,
    setAgentMessageResults,
    buildAgentRequestHistory,
    getAgentMessageKey,
    captureAgentChatScroll,
    updateAgentChatScrollState,
    scrollChat,
    attachAgentChatResizeObserver,
    detachAgentChatResizeObserver,
    loadChatMessages,
    saveChatMessages,
    persistAssistantMessage,
    compactMusicMemory,
    musicMemoryContext,
    clearChatHistory,
    agentRequestStopped,
    beginAgentRequest,
    finishAgentRequest,
    stopAgentRequest,
    lastUserMessage,
  }
}
