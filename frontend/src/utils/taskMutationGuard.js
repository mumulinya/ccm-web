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
  return {
    ...(revision !== undefined ? { expected_revision: Math.max(0, revision) } : {}),
    ...(generation !== undefined ? { generation: Math.max(1, generation) } : {}),
    ...(bindingChecksum ? { binding_checksum: String(bindingChecksum) } : {}),
  }
}

/** Fill missing guard fields from the authoritative task projection. */
export const resolveTaskMutationGuard = async (taskId, source = {}, request = fetch) => {
  const local = taskMutationGuardFromSource(source)
  if (local.expected_revision !== undefined && local.generation !== undefined) return local
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
    }
  } catch {
    return local
  }
}
