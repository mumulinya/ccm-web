import { normalizeTestAgentExecutionPlanSummary } from './agentDisplay.js'
import {
  classifyGlobalAgentRunPresentation,
  PRESENTATION_PLAN,
  shouldAttachTaskExperienceCard,
  showDeliveryScaffold,
} from './resultPresentation.js'
import {
  asArray,
  toList,
  uniq,
  compact,
  getUnifiedDeliveryReport,
  normalizeDeliveryFile,
  uniqDeliveryFiles,
  buildRunTerminalFallbackDeliveryReport,
  buildRecoverySummary,
  buildContinuationStatus,
  buildReceiptReworkSummary,
  mergeWorkItemSummary,
  buildChildAgentProgressSummary,
  buildChangeSummary,
  buildPlanAlignment,
  buildUserHandoff,
  hasStrongDeliveryAcceptance,
  handoffText,
  taskPhasePresentation,
  taskActions,
  buildGlobalUserRequestSummary,
} from './taskExperience-part-01.js'
export const globalMissionTaskCard = (message = {}) => {
  const mission = message.globalMission || {}
  if (!mission.id) return null
  const children = asArray(message.globalMissionChildren)
  const summary = mission.mission_summary || {}
  const missionDelivery = mission.delivery_summary || {}
  const supervisor = message.globalMissionSupervisor || {}
  const finalReport = supervisor.final_report || mission.final_report || {}
  const deliveryReport = getUnifiedDeliveryReport(finalReport) || getUnifiedDeliveryReport(missionDelivery) || getUnifiedDeliveryReport(supervisor) || getUnifiedDeliveryReport(mission)
  const recoverySummary = buildRecoverySummary(mission) || buildRecoverySummary(supervisor)
  const continuationStatus = buildContinuationStatus(mission) || buildContinuationStatus(missionDelivery) || buildContinuationStatus(supervisor)
  const receiptReworkSummary = buildReceiptReworkSummary(mission) || buildReceiptReworkSummary(missionDelivery) || buildReceiptReworkSummary(supervisor)
  const collaborationState = mission.collaboration_state || mission.collaborationState || {}
  const lastContinuation = collaborationState.last_continuation
    || collaborationState.lastContinuation
    || mission.last_continuation
    || mission.lastContinuation
    || {}
  const lastContinuationKind = String(lastContinuation.kind || lastContinuation.continuation_kind || lastContinuation.continuationKind || '').toLowerCase()
  const supervisorStatus = supervisor.status || ''
  const presentationStatus = mission.rolled_back_at
    ? 'reverted'
    : ['paused', 'waiting_user', 'manual_takeover', 'cancelled', 'failed', 'completed'].includes(supervisorStatus)
      ? supervisorStatus
      : mission.status
  const basePresentation = taskPhasePresentation(presentationStatus, mission.status === 'done' ? 'completed' : 'executing')
  const revisionNeedsReplan = lastContinuationKind === 'revise_goal'
    && mission.status !== 'done'
    && !['paused', 'waiting_user', 'manual_takeover', 'cancelled', 'failed', 'completed'].includes(String(supervisorStatus).toLowerCase())
  const presentation = mission.status === 'awaiting_change_review'
    ? { phase: 'change_review', label: '等待整批审阅', progress: 95 }
    : revisionNeedsReplan
      ? { phase: 'planning', label: '重新规划中', progress: 35 }
      : basePresentation
  const total = Number(summary.total || children.length || 0)
  const passed = Number(summary.passed || children.filter(row => row.task?.status === 'done').length || 0)
  const blocked = Number(summary.blocked || children.filter(row => ['blocked', 'failed'].includes(row.task?.status)).length || 0)
  const agents = children.map(row => {
    const task = row.task || {}
    const target = row.target || task.mission_target || {}
    const targetType = target.type === 'group' ? '协作群' : '项目'
    return {
      id: task.id,
      name: `${targetType} · ${target.name || task.target_project || '执行目标'}`,
      status: task.status || 'pending',
      summary: compact(task.status_detail || target.reason || (task.status === 'done' ? '已回传结果' : '等待开始'), 120),
    }
  })
  const missionWorkItems = asArray(mission.work_items || mission.workItems || missionDelivery.work_items || missionDelivery.workItems)
  const derivedWorkItems = children.map(row => {
    const task = row.task || {}
    const target = row.target || task.mission_target || {}
    return {
      id: task.id || target.name || target.project,
      taskId: task.id || mission.id,
      subject: task.business_goal || target.task || target.reason || task.title || '执行目标',
      description: task.status_detail || target.reason || '',
      owner: target.coordinator || target.project || task.target_project || target.name || '',
      target: target.name || task.target_project || target.project || '',
      status: task.status === 'done' ? 'completed' : task.status || 'pending',
      blockedBy: asArray(task.mission_dependencies || target.depends_on || target.dependsOn),
      attempt: Number(task.retry_count || task.auto_gap_continue_count || 1) || 1,
      evidence: uniq([task.delivery_summary?.headline, task.receipt?.summary]),
      filesChanged: uniq(asArray(task.delivery_summary?.actual_file_changes).map(item => item.path || item)),
      verification: uniq(task.delivery_summary?.verification_executed || task.receipt?.verification || []),
      blockers: uniq([task.status_detail, ...(task.receipt?.blockers || [])]).filter(Boolean),
    }
  }).filter(item => item.id || item.target || item.subject)
  const workItems = missionWorkItems.length ? missionWorkItems : derivedWorkItems
  const workItemSummary = mergeWorkItemSummary(mission.work_item_summary || mission.workItemSummary || missionDelivery.work_item_summary || missionDelivery.workItemSummary, workItems)
  const workItemClaimSummary = mission.work_item_claim_summary
    || mission.workItemClaimSummary
    || missionDelivery.work_item_claim_summary
    || missionDelivery.workItemClaimSummary
    || finalReport.work_item_claim_summary
    || finalReport.workItemClaimSummary
    || null
  const workItemUnlockSummary = mission.work_item_unlock_summary
    || mission.workItemUnlockSummary
    || missionDelivery.work_item_unlock_summary
    || missionDelivery.workItemUnlockSummary
    || finalReport.work_item_unlock_summary
    || finalReport.workItemUnlockSummary
    || null
  const completionReadinessSummary = mission.completion_readiness_summary
    || mission.completionReadinessSummary
    || missionDelivery.completion_readiness_summary
    || missionDelivery.completionReadinessSummary
    || finalReport.completion_readiness_summary
    || finalReport.completionReadinessSummary
    || null
  const childDeliveryFiles = [
    ...asArray(missionDelivery.actual_file_changes),
    ...asArray(missionDelivery.child_tasks).flatMap(child => asArray(child?.actual_file_changes)),
    ...asArray(summary.children).flatMap(child => asArray(child?.actual_file_changes)),
    ...children.flatMap(row => {
      const task = row.task || {}
      const fallbackProject = row.target?.name || task.target_project || task.mission_target?.name || ''
      return [
        ...asArray(task.delivery_summary?.actual_file_changes).map(item => normalizeDeliveryFile(item, fallbackProject)),
        ...asArray(task.file_changes?.files).map(item => normalizeDeliveryFile(item, fallbackProject)),
      ]
    }),
  ].filter(Boolean)
  const files = uniqDeliveryFiles([
    ...childDeliveryFiles,
    ...(finalReport.actual_file_changes || []),
    ...(finalReport.file_changes || []),
    ...(finalReport.files_modified || finalReport.files || []),
    ...(deliveryReport?.files || []),
  ])
  const verification = uniq(toList(finalReport.verification_results, finalReport.verification, deliveryReport?.verification))
  const risks = uniq(toList(finalReport.risks, finalReport.remaining_items, deliveryReport?.risks))
  const active = agents.filter(item => ['in_progress', 'running', 'pending'].includes(item.status)).map(item => `${item.name} 正在处理`)
  const actions = taskActions(presentation.phase, {
    viewChanges: files.length > 0,
    continue: true,
    cancel: true,
    resume: ['paused', 'manual_takeover'].includes(supervisor.status),
    retry: true,
    rollback: !!mission.rollback_available,
    saveKnowledge: true,
  })
  const requirementEpic = mission.workflow_type === 'requirement_epic' ? {
    schema: mission.decomposition_plan?.schema || mission.requirement_decomposition?.schema || 'ccm-requirement-decomposition-v1',
    content_hash: mission.requirement_content_hash || mission.decomposition_plan?.content_hash || '',
    version: Number(mission.requirement_version || mission.decomposition_plan?.version || 1),
    title: mission.decomposition_plan?.epic_title || mission.title,
    items: asArray(mission.decomposition_plan?.items || mission.requirement_decomposition?.items),
    child_task_ids: asArray(mission.child_task_ids),
    summary,
  } : null
  if (mission.status === 'awaiting_change_review') {
    actions.splice(0, actions.length,
      ...(files.length ? [{ id: 'changes', label: '查看整批改动', kind: 'view_changes', tone: 'outline' }] : []),
      { id: 'approve_epic', label: '批准 Epic 交付', kind: 'approve_epic', tone: 'primary' },
      { id: 'targeted_rework', label: '退回子任务返工', kind: 'targeted_rework', tone: 'warning', requirement_epic: true },
    )
  }
  const missionTodoPlan = mission.todo_plan || mission.todoPlan || mission.workchain?.todo_plan || mission.workchain?.todoPlan || missionDelivery.todo_plan || missionDelivery.todoPlan || null
  const missionTestAgentExecutionPlan = mission.test_agent_execution_plan || mission.testAgentExecutionPlan || missionDelivery.test_agent_execution_plan || missionDelivery.testAgentExecutionPlan || mission.workchain?.test_agent_execution_plan || mission.workchain?.testAgentExecutionPlan || null
  const missionTestAgentExecutionPlanSummary = normalizeTestAgentExecutionPlanSummary(
    missionTestAgentExecutionPlan,
    mission.test_agent_execution_plan_summary || mission.testAgentExecutionPlanSummary || missionDelivery.test_agent_execution_plan_summary || missionDelivery.testAgentExecutionPlanSummary || null,
    mission.test_agent_execution_plan_detail || mission.testAgentExecutionPlanDetail || ''
  )
  const missionIndependentReviewSummary = mission.independent_review_summary
    || mission.independentReviewSummary
    || mission.test_agent_review_summary
    || mission.testAgentReviewSummary
    || missionDelivery.independent_review_summary
    || missionDelivery.independentReviewSummary
    || finalReport.independent_review_summary
    || finalReport.independentReviewSummary
    || null
  const missionIndependentReview = uniq(toList(
    mission.independent_review,
    mission.independentReview,
    missionDelivery.independent_review,
    missionDelivery.independentReview,
    finalReport.independent_review,
    finalReport.independentReview
  ).map(handoffText))
  const missionPostReviewSpotCheckSummary = mission.post_review_spot_check_summary
    || mission.postReviewSpotCheckSummary
    || missionDelivery.post_review_spot_check_summary
    || missionDelivery.postReviewSpotCheckSummary
    || finalReport.post_review_spot_check_summary
    || finalReport.postReviewSpotCheckSummary
    || mission.workchain?.completion_summary?.post_review_spot_check_summary
    || mission.workchain?.completionSummary?.postReviewSpotCheckSummary
    || null
  const missionQualityFollowup = mission.quality_followup
    || mission.qualityFollowup
    || missionDelivery.quality_followup
    || missionDelivery.qualityFollowup
    || finalReport.quality_followup
    || finalReport.qualityFollowup
    || mission.workchain?.completion_summary?.quality_followup
    || mission.workchain?.completionSummary?.qualityFollowup
    || null
  const missionDisplayStream = mission.display_stream || mission.displayStream || missionDelivery.display_stream || missionDelivery.displayStream || (mission.workchain ? { workchain: mission.workchain, user_visible_text: mission.workchain.user_visible_text, tool_use_summary: { tool_summary: mission.workchain.completion_summary?.evidence?.join('，') || '' }, technical_details: mission.workchain.technical_details || [], progress_checkpoints: mission.workchain.progress_checkpoints || null, todo_plan: missionTodoPlan, todoPlan: missionTodoPlan, delivery_report: deliveryReport } : deliveryReport ? { delivery_report: deliveryReport, user_visible_text: deliveryReport.headline, todo_plan: missionTodoPlan, todoPlan: missionTodoPlan } : null)
  if (missionDisplayStream && missionTodoPlan && !missionDisplayStream.todo_plan) {
    missionDisplayStream.todo_plan = missionTodoPlan
    missionDisplayStream.todoPlan = missionTodoPlan
  }
  const missionProgressCheckpoints = missionDisplayStream?.progress_checkpoints || missionDisplayStream?.progressCheckpoints || missionDisplayStream?.workchain?.progress_checkpoints || missionDisplayStream?.workchain?.progressCheckpoints || mission.workchain?.progress_checkpoints || mission.workchain?.progressCheckpoints || null
  const mainAgentDecision = lastContinuationKind
    ? null
    : mission.mainAgentDecision || mission.main_agent_decision || missionDisplayStream?.mainAgentDecision || missionDisplayStream?.main_agent_decision || null
  const agentProgressSummary = mission.agent_progress_summary || mission.agentProgressSummary || missionDelivery.agent_progress_summary || missionDelivery.agentProgressSummary || buildChildAgentProgressSummary({ phase: presentation.phase, agents, workItems })
  const changeSummary = mission.change_summary || mission.changeSummary || missionDelivery.change_summary || missionDelivery.changeSummary || buildChangeSummary({ files, workItems, agents })
  const missionPlanMode = mission.plan_mode || mission.planMode || mission.workflow_meta?.plan_mode || mission.workflowMeta?.planMode || missionDelivery.plan_mode || missionDelivery.planMode || finalReport.plan_mode || finalReport.planMode || null
  const planAlignment = buildPlanAlignment({ provided: mission.plan_alignment || mission.planAlignment || missionDelivery.plan_alignment || missionDelivery.planAlignment || finalReport.plan_alignment || finalReport.planAlignment, planMode: missionPlanMode, deliveryReport, files, verification, workItems, phase: presentation.phase, report: finalReport })
  const waitingReason = asArray(supervisor.incidents)
    .filter(item => !item?.resolved_at && !item?.resolvedAt && ['waiting_user', 'needs_user', 'waiting_clarification'].includes(String(item?.type || item?.status || '').toLowerCase()))
    .map(handoffText)
    .filter(Boolean)
    .slice(-1)[0] || ''
  const notificationText = compact(message.content, 260)
  const nextAction = presentation.phase === 'completed'
    ? '可以查看交付总结、验证结果和风险提示'
    : presentation.phase === 'change_review'
      ? '请审阅整批变更后批准交付，或退回指定子任务返工。'
    : presentation.phase === 'needs_user'
      ? waitingReason || notificationText || '请补充任务卡中的待确认信息；收到后我会继续执行和验收。'
      : presentation.phase === 'failed'
        ? '可以重新执行，系统会复用已有证据'
        : presentation.phase === 'cancelled'
          ? '任务已取消；需要时可以重新发起。'
        : lastContinuationKind === 'revise_goal'
          ? '正在按新目标重新规划；完成后会重新执行验收和复核。'
          : lastContinuationKind === 'supplement'
            ? '补充要求已同步，正在继续执行和验收。'
            : '我正在协调各执行目标'
  const userHandoff = buildUserHandoff({ provided: mission.user_handoff || mission.userHandoff || missionDelivery.user_handoff || missionDelivery.userHandoff || finalReport.user_handoff || finalReport.userHandoff || deliveryReport?.user_handoff || deliveryReport?.userHandoff, phase: presentation.phase, status: presentationStatus, nextAction, blockers: presentation.phase === 'needs_user' ? [waitingReason || notificationText].filter(Boolean) : blocked ? [`${blocked} 个执行目标待补齐`] : [], deliveryReport, changeSummary, planAlignment, files, verification, risks })
  const deliveryAccepted = hasStrongDeliveryAcceptance({ deliveryReport, report: { ...missionDelivery, ...finalReport }, verificationRows: verification })
  return {
    version: 1,
    task_id: mission.id,
    title: mission.title || '跨项目开发任务',
    goal: mission.business_goal || mission.goal || mission.title || '',
    phase: presentation.phase,
    phase_label: presentation.label,
    status: mission.status,
    progress: total ? Math.max(presentation.progress === 100 ? 100 : 10, Math.round(passed / total * 100)) : presentation.progress,
    active_agents: active,
    agents,
    work_items: workItems,
    work_item_summary: workItemSummary,
    work_item_claim_summary: workItemClaimSummary,
    workItemClaimSummary,
    work_item_unlock_summary: workItemUnlockSummary,
    workItemUnlockSummary,
    completion_readiness_summary: completionReadinessSummary,
    completionReadinessSummary,
    agent_progress_summary: agentProgressSummary,
    agentProgressSummary,
    change_summary: changeSummary,
    changeSummary,
    plan_mode: missionPlanMode,
    planMode: missionPlanMode,
    plan_alignment: planAlignment,
    planAlignment,
    user_handoff: userHandoff,
    userHandoff,
    recovery_summary: recoverySummary,
    continuation_status: continuationStatus,
    requirement_epic: requirementEpic,
    receipt_rework_summary: receiptReworkSummary,
    completed: uniq([passed ? `${passed}/${total || passed} 个执行目标已完成` : '', files.length ? `修改了 ${files.length} 个文件` : '', verification.length ? `${verification.length} 项检查已执行` : '']),
    blockers: blocked ? [`${blocked} 个执行目标待补齐`] : risks.slice(0, 4),
    next_action: nextAction,
    mainAgentDecision,
    main_agent_decision: mainAgentDecision,
    todo_plan: missionTodoPlan,
    todoPlan: missionTodoPlan,
    test_agent_execution_plan: missionTestAgentExecutionPlan,
    testAgentExecutionPlan: missionTestAgentExecutionPlan,
    test_agent_execution_plan_summary: missionTestAgentExecutionPlanSummary,
    testAgentExecutionPlanSummary: missionTestAgentExecutionPlanSummary,
    independent_review_summary: missionIndependentReviewSummary,
    independentReviewSummary: missionIndependentReviewSummary,
    independent_review: missionIndependentReview,
    independentReview: missionIndependentReview,
    post_review_spot_check_summary: missionPostReviewSpotCheckSummary,
    postReviewSpotCheckSummary: missionPostReviewSpotCheckSummary,
    quality_followup: missionQualityFollowup,
    qualityFollowup: missionQualityFollowup,
    display_stream: missionDisplayStream,
    progress_checkpoints: missionProgressCheckpoints,
    delivery_report: deliveryReport,
    delivery: { headline: deliveryReport?.headline || finalReport.summary || missionDelivery.headline || mission.status_detail || notificationText || '', files, changes: files, verification, risks, acceptance_passed: deliveryAccepted },
    actions,
    technical: { trace_id: mission.trace_id || '', execution_ids: children.map(row => row.task?.id).filter(Boolean), session_ids: [], supervisor_id: supervisor.id || mission.supervisor_id || '', source_ingestion: mission.source_ingestion || mission.sourceIngestion || null, requirement_extraction: mission.requirement_extraction || mission.requirementExtraction || null, agent_progress_summary: agentProgressSummary, change_summary: changeSummary, plan_alignment: planAlignment, user_handoff: userHandoff, post_review_spot_check: mission.post_review_spot_check || mission.postReviewSpotCheck || missionDelivery.post_review_spot_check || missionDelivery.postReviewSpotCheck || null },
  }
}

