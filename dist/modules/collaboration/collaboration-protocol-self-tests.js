"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCollaborationProtocolSelfTest = runCollaborationProtocolSelfTest;
const memory_1 = require("./memory");
const agent_notifications_1 = require("./agent-notifications");
const startup_task_recovery_1 = require("./startup-task-recovery");
const test_agent_runner_1 = require("./test-agent-runner");
const collaboration_protocol_1 = require("../../agents/collaboration-protocol");
const collaboration_1 = require("./collaboration");
function runCollaborationProtocolSelfTest() {
    const reworkProtocol = (0, collaboration_1.runCoordinatorReworkProtocolSelfTest)();
    const agentCollaborationProtocol = (0, collaboration_protocol_1.runAgentCollaborationProtocolSelfTest)();
    const startupTaskRecovery = (0, startup_task_recovery_1.runStartupTaskRecoveryDecisionSelfTest)();
    const testAgentRunner = (0, test_agent_runner_1.runTestAgentRunnerSelfTest)();
    const coordinatorVisibleMessageSelfTest = (0, collaboration_1.getCoordinatorVisibleMessageSelfTest)();
    const assignmentGroup = {
        members: [
            { project: "coordinator", role: "coordinator" },
            { project: "backend-service" },
            { project: "web-app" },
        ],
    };
    const structuredMentions = (0, collaboration_1.getCoordinatorActionMentions)({
        content: "我已经形成计划，下面按结构化 assignments 派发。",
        assignments: [
            {
                project: "backend-service",
                task: "主 Agent 工作单：实现退款审核接口 POST /api/refunds/:id/audit，并返回 CCM_AGENT_RECEIPT。",
                reason: "后端负责接口契约",
            },
            {
                project: "web-app",
                task: "主 Agent 工作单：对接退款审核接口并补充页面验证，返回 CCM_AGENT_RECEIPT。",
                reason: "前端负责页面入口",
                dependsOn: "backend-service",
                rework: true,
                attempt: 2,
                continuationOf: "web-app",
                continuationStrategy: "same_worker_scratchpad",
            },
        ],
    }, assignmentGroup, "coordinator");
    const taskDocumentContext = (0, collaboration_1.buildTaskSourceDocumentsContext)({
        business_goal: "实现订单退款审核功能",
        acceptance_criteria: "后端校验权限，前端展示审核结果，主 Agent 输出交付报告。",
        source_documents: "接口：POST /api/refunds/:id/audit\n字段：approved(boolean), reason(string)\n验收：子 Agent 结果说明和已执行验证。",
    });
    const mergedDocumentContext = (0, collaboration_1.mergeCoordinatorDocumentContexts)("", taskDocumentContext);
    const taskDocumentChecks = {
        hasBusinessGoal: taskDocumentContext.includes("业务目标"),
        hasAcceptance: taskDocumentContext.includes("验收标准"),
        hasSourceDocument: taskDocumentContext.includes("/api/refunds/:id/audit"),
        mergeKeepsTaskDocument: String(mergedDocumentContext || "").includes("approved(boolean)"),
    };
    const structuredAssignmentChecks = {
        hasTwoMentions: structuredMentions.length === 2,
        preservesTarget: structuredMentions.some((item) => item.targetName === "backend-service"),
        preservesTask: structuredMentions.some((item) => String(item.message || "").includes("/api/refunds/:id/audit")),
        preservesDependency: structuredMentions.some((item) => item.targetName === "web-app" && item.dependsOn === "backend-service"),
        preservesContinuation: structuredMentions.some((item) => item.targetName === "web-app" && item.rework === true && item.attempt === 2 && item.continuationStrategy === "same_worker_scratchpad"),
    };
    const executionFixActions = (0, collaboration_1.buildAgentExecutionFixActions)({
        error: "API Error: Unable to connect to API (ConnectionRefused)",
        agentType: "claudecode",
    });
    const executionFixChecks = {
        hasCliCheck: executionFixActions.some((item) => item.includes("claude --permission-mode auto -p") || item.includes("claude --permission-mode acceptEdits -p") || item.includes("claude -p")),
        hasApiNetworkHint: executionFixActions.some((item) => item.includes("代理环境变量") || item.includes("API Base URL")),
        hasRetryAction: executionFixActions.some((item) => item.includes("复检执行通道") || item.includes("立即恢复自动任务")),
    };
    const recentFailedProbeHealth = (0, collaboration_1.getAgentProbeHealth)({
        success: false,
        message: "API Error: Unable to connect to API (ConnectionRefused)",
        checked_at: new Date().toISOString(),
        age_ms: 1000,
    });
    const freshOkProbeHealth = (0, collaboration_1.getAgentProbeHealth)({
        success: true,
        message: "Agent CLI 探针通过",
        checked_at: new Date().toISOString(),
        age_ms: 1000,
    });
    const readyWithoutProbe = {
        ready: true,
        mode: "node-child-process",
        message: "Node 可启动子进程",
        probeHealth: { status: "missing", successFresh: false, message: "尚未运行 Agent CLI 探针" },
    };
    const readyWithFreshProbe = {
        ...readyWithoutProbe,
        probeHealth: freshOkProbeHealth,
        probe: { success: true, age_ms: 1000, target: { group_id: "g-dev", project: "backend-service", agent_type: "claudecode" }, capabilities: { write: { pass: true } } },
    };
    const backendProbeKey = (0, collaboration_1.getAgentProbeTargetStatusKey)({ group_id: "g-dev", project: "backend-service", agent_type: "claudecode" });
    const webProbeKey = (0, collaboration_1.getAgentProbeTargetStatusKey)({ group_id: "g-dev", project: "web-app", agent_type: "codex" });
    const targetMatchPartial = (0, collaboration_1.doesProbeTargetMatchRequired)({ group_id: "g-dev", project: "web-app", agent_type: "codex" }, { groupId: "g-dev", project: "web-app" });
    const groupProbeTargets = [
        { group_id: "g-dev", group_name: "Dev", project: "backend-service", agent_type: "claudecode" },
        { group_id: "g-dev", group_name: "Dev", project: "web-app", agent_type: "codex" },
    ];
    const groupProbeOneMissing = (0, collaboration_1.summarizeAgentProbeTargets)(groupProbeTargets, (target) => {
        if (target.project === "backend-service")
            return { success: true, age_ms: 1000, target, capabilities: { write: { pass: true } } };
        return null;
    });
    const groupProbeAllFresh = (0, collaboration_1.summarizeAgentProbeTargets)(groupProbeTargets, (target) => ({
        success: true,
        age_ms: 1000,
        target,
        capabilities: { write: { pass: true } },
    }));
    const explicitProjectDoesNotNeedGroupProbe = (0, collaboration_1.taskNeedsGroupWideAgentProbe)({
        workflow_type: "daily_dev",
        assign_type: "project",
        group_id: "g-dev",
        workflow_meta: { target_member: "backend-service" },
    }) === false;
    const recoveryProbeGroups = (0, collaboration_1.buildAgentRecoveryProbeGroups)([
        {
            id: "t-blocked-backend",
            auto_execute: true,
            status: "pending",
            last_queue_blocked_at: new Date().toISOString(),
            workflow_type: "daily_dev",
            group_id: "g-dev",
            workflow_meta: { target_member: "backend-service", agent_type: "claudecode" },
        },
        {
            id: "t-runtime-web",
            auto_execute: true,
            status: "failed",
            status_detail: "Agent Runner 错误: ConnectionRefused",
            workflow_type: "daily_dev",
            group_id: "g-dev",
            workflow_meta: { target_member: "web-app", agent_type: "codex" },
        },
    ]);
    const backendRecoveryGroup = recoveryProbeGroups.find((group) => group.probe_target?.project === "backend-service");
    const webRecoveryGroup = recoveryProbeGroups.find((group) => group.probe_target?.project === "web-app");
    const targetRecoveryMatch = (0, collaboration_1.taskMatchesAgentProbeTarget)({ workflow_type: "daily_dev", group_id: "g-dev", workflow_meta: { target_member: "web-app" } }, { groupId: "g-dev", project: "web-app" });
    const retryProbeAfterRecentFailure = (0, collaboration_1.enforceAgentProbeExecutionReadiness)({
        childProcess: { ok: true, stdout: "ok" },
        externalRunner: { active: false },
        probeHealth: recentFailedProbeHealth,
    });
    const runnerProbeFailure = (0, collaboration_1.getAgentProbeOutputFailure)("[web-app] Agent Runner 错误: API Error: Unable to connect to API (ConnectionRefused)");
    const freshProbeRecoveryGate = (0, collaboration_1.hasFreshSuccessfulAgentProbe)({ probe: { success: true, age_ms: 1000 } });
    const staleProbeRecoveryGate = (0, collaboration_1.hasFreshSuccessfulAgentProbe)({ probe: { success: true, age_ms: collaboration_1.AGENT_PROBE_SUCCESS_FRESH_MS + 1000 } });
    const dailyDevProbeRequired = (0, collaboration_1.enforceTaskAgentProbeReadiness)({ workflow_type: "daily_dev" }, readyWithoutProbe);
    const dailyDevWatchdogGapGate = (0, collaboration_1.enforceTaskAgentProbeReadiness)({ workflow_type: "daily_dev" }, readyWithoutProbe);
    const dailyDevProbePassed = (0, collaboration_1.enforceTaskAgentProbeReadiness)({ workflow_type: "daily_dev" }, readyWithFreshProbe);
    const dailyDevProbeTargetMismatch = (0, collaboration_1.enforceTaskAgentProbeReadiness)({ workflow_type: "daily_dev", workflow_meta: { target_member: "web-app" } }, readyWithFreshProbe);
    const generalProbeNotRequired = (0, collaboration_1.enforceTaskAgentProbeReadiness)({ workflow_type: "general" }, readyWithoutProbe);
    const probeHealthChecks = {
        recentFailureBlocks: recentFailedProbeHealth.failureRecent === true && recentFailedProbeHealth.status === "failed",
        freshSuccessPasses: freshOkProbeHealth.successFresh === true && freshOkProbeHealth.status === "ok",
        probeCanRetryAfterRecentFailure: retryProbeAfterRecentFailure.ready === true && retryProbeAfterRecentFailure.mode === "node-child-process-probe",
        probeFailureKeepsRunnerError: String(runnerProbeFailure.message || "").includes("ConnectionRefused") && String(runnerProbeFailure.error || "").includes("Agent Runner 错误"),
        freshProbeEnablesImmediateRecovery: freshProbeRecoveryGate === true,
        staleProbeDoesNotEnableImmediateRecovery: staleProbeRecoveryGate === false,
        dailyDevRequiresFreshProbe: dailyDevProbeRequired.ready === false && dailyDevProbeRequired.mode === "agent-cli-probe-required",
        dailyDevWatchdogGapsRequireFreshProbe: dailyDevWatchdogGapGate.ready === false && dailyDevWatchdogGapGate.mode === "agent-cli-probe-required",
        dailyDevFreshProbePasses: dailyDevProbePassed.ready === true,
        dailyDevFreshProbeMustMatchTarget: dailyDevProbeTargetMismatch.ready === false && String(dailyDevProbeTargetMismatch.message || "").includes("目标不匹配"),
        groupProbeRequiresAllMembers: groupProbeOneMissing.allReady === false && groupProbeOneMissing.ready === 1 && groupProbeOneMissing.total === 2,
        groupProbeAllMembersPass: groupProbeAllFresh.allReady === true && groupProbeAllFresh.ready === 2,
        explicitProjectBypassesGroupWideProbe: explicitProjectDoesNotNeedGroupProbe === true,
        targetProbeKeysAreIsolated: !!backendProbeKey && !!webProbeKey && backendProbeKey !== webProbeKey,
        targetProbePartialMatchWorks: targetMatchPartial === true,
        recoveryProbeGroupsAreTargeted: recoveryProbeGroups.length === 2 && !!backendRecoveryGroup && !!webRecoveryGroup,
        recoveryProbePayloadKeepsTarget: webRecoveryGroup?.probe_payload?.group_id === "g-dev" && webRecoveryGroup?.probe_payload?.target_member === "web-app",
        recoveryTargetMatchWorks: targetRecoveryMatch === true,
        generalTaskDoesNotRequireProbe: generalProbeNotRequired.ready === true,
    };
    const notifiedOutput = (0, agent_notifications_1.formatCollectedAgentOutput)("backend-service", "已实现退款审核接口并运行 npm test。", {
        agent: "backend-service",
        status: "done",
        summary: "完成退款审核接口",
        actions: ["实现 POST /api/refunds/:id/audit"],
        filesChanged: ["src/refunds/audit.ts"],
        verification: ["npm test passed"],
        blockers: [],
        needs: [],
    });
    const missingReceiptOutput = (0, agent_notifications_1.formatCollectedAgentOutput)("web-app", "已处理页面入口，但未提交结果说明。", null);
    const notificationFollowUps = (0, collaboration_1.buildEvidenceGateFollowUps)(assignmentGroup, [missingReceiptOutput]);
    const taskNotificationDisplay = (0, agent_notifications_1.runTaskNotificationDisplaySelfTest)();
    const parsedMissingNotification = (0, agent_notifications_1.parseTaskNotificationsFromText)(missingReceiptOutput)[0] || {};
    const taskNotificationChecks = {
        hasXmlEnvelope: notifiedOutput.includes("<task-notification>") && notifiedOutput.includes("</task-notification>"),
        hasTaskId: (0, agent_notifications_1.getCollectedOutputAgent)(notifiedOutput) === "backend-service",
        hasCompletedStatus: (0, agent_notifications_1.extractTaskNotificationTag)(notifiedOutput, "status") === "completed",
        detectsMissingReceipt: notificationFollowUps.some((item) => item.targetName === "web-app" && String(item.reason || "").includes("缺少结构化结果说明")),
        missingReceiptFollowUpHasUserPreview: notificationFollowUps.some((item) => item.targetName === "web-app" && String(item.summary || "").includes("补齐可验收结果说明")),
        missingReceiptSummaryFriendly: String(parsedMissingNotification.summary || "").includes("结构化结果说明"),
        missingReceiptSummaryHidesProtocol: !/CCM_AGENT_RECEIPT|task-notification|receipt-status|Worker completed|trace_id|session_id/i.test(JSON.stringify({ summary: parsedMissingNotification.summary, result: parsedMissingNotification.result })),
        displaySelfTestPasses: taskNotificationDisplay.pass === true,
    };
    const blockedDependencyOutput = (0, agent_notifications_1.formatCollectedAgentOutput)("backend-service", "后端接口字段未确认，无法继续。", {
        agent: "backend-service",
        status: "blocked",
        summary: "接口字段未确认",
        actions: ["检查接口文档"],
        filesChanged: [],
        verification: [],
        blockers: ["approved 字段语义缺失"],
        needs: ["用户或后端确认字段契约"],
    });
    const doneDependencyState = (0, collaboration_1.getAgentDependencyStateFromOutputs)("backend-service", [notifiedOutput]);
    const blockedDependencyState = (0, collaboration_1.getAgentDependencyStateFromOutputs)("backend-service", [blockedDependencyOutput]);
    const recoveredDependencyState = (0, collaboration_1.getAgentDependencyStateFromOutputs)("backend-service", [blockedDependencyOutput, notifiedOutput]);
    const dependencyGateChecks = {
        doneDependencyPasses: doneDependencyState.ok === true,
        blockedDependencyStopsDownstream: blockedDependencyState.ok === false && blockedDependencyState.status === "blocked",
        blockedDependencyExplainsReason: String(blockedDependencyState.reason || "").includes("接口字段未确认"),
        latestRecoveredReceiptUnblocksDownstream: recoveredDependencyState.ok === true && recoveredDependencyState.status === "done",
    };
    const notificationDeliverySummary = (0, collaboration_1.buildDeliverySummary)({
        title: "通知摘要自测",
        workflow_type: "daily_dev",
        requires_verification: false,
    }, {
        report: notifiedOutput,
        review: { status: "complete", content: "主 Agent 已复盘通知" },
    }, "waiting");
    const notificationDeliveryChecks = {
        summaryHasWorkerNotification: notificationDeliverySummary.worker_notification_count === 1,
        summaryKeepsNotificationTaskId: notificationDeliverySummary.worker_notifications?.[0]?.task_id === "backend-service",
        summaryUsesNotificationAgent: notificationDeliverySummary.agents?.includes("backend-service"),
        userReportHidesNotificationProtocol: !String(notificationDeliverySummary.user_report || "").includes("Worker 通知"),
    };
    const failedNotificationSummary = (0, collaboration_1.buildDeliverySummary)({
        id: "task-gap",
        title: "通知缺口续跑自测",
        workflow_type: "daily_dev",
        requires_verification: false,
    }, {
        report: (0, agent_notifications_1.formatCollectedAgentOutput)("web-app", "页面入口处理失败，缺少接口字段。", {
            agent: "web-app",
            status: "blocked",
            summary: "缺少退款审核接口字段",
            actions: ["检查订单详情页入口"],
            filesChanged: [],
            verification: [],
            blockers: ["approved 字段含义未确认"],
            needs: ["后端确认字段契约"],
        }),
        review: { status: "needs_followup", content: "主 Agent 需要 web-app 继续返工" },
    }, "waiting");
    const gapTask = {
        id: "task-gap",
        title: "退款审核入口",
        workflow_type: "daily_dev",
        status: "in_progress",
        delivery_summary: failedNotificationSummary,
    };
    const gapDraft = (0, collaboration_1.buildTaskGapContinuationDraft)(gapTask);
    const missingCoordinationTask = {
        id: "task-missing-coordination",
        title: "缺协作证据续跑自测",
        workflow_type: "daily_dev",
        status: "in_progress",
        delivery_summary: {
            status: "waiting",
            detail: "业务开发任务缺少主 Agent 协调计划证据，不能判定完成",
            coordination_plan_count: 0,
            assignment_count: 0,
            worker_notification_count: 0,
            receipt_statuses: [{ agent: "web-app", status: "done", summary: "已完成页面改动" }],
            has_final_review: true,
            actual_file_change_count: 1,
            verification_executed: ["npm test"],
        },
    };
    const missingCoordinationDraft = (0, collaboration_1.buildTaskGapContinuationDraft)(missingCoordinationTask);
    const gapFingerprint = (0, collaboration_1.getTaskGapFingerprint)(gapTask);
    const attemptedGapTask = {
        ...gapTask,
        collaboration_state: { gap: { fingerprint: gapFingerprint, items: (0, collaboration_1.getTaskGapItems)(gapTask), auto_attempts: 1 } },
    };
    const changedGapTask = {
        ...attemptedGapTask,
        delivery_summary: {
            ...failedNotificationSummary,
            blockers: [...(failedNotificationSummary.blockers || []), "新增：支付权限规则需要用户确认"],
        },
    };
    const exhaustedGapState = (0, collaboration_1.reconcileTaskCollaborationState)(attemptedGapTask, attemptedGapTask.collaboration_state);
    const userTaskCard = (0, collaboration_1.buildTaskCardView)({ ...attemptedGapTask, collaboration_state: exhaustedGapState }, [], []);
    const continuationGapChecks = {
        workerNotificationTriggersGap: (0, collaboration_1.hasDailyDevContinuationGaps)(gapTask),
        draftIncludesWorkerNotification: gapDraft.includes("上一轮子 Agent 执行结果") && gapDraft.includes("web-app"),
        draftIncludesSameWorkerStrategy: gapDraft.includes("same_worker_scratchpad") && gapDraft.includes("同一子 Agent 续跑目标"),
        missingCoordinationTriggersGap: (0, collaboration_1.hasDailyDevContinuationGaps)(missingCoordinationTask),
        draftIncludesCoordinationEvidenceGap: missingCoordinationDraft.includes("需要补齐的主 Agent 协作证据")
            && missingCoordinationDraft.includes("协调计划")
            && missingCoordinationDraft.includes("派发证据")
            && missingCoordinationDraft.includes("子 Agent 执行结果"),
        firstGapCanAutoContinue: (0, collaboration_1.canAutoContinueTaskGaps)(gapTask) === true,
        unchangedGapDoesNotLoop: (0, collaboration_1.canAutoContinueTaskGaps)(attemptedGapTask) === false,
        changedGapAllowsNewTargetedAttempt: (0, collaboration_1.getTaskGapFingerprint)(changedGapTask) !== gapFingerprint && (0, collaboration_1.canAutoContinueTaskGaps)(changedGapTask) === true,
        exhaustedGapNeedsUserDecision: exhaustedGapState.phase === "needs_user" && exhaustedGapState.needs_user === true,
        automaticContinuationIsInternal: (0, collaboration_1.isAutomaticGapContinuationSource)("watchdog_gap_rework") && !(0, collaboration_1.isAutomaticGapContinuationSource)("user"),
        userTaskCardExplainsNextAction: userTaskCard.phase === "needs_user" && userTaskCard.blockers.length > 0 && /补充|确认/.test(String(userTaskCard.next_action)),
        userTaskCardHidesProtocolTerms: !JSON.stringify({ completed: userTaskCard.completed, blockers: userTaskCard.blockers, next_action: userTaskCard.next_action }).includes("CCM_AGENT_RECEIPT"),
    };
    const scratchpadMemory = (0, memory_1.appendWorkerLedger)((0, memory_1.createEmptyGroupMemory)("selftest"), {
        taskId: "task-refund",
        project: "backend-service",
        status: "completed",
        receiptStatus: "done",
        summary: "后端确认 POST /api/refunds/:id/audit 契约",
        verification: ["npm test passed"],
    });
    const scratchpadContext = (0, memory_1.buildGroupMemoryContext)(scratchpadMemory);
    const scratchpadChecks = {
        storesWorkerLedger: Array.isArray(scratchpadMemory.workerLedger) && scratchpadMemory.workerLedger.length === 1,
        contextIncludesScratchpad: scratchpadContext.includes("Worker scratchpad"),
        contextIncludesWorkerSummary: scratchpadContext.includes("/api/refunds/:id/audit"),
    };
    const qaRequiredTask = { workflow_type: "daily_dev", assign_type: "group", description: "前端必须通过 ask_agent 向后端询问接口后续跑" };
    const qaGateCheck = (0, collaboration_1.buildAcceptanceGate)(qaRequiredTask, null, {
        coordination_plan_count: 1,
        assignment_count: 2,
        receipt_statuses: [{ status: "done" }],
        has_final_review: true,
        actual_file_change_count: 1,
        verification_executed: ["npm test"],
        verification_required_gate_passed: true,
        verification_source_gate_passed: true,
        external_runner_verification_count: 1,
        blockers: [],
        needs: [],
        agent_qa_count: 0,
        agent_qa_accepted_count: 0,
        agent_qa_resumed_count: 0,
        agent_qa_gate_passed: false,
        project_policy_gate_passed: true,
    }, "waiting");
    const agentQaRequirementChecks = {
        infersExplicitAskAgentRequirement: (0, collaboration_1.taskRequiresAgentQa)(qaRequiredTask),
        explicitFalseDisablesRequirement: (0, collaboration_1.taskRequiresAgentQa)({ ...qaRequiredTask, requires_agent_qa: false }) === false,
        missingQaBlocksAcceptance: qaGateCheck.checks.find((item) => item.id === "agent_qa")?.ok === false && qaGateCheck.pass === false,
    };
    const defaultCodeRequirements = (0, collaboration_1.normalizeGlobalMissionTargetRequirements)({}, {});
    const explicitNonCodeRequirements = (0, collaboration_1.normalizeGlobalMissionTargetRequirements)({
        requires_code_changes: false,
        requires_verification: false,
        requires_independent_review: false,
    }, {});
    const targetOverrideRequirements = (0, collaboration_1.normalizeGlobalMissionTargetRequirements)({
        requires_code_changes: false,
        requires_independent_review: false,
    }, {
        requiresCodeChanges: true,
        requiresIndependentReview: true,
    });
    const globalMissionRequirementChecks = {
        codeTaskDefaultsToIndependentReview: defaultCodeRequirements.requires_code_changes === true
            && defaultCodeRequirements.requires_verification === true
            && defaultCodeRequirements.requires_independent_review === true,
        explicitNonCodeTaskCanDisableReview: explicitNonCodeRequirements.requires_code_changes === false
            && explicitNonCodeRequirements.requires_verification === false
            && explicitNonCodeRequirements.requires_independent_review === false,
        targetRequirementOverridesMissionDefault: targetOverrideRequirements.requires_code_changes === true
            && targetOverrideRequirements.requires_independent_review === true,
    };
    return {
        pass: reworkProtocol.pass
            && agentCollaborationProtocol.pass
            && startupTaskRecovery.pass
            && testAgentRunner.pass
            && Object.values(taskDocumentChecks).every(Boolean)
            && Object.values(structuredAssignmentChecks).every(Boolean)
            && Object.values(executionFixChecks).every(Boolean)
            && Object.values(probeHealthChecks).every(Boolean)
            && Object.values(taskNotificationChecks).every(Boolean)
            && Object.values(dependencyGateChecks).every(Boolean)
            && Object.values(notificationDeliveryChecks).every(Boolean)
            && Object.values(continuationGapChecks).every(Boolean)
            && Object.values(scratchpadChecks).every(Boolean)
            && coordinatorVisibleMessageSelfTest.pass
            && Object.values(agentQaRequirementChecks).every(Boolean)
            && Object.values(globalMissionRequirementChecks).every(Boolean),
        reworkProtocol,
        agentCollaborationProtocol,
        startupTaskRecovery,
        testAgentRunner,
        taskDocumentContextPreview: taskDocumentContext.slice(0, 600),
        taskDocumentChecks,
        structuredAssignmentChecks,
        executionFixChecks,
        executionFixActions,
        probeHealthChecks,
        taskNotificationChecks,
        taskNotificationDisplay,
        dependencyGateChecks,
        notificationDeliveryChecks,
        continuationGapChecks,
        scratchpadChecks,
        coordinatorVisibleMessageSelfTest,
        agentQaRequirementChecks,
        globalMissionRequirementChecks,
    };
}
//# sourceMappingURL=collaboration-protocol-self-tests.js.map