// Behavior-freeze fixture helpers extracted from collaboration-ux-self-tests.ts.
// Keeps host self-test under the 1500-line limit without changing behavior.

import {
  buildContinuationUserDecision,
  canCompleteDailyDevFromDeliverySummary,
  classifyGroupProjectTaskIntent,
  classifyTaskContinuation,
  getTaskGapItems,
  isAdvisoryNeed,
  looksLikeTaskContinuation,
  shouldCreatePersistentGroupTask,
  shouldNotifyGlobalDirectDispatchCompletion,
  shouldNotifyGlobalDirectDispatchContinuation,
  shouldNotifyGlobalDirectDispatchRollback,
  shouldUseProjectAnalysisMode,
} from "./collaboration";

export function buildUxSelfTestTask(ctx: any = {}) {
  return (
  {
      id: "ux-task",
      title: "增加负责人筛选",
      business_goal: "给工单页面增加负责人筛选",
      workflow_type: "daily_dev",
      assign_type: "group",
      requires_code_changes: true,
      requires_verification: true,
      status: "done",
      trace_id: "trace-ux",
      workflow_meta: {
        plan_mode: {
          title: "执行前计划",
          mode: "cc-style-plan-mode",
          requires_confirmation: false,
          auto_continue: true,
          risk: { level: "low", summary: "只改负责人筛选相关页面和接口", reasons: ["范围清晰"] },
          impact_scope: { projects: ["collab-web"], areas: ["负责人筛选"], file_hints: ["frontend/app.js", "backend/server.js"], multi_agent: false },
          read_only_exploration: { summary: "已确认筛选入口和后端接口位置", projects: ["collab-web"], knowledge_used: true, code_snapshot_used: true },
          steps: [
            { id: "understand_goal", label: "理解需求与验收目标", detail: "确认负责人筛选的页面入口和接口契约。", status: "completed" },
            { id: "dispatch_sub_agents", label: "派发子 Agent 工作单", detail: "交给 collab-web 修改页面和接口。", status: "completed" },
            { id: "verify_and_summarize", label: "验收结果并总结给用户", detail: "核对文件变更和 npm test 结果。", status: "completed" },
          ],
          acceptance: ["负责人筛选文件改动可查看", "npm test 必须通过", "子 Agent 必须提交结构化结果说明"],
          permission_boundaries: ["不要修改无关页面", "不要编造未执行的验证结果"],
        },
      },
      delivery_summary: {
        headline: "负责人筛选已完成",
        actual_file_change_count: 2,
        actual_file_changes: [{ path: "frontend/app.js" }, { path: "backend/server.js" }],
        verification_executed: ["npm test passed by external runner (exit 0)"],
        external_runner_verification_count: 1,
        verification_source_gate_passed: true,
        coordination_plan_count: 1,
        assignment_count: 1,
        worker_notification_count: 1,
        assignment_evidence: [{ project: "collab-web", task: "给工单页面增加负责人筛选", reason: "前端页面变更" }],
        worker_notifications: [{ task_id: "collab-web", status: "completed", summary: "已修改负责人筛选并运行 npm test" }],
        has_final_review: true,
        review_status: "complete",
        acceptance_gate_passed: true,
        receipt_statuses: [{ agent: "collab-web", status: "done", summary: "raw receipt should stay technical" }],
        ack_gate_passed: true,
        ack_review: { status: "approved", rejected: [], rows: [{ agent: "collab-web", status: "approved", reason: "ACK 目标和范围清晰" }] },
        receipts: [{
          agent: "collab-web",
          status: "done",
          summary: "已完成负责人筛选并同步接口字段 GET /api/users?role=owner",
          actions: ["修改筛选组件", "同步接口字段 GET /api/users?role=owner"],
          filesChanged: ["frontend/app.js", "backend/server.js"],
          verification: ["npm test passed by external runner (exit 0)"],
          ack: {
            understoodGoal: "给工单页面增加负责人筛选",
            plannedScope: ["frontend/app.js", "backend/server.js"],
            forbiddenScope: ["不改无关页面"],
            verificationPlan: ["npm test"],
            unclear: [],
          },
          contractChanges: [{
            type: "api",
            endpoint: "GET /api/users?role=owner",
            response: "返回可筛选负责人列表",
            consumers: ["collab-web"],
            note: "负责人筛选使用该接口字段",
          }],
          blockers: [],
          needs: [],
          memoryUsed: ["项目记忆：筛选页面结构"],
        }],
        timeline: [
          { id: "tl-plan", type: "coordinator_plan", title: "主 Agent 生成计划", status: "ok", phase: "planning", agent: "coordinator" },
          { id: "tl-conflict", type: "conflict_plan", title: "跨 Agent 冲突保护", detail: "检测到前后端可能同时修改 shared/types.ts", status: "warn", phase: "planning", data: { conflicts: [{ projects: ["frontend", "backend"], reason: "可能同时修改共享类型", scopes: ["shared/types.ts"] }] } },
          { id: "tl-handoff", type: "worker_handoff_ready", title: "collab-web 工作单已补齐", detail: "目标、范围、边界、验收、ACK 和回执要求已打包给子 Agent", status: "ok", phase: "dispatching", agent: "collab-web" },
          { id: "tl-qa", type: "agent_qa_question", title: "frontend 向 backend 提问", detail: "确认筛选字段", status: "active", phase: "executing", agent: "frontend" },
          { id: "tl-review", type: "coordinator_review", title: "主 Agent 验收", status: "ok", phase: "reviewing", agent: "coordinator" },
        ],
        agent_qa: [{
          id: "qa-ux",
          from_agent: "frontend",
          to_agent: "backend",
          question: "负责人字段叫什么？",
          answer: "ownerId",
          status: "resumed",
          execution_id: "exec-qa-ux",
          routing: { strategy: "capability_and_load" },
          answer_evidence: ["trace_id=qa-visible-should-stay-technical"],
          acceptance: { accepted: true, score: 92, status: "accepted" },
        }],
      },
    }
  );
}

