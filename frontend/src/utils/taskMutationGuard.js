const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key)

const finiteNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const firstNumber = (source, keys) => {
  for (const key of keys) {
    if (!own(source, key)) continue
    const value = finiteNumber(source[key])
    if (value !== undefined) return value
  }
  return undefined
}

const taskBinding = (source = {}) => {
  const links = source.conversation_links || source.conversationLinks || source.links || []
  const items = Array.isArray(links) ? links : []
  return items.find(item => item?.relation === 'target') || items.find(item => item?.relation === 'source') || {}
}

/** Build a mutation guard without inventing revision 0 or generation 1. */
export const taskMutationGuardFromSource = (source = {}) => {
  const revision = firstNumber(source, ['revision', 'task_revision', 'taskRevision'])
  const generation = firstNumber(source, ['generation', 'workflow_generation', 'workflowGeneration', 'task_generation', 'taskGeneration'])
  const binding = taskBinding(source)
  const bindingChecksum = source.binding_checksum || source.bindingChecksum || binding.binding_checksum || binding.bindingChecksum || ''
  const taskContextRevision = firstNumber(source, ['task_context_revision', 'taskContextRevision'])
  const taskContextChecksum = source.task_context_checksum || source.taskContextChecksum || source.task_context?.checksum || ''
  const timelineSpanChecksum = source.timeline_span_checksum || source.timelineSpanChecksum || source.task_context?.timelineSpans?.find?.(span => span?.taskId === (source.taskId || source.task_id || source.id))?.checksum || ''
  return {
    ...(revision !== undefined ? { expected_revision: Math.max(0, revision) } : {}),
    ...(generation !== undefined ? { generation: Math.max(1, generation) } : {}),
    ...(bindingChecksum ? { binding_checksum: String(bindingChecksum) } : {}),
    ...(taskContextRevision !== undefined ? { task_context_revision: Math.max(0, taskContextRevision) } : {}),
    ...(taskContextChecksum ? { task_context_checksum: String(taskContextChecksum) } : {}),
    ...(timelineSpanChecksum ? { timeline_span_checksum: String(timelineSpanChecksum) } : {}),
  }
}

/** Fill missing guard fields from the authoritative task projection. */
export const resolveTaskMutationGuard = async (taskId, source = {}, request = fetch) => {
  const local = taskMutationGuardFromSource(source)
  // Replay actions intentionally contain only a small safe projection. A
  // revision/generation pair is not enough to resume a task: the backend also
  // requires the normalized task-context and timeline-span checksums. Fetch the
  // authoritative projection unless the complete recovery fence is present.
  if (
    local.expected_revision !== undefined
    && local.generation !== undefined
    && local.task_context_revision !== undefined
    && local.task_context_checksum
    && local.timeline_span_checksum
  ) return local
  if (!taskId || typeof request !== 'function') return local
  try {
    const response = await request(`/api/tasks/${encodeURIComponent(taskId)}/conversation-links`)
    const payload = await response.json()
    if (!response.ok || payload?.success === false) return local
    const current = taskMutationGuardFromSource(payload)
    return {
      ...current,
      ...local,
      ...(local.binding_checksum || current.binding_checksum ? { binding_checksum: local.binding_checksum || current.binding_checksum } : {}),
      ...(local.task_context_checksum || current.task_context_checksum ? { task_context_checksum: local.task_context_checksum || current.task_context_checksum } : {}),
      ...(local.timeline_span_checksum || current.timeline_span_checksum ? { timeline_span_checksum: local.timeline_span_checksum || current.timeline_span_checksum } : {}),
    }
  } catch {
    return local
  }
}
