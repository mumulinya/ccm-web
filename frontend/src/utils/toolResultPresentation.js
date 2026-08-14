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

const directoryPresentation = rows => {
  const directories = rows.filter(row => row?.type === 'directory').map(row => item(row.name || row.path, { path: row.path, status: 'directory' }))
  const files = rows.filter(row => row?.type !== 'directory').map(row => item(row.name || row.path, { path: row.path, status: 'file' }))
  return { layout: 'directory', groups: [
    { id: 'directories', label: '目录', count: directories.length, items: directories },
    { id: 'files', label: '文件', count: files.length, items: files },
  ].filter(group => group.count) }
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
  if (explicit?.layout) return {
    layout: explicit.layout,
    groups: (explicit.groups || []).map(group => ({
      ...group,
      count: Number(group?.count ?? group?.items?.length ?? 0),
      items: Array.isArray(group?.items) ? group.items.map(row => item(row?.label, row)) : [],
    })).filter(group => group.count || group.items.length),
  }
  const name = toolName(display)
  const rows = rowsOf(display)
  if (/list_directory|(?:^|__)ls$/.test(name)) return directoryPresentation(rows)
  if (/glob_files|glob|findfiles/.test(name)) return { layout: 'files', groups: [{ id: 'files', label: '匹配文件', count: rows.length, items: rows.map(row => item(row?.path || row?.name || row, { path: row?.path || row?.name || row, status: 'file' })) }] }
  if (/grep_text|grep|codesearch|searchtext/.test(name)) return matchPresentation(rows)
  if (/find_definition|find_references|find_implementations|find_type_definition|workspace_symbols|document_symbols/.test(name)) return { layout: 'symbols', groups: [{ id: 'symbols', label: '符号位置', count: rows.length, items: rows.map(row => item(row?.symbol || row?.path || '符号', { path: row?.path, line: Number(row?.range?.start?.line ?? row?.line ?? -1) + 1, secondary: row?.kind })) }] }
  if (/read_file|read_files|fileread/.test(name)) return { layout: 'file_content', groups: [] }
  if (/git/.test(name)) return { layout: 'git', groups: rows.length ? [{ id: 'git', label: 'Git 结果', count: rows.length, items: rows.map(row => item(row?.subject || row?.path || row?.label || row?.name || '记录', { path: row?.path, secondary: row?.hash || row?.status })) }] : [] }
  if (/test|build|lint|typecheck|verify|maven|gradle/.test(name)) return { layout: 'verification', groups: [] }
  return genericPresentation(rows)
}

export const toolResultHasUserDetails = display => normalizeToolResultPresentation(display).groups.some(group => group.items.length)
