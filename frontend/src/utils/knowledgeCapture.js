const asArray = (value) => Array.isArray(value) ? value : []

const compact = (value, max = 600) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

const bulletList = (items, empty = '无') => {
  const rows = asArray(items)
    .map((item) => {
      if (!item) return ''
      if (typeof item === 'string') return item.trim()
      const path = item.path || item.file || item.name
      const status = item.statusText || item.status || item.status_kind
      const project = item.project || item.target_project
      if (path) return `${project ? `[${project}] ` : ''}${path}${status ? `（${status}）` : ''}`
      return compact(JSON.stringify(item), 240)
    })
    .filter(Boolean)
  return rows.length ? rows.map(row => `- ${row}`).join('\n') : `- ${empty}`
}

const section = (title, content) => {
  const body = String(content || '').trim()
  return `## ${title}\n\n${body || '无'}`
}

const normalizeFiles = (card = {}, msg = {}) => {
  const delivery = card.delivery || {}
  return [
    ...asArray(delivery.files),
    ...asArray(delivery.changes),
    ...asArray(msg.fileChanges?.files),
    ...asArray(msg.receipt?.filesModified),
    ...asArray(msg.receipt?.files_modified),
  ]
}

const normalizeVerification = (card = {}, msg = {}) => {
  const delivery = card.delivery || {}
  return [
    ...asArray(delivery.verification),
    ...asArray(msg.receipt?.verification),
    ...asArray(msg.receipt?.verification_results),
    ...asArray(msg.taskExperience?.verification),
  ].map(item => typeof item === 'string' ? item : JSON.stringify(item)).filter(Boolean)
}

const sourceBlock = (items = {}) => {
  return Object.entries(items)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => `- ${key}：${value}`)
    .join('\n')
}

const conversationDigest = (messages = [], maxItems = 40) => {
  const rows = asArray(messages)
    .filter(msg => msg && (msg.role || msg.content))
    .slice(-maxItems)
    .map((msg, index) => {
      const role = msg.role === 'user' ? '用户' : msg.role === 'assistant' ? (msg.agent ? `Agent(${msg.agent})` : 'Agent') : (msg.role || '消息')
      const time = msg.timestamp ? ` · ${msg.timestamp}` : ''
      const content = compact(msg.content || msg.requestText || msg.summary || '', 900)
      return `### ${index + 1}. ${role}${time}\n\n${content || '（无正文，可能为任务卡/附件/结构化消息）'}`
    })
  return rows.length ? rows.join('\n\n') : '无'
}

