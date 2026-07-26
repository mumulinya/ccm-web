export const inferProjectChatMode = () => 'conversation'

export const shouldShowProjectTaskCard = (message = {}) => {
  const mode = String(message.messageMode || message.message_mode || '').trim().toLowerCase()
  if (Number(message.fileChanges?.count || 0) > 0) return true
  if (mode) return mode === 'task'
  return false
}
