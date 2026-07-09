const INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|task-notification|scratchpad|trace_id|session_id|session_ids|run_id|native_session|task_agent_session|workflow_timeline|shouldDelegate|Runtime Kernel|Coordinator|Pipeline|Trace Replay|raw\s+receipt|raw\s+payload|raw_report|原始回执|回执要求|任务级原生会话|[A-Za-z]:[\\/][^\r\n]*(?:test-agent-artifacts|artifact-manifest\.json|report\.md|report\.json|verdict\.json)|test-agent-artifacts|artifact-manifest\.json|verdict\.json|raw\s+stack|stack\s+trace/i
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
  .replace(/读取\s*子\s*Agent\s*回执/g, '读取执行成员结果说明')
  .replace(/子\s*Agent\s*回执/g, '执行成员结果说明')
  .replace(/主\s*Agent\s*回执/g, '处理说明')
  .replace(/回执/g, '结果说明')
  .replace(/派发群聊主\s*Agent/g, '安排群聊执行')
  .replace(/发送群聊主\s*Agent\s*指令/g, '发送协作群指令')
  .replace(/群聊主\s*Agent/g, '协作群')
  .replace(/全局主\s*Agent\s*(已|正在|会|必须|需要|可以|将|要)/g, '我$1')
  .replace(/全局主\s*Agent/g, '我')
  .replace(/全局协调流程\s*(已|正在|会|必须|需要|可以|将|要)/g, '我$1')
  .replace(/全局协调流程/g, '我')
  .replace(/全局\s*监工/g, '全局任务跟进')
  .replace(/监工中/g, '持续跟进中')
  .replace(/监工状态/g, '持续跟进状态')
  .replace(/异步监工/g, '持续跟进')
  .replace(/主\s*Agent\s*工作链路/g, '处理链路')
  .replace(/主\s*Agent\s*执行计划/g, '执行计划')
  .replace(/主\s*Agent\s*工作计划/g, '执行计划')
  .replace(/主\s*Agent\s*返工计划/g, '返工计划')
  .replace(/主\s*Agent\s*复盘/g, '复盘')
  .replace(/主\s*Agent\s*计划/g, '执行计划')
  .replace(/主\s*Agent\s*验收/g, '最终验收')
  .replace(/主\s*Agent\s*(已|正在|会|必须|需要|可以|将|要)/g, '我$1')
  .replace(/等待\s*主\s*Agent/g, '等待我')
  .replace(/负责\s*主\s*Agent/g, '负责人')
  .replace(/主\s*Agent/g, '我')
  .replace(/派发给\s*(\d+)\s*个子\s*Agent\s*执行/g, '安排 $1 个执行成员处理')
  .replace(/派发子\s*Agent\s*工作单/g, '安排执行成员任务')
  .replace(/子\s*Agent\s*工作单/g, '执行成员任务')
  .replace(/派发给子\s*Agent\s*执行/g, '安排执行成员处理')
  .replace(/已派发给子\s*Agent/g, '已安排给执行成员')
  .replace(/派发子\s*Agent/g, '安排执行成员')
  .replace(/子\s*Agent\s*执行摘要/g, '执行成员执行摘要')
  .replace(/子\s*Agent\s*进展摘要/g, '执行成员进展')
  .replace(/子\s*Agent\s*执行计划/g, '执行成员接单计划')
  .replace(/子\s*Agent\s*状态/g, '执行成员状态')
  .replace(/子\s*Agent\s*结果说明/g, '执行成员结果说明')
  .replace(/子\s*Agent\/项目/g, '执行成员/项目')
  .replace(/子\s*Agent/g, '执行成员')
  .replace(/项目\s*Agent/g, '项目执行成员')
  .replace(/\breceipt[-_\s]*status\b/gi, '结果状态')
  .replace(/\braw\s+receipts?\b/gi, '底层执行记录')
  .replace(/\breceipts?\b/gi, '结果说明')
  .replace(/\bACK\b/g, '接单说明')
  .replace(/接单确认/g, '接单说明')
  .replace(/API\s*microcompact\s*edit\s*plan/gi, '上下文压缩计划')
  .replace(/API\s*microcompact/gi, '上下文压缩')
  .replace(/\bmicrocompact\b/gi, '上下文压缩')
  .replace(/native[_\s-]*applied/gi, '已实际应用')
  .replace(/\bnative\s*apply\b/gi, '实际应用')
  .replace(/\badvisory\b/gi, '参考使用')
  .replace(/\bignored\b/gi, '未使用')
  .replace(/\bused\b/gi, '已使用')
  .replace(/\bverified\b/gi, '已核对')
  .replace(/used\s*\/\s*ignored\s*\/\s*verified/gi, '已使用/未使用/已核对')

