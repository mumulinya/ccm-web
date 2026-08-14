import { downloadCommandJson } from '../utils/commandExport.js'

const readValue = (value, fallback = null) => {
  const resolved = typeof value === 'function' ? value() : value
  return resolved?.value !== undefined ? resolved.value : (resolved ?? fallback)
}

const messageText = (message) => String(message?.content || message?.text || message?.summary || '').trim()

const copyText = async (value) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('浏览器未允许复制，请检查剪贴板权限')
}

const sessionTitle = (session) => session?.name || session?.title || session?.id || '未命名会话'
const implementationLabel = (value) => ({
  'local-query': '直接读取',
  'local-mutation': '本地操作',
  client: '当前会话',
  navigation: '打开页面',
  'agent-workflow': 'Agent 工作流',
}[value] || 'CCM 命令')

const jsonRequest = async (url, init = {}) => {
  const response = await fetch(url, init)
  const data = await response.json()
  if (!response.ok || data?.success === false) throw new Error(data?.error || `请求失败（HTTP ${response.status}）`)
  return data
}

const sessionIdentity = (scope, context, currentSessionId) => ({
  scope,
  scopeId: scope === 'project' ? context.project : scope === 'group' ? (context.groupId || context.group) : 'global',
  exactSessionId: currentSessionId,
})

const latestVisibleMessageId = messages => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const item = messages[index]
    if (item?.modelVisible === false || ['command_result', 'local_command', 'tool_result', 'tool_use'].includes(item?.type)) continue
    return String(item?.id || item?.message_id || `index:${index}`)
  }
  return ''
}

const reportedUsage = messages => {
  const usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, cost: 0, samples: 0, hasCost: false }
  for (const message of messages) {
    const source = message?.usage || message?.providerUsage || message?.provider_usage || message?.agentResult?.usage || message?.taskExperience?.usage
    if (!source || typeof source !== 'object') continue
    const input = Number(source.input_tokens ?? source.inputTokens ?? source.prompt_tokens ?? 0)
    const output = Number(source.output_tokens ?? source.outputTokens ?? source.completion_tokens ?? 0)
    const cacheRead = Number(source.cache_read_input_tokens ?? source.cacheReadTokens ?? 0)
    const cacheWrite = Number(source.cache_creation_input_tokens ?? source.cacheWriteTokens ?? 0)
    const cost = Number(source.cost ?? source.total_cost_usd ?? source.costUsd ?? 0)
    if (![input, output, cacheRead, cacheWrite, cost].some(Number.isFinite)) continue
    usage.inputTokens += Number.isFinite(input) ? input : 0
    usage.outputTokens += Number.isFinite(output) ? output : 0
    usage.cacheReadTokens += Number.isFinite(cacheRead) ? cacheRead : 0
    usage.cacheWriteTokens += Number.isFinite(cacheWrite) ? cacheWrite : 0
    if (Number.isFinite(cost) && cost > 0) { usage.cost += cost; usage.hasCost = true }
    usage.samples += 1
  }
  return usage
}

const scopeQuery = (scope, context) => {
  const params = new URLSearchParams({ scope })
  if (scope === 'project') params.set('project', context.project || '')
  if (scope === 'group') params.set('group_id', context.groupId || context.group || '')
  return params.toString()
}

