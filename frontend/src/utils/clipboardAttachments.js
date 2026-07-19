const IMAGE_EXTENSIONS = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}

const normalizedFileName = (file) => String(file?.name || '').trim().toLowerCase()

export const attachmentFileKey = (file) => [
  normalizedFileName(file),
  Number(file?.size || 0),
  String(file?.type || '').toLowerCase(),
].join(':')

export const mergeUniqueAttachmentFiles = (currentFiles = [], incomingFiles = []) => {
  const merged = Array.isArray(currentFiles) ? [...currentFiles] : []
  const seen = new Set(merged.map(attachmentFileKey))
  for (const file of Array.isArray(incomingFiles) ? incomingFiles : []) {
    if (!file || typeof file !== 'object') continue
    const key = attachmentFileKey(file)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(file)
  }
  return merged
}

const pastedImageName = (file, now) => {
  const extension = IMAGE_EXTENSIONS[String(file?.type || '').toLowerCase()] || 'png'
  const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
  return `pasted-image-${stamp}.${extension}`
}

const ensureClipboardFileName = (file, now) => {
  if (String(file?.name || '').trim()) return file
  if (typeof File !== 'function') return file
  return new File([file], pastedImageName(file, now), {
    type: file.type || 'application/octet-stream',
    lastModified: Number(file.lastModified || now),
  })
}

/**
 * Returns files exposed by the browser clipboard. Text and HTML clipboard data
 * are intentionally ignored so callers can leave ordinary text paste native.
 */
export const extractClipboardAttachmentFiles = (event, options = {}) => {
  const clipboard = event?.clipboardData
  if (!clipboard) return []

  const candidates = []
  for (const item of Array.from(clipboard.items || [])) {
    if (item?.kind !== 'file' || typeof item.getAsFile !== 'function') continue
    const file = item.getAsFile()
    if (file) candidates.push(file)
  }
  candidates.push(...Array.from(clipboard.files || []))

  const now = Number(options.now || Date.now())
  return mergeUniqueAttachmentFiles([], candidates.map(file => ensureClipboardFileName(file, now)))
}

export const countNewAttachmentFiles = (currentFiles = [], incomingFiles = []) => (
  mergeUniqueAttachmentFiles(currentFiles, incomingFiles).length - currentFiles.length
)
