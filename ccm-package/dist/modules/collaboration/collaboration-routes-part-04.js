"use strict";
// Behavior-freeze split from collaboration-routes.ts (part 4/4).
// Extracted functional module. The original entry remains a compatibility facade.
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCollaborationApi = handleCollaborationApi;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const memory_1 = require("./memory");
const feishu_routes_1 = require("./feishu-routes");
const agent_qa_routes_1 = require("./agent-qa-routes");
const memory_context_consumption_receipt_1 = require("../../integrations/memory-context-consumption-receipt");
const group_coordination_store_1 = require("./group-coordination-store");
const group_live_routes_1 = require("./group-live-routes");
const agent_qa_service_1 = require("./agent-qa-service");
const agent_receipts_1 = require("./agent-receipts");
const logs_1 = require("./logs");
const group_routes_1 = require("./group-routes");
const orchestrator_routes_1 = require("./orchestrator-routes");
const task_governance_routes_1 = require("./task-governance-routes");
const storage_1 = require("./storage");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const task_agent_invocation_lineage_1 = require("../../tasks/task-agent-invocation-lineage");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const memory_2 = require("../../projects/memory");
const collaboration_protocol_1 = require("../../agents/collaboration-protocol");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const worker_handoff_1 = require("../../agents/worker-handoff");
const collaboration_1 = require("./collaboration");
const collaboration_routes_part_01_1 = require("./collaboration-routes-part-01");
const collaboration_routes_part_01_2 = require("./collaboration-routes-part-01");
const collaboration_routes_part_02_1 = require("./collaboration-routes-part-02");
const collaboration_routes_part_03_1 = require("./collaboration-routes-part-03");
function handleCollaborationApi(pathname, req, res, parsed, ctx) {
    (0, collaboration_routes_part_01_1.configureCollaborationRouteExecutors)(ctx);
    if ((0, collaboration_routes_part_01_2.handleCollaborationApiReplayAndExecutionRoutes)(pathname, req, res, parsed, ctx))
        return true;
    if ((0, collaboration_routes_part_02_1.handleCollaborationApiIntakeRoutes)(pathname, req, res, parsed, ctx))
        return true;
    if ((0, collaboration_routes_part_03_1.handleCollaborationApiTaskLifecycleRoutes)(pathname, req, res, parsed, ctx))
        return true;
    if ((0, task_governance_routes_1.handleTaskGovernanceRoutes)(req, res, parsed, ctx, {
        compactFormText: collaboration_1.compactFormText,
        uniqueStrings: collaboration_1.uniqueStrings,
        archiveTask: collaboration_1.archiveTask,
        restoreArchivedTask: collaboration_1.restoreArchivedTask,
        purgeArchivedTask: collaboration_1.purgeArchivedTask,
        removeTaskFromQueues: collaboration_1.removeTaskFromQueues,
        updateTask: collaboration_1.updateTask,
        enqueueTask: collaboration_1.enqueueTask,
        retryTask: collaboration_1.retryTask,
        retryRuntimeFailedTasks: collaboration_1.retryRuntimeFailedTasks,
        getQueueStatus: collaboration_1.getQueueStatus,
        getTaskWatchdogStatus: collaboration_1.getTaskWatchdogStatus,
        runTaskWatchdog: collaboration_1.runTaskWatchdog,
        cleanupRuntimeDebt: collaboration_1.cleanupRuntimeDebt,
        resumeTaskQueues: collaboration_1.resumeTaskQueues,
        clearTaskQueues: () => collaboration_1.taskQueues.clear(),
        taskWatchdogStaleMs: collaboration_1.TASK_WATCHDOG_STALE_MS,
    }))
        return true;
    // === 群聊主 Agent / Orchestrator API ===
    if ((0, orchestrator_routes_1.handleOrchestratorRoutes)(req, res, parsed, ctx, {
        buildCoordinatorSharedFilesContext: collaboration_1.buildCoordinatorSharedFilesContext,
        runGroupOrchestrator: group_orchestrator_1.runGroupOrchestrator,
        buildDailyDevAgentDiagnostics: collaboration_1.buildDailyDevAgentDiagnostics,
        replayAgentTrace: runtime_kernel_1.replayAgentTrace,
        buildTraceReplaySuite: runtime_kernel_1.buildTraceReplaySuite,
        runAgentRuntimeKernelSelfTest: runtime_kernel_1.runAgentRuntimeKernelSelfTest,
        runWorkerHandoffSelfTest: worker_handoff_1.runWorkerHandoffSelfTest,
        runGroupMainAgentActionRegistrySelfTest: collaboration_1.runGroupMainAgentActionRegistrySelfTest,
        runGroupMainAgentToolLoopSelfTest: collaboration_1.runGroupMainAgentToolLoopSelfTest,
        getGroupMainAgentActionRegistry: collaboration_1.getGroupMainAgentActionRegistry,
        applyRuntimeMonitorControl: collaboration_1.applyRuntimeMonitorControl,
        buildDailyDevWorkflowRehearsal: collaboration_1.buildDailyDevWorkflowRehearsal,
        createDailyDevSmokeTask: collaboration_1.createDailyDevSmokeTask,
        getDailyDevSmokeStatus: collaboration_1.getDailyDevSmokeStatus,
        runAgentCliProbeBatch: collaboration_1.runAgentCliProbeBatch,
        runAgentCliProbe: collaboration_1.runAgentCliProbe,
        switchTaskExecutor: collaboration_1.switchTaskExecutor,
        runRuntimeFallbackProbe: collaboration_1.runRuntimeFallbackProbe,
        runAgentRecoveryMonitorOnce: collaboration_1.runAgentRecoveryMonitorOnce,
    }))
        return true;
    if ((0, group_routes_1.handleBasicGroupRoutes)(req, res, parsed, ctx, {
        getGroupMemoryFile: memory_1.getGroupMemoryFile,
        loadGroupMemory: memory_1.loadGroupMemory,
        saveGroupMemory: memory_1.saveGroupMemory,
        buildGroupMemoryContext: memory_1.buildGroupMemoryContext,
        buildAgentMemoryPacket: memory_1.buildAgentMemoryPacket,
        buildInlineTaskRuntime: collaboration_1.buildInlineTaskRuntime,
        getAgentQaItemsForGroup: agent_qa_service_1.getAgentQaItemsForGroup,
        deleteGroupSessionMemoryArtifacts: memory_1.deleteGroupSessionMemoryArtifacts,
    }))
        return true;
    // === Agent 间问答 API ===
    if ((0, agent_qa_routes_1.handleAgentQaRoutes)(req, res, parsed, ctx, {
        getAgentQaItemsForGroup: agent_qa_service_1.getAgentQaItemsForGroup,
        runAgentCollaborationProtocolSelfTest: collaboration_protocol_1.runAgentCollaborationProtocolSelfTest,
        setAgentQaArbitration: agent_qa_service_1.setAgentQaArbitration,
        resumeAgentQaFromStoredContinuation: collaboration_1.resumeAgentQaFromStoredContinuation,
        setAgentQaManualTakeover: agent_qa_service_1.setAgentQaManualTakeover,
        retryAgentQaItem: collaboration_1.retryAgentQaItem,
        listGroupCoordinationRequests: group_coordination_store_1.listGroupCoordinationRequests,
    }))
        return true;
    if ((0, group_live_routes_1.handleGroupLiveRoutes)(req, res, parsed, ctx, {
        writeSse: collaboration_1.writeSse,
        ensureTraceId: reliability_ledger_1.ensureTraceId,
        classifyGroupProjectTaskIntentWithAgent: collaboration_1.classifyGroupProjectTaskIntentWithAgent,
        shouldCreatePersistentGroupTask: collaboration_1.shouldCreatePersistentGroupTask,
        shouldUseProjectAnalysisMode: collaboration_1.shouldUseProjectAnalysisMode,
        classifyTaskContinuation: collaboration_1.classifyTaskContinuation,
        looksLikeTaskContinuation: collaboration_1.looksLikeTaskContinuation,
        continueTaskWithMessage: collaboration_1.continueTaskWithMessage,
        appendMainAgentDecisionTrace: collaboration_1.appendMainAgentDecisionTrace,
        applyMainAgentDecisionPetState: collaboration_1.applyMainAgentDecisionPetState,
        validateDailyDevGroupReady: collaboration_1.validateDailyDevGroupReady,
        compactMemoryText: memory_1.compactMemoryText,
        buildGroupPlanModePreflight: collaboration_1.buildGroupPlanModePreflight,
        createTask: collaboration_1.createTask,
        updateTask: collaboration_1.updateTask,
        appendTaskTimelineEvent: logs_1.appendTaskTimelineEvent,
        buildWorkflowMeta: collaboration_1.buildWorkflowMeta,
        buildInlineTaskRuntime: collaboration_1.buildInlineTaskRuntime,
        updateGroupMemory: memory_1.updateGroupMemory,
        enqueueTask: collaboration_1.enqueueTask,
        buildCoordinatorSharedFilesContext: collaboration_1.buildCoordinatorSharedFilesContext,
        buildGroupProjectAnalysisContext: collaboration_1.buildGroupProjectAnalysisContext,
        normalizePlanAssignments: collaboration_1.normalizePlanAssignments,
        getInitialWorkflowMeta: collaboration_1.getInitialWorkflowMeta,
        getCoordinatorActionMentions: collaboration_1.getCoordinatorActionMentions,
        processCrossAgents: collaboration_1.processCrossAgents,
        runCoordinatorReviewLoop: collaboration_1.runCoordinatorReviewLoop,
        buildGroupContextPacket: memory_1.buildGroupContextPacket,
        buildAgentToolContext: collaboration_1.buildAgentToolContext,
        prepareAgentRuntimeTools: collaboration_1.prepareAgentRuntimeTools,
        getProjectExtraConfig: collaboration_1.getProjectExtraConfig,
        buildAgentMemoryContextBundle: memory_1.buildAgentMemoryContextBundle,
        buildAgentMemoryContextBundleWithManifestSelection: memory_1.buildAgentMemoryContextBundleWithManifestSelection,
        buildAgentMemoryPacket: memory_1.buildAgentMemoryPacket,
        buildChildAgentDevelopmentContract: collaboration_1.buildChildAgentDevelopmentContract,
        buildProjectVerificationHints: collaboration_1.buildProjectVerificationHints,
        buildAgentQaProtocolInstructions: collaboration_1.buildAgentQaProtocolInstructions,
        getAgentQaItemsForGroup: agent_qa_service_1.getAgentQaItemsForGroup,
        handleAgentQaRequests: collaboration_1.handleAgentQaRequests,
        runtimeToolSnapshotFromAudit: collaboration_1.runtimeToolSnapshotFromAudit,
        extractActionableMentions: collaboration_1.extractActionableMentions,
        extractAgentReceipt: agent_receipts_1.extractAgentReceipt,
    }))
        return true;
    if (pathname === "/api/tasks/auto-assign" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { task_id, group_id } = JSON.parse(body);
                const tasks = (0, db_1.loadTasks)();
                const task = tasks.find(t => t.id === task_id);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const configs = (0, db_1.getConfigs)();
                const config = configs.find(c => c.name === task.target_project);
                if (!config)
                    return (0, utils_1.sendJson)(res, { error: "项目配置不存在" }, 400);
                const info = (0, db_1.getConfigInfo)(config.path);
                const workDir = info[0]?.workDir;
                const agentType = info[0]?.agent || "claudecode";
                (0, collaboration_1.updateTask)(task_id, { status: "in_progress" });
                const autoAssignGroupId = String(group_id || task.group_id || "");
                const group = autoAssignGroupId ? (0, storage_1.loadGroups)().find(g => g.id === autoAssignGroupId) : null;
                const toolContext = (0, collaboration_1.buildAgentToolContext)(ctx, group, task.target_project, `${task.title || ""}\n${task.description || ""}\n${task.acceptance_criteria || ""}`);
                let runtimeToolContext = (0, collaboration_1.prepareAgentRuntimeTools)(autoAssignGroupId, task.target_project, workDir, agentType, toolContext.allowedTools, null, { taskId: task.id, task, toolAudit: toolContext.toolAudit, authorizationReadiness: toolContext.authorizationReadiness });
                if (runtimeToolContext.dispatchBlocked) {
                    const blockedReceipt = (0, collaboration_1.runtimeToolDispatchBlockedReceipt)(task.target_project, runtimeToolContext);
                    (0, collaboration_1.updateTask)(task_id, { status: "blocked", status_detail: blockedReceipt.summary });
                    (0, logs_1.addTaskLog)(task_id, "warning", blockedReceipt.summary);
                    (0, logs_1.appendTaskTimelineEvent)(task_id, { type: "runtime_tool_dispatch_blocked", title: `${task.target_project} 工具授权派发被阻断`, detail: blockedReceipt.summary, status: "warn", phase: "dispatching", agent: task.target_project, data: { runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate } });
                    return (0, utils_1.sendJson)(res, { success: false, error: blockedReceipt.summary, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate }, 409);
                }
                const directTaskText = (0, collaboration_1.buildChildAgentTaskText)(`${task.title}\n${task.description || ""}`, task);
                let autoAssignTaskSession = (0, agent_sessions_1.openTaskAgentSession)({
                    scopeId: task.id,
                    taskId: task.id,
                    groupId: autoAssignGroupId,
                    project: task.target_project,
                    agentType,
                });
                const autoAssignMemoryDeliveryAttemptSequence = autoAssignTaskSession ? autoAssignTaskSession.turnCount + 1 : 0;
                const autoAssignGroupSessionId = String(task.group_session_id || task.groupSessionId || "");
                let autoAssignInvocationEdge = autoAssignGroupId && autoAssignTaskSession && autoAssignGroupSessionId.startsWith("gcs_") ? (0, task_agent_invocation_lineage_1.prepareTaskAgentInvocationEdge)({
                    groupId: autoAssignGroupId,
                    groupSessionId: autoAssignGroupSessionId,
                    taskId: task.id,
                    targetProject: task.target_project,
                    taskAgentSessionId: autoAssignTaskSession.id,
                    nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
                    executionId: task.id,
                    attemptSequence: autoAssignMemoryDeliveryAttemptSequence,
                    providerAttempt: 1,
                    invocationKind: autoAssignMemoryDeliveryAttemptSequence > 1 ? "resume" : "spawn",
                    branchKind: "main",
                }) : null;
                let autoAssignGroupMemoryContext = autoAssignGroupId
                    ? await (0, memory_1.buildAgentMemoryContextBundleWithManifestSelection)(autoAssignGroupId, task.target_project, directTaskText, {
                        taskId: task.id,
                        traceId: task.trace_id || "",
                        agentType,
                        taskAgentSessionId: autoAssignTaskSession?.id || "",
                        nativeSessionId: autoAssignTaskSession?.nativeSessionId || "",
                        taskAgentSessionTurn: autoAssignMemoryDeliveryAttemptSequence,
                        modelContextWindow: autoAssignTaskSession?.modelContextWindow || 0,
                        groupSessionId: task.group_session_id || task.groupSessionId || "",
                        requireExactGroupSession: true,
                        task,
                        ...(0, collaboration_1.taskAgentInvocationMemoryOptions)(autoAssignInvocationEdge),
                    })
                    : null;
                const autoAssignCoordinatorProject = group ? String((0, group_orchestrator_1.getCoordinatorMember)(group)?.project || "") : "";
                const autoAssignMemoryConsumptionChallenge = autoAssignGroupMemoryContext
                    && autoAssignTaskSession
                    && task.target_project !== autoAssignCoordinatorProject
                    ? (0, memory_context_consumption_receipt_1.createMemoryContextConsumptionChallenge)({
                        groupId: autoAssignGroupId,
                        groupSessionId: autoAssignGroupSessionId,
                        taskId: task.id,
                        executionId: task.id,
                        project: task.target_project,
                        taskAgentSessionId: autoAssignTaskSession.id,
                        attempt: autoAssignMemoryDeliveryAttemptSequence,
                    })
                    : null;
                if (autoAssignMemoryConsumptionChallenge) {
                    autoAssignGroupMemoryContext = (0, memory_context_consumption_receipt_1.attachMemoryContextConsumptionChallenge)(autoAssignGroupMemoryContext, autoAssignMemoryConsumptionChallenge);
                    runtimeToolContext = (0, collaboration_1.prepareAgentRuntimeTools)(autoAssignGroupId, task.target_project, workDir, agentType, toolContext.allowedTools, null, {
                        taskId: task.id,
                        task,
                        toolAudit: toolContext.toolAudit,
                        authorizationReadiness: toolContext.authorizationReadiness,
                        groupSessionId: autoAssignGroupSessionId,
                        taskAgentSessionId: autoAssignTaskSession.id,
                        nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
                        memoryReceiptChallenge: autoAssignMemoryConsumptionChallenge,
                        memoryReceiptFile: (0, memory_context_consumption_receipt_1.memoryContextConsumptionReceiptFile)(autoAssignMemoryConsumptionChallenge.challenge_id),
                    });
                    (0, collaboration_1.assertRuntimeToolDispatchReady)(task.target_project, runtimeToolContext);
                }
                const autoAssignContinuation = (0, collaboration_1.buildWorkerContinuationHandoff)(task, task.target_project);
                const autoAssignHandoff = (0, collaboration_1.buildChildAgentWorkerHandoff)(task.target_project, directTaskText, {
                    source: task.global_mission_id ? "全局主 Agent 子任务自动派发" : "自动派发",
                    reason: task.mission_target?.reason || "",
                    acceptance: task.acceptance_criteria || "",
                    requires_code_changes: task.requires_code_changes,
                    verification_hints: (0, collaboration_1.buildProjectVerificationHints)(task.target_project, workDir),
                    work_dir: workDir,
                    agent_type: agentType,
                    model: autoAssignTaskSession?.modelId || "",
                    task_id: task.id,
                    task_agent_session_id: autoAssignTaskSession?.id || "",
                    trace_id: task.trace_id || "",
                    task,
                    group,
                    worker_context_packet: task.mission_handoff?.worker_context_packet || null,
                    dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
                        ? task.mission_handoff.global_mission.depends_on.map((ref) => ({ project: ref, reason: "全局任务前置依赖" }))
                        : [],
                    analysis: {
                        constraints: Array.isArray(task.mission_handoff?.done_criteria) ? task.mission_handoff.done_criteria : [],
                    },
                    memory: autoAssignGroupMemoryContext,
                    continuation: autoAssignContinuation,
                });
                const autoAssignPendingCapacityGate = autoAssignTaskSession?.capacityDowngradeGate || null;
                const autoAssignCapacityRevalidationPreparation = autoAssignTaskSession
                    ? (0, agent_sessions_1.prepareTaskAgentSessionCapacityRevalidation)(autoAssignTaskSession.id, autoAssignHandoff.worker_context_packet)
                    : null;
                if (autoAssignTaskSession?.capacityRevalidationRequired === true && autoAssignCapacityRevalidationPreparation?.prepared !== true) {
                    throw new Error(`模型容量下降后的上下文重建未通过：${autoAssignCapacityRevalidationPreparation?.reason || "packet_capacity_not_revalidated"}`);
                }
                if (autoAssignCapacityRevalidationPreparation?.session)
                    autoAssignTaskSession = autoAssignCapacityRevalidationPreparation.session;
                let autoAssignCapacityRevalidationCommitted = autoAssignCapacityRevalidationPreparation?.required !== true;
                (0, logs_1.addTaskLog)(task.id, "info", `${task.target_project} 自动派发工作单已补齐：目标、范围、验收、ACK 和回执要求已打包`);
                (0, logs_1.appendTaskTimelineEvent)(task.id, {
                    type: "worker_handoff_ready",
                    title: `${task.target_project} 工作单已补齐`,
                    detail: "自动派发已补齐目标、范围、边界、验收、ACK 和回执要求",
                    status: "ok",
                    phase: "dispatching",
                    agent: task.target_project,
                    data: { worker_handoff: (0, worker_handoff_1.summarizeWorkerHandoffForUser)(autoAssignHandoff), worker_context_packet: autoAssignHandoff.worker_context_packet },
                });
                (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                    scope: autoAssignGroupId ? "group" : "worker",
                    traceId: task.trace_id || "",
                    taskId: task.id,
                    groupId: autoAssignGroupId,
                    agent: "auto-assign",
                    action: "dispatch_worker",
                    phase: "handoff",
                    risk: "agent",
                    target: task.target_project,
                    status: "planned",
                    message: `${task.target_project} 自动派发自包含工作单已生成`,
                    data: {
                        worker_handoff: (0, worker_handoff_1.summarizeWorkerHandoffForUser)(autoAssignHandoff),
                        worker_context_packet: autoAssignHandoff.worker_context_packet,
                        source: "auto-assign",
                    },
                });
                const developmentContract = (0, collaboration_1.buildChildAgentDevelopmentContract)(task.target_project, directTaskText, {
                    source: task.global_mission_id ? "全局主 Agent 子任务自动派发" : "自动派发",
                    reason: task.mission_target?.reason || "",
                    acceptance: task.acceptance_criteria || "",
                    requires_code_changes: task.requires_code_changes,
                    verification_hints: (0, collaboration_1.buildProjectVerificationHints)(task.target_project, workDir),
                    work_dir: workDir,
                    agent_type: agentType,
                    task_id: task.id,
                    trace_id: task.trace_id || "",
                    task,
                    group,
                    worker_context_packet: task.mission_handoff?.worker_context_packet || null,
                    dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
                        ? task.mission_handoff.global_mission.depends_on.map((ref) => ({ project: ref, reason: "全局任务前置依赖" }))
                        : [],
                    memory: autoAssignGroupMemoryContext,
                    continuation: autoAssignContinuation,
                    handoff: autoAssignHandoff,
                });
                const executePrompt = `${developmentContract}\n\n📋 执行任务：${task.title}\n${directTaskText}\n\n请直接完成开发工作。完成后必须追加 CCM_AGENT_RECEIPT 结构化回执。`;
                const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
                let autoAssignNativeSessionId = "";
                let autoAssignNativeContinuationEvidence = null;
                let autoAssignNativeModelCapabilityReceipt = null;
                let autoAssignModelCapabilityRecord = null;
                let autoAssignProviderMemoryChannelEvidence = null;
                let autoAssignMemoryContextConsumptionReceipt = null;
                let autoAssignMemoryContextConsumptionRecovery = null;
                let autoAssignProviderUsage = null;
                let autoAssignSucceeded = true;
                let autoAssignError = "";
                let autoAssignRunnerRequestId = "";
                let autoAssignRunnerStarted = false;
                const autoAssignRenderedPrompt = `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${executePrompt}`;
                let autoAssignMemoryContextSnapshot = null;
                if (autoAssignTaskSession) {
                    const bound = (0, agent_sessions_1.bindTaskAgentMemoryContextSnapshot)(autoAssignTaskSession.id, {
                        taskId: task.id,
                        groupId: autoAssignGroupId,
                        project: task.target_project,
                        agentType,
                        nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
                        turn: autoAssignMemoryDeliveryAttemptSequence,
                        executionId: task.id,
                        traceId: task.trace_id || "",
                        workerContextPacket: autoAssignHandoff.worker_context_packet,
                        workerHandoff: autoAssignHandoff,
                        memoryContext: autoAssignGroupMemoryContext,
                        renderedHandoff: developmentContract,
                        renderedPrompt: autoAssignRenderedPrompt,
                        renderedMemoryContext: String(autoAssignGroupMemoryContext?.rendered_text || ""),
                        requireMemoryPromptInjectionProof: true,
                        requireTrustedMemoryPromptEnvelope: true,
                        requireProviderMemoryChannelAcknowledgement: true,
                        requireMemoryContextConsumptionReceipt: !!autoAssignMemoryConsumptionChallenge,
                        memoryContextConsumptionChallenge: autoAssignMemoryConsumptionChallenge,
                        runtimeToolSnapshot: (0, collaboration_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                        invocationLineage: autoAssignInvocationEdge,
                    });
                    autoAssignMemoryContextSnapshot = bound?.snapshot || null;
                }
                const autoAssignTypedMemoryDispatchAdmission = (0, memory_1.admitChildTypedMemoryDelivery)(autoAssignGroupMemoryContext, {
                    workerContextPacket: autoAssignHandoff.worker_context_packet,
                    renderedPrompt: autoAssignRenderedPrompt,
                    attemptSequence: autoAssignMemoryDeliveryAttemptSequence,
                });
                if (autoAssignTypedMemoryDispatchAdmission.admitted !== true) {
                    throw new Error(`类型化记忆 dispatch-time consume 门禁未通过：${autoAssignTypedMemoryDispatchAdmission.reason || "unknown"}`);
                }
                const autoAssignTypedMemoryDispatchStartedAt = new Date().toISOString();
                const autoAssignTypedMemoryDispatchWal = (0, memory_1.createChildTypedMemoryDispatchWal)(autoAssignTypedMemoryDispatchAdmission, {
                    memoryBundle: autoAssignGroupMemoryContext,
                    workerContextPacket: autoAssignHandoff.worker_context_packet,
                    renderedPrompt: autoAssignRenderedPrompt,
                    snapshotRenderedPrompt: autoAssignRenderedPrompt,
                    executionId: task.id,
                    capacityRevalidationProof: autoAssignCapacityRevalidationPreparation?.proof || null,
                });
                let autoAssignTypedMemoryDispatchWalRecord = (0, memory_1.markChildTypedMemoryDispatchStarted)(autoAssignTypedMemoryDispatchWal, {
                    dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
                    transport: agentType,
                });
                if (!autoAssignCapacityRevalidationCommitted && autoAssignTaskSession && autoAssignCapacityRevalidationPreparation?.proof && autoAssignTypedMemoryDispatchWalRecord) {
                    const capacityCommit = (0, agent_sessions_1.commitTaskAgentSessionCapacityRevalidation)(autoAssignTaskSession.id, autoAssignCapacityRevalidationPreparation.proof, {
                        typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord.record_checksum,
                        typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord.state,
                    });
                    if (capacityCommit?.acknowledged !== true)
                        throw new Error(`模型容量下降门禁提交失败：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
                    autoAssignTaskSession = capacityCommit.session || autoAssignTaskSession;
                    autoAssignCapacityRevalidationCommitted = true;
                    if (autoAssignPendingCapacityGate) {
                        (0, logs_1.addTaskLog)(task.id, "info", `${task.target_project} 已按下降后的模型容量重建并压缩上下文包，且已绑定 durable dispatch`);
                        (0, logs_1.appendTaskTimelineEvent)(task.id, {
                            type: "task_agent_capacity_revalidated",
                            title: `${task.target_project} 容量降级上下文已重建`,
                            detail: `${autoAssignPendingCapacityGate.previous_context_window || 0} -> ${autoAssignPendingCapacityGate.current_context_window || 0} token`,
                            status: "ok",
                            phase: "dispatching",
                            agent: task.target_project,
                            data: {
                                capacity_downgrade_gate: autoAssignPendingCapacityGate,
                                capacity_revalidation_proof: autoAssignCapacityRevalidationPreparation.proof,
                                capacity_revalidation_commit_receipt: capacityCommit.receipt,
                                worker_context_packet_id: autoAssignHandoff.worker_context_packet?.packet_id || "",
                            },
                        });
                    }
                }
                if (autoAssignInvocationEdge) {
                    autoAssignInvocationEdge = (0, task_agent_invocation_lineage_1.bindTaskAgentInvocationContext)(autoAssignInvocationEdge, {
                        workerContextPacketId: autoAssignHandoff.worker_context_packet?.packet_id || "",
                        memoryContextSnapshotId: autoAssignMemoryContextSnapshot?.snapshot_id || "",
                        memoryContextSnapshotChecksum: autoAssignMemoryContextSnapshot?.checksum || "",
                        groupSessionMemoryBinding: autoAssignMemoryContextSnapshot?.context?.group_session_memory_binding || null,
                        summaryCapsuleChecksum: autoAssignHandoff.worker_context_packet?.post_turn_summary_delivery_capsule?.capsule_checksum || "",
                        typedMemoryDeliveryCapsule: autoAssignHandoff.worker_context_packet?.typed_memory_delivery_capsule || null,
                        renderedPrompt: autoAssignRenderedPrompt,
                    });
                    autoAssignInvocationEdge = (0, task_agent_invocation_lineage_1.dispatchTaskAgentInvocationEdge)(autoAssignInvocationEdge, {
                        transport: agentType,
                        dispatchedAt: autoAssignTypedMemoryDispatchStartedAt,
                        dispatchTicketId: autoAssignTypedMemoryDispatchAdmission.ticket?.ticket_id || "",
                        dispatchTicketChecksum: autoAssignTypedMemoryDispatchAdmission.ticket?.ticket_checksum || "",
                        typedMemoryDispatchWalFile: autoAssignTypedMemoryDispatchWalRecord?.file || "",
                        typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord?.record_checksum || "",
                        typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord?.state || "",
                        platformDispatchId: autoAssignTypedMemoryDispatchWalRecord?.platform_dispatch_id || "",
                    });
                }
                const taskResult = await ctx.callAgent(task.target_project, autoAssignRenderedPrompt, workDir, agentType, 300000, {
                    tab: autoAssignGroupId ? "groups" : "projects",
                    groupId: autoAssignGroupId,
                    project: task.target_project,
                    allowedTools: toolContext.allowedTools,
                    mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                    runtimeToolSnapshot: (0, collaboration_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                    runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                    taskId: task.id,
                    executionId: task.id,
                    model: autoAssignTaskSession?.modelId || "",
                    taskAgentSessionId: autoAssignTaskSession?.id || "",
                    trustedMemoryProviderChannelRequired: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
                    trustedMemoryProviderAcknowledgementRequired: autoAssignMemoryContextSnapshot?.context?.provider_memory_channel_acknowledgement_required === true,
                    memoryContextConsumptionReceiptRequired: autoAssignMemoryContextSnapshot?.context?.memory_context_consumption_receipt_required === true,
                    memoryContextConsumptionChallenge: autoAssignMemoryContextSnapshot?.context?.memory_context_consumption_challenge || null,
                    trustedMemoryEnvelopeChecksum: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_checksum || "",
                    trustedMemoryEnvelopeSourceChecksum: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_source_checksum || "",
                    ...(0, collaboration_1.taskAgentSessionLifecycleRunnerOptions)(autoAssignMemoryContextSnapshot),
                    agentSession: autoAssignTaskSession ? (0, agent_sessions_1.getTaskAgentSessionOptions)(autoAssignTaskSession) : null,
                    durableDispatch: autoAssignTypedMemoryDispatchAdmission.required === true
                        || autoAssignCapacityRevalidationPreparation?.required === true
                        || autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
                    onRunnerRequestCreated: (requestId) => {
                        autoAssignRunnerRequestId = String(requestId || "");
                        if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerRequestId) {
                            autoAssignTypedMemoryDispatchWalRecord = (0, memory_1.markChildTypedMemoryDispatchStarted)({ required: true, record: autoAssignTypedMemoryDispatchWalRecord }, {
                                dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
                                transport: autoAssignRunnerRequestId.startsWith("adr_") ? "server_direct_cli" : "external_runner",
                                runnerRequestId: autoAssignRunnerRequestId,
                            });
                        }
                        if (autoAssignInvocationEdge && autoAssignRunnerRequestId) {
                            autoAssignInvocationEdge = (0, task_agent_invocation_lineage_1.bindTaskAgentInvocationRunnerRequest)(autoAssignInvocationEdge, autoAssignRunnerRequestId, {
                                typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord?.record_checksum || "",
                                typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord?.state || "",
                            });
                        }
                    },
                    onDone: (opts) => {
                        autoAssignNativeSessionId = String(opts?.nativeSessionId || "");
                        autoAssignNativeContinuationEvidence = opts?.nativeContinuationEvidence || null;
                        autoAssignNativeModelCapabilityReceipt = opts?.nativeModelCapabilityReceipt || null;
                        autoAssignModelCapabilityRecord = opts?.nativeModelCapabilityRecord || null;
                        if (opts?.providerMemoryChannelEvidence?.required === true)
                            autoAssignProviderMemoryChannelEvidence = opts.providerMemoryChannelEvidence;
                        if (opts?.memoryContextConsumptionReceipt)
                            autoAssignMemoryContextConsumptionReceipt = opts.memoryContextConsumptionReceipt;
                        if (opts?.memoryContextConsumptionRecovery)
                            autoAssignMemoryContextConsumptionRecovery = opts.memoryContextConsumptionRecovery;
                        autoAssignProviderUsage = opts?.usage || null;
                        autoAssignSucceeded = opts?.isError !== true;
                        autoAssignError = String(opts?.error || opts?.message || "");
                        autoAssignRunnerRequestId = String(opts?.runnerRequestId || autoAssignRunnerRequestId || "");
                        autoAssignRunnerStarted = opts?.runnerStarted === true;
                    },
                });
                if (!autoAssignCapacityRevalidationCommitted && autoAssignTaskSession && autoAssignCapacityRevalidationPreparation?.proof) {
                    const capacityCommit = (0, agent_sessions_1.commitTaskAgentSessionCapacityRevalidation)(autoAssignTaskSession.id, autoAssignCapacityRevalidationPreparation.proof, {
                        runnerRequestId: autoAssignRunnerRequestId,
                        runnerStarted: autoAssignRunnerStarted,
                    });
                    if (capacityCommit?.acknowledged !== true)
                        throw new Error(`模型容量下降门禁缺少 durable dispatch 证明：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
                    autoAssignTaskSession = capacityCommit.session || autoAssignTaskSession;
                    autoAssignCapacityRevalidationCommitted = true;
                    if (autoAssignPendingCapacityGate) {
                        (0, logs_1.addTaskLog)(task.id, "info", `${task.target_project} 已按下降后的模型容量重建并压缩上下文包，且已绑定 runner return`);
                        (0, logs_1.appendTaskTimelineEvent)(task.id, {
                            type: "task_agent_capacity_revalidated",
                            title: `${task.target_project} 容量降级上下文已重建`,
                            detail: `${autoAssignPendingCapacityGate.previous_context_window || 0} -> ${autoAssignPendingCapacityGate.current_context_window || 0} token`,
                            status: "ok",
                            phase: "executing",
                            agent: task.target_project,
                            data: {
                                capacity_downgrade_gate: autoAssignPendingCapacityGate,
                                capacity_revalidation_proof: autoAssignCapacityRevalidationPreparation.proof,
                                capacity_revalidation_commit_receipt: capacityCommit.receipt,
                                worker_context_packet_id: autoAssignHandoff.worker_context_packet?.packet_id || "",
                            },
                        });
                    }
                }
                if (autoAssignInvocationEdge) {
                    const autoAssignFailed = !autoAssignSucceeded || (0, agent_receipts_1.checkTaskFailure)(taskResult);
                    autoAssignInvocationEdge = (0, task_agent_invocation_lineage_1.completeTaskAgentInvocationEdge)(autoAssignInvocationEdge, {
                        success: !autoAssignFailed,
                        nativeSessionId: autoAssignNativeSessionId || autoAssignTaskSession?.nativeSessionId || "",
                        nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
                        nativeModelCapabilityReceipt: autoAssignNativeModelCapabilityReceipt,
                        nativeModelCapabilityRecord: autoAssignModelCapabilityRecord,
                        provider: agentType,
                        runnerRequestId: autoAssignRunnerRequestId,
                        output: taskResult,
                        error: autoAssignError,
                        reason: autoAssignFailed ? "execution_failed" : "execution_completed",
                    });
                }
                let autoAssignMemoryContextDelivery = null;
                if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerStarted) {
                    autoAssignTypedMemoryDispatchWalRecord = (0, memory_1.markChildTypedMemoryRunnerReturned)(autoAssignTypedMemoryDispatchWalRecord, {
                        runnerRequestId: autoAssignRunnerRequestId,
                        runnerSucceeded: autoAssignSucceeded,
                        output: taskResult,
                    });
                }
                const autoAssignFileChanges = workDir ? ctx.getFileChanges(task.target_project, changeSnapshot) : null;
                if (autoAssignTaskSession && autoAssignMemoryContextSnapshot) {
                    const delivery = (0, agent_sessions_1.recordTaskAgentMemoryContextDelivery)(autoAssignTaskSession.id, {
                        snapshotId: autoAssignMemoryContextSnapshot.snapshot_id || autoAssignTaskSession.memoryContextSnapshotId || "",
                        renderedPrompt: autoAssignRenderedPrompt,
                        snapshotRenderedPrompt: autoAssignRenderedPrompt,
                        executionId: task.id,
                        traceId: task.trace_id || "",
                        runtime: agentType,
                        attempt: autoAssignMemoryDeliveryAttemptSequence,
                        nativeSessionId: autoAssignNativeSessionId || autoAssignTaskSession.nativeSessionId || "",
                        runnerRequestId: autoAssignRunnerRequestId,
                        dispatched: autoAssignRunnerStarted,
                        executionSucceeded: autoAssignSucceeded,
                        output: taskResult,
                        fileChanges: autoAssignFileChanges,
                        nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
                        providerMemoryChannelEvidence: autoAssignProviderMemoryChannelEvidence,
                        memoryContextConsumptionReceipt: autoAssignMemoryContextConsumptionReceipt,
                        memoryContextConsumptionRecovery: autoAssignMemoryContextConsumptionRecovery,
                        providerUsage: autoAssignProviderUsage,
                        runnerStarted: autoAssignRunnerStarted,
                        invocationEdgeId: autoAssignInvocationEdge?.invocation_edge_id || "",
                    });
                    autoAssignMemoryContextDelivery = delivery?.receipt || null;
                    if (autoAssignTypedMemoryDispatchWalRecord && autoAssignMemoryContextDelivery?.delivered === true) {
                        autoAssignTypedMemoryDispatchWalRecord = (0, memory_1.markChildTypedMemoryRunnerReturned)(autoAssignTypedMemoryDispatchWalRecord, {
                            runnerRequestId: autoAssignRunnerRequestId,
                            runnerSucceeded: autoAssignSucceeded,
                            output: taskResult,
                            deliveryReceipt: autoAssignMemoryContextDelivery,
                        });
                    }
                }
                if (autoAssignInvocationEdge) {
                    autoAssignInvocationEdge = (0, task_agent_invocation_lineage_1.bindTaskAgentInvocationMemoryDelivery)(autoAssignInvocationEdge, {
                        deliveryReceipt: autoAssignMemoryContextDelivery,
                    });
                }
                const autoAssignTypedMemoryDeliveryCommit = (0, memory_1.commitChildTypedMemoryDelivery)(autoAssignGroupMemoryContext, {
                    workerContextPacket: autoAssignHandoff.worker_context_packet,
                    dispatchEvidence: {
                        renderedPrompt: autoAssignRenderedPrompt,
                        deliveryReceipt: autoAssignMemoryContextDelivery,
                        dispatchTicket: autoAssignTypedMemoryDispatchAdmission.ticket,
                        dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
                        dispatched: autoAssignRunnerStarted,
                        executionReturned: autoAssignRunnerStarted,
                    },
                });
                if (autoAssignTypedMemoryDeliveryCommit.committed === true) {
                    (0, logs_1.addTaskLog)(task.id, "info", `${task.target_project} 自动派发类型化记忆投递租约已提交：${autoAssignTypedMemoryDeliveryCommit.lease?.leaseId || "unknown"}`);
                }
                if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerStarted && autoAssignMemoryContextDelivery?.delivered === true) {
                    autoAssignTypedMemoryDispatchWalRecord = (0, memory_1.markChildTypedMemoryDispatchCommitted)(autoAssignTypedMemoryDispatchWalRecord, autoAssignTypedMemoryDeliveryCommit);
                }
                if (autoAssignTaskSession) {
                    autoAssignTaskSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(autoAssignTaskSession.id, {
                        nativeSessionId: autoAssignNativeSessionId,
                        nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
                        nativeContinuationUnverified: autoAssignNativeContinuationEvidence?.nativeResumeRequested === true
                            && autoAssignNativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
                        success: autoAssignSucceeded,
                        error: autoAssignError || (!autoAssignSucceeded ? taskResult : ""),
                        nativeModelCapabilityRecord: autoAssignModelCapabilityRecord,
                        runtimeToolSnapshot: (0, collaboration_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                    }) || autoAssignTaskSession;
                }
                const fileChanges = autoAssignFileChanges;
                const execution = (0, collaboration_1.getTaskExecutionFromReceipt)(taskResult, (0, agent_receipts_1.extractAgentReceipt)(taskResult, task.target_project), { fileChanges });
                const isCompleted = execution.status === "done";
                const legacyDeliverySummary = (0, collaboration_1.buildDeliverySummary)(task, execution, isCompleted ? "done" : "waiting");
                const updatedTask = (0, collaboration_1.updateTask)(task_id, {
                    status: isCompleted ? "done" : "in_progress",
                    result: taskResult.substring(0, 500),
                    final_report: execution.report || taskResult,
                    status_detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工"),
                    receipt: execution.receipt || null,
                    file_changes: execution.fileChanges || null,
                    delivery_summary: legacyDeliverySummary,
                }) || { ...task, status: isCompleted ? "done" : "in_progress", delivery_summary: legacyDeliverySummary, status_detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工") };
                if (isCompleted && legacyDeliverySummary.acceptance_gate_passed === true) {
                    const projectMemoryResult = (0, memory_2.recordAcceptedProjectDeliveryMemory)({ task: updatedTask, deliverySummary: legacyDeliverySummary });
                    if (projectMemoryResult.committed)
                        (0, logs_1.addTaskLog)(task_id, "info", `项目长期记忆已完成验收后提交：${projectMemoryResult.durableCandidateCount} 条长期记录`);
                }
                if (autoAssignGroupId) {
                    (0, collaboration_1.appendLegacyTaskExecutionGroupReport)({
                        groupId: autoAssignGroupId,
                        task: updatedTask,
                        status: isCompleted ? "done" : "waiting",
                        detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工"),
                        rawResult: taskResult,
                        fileChanges,
                    });
                }
                (0, utils_1.sendJson)(res, { success: true, task, completed: isCompleted, result: taskResult });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/auto-execute-all" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const tasks = (0, db_1.loadTasks)().filter(t => t.status === "pending");
                if (tasks.length === 0) {
                    return (0, utils_1.sendJson)(res, { success: true, message: "没有待执行的任务" });
                }
                const results = tasks.map(task => ({
                    task_id: task.id,
                    title: task.title,
                    ...(0, collaboration_1.enqueueTask)(task.id, ctx)
                }));
                const queuedCount = results.filter(r => r.queued).length;
                (0, utils_1.sendJson)(res, {
                    success: true,
                    message: `${queuedCount}/${tasks.length} 个任务已加入队列`,
                    results,
                    queue_status: (0, collaboration_1.getQueueStatus)()
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/review" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, project, diff, reviewers } = JSON.parse(body);
                if (!diff)
                    return (0, utils_1.sendJson)(res, { error: "请提供代码变更内容" }, 400);
                const configs = (0, db_1.getConfigs)();
                const reviewPrompt = `请审查以下代码变更，从你的专业角度给出意见：

项目：${project}
代码变更：
\`\`\`
${diff}
\`\`\`

请从以下角度审查：
1. 代码质量
2. 潜在 bug
3. 安全问题
4. 性能影响
5. 与你的项目的兼容性

返回 JSON 格式：
{
  "issues": [
    {
      "severity": "high/medium/low",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "overall": "总体评价"
}`;
                const reviewResults = [];
                const reviewGroup = group_id ? (0, storage_1.loadGroups)().find(g => g.id === group_id) : null;
                for (const reviewer of (reviewers || [])) {
                    const config = configs.find(c => c.name === reviewer);
                    if (!config)
                        continue;
                    const info = (0, db_1.getConfigInfo)(config.path);
                    const workDir = info[0]?.workDir;
                    const agentType = info[0]?.agent || "claudecode";
                    try {
                        const toolContext = (0, collaboration_1.buildAgentToolContext)(ctx, reviewGroup, reviewer, reviewPrompt);
                        const runtimeToolContext = (0, collaboration_1.prepareAgentRuntimeTools)(group_id || "", reviewer, workDir, agentType, toolContext.allowedTools, null, {
                            toolAudit: toolContext.toolAudit,
                            authorizationReadiness: toolContext.authorizationReadiness,
                        });
                        (0, collaboration_1.assertRuntimeToolDispatchReady)(reviewer, runtimeToolContext);
                        const result = await ctx.callAgent(reviewer, `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${reviewPrompt}`, workDir, agentType, 120000, {
                            tab: group_id ? "groups" : "projects",
                            groupId: group_id,
                            project: reviewer,
                            allowedTools: toolContext.allowedTools,
                            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                            runtimeToolSnapshot: (0, collaboration_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                            runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                        });
                        reviewResults.push({ reviewer, result });
                    }
                    catch (e) {
                        reviewResults.push({ reviewer, error: e.message });
                    }
                }
                if (group_id) {
                    const groups = (0, storage_1.loadGroups)();
                    const group = groups.find(g => g.id === group_id);
                    const coordinator = group ? (0, group_orchestrator_1.getCoordinatorMember)(group) : { project: "coordinator" };
                    (0, collaboration_1.appendLegacyCodeReviewGroupReport)({
                        groupId: group_id,
                        project,
                        coordinator: coordinator.project,
                        reviewResults,
                    });
                }
                (0, utils_1.sendJson)(res, { success: true, reviews: reviewResults });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/collaboration/stats" && req.method === "GET") {
        const tasks = (0, db_1.loadTasks)();
        const groups = (0, storage_1.loadGroups)();
        const stats = {
            total_tasks: tasks.length,
            pending_tasks: tasks.filter((t) => t.status === "pending").length,
            in_progress_tasks: tasks.filter((t) => t.status === "in_progress").length,
            done_tasks: tasks.filter((t) => t.status === "done").length,
            failed_tasks: tasks.filter((t) => t.status === "failed").length,
            completion_rate: tasks.length > 0 ? Math.round(tasks.filter((t) => t.status === "done").length / tasks.length * 100) : 0,
            groups_count: groups.length,
            recent_activities: []
        };
        for (const group of groups.slice(0, 3)) {
            const messages = (0, storage_1.getGroupMessages)(group.id).slice(-5);
            for (const msg of messages) {
                stats.recent_activities.push({
                    group: group.name,
                    agent: msg.agent || "user",
                    content: msg.content?.substring(0, 100),
                    timestamp: msg.timestamp
                });
            }
        }
        stats.recent_activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        stats.recent_activities = stats.recent_activities.slice(0, 10);
        (0, utils_1.sendJson)(res, stats);
        return true;
    }
    if (pathname === "/api/test/mentions" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { text, group_id } = JSON.parse(body);
                let validMentions = [];
                if (group_id) {
                    const groups = (0, storage_1.loadGroups)();
                    const group = groups.find(g => g.id === group_id);
                    if (group) {
                        validMentions = (0, collaboration_1.extractActionableMentions)(text, group, "");
                    }
                }
                (0, utils_1.sendJson)(res, {
                    success: true,
                    input: text,
                    valid_mentions: validMentions.map(m => m.mention),
                    extracted_messages: validMentions.map(m => ({ mention: m.mention, target: m.targetName, message: m.message }))
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if ((0, feishu_routes_1.handleFeishuRoutes)(req, res, parsed))
        return true;
    return false;
}
//# sourceMappingURL=collaboration-routes-part-04.js.map