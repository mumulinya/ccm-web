import { computed } from 'vue'

export function useMessageNavigation(messages, options = {}) {
  const limit = options.limit || 40
  const items = computed(() => {
    const turns = []
    let currentTurn = null
    for (const [idx, message] of (messages.value || []).entries()) {
      if (message.role === 'user') {
        if (currentTurn) turns.push(currentTurn)
        currentTurn = {
          originalIndex: idx,
          userContent: message.content || '',
          assistantContent: '',
          role: 'user',
          files: message.files || [],
        }
      } else if (message.role === 'assistant' && currentTurn && !currentTurn.assistantContent) {
        currentTurn.assistantContent = message.content || (message.agenticRun ? (message.agenticRun.final_reply || message.agenticRun.status) : '')
      }
    }
    if (currentTurn) turns.push(currentTurn)
    return turns.length > limit ? turns.slice(-limit) : turns
  })
  return { navMessages: items }
}
