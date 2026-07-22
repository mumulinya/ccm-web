const subscribers = new Set()
let source = null
let reconnectTimer = null
let closeTimer = null

function notify(event) {
  for (const subscriber of [...subscribers]) {
    if (event.topic && !subscriber.topics.has('*') && !subscriber.topics.has(event.topic)) continue
    try { subscriber.handler(event) } catch {}
  }
}

function scheduleReconnect() {
  if (reconnectTimer || !subscribers.size) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connect()
  }, 3000)
}

function connect() {
  if (source || typeof window === 'undefined' || typeof EventSource === 'undefined' || !subscribers.size) return
  if (closeTimer) {
    window.clearTimeout(closeTimer)
    closeTimer = null
  }
  source = new EventSource('/api/runtime/events')
  source.onopen = () => notify({ topic: 'system', type: 'connected', at: new Date().toISOString(), data: {} })
  source.onmessage = event => {
    try { notify(JSON.parse(event.data)) } catch {}
  }
  source.onerror = () => {
    source?.close()
    source = null
    notify({ topic: 'system', type: 'disconnected', at: new Date().toISOString(), data: {} })
    scheduleReconnect()
  }
}

function scheduleClose() {
  if (closeTimer || subscribers.size || typeof window === 'undefined') return
  closeTimer = window.setTimeout(() => {
    closeTimer = null
    if (subscribers.size) return
    source?.close()
    source = null
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }, 1500)
}

export function subscribeRuntimeEvents(topics, handler) {
  const subscriber = {
    topics: new Set((Array.isArray(topics) ? topics : [topics || '*']).filter(Boolean)),
    handler,
  }
  subscribers.add(subscriber)
  connect()
  return () => {
    subscribers.delete(subscriber)
    scheduleClose()
  }
}

export function runtimeEventBusState() {
  return { subscribers: subscribers.size, connected: !!source }
}
