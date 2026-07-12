import assert from 'node:assert/strict'
import {
  globalAgentRunTaskCard,
  globalMissionTaskCard,
  projectExecutionTaskCard,
  taskPhasePresentation,
} from '../frontend/src/utils/taskExperience.js'
import { __globalAgentSessionTestHooks } from '../frontend/src/composables/useGlobalAgentSessions.js'

const checks = {}

const demoPlanMode = {
  title: '执行前计划',
  requires_confirmation: false,
  auto_continue: true,
  acceptance: ['登录页文件改动可查看', 'npm test 必须通过'],
}

const ordinaryGlobal = globalAgentRunTaskCard({
  role: 'assistant',
  content: '这是一个普通回答',
  agenticRun: {
    id: 'run_question',
    status: 'completed',
    tool_calls: 0,
    decision_summary: { intent: { category: 'question', confidence: 0.96 } },
  },
})
checks.globalOrdinaryQuestionStaysDirect = ordinaryGlobal === null

const globalStatusFollowup = globalAgentRunTaskCard({
  role: 'assistant',
  type: 'global_agent_result',
  content: '最近全局任务进展：web 正在验证；api 已完成。',
  agenticRun: {
    id: 'global-status-followup',
    status: 'completed',
    phase: 'complete',
    final_reply: '最近全局任务进展：web 正在验证；api 已完成。',
    tool_calls: 0,
    decision_summary: { intent: { category: 'question', action_required: false, confidence: 0.99 } },
    display_stream: {
      schema: 'ccm-global-status-summary-v1',
      user_visible_text: '最近全局任务进展：web 正在验证；api 已完成。',
      technical_details: [],
    },
  },
})
checks.globalStatusFollowupStaysDirect = globalStatusFollowup === null

const plainGlobalHistoryMessage = {
  role: 'assistant',
  content: '登录修复已完成。',
  timestamp: '2026-07-07T10:00:00.000Z',
}
const richGlobalHistoryMessage = {
  ...plainGlobalHistoryMessage,
  type: 'global_agent_result',
  agenticRun: {
    id: 'run_history_sync',
    status: 'completed',
    final_delivery_report: {
      schema: 'ccm-main-agent-delivery-report-v1',
      headline: '登录修复已完成。',
      status: 'done',
      plan_review: ['执行前计划：登录修复计划', '计划核对：已对齐'],
      files: ['src/Login.vue'],
      verification: ['npm test'],
      verification_evidence: { schema: 'ccm-main-agent-verification-evidence-v1', items: ['已实际执行 1 项验证：npm test', '外部 Runner 证据 1 项：验证来源已记录。'] },
      acceptance: ['主 Agent 验收：已通过'],
      independent_review: ['独立复核：已通过', 'qa-agent：已复核登录修复。'],
      pickup_summary: {
        schema: 'ccm-main-agent-pickup-summary-v1',
        title: '回来继续看这里',
        status: 'done',
        review_items: ['改动：src/Login.vue', '验证：npm test'],
        resume_action: '可以继续补充新的要求。',
      },
    },
    plan_mode: demoPlanMode,
    work_items: [
      { id: 'wi_history_web', owner: 'web', target: 'web', subject: '修复登录页', status: 'completed', evidence: ['登录修复已完成。'], filesChanged: ['src/Login.vue'], verification: ['npm test'] },
    ],
  },
}
const mergedGlobalHistory = __globalAgentSessionTestHooks.mergeHistoryMessages([plainGlobalHistoryMessage], [richGlobalHistoryMessage])
const restoredGlobalCard = globalAgentRunTaskCard(mergedGlobalHistory[0])
checks.globalHistoryMergePreservesStructuredCompletion = restoredGlobalCard?.phase === 'completed'
  && restoredGlobalCard?.delivery_report?.headline === '登录修复已完成。'
  && restoredGlobalCard?.delivery_report?.plan_review?.some(item => item.includes('登录修复计划'))
  && restoredGlobalCard?.delivery_report?.acceptance?.some(item => item.includes('已通过'))
  && restoredGlobalCard?.delivery_report?.verification_evidence?.items?.some(item => item.includes('已实际执行 1 项验证'))
  && restoredGlobalCard?.delivery_report?.independent_review?.some(item => item.includes('qa-agent'))
  && restoredGlobalCard?.delivery_report?.pickup_summary?.schema === 'ccm-main-agent-pickup-summary-v1'
  && restoredGlobalCard?.delivery?.files?.some(file => (file?.path || file) === 'src/Login.vue')
  && restoredGlobalCard?.agent_progress_summary?.schema === 'ccm-child-agent-progress-summary-v1'
  && restoredGlobalCard?.agent_progress_summary?.rows?.some(row => row.agent === 'web' && row.status === 'completed')
  && restoredGlobalCard?.change_summary?.schema === 'ccm-main-agent-change-summary-v1'
  && restoredGlobalCard?.change_summary?.files?.some(file => file.path === 'src/Login.vue')
  && restoredGlobalCard?.plan_alignment?.schema === 'ccm-main-agent-plan-alignment-v1'
  && restoredGlobalCard?.plan_alignment?.status === 'aligned'
  && restoredGlobalCard?.user_handoff?.schema === 'ccm-main-agent-user-handoff-v1'
  && restoredGlobalCard?.user_handoff?.primary_action?.kind === 'view_changes'
  && restoredGlobalCard?.user_handoff?.evidence?.some(item => item.includes('复核：独立复核'))
  && __globalAgentSessionTestHooks.messagesChanged([plainGlobalHistoryMessage], mergedGlobalHistory)