export const sanitizeUserFacingAgentText = (value, fallback = '我正在处理当前请求。', max = 260) => {
  let text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) text = fallback
  if (INTERNAL_TEXT_PATTERN.test(text)) {
    if (/error|失败|权限|denied|invalid|门禁/i.test(text)) text = '我遇到需要处理的执行保护或权限问题，排障信息已放入技术详情。'
    else if (/done|完成|receipt|回执/i.test(text)) text = '执行成员已提交结构化结果说明，我正在汇总验收。'
    else text = fallback
  }
  text = text
    .replace(/\bCoordinator\b/g, '协调流程')
    .replace(/\bPipeline\b/g, '协作看板')
    .replace(/\bRuntime Kernel\b/g, '技术运行信息')
    .replace(/\bTrace Replay\b/g, '技术回放')
  text = sanitizeUserFacingLegacyTerminology(text)
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export const sanitizeUserFacingPlanText = (value, fallback = '计划信息已整理。', max = 260) => {
  let text = sanitizeUserFacingAgentText(value, fallback, max + 80)
  text = text
    .replace(/主\s*Agent\s*工作链路/g, '处理链路')
    .replace(/主\s*Agent\s*执行计划/g, '执行计划')
    .replace(/主\s*Agent\s*工作计划/g, '执行计划')
    .replace(/主\s*Agent\s*返工计划/g, '返工计划')
    .replace(/主\s*Agent\s*复盘/g, '复盘')
    .replace(/派发群聊主\s*Agent/g, '安排群聊执行')
    .replace(/群聊主\s*Agent/g, '协作群')
    .replace(/全局主\s*Agent/g, '全局协调流程')
    .replace(/全局\s*监工/g, '全局任务跟进')
    .replace(/监工中/g, '持续跟进中')
    .replace(/监工状态/g, '持续跟进状态')
    .replace(/异步监工/g, '持续跟进')
    .replace(/下游\s*Agent/g, '下游执行成员')
    .replace(/执行\s*Agent/g, '执行成员')
    .replace(/确认后派发/g, '确认后安排')
    .replace(/确认后主\s*Agent\s*才会/g, '确认后我才会')
    .replace(/确认后主\s*Agent\s*会/g, '确认后我会')
    .replace(/等待主\s*Agent/g, '等待我')
    .replace(/主\s*Agent\s*计划/g, '执行计划')
    .replace(/主\s*Agent\s*验收/g, '最终验收')
    .replace(/主\s*Agent\s*正在/g, '我正在')
    .replace(/主\s*Agent\s*已/g, '我已')
    .replace(/主\s*Agent\s*会/g, '我会')
    .replace(/主\s*Agent\s*必须/g, '我会')
    .replace(/主\s*Agent\s*需要/g, '我需要')
    .replace(/主\s*Agent/g, '我')
    .replace(/派发给\s*(\d+)\s*个子\s*Agent\s*执行/g, '安排 $1 个执行成员处理')
    .replace(/派发子\s*Agent\s*工作单/g, '安排执行成员任务')
    .replace(/子\s*Agent\s*工作单/g, '执行成员任务')
    .replace(/派发给子\s*Agent\s*执行/g, '安排执行成员处理')
    .replace(/已派发给子\s*Agent/g, '已安排给执行成员')
    .replace(/派发子\s*Agent/g, '安排执行成员')
    .replace(/子\s*Agent\s*执行摘要/g, '执行成员执行摘要')
    .replace(/子\s*Agent\s*进展摘要/g, '执行成员进展')
    .replace(/子\s*Agent\s*执行计划/g, '执行成员接单计划')
    .replace(/子\s*Agent\s*状态/g, '执行成员状态')
    .replace(/子\s*Agent\s*结果说明/g, '执行成员结果说明')
    .replace(/子\s*Agent\/项目/g, '执行成员/项目')
    .replace(/子\s*Agent/g, '执行成员')
    .replace(/项目\s*Agent/g, '项目执行成员')
    .replace(/\bcoordinator\b/gi, '我来协调')
    .replace(/我\s+与/g, '我与')
    .replace(/我\s+的/g, '我的')
    .replace(/我\s+已/g, '我已')
    .replace(/我\s+正在/g, '我正在')
    .replace(/我\s+会/g, '我会')
    .replace(/执行成员\s+([\u4e00-\u9fff])/g, '执行成员$1')
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export const sanitizeUserFacingPlanStructure = (value, {
  fallback = '这部分信息已整理，技术细节已放入技术详情。',
  max = 420,
  key = '',
  parentKey = '',
} = {}) => {
  if (value === undefined || value === null) return value
  if (typeof value === 'string') {
    if (TECHNICAL_STRING_KEY_PATTERN.test(key) || FILE_LIST_KEY_PATTERN.test(parentKey)) return value
    return sanitizeUserFacingPlanText(value, fallback, max)
  }
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map(item => sanitizeUserFacingPlanStructure(item, { fallback, max, key: '', parentKey: key || parentKey }))
  }
  if (TECHNICAL_OBJECT_KEY_PATTERN.test(key)) return value
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
    childKey,
    sanitizeUserFacingPlanStructure(childValue, { fallback, max, key: childKey, parentKey: key }),
  ]))
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
      todo_plan: source.workchain.todo_plan || source.workchain.todoPlan || null,
      todoPlan: source.workchain.todoPlan || source.workchain.todo_plan || null,
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
  if (technical.supervisor_id) records.push({ label: '跟进记录', value: technical.supervisor_id })
  if (technical.gap_fingerprint) records.push({ label: '缺口指纹', value: technical.gap_fingerprint })
  return [
    { id: 'troubleshooting', title: '排障摘要', items: troubleshooting },
    { id: 'records', title: '完整记录', items: records },
  ].filter(section => section.items.length)
}

