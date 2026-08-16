<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleX,
  FileCode2,
  FileDiff,
  FileMinus2,
  FilePlus2,
  History,
  ListChecks,
  LoaderCircle,
  Minus,
  Pencil,
  Search,
  Wrench,
  X,
} from '@lucide/vue'
import {
  agentStatusCategory,
  appendLiveModelActivityToTail,
  completionFileChangesForRows,
  eventStatusLabel,
  executionMessageIsFormalTask,
  executionQueryRecordForMessage,
  executionEventsForMessage,
  executionTerminalBoundaryForMessage,
  formatExecutionDuration,
  formatExecutionDurationLong,
  isLiveModelActivityEvent,
  shouldRenderExecutionTranscript,
  terminalGateForExecutionEvent,
} from '../../utils/agentExecutionEvents.js'
import { agentProgressBatchPresentation, agentProgressToolFamily, longRunningToolDuration } from '../../utils/agentProgressPresentation.js'
import { collapseReadSearchRows } from '../../utils/collapseReadSearchRows.js'
import {
  childAgentCardTitle,
  isChildAgentDialogueProgress,
  nestChildAgentConversation,
} from '../../utils/nestChildAgentConversation.js'
import ToolResultDetail from './ToolResultDetail.vue'
import InlineAgentDiff from './InlineAgentDiff.vue'
import ReadSearchCollapseHeader from './ReadSearchCollapseHeader.vue'
import ChildAgentConversation from './ChildAgentConversation.vue'
import { buildLegacyToolDisplay, toolResultHasUserDetails } from '../../utils/toolResultPresentation.js'
import { findSourceReadEventForPath, sourceReadPathsFromEvent } from '../../utils/executionSourceReads.js'

const props = defineProps({
  events: { type: Array, default: () => [] },
  messages: { type: Array, default: () => [] },
  messageIndex: { type: Number, required: true },
  enabled: { type: Boolean, default: true },
  stagePreview: { type: Boolean, default: false },
  stageGrouped: { type: Boolean, default: false },
  presentation: { type: String, default: 'auto' },
  canConfirmExecute: Boolean,
  confirmExecuteBusy: Boolean,
})
const emit = defineEmits(['open-file-change', 'open-file-changes', 'execution-action', 'confirm-execute'])
const requestedStageMode = computed(() => props.stagePreview || props.stageGrouped)

