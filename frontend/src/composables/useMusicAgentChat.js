import { nextTick, ref, watch } from 'vue'

const CHAT_STORAGE_KEY = 'aura-music-chat-messages'
const DEFAULT_GREETING = '你好！我是你的音乐助手\n告诉我你想听什么，我帮你找。\n\n支持：\n• B站音乐搜索与转码播放\n• 网易云音乐搜索与下载播放\n• 本地音乐库播放\n• 播放时歌词同步给音乐宠物'

export function useMusicAgentChat(options = {}) {
  const agentMessages = ref([])
  const agentInput = ref('')
  const agentLoading = ref(false)
  const agentChatEl = ref(null)
  const isAgentChatPinnedToBottom = ref(true)

  const agentMessageKeyMap = new WeakMap()
  let agentMessageKeySeq = 0
  let agentMessageIdSeq = 0
  let agentChatResizeObserver = null

  const nowLabel = () => options.nowLabel?.() || '00:00:00'
  const greetingMessage = (time = '00:00:00') => ({ role: 'agent', content: options.greeting || DEFAULT_GREETING, time })
  const createAgentMessageId = () => `music-chat-${Date.now().toString(36)}-${agentMessageIdSeq++}`

  const normalizeAgentMessage = (msg) => {
    const item = { ...(msg || {}) }
    if (!item._localId) item._localId = createAgentMessageId()
    return item
  }

  const normalizeAgentMessages = (messages) => {
    return (messages || []).map(normalizeAgentMessage)
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

  const loadChatMessages = () => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY)
      if (saved) {
        const msgs = JSON.parse(saved)
        if (Array.isArray(msgs) && msgs.length > 0) {
          agentMessages.value = normalizeAgentMessages(msgs)
          return
        }
      }
    } catch (e) {
      console.error('Failed to load chat messages:', e)
    }
    agentMessages.value = normalizeAgentMessages([greetingMessage()])
  }

  const saveChatMessages = () => {
    try {
      const limitMsgs = agentMessages.value.slice(-100)
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(limitMsgs))
    } catch (e) {
      console.error('Failed to save chat messages:', e)
    }
  }

  const clearChatHistory = async () => {
    const confirmed = options.confirmClear
      ? await options.confirmClear()
      : true
    if (!confirmed) return false
    agentMessages.value = normalizeAgentMessages([greetingMessage(nowLabel())])
    saveChatMessages()
    scrollChat({ force: true })
    return true
  }

  watch(agentMessages, () => {
    saveChatMessages()
  }, { deep: true })

  return {
    agentMessages,
    agentInput,
    agentLoading,
    agentChatEl,
    isAgentChatPinnedToBottom,
    pushAgentMessage,
    appendAgentMessageContent,
    setAgentMessageContent,
    getAgentMessageKey,
    captureAgentChatScroll,
    updateAgentChatScrollState,
    scrollChat,
    attachAgentChatResizeObserver,
    detachAgentChatResizeObserver,
    loadChatMessages,
    saveChatMessages,
    clearChatHistory,
  }
}