export function buildUxSelfTestReinjectionGateGapDelivery(ctx: any = {}) {
  const { task } = ctx;
  return (
  {
      ...task.delivery_summary,
      acceptance_gate_passed: false,
      post_compact_reinjection_gates: [{
        gate_id: "pcrg_ux_gate",
        schema: "ccm-child-agent-post-compact-reinjection-gate-v1",
        group_id: "ux-group",
        target_project: "collab-web",
        status: "required",
        action: "review_reinjection_candidates_before_execution",
        candidate_count: 2,
        candidates: [
          { kind: "file", value: "frontend/legacy-filter.js", sourceMessageId: "ux-old-1" },
          { kind: "verification", value: "npm test", sourceMessageId: "ux-old-2" },
        ],
      }],
      post_compact_reinjection_gate_count: 1,
      post_compact_reinjection_gate_receipt_passed: false,
      post_compact_reinjection_gate_receipt_rows: [{
        agent: "collab-web",
        status: "done",
        score: 70,
        grade: "partial",
        pass: false,
        missing: ["引用压缩后重注入 gate"],
        post_compact_reinjection_gate: {
          required: true,
          pass: false,
          gate_ids: ["pcrg_ux_gate"],
          missing_gate_ids: ["pcrg_ux_gate"],
          candidate_count: 2,
          declared: false,
          used: [],
          ignored: [],
        },
      }],
      receipts: [{
        ...task.delivery_summary.receipts[0],
        memoryUsed: ["使用压缩前线索 frontend/legacy-filter.js"],
        memoryIgnored: [],
      }],
    }
  );
}

export function buildUxSelfTestReinjectionUsageGapDelivery(ctx: any = {}) {
  const { task } = ctx;
  return (
  {
      ...task.delivery_summary,
      acceptance_gate_passed: false,
      post_compact_reinjection_gates: [{
        gate_id: "pcrg_ux_usage_gate",
        schema: "ccm-child-agent-post-compact-reinjection-gate-v1",
        group_id: "ux-group",
        target_project: "collab-web",
        status: "required",
        action: "review_reinjection_candidates_before_execution",
        candidate_count: 2,
        candidates: [
          { candidate_id: "pcrc_ux_file", kind: "file", value: "frontend/legacy-filter.js", sourceMessageId: "ux-old-1" },
          { candidate_id: "pcrc_ux_test", kind: "verification", value: "npm test", sourceMessageId: "ux-old-2" },
        ],
      }],
      post_compact_reinjection_gate_count: 1,
      post_compact_reinjection_gate_receipt_passed: false,
      post_compact_reinjection_gate_receipt_rows: [{
        agent: "collab-web",
        status: "done",
        score: 70,
        grade: "partial",
        pass: false,
        missing: ["声明候选使用状态"],
        post_compact_reinjection_gate: {
          required: true,
          pass: false,
          gate_ids: ["pcrg_ux_usage_gate"],
          missing_gate_ids: [],
          candidate_count: 2,
          candidate_reference_required: true,
          candidate_reference_passed: true,
          candidate_usage_required: true,
          candidate_usage_declared_passed: false,
          referenced_candidate_ids: ["pcrc_ux_file"],
          missing_candidate_reference_gate_ids: [],
          missing_candidate_usage_gate_ids: ["pcrg_ux_usage_gate"],
          missing_candidate_usage_candidate_ids: ["pcrc_ux_file", "pcrc_ux_test"],
          candidate_usage_counts: { used: 0, ignored: 0, verified: 0, mentioned: 1, unreferenced: 1 },
          mentioned_only_candidate_ids: ["pcrc_ux_file"],
          unreferenced_candidate_ids: ["pcrc_ux_test"],
          declared: true,
          used: ["压缩前重注入候选 candidate_id=pcrc_ux_file；frontend/legacy-filter.js；reinjection_gate_id=pcrg_ux_usage_gate"],
          ignored: [],
        },
      }],
      receipts: [{
        ...task.delivery_summary.receipts[0],
        memoryUsed: ["压缩前重注入候选 candidate_id=pcrc_ux_file；frontend/legacy-filter.js；reinjection_gate_id=pcrg_ux_usage_gate"],
        memoryIgnored: [],
      }],
    }
  );
}

