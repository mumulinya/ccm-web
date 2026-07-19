import { computed, reactive, readonly } from 'vue'

export const CHAT_IDENTITY_STORAGE_KEY = 'ccm-chat-identity-v1'

export const DEFAULT_CHAT_IDENTITY = Object.freeze({
  user: Object.freeze({ type: 'emoji', value: '👤' }),
  agent: Object.freeze({ type: 'emoji', value: '🤖' }),
})

const IMAGE_DATA_URL_PATTERN = /^data:image\/(?:png|jpeg|webp|gif);base64,/i

const normalizeAvatar = (value, fallback) => {
  const type = value?.type === 'image' ? 'image' : 'emoji'
  const content = String(value?.value || '').trim()
  if (type === 'image' && IMAGE_DATA_URL_PATTERN.test(content)) return { type, value: content }
  if (type === 'emoji' && content && content.length <= 16) return { type, value: content }
  return { ...fallback }
}

const normalizeIdentity = value => ({
  user: normalizeAvatar(value?.user, DEFAULT_CHAT_IDENTITY.user),
  agent: normalizeAvatar(value?.agent, DEFAULT_CHAT_IDENTITY.agent),
})

const readStoredIdentity = () => {
  if (typeof window === 'undefined') return normalizeIdentity(DEFAULT_CHAT_IDENTITY)
  try {
    return normalizeIdentity(JSON.parse(window.localStorage.getItem(CHAT_IDENTITY_STORAGE_KEY) || '{}'))
  } catch {
    return normalizeIdentity(DEFAULT_CHAT_IDENTITY)
  }
}

const identity = reactive(readStoredIdentity())

const replaceIdentity = value => {
  const normalized = normalizeIdentity(value)
  identity.user = normalized.user
  identity.agent = normalized.agent
}

const persistIdentity = () => {
  if (typeof window === 'undefined') return true
  try {
    window.localStorage.setItem(CHAT_IDENTITY_STORAGE_KEY, JSON.stringify({
      user: identity.user,
      agent: identity.agent,
    }))
    return true
  } catch {
    return false
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key !== CHAT_IDENTITY_STORAGE_KEY) return
    try {
      replaceIdentity(JSON.parse(event.newValue || '{}'))
    } catch {
      replaceIdentity(DEFAULT_CHAT_IDENTITY)
    }
  })
}

export const useChatIdentity = () => {
  const setAvatar = (role, avatar) => {
    if (role !== 'user' && role !== 'agent') return false
    const previous = { ...identity[role] }
    identity[role] = normalizeAvatar(avatar, DEFAULT_CHAT_IDENTITY[role])
    if (persistIdentity()) return true
    identity[role] = previous
    return false
  }

  const resetAvatar = role => setAvatar(role, DEFAULT_CHAT_IDENTITY[role])

  const resetIdentity = () => {
    const previous = normalizeIdentity(identity)
    replaceIdentity(DEFAULT_CHAT_IDENTITY)
    if (persistIdentity()) return true
    replaceIdentity(previous)
    return false
  }

  return {
    identity: readonly(identity),
    userAvatar: computed(() => identity.user),
    agentAvatar: computed(() => identity.agent),
    setAvatar,
    resetAvatar,
    resetIdentity,
  }
}
