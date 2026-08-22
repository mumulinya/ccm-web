import { isChildAgentDialogueProgress } from './nestChildAgentConversation.js'

const time = value => {
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const safeLegacyExecutionSummary = value => {
  const text = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 500)
  if (!text) return ''
  if (/CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace[_ -]?id|session[_ -]?ids?|native[_ -]?session|task[_ -]?agent[_ -]?session|lease[_ -]?id|generation[_ -]?fence/i.test(text)) {
    if (/error|fail|失败|权限|denied|invalid/i.test(text)) return 'Agent 遇到执行保护或权限问题，安全详情已折叠。'
    if (/done|complete|完成|CCM_AGENT_RECEIPT/i.test(text)) return 'Agent 已提交完成信息，CCM 正在验收。'
    return 'Agent 正在处理内部执行步骤。'
  }
  return text
}

const INTERNAL_STRUCTURED_PROGRESS = /(?:workflowDecision|workflow_decision|dispatchPolicy|dispatch_policy|authorizationDirective|selectedSkills|requiresCodeChanges|requiresIndependentReview|memoryPolicy|CCM_AGENT_RECEIPT|system[_ -]?prompt|lease[_ -]?id|trace[_ -]?id)/i
const RAW_OR_TRUNCATED_PROGRESS = /^\s*[\[{](?=[\s\S]{0,160}["']?[A-Za-z_$][\w$-]*["']?\s*:)/

export const isUnsafeExecutionProgress = event => {
  if (String(event?.eventType || '') !== 'assistant_progress') return false
  const text = String(event?.detail?.progress?.text || event?.display?.summary || '').trim()
  return !text || INTERNAL_STRUCTURED_PROGRESS.test(text) || RAW_OR_TRUNCATED_PROGRESS.test(text)
}

const legacyEvent = (event, index, prefix) => {
  const kind = String(event?.eventType || event?.kind || event?.type || 'status').toLowerCase()
  const failed = /error|fail/.test(kind)
  const done = /done|complete|result/.test(kind)
  const eventType = kind === 'started' || kind === 'turn_started'
    ? 'turn_started'
    : kind === 'decision' || kind === 'thinking' || kind === 'thinking_status'
      ? 'thinking_status'
      : ['completed', 'done', 'result', 'failed', 'cancelled', 'canceled', 'blocked', 'paused', 'interrupted'].includes(kind)
        ? 'result'
        : ['tool_started', 'tool_progress', 'tool_completed', 'tool_failed'].includes(kind)
          ? kind
          : kind === 'assistant_progress'
            ? 'assistant_progress'
            : kind === 'tool'
              ? 'tool_progress'
              : 'agent_progress'
  return {
    schema: 'ccm-user-visible-agent-event-v1',
    eventId: String(event?.id || `${prefix}:${index}:${event?.time || event?.at || ''}`),
    sequence: index + 1,
    eventType,
    display: {
      title: eventType.startsWith('tool_') ? '工具' : eventType === 'thinking_status' ? '正在思考' : eventType === 'turn_started' ? '开始处理' : '执行进度',
      summary: safeLegacyExecutionSummary(event?.text || event?.message || event?.title),
      status: failed ? 'failed' : done ? 'success' : ['cancelled', 'canceled', 'paused', 'interrupted'].includes(kind) ? 'waiting' : 'running',
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

const toolLifecycleRank = eventType => {
  if (eventType === 'tool_failed' || eventType === 'tool_completed') return 4
  if (eventType === 'tool_progress') return 2
  if (eventType === 'tool_started') return 1
  return 0
}

const agentLifecycleRank = event => {
  const eventType = String(event?.eventType || '')
  if (eventType === 'agent_failed' || eventType === 'agent_completed') return 6
  const phase = String(event?.detail?.agentDisplay?.phase || '').toLowerCase()
  if (/verifying|result_submitted|accepted/.test(phase)) return 4
  if (/queued|waiting_dependency|waiting/.test(phase)) return 3
  if (eventType === 'agent_progress') return 2
  if (eventType === 'agent_started') return 1
  return 0
}

const agentAttempt = event => Math.max(1, Number(event?.detail?.agentDisplay?.attempt || 1))
const agentProjectId = event => String(event?.detail?.agentDisplay?.projectId || event?.display?.title || '')
const agentRowKey = event => {
  const stageKind = String(event?.detail?.executionStage?.kind || '')
  const runtimeLabel = String(event?.detail?.agentDisplay?.runtimeLabel || event?.display?.title || '')
  if (stageKind === 'independent_verification' || /test.?agent/i.test(runtimeLabel)) {
    return [
      'agent-test',
      event?.taskId || '',
      agentProjectId(event),
      event?.generation || 0,
    ].join(':')
  }
  if (stageKind === 'main_agent_summary') {
    return ['agent-main-summary', event?.taskId || '', event?.generation || 0].join(':')
  }
  const runId = String(event?.agentRunId || '')
  if (runId) return `agent:${runId}:${Number(event?.generation || 0)}`
  return [
    'agent',
    event?.taskId || '',
    event?.workItemId || '',
    agentProjectId(event),
    event?.generation || 0,
  ].join(':')
}

const uniqueValues = values => [...new Map((Array.isArray(values) ? values : []).map(value => [JSON.stringify(value), value])).values()]

// Recovery attempts historically shared one anchor and some persisted events
// did not expose turnId/attempt as top-level fields.  The event id still
// carries the immutable identity (for example `...:attempt:2:<turn-id>:...`).
// Keep this extraction local to the projection layer so old ledgers remain
// readable without rewriting them.
const executionTurnIdOf = value => {
  const explicit = value?.executionTurnId
    || value?.execution_turn_id
    || value?.turnId
    || value?.turn_id
    || value?.detail?.executionStage?.turnId
    || value?.detail?.executionStage?.turn_id
    || value?.detail?.turnId
    || value?.detail?.turn_id
  if (explicit) return String(explicit)
  const eventId = String(value?.eventId || value?.id || '')
  const match = eventId.match(/(?:^|:)attempt:(\d+):([^:]+)(?::|$)/i)
  return match?.[2] ? String(match[2]) : ''
}

export const executionAttemptForEvent = value => {
  const explicit = value?.executionAttempt
    ?? value?.execution_attempt
    ?? value?.recovery?.attempt
    ?? value?.attempt
    ?? value?.detail?.replayLink?.attempt
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    const parsed = Number(explicit)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  const eventId = String(value?.eventId || value?.id || '')
  const match = eventId.match(/(?:^|:)attempt:(\d+):/i)
  if (match?.[1]) return Number(match[1])
  // executionStage.attempt describes a project/TestAgent work attempt, not
  // necessarily the parent group recovery attempt. Only use it when that
  // stage also carries an explicit turn identity.
  if (value?.detail?.executionStage?.turnId || value?.detail?.executionStage?.turn_id) {
    const stageAttempt = Number(value?.detail?.executionStage?.attempt || 0)
    if (Number.isFinite(stageAttempt) && stageAttempt > 0) return stageAttempt
  }
  return 0
}

const mergeAgentEvent = (first, next, previousAttempt) => {
  const nextAttempt = agentAttempt(next)
  const attemptChanged = nextAttempt > previousAttempt
  const firstDetail = first?.detail || {}
  const nextDetail = next?.detail || {}
  const attemptHistory = [...(firstDetail.agentAttemptHistory || [])]
  if (attemptChanged) {
    attemptHistory.push({
      attempt: previousAttempt,
      eventType: first.eventType,
      status: first.display?.status,
      summary: first.display?.summary || '',
      durationMs: Number(first.display?.durationMs || 0),
      createdAt: first.createdAt || '',
      startedAt: firstDetail.executionStage?.startedAt || first.createdAt || '',
      executionStage: firstDetail.executionStage || null,
    })
  }
  const display = attemptChanged ? { ...(next.display || {}) } : {
    ...(first.display || {}),
    ...(next.display || {}),
    toolUseCount: Math.max(Number(first.display?.toolUseCount || 0), Number(next.display?.toolUseCount || 0)),
    tokenCount: Math.max(Number(first.display?.tokenCount || 0), Number(next.display?.tokenCount || 0)),
    durationMs: Math.max(Number(first.display?.durationMs || 0), Number(next.display?.durationMs || 0)),
  }
  return {
    ...first,
    ...next,
    eventId: first.eventId,
    sequence: first.sequence,
    createdAt: first.createdAt,
    parallelGroupId: next.parallelGroupId || first.parallelGroupId,
    display,
    detail: {
      ...(attemptChanged ? {} : firstDetail),
      ...nextDetail,
      agentDisplay: { ...(attemptChanged ? {} : firstDetail.agentDisplay || {}), ...(nextDetail.agentDisplay || {}) },
      fileChanges: uniqueValues([...(attemptChanged ? [] : firstDetail.fileChanges || []), ...(nextDetail.fileChanges || [])]),
      evidenceIds: uniqueValues([...(attemptChanged ? [] : firstDetail.evidenceIds || []), ...(nextDetail.evidenceIds || [])]),
      ...(attemptHistory.length ? { agentAttemptHistory: attemptHistory } : {}),
    },
  }
}

// The persisted event stream remains append-only for audit and replay. The
// conversation UI projects one row per logical tool call and replaces its
// status as the call advances, matching CC's compact execution display.
export function coalesceExecutionEvents(events) {
  const ordered = [...new Map((Array.isArray(events) ? events : []).map(event => [event.eventId, event])).values()]
    .sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0) || time(left.createdAt) - time(right.createdAt))
  const rows = []
  const toolRows = new Map()
  const agentRows = new Map()
  for (const event of ordered) {
    const eventType = String(event?.eventType || '')
    const toolCallId = String(event?.toolCallId || '')
    if (toolCallId && eventType.startsWith('tool_')) {
      const key = `tool:${toolCallId}`
      const existing = toolRows.get(key)
      if (!existing) {
        const projected = { ...event, display: { ...(event.display || {}) }, detail: event.detail ? { ...event.detail } : event.detail }
        toolRows.set(key, { index: rows.length, event: projected, rank: toolLifecycleRank(eventType) })
        rows.push(projected)
        continue
      }
      const rank = toolLifecycleRank(eventType)
      if (rank < existing.rank) continue
      if (existing.rank >= 4 && rank >= 4) continue
      const first = existing.event
      const firstToolDisplay = first?.detail?.toolDisplay
      const nextToolDisplay = event?.detail?.toolDisplay
      const mergedToolDisplay = firstToolDisplay || nextToolDisplay ? {
        ...(firstToolDisplay || {}),
        ...(nextToolDisplay || {}),
        tool: { ...(firstToolDisplay?.tool || {}), ...(nextToolDisplay?.tool || {}) },
        arguments: nextToolDisplay?.arguments?.length ? nextToolDisplay.arguments : (firstToolDisplay?.arguments || []),
        result: { ...(firstToolDisplay?.result || {}), ...(nextToolDisplay?.result || {}) },
      } : undefined
      const projected = {
        ...first,
        ...event,
        sequence: first.sequence,
        createdAt: first.createdAt,
        display: { ...(first.display || {}), ...(event.display || {}) },
        detail: {
          ...(first.detail || {}),
          ...(event.detail || {}),
          ...(mergedToolDisplay ? { toolDisplay: mergedToolDisplay } : {}),
        },
      }
      existing.event = projected
      existing.rank = rank
      rows[existing.index] = projected
      continue
    }
    if (eventType.startsWith('agent_')) {
      const key = agentRowKey(event)
      const existing = agentRows.get(key)
      const attempt = agentAttempt(event)
      if (!existing) {
        const projected = { ...event, display: { ...(event.display || {}) }, detail: event.detail ? { ...event.detail } : event.detail }
        agentRows.set(key, { index: rows.length, event: projected, rank: agentLifecycleRank(event), attempt })
        rows.push(projected)
        continue
      }
      if (attempt < existing.attempt) continue
      const rank = agentLifecycleRank(event)
      if (attempt === existing.attempt && rank < existing.rank) continue
      if (attempt === existing.attempt && existing.rank >= 6 && rank >= 6) continue
      const projected = mergeAgentEvent(existing.event, event, existing.attempt)
      existing.event = projected
      existing.rank = rank
      existing.attempt = attempt
      rows[existing.index] = projected
      continue
    }
    rows.push(event)
  }
  const hasMeaningfulLifecycle = rows.some(event => isMeaningfulExecutionEvent(event))
  return rows.filter(event => !(hasMeaningfulLifecycle && event?.eventType === 'thinking_status'))
}

function executionEventSourceForMessage(events, messages, index) {
  const message = messages?.[index]
  if (!isExecutionAnchor(messages, index)) return []
  if (['retrying', 'recovered', 'superseded'].includes(String(message?.recovery?.state || '').toLowerCase())) return []
  const orderedEvents = (Array.isArray(events) ? events : [])
    .filter(Boolean)
    .sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0) || time(left.createdAt) - time(right.createdAt))
  const messageTime = time(message?.timestamp || message?.createdAt || message?.created_at)
  const messageId = String(
    message?.execution_anchor_message_id
      || message?.executionAnchorMessageId
      || message?.id
      || message?.uuid
      || message?.message_id
      || message?.messageId
      || '',
  )
  const taskId = String(message?.task_id || message?.taskId || message?.taskExperience?.task_id || '')
  const latestTaskAttempt = taskId
    ? orderedEvents.reduce((max, event) => String(event?.taskId || '') === taskId ? Math.max(max, executionAttemptForEvent(event)) : max, 0)
    : 0
  const belongsToOtherAnchor = event => {
    if (!messageId) return false
    // A formal task keeps one taskId across recovery attempts, while older
    // child-agent transports may have used an internal target_message_id as
    // their visible anchor. Within the already exact-scoped session, taskId is
    // the stronger ownership identity; attempt/generation fences below still
    // prevent a stale recovery from becoming the current result.
    if (taskId && String(event?.taskId || '') === taskId) return false
    const eventAnchor = String(event?.anchorMessageId || event?.anchor_message_id || '')
    return !!eventAnchor && eventAnchor !== messageId
  }
  // Persisted group user messages can receive their timestamp when the turn is
  // committed, after the tools have already run.  Bind completed turns by the
  // result event nearest to the assistant message instead of relying only on
  // the preceding user timestamp.  This also matches the append-only CC-style
  // lifecycle: turn_started -> tools/agents -> result.
  const resultCandidates = orderedEvents
    .map((event, eventIndex) => ({ event, eventIndex, distance: Math.abs(time(event?.createdAt) - messageTime) }))
    .filter(candidate => candidate.event?.eventType === 'result' && time(candidate.event?.createdAt) && messageTime)
    .filter(candidate => !belongsToOtherAnchor(candidate.event))
    .filter(candidate => !taskId || !latestTaskAttempt || !executionAttemptForEvent(candidate.event) || executionAttemptForEvent(candidate.event) === latestTaskAttempt)
    .sort((left, right) => left.distance - right.distance || right.eventIndex - left.eventIndex)
  const matchedResult = resultCandidates[0]
  let lifecycleEvents = null
  const matchedTurnId = executionTurnIdOf(matchedResult?.event)
  const matchedAttempt = executionAttemptForEvent(matchedResult?.event)

  // Once an authoritative result is available, use its immutable recovery
  // identity to isolate the current turn.  A shared anchor is only a legacy
  // correlation hint; it must never pull a previous retry back into this row.
  const belongsToMatchedTurn = event => {
    if (!event || belongsToOtherAnchor(event)) return false
    if (!matchedResult) return true
    const eventTurnId = executionTurnIdOf(event)
    const eventAttempt = executionAttemptForEvent(event)
    if (matchedTurnId && eventTurnId && eventTurnId !== matchedTurnId) return false
    if (matchedAttempt && eventAttempt && eventAttempt !== matchedAttempt) return false
    return true
  }

  const anchoredEvents = !matchedResult && messageId
    ? orderedEvents.filter(event => String(event?.anchorMessageId || event?.anchor_message_id || '') === messageId)
      .filter(belongsToMatchedTurn)
    : []
  // Result persistence and the visible assistant message normally differ by
  // milliseconds.  A bounded tolerance avoids attaching an unrelated old run
  // to a message that never had a projected execution lifecycle.
  if (matchedResult && matchedResult.distance <= 15_000) {
    let startIndex = matchedResult.eventIndex
    for (let cursor = matchedResult.eventIndex; cursor >= 0; cursor -= 1) {
      if (orderedEvents[cursor]?.eventType === 'turn_started') {
        startIndex = cursor
        break
      }
      if (cursor < matchedResult.eventIndex && orderedEvents[cursor]?.eventType === 'result') break
    }
    lifecycleEvents = orderedEvents.slice(startIndex, matchedResult.eventIndex + 1)
      .filter(belongsToMatchedTurn)
  }
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
  // Group user timestamps are often the commit time of the reply, not the send
  // time. The window from this user to the next user can therefore swallow the
  // following question's tools. Never attach another assistant bubble's events.
  const timeBoundEvents = orderedEvents.filter(event => {
    if (!belongsToMatchedTurn(event)) return false
    // With a matched result, lifecycleEvents is the authoritative bounded
    // slice.  Do not re-add every same-anchor event through the broad time
    // window below; that was the source of stale recovery contamination.
    if (matchedResult) return false
    if (taskId && String(event?.taskId || '') === taskId) return true
    const created = time(event?.createdAt)
    return created && (!start || created >= start) && created < end
  })
  // Formal tasks may already have a newer generation running while an older
  // result is still the closest event to the assistant envelope. Keep the
  // task-wide generation fence intact; recovery-only group turns have no
  // taskId and remain bounded exclusively by lifecycleEvents above.
  const taskEvents = taskId
    ? orderedEvents.filter(event => String(event?.taskId || '') === taskId && !belongsToOtherAnchor(event))
    : []
  const current = [...new Map([
    ...anchoredEvents,
    ...(lifecycleEvents || []),
    ...timeBoundEvents,
    ...taskEvents,
  ].filter(Boolean).map(event => [event.eventId, event])).values()]
  const merged = [...current, ...legacyExecutionEvents(message)]
  return merged.filter(event => !isUnsafeExecutionProgress(event))
}

export function executionAttemptNumbersForMessage(events, messages, index) {
  return [...new Set(executionEventSourceForMessage(events, messages, index)
    .map(executionAttemptForEvent)
    .filter(attempt => Number.isFinite(attempt) && attempt > 0))]
    .sort((left, right) => left - right)
}

export function executionEventsForMessage(events, messages, index, options = {}) {
  const requestedAttempt = Math.max(0, Number(options?.attempt || 0))
  const source = executionEventSourceForMessage(events, messages, index)
  const selected = requestedAttempt
    ? source.filter(event => executionAttemptForEvent(event) === requestedAttempt)
    : source
  return coalesceExecutionEvents(selected).filter(event => !isUnsafeExecutionProgress(event))
}

const terminalStatusFromValue = value => {
  const status = String(value || '').trim().toLowerCase()
  if (!status) return ''
  if (/cancel/.test(status)) return 'cancelled'
  if (/interrupt/.test(status)) return 'interrupted'
  if (/fail|error|blocked|rejected/.test(status)) return 'failed'
  if (/complete|done|success|succeed|accepted|delivered|reverted/.test(status)) return 'success'
  return ''
}

const messageExecutionStatus = message => {
  const runtime = String(message?.runtime || '').toLowerCase()
  if (runtime === 'llm-error' || runtime === 'llm-not-configured') return 'failed'
  const values = [
    message?.taskExperience?.status,
    message?.taskExperience?.phase,
    message?.task?.status,
    message?.task?.phase,
    message?.projectRun?.status,
    message?.projectRun?.phase,
    message?.interruption?.state,
    message?.status,
    message?.phase,
  ]
  for (const value of values) {
    const terminal = terminalStatusFromValue(value)
    if (terminal) return terminal
  }
  return ''
}

const messageExecutionIsActive = message => {
  const values = [
    message?.taskExperience?.status,
    message?.taskExperience?.phase,
    message?.task?.status,
    message?.task?.phase,
    message?.projectRun?.status,
    message?.projectRun?.phase,
    message?.interruption?.state,
    message?.status,
    message?.phase,
  ].map(value => String(value || '').trim().toLowerCase()).filter(Boolean)
  return values.some(value => /^(?:running|in_progress|executing|starting|queued|sending|resuming|background_running|waiting_provider|waiting_agent)$/.test(value))
}

export function executionGenerationForRows(rows, preferTerminalResult = false) {
  const source = Array.isArray(rows) ? rows : []
  if (preferTerminalResult) {
    const terminal = [...source].reverse().find(event => event?.eventType === 'result' && terminalGateForExecutionEvent(event))
    if (terminal) return Number(terminal?.generation || 0)
  }
  return source.reduce((max, event) => Math.max(max, Number(event?.generation || 0)), 0)
}

export function executionCurrentGenerationForMessage(events, messages, index) {
  const rows = executionEventsForMessage(events, messages, index)
  return executionGenerationForRows(rows, !messageExecutionIsActive(messages?.[index] || {}))
}

// A provider or transport failure can finish the visible assistant turn before
// the backend manages to append its authoritative `result` event.  Treat the
// finalized assistant envelope as a terminal boundary as well, so live timers
// freeze immediately instead of counting forever.  A later generation with an
// active task status still wins and starts a new live projection.
export function executionTerminalBoundaryForMessage(events, messages, index) {
  const rows = executionEventsForMessage(events, messages, index)
  const message = messages?.[index] || {}
  const currentGeneration = executionGenerationForRows(rows, !messageExecutionIsActive(message))
  const result = [...rows].reverse().find(event => event?.eventType === 'result' && Number(event?.generation || 0) === currentGeneration)
  // The main-agent routing/model loop also emits a successful result before a
  // formal development task starts its child-agent execution.  Once a task
  // card says the execution is active, that routing result is not the task's
  // terminal boundary.  Only a result carrying the authoritative Terminal
  // Gate may finish an active formal task.
  const activeFormalTaskHasOnlyTurnResult = !!result
    && executionMessageIsFormalTask(events, messages, index)
    && messageExecutionIsActive(message)
    && !terminalGateForExecutionEvent(result)
  if (result && !activeFormalTaskHasOnlyTurnResult) {
    return {
      terminal: true,
      source: 'result',
      event: result,
      status: terminalStatusFromValue(result?.display?.status || result?.result?.status) || 'success',
      at: time(result?.createdAt),
    }
  }
  const currentRows = rows.filter(event => Number(event?.generation || 0) === currentGeneration || !currentGeneration)
  const currentGenerationIsActive = currentRows.some(event => {
    const status = String(event?.display?.status || '').trim().toLowerCase()
    const modelState = String(event?.detail?.modelActivity?.state || '').trim().toLowerCase()
    return ['running', 'waiting', 'queued', 'starting', 'executing'].includes(status)
      || ['started', 'waiting', 'retrying', 'streaming'].includes(modelState)
  })
  const structuredStatus = messageExecutionStatus(message)
  const explicitFailureAnswer = /没有完成|未完成|失败|出错|中断|取消/.test(String(message?.content || ''))
  const finalizedEnvelope = message?.streaming === false || !!structuredStatus || explicitFailureAnswer
  if (!isExecutionAnchor(messages, index) || message?.streaming === true || messageExecutionIsActive(message) || (currentGenerationIsActive && !finalizedEnvelope)) return null
  const hasFinalContent = !!String(message?.content || message?.text || '').trim()
  if (!hasFinalContent && !structuredStatus && message?.streaming !== false) return null
  const latestEventAt = rows.reduce((latest, event) => Math.max(latest, time(event?.createdAt)), 0)
  const completedAt = time(
    message?.completedAt
      || message?.completed_at
      || message?.finishedAt
      || message?.finished_at
      || message?.updatedAt
      || message?.updated_at,
  ) || latestEventAt || time(message?.timestamp || message?.createdAt || message?.created_at)
  return {
    terminal: true,
    source: 'message',
    event: null,
    status: structuredStatus || (explicitFailureAnswer ? 'failed' : 'success'),
    at: completedAt,
  }
}

const meaningfulExecutionTypes = new Set([
  'assistant_progress',
  'requirement_plan',
  'permission_required',
  'context_compacted',
])

export function isMeaningfulExecutionEvent(event) {
  const eventType = String(event?.eventType || '')
  if (eventType === 'model_activity') return isLiveModelActivityEvent(event)
  if (event?.display?.status === 'failed') return true
  if (eventType.startsWith('tool_') || eventType.startsWith('agent_')) return true
  if (meaningfulExecutionTypes.has(eventType)) return true
  if (Number(event?.display?.toolUseCount || 0) > 0) return true
  if (Array.isArray(event?.detail?.fileChanges) && event.detail.fileChanges.length > 0) return true
  if (Array.isArray(event?.detail?.evidenceIds) && event.detail.evidenceIds.length > 0) return true
  return false
}

export function isLiveModelActivityEvent(event) {
  return event?.eventType === 'model_activity'
    && ['waiting', 'retrying'].includes(String(event?.detail?.modelActivity?.state || ''))
}

export function appendLiveModelActivityToTail(items, extraLive = []) {
  const live = []
  const rest = []
  const seen = new Set()
  const pushLive = event => {
    if (!isLiveModelActivityEvent(event)) return
    const id = String(event?.eventId || '')
    if (id) {
      if (seen.has(id)) return
      seen.add(id)
    }
    live.push(event)
  }
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.__progressBatch && Array.isArray(item.children)) {
      const children = []
      for (const child of item.children) {
        if (isLiveModelActivityEvent(child)) pushLive(child)
        else children.push(child)
      }
      rest.push(children.length === item.children.length ? item : { ...item, children })
      continue
    }
    if (isLiveModelActivityEvent(item)) pushLive(item)
    else rest.push(item)
  }
  for (const event of Array.isArray(extraLive) ? extraLive : []) pushLive(event)
  return [...rest, ...live]
}

export function hasMeaningfulExecutionForMessage(events, messages, index) {
  return executionEventsForMessage(events, messages, index).some(isMeaningfulExecutionEvent)
}

export function shouldRenderExecutionTranscript(events, messages, index, expanded = false) {
  const rows = executionEventsForMessage(events, messages, index)
  return rows.length > 0 && (expanded || rows.some(isMeaningfulExecutionEvent))
}

const INCOMPLETE_QUERY_STATUS = /^(?:failed|error|cancelled|canceled|interrupted|blocked)$/i

// Ordinary answers do not need a task ledger or Terminal Gate, but once a
// turn actually used a tool and finished, the user can inspect what was
// queried. Incomplete turns stay like Cursor: no collapsed query record.
// Provider/transport paths are not equally reliable at persisting a final
// `result` event, so a finalized assistant envelope is also a valid
// query-record boundary. This never upgrades the turn into a development
// task; it only controls the lightweight completed query projection.
export function executionQueryRecordForMessage(events, messages, index) {
  const rows = executionEventsForMessage(events, messages, index)
  if (executionMessageIsFormalTask(events, messages, index)) return null
  const toolRows = rows.filter(event => String(event?.eventType || '').startsWith('tool_'))
  if (!toolRows.length) return null
  const message = messages?.[index] || {}
  const runtime = String(message?.runtime || '').toLowerCase()
  if (runtime === 'llm-error' || runtime === 'llm-not-configured') return null
  const boundary = executionTerminalBoundaryForMessage(events, messages, index)
  const finalizedAnswer = message?.role === 'assistant'
    && message?.streaming !== true
    && !!String(message?.content || message?.text || '').trim()
  if (!boundary && !finalizedAnswer) return null
  const status = String(boundary?.status || '').toLowerCase()
  if (INCOMPLETE_QUERY_STATUS.test(status)) return null
  const toolFailed = toolRows.some(event => ['failed', 'error', 'cancelled', 'canceled'].includes(String(event?.display?.status || '').toLowerCase()))
  const succeeded = status ? true : !toolFailed
  return {
    status: succeeded ? 'success' : 'partial',
    succeeded,
    toolCount: new Set(toolRows.map(event => String(event?.toolCallId || event?.eventId || '')).filter(Boolean)).size,
    boundarySource: boundary?.source || 'assistant_message',
  }
}

export function executionTurnStateForMessage(events, messages, index) {
  const message = messages?.[index] || {}
  const rows = executionEventsForMessage(events, messages, index)
  const generation = rows.reduce((max, event) => Math.max(max, Number(event?.generation || 0)), 0)
  const current = rows.filter(event => Number(event?.generation || 0) === generation || !generation)
  const boundary = executionTerminalBoundaryForMessage(events, messages, index)
  if (boundary) {
    const status = String(boundary.status || '').toLowerCase()
    if (/cancel/.test(status)) return { state: 'cancelled', rows, terminal: true, showThinking: false }
    if (/interrupt|pause|waiting/.test(status)) return { state: 'interrupted', rows, terminal: true, showThinking: false }
    if (/fail|error|blocked/.test(status)) return { state: 'failed', rows, terminal: true, showThinking: false }
    return { state: 'completed', rows, terminal: true, showThinking: false }
  }
  const waiting = [...current].reverse().find(event => {
    const status = String(event?.display?.status || '').toLowerCase()
    const phase = String(event?.detail?.executionStage?.kind || event?.detail?.agentDisplay?.phase || '').toLowerCase()
    return /waiting|blocked|permission/.test(`${status} ${phase} ${event?.eventType || ''}`)
  })
  if (waiting) return { state: 'waiting_user', rows, terminal: false, showThinking: false }
  const verifying = current.some(event => /verification|acceptance|summary/.test(String(event?.detail?.executionStage?.kind || '').toLowerCase()))
  if (verifying) return { state: 'verifying', rows, terminal: false, showThinking: false }
  if (current.some(event => event?.eventType === 'model_activity')) return { state: 'executing', rows, terminal: false, showThinking: false }
  if (current.some(isMeaningfulExecutionEvent)) return { state: 'executing', rows, terminal: false, showThinking: false }
  if (message?.streaming && String(message?.content || '').trim()) return { state: 'streaming_final', rows, terminal: false, showThinking: false }
  if (message?.streaming || message?.role === 'thinking') return { state: 'thinking', rows, terminal: false, showThinking: true }
  return { state: 'idle', rows, terminal: false, showThinking: false }
}

export function shouldShowCompactProcessingState(events, messages, index) {
  return executionTurnStateForMessage(events, messages, index).showThinking
}

const LIVE_ASSISTANT_PROGRESS_FALLBACK = '我正在处理当前请求。'
const SKIP_PROVISIONAL_MESSAGE_TYPES = new Set([
  'command_result',
  'conversation_summary_boundary',
  'management_action',
  'git_review',
  'git_commit',
  'project_task_intake',
  'conflict_plan',
])

const messageFinalAnswerText = message => String(
  message?.agenticRun?.final_reply
  || message?.agenticRun?.finalReply
  || message?.content
  || message?.text
  || '',
).replace(/\s+/g, ' ').trim()

export function latestAssistantProgressText(events, messages, index) {
  const rows = executionEventsForMessage(events, messages, index)
  const latest = [...rows].reverse().find(event => (
    event?.eventType === 'assistant_progress'
    && !isUnsafeExecutionProgress(event)
    && !isChildAgentDialogueProgress(event)
  ))
  return String(latest?.detail?.progress?.text || latest?.display?.summary || '').replace(/\s+/g, ' ').trim()
}

export function accumulatedAssistantTextDelta(events, messages, index) {
  return executionEventsForMessage(events, messages, index)
    .filter(event => event?.eventType === 'assistant_text_delta')
    .map(event => String(event?.display?.summary || event?.detail?.delta || event?.detail?.stream?.text || ''))
    .join('')
    .trim()
}

export function liveAssistantInProgressText(events, messages, index) {
  const message = messages?.[index]
  if (!message || message.role === 'user' || message.role === 'thinking') return ''
  if (SKIP_PROVISIONAL_MESSAGE_TYPES.has(String(message.type || ''))) return ''
  if (messageFinalAnswerText(message)) return ''
  const turn = executionTurnStateForMessage(events, messages, index)
  const live = message.streaming === true
    || ['thinking', 'executing', 'waiting_user', 'verifying'].includes(String(turn.state || ''))
  if (!live) return ''
  return accumulatedAssistantTextDelta(events, messages, index) || latestAssistantProgressText(events, messages, index)
}

export function liveAssistantProvisionalText(events, messages, index, fallback = LIVE_ASSISTANT_PROGRESS_FALLBACK, options = {}) {
  const message = messages?.[index]
  if (!message || message.role === 'user' || message.role === 'thinking') return ''
  if (SKIP_PROVISIONAL_MESSAGE_TYPES.has(String(message.type || ''))) return ''
  const boundary = executionTerminalBoundaryForMessage(events, messages, index)
  const turn = executionTurnStateForMessage(events, messages, index)
  if (!options.treatContentAsEmpty && messageFinalAnswerText(message)) return ''
  if (message.streaming !== true && (boundary?.terminal || turn.terminal)) return ''
  const live = message.streaming === true
    || ['thinking', 'executing', 'waiting_user', 'verifying'].includes(String(turn.state || ''))
  if (!live) return ''
  if (latestAssistantProgressText(events, messages, index)) return ''
  if ((turn.rows || []).some(isMeaningfulExecutionEvent)) return ''
  return String(fallback || '').trim()
}

export function countExecutionToolItems(events = []) {
  const succeeded = new Set()
  const failed = new Set()
  for (const event of Array.isArray(events) ? events : []) {
    const type = String(event?.eventType || '')
    if (type !== 'tool_completed' && type !== 'tool_failed') continue
    const id = String(event?.toolCallId || event?.eventId || '').trim()
    if (!id) continue
    const status = String(event?.display?.status || '').toLowerCase()
    if (type === 'tool_failed' || ['failed', 'error', 'cancelled', 'canceled'].includes(status)) failed.add(id)
    else succeeded.add(id)
  }
  for (const id of failed) succeeded.delete(id)
  return { completed: succeeded.size, failed: failed.size }
}

export function terminalExecutionEventForMessage(events, messages, index) {
  const rows = executionEventsForMessage(events, messages, index)
  const currentGeneration = executionGenerationForRows(rows, !messageExecutionIsActive(messages?.[index] || {}))
  return [...rows].reverse().find(event => event?.eventType === 'result' && Number(event?.generation || 0) === currentGeneration) || null
}

export function terminalGateForExecutionEvent(event) {
  return event?.detail?.terminalGate
    || event?.detail?.terminal_gate
    || event?.result?.terminalGate
    || event?.result?.terminal_gate
    || null
}

export function executionMessageIsFormalTask(events, messages, index) {
  const message = messages?.[index] || {}
  const rows = executionEventsForMessage(events, messages, index)
  const mode = String(message?.messageMode || message?.message_mode || '').trim().toLowerCase()
  if (mode === 'task') return true
  const writeIntentValues = [
    message?.requiresCodeChanges,
    message?.requires_code_changes,
    message?.workflowDecision?.requiresCodeChanges,
    message?.workflowDecision?.requires_code_changes,
    message?.taskExperience?.requiresCodeChanges,
    message?.taskExperience?.requires_code_changes,
    message?.taskCard?.requiresCodeChanges,
    message?.taskCard?.requires_code_changes,
    message?.task?.requiresCodeChanges,
    message?.task?.requires_code_changes,
  ]
  if (writeIntentValues.some(value => value === true)) return true
  if (message?.globalMission || message?.globalMissionSupervisor || message?.missionId || message?.mission_id) return true
  if (rows.some(event => String(event?.eventType || '').startsWith('agent_'))) return true
  if (rows.some(event => event?.eventType === 'requirement_plan' && event?.taskId && event?.detail?.requirementPlan)) return true
  return rows.some(event => event?.eventType === 'result' && !!terminalGateForExecutionEvent(event))
}

export function hasTerminalExecutionForMessage(events, messages, index) {
  return !!executionTerminalBoundaryForMessage(events, messages, index)
}

export function hasAcceptedExecutionForMessage(events, messages, index) {
  if (!executionMessageIsFormalTask(events, messages, index)) return false
  const boundary = executionTerminalBoundaryForMessage(events, messages, index)
  if (String(boundary?.status || '').toLowerCase() !== 'success') return false
  const event = terminalExecutionEventForMessage(events, messages, index)
  const gate = terminalGateForExecutionEvent(event)
  return !!event && gate?.passed === true && gate?.accepted !== false
}

const normalizeCompletionFileChange = value => {
  const source = typeof value === 'string' ? { path: value } : { ...(value || {}) }
  const path = String(source.path || source.file || source.name || '').trim().replace(/\\/g, '/')
  if (!path) return null
  const additions = Number(source.additions ?? source.diff?.additions)
  const deletions = Number(source.deletions ?? source.diff?.deletions)
  return {
    path,
    project: String(source.project || source.target_project || source.projectName || source.agent || '').trim(),
    status: String(source.status || source.statusText || '').trim(),
    ...(Number.isFinite(additions) ? { additions: Math.max(0, additions) } : {}),
    ...(Number.isFinite(deletions) ? { deletions: Math.max(0, deletions) } : {}),
    ...(source.binary === true ? { binary: true } : {}),
    ...(source.deleted === true ? { deleted: true } : {}),
  }
}

export function completionFileChangesForRows(rows) {
  const sourceRows = Array.isArray(rows) ? rows : []
  const currentGeneration = executionGenerationForRows(sourceRows, true)
  const result = [...sourceRows].reverse().find(event => event?.eventType === 'result' && Number(event?.generation || 0) === currentGeneration)
  const authoritativeCandidate = result?.detail?.fileChanges
    || result?.detail?.safeResult?.fileChanges
    || result?.detail?.safeResult?.file_changes
    || []
  const authoritative = Array.isArray(authoritativeCandidate) ? authoritativeCandidate : []
  const fallback = sourceRows
    .filter(event => Number(event?.generation || 0) === currentGeneration)
    .flatMap(event => Array.isArray(event?.detail?.fileChanges) ? event.detail.fileChanges : [])
  const input = authoritative.length ? authoritative : fallback
  const byPath = new Map()
  for (const raw of input.slice(0, 100)) {
    const file = normalizeCompletionFileChange(raw)
    if (!file) continue
    const key = `${file.project.toLowerCase()}|${file.path.toLowerCase()}`
    const current = byPath.get(key)
    byPath.set(key, current ? {
      ...current,
      ...file,
      additions: Math.max(Number(current.additions || 0), Number(file.additions || 0)),
      deletions: Math.max(Number(current.deletions || 0), Number(file.deletions || 0)),
    } : file)
  }
  return [...byPath.values()].sort((left, right) => (
    String(left.project || '').localeCompare(String(right.project || ''), 'zh-CN')
    || String(left.path || '').localeCompare(String(right.path || ''), 'zh-CN')
  ))
}

export function agentStatusCategory(event) {
  if (!String(event?.eventType || '').startsWith('agent_')) return ''
  const eventType = String(event?.eventType || '')
  const phase = String(event?.detail?.agentDisplay?.phase || '').toLowerCase()
  if (eventType === 'agent_completed' || event?.display?.status === 'success' || /completed/.test(phase)) return 'completed'
  if (/recovery_required/.test(phase)) return 'recovery'
  if (/cancel/.test(phase)) return 'cancelled'
  if (eventType === 'agent_failed' || event?.display?.status === 'failed' || /failed|rejected|timeout|heartbeat_lost|lease_expired/.test(phase)) return 'failed'
  if (/permission|approval|confirmation/.test(phase)) return 'permission'
  if (/result_submitted|verifying|accepted/.test(phase)) return 'verifying'
  if (/waiting_dependency/.test(phase)) return 'dependency'
  if (/queued/.test(phase)) return 'queued'
  if (/runner_started/.test(phase)) return 'ack'
  if (/runner_starting|lease_acquired|acknowledged/.test(phase)) return 'starting'
  if (/executing/.test(phase)) return 'executing'
  if (event?.display?.status === 'waiting') return 'waiting'
  return 'executing'
}

export function eventStatusLabel(event) {
  if (String(event?.eventType || '').startsWith('agent_')) {
    const labels = {
      queued: '排队',
      starting: '启动中',
      ack: '等待 ACK',
      executing: '执行中',
      dependency: '等待依赖',
      permission: '等待权限确认',
      verifying: '等待 CCM 验收',
      recovery: '需要接管',
      cancelled: '已取消',
      completed: '完成',
      failed: '失败',
      waiting: '等待',
    }
    return labels[agentStatusCategory(event)] || '执行中'
  }
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

export function formatExecutionDurationLong(value) {
  const milliseconds = Math.max(0, Number(value || 0))
  if (!milliseconds) return ''
  const totalSeconds = Math.max(1, Math.round(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (!minutes) return `耗时 ${seconds} 秒`
  return seconds ? `耗时 ${minutes} 分 ${seconds} 秒` : `耗时 ${minutes} 分钟`
}
