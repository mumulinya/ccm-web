const safeAttachmentUrl = (value, allowInlinePreview = false) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (allowInlinePreview && /^(?:data|blob):/i.test(raw)) return raw
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/api/')) return raw
  return ''
}

export const normalizeGlobalAttachment = (file, role, options = {}) => {
  if (!file || typeof file !== 'object' || Array.isArray(file)) return null
  const normalizedRole = String(role || '').toLowerCase()
  const explicitOwner = String(file.attachment_owner || file.attachmentOwner || '').toLowerCase()
  const owner = normalizedRole === 'user' ? 'user' : explicitOwner
  if (normalizedRole === 'assistant' && owner !== 'assistant') return null
  if (!['user', 'assistant'].includes(owner)) return null

  const forPersistence = options.forPersistence === true
  const uploadUrl = safeAttachmentUrl(file.upload_url || file.uploadUrl || file.url || file.preview)
  const preview = forPersistence ? '' : safeAttachmentUrl(file.preview, true)
  return {
    name: String(file.name || file.filename || '附件').trim().slice(0, 512) || '附件',
    size: Math.max(0, Number(file.size || 0)),
    type: String(file.type || file.content_type || file.contentType || 'application/octet-stream').trim().slice(0, 128),
    ...(uploadUrl ? { upload_url: uploadUrl } : {}),
    ...(preview ? { preview } : {}),
    attachment_owner: owner,
  }
}

export const normalizeGlobalMessageAttachments = (files, role, options = {}) => (
  Array.isArray(files)
    ? files.map(file => normalizeGlobalAttachment(file, role, options)).filter(Boolean)
    : []
)

const attachmentIdentity = (file) => [
  String(file?.name || ''),
  Number(file?.size || 0),
  String(file?.type || ''),
].join('\u0001')

export const mergeGlobalMessageAttachments = (previous, incoming, role) => {
  const merged = new Map()
  for (const file of [
    ...normalizeGlobalMessageAttachments(previous, role),
    ...normalizeGlobalMessageAttachments(incoming, role),
  ]) {
    const key = attachmentIdentity(file)
    const existing = merged.get(key)
    merged.set(key, existing
      ? { ...existing, ...file, preview: file.preview || existing.preview }
      : file)
  }
  return [...merged.values()]
}

export const globalAttachmentUrl = (file) => (
  safeAttachmentUrl(file?.preview, true)
  || safeAttachmentUrl(file?.upload_url || file?.uploadUrl || file?.url)
)

export const isGlobalImageAttachment = (file) => (
  String(file?.type || '').toLowerCase().startsWith('image/')
  || /\.(?:bmp|gif|jpe?g|png|svg|webp)$/i.test(String(file?.name || ''))
)

export const __globalAgentAttachmentTestHooks = {
  safeAttachmentUrl,
  attachmentIdentity,
}