const staleSupervisingHistoryMessage = {
  role: 'assistant',
  type: 'global_stream',
  content: '任务已派发，正在持续跟踪执行和验收。',
  timestamp: '2026-07-07T11:00:00.000Z',
  agenticRun: {
    id: 'run_supervision_history_sync',
    status: 'supervising',
    phase: 'execute',
    supervision_state: 'monitoring',
    updated_at: '2026-07-07T11:00:00.000Z',
    todo_plan: {
      source: 'global-supervision',
      steps: [{ id: 'track', label: '跟踪执行和验收', status: 'in_progress' }],
    },
  },
}
const revisedSupervisingHistoryMessage = {
  ...staleSupervisingHistoryMessage,
  content: '目标调整已接收。旧执行已停止，正在按新目标重新规划。',
  agenticRun: {
    ...staleSupervisingHistoryMessage.agenticRun,
    phase: 'plan',
    supervision_state: 'replanning',
    updated_at: '2026-07-07T11:05:00.000Z',
    todo_plan: {
      source: 'global-supervision-steering',
      steps: [{ id: 'replan', label: '按新目标重新规划', status: 'in_progress' }],
    },
  },
}
const mergedSupervisionHistory = __globalAgentSessionTestHooks.mergeHistoryMessages(
  [revisedSupervisingHistoryMessage],
  [staleSupervisingHistoryMessage],
)
checks.globalHistoryMergeDeduplicatesMutableRun = mergedSupervisionHistory.length === 1
  && mergedSupervisionHistory[0]?.content === revisedSupervisingHistoryMessage.content
  && mergedSupervisionHistory[0]?.agenticRun?.phase === 'plan'
  && mergedSupervisionHistory[0]?.agenticRun?.supervision_state === 'replanning'
  && mergedSupervisionHistory[0]?.agenticRun?.todo_plan?.source === 'global-supervision-steering'

const ambiguousLegacyRunMessage = {
  role: 'assistant',
  type: 'global_stream',
  content: '任务已派发，正在等待执行结果。',
  timestamp: '2026-07-07T12:00:00.000Z',
}
const sameTextRunA = {
  ...ambiguousLegacyRunMessage,
  agenticRun: {
    id: 'run_same_text_a',
    status: 'running',
    updated_at: '2026-07-07T12:01:00.000Z',
  },
}
const sameTextRunB = {
  ...ambiguousLegacyRunMessage,
  agenticRun: {
    id: 'run_same_text_b',
    status: 'running',
    updated_at: '2026-07-07T12:01:00.000Z',
  },
}
const mergedAmbiguousLegacyRuns = __globalAgentSessionTestHooks.mergeHistoryMessages(
  [ambiguousLegacyRunMessage],
  [sameTextRunA, sameTextRunB],
)
checks.globalHistoryMergeKeepsDistinctStableRuns = mergedAmbiguousLegacyRuns.length === 2
  && new Set(mergedAmbiguousLegacyRuns.map(message => message?.agenticRun?.id)).size === 2
  && mergedAmbiguousLegacyRuns.some(message => message?.agenticRun?.id === 'run_same_text_a')
  && mergedAmbiguousLegacyRuns.some(message => message?.agenticRun?.id === 'run_same_text_b')

