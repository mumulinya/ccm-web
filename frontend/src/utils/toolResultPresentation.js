const text = (value, max = 800) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const primitiveText = (value, max = 500) => value == null || typeof value === 'object' ? '' : text(value, max)
const toolName = display => String(display?.tool?.name || display?.tool?.canonicalName || '').toLowerCase()
const rowsOf = display => Array.isArray(display?.result?.rows) ? display.result.rows : []
const item = (label, options = {}) => ({
  label: text(label, 500) || '记录',
  secondary: primitiveText(options.secondary, 500),
  path: text(options.path, 800),
  line: Number(options.line || 0) || 0,
  status: text(options.status, 80),
})

const listingItems = (rows, { glob = false } = {}) => (Array.isArray(rows) ? rows : []).map(row => {
  const source = typeof row === 'string' ? { path: row, name: row } : (row || {})
  const isDir = source.type === 'directory' || source.status === 'directory'
  const name = String(source.name || source.path || '').replace(/\\/g, '/')
  const base = name.split('/').filter(Boolean).at(-1) || name
  const label = glob ? (name || '文件') : (isDir ? `${base.replace(/\/$/, '')}/` : base)
  return item(label, { path: source.path || name, status: isDir ? 'directory' : 'file' })
})

const directoryPresentation = rows => {
  const items = listingItems(rows)
  return { layout: 'directory', groups: items.length ? [{ id: 'listing', label: '', count: items.length, items }] : [] }
}

const globPresentation = rows => {
  const items = listingItems(rows, { glob: true })
  return { layout: 'files', groups: items.length ? [{ id: 'listing', label: '', count: items.length, items }] : [] }
}

const fileRangeSecondary = row => {
  const from = Number(row?.from || 0)
  const to = Number(row?.to || 0)
  const total = Number(row?.totalLines || row?.total_lines || 0)
  const range = from ? `${from}${to > from ? `–${to}` : ''}${total ? `/${total}` : ''}` : ''
  const status = primitiveText(row?.status || row?.secondary, 80)
  const usefulStatus = status && !/已读完|读取范围|第\s*\d/.test(status) ? status : ''
  return [range, usefulStatus, primitiveText(row?.reason, 80)].filter(Boolean).join(' · ')
}

const fileContentPresentation = rows => {
  const items = (Array.isArray(rows) ? rows : []).map(row => {
    const source = typeof row === 'string' ? { path: row } : (row || {})
    const filePath = String(source.path || source.name || source.label || '').replace(/\\/g, '/')
    return item(filePath || '文件', { path: filePath, status: 'file', secondary: fileRangeSecondary(source) })
  })
  return { layout: 'file_content', groups: items.length ? [{ id: 'listing', label: '', count: items.length, items }] : [] }
}

const flattenListingGroups = (layout, groups = []) => {
  const items = groups.flatMap(group => Array.isArray(group?.items) ? group.items.map(row => item(row?.label, row)) : [])
  return { layout, groups: items.length ? [{ id: 'listing', label: '', count: items.length, items }] : [] }
}

const LEGACY_ARGUMENT_LABELS = {
  project_id: '项目', projectId: '项目', path: '路径', source: '来源', destination: '目标',
  pattern: '搜索内容', query: '查询', symbol: '符号', offset: '起始位置', limit: '数量上限',
  glob: '文件范围', type: '文件类型', context: '上下文行数', pages: '页码', staged: '暂存区',
}
const legacyToolRows = (name, result) => {
  if (!result || typeof result !== 'object') return []
  if (Array.isArray(result.rows)) return result.rows.slice(0, 40)
  if (Array.isArray(result.items)) return result.items.slice(0, 40).map(value => typeof value === 'string' ? { path: value } : value)
  if (Array.isArray(result.locations)) return result.locations.slice(0, 40)
  if (Array.isArray(result.commits)) return result.commits.slice(0, 40)
  if (/grep/.test(name) && Array.isArray(result.lines)) return result.lines.slice(0, 40).map(value => {
    const match = String(value || '').match(/^(.+?):(\d+)(?::|$)/)
    return { location: match ? `${match[1]}:${match[2]}` : '' }
  }).filter(row => row.location)
  return []
}

