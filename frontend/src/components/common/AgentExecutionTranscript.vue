<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  agentStatusCategory,
  completionFileChangesForRows,
  eventStatusLabel,
  executionEventsForMessage,
  formatExecutionDuration,
  formatExecutionDurationLong,
  shouldRenderExecutionTranscript,
} from '../../utils/agentExecutionEvents.js'
import { agentProgressBatchPresentation, longRunningToolDuration } from '../../utils/agentProgressPresentation.js'

const props = defineProps({
  events: { type: Array, default: () => [] },
  messages: { type: Array, default: () => [] },
  messageIndex: { type: Number, required: true },
  enabled: { type: Boolean, default: true },
  stagePreview: { type: Boolean, default: false },
  stageGrouped: { type: Boolean, default: false },
  presentation: { type: String, default: 'auto' },
})
const emit = defineEmits(['open-file-change', 'open-file-changes', 'execution-action'])
const stageMode = computed(() => props.stagePreview || props.stageGrouped)

const now = ref(Date.now())
const executionAnchor = ref(null)
const transcriptExpanded = ref(false)
const searchQuery = ref('')
const searchCursor = ref(-1)
let durationTimer = null
const toggleTranscript = () => { transcriptExpanded.value = !transcriptExpanded.value }
onMounted(() => {
  durationTimer = window.setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('ccm:locate-execution-event', locateExecutionEvent)
  restoreExpansionState()
})
onBeforeUnmount(() => {
  window.removeEventListener('ccm:locate-execution-event', locateExecutionEvent)
  if (durationTimer) window.clearInterval(durationTimer)
})

const rows = computed(() => executionEventsForMessage(props.events, props.messages, props.messageIndex))
const anchorMessage = computed(() => props.messages?.[props.messageIndex] || {})
const expansionStorageKey = computed(() => {
  const sessionId = rows.value[0]?.exactSessionId || anchorMessage.value?.exactSessionId || anchorMessage.value?.sessionId || 'session'
  const messageId = anchorMessage.value?.id || anchorMessage.value?.messageId || anchorMessage.value?.timestamp || props.messageIndex
  return `ccm:execution-expansion:${sessionId}:${messageId}`
})
const shouldRender = computed(() => shouldRenderExecutionTranscript(props.events, props.messages, props.messageIndex, transcriptExpanded.value))
const currentGeneration = computed(() => rows.value.reduce((max, event) => Math.max(max, Number(event?.generation || 0)), 0))
const resultEvent = computed(() => [...rows.value].reverse().find(event => event.eventType === 'result' && Number(event?.generation || 0) === currentGeneration.value))
const isTerminal = computed(() => !!resultEvent.value)
const isLivePresentation = computed(() => props.presentation === 'live' && !isTerminal.value)
const terminalAt = computed(() => eventTime(resultEvent.value?.createdAt))
const presentationVisible = computed(() => {
  if (props.presentation === 'live') return !isTerminal.value
  if (props.presentation === 'completed') return isTerminal.value
  return true
})
const compacted = computed(() => !transcriptExpanded.value && isTerminal.value)
const assistantProgressRows = computed(() => rows.value.filter(event => event.eventType === 'assistant_progress'))
const currentProgressEventId = computed(() => isTerminal.value ? '' : assistantProgressRows.value.at(-1)?.eventId || '')
const requirementPlanEvents = computed(() => rows.value.filter(event => event.eventType === 'requirement_plan' && event?.detail?.requirementPlan))
const latestRequirementPlanEvent = computed(() => [...requirementPlanEvents.value].sort((left, right) => (
  Number(left?.detail?.requirementPlan?.revision || 1) - Number(right?.detail?.requirementPlan?.revision || 1)
  || Number(left?.sequence || 0) - Number(right?.sequence || 0)
)).at(-1) || null)
const requirementPlan = computed(() => latestRequirementPlanEvent.value?.detail?.requirementPlan || null)
const livePlanDockEligible = computed(() => !!(
  latestRequirementPlanEvent.value?.taskId
  && latestRequirementPlanEvent.value?.anchorMessageId
))
const requirementPlanHistory = computed(() => requirementPlanEvents.value.filter(event => event.eventId !== latestRequirementPlanEvent.value?.eventId))
const visibleRows = computed(() => rows.value.filter(event => !['turn_started', 'assistant_text_delta', 'assistant_progress', 'requirement_plan', 'result'].includes(event.eventType)))
const stageSourceRows = computed(() => rows.value.filter(event => !['turn_started', 'assistant_text_delta', 'thinking_status', 'requirement_plan', 'result'].includes(event.eventType)))
const hasProgressFlow = computed(() => assistantProgressRows.value.length > 0)
const hasExecutionRows = computed(() => requirementPlan.value || visibleRows.value.some(event => event.eventType?.startsWith('tool_') || event.eventType?.startsWith('agent_') || ['permission_required', 'context_compacted'].includes(event.eventType)))
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
const requirementPlanExpanded = ref(false)
const planIsExpanded = computed(() => isTerminal.value ? requirementPlanExpanded.value && transcriptExpanded.value : requirementPlanExpanded.value)
const toggleRequirementPlan = () => { requirementPlanExpanded.value = !requirementPlanExpanded.value }
const stageIsExpanded = stage => {
  if (expandedStages[stage.kind] !== undefined) return expandedStages[stage.kind]
  if (!isLivePresentation.value) return false
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
  const terminalBoundary = isTerminal.value ? eventTime(resultEvent.value?.createdAt) : 0
  if (!started || (terminalBoundary && started > terminalBoundary)) return []
  const duration = Math.max(0, Number(stage.activeDurationMs || event?.display?.durationMs || 0))
  const completed = eventTime(stage.completedAt)
  const live = ['running', 'waiting'].includes(String(event?.display?.status || ''))
  const inferredEnd = completed || (duration ? started + duration : live ? (terminalBoundary || now.value) : started)
  const ended = terminalBoundary ? Math.min(inferredEnd, terminalBoundary) : inferredEnd
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
const batchKeyFor = progress => String(progress?.detail?.progress?.batchId || progress?.eventId || '')
const batchIsExpanded = batch => expandedBatches[batch.key] === undefined ? isLivePresentation.value : expandedBatches[batch.key]
const toggleBatch = batch => { expandedBatches[batch.key] = !batchIsExpanded(batch) }
const groupedStageItems = stageRows => {
  const progressRows = stageRows.filter(event => event?.eventType === 'assistant_progress')
  const lifecycleRows = stageRows.filter(event => event?.eventType !== 'assistant_progress')
  const claimed = new Set()
  const batches = progressRows.map((progress, index) => {
    const related = new Set(progress?.detail?.progress?.relatedToolCallIds || [])
    const nextSequence = Number(progressRows[index + 1]?.sequence || Number.POSITIVE_INFINITY)
    const children = lifecycleRows.filter(event => {
      const matched = related.size
        ? related.has(event?.toolCallId)
        : Number(event?.sequence || 0) > Number(progress?.sequence || 0) && Number(event?.sequence || 0) < nextSequence
      if (matched) claimed.add(event.eventId)
      return matched
    })
    const key = batchKeyFor(progress)
    return {
      __progressBatch: true,
      key,
      progress,
      children,
      presentation: agentProgressBatchPresentation(children, { now: now.value, terminalAt: terminalAt.value }),
      durationMs: derivedStageDuration(children),
    }
  })
  const unclaimed = lifecycleRows.filter(event => !claimed.has(event.eventId))
  return [...batches, ...unclaimed]
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
    return orderFor(left) - orderFor(right)
  })
}
const executionStageRows = computed(() => {
  const includeRequirementPlan = !!requirementPlan.value && !(isLivePresentation.value && livePlanDockEligible.value)
  if (!stageMode.value) {
    if (!includeRequirementPlan) return visibleRows.value
    const projected = [...visibleRows.value]
    const firstAgentIndex = projected.findIndex(event => event?.eventType?.startsWith('agent_'))
    projected.splice(firstAgentIndex >= 0 ? firstAgentIndex : projected.length, 0, {
      __requirementPlan: true,
      key: `requirement-plan:${requirementPlan.value.planId}:${requirementPlan.value.revision}`,
      event: latestRequirementPlanEvent.value,
    })
    return projected
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
  return projected
})
const hydratedDetails = reactive({})
const detailLoading = reactive({})
const detailErrors = reactive({})
const expandedRows = reactive({})
const expandedBatchFiles = reactive({})

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
    replaceReactiveFlags(expandedStages, saved.stages)
    replaceReactiveFlags(expandedBatches, saved.batches)
    replaceReactiveFlags(expandedRows, saved.rows)
    replaceReactiveFlags(expandedBatchFiles, saved.batchFiles)
  } catch {}
}
const persistExpansionState = () => {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(expansionStorageKey.value, JSON.stringify({
      transcriptExpanded: transcriptExpanded.value,
      requirementPlanExpanded: requirementPlanExpanded.value,
      stages: { ...expandedStages },
      batches: { ...expandedBatches },
      rows: { ...expandedRows },
      batchFiles: { ...expandedBatchFiles },
    }))
  } catch {}
}
watch(expansionStorageKey, restoreExpansionState)
watch([transcriptExpanded, requirementPlanExpanded, expandedStages, expandedBatches, expandedRows, expandedBatchFiles], persistExpansionState, { deep: true })