checks.globalMissionNotificationRequiresAllCompletionSignals = __globalAgentSessionTestHooks.globalMissionConversationState({
  mission: { status: 'done' },
  supervisor: { status: 'completed' },
  run: { status: 'supervising' },
}) === 'active'
  && __globalAgentSessionTestHooks.globalMissionConversationState({
    mission: { status: 'done' },
    supervisor: { status: 'completed' },
    run: { status: 'completed' },
  }) === 'completed'

checks.globalMissionNotificationRecognizesWaitingAndCancellation = __globalAgentSessionTestHooks.globalMissionConversationState({
  mission: { status: 'in_progress' },
  supervisor: { status: 'waiting_user' },
  run: { status: 'supervising' },
}) === 'waiting_user'
  && __globalAgentSessionTestHooks.globalMissionConversationState({
    mission: { status: 'cancelled' },
    supervisor: { status: 'cancelled' },
    run: { status: 'cancelled' },
  }) === 'cancelled'

const missionNotifications = []
const firstWaitingNotification = __globalAgentSessionTestHooks.upsertGlobalMissionConversationNotification(missionNotifications, {
  missionId: 'mission-notification-selftest',
  state: 'waiting_user',
  content: '任务需要你补充测试账号。',
  timestamp: '2026-07-07T13:00:00.000Z',
  updatedAt: '2026-07-07T13:00:00.000Z',
})
const updatedWaitingNotification = __globalAgentSessionTestHooks.upsertGlobalMissionConversationNotification(missionNotifications, {
  missionId: 'mission-notification-selftest',
  state: 'waiting_user',
  content: '任务需要你补充测试账号和登录地址。',
  updatedAt: '2026-07-07T13:05:00.000Z',
})
const completedMissionNotification = __globalAgentSessionTestHooks.upsertGlobalMissionConversationNotification(missionNotifications, {
  missionId: 'mission-notification-selftest',
  state: 'completed',
  content: '任务已经通过全部交付验收。',
  timestamp: '2026-07-07T13:10:00.000Z',
  updatedAt: '2026-07-07T13:10:00.000Z',
})
checks.globalMissionNotificationsAreIdempotentPerState = firstWaitingNotification.created === true
  && updatedWaitingNotification.created === false
  && completedMissionNotification.created === true
  && missionNotifications.length === 2
  && missionNotifications.filter(message => message.missionNotificationState === 'waiting_user').length === 1
  && missionNotifications.some(message => message.content.includes('登录地址'))
  && missionNotifications.some(message => message.missionNotificationState === 'completed')

const mergedMissionNotifications = __globalAgentSessionTestHooks.mergeHistoryMessages([], [
  ...missionNotifications,
  { ...missionNotifications[1], content: '任务已经通过全部交付验收，最终总结已生成。', updated_at: '2026-07-07T13:11:00.000Z' },
])
checks.globalMissionNotificationsSurviveHistoryMergeWithoutDuplicates = mergedMissionNotifications.length === 2
  && mergedMissionNotifications.filter(message => message.missionNotificationState === 'completed').length === 1
  && mergedMissionNotifications.some(message => message.content.includes('最终总结已生成'))

const deliveryReportHandoffCard = globalAgentRunTaskCard({
  role: 'assistant',
  type: 'global_agent_result',
  content: '支付链路改造已完成。',
  agenticRun: {
    id: 'run_delivery_report_handoff',
    status: 'completed',
    tool_calls: 1,
    final_delivery_report: {
      schema: 'ccm-main-agent-delivery-report-v1',
      status: 'done',
      headline: '支付链路改造已完成。',
      plan_review: ['执行前计划：支付链路改造计划'],
      files: ['src/pay.ts'],
      verification: ['npm test'],
      acceptance: ['主 Agent 验收：已通过'],
      independent_review: ['独立复核：已通过', 'qa-agent：已复核支付链路。'],
      user_handoff: {
        schema: 'ccm-main-agent-user-handoff-v1',
        title: '接下来建议',
        status: 'ready',
        primary_action: { id: 'review_delivery', label: '核对交付总结', kind: 'review_delivery', tone: 'primary' },
        evidence: ['交付报告已由后端整理'],
      },
    },
  },
})
checks.globalRunUsesDeliveryReportUserHandoff = deliveryReportHandoffCard?.user_handoff?.primary_action?.kind === 'review_delivery'
  && deliveryReportHandoffCard?.user_handoff?.evidence?.includes('交付报告已由后端整理')
  && deliveryReportHandoffCard?.delivery_report?.plan_review?.some(item => item.includes('支付链路改造计划'))
  && deliveryReportHandoffCard?.delivery_report?.acceptance?.some(item => item.includes('已通过'))
  && deliveryReportHandoffCard?.delivery_report?.independent_review?.some(item => item.includes('支付链路'))

