const time = value => {
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const toolName = event => String(
  event?.detail?.toolDisplay?.tool?.name
    || event?.detail?.toolDisplay?.tool?.label
    || event?.toolName
    || event?.display?.title
    || '',
).toLowerCase()

export const agentProgressToolFamily = event => {
  const declared = String(event?.detail?.toolDisplay?.tool?.family || '').toLowerCase()
  if (['read', 'search', 'symbol', 'git', 'verify', 'terminal', 'agent', 'external', 'other'].includes(declared)) return declared
  const name = toolName(event)
  if (/test|build|lint|typecheck|verify|verification|maven|gradle/.test(name)) return 'verify'
  if (/bash|powershell|shell|command|terminal|exec/.test(name)) return 'terminal'
  if (/git|diff|commit|branch|status/.test(name)) return 'git'
  if (/read|list/.test(name)) return 'read'
  if (/grep|glob|search|find|symbol|diagnostic/.test(name)) return 'search'
  if (/mcp|http|request|external|browser/.test(name)) return 'external'
  if (String(event?.eventType || '').startsWith('agent_')) return 'agent'
  return 'tool'
}

const lifecycleRank = event => {
  if (event?.display?.status === 'failed' || event?.eventType === 'tool_failed') return 4
  if (event?.display?.status === 'success' || event?.eventType === 'tool_completed') return 3
  if (event?.display?.status === 'waiting') return 2
  return 1
}

const latestLifecycleRows = rows => {
  const byIdentity = new Map()
  for (const event of Array.isArray(rows) ? rows : []) {
    const key = String(event?.toolCallId || event?.agentRunId || event?.eventId || '')
    const current = byIdentity.get(key)
    if (!current || lifecycleRank(event) >= lifecycleRank(current)) byIdentity.set(key, event)
  }
  return [...byIdentity.values()]
}

const batchBaseLabel = (families, running, failed) => {
  if (families.size === 1 && families.has('verify')) return failed ? '构建与验证未通过' : running ? '正在运行构建与验证' : '构建与验证通过'
  if (families.size === 1 && families.has('git')) return running ? '正在检查代码状态和变更' : '已检查代码状态和变更'
  if (families.size === 1 && families.has('read')) return running ? '正在读取项目文件' : '已读取项目文件'
  if (families.size === 1 && families.has('search')) return running ? '正在搜索代码内容' : '已完成代码内容搜索'
  if (families.size === 1 && families.has('symbol')) return running ? '正在查找符号定义和引用' : '已查找符号定义和引用'
  if ([...families].every(value => ['read', 'search', 'symbol'].includes(value))) return running ? '正在检查代码和配置' : '已检查代码和配置'
  if (families.size === 1 && families.has('agent')) return running ? '正在分派项目 Agent' : '项目 Agent 已接收任务'
  if (families.has('terminal') && families.size === 1) return failed ? '命令执行未通过' : running ? '正在运行项目命令' : '项目命令已执行'
  return failed ? '当前工具批次存在失败项' : running ? '正在处理当前工具批次' : '已完成当前工具批次'
}

export function agentProgressBatchPresentation(rows, options = {}) {
  const items = latestLifecycleRows(rows)
  const terminalAt = Number(options.terminalAt || 0)
  const currentAt = terminalAt || Number(options.now || Date.now())
  const running = !terminalAt && items.some(event => ['running', 'waiting'].includes(String(event?.display?.status || 'running')))
  const failed = items.filter(event => event?.display?.status === 'failed' || event?.eventType === 'tool_failed').length
  const families = new Set(items.map(agentProgressToolFamily))
  const intervals = items.map(event => {
    const start = time(event?.createdAt)
    if (!start) return null
    const reported = Math.max(0, Number(event?.display?.durationMs || 0))
    const active = ['running', 'waiting'].includes(String(event?.display?.status || 'running'))
    const end = reported ? start + reported : active ? currentAt : start
    return [start, Math.max(start, Math.min(end, terminalAt || end))]
  }).filter(Boolean).sort((left, right) => left[0] - right[0])
  let durationMs = 0
  let activeInterval = null
  for (const interval of intervals) {
    if (!activeInterval || interval[0] > activeInterval[1]) {
      if (activeInterval) durationMs += activeInterval[1] - activeInterval[0]
      activeInterval = [...interval]
    } else activeInterval[1] = Math.max(activeInterval[1], interval[1])
  }
  if (activeInterval) durationMs += activeInterval[1] - activeInterval[0]
  return {
    label: batchBaseLabel(families, running, failed),
    count: items.length,
    failed,
    running,
    durationMs,
  }
}

export function longRunningToolDuration(event, options = {}) {
  if (options.terminalAt) return 0
  if (!String(event?.eventType || '').startsWith('tool_')) return 0
  if (!['running', 'waiting'].includes(String(event?.display?.status || 'running'))) return 0
  if (!['terminal', 'verify', 'external'].includes(agentProgressToolFamily(event))) return 0
  const startedAt = time(event?.createdAt)
  const elapsed = startedAt ? Math.max(0, Number(options.now || Date.now()) - startedAt) : 0
  return elapsed >= 2_000 ? elapsed : 0
}
