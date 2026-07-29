const asList = value => Array.isArray(value) ? value.filter(Boolean) : []

const normalizedText = value => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .replace(/[，。！？；：,.!?;:]+$/g, '')

const stableText = value => normalizedText(value)
  .replace(/\b[0-9a-f]{8}-[0-9a-f-]{13,}\b/gi, '#')
  .replace(/\b(task|run|trace|session|event)[-_:\s]*[a-z0-9_-]{6,}\b/gi, '$1:#')
  .replace(/\b\d+(?:\.\d+)?(?:ms|s|秒|分钟|分|小时|次|条|项|轮)?\b/gi, '#')

const eventActorKey = event => [event?.actor?.type, event?.actor?.label].map(normalizedText).join(':')
const eventScopeKey = event => [event?.task_id, event?.parent_task_id, event?.project, event?.stage].map(normalizedText).join(':')
const eventCategory = event => normalizedText(event?.category || event?.technical?.type || event?.type || 'event')
const eventTitle = event => normalizedText(event?.title)
const eventSummary = event => normalizedText(event?.summary)
const eventSemanticKey = event => [eventTitle(event), eventSummary(event)].join('|')
const timestamp = value => {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : 0
}

const PROGRESS_CATEGORY = /(?:heartbeat|progress|status|state|poll|retry|attempt|watchdog|recovery|continu|queued|running|stream|update|checkpoint)/i
const RETRY_CATEGORY = /(?:retry|attempt|watchdog|recovery|continu|rework)/i
const ROUTINE_TITLE = /(?:任务运行记录|状态更新|更新进展|队列|执行租约|心跳|重试|重新入队|调用 agent|开始执行任务)/i

const mergeKind = (previous, current) => {
  if (!previous || !current) return ''
  if (eventActorKey(previous) !== eventActorKey(current) || eventScopeKey(previous) !== eventScopeKey(current)) return ''

  const gap = Math.abs(timestamp(current.at) - timestamp(previous.last_at || previous.at))
  if (gap > 30 * 60 * 1000) return ''

  const previousSemantic = eventSemanticKey(previous)
  const currentSemantic = eventSemanticKey(current)
  if (previousSemantic && previousSemantic === currentSemantic) return 'duplicate'

  const previousCategory = eventCategory(previous)
  const currentCategory = eventCategory(current)
  if (!previousCategory || previousCategory !== currentCategory) return ''
  if (RETRY_CATEGORY.test(currentCategory)) return 'retry'
  if (!PROGRESS_CATEGORY.test(currentCategory)) return ''

  const sameTitle = eventTitle(previous) && eventTitle(previous) === eventTitle(current)
  const sameSummary = eventSummary(previous) && eventSummary(previous) === eventSummary(current)
  return sameTitle || sameSummary ? 'progress' : ''
}

const mergeCandidateKeys = event => {
  const task = normalizedText(event?.task_id || event?.parent_task_id || 'no-task')
  const actor = eventActorKey(event)
  const stage = normalizedText(event?.stage)
  const category = eventCategory(event)
  const title = eventTitle(event)
  const summary = eventSummary(event)
  const stableSummary = stableText(event?.summary)
  const keys = []

  if (stableSummary.length >= 48) keys.push({ key: `content:${task}:${stableSummary}`, kind: 'duplicate' })
  if (ROUTINE_TITLE.test(title)) keys.push({ key: `routine:${task}:${actor}:${stage}:${stableText(event?.title)}`, kind: RETRY_CATEGORY.test(`${category} ${title} ${summary}`) ? 'retry' : 'progress' })
  if (PROGRESS_CATEGORY.test(category) && (title || summary)) keys.push({ key: `progress:${task}:${actor}:${stage}:${category}:${stableText(event?.title || event?.summary)}`, kind: RETRY_CATEGORY.test(category) ? 'retry' : 'progress' })
  if (title || summary) keys.push({ key: `exact:${task}:${actor}:${stage}:${title}|${summary}`, kind: 'duplicate' })
  return keys
}

const withinMergeWindow = (previous, current) => {
  const gap = Math.abs(timestamp(current?.at) - timestamp(previous?.last_at || previous?.at))
  return gap <= 30 * 60 * 1000
}

const appendUnique = (left, right) => [...new Set([...asList(left), ...asList(right)].map(String).filter(Boolean))]

const compactSeed = event => ({
  ...event,
  first_at: event.at,
  last_at: event.at,
  group_count: 1,
  group_kind: '',
  raw_events: [event],
  raw_event_ids: [event.id].filter(Boolean),
})

export const compactTaskReplayEvents = (events = []) => {
  const result = []
  const candidates = new Map()
  for (const event of asList(events)) {
    const previous = result.at(-1)
    let targetIndex = -1
    let kind = mergeKind(previous, event)
    if (kind) targetIndex = result.length - 1

    const eventCandidates = mergeCandidateKeys(event)
    if (targetIndex < 0) {
      for (const candidate of eventCandidates) {
        const index = candidates.get(candidate.key)
        if (index === undefined || !withinMergeWindow(result[index], event)) continue
        targetIndex = index
        kind = candidate.kind
        break
      }
    }

    if (targetIndex < 0) {
      targetIndex = result.length
      result.push(compactSeed(event))
      for (const candidate of eventCandidates) candidates.set(candidate.key, targetIndex)
      continue
    }

    const target = result[targetIndex]
    const rawEvents = [...target.raw_events, event]
    const evidenceIds = appendUnique(target.evidence_ids, event.evidence_ids)
    const statusHistory = appendUnique(target.status_history || [target.status], [event.status])
    result[targetIndex] = {
      ...target,
      title: event.title || target.title,
      summary: event.summary || target.summary,
      status: event.status || target.status,
      at: target.at,
      last_at: event.at || target.last_at,
      evidence_ids: evidenceIds,
      technical: event.technical && Object.keys(event.technical).length ? event.technical : target.technical,
      group_count: rawEvents.length,
      group_kind: target.group_kind || kind,
      raw_events: rawEvents,
      raw_event_ids: appendUnique(target.raw_event_ids, [event.id]),
      status_history: statusHistory,
    }
    for (const candidate of eventCandidates) candidates.set(candidate.key, targetIndex)
  }
  return result
}

export const replayCompactionStats = (rawEvents = [], compactEvents = []) => ({
  raw: asList(rawEvents).length,
  visible: asList(compactEvents).length,
  merged: Math.max(0, asList(rawEvents).length - asList(compactEvents).length),
  groups: asList(compactEvents).filter(item => Number(item?.group_count || 1) > 1).length,
})
