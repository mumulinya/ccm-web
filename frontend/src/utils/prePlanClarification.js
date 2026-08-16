const clean = value => String(value || '').trim()

export function getPrePlanClarification(value) {
  if (!value || typeof value !== 'object') return null
  const direct = value.schema === 'ccm-pre-plan-clarification-v1' ? value : null
  const summary = value.clarification_summary || value.clarificationSummary || value
  const nested = summary?.pre_plan_clarification || summary?.prePlanClarification
    || value.pre_plan_clarification || value.prePlanClarification
    || value.clarification_context?.pre_plan_clarification
    || value.clarificationContext?.prePlanClarification
    || value.agenticRun?.clarification_summary?.pre_plan_clarification
    || value.agenticRun?.clarificationSummary?.prePlanClarification
    || value.agentic_run?.clarification_summary?.pre_plan_clarification
  const result = direct || nested
  return result?.schema === 'ccm-pre-plan-clarification-v1' ? result : null
}

export function findActivePrePlanClarification(messages = [], options = {}) {
  const purpose = String(options.purpose || '').toLowerCase()
  return [...(Array.isArray(messages) ? messages : [])].reverse()
    .map(message => ({ message, clarification: getPrePlanClarification(message) }))
    .find(row => {
      if (row.clarification?.status !== 'pending') return false
      const rowPurpose = String(row.clarification?.purpose || 'pre_plan').toLowerCase()
      if (purpose === 'mid_turn') return rowPurpose === 'mid_turn'
      if (purpose === 'pre_plan') return rowPurpose !== 'mid_turn'
      return true
    }) || null
}

export function formatPrePlanClarificationAnswer(clarification, answers = {}, additionalNote = '') {
  const lines = []
  for (const question of clarification?.questions || []) {
    const raw = answers?.[question.id]
    const values = Array.isArray(raw) ? raw : raw === undefined || raw === null || raw === '' ? [] : [raw]
    const labels = values.map(value => question.options?.find(option => option.id === value)?.label || clean(value)).filter(Boolean)
    if (labels.length) lines.push(`${question.label}：${labels.join('、')}`)
  }
  if (clean(additionalNote)) lines.push(`补充说明：${clean(additionalNote)}`)
  return lines.join('\n')
}

export async function validatePrePlanClarificationAction({ clarification, action = 'answer', scope, scopeId, exactSessionId, answers, additionalNote }) {
  const response = await fetch(`/api/conversations/clarifications/${encodeURIComponent(clarification.id)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, scopeId, exactSessionId, revision: clarification.revision, generation: clarification.generation, answers, additionalNote }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) throw new Error(data.error || '业务澄清已更新，请刷新后重试')
  return data.result
}