const failedGlobalCard = globalAgentRunTaskCard({
  role: 'assistant',
  content: '任务没有完成，原因已整理。',
  agenticRun: {
    id: 'run_failed_terminal',
    status: 'failed',
    goal: '修复登录状态刷新问题',
    tool_calls: 1,
    error: '缺少测试环境变量',
    final_report: { risks: '需要补齐 .env.test 后再验收' },
  },
})
const failedRiskSection = failedGlobalCard?.delivery_report?.sections?.find(section => section.title === '未完成原因')
const failedAcceptanceSection = failedGlobalCard?.delivery_report?.sections?.find(section => section.title === '验收结论')
checks.globalFailedTerminalHasFriendlyFallback = failedGlobalCard?.phase === 'failed'
  && failedGlobalCard?.delivery_report?.status === 'failed'
  && failedAcceptanceSection?.items?.some(item => item.includes('未通过'))
  && failedRiskSection?.items?.some(item => item.includes('缺少测试环境变量'))
  && failedRiskSection?.items?.some(item => item.includes('.env.test'))
  && failedGlobalCard?.blockers?.some(item => item.includes('缺少测试环境变量'))
  && failedGlobalCard?.user_handoff?.status === 'failed'
  && failedGlobalCard?.user_handoff?.primary_action?.kind === 'retry'
  && failedGlobalCard?.actions?.some(action => action.kind === 'retry')

const internalFailureCard = globalAgentRunTaskCard({
  role: 'assistant',
  content: '任务没有完成，排障信息已整理。',
  agenticRun: {
    id: 'run_internal_failure_terminal',
    status: 'failed',
    goal: '同步支付状态',
    tool_calls: 1,
    error: 'CCM_AGENT_RECEIPT failed raw payload trace_id=exec-hidden-failure denied',
  },
})
const internalFailureRiskSection = internalFailureCard?.delivery_report?.sections?.find(section => section.title === '未完成原因')
checks.globalInternalFailureUsesInvestigationCopy = internalFailureRiskSection?.items?.some(item => item.includes('待排查') && item.includes('我会继续定位'))
  && !internalFailureRiskSection?.items?.some(item => item.includes('需要处理'))
  && !internalFailureRiskSection?.items?.some(item => /CCM_AGENT_RECEIPT|trace_id|raw payload/i.test(item))

const cancelledGlobalCard = globalAgentRunTaskCard({
  role: 'assistant',
  content: '用户取消了本轮任务。',
  agenticRun: {
    id: 'run_cancelled_terminal',
    status: 'cancelled',
    goal: '整理自动化任务列表',
    tool_calls: 1,
    final_reply: '本轮任务已按要求停止。',
    final_report: { risks: ['用户取消了本轮任务'] },
  },
})
const cancelledStopSection = cancelledGlobalCard?.delivery_report?.sections?.find(section => section.title === '停止说明')
const cancelledReasonSection = cancelledGlobalCard?.delivery_report?.sections?.find(section => section.title === '停止原因')
const cancelledAcceptanceSection = cancelledGlobalCard?.delivery_report?.sections?.find(section => section.title === '验收结论')
checks.globalCancelledTerminalHasFriendlyFallback = cancelledGlobalCard?.phase === 'cancelled'
  && cancelledGlobalCard?.delivery_report?.status === 'cancelled'
  && cancelledStopSection?.items?.some(item => item.includes('停止'))
  && cancelledAcceptanceSection?.items?.some(item => item.includes('任务已停止'))
  && cancelledReasonSection?.items?.some(item => item.includes('用户取消') || item.includes('停止'))
  && !cancelledGlobalCard?.delivery_report?.sections?.some(section => section.title === '风险与待确认')
  && String(cancelledGlobalCard?.next_action || '').includes('重新发起')
  && cancelledGlobalCard?.user_handoff?.status === 'cancelled'
  && cancelledGlobalCard?.user_handoff?.primary_action?.kind === 'continue'
  && cancelledGlobalCard?.user_handoff?.headline?.includes('任务已经停止')
  && cancelledGlobalCard?.actions?.some(action => action.kind === 'save_knowledge')

