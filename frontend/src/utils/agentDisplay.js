const INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Coordinator|Pipeline|Trace Replay|回执要求|任务级原生会话/i

export const sanitizeUserFacingAgentText = (value, fallback = 'Agent 正在处理当前请求。', max = 260) => {
  let text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) text = fallback
  if (INTERNAL_TEXT_PATTERN.test(text)) {
    if (/error|失败|权限|denied|invalid|门禁/i.test(text)) text = 'Agent 遇到需要处理的执行保护或权限问题，排障信息已放入技术详情。'
    else if (/done|完成|receipt|回执/i.test(text)) text = 'Agent 已提交结构化完成信息，主 Agent 正在汇总验收。'
    else text = fallback
  }
  text = text
    .replace(/\bCoordinator\b/g, '主 Agent')
    .replace(/\bPipeline\b/g, '协作看板')
    .replace(/\bRuntime Kernel\b/g, '技术运行信息')
    .replace(/\bTrace Replay\b/g, '技术回放')
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export const getDisplayStream = (source) => {
  return source?.display_stream || source?.displayStream || source?.technical?.display_stream || source?.technical?.displayStream || null
}

export const getStreamlinedUserText = (source, fallback = '') => {
  const stream = getDisplayStream(source)
  return sanitizeUserFacingAgentText(stream?.user_visible_text || stream?.text_message?.text || fallback)
}

export const getStreamlinedToolSummary = (source, fallback = '') => {
  const stream = getDisplayStream(source)
  const summary = stream?.tool_use_summary?.tool_summary || fallback
  return sanitizeUserFacingAgentText(summary, '本轮没有需要展示的工具调用。', 180)
}

export const getTechnicalDetailSections = (source, fallbackTechnical = null) => {
  const stream = getDisplayStream(source)
  if (Array.isArray(stream?.technical_details) && stream.technical_details.length) return stream.technical_details
  const technical = fallbackTechnical || source?.technical || {}
  const troubleshooting = []
  const records = []
  if (technical.failed_gates?.length) troubleshooting.push({ label: '未过门禁', value: technical.failed_gates.map(item => item.label || item.id || item).join('、') })
  if (technical.blockers?.length) troubleshooting.push({ label: '阻塞', value: technical.blockers.slice(0, 5).join('；') })
  if (technical.trace_id) records.push({ label: 'Trace', value: technical.trace_id })
  if (technical.execution_ids?.length) records.push({ label: '执行', value: technical.execution_ids.join('、') })
  if (technical.session_ids?.length) records.push({ label: '会话', value: technical.session_ids.join('、') })
  if (technical.run_id) records.push({ label: 'Run', value: technical.run_id })
  if (technical.parent_run_id) records.push({ label: '上轮', value: technical.parent_run_id })
  if (technical.supervisor_id) records.push({ label: '监工', value: technical.supervisor_id })
  if (technical.gap_fingerprint) records.push({ label: '缺口指纹', value: technical.gap_fingerprint })
  return [
    { id: 'troubleshooting', title: '排障摘要', items: troubleshooting },
    { id: 'records', title: '完整记录', items: records },
  ].filter(section => section.items.length)
}

export const summarizeWorkEvents = (events = []) => {
  const rows = Array.isArray(events) ? events.filter(Boolean) : []
  const counts = rows.reduce((acc, event) => {
    const kind = event?.kind || 'status'
    acc[kind] = (acc[kind] || 0) + 1
    return acc
  }, {})
  const hasError = rows.some(event => event.kind === 'error')
  const done = rows.some(event => event.kind === 'done')
  const last = rows[rows.length - 1]
  const parts = []
  if (counts.tool) parts.push(`工具 ${counts.tool} 次`)
  if (counts.output) parts.push(`输出 ${counts.output} 条`)
  if (counts.status) parts.push(`状态 ${counts.status} 条`)
  if (counts.done) parts.push('已完成')
  if (counts.error) parts.push('有错误')
  const summary = sanitizeUserFacingAgentText(
    parts.length ? parts.join('，') : last?.text,
    done ? '子 Agent 已完成执行，等待主 Agent 汇总。' : hasError ? '子 Agent 执行遇到问题，排障信息已折叠。' : '子 Agent 正在执行。',
    160
  )
  return {
    summary,
    counts,
    hiddenCount: Math.max(0, rows.length - 3),
    latestText: sanitizeUserFacingAgentText(last?.text, summary, 180),
    visibleEvents: rows.slice(-3),
  }
}