export function buildUxSelfTestChecks(ctx: any = {}) {
  const { acceptedPlanCard, acceptedPlanDraft, ackGapCard, ackGapDraft, ackGapTask, acknowledgement, activeCard, awaitingPlanCard, blockedCompletionAcceptance, blockedCompletionAcceptanceVisibleText, blockedCompletionReadiness, blockedCompletionVisibleText, card, closedTeamSummary, codeSnapshotSelfTest, collectVisibleTextValues, completedTargetDispatchLaunchSummary, continuationCard, continuationVisibleText, contractConsumedGate, contractDispatchedUnconsumedGate, contractGapDraft, contractGapTask, contractGenericApiGate, contractInjectionId, contractWeakConsumptionGate, coordinationVisibleText, differentSessionReworkReceipts, dispatchLaunchSummary, failedCard, failedIndependentReviewGapDraft, gatewayFallbackBlocked, gatewayLlmDelegates, gatewayLlmDirectAnswer, globalDirectBlockedTask, globalDirectCompletionMessage, globalDirectCompletionTask, globalDirectContinuationAlreadyNotifiedTask, globalDirectContinuationMessage, globalDirectContinuationTask, globalDirectRollbackAlreadyNotifiedTask, globalDirectRollbackMessage, globalDirectRollbackTask, globalDirectWeakCompletionTask, globalMemoryHealthGateReceiptSelfTest, globalMissionHandoff, globalQueuedMessage, goalRevisionContinuationCard, greetingCard, groupReport, handoffOnlyCard, highRiskPlan, independentReviewGapDraft, jargonAcceptance, jargonAcceptanceVisibleText, liveCheckpointCompletedCard, liveCheckpointStageCard, lowRiskPlan, memoryGateGapCard, missingEvidenceCard, missingIndependentReviewSummary, openTeamSummary, receiptResolvedCard, receiptReworkVisibleText, recoveredTestAgentNotificationTask, recoveryCard, reinjectionGateGapCard, reinjectionUsageGapCard, report, revertedCard, reviewedIndependentSummary, reviewingCard, revisedPlanCard, reworkingCard, runtimeKernelCard, sameSessionReworkReceipts, sessionProgressCard, task, taskAgentMemoryContextSnapshotReceiptSelfTest, visibleInternalTermPattern, weakAcceptanceOnlyCard, weakAcceptanceOnlyLifecycle, workItemReworkDraft, workItemSelfTest, workItemWatchdogStatus, workerContinuationRuntime, workerContinuationRuntimeHandoff, workerContinuationRuntimeRendered, workerHandoffSelfTest } = ctx;
  return (
  {
      completionReadinessShowsFriendlyBlockers: blockedCompletionReadiness?.schema === "ccm-main-agent-completion-readiness-v1"
        && blockedCompletionReadiness.status === "blocked"
        && blockedCompletionReadiness.headline.includes("还有 1 个工作项未完成")
        && blockedCompletionReadiness.rows.some((item: any) => item.target === "web" && item.status_label === "执行中"),
      completionReadinessHidesTechnicalIds: !blockedCompletionVisibleText.includes("wi-web")
        && !blockedCompletionVisibleText.includes("session-hidden")
        && blockedCompletionReadiness?.technical?.unresolved_work_item_ids?.includes("wi-web")
        && blockedCompletionReadiness?.technical?.open_session_ids?.includes("session-hidden"),
      completionAcceptanceNamesQueueAndSessionBlockers: blockedCompletionAcceptance.checks.some((item: any) => item.id === "work_items" && item.label === "执行队列收尾" && item.detail === "还有 1 个工作项未完成")
        && blockedCompletionAcceptance.checks.some((item: any) => item.id === "team_shutdown" && item.label === "执行成员会话收尾" && item.detail === "还有 1 个执行成员会话未结束")
        && !blockedCompletionAcceptanceVisibleText.includes("raw work item detail")
        && !blockedCompletionAcceptanceVisibleText.includes("raw team shutdown detail")
        && JSON.stringify(blockedCompletionAcceptance.technical || {}).includes("raw work item detail")
        && JSON.stringify(blockedCompletionAcceptance.technical || {}).includes("raw team shutdown detail"),
      acceptanceReviewVisibleTextHidesProtocolTerms: jargonAcceptance.checks.some((item: any) => item.id === "ack_gate" && item.label === "接单说明完整" && item.detail.includes("接单说明"))
        && jargonAcceptance.checks.some((item: any) => item.id === "memory_gate_receipt" && item.label === "记忆使用声明" && item.detail.includes("记忆使用声明"))
        && jargonAcceptance.checks.some((item: any) => item.id === "api_microcompact_receipt" && item.label === "上下文压缩计划使用说明" && item.detail.includes("上下文压缩计划"))
        && !/ACK|microcompact|\bgate\b|门禁|回执/.test(jargonAcceptanceVisibleText),
      acceptanceReviewKeepsRawGateDetailsTechnical: /ACK raw detail/.test(JSON.stringify(jargonAcceptance.technical || {}))
        && /记忆 gate raw detail/.test(JSON.stringify(jargonAcceptance.technical || {}))
        && /API microcompact edit plan raw detail/.test(JSON.stringify(jargonAcceptance.technical || {})),
      simplePhaseLanguage: card.phase_label === "已完成",
      conciseAgentLanguage: card.agents.every((item: any) => !/receipt|回执|门禁|session|trace/i.test(item.summary)),
      simpleActions: card.actions.some((item: any) => item.label === "查看改动")
        && card.actions.some((item: any) => item.label === "继续修改")
        && card.actions.some((item: any) => item.label === "安全撤销")
        && failedCard.actions.some((item: any) => item.label === "重新执行")
        && activeCard.actions.some((item: any) => item.label === "停止"),
      revertedPhase: revertedCard.phase === "reverted" && revertedCard.phase_label === "已安全撤销",
      technicalIdsStayCollapsed: !!card.technical.trace_id,
      userWorkflowTimelineVisible: card.workflow_timeline.length >= 4 && card.workflow_timeline.some((item: any) => item.label.includes("预判潜在修改冲突")),
      workerHandoffTimelineVisible: card.workflow_timeline.some((item: any) => item.label.includes("工作单已补齐")) && !JSON.stringify(card.workflow_timeline).includes("CCM_AGENT_RECEIPT"),
      progressCheckpointsVisible: card.progress_checkpoints?.schema === "ccm-main-agent-progress-checkpoints-v1"
        && card.progress_checkpoints.items?.some((item: any) => item.label.includes("协作计划") || item.label.includes("工作单")),
      progressCheckpointsHideProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_ids|WorkerContextPacket/.test(JSON.stringify(card.progress_checkpoints || {})),
      liveCheckpointStageEventsVisible: liveCheckpointStageCard.progress_checkpoints?.items?.some((item: any) => item.label.includes("执行前计划已按反馈调整"))
        && liveCheckpointStageCard.progress_checkpoints?.items?.some((item: any) => item.label.includes("我已接上恢复任务"))
        && liveCheckpointStageCard.progress_checkpoints?.items?.some((item: any) => item.label.includes("提交结果"))
        && liveCheckpointStageCard.progress_checkpoints?.items?.some((item: any) => item.label.includes("定向补充"))
        && liveCheckpointStageCard.progress_checkpoints?.items?.some((item: any) => item.label.includes("我已安排子任务返工")),
      liveCheckpointSupervisorCompletionVisible: liveCheckpointCompletedCard.progress_checkpoints?.items?.some((item: any) => item.label.includes("我已检查子任务进展"))
        && liveCheckpointCompletedCard.progress_checkpoints?.items?.some((item: any) => item.label.includes("全局任务已通过交付验收")),
      liveCheckpointStageEventsHideProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_ids|WorkerContextPacket/.test(JSON.stringify([liveCheckpointStageCard.progress_checkpoints, liveCheckpointCompletedCard.progress_checkpoints])),
      globalMissionHandoffComplete: globalMissionHandoff.schema === "ccm-self-contained-worker-handoff-v1" && globalMissionHandoff.global_mission?.mission_id === "gm-selftest" && globalMissionHandoff.worker_context_packet?.packet_id && globalMissionHandoff.done_criteria?.some((item: string) => item.includes("全局汇总")),
      globalMissionQueuedMessageHasContext: globalQueuedMessage.includes("全局任务交接") && globalQueuedMessage.includes("给全局 Agent 的交付要求") && !/WorkerContextPacket|trace_id/.test(globalQueuedMessage),
      globalDirectDispatchCompletionSyncReady: shouldNotifyGlobalDirectDispatchCompletion(globalDirectCompletionTask, "in_progress") === true && shouldNotifyGlobalDirectDispatchCompletion(globalDirectBlockedTask, "in_progress") === false,
      globalDirectDispatchWeakAcceptanceNotSynced: shouldNotifyGlobalDirectDispatchCompletion(globalDirectWeakCompletionTask, "in_progress") === false,
      globalDirectDispatchCompletionMessageFriendly: globalDirectCompletionMessage.includes("通过验收") && globalDirectCompletionMessage.includes("最终总结") && !/CCM_AGENT_RECEIPT|trace_id|global_run_id|WorkerContextPacket|Trace|内部回执/.test(globalDirectCompletionMessage),
      globalDirectDispatchContinuationSyncReady: shouldNotifyGlobalDirectDispatchContinuation(globalDirectContinuationTask, "in_progress") === true && shouldNotifyGlobalDirectDispatchContinuation(globalDirectContinuationAlreadyNotifiedTask, "in_progress") === false && shouldNotifyGlobalDirectDispatchContinuation(globalDirectCompletionTask, "in_progress") === false,
      globalDirectDispatchContinuationMessageFriendly: globalDirectContinuationMessage.includes("补充要求")
        && globalDirectContinuationMessage.includes("保留旧支付表")
        && globalDirectContinuationMessage.includes("停止当前执行轮")
        && globalDirectContinuationMessage.includes("这还不是完成结果")
        && !/CCM_AGENT_RECEIPT|trace_id|global_run_id|WorkerContextPacket|Trace|内部回执/.test(globalDirectContinuationMessage),
      globalDirectDispatchRollbackSyncReady: shouldNotifyGlobalDirectDispatchRollback(globalDirectRollbackTask, "done") === true && shouldNotifyGlobalDirectDispatchRollback(globalDirectRollbackAlreadyNotifiedTask, "done") === false,
      globalDirectDispatchRollbackMessageFriendly: globalDirectRollbackMessage.includes("已安全撤销") && globalDirectRollbackMessage.includes("不再视为已交付") && globalDirectRollbackMessage.includes("重新读取当前代码状态") && !/CCM_AGENT_RECEIPT|trace_id|global_run_id|WorkerContextPacket/.test(globalDirectRollbackMessage),
      teamShutdownGateBlocksOpenSession: openTeamSummary.acceptance_gate_passed === false && openTeamSummary.acceptance_gate?.failed_checks?.some((item: any) => item.id === "team_shutdown") && openTeamSummary.team_shutdown?.open_session_count === 1,
      teamShutdownGatePassesAfterClose: closedTeamSummary.team_shutdown?.open_session_count === 0
        && closedTeamSummary.team_shutdown?.pass === true
        && !closedTeamSummary.acceptance_gate?.failed_checks?.some((item: any) => item.id === "team_shutdown"),
      independentReviewGateBlocksComplexChange: missingIndependentReviewSummary.independent_review_required === true
        && missingIndependentReviewSummary.independent_review_gate_passed === false
        && missingIndependentReviewSummary.acceptance_gate?.failed_checks?.some((item: any) => item.id === "independent_review"),
      independentReviewGatePassesWithEvidence: reviewedIndependentSummary.independent_review_required === true
        && reviewedIndependentSummary.independent_review_gate_passed === true
        && !reviewedIndependentSummary.acceptance_gate?.failed_checks?.some((item: any) => item.id === "independent_review"),
      independentReviewGapDraftGuidesReviewer: independentReviewGapDraft.includes("复杂变更独立复核")
        && independentReviewGapDraft.includes("request_review")
        && independentReviewGapDraft.includes("independentReview"),
      independentReviewFailedGapDraftRoutesRework: failedIndependentReviewGapDraft.includes("复核未通过")
        && failedIndependentReviewGapDraft.includes("原实现成员返工")
        && failedIndependentReviewGapDraft.includes("重新运行 TestAgent"),
      liveTodoPlanVisible: card.live_todo_plan?.source === "ccm-live-task-todo" && Array.isArray(card.mainAgentDecision?.user_plan_steps) && card.mainAgentDecision.user_plan_steps.some((step: any) => step.id === "final_delivery_report" && step.status === "completed"),
      groupWeakAcceptanceOnlyStaysInReview: weakAcceptanceOnlyLifecycle.state === "acceptance"
        && weakAcceptanceOnlyLifecycle.terminal === false
        && weakAcceptanceOnlyCard.phase === "reviewing"
        && weakAcceptanceOnlyCard.delivery?.acceptance_passed === false
        && weakAcceptanceOnlyCard.acceptance_review?.pass === false
        && weakAcceptanceOnlyCard.acceptance_review?.missing?.includes("目标覆盖")
        && weakAcceptanceOnlyCard.blockers?.includes("最终验收缺少真实验证或复核证据")
        && !weakAcceptanceOnlyCard.mainAgentDecision?.verify?.passed
        && weakAcceptanceOnlyCard.mainAgentDecision?.user_plan_steps?.some((step: any) => step.id === "coordinator_review" && step.status === "reviewing")
        && !weakAcceptanceOnlyCard.mainAgentDecision?.user_plan_steps?.some((step: any) => step.id === "final_delivery_report" && step.status === "completed")
        && !weakAcceptanceOnlyCard.actions?.some((action: any) => action.kind === "rollback"),
      workItemsVisible: card.work_items?.some((item: any) => item.target === "collab-web" && item.status === "completed") && card.work_item_summary?.all_completed === true,
      workItemSelfTestPasses: workItemSelfTest.pass === true,
      workerHandoffSelfTestPasses: workerHandoffSelfTest.pass === true,
      globalMemoryHealthGateReceiptSelfTestPasses: globalMemoryHealthGateReceiptSelfTest.pass === true,
      taskAgentMemoryContextSnapshotReceiptSelfTestPasses: taskAgentMemoryContextSnapshotReceiptSelfTest.pass === true,
      workerContinuationHandoffBuildsRuntime: workerContinuationRuntime?.schema === "ccm-worker-continuation-handoff-v1"
        && workerContinuationRuntime?.replan_required === true
        && workerContinuationRuntime?.interrupt_current_run === true
        && workerContinuationRuntime?.latest_user_change?.includes("保留旧支付表")
        && workerContinuationRuntime?.previous_goal?.includes("重构支付流程")
        && workerContinuationRuntime?.instructions?.some((item: string) => item.includes("不要继续已停止执行轮中的旧方向")),
      workerContinuationHandoffRenderedForDispatch: workerContinuationRuntimeHandoff?.scope?.continuation?.schema === "ccm-worker-continuation-handoff-v1"
        && workerContinuationRuntimeRendered.includes("接续/目标调整说明")
        && workerContinuationRuntimeRendered.includes("最新用户要求")
        && workerContinuationRuntimeRendered.includes("保留旧支付表")
        && workerContinuationRuntimeRendered.includes("旧目标仅作背景")
        && workerContinuationRuntimeRendered.includes("不要继续已停止执行轮中的旧方向")
        && workerContinuationRuntimeRendered.includes("已有验证证据")
        && !/基于你的发现|based on your findings/i.test(workerContinuationRuntimeRendered),
      liveTodoReviewing: reviewingCard.mainAgentDecision?.user_plan_steps?.some((step: any) => step.id === "coordinator_review" && step.status === "reviewing"),
      liveTodoReworking: reworkingCard.mainAgentDecision?.user_plan_steps?.some((step: any) => step.status === "reworking"),
      continuationStatusVisible: continuationCard.continuation_status?.schema === "ccm-main-agent-continuation-status-v1"
        && continuationCard.continuation_status?.target === "collab-web"
        && continuationCard.workflow_timeline?.some((item: any) => item.label.includes("下一步派发")),
      goalRevisionContinuationStatusVisible: goalRevisionContinuationCard.continuation_status?.schema === "ccm-main-agent-continuation-status-v1"
        && goalRevisionContinuationCard.continuation_status?.replan_required === true
        && goalRevisionContinuationCard.continuation_status?.interrupt_current_run === true
        && goalRevisionContinuationCard.continuation_status?.kind_label === "目标调整"
        && goalRevisionContinuationCard.continuation_status?.status === "interrupting"
        && goalRevisionContinuationCard.continuation_status?.route_label === "先停止当前轮再重核计划"
        && goalRevisionContinuationCard.continuation_status?.handoff_steps?.some((item: any) => item.label === "停止当前轮并重核计划")
        && goalRevisionContinuationCard.workflow_timeline?.some((item: any) => item.label.includes("目标调整")),
      continuationStatusHidesProtocol: !!continuationVisibleText
        && !visibleInternalTermPattern.test(continuationVisibleText),
      liveTodoFailedNeedsConfirmation: failedCard.mainAgentDecision?.user_plan_steps?.some((step: any) => ["needs_confirmation", "failed"].includes(step.status)),
      liveTodoCancelled: revertedCard.mainAgentDecision?.user_plan_steps?.some((step: any) => step.status === "cancelled"),
      liveTodoRestoresRecoveryContext: recoveryCard.recovery_summary?.schema === "ccm-main-agent-recovery-summary-v1"
        && recoveryCard.recovery_summary?.revalidated?.goal === true
        && recoveryCard.recovery_summary?.status_label === "已自动接上"
        && recoveryCard.recovery_summary?.preserved?.includes("已保留你之前确认的执行授权")
        && recoveryCard.recovery_summary?.headline?.includes("服务重启后，我已自动接上这轮任务")
        && recoveryCard.recovery_summary?.technical?.decision_code === "authorized_incomplete_task"
        && recoveryCard.mainAgentDecision?.user_plan_steps?.some((step: any) => step.id === "restore_task_context" && step.status === "completed"),
      liveTodoEvidenceTraceable: card.mainAgentDecision?.user_plan_steps?.every((step: any) => Array.isArray(step.evidence) && step.evidence.length > 0),
      liveTodoFailureHasActions: failedCard.mainAgentDecision?.user_plan_steps?.some((step: any) => ["needs_confirmation", "failed"].includes(step.status) && Array.isArray(step.actions) && step.actions.some((action: any) => ["retry", "gap_continue", "switch_executor", "cancel"].includes(action.kind))),
      agentQaVisible: card.agent_questions[0]?.label === "已采纳并继续",
      agentQaUserPreviewVisible: card.agent_questions[0]?.schema === "ccm-agent-qa-user-preview-v1"
        && card.agent_questions[0]?.summary?.includes("backend 的回答已被我采纳")
        && card.agent_questions[0]?.next_action?.includes("继续原任务执行"),
      agentQaUserPreviewHidesProtocol: !visibleInternalTermPattern.test(collectVisibleTextValues(card.agent_questions).join("\n")),
      conflictWarningsVisible: card.conflict_warnings[0]?.title.includes("frontend"),
      greetingDoesNotCreateTaskCard: classifyGroupProjectTaskIntent("你好").executable === false,
      ordinaryQuestionDoesNotCreateTaskCard: classifyGroupProjectTaskIntent("这个知识库怎么用？").executable === false,
      explicitDevelopmentCreatesTaskCard: classifyGroupProjectTaskIntent("帮我给项目A新增支付接口并改前端页面").executable === true,
      groupIntentGatewayBlocksRuleFallbackWrite: gatewayFallbackBlocked.executable === false && gatewayFallbackBlocked.agent_gateway?.llm_backed === false,
      groupIntentGatewayAllowsLlmDelegate: gatewayLlmDelegates.executable === true && gatewayLlmDelegates.agent_gateway?.llm_backed === true,
      groupIntentGatewayKeepsLlmDirectAnswerReadOnly: gatewayLlmDirectAnswer.executable === false && gatewayLlmDirectAnswer.analysisEligible === true,
      projectTaskModeQuestionDoesNotCreatePersistentTask: shouldCreatePersistentGroupTask({ isOrchestrated: true, messageMode: "project_task", taskIntent: classifyGroupProjectTaskIntent("你好，这是一个什么项目") }) === false,
      projectTaskQuestionUsesReadOnlyAnalysis: shouldUseProjectAnalysisMode({ isOrchestrated: true, messageMode: "project_task", taskIntent: classifyGroupProjectTaskIntent("你好，这是一个什么项目") }) === true,
      explicitAnalysisGreetingDoesNotReadProjects: shouldUseProjectAnalysisMode({ isOrchestrated: true, messageMode: "project_analysis", taskIntent: classifyGroupProjectTaskIntent("你好") }) === false,
      explicitAnalysisModeReadsProjectContext: shouldUseProjectAnalysisMode({ isOrchestrated: true, messageMode: "project_analysis", taskIntent: classifyGroupProjectTaskIntent("这个项目架构是什么") }) === true,
      projectAnalysisReadsSafeCodeSnapshot: codeSnapshotSelfTest.pass === true,
      forceTaskCanBypassIntentGate: shouldCreatePersistentGroupTask({ isOrchestrated: true, messageMode: "project_task", taskIntent: classifyGroupProjectTaskIntent("你好"), forceProjectTask: true }) === true,
      nonTaskCardIsHidden: greetingCard.visible === false,
      planModeHighRiskRequiresConfirmation: highRiskPlan.requiresConfirmation === true && highRiskPlan.level === "high",
      planModeLowRiskAutoContinues: lowRiskPlan.requiresConfirmation === false && lowRiskPlan.level === "low",
      awaitingPlanCardNeedsUser: awaitingPlanCard.phase === "needs_user" && awaitingPlanCard.actions.some((item: any) => item.kind === "confirm_plan"),
      awaitingPlanCardShowsPlan: awaitingPlanCard.plan_mode?.requires_confirmation === true && awaitingPlanCard.plan_mode?.read_only_exploration?.code_snapshot_used === true,
      planModeStepsVisible: card.plan_mode?.steps?.some((item: any) => item.id === "dispatch_sub_agents" && item.label?.includes("派发子 Agent")),
      awaitingPlanCardShowsSteps: awaitingPlanCard.plan_mode?.steps?.some((item: any) => item.id === "confirm_boundary" && item.status === "needs_confirmation")
        && awaitingPlanCard.plan_mode?.steps?.some((item: any) => item.id === "verify_and_summarize" && item.label?.includes("总结")),
      awaitingPlanCardShowsClarificationQuestions: awaitingPlanCard.plan_mode?.needs_clarification === true
        && awaitingPlanCard.plan_mode?.clarification_questions?.some((item: any) => item.id === "compatibility_boundary")
        && awaitingPlanCard.plan_mode?.clarification_questions?.some((item: any) => item.question?.includes("验收结果")),
      awaitingPlanCardCanRevise: awaitingPlanCard.actions.some((item: any) => item.kind === "revise_plan") && awaitingPlanCard.actions.some((item: any) => item.kind === "cancel"),
      revisedPlanCardStaysInPlanMode: revisedPlanCard.phase === "needs_user" && revisedPlanCard.actions.some((item: any) => item.kind === "confirm_plan") && revisedPlanCard.actions.some((item: any) => item.kind === "revise_plan"),
      revisedPlanFeedbackVisible: revisedPlanCard.plan_mode?.revision?.feedback?.includes("保留旧支付表") && revisedPlanCard.plan_mode?.revision?.next_step?.includes("重新确认"),
      revisedPlanAnswersClarificationQuestions: revisedPlanCard.plan_mode?.needs_clarification === false
        && revisedPlanCard.plan_mode?.clarification_questions?.every((item: any) => item.status === "answered_by_revision" && item.answer?.includes("保留旧支付表")),
      confirmedPlanFeedbackCarried: acceptedPlanDraft.requires_confirmation === false
        && acceptedPlanDraft.auto_continue === true
        && acceptedPlanDraft.accepted_feedback.includes("README")
        && acceptedPlanDraft.acceptance.some((item: string) => item.includes("README")),
      confirmedPlanExecutionFollowupVisible: acceptedPlanDraft.plan_execution_followup?.schema === "ccm-main-agent-plan-execution-followup-v1"
        && acceptedPlanDraft.plan_execution_followup?.headline?.includes("最终总结前逐项核对验收标准"),
      confirmedPlanFeedbackVisible: acceptedPlanCard.plan_mode?.accepted_feedback?.includes("README")
        && acceptedPlanCard.plan_mode?.requires_confirmation === false
        && !acceptedPlanCard.actions.some((item: any) => item.kind === "confirm_plan"),
      workOrderPreviewVisible: card.work_order_preview?.orders?.some((item: any) => item.project === "collab-web" && item.allowed_scope?.length && item.acceptance?.length),
      executionStoryShowsCodingFlow: ["read_context", "prepare_work_orders", "dispatch_agents", "edit_files", "run_checks", "final_review"].every(id => card.execution_story?.steps?.some((item: any) => item.id === id)),
      acceptanceReviewHardGateVisible: card.acceptance_review?.checks?.some((item: any) => item.id === "actual_diff" && item.ok) && card.acceptance_review?.checks?.some((item: any) => item.id === "verification" && item.ok),
      missingEvidenceAcceptanceReviewBlocksCompletion: missingEvidenceCard.acceptance_review?.pass === false && missingEvidenceCard.acceptance_review?.missing?.includes("真实文件改动") && missingEvidenceCard.acceptance_review?.missing?.includes("已执行验证"),
      memoryGateAcceptanceReviewVisible: memoryGateGapCard.acceptance_review?.checks?.some((item: any) => item.id === "memory_gate_receipt" && item.ok === false && /记忆使用声明/.test(item.detail || "")),
      reinjectionGateAcceptanceReviewVisible: reinjectionGateGapCard.acceptance_review?.checks?.some((item: any) => item.id === "post_compact_reinjection_gate_receipt" && item.ok === false && /压缩后上下文恢复/.test(item.detail || "")),
      planAlignmentVisible: card.plan_alignment?.schema === "ccm-main-agent-plan-alignment-v1"
        && card.plan_alignment?.status === "aligned"
        && card.plan_alignment?.checks?.some((item: any) => item.label.includes("npm test") && item.ok),
      missingEvidencePlanAlignmentShowsDeviation: missingEvidenceCard.plan_alignment?.status === "needs_evidence"
        && missingEvidenceCard.plan_alignment?.deviations?.some((item: any) => item.label.includes("负责人筛选文件改动")),
      userHandoffVisible: card.user_handoff?.schema === "ccm-main-agent-user-handoff-v1"
        && ["view_changes", "gap_continue"].includes(card.user_handoff?.primary_action?.kind)
        && [card.user_handoff?.primary_action, ...(card.user_handoff?.secondary_actions || [])].some((item: any) => item?.kind === "view_changes")
        && card.user_handoff?.evidence?.some((item: string) => item.includes("计划核对")),
      userHandoffSummaryCardsVisible: card.user_handoff?.summary_cards?.some((item: any) => item.id === "verification" && item.label === "验证状态")
        && card.user_handoff?.summary_cards?.some((item: any) => item.id === "next" && item.label === "下一步"),
      ordinaryQuestionHasNoUserHandoff: greetingCard.user_handoff === null || greetingCard.user_handoff === undefined,
      userHandoffHidesProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_id|WorkerContextPacket|raw receipt|raw payload|原始回执/i.test(JSON.stringify(card.user_handoff || {})),
      agentCoordinationProtocolVisible: card.agent_coordination?.source === "main-child-agent-coordination-6.0" && card.agent_coordination?.handoff?.some((item: any) => item.agent === "collab-web" && item.status === "accepted"),
      agentCoordinationHeartbeatVisible: card.agent_coordination?.heartbeat?.some((item: any) => /collab-web/.test(item.text)),
      agentCoordinationContractSyncVisible: card.agent_coordination?.contract_sync?.required === true && card.agent_coordination?.contract_sync?.status === "structured",
      agentCoordinationReceiptQualityScores: card.agent_coordination?.receipt_quality?.some((item: any) => item.agent === "collab-web" && item.quality?.grade === "good"),
      childAgentPlanReviewVisible: card.agent_coordination?.child_plan_review?.schema === "ccm-child-agent-plan-review-v1"
        && card.agent_coordination?.child_plan_review?.status === "approved"
        && card.agent_coordination?.child_plan_review?.rows?.some((item: any) => item.agent === "collab-web" && item.verification_plan?.includes("npm test")),
      childAgentPlanReviewNeedsRevisionVisible: ackGapCard.agent_coordination?.child_plan_review?.status === "needs_revision"
        && ackGapCard.agent_coordination?.child_plan_review?.rows?.some((item: any) => item.agent === "collab-web" && item.status === "needs_revision"),
      agentCoordinationMemoryGateVisible: memoryGateGapCard.agent_coordination?.memory_gate_summary?.status === "missing_receipt_reference"
        && memoryGateGapCard.agent_coordination?.receipt_quality?.some((item: any) => item.agent === "collab-web" && item.quality?.memory_gate?.missing_gate_ids?.includes("gmd_ux_gate")),
      agentCoordinationReinjectionGateVisible: reinjectionGateGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.required === true
        && reinjectionGateGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.pass === false,
      agentCoordinationReinjectionUsageGateVisible: reinjectionUsageGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.status === "missing_candidate_usage"
        && reinjectionUsageGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.missing_candidate_usage_gate_ids?.includes("pcrg_ux_usage_gate")
        && reinjectionUsageGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.missing_candidate_usage_candidate_ids?.includes("pcrc_ux_test")
        && reinjectionUsageGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.candidate_usage_counts?.mentioned >= 1,
      childAgentHandoffQualityGateBlocksAdvisoryResult: handoffOnlyCard.agent_coordination?.receipt_quality?.some((item: any) =>
        item.agent === "collab-web"
        && item.quality?.handoff_quality?.pass === false
        && item.quality?.missing?.includes("完成执行而非仅建议")
      ),
      childAgentHandoffQualityCreatesTargetedRework: handoffOnlyCard.agent_coordination?.targeted_rework?.some((item: any) =>
        item.id === "handoff_only_receipt"
        && item.target === "collab-web"
        && item.title === "要求补齐真实执行证据"
      ),
      childAgentHandoffQualityVisibleTextFriendly: !visibleInternalTermPattern.test(collectVisibleTextValues({
        targeted_rework: handoffOnlyCard.agent_coordination?.targeted_rework?.map((item: any) => ({ title: item.title, reason: item.reason, label: item.label })),
        events: handoffOnlyCard.agent_coordination?.coordination_events?.map((item: any) => ({ label: item.label, detail: item.detail })),
        next_action: handoffOnlyCard.agent_coordination?.next_action,
      }).join("\n")),
      agentCoordinationTargetedReworkForMissingEvidence: missingEvidenceCard.agent_coordination?.targeted_rework?.some((item: any) => item.id === "missing_diff") && missingEvidenceCard.agent_coordination?.targeted_rework?.some((item: any) => item.id === "missing_verification"),
      agentProgressSummaryVisible: card.agent_progress_summary?.schema === "ccm-child-agent-progress-summary-v1"
        && card.agent_progress_summary?.rows?.some((item: any) => item.agent === "collab-web" && item.status === "completed" && item.status_label === "已回传结果" && item.files_changed_count >= 1)
        && card.agent_progress_summary?.rows?.some((item: any) => item.agent === "collab-web" && item.evidence?.some((evidence: any) => evidence.value === "已回传结果" || evidence.id === "files")),
      agentProgressSummaryHidesProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_id|WorkerContextPacket|raw receipt|raw payload|原始回执/i.test(JSON.stringify(card.agent_progress_summary || {})),
      agentProgressSummaryTracksWaitingAgent: missingEvidenceCard.agent_progress_summary?.rows?.some((item: any) => item.agent === "collab-web" && item.current_focus?.includes("负责人筛选") && ["running", "pending"].includes(item.status)),
      agentProgressSummaryUsesSessionProgress: sessionProgressCard.agent_progress_summary?.rows?.some((item: any) =>
        item.agent === "collab-web"
        && item.status === "running"
        && item.summary?.includes("已连续推进 2 轮")
        && item.evidence?.some((evidence: any) => evidence.id === "session_progress" && evidence.detail?.includes("上下文已保留"))
      ),
      agentProgressSummarySessionProgressHidesProtocol: !/session_id|nativeSessionId|native_session|cursor-session|task_agent_session/i.test(JSON.stringify(sessionProgressCard.agent_progress_summary || {})),
      changeSummaryVisible: card.change_summary?.schema === "ccm-main-agent-change-summary-v1"
        && card.change_summary?.files?.some((item: any) => item.path === "frontend/app.js" && item.project === "collab-web")
        && card.change_summary?.file_count >= 2,
      changeSummaryActionDataReady: card.change_summary?.next_action?.includes("查看具体文件 diff") && card.actions.some((item: any) => item.kind === "view_changes"),
      receiptReworkSummaryVisible: missingEvidenceCard.receipt_rework_summary?.schema === "ccm-main-agent-receipt-rework-summary-v1"
        && missingEvidenceCard.receipt_rework_summary?.gaps?.some((item: any) => item.id === "missing_receipt" && item.target === "collab-web")
        && missingEvidenceCard.receipt_rework_summary?.gaps?.every((item: any) => item.action?.kind === "targeted_rework"),
      receiptReworkMemoryGateGapVisible: memoryGateGapCard.receipt_rework_summary?.gaps?.some((item: any) => item.id === "memory_gate_receipt" && item.target === "collab-web" && /gmd_ux_gate/.test(item.reason || "")),
      receiptReworkReinjectionGateGapVisible: reinjectionGateGapCard.receipt_rework_summary?.gaps?.some((item: any) => item.id === "post_compact_reinjection_gate_receipt" && item.target === "collab-web" && /pcrg_ux_gate/.test(item.reason || "")),
      receiptReworkReinjectionUsageGapVisible: reinjectionUsageGapCard.receipt_rework_summary?.gaps?.some((item: any) => item.id === "post_compact_reinjection_gate_receipt" && item.target === "collab-web" && /使用状态|used\/ignored\/verified|pcrg_ux_usage_gate/.test(item.reason || "")),
      receiptReworkResolvedVisible: receiptResolvedCard.receipt_rework_summary?.status === "passed"
        && receiptResolvedCard.receipt_rework_summary?.resolved?.some((item: any) => item.target === "collab-web" && item.status === "passed")
        && !receiptResolvedCard.receipt_rework_summary?.gaps?.length,
      receiptReworkVisibleTextHidesProtocol: !!receiptReworkVisibleText
        && !visibleInternalTermPattern.test(receiptReworkVisibleText)
        && receiptReworkVisibleText.includes("结果说明"),
      agentCoordinationVisibleTextHidesProtocol: !!coordinationVisibleText
        && !visibleInternalTermPattern.test(coordinationVisibleText)
        && coordinationVisibleText.includes("结果说明"),
      agentCoordinationAckReviewApproved: card.agent_coordination?.ack_review?.rows?.some((item: any) => item.agent === "collab-web" && item.status === "approved"),
      agentCoordinationContractTransferReady: card.agent_coordination?.contract_transfer?.rows?.some((item: any) => item.target === "collab-web" && item.status === "ready_to_inject"),
      ackGapBlocksCompletion: canCompleteDailyDevFromDeliverySummary(ackGapTask, { status: "done" }, ackGapTask.delivery_summary) === false,
      ackGapCreatesRewriteDraft: getTaskGapItems(ackGapTask).some((item: string) => item.startsWith("ack_rewrite:collab-web")) && ackGapDraft.includes("需要先返工的 ACK 前置审核"),
      contractGapCreatesInjectionDraft: getTaskGapItems(contractGapTask).some((item: string) => item.startsWith("contract_inject:collab-web")) && contractGapDraft.includes("需要注入依赖 Agent 的 contractChanges") && contractGapDraft.includes("collab-web"),
      recoveredTestAgentFailureDoesNotRemainGap: !getTaskGapItems(recoveredTestAgentNotificationTask).some((item: string) => item.startsWith("notification:test-agent:")),
      coordinatorOwnedReviewNeedDoesNotRemainGap: !getTaskGapItems(recoveredTestAgentNotificationTask).some((item: string) => item.startsWith("need:")),
      coordinatorOwnedReviewNeedIsAdvisory: isAdvisoryNeed("等待主 Agent 重新运行 TestAgent 复核本轮返工修复") === true,
      coordinatorOwnedDirectReviewNeedIsAdvisory: isAdvisoryNeed("主 Agent 调用 TestAgent 重新执行独立复核，确认 CCM_TEST_AGENT_REVIEW=1 路径通过") === true,
      genericCoordinatorNeedsUserStateIsNotAConcreteBlocker: isAdvisoryNeed("主 Agent 需要用户补充") === true,
      sameSessionReworkInheritsApprovedAck: sameSessionReworkReceipts[0]?.ack?.understoodGoal === "完成目标",
      differentSessionReworkDoesNotInheritAck: !differentSessionReworkReceipts[0]?.ack,
      targetedReworkIncludesWorkItemContext: workItemReworkDraft.includes("相关执行队列工作项") && workItemReworkDraft.includes("状态=failed") && workItemReworkDraft.includes("缺少 npm test 执行结果"),
      watchdogSeesStalledWorkItem: workItemWatchdogStatus.work_item_stalled?.some((item: any) => item.work_item_id === "wi-stalled" && item.target === "collab-web"),
      contractInjectionGateRequiresConsumerReceipt: contractDispatchedUnconsumedGate.pass === false && contractDispatchedUnconsumedGate.status === "needs_consumption" && contractDispatchedUnconsumedGate.unconsumed[0]?.injection_id === contractInjectionId,
      contractInjectionGateRecognizesConsumerRerun: contractConsumedGate.pass === true && contractConsumedGate.rows[0]?.assignment_message_id === "m-contract" && contractConsumedGate.rows[0]?.consumed === true,
      contractInjectionGateRequiresConsumptionQuality: contractWeakConsumptionGate.pass === false && contractWeakConsumptionGate.rows[0]?.missing_reason === "needs_consumption_evidence",
      contractInjectionGateRejectsGenericApiAssignment: contractGenericApiGate.pass === false && contractGenericApiGate.rows[0]?.assignment_message_id === "",
      taskCardShowsRuntimeKernel: runtimeKernelCard.runtime_kernel?.ack_only?.active === true && runtimeKernelCard.runtime_kernel?.injection_ids?.includes("ci_selftest") && runtimeKernelCard.technical?.runtime_kernel?.worker_context_packet_ids?.includes("wcp_selftest"),
      runtimeKernelShowsMemoryGate: memoryGateGapCard.runtime_kernel?.memory_gate?.status === "missing_receipt_reference" && memoryGateGapCard.runtime_kernel?.memory_gate?.gate_ids?.includes("gmd_ux_gate"),
      runtimeKernelShowsReinjectionGate: reinjectionGateGapCard.runtime_kernel?.post_compact_reinjection_gate?.status === "missing_receipt_reference" && reinjectionGateGapCard.runtime_kernel?.post_compact_reinjection_gate?.gate_ids?.includes("pcrg_ux_gate"),
      runtimeKernelShowsReinjectionUsageGate: reinjectionUsageGapCard.runtime_kernel?.post_compact_reinjection_gate?.status === "missing_candidate_usage" && reinjectionUsageGapCard.runtime_kernel?.post_compact_reinjection_gate?.missing_candidate_usage_gate_ids?.includes("pcrg_ux_usage_gate"),
      agentCoordinationEventStreamVisible: ["work_order_sent", "ack_received", "contract_changed", "receipt_scored"].every(type => card.agent_coordination?.coordination_events?.some((item: any) => item.type === type)),
      agentCoordinationMemoryGateEventVisible: memoryGateGapCard.agent_coordination?.coordination_events?.some((item: any) => item.type === "memory_gate_receipt" && item.status === "warn"),
      agentCoordinationReinjectionGateEventVisible: reinjectionGateGapCard.agent_coordination?.coordination_events?.some((item: any) => item.type === "post_compact_reinjection_gate_receipt" && item.status === "warn"),
      acceptanceReviewIncludesAckGate: card.acceptance_review?.checks?.some((item: any) => item.id === "ack_gate" && item.ok),
      agentCoordinationContractInjectAction: card.agent_coordination?.targeted_rework?.some((item: any) => item.id === "contract_inject" && item.target === "collab-web"),
      reportHasFourUserSections: ["完成内容", "涉及范围", "验证结果", "风险与待确认", "下一步"].every(label => report.includes(label)),
      reportHidesProtocol: !/CCM_AGENT_RECEIPT|Trace|session|scratchpad|门禁|派发证据/i.test(report),
      groupReportFormatsObjects: groupReport.includes("frontend/app.js") && !groupReport.includes("[object Object]"),
      acknowledgementHasCleanPunctuation: !acknowledgement.includes("。。"),
      dispatchLaunchSummaryVisible: dispatchLaunchSummary?.schema === "ccm-main-agent-dispatch-launch-summary-v1"
        && dispatchLaunchSummary?.rows?.[0]?.agent === "collab-web"
        && dispatchLaunchSummary?.headline?.includes("1 个执行成员")
        && dispatchLaunchSummary?.rows?.[0]?.task?.includes("结构化结果说明"),
      dispatchLaunchSummaryHidesProtocol: !/CCM_AGENT_RECEIPT|task-notification|receipt-status|raw payload|trace_id|session_id/i.test(JSON.stringify(dispatchLaunchSummary || {})),
      dispatchLaunchSummaryDoneTargetStaysReviewing: completedTargetDispatchLaunchSummary?.rows?.[0]?.status === "reviewing"
        && completedTargetDispatchLaunchSummary?.rows?.[0]?.status_label === "已回传结果，待验收"
        && !JSON.stringify(completedTargetDispatchLaunchSummary || {}).includes("已完成"),
      followupClassification: classifyTaskContinuation("再加一个负责人筛选") === "supplement" && classifyTaskContinuation("目标调整为只改前端") === "revise_goal" && classifyTaskContinuation("这是一个新任务：部署测试环境") === "new_task",
      qualityFollowupContinuationDecision: (() => {
        const decision = buildContinuationUserDecision({
          source: "quality_followup",
          kind: "supplement",
          meta: { reason: "补齐交付证据、验证结果和验收结论" },
        });
        return decision.strategy === "complete_quality_followup"
          && decision.title === "交付总结补齐已接上"
          && decision.route_label === "补齐交付总结"
          && decision.headline.includes("验证结果")
          && decision.next_action.includes("可验收总结")
          && decision.timeline_type === "quality_followup_continuation";
      })(),
      followupDetection: looksLikeTaskContinuation("再加一个状态筛选"),
    }
  );
}