const testAgentArtifactLabel = (value = '') => {
  const key = String(value || '').trim().toLowerCase()
  if (!key) return ''
  if (key === 'report_json') return '结构化报告'
  if (key === 'report_markdown') return '报告文档'
  if (key === 'artifact_manifest') return '证据清单'
  if (key === 'verdict_json') return '复核结论'
  if (key === 'screenshot') return '页面截图'
  if (key === 'page_snapshot') return '页面快照'
  if (key === 'console_log') return '浏览器日志'
  if (key === 'network_log') return '网络记录'
  if (key === 'browser_trace') return '浏览器轨迹'
  if (key === 'browser_har') return '网络归档'
  if (key === 'download' || key === 'browser_download' || key === 'file_download' || key === 'downloaded_file') return '文件下载证据'
  if (key === 'upload' || key === 'browser_upload' || key === 'file_upload' || key === 'upload_file') return '文件上传证据'
  return sanitizeUserFacingAgentText(key.replace(/[_-]+/g, ' '), '证据文件', 60)
}

const testAgentPlanIssueLabel = (issue = {}) => {
  const code = String(issue?.code || '').trim().toLowerCase()
  if (code === 'missing_work_dir') return '缺少项目工作目录，请补齐 TestAgent 交接信息。'
  if (code === 'missing_project') return '缺少被复核项目，请补齐 TestAgent 复核范围。'
  if (code === 'missing_acceptance_criteria') return '缺少验收标准，请先说明 TestAgent 需要验证什么。'
  if (code === 'missing_required_checks') return '缺少必需检查，请补齐命令、HTTP 或浏览器验证安排。'
  if (code === 'invalid_artifact_dir') return '证据归档目录不可用，请调整 TestAgent 产物配置。'
  if (code === 'handoff_builder_warning') return '交接信息不完整，我需要先补齐再执行复核。'
  return sanitizeUserFacingAgentText(issue?.message || code || '复核计划预检提示', '复核计划预检提示已整理。', 160)
}

