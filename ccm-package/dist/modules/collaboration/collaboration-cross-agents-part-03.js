"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleExecuteMentionJobCatch = handleExecuteMentionJobCatch;
exports.executeMentionJobTryB = executeMentionJobTryB;
function handleExecuteMentionJobCatch(error, ctx) {
    const { outputs, targetName, groupId, planMessageId, taskId, streamRes, formatCollectedAgentOutput, addTaskLog, updateGroupMemory, appendGroupMessage, emitAssignmentStatus } = ctx;
    console.error(`[跨Agent协作] 调用 Agent ${targetName} 失败:`, error.message);
    emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "failed", error.message || "执行失败");
    if (taskId)
        addTaskLog(taskId, "error", `子 Agent 执行失败：${targetName}；${error.message || "未知错误"}`);
    outputs.push(formatCollectedAgentOutput(targetName, `❌ 转发失败: ${error.message}`, {
        agent: targetName,
        status: "failed",
        summary: `转发失败: ${error.message}`,
        actions: [],
        filesChanged: [],
        verification: [],
        blockers: [String(error.message || "执行失败")],
        needs: [],
    }));
    updateGroupMemory(groupId, {
        currentPhase: "needs_rework",
        blocked: {
            project: targetName,
            reason: `转发失败: ${error.message || "执行失败"}`,
            needs: [],
        },
        workerLedger: {
            taskId,
            project: targetName,
            status: "failed",
            receiptStatus: "failed",
            summary: `转发失败: ${error.message || "执行失败"}`,
            blockers: [String(error.message || "执行失败")],
            needs: [],
        },
        nextAction: `主 Agent 复盘 ${targetName} 执行失败并决定是否重试`,
    });
    appendGroupMessage(groupId, {
        id: "m" + Date.now().toString(36) + "err",
        role: "assistant", agent: "system",
        content: `❌ 转发给 @${targetName} 失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        task_id: taskId || undefined,
    });
    return outputs;
}
async function executeMentionJobTryB(mention, env) {
    const { deps, groupId, group, sourceProject, output, configs, ctx, streamRes, depth, seenMentions, executionOrder, planMessageId, taskId, sourceTask, completedOutputsByAgent, processCrossAgents } = env;
    const { addGroupLog, addTaskLog, admitChildTypedMemoryDelivery, appendAgentQaTrace, appendGroupMessage, appendTaskTimelineEvent, attachExecutionWorkspace, attachInvokedSkillsToReceipt, attachMemoryContextConsumptionChallenge, attachTaskAgentFinalDispatchPayloadGate, bindTaskAgentInvocationContext, bindTaskAgentInvocationMemoryDelivery, bindTaskAgentInvocationRunnerRequest, bindTaskAgentMemoryContextSnapshot, buildAckPreflightReview, buildAgentMemoryContextBundleWithManifestSelection, buildAgentMemoryPacket, buildAgentQaProtocolInstructions, buildAgentToolContext, buildChildAgentDevelopmentContract, buildChildAgentTaskText, buildChildAgentWorkerHandoff, buildChildAgentWorktreeNotice, buildCollaborationConflictPlan, buildCoordinatorCollaborationInstructions, buildCoordinatorReworkContinuationFallback, buildCoordinatorSharedFilesContext, buildFinalWorkerDispatchPayloadGate, buildGroupContextPacket, buildMemberCollaborationInstructions, buildNativeTestAgentPlanBlockedReceipt, buildNativeTestAgentReceipt, buildNativeTestAgentReviewSummary, buildNativeTestAgentRuntimeToolContext, buildPostReviewSpotCheckSummary, buildProjectExecutionBrief, buildProjectVerificationHints, buildRuntimeRecoveryCandidates, buildRuntimeRecoveryPrompt, buildTaskPreflightReasoning, buildTaskProviderSwitchRequests, buildWorkerContinuationHandoff, buildWorkflowMeta, checkTaskFailure, claimTaskWorkItemForAgent, commitChildTypedMemoryDelivery, commitTaskAgentSessionCapacityRevalidation, compactMemoryText, compactRuntimeToolAudit, completeTaskAgentInvocationEdge, coordinatorReworkRouteNeedsFreshVerifier, coordinatorReworkRouteRequiresStop, coordinatorReworkRouteUsesVerifier, createChildTypedMemoryDispatchWal, createExecutionCheckpoint, createMemoryContextConsumptionChallenge, dispatchTaskAgentInvocationEdge, emitAssignmentStatus, ensureExecution, escapeRegExp, evaluateAdvisoryPermissionBoundary, evaluateGreenContract, extractActionableMentions, extractAgentReceipt, extractRunnerVerificationEvidence, formatCollectedAgentOutput, formatNativeTestAgentOutput, formatNativeTestAgentPlanBlockedOutput, getAgentDependencyStateFromOutputs, getChildAgentIsolationMode, getCoordinatorActionMentions, getCoordinatorMember, getInitialWorkflowMeta, getMentionReworkRoute, getProjectAgentCapabilityProfile, getProjectExtraConfig, getReceiptAssignmentStatus, getRoutableMembers, getTaskAgentSessionOptions, getTaskById, getTestAgentHandoffPayload, getTestAgentHandoffProjectWorkDir, getTestAgentHandoffReviewSubject, getTestAgentHandoffWarnings, getWorkDirState, handleAgentQaRequests, inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker, isCoordinatorTestAgentName, isProviderPromptTooLongFailure, loadExecution, markChildTypedMemoryDispatchCommitted, markChildTypedMemoryDispatchStarted, markChildTypedMemoryRunnerReturned, memoryContextConsumptionReceiptFile, normalizeAgentRuntimeId, normalizeMentionTask, normalizePlanAssignments, openTaskAgentSession, prepareAgentRuntimeTools, prepareChildAgentWorkDir, prepareTaskAgentInvocationEdge, prepareTaskAgentSessionCapacityRevalidation, recordAgentRuntimeLifecycle, recordReplayRepairTimelineBindingsForMention, recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome, recordTaskAgentMemoryContextDelivery, recordTaskAgentSessionTurn, recordWorkerContextProviderSwitchExecutionReceiptForCoordinator, recordWorkerContextProviderSwitchSessionBindingForCoordinator, recoverFinalWorkerDispatchPayload, renderGroupPostCompactDynamicContextDelta, renderGroupPostCompactInvokedSkillAttachments, renderGroupPostCompactPlanAttachment, renderMemoryContextForWorker, resolveMemberRuntime, runGroupOrchestrator, runMainAgentPostReviewSpotCheck, runTestAgentCliJob, runtimeToolDispatchBlockedMessage, runtimeToolDispatchBlockedReceipt, runtimeToolSnapshotFromAudit, shouldSwitchRuntime, stopWrongDirectionWorkerForCoordinatorRoute, stripAgentQaProtocolBlocks, summarizeNativeTestAgentExecutionPlan, summarizeReplayRepairTimelineBindingsForEvent, summarizeTaskAgentMemoryContextSnapshot, summarizeWorkerHandoffForUser, taskAgentInvocationMemoryOptions, taskAgentSessionLifecycleRunnerOptions, taskRequiresCodeChanges, taskRequiresVerification, transitionExecution, uniqueStrings, updateGroupMemory, updateGroupTaskInlineStatus, updateTask, updateTaskWorkItemFromReceipt, validateTestAgentHandoffRegisteredWorkDirs, verifyFinalWorkerDispatchPayloadGate, writeSse } = deps;
    const L = env._locals || {};
    let outputs = L.outputs || [];
    let targetName = L.targetName || "";
    let coordinatorProject = L.coordinatorProject || "";
    const failChildDispatch = L.failChildDispatch || (() => outputs);
    let tWorkDir = L.tWorkDir || process.cwd();
    let tAgentType = L.tAgentType || "claudecode";
    let activeTaskSession = L.activeTaskSession || null;
    let laneExecutionId = L.laneExecutionId || "";
    let childTaskText = L.childTaskText || "";
    let workerHandoff = L.workerHandoff || null;
    let developmentContract = L.developmentContract || "";
    const renderCrossAgentPrompt = L.renderCrossAgentPrompt || (() => "");
    let tPrompt = L.tPrompt || "";
    let advisoryOnly = L.advisoryOnly || false;
    const nativeTestAgentDispatch = L.nativeTestAgentDispatch || false;
    const testAgentHandoffPayload = L.testAgentHandoffPayload || null;
    let toolContext = L.toolContext || { prompt: "", allowedTools: { mcp: [], skill: [] }, toolAudit: null, authorizationReadiness: null };
    let runtimeToolContext = L.runtimeToolContext || toolContext;
    let activeGroupSessionId = L.activeGroupSessionId || "";
    let activeInvocationEdge = L.activeInvocationEdge || null;
    let groupMemoryBundle = L.groupMemoryBundle || null;
    let workerMemoryContext = L.workerMemoryContext || null;
    let workerMemoryPacket = L.workerMemoryPacket || "";
    const dependencyOutputPacket = L.dependencyOutputPacket || "";
    const continuationNotice = L.continuationNotice || "";
    const testAgentHandoffPacket = L.testAgentHandoffPacket || "";
    const projectExecutionBrief = L.projectExecutionBrief || "";
    const worktreeNotice = L.worktreeNotice || "";
    let atMessage = L.atMessage || "";
    const implementationMessage = L.implementationMessage || "";
    const requiresAckPreflight = L.requiresAckPreflight || false;
    const testAgentWorkDirPolicy = L.testAgentWorkDirPolicy || { valid: true, allowedWorkDirs: [], invalid: [] };
    const memoryDeliveryAttemptSequence = L.memoryDeliveryAttemptSequence || 0;
    const globalMissionHandoff = L.globalMissionHandoff || null;
    const globalMissionMemory = L.globalMissionMemory || "";
    const workerContinuation = L.workerContinuation || null;
    let capacityRevalidationPreparation = L.capacityRevalidationPreparation || null;
    let capacityRevalidationCommitted = L.capacityRevalidationCommitted !== false;
    let workerHandoffSummary = L.workerHandoffSummary || null;
    let activeMemoryContextSnapshot = L.activeMemoryContextSnapshot || null;
    let activeMemoryContextDelivery = L.activeMemoryContextDelivery || null;
    let memoryConsumptionChallenge = L.memoryConsumptionChallenge || null;
    const projectResourcesConfig = L.projectResourcesConfig || {};
    const collaborationInstructions = L.collaborationInstructions || "";
    const memberList = L.memberList || "";
    const isContinuation = L.isContinuation || false;
    const continuationUserLabel = L.continuationUserLabel || "";
    const isVerifierContinuation = L.isVerifierContinuation || false;
    const isFreshVerifierContinuation = L.isFreshVerifierContinuation || false;
    const continuationOf = L.continuationOf || "";
    const reworkRoute = L.reworkRoute || null;
    const routeStopResult = L.routeStopResult || null;
    const providerSwitchDecisionReceipt = L.providerSwitchDecisionReceipt || null;
    let tContext = L.tContext || "";
    const preparedWorkDir = L.preparedWorkDir || null;
    const testAgentHandoffWarnings = L.testAgentHandoffWarnings || [];
    const continuationStrategy = L.continuationStrategy || "";
    const mentionStr = L.mentionStr || "";
    const nativeTestAgentMention = L.nativeTestAgentMention || false;
    const targetMember = L.targetMember || null;
    const atRegex = L.atRegex || null;
    const atMatch = L.atMatch || null;
    const taskKey = L.taskKey || "";
    const testAgentHandoff = L.testAgentHandoff || null;
    const legacyTestAgentWorkOrder = L.legacyTestAgentWorkOrder || null;
    const runtime = L.runtime || null;
    const testAgentProjectWorkDir = L.testAgentProjectWorkDir || "";
    const workDirState = L.workDirState || null;
    const taskRuntimeOverride = L.taskRuntimeOverride || "";
    const providerSwitchAttempted = L.providerSwitchAttempted || false;
    const approvedSwitchAgentType = L.approvedSwitchAgentType || "";
    let providerSwitchSessionBinding = L.providerSwitchSessionBinding || null;
    const routeContinuationFallback = L.routeContinuationFallback || null;
    const pendingCapacityDowngradeGate = L.pendingCapacityDowngradeGate || null;
    let memoryPacket = L.memoryPacket || "";
    let targetReceipt = L.targetReceipt || null;
    let tOutput = L.tOutput || "";
    let activeRuntime = L.activeRuntime || tAgentType;
    let targetFileChanges = L.targetFileChanges || null;
    let targetWorkEvents = L.targetWorkEvents || [];
    let targetNativeSessionId = L.targetNativeSessionId || "";
    let targetInvokedSkills = L.targetInvokedSkills || [];
    let testAgentNativeReport = L.testAgentNativeReport || null;
    let testAgentExecutionPlan = L.testAgentExecutionPlan || null;
    let testAgentPlanDispatch = L.testAgentPlanDispatch || null;
    let testAgentCliDispatch = L.testAgentCliDispatch || null;
    let responseMessageId = L.responseMessageId || "";
    let providerSwitchExecutionReceipt = L.providerSwitchExecutionReceipt || null;
    let targetProviderToolAccessEvidence = L.targetProviderToolAccessEvidence || null;
    try {
        if (targetReceipt) {
            const agentMemoryContextUsage = targetReceipt.agentMemoryContextUsage
                || targetReceipt.agent_memory_context_usage
                || targetReceipt.memoryContextUsage
                || targetReceipt.memory_context_usage
                || null;
            targetReceipt = {
                ...targetReceipt,
                agentMemoryContextUsage,
                agent_memory_context_usage: agentMemoryContextUsage,
            };
        }
        if (targetReceipt && activeTaskSession) {
            targetReceipt = {
                ...targetReceipt,
                taskAgentSessionId: activeTaskSession.id,
                task_agent_session_id: activeTaskSession.id,
                nativeSessionId: targetNativeSessionId || activeTaskSession.nativeSessionId || "",
                native_session_id: targetNativeSessionId || activeTaskSession.nativeSessionId || "",
                taskAgentSessionTurn: activeTaskSession.turnCount,
                task_agent_session_turn: activeTaskSession.turnCount,
                memoryContextSnapshotId: activeMemoryContextSnapshot?.snapshot_id || activeTaskSession.memoryContextSnapshotId || "",
                memory_context_snapshot_id: activeMemoryContextSnapshot?.snapshot_id || activeTaskSession.memoryContextSnapshotId || "",
                memoryContextSnapshotChecksum: activeMemoryContextSnapshot?.checksum || activeTaskSession.memoryContextSnapshotChecksum || "",
                memory_context_snapshot_checksum: activeMemoryContextSnapshot?.checksum || activeTaskSession.memoryContextSnapshotChecksum || "",
                workerContextPacketId: activeMemoryContextSnapshot?.worker_context_packet_id || activeTaskSession.memoryContextPacketId || "",
                worker_context_packet_id: activeMemoryContextSnapshot?.worker_context_packet_id || activeTaskSession.memoryContextPacketId || "",
                agentType: activeTaskSession.agentType || activeRuntime,
                agent_type: activeTaskSession.agentType || activeRuntime,
                executionId: laneExecutionId,
                execution_id: laneExecutionId,
                traceId: sourceTask?.trace_id || "",
                trace_id: sourceTask?.trace_id || "",
            };
        }
        if (advisoryOnly) {
            const advisoryChanges = Array.isArray(targetFileChanges?.files) ? targetFileChanges.files : Array.isArray(targetFileChanges) ? targetFileChanges : [];
            const boundary = evaluateAdvisoryPermissionBoundary(advisoryChanges, { mcp: [], skill: [] }, toolContext.allowedTools);
            if (!boundary.pass) {
                targetReceipt = {
                    agent: targetName,
                    status: "failed",
                    summary: "Agent 问答违反 advisory_read_only 权限契约，回答已隔离",
                    actions: [],
                    filesChanged: advisoryChanges.map((item) => item?.path || item).filter(Boolean),
                    verification: [],
                    blockers: [boundary.reason],
                    needs: ["由主 Agent 重新派发正式开发工作单后才能修改文件"],
                    permission_boundary: boundary,
                };
                tOutput = `${stripAgentQaProtocolBlocks(tOutput)}\n\n权限门禁：${boundary.reason}`;
                if (taskId)
                    appendTaskTimelineEvent(taskId, { type: "agent_qa_permission_violation", title: `${targetName} 问答越权已隔离`, detail: boundary.reason, status: "fail", phase: "waiting_dependency", agent: targetName, data: boundary });
                appendAgentQaTrace(taskId, "agent.qa.permission_violation", { id: mention.requestId, group_id: groupId, from_agent: sourceProject, to_agent: targetName }, boundary.reason, "fail", boundary);
            }
        }
        if (targetReceipt && activeTaskSession && !targetReceipt.task_agent_session_id) {
            targetReceipt = {
                ...targetReceipt,
                taskAgentSessionId: activeTaskSession.id,
                task_agent_session_id: activeTaskSession.id,
                nativeSessionId: targetNativeSessionId || activeTaskSession.nativeSessionId || "",
                native_session_id: targetNativeSessionId || activeTaskSession.nativeSessionId || "",
                taskAgentSessionTurn: activeTaskSession.turnCount,
                task_agent_session_turn: activeTaskSession.turnCount,
                memoryContextSnapshotId: activeMemoryContextSnapshot?.snapshot_id || activeTaskSession.memoryContextSnapshotId || "",
                memory_context_snapshot_id: activeMemoryContextSnapshot?.snapshot_id || activeTaskSession.memoryContextSnapshotId || "",
                memoryContextSnapshotChecksum: activeMemoryContextSnapshot?.checksum || activeTaskSession.memoryContextSnapshotChecksum || "",
                memory_context_snapshot_checksum: activeMemoryContextSnapshot?.checksum || activeTaskSession.memoryContextSnapshotChecksum || "",
                workerContextPacketId: activeMemoryContextSnapshot?.worker_context_packet_id || activeTaskSession.memoryContextPacketId || "",
                worker_context_packet_id: activeMemoryContextSnapshot?.worker_context_packet_id || activeTaskSession.memoryContextPacketId || "",
                agentType: activeTaskSession.agentType || activeRuntime,
                agent_type: activeTaskSession.agentType || activeRuntime,
                executionId: laneExecutionId,
                execution_id: laneExecutionId,
                traceId: sourceTask?.trace_id || "",
                trace_id: sourceTask?.trace_id || "",
            };
        }
        let providerSwitchExecutionReceipt = null;
        if (targetReceipt && providerSwitchDecisionReceipt?.valid === true) {
            recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, {
                assignment_id: typeof mention === "string" ? "" : mention.assignmentId || mention.assignment_id || "",
                dispatch_key: typeof mention === "string" ? "" : mention.dispatchKey || mention.dispatch_key || "",
                worker_context_packet_id: workerHandoff.worker_context_packet?.packet_id || "",
                provider_switch_decision_receipt: providerSwitchDecisionReceipt,
                project: targetName,
                agent_type: activeRuntime,
                task_agent_session_id: activeTaskSession?.id || targetReceipt.task_agent_session_id || "",
                native_session_id: targetReceipt.native_session_id || targetReceipt.nativeSessionId || targetNativeSessionId || activeTaskSession?.nativeSessionId || "",
                execution_id: laneExecutionId,
            });
            providerSwitchExecutionReceipt = recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId, {
                assignment_id: typeof mention === "string" ? "" : mention.assignmentId || mention.assignment_id || "",
                dispatch_key: typeof mention === "string" ? "" : mention.dispatchKey || mention.dispatch_key || "",
                worker_context_packet_id: workerHandoff.worker_context_packet?.packet_id || "",
                provider_switch_decision_receipt: providerSwitchDecisionReceipt,
                project: targetName,
                executed_provider: activeRuntime,
                task_agent_session_id: activeTaskSession?.id || targetReceipt.task_agent_session_id || "",
                native_session_id: targetReceipt.native_session_id || targetReceipt.nativeSessionId || targetNativeSessionId || activeTaskSession?.nativeSessionId || "",
                execution_id: laneExecutionId,
                receipt_status: targetReceipt.status || "",
                receipt: targetReceipt,
            });
            if (providerSwitchExecutionReceipt) {
                targetReceipt = {
                    ...targetReceipt,
                    providerSwitchExecution: providerSwitchExecutionReceipt,
                    provider_switch_execution: providerSwitchExecutionReceipt,
                    providerSwitchDecisionReceiptId: providerSwitchExecutionReceipt.provider_switch_decision_receipt_id || "",
                    provider_switch_decision_receipt_id: providerSwitchExecutionReceipt.provider_switch_decision_receipt_id || "",
                    executedProvider: providerSwitchExecutionReceipt.actually_executed_provider || activeRuntime,
                    executed_provider: providerSwitchExecutionReceipt.actually_executed_provider || activeRuntime,
                };
                if (providerSwitchExecutionReceipt.status !== "passed" && targetReceipt.status === "done") {
                    targetReceipt = {
                        ...targetReceipt,
                        status: "partial",
                        blockers: uniqueStrings([
                            ...(Array.isArray(targetReceipt.blockers) ? targetReceipt.blockers : []),
                            `provider switch execution proof failed: ${(providerSwitchExecutionReceipt.gaps || []).join(", ") || "unknown"}`,
                        ]),
                        needs: uniqueStrings([
                            ...(Array.isArray(targetReceipt.needs) ? targetReceipt.needs : []),
                            "重新派发并确保实际 runner、task Agent session 与 approved provider switch receipt 一致",
                        ]),
                    };
                }
            }
        }
        const receiptReplayRepairBindings = targetReceipt ? summarizeReplayRepairTimelineBindingsForEvent(mention, {
            targetName,
            taskId,
            workerContextPacket: workerHandoff.worker_context_packet,
            workerHandoff,
            memoryContextSnapshot: activeMemoryContextSnapshot,
            taskAgentSession: activeTaskSession,
            taskAgentSessionId: activeTaskSession?.id || targetReceipt.task_agent_session_id || "",
            nativeSessionId: targetReceipt.native_session_id || targetReceipt.nativeSessionId || activeTaskSession?.nativeSessionId || "",
            executionId: laneExecutionId,
            receipt: targetReceipt,
        }) : [];
        if (targetReceipt && receiptReplayRepairBindings.length) {
            targetReceipt = {
                ...targetReceipt,
                replayRepairDispatchBriefs: receiptReplayRepairBindings,
                replay_repair_dispatch_briefs: receiptReplayRepairBindings,
            };
        }
        outputs.push(formatCollectedAgentOutput(targetName, tOutput, targetReceipt));
        if (taskId && targetReceipt) {
            const verificationCount = Array.isArray(targetReceipt.verification) ? targetReceipt.verification.length : 0;
            const fileCount = Array.isArray(targetReceipt.filesChanged) ? targetReceipt.filesChanged.length : 0;
            addTaskLog(taskId, targetReceipt.status === "done" ? "success" : "warning", `子 Agent 结果说明：${targetName} status=${targetReceipt.status}，文件 ${fileCount} 个，验证 ${verificationCount} 条；${targetReceipt.summary || "无摘要"}`);
            const receiptTimelineEvent = appendTaskTimelineEvent(taskId, {
                type: "child_agent_receipt",
                title: `${targetName} 提交结果说明`,
                detail: targetReceipt.summary || "无摘要",
                status: targetReceipt.status === "done" ? "ok" : "warn",
                phase: "executing",
                agent: targetName,
                data: { receipt: targetReceipt, fileCount, verificationCount, replay_repair_dispatch_bindings: receiptReplayRepairBindings },
            });
            recordReplayRepairTimelineBindingsForMention(groupId, mention, {
                targetName,
                taskId,
                workerContextPacket: workerHandoff.worker_context_packet,
                workerHandoff,
                memoryContextSnapshot: activeMemoryContextSnapshot,
                memoryContextSnapshotChecksum: activeMemoryContextSnapshot?.checksum || "",
                taskAgentSession: activeTaskSession,
                taskAgentSessionId: activeTaskSession?.id || targetReceipt.task_agent_session_id || "",
                nativeSessionId: targetReceipt.native_session_id || targetReceipt.nativeSessionId || activeTaskSession?.nativeSessionId || "",
                executionId: laneExecutionId,
                receipt: targetReceipt,
                receiptStatus: targetReceipt.status || "",
                timelineEvent: receiptTimelineEvent,
                timelineEventType: "child_agent_receipt",
            });
        }
        if (targetReceipt) {
            if (taskId)
                updateTaskWorkItemFromReceipt(taskId, targetName, targetReceipt, targetFileChanges, tOutput, { ctx });
            if (laneExecutionId) {
                const green = evaluateGreenContract({ receipt: targetReceipt, fileChanges: targetFileChanges, requiresChanges: nativeTestAgentDispatch ? false : (sourceTask ? taskRequiresCodeChanges(sourceTask) : true), requiresVerification: sourceTask?.requires_verification !== false, requiredLevel: "project" });
                transitionExecution(laneExecutionId, targetReceipt.status === "failed" ? "failed" : "reviewing", targetReceipt.status === "done" ? "子 Agent 已交付，等待主 Agent 验收" : (targetReceipt.summary || "子 Agent 结果说明未完成"), {
                    green,
                    receipt: targetReceipt,
                    fileChanges: targetFileChanges,
                    runnerVerification: extractRunnerVerificationEvidence(tOutput),
                    outputPreview: tOutput,
                    data: {
                        runtime_tool_sync: compactRuntimeToolAudit(runtimeToolContext.audit),
                        invoked_skills: targetInvokedSkills,
                        replay_repair_dispatch_bindings: receiptReplayRepairBindings,
                        test_agent_execution_plan: testAgentExecutionPlan,
                        test_agent_plan_dispatch: testAgentPlanDispatch ? {
                            cliPath: testAgentPlanDispatch.cliPath,
                            handoffPath: testAgentPlanDispatch.handoffPath,
                            exitCode: testAgentPlanDispatch.exitCode,
                            signal: testAgentPlanDispatch.signal,
                            stderr: compactMemoryText(testAgentPlanDispatch.stderr, 4000),
                        } : null,
                        test_agent_report: testAgentNativeReport,
                        test_agent_cli_dispatch: testAgentCliDispatch ? {
                            cliPath: testAgentCliDispatch.cliPath,
                            handoffPath: testAgentCliDispatch.handoffPath,
                            exitCode: testAgentCliDispatch.exitCode,
                            signal: testAgentCliDispatch.signal,
                            stderr: compactMemoryText(testAgentCliDispatch.stderr, 4000),
                        } : null,
                    },
                });
            }
            if (targetReceipt.status === "done" || targetReceipt.status === "partial") {
                updateGroupMemory(groupId, {
                    currentPhase: targetReceipt.status === "done" ? "executing" : "needs_rework",
                    completed: {
                        project: targetName,
                        summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
                        filesChanged: targetReceipt.filesChanged || [],
                        verification: targetReceipt.verification || [],
                        memoryUsed: targetReceipt.memoryUsed || [],
                        memoryIgnored: targetReceipt.memoryIgnored || [],
                        taskAgentSessionId: targetReceipt.taskAgentSessionId || targetReceipt.task_agent_session_id || "",
                        nativeSessionId: targetReceipt.nativeSessionId || targetReceipt.native_session_id || "",
                        agentType: targetReceipt.agentType || targetReceipt.agent_type || "",
                    },
                    workerLedger: {
                        taskId,
                        project: targetName,
                        status: targetReceipt.status === "done" ? "completed" : "partial",
                        receiptStatus: targetReceipt.status,
                        summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
                        filesChanged: targetReceipt.filesChanged || [],
                        verification: targetReceipt.verification || [],
                        blockers: targetReceipt.blockers || [],
                        needs: targetReceipt.needs || [],
                        memoryUsed: targetReceipt.memoryUsed || [],
                        memoryIgnored: targetReceipt.memoryIgnored || [],
                        taskAgentSessionId: targetReceipt.taskAgentSessionId || targetReceipt.task_agent_session_id || "",
                        task_agent_session_id: targetReceipt.task_agent_session_id || targetReceipt.taskAgentSessionId || "",
                        nativeSessionId: targetReceipt.nativeSessionId || targetReceipt.native_session_id || "",
                        native_session_id: targetReceipt.native_session_id || targetReceipt.nativeSessionId || "",
                        agentType: targetReceipt.agentType || targetReceipt.agent_type || "",
                        agent_type: targetReceipt.agent_type || targetReceipt.agentType || "",
                        executionId: targetReceipt.executionId || targetReceipt.execution_id || laneExecutionId,
                        execution_id: targetReceipt.execution_id || targetReceipt.executionId || laneExecutionId,
                    },
                    nextAction: targetReceipt.status === "done" ? `等待主 Agent 验收 ${targetName} 结果说明` : `主 Agent 复盘 ${targetName} 的部分完成结果说明`,
                });
            }
            else {
                updateGroupMemory(groupId, {
                    currentPhase: "needs_rework",
                    blocked: {
                        project: targetName,
                        reason: targetReceipt.blockers?.join("；") || targetReceipt.summary || targetReceipt.status,
                        needs: targetReceipt.needs || [],
                    },
                    workerLedger: {
                        taskId,
                        project: targetName,
                        status: targetReceipt.status || "blocked",
                        receiptStatus: targetReceipt.status,
                        summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
                        filesChanged: targetReceipt.filesChanged || [],
                        verification: targetReceipt.verification || [],
                        blockers: targetReceipt.blockers || [],
                        needs: targetReceipt.needs || [],
                        memoryUsed: targetReceipt.memoryUsed || [],
                        memoryIgnored: targetReceipt.memoryIgnored || [],
                        taskAgentSessionId: targetReceipt.taskAgentSessionId || targetReceipt.task_agent_session_id || "",
                        task_agent_session_id: targetReceipt.task_agent_session_id || targetReceipt.taskAgentSessionId || "",
                        nativeSessionId: targetReceipt.nativeSessionId || targetReceipt.native_session_id || "",
                        native_session_id: targetReceipt.native_session_id || targetReceipt.nativeSessionId || "",
                        agentType: targetReceipt.agentType || targetReceipt.agent_type || "",
                        agent_type: targetReceipt.agent_type || targetReceipt.agentType || "",
                        executionId: targetReceipt.executionId || targetReceipt.execution_id || laneExecutionId,
                        execution_id: targetReceipt.execution_id || targetReceipt.executionId || laneExecutionId,
                    },
                    nextAction: `主 Agent 复盘 ${targetName} 阻塞并决定是否返工或询问用户`,
                });
            }
        }
        else {
            if (taskId)
                addTaskLog(taskId, "warning", `子 Agent 未提供结构化回执：${targetName}；主 Agent 后续验收会要求补充 CCM_AGENT_RECEIPT`);
            updateGroupMemory(groupId, {
                currentPhase: "reviewing",
                blocked: {
                    project: targetName,
                    reason: "子 Agent 未提供结构化回执，主 Agent 需要验收时确认是否补充",
                    needs: ["补充 CCM_AGENT_RECEIPT"],
                },
                workerLedger: {
                    taskId,
                    project: targetName,
                    status: "missing_receipt",
                    receiptStatus: "missing",
                    summary: compactMemoryText(tOutput, 220),
                    blockers: ["缺少 CCM_AGENT_RECEIPT"],
                    needs: ["补充 CCM_AGENT_RECEIPT"],
                },
                nextAction: `主 Agent 验收 ${targetName} 自然语言回复`,
            });
        }
        appendGroupMessage(groupId, {
            id: responseMessageId,
            role: "assistant", agent: targetName,
            content: tOutput,
            timestamp: new Date().toISOString(),
            task_id: taskId || undefined,
            task_agent_session_id: activeTaskSession?.id || targetReceipt?.task_agent_session_id || undefined,
            native_session_id: targetNativeSessionId || activeTaskSession?.nativeSessionId || targetReceipt?.native_session_id || undefined,
            agent_type: activeTaskSession?.agentType || activeRuntime || undefined,
            execution_id: laneExecutionId || undefined,
            receipt: targetReceipt || undefined,
            fileChanges: targetFileChanges,
            workEvents: targetWorkEvents,
            runtimeToolSync: compactRuntimeToolAudit(runtimeToolContext.audit),
            providerToolAccessEvidence: targetProviderToolAccessEvidence || undefined,
            provider_tool_access_evidence: targetProviderToolAccessEvidence || undefined,
            invokedSkills: targetInvokedSkills,
            testAgentHandoff: testAgentHandoffPayload || undefined,
            test_agent_handoff: testAgentHandoffPayload || undefined,
            testAgentExecutionPlan: testAgentExecutionPlan || undefined,
            test_agent_execution_plan: testAgentExecutionPlan || undefined,
            testAgentPlanDispatch: testAgentPlanDispatch ? {
                cliPath: testAgentPlanDispatch.cliPath,
                handoffPath: testAgentPlanDispatch.handoffPath,
                exitCode: testAgentPlanDispatch.exitCode,
                signal: testAgentPlanDispatch.signal,
                stderr: compactMemoryText(testAgentPlanDispatch.stderr, 4000),
            } : undefined,
            test_agent_plan_dispatch: testAgentPlanDispatch ? {
                cliPath: testAgentPlanDispatch.cliPath,
                handoffPath: testAgentPlanDispatch.handoffPath,
                exitCode: testAgentPlanDispatch.exitCode,
                signal: testAgentPlanDispatch.signal,
                stderr: compactMemoryText(testAgentPlanDispatch.stderr, 4000),
            } : undefined,
            testAgentReport: testAgentNativeReport || undefined,
            test_agent_report: testAgentNativeReport || undefined,
            testAgentCliDispatch: testAgentCliDispatch ? {
                cliPath: testAgentCliDispatch.cliPath,
                handoffPath: testAgentCliDispatch.handoffPath,
                exitCode: testAgentCliDispatch.exitCode,
                signal: testAgentCliDispatch.signal,
                stderr: compactMemoryText(testAgentCliDispatch.stderr, 4000),
            } : undefined,
            test_agent_cli_dispatch: testAgentCliDispatch ? {
                cliPath: testAgentCliDispatch.cliPath,
                handoffPath: testAgentCliDispatch.handoffPath,
                exitCode: testAgentCliDispatch.exitCode,
                signal: testAgentCliDispatch.signal,
                stderr: compactMemoryText(testAgentCliDispatch.stderr, 4000),
            } : undefined,
        });
        const qaResult = await handleAgentQaRequests({
            groupId,
            group,
            sourceProject: targetName,
            sourceOutput: tOutput,
            originalPrompt: tPrompt,
            sourceWorkDir: tWorkDir,
            sourceAgentType: tAgentType,
            allowedTools: toolContext.allowedTools,
            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
            configs,
            ctx,
            streamRes,
            taskId,
            sourceTaskAgentSessionId: activeTaskSession?.id || targetReceipt?.task_agent_session_id || "",
            sourceNativeSessionId: targetNativeSessionId || activeTaskSession?.nativeSessionId || targetReceipt?.native_session_id || "",
            qaDepth: depth,
        });
        if (qaResult.outputs.length)
            outputs.push(...qaResult.outputs);
        const downstreamOutput = qaResult.resumedOutput || tOutput;
        const assignmentStatus = getReceiptAssignmentStatus(downstreamOutput, extractAgentReceipt(downstreamOutput, targetName) || targetReceipt);
        emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, assignmentStatus.status, assignmentStatus.text);
        const nestedMentions = extractActionableMentions(downstreamOutput, group, targetName);
        if (nestedMentions.length > 0) {
            const newMentions = nestedMentions.filter(m => m.targetName !== targetName);
            if (newMentions.length > 0) {
                const nestedOutputs = await processCrossAgents(groupId, group, targetName, downstreamOutput, newMentions, configs, ctx, streamRes, depth + 1, seenMentions, "parallel", "", taskId, deps);
                outputs.push(...nestedOutputs);
            }
        }
    }
    catch (error) {
        return handleExecuteMentionJobCatch(error, { outputs, targetName, groupId, planMessageId, taskId, streamRes, formatCollectedAgentOutput, addTaskLog, updateGroupMemory, appendGroupMessage, emitAssignmentStatus });
    }
    return outputs;
}
//# sourceMappingURL=collaboration-cross-agents-part-03.js.map