const weakAcceptanceOnlyGlobalCard = globalAgentRunTaskCard({
  role: 'assistant',
  type: 'global_agent_result',
  content: '任务已处理。',
  agenticRun: {
    id: 'run_weak_acceptance_only',
    status: 'completed',
    tool_calls: 1,
    final_report: {
      summary: '任务已处理。',
      acceptance_gate_passed: true,
      plan_mode: {
        title: '执行前计划',
        acceptance: ['业务目标已覆盖'],
      },
    },
  },
})
checks.globalWeakAcceptanceOnlyDoesNotAlignPlan = weakAcceptanceOnlyGlobalCard?.plan_alignment?.status === 'deviated'
  && weakAcceptanceOnlyGlobalCard?.plan_alignment?.checks?.some(item => item.label === '业务目标已覆盖' && item.ok === false)
  && weakAcceptanceOnlyGlobalCard?.delivery?.acceptance_passed === false
  && weakAcceptanceOnlyGlobalCard?.user_handoff?.unresolved?.some(item => item.includes('业务目标已覆盖'))

const missionCard = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission',
  globalMission: {
    id: 'mission_demo',
    title: '跨项目支付改造',
    status: 'in_progress',
    business_goal: '让前后端支付链路可用',
    mission_summary: { total: 2, passed: 1, blocked: 0 },
    plan_mode: {
      title: '执行前计划',
      acceptance: ['支付 API 文件改动可查看', '前后端协作工作单已进入执行'],
    },
  },
  globalMissionChildren: [
    { task: { id: 'task_api', status: 'done', target_project: 'api', delivery_summary: { actual_file_changes: [{ path: 'api/src/pay.ts', project: 'api', additions: 12, deletions: 1 }] } }, target: { type: 'project', name: 'api' } },
    { task: { id: 'task_web', status: 'in_progress', target_project: 'web' }, target: { type: 'project', name: 'web' } },
  ],
})
checks.globalMissionUsesUnifiedCard = missionCard?.version === 1 && missionCard?.phase === 'executing' && missionCard?.agents?.length === 2
checks.globalMissionShowsAgentProgressSummary = missionCard?.agent_progress_summary?.schema === 'ccm-child-agent-progress-summary-v1'
  && missionCard?.agent_progress_summary?.rows?.some(row => row.agent === 'web' && row.status === 'running')
  && !/CCM_AGENT_RECEIPT|trace_id|session_id|WorkerContextPacket|raw receipt|raw payload|原始回执/i.test(JSON.stringify(missionCard?.agent_progress_summary || {}))
checks.globalMissionShowsChangeSummary = missionCard?.change_summary?.schema === 'ccm-main-agent-change-summary-v1'
  && missionCard?.change_summary?.files?.some(file => file.path)
checks.globalMissionShowsPlanAlignment = missionCard?.plan_alignment?.schema === 'ccm-main-agent-plan-alignment-v1'
  && missionCard?.plan_alignment?.checks?.some(item => item.label.includes('支付 API 文件改动') && item.ok)
checks.globalMissionTechnicalCollapsedDataOnly = !!missionCard?.technical?.execution_ids?.includes('task_api')
checks.globalMissionHasCancelAction = missionCard?.actions?.some(action => action.kind === 'cancel')
const missionQueueCard = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission',
  globalMission: {
    id: 'mission_queue',
    title: '依赖队列测试',
    status: 'in_progress',
    mission_summary: { total: 2, passed: 1, blocked: 0 },
    collaboration_state: {
      last_continuation: {
        source: 'user_next_work_item',
        at: '2026-07-07T10:10:00.000Z',
        rework_kind: 'next_claimable_work_item',
        target: 'web',
        reason: '接入 owner 筛选 UI',
        status: 'accepted',
      },
    },
    delivery_summary: {
      weak_receipt_quality: [
        { agent: 'web', status: 'done', score: 66, grade: 'partial', missing: ['已执行验证', '声明记忆使用'] },
      ],
    },
  },
  globalMissionChildren: [
    { task: { id: 'task_api', status: 'done', target_project: 'api' }, target: { type: 'project', name: 'api' } },
    { task: { id: 'task_web', status: 'pending', target_project: 'web' }, target: { type: 'project', name: 'web', depends_on: ['api'] } },
  ],
})
checks.globalMissionShowsNextClaimableWorkItem = missionQueueCard?.work_item_summary?.next_claimable?.some(item => item.target === 'web')
checks.globalMissionQueueShowsAgentProgressSummary = missionQueueCard?.agent_progress_summary?.rows?.some(row => row.agent === 'web' && row.current_focus?.includes('执行目标'))
checks.globalMissionShowsContinuationStatus = missionQueueCard?.continuation_status?.schema === 'ccm-main-agent-continuation-status-v1'
  && missionQueueCard?.continuation_status?.title === '下一步派发已接上'
  && missionQueueCard?.continuation_status?.target === 'web'
