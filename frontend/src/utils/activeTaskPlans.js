const eventSequence = event => Number(event?.sequence || 0)
const eventTime = event => Date.parse(event?.createdAt || event?.created_at || '') || 0

const compactHash = value => {
  let hash = 2166136261
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

const eventAnchor = event => String(event?.anchorMessageId || event?.anchor_message_id || '')
const eventTaskId = event => String(event?.taskId || event?.task_id || '')
const eventGeneration = event => Math.max(0, Number(event?.generation || 0))
const eventAttempt = event => Math.max(1, Number(event?.attempt || event?.detail?.agentDisplay?.attempt || 1))

const normalizeStepStatus = value => {
  const status = String(value || 'pending').toLowerCase()
  if (['completed', 'done', 'success', 'succeeded', 'accepted'].includes(status)) return 'completed'
  if (['rework', 'reworking', 'revision'].includes(status)) return 'rework'
  if (['running', 'in_progress', 'executing', 'awaiting_review', 'reviewing'].includes(status)) return 'running'
  if (['blocked', 'failed', 'rejected', 'needs_confirmation'].includes(status)) return 'blocked'
  if (['skipped', 'cancelled', 'canceled'].includes(status)) return 'skipped'
  return 'pending'
}

const linkedStepIdentities = event => [
  event?.detail?.causalRefs?.planStepId,
  event?.detail?.replayLink?.planStepId,
  event?.planStepId,
  event?.detail?.causalRefs?.workItemId,
  event?.detail?.replayLink?.workItemId,
  event?.workItemId,
].map(value => String(value || '')).filter(Boolean)

const projectLinkedStepStatus = (step, rows, maxAttempt) => {
  const linked = rows.filter(event => linkedStepIdentities(event).includes(step.id))
  const latest = latestBySequence(linked)
  if (!latest) return step.status
  const type = String(latest?.eventType || '')
  const displayStatus = String(latest?.display?.status || '').toLowerCase()
  const attempt = Math.max(maxAttempt, eventAttempt(latest))
  if (displayStatus === 'failed' || type.endsWith('_failed')) return 'blocked'
  if (displayStatus === 'waiting' || displayStatus === 'blocked') return 'blocked'
  if (displayStatus === 'success' && (type === 'agent_completed' || type === 'verification_completed')) return 'completed'
  if (['agent_started', 'agent_progress', 'tool_started', 'tool_progress', 'verification_started'].includes(type)
    || displayStatus === 'running') return attempt > 1 ? 'rework' : 'running'
  return step.status
}

const samePlanRun = (event, identity) => {
  if (eventGeneration(event) !== identity.generation) return false
  const taskId = eventTaskId(event)
  const anchor = eventAnchor(event)
  if (identity.taskId && taskId) return identity.taskId === taskId
  if (identity.anchorMessageId && anchor) return identity.anchorMessageId === anchor
  return false
}

const isSuccessfulResult = event => event?.eventType === 'result' && event?.display?.status === 'success'
const isFailedResult = event => event?.eventType === 'result' && event?.display?.status === 'failed'
const isInterruption = event => {
  const recovery = event?.detail?.recovery || event?.detail?.interruption || event?.detail?.interruptionReceipt
  const phase = String(event?.detail?.agentDisplay?.phase || event?.display?.target || '').toLowerCase()
  return !!recovery || phase.includes('interrupt') || phase.includes('recovery_required')
}

const latestBySequence = rows => [...rows].sort((left, right) => (
  eventSequence(left) - eventSequence(right) || eventTime(left) - eventTime(right)
)).at(-1) || null

const allowedActions = rows => {
  const map = new Map()
  for (const event of rows) {
    for (const action of Array.isArray(event?.detail?.availableActions) ? event.detail.availableActions : []) {
      if (!action?.id || map.has(action.id)) continue
      map.set(action.id, { ...action, eventId: event.eventId, taskId: eventTaskId(event), workItemId: event?.workItemId || '' })
    }
  }
  return [...map.values()].slice(0, 6)
}

const planBaseKey = event => {
  const plan = event?.detail?.requirementPlan || {}
  return eventTaskId(event) || eventAnchor(event) || String(plan.planId || event?.eventId || '')
}

export function projectActiveTaskPlans(events, options = {}) {
  const exactSessionId = String(options.exactSessionId || '')
  const rows = (Array.isArray(events) ? events : []).filter(event => (
    event?.schema === 'ccm-user-visible-agent-event-v1'
    && (!exactSessionId || String(event?.exactSessionId || '') === exactSessionId)
  ))
  const planEvents = rows.filter(event => event?.eventType === 'requirement_plan' && event?.detail?.requirementPlan)
  const newestGeneration = new Map()
  for (const event of planEvents) {
    const baseKey = planBaseKey(event)
    newestGeneration.set(baseKey, Math.max(newestGeneration.get(baseKey) || 0, eventGeneration(event)))
  }

  const grouped = new Map()
  for (const event of planEvents) {
    const baseKey = planBaseKey(event)
    const generation = eventGeneration(event)
    if (generation < (newestGeneration.get(baseKey) || 0)) continue
    const taskId = eventTaskId(event)
    const anchorMessageId = eventAnchor(event)
    if (!taskId || !anchorMessageId) continue
    const key = `${baseKey}:${generation}`
    const current = grouped.get(key)
    const revision = Number(event?.detail?.requirementPlan?.revision || 1)
    const currentRevision = Number(current?.detail?.requirementPlan?.revision || 0)
    if (!current || revision > currentRevision || (revision === currentRevision && eventSequence(event) > eventSequence(current))) grouped.set(key, event)
  }

  const projectedPlans = [...grouped.values()].map(planEvent => {
    const plan = planEvent.detail.requirementPlan
    const identity = {
      taskId: eventTaskId(planEvent),
      anchorMessageId: eventAnchor(planEvent),
      generation: eventGeneration(planEvent),
    }
    const runRows = rows.filter(event => samePlanRun(event, identity))
    const terminalResult = latestBySequence(runRows.filter(event => event?.eventType === 'result'))
    const latestRunEvent = latestBySequence(runRows)
    const latestInterruption = latestBySequence(runRows.filter(isInterruption))
    const latestResumedActivity = latestBySequence(runRows.filter(event => (
      ['assistant_progress', 'tool_started', 'tool_progress', 'agent_started', 'agent_progress'].includes(String(event?.eventType || ''))
      && ['running', 'waiting'].includes(String(event?.display?.status || ''))
    )))
    const successful = isSuccessfulResult(terminalResult)
    const interrupted = !!latestInterruption
      && eventSequence(latestInterruption) >= eventSequence(latestResumedActivity)
      && !successful
    const failed = isFailedResult(terminalResult)
    const maxAttempt = Math.max(...runRows.map(eventAttempt), 1)
    const rawSteps = Array.isArray(plan.steps) ? plan.steps : []
    const steps = rawSteps.map(step => {
      const projected = {
        id: String(step?.id || ''),
        title: String(step?.title || '').trim(),
        project: String(step?.project || '').trim(),
        status: normalizeStepStatus(step?.status),
      }
      projected.status = successful
        ? 'completed'
        : projectLinkedStepStatus(projected, runRows, maxAttempt)
      if (projected.status === 'running' && maxAttempt > 1) projected.status = 'rework'
      return projected
    }).filter(step => step.id && step.title)
    const current = steps.find(step => ['running', 'rework', 'blocked'].includes(step.status))
      || steps.find(step => step.status === 'pending')
      || steps.at(-1)
    const status = successful
      ? 'completed'
      : interrupted
        ? 'interrupted'
        : plan.status === 'blocked' || failed || steps.some(step => step.status === 'blocked')
          ? 'blocked'
          : plan.status === 'ready' && !steps.some(step => ['running', 'rework'].includes(step.status))
            ? 'ready'
            : 'executing'
    const updatedAt = Math.max(eventTime(planEvent), eventTime(latestRunEvent))
    const createdAt = Date.parse(plan.createdAt || plan.created_at || '') || eventTime(planEvent)
    const executionActivityAt = Math.max(0, ...runRows
      .filter(event => !['requirement_plan', 'result'].includes(String(event?.eventType || '')))
      .map(eventTime))
    const planTitle = String(plan.title || '实施计划').trim()
    const planGoal = String(plan.goal || '').trim()
    const conciseGoal = (planGoal.split(/[，。；;\n]/)[0] || planGoal).trim()
    return {
      fingerprint: compactHash(`${exactSessionId}|${identity.taskId}|${identity.anchorMessageId}|${identity.generation}`),
      taskId: identity.taskId,
      exactSessionId: String(planEvent.exactSessionId || exactSessionId),
      anchorMessageId: identity.anchorMessageId,
      generation: identity.generation,
      attempt: maxAttempt,
      revision: Math.max(1, Number(plan.revision || 1)),
      title: (/^(?:需求实施计划|执行前计划|实施计划)$/.test(planTitle) && conciseGoal ? conciseGoal : planTitle).slice(0, 80),
      goal: planGoal,
      status,
      currentStepId: current?.id || '',
      completedCount: steps.filter(step => step.status === 'completed').length,
      totalCount: steps.length,
      steps,
      updatedAt,
      createdAt,
      executionActivityAt,
      completedAt: successful ? eventTime(terminalResult) : 0,
      planEventId: String(planEvent.eventId || ''),
      actions: allowedActions(runRows),
      runRows,
    }
  })

  const executing = projectedPlans.filter(plan => plan.status === 'executing')
  const holding = projectedPlans
    .filter(plan => ['blocked', 'interrupted', 'ready'].includes(plan.status))
    .sort((left, right) => left.createdAt - right.createdAt || left.updatedAt - right.updatedAt)[0]
  const executingByPriority = [...executing].sort((left, right) => (
      Number(right.executionActivityAt > 0) - Number(left.executionActivityAt > 0)
      || right.executionActivityAt - left.executionActivityAt
      || left.createdAt - right.createdAt
    ))
  const activeWithObservedActivity = executingByPriority.find(plan => plan.executionActivityAt > 0) || null
  const activeRunner = activeWithObservedActivity || (holding ? null : executingByPriority[0] || null)

  const queued = projectedPlans
    .filter(plan => plan.status === 'executing' && plan !== activeRunner)
    .sort((left, right) => left.createdAt - right.createdAt || left.updatedAt - right.updatedAt)
  queued.forEach((plan, index) => {
    plan.status = 'queued'
    plan.queuePosition = index + 1
    plan.currentStepId = ''
    plan.steps = plan.steps.map(step => (
      ['running', 'rework'].includes(step.status) ? { ...step, status: 'pending' } : step
    ))
  })

  return projectedPlans.sort((left, right) => right.updatedAt - left.updatedAt || right.revision - left.revision)
}

export function activePlanMessageIndex(messages, projection) {
  const anchor = String(projection?.anchorMessageId || '')
  const taskId = String(projection?.taskId || '')
  const rows = Array.isArray(messages) ? messages : []
  if (anchor) {
    const anchored = rows.findIndex(message => [
      message?.execution_anchor_message_id,
      message?.executionAnchorMessageId,
      message?.id,
      message?.uuid,
      message?.message_id,
      message?.messageId,
    ].some(value => String(value || '') === anchor))
    if (anchored >= 0) return anchored
  }
  if (taskId) return rows.findIndex(message => String(message?.task_id || message?.taskId || message?.taskExperience?.task_id || '') === taskId)
  return -1
}

export function activePlanStepEvent(projection, stepId) {
  const rows = Array.isArray(projection?.runRows) ? projection.runRows : []
  return [...rows].reverse().find(event => String(
    event?.detail?.causalRefs?.planStepId
      || event?.detail?.replayLink?.planStepId
      || event?.planStepId
      || '',
  ) === String(stepId || '')) || rows.find(event => event?.eventId === projection?.planEventId) || null
}

export function activePlanStorageKey(exactSessionId) {
  return `ccm:active-plan:${compactHash(exactSessionId)}`
}
