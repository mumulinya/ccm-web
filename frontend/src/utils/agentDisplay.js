const INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|task-notification|scratchpad|trace_id|session_id|session_ids|run_id|native_session|task_agent_session|workflow_timeline|shouldDelegate|Runtime Kernel|Coordinator|Pipeline|Trace Replay|raw\s+receipt|raw\s+payload|raw_report|原始回执|回执要求|任务级原生会话/i
const TECHNICAL_OBJECT_KEY_PATTERN = /^(technical|technical_details|technicalDetails|raw|payload|debug|trace|workchain|display_policy|displayPolicy|runtime_kernel|runtimeKernel|diff)$/i
const TECHNICAL_STRING_KEY_PATTERN = /^(id|task_id|taskId|trace_id|traceId|session_id|sessionId|session_ids|sessionIds|run_id|runId|parent_run_id|parentRunId|schema|kind|tone|status|phase|path|file|url|href|at|time|timestamp|created_at|createdAt|updated_at|updatedAt|source|mode)$/i
const FILE_LIST_KEY_PATTERN = /^(files|file_changes|fileChanges|actual_file_changes|actualFileChanges|changes|execution_ids|executionIds|session_ids|sessionIds|worker_context_packet_ids|workerContextPacketIds|injection_ids|injectionIds)$/i

export const sanitizeUserFacingLegacyTerminology = (value = '') => String(value || '')
  .replace(/最终\s*收尾\s*门禁/g, '最终收尾检查')
  .replace(/交付\s*门禁/g, '交付验收')
  .replace(/验收\s*门禁/g, '验收检查')
  .replace(/完成\s*门禁/g, '完成检查')
  .replace(/合并\s*门禁/g, '合并前检查')
  .replace(/测试\s*和\s*合并\s*门禁/g, '测试和合并检查')
  .replace(/路径\s*门禁/g, '路径范围检查')
  .replace(/权限\s*门禁/g, '权限检查')
  .replace(/记忆\s*派发\s*门禁/g, '记忆派发检查')
  .replace(/压缩后\s*重注入\s*门禁/g, '压缩后重注入检查')
  .replace(/门禁\s*通过/g, '验收通过')
  .replace(/门禁\s*未通过/g, '验收未通过')
  .replace(/未过\s*门禁/g, '未通过验收')
  .replace(/记忆\s*gate\s*引用/gi, '记忆使用声明')
  .replace(/重注入\s*gate\s*引用/gi, '重注入声明')
  .replace(/gate\/候选引用\/使用状态/gi, '声明/候选使用状态')
  .replace(/\bgate\b/gi, '检查项')
  .replace(/门禁/g, '检查')
  .replace(/原始\s*回执/g, '底层执行记录')
  .replace(/结构化\s*回执/g, '结构化结果说明')
  .replace(/回执\s*质量/g, '结果说明质量')
  .replace(/回执\s*评分/g, '结果说明评分')
  .replace(/补充\s*回执/g, '补充结果说明')
  .replace(/补\s*回执/g, '补结果说明')
  .replace(/等待\s*回执/g, '等待结果说明')
  .replace(/读取\s*子\s*Agent\s*回执/g, '读取子 Agent 结果说明')
  .replace(/子\s*Agent\s*回执/g, '子 Agent 结果说明')
  .replace(/主\s*Agent\s*回执/g, '主 Agent 说明')
  .replace(/回执/g, '结果说明')
  .replace(/\breceipt[-_\s]*status\b/gi, '结果状态')
  .replace(/\braw\s+receipts?\b/gi, '底层执行记录')
  .replace(/\breceipts?\b/gi, '结果说明')
  .replace(/\bACK\b/g, '接单确认')

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
  text = sanitizeUserFacingLegacyTerminology(text)
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export const sanitizeUserFacingStructure = (value, {
  fallback = '这部分信息已整理，技术细节已放入技术详情。',
  max = 420,
  key = '',
  parentKey = '',
} = {}) => {
  if (value === undefined || value === null) return value
  if (typeof value === 'string') {
    if (TECHNICAL_STRING_KEY_PATTERN.test(key) || FILE_LIST_KEY_PATTERN.test(parentKey)) return value
    return sanitizeUserFacingAgentText(value, fallback, max)
  }
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map(item => sanitizeUserFacingStructure(item, { fallback, max, key: '', parentKey: key || parentKey }))
  }
  if (TECHNICAL_OBJECT_KEY_PATTERN.test(key)) return value
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
    childKey,
    sanitizeUserFacingStructure(childValue, { fallback, max, key: childKey, parentKey: key }),
  ]))
}

export const getDisplayStream = (source) => {
  if (source?.display_stream || source?.displayStream || source?.technical?.display_stream || source?.technical?.displayStream) {
    return source?.display_stream || source?.displayStream || source?.technical?.display_stream || source?.technical?.displayStream
  }
  if (source?.workchain) {
    return {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: source.workchain.user_visible_text,
      tool_use_summary: { tool_summary: source.workchain.completion_summary?.evidence?.join('，') || '' },
      technical_details: source.workchain.technical_details || [],
      workchain: source.workchain,
      progress_checkpoints: source.workchain.progress_checkpoints || null,
      delivery_report: source.workchain.delivery_report || source.workchain.completion_summary?.delivery_report || null,
    }
  }
  return null
}

export const getDeliveryReport = (source) => {
  const stream = getDisplayStream(source)
  const report = source?.delivery_report
    || source?.deliveryReport
    || source?.final_delivery_report
    || source?.finalDeliveryReport
    || source?.final_report?.delivery_report
    || source?.finalReport?.deliveryReport
    || source?.delivery_summary?.delivery_report
    || source?.deliverySummary?.deliveryReport
    || stream?.delivery_report
    || stream?.workchain?.delivery_report
    || stream?.workchain?.completion_summary?.delivery_report
    || null
  return sanitizeUserFacingStructure(report, { fallback: '交付结果已整理，技术细节已放入技术详情。', max: 420 })
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
  if (Array.isArray(stream?.workchain?.technical_details) && stream.workchain.technical_details.length) return stream.workchain.technical_details
  const technical = fallbackTechnical || source?.technical || {}
  const troubleshooting = []
  const records = []
  if (technical.failed_gates?.length) troubleshooting.push({ label: '未通过验收', value: sanitizeUserFacingAgentText(technical.failed_gates.map(item => item.label || item.id || item).join('、'), '仍有验收检查未通过。', 240) })
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
