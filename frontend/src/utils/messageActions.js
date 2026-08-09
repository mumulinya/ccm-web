const ATTACHMENT_SECTION_PATTERN = /\n\s*\[附件\]\s*\n[\s\S]*$/u

export function getEditableUserMessageText(message) {
  if (!message || String(message.role || '').toLowerCase() !== 'user') return ''
  const explicit = String(message.editableContent || message.requestText || '').trim()
  if (explicit) return explicit
  return String(message.content || '')
    .replace(ATTACHMENT_SECTION_PATTERN, '')
    .trim()
}

export function hasMessageAttachments(message) {
  if (!message) return false
  if (Array.isArray(message.files) && message.files.length > 0) return true
  return ATTACHMENT_SECTION_PATTERN.test(String(message.content || ''))
}

export function getCopyableMessageText(message, visibleAssistantText = null) {
  if (!message || message.role === 'thinking' || message.streaming) return ''
  if (String(message.role || '').toLowerCase() === 'user') return String(message.content || '').trim()
  if (message.type && message.type !== 'text') return ''
  return String(visibleAssistantText === null ? (message.content || '') : visibleAssistantText).trim()
}
