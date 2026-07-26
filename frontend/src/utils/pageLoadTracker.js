let activePageId = ''
let requestSequence = 0
const listeners = new Set()

const ignoredPaths = new Set([
  '/api/auth/session',
  '/api/music/remote-command',
  '/api/runtime/events',
  '/api/status/stream',
  '/api/usability/workbench/stream',
])

const requestDetails = (input, init = {}) => {
  const rawUrl = typeof input === 'string' ? input : String(input?.url || '')
  const method = String(init?.method || input?.method || 'GET').toUpperCase()
  try {
    const url = new URL(rawUrl, window.location.origin)
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return null
    if (method !== 'GET' || ignoredPaths.has(url.pathname)) return null
    return { path: url.pathname, method }
  } catch {
    return null
  }
}

const publish = event => {
  listeners.forEach(listener => {
    try { listener(event) } catch {}
  })
}

export const setActivePageLoadScope = pageId => {
  activePageId = String(pageId || '').trim()
}

export const beginTrackedPageRequest = (input, init) => {
  const request = requestDetails(input, init)
  if (!request || !activePageId) return null
  const token = `page_request_${Date.now()}_${++requestSequence}`
  const event = { phase: 'start', token, pageId: activePageId, ...request }
  publish(event)
  return event
}

export const endTrackedPageRequest = (event, outcome = 'settled') => {
  if (!event?.token || !event?.pageId) return
  publish({ ...event, phase: 'end', outcome })
}

export const subscribePageLoadRequests = listener => {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => listeners.delete(listener)
}