export function createSlashCommandClientActions(options = {}) {
  return async (action, payload = {}) => {
    const messages = readValue(options.messages, []) || []
    const sessions = readValue(options.sessions, []) || []
    const context = readValue(options.context, {}) || {}
    const currentSessionId = String(readValue(options.currentSessionId, context.sessionId || '') || '')
    const args = String(payload.args || '').trim()
    const scope = options.scope || 'global'
    const identity = sessionIdentity(scope, context, currentSessionId)

    if (!currentSessionId && ['plan_mode', 'branch_session', 'rewind_session', 'effort', 'fast_mode', 'output_style', 'model_manager'].includes(action)) {
      throw new Error('请先创建或选择一个真实会话')
    }

    if (action === 'command_inventory') {
      const params = new URLSearchParams({ scope: options.scope || 'global' })
      Object.entries(context).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
      })
      const response = await fetch(`/api/slash-commands?${params.toString()}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '命令列表读取失败')
      const commands = data.commands || []
      const direct = commands.filter(command => command.implementation !== 'agent-workflow').length
      return {
        success: true,
        summary: `当前入口有 ${commands.length} 个命令，其中 ${direct} 个由 CCM 直接执行，其余由 Agent 工作流完成。`,
        metrics: { 命令: commands.length, 直接执行: direct, Agent工作流: commands.length - direct },
        items: commands.map(command => ({
          title: `/${command.name}${command.argumentHint ? ` ${command.argumentHint}` : ''}`,
          detail: command.description,
          status: implementationLabel(command.implementation),
        })),
      }
    }

    if (action === 'status' || action === 'context') {
      const chars = messages.reduce((sum, item) => sum + messageText(item).length, 0)
      const users = messages.filter(item => item.role === 'user').length
      const assistants = messages.filter(item => item.role === 'assistant').length
      const runtime = action === 'status'
        ? await Promise.allSettled([
            jsonRequest('/api/orchestrator/resilience'),
            jsonRequest(`/api/mcp?${scopeQuery(scope, context)}`),
          ])
        : []
      const resilience = runtime[0]?.status === 'fulfilled' ? runtime[0].value : null
      const mcp = runtime[1]?.status === 'fulfilled' ? runtime[1].value : null
      const runtimes = resilience?.runtimes || resilience?.agents || []
      const mcpTools = mcp?.tools || mcp?.servers || []
      return {
        success: true,
        summary: options.statusSummary?.({ context, messages, sessions, currentSessionId }) || `当前会话已加载 ${messages.length} 条消息。`,
        metrics: {
          ...(options.contextMetrics?.({ context, messages, sessions, currentSessionId }) || {}),
          消息: messages.length,
          用户消息: users,
          Agent消息: assistants,
          估算Token: Math.ceil(chars / 4),
          ...(action === 'status' ? {
            执行器: runtimes.length || '未上报',
            MCP服务: mcpTools.length,
            MCP已连接: mcpTools.filter(item => item.runtime?.connected === true).length,
          } : {}),
        },
        items: action === 'status' ? [
          ...runtimes.slice(0, 20).map(item => ({ title: item.label || item.name || item.id, detail: item.provider || item.model || '', status: item.available === false ? '不可用' : '可用' })),
          ...mcpTools.slice(0, 20).map(item => ({ title: item.name || item.id, detail: item.description || '', status: item.runtime?.connected ? '已连接' : '未连接' })),
        ] : messages.slice(-8).reverse().map(item => ({
          title: item.role === 'user' ? '用户' : (item.agent || 'Agent'),
          detail: `${messageText(item).length} 字符 · ${item.type || '消息'}`,
          status: item.timestamp || item.created_at || '',
        })),
      }
    }

    if (action === 'plan_mode') {
      const normalized = args.toLowerCase()
      const isExit = ['exit', 'off', 'disable', '退出'].includes(normalized)
      const isRead = !args || ['status', 'show', '查看'].includes(normalized)
      const current = await jsonRequest(`/api/conversations/plan-mode?${new URLSearchParams(identity).toString()}`)
      const data = isRead
        ? current
        : await jsonRequest('/api/conversations/plan-mode', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, revision: current.revision, generation: current.generation, action: isExit ? 'exit' : 'open', description: isExit ? '' : args.replace(/^open\s*/i, '') }) })
      const plan = data.result || data.planMode || data
      if (!isRead && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ccm-conversation-plan-mode-changed', {
          detail: {
            ...identity,
            mode: plan.enabled ? 'plan' : 'agent',
            enabled: plan.enabled === true,
            revision: plan.revision ?? data.revision ?? 0,
            generation: plan.generation ?? data.generation ?? 0,
          },
        }))
      }
      return {
        success: true,
        stateChanged: !isRead,
        summary: plan.enabled ? '当前会话已进入 Plan 模式；计划状态会随会话和压缩边界恢复。' : '当前会话已切换为 Agent 模式。',
        metrics: { 状态: plan.enabled ? 'Plan 模式' : 'Agent 模式', 世代: plan.generation ?? data.generation ?? 0, 修订: plan.revision ?? data.revision ?? 0 },
        items: plan.description ? [{ title: '当前目标', detail: plan.description, status: plan.enabled ? '进行中' : '已退出' }] : [],
      }
    }

    if (action === 'session_manager' || action === 'list_sessions') {
      const query = args.toLowerCase()
      const visible = sessions.filter(session => !query || `${sessionTitle(session)} ${session.id || ''}`.toLowerCase().includes(query))
      return {
        success: true,
        summary: query ? `找到 ${visible.length} 个匹配会话。` : `当前入口共有 ${sessions.length} 个会话。`,
        metrics: { 会话: visible.length, 当前会话: currentSessionId || '未选择' },
        items: visible.slice(0, 80).map(session => ({ title: sessionTitle(session), detail: session.id || '', status: String(session.id || '') === currentSessionId ? '当前' : (session.archived ? '已归档' : '可恢复'), action: { kind: 'client', action: 'select_session', args: String(session.id || '') } })),
      }
    }

    if (action === 'select_session') {
      if (!args) throw new Error('缺少会话 ID')
      await options.selectSession?.(args)
      return { success: true, summary: `已恢复会话 ${args}。`, metrics: { 会话: args } }
    }

    if (action === 'branch_session') {
      const anchorMessageId = args || latestVisibleMessageId(messages)
      if (!anchorMessageId) throw new Error('当前会话没有可分叉的消息')
      const previewData = await jsonRequest('/api/conversations/rewind/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, anchorMessageId }) })
      const preview = previewData.result || previewData
      const data = await jsonRequest('/api/conversations/branch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, anchorMessageId, revision: preview.revision, generation: preview.generation, conversationChecksum: preview.conversationChecksum }) })
      const receipt = data.result || data
      await options.refreshSessions?.()
      if (receipt.sessionId) await options.selectSession?.(receipt.sessionId)
      return { success: true, summary: `已从消息 ${receipt.anchorMessageId} 创建新会话分支。`, metrics: { 新会话: receipt.sessionId, 复制消息: receipt.copiedMessages, 世代: receipt.generation }, items: [{ title: receipt.sessionId, detail: `来源会话 ${receipt.sourceSessionId}`, status: '已切换' }] }
    }

    if (action === 'rewind_session') {
      const anchorMessageId = args || latestVisibleMessageId(messages)
      if (!anchorMessageId) throw new Error('当前会话没有可回退的消息')
      const previewData = await jsonRequest('/api/conversations/rewind/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, anchorMessageId }) })
      const preview = previewData.result || previewData
      const applyData = await jsonRequest('/api/conversations/rewind/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, anchorMessageId, revision: preview.revision, generation: preview.generation, conversationChecksum: preview.conversationChecksum, planChecksum: preview.planChecksum }) })
      const receipt = applyData.result || applyData
      await options.reloadCurrentSession?.()
      return { success: true, summary: `会话已回退到消息 ${anchorMessageId}，旧记录保存在可恢复快照中。`, metrics: { 保留消息: receipt.keptMessages, 移除消息: receipt.removedMessages, 新世代: receipt.generation }, items: [{ title: receipt.snapshotId, detail: '回退前快照', status: '可恢复' }] }
    }

    if (['effort', 'fast_mode', 'output_style', 'model_manager'].includes(action)) {
      const patch = {}
      if (action === 'effort' && args) patch.effort = args.toLowerCase()
      if (action === 'fast_mode' && args) {
        if (!['on', 'off'].includes(args.toLowerCase())) throw new Error('fast 只支持 on 或 off')
        patch.fast = args.toLowerCase() === 'on'
      }
      if (action === 'output_style' && args) patch.outputStyle = args.toLowerCase()
      if (action === 'model_manager' && args) patch.model = args
      const modifying = Object.keys(patch).length > 0
      const current = await jsonRequest(`/api/conversations/preferences?${new URLSearchParams(identity).toString()}`)
      const data = modifying
        ? await jsonRequest('/api/conversations/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, revision: current.revision, generation: current.generation, ...patch }) })
        : current
      const preferences = data.result?.preferences || data.preferences || {}
      const label = action === 'effort' ? '推理强度' : action === 'fast_mode' ? '快速模式' : action === 'output_style' ? '输出风格' : '模型'
      const value = action === 'effort' ? preferences.effort : action === 'fast_mode' ? (preferences.fast === true ? 'on' : preferences.fast === false ? 'off' : 'Provider 默认') : action === 'output_style' ? preferences.outputStyle : preferences.model
      return { success: true, stateChanged: modifying, summary: modifying ? `当前会话${label}已更新。` : `当前会话${label}设置。`, metrics: { [label]: value || 'Provider 默认', 作用范围: '当前会话' }, actions: action === 'model_manager' ? [{ kind: 'navigate', label: '打开 Provider 设置', tab: 'settings' }] : [] }
    }

    if (action === 'context_files') {
      const seen = new Map()
      for (const message of messages) {
        for (const file of [...(message.files || []), ...(message.attachments || [])]) {
          const key = String(file.id || file.file_id || file.path || file.name || '')
          if (key) seen.set(key, { title: file.name || file.path || key, detail: file.path || file.type || file.mimeType || '会话附件', status: '当前上下文' })
        }
        for (const ref of message.sourceRefs || message.source_refs || []) {
          const key = String(ref.sourceId || ref.source_id || ref.documentId || ref.document_id || ref.path || '')
          if (key) seen.set(key, { title: ref.documentName || ref.name || ref.path || key, detail: ref.citation || ref.sourceKind || ref.source_kind || '上下文来源', status: '来源引用' })
        }
      }
      return { success: true, summary: seen.size ? `当前模型上下文引用了 ${seen.size} 个文件或来源。` : '当前模型上下文没有文件或来源引用。', metrics: { 来源: seen.size }, items: [...seen.values()] }
    }

    if (action === 'provider_usage' || action === 'provider_cost') {
      const usage = reportedUsage(messages)
      if (!usage.samples || (action === 'provider_cost' && !usage.hasCost)) {
        return { success: true, summary: action === 'provider_cost' ? '当前 Provider 没有上报可靠费用，CCM 不会把估算值冒充真实费用。' : '当前 Provider 没有上报可靠的会话用量或额度。', metrics: { 状态: '不可用', 样本: usage.samples } }
      }
      if (action === 'provider_cost') return { success: true, summary: '以下费用来自 Provider 明确上报。', metrics: { 费用USD: usage.cost.toFixed(6), 上报样本: usage.samples } }
      return { success: true, summary: '以下 Token 数据来自 Provider 明确上报；套餐剩余额度仅在 Provider 返回时显示。', metrics: { 输入Token: usage.inputTokens, 输出Token: usage.outputTokens, 缓存读取: usage.cacheReadTokens, 缓存写入: usage.cacheWriteTokens, 上报样本: usage.samples } }
    }

    if (action === 'activity_stats') {
      const allMessages = sessions.flatMap(session => session.messages || session.history || [])
      const source = allMessages.length ? allMessages : messages
      return { success: true, summary: `当前入口共有 ${sessions.length} 个会话和 ${source.length} 条可统计消息。`, metrics: { 会话: sessions.length, 消息: source.length, 用户消息: source.filter(item => item.role === 'user').length, Agent消息: source.filter(item => item.role === 'assistant').length } }
    }

    if (action === 'session_tasks') {
      const data = await jsonRequest('/api/tasks')
      const tasks = (data.tasks || []).filter(task => !currentSessionId || [task.exact_session_id, task.session_id, task.group_session_id, task.project_session_id].some(id => String(id || '') === currentSessionId))
      return { success: true, summary: `当前会话有 ${tasks.length} 个后台任务或 Worker。`, metrics: { 任务: tasks.length, 运行中: tasks.filter(task => ['running', 'executing', 'queued', 'waiting_dependency'].includes(task.status)).length }, items: tasks.slice(0, 80).map(task => ({ title: task.title || task.id, detail: task.current_action || task.blocked_reason || task.target_project || '', status: task.status || 'unknown' })), actions: [{ kind: 'navigate', label: '打开任务中心', tab: 'tasks' }] }
    }

    if (action === 'mcp_manager') {
      const data = await jsonRequest(`/api/mcp?${scopeQuery(scope, context)}`)
      const tools = data.tools || data.servers || []
      return { success: true, summary: `当前作用域有 ${tools.length} 个 MCP 服务。`, metrics: { 服务: tools.length, 已连接: tools.filter(item => item.runtime?.connected === true).length }, items: tools.map(item => ({ title: item.name || item.id, detail: item.description || '', status: item.runtime?.connected ? '已连接' : item.enabled === false ? '已停用' : '已配置' })), actions: [{ kind: 'navigate', label: '打开工具配置', tab: 'tools' }] }
    }

    if (action === 'agents_manager') {
      const data = await jsonRequest('/api/agents')
      const agents = data.agents || []
      return { success: true, summary: `当前注册了 ${agents.length} 个开发 Agent。`, metrics: { Agent: agents.length, 可用: agents.filter(item => item.available !== false).length }, items: agents.map(item => ({ title: item.name || item.id, detail: item.description || '', status: item.available === false ? '不可用' : '可用' })), actions: [{ kind: 'navigate', label: '打开 Agent 配置', tab: 'settings' }] }
    }

    if (action === 'permissions_manager') {
      const data = await jsonRequest(`/api/tools/authorization-inventory?${scopeQuery(scope, context)}`)
      const inventory = data.inventory || data.scopes || data
      const rows = Array.isArray(inventory) ? inventory : Object.entries(inventory || {}).map(([name, value]) => ({ name, value }))
      return { success: true, summary: '已读取当前作用域有效授权；修改会继续经过确认与审计。', metrics: { 授权项: rows.length, 作用域: scope }, items: rows.slice(0, 80).map(item => ({ title: item.name || item.id || item.scope || '授权', detail: item.description || (Array.isArray(item.value) ? `${item.value.length} 项规则` : item.value && typeof item.value === 'object' ? `${Object.keys(item.value).length} 个配置字段` : String(item.value ?? '')), status: item.enabled === false ? '拒绝' : '生效' })), actions: [{ kind: 'navigate', label: '打开工具配置', tab: 'tools' }] }
    }

    if (action === 'hooks_manager') {
      const data = await jsonRequest('/api/global-agent/runtime/hooks')
      const hooks = data.hooks || []
      return { success: true, summary: `当前作用域解析到 ${hooks.length} 个有效 Hook。`, metrics: { Hook: hooks.length, 来源: scope === 'global' ? '全局' : '继承/覆盖' }, items: hooks.map(item => ({ title: item.name || item.id || item.phase, detail: item.description || item.phase || '', status: item.enabled === false ? '停用' : '启用' })), actions: [{ kind: 'navigate', label: '打开配置', tab: 'settings' }] }
    }

    if (action === 'memory_manager') return { success: true, summary: '当前作用域记忆由记忆中心统一管理；正文不在命令记录中复制。', metrics: { 作用域: scope }, actions: [{ kind: 'navigate', label: '打开记忆中心', tab: 'memory-center' }] }
    if (action === 'config_panel') return { success: true, summary: '当前作用域配置使用“覆盖值 → 全局值”的生效规则。', metrics: { 作用域: scope }, actions: [{ kind: 'navigate', label: '打开配置', tab: scope === 'global' ? 'settings' : 'tools' }] }

    if (action === 'usage_stats') {
      const values = messages.map(messageText)
      const chars = values.reduce((sum, value) => sum + value.length, 0)
      const attachmentCount = messages.reduce((sum, item) => sum + (item.attachments?.length || item.files?.length || 0), 0)
      return {
        success: true,
        summary: `当前会话约占用 ${Math.ceil(chars / 4)} Token；这是按可见文本估算，不代表模型账单。`,
        metrics: {
          消息: messages.length,
          用户消息: messages.filter(item => item.role === 'user').length,
          Agent消息: messages.filter(item => item.role === 'assistant').length,
          字符: chars,
          估算Token: Math.ceil(chars / 4),
          附件: attachmentCount,
        },
      }
    }

    if (action === 'list_sessions') {
      return {
        success: true,
        summary: `当前入口共有 ${sessions.length} 个会话。`,
        metrics: { 会话: sessions.length, 当前会话: currentSessionId || '未选择' },
        items: sessions.map(session => ({
          title: sessionTitle(session),
          detail: session.id || '',
          status: String(session.id || '') === currentSessionId ? '当前' : (session.archived ? '已归档' : ''),
        })),
      }
    }

    if (action === 'copy_last_response') {
      const latest = [...messages].reverse().find(item => item.role === 'assistant' && messageText(item))
      if (!latest) throw new Error('当前会话还没有可复制的 Agent 回复')
      const value = messageText(latest)
      await copyText(value)
      return { success: true, summary: '最近一条 Agent 回复已复制到剪贴板。', metrics: { 字符: value.length } }
    }

    if (action === 'theme') {
      const requested = args.toLowerCase()
      if (requested && !['light', 'dark'].includes(requested)) throw new Error('主题只支持 light 或 dark')
      const theme = requested || (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
      if (requested) {
        localStorage.setItem('theme', theme)
        document.documentElement.setAttribute('data-theme', theme)
        window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: theme }))
      }
      return { success: true, summary: requested ? `已切换为 ${theme === 'dark' ? '深色' : '浅色'}主题。` : `当前使用${theme === 'dark' ? '深色' : '浅色'}主题。`, metrics: { 主题: theme } }
    }

    if (action === 'export_context') {
      const filename = readValue(options.exportFilename, `ccm-${options.scope || 'session'}-context`)
      const value = options.exportValue?.({ context, messages, sessions, currentSessionId }) || { context, currentSessionId, messages }
      downloadCommandJson(filename, value)
      return { success: true, summary: '当前上下文已导出为 JSON。', metrics: { 消息: messages.length } }
    }

    if (action === 'new_session') return options.newSession?.(payload)
    if (action === 'compact_session') return options.compactSession?.(payload)
    if (action === 'clear_session') return options.clearSession?.(payload)
    if (action === 'rename_session') return options.renameSession?.(args, payload)
    throw new Error(`当前入口未实现客户端命令：${action}`)
  }
}