checks.globalMissionShowsReceiptReworkSummary = missionQueueCard?.receipt_rework_summary?.schema === 'ccm-main-agent-receipt-rework-summary-v1'
  && missionQueueCard?.receipt_rework_summary?.gaps?.some(item => item.target === 'web' && item.action?.kind === 'targeted_rework')
const missionReceiptResolvedCard = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission',
  globalMission: {
    id: 'mission_receipt_resolved',
    title: '结果说明补充复检测试',
    status: 'in_progress',
    mission_summary: { total: 1, passed: 1, blocked: 0 },
    collaboration_state: {
      last_continuation: {
        source: 'user_targeted_rework',
        at: '2026-07-07T10:20:00.000Z',
        rework_kind: 'weak_receipt',
        target: 'web',
        reason: '补充验证证据',
        status: 'accepted',
      },
    },
    delivery_summary: { receipt_quality: [{ agent: 'web', status: 'done', score: 100, grade: 'good', missing: [] }] },
  },
  globalMissionChildren: [
    { task: { id: 'task_web_done', status: 'done', target_project: 'web' }, target: { type: 'project', name: 'web' } },
  ],
})
checks.globalMissionShowsReceiptReworkResolved = missionReceiptResolvedCard?.receipt_rework_summary?.status === 'passed'
  && missionReceiptResolvedCard?.receipt_rework_summary?.resolved?.some(item => item.target === 'web' && item.status === 'passed')
const pausedMissionCard = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission',
  globalMission: { id: 'mission_paused', title: '暂停任务', status: 'in_progress', mission_summary: { total: 1, passed: 0 } },
  globalMissionSupervisor: { id: 'gms_paused', status: 'paused' },
  globalMissionChildren: [{ task: { id: 'task_wait', status: 'pending', target_project: 'web' }, target: { type: 'project', name: 'web' } }],
})
checks.pausedGlobalMissionShowsResume = pausedMissionCard?.phase === 'needs_user' && pausedMissionCard?.actions?.some(action => action.kind === 'resume')

const waitingMissionCard = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission_waiting_user',
  content: '请补充测试账号。',
  globalMission: { id: 'mission_waiting_input', title: '等待补充任务', status: 'in_progress', mission_summary: { total: 1, passed: 0, blocked: 1 } },
  globalMissionSupervisor: {
    id: 'gms_waiting_input',
    status: 'waiting_user',
    incidents: [{ type: 'waiting_user', reason: '请补充测试账号。' }],
  },
})
const resumedMissionCard = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission',
  content: '补充信息已收到，任务继续执行。',
  globalMission: { id: 'mission_waiting_input', title: '等待补充任务', status: 'in_progress', status_detail: '补充信息已收到，任务继续执行。', mission_summary: { total: 1, passed: 0, blocked: 0 } },
  globalMissionSupervisor: {
    id: 'gms_waiting_input',
    status: 'monitoring',
    incidents: [{ type: 'waiting_user', reason: '请补充测试账号。', resolved_at: '2026-07-12T09:00:00.000Z' }],
    last_continuation: { kind: 'supplement', source: 'global_web_waiting_user_resolution', resolves_waiting_user: true, replan_required: false, interrupt_current_run: false, at: '2026-07-12T09:00:00.000Z' },
  },
})
checks.globalWaitingMissionUsesOneInputAction = waitingMissionCard?.phase === 'needs_user'
  && waitingMissionCard?.user_handoff?.primary_action?.kind === 'continue'
  && (waitingMissionCard?.user_handoff?.secondary_actions || []).length === 0
  && !waitingMissionCard?.actions?.some(action => action.kind === 'resume')
