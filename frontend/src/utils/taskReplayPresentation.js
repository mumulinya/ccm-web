const text = value => String(value ?? '').replace(/\r\n/g, '\n').trim()

const FRIENDLY_ACTORS = {
  coordinator: '群聊主 Agent',
  system: '系统',
  user: '用户',
  'task runner': '自动执行服务',
  '任务运行器': '自动执行服务',
}

const TECHNICAL_EVENT_PATTERNS = [
  /^idempotency\./i,
  /\.message_persisted$/i,
  /^main_agent_decision$/i,
  /^task\.lease_/i,
  /^task\.status_changed$/i,
  /^agent_runtime\.(heartbeat|ack|lock)/i,
  /^global_agent\.tool_(started|requested)$/i,
]

const ROUTINE_TASK_LOG = /任务已加入队列|任务状态更新为|调用 Agent 执行任务|Agent 响应|开始执行任务/i

export const replayActorLabel = actor => {
  const raw = text(actor?.label)
  const key = raw.toLowerCase()
  if (FRIENDLY_ACTORS[key]) return FRIENDLY_ACTORS[key]
  if (actor?.type === 'group_agent') return raw && raw !== 'coordinator' ? raw : '群聊主 Agent'
  if (actor?.type === 'global_agent') return '全局主 Agent'
  if (actor?.type === 'test_agent') return 'TestAgent（独立验收）'
  if (actor?.type === 'user') return '用户'
  if (actor?.type === 'system') return raw && raw !== '系统' ? raw : '系统'
  return raw || '系统'
}

export const replayProjectLabel = item => {
  const project = text(item?.project)
  if (!project || ['coordinator', 'system', 'user'].includes(project.toLowerCase())) return ''
  return project
}

export const isReplayDiagnosticEvent = item => {
  if (!item) return false
  if (item.audience === 'technical') return true
  const category = text(item.category || item.technical?.type)
  if (TECHNICAL_EVENT_PATTERNS.some(pattern => pattern.test(category))) return true
  return category === 'task_log'
    && item.status === 'info'
    && ROUTINE_TASK_LOG.test(text(item.summary || item.title))
}

export const sanitizeReplayText = value => text(value)
  .replace(/TestAgent(?:（独立验收）)?/gi, 'TestAgent（独立验收）')
  .replace(/工作项/g, '执行步骤')
  .replace(/回执/g, '执行结果')
  .replace(/作用域/g, '任务来源')
  .replace(/\bdaily_dev\b/gi, '当前群聊任务')
  .replace(/\bclaudecode:stale_ok\b/gi, 'Claude Code 登录检测已过期')
  .replace(/\bclaudecode:missing\b/gi, 'Claude Code 尚未完成可用性检测')
  .replace(/OpenAI-compatible(?: JSON)? model call失败/gi, '主 Agent 模型调用失败')
  .replace(/This operation was aborted/gi, '请求超时或被中止')
  .replace(/\bACK\b/g, '接单确认')
  .replace(/\bRunner\b/g, '验证程序')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const stageFallbackTitle = (stage, status) => {
  if (status === 'failed') return '本阶段执行失败'
  if (status === 'blocked') return '本阶段需要处理'
  if (status === 'warning') return '本阶段存在注意事项'
  return {
    intake: '已确认任务要求',
    planning: '执行计划已更新',
    dispatch: '任务安排已更新',
    execution: '执行进度已更新',
    change: '代码改动已更新',
    test: '独立验收已更新',
    rework: '返工进度已更新',
    review: '主 Agent 验收已更新',
    completion: '任务交付已更新',
    system: '系统状态已更新',
  }[stage] || '任务进度已更新'
}

