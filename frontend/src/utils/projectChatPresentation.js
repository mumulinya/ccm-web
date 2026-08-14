import { taskCardNeedsConversationControl } from './taskCardPresentation.js'

export const inferProjectChatMode = () => 'conversation'

export const shouldShowProjectTaskCard = (message = {}) => {
  const mode = String(message.messageMode || message.message_mode || '').trim().toLowerCase()
  const card = message.taskExperience || message.taskCard || message.task || null
  if (mode && mode !== 'task') return false
  return taskCardNeedsConversationControl(card)
}
