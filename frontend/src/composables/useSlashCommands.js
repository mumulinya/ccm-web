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

function compactJson(value, max = 24000) {
  try {
    const text = JSON.stringify(value, null, 2)
    return text.length > max ? `${text.slice(0, max)}\n…（结果已截断）` : text
  } catch { return asText(value) }
}

function buildCommandResult(command, data, args, context, durationMs) {
  const result = {
    command: command.name,
    title: command.description,
    icon: command.icon || '/',
    success: data?.success !== false && !data?.error,
    summary: data?.summary || data?.message || '已直接读取 CCM 本地状态，未调用大模型。',
    implementation: command.implementation || 'local-query',
    metrics: [],
    items: [],
    rawPreview: compactJson(data),
    durationMs,
    at: new Date().toISOString()
  }
  const addMetric = (label, value) => result.metrics.push({ label, value: asText(value) })
  const addItem = (title, detail = '', status = '') => result.items.push({ title: asText(title), detail: asText(detail, ''), status: asText(status, '') })
  if (command.name === 'context') {
    result.summary = data.summary || '当前上下文快照'
    Object.entries(data.metrics || {}).forEach(([label, value]) => addMetric(label, value))
    ;(data.items || []).forEach(item => addItem(item.title || item.label, item.detail || item.value, item.status))
  } else if (command.name === 'diff') {
    result.summary = data.total ? `当前分支有 ${data.total} 个未提交文件变更。` : '当前工作区没有未提交文件变更。'
    addMetric('分支', data.branch)
    addMetric('变更文件', data.total || 0)
    ;(data.files || []).slice(0, 30).forEach(file => addItem(file.path, file.statusText || file.status, file.status))
  } else if (command.name === 'branch') {
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
    result.rawPreview = compactJson(task)
  } else if (command.name === 'agents' || command.name === 'model') {
    const runtimes = data.runtimes || data.agents || []
    result.summary = `发现 ${runtimes.length} 个执行器，${runtimes.filter(item => item.available !== false).length} 个可用。`
    addMetric('执行器', runtimes.length)
    addMetric('可用', runtimes.filter(item => item.available !== false).length)
    runtimes.forEach(runtime => addItem(runtime.label || runtime.name || runtime.id, runtime.sessionResume === true ? '支持原生会话续跑' : '未声明原生续跑', runtime.available === false ? '不可用' : '可用'))
  } else if (command.name === 'knowledge') {
    const matches = data.matched || data.debugChunks || []
    result.summary = `知识库检索“${args}”得到 ${matches.length} 条结果，全程未调用模型。`
    addMetric('命中', matches.length)
    matches.slice(0, 12).forEach(item => addItem(item.filename || item.name || '知识片段', item.text || item.content || item, item.score === undefined ? '' : Number(item.score).toFixed(3)))
  } else if (command.name === 'files') {
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
    result.summary = `当前配置了 ${tools.length} 个 MCP 服务。`
    addMetric('MCP', tools.length)
    addMetric('启用', tools.filter(item => item.enabled !== false).length)
    tools.forEach(item => addItem(item.name || item.id, item.description || item.command || item.url || '', item.enabled === false ? '停用' : '启用'))
  } else if (command.name === 'skills') {
    const skills = data.skills || []
    result.summary = `当前安装了 ${skills.length} 个 Skill。`
    addMetric('Skill', skills.length)
    addMetric('启用', skills.filter(item => item.enabled !== false).length)
    skills.forEach(item => addItem(item.name || item.id, item.description || '', item.enabled === false ? '停用' : '启用'))
  } else if (command.name === 'hooks') {
    const hooks = data.hooks || []
    result.summary = `当前配置了 ${hooks.length} 个运行时钩子。`
    addMetric('钩子', hooks.length)
    hooks.forEach(item => addItem(item.id || item.name || item.phase, `${item.phase || ''} · ${item.tool || '*'}`, item.effect || ''))
  } else if (command.name === 'commit') {
    result.summary = data.message || 'Git 提交已完成。'
    addMetric('项目', context.project)
    addMetric('提交说明', args)
  } else if (['new', 'compact', 'clear', 'rename', 'sessions', 'copy', 'usage', 'stats', 'theme', 'status', 'help', 'export'].includes(command.name)) {
    result.summary = data.summary || data.message || command.description
    Object.entries(data.metrics || {}).forEach(([label, value]) => addMetric(label, value))
    ;(data.items || []).forEach(item => addItem(item.title || item.label, item.detail || item.value, item.status))
  } else {
    Object.entries(data || {}).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 8).forEach(([label, value]) => addMetric(label, value))
  }
  return result
}

export function useSlashCommands(options) {
  const commands = ref([])
  const open = ref(false)
  const loading = ref(false)
  const activeIndex = ref(0)
  const error = ref('')
  const recent = ref(readRecent())

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
    if (command.risk === 'high' || command.actionType === 'mutation') {
      const message = command.actionType === 'mutation'
        ? `/${command.name} 将修改本地执行状态。确认参数和影响范围后继续吗？`
        : `/${command.name} 属于高风险命令。继续后仍会进入现有确认与审计流程，是否继续？`
      const approved = await (options.onConfirm?.(message) ?? Promise.resolve(window.confirm(message)))
      if (!approved) return { cancelled: true }
    }
    open.value = false
    try {
      const res = await fetch('/api/slash-commands/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: invocation, scope: options.scope, context: options.context?.() || {} })
      })
      const data = await res.json()
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
        await options.onResult?.(buildCommandResult(data.command, localData, data.result.args || '', options.context?.() || {}, Date.now() - started))
      }
      if (data.result?.type === 'client') {
        const started = Date.now()
        const clientData = await options.onClientAction?.(data.result.action, { command: data.command, args: data.result.args || '', context: options.context?.() || {} })
        await options.onResult?.(buildCommandResult(data.command, clientData || { success: true }, data.result.args || '', options.context?.() || {}, Date.now() - started))
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

  return reactive({ commands, open, loading, activeIndex, error, filtered, query, load, onInput, onKeydown, select, execute })
}