export const replayEventTitle = item => {
  const raw = sanitizeReplayText(item?.title)
  const category = text(item?.category || item?.technical?.type)

  if (category === 'group.message_persisted') return '会话已保存本次进展'
  if (category === 'idempotency.completed') {
    if (/group-task-message/i.test(raw)) return '任务已创建并进入目标群聊'
    if (/global-agent-tool/i.test(raw)) return '全局主 Agent 已完成本轮操作'
    return '本轮操作已完成'
  }
  if (category === 'idempotency.acquired') return '系统开始处理本轮操作'
  if (category === 'idempotency.failed') return '本轮操作未完成'
  if (category === 'global_agent.tool_completed') {
    if (/send_group_cmd/i.test(raw)) return '任务已发送到目标群聊'
    return '全局主 Agent 已完成本轮操作'
  }
  if (category === 'global_agent.tool_failed') return '全局主 Agent 操作失败'
  if (category === 'global_agent.clarification_received') return '执行范围已经确认'
  if (category === 'global_agent.run_completed') return '全局主 Agent 已完成本轮处理'
  if (category === 'task.lease_acquired') return '任务开始执行'
  if (category === 'task.status_changed') return '任务状态已更新'
  if (category === 'main_agent_decision') return '主 Agent 已完成本轮决策'
  if (category === 'task_log') {
    const source = sanitizeReplayText(item?.summary || raw)
    if (/任务已加入队列/i.test(source)) return '任务已进入执行队列'
    if (/开始执行任务/i.test(source)) return '任务开始执行'
    if (/任务状态更新为/i.test(source)) return '任务状态已更新'
    if (/调用 Agent 执行任务/i.test(source)) return '正在安排执行成员'
    if (/Agent 响应/i.test(source)) return '执行成员已返回结果'
    if (item?.status === 'warning') return '执行条件需要处理'
  }

  if (!raw || raw.length > 120 || raw.includes('\n') || /【(?:主|全局主) Agent .*工作单】/.test(raw)) {
    return stageFallbackTitle(item?.stage, item?.status)
  }
  return raw
}

export const replayEventSummary = item => {
  const rawTitle = sanitizeReplayText(item?.title)
  const rawSummary = sanitizeReplayText(item?.summary)
  const friendlyTitle = replayEventTitle(item)
  const source = rawSummary || (rawTitle !== friendlyTitle ? rawTitle : '')
  if (!source || source === friendlyTitle) return ''
  return source
}

export const replayFileStatusLabel = value => {
  const status = text(value).toLowerCase()
  return {
    a: '新增',
    added: '新增',
    add: '新增',
    m: '已修改',
    modified: '已修改',
    modify: '已修改',
    changed: '已修改',
    change: '已修改',
    d: '已删除',
    deleted: '已删除',
    delete: '已删除',
    r: '已重命名',
    renamed: '已重命名',
    u: '未跟踪',
    untracked: '未跟踪',
  }[status] || text(value) || '已变更'
}

export const replayWorkStatusLabel = value => {
  const status = text(value).toLowerCase()
  return {
    pending: '等待执行',
    queued: '排队中',
    running: '执行中',
    in_progress: '执行中',
    testing: '验收中',
    reviewing: '验收中',
    reworking: '返工中',
    done: '已完成',
    completed: '已完成',
    succeeded: '已完成',
    passed: '已通过',
    warning: '需注意',
    blocked: '需处理',
    failed: '未完成',
    cancelled: '已取消',
    canceled: '已取消',
  }[status] || text(value) || '等待执行'
}

const TECHNICAL_LABELS = {
  category: '事件分类',
  actor: '原始执行方',
  project: '内部项目',
  task_id: '任务编号',
  type: '内部事件',
  runtime: '运行环境',
  phase: '内部阶段',
  files: '关联文件',
  merged_from: '数据来源',
  merged_count: '合并数量',
  checks: '验收检查',
  passed_count: '通过项',
  failed_count: '未通过项',
  plan_id: '计划编号',
  run_id: '运行编号',
  session_id: '会话编号',
  trace_id: '追踪编号',
  generation: '会话代次',
  provider: '模型服务',
  browser_flow: '页面验收流程',
  console_errors: '控制台错误数',
  failed_assertion: '未通过的验收项',
  mcp: 'MCP 工具',
  skills: 'Skills',
  skill: 'Skill',
  semantic_decision: '模型语义决策回执',
  semantic_reason: '模型决策原因',
  semantic_action: '模型决策动作',
  semantic_target: '模型选择目标',
  criterion_coverage: '验收标准覆盖',
  unplanned_criteria: '未规划验收标准',
}

export const replayTechnicalLabel = key => TECHNICAL_LABELS[key] || text(key).replace(/_/g, ' ')