const eventTime = value => {
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : 0
}
const turnStartedAt = computed(() => eventTime(rows.value.find(event => event.eventType === 'turn_started')?.createdAt || rows.value[0]?.createdAt))
const turnEndedAt = computed(() => eventTime(resultEvent.value?.createdAt))
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

const completionFiles = computed(() => completionFileChangesForRows(rows.value))
const completionFilesExpanded = ref(false)
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
const completionSucceeded = computed(() => resultEvent.value?.display?.status === 'success')
const completionVerificationCount = computed(() => {
  const result = resultEvent.value?.result || {}
  const candidates = [result.verification, resultEvent.value?.evidenceIds, resultEvent.value?.detail?.verification]
  return candidates.reduce((count, value) => Math.max(count, Array.isArray(value) ? value.length : 0), 0)
})
const completionResultSummary = computed(() => {
  if (!isTerminal.value) return ''
  const status = String(resultEvent.value?.display?.status || '').toLowerCase()
  const files = completionFiles.value.length
  const failedVerification = Array.isArray(resultEvent.value?.result?.unfinished)
    ? resultEvent.value.result.unfinished.length
    : 0
  if (status === 'success') {
    const parts = []
    if (completionVerificationCount.value) parts.push('验证通过')
    if (files) parts.push(`修改 ${files} 个文件`)
    return parts.join(' · ')
  }
  if (files && failedVerification) return `已完成主要修改，${failedVerification} 项验证未通过`
  if (status === 'cancelled' || status === 'canceled') return '本轮已停止，未正式交付'
  if (status === 'interrupted') return '本轮已中断，未正式交付'
  return '本轮未通过验收，未正式交付'
})
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
  if (requirementPlan.value?.status === 'blocked' || resultEvent.value?.display?.status === 'failed') return '计划受阻'
  if (effectivePlanSteps.value.some(step => step.status === 'running')) return '正在执行'
  return '计划已就绪'
})
const planStepMark = step => step.status === 'completed' ? '✓' : step.status === 'blocked' ? '×' : step.status === 'running' ? '●' : step.status === 'skipped' ? '–' : '○'
const planScopeLabel = computed(() => (requirementPlan.value?.scope || []).slice(0, 4).join(' · '))
const stageLifecycleStatus = kind => {
  const stageRows = stageSourceRows.value.filter(event => inferredStageKind(event) === kind && event?.eventType !== 'assistant_progress')
  if (!stageRows.length) return 'pending'
  if (isTerminal.value && resultEvent.value?.display?.status === 'success') return 'completed'
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
      key: segment.progress?.detail?.progress?.batchId || segment.progress?.eventId || `progress-${index}`,
      label: parts.join(' · '),
      durationMs: presentation.durationMs || batchDuration(segment.rows),
      running: presentation.running,
    }
  })
})

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

const statusMark = event => {
  if (event?.display?.status === 'success') return '✓'
  if (event?.display?.status === 'failed') return '×'
  if (event?.display?.status === 'waiting') return '…'
  return '●'
}

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

const toolDisplayFor = event => hydratedDetails[event.eventId] || event?.detail?.toolDisplay || null
const isRowExpandable = event => !!(event?.detail && (
  toolDisplayFor(event)
  || event.detail.agentDisplay
  || event.detail.agentAttemptHistory?.length
  || event.detail.safeArguments
  || legacyResult(event.detail.safeResult)
  || event.detail.fileChanges?.length
  || event.detail.evidenceIds?.length
  || event.detail.runtimeObservation
  || (event.detail.usage && Object.keys(event.detail.usage).length)
))
const isRowExpanded = event => isRowExpandable(event) && expandedRows[event.eventId] === true
const toggleRow = event => {
  if (!isRowExpandable(event)) return
  expandedRows[event.eventId] = !expandedRows[event.eventId]
}

const legacyToolIdentity = event => {
  const raw = String(event?.toolName || event?.display?.title || 'Agent')
  const parts = raw.split('__').filter(Boolean)
  const operation = parts[0] === 'mcp' ? parts.at(-1) : raw
  const labels = {
    Read: '读取文件', read: '读取文件', read_file: '读取文件', FileRead: '读取文件',
    Glob: '查找文件', glob: '查找文件', glob_files: '查找文件',
    Grep: '搜索代码', grep: '搜索代码', grep_text: '搜索代码',
    list_directory: '查看目录', LS: '查看目录',
    find_definition: '查找定义', find_references: '查找引用', find_implementations: '查找实现',
    find_type_definition: '查找类型定义', find_incoming_calls: '查找调用方', find_outgoing_calls: '查找被调用项',
    read_code_diagnostics: '读取代码诊断', read_git_status: '检查 Git 状态', read_git_diff: '查看 Git 差异', read_git_history: '查看 Git 历史',
    shell_read_runtime_log: '读取项目日志', shell_read_runtime_logs: '读取项目日志',
    maven_build: '运行 Maven 构建', gradle_build: '运行 Gradle 构建', run_terminal: '运行项目命令',
  }
  const internalWorkspace = raw.startsWith('mcp__ccm__ccm_workspace_readonly__')
  return { label: labels[operation] || raw, serverLabel: parts[0] === 'mcp' && !internalWorkspace ? parts.at(-2) : '' }
}

