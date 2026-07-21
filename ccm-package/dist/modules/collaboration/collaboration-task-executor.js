"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTask = executeTask;
// Mechanically extracted from collaboration.ts; keep orchestration behavior unchanged.
const group_session_model_context_1 = require("./group-session-model-context");
async function executeTask(task, ctx, deps) {
    const { addTaskLog, admitChildTypedMemoryDelivery, alignRequirementEpicAssignments, appendGroupMessage, appendTaskTimelineEvent, assertRuntimeToolDispatchReady, attachExecutionWorkspace, attachInvokedSkillsToReceipt, attachMemoryContextConsumptionChallenge, bindTaskAgentInvocationContext, bindTaskAgentInvocationMemoryDelivery, bindTaskAgentInvocationRunnerRequest, bindTaskAgentMemoryContextSnapshot, buildAgentMemoryContextBundleWithManifestSelection, buildAgentToolContext, buildChildAgentDevelopmentContract, buildChildAgentTaskText, buildChildAgentWorkerHandoff, buildChildAgentWorktreeNotice, buildCoordinatorSharedFilesContext, buildProjectVerificationHints, buildQueuedGroupTaskMessage, buildTaskProviderSwitchRequests, buildTaskSandboxRehearsal, buildTaskSourceDocumentsContext, buildUserCoordinationAcknowledgement, buildWorkerContinuationHandoff, buildWorkflowMeta, captureReasoningFacts, checkTaskFailure, claimTaskWorkItemForAgent, commitChildTypedMemoryDelivery, commitTaskAgentSessionCapacityRevalidation, compactMemoryText, compactRuntimeToolAudit, completeTaskAgentInvocationEdge, createChildTypedMemoryDispatchWal, createExecutionCheckpoint, createMemoryContextConsumptionChallenge, dispatchTaskAgentInvocationEdge, ensureExecution, evaluateGreenContract, explainReasoningDecision, extractAgentReceipt, extractRunnerVerificationEvidence, getChildAgentIsolationMode, getConfigInfo, getConfigs, getCoordinatorActionMentions, getCoordinatorMember, getGroupTaskExecutionStatus, getInitialWorkflowMeta, getRoutableMembers, getTaskAgentSessionOptions, getTaskExecutionFromReceipt, groupSessionIdForTask, loadExecution, loadGroups, loadTasks, markChildTypedMemoryDispatchCommitted, markChildTypedMemoryDispatchStarted, markChildTypedMemoryRunnerReturned, markGroupCoordinationDependencyStarted, memoryContextConsumptionReceiptFile, mergeCoordinatorDocumentContexts, normalizeAgentReasoningState, normalizePlanAssignments, openTaskAgentSession, prepareAgentRuntimeTools, prepareChildAgentWorkDir, prepareTaskAgentInvocationEdge, prepareTaskAgentSessionCapacityRevalidation, processCrossAgents, recordAgentRuntimeLifecycle, recordReasoningDeviation, recordReplayRepairTimelineBindingsForMention, recordTaskAgentMemoryContextDelivery, recordTaskAgentSessionTurn, requirementEpicExecutionBoundary, runCodedGroupOrchestrator, runCoordinatorReviewLoop, runGroupOrchestrator, runtimeToolDispatchBlockedReceipt, runtimeToolSnapshotFromAudit, safeAddGroupLog, saveTasks, setReasoningAssertion, summarizeReplayRepairTimelineBindingsForEvent, summarizeWorkerHandoffForUser, taskAgentInvocationMemoryOptions, taskAgentSessionLifecycleRunnerOptions, taskRequiresCodeChanges, transitionExecution, updateGroupMemory, updateReasoningPlan, updateTask, updateTaskWorkItemFromReceipt } = deps;
    const configs = getConfigs();
    if (task.assign_type === "group" && task.group_id) {
        const groups = loadGroups();
        const group = groups.find(g => g.id === task.group_id);
        if (!group)
            throw new Error("群聊不存在");
        const coordinatorProject = getCoordinatorMember(group).project;
        const message = buildQueuedGroupTaskMessage(task);
        appendTaskTimelineEvent(task.id, { type: "queued_group_task", title: "任务进入群聊主 Agent", detail: task.title || "", status: "active", phase: "intake", agent: coordinatorProject, data: { group_id: task.group_id } });
        appendGroupMessage(task.group_id, {
            id: "m" + Date.now().toString(36) + "task",
            role: "user",
            target: coordinatorProject,
            content: message,
            timestamp: new Date().toISOString(),
            task_id: task.id,
        });
        safeAddGroupLog(task.group_id, "info", "task", `任务派发到群聊: ${task.title}`, {
            task_id: task.id,
            priority: task.priority
        });
        updateGroupMemory(task.group_id, {
            groupSessionId: groupSessionIdForTask(task),
            goal: message,
            currentPhase: "dispatching",
            decision: "任务队列派发到群聊主 Agent",
            reason: task.title,
            nextAction: "主 Agent 拆分任务并协调子 Agent",
        });
        const context = (0, group_session_model_context_1.buildExactGroupSessionModelContextPacket)(task.group_id, { groupSessionId: task.group_session_id || task.groupSessionId || "" }).rendered;
        const sharedFilesContext = mergeCoordinatorDocumentContexts(buildCoordinatorSharedFilesContext(ctx, group), buildTaskSourceDocumentsContext(task));
        let coordinatorResult = await runGroupOrchestrator({
            group,
            message,
            context,
            source: "task",
            groupSessionId: groupSessionIdForTask(task),
            sharedFilesContext,
            providerSwitchRequests: buildTaskProviderSwitchRequests(task),
            traceId: task.trace_id || task.traceId || "",
            taskId: task.id,
            executionId: task.execution_id || task.executionId || task.id,
            extraInstructions: requirementEpicExecutionBoundary(task),
        });
        let coordinatorOutput = coordinatorResult.content;
        const coordinatorTranscript = [coordinatorOutput].filter(Boolean);
        let coordinatorMessageId = "m" + Date.now().toString(36) + "coord";
        let planAssignments = alignRequirementEpicAssignments(task, normalizePlanAssignments(coordinatorResult.assignments || []));
        let dispatchPolicy = coordinatorResult.dispatchPolicy || null;
        let workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "任务队列协调");
        appendGroupMessage(task.group_id, {
            id: coordinatorMessageId,
            role: "assistant",
            agent: coordinatorProject,
            content: buildUserCoordinationAcknowledgement(task, planAssignments),
            technical_content: coordinatorOutput,
            timestamp: new Date().toISOString(),
            task_id: task.id,
            assignments: planAssignments,
            executionOrder: coordinatorResult.executionOrder || "parallel",
            runtime: coordinatorResult.runtime || "",
            dispatchPolicy,
            coordinationPlan: coordinatorResult.coordinationPlan || null,
            workflow: workflowMeta,
        });
        appendTaskTimelineEvent(task.id, { type: "coordinator_plan", title: "主 Agent 生成计划", detail: compactMemoryText(coordinatorOutput, 500), status: planAssignments.length ? "ok" : "warn", phase: "planning", agent: coordinatorProject, data: { assignments: planAssignments, dispatchPolicy, coordinationPlan: coordinatorResult.coordinationPlan || null } });
        const semanticReasoning = coordinatorResult.analysis?.reasoning || {};
        const taskReasoning = normalizeAgentReasoningState(task.reasoning_loop, task.business_goal || task.title || "");
        updateReasoningPlan(taskReasoning, coordinatorResult.coordinationPlan?.phases || [], "群聊主 Agent 基于语义拆分形成协调计划");
        captureReasoningFacts(taskReasoning, "coordinator_semantic_analysis", {
            known_facts: semanticReasoning.knownFacts || [],
            assumptions_to_verify: semanticReasoning.assumptionsToVerify || [],
            dependency_rationale: semanticReasoning.dependencyRationale || [],
            assignments: planAssignments.map((item) => ({ project: item.project, dependsOn: item.dependsOn || "", reason: item.reason || "" })),
            replan_triggers: semanticReasoning.replanTriggers || [],
        });
        explainReasoningDecision(taskReasoning, dispatchPolicy?.action || (planAssignments.length ? "delegate" : "hold"), dispatchPolicy?.reason || "群聊主 Agent 根据语义分析、依赖与风险形成当前安排");
        (semanticReasoning.verificationAssertions || []).forEach((label, index) => setReasoningAssertion(taskReasoning, { id: `semantic_${index + 1}`, label, kind: "semantic_acceptance", status: "pending", reason: "群聊主 Agent 在派发前定义" }));
        if ((semanticReasoning.assumptionsToVerify || []).length)
            recordReasoningDeviation(taskReasoning, "unverified_assumptions", `待 Worker 核验：${semanticReasoning.assumptionsToVerify.join("；")}`, "info");
        updateTask(task.id, { reasoning_loop: taskReasoning, coordination_plan: coordinatorResult.coordinationPlan || null });
        appendTaskTimelineEvent(task.id, { type: "reasoning_plan", title: `主 Agent 推理计划 v${taskReasoning.plan_version}`, detail: `事实 ${(semanticReasoning.knownFacts || []).length} · 假设 ${(semanticReasoning.assumptionsToVerify || []).length} · 断言 ${(semanticReasoning.verificationAssertions || []).length}`, status: "ok", phase: "planning", agent: coordinatorProject, data: { plan_version: taskReasoning.plan_version, reasoning: semanticReasoning } });
        let validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
        if (task.workflow_type === "daily_dev" && validMentions.length === 0 && getRoutableMembers(group).length > 0) {
            const repairResult = runCodedGroupOrchestrator({
                group,
                message,
                context,
                source: "daily-dev-dispatch-repair",
                sharedFilesContext,
                providerSwitchRequests: buildTaskProviderSwitchRequests(task),
            });
            const repairMentions = getCoordinatorActionMentions(repairResult, group, coordinatorProject);
            const repairAssignments = normalizePlanAssignments(repairResult.assignments || []);
            if (repairMentions.length > 0 || repairAssignments.length > 0) {
                const repairOutput = [
                    "主 Agent 派发修复：业务开发任务缺少可执行 assignments，系统已启用规则协调器补充派发计划。",
                    "",
                    repairResult.content || "",
                ].join("\n").trim();
                coordinatorResult = {
                    ...repairResult,
                    content: repairOutput,
                    runtime: repairResult.runtime || "coded-dispatch-repair",
                };
                coordinatorOutput = repairOutput;
                coordinatorTranscript.push(repairOutput);
                coordinatorMessageId = "m" + Date.now().toString(36) + "repair";
                planAssignments = alignRequirementEpicAssignments(task, normalizePlanAssignments(coordinatorResult.assignments || []));
                dispatchPolicy = coordinatorResult.dispatchPolicy || null;
                workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "daily_dev 派发修复");
                appendGroupMessage(task.group_id, {
                    id: coordinatorMessageId,
                    role: "assistant",
                    agent: coordinatorProject,
                    content: coordinatorOutput,
                    timestamp: new Date().toISOString(),
                    task_id: task.id,
                    assignments: planAssignments,
                    executionOrder: coordinatorResult.executionOrder || "parallel",
                    runtime: coordinatorResult.runtime || "",
                    dispatchPolicy,
                    coordinationPlan: coordinatorResult.coordinationPlan || null,
                    workflow: workflowMeta,
                });
                validMentions = repairMentions.length > 0
                    ? repairMentions
                    : getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
                addTaskLog(task.id, "info", `daily_dev 主 Agent 空派发已自动补派: ${validMentions.map(m => m.mention).join(", ") || planAssignments.map((item) => `@${item.project}`).join(", ")}`);
                updateGroupMemory(task.group_id, {
                    groupSessionId: groupSessionIdForTask(task),
                    currentPhase: "dispatching",
                    decision: "daily_dev 空派发计划修复",
                    reason: "主 Agent 未产生可执行派发，已启用规则协调器补充派发计划",
                    nextAction: "子 Agent 按补派计划执行并返回结构化结果说明",
                });
            }
            else {
                addTaskLog(task.id, "warning", "daily_dev 主 Agent 空派发修复未产生可执行目标");
            }
        }
        const sandboxRehearsal = buildTaskSandboxRehearsal(task, group, coordinatorResult, planAssignments, validMentions, dispatchPolicy);
        const tasksForRehearsal = loadTasks();
        const rehearsalTaskIndex = tasksForRehearsal.findIndex((item) => item.id === task.id);
        if (rehearsalTaskIndex >= 0) {
            tasksForRehearsal[rehearsalTaskIndex].workflow_meta = { ...(tasksForRehearsal[rehearsalTaskIndex].workflow_meta || {}), sandbox_rehearsal: sandboxRehearsal };
            tasksForRehearsal[rehearsalTaskIndex].sandbox_rehearsal = sandboxRehearsal;
            saveTasks(tasksForRehearsal);
        }
        appendTaskTimelineEvent(task.id, { type: "sandbox_rehearsal", title: "任务前沙盘演练", detail: `${sandboxRehearsal.impact_scope.areas.join("、")}；${sandboxRehearsal.agent_plan.length} 个 Agent 计划`, status: sandboxRehearsal.status === "ready" ? "ok" : "warn", phase: "planning", agent: coordinatorProject, data: sandboxRehearsal });
        appendGroupMessage(task.group_id, {
            id: "m" + Date.now().toString(36) + "sandbox",
            role: "assistant",
            agent: coordinatorProject,
            type: "task_rehearsal",
            content: [`任务前沙盘演练：${sandboxRehearsal.title}`, `影响范围：${sandboxRehearsal.impact_scope.areas.join("、")}`, `计划派发：${sandboxRehearsal.agent_plan.map((item) => item.project).join("、") || "待确认"}`, `门禁：${sandboxRehearsal.gate_requirements.join("、")}`].join("\n"),
            timestamp: new Date().toISOString(),
            task_id: task.id,
            taskRehearsal: sandboxRehearsal,
            workflow: buildWorkflowMeta("planning", "任务前沙盘演练"),
        });
        let crossOutputs = [];
        let reviewResult = null;
        if (validMentions.length > 0) {
            addTaskLog(task.id, "info", `检测到群聊派发目标: ${validMentions.map(m => m.mention).join(", ")}`);
            const dispatchReplayRepairBindings = validMentions.flatMap((mention) => summarizeReplayRepairTimelineBindingsForEvent(mention, {
                taskId: task.id,
                executionId: task.id ? `${task.id}--${mention.targetName || mention.project || ""}` : "",
            }));
            const dispatchTimelineEvent = appendTaskTimelineEvent(task.id, {
                type: "dispatch",
                title: "主 Agent 派发子 Agent",
                detail: validMentions.map(m => m.mention).join(", "),
                status: "active",
                phase: "dispatching",
                agent: coordinatorProject,
                data: {
                    mentions: validMentions,
                    replay_repair_dispatch_bindings: dispatchReplayRepairBindings,
                },
            });
            for (const mention of validMentions) {
                recordReplayRepairTimelineBindingsForMention(task.group_id, mention, {
                    taskId: task.id,
                    timelineEvent: dispatchTimelineEvent,
                    timelineEventType: "dispatch",
                    executionId: task.id ? `${task.id}--${mention.targetName || mention.project || ""}` : "",
                });
            }
            for (const mention of validMentions) {
                recordAgentRuntimeLifecycle({
                    scope: "group",
                    traceId: task.trace_id,
                    taskId: task.id,
                    groupId: task.group_id,
                    agent: coordinatorProject,
                    action: "dispatch_worker",
                    phase: "act",
                    risk: "agent",
                    target: mention.targetName || mention.mention || "",
                    status: "running",
                    message: `主 Agent 派发子 Agent：${mention.targetName || mention.mention || ""}`,
                    data: {
                        mention,
                        worker_context_packet: mention.worker_context_packet || null,
                        execution_order: coordinatorResult.executionOrder || "parallel",
                    },
                });
            }
            crossOutputs = await processCrossAgents(task.group_id, group, coordinatorProject, coordinatorOutput, validMentions, configs, ctx, null, 0, new Set(), coordinatorResult.executionOrder || "parallel", coordinatorMessageId, task.id);
            reviewResult = await runCoordinatorReviewLoop({
                groupId: task.group_id,
                group,
                userMessage: message,
                coordinatorOutput,
                crossOutputs,
                configs,
                ctx,
                executionOrder: coordinatorResult.executionOrder || "parallel",
                taskId: task.id,
                groupSessionId: task.group_session_id || task.groupSessionId || "",
            });
            appendTaskTimelineEvent(task.id, { type: "coordinator_review", title: "主 Agent 验收", detail: compactMemoryText(reviewResult?.content || reviewResult?.detail || "", 500), status: reviewResult?.status === "done" ? "ok" : "warn", phase: "reviewing", agent: coordinatorProject, data: { review: reviewResult?.review || reviewResult } });
        }
        const outputText = [...coordinatorTranscript, ...crossOutputs, reviewResult?.content || ""].filter(Boolean).join("\n\n---\n\n");
        return getGroupTaskExecutionStatus(reviewResult, coordinatorResult, outputText, task);
    }
    else {
        if (task.requires_independent_review === true) {
            throw new Error("需要 TestAgent 独立复核的任务必须先交给真实群聊主 Agent；禁止项目直派或全局 Agent 直接发起复核");
        }
        const config = configs.find(c => c.name === task.target_project);
        if (!config)
            throw new Error("项目配置不存在");
        appendTaskTimelineEvent(task.id, { type: "direct_task", title: "直接任务进入项目 Agent", detail: task.title || "", status: "active", phase: "dispatching", agent: task.target_project });
        recordAgentRuntimeLifecycle({
            scope: "worker",
            traceId: task.trace_id,
            taskId: task.id,
            groupId: task.group_id || "",
            agent: task.target_project,
            action: "dispatch_worker",
            phase: "act",
            risk: "agent",
            target: task.target_project,
            status: "running",
            message: "直接任务进入项目 Agent",
            data: { target_project: task.target_project, workflow_type: task.workflow_type || "" },
        });
        const info = getConfigInfo(config.path);
        let workDir = info[0]?.workDir;
        const agentType = info[0]?.agent || "claudecode";
        const toolContext = buildAgentToolContext(ctx, null, task.target_project, `${task.title || ""}\n${task.description || ""}\n${task.acceptance_criteria || ""}`);
        const preparedWorkDir = prepareChildAgentWorkDir(workDir, {
            mode: getChildAgentIsolationMode(null, task),
            taskId: task.id,
            agentName: task.target_project,
            sourceProject: "task-queue",
            failClosed: true,
        });
        workDir = preparedWorkDir.workDir;
        ensureExecution({ task, project: task.target_project, agent: task.target_project, workDir, executionId: task.id });
        claimTaskWorkItemForAgent(task.id, task.target_project, `${task.target_project} 已开始执行直接任务：${compactMemoryText(task.title, 180)}`);
        attachExecutionWorkspace(task.id, { ...preparedWorkDir, project: task.target_project, mode: preparedWorkDir.mode });
        if (!loadExecution(task.id)?.checkpointIds?.length) {
            try {
                createExecutionCheckpoint({ executionId: task.id, taskId: task.id, workDir, mode: preparedWorkDir.mode, label: "项目 Agent 开始执行前" });
            }
            catch (error) {
                addTaskLog(task.id, "warning", `无法创建任务前文件检查点：${error.message}`);
            }
        }
        const worktreeNotice = buildChildAgentWorktreeNotice(preparedWorkDir);
        let runtimeToolContext = prepareAgentRuntimeTools(task.group_id || "", task.target_project, workDir, agentType, toolContext.allowedTools, null, { taskId: task.id, task, toolAudit: toolContext.toolAudit, authorizationReadiness: toolContext.authorizationReadiness });
        if (runtimeToolContext.dispatchBlocked) {
            const blockedReceipt = runtimeToolDispatchBlockedReceipt(task.target_project, runtimeToolContext);
            addTaskLog(task.id, "warning", blockedReceipt.summary);
            appendTaskTimelineEvent(task.id, {
                type: "runtime_tool_dispatch_blocked",
                title: `${task.target_project} 工具授权派发被阻断`,
                detail: blockedReceipt.summary,
                status: "warn",
                phase: "dispatching",
                agent: task.target_project,
                data: { receipt: blockedReceipt, runtime_tool_sync: compactRuntimeToolAudit(runtimeToolContext.audit) },
            });
            updateTaskWorkItemFromReceipt(task.id, task.target_project, blockedReceipt, null, blockedReceipt.summary);
            transitionExecution(task.id, "failed", blockedReceipt.summary, {
                receipt: blockedReceipt,
                data: { runtime_tool_sync: compactRuntimeToolAudit(runtimeToolContext.audit), runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate },
            });
            return {
                status: "blocked",
                detail: blockedReceipt.summary,
                receipt: blockedReceipt,
                runtimeToolSync: compactRuntimeToolAudit(runtimeToolContext.audit),
                executionKernel: { executionId: task.id, green: { level: "none", pass: false, reason: blockedReceipt.summary } },
            };
        }
        if (preparedWorkDir.mode === "worktree") {
            addTaskLog(task.id, "info", `直接任务已启用 worktree 隔离：${preparedWorkDir.worktreePath}（${preparedWorkDir.worktreeBranch || "branch unknown"}）`);
        }
        else if (preparedWorkDir.requestedMode === "worktree" && preparedWorkDir.warning) {
            addTaskLog(task.id, "warning", `直接任务请求 worktree 隔离但已降级共享目录：${preparedWorkDir.warning}`);
        }
        const directSandboxRehearsal = buildTaskSandboxRehearsal(task, { members: [{ project: task.target_project }] }, { content: task.description || task.title, dispatchPolicy: { action: "delegate", reason: "直接任务派发给目标项目 Agent" } }, [{ project: task.target_project, task: task.description || task.title, reason: "直接任务" }], [{ targetName: task.target_project, mention: `@${task.target_project}` }], { action: "delegate", reason: "直接任务派发给目标项目 Agent" });
        const directTasksForRehearsal = loadTasks();
        const directRehearsalTaskIndex = directTasksForRehearsal.findIndex((item) => item.id === task.id);
        if (directRehearsalTaskIndex >= 0) {
            directTasksForRehearsal[directRehearsalTaskIndex].workflow_meta = { ...(directTasksForRehearsal[directRehearsalTaskIndex].workflow_meta || {}), sandbox_rehearsal: directSandboxRehearsal };
            directTasksForRehearsal[directRehearsalTaskIndex].sandbox_rehearsal = directSandboxRehearsal;
            saveTasks(directTasksForRehearsal);
        }
        appendTaskTimelineEvent(task.id, { type: "sandbox_rehearsal", title: "任务前沙盘演练", detail: `${directSandboxRehearsal.impact_scope.areas.join("、")}；直接派发给 ${task.target_project}`, status: "ok", phase: "planning", agent: task.target_project, data: directSandboxRehearsal });
        const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
        const directTaskText = buildChildAgentTaskText(`${task.title}\n${task.description || ""}`, task);
        let directTaskSession = openTaskAgentSession({
            scopeId: task.id,
            taskId: task.id,
            groupId: task.group_id || "",
            project: task.target_project,
            agentType,
        });
        markGroupCoordinationDependencyStarted(task, preparedWorkDir, directTaskSession);
        const directMemoryDeliveryAttemptSequence = directTaskSession ? directTaskSession.turnCount + 1 : 0;
        const directGroupSessionId = String(task.group_session_id || task.groupSessionId || "");
        let directInvocationEdge = task.workflow_type !== "agent_coordination_dependency" && task.group_id && directTaskSession && directGroupSessionId.startsWith("gcs_") ? prepareTaskAgentInvocationEdge({
            groupId: task.group_id,
            groupSessionId: directGroupSessionId,
            taskId: task.id,
            targetProject: task.target_project,
            taskAgentSessionId: directTaskSession.id,
            nativeSessionId: directTaskSession.nativeSessionId || "",
            executionId: task.id,
            attemptSequence: directMemoryDeliveryAttemptSequence,
            providerAttempt: 1,
            invocationKind: directMemoryDeliveryAttemptSequence > 1 ? "resume" : "spawn",
            branchKind: "main",
        }) : null;
        let directGroupMemoryContext = task.group_id && task.workflow_type !== "agent_coordination_dependency"
            ? await buildAgentMemoryContextBundleWithManifestSelection(task.group_id, task.target_project, directTaskText, {
                taskId: task.id,
                traceId: task.trace_id || "",
                agentType,
                taskAgentSessionId: directTaskSession?.id || "",
                nativeSessionId: directTaskSession?.nativeSessionId || "",
                taskAgentSessionTurn: directMemoryDeliveryAttemptSequence,
                modelContextWindow: directTaskSession?.modelContextWindow || 0,
                groupSessionId: task.group_session_id || task.groupSessionId || "",
                requireExactGroupSession: true,
                task,
                ...taskAgentInvocationMemoryOptions(directInvocationEdge),
            })
            : null;
        const directMemoryReceiptGroup = task.group_id ? loadGroups().find((item) => item.id === task.group_id) || null : null;
        const directMemoryReceiptCoordinatorProject = directMemoryReceiptGroup ? String(getCoordinatorMember(directMemoryReceiptGroup)?.project || "") : "";
        const directMemoryConsumptionChallenge = directGroupMemoryContext
            && directTaskSession
            && task.target_project !== directMemoryReceiptCoordinatorProject
            ? createMemoryContextConsumptionChallenge({
                groupId: task.group_id || "",
                groupSessionId: directGroupSessionId,
                taskId: task.id,
                executionId: task.id,
                project: task.target_project,
                taskAgentSessionId: directTaskSession.id,
                attempt: directMemoryDeliveryAttemptSequence,
            })
            : null;
        if (directMemoryConsumptionChallenge) {
            directGroupMemoryContext = attachMemoryContextConsumptionChallenge(directGroupMemoryContext, directMemoryConsumptionChallenge);
            runtimeToolContext = prepareAgentRuntimeTools(task.group_id || "", task.target_project, workDir, agentType, toolContext.allowedTools, null, {
                taskId: task.id,
                task,
                toolAudit: toolContext.toolAudit,
                authorizationReadiness: toolContext.authorizationReadiness,
                groupSessionId: directGroupSessionId,
                taskAgentSessionId: directTaskSession.id,
                nativeSessionId: directTaskSession.nativeSessionId || "",
                memoryReceiptChallenge: directMemoryConsumptionChallenge,
                memoryReceiptFile: memoryContextConsumptionReceiptFile(directMemoryConsumptionChallenge.challenge_id),
            });
            assertRuntimeToolDispatchReady(task.target_project, runtimeToolContext);
        }
        const directContinuation = buildWorkerContinuationHandoff(task, task.target_project);
        const directWorkerHandoff = buildChildAgentWorkerHandoff(task.target_project, directTaskText, {
            source: task.global_mission_id ? "全局主 Agent 子任务" : "任务队列",
            reason: task.mission_target?.reason || "",
            acceptance: task.acceptance_criteria || "",
            requires_code_changes: task.requires_code_changes,
            verification_hints: buildProjectVerificationHints(task.target_project, workDir),
            work_dir: workDir,
            agent_type: agentType,
            model: directTaskSession?.modelId || "",
            task_id: task.id,
            task_agent_session_id: directTaskSession?.id || "",
            trace_id: task.trace_id || "",
            task,
            group: task.group_id ? loadGroups().find((item) => item.id === task.group_id) || null : null,
            worker_context_packet: task.mission_handoff?.worker_context_packet || null,
            dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
                ? task.mission_handoff.global_mission.depends_on.map((ref) => ({ project: ref, reason: "全局任务前置依赖" }))
                : [],
            analysis: {
                constraints: Array.isArray(task.mission_handoff?.done_criteria) ? task.mission_handoff.done_criteria : [],
            },
            memory: directGroupMemoryContext,
            continuation: directContinuation,
        });
        addTaskLog(task.id, "info", `${task.target_project} 直接任务工作单已补齐：目标、范围、验收、ACK 和回执要求已打包`);
        appendTaskTimelineEvent(task.id, {
            type: "worker_handoff_ready",
            title: `${task.target_project} 工作单已补齐`,
            detail: "任务队列直接派发也已补齐目标、范围、边界、验收、ACK 和回执要求",
            status: "ok",
            phase: "dispatching",
            agent: task.target_project,
            data: { worker_handoff: summarizeWorkerHandoffForUser(directWorkerHandoff), worker_context_packet: directWorkerHandoff.worker_context_packet },
        });
        recordAgentRuntimeLifecycle({
            scope: task.group_id ? "group" : "worker",
            traceId: task.trace_id || "",
            taskId: task.id,
            groupId: task.group_id || "",
            agent: "task-queue",
            action: "dispatch_worker",
            phase: "handoff",
            risk: "agent",
            target: task.target_project,
            status: "planned",
            message: `${task.target_project} 直接任务自包含工作单已生成`,
            data: {
                worker_handoff: summarizeWorkerHandoffForUser(directWorkerHandoff),
                worker_context_packet: directWorkerHandoff.worker_context_packet,
                source: "task-queue",
            },
        });
        const developmentContract = buildChildAgentDevelopmentContract(task.target_project, directTaskText, {
            source: task.global_mission_id ? "全局主 Agent 子任务" : "任务队列",
            reason: task.mission_target?.reason || "",
            acceptance: task.acceptance_criteria || "",
            requires_code_changes: task.requires_code_changes,
            verification_hints: buildProjectVerificationHints(task.target_project, workDir),
            work_dir: workDir,
            agent_type: agentType,
            task_id: task.id,
            trace_id: task.trace_id || "",
            task,
            group: task.group_id ? loadGroups().find((item) => item.id === task.group_id) || null : null,
            worker_context_packet: task.mission_handoff?.worker_context_packet || null,
            dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
                ? task.mission_handoff.global_mission.depends_on.map((ref) => ({ project: ref, reason: "全局任务前置依赖" }))
                : [],
            memory: directGroupMemoryContext,
            continuation: directContinuation,
            handoff: directWorkerHandoff,
        });
        const message = `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${developmentContract}\n\n${worktreeNotice}\n\n📋 执行任务：${task.title}\n${directTaskText}

${requirementEpicExecutionBoundary(task)}

请直接完成开发工作。完成后必须追加 CCM_AGENT_RECEIPT 结构化回执，格式如下：
\`\`\`json
{
  "ccm_receipt": true,
  "status": "done | partial | blocked | failed | needs_info",
  "summary": "一句话说明实际完成/确认了什么",
  "actions": ["实际执行的动作"],
  "filesChanged": ["修改过的文件路径；没有修改填空数组"],
  "verification": ["已经运行或建议运行的验证；不能编造未运行的测试"],
  "contractChanges": ["如涉及接口/字段/schema 变化，改为对象数组；没有填空数组"],
  "consumedInjectionIds": ["如果工作单包含 injection_id，填已消费的 injection_id；没有填空数组"],
  "memoryUsed": ["本轮实际使用的记忆/知识库/历史结论；未使用填空数组"],
  "memoryIgnored": ["没有使用或无法使用记忆的原因；没有填空数组"],
  "typedMemoryUsage": [{"relPath": "本轮 WorkerContextPacket 中 surfaced MEMORY.md 的相对路径", "usageState": "used | verified | ignored", "currentSourceVerified": false, "currentSourceEvidence": {"evidenceType": "file_read", "sourcePath": "本轮实际重读的项目内文件路径", "sourceChecksum": "该文件当前内容的完整 SHA-256；只有服务端复算匹配后 verified 才成立"}, "conflictDetected": false, "conflictKind": "removed | renamed | behavior_changed | resource_changed；没有冲突填空字符串", "recommendedMemoryAction": "update | remove；没有冲突填空字符串", "conflictReason": "当前源码与记忆冲突的具体原因；没有冲突填空字符串", "replacementMemory": "update 时填写候选新规则；否则填空字符串", "reason": "逐条说明采用、核验或忽略原因；每个 surfaced relPath 都要覆盖；没有真实当前源文件证明时不得声明 verified；子 Agent 只能提交冲突候选，不能直接修改长期记忆"}],
  "apiMicrocompactUsage": [{"planChecksum": "API microcompact edit plan checksum；没有填空字符串", "applyPlanChecksum": "native apply plan checksum；没有填空字符串", "requestPatchChecksum": "native_applied 时必须填写；没有填空字符串", "usageState": "native_applied | advisory | ignored | not_supported", "nativeApplied": false, "advisoryOnly": true, "taskAgentSessionId": "本轮 task_agent_session_id；没有填空字符串", "nativeSessionId": "本轮 native_session_id；没有填空字符串", "memoryContextSnapshotId": "本轮 memory_context_snapshot_id；没有填空字符串", "memoryContextSnapshotChecksum": "本轮 memory_context_snapshot_checksum；没有填空字符串", "reason": "说明是否原生应用 API context-management；第三方 CLI 不支持时写 advisory 或 not_supported"}],
  "apiMicrocompactNativeApplyRequestTelemetry": [{"planChecksum": "native_applied 的 API microcompact edit plan checksum；未 native_applied 时填空字符串", "applyPlanChecksum": "native apply plan checksum；未 native_applied 时填空字符串", "requestPatchChecksum": "真实合并 provider requestPatch 后的 checksum；未 native_applied 时填空字符串", "requestBodyChecksum": "发给 provider 的请求体稳定 checksum；不要粘贴完整请求体", "hasContextManagement": true, "betaHeaders": ["context-management-2025-06-27"], "provider": "anthropic | openai-compatible | other", "model": "实际请求模型；未知填空字符串", "endpoint": "provider endpoint；可脱敏", "method": "POST", "responseStatus": 200, "requestId": "provider request id / trace id；没有填空字符串", "taskAgentSessionId": "必须与 apiMicrocompactUsage 一致", "nativeSessionId": "必须与 apiMicrocompactUsage 一致", "memoryContextSnapshotId": "必须与 apiMicrocompactUsage 一致", "memoryContextSnapshotChecksum": "必须与 apiMicrocompactUsage 一致", "sentAt": "ISO 时间；真实发送 API 请求的时间", "telemetrySource": "native_request_adapter | agent_receipt；强证明必须是 fresh native_request_adapter，agent_receipt 只能作为弱证据"}],
  "postCompactCandidateUsage": [{"gateId": "压缩后重注入 gate id；没有填空字符串", "candidateId": "candidate_id", "usageState": "used | ignored | verified", "reason": "使用、忽略或核验原因"}],
  "blockers": ["阻塞点；没有填空数组"],
  "needs": ["还需要用户或其他 Agent 补充的内容；没有填空数组"]
}
\`\`\``;
        let directMemoryContextSnapshot = null;
        if (directTaskSession) {
            const bound = bindTaskAgentMemoryContextSnapshot(directTaskSession.id, {
                taskId: task.id,
                groupId: task.group_id || "",
                project: task.target_project,
                agentType,
                nativeSessionId: directTaskSession.nativeSessionId || "",
                turn: directMemoryDeliveryAttemptSequence,
                executionId: task.id,
                traceId: task.trace_id || "",
                workerContextPacket: directWorkerHandoff.worker_context_packet,
                workerHandoff: directWorkerHandoff,
                memoryContext: directGroupMemoryContext,
                renderedHandoff: developmentContract,
                renderedPrompt: message,
                renderedMemoryContext: String(directGroupMemoryContext?.rendered_text || ""),
                requireMemoryPromptInjectionProof: !!directGroupMemoryContext,
                requireTrustedMemoryPromptEnvelope: !!directGroupMemoryContext,
                requireProviderMemoryChannelAcknowledgement: !!directGroupMemoryContext,
                requireMemoryContextConsumptionReceipt: !!directMemoryConsumptionChallenge,
                memoryContextConsumptionChallenge: directMemoryConsumptionChallenge,
                runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
                invocationLineage: directInvocationEdge,
            });
            directMemoryContextSnapshot = bound?.snapshot || null;
        }
        let output = "";
        let fileChanges = null;
        let receipt = null;
        let invokedSkills = [];
        const directPendingCapacityGate = directTaskSession?.capacityDowngradeGate || null;
        const directCapacityRevalidationPreparation = directTaskSession
            ? prepareTaskAgentSessionCapacityRevalidation(directTaskSession.id, directWorkerHandoff.worker_context_packet)
            : null;
        if (directTaskSession?.capacityRevalidationRequired === true && directCapacityRevalidationPreparation?.prepared !== true) {
            throw new Error(`模型容量下降后的上下文重建未通过：${directCapacityRevalidationPreparation?.reason || "packet_capacity_not_revalidated"}`);
        }
        if (directCapacityRevalidationPreparation?.session)
            directTaskSession = directCapacityRevalidationPreparation.session;
        let directCapacityRevalidationCommitted = directCapacityRevalidationPreparation?.required !== true;
        let directNativeSessionId = "";
        let directNativeContinuationEvidence = null;
        let directNativeModelCapabilityReceipt = null;
        let directNativeModelCapabilityRecord = null;
        let directModelCapabilityRefreshOutcome = null;
        let directProviderMemoryChannelEvidence = null;
        let directMemoryContextConsumptionReceipt = null;
        let directMemoryContextConsumptionRecovery = null;
        let directProviderUsage = null;
        let directSessionSucceeded = true;
        let directSessionError = "";
        if (directTaskSession?.turnCount > 0) {
            const detail = `${task.target_project} 正在恢复任务级原生会话，从上一轮失败点继续返工`;
            addTaskLog(task.id, "info", detail);
            appendTaskTimelineEvent(task.id, {
                type: "direct_project_native_session_resume",
                title: `${task.target_project} 继续同一会话返工`,
                detail,
                status: "active",
                phase: "reworking",
                agent: task.target_project,
                data: { task_agent_session_id: directTaskSession.id, turn: directTaskSession.turnCount + 1, resume_mode: directTaskSession.resumeMode },
            });
        }
        const directTypedMemoryDispatchAdmission = admitChildTypedMemoryDelivery(directGroupMemoryContext, {
            workerContextPacket: directWorkerHandoff.worker_context_packet,
            renderedPrompt: message,
            attemptSequence: directMemoryDeliveryAttemptSequence,
        });
        if (directTypedMemoryDispatchAdmission.admitted !== true) {
            throw new Error(`类型化记忆 dispatch-time consume 门禁未通过：${directTypedMemoryDispatchAdmission.reason || "unknown"}`);
        }
        const directTypedMemoryDispatchStartedAt = new Date().toISOString();
        const directTypedMemoryDispatchWal = createChildTypedMemoryDispatchWal(directTypedMemoryDispatchAdmission, {
            memoryBundle: directGroupMemoryContext,
            workerContextPacket: directWorkerHandoff.worker_context_packet,
            renderedPrompt: message,
            snapshotRenderedPrompt: message,
            executionId: task.id,
            capacityRevalidationProof: directCapacityRevalidationPreparation?.proof || null,
        });
        let directTypedMemoryDispatchWalRecord = markChildTypedMemoryDispatchStarted(directTypedMemoryDispatchWal, {
            dispatchStartedAt: directTypedMemoryDispatchStartedAt,
            transport: agentType,
        });
        if (!directCapacityRevalidationCommitted && directTaskSession && directCapacityRevalidationPreparation?.proof && directTypedMemoryDispatchWalRecord) {
            const capacityCommit = commitTaskAgentSessionCapacityRevalidation(directTaskSession.id, directCapacityRevalidationPreparation.proof, {
                typedMemoryDispatchWalRecordChecksum: directTypedMemoryDispatchWalRecord.record_checksum,
                typedMemoryDispatchWalState: directTypedMemoryDispatchWalRecord.state,
            });
            if (capacityCommit?.acknowledged !== true)
                throw new Error(`模型容量下降门禁提交失败：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
            directTaskSession = capacityCommit.session || directTaskSession;
            directCapacityRevalidationCommitted = true;
            if (directPendingCapacityGate) {
                addTaskLog(task.id, "info", `${task.target_project} 已按下降后的模型容量重建并压缩上下文包，且已绑定 durable dispatch`);
                appendTaskTimelineEvent(task.id, {
                    type: "task_agent_capacity_revalidated",
                    title: `${task.target_project} 容量降级上下文已重建`,
                    detail: `${directPendingCapacityGate.previous_context_window || 0} -> ${directPendingCapacityGate.current_context_window || 0} token`,
                    status: "ok",
                    phase: "dispatching",
                    agent: task.target_project,
                    data: {
                        capacity_downgrade_gate: directPendingCapacityGate,
                        capacity_revalidation_proof: directCapacityRevalidationPreparation.proof,
                        capacity_revalidation_commit_receipt: capacityCommit.receipt,
                        worker_context_packet_id: directWorkerHandoff.worker_context_packet?.packet_id || "",
                    },
                });
            }
        }
        if (directInvocationEdge) {
            directInvocationEdge = bindTaskAgentInvocationContext(directInvocationEdge, {
                workerContextPacketId: directWorkerHandoff.worker_context_packet?.packet_id || "",
                memoryContextSnapshotId: directMemoryContextSnapshot?.snapshot_id || "",
                memoryContextSnapshotChecksum: directMemoryContextSnapshot?.checksum || "",
                groupSessionMemoryBinding: directMemoryContextSnapshot?.context?.group_session_memory_binding || null,
                summaryCapsuleChecksum: directWorkerHandoff.worker_context_packet?.post_turn_summary_delivery_capsule?.capsule_checksum || "",
                typedMemoryDeliveryCapsule: directWorkerHandoff.worker_context_packet?.typed_memory_delivery_capsule || null,
                renderedPrompt: message,
            });
            directInvocationEdge = dispatchTaskAgentInvocationEdge(directInvocationEdge, {
                transport: agentType,
                dispatchedAt: directTypedMemoryDispatchStartedAt,
                dispatchTicketId: directTypedMemoryDispatchAdmission.ticket?.ticket_id || "",
                dispatchTicketChecksum: directTypedMemoryDispatchAdmission.ticket?.ticket_checksum || "",
                typedMemoryDispatchWalFile: directTypedMemoryDispatchWalRecord?.file || "",
                typedMemoryDispatchWalRecordChecksum: directTypedMemoryDispatchWalRecord?.record_checksum || "",
                typedMemoryDispatchWalState: directTypedMemoryDispatchWalRecord?.state || "",
                platformDispatchId: directTypedMemoryDispatchWalRecord?.platform_dispatch_id || "",
            });
        }
        let directRunnerRequestId = "";
        let directRunnerStarted = false;
        output = await ctx.callAgent(task.target_project, message, workDir, agentType, 300000, {
            groupId: task.group_id || "",
            allowedTools: toolContext.allowedTools,
            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
            runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
            taskId: task.id,
            executionId: task.id,
            model: directTaskSession?.modelId || "",
            taskAgentSessionId: directTaskSession?.id || "",
            trustedMemoryProviderChannelRequired: directMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
            trustedMemoryProviderAcknowledgementRequired: directMemoryContextSnapshot?.context?.provider_memory_channel_acknowledgement_required === true,
            memoryContextConsumptionReceiptRequired: directMemoryContextSnapshot?.context?.memory_context_consumption_receipt_required === true,
            memoryContextConsumptionChallenge: directMemoryContextSnapshot?.context?.memory_context_consumption_challenge || null,
            trustedMemoryEnvelopeChecksum: directMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_checksum || "",
            trustedMemoryEnvelopeSourceChecksum: directMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_source_checksum || "",
            ...taskAgentSessionLifecycleRunnerOptions(directMemoryContextSnapshot),
            agentSession: directTaskSession ? getTaskAgentSessionOptions(directTaskSession) : null,
            durableDispatch: directTypedMemoryDispatchAdmission.required === true
                || directCapacityRevalidationPreparation?.required === true
                || directMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
            onRunnerRequestCreated: (requestId) => {
                directRunnerRequestId = String(requestId || "");
                if (directTypedMemoryDispatchWalRecord && directRunnerRequestId) {
                    directTypedMemoryDispatchWalRecord = markChildTypedMemoryDispatchStarted({ required: true, record: directTypedMemoryDispatchWalRecord }, {
                        dispatchStartedAt: directTypedMemoryDispatchStartedAt,
                        transport: directRunnerRequestId.startsWith("adr_") ? "server_direct_cli" : "external_runner",
                        runnerRequestId: directRunnerRequestId,
                    });
                }
                if (directInvocationEdge && directRunnerRequestId) {
                    directInvocationEdge = bindTaskAgentInvocationRunnerRequest(directInvocationEdge, directRunnerRequestId, {
                        typedMemoryDispatchWalRecordChecksum: directTypedMemoryDispatchWalRecord?.record_checksum || "",
                        typedMemoryDispatchWalState: directTypedMemoryDispatchWalRecord?.state || "",
                    });
                }
            },
            onDone: (opts) => {
                directNativeSessionId = String(opts?.nativeSessionId || "");
                directNativeContinuationEvidence = opts?.nativeContinuationEvidence || null;
                directNativeModelCapabilityReceipt = opts?.nativeModelCapabilityReceipt || null;
                directNativeModelCapabilityRecord = opts?.nativeModelCapabilityRecord || null;
                directModelCapabilityRefreshOutcome = opts?.modelCapabilityRefreshOutcome || null;
                if (opts?.providerMemoryChannelEvidence?.required === true)
                    directProviderMemoryChannelEvidence = opts.providerMemoryChannelEvidence;
                if (opts?.memoryContextConsumptionReceipt)
                    directMemoryContextConsumptionReceipt = opts.memoryContextConsumptionReceipt;
                if (opts?.memoryContextConsumptionRecovery)
                    directMemoryContextConsumptionRecovery = opts.memoryContextConsumptionRecovery;
                directProviderUsage = opts?.usage || null;
                directSessionSucceeded = opts?.isError !== true;
                directSessionError = String(opts?.error || opts?.message || "");
                directRunnerRequestId = String(opts?.runnerRequestId || directRunnerRequestId || "");
                directRunnerStarted = opts?.runnerStarted === true;
            },
        });
        if (!directCapacityRevalidationCommitted && directTaskSession && directCapacityRevalidationPreparation?.proof) {
            const capacityCommit = commitTaskAgentSessionCapacityRevalidation(directTaskSession.id, directCapacityRevalidationPreparation.proof, {
                runnerRequestId: directRunnerRequestId,
                runnerStarted: directRunnerStarted,
            });
            if (capacityCommit?.acknowledged !== true)
                throw new Error(`模型容量下降门禁缺少 durable dispatch 证明：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
            directTaskSession = capacityCommit.session || directTaskSession;
            directCapacityRevalidationCommitted = true;
            if (directPendingCapacityGate) {
                addTaskLog(task.id, "info", `${task.target_project} 已按下降后的模型容量重建并压缩上下文包，且已绑定 runner return`);
                appendTaskTimelineEvent(task.id, {
                    type: "task_agent_capacity_revalidated",
                    title: `${task.target_project} 容量降级上下文已重建`,
                    detail: `${directPendingCapacityGate.previous_context_window || 0} -> ${directPendingCapacityGate.current_context_window || 0} token`,
                    status: "ok",
                    phase: "executing",
                    agent: task.target_project,
                    data: {
                        capacity_downgrade_gate: directPendingCapacityGate,
                        capacity_revalidation_proof: directCapacityRevalidationPreparation.proof,
                        capacity_revalidation_commit_receipt: capacityCommit.receipt,
                        worker_context_packet_id: directWorkerHandoff.worker_context_packet?.packet_id || "",
                    },
                });
            }
        }
        if (directInvocationEdge) {
            const directFailed = !directSessionSucceeded || checkTaskFailure(output);
            directInvocationEdge = completeTaskAgentInvocationEdge(directInvocationEdge, {
                success: !directFailed,
                nativeSessionId: directNativeSessionId || directTaskSession?.nativeSessionId || "",
                nativeContinuationEvidence: directNativeContinuationEvidence,
                nativeModelCapabilityReceipt: directNativeModelCapabilityReceipt,
                nativeModelCapabilityRecord: directNativeModelCapabilityRecord,
                provider: agentType,
                runnerRequestId: directRunnerRequestId,
                output,
                error: directSessionError,
                reason: directFailed ? "execution_failed" : "execution_completed",
            });
        }
        let directMemoryContextDelivery = null;
        if (directTypedMemoryDispatchWalRecord && directRunnerStarted) {
            directTypedMemoryDispatchWalRecord = markChildTypedMemoryRunnerReturned(directTypedMemoryDispatchWalRecord, {
                runnerRequestId: directRunnerRequestId,
                runnerSucceeded: directSessionSucceeded,
                output,
            });
        }
        fileChanges = workDir ? ctx.getFileChanges(task.target_project, changeSnapshot) : null;
        if (directTaskSession && directMemoryContextSnapshot) {
            const delivery = recordTaskAgentMemoryContextDelivery(directTaskSession.id, {
                snapshotId: directMemoryContextSnapshot.snapshot_id || directTaskSession.memoryContextSnapshotId || "",
                renderedPrompt: message,
                snapshotRenderedPrompt: message,
                executionId: task.id,
                traceId: task.trace_id || "",
                runtime: agentType,
                attempt: directMemoryDeliveryAttemptSequence,
                nativeSessionId: directNativeSessionId || directTaskSession.nativeSessionId || "",
                runnerRequestId: directRunnerRequestId,
                dispatched: directRunnerStarted,
                executionSucceeded: directSessionSucceeded,
                output,
                fileChanges,
                nativeContinuationEvidence: directNativeContinuationEvidence,
                providerMemoryChannelEvidence: directProviderMemoryChannelEvidence,
                memoryContextConsumptionReceipt: directMemoryContextConsumptionReceipt,
                memoryContextConsumptionRecovery: directMemoryContextConsumptionRecovery,
                providerUsage: directProviderUsage,
                runnerStarted: directRunnerStarted,
                invocationEdgeId: directInvocationEdge?.invocation_edge_id || "",
            });
            directMemoryContextDelivery = delivery?.receipt || null;
            if (directTypedMemoryDispatchWalRecord && directMemoryContextDelivery?.delivered === true) {
                directTypedMemoryDispatchWalRecord = markChildTypedMemoryRunnerReturned(directTypedMemoryDispatchWalRecord, {
                    runnerRequestId: directRunnerRequestId,
                    runnerSucceeded: directSessionSucceeded,
                    output,
                    deliveryReceipt: directMemoryContextDelivery,
                });
            }
        }
        if (directInvocationEdge) {
            directInvocationEdge = bindTaskAgentInvocationMemoryDelivery(directInvocationEdge, {
                deliveryReceipt: directMemoryContextDelivery,
            });
        }
        const directTypedMemoryDeliveryCommit = commitChildTypedMemoryDelivery(directGroupMemoryContext, {
            workerContextPacket: directWorkerHandoff.worker_context_packet,
            dispatchEvidence: {
                renderedPrompt: message,
                deliveryReceipt: directMemoryContextDelivery,
                dispatchTicket: directTypedMemoryDispatchAdmission.ticket,
                dispatchStartedAt: directTypedMemoryDispatchStartedAt,
                dispatched: directRunnerStarted,
                executionReturned: directRunnerStarted,
            },
        });
        if (directTypedMemoryDeliveryCommit.committed === true) {
            addTaskLog(task.id, "info", `${task.target_project} 类型化记忆投递租约已提交：${directTypedMemoryDeliveryCommit.lease?.leaseId || "unknown"}`);
        }
        if (directTypedMemoryDispatchWalRecord && directRunnerStarted && directMemoryContextDelivery?.delivered === true) {
            directTypedMemoryDispatchWalRecord = markChildTypedMemoryDispatchCommitted(directTypedMemoryDispatchWalRecord, directTypedMemoryDeliveryCommit);
        }
        if (directTaskSession) {
            directTaskSession = recordTaskAgentSessionTurn(directTaskSession.id, {
                nativeSessionId: directNativeSessionId,
                nativeContinuationEvidence: directNativeContinuationEvidence,
                nativeContinuationUnverified: directNativeContinuationEvidence?.nativeResumeRequested === true
                    && directNativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
                success: directSessionSucceeded,
                error: directSessionError || (!directSessionSucceeded ? output : ""),
                nativeModelCapabilityRecord: directNativeModelCapabilityRecord,
                runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
            }) || directTaskSession;
            addTaskLog(task.id, directSessionSucceeded ? "info" : "warning", `${task.target_project} 直接任务会话轮次已记录：${directTaskSession.agentType} turn=${directTaskSession.turnCount}${directTaskSession.nativeSessionId ? "，已捕获原生 session ID" : "，使用 scratchpad 续跑保护"}`);
        }
        if (directNativeModelCapabilityRecord?.recorded === true) {
            const capabilityEntry = directNativeModelCapabilityRecord.entry || {};
            addTaskLog(task.id, "info", `${task.target_project} 原生模型容量已验证：${capabilityEntry.provider || agentType}/${capabilityEntry.model || "default"} context=${capabilityEntry.contextWindow || 0}`);
            appendTaskTimelineEvent(task.id, {
                type: "native_model_capability_recorded",
                title: `${task.target_project} 模型容量回执已记录`,
                detail: `${capabilityEntry.provider || agentType}/${capabilityEntry.model || "default"} · ${capabilityEntry.contextWindow || 0} token`,
                status: "ok",
                phase: "executing",
                agent: task.target_project,
                data: { model_capability_entry: capabilityEntry, validation: directNativeModelCapabilityRecord.validation || null },
            });
        }
        if (directModelCapabilityRefreshOutcome?.recorded === true) {
            appendTaskTimelineEvent(task.id, {
                type: "model_capability_refresh_outcome",
                title: `${task.target_project} 模型容量刷新结果`,
                detail: String(directModelCapabilityRefreshOutcome.outcome || "unknown"),
                status: directModelCapabilityRefreshOutcome.outcome === "refreshed" ? "ok" : "warn",
                phase: "executing",
                agent: task.target_project,
                data: { model_capability_refresh_outcome: directModelCapabilityRefreshOutcome },
            });
        }
        fileChanges = workDir ? ctx.getFileChanges(task.target_project, changeSnapshot) : fileChanges;
        const detectedSkillUse = attachInvokedSkillsToReceipt(extractAgentReceipt(output, task.target_project), output, toolContext.allowedTools, runtimeToolContext.audit);
        receipt = detectedSkillUse.receipt;
        invokedSkills = detectedSkillUse.invoked;
        if (receipt)
            updateTaskWorkItemFromReceipt(task.id, task.target_project, receipt, fileChanges, output, { ctx });
        const coordination = {
            coordinationPlan: {
                strategy: "direct_project_execution",
                phases: [
                    { id: "implement", label: "项目执行", status: "completed" },
                    { id: "project_delivery", label: "项目结果整理", status: "completed" },
                ],
                targets: [{ project: task.target_project, objective: compactMemoryText(task?.business_goal || task?.description || task?.title || "完成项目任务", 1200) }],
            },
            assignments: [{ project: task.target_project, task: task?.business_goal || task?.description || task?.title || "完成项目任务", reason: "普通项目直派任务，不包含独立复核。" }],
            executionOrder: "sequential",
        };
        const result = getTaskExecutionFromReceipt(output, receipt, {
            fileChanges,
            runtimeToolSync: compactRuntimeToolAudit(runtimeToolContext.audit),
            invokedSkills,
            ...coordination,
        });
        const green = evaluateGreenContract({ receipt, fileChanges, requiresChanges: taskRequiresCodeChanges(task), requiresVerification: task.requires_verification !== false, requiredLevel: "project" });
        transitionExecution(task.id, result.status === "failed" ? "failed" : "reviewing", result.status === "done" ? "项目 Agent 已交付，进入验收" : result.detail, {
            green,
            receipt,
            fileChanges,
            runnerVerification: extractRunnerVerificationEvidence(output),
            outputPreview: output,
            data: { runtime_tool_sync: compactRuntimeToolAudit(runtimeToolContext.audit), invoked_skills: invokedSkills },
        });
        return { ...result, ...coordination, runtimeToolSync: compactRuntimeToolAudit(runtimeToolContext.audit), invokedSkills, executionKernel: { executionId: task.id, green } };
    }
}
//# sourceMappingURL=collaboration-task-executor.js.map