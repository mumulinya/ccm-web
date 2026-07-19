import { normalizeTestAgentExecutionPlanSummary } from '../../utils/agentDisplay.js'
import {
  getTaskRuntime,
  sanitizeGroupVisibleText,
  resolveTestAgentFallbackTaskId as resolveTestAgentFallbackTaskIdPure,
  getTestAgentReviewPayload,
  testAgentReviewPhase,
  createTestAgentExecutionPlanFallbackMessage as createTestAgentExecutionPlanFallbackMessagePure,
  createTestAgentReviewFallbackMessage as createTestAgentReviewFallbackMessagePure,
} from './groupChatHelpers.js'

export function useGroupChatTasks({ messages, mergeIncomingMessage }) {
  const applyTransientTaskRuntime = (taskId, updater) => {
    if (!taskId) return
    messages.value.forEach((msg) => {
      if (msg.task_id !== taskId) return
      const current = getTaskRuntime(msg) || { taskId, status: msg.task?.status || 'in_progress', counts: {}, agents: [], sessions: [] }
      const next = updater({ ...current, agents: [...(current.agents || [])], sessions: [...(current.sessions || [])] })
      msg.taskRuntime = next
      msg.task_runtime = next
      msg.taskCard = next?.taskCard || next?.task_card || msg.taskCard || msg.task_card || null
      msg.task_card = next?.task_card || next?.taskCard || msg.task_card || msg.taskCard || null
    })
  }
  let latestTestAgentFallbackTaskId = ''
  const resolveTestAgentFallbackTaskId = (data = {}, source = {}, prefix = 'test-agent-review') => {
    const explicit = data.taskId
      || data.task_id
      || data.workOrderId
      || data.work_order_id
      || source?.taskId
      || source?.task_id
      || source?.workOrderId
      || source?.work_order_id
      || ''
    const id = resolveTestAgentFallbackTaskIdPure(data, source, prefix, latestTestAgentFallbackTaskId)
    if (!explicit) latestTestAgentFallbackTaskId = id
    return id
  }
  const createTestAgentExecutionPlanFallbackMessage = (data = {}, summary = {}, plan = null) => {
    const taskId = resolveTestAgentFallbackTaskId(data, plan, 'test-agent-plan')
    if (!taskId) return null
    return createTestAgentExecutionPlanFallbackMessagePure(data, summary, plan, taskId)
  }

  const applyTestAgentExecutionPlanReady = (data = {}) => {
    const plan = data.test_agent_execution_plan || data.testAgentExecutionPlan || data.technical?.test_agent_execution_plan || null
    const summary = normalizeTestAgentExecutionPlanSummary(plan, data.test_agent_execution_plan_summary || data.testAgentExecutionPlanSummary || data.detail || null, data.detail || '')
    if (!summary) return false
    const runtimeStatus = summary.status === 'blocked' ? 'blocked' : 'in_progress'
    const taskId = data.taskId || data.task_id || ''
    let applied = false
    applyTransientTaskRuntime(taskId, (runtime) => {
      const currentCard = runtime.taskCard || runtime.task_card || {}
      const nextCard = {
        ...currentCard,
        test_agent_execution_plan: plan,
        testAgentExecutionPlan: plan,
        test_agent_execution_plan_summary: summary,
        testAgentExecutionPlanSummary: summary,
        test_agent_execution_plan_detail: data.detail || '',
        testAgentExecutionPlanDetail: data.detail || '',
      }
      applied = true
      return {
        ...runtime,
        status: runtimeStatus,
        statusText: summary.headline,
        taskCard: nextCard,
        task_card: nextCard,
        testAgentExecutionPlan: plan,
        test_agent_execution_plan: plan,
        testAgentExecutionPlanSummary: summary,
        test_agent_execution_plan_summary: summary,
      }
    })
    if (applied) return true
    const fallbackMessage = createTestAgentExecutionPlanFallbackMessage(data, summary, plan)
    if (!fallbackMessage) return false
    mergeIncomingMessage(fallbackMessage)
    return true
  }
  const createTestAgentReviewFallbackMessage = (data = {}, summary = {}, payload = {}) => {
    const taskId = resolveTestAgentFallbackTaskId(data, payload.report, 'test-agent-review')
    if (!taskId) return null
    return createTestAgentReviewFallbackMessagePure(data, summary, payload, taskId)
  }

  const applyTestAgentReviewReady = (data = {}) => {
    const payload = getTestAgentReviewPayload(data)
    if (!payload) return { applied: false, mode: 'rejected' }
    const summary = payload.summary || {
      schema: 'ccm-main-agent-independent-review-summary-v1',
      title: '独立复核',
      status: 'recorded',
      status_label: '已记录',
      headline: sanitizeGroupVisibleText(payload.detail, 'TestAgent 独立复核结论已整理。', 360),
      rows: payload.rows,
      next_action: '继续等待完整复核证据或最终总结。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    }
    const taskId = String(data.taskId || data.task_id || '').trim()
    const phase = testAgentReviewPhase(summary.status)
    const runtimeStatus = phase.runtimeStatus
    const normalizeReviewRows = (rows) => (Array.isArray(rows) ? rows : [])
      .map((row) => {
        if (typeof row === 'string') return row
        if (row && typeof row === 'object') {
          return String(row.summary || row.detail || row.verdict || row.reviewer || '').trim()
        }
        return ''
      })
      .filter(Boolean)
    let attached = false
    if (taskId) {
      applyTransientTaskRuntime(taskId, (runtime) => {
        const currentCard = runtime.taskCard || runtime.task_card || {}
        const existingRows = Array.isArray(currentCard.independent_review)
          ? currentCard.independent_review
          : Array.isArray(currentCard.independentReview)
            ? currentCard.independentReview
            : []
        const nextRows = normalizeReviewRows(payload.rows.length ? payload.rows : existingRows)
        const nextCard = {
          ...currentCard,
          phase: phase.phase,
          phase_label: phase.phaseLabel,
          independent_review_summary: summary,
          independentReviewSummary: summary,
          test_agent_review_summary: summary,
          testAgentReviewSummary: summary,
          independent_review: nextRows,
          independentReview: nextRows,
          test_agent_report: payload.report || currentCard.test_agent_report || currentCard.testAgentReport || null,
          testAgentReport: payload.report || currentCard.testAgentReport || currentCard.test_agent_report || null,
          next_action: summary.next_action || summary.nextAction || currentCard.next_action || currentCard.nextAction || '',
          blockers: runtimeStatus === 'blocked'
            ? nextRows.slice(0, 4)
            : (currentCard.blockers || []),
          agents: [{ name: 'TestAgent', status: phase.agentStatus, summary: summary.headline }],
          technical: {
            ...(currentCard.technical || {}),
            ...(data.technical || {}),
            failure_step_screenshots: data.technical?.failure_step_screenshots
              || summary?.technical?.failure_step_screenshots
              || currentCard.technical?.failure_step_screenshots
              || [],
            failure_step_screenshot_rows: data.technical?.failure_step_screenshot_rows
              || summary?.technical?.failure_step_screenshot_rows
              || currentCard.technical?.failure_step_screenshot_rows
              || [],
            test_agent_environment_prep: data.technical?.test_agent_environment_prep
              || summary?.test_agent_environment_prep
              || summary?.testAgentEnvironmentPrep
              || currentCard.technical?.test_agent_environment_prep
              || null,
          },
        }
        attached = true
        return {
          ...runtime,
          status: runtimeStatus,
          statusText: summary.headline,
          taskCard: nextCard,
          task_card: nextCard,
          independent_review_summary: summary,
          independentReviewSummary: summary,
          test_agent_review_summary: summary,
          testAgentReviewSummary: summary,
        }
      })
    }
    if (attached) return { applied: true, mode: 'attached' }
    const fallbackMessage = createTestAgentReviewFallbackMessage(data, summary, payload)
    if (!fallbackMessage) return { applied: false, mode: 'rejected' }
    mergeIncomingMessage(fallbackMessage)
    return { applied: true, mode: 'fallback' }
  }

  return {
    applyTransientTaskRuntime,
    latestTestAgentFallbackTaskId,
    resolveTestAgentFallbackTaskId,
    createTestAgentExecutionPlanFallbackMessage,
    applyTestAgentExecutionPlanReady,
    createTestAgentReviewFallbackMessage,
    applyTestAgentReviewReady,
  }
}
