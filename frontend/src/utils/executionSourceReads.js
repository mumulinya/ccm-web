export function normalizeSourcePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').trim()
}

export function pathsReferToSameSource(left, right) {
  const first = normalizeSourcePath(left)
  const second = normalizeSourcePath(right)
  return !!first && first === second
}

export function sourceReadPathsFromEvent(event) {
  const display = event?.detail?.toolDisplay || {}
  const result = display.result || {}
  const paths = []
  for (const row of [...(Array.isArray(result.fileRows) ? result.fileRows : []), ...(Array.isArray(result.rows) ? result.rows : [])]) {
    const path = normalizeSourcePath(row?.path || row?.name)
    if (path) paths.push(path)
  }
  const argumentPath = normalizeSourcePath(
    event?.detail?.safeArguments?.path
    || display.tool?.target
    || event?.display?.target,
  )
  if (argumentPath) paths.push(argumentPath)
  const argumentPaths = event?.detail?.safeArguments?.paths
  if (Array.isArray(argumentPaths)) {
    for (const item of argumentPaths) {
      const path = normalizeSourcePath(typeof item === 'string' ? item : item?.path)
      if (path) paths.push(path)
    }
  }
  if (Array.isArray(display.arguments)) {
    for (const item of display.arguments) {
      const label = String(item?.label || '')
      if (!/路径|path|文件/i.test(label)) continue
      const value = item?.value
      if (typeof value === 'string') {
        const path = normalizeSourcePath(value)
        if (path) paths.push(path)
      } else if (Array.isArray(value)) {
        for (const nested of value) {
          const path = normalizeSourcePath(typeof nested === 'string' ? nested : nested?.path)
          if (path) paths.push(path)
        }
      }
    }
  }
  return [...new Set(paths)]
}

export function findSourceReadEventForPath(events, path) {
  return (Array.isArray(events) ? events : []).find(event => (
    sourceReadPathsFromEvent(event).some(item => pathsReferToSameSource(item, path))
  )) || null
}

export function listingPathIsOpenable(path, openablePaths) {
  const list = openablePaths && typeof openablePaths[Symbol.iterator] === 'function' ? [...openablePaths] : []
  return list.some(item => pathsReferToSameSource(item, path))
}