export function buildLegacyToolDisplay(event = {}) {
  if (!event?.detail || event.detail.toolDisplay) return null
  const name = text(event.toolName || event.display?.title || 'tool', 300)
  const canonicalName = name.toLowerCase().replace(/[\s-]+/g, '_')
  const safeResult = event.detail.safeResult && typeof event.detail.safeResult === 'object' ? event.detail.safeResult : {}
  const rows = legacyToolRows(canonicalName, safeResult)
  const argumentsList = Object.entries(event.detail.safeArguments || {}).slice(0, 30).map(([key, value]) => ({
    label: LEGACY_ARGUMENT_LABELS[key] || key.replaceAll('_', ' '),
    value: /(?:prompt|content|body|source_text|old_text|new_text|secret|token|password|command|script)/i.test(key) ? '[内容已隐藏]' : value,
  }))
  return {
    schema: 'ccm-tool-display-detail-v1',
    tool: { name: canonicalName, userLabel: text(event.display?.title || name, 200) },
    arguments: argumentsList,
    result: {
      kind: rows.length ? 'list' : 'summary',
      summary: text(event.display?.summary || event.display?.title || '工具执行完成', 500),
      rows,
    },
    contentStored: false,
  }
}

const matchPresentation = rows => {
  const groups = new Map()
  for (const row of rows) {
    const location = text(row?.location || row?.path)
    const match = location.match(/^(.*?):(\d+)$/)
    const path = match?.[1] || location || '其他匹配'
    const value = item('匹配内容', { path, line: match?.[2], secondary: row?.preview })
    groups.set(path, [...(groups.get(path) || []), value])
  }
  return { layout: 'matches', groups: [...groups.entries()].map(([path, items]) => ({ id: `match:${path}`, label: path, count: items.length, items })) }
}

const GENERIC_TECHNICAL_KEYS = /^(?:preview|truncated|original_chars|originalChars|raw|stdout|stderr|output|content|body|schema|contentStored|checksum|tokenCount|durationMs)$/i
const GENERIC_LABELS = { status: '状态', message: '说明', result: '结果', count: '数量', total: '总数', path: '路径', name: '名称', location: '位置' }
const genericPresentation = rows => {
  const items = rows.map(row => {
    const key = text(row?.label || row?.name || row?.path || row?.location, 120)
    if (!key || GENERIC_TECHNICAL_KEYS.test(key)) return null
    const value = row?.value ?? row?.status
    if (value != null && typeof value === 'object') return null
    return item(GENERIC_LABELS[key] || key, { path: row?.path, secondary: value })
  }).filter(Boolean)
  return { layout: 'generic', groups: items.length ? [{ id: 'results', label: '结果', count: items.length, items }] : [] }
}

export function normalizeToolResultPresentation(display = {}) {
  const explicit = display?.result?.presentation
  const name = toolName(display)
  const rows = rowsOf(display)
  if (explicit?.layout === 'directory' || /list_directory|(?:^|__)ls$/.test(name)) {
    return rows.length ? directoryPresentation(rows) : flattenListingGroups('directory', explicit?.groups)
  }
  if (explicit?.layout === 'files' || /glob_files|findfiles|(?:^|__)glob$/.test(name)) {
    return rows.length ? globPresentation(rows) : flattenListingGroups('files', explicit?.groups)
  }
  if (explicit?.layout === 'file_content' || /read_file|read_files|fileread/.test(name)) {
    return rows.length ? fileContentPresentation(rows) : flattenListingGroups('file_content', explicit?.groups)
  }
  if (explicit?.layout) return {
    layout: explicit.layout,
    groups: (explicit.groups || []).map(group => ({
      ...group,
      count: Number(group?.count ?? group?.items?.length ?? 0),
      items: Array.isArray(group?.items) ? group.items.map(row => item(row?.label, row)) : [],
    })).filter(group => group.count || group.items.length),
  }
  if (/grep_text|grep|codesearch|searchtext/.test(name)) return matchPresentation(rows)
  if (/find_definition|find_references|find_implementations|find_type_definition|workspace_symbols|document_symbols/.test(name)) return { layout: 'symbols', groups: [{ id: 'symbols', label: '符号位置', count: rows.length, items: rows.map(row => item(row?.symbol || row?.path || '符号', { path: row?.path, line: Number(row?.range?.start?.line ?? row?.line ?? -1) + 1, secondary: row?.kind })) }] }
  if (/git/.test(name)) return { layout: 'git', groups: rows.length ? [{ id: 'git', label: 'Git 结果', count: rows.length, items: rows.map(row => item(row?.subject || row?.path || row?.label || row?.name || '记录', { path: row?.path, secondary: row?.hash || row?.status })) }] : [] }
  if (/test|build|lint|typecheck|verify|maven|gradle/.test(name)) return { layout: 'verification', groups: [] }
  return genericPresentation(rows)
}

export const toolResultHasUserDetails = display => normalizeToolResultPresentation(display).groups.some(group => group.items.length)