const eventTitle = event => {
  if (String(event?.eventType || '').startsWith('agent_')) {
    const display = event?.detail?.agentDisplay
    if (display?.projectName) return [display.projectName, display.runtimeLabel].filter(Boolean).join(' · ')
    return event?.display?.title || 'Agent'
  }
  return toolDisplayFor(event)?.tool?.userLabel || toolDisplayFor(event)?.tool?.label || legacyToolIdentity(event).label
}
const eventBusinessSummary = event => {
  const projected = String(toolDisplayFor(event)?.result?.summary || '').trim()
  const fallback = String(event?.display?.summary || '').trim()
  const generic = /^(?:执行完成|工具执行完成|正在执行)$/
  if (projected && !generic.test(projected)) return projected
  return generic.test(fallback) ? '' : fallback
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

const displayValue = value => {
  if (value == null || value === '') return '—'
  if (typeof value === 'object') return safeJson(value)
  return String(value)
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

const rowEntries = row => {
  if (row == null) return []
  if (typeof row !== 'object') return [['', row]]
  return Object.entries(row).filter(([, value]) => value !== '' && value != null)
}

const batchFileRowsFor = event => {
  const rows = toolDisplayFor(event)?.result?.fileRows
  return Array.isArray(rows) ? rows : []
}
const batchFileKey = (event, file) => `${event?.eventId || 'tool'}:${String(file?.path || '')}`
const isBatchFileExpanded = (event, file) => expandedBatchFiles[batchFileKey(event, file)] === true
const toggleBatchFile = (event, file) => {
  const key = batchFileKey(event, file)
  expandedBatchFiles[key] = !expandedBatchFiles[key]
}
const batchFileRange = file => {
  const from = Math.max(1, Number(file?.from || file?.lines?.[0]?.line || 1))
  const to = Math.max(from, Number(file?.to || file?.lines?.at?.(-1)?.line || from))
  return from === to ? `第 ${from} 行` : `第 ${from}–${to} 行`
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
  if (previousResult?.continuation?.kind !== 'read_files') return current
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
  return {
    ...current,
    result: {
      ...currentResult,
      total,
      rows: [...rowsByPath.values()],
      fileRows: mergeBatchFileRows(previousResult.fileRows, currentResult.fileRows),
      truncated: pendingCount > 0,
      summary: `已读取 ${total} 个文件${pendingCount ? `，其中 ${pendingCount} 个文件仍有内容未读完` : '，所有文件均已读完'}`,
    },
  }
}

const rehydrateDetail = async (event, continueRead = false) => {
  if (detailLoading[event.eventId]) return
  detailLoading[event.eventId] = true
  detailErrors[event.eventId] = ''
  try {
    const query = new URLSearchParams({
      scope: String(event.scope || ''),
      scope_id: String(event.scopeId || ''),
      exact_session_id: String(event.exactSessionId || ''),
    })
    const previousDetail = toolDisplayFor(event)
    const continuation = previousDetail?.result?.continuation
    const response = await fetch(`/api/agent-execution/events/${encodeURIComponent(event.eventId)}/detail?${query}`, {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(continueRead && continuation ? { continue: true, continuation } : {}),
    })
    const payload = await response.json()
    if (!response.ok || payload.success === false) {
      if (payload.freshness && event?.detail?.toolDisplay) {
        hydratedDetails[event.eventId] = {
          ...event.detail.toolDisplay,
          result: { ...(event.detail.toolDisplay.result || {}), freshness: payload.freshness },
        }
      }
      throw new Error(payload.error || '读取当前详情失败')
    }
    hydratedDetails[event.eventId] = continueRead
      ? mergeBatchReadDetail(previousDetail, payload.toolDisplay)
      : payload.toolDisplay
  } catch (error) {
    detailErrors[event.eventId] = error?.message || '读取当前详情失败'
  } finally {
    detailLoading[event.eventId] = false
  }
}

const rowMeta = event => {
  const liveDuration = longRunningToolDuration(event, { now: now.value, terminalAt: terminalAt.value })
  return [
  event?.display?.toolUseCount ? `${event.display.toolUseCount} tool uses` : '',
  event?.display?.tokenCount
    ? `${event.display.tokenType === 'provider_total' ? '本轮' : event.eventType?.startsWith('tool_') ? '结果' : ''}${event.display.tokenAccuracy === 'reported' ? '' : '约'} ${event.display.tokenCount} tokens`.trim()
    : '',
  liveDuration ? `仍在运行 · ${formatExecutionDuration(liveDuration)}` : formatExecutionDuration(event?.display?.durationMs) ? `耗时 ${formatExecutionDuration(event.display.durationMs)}` : '',
].filter(Boolean).join(' · ')
}

const liveRowLabel = event => {
  const title = eventTitle(event)
  if (String(event?.eventType || '').startsWith('agent_')) return title
  const status = String(event?.display?.status || 'running')
  const duration = formatExecutionDuration(event?.display?.durationMs)
  if (status === 'success') return duration ? `已在 ${duration} 内完成 ${title}` : `已完成 ${title}`
  if (status === 'failed') return `${title}运行失败`
  if (status === 'waiting') return `${title}正在等待`
  return `正在运行 ${title}`
}

const liveRowMeta = event => {
  const liveDuration = longRunningToolDuration(event, { now: now.value, terminalAt: terminalAt.value })
  if (liveDuration) return `已运行 ${formatExecutionDuration(liveDuration)}`
  if (String(event?.eventType || '').startsWith('agent_')) return rowMeta(event)
  return ''
}

const searchableText = event => [
  eventTitle(event), event?.display?.target, eventBusinessSummary(event), eventStatusLabel(event),
  event?.detail?.agentDisplay?.projectName, event?.detail?.agentDisplay?.workItemTitle,
  ...(event?.detail?.fileChanges || []).map(file => typeof file === 'string' ? file : file?.path),
  event?.display?.summary,
].filter(Boolean).join(' ').toLowerCase()
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
  <div v-if="hasProgressFlow && !stageMode && (!isTerminal || transcriptExpanded)" class="cc-progress-flow" aria-label="Agent 进度说明">
    <div v-for="segment in progressSegments" :key="segment.key" class="cc-progress-segment" :class="{ current: segment.progress?.eventId === currentProgressEventId, completed: segment.progress?.eventId !== currentProgressEventId }">
      <p v-if="progressText(segment.progress)" class="cc-progress-text">{{ progressText(segment.progress) }}</p>
      <button v-if="segment.label" type="button" class="cc-progress-batch" :aria-expanded="transcriptExpanded" @click="toggleTranscript">
        <span class="cc-progress-batch-icon">⌘</span>
        <span>{{ segment.label }}</span>
        <small v-if="segment.durationMs">{{ formatExecutionDuration(segment.durationMs) }}</small>
        <span class="cc-progress-batch-chevron">{{ transcriptExpanded ? '⌃' : '⌄' }}</span>
      </button>
    </div>
  </div>

  <section v-if="presentation === 'completed' && completionFiles.length" class="cc-completion-files" :class="{ warning: !completionSucceeded }" aria-label="本轮文件变化">
    <header class="cc-completion-files-head">
      <span class="cc-completion-files-icon">⊞</span>
      <div>
        <strong>{{ completionFileTitle }}</strong>
        <small v-if="completionFileTotals.hasStats">
          <span class="additions">+{{ completionFileTotals.additions }}</span>
          <span class="deletions">-{{ completionFileTotals.deletions }}</span>
        </small>
      </div>
      <button type="button" class="cc-completion-review" @click="openAllFileChanges">审核</button>
    </header>
    <div class="cc-completion-file-list">
      <button v-for="file in completionFilesVisible" :key="`${file.project}|${file.path}`" type="button" class="cc-completion-file-row" @click="openFileChange(file, resultEvent)">
        <span class="cc-completion-file-path"><small v-if="file.project">{{ file.project }} / </small>{{ file.path }}</span>
        <span v-if="Number.isFinite(Number(file.additions)) || Number.isFinite(Number(file.deletions))" class="cc-completion-file-delta">
          <span v-if="Number.isFinite(Number(file.additions))" class="additions">+{{ file.additions }}</span>
          <span v-if="Number.isFinite(Number(file.deletions))" class="deletions">-{{ file.deletions }}</span>
        </span>
        <span v-else class="cc-completion-file-status">{{ file.deleted ? '已删除' : file.binary ? '二进制' : file.status || '已修改' }}</span>
      </button>
    </div>
    <button v-if="completionFiles.length > 3" type="button" class="cc-completion-files-more" @click="toggleCompletionFiles">
      {{ completionFilesExpanded ? '收起文件列表' : `显示其余 ${completionFileRemainder} 个文件` }} {{ completionFilesExpanded ? '⌃' : '⌄' }}
    </button>
    <button v-if="completionFiles.length > 40 && completionFilesExpanded" type="button" class="cc-completion-files-all" @click="openAllFileChanges">查看全部 {{ completionFiles.length }} 个文件</button>
  </section>

  <section v-if="shouldRender && (hasExecutionRows || assistantProgressRows.length || transcriptExpanded) && (!hasProgressFlow || stageMode || transcriptExpanded)" class="cc-execution" :class="{ complete: isTerminal, expanded: transcriptExpanded, live: isLivePresentation }" :aria-label="isLivePresentation ? 'Agent 实时执行进度' : '执行记录'">
    <button v-if="isTerminal" class="cc-execution-head" type="button" @click="toggleTranscript">
      <span class="cc-execution-chevron">{{ transcriptExpanded ? '⌄' : '›' }}</span>
      <strong>执行记录</strong>
      <span :class="['cc-execution-result-mark', completionSucceeded ? 'success' : 'warning']" aria-hidden="true">{{ completionSucceeded ? '✓' : '!' }}</span>
      <span class="cc-execution-summary">{{ completionResultSummary }}</span>
      <span v-if="totalDurationLabel" class="cc-execution-duration">{{ totalDurationLabel }}</span>
    </button>
    <div v-if="isTerminal && transcriptExpanded && (recoveryMilestone || replayTarget)" class="cc-execution-meta">
      <p v-if="recoveryMilestone" class="cc-recovery-milestone">{{ recoveryMilestone }}</p>
      <button v-if="replayTarget" type="button" class="cc-execution-replay-link" @click="openReplay">在任务回放中查看</button>
    </div>

    <div v-if="!compacted" class="cc-execution-rows">
      <div v-if="resultEvent && timingItems.length" class="cc-execution-timing" aria-label="本轮耗时统计">
        <span v-for="([label, value]) in timingItems" :key="label"><small>{{ label }}</small>{{ formatExecutionDuration(value) }}</span>
      </div>
      <div v-if="transcriptExpanded" class="cc-execution-search" role="search">
        <span>⌕</span>
        <input v-model="searchQuery" type="search" placeholder="搜索工具、项目、文件或失败原因" @keydown="onSearchKeydown" />
        <small v-if="normalizedSearchQuery">{{ searchMatches.length }} 个匹配</small>
        <button v-if="searchMatches.length" type="button" title="上一个匹配" @click="focusSearchMatch(-1)">↑</button>
        <button v-if="searchMatches.length" type="button" title="下一个匹配" @click="focusSearchMatch(1)">↓</button>
        <button v-if="normalizedSearchQuery" type="button" title="清除搜索" @click="searchQuery = ''">×</button>
      </div>
      <template v-for="event in executionStageRows" :key="event.key || event.eventId">
      <button
        v-if="event.__stageHeader"
        v-show="stageMatchesSearch(event.kind)"
        type="button"
        class="cc-execution-stage-head"
        :class="{ active: event.active, completed: event.status === '完成', failed: event.status === '失败' }"
        :aria-expanded="stageIsExpanded(event)"
        @click="toggleStage(event)"
      >
        <span class="cc-execution-stage-marker" aria-hidden="true">{{ event.status === '完成' ? '✓' : event.status === '失败' ? '!' : '●' }}</span>
        <span class="cc-execution-stage-copy">
          <strong>{{ event.label }}</strong>
          <small>{{ event.summary }}</small>
        </span>
        <em>{{ event.status }}</em>
        <span v-if="event.durationMs">{{ formatExecutionDuration(event.durationMs) }}</span>
        <span class="cc-execution-stage-chevron">{{ stageIsExpanded(event) ? '⌃' : '⌄' }}</span>
      </button>
      <section
        v-else-if="event.__progressBatch"
        v-show="batchMatchesSearch(event)"
        class="cc-progress-batch-group stage-child"
        :class="{ current: event.progress?.eventId === currentProgressEventId, completed: event.progress?.eventId !== currentProgressEventId }"
        :aria-current="event.progress?.eventId === currentProgressEventId ? 'step' : undefined"
      >
        <p class="cc-execution-stage-progress">{{ progressText(event.progress) }}</p>
        <button v-if="event.children.length" type="button" class="cc-progress-batch-head" :aria-expanded="batchIsExpanded(event)" @click="toggleBatch(event)">
          <span>{{ batchIsExpanded(event) ? '⌄' : '›' }}</span>
          <strong>{{ event.presentation?.label || '工具批次' }}</strong>
          <small>{{ event.presentation?.count || event.children.length }} 项<span v-if="event.presentation?.failed"> · {{ event.presentation.failed }} 项失败</span><span v-if="event.presentation?.durationMs || event.durationMs"> · {{ formatExecutionDuration(event.presentation?.durationMs || event.durationMs) }}</span></small>
        </button>
      </section>
      <article v-else-if="event.__requirementPlan" class="cc-requirement-plan" :class="requirementPlan?.status || 'ready'">
        <button type="button" class="cc-requirement-plan-head" :aria-expanded="planIsExpanded" @click="toggleRequirementPlan">
          <span class="cc-requirement-plan-icon">▤</span>
          <span class="cc-requirement-plan-title">
            <strong>{{ isLivePresentation ? `${requirementPlan?.title || '实施计划'} · ${effectivePlanSteps.length}步` : requirementPlan?.title || '需求实施计划' }}</strong>
            <small>根据你的需求和现有项目整理 · 版本 {{ requirementPlan?.revision || 1 }}</small>
          </span>
          <span class="cc-requirement-plan-status">{{ planStatusLabel }}</span>
          <span class="cc-requirement-plan-chevron">{{ planIsExpanded ? '⌃' : '⌄' }}</span>
        </button>
        <div v-if="planIsExpanded" class="cc-requirement-plan-body">
          <div class="cc-requirement-plan-main">
            <section>
              <h4>目标</h4>
              <p>{{ requirementPlan?.goal }}</p>
            </section>
            <section>
              <h4>接下来会这样处理</h4>
              <ol class="cc-requirement-plan-steps">
                <li v-for="(step, stepIndex) in effectivePlanSteps" :key="step.id || stepIndex" :class="step.status">
                  <span class="cc-requirement-step-mark">{{ planStepMark(step) }}</span>
                  <div>
                    <strong>{{ step.title }}</strong>
                    <p v-if="step.description && step.description !== step.title">{{ step.description }}</p>
                    <small v-if="step.outcome">完成后：{{ step.outcome }}</small>
                  </div>
                  <span v-if="step.project" class="cc-requirement-step-project">{{ step.project }}</span>
                </li>
              </ol>
            </section>
          </div>
          <aside class="cc-requirement-plan-side">
            <section v-if="planScopeLabel"><h4>涉及范围</h4><p>{{ planScopeLabel }}</p></section>
            <section v-if="requirementPlan?.expectedResults?.length"><h4>预期结果</h4><ul><li v-for="item in requirementPlan.expectedResults" :key="item">{{ item }}</li></ul></section>
            <section v-if="requirementPlan?.exclusions?.length"><h4>本次不包含</h4><ul><li v-for="item in requirementPlan.exclusions" :key="item">{{ item }}</li></ul></section>
            <section v-if="requirementPlanHistory.length"><h4>计划历史</h4><p>此前还有 {{ requirementPlanHistory.length }} 个版本，可在技术详情中回看。</p></section>
          </aside>
        </div>
        <footer v-if="planIsExpanded" class="cc-requirement-plan-foot">
          <span>{{ effectivePlanSteps.length }} 个实施步骤 · {{ requirementPlan?.expectedResults?.length || 0 }} 项预期结果</span>
          <button type="button" @click="toggleRequirementPlan">收起计划⌃</button>
        </footer>
      </article>
      <p v-else-if="event.eventType === 'assistant_progress'" v-show="!normalizedSearchQuery || searchableText(event).includes(normalizedSearchQuery)" class="cc-execution-stage-progress" :class="{ current: event.eventId === currentProgressEventId }" :aria-current="event.eventId === currentProgressEventId ? 'step' : undefined">{{ progressText(event) }}</p>
      <article
        v-else
        v-show="eventMatchesSearch(event)"
        class="cc-execution-row"
        :class="[event.display?.status || 'running', { 'stage-child': event.__stageChild, 'batch-child': event.__batchChild, 'agent-child': event.__agentChild, current: isCurrentEvent(event), completed: event.display?.status === 'success' }]"
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
          <span class="cc-execution-mark">{{ statusMark(event) }}</span>
          <div class="cc-execution-main">
            <div class="cc-execution-title">
              <strong>{{ isLivePresentation ? liveRowLabel(event) : eventTitle(event) }}</strong>
              <code v-if="event.display?.target" :title="event.display.target">{{ event.display.target }}</code>
              <span v-if="!isLivePresentation">{{ eventStatusLabel(event) }}</span>
            </div>
            <p v-if="eventBusinessSummary(event) && (!isLivePresentation || String(event?.eventType || '').startsWith('agent_'))">{{ eventBusinessSummary(event) }}</p>
            <small v-if="isLivePresentation ? liveRowMeta(event) : rowMeta(event)">{{ isLivePresentation ? liveRowMeta(event) : rowMeta(event) }}</small>
          </div>
          <span v-if="isRowExpandable(event)" class="cc-execution-row-chevron">{{ isRowExpanded(event) ? '⌃' : '⌄' }}</span>
        </button>
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
              <div v-if="event.detail.agentAttemptHistory?.length">
                <b>历史尝试</b>
                <ul><li v-for="attempt in event.detail.agentAttemptHistory" :key="attempt.attempt">第 {{ attempt.attempt }} 次 · {{ attempt.summary || attempt.status }}</li></ul>
              </div>
              <div v-if="legacyResult(event.detail.safeResult)">
                <b>当前回执</b>
                <pre>{{ safeJson(legacyResult(event.detail.safeResult)) }}</pre>
              </div>
            </template>
            <template v-else-if="toolDisplayFor(event)">
              <div class="cc-tool-identity">
                <b>{{ toolDisplayFor(event).tool?.userLabel || toolDisplayFor(event).tool?.label || event.display?.title }}</b>
                <span v-if="toolDisplayFor(event).tool?.serverLabel">扩展服务 · {{ toolDisplayFor(event).tool.serverLabel }}</span>
              </div>
              <div v-if="toolDisplayFor(event).sensitiveCommand" class="cc-tool-command-detail">
                <b>脱敏命令</b>
                <pre>{{ toolDisplayFor(event).sensitiveCommand }}</pre>
              </div>
              <div v-if="toolDisplayFor(event).arguments?.length">
                <b>参数</b>
                <dl class="cc-tool-arguments">
                  <template v-for="argument in toolDisplayFor(event).arguments" :key="argument.label">
                    <dt>{{ argument.label }}</dt><dd>{{ displayValue(argument.value) }}</dd>
                  </template>
                </dl>
              </div>
              <div class="cc-tool-result">
                <b>结果</b>
                <p>{{ toolDisplayFor(event).result?.summary || '工具执行完成' }}</p>
                <p v-if="toolDisplayFor(event).result?.freshness === 'drifted'" class="cc-tool-freshness warning">当前内容已变化，下面展示的是重新读取的新版本；原执行结论摘要仍保留在上方。</p>
                <p v-else-if="toolDisplayFor(event).result?.freshness === 'deleted'" class="cc-tool-freshness danger">权威来源已删除，当前详情不可读取。</p>
                <p v-else-if="toolDisplayFor(event).result?.freshness === 'permission_revoked'" class="cc-tool-freshness danger">当前权限已撤销，无法重新读取详情。</p>
                <p v-else-if="toolDisplayFor(event).result?.freshness === 'current'" class="cc-tool-freshness current">当前结果与权威来源一致。</p>
                <dl v-if="toolDisplayFor(event).result?.searchExecution" class="cc-tool-arguments cc-search-execution-detail">
                  <dt>搜索引擎</dt><dd>{{ toolDisplayFor(event).result.searchExecution.engine === 'bundled_rg' ? 'CCM 内置搜索' : toolDisplayFor(event).result.searchExecution.engine === 'system_rg' ? '系统搜索' : '兼容搜索' }}</dd>
                  <dt>结果状态</dt><dd>{{ toolDisplayFor(event).result.searchExecution.cancelled ? '已取消，保留部分结果' : toolDisplayFor(event).result.searchExecution.timedOut ? '已超时，保留部分结果' : toolDisplayFor(event).result.searchExecution.partial ? '部分结果' : '完整结果' }}</dd>
                </dl>
                <div v-if="batchFileRowsFor(event).length" class="cc-batch-file-list">
                  <article v-for="file in batchFileRowsFor(event)" :key="file.path" class="cc-batch-file-item" :class="{ expanded: isBatchFileExpanded(event, file), partial: file.status === 'partial' }">
                    <button
                      type="button"
                      class="cc-batch-file-toggle"
                      :aria-expanded="isBatchFileExpanded(event, file)"
                      @click.stop="toggleBatchFile(event, file)"
                    >
                      <span class="cc-batch-file-status" aria-hidden="true">{{ file.status === 'partial' ? '•' : file.status === 'unchanged' ? '↺' : '✓' }}</span>
                      <span class="cc-batch-file-title">
                        <span><strong>读取文件</strong> <code>{{ file.path }}</code></span>
                        <small>读取 {{ file.path }} {{ batchFileRange(file) }}<span v-if="file.totalLines"> · 共 {{ file.totalLines }} 行</span></small>
                      </span>
                      <span class="cc-batch-file-state">{{ file.status === 'partial' ? '部分读取' : file.status === 'unchanged' ? '内容未变化' : '完成' }}</span>
                      <span class="cc-batch-file-chevron" aria-hidden="true">{{ isBatchFileExpanded(event, file) ? '⌃' : '⌄' }}</span>
                    </button>
                    <div v-if="isBatchFileExpanded(event, file)" class="cc-batch-file-detail">
                      <div class="cc-batch-file-detail-head">
                        <span>{{ file.path }}</span>
                        <span>{{ batchFileRange(file) }}</span>
                      </div>
                      <div v-if="file.lines?.length" class="cc-batch-file-lines" role="region" :aria-label="`${file.path} 已读取内容`">
                        <div v-for="line in file.lines" :key="line.line" class="cc-batch-file-line">
                          <span>line {{ line.line }}</span><code>{{ line.text || ' ' }}</code>
                        </div>
                      </div>
                      <p v-else class="cc-batch-file-empty">{{ file.status === 'unchanged' ? '文件内容未变化，主 Agent继续使用当前上下文中的已读内容。' : '该文件本次没有可显示的文本内容。' }}</p>
                      <small v-if="file.status === 'partial'" class="cc-batch-file-pending">该文件尚未读完，可在批次底部继续读取剩余内容。</small>
                    </div>
                  </article>
                </div>
                <div v-else-if="toolDisplayFor(event).result?.rows?.length" class="cc-tool-result-rows">
                  <div v-for="(row, rowIndex) in toolDisplayFor(event).result.rows" :key="rowIndex" class="cc-tool-result-row">
                    <span v-for="([label, value], valueIndex) in rowEntries(row)" :key="`${label}-${valueIndex}`">
                      <small v-if="label">{{ label }}</small>{{ displayValue(value) }}
                    </span>
                  </div>
                </div>
                <pre v-if="toolDisplayFor(event).result?.preview">{{ toolDisplayFor(event).result.preview }}</pre>
                <small v-if="toolDisplayFor(event).result?.continuation?.pendingCount">{{ toolDisplayFor(event).result.continuation.pendingCount }} 个文件仍有内容未读完</small>
                <small v-else-if="toolDisplayFor(event).result?.truncated">结果已截断<span v-if="toolDisplayFor(event).result?.total"> · 共 {{ toolDisplayFor(event).result.total }} 项</span></small>
                <button v-if="toolDisplayFor(event).result?.rehydratable" type="button" class="cc-tool-rehydrate" :disabled="detailLoading[event.eventId]" @click.stop="rehydrateDetail(event, !!toolDisplayFor(event).result?.continuation?.pendingCount)">
                  {{ detailLoading[event.eventId] ? '正在读取…' : toolDisplayFor(event).result?.continuation?.pendingCount ? '继续读取未读完内容' : '读取当前详情' }}
                </button>
                <small v-if="detailErrors[event.eventId]" class="cc-tool-detail-error">{{ detailErrors[event.eventId] }}</small>
              </div>
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
            <div v-if="event.detail.fileChanges?.length">
              <b>文件变化</b>
              <ul class="cc-file-changes">
                <li v-for="file in event.detail.fileChanges" :key="normalizedFileChange(file, event).path">
                  <button type="button" @click.stop="openFileChange(file, event)">
                    <span>{{ normalizedFileChange(file, event).path }}</span>
                    <small v-if="fileChangeStat(file)" :class="{ 'has-deletions': Number(file?.deletions ?? file?.diff?.deletions ?? 0) > 0 }">{{ fileChangeStat(file) }}</small>
                    <span class="cc-file-change-open">查看 Diff ›</span>
                  </button>
                </li>
              </ul>
            </div>
            <details v-if="event.detail.runtimeObservation" class="cc-runtime-observation">
              <summary>运行时技术详情</summary>
              <dl class="cc-tool-arguments">
                <dt>来源</dt><dd>{{ event.detail.runtimeObservation.source }}</dd>
                <dt>可信度</dt><dd>{{ event.detail.runtimeObservation.confidence }}</dd>
                <template v-if="event.detail.runtimeObservation.runtime"><dt>运行时</dt><dd>{{ event.detail.runtimeObservation.runtime }} {{ event.detail.runtimeObservation.runtimeVersion || '' }}</dd></template>
                <dt>事件校验</dt><dd>{{ event.detail.runtimeObservation.sourceEventChecksum }}</dd>
              </dl>
            </details>
            <div v-if="event.detail.evidenceIds?.length">
              <b>Evidence</b>
              <code>{{ event.detail.evidenceIds.join(' · ') }}</code>
            </div>
            <div v-if="event.detail.usage && Object.keys(event.detail.usage).length">
              <b>Usage</b>
              <pre>{{ safeJson(event.detail.usage) }}</pre>
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
    </div>
  </section>
  </div>
</template>

<style scoped>
.cc-execution {
  width: 100%;
  margin: 0 0 10px;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 38%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 24%, transparent);
  border-radius: 0;
  background: transparent;
  overflow: hidden;
}
.cc-execution.live { border-color: transparent; border-radius: 0; background: transparent; }
.cc-execution.live .cc-execution-rows { border-top: 0; padding-top: 0; }
.cc-execution-anchor { width: 100%; min-width: 0; }
.cc-execution-anchor:empty { height: 0; }
.cc-live-execution-status { display: flex; align-items: center; gap: 7px; margin: 0 0 9px; padding: 0 1px 8px; border-bottom: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 24%, transparent); color: var(--text-muted); font-size: 11px; line-height: 1.4; }
.cc-live-execution-status strong { min-width: 0; overflow: hidden; color: var(--text-secondary); font-size: 11px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
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
.cc-execution-head:hover { background: rgba(100, 116, 139, 0.035); }
.cc-execution-head:focus-visible,
.cc-execution-row-summary:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 72%, transparent); outline-offset: -2px; }
.cc-execution-head strong { color: var(--text-primary); font-size: 12px; }
.cc-execution-chevron { color: var(--text-muted); font-size: 15px; line-height: 1; text-align:center; }
.cc-execution-result-mark { width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:var(--text-muted); background:rgba(100,116,139,.09); font-size:9px; font-weight:800; }
.cc-execution-result-mark.success { color:#15803d; background:rgba(34,197,94,.11); }
.cc-execution-result-mark.warning { color:#b45309; background:rgba(245,158,11,.13); }
.cc-execution-summary { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.cc-execution-meta { display:flex; align-items:center; flex-wrap:wrap; gap:7px 14px; padding:0 2px 8px 50px; }
.cc-execution-replay-link { display:block; margin:0; padding:0; border:0; background:transparent; color:var(--accent-blue); font-size:10px; font-weight:750; cursor:pointer; }
.cc-execution-replay-link:hover { text-decoration:underline; }
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
.cc-requirement-plan-body { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(220px, 0.72fr); border-top: 1px solid rgba(148, 163, 184, 0.09); }
.cc-requirement-plan-main, .cc-requirement-plan-side { min-width: 0; padding: 11px; }
.cc-requirement-plan-main { border-right: 1px solid rgba(148, 163, 184, 0.12); }
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
.cc-requirement-plan-foot button { padding: 2px 0; border: 0; color: var(--primary-color, #ec4899); background: transparent; font-size: 8px; cursor: pointer; }
.cc-execution-stage-head { position:relative; width: calc(100% - 4px); display: grid; grid-template-columns: 20px minmax(0, 1fr) auto auto 20px; align-items: center; gap: 8px; margin:0 2px; padding: 9px 0; border: 0; color: var(--text-secondary); background: transparent; text-align: left; cursor: pointer; }
.cc-execution-stage-head:not(:first-child) { margin-top: 0; border-top: 1px solid rgba(100, 116, 139, 0.075); }
.cc-execution-stage-head:hover { background: rgba(100, 116, 139, 0.025); }
.cc-execution-stage-head.active { color: var(--text-primary); background: transparent; box-shadow: none; }
.cc-execution-stage-head:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 72%, transparent); outline-offset: -2px; }
.cc-execution-stage-marker { width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:var(--text-muted); background:rgba(100,116,139,.09); font-size:9px; font-weight:800; }
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
.cc-progress-batch-group { margin-left: 31px; border-left: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 28%, transparent); }
.cc-progress-batch-group.completed { opacity: 0.72; }
.cc-progress-batch-group.current { opacity: 1; border-left-color: color-mix(in srgb, var(--primary-color, #ec4899) 70%, transparent); background: color-mix(in srgb, var(--primary-color, #ec4899) 3%, transparent); }
.cc-progress-batch-group .cc-execution-stage-progress { margin-left: 13px; }
.cc-progress-batch-head { display: flex; align-items: center; gap: 7px; margin: 0 8px 5px 12px; padding: 4px 1px; border: 0; border-radius: 4px; color: var(--text-secondary); background: transparent; cursor: pointer; }
.cc-progress-batch-head:hover { background:rgba(100,116,139,.035); }
.cc-progress-batch-head strong { font-size: 10px; }
.cc-progress-batch-head small { color: var(--text-muted); font-size: 9px; }
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
.cc-execution-row.batch-child { margin-left: 48px; }
.cc-execution-row.completed { opacity: 0.7; }
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
.cc-file-changes button:hover { border-color: color-mix(in srgb, var(--primary-color, #ec4899) 55%, transparent); background: color-mix(in srgb, var(--primary-color, #ec4899) 7%, transparent); }
.cc-file-changes button:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 70%, transparent); outline-offset: 1px; }
.cc-file-changes button > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 10px/1.4 Consolas, monospace; }
.cc-file-changes small { color: #059669; font: 10px/1.4 Consolas, monospace; white-space: nowrap; }
.cc-file-changes small.has-deletions { color: #b45309; }
.cc-file-change-open { color: var(--primary-color, #ec4899); font-size: 10px; white-space: nowrap; }
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
.cc-batch-file-list { display: grid; gap: 2px; margin-top: 6px; border-top: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 28%, transparent); }
.cc-batch-file-item { overflow: hidden; border-bottom: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 22%, transparent); }
.cc-batch-file-toggle { width: 100%; display: grid; grid-template-columns: 18px minmax(0, 1fr) auto 18px; align-items: center; gap: 8px; padding: 8px 4px; border: 0; color: var(--text-primary); background: transparent; text-align: left; cursor: pointer; }
.cc-batch-file-toggle:hover { background: color-mix(in srgb, var(--primary-color, #2563eb) 5%, transparent); }
.cc-batch-file-toggle:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #2563eb) 65%, transparent); outline-offset: -2px; }
.cc-batch-file-status { width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: #15803d; background: rgba(34, 197, 94, 0.11); font-size: 10px; font-weight: 700; }
.cc-batch-file-item.partial .cc-batch-file-status { color: #2563eb; background: rgba(37, 99, 235, 0.1); font-size: 16px; }
.cc-batch-file-title { min-width: 0; display: grid; gap: 2px; }
.cc-batch-file-title > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.cc-batch-file-title strong { margin-right: 5px; font-size: 11px; }
.cc-batch-file-title code { color: var(--text-muted); font: 10px/1.4 Consolas, monospace; }
.cc-batch-file-title small { overflow: hidden; color: var(--text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.cc-batch-file-state { color: var(--text-muted); font-size: 10px; white-space: nowrap; }
.cc-batch-file-item.partial .cc-batch-file-state { color: #2563eb; }
.cc-batch-file-chevron { color: var(--text-muted); font-size: 10px; text-align: center; }
.cc-batch-file-detail { margin: 0 4px 8px 26px; padding: 8px; border-radius: 7px; background: color-mix(in srgb, var(--surface-subtle, #f8fafc) 82%, transparent); }
.cc-batch-file-detail-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 6px; color: var(--text-muted); font: 10px/1.4 Consolas, monospace; }
.cc-batch-file-lines { max-height: 300px; overflow: auto; border-radius: 5px; background: color-mix(in srgb, var(--surface, #fff) 84%, transparent); }
.cc-batch-file-line { display: grid; grid-template-columns: 64px minmax(0, 1fr); min-height: 22px; border-bottom: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 14%, transparent); }
.cc-batch-file-line:last-child { border-bottom: 0; }
.cc-batch-file-line > span { padding: 4px 7px; color: var(--text-muted); background: rgba(100, 116, 139, 0.045); font: 9px/1.5 Consolas, monospace; user-select: none; }
.cc-batch-file-line code { padding: 4px 8px; white-space: pre; overflow-wrap: normal; color: var(--text-secondary); font: 10px/1.5 Consolas, monospace; }
.cc-batch-file-empty { margin: 0 !important; color: var(--text-muted) !important; font-size: 10px !important; }
.cc-batch-file-pending { display: block; margin-top: 7px; color: #2563eb; font-size: 10px; }
.cc-tool-rehydrate { margin-top: 6px; padding: 3px 8px; border: 1px solid rgba(100, 116, 139, 0.25); border-radius: 5px; color: var(--text-secondary); background: transparent; font-size: 10px; cursor: pointer; }
.cc-tool-rehydrate:hover:not(:disabled) { background: rgba(100, 116, 139, 0.08); }
.cc-tool-rehydrate:disabled { opacity: 0.55; cursor: wait; }
.cc-tool-detail-error { color: #dc2626 !important; }
.cc-tool-freshness { padding: 6px 8px; border-radius: 6px; font-size: 10px !important; }
.cc-tool-freshness.current { color: #15803d; background: rgba(34, 197, 94, 0.1); }
.cc-tool-freshness.warning { color: #b45309; background: rgba(245, 158, 11, 0.11); }
.cc-tool-freshness.danger { color: #b91c1c; background: rgba(239, 68, 68, 0.1); }
.cc-execution-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 10px 8px 35px; }
.cc-execution-actions button { padding: 4px 8px; border: 1px solid rgba(148, 163, 184, 0.24); border-radius: 6px; color: var(--text-secondary); background: transparent; font-size: 10px; cursor: pointer; }
.cc-execution-actions button:hover:not(:disabled) { border-color: color-mix(in srgb, var(--primary-color, #ec4899) 55%, transparent); color: var(--text-primary); background: color-mix(in srgb, var(--primary-color, #ec4899) 7%, transparent); }
.cc-execution-actions button:disabled { opacity: 0.45; cursor: not-allowed; }
.cc-completion-files { width: 100%; margin: 5px 0 9px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 42%, transparent); border-radius: 9px; background: color-mix(in srgb, var(--surface-subtle, #f8fafc) 88%, transparent); }
.cc-completion-files.warning { border-color: color-mix(in srgb, #d97706 42%, transparent); }
.cc-completion-files-head { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid rgba(100, 116, 139, 0.12); }
.cc-completion-files-icon { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 7px; color: var(--text-secondary); background: rgba(100, 116, 139, 0.09); font-size: 16px; }
.cc-completion-files-head > div { min-width: 0; display: grid; gap: 2px; }
.cc-completion-files-head strong { color: var(--text-primary); font-size: 12px; }
.cc-completion-files-head small { display: flex; gap: 6px; font-size: 10px; }
.additions { color: #16a34a; }
.deletions { color: #dc2626; }
.cc-completion-review { padding: 5px 9px; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 55%, transparent); border-radius: 6px; color: var(--text-primary); background: transparent; font-size: 10px; cursor: pointer; }
.cc-completion-review:hover { background: rgba(100, 116, 139, 0.07); }
.cc-completion-review:focus-visible,
.cc-completion-file-row:focus-visible,
.cc-completion-files-more:focus-visible,
.cc-completion-files-all:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary-color, #ec4899) 72%, transparent); outline-offset: -2px; }
.cc-completion-file-list { display: grid; }
.cc-completion-file-row { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 7px 12px; border: 0; border-bottom: 1px solid rgba(100, 116, 139, 0.08); color: var(--text-secondary); background: transparent; text-align: left; cursor: pointer; }
.cc-completion-file-row:hover { background: rgba(100, 116, 139, 0.055); }
.cc-completion-file-path { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.cc-completion-file-path small { color: var(--text-muted); font-size: 9px; }
.cc-completion-file-delta { display: inline-flex; gap: 3px; white-space: nowrap; font-size: 10px; }
.cc-completion-file-status { color: var(--text-muted); font-size: 9px; white-space: nowrap; }
.cc-completion-files-more,
.cc-completion-files-all { padding: 8px 12px; border: 0; color: var(--text-muted); background: transparent; font-size: 10px; cursor: pointer; text-align: left; }
.cc-completion-files-all { float: right; }

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
.cc-execution.live .cc-progress-batch-group.completed { opacity: 0.72; }
.cc-execution.live .cc-progress-batch-group.current { border-left: 0; background: transparent; }
.cc-execution.live .cc-progress-batch-group .cc-execution-stage-progress { margin-left: 0; }
.cc-execution.live .cc-progress-batch-head { width: calc(100% - 2px); display: grid; grid-template-columns: 13px minmax(0, 1fr) auto; gap: 7px; margin: 0; padding: 4px 1px; border-radius: 4px; background: transparent; text-align: left; }
.cc-execution.live .cc-progress-batch-head:hover { background: rgba(100, 116, 139, 0.055); }
.cc-execution.live .cc-progress-batch-head strong { overflow: hidden; color: var(--text-secondary); font-size: 10px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.cc-execution.live .cc-progress-batch-head small { font-size: 9px; white-space: nowrap; }
.cc-execution.live .cc-execution-row.stage-child { margin-left: 20px; border-left: 0; }
.cc-execution.live .cc-execution-row.batch-child { margin-left: 20px; }
.cc-execution.live .cc-execution-row.agent-child { margin-left: 38px; }
.cc-execution.live .cc-execution-row + .cc-execution-row { border-top: 0; }
.cc-execution.live .cc-execution-row-summary { grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; min-height: 30px; gap: 6px; padding: 4px 1px; border-radius: 4px; }
.cc-execution.live .cc-execution-row-summary.expandable:hover { background: rgba(100, 116, 139, 0.055); }
.cc-execution.live .cc-execution-mark { width: 16px; height: 16px; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 45%, transparent); border-radius: 4px; color: var(--text-muted); background: transparent; font-size: 9px; }
.cc-execution.live .cc-execution-row.current .cc-execution-mark { color: var(--primary-color, #2563eb); border-color: color-mix(in srgb, var(--primary-color, #2563eb) 45%, transparent); animation: cc-live-pulse 1.35s ease-in-out infinite; }
.cc-execution.live .cc-execution-row.current { background: transparent; box-shadow: none; }
.cc-execution.live .cc-execution-row.completed { opacity: 0.64; }
.cc-execution.live .cc-execution-row.completed:hover { opacity: 1; }
.cc-execution.live .cc-execution-title { gap: 6px; flex-wrap: nowrap; }
.cc-execution.live .cc-execution-title strong { min-width: 0; overflow: hidden; color: var(--text-secondary); font-size: 11px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.cc-execution.live .cc-execution-title code { max-width: 42%; flex: 0 1 auto; color: var(--text-muted); font-size: 9px; }
.cc-execution.live .cc-execution-main p { margin-top: 2px; font-size: 10px; }
.cc-execution.live .cc-execution-main small { margin-top: 2px; font-size: 9px; }
.cc-execution.live .cc-execution-row-chevron { min-width: 20px; min-height: 20px; }
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
  .cc-execution.live .cc-execution-row.batch-child,
  .cc-execution.live .cc-progress-batch-group,
  .cc-execution.live .cc-requirement-plan { margin-left: 14px; }
  .cc-execution.live .cc-execution-row.agent-child { margin-left: 28px; }
  .cc-execution.live .cc-execution-title code { max-width: 34%; }
  .cc-execution.live .cc-execution-detail { margin-left: 0; }
  .cc-batch-file-toggle { grid-template-columns: 18px minmax(0, 1fr) 16px; gap: 6px; }
  .cc-batch-file-state { display: none; }
  .cc-batch-file-detail { margin-left: 0; }
  .cc-batch-file-line { grid-template-columns: 52px minmax(0, 1fr); }
  .cc-execution.live .cc-requirement-plan-steps li { grid-template-columns: 18px minmax(0, 1fr); }
  .cc-execution.live .cc-requirement-step-project { grid-column: 2; }
}
</style>
