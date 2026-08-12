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
  if (!message || String(message.role || '').toLowerCase() === 'thinking') return ''
  if (String(message.role || '').toLowerCase() === 'user') return getEditableUserMessageText(message)

  // Structured controls have their own actions and must never leak their
  // internal payload through the generic message copy button. Agent replies
  // such as global_stream, agent_qa and project_task_intake are still normal
  // user-visible answers, so their sanitized display text remains copyable.
  if (['command_result', 'conversation_summary_boundary'].includes(String(message.type || '').toLowerCase())) return ''
  return String(visibleAssistantText === null ? (message.content || '') : visibleAssistantText).trim()
}