const now = ref(Date.now())
const EXECUTION_DENSITY_KEY = 'ccm:execution-display-density:v1'
const executionDensity = ref('standard')
const executionDensityOptions = [
  { value: 'summary', label: '摘要' },
  { value: 'standard', label: '标准' },
  { value: 'detailed', label: '详细' },
]
const onExecutionDensityChanged = event => {
  const value = String(event?.detail || '')
  if (value !== executionDensity.value && executionDensityOptions.some(option => option.value === value)) executionDensity.value = value
}
const executionAnchor = ref(null)
const transcriptExpanded = ref(false)
const searchQuery = ref('')
const searchCursor = ref(-1)
let durationTimer = null
const toggleTranscript = event => {
  // Expanding a completed record can add hundreds of pixels. Tell the shared
  // conversation scroller that this resize was initiated by the user so its
  // bottom-follow observer does not immediately scroll the clicked header out
  // of view (which looks like the execution record disappeared).
  const header = event?.currentTarget || executionAnchor.value || null
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ccm:manual-content-toggle', {
      detail: { element: header },
    }))
  }
  transcriptExpanded.value = !transcriptExpanded.value
  nextTick(() => {
    if (!transcriptExpanded.value || !header || typeof header.scrollIntoView !== 'function') return
    header.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}
onMounted(() => {
  try {
    const savedDensity = localStorage.getItem(EXECUTION_DENSITY_KEY)
    if (executionDensityOptions.some(option => option.value === savedDensity)) executionDensity.value = savedDensity
  } catch {}
  durationTimer = window.setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('ccm:locate-execution-event', locateExecutionEvent)
  window.addEventListener('ccm:execution-density-changed', onExecutionDensityChanged)
  restoreExpansionState()
})
onBeforeUnmount(() => {
  window.removeEventListener('ccm:locate-execution-event', locateExecutionEvent)
  window.removeEventListener('ccm:execution-density-changed', onExecutionDensityChanged)
  if (durationTimer) window.clearInterval(durationTimer)
})

const rows = computed(() => executionEventsForMessage(props.events, props.messages, props.messageIndex))
const anchorMessage = computed(() => props.messages?.[props.messageIndex] || {})
const expansionStorageKey = computed(() => {
  const sessionId = rows.value[0]?.exactSessionId || anchorMessage.value?.exactSessionId || anchorMessage.value?.sessionId || 'session'
  const messageId = anchorMessage.value?.id || anchorMessage.value?.messageId || anchorMessage.value?.timestamp || props.messageIndex
  return `ccm:execution-expansion:${effectiveExecutionDensity.value}:${sessionId}:${messageId}`
})
watch(executionDensity, value => {
  try { localStorage.setItem(EXECUTION_DENSITY_KEY, value) } catch {}
  window.dispatchEvent(new CustomEvent('ccm:execution-density-changed', { detail: value }))
})
const shouldRender = computed(() => shouldRenderExecutionTranscript(props.events, props.messages, props.messageIndex, transcriptExpanded.value))
const currentGeneration = computed(() => rows.value.reduce((max, event) => Math.max(max, Number(event?.generation || 0)), 0))
const resultEvent = computed(() => [...rows.value].reverse().find(event => event.eventType === 'result' && Number(event?.generation || 0) === currentGeneration.value))
const terminalBoundary = computed(() => executionTerminalBoundaryForMessage(props.events, props.messages, props.messageIndex))
const isTerminal = computed(() => !!terminalBoundary.value)
const isFormalTaskExecution = computed(() => executionMessageIsFormalTask(props.events, props.messages, props.messageIndex))
const hasToolExecution = computed(() => rows.value.some(event => String(event?.eventType || '').startsWith('tool_')))
const isQueryExecution = computed(() => !isFormalTaskExecution.value && hasToolExecution.value)
const queryRecord = computed(() => executionQueryRecordForMessage(props.events, props.messages, props.messageIndex))
const isQueryCompletion = computed(() => !!queryRecord.value)
const stageMode = computed(() => requestedStageMode.value && isFormalTaskExecution.value)
const isOfficialCompletion = computed(() => {
  if (!isFormalTaskExecution.value || String(terminalBoundary.value?.status || '').toLowerCase() !== 'success' || !resultEvent.value) return false
  const gate = terminalGateForExecutionEvent(resultEvent.value)
  return gate?.passed === true && gate?.accepted !== false
})
const isIncompleteTerminal = computed(() => isTerminal.value && !isOfficialCompletion.value && !isQueryCompletion.value)
const isLivePresentation = computed(() => props.presentation === 'live' && !isOfficialCompletion.value && !isQueryCompletion.value && !isTerminal.value)
// Running work always exposes the full construction trail. Density is a
// completed-record reading preference and must not hide live progress.
const effectiveExecutionDensity = computed(() => {
  if (isLivePresentation.value) return 'detailed'
  if (isQueryCompletion.value && executionDensity.value === 'summary') return 'standard'
  return executionDensity.value
})
const latestPauseMilestone = computed(() => [...rows.value].reverse().find(event => event?.detail?.pauseMilestone?.kind))
const pausedAt = computed(() => latestPauseMilestone.value?.detail?.pauseMilestone?.kind === 'paused' ? eventTime(latestPauseMilestone.value?.createdAt) : 0)
const terminalAt = computed(() => Number(terminalBoundary.value?.at || 0) || pausedAt.value)
const presentationVisible = computed(() => {
  if (props.presentation === 'live') return isLivePresentation.value
  if (props.presentation === 'completed') return isOfficialCompletion.value || isQueryCompletion.value
  return true
})
const completedProjectionVisible = computed(() => isOfficialCompletion.value || isQueryCompletion.value)
const compacted = computed(() => !transcriptExpanded.value && completedProjectionVisible.value)
const assistantProgressRows = computed(() => rows.value.filter(event => event.eventType === 'assistant_progress' && !isChildAgentDialogueProgress(event)))
const currentProgressEventId = computed(() => isTerminal.value ? '' : assistantProgressRows.value.at(-1)?.eventId || '')
const requirementPlanEvents = computed(() => rows.value.filter(event => event.eventType === 'requirement_plan' && event?.detail?.requirementPlan))
const latestRequirementPlanEvent = computed(() => [...requirementPlanEvents.value].sort((left, right) => (
  Number(left?.detail?.requirementPlan?.revision || 1) - Number(right?.detail?.requirementPlan?.revision || 1)
  || Number(left?.sequence || 0) - Number(right?.sequence || 0)
)).at(-1) || null)
const messagePresentedPlan = computed(() => {
  const plan = anchorMessage.value?.presentedPlan || anchorMessage.value?.presented_plan
  if (plan && Array.isArray(plan.steps) && plan.steps.length && String(plan.goal || plan.title || '').trim()) return plan
  return null
})
const requirementPlan = computed(() => latestRequirementPlanEvent.value?.detail?.requirementPlan || messagePresentedPlan.value || null)
const livePlanDockEligible = computed(() => !!(
  latestRequirementPlanEvent.value?.taskId
  && latestRequirementPlanEvent.value?.anchorMessageId
))
const requirementPlanHistory = computed(() => requirementPlanEvents.value.filter(event => event.eventId !== latestRequirementPlanEvent.value?.eventId))
const visibleModelActivity = event => isLiveModelActivityEvent(event)
const nestedLedgerRows = computed(() => nestChildAgentConversation(rows.value.filter(event => (
  !['turn_started', 'assistant_text_delta', 'requirement_plan', 'result'].includes(String(event?.eventType || ''))
  && (event.eventType !== 'model_activity' || visibleModelActivity(event))
))))
const visibleRows = computed(() => nestedLedgerRows.value)
const stageSourceRows = computed(() => nestedLedgerRows.value.filter(event => (
  event?.__childAgentConversation
  || !['thinking_status', 'model_activity'].includes(String(event?.eventType || ''))
)))
const hasProgressFlow = computed(() => assistantProgressRows.value.length > 0)
const hasExecutionRows = computed(() => requirementPlan.value || visibleRows.value.some(event => (
  event?.__childAgentConversation
  || event.eventType?.startsWith('tool_')
  || event.eventType?.startsWith('agent_')
  || ['permission_required', 'context_compacted'].includes(event.eventType)
)))
const toolRows = computed(() => rows.value.filter(event => event.eventType.startsWith('tool_')))
const toolCount = computed(() => toolRows.value.length)
const agentRows = computed(() => rows.value.filter(event => event.eventType.startsWith('agent_')))
const projectAgentRows = computed(() => agentRows.value.filter(event => {
  const display = event?.detail?.agentDisplay
  return display?.projectId && !/test.?agent/i.test(String(display?.runtimeLabel || event?.display?.title || ''))
}))
const testAgentCount = computed(() => agentRows.value.filter(event => /test.?agent/i.test(String(event?.detail?.agentDisplay?.runtimeLabel || event?.display?.title || ''))).length)
const agentCount = computed(() => agentRows.value.length)
const agentCountByStatus = status => agentRows.value.filter(event => agentStatusCategory(event) === status).length
const runningAgentCount = computed(() => agentCountByStatus('executing'))
const queuedAgentCount = computed(() => agentCountByStatus('queued'))
const startingAgentCount = computed(() => agentCountByStatus('starting'))
const ackAgentCount = computed(() => agentCountByStatus('ack'))
const dependencyAgentCount = computed(() => agentCountByStatus('dependency'))
const permissionAgentCount = computed(() => agentCountByStatus('permission'))
const verifyingAgentCount = computed(() => agentCountByStatus('verifying'))
const recoveryAgentCount = computed(() => agentCountByStatus('recovery'))
const completedAgentCount = computed(() => agentCountByStatus('completed'))
const cancelledAgentCount = computed(() => agentCountByStatus('cancelled'))
const failedAgentCount = computed(() => agentCountByStatus('failed'))
const failedToolCount = computed(() => toolRows.value.filter(event => event?.display?.status === 'failed').length)
const parallelToolCount = computed(() => {
  const groups = new Map()
  for (const event of toolRows.value) {
    const groupId = String(event?.parallelGroupId || '')
    if (!groupId) continue
    groups.set(groupId, (groups.get(groupId) || 0) + 1)
  }
  return [...groups.values()].filter(count => count >= 2).reduce((sum, count) => sum + count, 0)
})
const parallelAgentCount = computed(() => {
  const groups = new Map()
  for (const event of agentRows.value.filter(item => agentStatusCategory(item) === 'executing')) {
    const groupId = String(event?.parallelGroupId || '')
    if (!groupId) continue
    groups.set(groupId, (groups.get(groupId) || 0) + 1)
  }
  return [...groups.values()].filter(count => count >= 2).reduce((sum, count) => sum + count, 0)
})
const stageDefinitions = [
  { kind: 'preparation', label: '了解情况', timingKeys: ['preparationMs'] },
  { kind: 'coordination_dispatch', label: '协调与分派', timingKeys: [] },
  { kind: 'project_execution', label: '实施处理', timingKeys: ['projectAgentWallMs'] },
  { kind: 'verification_delivery', label: '验证与交付', timingKeys: ['testAgentWallMs', 'mainAgentSummaryMs'] },
]
const stageTimingSource = computed(() => {
  if (resultEvent.value?.detail?.timing) return resultEvent.value.detail.timing
  return [...rows.value].reverse().find(event => event?.detail?.timing)?.detail?.timing || {}
})
const expandedStages = reactive({})
const expandedBatches = reactive({})
const expandedReadSearchGroups = reactive({})
const expandedChildAgentCards = reactive({})
const expandedChildAgentTools = reactive({})
const requirementPlanExpanded = ref(false)
const completionFilesExpanded = ref(false)
const attemptHistoryExpanded = ref(false)
const planIsExpanded = computed(() => isTerminal.value ? requirementPlanExpanded.value && transcriptExpanded.value : requirementPlanExpanded.value)
const toggleRequirementPlan = () => { requirementPlanExpanded.value = !requirementPlanExpanded.value }
const stageIsExpanded = stage => {
  if (expandedStages[stage.kind] !== undefined) return expandedStages[stage.kind]
  if (effectiveExecutionDensity.value === 'detailed') return true
  if (effectiveExecutionDensity.value === 'summary') return stage.status === '失败' || stage.active === true
  if (!isLivePresentation.value) return stage.status === '失败'
  return stage.active === true || stageLifecycleStatus(stage.kind) === 'running'
}
const toggleStage = stage => {
  expandedStages[stage.kind] = !stageIsExpanded(stage)
}
const owningAgentFor = event => {
  const runId = String(event?.agentRunId || event?.detail?.agentRunId || '')
  if (!runId) return null
  return agentRows.value.find(agent => String(agent?.agentRunId || agent?.detail?.agentRunId || '') === runId) || null
}
const inferredStageKind = event => {
  if (event?.__childAgentConversation) return inferredStageKind(event.agent)
  const explicit = String(event?.detail?.executionStage?.kind || '')
  if (['independent_verification', 'main_agent_summary'].includes(explicit)) return 'verification_delivery'
  if (stageDefinitions.some(stage => stage.kind === explicit)) return explicit
  if (event?.eventType === 'assistant_progress') {
    const relatedIds = new Set(event?.detail?.progress?.relatedToolCallIds || [])
    const relatedTool = toolRows.value.find(tool => relatedIds.has(tool?.toolCallId))
    if (String(relatedTool?.detail?.executionStage?.kind || '') === 'coordination_dispatch') return 'coordination_dispatch'
    const owner = owningAgentFor(relatedTool || event)
    const ownerLabel = String(owner?.detail?.agentDisplay?.runtimeLabel || owner?.display?.title || '')
    const ownerStage = String(owner?.detail?.executionStage?.kind || '')
    if (ownerStage === 'coordination_dispatch') return 'coordination_dispatch'
    if (['main_agent_summary', 'independent_verification'].includes(ownerStage) || /test.?agent/i.test(ownerLabel)) return 'verification_delivery'
    if (owner) return 'project_execution'
    const progressKind = String(event?.detail?.progress?.kind || '')
    if (['verification', 'before_summary'].includes(progressKind)) return 'verification_delivery'
    if (progressKind === 'rework') return 'project_execution'
  }
  if (String(event?.eventType || '').startsWith('tool_')) {
    const owner = owningAgentFor(event)
    const ownerLabel = String(owner?.detail?.agentDisplay?.runtimeLabel || owner?.display?.title || '')
    const ownerStage = String(owner?.detail?.executionStage?.kind || '')
    if (String(event?.detail?.executionStage?.kind || '') === 'coordination_dispatch' || ownerStage === 'coordination_dispatch') return 'coordination_dispatch'
    if (['main_agent_summary', 'independent_verification'].includes(ownerStage) || /test.?agent/i.test(ownerLabel)) return 'verification_delivery'
    if (owner) return 'project_execution'
    return 'preparation'
  }
  const agentLabel = String(event?.detail?.agentDisplay?.runtimeLabel || event?.display?.title || '')
  if (/test.?agent/i.test(agentLabel)) return 'verification_delivery'
  if (String(event?.eventType || '').startsWith('agent_')) return 'project_execution'
  return 'preparation'
}
const unionDuration = intervals => {
  const ordered = intervals.filter(Boolean).sort((left, right) => left[0] - right[0])
  let total = 0
  let current = null
  for (const interval of ordered) {
    if (!current || interval[0] > current[1]) {
      if (current) total += current[1] - current[0]
      current = [...interval]
    } else current[1] = Math.max(current[1], interval[1])
  }
  if (current) total += current[1] - current[0]
  return total
}
const derivedStageDuration = stageRows => unionDuration(stageRows.flatMap(event => {
  const stage = event?.detail?.executionStage || {}
  const started = eventTime(stage.startedAt || event?.createdAt)
  const terminalBoundaryAt = isTerminal.value ? terminalAt.value : 0
  if (!started || (terminalBoundaryAt && started > terminalBoundaryAt)) return []
  const duration = Math.max(0, Number(stage.activeDurationMs || event?.display?.durationMs || 0))
  const completed = eventTime(stage.completedAt)
  const live = ['running', 'waiting'].includes(String(event?.display?.status || ''))
  const inferredEnd = completed || (duration ? started + duration : live ? (terminalBoundaryAt || now.value) : started)
  const ended = terminalBoundaryAt ? Math.min(inferredEnd, terminalBoundaryAt) : inferredEnd
  const current = [[started, Math.max(started, ended)]]
  const history = (event?.detail?.agentAttemptHistory || []).map(attempt => {
    const attemptStarted = eventTime(attempt?.startedAt || attempt?.createdAt)
    const attemptDuration = Math.max(0, Number(attempt?.durationMs || 0))
    return attemptStarted && attemptDuration ? [attemptStarted, attemptStarted + attemptDuration] : null
  })
  return [...current, ...history]
}))
const configuredStageDuration = (stage, timing) => {
  const values = (stage?.timingKeys || [])
    .map(key => Number(timing?.[key]))
    .filter(value => Number.isFinite(value) && value > 0)
  return values.reduce((total, value) => total + value, 0)
}
const batchKeyFor = progress => String(progress?.eventId || progress?.detail?.progress?.batchId || '')
const eventHasPartialResult = event => {
  const result = event?.detail?.toolDisplay?.result || {}
  const continuation = result?.continuation || event?.detail?.continuation || {}
  return String(event?.display?.status || '') === 'partial'
    || result?.partial === true
    || result?.searchExecution?.partial === true
    || (result?.truncated === true && (Number(continuation?.pendingCount || 0) > 0 || Number(continuation?.remainingLines || 0) > 0))
}
const eventNeedsAttention = event => ['running', 'waiting', 'failed'].includes(String(event?.display?.status || '')) || eventHasPartialResult(event)
const batchNeedsAttention = batch => (batch?.children || []).some(eventNeedsAttention)
const batchHasFailure = batch => (batch?.children || []).some(event => event?.display?.status === 'failed')
const batchPartialCount = batch => (batch?.children || []).filter(eventHasPartialResult).length
const batchStatusIcon = batch => batchHasFailure(batch) ? CircleX : batchNeedsAttention(batch) ? LoaderCircle : Check
const batchIsExpanded = batch => {
  if (expandedBatches[batch.key] !== undefined) return expandedBatches[batch.key]
  if (isQueryCompletion.value || effectiveExecutionDensity.value === 'detailed') return true
  if (effectiveExecutionDensity.value === 'summary') return batchNeedsAttention(batch)
  return batchNeedsAttention(batch)
}
const toggleBatch = batch => { expandedBatches[batch.key] = !batchIsExpanded(batch) }
const readSearchGroupIsExpanded = group => group?.expanded === true
const revealSourceReadEvent = event => {
  if (!event?.eventId || !isSourceReadEvent(event)) return
  expandedRows[event.eventId] = true
}
const toggleReadSearchGroup = group => {
  if (!group?.key) return
  const opening = !readSearchGroupIsExpanded(group)
  expandedReadSearchGroups[group.key] = opening
  if (opening) {
    for (const child of group.children || []) revealSourceReadEvent(child)
  }
}
const childAgentCardExpanded = event => {
  if (!event?.__childAgentConversation) return false
  if (effectiveExecutionDensity.value === 'summary' && !isLivePresentation.value) return false
  if (expandedChildAgentCards[event.key] !== undefined) return expandedChildAgentCards[event.key]
  return isLivePresentation.value || String(event?.display?.status || '') === 'failed'
}
const toggleChildAgentCard = event => {
  if (!event?.key) return
  expandedChildAgentCards[event.key] = !childAgentCardExpanded(event)
}
const childAgentToolsVisible = event => {
  if (!event?.__childAgentConversation || !childAgentCardExpanded(event)) return false
  if (expandedChildAgentTools[event.key] === true) return true
  if (expandedChildAgentTools[event.key] === false) return false
  if ((event.tools || []).some(item => item?.display?.status === 'failed' || item?.eventType === 'tool_failed')) return true
  if (normalizedSearchQuery.value && (event.tools || []).some(tool => searchableText(tool).includes(normalizedSearchQuery.value))) return true
  return false
}
const toggleChildAgentTools = event => {
  if (!event?.key) return
  expandedChildAgentTools[event.key] = !childAgentToolsVisible(event)
}
const childAgentMatchesSearch = event => {
  if (!normalizedSearchQuery.value) return true
  return searchableText(event).includes(normalizedSearchQuery.value)
    || (event.tools || []).some(tool => searchableText(tool).includes(normalizedSearchQuery.value))
}
const parallelSemanticRank = event => {
  const name = String(event?.toolName || event?.detail?.toolDisplay?.tool?.name || '').toLowerCase()
  if (/list_directory|glob|grep|search|find_(?:definition|references)|workspace_symbols/.test(name)) return 0
  const family = agentProgressToolFamily(event)
  if (family === 'search' || family === 'symbol') return 0
  if (/read_file|read_files/.test(name) || family === 'read') return 1
  if (family === 'git') return 2
  if (family === 'verify' || family === 'terminal') return 3
  return 4
}
const parallelFriendlyOrder = events => [...events].sort((left, right) => {
  const leftGroup = String(left?.parallelGroupId || '')
  const rightGroup = String(right?.parallelGroupId || '')
  if (leftGroup && leftGroup === rightGroup) {
    const semantic = parallelSemanticRank(left) - parallelSemanticRank(right)
    if (semantic) return semantic
  }
  return Number(left?.sequence || 0) - Number(right?.sequence || 0)
})
const isParallelBatch = children => children.some((event, childIndex) => (
  event?.parallelGroupId
  && children.some((candidate, candidateIndex) => candidateIndex !== childIndex && candidate?.parallelGroupId === event.parallelGroupId && candidate?.toolCallId !== event?.toolCallId)
))
const syntheticParallelBatches = lifecycleRows => {
  const groups = new Map()
  for (const event of lifecycleRows) {
    if (!String(event?.eventType || '').startsWith('tool_') || !event?.parallelGroupId) continue
    const key = String(event.parallelGroupId)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(event)
  }
  const eligible = new Map([...groups].filter(([, events]) => new Set(events.map(event => event?.toolCallId).filter(Boolean)).size > 1))
  const handled = new Set()
  return lifecycleRows.flatMap(event => {
    const groupId = String(event?.parallelGroupId || '')
    const group = eligible.get(groupId)
    if (!group) return [event]
    if (handled.has(groupId)) return []
    handled.add(groupId)
    const children = parallelFriendlyOrder(group)
    return [{
      __progressBatch: true,
      __syntheticBatch: true,
      key: `parallel:${groupId}`,
      sequence: Math.min(...children.map(child => Number(child?.sequence || 0))),
      progress: null,
      children,
      presentation: agentProgressBatchPresentation(children, { now: now.value, terminalAt: terminalAt.value }),
      parallel: true,
      durationMs: derivedStageDuration(children),
    }]
  })
}
const groupedStageItems = stageRows => {
  const cards = stageRows.filter(event => event?.__childAgentConversation)
  const rest = stageRows.filter(event => !event?.__childAgentConversation)
  const progressRows = rest.filter(event => event?.eventType === 'assistant_progress')
  const lifecycleRows = rest.filter(event => event?.eventType !== 'assistant_progress')
  const claimed = new Set()
  const claimedToolCallIds = new Set()
  const batches = progressRows.map((progress, index) => {
    const related = new Set(progress?.detail?.progress?.relatedToolCallIds || [])
    const nextSequence = Number(progressRows[index + 1]?.sequence || Number.POSITIVE_INFINITY)
    const children = parallelFriendlyOrder(lifecycleRows.filter(event => {
      if (isLiveModelActivityEvent(event)) return false
      if (claimed.has(event.eventId)) return false
      if (event?.toolCallId && claimedToolCallIds.has(event.toolCallId)) return false
      const inWindow = Number(event?.sequence || 0) > Number(progress?.sequence || 0) && Number(event?.sequence || 0) < nextSequence
      const matched = related.size ? related.has(event?.toolCallId) || inWindow : inWindow
      if (matched) {
        claimed.add(event.eventId)
        if (event?.toolCallId) claimedToolCallIds.add(event.toolCallId)
      }
      return matched
    }))
    const key = batchKeyFor(progress)
    return {
      __progressBatch: true,
      key,
      progress,
      children,
      presentation: agentProgressBatchPresentation(children, { now: now.value, terminalAt: terminalAt.value }),
      parallel: isParallelBatch(children),
      durationMs: derivedStageDuration(children),
    }
  })
  const unclaimed = lifecycleRows.filter(event => !claimed.has(event.eventId) && !(event?.toolCallId && claimedToolCallIds.has(event.toolCallId)))
  return [...batches, ...syntheticParallelBatches(unclaimed), ...cards]
    .sort((left, right) => Number((left.progress || left)?.sequence || 0) - Number((right.progress || right)?.sequence || 0))
}
const liveOrderedStageItems = items => {
  if (!isLivePresentation.value) return items
  const groupStarts = new Map()
  for (const item of items) {
    const event = item?.progress || item
    const runId = String(event?.agentRunId || event?.detail?.agentRunId || '')
    if (!runId) continue
    const sequence = Number(event?.sequence || 0)
    groupStarts.set(runId, Math.min(groupStarts.get(runId) ?? sequence, sequence))
  }
  return [...items].sort((left, right) => {
    const eventFor = item => item?.progress || item
    const orderFor = item => {
      const event = eventFor(item)
      const runId = String(event?.agentRunId || event?.detail?.agentRunId || '')
      const sequence = Number(event?.sequence || 0)
      if (!runId) return sequence
      const start = groupStarts.get(runId) ?? sequence
      return String(event?.eventType || '').startsWith('agent_') ? start - 0.01 : sequence
    }
    const leftEvent = eventFor(left)
    const rightEvent = eventFor(right)
    const leftGroup = String(leftEvent?.parallelGroupId || '')
    const rightGroup = String(rightEvent?.parallelGroupId || '')
    if (leftGroup && leftGroup === rightGroup) {
      const semantic = parallelSemanticRank(leftEvent) - parallelSemanticRank(rightEvent)
      if (semantic) return semantic
    }
    return orderFor(left) - orderFor(right)
  })
}
const flattenGroupedLiveRows = items => appendLiveModelActivityToTail(
  liveOrderedStageItems(groupedStageItems(items)).flatMap(item => {
    if (!item.__progressBatch) return isLiveModelActivityEvent(item) ? [] : [item]
    return [
      item,
      ...(batchIsExpanded(item) ? item.children.filter(event => !isLiveModelActivityEvent(event)).map(event => ({
        ...event,
        __batchChild: true,
        __agentChild: !!owningAgentFor(event),
        __batchKey: item.key,
      })) : []),
    ]
  }),
  items.filter(isLiveModelActivityEvent),
)
const executionStageRows = computed(() => {
  const includeRequirementPlan = !!requirementPlan.value && !(isLivePresentation.value && livePlanDockEligible.value)
  if (!stageMode.value) {
    const sourceRows = (isLivePresentation.value || isQueryCompletion.value)
      ? flattenGroupedLiveRows(nestedLedgerRows.value.filter(event => event?.__childAgentConversation || event?.eventType !== 'thinking_status'))
      : visibleRows.value
    if (!includeRequirementPlan) return sourceRows
    const projected = [...sourceRows]
    const firstAgentIndex = projected.findIndex(event => event?.__childAgentConversation || event?.eventType?.startsWith('agent_'))
    projected.splice(firstAgentIndex >= 0 ? firstAgentIndex : projected.length, 0, {
      __requirementPlan: true,
      key: `requirement-plan:${requirementPlan.value.planId}:${requirementPlan.value.revision}`,
      event: latestRequirementPlanEvent.value,
    })
    return appendLiveModelActivityToTail(projected)
  }
  const stageTiming = stageTimingSource.value?.stages || {}
  const stageBlocks = stageDefinitions.map(stage => {
    const stageRows = stageSourceRows.value.filter(event => inferredStageKind(event) === stage.kind)
    if (!stageRows.length) return { stage, rows: [] }
    const lifecycleRows = stageRows.filter(event => event?.eventType !== 'assistant_progress')
    const terminalSucceeded = isTerminal.value && resultEvent.value?.display?.status === 'success'
    const failed = !terminalSucceeded && lifecycleRows.some(event => event?.display?.status === 'failed')
    const active = !isTerminal.value && lifecycleRows.some(event => ['running', 'waiting'].includes(String(event?.display?.status || '')))
    const stageStatus = failed ? '失败' : active ? '进行中' : '完成'
    const header = {
      __stageHeader: true,
      key: `stage:${stage.kind}`,
      kind: stage.kind,
      label: stage.label,
      active,
      status: stageStatus,
      summary: stageSummaryFor(stage.kind, stageRows, lifecycleRows, stageStatus),
      durationMs: Math.max(0, configuredStageDuration(stage, stageTiming) || derivedStageDuration(stageRows)),
    }
    const groupedRows = liveOrderedStageItems(groupedStageItems(stageRows)).flatMap(item => {
      if (!item.__progressBatch) return [{ ...item, __stageChild: true, __agentChild: !!owningAgentFor(item), __stageKind: stage.kind }]
      return [
        { ...item, __stageChild: true, __stageKind: stage.kind },
        ...(batchIsExpanded(item) ? item.children.map(event => ({ ...event, __stageChild: true, __batchChild: true, __agentChild: !!owningAgentFor(event), __stageKind: stage.kind, __batchKey: item.key })) : []),
      ]
    })
    if (isLivePresentation.value) {
      return { stage, rows: groupedRows }
    }
    return { stage, rows: [header, ...(stageIsExpanded(header) ? groupedRows : [])] }
  })
  const projected = []
  let planInserted = false
  if (includeRequirementPlan && isTerminal.value) {
    projected.push({ __requirementPlan: true, key: `requirement-plan:${requirementPlan.value.planId}:${requirementPlan.value.revision}`, event: latestRequirementPlanEvent.value })
    planInserted = true
  }
  for (const block of stageBlocks) {
    if (!planInserted && block.stage.kind === 'project_execution' && includeRequirementPlan) {
      projected.push({ __requirementPlan: true, key: `requirement-plan:${requirementPlan.value.planId}:${requirementPlan.value.revision}`, event: latestRequirementPlanEvent.value })
      planInserted = true
    }
    projected.push(...block.rows)
    if (!planInserted && block.stage.kind === 'preparation' && includeRequirementPlan && block.rows.length) {
      projected.push({ __requirementPlan: true, key: `requirement-plan:${requirementPlan.value.planId}:${requirementPlan.value.revision}`, event: latestRequirementPlanEvent.value })
      planInserted = true
    }
  }
  if (!planInserted && includeRequirementPlan) projected.unshift({ __requirementPlan: true, key: `requirement-plan:${requirementPlan.value.planId}:${requirementPlan.value.revision}`, event: latestRequirementPlanEvent.value })
  return appendLiveModelActivityToTail(projected, nestedLedgerRows.value)
})
const hydratedDetails = reactive({})
const detailLoading = reactive({})
const detailErrors = reactive({})
const detailNotices = reactive({})
const liveTails = reactive({})
const expandedRows = reactive({})
const expandedBatchFiles = reactive({})
const expandedInlineDiffs = reactive({})

const locateExecutionEvent = browserEvent => {
  const detail = browserEvent?.detail || {}
  const target = rows.value.find(event => String(event?.eventId || '') === String(detail.eventId || ''))
    || rows.value.find(event => String(event?.detail?.causalRefs?.planStepId || event?.detail?.replayLink?.planStepId || '') === String(detail.planStepId || ''))
  if (!target) return
  if (isTerminal.value) transcriptExpanded.value = true
  if (target.eventType === 'requirement_plan') requirementPlanExpanded.value = true
  const stageKind = inferredStageKind(target)
  if (stageKind) expandedStages[stageKind] = true
  const progressOwner = assistantProgressRows.value.find(progress => (
    (progress?.detail?.progress?.relatedToolCallIds || []).includes(target?.toolCallId)
    || progress?.eventId === target?.parentEventId
  ))
  if (progressOwner) expandedBatches[batchKeyFor(progressOwner)] = true
  if (target.eventId) expandedRows[target.eventId] = true
  const groupKey = target.__readSearchGroupKey || `read-search:${target.eventId || target.toolCallId || ''}`
  if (target.__readSearchGroupKey) expandedReadSearchGroups[target.__readSearchGroupKey] = true
  else if (groupKey) expandedReadSearchGroups[groupKey] = true
}

const replaceReactiveFlags = (target, source) => {
  Object.keys(target).forEach(key => delete target[key])
  Object.entries(source && typeof source === 'object' ? source : {}).forEach(([key, value]) => { target[key] = value === true })
}
const restoreExpansionState = () => {
  if (typeof sessionStorage === 'undefined') return
  try {
    const saved = JSON.parse(sessionStorage.getItem(expansionStorageKey.value) || '{}')
    transcriptExpanded.value = saved.transcriptExpanded === true
    requirementPlanExpanded.value = saved.requirementPlanExpanded === true
    attemptHistoryExpanded.value = saved.attemptHistoryExpanded === true
    completionFilesExpanded.value = saved.completionFilesExpanded === true
    replaceReactiveFlags(expandedStages, saved.stages)
    replaceReactiveFlags(expandedBatches, saved.batches)
    replaceReactiveFlags(expandedReadSearchGroups, saved.readSearchGroups)
    replaceReactiveFlags(expandedRows, saved.rows)
    replaceReactiveFlags(expandedBatchFiles, saved.batchFiles)
    replaceReactiveFlags(expandedInlineDiffs, saved.inlineDiffs)
  } catch {}
}
const persistExpansionState = () => {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(expansionStorageKey.value, JSON.stringify({
      transcriptExpanded: transcriptExpanded.value,
      requirementPlanExpanded: requirementPlanExpanded.value,
      attemptHistoryExpanded: attemptHistoryExpanded.value,
      completionFilesExpanded: completionFilesExpanded.value,
      stages: { ...expandedStages },
      batches: { ...expandedBatches },
      readSearchGroups: { ...expandedReadSearchGroups },
      rows: { ...expandedRows },
      batchFiles: { ...expandedBatchFiles },
      inlineDiffs: { ...expandedInlineDiffs },
    }))
  } catch {}
}
watch(expansionStorageKey, restoreExpansionState)
watch([transcriptExpanded, requirementPlanExpanded, attemptHistoryExpanded, completionFilesExpanded, expandedStages, expandedBatches, expandedReadSearchGroups, expandedRows, expandedBatchFiles, expandedInlineDiffs], persistExpansionState, { deep: true })

