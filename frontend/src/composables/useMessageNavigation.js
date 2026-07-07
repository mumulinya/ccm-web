import { computed } from 'vue'

export function useMessageNavigation(messages, options = {}) {
  const limit = options.limit || 40
  const getUserContent = typeof options.getUserContent === 'function' ? options.getUserContent : (message) => message.content || ''
  const getAssistantContent = typeof options.getAssistantContent === 'function' ? options.getAssistantContent : (message) => message.content || (message.agenticRun ? (message.agenticRun.final_reply || message.agenticRun.status) : '')
  const items = computed(() => {
    const turns = []
    let currentTurn = null
    for (const [idx, message] of (messages.value || []).entries()) {
      if (message.role === 'user') {
        if (currentTurn) turns.push(currentTurn)
        currentTurn = {
          originalIndex: idx,
          userContent: getUserContent(message),
          assistantContent: '',
          role: 'user',
          files: message.files || [],
        }
      } else if (message.role === 'assistant' && currentTurn && !currentTurn.assistantContent) {
        currentTurn.assistantContent = getAssistantContent(message)
      }
    }
    if (currentTurn) turns.push(currentTurn)
    return turns.length > limit ? turns.slice(-limit) : turns
  })
  return { navMessages: items }
}
