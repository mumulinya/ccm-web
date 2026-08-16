export const COLLAPSIBLE_READ_SEARCH_TOOLS = new Set([
  'read_file',
  'read_files',
  'glob_files',
  'grep_text',
  'list_directory',
  'web_search',
  'web_fetch',
])

export function toolNameFromEvent(event) {
  const raw = String(
    event?.detail?.toolDisplay?.tool?.name
    || event?.toolName
    || '',
  )
  return String(raw.split('__').at(-1) || '').toLowerCase()
}

export function isCollapsibleReadSearchEvent(event) {
  if (!event || typeof event !== 'object') return false
  if (event.__stageHeader || event.__progressBatch || event.__requirementPlan || event.__readSearchGroup || event.__childAgentConversation) return false
  if (event.__batchChild) return false
  const type = String(event.eventType || '')
  if (!type.startsWith('tool_')) return false
  return COLLAPSIBLE_READ_SEARCH_TOOLS.has(toolNameFromEvent(event))
}

function countByKind(children) {
  let read = 0
  let search = 0
  let list = 0
  let web = 0
  for (const event of children) {
    const name = toolNameFromEvent(event)
    if (name === 'read_file' || name === 'read_files') read += 1
    else if (name === 'list_directory') list += 1
    else if (name === 'web_search' || name === 'web_fetch') web += 1
    else search += 1
  }
  return { read, search, list, web }
}

export function readSearchGroupLabel(children, { running, failed } = {}) {
  const { read, search, list, web } = countByKind(Array.isArray(children) ? children : [])
  const parts = []
  if (read) parts.push(read === 1 ? '读取 1 个文件' : `读取 ${read} 个文件`)
  if (search) parts.push(search === 1 ? '搜索 1 次' : `搜索 ${search} 次`)
  if (list) parts.push(list === 1 ? '列出 1 个目录' : `列出 ${list} 个目录`)
  if (web) parts.push(web === 1 ? '联网 1 次' : `联网 ${web} 次`)
  const body = parts.join(' · ') || `查阅 ${children.length} 次`
  if (failed) return `${body} · 有失败`
  if (running) return `${body} · 进行中`
  return body
}

export function readSearchGroupKey(children) {
  return `read-search:${(Array.isArray(children) ? children : []).map(event => event?.eventId || event?.toolCallId || '').join('|')}`
}

export function collapseReadSearchRows(rows, options = {}) {
  const expandedGroups = options.expandedGroups && typeof options.expandedGroups === 'object' ? options.expandedGroups : {}
  const list = Array.isArray(rows) ? rows : []
  const out = []
  let index = 0
  while (index < list.length) {
    const event = list[index]
    if (!isCollapsibleReadSearchEvent(event)) {
      out.push(event)
      index += 1
      continue
    }
    const children = []
    while (index < list.length && isCollapsibleReadSearchEvent(list[index])) {
      children.push(list[index])
      index += 1
    }
    if (children.length < 2) {
      out.push(children[0])
      continue
    }
    const running = children.some(item => ['running', 'waiting'].includes(String(item?.display?.status || '')))
    const failed = children.some(item => item?.display?.status === 'failed' || item?.eventType === 'tool_failed')
    const key = readSearchGroupKey(children)
    const expanded = failed || running || expandedGroups[key] === true
    out.push({
      __readSearchGroup: true,
      key,
      children,
      running,
      failed,
      expanded,
      label: readSearchGroupLabel(children, { running, failed }),
    })
    if (expanded) {
      for (const child of children) {
        out.push({ ...child, __readSearchChild: true, __readSearchGroupKey: key })
      }
    }
  }
  return out
}
