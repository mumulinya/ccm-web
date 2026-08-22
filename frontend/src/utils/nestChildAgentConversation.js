export const LIVE_CHILD_DIALOGUE_MAX_LINES = 8
export const CHILD_DIALOGUE_SOURCES = new Set(['agent_reported', 'runtime_structured'])

const INTERNAL_STRUCTURED_PROGRESS = /(?:workflowDecision|workflow_decision|dispatchPolicy|dispatch_policy|authorizationDirective|selectedSkills|requiresCodeChanges|requiresIndependentReview|memoryPolicy|CCM_AGENT_RECEIPT|system[_ -]?prompt|lease[_ -]?id|trace[_ -]?id)/i
const RAW_OR_TRUNCATED_PROGRESS = /^\s*[\[{](?=[\s\S]{0,160}["']?[A-Za-z_$][\w$-]*["']?\s*:)/
const GENERIC_AGENT_SUMMARY = /^(?:正在执行|执行完成|工具执行完成|Agent 运行观察|Agent 正在执行任务。?|运行状态)$/i
const FILE_PATH_ONLY = /^(?:[A-Za-z]:)?(?:\/|\\)?(?:[\w.-]+[\\/])*[\w.-]+\.[A-Za-z0-9]{1,8}$/

export function childAgentRunId(event) {
  return String(event?.agentRunId || event?.detail?.agentRunId || '').trim()
}

export function isTestAgentEvent(event) {
  const display = event?.detail?.agentDisplay || event?.agent?.detail?.agentDisplay || {}
  return /test.?agent/i.test(String(display.runtimeLabel || event?.display?.title || event?.agent?.display?.title || ''))
}

export function isNestableChildAgentEvent(event) {
  if (event?.__childAgentConversation) return true
  if (!String(event?.eventType || '').startsWith('agent_')) return false
  const stageKind = String(event?.detail?.executionStage?.kind || '')
  if (stageKind === 'main_agent_summary') return false
  if (isTestAgentEvent(event)) return true
  const display = event?.detail?.agentDisplay || {}
  return !!(String(display.projectId || '').trim() || String(display.projectName || '').trim())
}

export function childAgentDialogueText(event) {
  const text = String(event?.detail?.progress?.text || event?.display?.summary || '').replace(/\s+/g, ' ').trim()
  if (!text || GENERIC_AGENT_SUMMARY.test(text)) return ''
  if (INTERNAL_STRUCTURED_PROGRESS.test(text) || RAW_OR_TRUNCATED_PROGRESS.test(text)) return ''
  if (FILE_PATH_ONLY.test(text) && !/[\u3400-\u9fff]/.test(text)) return ''
  return text
}

export function isChildAgentDialogueProgress(event, childRunIds) {
  if (String(event?.eventType || '') !== 'assistant_progress') return false
  const source = String(event?.detail?.progress?.source || '')
  const runId = childAgentRunId(event)
  const parentId = String(event?.parentEventId || '').trim()
  const fromSource = CHILD_DIALOGUE_SOURCES.has(source)
  const fromParent = !!(runId && parentId && parentId === runId)
  const fromKnownRun = !!(runId && childRunIds && typeof childRunIds.has === 'function' && childRunIds.has(runId))
  if (!fromSource && !fromParent && !fromKnownRun) return false
  return !!childAgentDialogueText(event)
}

function uniqueFileChanges(event) {
  const raw = Array.isArray(event?.detail?.fileChanges) ? event.detail.fileChanges : []
  const unique = new Map()
  for (const item of raw) {
    const source = typeof item === 'string' ? { path: item } : { ...(item || {}) }
    const path = String(source.path || source.file || source.name || '').trim()
    if (!path) continue
    unique.set(path, { ...source, path })
  }
  if (!unique.size && String(event?.detail?.runtimeObservation?.eventType || '') === 'file_changed' && event?.display?.target) {
    unique.set(String(event.display.target), { path: String(event.display.target), status: '修改' })
  }
  return [...unique.values()]
}

function mergeFiles(target, extra) {
  const unique = new Map(target.map(file => [file.path, file]))
  for (const file of extra) {
    const previous = unique.get(file.path)
    unique.set(file.path, previous ? { ...previous, ...file } : file)
  }
  return [...unique.values()]
}

export function childAgentCardTitle(card) {
  if (card?.isTestAgent) return card.projectName ? `TestAgent · ${card.projectName}` : 'TestAgent'
  return card?.projectName || '项目子 Agent'
}

export function displayedChildAgentDialogue(card, options = {}) {
  const lines = Array.isArray(card?.dialogue) ? card.dialogue : []
  if (options.live && lines.length > LIVE_CHILD_DIALOGUE_MAX_LINES) return lines.slice(-LIVE_CHILD_DIALOGUE_MAX_LINES)
  return lines
}

export function nestChildAgentConversation(rows) {
  const list = Array.isArray(rows) ? rows : []
  const agents = list.filter(event => isNestableChildAgentEvent(event) && !event?.__childAgentConversation)
  const cardsByRunId = new Map()
  for (const agent of agents) {
    const runId = childAgentRunId(agent)
    if (!runId || cardsByRunId.has(runId)) continue
    const display = agent?.detail?.agentDisplay || {}
    cardsByRunId.set(runId, {
      __childAgentConversation: true,
      key: `child-agent:${runId}:${Number(agent?.generation || 0)}`,
      eventId: agent.eventId,
      sequence: Number(agent.sequence || 0),
      createdAt: agent.createdAt,
      generation: agent.generation,
      agentRunId: runId,
      eventType: agent.eventType,
      display: agent.display ? { ...agent.display } : { status: 'running' },
      detail: agent.detail,
      agent,
      dialogue: [],
      tools: [],
      timeline: [],
      _toolIndexes: new Map(),
      files: uniqueFileChanges(agent),
      isTestAgent: isTestAgentEvent(agent),
      projectName: String(display.projectName || display.projectId || '').trim(),
      runtimeLabel: String(display.runtimeLabel || agent?.display?.title || '').trim(),
    })
  }
  const childRunIds = new Set(cardsByRunId.keys())
  const claimed = new Set()
  for (const event of list) {
    if (event?.__childAgentConversation) continue
    const runId = childAgentRunId(event)
    const card = runId ? cardsByRunId.get(runId) : null
    if (!card) continue
    if (isNestableChildAgentEvent(event)) {
      if (String(event.eventType || '') === 'agent_progress') {
        const text = childAgentDialogueText(event)
        const last = card.dialogue.at(-1)
        if (text && (!last || last.text !== text)) {
          card.dialogue.push({
            eventId: event.eventId,
            text,
            createdAt: event.createdAt,
            sequence: Number(event.sequence || 0),
          })
        }
      }
      card.files = mergeFiles(card.files, uniqueFileChanges(event))
      if (Number(event.sequence || 0) >= Number(card.sequence || 0)) {
        card.agent = event
        card.eventType = event.eventType
        card.display = event.display ? { ...event.display } : card.display
        card.detail = event.detail
      }
      claimed.add(event.eventId)
      continue
    }
    if (isChildAgentDialogueProgress(event, childRunIds)) {
      const text = childAgentDialogueText(event)
      const last = card.dialogue.at(-1)
      if (!last || last.text !== text) {
        card.dialogue.push({
          eventId: event.eventId,
          text,
          createdAt: event.createdAt,
          sequence: Number(event.sequence || 0),
        })
      }
      claimed.add(event.eventId)
      continue
    }
    if (String(event.eventType || '').startsWith('tool_')) {
      const callId = String(event.toolCallId || event.eventId || '').trim()
      const existingIndex = callId ? card._toolIndexes.get(callId) : undefined
      if (existingIndex == null) {
        card.tools.push({ ...event, __toolStartSequence: Number(event.sequence || 0) })
        if (callId) card._toolIndexes.set(callId, card.tools.length - 1)
      } else {
        const previous = card.tools[existingIndex]
        const previousTerminal = ['tool_completed', 'tool_failed'].includes(String(previous?.eventType || ''))
        const currentTerminal = ['tool_completed', 'tool_failed'].includes(String(event.eventType || ''))
        if (!previousTerminal || currentTerminal) {
          card.tools[existingIndex] = {
            ...previous,
            ...event,
            sequence: Number(previous.__toolStartSequence ?? previous.sequence ?? event.sequence ?? 0),
            createdAt: previous.createdAt || event.createdAt,
            __toolStartSequence: Number(previous.__toolStartSequence ?? previous.sequence ?? event.sequence ?? 0),
            __toolTerminalSequence: currentTerminal ? Number(event.sequence || 0) : Number(previous.__toolTerminalSequence || 0),
          }
        }
      }
      claimed.add(event.eventId)
    }
  }
  for (const card of cardsByRunId.values()) {
    const toolSummaries = new Set(card.tools.map(event => String(
      event?.detail?.toolDisplay?.result?.summary || event?.display?.summary || '',
    ).replace(/\s+/g, ' ').trim()).filter(Boolean))
    card.timeline = [
      ...card.dialogue.filter(item => !toolSummaries.has(String(item.text || '').replace(/\s+/g, ' ').trim())).map(item => ({ ...item, kind: 'progress' })),
      ...card.tools.map(event => ({ kind: 'tool', event, eventId: event.eventId, sequence: Number(event.__toolStartSequence ?? event.sequence ?? 0) })),
    ].sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0))
    delete card._toolIndexes
  }
  const emitted = new Set()
  const out = []
  for (const event of list) {
    if (event?.__childAgentConversation) {
      out.push(event)
      continue
    }
    const runId = childAgentRunId(event)
    if (runId && claimed.has(event.eventId) && cardsByRunId.has(runId)) {
      if (!emitted.has(runId) && isNestableChildAgentEvent(event)) {
        out.push(cardsByRunId.get(runId))
        emitted.add(runId)
      }
      continue
    }
    if (isChildAgentDialogueProgress(event, childRunIds)) continue
    out.push(event)
  }
  for (const [runId, card] of cardsByRunId) {
    if (!emitted.has(runId)) out.push(card)
  }
  return out
}
