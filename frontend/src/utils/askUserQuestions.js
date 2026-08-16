export const ASK_USER_OTHER_ID = 'other'
export const ASK_USER_OTHER_LABEL = '其他'

const clean = (value, max = 240) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max)

export function isOtherOption(option) {
  if (!option) return false
  const id = clean(option.id, 80).toLowerCase()
  const label = clean(option.label, 80)
  return id === ASK_USER_OTHER_ID || /^(其他|other)$/i.test(label)
}

export function withOtherOption(options = []) {
  const rest = (Array.isArray(options) ? options : []).filter(option => option && !isOtherOption(option))
  return [
    ...rest,
    {
      id: ASK_USER_OTHER_ID,
      label: ASK_USER_OTHER_LABEL,
      description: '以上都不合适时，用自己的话说明',
    },
  ]
}

export function questionsFromClarification(clarification, summary) {
  const structured = Array.isArray(clarification?.questions) ? clarification.questions : []
  if (structured.length) {
    return structured.map(question => {
      const type = question.type === 'multiple' || question.type === 'text' ? question.type : 'single'
      if (type === 'text') return question
      return { ...question, type, options: withOtherOption(question.options) }
    })
  }
  const question = clean(summary?.question || summary?.headline || clarification?.headline, 200)
  const suggestions = Array.isArray(summary?.answer_suggestions)
    ? summary.answer_suggestions
    : Array.isArray(summary?.answerSuggestions)
      ? summary.answerSuggestions
      : []
  const options = suggestions.map((item, index) => {
    const label = clean(item, 120)
    if (!label) return null
    return { id: `suggestion_${index + 1}`, label }
  }).filter(Boolean)
  if (!question && !options.length) return []
  return [{
    id: clean(clarification?.id || summary?.technical?.run_id, 80) || 'clarify',
    label: question || '请补充关键信息',
    reason: clean(summary?.reason, 180),
    type: options.length ? 'single' : 'text',
    required: true,
    ...(options.length ? { options: withOtherOption(options) } : {}),
  }]
}

export function formatAskUserAnswer(questions = [], answers = {}, otherNotes = {}, additionalNote = '') {
  const lines = []
  for (const question of questions) {
    const raw = answers?.[question.id]
    const values = Array.isArray(raw) ? raw : raw === undefined || raw === null || raw === '' ? [] : [raw]
    const labels = values.map(value => {
      const option = (question.options || []).find(item => item.id === value)
      if (option && isOtherOption(option)) {
        const note = clean(otherNotes?.[question.id], 400)
        return note ? `${ASK_USER_OTHER_LABEL}：${note}` : ASK_USER_OTHER_LABEL
      }
      return option?.label || clean(value, 160)
    }).filter(Boolean)
    if (question.type === 'text') {
      const text = clean(raw, 600)
      if (text) lines.push(`${question.label}：${text}`)
      continue
    }
    if (labels.length) lines.push(`${question.label}：${labels.join('、')}`)
  }
  if (clean(additionalNote, 600)) lines.push(`补充说明：${clean(additionalNote, 600)}`)
  return lines.join('\n')
}

export function questionIsAnswered(question, answers = {}, otherNotes = {}) {
  const value = answers[question.id]
  if (question.type === 'multiple') {
    const selected = Array.isArray(value) ? value : []
    if (!selected.length) return false
    if (selected.some(id => id === ASK_USER_OTHER_ID || isOtherOption((question.options || []).find(item => item.id === id)))) {
      return !!clean(otherNotes[question.id], 400)
    }
    return true
  }
  if (question.type === 'text') return !!clean(value, 600)
  if (!clean(value, 80)) return false
  if (value === ASK_USER_OTHER_ID || isOtherOption((question.options || []).find(item => item.id === value))) {
    return !!clean(otherNotes[question.id], 400)
  }
  return true
}