export const globalAgentRunTaskCard = (message = {}) => {
  const run = message.agenticRun || {}
  if (!run.id) return null
  const resultPresentation = classifyGlobalAgentRunPresentation(run, message)
  if (!shouldAttachTaskExperienceCard(resultPresentation)) return null
  const deliveryScaffold = showDeliveryScaffold(resultPresentation)
  const presentationStatus = ['running', 'in_progress'].includes(String(run.status || '').toLowerCase()) && run.phase
    ? run.phase
    : run.status
  const basePresentation = taskPhasePresentation(presentationStatus, 'executing')
  const presentation = run.status === 'supervising' && run.supervision_state === 'replanning'
    ? { phase: 'planning', label: '重新规划中', progress: 35 }
    : run.status === 'supervising'
      ? { phase: 'executing', label: '持续跟进', progress: 55 }
    : basePresentation
  const report = run.final_report || {}
  const deliveryReport = deliveryScaffold
    ? (getUnifiedDeliveryReport(run) || getUnifiedDeliveryReport(report) || buildRunTerminalFallbackDeliveryReport(run, report, message, presentation.phase))
    : (getUnifiedDeliveryReport(run) || getUnifiedDeliveryReport(report) || null)
  const recoverySummary = buildRecoverySummary(run)
  const continuationStatus = buildContinuationStatus(run) || buildContinuationStatus(report)
  const receiptReworkSummary = buildReceiptReworkSummary(run) || buildReceiptReworkSummary(report)
  const userRequestSummary = buildGlobalUserRequestSummary(run)
  const runWorkItems = asArray(run.work_items || run.workItems)
  const runWorkItemClaimSummary = run.work_item_claim_summary
    || run.workItemClaimSummary
    || report.work_item_claim_summary
    || report.workItemClaimSummary
    || deliveryReport?.work_item_claim_summary
    || deliveryReport?.workItemClaimSummary
    || null
  const runWorkItemUnlockSummary = run.work_item_unlock_summary
    || run.workItemUnlockSummary
    || report.work_item_unlock_summary
    || report.workItemUnlockSummary
    || deliveryReport?.work_item_unlock_summary
    || deliveryReport?.workItemUnlockSummary
    || null
  const runCompletionReadinessSummary = run.completion_readiness_summary
    || run.completionReadinessSummary
    || report.completion_readiness_summary
    || report.completionReadinessSummary
    || deliveryReport?.completion_readiness_summary
    || deliveryReport?.completionReadinessSummary
    || null
  const agentProgressSummary = run.agent_progress_summary || run.agentProgressSummary || report.agent_progress_summary || report.agentProgressSummary || buildChildAgentProgressSummary({ phase: presentation.phase, workItems: runWorkItems, rows: asArray(run.agent_progress_rows || run.agentProgressRows) })
  const files = uniqDeliveryFiles(toList(report.actual_file_changes, report.file_changes, report.files_modified, run.files_modified, deliveryReport?.files))
  const changeSummary = run.change_summary || run.changeSummary || report.change_summary || report.changeSummary || buildChangeSummary({ files, workItems: runWorkItems, rows: asArray(run.agent_progress_rows || run.agentProgressRows) })
  const verification = uniq(toList(report.verification_results, report.verification, run.verification_results, deliveryReport?.verification))
  const risks = uniq(toList(report.risks, report.remaining_items, run.risks, deliveryReport?.risks))
  const runPlanMode = run.plan_mode || run.planMode || run.workflow_meta?.plan_mode || run.workflowMeta?.planMode || report.plan_mode || report.planMode || null
  const planAlignment = buildPlanAlignment({ provided: run.plan_alignment || run.planAlignment || report.plan_alignment || report.planAlignment, planMode: runPlanMode, deliveryReport, files, verification, workItems: runWorkItems, phase: presentation.phase, report })
  const supervisionNextAction = report.next_action
    || report.nextAction
    || deliveryReport?.next_action
    || deliveryReport?.nextAction
    || run.display_stream?.dispatch_launch_summary?.next_action
    || run.displayStream?.dispatchLaunchSummary?.nextAction
    || ''
  const nextAction = userRequestSummary?.next_action || (presentation.phase === 'needs_user'
    ? (run.clarification_question || '请确认后继续')
    : presentation.phase === 'completed'
      ? (deliveryScaffold ? '可以查看交付总结、验证结果和风险提示' : (runPlanMode ? '可按计划继续，或回复调整计划' : ''))
      : presentation.phase === 'failed'
        ? '可以重新执行，系统会复用已有证据'
        : presentation.phase === 'cancelled'
          ? '任务已取消；需要时可以重新发起'
          : run.status === 'supervising'
            ? (supervisionNextAction || '继续跟进执行、独立复核和最终验收')
            : (deliveryScaffold ? '系统会继续处理并更新结果' : (runPlanMode ? '确认计划后开始执行' : '系统会继续处理并更新结果')))
  const userHandoff = deliveryScaffold
    ? buildUserHandoff({ provided: run.user_handoff || run.userHandoff || report.user_handoff || report.userHandoff || deliveryReport?.user_handoff || deliveryReport?.userHandoff, phase: presentation.phase, status: run.status, nextAction, blockers: uniq([userRequestSummary?.question, run.clarification_question, run.last_error, run.error]).slice(0, 4), deliveryReport, changeSummary, planAlignment, files, verification, risks })
    : null
  const deliveryAccepted = deliveryScaffold && hasStrongDeliveryAcceptance({ deliveryReport, report, verificationRows: verification })
  let actions = deliveryScaffold
    ? taskActions(presentation.phase, { viewChanges: files.length > 0, continue: !!run.mission_id, cancel: true, resume: true, retry: true, rollback: false, saveKnowledge: true })
    : taskActions(presentation.phase, { viewChanges: false, continue: false, cancel: true, resume: false, retry: false, rollback: false, saveKnowledge: false })
  if (run.status === 'waiting_confirmation') actions = [
    { id: 'reject', kind: 'reject_confirmation', label: '取消', tone: 'outline' },
    { id: 'confirm', kind: 'confirm', label: '确认并继续', tone: 'primary' },
  ]
  if (run.status === 'waiting_clarification') actions = [
    { id: 'provide_clarification', kind: 'provide_clarification', label: '补充信息', tone: 'primary' },
    { id: 'cancel', kind: 'cancel', label: '取消', tone: 'outline' },
  ]
  const runTodoPlan = run.todo_plan || run.todoPlan || run.workchain?.todo_plan || run.workchain?.todoPlan || report.todo_plan || report.todoPlan || null
  const runTestAgentExecutionPlan = run.test_agent_execution_plan || run.testAgentExecutionPlan || report.test_agent_execution_plan || report.testAgentExecutionPlan || run.workchain?.test_agent_execution_plan || run.workchain?.testAgentExecutionPlan || null
  const runTestAgentExecutionPlanSummary = normalizeTestAgentExecutionPlanSummary(
    runTestAgentExecutionPlan,
    run.test_agent_execution_plan_summary || run.testAgentExecutionPlanSummary || report.test_agent_execution_plan_summary || report.testAgentExecutionPlanSummary || null,
    run.test_agent_execution_plan_detail || run.testAgentExecutionPlanDetail || ''
  )
  const runIndependentReviewSummary = run.independent_review_summary
    || run.independentReviewSummary
    || run.test_agent_review_summary
    || run.testAgentReviewSummary
    || report.independent_review_summary
    || report.independentReviewSummary
    || null
  const runIndependentReview = uniq(toList(
    run.independent_review,
    run.independentReview,
    report.independent_review,
    report.independentReview
  ).map(handoffText))
  const runPostReviewSpotCheckSummary = run.post_review_spot_check_summary
    || run.postReviewSpotCheckSummary
    || report.post_review_spot_check_summary
    || report.postReviewSpotCheckSummary
    || deliveryReport?.post_review_spot_check_summary
    || deliveryReport?.postReviewSpotCheckSummary
    || run.workchain?.completion_summary?.post_review_spot_check_summary
    || run.workchain?.completionSummary?.postReviewSpotCheckSummary
    || null
  const runQualityFollowup = deliveryScaffold
    ? (run.quality_followup
      || run.qualityFollowup
      || report.quality_followup
      || report.qualityFollowup
      || run.workchain?.completion_summary?.quality_followup
      || run.workchain?.completionSummary?.qualityFollowup
      || null)
    : null
  let runDisplayStream = run.display_stream || run.displayStream || (run.workchain ? { workchain: run.workchain, user_visible_text: run.workchain.user_visible_text, tool_use_summary: { tool_summary: run.workchain.completion_summary?.evidence?.join('，') || '' }, technical_details: run.workchain.technical_details || [], progress_checkpoints: run.workchain.progress_checkpoints || null, todo_plan: runTodoPlan, todoPlan: runTodoPlan, delivery_report: deliveryReport } : deliveryReport ? { delivery_report: deliveryReport, user_visible_text: deliveryReport.headline, todo_plan: runTodoPlan, todoPlan: runTodoPlan } : null)
  if (runDisplayStream && runTodoPlan && !runDisplayStream.todo_plan) {
    runDisplayStream = { ...runDisplayStream, todo_plan: runTodoPlan, todoPlan: runTodoPlan }
  }
  if (runDisplayStream && !deliveryScaffold) {
    runDisplayStream = {
      ...runDisplayStream,
      delivery_report: null,
      progress_checkpoints: null,
      progressCheckpoints: null,
      workchain: runDisplayStream.workchain
        ? { ...runDisplayStream.workchain, stages: [], progress_checkpoints: null, progressCheckpoints: null, completion_summary: null, completionSummary: null }
        : runDisplayStream.workchain,
    }
  }
  const runProgressCheckpoints = deliveryScaffold
    ? (runDisplayStream?.progress_checkpoints || runDisplayStream?.progressCheckpoints || runDisplayStream?.workchain?.progress_checkpoints || runDisplayStream?.workchain?.progressCheckpoints || null)
    : null
  const mainAgentDecision = run.mainAgentDecision || run.main_agent_decision || message.mainAgentDecision || message.main_agent_decision || runDisplayStream?.mainAgentDecision || runDisplayStream?.main_agent_decision || null
  return {
    version: 1,
    presentation: resultPresentation,
    task_id: run.mission_id || run.id,
    title: compact(run.goal || run.user_message || message.content || (resultPresentation === PRESENTATION_PLAN ? '执行前计划' : '全局任务'), 90),
    goal: compact(run.goal || run.user_message || '', 240),
    phase: presentation.phase,
    phase_label: resultPresentation === PRESENTATION_PLAN && presentation.phase === 'completed' ? '计划已就绪' : presentation.label,
    status: run.status,
    progress: presentation.progress,
    active_agents: deliveryScaffold && presentation.phase === 'executing' ? [run.status === 'supervising' ? '我在持续跟进' : '我正在处理'] : [],
    agents: [],
    work_items: deliveryScaffold ? runWorkItems : [],
    work_item_summary: deliveryScaffold ? mergeWorkItemSummary(run.work_item_summary || run.workItemSummary, runWorkItems) : null,
    work_item_claim_summary: deliveryScaffold ? runWorkItemClaimSummary : null,
    workItemClaimSummary: deliveryScaffold ? runWorkItemClaimSummary : null,
    work_item_unlock_summary: deliveryScaffold ? runWorkItemUnlockSummary : null,
    workItemUnlockSummary: deliveryScaffold ? runWorkItemUnlockSummary : null,
    completion_readiness_summary: deliveryScaffold ? runCompletionReadinessSummary : null,
    completionReadinessSummary: deliveryScaffold ? runCompletionReadinessSummary : null,
    agent_progress_summary: deliveryScaffold ? agentProgressSummary : null,
    agentProgressSummary: deliveryScaffold ? agentProgressSummary : null,
    change_summary: deliveryScaffold ? changeSummary : null,
    changeSummary: deliveryScaffold ? changeSummary : null,
    plan_mode: runPlanMode,
    planMode: runPlanMode,
    plan_alignment: deliveryScaffold ? planAlignment : null,
    planAlignment: deliveryScaffold ? planAlignment : null,
    user_request_summary: userRequestSummary,
    userRequestSummary,
    user_handoff: userHandoff,
    userHandoff,
    recovery_summary: deliveryScaffold ? recoverySummary : null,
    continuation_status: deliveryScaffold ? continuationStatus : null,
    receipt_rework_summary: deliveryScaffold ? receiptReworkSummary : null,
    completed: deliveryScaffold ? uniq([files.length ? `修改了 ${files.length} 个文件` : '', verification.length ? `${verification.length} 项检查已执行` : '']) : [],
    blockers: uniq([run.clarification_question, run.last_error, run.error, ...(deliveryScaffold ? risks : [])]).slice(0, 4),
    next_action: nextAction,
    mainAgentDecision,
    main_agent_decision: mainAgentDecision,
    todo_plan: runTodoPlan,
    todoPlan: runTodoPlan,
    test_agent_execution_plan: deliveryScaffold ? runTestAgentExecutionPlan : null,
    testAgentExecutionPlan: deliveryScaffold ? runTestAgentExecutionPlan : null,
    test_agent_execution_plan_summary: deliveryScaffold ? runTestAgentExecutionPlanSummary : null,
    testAgentExecutionPlanSummary: deliveryScaffold ? runTestAgentExecutionPlanSummary : null,
    independent_review_summary: deliveryScaffold ? runIndependentReviewSummary : null,
    independentReviewSummary: deliveryScaffold ? runIndependentReviewSummary : null,
    independent_review: deliveryScaffold ? runIndependentReview : [],
    independentReview: deliveryScaffold ? runIndependentReview : [],
    post_review_spot_check_summary: deliveryScaffold ? runPostReviewSpotCheckSummary : null,
    postReviewSpotCheckSummary: deliveryScaffold ? runPostReviewSpotCheckSummary : null,
    quality_followup: runQualityFollowup,
    qualityFollowup: runQualityFollowup,
    display_stream: runDisplayStream,
    progress_checkpoints: runProgressCheckpoints,
    delivery_report: deliveryScaffold ? deliveryReport : null,
    delivery: deliveryScaffold
      ? { headline: deliveryReport?.headline || report.summary || (presentation.phase === 'completed' ? compact(message.content, 240) : ''), files, changes: files, verification, risks, acceptance_passed: deliveryAccepted }
      : { headline: '', files: [], changes: [], verification: [], risks: [], acceptance_passed: false },
    actions,
    technical: { trace_id: run.trace_id || '', execution_ids: [], session_ids: [], run_id: run.id, supervisor_id: run.supervisor_id || '', source_ingestion: run.source_ingestion || run.sourceIngestion || null, requirement_extraction: run.requirement_extraction || run.requirementExtraction || null, recovery_summary: deliveryScaffold ? recoverySummary : null, agent_progress_summary: deliveryScaffold ? agentProgressSummary : null, change_summary: deliveryScaffold ? changeSummary : null, plan_alignment: deliveryScaffold ? planAlignment : null, user_handoff: userHandoff, post_review_spot_check: deliveryScaffold ? (run.post_review_spot_check || run.postReviewSpotCheck || report.post_review_spot_check || report.postReviewSpotCheck || null) : null, presentation: resultPresentation },
  }
}

