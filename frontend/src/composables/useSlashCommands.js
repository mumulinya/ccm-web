import { computed, reactive, ref } from 'vue'

const RECENT_KEY = 'ccm_slash_command_recent_v1'

function readRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

function remember(name) {
  const next = [name, ...readRecent().filter(item => item !== name)].slice(0, 8)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

function commandScore(command, query, recent, scope) {
  const scopeBonus = (command.scopes?.length === 1 ? 35 : 0)
    + (scope === 'project' && ['开发', '开发现场'].includes(command.category) ? 18 : 0)
    + (scope === 'group' && ['执行', '任务追踪'].includes(command.category) ? 18 : 0)
  if (!query) {
    const recentIndex = recent.indexOf(command.name)
    return (recentIndex < 0 ? 20 : 100 - recentIndex) + scopeBonus
  }
  const q = query.toLowerCase()
  const name = command.name.toLowerCase()
  const aliases = (command.aliases || []).map(item => item.toLowerCase())
  if (name === q || aliases.includes(q)) return 1000 + scopeBonus
  if (name.startsWith(q) || aliases.some(item => item.startsWith(q))) return 700 + scopeBonus
  if (name.includes(q) || aliases.some(item => item.includes(q))) return 500 + scopeBonus
  const haystack = [command.description, command.category, ...(command.keywords || [])].join(' ').toLowerCase()
  if (haystack.includes(q)) return 250 + scopeBonus
  let cursor = 0
  for (const char of q) {
    cursor = name.indexOf(char, cursor)
    if (cursor < 0) return -1
    cursor += 1
  }
  return 100 + scopeBonus
}

function asText(value, fallback = '—') {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const COMMAND_VARIANTS = {
  help: 'resource_list', mcp: 'resource_list', skills: 'resource_list', permissions: 'resource_list', hooks: 'resource_list', files: 'resource_list', 'shared-files': 'resource_list', session: 'resource_list',
  doctor: 'health', 'agent-health': 'health', model: 'health', soak: 'health',
  task: 'task', trace: 'timeline', logs: 'timeline', cron: 'timeline',
  diff: 'git', 'git-status': 'git', history: 'git',
  checkpoint: 'mutation_receipt', rollback: 'mutation_receipt', commit: 'mutation_receipt',
  knowledge: 'knowledge',
}

const SECRET_TEXT_PATTERNS = [
  [/\b(Bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, '$1[已隐藏]'],
  [/\b(sk-[A-Za-z0-9_-]{8,})\b/gi, '[密钥已隐藏]'],
  [/([?&](?:token|key|secret|password)=)[^&\s]+/gi, '$1[已隐藏]'],
  [/((?:api[_-]?key|secret|password|token)\s*[:=]\s*)[^\s,;]+/gi, '$1[已隐藏]'],
]

function safeTechnicalText(value, max = 240) {
  let text = asText(value, '')
  for (const [pattern, replacement] of SECRET_TEXT_PATTERNS) text = text.replace(pattern, replacement)
  return text.replace(/[\0\r\n\t]+/g, ' ').trim().slice(0, max)
}

function safeTechnicalDetails(command, data, result, context) {
  const allowedKeys = [
    'success', 'status', 'state', 'readiness', 'ready', 'scope', 'scope_id', 'generated_at',
    'version', 'revision', 'checksum', 'resultChecksum', 'result_checksum', 'branch',
    'checkpointId', 'executionId', 'restoredHead', 'total', 'available', 'enabled', 'connected',
  ]
  const details = {
    schema: 'ccm-command-technical-details-v1',
    command,
    scope: safeTechnicalText(data?.scope || context?.scope || ''),
    scopeId: safeTechnicalText(data?.scope_id || context?.project || context?.groupId || context?.group || ''),
    stats: result.metrics.map(item => ({ label: safeTechnicalText(item.label, 80), value: safeTechnicalText(item.value, 160) })),
    sectionCounts: result.sections.map(section => ({ id: section.id, rows: section.rows?.length || 0 })),
  }
  for (const key of allowedKeys) {
    const value = data?.[key]
    if (['string', 'number', 'boolean'].includes(typeof value)) details[key] = typeof value === 'string' ? safeTechnicalText(value, 320) : value
  }
  if (data?.counts && typeof data.counts === 'object') {
    details.counts = Object.fromEntries(Object.entries(data.counts)
      .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
      .slice(0, 30)
      .map(([key, value]) => [safeTechnicalText(key, 80), typeof value === 'string' ? safeTechnicalText(value, 160) : value]))
  }
  if (data?.error) details.error = safeTechnicalText(data.error, 500)
  return details
}

function commandTone(command, data, success) {
  if (!success) return 'danger'
  if (command === 'doctor') return data?.readiness === 'blocked' ? 'danger' : (data?.readiness === 'partial' ? 'warning' : 'success')
  if (command === 'soak') return data?.state?.running ? 'success' : 'neutral'
  if (command === 'mcp') {
    const disconnected = (data?.tools || []).filter(item => item.runtime && item.runtime.connected === false).length
    return (data?.authorization?.missing || []).length || disconnected ? 'warning' : 'success'
  }
  if (command === 'skills' && (data?.authorization?.missing || []).length) return 'warning'
  return ['checkpoint', 'rollback', 'commit', 'copy', 'export', 'rename', 'theme'].includes(command) ? 'success' : 'neutral'
}

function finalizeCommandResult(result, command, data, context) {
  result.variant = COMMAND_VARIANTS[command.name] || 'compact'
  result.tone = commandTone(command.name, data, result.success)
  result.summary = safeTechnicalText(result.summary, 1200) || '命令已执行。'
  result.headline = result.summary
  if (result.items.length) {
    result.sections.unshift({ id: 'primary', title: '', kind: result.variant === 'timeline' ? 'timeline' : 'list', rows: result.items })
  }
  result.stats = result.metrics
  result.technicalDetails = safeTechnicalDetails(command.name, data, result, context)
  result.rawPreview = ''
  result.executionType = command.executionType || (command.actionType === 'prompt' ? 'prompt' : 'local')
  result.displayMode = command.displayMode || (result.executionType === 'local-jsx' ? 'overlay' : 'transcript')
  result.historyPolicy = command.historyPolicy || (result.displayMode === 'overlay' ? 'transient' : 'persisted')
  result.modelVisibility = command.modelVisibility || (result.executionType === 'prompt' ? 'visible' : 'hidden')
  result.compatibility = command.compatibility || 'ccm_extension'
  result.stateChanged = data?.stateChanged === true
  return result
}

export function buildCommandResult(command, data, args, context, durationMs) {
  const result = {
    schema: 'ccm-command-result-v2',
    command: command.name,
    title: command.description,
    icon: command.icon || '/',
    success: data?.success !== false && !data?.error,
    summary: data?.summary || data?.message || '已直接读取 CCM 本地状态，未调用大模型。',
    implementation: command.implementation || 'local-query',
    metrics: [],
    items: [],
    sections: [],
    actions: [],
    technicalDetails: {},
    contentStored: false,
    rawPreview: '',
    durationMs,
    at: new Date().toISOString()
  }
  const addMetric = (label, value, tone = 'neutral') => result.metrics.push({ label: safeTechnicalText(label, 80), value: safeTechnicalText(value, 180), tone })
  const addItem = (title, detail = '', status = '', tone = 'neutral', meta = '') => result.items.push({ title: safeTechnicalText(title, 240), detail: safeTechnicalText(detail, 480), status: safeTechnicalText(status, 120), tone, meta: safeTechnicalText(meta, 240) })
  const addAction = (label, tab, actionContext = {}) => result.actions.push({ kind: 'navigate', label, tab, context: actionContext })
  if (command.name === 'doctor') {
    const checks = data.checks || []
    const counts = data.counts || {}
    result.summary = data.summary || '系统诊断已完成。'
    addMetric('检查项', counts.checks ?? checks.length)
    addMetric('正常', counts.ok ?? checks.filter(item => item.status === 'ok').length, 'success')
    addMetric('警告', counts.warn ?? checks.filter(item => item.status === 'warn').length, 'warning')
    addMetric('失败', counts.fail ?? checks.filter(item => item.status === 'fail').length, 'danger')
    checks.slice(0, 40).forEach(check => addItem(check.label || check.id, check.message || '', check.status === 'ok' ? '正常' : check.status === 'warn' ? '需关注' : '失败', check.status === 'ok' ? 'success' : check.status === 'warn' ? 'warning' : 'danger'))
    addAction('打开系统设置', 'settings')
  } else if (command.name === 'context') {
    result.summary = data.summary || '当前上下文快照'
    Object.entries(data.metrics || {}).forEach(([label, value]) => addMetric(label, value))
    ;(data.items || []).forEach(item => addItem(item.title || item.label, '会话消息记录', item.status))
  } else if (command.name === 'diff') {
    result.summary = data.total ? `当前分支有 ${data.total} 个未提交文件变更。` : '当前工作区没有未提交文件变更。'
    addMetric('分支', data.branch)
    addMetric('变更文件', data.total || 0)
    ;(data.files || []).slice(0, 30).forEach(file => addItem(file.path, file.statusText || file.status, file.status))
  } else if (command.name === 'git-status') {
    result.summary = `当前项目位于 ${data.branch || '未知'} 分支，共有 ${data.total || 0} 个未提交文件变更。`
    addMetric('分支', data.branch)
    addMetric('变更文件', data.total || 0)
    ;(data.files || []).slice(0, 30).forEach(file => addItem(file.path, file.statusText || file.status, file.status))
  } else if (command.name === 'history') {
    const commits = data.commits || []
    result.summary = `读取到 ${commits.length} 条 Git 提交记录。`
    addMetric('提交', commits.length)
    commits.forEach(commit => addItem(commit.shortHash || commit.hash, commit.message, `${commit.author || ''} ${commit.timestamp || ''}`.trim()))
  } else if (command.name === 'trace') {
    const trace = data.trace || (data.traces || [])[0] || {}
    const events = trace.events || []
    const traceId = trace.trace_id || trace.traceId || trace.id
    result.summary = traceId ? `Trace ${traceId}，共 ${events.length} 个事件。` : '未找到 Trace。'
    addMetric('Trace', traceId)
    addMetric('任务', trace.task_id)
    addMetric('事件', events.length)
    events.slice(-20).reverse().forEach(event => addItem(event.type || event.name, event.message || event.detail, event.status))
  } else if (command.name === 'task') {
    const task = (data.tasks || []).find(item => String(item.id) === String(args))
    if (!task) throw new Error(`任务 ${args} 不存在`)
    result.summary = task.title || `任务 ${task.id}`
    addMetric('状态', task.status)
    addMetric('目标项目', task.target_project || task.project)
    addMetric('执行记录', task.trace_id ? '已关联' : '')
    addMetric('结果说明', task.receipt?.status || task.delivery_summary?.acceptance_gate_passed)
    ;(task.logs || task.recent_logs || []).slice(-15).reverse().forEach(log => addItem(log.level || '日志', log.message || log.text, log.at || log.timestamp))
    addAction('打开任务中心', 'tasks', { taskId: task.id })
  } else if (command.name === 'agent-health' || command.name === 'model') {
    const runtimes = data.runtimes || data.agents || []
    result.summary = `发现 ${runtimes.length} 个执行器，${runtimes.filter(item => item.available !== false).length} 个可用。`
    addMetric('执行器', runtimes.length)
    addMetric('可用', runtimes.filter(item => item.available !== false).length)
    runtimes.forEach(runtime => addItem(runtime.label || runtime.name || runtime.id, runtime.sessionResume === true ? '支持原生会话续跑' : '未声明原生续跑', runtime.available === false ? '不可用' : '可用'))
    addAction('打开系统设置', 'settings')
  } else if (command.name === 'knowledge') {
    const matches = data.matched || data.debugChunks || []
    result.summary = `知识库检索“${args}”得到 ${matches.length} 条结果，全程未调用模型。`
    addMetric('命中', matches.length)
    matches.slice(0, 12).forEach(item => addItem(
      item.filename || item.name || '知识片段',
      item.citation || item.chunk_id || item.chunkId || item.document_id || item.documentId || item.path || '可在知识库中打开来源',
      item.score === undefined ? '' : `相关度 ${Number(item.score).toFixed(3)}`,
      'neutral',
      item.revision || item.checksum || '',
    ))
    addAction('打开知识库', 'knowledge')
  } else if (command.name === 'shared-files') {
    const files = data.files || data.shared || []
    result.summary = `当前作用域共有 ${files.length} 个共享文件。`
    addMetric('文件', files.length)
    files.slice(0, 30).forEach(file => addItem(file.name || file.path || file, file.type || file.description, file.readable === false ? '不可读' : '可读'))
  } else if (command.name === 'cron') {
    const jobs = data.jobs || []
    result.summary = `共有 ${jobs.length} 个定时任务。`
    addMetric('任务', jobs.length)
    addMetric('启用', jobs.filter(job => job.enabled !== false).length)
    jobs.slice(0, 20).forEach(job => addItem(job.name || job.title || job.id, job.cron || job.schedule || job.expression, job.enabled === false ? '停用' : '启用'))
  } else if (command.name === 'soak') {
    const state = data.state || {}
    const report = data.report || {}
    result.summary = state.running ? '稳定性浸泡测试正在运行。' : '稳定性浸泡测试当前未运行。'
    addMetric('状态', state.running ? '运行中' : state.status || '未运行')
    addMetric('样本', state.sampleCount || state.samples?.length || report.samples || 0)
    addMetric('可用率', report.availability ?? report.availability_rate)
    addMetric('重启次数', report.restarts ?? report.restart_count)
  } else if (command.name === 'logs') {
    const selectedTask = args && Array.isArray(data.tasks) ? data.tasks.find(task => String(task.id) === String(args)) : null
    const logs = data.logs || data.recent || (selectedTask ? selectedTask.logs || selectedTask.recent_logs || [] : null)
      || (data.tasks || []).flatMap(task => (task.logs || task.recent_logs || []).map(log => ({ ...log, task_id: task.id })))
      || data.executions || []
    result.summary = `读取到 ${logs.length} 条近期记录。`
    addMetric('记录', logs.length)
    logs.slice(-30).reverse().forEach(log => addItem(log.level || log.title || log.id || log.task_id || '记录', log.message || log.detail || log.status || '', log.at || log.timestamp || log.updatedAt))
  } else if (command.name === 'checkpoint') {
    result.summary = `已创建检查点 ${data.checkpoint?.id || ''}`
    addMetric('检查点', data.checkpoint?.id)
    addMetric('执行', data.checkpoint?.executionId)
    addMetric('模式', data.checkpoint?.mode)
  } else if (command.name === 'rollback') {
    result.summary = `已回滚到检查点 ${data.checkpointId || args}`
    addMetric('执行', data.executionId)
    addMetric('恢复 HEAD', data.restoredHead)
  } else if (command.name === 'permissions') {
    result.summary = '已读取全局 Agent 当前能力与授权边界。'
    const tools = data.tools || data.capabilities || []
    addMetric('能力项', Array.isArray(tools) ? tools.length : Object.keys(tools || {}).length)
    ;(Array.isArray(tools) ? tools : Object.entries(tools || {}).map(([name, value]) => ({ name, value }))).slice(0, 30).forEach(item => addItem(item.name || item.label || item.id || item.type, item.description || item.operations || item.value || item.type, item.destructive === true ? '破坏性' : item.risk || item.permission || '受控'))
  } else if (command.name === 'mcp') {
    const tools = data.tools || []
    const connected = tools.filter(item => item.runtime?.connected === true).length
    const unavailable = tools.filter(item => item.runtime && item.runtime.connected === false).length
    result.summary = tools.length ? `当前作用域有 ${tools.length} 个已授权 MCP 服务，${connected} 个已连接。` : '当前作用域没有已授权的 MCP 服务。'
    addMetric('服务', tools.length)
    addMetric('已连接', connected, connected ? 'success' : 'neutral')
    addMetric('连接异常', unavailable, unavailable ? 'warning' : 'neutral')
    if (data.authorization) {
      addMetric('授权规则', data.authorization.requested || 0)
      addMetric('规则缺失', (data.authorization.missing || []).length, (data.authorization.missing || []).length ? 'warning' : 'neutral')
    }
    tools.forEach(item => {
      const state = item.enabled === false ? '已停用' : item.runtime?.connected ? '已连接' : item.runtime?.authState === 'required' ? '需登录' : item.runtime ? '连接异常' : '已授权'
      const tone = state === '已连接' ? 'success' : ['需登录', '连接异常'].includes(state) ? 'warning' : 'neutral'
      const grants = item.authorization?.fullServer ? '完整服务' : item.authorization?.tools?.length ? `${item.authorization.tools.length} 个工具` : '作用域授权'
      addItem(item.name || item.id, item.description || '', state, tone, `${grants}${item.runtime?.toolsCount !== undefined ? ` · ${item.runtime.toolsCount} 个运行时工具` : ''}`)
    })
    if (data.authorization?.missing?.length) {
      result.sections.push({ id: 'authorization-issues', title: '未生效的授权', kind: 'issues', rows: data.authorization.missing.map(name => ({ title: name, detail: '注册目录中未找到对应服务或工具，请检查授权名称。', status: '需处理', tone: 'warning' })) })
    }
    addAction('打开工具配置', 'tools')
  } else if (command.name === 'skills') {
    const skills = data.skills || []
    result.summary = `当前作用域授权了 ${skills.length} 个可识别的 Skill。`
    addMetric('Skill', skills.length)
    addMetric('启用', skills.filter(item => item.enabled !== false).length)
    if (data.authorization) {
      addMetric('授权项', data.authorization.requested || 0)
      addMetric('缺失', (data.authorization.missing || []).length)
    }
    skills.forEach(item => addItem(item.name || item.id, item.description || '', item.enabled === false ? '已停用' : '可用', item.enabled === false ? 'neutral' : 'success'))
    if (data.authorization?.missing?.length) result.sections.push({ id: 'authorization-issues', title: '未生效的授权', kind: 'issues', rows: data.authorization.missing.map(name => ({ title: name, detail: 'Skill 注册中心中没有对应条目。', status: '需处理', tone: 'warning' })) })
    addAction('打开工具配置', 'tools')
  } else if (command.name === 'hooks') {
    const hooks = data.hooks || []
    result.summary = `当前配置了 ${hooks.length} 个运行时钩子。`
    addMetric('钩子', hooks.length)
    hooks.forEach(item => addItem(item.id || item.name || item.phase, `${item.phase || ''} · ${item.tool || '*'}`, item.effect || ''))
  } else if (command.name === 'commit') {
    result.summary = data.message || 'Git 提交已完成。'
    addMetric('项目', context.project)
    addMetric('提交说明', args)
  } else if (['new', 'compact', 'clear', 'rename', 'session', 'session-stats', 'cost', 'copy', 'usage', 'stats', 'theme', 'status', 'help', 'export', 'plan', 'effort', 'fast', 'output-style', 'branch', 'rewind'].includes(command.name)) {
    result.summary = data.summary || data.message || command.description
    Object.entries(data.metrics || {}).forEach(([label, value]) => addMetric(label, value))
    ;(data.items || []).forEach(item => addItem(item.title || item.label, item.detail || item.value, item.status))
  } else {
    Object.entries(data || {}).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 8).forEach(([label, value]) => addMetric(label, value))
  }
  for (const [label, value] of Object.entries(data?.metrics || {})) {
    if (!result.metrics.some(item => item.label === label)) addMetric(label, value)
  }
  for (const item of data?.items || []) {
    if (!result.items.some(row => row.title === item.title && row.detail === item.detail)) {
      result.items.push({ ...item, title: safeTechnicalText(item.title || item.label, 240), detail: safeTechnicalText(item.detail || item.value, 480), status: safeTechnicalText(item.status, 120), meta: safeTechnicalText(item.meta, 240) })
    }
  }
  for (const action of data?.actions || []) {
    if (!result.actions.some(item => item.kind === action.kind && item.label === action.label)) result.actions.push(action)
  }
  return finalizeCommandResult(result, command, data, context)
}

export function useSlashCommands(options) {
  const commands = ref([])
  const open = ref(false)
  const loading = ref(false)
  const activeIndex = ref(0)
  const error = ref('')
  const recent = ref(readRecent())
  const panel = ref(null)

  const query = computed(() => {
    const value = String(options.input.value || '')
    if (!value.startsWith('/')) return ''
    return value.slice(1).split(/\s/, 1)[0]
  })

  const filtered = computed(() => commands.value
    .map(command => ({ command, score: commandScore(command, query.value, recent.value, options.scope) }))
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.command.name.localeCompare(b.command.name))
    .map(item => item.command))

  async function load(force = false) {
    if ((!force && commands.value.length) || loading.value) return
    loading.value = true
    try {
      const context = options.context?.() || {}
      const params = new URLSearchParams({ scope: options.scope })
      if (context.project) params.set('project', context.project)
      if (context.group) params.set('group', context.group)
      if (context.groupId) params.set('groupId', context.groupId)
      const res = await fetch(`/api/slash-commands?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '命令加载失败')
      commands.value = data.commands || []
    } catch (e) {
      error.value = e.message || '命令加载失败'
      options.onError?.(error.value)
    } finally {
      loading.value = false
    }
  }

  function onInput() {
    const value = String(options.input.value || '')
    const wasOpen = open.value
    open.value = value.startsWith('/') && !value.slice(1).includes(' ')
    activeIndex.value = 0
    if (open.value && !wasOpen) load(true)
    return open.value
  }

  function closePanel() {
    panel.value = null
    options.focus?.()
  }

  async function persistLocalResult(result, command, args) {
    if (result.historyPolicy !== 'persisted' || result.modelVisibility !== 'hidden') return result
    const context = options.context?.() || {}
    const exactSessionId = context.exactSessionId || context.sessionId || context.session_id
    if (!exactSessionId) return result
    const scopeId = options.scope === 'project' ? context.project : options.scope === 'group' ? (context.groupId || context.group) : 'global'
    const response = await fetch('/api/slash-commands/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: options.scope,
        scopeId,
        exactSessionId,
        command: command.name,
        args,
        status: result.success === false ? 'failed' : 'success',
        summary: result.summary || result.headline,
        safeDetails: result.technicalDetails || {},
        result,
        createdAt: result.at,
      }),
    })
    const payload = await response.json()
    if (!response.ok || payload.success === false) throw new Error(payload.error || '本地命令记录持久化失败')
    const record = payload.result || {}
    result.recordId = record.id
    result.localCommandRecord = record
    result.at = record.createdAt || result.at
    return result
  }

  async function presentLocalResult(result, command, args) {
    if (result.displayMode === 'skip') return result
    if (result.displayMode === 'overlay') {
      panel.value = { command, result, args, openedAt: Date.now() }
      if (result.stateChanged) {
        const receipt = { ...result, displayMode: 'transcript', historyPolicy: 'persisted' }
        await persistLocalResult(receipt, command, args)
        await options.onResult?.(receipt)
      }
      return result
    }
    await persistLocalResult(result, command, args)
    await options.onResult?.(result)
    return result
  }

  async function runPanelAction(action) {
    if (!action) return
    if (action.kind === 'navigate' && action.tab) {
      closePanel()
      await options.onNavigate?.(action.tab, action.context || {})
      return
    }
    if (action.kind === 'client' && action.action) {
      const current = panel.value
      const clientData = await options.onClientAction?.(action.action, { command: current?.command, args: action.args || '', context: options.context?.() || {}, action })
      if (current) current.result = buildCommandResult(current.command, clientData || { success: true }, action.args || '', options.context?.() || {}, 0)
    }
  }

  async function execute(command, rawInput = '') {
    if (command.availability?.enabled === false) {
      options.onError?.(command.availability.reason || '当前不可使用该命令')
      return { unavailable: true }
    }
    let invocation = rawInput.trim()
    const typedName = invocation.slice(1).split(/\s/, 1)[0].toLowerCase()
    const matches = typedName === command.name.toLowerCase() || (command.aliases || []).some(alias => alias.toLowerCase() === typedName)
    if (!matches) invocation = `/${command.name}`
    const hasArgs = invocation.trim().split(/\s+/).length > 1
    if (command.requiresArgs && !hasArgs) {
      options.input.value = `/${command.name} `
      open.value = false
      options.focus?.()
      return { needsArgs: true }
    }
    open.value = false
    try {
      const resolveCommand = async (confirmationReceipt = '') => {
        const response = await fetch('/api/slash-commands/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: invocation,
            scope: options.scope,
            context: options.context?.() || {},
            confirmation_receipt: confirmationReceipt || undefined
          })
        })
        const payload = await response.json()
        return { response, payload }
      }
      let { response: res, payload: data } = await resolveCommand()
      if (data.confirmation_required && data.confirmation_challenge) {
        const message = command.actionType === 'mutation'
          ? `/${command.name} 将修改当前作用域的本地状态。请核对参数与影响范围后确认。`
          : `/${command.name} 属于高风险命令，请确认本次精确操作。`
        const approved = await (options.onConfirm?.(message) ?? Promise.resolve(window.confirm(message)))
        if (!approved) return { cancelled: true }
        const confirmRes = await fetch('/api/slash-commands/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challenge: data.confirmation_challenge, confirmed: true })
        })
        const confirmation = await confirmRes.json()
        if (!confirmRes.ok || !confirmation.confirmation_receipt) throw new Error(confirmation.error || '命令确认失败')
        ;({ response: res, payload: data } = await resolveCommand(confirmation.confirmation_receipt))
      }
      if (!res.ok) throw new Error(data.error || '命令执行失败')
      if (data.needsArgs) {
        options.input.value = `/${data.command.name} `
        options.focus?.()
        return data
      }
      remember(data.command.name)
      recent.value = readRecent()
      options.input.value = ''
      if (data.result?.type === 'navigate') await options.onNavigate?.(data.result.tab)
      if (data.result?.type === 'prompt') await options.onPrompt?.(data.result.prompt, data.command, data.result)
      if (['query', 'mutation'].includes(data.result?.type)) {
        const started = Date.now()
        const request = { method: data.result.method || 'GET', headers: {} }
        if (request.method !== 'GET') {
          request.headers['Content-Type'] = 'application/json'
          request.body = JSON.stringify(data.result.body || {})
        }
        const localRes = await fetch(data.result.endpoint, request)
        const localData = await localRes.json()
        if (!localRes.ok || localData?.success === false) throw new Error(localData?.error || `本地命令执行失败（HTTP ${localRes.status}）`)
        await presentLocalResult(buildCommandResult(data.command, localData, data.result.args || '', options.context?.() || {}, Date.now() - started), data.command, data.result.args || '')
      }
      if (data.result?.type === 'client') {
        const started = Date.now()
        const clientData = await options.onClientAction?.(data.result.action, { command: data.command, args: data.result.args || '', context: options.context?.() || {} })
        await presentLocalResult(buildCommandResult(data.command, clientData || { success: true }, data.result.args || '', options.context?.() || {}, Date.now() - started), data.command, data.result.args || '')
      }
      return data
    } catch (e) {
      error.value = e.message || '命令执行失败'
      options.onError?.(error.value)
      return { error: error.value }
    }
  }

  async function select(command) {
    return execute(command, String(options.input.value || ''))
  }

  async function onKeydown(event) {
    if (!open.value) {
      const value = String(options.input.value || '').trim()
      if (event.key === 'Enter' && !event.shiftKey && value.startsWith('/')) {
        event.preventDefault()
        await load()
        const typedName = value.slice(1).split(/\s/, 1)[0].toLowerCase()
        const command = commands.value.find(item => item.name.toLowerCase() === typedName || (item.aliases || []).some(alias => alias.toLowerCase() === typedName))
        if (!command) {
          const message = `未知命令 /${typedName}，输入 / 查看可用命令`
          error.value = message
          options.onError?.(message)
          return true
        }
        await execute(command, value)
        return true
      }
      return false
    }
    let items = filtered.value
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (items.length) activeIndex.value = (activeIndex.value + 1) % items.length
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (items.length) activeIndex.value = (activeIndex.value - 1 + items.length) % items.length
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      open.value = false
      return true
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      if (!items.length && loading.value) {
        const deadline = Date.now() + 3000
        while (loading.value && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20))
        if (loading.value) {
          const message = '命令列表加载超时，请稍后重试'
          error.value = message
          options.onError?.(message)
          return true
        }
        items = filtered.value
      } else if (!items.length && !commands.value.length) {
        await load()
        items = filtered.value
      }
      if (items.length) await select(items[activeIndex.value] || items[0])
      else {
        const message = `没有匹配 /${query.value} 的命令`
        error.value = message
        options.onError?.(message)
      }
      return true
    }
    return false
  }

  return reactive({ commands, open, loading, activeIndex, error, filtered, query, panel, load, onInput, onKeydown, select, execute, closePanel, runPanelAction })
}