checks.globalResolvedWaitingMissionReturnsToExecution = resumedMissionCard?.phase === 'executing'
  && resumedMissionCard?.next_action === '我正在协调各执行目标'
  && !String(resumedMissionCard?.next_action || '').includes('测试账号')
  && resumedMissionCard?.continuation_status?.kind === 'supplement'
  && resumedMissionCard?.continuation_status?.reason === '用户已补充任务所需条件'

const projectOrdinary = projectExecutionTaskCard({
  role: 'assistant',
  content: '这个项目使用 Vue 和 Node。',
  streaming: false,
  workEvents: [{ kind: 'done', text: '回答完成' }],
}, 'demo')
checks.projectOrdinaryQuestionStaysDirect = projectOrdinary === null

const projectCard = projectExecutionTaskCard({
  role: 'assistant',
  requestText: '给登录页加 loading',
  streaming: false,
  task_id: 'pchat_demo',
  taskExperience: {
    task_id: 'pchat_demo',
    phase: 'completed',
    status: 'done',
    rollback_available: true,
    trace_id: 'project_chat_demo',
    requires_card: true,
    plan_mode: demoPlanMode,
    verification: ['npm test'],
  },
  projectRun: { id: 'pchat_demo', trace_id: 'project_chat_demo', parent_run_id: 'pchat_parent' },
  workEvents: [{ kind: 'done', text: '项目 Agent 已完成' }],
  fileChanges: { count: 1, files: [{ path: 'src/Login.vue', statusText: '修改' }] },
}, 'demo')
checks.projectExecutionUsesUnifiedCard = projectCard?.version === 1 && projectCard?.phase === 'completed' && projectCard?.delivery?.files?.includes('src/Login.vue')
  && projectCard?.delivery?.headline === '项目执行成员已提交可验收结果。'
  && projectCard?.next_action === '可以查看交付总结、验证结果和风险提示'
checks.projectExecutionShowsChangeSummary = projectCard?.change_summary?.schema === 'ccm-main-agent-change-summary-v1'
  && projectCard?.change_summary?.files?.some(file => file.path === 'src/Login.vue')
checks.projectExecutionShowsPlanAlignment = projectCard?.plan_alignment?.schema === 'ccm-main-agent-plan-alignment-v1'
  && projectCard?.plan_alignment?.status === 'aligned'
checks.projectExecutionHasSafeActions = ['view_changes', 'continue', 'rollback'].every(kind => projectCard?.actions?.some(action => action.kind === kind))
checks.projectContinuationIdentityIsTraceable = projectCard?.technical?.run_id === 'pchat_demo' && projectCard?.technical?.parent_run_id === 'pchat_parent'

const weakProjectDoneCard = projectExecutionTaskCard({
  role: 'assistant',
  requestText: '修改登录页按钮文案',
  streaming: false,
  task_id: 'pchat_weak_done',
  taskExperience: {
    task_id: 'pchat_weak_done',
    phase: 'completed',
    status: 'done',
    requires_card: true,
  },
  workEvents: [{ kind: 'done', text: '项目执行成员已完成' }],
  fileChanges: { count: 1, files: [{ path: 'src/Login.vue', statusText: '修改' }] },
}, 'demo')
checks.projectDoneWithoutVerificationDoesNotPassAcceptance = weakProjectDoneCard?.phase === 'completed'
  && weakProjectDoneCard?.delivery?.acceptance_passed === false
  && weakProjectDoneCard?.delivery?.headline?.includes('补齐验证或验收')
  && weakProjectDoneCard?.user_handoff?.status === 'needs_attention'
  && weakProjectDoneCard?.next_action?.includes('补齐验证或验收')
checks.projectDoneWithoutVerificationHandoffUsesNeutralGapCopy = weakProjectDoneCard?.user_handoff?.status_label === '待补齐'
  && weakProjectDoneCard?.user_handoff?.summary_cards?.some(item => item.id === 'attention' && String(item.value || '').includes('待补齐'))
  && !weakProjectDoneCard?.user_handoff?.headline?.includes('需要处理')

checks.naturalPhaseLabels = taskPhasePresentation('waiting_confirmation').label === '需要你确认'

assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2))
console.log(JSON.stringify({ success: true, checks }, null, 2))