export const projectExecutionTaskCard = (message = {}, project = '') => {
  const task = message.taskExperience || {}
  const events = asArray(message.workEvents)
  const files = asArray(message.fileChanges?.files).map(item => item.path || item.file || item).filter(Boolean)
  const failed = events.some(item => item.kind === 'error') || /^❌/.test(String(message.content || ''))
  const done = !message.streaming && events.some(item => item.kind === 'done')
  const taskId = task.task_id || message.task_id || message.run_id || ''
  if (!message.streaming && !files.length && !failed && !task.requires_card) return null
  const presentation = taskPhasePresentation(task.phase || (failed ? 'failed' : done ? 'completed' : 'running'), message.streaming ? 'executing' : 'completed')
  const verification = uniq(task.verification || events.filter(item => item.kind === 'verification').map(item => item.text))
  const risks = uniq(task.risks || (failed ? [compact(message.content || events.find(item => item.kind === 'error')?.text, 180)] : []))
  const projectChangeSummary = task.change_summary || task.changeSummary || buildChangeSummary({ files: asArray(message.fileChanges?.files), agents: [{ agent: project }] })
  const projectPlanMode = task.plan_mode || task.planMode || message.plan_mode || message.planMode || null
  const projectPlanAlignment = buildPlanAlignment({ provided: task.plan_alignment || task.planAlignment, planMode: projectPlanMode, files: asArray(message.fileChanges?.files), verification, phase: presentation.phase, report: task })
  const projectDeliveryAccepted = hasStrongDeliveryAcceptance({ report: task, verificationRows: verification })
  const acceptanceRisks = done && !failed && !projectDeliveryAccepted ? ['缺少验证或验收证据'] : []
  const nextAction = presentation.phase === 'completed'
    ? projectDeliveryAccepted ? '可以查看交付总结、验证结果和风险提示' : '先补齐验证或验收证据，再最终确认。'
    : presentation.phase === 'failed' ? '可以重新执行' : '完成后会汇总改动和检查结果'
  const projectUserHandoff = buildUserHandoff({ provided: task.user_handoff || task.userHandoff, phase: presentation.phase, status: task.status || (failed ? 'failed' : done ? 'done' : 'in_progress'), nextAction, blockers: uniq([...risks, ...acceptanceRisks]), changeSummary: projectChangeSummary, planAlignment: projectPlanAlignment, files: asArray(message.fileChanges?.files), verification, risks: uniq([...risks, ...acceptanceRisks]) })
  return {
    version: 1,
    task_id: taskId,
    title: task.title || compact(message.requestText || `处理 ${project} 项目`, 90),
    goal: task.goal || compact(message.requestText || '', 240),
    phase: presentation.phase,
    phase_label: presentation.label,
    status: task.status || (failed ? 'failed' : done ? 'done' : 'in_progress'),
    progress: presentation.progress,
    active_agents: presentation.phase === 'executing' ? [`项目执行成员 · ${project} 正在处理`] : [],
    agents: [{ name: `项目执行成员 · ${project}`, status: failed ? 'failed' : done ? 'done' : 'running', summary: failed ? '执行遇到问题' : done ? '已回传结果' : '正在处理项目文件' }],
    change_summary: projectChangeSummary,
    changeSummary: projectChangeSummary,
    plan_mode: projectPlanMode,
    planMode: projectPlanMode,
    plan_alignment: projectPlanAlignment,
    planAlignment: projectPlanAlignment,
    user_handoff: projectUserHandoff,
    userHandoff: projectUserHandoff,
    completed: uniq([files.length ? `修改了 ${files.length} 个文件` : '', verification.length ? `${verification.length} 项检查已执行` : '']),
    blockers: risks.slice(0, 4),
    next_action: nextAction,
    delivery: { headline: task.headline || (done ? projectDeliveryAccepted ? '项目执行成员已提交可验收结果。' : '项目执行成员已提交结果，仍需补齐验证或验收。' : ''), files, changes: asArray(message.fileChanges?.files), verification, risks: uniq([...risks, ...acceptanceRisks]), acceptance_passed: projectDeliveryAccepted && !failed },
    actions: [
      ...taskActions(presentation.phase, { viewChanges: files.length > 0, continue: !!taskId, cancel: !!taskId, retry: !!taskId, rollback: !!task.rollback_available, saveKnowledge: !message.streaming }),
      ...(!message.streaming && taskId ? [
        { id: 'archive', kind: 'archive', label: '删除记录', tone: 'outline' },
        { id: 'purge', kind: 'purge', label: '永久清除', tone: 'danger' },
      ] : []),
    ],
    technical: taskId ? { trace_id: task.trace_id || message.projectRun?.trace_id || '', execution_ids: task.execution_ids || [], session_ids: task.session_ids || [], run_id: message.projectRun?.id || taskId, parent_run_id: message.projectRun?.parent_run_id || task.parent_run_id || '', source_ingestion: task.source_ingestion || task.sourceIngestion || null, requirement_extraction: task.requirement_extraction || task.requirementExtraction || null, plan_alignment: projectPlanAlignment, user_handoff: projectUserHandoff } : null,
  }
}