const eventTime = value => {
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : 0
}
const turnStartedAt = computed(() => eventTime(rows.value.find(event => event.eventType === 'turn_started')?.createdAt || rows.value[0]?.createdAt))
const turnEndedAt = computed(() => terminalAt.value)
const turnDurationMs = computed(() => {
  const reported = Number(resultEvent.value?.display?.durationMs || 0)
  if (reported > 0) return reported
  if (!turnStartedAt.value) return 0
  return Math.max(0, (turnEndedAt.value || now.value) - turnStartedAt.value)
})
const turnDurationLabel = computed(() => formatExecutionDurationLong(turnDurationMs.value))
const totalDurationLabel = computed(() => turnDurationLabel.value.replace(/^耗时/, '总耗时'))
const processedDurationLabel = computed(() => {
  const totalSeconds = Math.max(0, Math.round(turnDurationMs.value / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (!minutes) return `${Math.max(1, seconds)}秒`
  return seconds ? `${minutes}分${seconds}秒` : `${minutes}分钟`
})

const completionFiles = computed(() => isOfficialCompletion.value ? completionFileChangesForRows(rows.value) : [])
const completionFilesVisible = computed(() => completionFilesExpanded.value ? completionFiles.value.slice(0, 40) : completionFiles.value.slice(0, 3))
const completionFileRemainder = computed(() => Math.max(0, completionFiles.value.length - completionFilesVisible.value.length))
const completionFileTotals = computed(() => completionFiles.value.reduce((summary, file) => {
  if (Number.isFinite(Number(file.additions))) {
    summary.hasStats = true
    summary.additions += Number(file.additions)
  }
  if (Number.isFinite(Number(file.deletions))) {
    summary.hasStats = true
    summary.deletions += Number(file.deletions)
  }
  return summary
}, { additions: 0, deletions: 0, hasStats: false }))
const completionSucceeded = computed(() => isOfficialCompletion.value)
const completionSafeSummary = value => {
  const summary = String(value || '').replace(/\s+/g, ' ').trim()
  if (!summary || summary.length > 120) return ''
  if (/```|(?:api[_ -]?key|password|secret|authorization|bearer)\s*[:=]|-----begin|^(?:\[|\{)/i.test(summary)) return ''
  return summary
}
const completionVerificationCount = computed(() => {
  const result = resultEvent.value?.result || {}
  const candidates = [result.verification, resultEvent.value?.evidenceIds, resultEvent.value?.detail?.verification]
  return candidates.reduce((count, value) => Math.max(count, Array.isArray(value) ? value.length : 0), 0)
})
const completionResultSummary = computed(() => {
  if (!isTerminal.value) return ''
  if (isQueryCompletion.value) {
    const count = Number(queryRecord.value?.toolCount || toolCount.value || 0)
    return queryRecord.value?.succeeded === false
      ? `已检查 ${count || 1} 项，部分操作未完成`
      : count ? `已检查 ${count} 项` : '查询已完成'
  }
  const status = String(terminalBoundary.value?.status || resultEvent.value?.display?.status || '').toLowerCase()
  const files = completionFiles.value.length
  const failedVerification = Array.isArray(resultEvent.value?.result?.unfinished)
    ? resultEvent.value.result.unfinished.length
    : 0
  if (status === 'success') {
    const parts = []
    const resultSummary = completionSafeSummary(resultEvent.value?.display?.summary)
    if (resultSummary && !/^(?:任务|执行|回复)?已完成$|^(?:代码修改和)?独立验收(?:均)?已通过$/.test(resultSummary)) parts.push(resultSummary)
    if (completionVerificationCount.value) parts.push('验证通过')
    if (files) parts.push(`修改 ${files} 个文件`)
    return [...new Set(parts)].join(' · ') || '本轮任务已完成'
  }
  if (files && failedVerification) return `已完成主要修改，${failedVerification} 项验证未通过`
  if (status === 'cancelled' || status === 'canceled') return '本轮已停止，未正式交付'
  if (status === 'interrupted') return '本轮已中断，未正式交付'
  return '本轮未通过验收，未正式交付'
})
const completedProjectionTitle = computed(() => isQueryCompletion.value ? '查询过程' : '执行记录')
const completedProjectionSucceeded = computed(() => isOfficialCompletion.value || queryRecord.value?.succeeded === true)
const attemptHistoryGroups = computed(() => {
  const groups = new Map()
  for (const event of agentRows.value) {
    const history = Array.isArray(event?.detail?.agentAttemptHistory) ? event.detail.agentAttemptHistory : []
    if (!history.length) continue
    const display = event?.detail?.agentDisplay || {}
    const project = String(display.projectName || display.projectId || event?.display?.title || 'Agent').trim()
    const workItem = String(display.workItemTitle || event?.workItemId || event?.display?.target || '执行任务').trim()
    const key = `${project}|${workItem}`
    const existing = groups.get(key) || { key, project, workItem, attempts: [] }
    for (const attempt of history) {
      const attemptNumber = Number(attempt?.attempt || 0)
      const attemptKey = `${attemptNumber}|${String(attempt?.status || '')}|${String(attempt?.summary || '')}`
      if (!existing.attempts.some(item => item.key === attemptKey)) existing.attempts.push({ ...attempt, key: attemptKey, attempt: attemptNumber })
    }
    groups.set(key, existing)
  }
  return [...groups.values()].filter(group => group.attempts.length).map(group => ({
    ...group,
    attempts: group.attempts.sort((left, right) => Number(left.attempt || 0) - Number(right.attempt || 0)),
  }))
})
const attemptHistoryCount = computed(() => attemptHistoryGroups.value.reduce((count, group) => count + group.attempts.length, 0))
const recoveryMilestone = computed(() => {
  const event = [...rows.value].reverse().find(item => item?.detail?.recoveryMilestone && Number(item?.generation || 0) === currentGeneration.value)
  const recovery = event?.detail?.recoveryMilestone
  if (!recovery || recovery.safe !== true) return null
  const skipped = Math.max(0, Number(recovery.skippedWorkItemCount || 0))
  const phase = String(recovery.phaseLabel || '').trim()
  if (phase) return `已从${phase}阶段恢复${skipped ? ` · 已跳过 ${skipped} 个已完成工作项` : ''}`
  return recovery.revalidated === true ? '已重新核验后继续' : ''
})
const normalizePlanStepStatus = value => {
  const status = String(value || 'pending').toLowerCase()
  if (['completed', 'done', 'success', 'accepted'].includes(status)) return 'completed'
  if (['running', 'in_progress', 'executing', 'awaiting_review', 'reworking', 'reviewing'].includes(status)) return 'running'
  if (['blocked', 'failed', 'rejected'].includes(status)) return 'blocked'
  if (['skipped', 'cancelled', 'canceled'].includes(status)) return 'skipped'
  return 'pending'
}
const effectivePlanSteps = computed(() => (requirementPlan.value?.steps || []).map(step => {
  const status = normalizePlanStepStatus(step?.status)
  if (completionSucceeded.value || requirementPlan.value?.status === 'completed') return { ...step, status: 'completed' }
  return { ...step, status }
}))
const planStatusLabel = computed(() => {
  if (requirementPlan.value?.status === 'completed' || completionSucceeded.value) return '计划已完成'
  if (requirementPlan.value?.status === 'blocked' || terminalBoundary.value?.status === 'failed') return '计划受阻'
  if (effectivePlanSteps.value.some(step => step.status === 'running')) return '正在执行'
  return '计划已就绪'
})
const planStepIcon = step => step.status === 'completed' ? Check : step.status === 'blocked' ? CircleX : step.status === 'running' ? LoaderCircle : step.status === 'skipped' ? Minus : Circle
const stageLifecycleStatus = kind => {
  const stageRows = stageSourceRows.value.filter(event => inferredStageKind(event) === kind && event?.eventType !== 'assistant_progress')
  if (!stageRows.length) return 'pending'
  if (isTerminal.value && completionSucceeded.value) return 'completed'
  if (stageRows.some(event => event?.display?.status === 'failed')) return 'blocked'
  if (stageRows.some(event => ['running', 'waiting'].includes(String(event?.display?.status || '')))) return 'running'
  return 'completed'
}
const completionFileTitle = computed(() => completionSucceeded.value
  ? `已编辑 ${completionFiles.value.length} 个文件`
  : `产生了 ${completionFiles.value.length} 个未验收改动`)
const toggleCompletionFiles = () => { completionFilesExpanded.value = !completionFilesExpanded.value }
const openAllFileChanges = () => {
  if (!completionFiles.value.length) return
  emit('open-file-changes', { count: completionFiles.value.length, files: completionFiles.value })
}

const progressText = event => String(event?.detail?.progress?.text || event?.display?.summary || '').trim()
const batchDuration = batchRows => {
  const intervals = batchRows.map(event => {
    const started = eventTime(event?.createdAt)
    const duration = Math.max(0, Number(event?.display?.durationMs || 0))
    return started ? [started, started + duration] : null
  }).filter(Boolean)
  return unionDuration(intervals)
}
const progressSegments = computed(() => {
  const lifecycle = rows.value.filter(event => event?.eventType?.startsWith('tool_') || event?.eventType?.startsWith('agent_') || ['permission_required', 'context_compacted'].includes(event?.eventType))
  const segments = assistantProgressRows.value.map((progress, index, all) => {
    const relatedIds = new Set(progress?.detail?.progress?.relatedToolCallIds || [])
    const nextSequence = Number(all[index + 1]?.sequence || Number.POSITIVE_INFINITY)
    const matched = relatedIds.size
      ? lifecycle.filter(event => relatedIds.has(event?.toolCallId))
      : lifecycle.filter(event => Number(event?.sequence || 0) > Number(progress?.sequence || 0) && Number(event?.sequence || 0) < nextSequence)
    return { progress, rows: matched }
  })
  return segments.map((segment, index) => {
    const tools = segment.rows.filter(event => event?.eventType?.startsWith('tool_')).length
    const agents = segment.rows.filter(event => event?.eventType?.startsWith('agent_')).length
    const presentation = agentProgressBatchPresentation(segment.rows, { now: now.value, terminalAt: terminalAt.value })
    const parts = []
    if (tools) parts.push(presentation.label)
    if (!tools && agents) parts.push(presentation.label)
    if (presentation.count) parts.push(`${presentation.count}项`)
    if (presentation.failed) parts.push(`${presentation.failed}项失败`)
    return {
      ...segment,
      key: segment.progress?.eventId || segment.progress?.detail?.progress?.batchId || `progress-${index}`,
      label: parts.join(' · '),
      durationMs: presentation.durationMs || batchDuration(segment.rows),
      running: presentation.running,
    }
  })
})
const displayedProgressSegments = computed(() => effectiveExecutionDensity.value === 'summary'
  ? progressSegments.value.slice(-1)
  : progressSegments.value)

const derivedToolWallMs = computed(() => {
  const intervals = toolRows.value
    .map(event => {
      const start = eventTime(event?.createdAt)
      const duration = Math.max(0, Number(event?.display?.durationMs || 0))
      return start && duration ? [start, start + duration] : null
    })
    .filter(Boolean)
    .sort((left, right) => left[0] - right[0])
  let total = 0
  let current = null
  for (const interval of intervals) {
    if (!current || interval[0] > current[1]) {
      if (current) total += current[1] - current[0]
      current = [...interval]
    } else current[1] = Math.max(current[1], interval[1])
  }
  if (current) total += current[1] - current[0]
  return total
})

const timingItems = computed(() => {
  const timing = resultEvent.value?.detail?.timing || {}
  const items = [
    ['总耗时', Number(timing.totalMs || turnDurationMs.value)],
    ['模型', Number(timing.modelMs)],
    ['工具', Number.isFinite(Number(timing.toolWallMs)) ? Number(timing.toolWallMs) : derivedToolWallMs.value],
    ['项目 Agent', Number(timing.projectAgentWallMs || timing.stages?.projectAgentWallMs)],
    ['独立验收', Number(timing.verificationMs || timing.stages?.testAgentWallMs)],
    ['主 Agent 总结', Number(timing.summaryMs || timing.stages?.mainAgentSummaryMs)],
    ['排队等待', Number(timing.queueWaitMs)],
    ['依赖等待', Number(timing.dependencyWaitMs)],
    ['其他处理', Number(timing.otherMs)],
  ]
  return items.filter(([, value]) => Number.isFinite(value) && value > 0)
})

const statusIcon = event => {
  if (event?.display?.status === 'success') return Check
  if (event?.display?.status === 'failed') return CircleX
  if (event?.display?.status === 'waiting') return LoaderCircle
  return Circle
}
const semanticToolIcon = event => {
  const family = agentProgressToolFamily(event)
  if (family === 'read') return FileCode2
  if (family === 'search' || family === 'symbol') return Search
  if (family === 'git') return History
  if (family === 'verify' || family === 'terminal') return Wrench
  if (family === 'agent') return ListChecks
  return Wrench
}
const rowLeadingIcon = event => event?.__batchChild && event?.display?.status === 'success' && !eventHasPartialResult(event)
  ? semanticToolIcon(event)
  : statusIcon(event)
const rowShowsTerminalStatus = event => !event?.__batchChild || event?.display?.status !== 'success' || eventHasPartialResult(event)

const safeJson = value => {
  if (value == null) return ''
  try { return JSON.stringify(value, null, 2) } catch { return '' }
}

const auditResultKeys = new Set([
  'schema', 'contentStored', 'toolKind', 'source', 'loaded', 'scope', 'aliases', 'resultChecksum',
  'outputChecksum', 'sourceChecksum', 'queryChecksum', 'repoStateIdentity', 'evidenceId', 'indexGeneration',
  'durationMs', 'outputTokens', 'reason', 'ok', 'name', 'itemName',
])

const legacyResult = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value || null
  const result = Object.fromEntries(Object.entries(value).filter(([key]) => !auditResultKeys.has(key) && !/checksum/i.test(key)))
  return Object.keys(result).length ? result : null
}

const legacyToolDisplays = new WeakMap()
const toolDisplayFor = event => {
  const current = hydratedDetails[event?.eventId] || event?.detail?.toolDisplay
  if (current) return current
  if (!event || typeof event !== 'object' || !event.detail || (!event.detail.safeArguments && !event.detail.safeResult)) return null
  if (!legacyToolDisplays.has(event)) legacyToolDisplays.set(event, buildLegacyToolDisplay(event))
  return legacyToolDisplays.get(event) || null
}
const toolDisplayExpandable = event => {
  const display = toolDisplayFor(event)
  if (!display) return false
  const result = display.result || {}
  return toolResultHasUserDetails(display)
    || !!display.sensitiveCommand
    || !!display.arguments?.length
    || !!result.searchExecution
    || !!result.freshness
    || !!result.authoritativeRevision
    || !!result.preview
    || !!result.fileRows?.length
    || !!result.continuation
    || !!result.rehydratable
    || !!result.truncated
    || Number(event?.display?.tokenCount || 0) > 0
}
const isRowExpandable = event => !!(event?.detail && (
  toolDisplayExpandable(event)
  || event.detail.agentDisplay
  || event.detail.safeArguments
  || legacyResult(event.detail.safeResult)
  || event.detail.fileChanges?.length
))
const isRowExpanded = event => isRowExpandable(event) && expandedRows[event.eventId] === true
const toggleRow = event => {
  if (!isRowExpandable(event)) return
  const opening = expandedRows[event.eventId] !== true
  expandedRows[event.eventId] = opening
  if (opening && isSourceReadEvent(event) && !batchFileRowsFor(event).length && !detailLoading[event.eventId]) {
    void rehydrateDetail(event, false)
  }
}

const isSourceReadEvent = event => {
  const name = String(toolDisplayFor(event)?.tool?.name || event?.toolName || '').split('__').at(-1).toLowerCase()
  return name === 'read_file' || name === 'read_files'
}

const legacyToolIdentity = event => {
  const raw = String(event?.toolName || event?.display?.title || 'Agent')
  const parts = raw.split('__').filter(Boolean)
  const operation = parts[0] === 'mcp' ? parts.at(-1) : raw
  const labels = {
    Read: '读取文件', read: '读取文件', read_file: '读取文件', FileRead: '读取文件', 'Read file': '读取文件', 'Read files': '批量读取文件',
    Glob: '查找文件', glob: '查找文件', glob_files: '查找文件', 'Glob files': '查找文件',
    Grep: '搜索代码', grep: '搜索代码', grep_text: '搜索代码', 'Grep text': '搜索代码',
    list_directory: '查看目录', LS: '查看目录', 'List directory': '查看目录',
    find_definition: '查找定义', find_references: '查找引用', find_implementations: '查找实现',
    'Find definition': '查找定义', 'Find references': '查找引用', 'Find implementations': '查找实现',
    find_type_definition: '查找类型定义', find_incoming_calls: '查找调用方', find_outgoing_calls: '查找被调用项',
    read_code_diagnostics: '读取代码诊断', read_git_status: '检查 Git 状态', read_git_diff: '查看 Git 差异', read_git_history: '查看 Git 历史',
    inspect_system: '检查系统状态', 'Inspect system': '检查系统状态',
    shell_read_runtime_log: '读取项目日志', shell_read_runtime_logs: '读取项目日志',
    maven_build: '运行 Maven 构建', gradle_build: '运行 Gradle 构建', run_terminal: '运行项目命令',
  }
  const internalWorkspace = raw.startsWith('mcp__ccm__ccm_workspace_readonly__')
  return { label: labels[operation] || raw, serverLabel: parts[0] === 'mcp' && !internalWorkspace ? parts.at(-2) : '' }
}

const toolReadableLabel = event => {
  const projected = String(toolDisplayFor(event)?.tool?.userLabel || toolDisplayFor(event)?.tool?.label || '').trim()
  const legacy = legacyToolIdentity(event).label
  if (projected && /[\u3400-\u9fff]/.test(projected)) return projected
  return legacy !== String(event?.toolName || event?.display?.title || 'Agent') ? legacy : projected || legacy
}

const eventTitle = event => {
  if (event?.eventType === 'model_activity') return event?.detail?.modelActivity?.safeLabel || event?.display?.summary || '正在处理'
  if (String(event?.eventType || '').startsWith('agent_')) {
    const display = event?.detail?.agentDisplay
    if (display?.projectName || display?.projectId) {
      const project = display.projectName || display.projectId
      const isTestAgent = /test.?agent/i.test(String(display.runtimeLabel || event?.display?.title || ''))
      return `${isTestAgent ? 'TestAgent' : '项目子 Agent'} · ${project}`
    }
    return event?.display?.title || 'Agent'
  }
  return toolReadableLabel(event)
}
const eventBusinessSummary = event => {
  if (event?.eventType === 'model_activity') return ''
  const projected = String(toolDisplayFor(event)?.result?.summary || '').trim()
  const fallback = String(event?.display?.summary || '').trim()
  const generic = /^(?:执行完成|工具执行完成|正在执行)$/
  if (projected && !generic.test(projected)) return projected
  return generic.test(fallback) ? '' : fallback
}
const safeInlineTarget = value => {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
  return text && text.length <= 500 ? text : ''
}
const eventTarget = event => {
  const toolDisplay = toolDisplayFor(event)
  const candidates = [
    String(event?.eventType || '').startsWith('agent_') ? event?.detail?.agentDisplay?.runtimeLabel : '',
    event?.display?.target,
    toolDisplay?.tool?.target,
    toolDisplay?.arguments?.path,
    toolDisplay?.arguments?.project,
    toolDisplay?.arguments?.projectId,
    event?.detail?.safeArguments?.path,
    event?.detail?.safeArguments?.project,
  ]
  return candidates.map(safeInlineTarget).find(Boolean) || ''
}
const safeStageSummaryText = value => {
  const summary = String(value || '').replace(/\s+/g, ' ').trim()
  if (!summary || summary.length > 120) return ''
  if (/```|(?:api[_ -]?key|password|secret|authorization|bearer)\s*[:=]|-----begin|^(?:\[|\{)/i.test(summary)) return ''
  return summary
}
const stageFallbackSummary = (kind, status) => {
  const terminal = status === '完成'
  const blocked = status === '失败'
  const waiting = status === '进行中'
  if (kind === 'preparation') return blocked ? '了解任务情况时遇到问题' : terminal ? '已了解任务情况和相关现状' : '正在了解任务情况和相关现状'
  if (kind === 'coordination_dispatch') return blocked ? '分派未完成，需要处理' : terminal ? '已安排目标项目或群聊继续处理' : waiting ? '正在安排目标项目或群聊处理' : '正在确认分派安排'
  if (kind === 'project_execution') return blocked ? '实施处理未完成，需要处理' : terminal ? '已完成实施处理' : '正在处理任务内容'
  return blocked ? '验证或交付未完成，需要处理' : terminal ? '已完成验证并整理交付结果' : '正在核验结果并整理交付'
}
const stageSummaryFor = (kind, stageRows, lifecycleRows, status) => {
  const failedToolCount = lifecycleRows.filter(event => String(event?.eventType || '').startsWith('tool_') && event?.display?.status === 'failed').length
  if (status === '完成') {
    const successful = [...lifecycleRows].reverse().find(event => (
      ['success', 'passed'].includes(String(event?.display?.status || ''))
      && safeStageSummaryText(eventBusinessSummary(event))
    ))
    const narration = [...stageRows].reverse().find(event => event?.eventType === 'assistant_progress' && safeStageSummaryText(progressText(event)))
    const summary = successful
      ? safeStageSummaryText(eventBusinessSummary(successful))
      : narration ? safeStageSummaryText(progressText(narration)) : stageFallbackSummary(kind, status)
    return `${summary}${failedToolCount ? ` · ${failedToolCount} 项工具失败` : ''}`
  }
  const factual = [...lifecycleRows].reverse().find(event => (
    ['success', 'passed', 'failed', 'waiting'].includes(String(event?.display?.status || ''))
    && safeStageSummaryText(eventBusinessSummary(event))
  ))
  if (factual) return safeStageSummaryText(eventBusinessSummary(factual))
  const narration = [...stageRows].reverse().find(event => (
    event?.eventType === 'assistant_progress' && safeStageSummaryText(progressText(event))
  ))
  return narration ? safeStageSummaryText(progressText(narration)) : stageFallbackSummary(kind, status)
}

const normalizedFileChange = (file, event) => {
  const source = typeof file === 'string' ? { path: file } : { ...(file || {}) }
  const path = String(source.path || source.file || source.name || '').trim()
  return {
    ...source,
    path,
    project: source.project || source.target_project || source.projectName || event?.detail?.agentDisplay?.projectId || '',
    taskId: source.taskId || source.task_id || event?.taskId || '',
    workItemId: source.workItemId || source.work_item_id || event?.workItemId || '',
    eventId: event?.eventId || '',
  }
}
const projectAgentOwnerFor = event => {
  const candidate = event?.detail?.agentDisplay ? event : owningAgentFor(event)
  const display = candidate?.detail?.agentDisplay || {}
  if (!candidate || !String(candidate?.agentRunId || candidate?.detail?.agentRunId || event?.agentRunId || '')) return null
  if (!String(display.projectId || display.projectName || '').trim()) return null
  if (/test.?agent/i.test(String(display.runtimeLabel || candidate?.display?.title || ''))) return null
  return candidate
}
const latestAttemptForOwner = event => {
  const owner = projectAgentOwnerFor(event)
  if (!owner) return 0
  const display = owner.detail?.agentDisplay || {}
  const project = String(display.projectId || display.projectName || '')
  const workItemId = String(owner.workItemId || event?.workItemId || '')
  return agentRows.value.reduce((max, candidate) => {
    const candidateDisplay = candidate?.detail?.agentDisplay || {}
    if (String(candidateDisplay.projectId || candidateDisplay.projectName || '') !== project) return max
    if (workItemId && String(candidate.workItemId || '') !== workItemId) return max
    return Math.max(max, Number(candidate.attempt || candidateDisplay.attempt || 1))
  }, 0)
}
const inlineFileChangesFor = event => {
  const owner = projectAgentOwnerFor(event)
  if (!owner || Number(event?.generation || 0) !== currentGeneration.value) return []
  const attempt = Number(event?.attempt || event?.detail?.agentDisplay?.attempt || owner?.attempt || owner?.detail?.agentDisplay?.attempt || 1)
  if (attempt < latestAttemptForOwner(event)) return []
  const ownerDisplay = owner.detail?.agentDisplay || {}
  const raw = Array.isArray(event?.detail?.fileChanges) && event.detail.fileChanges.length
    ? event.detail.fileChanges
    : String(event?.detail?.runtimeObservation?.eventType || '') === 'file_changed' && event?.display?.target
      ? [{ path: event.display.target, status: '修改' }]
      : []
  const unique = new Map()
  for (const item of raw) {
    const normalized = normalizedFileChange(item, event)
    if (!normalized.path) continue
    normalized.project = normalized.project || ownerDisplay.projectId || ownerDisplay.projectName || ''
    const previous = unique.get(normalized.path)
    unique.set(normalized.path, previous ? {
      ...previous,
      ...normalized,
      additions: Math.max(Number(previous.additions || 0), Number(normalized.additions || 0)),
      deletions: Math.max(Number(previous.deletions || 0), Number(normalized.deletions || 0)),
    } : normalized)
  }
  return [...unique.values()]
}
const fileChangeKind = file => {
  const status = String(file?.statusKind || file?.status || '').toLowerCase()
  if (file?.deleted || /删除|deleted|^d$/.test(status)) return 'deleted'
  if (/新增|added|^a$/.test(status)) return 'added'
  if (/重命名|renamed|^r/.test(status)) return 'renamed'
  return 'modified'
}
const fileChangeLabel = file => ({ added: '已创建', deleted: '已删除', renamed: '已重命名', modified: '已修改' })[fileChangeKind(file)]
const fileChangeIcon = file => fileChangeKind(file) === 'added' ? FilePlus2 : fileChangeKind(file) === 'deleted' ? FileMinus2 : Pencil
const inlineDiffKey = (event, file) => `${event?.eventId || 'event'}:${String(file?.path || '')}`
const inlineDiffExpanded = (event, file) => expandedInlineDiffs[inlineDiffKey(event, file)] === true
const toggleInlineDiff = (event, file) => {
  const key = inlineDiffKey(event, file)
  expandedInlineDiffs[key] = !expandedInlineDiffs[key]
}
const openFileChange = (file, event) => {
  const normalized = normalizedFileChange(file, event)
  if (!normalized.path) return
  emit('open-file-change', normalized)
}
const fileChangeStat = (file) => {
  const additions = Number(file?.additions ?? file?.diff?.additions ?? 0)
  const deletions = Number(file?.deletions ?? file?.diff?.deletions ?? 0)
  if (!additions && !deletions) return ''
  return `+${additions} -${deletions}`
}

const batchFileRowsFor = event => {
  const rows = toolDisplayFor(event)?.result?.fileRows
  return Array.isArray(rows) ? rows : []
}
const openableSourcePaths = computed(() => {
  const paths = []
  for (const event of rows.value) {
    if (!isSourceReadEvent(event)) continue
    paths.push(...sourceReadPathsFromEvent(event))
  }
  return paths
})
const openSourceFile = event => {
  if (isSourceReadEvent(event) && !batchFileRowsFor(event).length && !detailLoading[event.eventId]) {
    void rehydrateDetail(event, false)
  }
}
const openListingSource = payload => {
  const match = findSourceReadEventForPath(rows.value.filter(isSourceReadEvent), payload?.path)
  if (!match) return
  transcriptExpanded.value = true
  revealSourceReadEvent(match)
  const group = collapsedExecutionStageRows.value.find(item => (
    item?.__readSearchGroup && (item.children || []).some(child => child.eventId === match.eventId)
  ))
  if (group?.key) expandedReadSearchGroups[group.key] = true
  nextTick(() => {
    const node = executionAnchor.value?.querySelector(`[data-execution-event-id="${match.eventId}"]`)
    node?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}

const mergeBatchFileRows = (previousRows, currentRows) => {
  const orderedPaths = []
  const rowsByPath = new Map()
  for (const file of Array.isArray(previousRows) ? previousRows : []) {
    const path = String(file?.path || '').trim()
    if (!path) continue
    orderedPaths.push(path)
    rowsByPath.set(path, { ...file, lines: [...(file?.lines || [])] })
  }
  for (const file of Array.isArray(currentRows) ? currentRows : []) {
    const path = String(file?.path || '').trim()
    if (!path) continue
    const previous = rowsByPath.get(path)
    if (!previous) orderedPaths.push(path)
    const linesByNumber = new Map()
    for (const line of previous?.lines || []) linesByNumber.set(Number(line?.line || 0), line)
    for (const line of file?.lines || []) linesByNumber.set(Number(line?.line || 0), line)
    const lines = [...linesByNumber.values()].filter(line => Number(line?.line || 0) > 0).sort((left, right) => Number(left.line) - Number(right.line))
    const from = Math.min(
      Math.max(1, Number(previous?.from || Number.POSITIVE_INFINITY)),
      Math.max(1, Number(file?.from || Number.POSITIVE_INFINITY)),
      Math.max(1, Number(lines[0]?.line || Number.POSITIVE_INFINITY)),
    )
    const normalizedFrom = Number.isFinite(from) ? from : 1
    rowsByPath.set(path, {
      ...(previous || {}),
      ...file,
      path,
      from: normalizedFrom,
      to: Math.max(normalizedFrom, Number(previous?.to || 0), Number(file?.to || 0), Number(lines.at(-1)?.line || 0)),
      totalLines: Math.max(Number(previous?.totalLines || 0), Number(file?.totalLines || 0)),
      lines,
    })
  }
  return orderedPaths.map(path => rowsByPath.get(path)).filter(Boolean)
}

const mergeBatchReadDetail = (previous, current) => {
  const previousResult = previous?.result || {}
  const currentResult = current?.result || {}
  if (!['read_file', 'read_files'].includes(previousResult?.continuation?.kind)) return current
  const rowsByPath = new Map()
  for (const row of previousResult.rows || []) {
    const path = String(row?.path || '').trim()
    if (path) rowsByPath.set(path, row)
  }
  for (const row of currentResult.rows || []) {
    const path = String(row?.path || '').trim()
    if (path) rowsByPath.set(path, row)
  }
    const total = Math.max(Number(previousResult.total || 0), rowsByPath.size)
    const pendingCount = Math.max(0, Number(currentResult?.continuation?.pendingCount || 0))
    const failedCount = [...rowsByPath.values()].filter(row => row?.status === '读取失败').length
    return {
    ...current,
    result: {
      ...currentResult,
      total,
      rows: [...rowsByPath.values()],
      fileRows: mergeBatchFileRows(previousResult.fileRows, currentResult.fileRows),
      truncated: pendingCount > 0,
      summary: failedCount
        ? `已处理 ${total} 个文件，成功读取 ${Math.max(0, total - failedCount)} 个，${failedCount} 个读取失败${pendingCount ? `，${pendingCount} 个仍有内容未读完` : ''}`
        : `已读取 ${total} 个文件${pendingCount ? `，其中 ${pendingCount} 个文件仍有内容未读完` : '，所有文件均已读完'}`,
    },
  }
}

const rehydrateDetail = async (event, continueRead = false) => {
  if (detailLoading[event.eventId]) return
  detailLoading[event.eventId] = true
  detailErrors[event.eventId] = ''
  detailNotices[event.eventId] = continueRead ? '正在继续读取未读内容…' : '正在读取当前详情…'
  try {
    const query = new URLSearchParams({
      scope: String(event.scope || ''),
      scope_id: String(event.scopeId || ''),
      exact_session_id: String(event.exactSessionId || ''),
    })
    const requestDetail = async (continuation) => {
      const response = await fetch(`/api/agent-execution/events/${encodeURIComponent(event.eventId)}/detail?${query}`, {
        method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(continueRead && continuation ? { includeSource: true, continue: true, continuation } : { includeSource: true }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        if (payload.freshness && event?.detail?.toolDisplay) {
          hydratedDetails[event.eventId] = {
            ...event.detail.toolDisplay,
            result: { ...(event.detail.toolDisplay.result || {}), freshness: payload.freshness },
          }
        }
        throw new Error(payload.error || '读取当前详情失败')
      }
      return payload.toolDisplay
    }

    let mergedDetail = toolDisplayFor(event)
    let continuation = mergedDetail?.result?.continuation
    if (!continueRead || !continuation?.pendingCount) {
      mergedDetail = await requestDetail(null)
      hydratedDetails[event.eventId] = mergedDetail
      detailNotices[event.eventId] = ''
    } else {
      // A single user action drains several bounded 100-line chunks. The API
      // still validates every cursor/checksum independently, while the UI no
      // longer appears inert when the same files remain partial after one chunk.
      const maxContinuationRounds = 10
      let rounds = 0
      let previousCursorSignature = ''
      while (continuation?.pendingCount && rounds < maxContinuationRounds) {
        const cursorSignature = JSON.stringify((continuation.files || []).map(file => [file.path, file.nextOffset, file.checksum]))
        if (!cursorSignature || cursorSignature === previousCursorSignature) break
        previousCursorSignature = cursorSignature
        rounds += 1
        detailNotices[event.eventId] = `正在续读第 ${rounds} 段 · ${continuation.pendingCount} 个文件待处理`
        const currentDetail = await requestDetail(continuation)
        mergedDetail = mergeBatchReadDetail(mergedDetail, currentDetail)
        hydratedDetails[event.eventId] = mergedDetail
        continuation = mergedDetail?.result?.continuation
      }
      const pendingCount = Math.max(0, Number(continuation?.pendingCount || 0))
      detailNotices[event.eventId] = pendingCount
        ? `已补充读取 ${rounds} 段，仍有 ${pendingCount} 个文件未读完，可再次继续`
        : `剩余内容已读取完成 · 共补充 ${rounds} 段`
    }
  } catch (error) {
    detailErrors[event.eventId] = error?.message || '读取当前详情失败'
    detailNotices[event.eventId] = ''
  } finally {
    detailLoading[event.eventId] = false
  }
}
const hydrateRestoredSourceRows = () => {
  for (const event of rows.value) {
    if (expandedRows[event?.eventId] === true && isSourceReadEvent(event) && !batchFileRowsFor(event).length && !detailLoading[event.eventId]) {
      void rehydrateDetail(event, false)
    }
  }
}
watch([rows, () => Object.entries(expandedRows).filter(([, value]) => value === true).map(([key]) => key).join('|')], hydrateRestoredSourceRows, { immediate: true })
watch(transcriptExpanded, expanded => {
  if (!expanded || !isQueryCompletion.value) return
  for (const event of collapsedExecutionStageRows.value) {
    if (event?.__readSearchGroup) {
      expandedReadSearchGroups[event.key] = true
      for (const child of event.children || []) revealSourceReadEvent(child)
    } else {
      revealSourceReadEvent(event)
    }
  }
})
const loadLiveTail = async event => {
  if (detailLoading[event.eventId]) return
  detailLoading[event.eventId] = true
  detailErrors[event.eventId] = ''
  try {
    const query = new URLSearchParams({ scope: String(event.scope || ''), scope_id: String(event.scopeId || ''), exact_session_id: String(event.exactSessionId || '') })
    const response = await fetch(`/api/agent-execution/events/${encodeURIComponent(event.eventId)}/detail?${query}`, {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ includeLiveTail: true }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload.success === false) throw new Error(payload.error || '最近输出读取失败')
    liveTails[event.eventId] = payload.liveTail || { text: '', lines: [] }
    detailNotices[event.eventId] = payload.liveTail ? '已读取脱敏最近输出' : '当前没有可用的实时输出'
  } catch (error) {
    detailErrors[event.eventId] = error?.message || '最近输出读取失败'
  } finally {
    detailLoading[event.eventId] = false
  }
}
const supportsLiveTail = event => ['terminal', 'verify'].includes(String(toolDisplayFor(event)?.tool?.family || '')) && /run_command|command|terminal|shell|bash|powershell/i.test(String(event?.toolName || toolDisplayFor(event)?.tool?.canonicalName || ''))

const rowMeta = event => {
  const liveDuration = longRunningToolDuration(event, { now: now.value, terminalAt: terminalAt.value })
  const fileCount = Array.isArray(event?.detail?.fileChanges) ? event.detail.fileChanges.length : 0
  return [
  event?.parallelGroupId && !event?.__batchChild ? '并行执行' : '',
  event?.display?.toolUseCount ? `${event.display.toolUseCount} 项工具` : '',
  fileCount ? `${fileCount} 个文件` : '',
  event?.display?.tokenCount
    ? `${event.display.tokenType === 'provider_total' ? '本轮' : event.eventType?.startsWith('tool_') ? '结果' : ''}${event.display.tokenAccuracy === 'reported' ? '' : '约'} ${event.display.tokenCount} tokens`.trim()
    : '',
  liveDuration ? `仍在运行 · ${formatExecutionDuration(liveDuration)}` : formatExecutionDuration(event?.display?.durationMs) ? `耗时 ${formatExecutionDuration(event.display.durationMs)}` : '',
].filter(Boolean).join(' · ')
}

const liveRowLabel = event => {
  if (event?.eventType === 'model_activity') {
    const startedAt = eventTime(event?.detail?.modelActivity?.startedAt || event?.createdAt)
    const elapsed = startedAt ? formatExecutionDuration(Math.max(0, now.value - startedAt)) : ''
    return [eventTitle(event), elapsed].filter(Boolean).join(' · ')
  }
  const title = eventTitle(event)
  if (String(event?.eventType || '').startsWith('agent_')) return title
  const status = String(event?.display?.status || 'running')
  if (status === 'failed') return `${title}运行失败`
  if (status === 'waiting') return `${title}正在等待`
  return title
}
const rowPrimaryLabel = event => event?.__batchChild && event?.display?.status === 'success' && !eventHasPartialResult(event)
  ? eventTitle(event)
  : isLivePresentation.value ? liveRowLabel(event) : eventTitle(event)

const liveRowMeta = event => {
  if (event?.eventType === 'model_activity') return ''
  const liveDuration = longRunningToolDuration(event, { now: now.value, terminalAt: terminalAt.value })
  if (liveDuration) return `已运行 ${formatExecutionDuration(liveDuration)}`
  if (String(event?.eventType || '').startsWith('agent_')) return rowMeta(event)
  return ''
}

const searchableText = event => {
  if (event?.__childAgentConversation) {
    return [
      childAgentCardTitle(event),
      event.runtimeLabel,
      event?.display?.summary,
      ...(event.dialogue || []).map(line => line.text),
      ...(event.files || []).map(file => file.path),
      ...(event.tools || []).map(item => eventTitle(item)),
    ].filter(Boolean).join(' ').toLowerCase()
  }
  return [
    eventTitle(event), event?.display?.target, eventBusinessSummary(event), eventStatusLabel(event),
    event?.detail?.agentDisplay?.projectName, event?.detail?.agentDisplay?.workItemTitle,
    ...(event?.detail?.fileChanges || []).map(file => typeof file === 'string' ? file : file?.path),
    event?.display?.summary,
  ].filter(Boolean).join(' ').toLowerCase()
}
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const searchMatches = computed(() => {
  if (!normalizedSearchQuery.value) return []
  return visibleRows.value.filter(event => searchableText(event).includes(normalizedSearchQuery.value))
})
const searchMatchIds = computed(() => new Set(searchMatches.value.map(event => event.eventId)))
const eventMatchesSearch = event => !normalizedSearchQuery.value || searchMatchIds.value.has(event.eventId)
const batchMatchesSearch = batch => !normalizedSearchQuery.value
  || searchableText(batch.progress).includes(normalizedSearchQuery.value)
  || batch.children?.some(eventMatchesSearch)
const stageMatchesSearch = stageKind => !normalizedSearchQuery.value
  || visibleRows.value.some(event => inferredStageKind(event) === stageKind && eventMatchesSearch(event))
  || assistantProgressRows.value.some(event => inferredStageKind(event) === stageKind && searchableText(event).includes(normalizedSearchQuery.value))
const focusSearchMatch = direction => {
  if (!searchMatches.value.length) return
  searchCursor.value = (searchCursor.value + direction + searchMatches.value.length) % searchMatches.value.length
  const id = searchMatches.value[searchCursor.value]?.eventId
  document.querySelector(`[data-execution-event-id="${CSS.escape(String(id || ''))}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
const onSearchKeydown = event => {
  if (event.key === 'Escape') { searchQuery.value = ''; searchCursor.value = 0; return }
  if (event.key !== 'Enter') return
  event.preventDefault()
  focusSearchMatch(event.shiftKey ? -1 : 1)
}
watch(searchQuery, () => { searchCursor.value = -1 })

const currentLifecycleEventId = computed(() => [...visibleRows.value]
  .filter(event => Number(event?.generation || 0) === currentGeneration.value && ['running', 'waiting'].includes(String(event?.display?.status || '')))
  .sort((left, right) => Number(right?.sequence || 0) - Number(left?.sequence || 0))[0]?.eventId || '')
const isCurrentEvent = event => event?.eventId === currentLifecycleEventId.value
const availableActions = event => Array.isArray(event?.detail?.availableActions) ? event.detail.availableActions : []
const runAvailableAction = (event, action) => {
  if (!action?.enabled) return
  if (action.kind === 'view_error') {
    expandedRows[event.eventId] = true
    return
  }
  emit('execution-action', {
    ...action,
    task_id: event?.taskId,
    taskId: event?.taskId,
    workItemId: event?.workItemId,
    eventId: event?.eventId,
  })
}
const replayTarget = computed(() => {
  const event = resultEvent.value || [...rows.value].reverse().find(row => row?.detail?.replayLink)
  const link = event?.detail?.replayLink || null
  const taskId = String(link?.taskId || '')
  // A conversation/run identifier does not prove a task-ledger replay exists.
  // Only the explicit safe replay contract may expose this navigation. `gar_*`
  // links are historical global-run links and never represented formal tasks.
  if (link?.schema !== 'ccm-task-event-link-v1'
    || !taskId
    || !String(link.exactSessionId || '')
    || !String(link.anchorMessageId || '')
    || (link.scope === 'global' && /^gar_/i.test(taskId))) return null
  return {
    kind: 'view_trace',
    task_id: taskId,
    event_id: link.replayEventId || event?.eventId || '',
    generation: Number(link.generation ?? event?.generation ?? 0),
    attempt: Number(link.attempt ?? event?.detail?.agentDisplay?.attempt ?? 1),
    plan_step_id: link.planStepId || event?.detail?.causalRefs?.planStepId || '',
    work_item_id: link.workItemId || event?.workItemId || event?.detail?.causalRefs?.workItemId || '',
    batch_id: link.batchId || event?.detail?.progress?.batchId || '',
  }
})
const openReplay = () => {
  if (replayTarget.value) emit('execution-action', replayTarget.value)
}
const liveStageLabel = computed(() => executionStageRows.value.find(item => item?.__stageHeader && item.active)?.label || '')
const collapsedExecutionStageRows = computed(() => {
  const nested = collapseReadSearchRows(executionStageRows.value, {
    expandedGroups: expandedReadSearchGroups,
  })
  return nested.flatMap(event => {
    if (!event?.__childAgentConversation || !childAgentToolsVisible(event)) return [event]
    const children = collapseReadSearchRows((event.tools || []).map(tool => ({
      ...tool,
      __childAgentChild: true,
      __childAgentKey: event.key,
      __stageChild: event.__stageChild,
      __stageKind: event.__stageKind,
      __agentChild: true,
    })), { expandedGroups: expandedReadSearchGroups })
    return [event, ...children]
  })
})
const displayedExecutionStageRows = computed(() => {
  if (isQueryCompletion.value || effectiveExecutionDensity.value !== 'summary') return collapsedExecutionStageRows.value
  const filtered = collapsedExecutionStageRows.value.filter(event => {
    if (event?.__stageHeader) return event.active || event.status === '失败'
    if (event?.__progressBatch) return batchNeedsAttention(event)
    if (event?.__readSearchGroup) return event.failed || event.running
    if (event?.__childAgentConversation) return true
    if (event?.__childAgentChild) return false
    return isCurrentEvent(event)
      || ['failed', 'waiting', 'blocked', 'cancelled'].includes(String(event?.display?.status || ''))
      || eventHasPartialResult(event)
      || event?.eventType === 'permission_required'
  })
  return filtered.length ? filtered : collapsedExecutionStageRows.value.slice(-1)
})
</script>

<template>
  <div v-if="enabled && presentationVisible" ref="executionAnchor" class="cc-execution-anchor">
  <header v-if="isLivePresentation && shouldRender" class="cc-live-execution-status" aria-live="polite">
    <span>已处理 {{ processedDurationLabel }}</span>
    <template v-if="liveStageLabel">
      <span aria-hidden="true">·</span>
      <strong>{{ liveStageLabel }}</strong>
    </template>
  </header>
  <div v-if="hasProgressFlow && !stageMode && !isLivePresentation && !isQueryCompletion && (!isTerminal || transcriptExpanded)" class="cc-progress-flow" aria-label="Agent 进度说明">
    <div v-for="segment in displayedProgressSegments" :key="segment.key" class="cc-progress-segment" :class="{ current: segment.progress?.eventId === currentProgressEventId, completed: segment.progress?.eventId !== currentProgressEventId }">
      <p v-if="progressText(segment.progress)" class="cc-progress-text">{{ progressText(segment.progress) }}</p>
      <button v-if="segment.label" type="button" class="cc-progress-batch" :aria-expanded="transcriptExpanded" @click.stop="toggleTranscript">
        <span class="cc-progress-batch-icon"><Wrench :size="11" /></span>
        <span>{{ segment.label }}</span>
        <small v-if="segment.durationMs">{{ formatExecutionDuration(segment.durationMs) }}</small>
        <span class="cc-progress-batch-chevron"><ChevronDown v-if="transcriptExpanded" :size="13" /><ChevronRight v-else :size="13" /></span>
      </button>
    </div>
  </div>

  <section v-if="presentation === 'completed' && isOfficialCompletion && completionFiles.length" class="cc-completion-files" :class="{ warning: !completionSucceeded }" aria-label="本轮文件变化">
    <header class="cc-completion-files-head">
      <button type="button" class="cc-completion-files-toggle" :aria-expanded="completionFilesExpanded" @click="toggleCompletionFiles">
        <span class="cc-completion-files-icon"><FileCode2 :size="16" /></span>
        <span class="cc-completion-files-copy">
          <strong>{{ completionFileTitle }}</strong>
          <small v-if="completionFileTotals.hasStats">
            <span class="additions">+{{ completionFileTotals.additions }}</span>
            <span class="deletions">-{{ completionFileTotals.deletions }}</span>
          </small>
        </span>
        <ChevronDown v-if="completionFilesExpanded" :size="15" aria-hidden="true" />
        <ChevronRight v-else :size="15" aria-hidden="true" />
      </button>
      <button type="button" class="cc-completion-review" @click="openAllFileChanges">审核</button>
    </header>
    <div v-if="completionFilesExpanded" class="cc-completion-file-list">
      <button v-for="file in completionFilesVisible" :key="`${file.project}|${file.path}`" type="button" class="cc-completion-file-row" @click="openFileChange(file, resultEvent)">
        <span class="cc-completion-file-path"><small v-if="file.project">{{ file.project }} / </small>{{ file.path }}</span>
        <span v-if="Number.isFinite(Number(file.additions)) || Number.isFinite(Number(file.deletions))" class="cc-completion-file-delta">
          <span v-if="Number.isFinite(Number(file.additions))" class="additions">+{{ file.additions }}</span>
          <span v-if="Number.isFinite(Number(file.deletions))" class="deletions">-{{ file.deletions }}</span>
        </span>
        <span v-else class="cc-completion-file-status">{{ file.deleted ? '已删除' : file.binary ? '二进制' : file.status || '已修改' }}</span>
      </button>
    </div>
    <button v-if="completionFilesExpanded && completionFiles.length > 40" type="button" class="cc-completion-files-all" @click="openAllFileChanges">查看全部 {{ completionFiles.length }} 个文件</button>
  </section>

  <section v-if="!isIncompleteTerminal && shouldRender && (hasExecutionRows || (!isTerminal && assistantProgressRows.length) || transcriptExpanded || isQueryCompletion) && (!hasProgressFlow || stageMode || transcriptExpanded || isQueryCompletion || isLivePresentation)" class="cc-execution" :class="{ complete: completedProjectionVisible, expanded: transcriptExpanded, live: isLivePresentation, query: isQueryCompletion }" :aria-label="isLivePresentation ? 'Agent 实时执行进度' : completedProjectionTitle">
    <button v-if="completedProjectionVisible" class="cc-execution-head" type="button" @click.stop="toggleTranscript">
      <span class="cc-execution-chevron"><ChevronDown v-if="transcriptExpanded" :size="15" /><ChevronRight v-else :size="15" /></span>
      <strong>{{ completedProjectionTitle }}</strong>
      <span :class="['cc-execution-result-mark', completedProjectionSucceeded ? 'success' : 'warning']" aria-hidden="true"><Check v-if="completedProjectionSucceeded" :size="11" /><AlertTriangle v-else :size="11" /></span>
      <span class="cc-execution-summary">{{ completionResultSummary }}</span>
      <span v-if="totalDurationLabel" class="cc-execution-duration">{{ totalDurationLabel }}</span>
    </button>
    <label v-if="isOfficialCompletion" class="cc-execution-density completed" @click.stop>
      <span class="sr-only">执行展示密度</span>
      <select v-model="executionDensity" aria-label="执行展示密度">
        <option v-for="option in executionDensityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </label>
    <div v-if="isOfficialCompletion && transcriptExpanded && recoveryMilestone" class="cc-execution-meta">
      <p v-if="recoveryMilestone" class="cc-recovery-milestone">{{ recoveryMilestone }}</p>
    </div>

    <div v-if="!compacted" class="cc-execution-rows">
      <div v-if="resultEvent && timingItems.length && !isQueryCompletion" class="cc-execution-timing" aria-label="本轮耗时统计">
        <span v-for="([label, value]) in timingItems" :key="label"><small>{{ label }}</small>{{ formatExecutionDuration(value) }}</span>
      </div>
      <div v-if="transcriptExpanded && (!isQueryCompletion || visibleRows.length > 20)" class="cc-execution-search" role="search">
        <Search :size="14" aria-hidden="true" />
        <input v-model="searchQuery" type="search" placeholder="搜索工具、项目、文件或失败原因" @keydown="onSearchKeydown" />
        <small v-if="normalizedSearchQuery">{{ searchMatches.length }} 个匹配</small>
        <button v-if="searchMatches.length" type="button" title="上一个匹配" @click="focusSearchMatch(-1)">↑</button>
        <button v-if="searchMatches.length" type="button" title="下一个匹配" @click="focusSearchMatch(1)">↓</button>
        <button v-if="normalizedSearchQuery" type="button" title="清除搜索" @click="searchQuery = ''"><X :size="13" /></button>
      </div>
      <template v-for="event in displayedExecutionStageRows" :key="event.key || event.eventId">
      <button
        v-if="event.__stageHeader"
        v-show="stageMatchesSearch(event.kind)"
        type="button"
        class="cc-execution-stage-head"
        :class="{ active: event.active, completed: event.status === '完成', failed: event.status === '失败' }"
        :aria-expanded="stageIsExpanded(event)"
        @click="toggleStage(event)"
      >
        <span class="cc-execution-stage-marker" aria-hidden="true"><Check v-if="event.status === '完成'" :size="11" /><AlertTriangle v-else-if="event.status === '失败'" :size="11" /><span v-else class="cc-stage-running-dot" /></span>
        <span class="cc-execution-stage-copy">
          <strong>{{ event.label }}</strong>
          <small>{{ event.summary }}</small>
        </span>
        <em>{{ event.status }}</em>
        <span v-if="event.durationMs">{{ formatExecutionDuration(event.durationMs) }}</span>
        <span class="cc-execution-stage-chevron"><ChevronDown v-if="stageIsExpanded(event)" :size="14" /><ChevronRight v-else :size="14" /></span>
      </button>
      <section
        v-else-if="event.__progressBatch"
        v-show="batchMatchesSearch(event)"
        class="cc-progress-batch-group stage-child"
        :class="{ current: batchNeedsAttention(event), completed: !batchNeedsAttention(event), attention: batchNeedsAttention(event) }"
        :aria-current="batchNeedsAttention(event) ? 'step' : undefined"
      >
        <p v-if="event.progress && progressText(event.progress)" class="cc-execution-stage-progress">{{ progressText(event.progress) }}</p>
        <button v-if="event.children.length && !((isLivePresentation || isQueryCompletion) && batchIsExpanded(event))" type="button" class="cc-progress-batch-head" :aria-expanded="batchIsExpanded(event)" @click="toggleBatch(event)">
          <span class="cc-progress-batch-status" :class="{ failed: batchHasFailure(event), attention: batchNeedsAttention(event) }"><component :is="batchStatusIcon(event)" :size="12" /></span>
          <strong>{{ event.presentation?.label || '工具批次' }}</strong>
          <small>{{ event.presentation?.count || event.children.length }}项<span v-if="event.parallel"> · 并行</span><span v-if="event.presentation?.failed"> · {{ event.presentation.failed }}项失败</span><span v-if="batchPartialCount(event)"> · {{ batchPartialCount(event) }}项部分结果</span><span v-if="event.presentation?.durationMs || event.durationMs"> · {{ formatExecutionDuration(event.presentation?.durationMs || event.durationMs) }}</span></small>
          <span class="cc-progress-batch-chevron"><ChevronDown v-if="batchIsExpanded(event)" :size="13" /><ChevronRight v-else :size="13" /></span>
        </button>
      </section>
      <article v-else-if="event.__requirementPlan" class="cc-requirement-plan" :class="requirementPlan?.status || 'ready'">
        <button type="button" class="cc-requirement-plan-head" :aria-expanded="planIsExpanded" @click="toggleRequirementPlan">
          <span class="cc-requirement-plan-icon"><ListChecks :size="14" /></span>
          <span class="cc-requirement-plan-title">
            <strong>{{ isLivePresentation ? `${requirementPlan?.title || '实施计划'} · ${effectivePlanSteps.length} 项待办` : requirementPlan?.title || '需求实施计划' }}</strong>
            <small>根据你的需求和现有项目整理 · 版本 {{ requirementPlan?.revision || 1 }}</small>
          </span>
          <span class="cc-requirement-plan-status">{{ planStatusLabel }}</span>
          <span class="cc-requirement-plan-chevron"><ChevronDown v-if="planIsExpanded" :size="14" /><ChevronRight v-else :size="14" /></span>
        </button>
        <div v-if="planIsExpanded" class="cc-requirement-plan-body" :class="{ 'has-side': requirementPlan?.exclusions?.length }">
          <div class="cc-requirement-plan-main">
            <section>
              <h4>目标</h4>
              <p>{{ requirementPlan?.overview || requirementPlan?.goal }}</p>
            </section>
            <section>
              <h4>待办</h4>
              <ol class="cc-requirement-plan-steps">
                <li v-for="(step, stepIndex) in effectivePlanSteps" :key="step.id || stepIndex" :class="step.status">
                  <span class="cc-requirement-step-mark"><component :is="planStepIcon(step)" :size="11" /></span>
                  <div>
                    <strong>{{ step.title }}</strong>
                  </div>
                  <span v-if="step.project" class="cc-requirement-step-project">{{ step.project }}</span>
                </li>
              </ol>
            </section>
          </div>
          <aside v-if="requirementPlan?.exclusions?.length" class="cc-requirement-plan-side">
            <section><h4>本次不包含</h4><ul><li v-for="item in requirementPlan.exclusions" :key="item">{{ item }}</li></ul></section>
          </aside>
        </div>
        <footer v-if="planIsExpanded" class="cc-requirement-plan-foot">
          <span>{{ effectivePlanSteps.length }} 项待办</span>
          <button type="button" @click="toggleRequirementPlan">收起计划 <ChevronDown :size="12" /></button>
        </footer>
        <div v-if="canConfirmExecute" class="cc-requirement-plan-confirm">
          <button type="button" :disabled="confirmExecuteBusy" @click="emit('confirm-execute', requirementPlan)">
            <Check :size="14" />确认并执行
          </button>
        </div>
      </article>
      <ReadSearchCollapseHeader
        v-else-if="event.__readSearchGroup"
        v-show="!normalizedSearchQuery || event.children?.some(eventMatchesSearch)"
        :group="event"
        @toggle="toggleReadSearchGroup"
      />
      <ChildAgentConversation
        v-else-if="event.__childAgentConversation"
        v-show="childAgentMatchesSearch(event)"
        :card="event"
        :live="isLivePresentation"
        :expanded="childAgentCardExpanded(event)"
        :tools-expanded="childAgentToolsVisible(event)"
        :density="effectiveExecutionDensity"
        @toggle="toggleChildAgentCard"
        @toggle-tools="toggleChildAgentTools"
        @open-file-change="openFileChange"
      />
      <p v-else-if="event.eventType === 'assistant_progress'" v-show="!normalizedSearchQuery || searchableText(event).includes(normalizedSearchQuery)" class="cc-execution-stage-progress" :class="{ current: event.eventId === currentProgressEventId }" :aria-current="event.eventId === currentProgressEventId ? 'step' : undefined">{{ progressText(event) }}</p>
      <article
        v-else
        v-show="eventMatchesSearch(event)"
        class="cc-execution-row"
        :class="[event.display?.status || 'running', { 'stage-child': event.__stageChild, 'batch-child': event.__batchChild, 'read-search-child': event.__readSearchChild, 'agent-child': event.__agentChild, 'child-agent-child': event.__childAgentChild, 'model-activity': event.eventType === 'model_activity', current: isCurrentEvent(event), completed: event.display?.status === 'success' }]"
        :data-execution-event-id="event.eventId"
        :aria-current="isCurrentEvent(event) ? 'step' : undefined"
      >
        <button
          type="button"
          class="cc-execution-row-summary"
          :class="{ expandable: isRowExpandable(event) }"
          :aria-expanded="isRowExpandable(event) ? isRowExpanded(event) : undefined"
          @click="toggleRow(event)"
        >
          <span class="cc-execution-mark" :class="{ semantic: event.__batchChild && event.display?.status === 'success' && !eventHasPartialResult(event), partial: eventHasPartialResult(event) }"><component :is="rowLeadingIcon(event)" :size="11" /></span>
          <div class="cc-execution-main">
            <div class="cc-execution-title">
              <strong>{{ rowPrimaryLabel(event) }}</strong>
              <code v-if="eventTarget(event)" :title="eventTarget(event)">{{ eventTarget(event) }}</code>
              <span v-if="!isLivePresentation && rowShowsTerminalStatus(event)">{{ eventHasPartialResult(event) ? '部分结果' : eventStatusLabel(event) }}</span>
            </div>
            <p v-if="eventBusinessSummary(event)">{{ eventBusinessSummary(event) }}</p>
            <small v-if="isLivePresentation ? liveRowMeta(event) : rowMeta(event)">{{ isLivePresentation ? liveRowMeta(event) : rowMeta(event) }}</small>
          </div>
          <span v-if="isRowExpandable(event)" class="cc-execution-row-chevron"><ChevronDown v-if="isRowExpanded(event)" :size="13" /><ChevronRight v-else :size="13" /></span>
        </button>
        <div v-if="inlineFileChangesFor(event).length && !event.__childAgentChild" class="cc-agent-file-stream" aria-label="项目子 Agent文件变化">
          <div v-for="file in inlineFileChangesFor(event)" :key="inlineDiffKey(event, file)" class="cc-agent-file-change" :class="fileChangeKind(file)">
            <button
              type="button"
              class="cc-agent-file-change-row"
              :aria-expanded="inlineDiffExpanded(event, file)"
              @click.stop="toggleInlineDiff(event, file)"
            >
              <component :is="fileChangeIcon(file)" :size="13" aria-hidden="true" />
              <strong>{{ fileChangeLabel(file) }}</strong>
              <code :title="file.path">{{ file.path }}</code>
              <small v-if="fileChangeStat(file)" :class="{ 'has-deletions': Number(file?.deletions || 0) > 0 }">{{ fileChangeStat(file) }}</small>
              <small v-else>点击查看差异</small>
              <ChevronDown v-if="inlineDiffExpanded(event, file)" :size="13" aria-hidden="true" />
              <ChevronRight v-else :size="13" aria-hidden="true" />
            </button>
            <InlineAgentDiff
              v-if="inlineDiffExpanded(event, file)"
              :event="event"
              :file="file"
              @open-full="openFileChange($event, event)"
            />
          </div>
        </div>
        <div v-if="isRowExpanded(event) && event.detail" class="cc-execution-detail">
            <template v-if="event.detail.agentDisplay">
              <div class="cc-tool-identity">
                <b>{{ event.detail.agentDisplay.projectName || event.detail.agentDisplay.projectId }}</b>
                <span v-if="event.detail.agentDisplay.runtimeLabel">{{ event.detail.agentDisplay.runtimeLabel }}</span>
              </div>
              <dl class="cc-tool-arguments">
                <dt>工作项</dt><dd>{{ event.detail.agentDisplay.workItemTitle || event.workItemId || '—' }}</dd>
                <dt>阶段</dt><dd>{{ eventStatusLabel(event) }}</dd>
                <dt>尝试</dt><dd>第 {{ event.detail.agentDisplay.attempt }} 次</dd>
                <template v-if="event.detail.agentDisplay.queuePosition">
                  <dt>队列</dt><dd>第 {{ event.detail.agentDisplay.queuePosition }} 位</dd>
                </template>
              </dl>
              <div v-if="legacyResult(event.detail.safeResult)">
                <b>当前回执</b>
                <pre>{{ safeJson(legacyResult(event.detail.safeResult)) }}</pre>
              </div>
            </template>
            <template v-else-if="toolDisplayFor(event)">
              <div class="cc-tool-identity">
                <b>{{ toolReadableLabel(event) }}</b>
                <span v-if="toolDisplayFor(event).tool?.serverLabel">扩展服务 · {{ toolDisplayFor(event).tool.serverLabel }}</span>
              </div>
              <ToolResultDetail
                :display="toolDisplayFor(event)"
                :token-count="Number(event.display?.tokenCount || 0)"
                :detailed="effectiveExecutionDensity === 'detailed' && !isLivePresentation"
                :custom-content="!!toolDisplayFor(event).result?.preview && !isSourceReadEvent(event)"
                :source-loading="!!detailLoading[event.eventId]"
                :source-error="detailErrors[event.eventId] || ''"
                :openable-paths="openableSourcePaths"
                @open-source="openSourceFile(event)"
                @open-listing-path="openListingSource"
              >
                <template #content>
                  <pre v-if="toolDisplayFor(event).result?.preview" class="cc-tool-readable-preview">{{ toolDisplayFor(event).result.preview }}</pre>
                </template>
                <template #actions>
                  <small v-if="toolDisplayFor(event).result?.continuation?.pendingCount">{{ toolDisplayFor(event).result.continuation.pendingCount }} 个文件仍有内容未读完</small>
                  <small v-else-if="toolDisplayFor(event).result?.truncated">结果已截断<span v-if="toolDisplayFor(event).result?.total"> · 共 {{ toolDisplayFor(event).result.total }} 项</span></small>
                  <button v-if="toolDisplayFor(event).result?.continuation?.pendingCount" type="button" class="cc-tool-rehydrate" :disabled="detailLoading[event.eventId]" @click.prevent.stop="rehydrateDetail(event, true)">
                    {{ detailLoading[event.eventId] ? '正在继续读取…' : '继续读取未读内容' }}
                  </button>
                  <button v-else-if="detailErrors[event.eventId] && isSourceReadEvent(event)" type="button" class="cc-tool-rehydrate" :disabled="detailLoading[event.eventId]" @click.prevent.stop="rehydrateDetail(event, false)">
                    {{ detailLoading[event.eventId] ? '正在重试…' : '重试读取当前源码' }}
                  </button>
                  <button v-if="supportsLiveTail(event)" type="button" class="cc-tool-rehydrate" :disabled="detailLoading[event.eventId]" @click.prevent.stop="loadLiveTail(event)">
                    {{ detailLoading[event.eventId] ? '正在读取…' : '查看脱敏最近输出' }}
                  </button>
                  <pre v-if="liveTails[event.eventId]?.text" class="cc-tool-live-tail" aria-label="脱敏最近输出">{{ liveTails[event.eventId].text }}</pre>
                  <small v-if="detailNotices[event.eventId]" class="cc-tool-detail-notice" role="status" aria-live="polite">{{ detailNotices[event.eventId] }}</small>
                  <small v-if="detailErrors[event.eventId]" class="cc-tool-detail-error" role="alert">{{ detailErrors[event.eventId] }}</small>
                </template>
              </ToolResultDetail>
            </template>
            <template v-else>
              <div v-if="legacyToolIdentity(event).serverLabel" class="cc-tool-identity"><span>扩展服务 · {{ legacyToolIdentity(event).serverLabel }}</span></div>
              <div v-if="event.detail.safeArguments">
                <b>参数</b>
                <pre>{{ safeJson(event.detail.safeArguments) }}</pre>
              </div>
              <div v-if="legacyResult(event.detail.safeResult)">
                <b>结果</b>
                <pre>{{ safeJson(legacyResult(event.detail.safeResult)) }}</pre>
              </div>
            </template>
            <div v-if="event.detail.fileChanges?.length && !inlineFileChangesFor(event).length">
              <b>未归属的历史改动</b>
              <ul class="cc-file-changes">
                <li v-for="file in event.detail.fileChanges" :key="normalizedFileChange(file, event).path">
                  <button type="button" @click.stop="openFileChange(file, event)">
                    <span>{{ normalizedFileChange(file, event).path }}</span>
                    <small v-if="fileChangeStat(file)" :class="{ 'has-deletions': Number(file?.deletions ?? file?.diff?.deletions ?? 0) > 0 }">{{ fileChangeStat(file) }}</small>
                    <span class="cc-file-change-open"><FileDiff :size="12" />查看 Diff <ChevronRight :size="12" /></span>
                  </button>
                </li>
              </ul>
            </div>
        </div>
        <div v-if="availableActions(event).length" class="cc-execution-actions" aria-label="可执行操作">
          <button
            v-for="action in availableActions(event)"
            :key="action.id"
            type="button"
            :disabled="!action.enabled"
            :title="action.disabledReason || action.label"
            @click="runAvailableAction(event, action)"
          >{{ action.label }}</button>
        </div>
      </article>
      </template>
      <section v-if="isOfficialCompletion && transcriptExpanded && attemptHistoryGroups.length" class="cc-attempt-history">
        <button type="button" class="cc-attempt-history-head" :aria-expanded="attemptHistoryExpanded" @click="attemptHistoryExpanded = !attemptHistoryExpanded">
          <History :size="15" aria-hidden="true" />
          <strong>历史尝试</strong>
          <span>{{ attemptHistoryCount }} 次</span>
          <ChevronDown v-if="attemptHistoryExpanded" :size="14" aria-hidden="true" />
          <ChevronRight v-else :size="14" aria-hidden="true" />
        </button>
        <div v-if="attemptHistoryExpanded" class="cc-attempt-history-list">
          <article v-for="group in attemptHistoryGroups" :key="group.key">
            <header><strong>{{ group.project }}</strong><span>{{ group.workItem }}</span></header>
            <p v-for="attempt in group.attempts" :key="attempt.key">第 {{ attempt.attempt || '—' }} 次 · {{ attempt.summary || attempt.status || '历史结果已保留' }}</p>
          </article>
        </div>
      </section>
      <div v-if="isOfficialCompletion && transcriptExpanded && replayTarget" class="cc-execution-footer">
        <button type="button" class="cc-execution-replay-link" @click="openReplay">在任务回放中查看 <ChevronRight :size="13" /></button>
      </div>
    </div>
  </section>
  </div>
</template>

<style scoped>
.cc-execution {
  position: relative;
  width: 100%;
  margin: 0 0 10px;
  border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 38%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface, #fff) 97%, transparent);
  overflow: hidden;
}
.cc-execution.live { border-color: transparent; border-radius: 0; background: transparent; }
.cc-execution.live .cc-execution-rows { border-top: 0; padding-top: 0; }
.cc-execution-anchor { width: 100%; min-width: 0; }
.cc-execution-anchor:empty { height: 0; }
.cc-live-execution-status { display: flex; align-items: center; gap: 7px; margin: 0 0 9px; padding: 0 1px 8px; border-bottom: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 24%, transparent); color: var(--text-muted); font-size: 11px; line-height: 1.4; }
.cc-live-execution-status strong { min-width: 0; overflow: hidden; color: var(--text-secondary); font-size: 11px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.cc-execution-density { margin-left: auto; flex: 0 0 auto; }
.cc-execution-density select { height: 25px; padding: 0 21px 0 8px; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 40%, transparent); border-radius: 7px; color: var(--text-secondary); background: color-mix(in srgb, var(--surface, #fff) 96%, transparent); font: inherit; font-size: 10px; cursor: pointer; }
.cc-execution-density select:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #2563eb) 65%, transparent); outline-offset: 2px; }
.cc-execution-density.completed { position: absolute; z-index: 2; top: 8px; right: 9px; }
.cc-execution.complete .cc-execution-head { padding-right: 82px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.cc-progress-flow { display: grid; gap: 9px; margin: 0 0 8px; }
.cc-progress-overview { width: 100%; display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; align-items: center; gap: 7px; padding: 4px 1px; border: 0; color: var(--text-secondary); background: transparent; text-align: left; cursor: pointer; }
.cc-progress-overview:hover { color: var(--text-primary); }
.cc-progress-overview:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 72%, transparent); outline-offset: 2px; border-radius: 3px; }
.cc-progress-overview strong { font-size: 12px; }
.cc-progress-overview small { justify-self: end; color: var(--text-muted); font-size: 10px; }
.cc-progress-overview kbd { padding: 2px 5px; border: 1px solid rgba(100, 116, 139, 0.25); border-radius: 4px; color: var(--text-muted); font-size: 9px; font-family: inherit; }
.cc-progress-segment { display: grid; gap: 5px; padding-left: 8px; border-left: 2px solid transparent; }
.cc-progress-segment.completed { opacity: 0.72; }
.cc-progress-segment.current { border-left-color: color-mix(in srgb, var(--primary-color, #ec4899) 75%, transparent); background: color-mix(in srgb, var(--primary-color, #ec4899) 4%, transparent); }
.cc-progress-text { display: -webkit-box; margin: 0; overflow: hidden; color: var(--text-primary); font-size: 12px; line-height: 1.65; white-space: normal; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.cc-progress-batch { width: fit-content; max-width: 100%; display: inline-flex; align-items: center; gap: 7px; padding: 3px 1px; border: 0; color: var(--text-muted); background: transparent; font-size: 11px; text-align: left; cursor: pointer; }
.cc-progress-batch:hover { color: var(--text-secondary); }
.cc-progress-batch:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 72%, transparent); outline-offset: 2px; border-radius: 3px; }
.cc-progress-batch-icon { width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 45%, transparent); border-radius: 4px; font-size: 9px; }
.cc-progress-batch small { color: var(--text-muted); font-size: 10px; }
.cc-progress-batch-chevron { font-size: 10px; }
.cc-execution-head {
  width: 100%;
  min-height: 42px;
  display: grid;
  grid-template-columns: 18px auto 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 8px 2px;
  border: 0;
  color: var(--text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.cc-execution-head:hover { background: rgba(100, 116, 139, 0.045); }
.cc-execution-head:focus-visible,
.cc-execution-row-summary:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 72%, transparent); outline-offset: -2px; }
.cc-execution-head strong { color: var(--text-primary); font-size: 12px; }
.cc-execution-chevron { color: var(--text-muted); font-size: 15px; line-height: 1; text-align:center; }
.cc-execution-result-mark { width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:var(--text-muted); background:rgba(100,116,139,.09); font-size:9px; font-weight:800; }
.cc-execution-result-mark.success { color:#15803d; background:rgba(34,197,94,.11); }
.cc-execution-result-mark.warning { color:#b45309; background:rgba(245,158,11,.13); }
.cc-execution-summary { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.cc-execution-meta { display:flex; align-items:center; flex-wrap:wrap; gap:7px 14px; padding:0 2px 8px 50px; }
.cc-execution-replay-link { display:inline-flex; align-items:center; gap:3px; margin:0; padding:0; border:0; background:transparent; color:var(--accent-blue); font-size:10px; font-weight:750; cursor:pointer; }
.cc-execution-replay-link:hover { text-decoration:underline; }
.cc-execution.query .cc-execution-head { padding-right:88px; }
.cc-execution.query {
  margin: 2px 0 10px;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.cc-execution.query .cc-execution-head {
  min-height: 36px;
  padding: 5px 1px 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 22%, transparent);
}
.cc-execution.query .cc-execution-rows {
  padding: 5px 0 0;
  border-top: 0;
}
.cc-execution.query .cc-execution-row.stage-child,
.cc-execution.query .cc-execution-row.batch-child {
  margin-left: 18px;
}
.cc-execution.query .cc-execution-detail {
  margin: 0 4px 7px 38px;
  padding: 7px 0 7px 12px;
  border-left: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 30%, transparent);
  border-radius: 0;
  background: transparent;
}
.cc-recovery-milestone { margin:0; color:var(--text-muted); font-size:10px; line-height:1.45; }
.cc-execution-duration { color: var(--text-secondary); font-size: 10px; white-space: nowrap; }
.cc-execution-rows { border-top: 1px solid rgba(100, 116, 139, 0.1); padding: 7px 0 4px; }
.cc-execution-timing { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 3px 2px 8px 30px; color: var(--text-secondary); font-size: 10px; }
.cc-execution-timing span { display: inline-flex; align-items: baseline; gap: 4px; }
.cc-execution-timing small { color: var(--text-muted); font-size: 9px; }
.cc-execution-search { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto auto auto; align-items: center; gap: 6px; margin: 2px 2px 9px 30px; padding: 5px 1px; border: 0; border-bottom: 1px solid rgba(148, 163, 184, 0.11); border-radius: 0; background: transparent; }
.cc-execution-search input { min-width: 0; border: 0; outline: 0; color: var(--text-primary); background: transparent; font-size: 10px; }
.cc-execution-search small { color: var(--text-muted); font-size: 9px; white-space: nowrap; }
.cc-execution-search button { width: 22px; height: 22px; border: 0; border-radius: 5px; color: var(--text-secondary); background: transparent; cursor: pointer; }
.cc-execution-search button:hover { background: rgba(100, 116, 139, 0.1); }
.cc-requirement-navigator { margin: 5px 10px 8px; padding: 9px 11px; border: 1px solid rgba(148, 163, 184, 0.13); border-radius: 8px; background: rgba(100, 116, 139, 0.035); }
.cc-requirement-navigator header { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
.cc-requirement-navigator header strong { color: var(--text-primary); font-size: 11px; }
.cc-requirement-navigator header span { color: var(--text-muted); font-size: 9px; }
.cc-requirement-navigator > div { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; }
.cc-requirement-nav-item { min-width: 0; display: flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 9px; }
.cc-requirement-nav-item i { width: 16px; height: 16px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(100, 116, 139, 0.1); font-style: normal; }
.cc-requirement-nav-item > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-requirement-nav-item.completed { color: var(--text-secondary); }
.cc-requirement-nav-item.completed i { color: #16a34a; background: rgba(34, 197, 94, 0.12); }
.cc-requirement-nav-item.running { color: var(--text-primary); }
.cc-requirement-nav-item.running i { color: var(--primary-color, #ec4899); background: color-mix(in srgb, var(--primary-color, #ec4899) 16%, transparent); }
.cc-requirement-nav-item.blocked i { color: #dc2626; background: rgba(239, 68, 68, 0.12); }
.cc-requirement-plan { margin: 2px 2px 4px 30px; overflow: hidden; border: 0; border-left: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 30%, transparent); border-radius: 0; background: transparent; }
.cc-requirement-plan-head { width: 100%; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto 24px; align-items: center; gap: 7px; padding: 7px 8px; border: 0; color: inherit; background: transparent; text-align: left; cursor: pointer; }
.cc-requirement-plan-head:hover { background: rgba(100,116,139,.035); }
.cc-requirement-plan-head:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 70%, transparent); outline-offset: -2px; }
.cc-requirement-plan-icon { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 5px; color: var(--text-muted); background: rgba(100,116,139,.08); font-size:10px; }
.cc-requirement-plan-title { min-width: 0; display: grid; gap: 2px; }
.cc-requirement-plan-title strong { color: var(--text-primary); font-size: 12px; }
.cc-requirement-plan-title small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted); font-size: 9px; }
.cc-requirement-plan-status { padding: 2px 7px; border-radius: 999px; color: #15803d; background: rgba(34, 197, 94, 0.1); font-size: 9px; white-space: nowrap; }
.cc-requirement-plan.blocked .cc-requirement-plan-status { color: #b91c1c; background: rgba(239, 68, 68, 0.1); }
.cc-requirement-plan-chevron { color: var(--text-muted); font-size: 10px; text-align: center; }
.cc-requirement-plan-body { display: grid; grid-template-columns: minmax(0, 1fr); border-top: 1px solid rgba(148, 163, 184, 0.09); }
.cc-requirement-plan-body.has-side { grid-template-columns: minmax(0, 1.5fr) minmax(220px, 0.72fr); }
.cc-requirement-plan-main, .cc-requirement-plan-side { min-width: 0; padding: 11px; }
.cc-requirement-plan-body.has-side .cc-requirement-plan-main { border-right: 1px solid rgba(148, 163, 184, 0.12); }
.cc-requirement-plan-body section + section { margin-top: 12px; }
.cc-requirement-plan-body h4 { margin: 0 0 6px; color: var(--text-muted); font-size: 9px; font-weight: 650; letter-spacing: 0.04em; }
.cc-requirement-plan-body section > p { margin: 0; color: var(--text-secondary); font-size: 10px; line-height: 1.55; }
.cc-requirement-plan-steps { display: grid; gap: 5px; margin: 0; padding: 0; list-style: none; }
.cc-requirement-plan-steps li { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 7px; align-items: start; padding: 6px 2px; border: 0; border-top: 1px solid rgba(148, 163, 184, 0.08); border-radius: 0; background: transparent; }
.cc-requirement-plan-steps li:first-child { border-top:0; }
.cc-requirement-step-mark { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 5px; color: var(--text-muted); background: rgba(100, 116, 139, 0.09); font-size: 9px; }
.cc-requirement-plan-steps li.completed .cc-requirement-step-mark { color: #15803d; background: rgba(34, 197, 94, 0.11); }
.cc-requirement-plan-steps li.running .cc-requirement-step-mark { color: var(--primary-color, #ec4899); background: color-mix(in srgb, var(--primary-color, #ec4899) 12%, transparent); }
.cc-requirement-plan-steps li.blocked .cc-requirement-step-mark { color: #dc2626; background: rgba(239, 68, 68, 0.1); }
.cc-requirement-plan-steps strong { display: block; color: var(--text-primary); font-size: 10px; }
.cc-requirement-plan-steps p { margin: 2px 0 0; color: var(--text-secondary); font-size: 9px; line-height: 1.45; }
.cc-requirement-plan-steps small { display: block; margin-top: 3px; color: var(--text-muted); font-size: 8px; line-height: 1.4; }
.cc-requirement-step-project { color: var(--primary-color, #ec4899); font-size: 8px; white-space: nowrap; }
.cc-requirement-plan-side ul { display: grid; gap: 4px; margin: 0; padding-left: 14px; color: var(--text-secondary); font-size: 9px; line-height: 1.5; }
.cc-requirement-plan-side li::marker { color: var(--primary-color, #ec4899); }
.cc-requirement-plan-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 11px; border-top: 1px solid rgba(148, 163, 184, 0.12); color: var(--text-muted); font-size: 8px; }
.cc-requirement-plan-foot button { display:inline-flex; align-items:center; gap:3px; padding: 2px 0; border: 0; color: var(--primary-color, #ec4899); background: transparent; font-size: 8px; cursor: pointer; }
.cc-requirement-plan-confirm { display: flex; justify-content: flex-end; gap: 8px; padding: 7px 11px; border-top: 1px solid rgba(148, 163, 184, 0.12); }
.cc-requirement-plan-confirm button { display: inline-flex; align-items: center; gap: 5px; min-height: 28px; padding: 0 11px; border: 1px solid var(--primary-color, #2563eb); border-radius: 7px; background: var(--primary-color, #2563eb); color: #fff; font-size: 11px; cursor: pointer; }
.cc-requirement-plan-confirm button:disabled { opacity: 0.5; cursor: not-allowed; }
.cc-execution-stage-head { position:relative; width: calc(100% - 4px); display: grid; grid-template-columns: 20px minmax(0, 1fr) auto auto 20px; align-items: center; gap: 8px; margin:0 2px; padding: 9px 0; border: 0; color: var(--text-secondary); background: transparent; text-align: left; cursor: pointer; }
.cc-execution-stage-head:not(:first-child) { margin-top: 0; border-top: 1px solid rgba(100, 116, 139, 0.075); }
.cc-execution-stage-head:hover { background: rgba(100, 116, 139, 0.025); }
.cc-execution-stage-head.active { color: var(--text-primary); background: transparent; box-shadow: none; }
.cc-execution-stage-head:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 72%, transparent); outline-offset: -2px; }
.cc-execution-stage-marker { width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:var(--text-muted); background:rgba(100,116,139,.09); font-size:9px; font-weight:800; }
.cc-stage-running-dot { width:6px; height:6px; border-radius:50%; background:currentColor; }
.cc-execution-stage-head.completed .cc-execution-stage-marker { color:#15803d; background:rgba(34,197,94,.11); }
.cc-execution-stage-head.failed .cc-execution-stage-marker { color:#dc2626; background:rgba(239,68,68,.11); }
.cc-execution-stage-copy { min-width:0; display:grid; grid-template-columns:auto minmax(0,1fr); align-items:baseline; gap:8px; }
.cc-execution-stage-chevron { color: var(--text-muted); font-size: 11px; line-height: 1; text-align:center; }
.cc-execution-stage-head strong { color: var(--text-primary); font-size: 12px; font-weight: 650; white-space:nowrap; }
.cc-execution-stage-head small { min-width: 0; color: var(--text-muted); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-execution-stage-head em { color: var(--text-muted); font-size: 10px; font-style: normal; white-space: nowrap; }
.cc-execution-stage-head.completed em { color: #15803d; }
.cc-execution-stage-head.failed em { color: #dc2626; }
.cc-execution-stage-head > span:nth-last-child(2) { color: var(--text-muted); font-size: 10px; white-space: nowrap; }
.cc-execution-stage-progress { display: -webkit-box; margin: 3px 8px 7px 31px; padding-left:12px; overflow: hidden; border-left:1px solid color-mix(in srgb,var(--border-color,#94a3b8) 28%,transparent); color: var(--text-primary); font-size: 11px; line-height: 1.6; white-space: normal; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.cc-execution-stage-progress.current { padding-left: 7px; border-left: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 75%, transparent); background: color-mix(in srgb, var(--primary-color, #ec4899) 4%, transparent); }
.cc-progress-batch-group { margin-left: 24px; border-left: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 22%, transparent); }
.cc-progress-batch-group.completed { opacity: 0.84; }
.cc-progress-batch-group.current { opacity: 1; border-left-color: color-mix(in srgb, var(--primary-color, #ec4899) 70%, transparent); background: color-mix(in srgb, var(--primary-color, #ec4899) 3%, transparent); }
.cc-progress-batch-group .cc-execution-stage-progress { margin-left: 13px; }
.cc-progress-batch-head { width:calc(100% - 12px); display:grid; grid-template-columns:18px minmax(0,1fr) auto 18px; align-items:center; gap:7px; margin: 0 0 4px 12px; padding: 5px 4px; border: 0; border-radius: 5px; color: var(--text-secondary); background: transparent; text-align:left; cursor: pointer; }
.cc-progress-batch-head:hover { background:rgba(100,116,139,.035); }
.cc-progress-batch-head strong { min-width:0; overflow:hidden; color:var(--text-primary); font-size:11px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
.cc-progress-batch-head small { color: var(--text-muted); font-size: 9px; white-space:nowrap; }
.cc-progress-batch-status,.cc-progress-batch-chevron { display:inline-flex; align-items:center; justify-content:center; color:#15803d; }
.cc-progress-batch-status.attention { color:#b45309; }
.cc-progress-batch-status.failed { color:#dc2626; }
.cc-progress-batch-chevron { color:var(--text-muted); }
.cc-execution-row { padding: 0; }
.cc-execution-row,
.cc-progress-batch-group,
.cc-requirement-plan,
.cc-execution-stage-head,
.cc-execution-stage-progress {
  content-visibility: auto;
  contain-intrinsic-size: auto 52px;
}
.cc-execution-row.stage-child { margin-left: 31px; border-left: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 28%, transparent); }
.cc-execution-row.batch-child { margin-left: 36px; }
.cc-execution-row.child-agent-child { margin-left: 42px; }
.cc-execution-row.read-search-child { margin-left: 36px; }
.cc-execution-row.completed { opacity: 0.82; }
.cc-execution-row.completed:hover,
.cc-execution-row.current { opacity: 1; }
.cc-execution-row.current { background: color-mix(in srgb, var(--primary-color, #ec4899) 7%, transparent); box-shadow: inset 2px 0 color-mix(in srgb, var(--primary-color, #ec4899) 80%, transparent); }
.cc-execution-row.stage-child + .cc-execution-row.stage-child { border-top-color: rgba(100, 116, 139, 0.055); }
.cc-execution-row + .cc-execution-row { border-top: 1px solid rgba(100, 116, 139, 0.07); }
.cc-execution-row-summary { width: 100%; display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 5px; align-items: start; padding: 6px 10px; border: 0; color: inherit; background: transparent; text-align: left; }
.cc-execution-row-summary.expandable { cursor: pointer; }
.cc-execution-row-summary.expandable:hover { background: rgba(100, 116, 139, 0.055); }
.cc-execution-row-chevron { min-width: 24px; min-height: 24px; display: inline-flex; align-items: center; justify-content: center; align-self: center; color: var(--text-muted); font-size: 11px; }
.cc-execution-mark { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: #2563eb; background: rgba(37, 99, 235, 0.1); font-size: 10px; }
.cc-execution-row.success .cc-execution-mark { color: #15803d; background: rgba(34, 197, 94, 0.12); }
.cc-execution-row.failed .cc-execution-mark { color: #dc2626; background: rgba(239, 68, 68, 0.12); }
.cc-execution-row.waiting .cc-execution-mark { color: #b45309; background: rgba(245, 158, 11, 0.13); }
.cc-execution-row.success .cc-execution-mark.semantic { color:var(--text-muted); background:transparent; }
.cc-execution-row .cc-execution-mark.partial { color:#b45309; background:rgba(245,158,11,.12); }
.cc-execution-row.batch-child .cc-execution-row-summary { min-height:32px; padding-top:5px; padding-bottom:5px; }
.cc-execution-row.batch-child .cc-execution-title strong { font-weight:550; }
.cc-execution-title { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; min-width: 0; }
.cc-execution-title strong { color: var(--text-primary); font-size: 12px; }
.cc-execution-title code { max-width: min(520px, 65vw); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); font-size: 11px; }
.cc-execution-title span { margin-left: auto; color: var(--text-muted); font-size: 10px; }
.cc-execution-main p { margin: 3px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.45; }
.cc-execution-main small { display: block; margin-top: 3px; color: var(--text-muted); font-size: 10px; }
.cc-execution-detail { display: grid; gap: 8px; margin: 0 10px 8px 35px; padding: 8px; border-radius: 7px; background: rgba(15, 23, 42, 0.035); }
.cc-execution-detail b { display: block; margin-bottom: 4px; color: var(--text-secondary); font-size: 10px; }
.cc-execution-detail pre { max-height: 220px; margin: 0; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--text-secondary); font: 10px/1.5 Consolas, monospace; }
.cc-execution-detail code { white-space: normal; overflow-wrap: anywhere; color: var(--text-secondary); font-size: 10px; }
.cc-execution-detail ul { margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 10px; }
.cc-execution-detail .cc-file-changes { display: grid; gap: 4px; padding: 0; list-style: none; }
.cc-file-changes button { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 10px; padding: 6px 8px; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 30%, transparent); border-radius: 6px; color: var(--text-secondary); background: color-mix(in srgb, var(--surface, #fff) 78%, transparent); text-align: left; cursor: pointer; }
.cc-agent-file-stream { display: grid; gap: 2px; margin: 0 0 4px 28px; }
.cc-agent-file-change { min-width: 0; }
.cc-agent-file-change-row { width: 100%; min-height: 30px; display: grid; grid-template-columns: 16px auto minmax(0, 1fr) auto 16px; align-items: center; gap: 6px; padding: 4px 2px; border: 0; border-radius: 5px; color: var(--text-secondary); background: transparent; text-align: left; cursor: pointer; }
.cc-agent-file-change-row:hover { background: color-mix(in srgb, var(--border-color, #94a3b8) 9%, transparent); }
.cc-agent-file-change-row:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #2563eb) 60%, transparent); outline-offset: 1px; }
.cc-agent-file-change-row > svg { color: var(--text-muted); }
.cc-agent-file-change.added .cc-agent-file-change-row > svg { color: #15803d; }
.cc-agent-file-change.deleted .cc-agent-file-change-row > svg { color: #b91c1c; }
.cc-agent-file-change-row strong { color: var(--text-secondary); font-size: 10px; font-weight: 650; }
.cc-agent-file-change-row code { min-width: 0; overflow: hidden; color: var(--text-secondary); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.cc-agent-file-change-row small { color: var(--text-muted); font-size: 9px; }
.cc-agent-file-change-row small.has-deletions { color: #b45309; }
.cc-file-changes button:hover { border-color: color-mix(in srgb, var(--primary-color, #ec4899) 55%, transparent); background: color-mix(in srgb, var(--primary-color, #ec4899) 7%, transparent); }
.cc-file-changes button:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 70%, transparent); outline-offset: 1px; }
.cc-file-changes button > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 10px/1.4 Consolas, monospace; }
.cc-file-changes small { color: #059669; font: 10px/1.4 Consolas, monospace; white-space: nowrap; }
.cc-file-changes small.has-deletions { color: #b45309; }
.cc-file-change-open { display:inline-flex; align-items:center; gap:3px; color: var(--primary-color, #ec4899); font-size: 10px; white-space: nowrap; }
.cc-tool-identity { display: flex; align-items: center; gap: 8px; }
.cc-tool-identity b { margin: 0; color: var(--text-primary); font-size: 12px; }
.cc-tool-identity span { color: var(--text-muted); font-size: 10px; }
.cc-tool-command-detail { margin-top: 8px; }
.cc-tool-command-detail b { display: block; margin-bottom: 4px; color: var(--text-muted); font-size: 10px; }
.cc-tool-command-detail pre { margin: 0; max-height: 120px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--text-secondary); font: 10px/1.45 Consolas, monospace; }
.cc-tool-arguments { display: grid; grid-template-columns: minmax(80px, auto) minmax(0, 1fr); gap: 3px 10px; margin: 0; }
.cc-tool-arguments dt { color: var(--text-muted); font-size: 10px; }
.cc-tool-arguments dd { margin: 0; color: var(--text-secondary); font: 10px/1.45 Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.cc-tool-result > p { margin: 0 0 5px; color: var(--text-secondary); font-size: 11px; }
.cc-tool-result-rows { display: grid; gap: 3px; max-height: 280px; overflow: auto; }
.cc-tool-result-row { display: flex; flex-wrap: wrap; gap: 5px 12px; padding: 4px 6px; border-radius: 5px; background: rgba(100, 116, 139, 0.055); color: var(--text-secondary); font: 10px/1.4 Consolas, monospace; }
.cc-tool-result-row span { min-width: 0; overflow-wrap: anywhere; }
.cc-tool-result-row small { margin: 0 4px 0 0; color: var(--text-muted); font-family: inherit; }
.cc-tool-rehydrate { margin-top: 6px; padding: 3px 8px; border: 1px solid rgba(100, 116, 139, 0.25); border-radius: 5px; color: var(--text-secondary); background: transparent; font-size: 10px; cursor: pointer; }
.cc-tool-rehydrate:hover:not(:disabled) { background: rgba(100, 116, 139, 0.08); }
.cc-tool-rehydrate:disabled { opacity: 0.55; cursor: wait; }
.cc-tool-live-tail { max-height: 180px; margin: 7px 0 0; padding: 8px 9px; overflow: auto; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 45%, transparent); border-radius: 6px; color: var(--text-secondary); background: color-mix(in srgb, var(--surface, #fff) 92%, #0f172a 8%); font: 10px/1.55 var(--font-mono, monospace); white-space: pre-wrap; word-break: break-word; }
.cc-tool-detail-notice,
.cc-tool-detail-error { display: block; margin-top: 6px; font-size: 10px; line-height: 1.45; }
.cc-tool-detail-notice { color: #2563eb; }
.cc-tool-detail-error { color: #dc2626; }
.cc-tool-freshness { padding: 6px 8px; border-radius: 6px; font-size: 10px !important; }
.cc-tool-freshness.current { color: #15803d; background: rgba(34, 197, 94, 0.1); }
.cc-tool-freshness.warning { color: #b45309; background: rgba(245, 158, 11, 0.11); }
.cc-tool-freshness.danger { color: #b91c1c; background: rgba(239, 68, 68, 0.1); }
.cc-execution-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 10px 8px 35px; }
.cc-execution-actions button { padding: 4px 8px; border: 1px solid rgba(148, 163, 184, 0.24); border-radius: 6px; color: var(--text-secondary); background: transparent; font-size: 10px; cursor: pointer; }
.cc-execution-actions button:hover:not(:disabled) { border-color: color-mix(in srgb, var(--primary-color, #ec4899) 55%, transparent); color: var(--text-primary); background: color-mix(in srgb, var(--primary-color, #ec4899) 7%, transparent); }
.cc-execution-actions button:disabled { opacity: 0.45; cursor: not-allowed; }
.cc-completion-files { width: 100%; margin: 5px 0 9px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 38%, transparent); border-radius: 9px; background: color-mix(in srgb, var(--surface, #fff) 97%, transparent); }
.cc-completion-files.warning { border-color: color-mix(in srgb, #d97706 42%, transparent); }
.cc-completion-files-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; min-height: 42px; padding: 0 10px; }
.cc-completion-files-toggle { min-width:0; display:grid; grid-template-columns:24px minmax(0,1fr) auto; align-items:center; gap:8px; padding:7px 0; border:0; color:inherit; background:transparent; text-align:left; cursor:pointer; }
.cc-completion-files-toggle:hover .cc-completion-files-copy strong { color:var(--primary-color,#2563eb); }
.cc-completion-files-icon { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; color: var(--text-secondary); background: rgba(100, 116, 139, 0.08); }
.cc-completion-files-copy { min-width: 0; display: flex; align-items:baseline; gap:8px; }
.cc-completion-files-copy strong { color: var(--text-primary); font-size: 12px; }
.cc-completion-files-copy small { display: flex; gap: 6px; font-size: 10px; }
.additions { color: #16a34a; }
.deletions { color: #dc2626; }
.cc-completion-review { padding: 5px 9px; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 55%, transparent); border-radius: 6px; color: var(--text-primary); background: transparent; font-size: 10px; cursor: pointer; }
.cc-completion-review:hover { background: rgba(100, 116, 139, 0.07); }
.cc-completion-review:focus-visible,
.cc-completion-file-row:focus-visible,
.cc-completion-files-more:focus-visible,
.cc-completion-files-all:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 72%, transparent); outline-offset: -2px; }
.cc-completion-file-list { display: grid; }
.cc-completion-file-list { border-top:1px solid rgba(100,116,139,.1); }
.cc-completion-file-row { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 7px 12px; border: 0; border-bottom: 1px solid rgba(100, 116, 139, 0.08); color: var(--text-secondary); background: transparent; text-align: left; cursor: pointer; }
.cc-completion-file-row:hover { background: rgba(100, 116, 139, 0.055); }
.cc-completion-file-path { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.cc-completion-file-path small { color: var(--text-muted); font-size: 9px; }
.cc-completion-file-delta { display: inline-flex; gap: 3px; white-space: nowrap; font-size: 10px; }
.cc-completion-file-status { color: var(--text-muted); font-size: 9px; white-space: nowrap; }
.cc-completion-files-more,
.cc-completion-files-all { padding: 8px 12px; border: 0; color: var(--text-muted); background: transparent; font-size: 10px; cursor: pointer; text-align: left; }
.cc-completion-files-all { float: right; }
.cc-attempt-history { margin:4px 2px 0; border-top:1px solid rgba(100,116,139,.09); }
.cc-attempt-history-head { width:100%; display:grid; grid-template-columns:20px auto minmax(0,1fr) 20px; align-items:center; gap:7px; min-height:38px; padding:6px 0; border:0; color:var(--text-secondary); background:transparent; text-align:left; cursor:pointer; }
.cc-attempt-history-head:hover { background:rgba(100,116,139,.035); }
.cc-attempt-history-head strong { color:var(--text-primary); font-size:11px; }
.cc-attempt-history-head span { color:var(--text-muted); font-size:10px; }
.cc-attempt-history-list { display:grid; gap:7px; padding:2px 8px 9px 27px; }
.cc-attempt-history-list article { padding-left:9px; border-left:1px solid color-mix(in srgb,var(--border-color,#94a3b8) 32%,transparent); }
.cc-attempt-history-list header { display:flex; align-items:baseline; gap:7px; }
.cc-attempt-history-list header strong { color:var(--text-primary); font-size:10px; }
.cc-attempt-history-list header span,.cc-attempt-history-list p { color:var(--text-muted); font-size:9px; }
.cc-attempt-history-list p { margin:3px 0 0; line-height:1.45; }
.cc-execution-footer { display:flex; padding:9px 3px 4px 30px; border-top:1px solid rgba(100,116,139,.09); }

/* Live projection: a compact construction view backed by the same durable ledger. */
.cc-execution.live { margin-bottom: 8px; overflow: visible; }
.cc-execution.live .cc-execution-stage-head { grid-template-columns: 14px auto minmax(0, 1fr) auto; min-height: 32px; padding: 6px 1px; border-top: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 18%, transparent); border-radius: 0; }
.cc-execution.live .cc-execution-stage-head:first-child { border-top: 0; }
.cc-execution.live .cc-execution-stage-head:hover { background: color-mix(in srgb, var(--surface-subtle, #f8fafc) 45%, transparent); }
.cc-execution.live .cc-execution-stage-head.active { background: transparent; box-shadow: none; }
.cc-execution.live .cc-execution-stage-head.active strong { color: var(--text-primary); }
.cc-execution.live .cc-execution-stage-head.completed { opacity: 0.62; }
.cc-execution.live .cc-execution-stage-head.failed { opacity: 1; }
.cc-execution.live .cc-execution-stage-head strong { font-size: 11px; font-weight: 650; }
.cc-execution.live .cc-execution-stage-head small,
.cc-execution.live .cc-execution-stage-head > span:last-child { font-size: 9px; }
.cc-execution.live .cc-execution-stage-progress { margin: 7px 2px 8px 21px; padding: 0; border-left: 0; background: transparent; font-size: 12px; line-height: 1.55; }
.cc-execution.live .cc-execution-stage-progress.current { padding-left: 0; border-left: 0; background: transparent; }
.cc-execution.live .cc-progress-batch-group { margin: 0 0 3px 20px; border-left: 0; background: transparent; }
.cc-execution.live .cc-progress-batch-group.completed { opacity: 0.84; }
.cc-execution.live .cc-progress-batch-group.current { border-left: 0; background: transparent; }
.cc-execution.live .cc-progress-batch-group .cc-execution-stage-progress { margin-left: 0; }
.cc-execution.live .cc-progress-batch-head { width: calc(100% - 2px); display: grid; grid-template-columns: 15px minmax(0, 1fr) auto 15px; gap: 7px; margin: 0; padding: 4px 1px; border-radius: 4px; background: transparent; text-align: left; }
.cc-execution.live .cc-progress-batch-head:hover { background: rgba(100, 116, 139, 0.055); }
.cc-execution.live .cc-progress-batch-head strong { overflow: hidden; color: var(--text-secondary); font-size: 10px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.cc-execution.live .cc-progress-batch-head small { font-size: 9px; white-space: nowrap; }
.cc-execution.live .cc-execution-row.stage-child { margin-left: 20px; border-left: 0; }
.cc-execution.live .cc-execution-row.batch-child { margin-left: 26px; }
.cc-execution.live .cc-execution-row.agent-child { margin-left: 38px; }
.cc-execution.live .cc-execution-row.child-agent-child { margin-left: 44px; }
.cc-execution.live .cc-execution-row + .cc-execution-row { border-top: 0; }
.cc-execution.live .cc-execution-row-summary { grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; min-height: 30px; gap: 6px; padding: 4px 1px; border-radius: 4px; }
.cc-execution.live .cc-execution-row-summary.expandable:hover { background: rgba(100, 116, 139, 0.055); }
.cc-execution.live .cc-execution-mark { width: 16px; height: 16px; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 45%, transparent); border-radius: 4px; color: var(--text-muted); background: transparent; font-size: 9px; }
.cc-execution.live .cc-execution-row.current .cc-execution-mark { color: var(--primary-color, #2563eb); border-color: color-mix(in srgb, var(--primary-color, #2563eb) 45%, transparent); animation: cc-live-pulse 1.35s ease-in-out infinite; }
.cc-execution.live .cc-execution-row.current { background: transparent; box-shadow: none; }
.cc-execution.live .cc-execution-row.completed { opacity: 0.78; }
.cc-execution.live .cc-execution-row.completed:hover { opacity: 1; }
.cc-execution.live .cc-execution-title { gap: 6px; flex-wrap: nowrap; }
.cc-execution.live .cc-execution-title strong { min-width: 0; overflow: hidden; color: var(--text-secondary); font-size: 11px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.cc-execution.live .cc-execution-title code { max-width: 42%; flex: 0 1 auto; color: var(--text-muted); font-size: 9px; }
.cc-execution.live .cc-execution-main p { margin-top: 2px; font-size: 10px; }
.cc-execution.live .cc-execution-main small { margin-top: 2px; font-size: 9px; }
.cc-execution.live .cc-execution-row-chevron { min-width: 20px; min-height: 20px; }
.cc-execution.live .cc-execution-row.model-activity { opacity: 1; }
.cc-execution.live .cc-execution-row.model-activity .cc-execution-row-summary { min-height: 26px; padding-top: 3px; padding-bottom: 3px; }
.cc-execution.live .cc-execution-row.model-activity .cc-execution-mark { border: 0; background: transparent; color: var(--text-muted); }
.cc-execution.live .cc-execution-row.model-activity .cc-execution-title strong { font-weight: 400; color: var(--text-secondary); white-space: normal; }
.cc-execution.live .cc-execution-detail { margin: 3px 1px 8px 23px; padding: 9px 10px; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 24%, transparent); border-radius: 7px; background: color-mix(in srgb, var(--surface-subtle, #f8fafc) 72%, transparent); }
.cc-execution.live .cc-execution-actions { margin-left: 23px; }

.cc-execution.live .cc-requirement-plan { margin: 5px 0 7px 20px; border: 0; border-radius: 0; background: transparent; }
.cc-execution.live .cc-requirement-plan-head { grid-template-columns: minmax(0, 1fr) auto 18px; gap: 7px; min-height: 31px; padding: 5px 1px; }
.cc-execution.live .cc-requirement-plan-head:hover { background: rgba(100, 116, 139, 0.045); }
.cc-execution.live .cc-requirement-plan-icon { display: none; }
.cc-execution.live .cc-requirement-plan-title strong { font-size: 11px; font-weight: 650; }
.cc-execution.live .cc-requirement-plan-title small { display: none; }
.cc-execution.live .cc-requirement-plan-status { padding: 0; color: var(--text-muted); background: transparent; font-size: 9px; }
.cc-execution.live .cc-requirement-plan-body { display: block; border-top: 0; }
.cc-execution.live .cc-requirement-plan-main { padding: 1px 0 5px 1px; border: 0; }
.cc-execution.live .cc-requirement-plan-main > section:first-child,
.cc-execution.live .cc-requirement-plan-side,
.cc-execution.live .cc-requirement-plan-foot,
.cc-execution.live .cc-requirement-plan-main h4 { display: none; }
.cc-execution.live .cc-requirement-plan-confirm { display: flex; padding: 6px 0 4px; border-top: 1px solid rgba(148, 163, 184, 0.1); }
.cc-execution.live .cc-requirement-plan-body section + section { margin-top: 0; }
.cc-execution.live .cc-requirement-plan-steps { gap: 1px; }
.cc-execution.live .cc-requirement-plan-steps li { grid-template-columns: 18px minmax(0, 1fr) auto; gap: 6px; padding: 3px 0; border: 0; border-radius: 0; background: transparent; }
.cc-execution.live .cc-requirement-step-mark { width: 16px; height: 16px; border-radius: 50%; font-size: 8px; }
.cc-execution.live .cc-requirement-plan-steps strong { font-size: 10px; font-weight: 550; }
.cc-execution.live .cc-requirement-plan-steps p,
.cc-execution.live .cc-requirement-plan-steps small { display: none; }
.cc-execution.live .cc-requirement-step-project { align-self: center; font-size: 8px; }

@keyframes cc-live-pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .cc-execution.live .cc-execution-row.current .cc-execution-mark { animation: none; } }
@media (max-width: 720px) {
  .cc-progress-overview { grid-template-columns: auto auto minmax(0, 1fr); }
  .cc-progress-overview kbd { display: none; }
  .cc-execution-head { grid-template-columns: 18px auto 18px minmax(0, 1fr); }
  .cc-execution-head kbd { display: none; }
  .cc-execution-duration { grid-column: 4; }
  .cc-execution-title span { width: 100%; margin-left: 0; }
  .cc-execution-meta { padding-left:30px; }
  .cc-execution-timing { padding-left: 24px; }
  .cc-execution-search { margin-left:24px; }
  .cc-execution-stage-head { grid-template-columns: 20px minmax(0, 1fr) auto 20px; gap:6px; }
  .cc-execution-stage-copy { grid-template-columns:1fr; gap:1px; }
  .cc-execution-stage-head em { display:none; }
  .cc-execution-stage-head > span:nth-last-child(2) { grid-column:3; }
  .cc-execution-stage-chevron { grid-column:4; }
  .cc-execution-title code { max-width: 72vw; }
  .cc-requirement-plan-head { grid-template-columns: 28px minmax(0, 1fr) 20px; }
  .cc-requirement-plan-status { grid-column: 2; width: fit-content; }
  .cc-requirement-plan-chevron { grid-column: 3; grid-row: 1 / span 2; }
  .cc-requirement-plan-body { grid-template-columns: 1fr; }
  .cc-requirement-plan-main { border-right: 0; border-bottom: 1px solid rgba(148, 163, 184, 0.12); }
  .cc-requirement-plan-steps li { grid-template-columns: 20px minmax(0, 1fr); }
  .cc-requirement-step-project { grid-column: 2; }
  .cc-completion-files-head { grid-template-columns: 30px minmax(0, 1fr) auto; padding: 9px; }
  .cc-completion-file-row { align-items: start; padding: 7px 9px; }
  .cc-completion-file-path { white-space: normal; overflow-wrap: anywhere; }
  .cc-live-execution-status { margin-bottom: 6px; }
  .cc-execution.live .cc-execution-stage-head { grid-template-columns: 13px auto minmax(0, 1fr); }
  .cc-execution.live .cc-execution-stage-head > span:last-child { grid-column: 2 / -1; margin-left: 0; }
  .cc-execution.live .cc-execution-row.stage-child,
  .cc-execution.live .cc-progress-batch-group,
  .cc-execution.live .cc-requirement-plan { margin-left: 14px; }
  .cc-execution.live .cc-execution-row.batch-child { margin-left: 22px; }
  .cc-execution.live .cc-execution-row.agent-child { margin-left: 28px; }
  .cc-execution.live .cc-execution-row.child-agent-child { margin-left: 34px; }
  .cc-execution.live .cc-execution-title code { max-width: 34%; }
  .cc-execution.live .cc-execution-detail { margin-left: 0; }
  .cc-agent-file-stream { margin-left: 16px; }
  .cc-agent-file-change-row { grid-template-columns: 16px auto minmax(0, 1fr) 16px; }
  .cc-agent-file-change-row > small { grid-column: 3; }
  .cc-execution.live .cc-requirement-plan-steps li { grid-template-columns: 18px minmax(0, 1fr); }
  .cc-execution.live .cc-requirement-step-project { grid-column: 2; }
}
</style>