export const summarizeTestAgentExecutionPlan = (plan = null, detail = '') => {
  if (!plan && !detail) return null
  const summary = plan?.summary || {}
  const issueRows = Array.isArray(plan?.issues) ? plan.issues.filter(Boolean) : []
  const errorCount = issueRows.filter(item => String(item?.severity || '').toLowerCase() === 'error').length
  const commandCount = Number(summary.commands || plan?.commands?.length || 0)
  const httpCount = Number(summary.httpChecks || 0) + Number(summary.adversarialHttpChecks || 0)
  const browserCount = Number(summary.browserChecks || 0)
  const projectCount = Number(summary.projects || plan?.projects?.length || 0)
  const artifacts = Array.isArray(summary.expectedArtifactTypes) ? summary.expectedArtifactTypes.map(testAgentArtifactLabel).filter(Boolean) : []
  const status = plan?.valid === false || errorCount > 0 ? 'blocked' : plan?.valid === true ? 'ready' : 'recorded'
  const fallbackHeadline = sanitizeUserFacingAgentText(detail, 'TestAgent 复核计划已生成，我会先确认计划可执行，再启动真实复核。', 260)
  const rows = [
    projectCount ? `复核范围：${projectCount} 个项目` : '',
    commandCount ? `命令检查：${commandCount} 项` : '',
    httpCount ? `HTTP 检查：${httpCount} 项` : '',
    browserCount ? `浏览器检查：${browserCount} 项` : '',
    artifacts.length ? `预期证据：${artifacts.slice(0, 8).join('、')}` : '',
  ].filter(Boolean)
  const issues = issueRows.map(testAgentPlanIssueLabel).slice(0, 5)
  return {
    schema: 'ccm-test-agent-execution-plan-summary-v1',
    title: 'TestAgent 复核计划',
    status,
    status_label: status === 'ready' ? '可执行' : status === 'blocked' ? '需修复' : '已生成',
    headline: status === 'ready'
      ? 'TestAgent 已生成复核计划，我会按这份计划启动真实验证。'
      : status === 'blocked'
        ? 'TestAgent 复核计划预检未通过，我会先修复交接信息再执行。'
        : fallbackHeadline,
    rows: rows.length ? rows : [fallbackHeadline],
    issues,
    next_action: status === 'ready'
      ? '启动 TestAgent 真实复核，并把结论纳入最终验收。'
      : status === 'blocked'
        ? '修复 TestAgent 工作单或项目路径后重新生成复核计划。'
        : '等待 TestAgent 复核计划补齐更多结构化信息。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  }
}

export const normalizeTestAgentExecutionPlanSummary = (plan = null, summaryOrDetail = null, detail = '') => {
  if (summaryOrDetail && typeof summaryOrDetail === 'object') {
    const hasStructuredSummary = summaryOrDetail.schema === 'ccm-test-agent-execution-plan-summary-v1'
      || summaryOrDetail.title
      || summaryOrDetail.headline
      || Array.isArray(summaryOrDetail.rows)
    if (hasStructuredSummary) {
      return sanitizeUserFacingStructure(summaryOrDetail, { fallback: 'TestAgent 复核计划已整理。', max: 420 })
    }
  }
  const detailText = [
    typeof summaryOrDetail === 'string' ? summaryOrDetail : '',
    typeof detail === 'string' ? detail : '',
  ].filter(Boolean).join('；')
  return summarizeTestAgentExecutionPlan(plan, detailText)
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
  if (counts.done) parts.push('已回传结果')
  if (counts.error) parts.push('有错误')
  const summary = sanitizeUserFacingAgentText(
    parts.length ? parts.join('，') : last?.text,
    done ? '执行成员已回传结果，等待我汇总验收。' : hasError ? '执行成员执行遇到问题，排障信息已折叠。' : '执行成员正在执行。',
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
