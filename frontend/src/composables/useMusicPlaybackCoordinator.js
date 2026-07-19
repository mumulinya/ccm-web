const CHANNEL_NAME = 'ccm-music-playback-v1'
const STORAGE_EVENT_KEY = 'ccm_music_playback_intent_v1'

const createTabId = () => `music-tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

export const compareMusicPlaybackIntents = (left, right) => {
  const leftClock = Number(left?.clock || 0)
  const rightClock = Number(right?.clock || 0)
  if (leftClock !== rightClock) return leftClock - rightClock
  return String(left?.id || '').localeCompare(String(right?.id || ''))
}

export function createMusicPlaybackCoordinator(options = {}) {
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : null)
  const tabId = String(options.tabId || createTabId())
  const now = typeof options.now === 'function' ? options.now : Date.now
  const channelFactory = options.channelFactory || ((name) => (
    typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null
  ))
  const stopHandlers = new Set()
  let logicalClock = Math.max(1, Number(now()) * 1000)
  let currentIntent = null
  let sequence = 0
  let disposed = false
  const channel = channelFactory(CHANNEL_NAME)

  const acceptIntent = (intent) => {
    if (disposed || !intent?.id || !['play', 'stop'].includes(intent.kind)) return false
    logicalClock = Math.max(logicalClock, Number(intent.clock || 0))
    if (currentIntent && compareMusicPlaybackIntents(intent, currentIntent) <= 0) return false
    currentIntent = intent
    for (const handler of stopHandlers) {
      try { handler(intent) } catch {}
    }
    return true
  }

  const publish = (intent) => {
    try { channel?.postMessage(intent) } catch {}
    try {
      windowRef?.localStorage?.setItem(STORAGE_EVENT_KEY, JSON.stringify(intent))
    } catch {}
  }

  const onChannelMessage = (event) => acceptIntent(event?.data)
  const onStorage = (event) => {
    if (event?.key !== STORAGE_EVENT_KEY || !event.newValue) return
    try { acceptIntent(JSON.parse(event.newValue)) } catch {}
  }
  if (channel) channel.onmessage = onChannelMessage
  windowRef?.addEventListener?.('storage', onStorage)
  try {
    const storedIntent = windowRef?.localStorage?.getItem(STORAGE_EVENT_KEY)
    if (storedIntent) acceptIntent(JSON.parse(storedIntent))
  } catch {}

  const beginIntent = (kind, metadata = {}) => {
    sequence += 1
    logicalClock = Math.max(logicalClock + 1, Number(now()) * 1000 + Math.min(sequence, 999))
    const intent = {
      id: `${logicalClock}:${tabId}:${sequence}`,
      kind,
      clock: logicalClock,
      tabId,
      keyword: String(metadata.keyword || ''),
      commandId: String(metadata.commandId || ''),
      source: String(metadata.source || ''),
      createdAt: new Date(Number(now())).toISOString(),
    }
    acceptIntent(intent)
    publish(intent)
    return intent
  }

  const beginPlaybackIntent = (metadata = {}) => beginIntent('play', metadata)
  const stopEverywhere = (metadata = {}) => beginIntent('stop', metadata)
  const isCurrent = (intent) => !!intent?.id && currentIntent?.id === intent.id && currentIntent.kind === 'play'
  const supersededResult = (intent) => ({
    success: false,
    skipped: true,
    reason: 'superseded',
    request_id: intent?.id || '',
  })
  const registerLocalStop = (handler) => {
    if (typeof handler !== 'function') return () => {}
    stopHandlers.add(handler)
    return () => stopHandlers.delete(handler)
  }
  const dispose = () => {
    disposed = true
    stopHandlers.clear()
    windowRef?.removeEventListener?.('storage', onStorage)
    try { channel?.close() } catch {}
  }

  return {
    tabId,
    beginPlaybackIntent,
    stopEverywhere,
    isCurrent,
    supersededResult,
    registerLocalStop,
    currentIntent: () => currentIntent,
    dispose,
  }
}

export const __musicPlaybackCoordinatorTestHooks = {
  CHANNEL_NAME,
  STORAGE_EVENT_KEY,
}
