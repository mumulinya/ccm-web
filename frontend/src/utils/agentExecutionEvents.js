import { ref } from 'vue'

export const executionTranscriptExpanded = ref(false)
let shortcutInstalled = false

export function installExecutionTranscriptShortcut() {
  if (shortcutInstalled || typeof window === 'undefined') return
  shortcutInstalled = true
  window.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || String(event.key || '').toLowerCase() !== 'o' || event.altKey) return
    event.preventDefault()
    executionTranscriptExpanded.value = !executionTranscriptExpanded.value
  })
}

const time = value => {
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const legacyEvent = (event, index, prefix) => {
  const kind = String(event?.kind || event?.type || 'status').toLowerCase()
  const failed = /error|fail/.test(kind)
  const done = /done|complete|result/.test(kind)
  return {
    schema: 'ccm-user-visible-agent-event-v1',
    eventId: String(event?.id || `${prefix}:${index}:${event?.time || event?.at || ''}`),
    sequence: index + 1,
    eventType: failed ? 'agent_failed' : done ? 'agent_completed' : kind === 'tool' ? 'tool_progress' : 'agent_progress',
    display: {
      title: kind === 'tool' ? '工具' : '执行进度',
      summary: String(event?.text || event?.message || event?.title || '').slice(0, 500),
      status: failed ? 'failed' : done ? 'success' : 'running',
    },
    visibility: 'default',
    contentStored: false,
    createdAt: event?.time || event?.at || '',
  }
}

export function legacyExecutionEvents(message) {
  const work = Array.isArray(message?.workEvents) ? message.workEvents : []
  const stream = Array.isArray(message?.streamEvents) ? message.streamEvents : []
  return [
    ...work.map((event, index) => legacyEvent(event, index, 'legacy-work')),
    ...stream.map((event, index) => legacyEvent({ ...event, text: event?.text || event?.detail, title: event?.title }, index, 'legacy-stream')),
  ]
}

export function isExecutionAnchor(messages, index) {
  const message = messages?.[index]
  if (!message || message.role === 'user') return false
  for (let next = index + 1; next < (messages?.length || 0); next += 1) {
    if (messages[next]?.role === 'user') break
    if (messages[next]?.role !== 'system') return false
  }
  return messages.slice(0, index + 1).some(item => item?.role === 'user')
}

export function executionEventsForMessage(events, messages, index) {
  const message = messages?.[index]
  if (!isExecutionAnchor(messages, index)) return []
  let previousUser = null
  let nextUser = null
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    if (messages[cursor]?.role === 'user') { previousUser = messages[cursor]; break }
  }
  for (let cursor = index + 1; cursor < (messages?.length || 0); cursor += 1) {
    if (messages[cursor]?.role === 'user') { nextUser = messages[cursor]; break }
  }
  const start = time(previousUser?.timestamp || previousUser?.createdAt || previousUser?.created_at)
  const end = time(nextUser?.timestamp || nextUser?.createdAt || nextUser?.created_at) || Number.POSITIVE_INFINITY
  const taskId = String(message?.task_id || message?.taskId || message?.taskExperience?.task_id || '')
  const current = (Array.isArray(events) ? events : []).filter(event => {
    if (taskId && String(event?.taskId || '') === taskId) return true
    const created = time(event?.createdAt)
    return created && (!start || created >= start) && created < end
  })
  const merged = [...current, ...legacyExecutionEvents(message)]
  return [...new Map(merged.map(event => [event.eventId, event])).values()]
    .sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0) || time(left.createdAt) - time(right.createdAt))
}

const meaningfulExecutionTypes = new Set([
  'permission_required',
  'context_compacted',
])

export function isMeaningfulExecutionEvent(event) {
  const eventType = String(event?.eventType || '')
  if (event?.display?.status === 'failed') return true
  if (eventType.startsWith('tool_') || eventType.startsWith('agent_')) return true
  if (meaningfulExecutionTypes.has(eventType)) return true
  if (Number(event?.display?.toolUseCount || 0) > 0) return true
  if (Array.isArray(event?.detail?.fileChanges) && event.detail.fileChanges.length > 0) return true
  if (Array.isArray(event?.detail?.evidenceIds) && event.detail.evidenceIds.length > 0) return true
  return false
}

export function hasMeaningfulExecutionForMessage(events, messages, index) {
  return executionEventsForMessage(events, messages, index).some(isMeaningfulExecutionEvent)
}

export function shouldRenderExecutionTranscript(events, messages, index, expanded = executionTranscriptExpanded.value) {
  const rows = executionEventsForMessage(events, messages, index)
  return rows.length > 0 && (expanded || rows.some(isMeaningfulExecutionEvent))
}

export function shouldShowCompactProcessingState(events, messages, index) {
  return !shouldRenderExecutionTranscript(events, messages, index)
}

export function eventStatusLabel(event) {
  const status = event?.display?.status
  if (status === 'success') return '完成'
  if (status === 'failed') return '失败'
  if (status === 'waiting') return '等待'
  return '执行中'
}

export function formatExecutionDuration(value) {
  const milliseconds = Math.max(0, Number(value || 0))
  if (!milliseconds) return ''
  const seconds = Math.round(milliseconds / 100) / 10
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}
