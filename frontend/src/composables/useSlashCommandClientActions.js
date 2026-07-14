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

export function createSlashCommandClientActions(options = {}) {
  return async (action, payload = {}) => {
    const messages = readValue(options.messages, []) || []
    const sessions = readValue(options.sessions, []) || []
    const context = readValue(options.context, {}) || {}
    const currentSessionId = String(readValue(options.currentSessionId, context.sessionId || '') || '')
    const args = String(payload.args || '').trim()

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
      return {
        success: true,
        summary: options.statusSummary?.({ context, messages, sessions, currentSessionId }) || `当前会话已加载 ${messages.length} 条消息。`,
        metrics: {
          ...(options.contextMetrics?.({ context, messages, sessions, currentSessionId }) || {}),
          消息: messages.length,
          用户消息: users,
          Agent消息: assistants,
          估算Token: Math.ceil(chars / 4),
        },
        items: messages.slice(-8).reverse().map(item => ({
          title: item.role === 'user' ? '用户' : (item.agent || 'Agent'),
          detail: messageText(item).slice(0, 180) || item.type || '结构化消息',
          status: item.timestamp || item.created_at || '',
        })),
      }
    }

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
    if (action === 'clear_session') return options.clearSession?.(payload)
    if (action === 'rename_session') return options.renameSession?.(args, payload)
    throw new Error(`当前入口未实现客户端命令：${action}`)
  }
}