export const postKnowledgeCapture = async (payload) => {
  const response = await fetch('/api/rag/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false || data.error) throw new Error(data.error || `保存知识失败 (${response.status})`)
  return data
}

export const buildProjectTaskKnowledgePayload = ({ msg = {}, card = {}, project = '', sessionId = '' } = {}) => {
  const files = normalizeFiles(card, msg)
  const verification = normalizeVerification(card, msg)
  const events = asArray(msg.workEvents).slice(-12).map(event => `${event.kind || 'event'}：${compact(event.text || event.message || event.content || '', 260)}`)
  const content = [
    section('来源', sourceBlock({
      类型: '项目会话任务',
      项目: project,
      会话: sessionId,
      任务: card.task_id || msg.task_id || msg.taskExperience?.task_id || '',
      Agent: `项目 Agent · ${project}`,
      状态: card.phase_label || card.status || '',
    })),
    section('用户需求', msg.requestText || card.goal || card.title || ''),
    section('Agent 结论', card.delivery?.headline || msg.content || ''),
    section('文件变更', bulletList(files)),
    section('验证结果', bulletList(verification)),
    section('执行事件摘要', bulletList(events)),
  ].join('\n\n')
  return {
    title: `项目任务：${card.title || project || '未命名任务'}`,
    content,
    source_type: 'project_task',
    domain: project || 'project',
    project,
    session_id: sessionId,
    task_id: card.task_id || msg.task_id || msg.taskExperience?.task_id || '',
    agent: `project-agent:${project || 'unknown'}`,
    tags: ['task-receipt', 'project-session', project].filter(Boolean),
  }
}

export const buildGroupTaskKnowledgePayload = ({ msg = {}, card = {}, group = null } = {}) => {
  const files = normalizeFiles(card, msg)
  const verification = normalizeVerification(card, msg)
  const runtime = msg.taskRuntime || msg.task_runtime || {}
  const agents = asArray(runtime.agents || card.agents).map(agent => `${agent.name || agent.agent || 'Agent'}：${agent.status || agent.state || ''} ${agent.summary || ''}`.trim())
  const content = [
    section('来源', sourceBlock({
      类型: '群聊协作任务',
      群聊: group?.name || '',
      群聊ID: group?.id || '',
      任务: card.task_id || msg.task_id || '',
      Agent: msg.agent || msg.project || 'group-main-agent',
      状态: card.phase_label || card.status || '',
    })),
    section('用户需求', msg.requestText || card.goal || card.title || ''),
    section('主 Agent 结论', card.delivery?.headline || msg.content || ''),
    section('协作 Agent', bulletList(agents)),
    section('文件变更', bulletList(files)),
    section('验证结果', bulletList(verification)),
    section('风险/阻塞', bulletList(card.blockers || card.delivery?.risks)),
  ].join('\n\n')
  return {
    title: `群聊任务：${card.title || group?.name || '未命名任务'}`,
    content,
    source_type: 'group_task',
    domain: group?.id || group?.name || 'group',
    group_id: group?.id || '',
    task_id: card.task_id || msg.task_id || '',
    agent: msg.agent || 'group-main-agent',
    tags: ['task-receipt', 'group-chat', group?.name || group?.id].filter(Boolean),
  }
}

export const buildGlobalTaskKnowledgePayload = ({ msg = {}, card = {}, sessionId = '' } = {}) => {
  const files = normalizeFiles(card, msg)
  const verification = normalizeVerification(card, msg)
  const run = msg.agenticRun || {}
  const mission = msg.globalMission || {}
  const children = asArray(msg.globalMissionChildren).map(row => {
    const task = row.task || {}
    const target = row.target || task.mission_target || {}
    return `${target.name || task.target_project || task.id || '执行目标'}：${task.status || ''} ${task.status_detail || ''}`.trim()
  })
  const content = [
    section('来源', sourceBlock({
      类型: mission.id ? '全局跨项目任务' : '全局 Agent 执行',
      会话: sessionId,
      任务: card.task_id || mission.id || run.id || '',
      执行记录: card.technical?.trace_id || run.trace_id || mission.trace_id ? '已关联' : '无',
      Agent: 'global-agent',
      状态: card.phase_label || card.status || run.status || mission.status || '',
    })),
    section('用户需求', run.user_message || card.goal || mission.business_goal || card.title || ''),
    section('全局 Agent 结论', card.delivery?.headline || run.final_reply || msg.content || ''),
    section('执行目标', bulletList(children)),
    section('文件变更', bulletList(files)),
    section('验证结果', bulletList(verification)),
    section('风险/阻塞', bulletList(card.blockers || card.delivery?.risks)),
  ].join('\n\n')
  return {
    title: `全局任务：${card.title || mission.title || run.goal || '未命名任务'}`,
    content,
    source_type: mission.id ? 'global_mission' : 'global_agent',
    domain: 'global',
    session_id: sessionId,
    task_id: card.task_id || mission.id || run.id || '',
    agent: 'global-agent',
    tags: ['task-receipt', 'global-agent', mission.id ? 'global-mission' : 'agent-run'],
  }
}

export const buildProjectSessionKnowledgePayload = ({ project = '', sessionId = '', messages = [] } = {}) => {
  const title = `项目会话沉淀：${project || '未命名项目'}`
  const content = [
    section('来源', sourceBlock({
      类型: '项目会话',
      项目: project,
      会话: sessionId,
      消息数: asArray(messages).length,
    })),
    section('对话摘要原文', conversationDigest(messages)),
  ].join('\n\n')
  return {
    title,
    content,
    source_type: 'project_session',
    domain: project || 'project',
    project,
    session_id: sessionId,
    agent: `project-agent:${project || 'unknown'}`,
    tags: ['conversation', 'project-session', project].filter(Boolean),
  }
}

export const buildGroupConversationKnowledgePayload = ({ group = null, messages = [] } = {}) => {
  const title = `群聊对话沉淀：${group?.name || group?.id || '未命名群聊'}`
  const content = [
    section('来源', sourceBlock({
      类型: '群聊对话',
      群聊: group?.name || '',
      群聊ID: group?.id || '',
      消息数: asArray(messages).length,
    })),
    section('对话摘要原文', conversationDigest(messages)),
  ].join('\n\n')
  return {
    title,
    content,
    source_type: 'group_conversation',
    domain: group?.id || group?.name || 'group',
    group_id: group?.id || '',
    agent: 'group-main-agent',
    tags: ['conversation', 'group-chat', group?.name || group?.id].filter(Boolean),
  }
}

export const buildGlobalConversationKnowledgePayload = ({ sessionId = '', messages = [] } = {}) => {
  const title = '全局 Agent 对话沉淀'
  const content = [
    section('来源', sourceBlock({
      类型: '全局 Agent 会话',
      会话: sessionId,
      消息数: asArray(messages).length,
    })),
    section('对话摘要原文', conversationDigest(messages)),
  ].join('\n\n')
  return {
    title,
    content,
    source_type: 'global_conversation',
    domain: 'global',
    session_id: sessionId,
    agent: 'global-agent',
    tags: ['conversation', 'global-agent'],
  }
}
