import * as path from "path";
import * as crypto from "crypto";
import type { TestAgentReport } from "../../test-agent/types";
import { buildDependencyOutputPacket } from "./collaboration-cross-agents-helpers";
import { executeMentionJobTryA } from "./collaboration-cross-agents-part-02";
import { runGroupMemoryAutoCompactionNow } from "./group-memory-context-part-01";
import { buildChildParentSessionContextPacket } from "./group-session-model-context";
import { getGroupMessages } from "./storage";
import { loadGroupMemory } from "./group-memory-storage";
import { buildProjectMemoryPacket } from "../../projects/memory";
import { buildThirdPartyMemoryBootstrap, createThirdPartyMemorySnapshot } from "../../integrations/third-party-memory-snapshot";
import { extractGroupSessionMemoryBinding } from "../../tasks/agent-sessions-shared-part-02";

export type CrossAgentEnv = {
  deps: any;
  groupId: string;
  group: any;
  sourceProject: string;
  output: string;
  configs: any[];
  ctx: any;
  streamRes: any;
  depth: number;
  seenMentions: Set<string>;
  executionOrder: string;
  planMessageId: string;
  taskId: string;
  sourceTask: any;
  completedOutputsByAgent: Map<string, string[]>;
  processCrossAgents: typeof import("./collaboration-cross-agents").processCrossAgents;
  _locals?: any;
};


export async function executeMentionJob(mention: any, env: CrossAgentEnv): Promise<string[]> {
  const { deps, groupId, group, sourceProject, output, configs, ctx, streamRes, depth, seenMentions, executionOrder, planMessageId, taskId, sourceTask, completedOutputsByAgent, processCrossAgents } = env;
  const {
    addGroupLog, addTaskLog, admitChildTypedMemoryDelivery, appendAgentQaTrace,
    appendGroupMessage, appendTaskTimelineEvent, attachExecutionWorkspace, attachInvokedSkillsToReceipt,
    attachMemoryContextConsumptionChallenge, attachTaskAgentFinalDispatchPayloadGate, bindTaskAgentInvocationContext, bindTaskAgentInvocationMemoryDelivery,
    bindTaskAgentInvocationRunnerRequest, bindTaskAgentMemoryContextSnapshot, buildAckPreflightReview, buildAgentMemoryContextBundleWithManifestSelection,
    buildAgentMemoryPacket, buildAgentQaProtocolInstructions, buildAgentToolContext, buildChildAgentDevelopmentContract,
    buildChildAgentTaskText, buildChildAgentWorkerHandoff, buildChildAgentWorktreeNotice, buildCollaborationConflictPlan,
    buildCoordinatorCollaborationInstructions, buildCoordinatorReworkContinuationFallback, buildCoordinatorSharedFilesContext, buildFinalWorkerDispatchPayloadGate,
    buildGroupContextPacket, buildMemberCollaborationInstructions, buildNativeTestAgentPlanBlockedReceipt, buildNativeTestAgentReceipt,
    buildNativeTestAgentReviewSummary, buildNativeTestAgentRuntimeToolContext, buildPostReviewSpotCheckSummary, buildProjectExecutionBrief,
    buildProjectVerificationHints, buildRuntimeRecoveryCandidates, buildRuntimeRecoveryPrompt, buildTaskPreflightReasoning,
    buildTaskProviderSwitchRequests, buildWorkerContinuationHandoff, buildWorkflowMeta, checkTaskFailure,
    claimTaskWorkItemForAgent, commitChildTypedMemoryDelivery, commitTaskAgentSessionCapacityRevalidation, compactMemoryText,
    compactRuntimeToolAudit, completeTaskAgentInvocationEdge, coordinatorReworkRouteNeedsFreshVerifier, coordinatorReworkRouteRequiresStop,
    coordinatorReworkRouteUsesVerifier, createChildTypedMemoryDispatchWal, createExecutionCheckpoint, createMemoryContextConsumptionChallenge,
    dispatchTaskAgentInvocationEdge, emitAssignmentStatus, ensureExecution, escapeRegExp,
    evaluateAdvisoryPermissionBoundary, evaluateGreenContract, extractActionableMentions, extractAgentReceipt,
    extractRunnerVerificationEvidence, formatCollectedAgentOutput, formatNativeTestAgentOutput, formatNativeTestAgentPlanBlockedOutput,
    getAgentDependencyStateFromOutputs, getChildAgentIsolationMode, getCoordinatorActionMentions, getCoordinatorMember,
    getInitialWorkflowMeta, getMentionReworkRoute, getProjectAgentCapabilityProfile, getProjectExtraConfig,
    getReceiptAssignmentStatus, getRoutableMembers, getTaskAgentSessionOptions, getTaskById,
    getTestAgentHandoffPayload, getTestAgentHandoffProjectWorkDir, getTestAgentHandoffReviewSubject, getTestAgentHandoffWarnings,
    getWorkDirState, handleAgentQaRequests, inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker, isCoordinatorTestAgentName,
    isProviderPromptTooLongFailure, loadExecution, markChildTypedMemoryDispatchCommitted, markChildTypedMemoryDispatchStarted,
    markChildTypedMemoryRunnerReturned, memoryContextConsumptionReceiptFile, normalizeAgentRuntimeId, normalizeMentionTask,
    normalizePlanAssignments, openTaskAgentSession, prepareAgentRuntimeTools, prepareChildAgentWorkDir,
    prepareTaskAgentInvocationEdge, prepareTaskAgentSessionCapacityRevalidation, recordAgentRuntimeLifecycle, recordReplayRepairTimelineBindingsForMention,
    recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome, recordTaskAgentMemoryContextDelivery, recordTaskAgentSessionTurn, recordWorkerContextProviderSwitchExecutionReceiptForCoordinator,
    recordWorkerContextProviderSwitchSessionBindingForCoordinator, recoverFinalWorkerDispatchPayload, renderGroupPostCompactDynamicContextDelta, renderGroupPostCompactInvokedSkillAttachments,
    renderGroupPostCompactPlanAttachment, renderMemoryContextForWorker, resolveMemberRuntime, runGroupOrchestrator,
    runMainAgentPostReviewSpotCheck, runTestAgentCliJob, runtimeToolDispatchBlockedMessage, runtimeToolDispatchBlockedReceipt,
    runtimeToolSnapshotFromAudit, shouldSwitchRuntime, stopWrongDirectionWorkerForCoordinatorRoute, stripAgentQaProtocolBlocks,
    summarizeNativeTestAgentExecutionPlan, summarizeReplayRepairTimelineBindingsForEvent, summarizeTaskAgentMemoryContextSnapshot, summarizeWorkerHandoffForUser,
    taskAgentInvocationMemoryOptions, taskAgentSessionLifecycleRunnerOptions, taskRequiresCodeChanges, taskRequiresVerification,
    transitionExecution, uniqueStrings, updateGroupMemory, updateGroupTaskInlineStatus,
    updateTask, updateTaskWorkItemFromReceipt, validateTestAgentHandoffRegisteredWorkDirs, verifyFinalWorkerDispatchPayloadGate,
    writeSse
  } = deps;

    const outputs: string[] = [];
    const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
    const targetName = typeof mention === "string" ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr) : mention.targetName;
    const coordinatorProject = getCoordinatorMember(group).project;
    if (targetName === sourceProject || targetName === coordinatorProject) {
      if (taskId) addTaskLog(taskId, "info", `忽略不可执行的自派发目标：${sourceProject} -> ${targetName}`);
      return outputs;
    }
    const failChildDispatch = (reason: string, needs: string[] = []) => {
      const summary = String(reason || "子 Agent 派发失败");
      const content = `❌ 子 Agent 派发失败：@${targetName}\n${summary}`;
      const receipt = {
        agent: targetName,
        status: "failed",
        summary,
        actions: [],
        filesChanged: [],
        verification: [],
        blockers: [summary],
        needs,
      };
      emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "failed", summary);
      if (taskId) addTaskLog(taskId, "error", `子 Agent 派发失败：${targetName}；${summary}`);
      if (taskId) appendTaskTimelineEvent(taskId, { type: "child_agent_failed", title: `子 Agent 派发失败：${targetName}`, detail: summary, status: "fail", phase: "dispatching", agent: targetName, data: { needs } });
      if (taskId) updateTaskWorkItemFromReceipt(taskId, targetName, receipt, null, summary);
      outputs.push(formatCollectedAgentOutput(targetName, content, receipt));
      updateGroupMemory(groupId, {
        currentPhase: "needs_rework",
        blocked: { project: targetName, reason: summary, needs },
        workerLedger: {
          taskId,
          project: targetName,
          status: "failed",
          receiptStatus: "failed",
          summary,
          blockers: [summary],
          needs,
        },
        nextAction: `主 Agent 复盘 ${targetName} 派发阻塞并决定是否调整配置或询问用户`,
      });
      appendGroupMessage(groupId, {
        id: "m" + Date.now().toString(36) + "preflight" + crypto.randomBytes(2).toString("hex"),
        role: "assistant",
        agent: "system",
        content,
        timestamp: new Date().toISOString(),
        task_id: taskId || undefined,
      });
      writeSse(streamRes, { type: "status", text: content, agent: targetName });
      return outputs;
    };

    const nativeTestAgentMention = typeof mention !== "string"
      && isCoordinatorTestAgentName(targetName)
      && !!(mention.testAgentHandoff || mention.test_agent_handoff || mention.testAgentWorkOrder || mention.test_agent_work_order);
    const targetMember = group.members.find((m: any) => m.project === targetName && m.project !== sourceProject);
    if (!targetMember && !nativeTestAgentMention) {
      return failChildDispatch("未找到群聊成员", ["检查主 Agent 生成的目标 Agent 名称是否已加入当前开发群聊"]);
    }

    const atRegex = new RegExp(`@${escapeRegExp(targetName)}\\s+([^@]+?)(?=\\s*@|$)`, "is");
    const atMatch = output.match(atRegex);
    let atMessage = typeof mention === "string" ? (atMatch ? atMatch[1].trim() : "") : mention.message;

    if (!atMessage || atMessage.length < 5) {
      const lines = output.split("\n");
      const relevantLines = [];
      let found = false;
      for (const line of lines) {
        if (line.includes(`@${targetName}`)) {
          found = true;
          relevantLines.push(line.replace(`@${targetName}`, "").trim());
        } else if (found && line.trim() && !line.startsWith("@")) {
          relevantLines.push(line.trim());
        } else if (found && line.includes("@")) {
          break;
        }
      }
      atMessage = relevantLines.join("\n").trim() || output.substring(0, 500);
    }
    const implementationMessage = atMessage;
    const requiresAckPreflight = !!sourceTask
      && sourceTask.workflow_type === "daily_dev"
      && (taskRequiresCodeChanges(sourceTask) || taskRequiresVerification(sourceTask))
      && sourceTask.delivery_summary?.ack_gate_passed !== true
      && !/^【ACK-only 前置接单确认】/.test(atMessage.trim());
    if (requiresAckPreflight) {
      atMessage = [
        "【ACK-only 前置接单确认】",
        "主 Agent 当前只要求你先返回接单 ACK，不允许开始实现、编辑文件、运行破坏性命令或宣称完成。",
        "",
        "原始工作单如下，先理解但不要执行：",
        atMessage,
        "",
        "请只回复 CCM_AGENT_RECEIPT，并在 receipt.ack 中包含：",
        "- understoodGoal：你理解的业务目标",
        "- plannedScope：你计划负责的项目范围",
        "- forbiddenScope：你不会越权触碰的范围",
        "- verificationPlan：ACK 通过后你会执行的验证计划",
        "- unclear：仍需澄清的问题；没有则空数组",
        "",
        "ACK gate 通过后，主 Agent 会复用原任务、原 Trace、原 native session / scratchpad 续跑实现阶段。",
      ].join("\n");
      if (taskId) {
        addTaskLog(taskId, "info", `${targetName} 进入 ACK-only 前置接单确认；ACK 未通过前不派发实现阶段`);
        appendTaskTimelineEvent(taskId, {
          type: "ack_preflight_dispatch",
          title: `${targetName} ACK 前置接单`,
          detail: "ACK gate 未通过，本轮只允许返回接单确认",
          status: "active",
          phase: "intake",
          agent: targetName,
          data: { ack_gate_passed: false, original_message_preview: compactMemoryText(typeof mention === "string" ? output : mention.message, 600) },
        });
      }
      recordAgentRuntimeLifecycle({
        scope: "group",
        traceId: sourceTask?.trace_id || "",
        taskId,
        groupId,
        agent: sourceProject,
        action: "ack_preflight_dispatch",
        phase: "pre_dispatch",
        risk: "agent",
        target: targetName,
        status: "blocked",
        message: "ACK gate 未通过，本轮只派发 ACK-only 接单确认",
        data: { targetName, ack_only: true },
      });
    }
    const taskKey = `${sourceProject}->${targetName}:${normalizeMentionTask(atMessage)}`;
    if (seenMentions.has(taskKey)) {
      addGroupLog(groupId, "info", "collaboration", `跳过重复协作: ${sourceProject} -> ${targetName}`, { task: atMessage.substring(0, 160) });
      return outputs;
    }
    seenMentions.add(taskKey);

    let tWorkDir = process.cwd();
    let tAgentType = "claudecode";
    const testAgentHandoff = typeof mention === "string" ? null : mention.testAgentHandoff || mention.test_agent_handoff || null;
    const legacyTestAgentWorkOrder = typeof mention === "string" ? null : mention.testAgentWorkOrder || mention.test_agent_work_order || testAgentHandoff?.work_order || null;
    const testAgentHandoffPayload = getTestAgentHandoffPayload(testAgentHandoff, legacyTestAgentWorkOrder);
    const testAgentHandoffWarnings = getTestAgentHandoffWarnings(testAgentHandoffPayload);
    const nativeTestAgentDispatch = !!testAgentHandoffPayload && isCoordinatorTestAgentName(targetName);
    const testAgentWorkDirPolicy = nativeTestAgentDispatch
      ? validateTestAgentHandoffRegisteredWorkDirs(testAgentHandoffPayload, group, configs)
      : { valid: true, allowedWorkDirs: [] as string[], invalid: [] as string[] };
    const runtime = nativeTestAgentDispatch ? null : resolveMemberRuntime(targetName, group, configs);
    const testAgentProjectWorkDir = nativeTestAgentDispatch
      ? getTestAgentHandoffProjectWorkDir(testAgentHandoffPayload)
      : "";
    if (!nativeTestAgentDispatch && !runtime?.workDir) {
      return failChildDispatch("项目配置不存在或未绑定运行时", [
        `在项目管理中为 ${targetName} 配置项目路径和 Agent 类型`,
      ]);
    }
    if (nativeTestAgentDispatch && !testAgentProjectWorkDir) {
      return failChildDispatch("TestAgent 交接单缺少被复核项目目录", [
        "确认原实现 Agent 已配置项目路径",
        "重新派发独立复核，让主 Agent 生成带 workDir 的 TestAgent 交接单",
      ]);
    }
    if (nativeTestAgentDispatch && !testAgentWorkDirPolicy.valid) {
      return failChildDispatch("TestAgent 交接单项目目录未通过登记路径校验", [
        ...testAgentWorkDirPolicy.invalid,
        "重新读取群聊项目配置后生成 TestAgent 交接单",
      ]);
    }
    const workDirState = getWorkDirState(nativeTestAgentDispatch ? testAgentProjectWorkDir : (runtime?.workDir || ""));
    if (!workDirState.exists || !workDirState.writable) {
      const reason = `工作目录不可用：${workDirState.path || runtime.workDir}（${!workDirState.exists ? "不存在或不是目录" : "不可读写"}）`;
      return failChildDispatch(reason, [
        "检查项目路径是否存在",
        "确认 Web 服务或外部 Runner 对该目录有读写权限",
      ]);
    }
    tWorkDir = workDirState.path || (nativeTestAgentDispatch ? testAgentProjectWorkDir : (runtime?.workDir || ""));
    const taskRuntimeOverride = String(
      sourceTask?.runtime_overrides?.[targetName]
      || sourceTask?.runtime_overrides?.["*"]
      || sourceTask?.runtime_override
      || ""
    ).trim();
    const providerSwitchDecisionReceipt = typeof mention === "string"
      ? null
      : mention.provider_switch_decision_receipt
        || mention.providerSwitchDecisionReceipt
        || mention.worker_context_packet?.provider_switch_decision_receipt
        || mention.workerContextPacket?.providerSwitchDecisionReceipt
        || null;
    const approvedSwitchAgentType = providerSwitchDecisionReceipt?.schema === "ccm-provider-switch-decision-receipt-v1"
      && providerSwitchDecisionReceipt.valid === true
      && providerSwitchDecisionReceipt.status === "approved"
      ? String(providerSwitchDecisionReceipt.new_provider?.agent_type || providerSwitchDecisionReceipt.newProvider?.agentType || "").trim()
      : "";
    const providerSwitchAttempted = providerSwitchDecisionReceipt?.schema === "ccm-provider-switch-decision-receipt-v1";
    tAgentType = nativeTestAgentDispatch
      ? "test-agent-native"
      : (approvedSwitchAgentType || (!providerSwitchAttempted ? taskRuntimeOverride : "") || runtime?.agentType || targetMember.agent || "claudecode");
    const reworkRoute = getMentionReworkRoute(mention);
    const routeStopResult = coordinatorReworkRouteRequiresStop(reworkRoute)
      ? stopWrongDirectionWorkerForCoordinatorRoute({
          taskId,
          groupId,
          targetName,
          sourceProject,
          route: reworkRoute,
          mention,
          streamRes,
        })
      : null;
    let activeTaskSession = taskId && !nativeTestAgentDispatch ? openTaskAgentSession({
      scopeId: taskId,
      taskId,
      groupId,
      project: targetName,
      agentType: tAgentType,
    }) : null;
    const providerSwitchSessionBinding = approvedSwitchAgentType
      ? recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, {
        assignment_id: typeof mention === "string" ? "" : mention.assignmentId || mention.assignment_id || "",
        dispatch_key: typeof mention === "string" ? "" : mention.dispatchKey || mention.dispatch_key || "",
        worker_context_packet_id: typeof mention === "string" ? "" : mention.worker_context_packet?.packet_id || mention.workerContextPacket?.packet_id || "",
        provider_switch_decision_receipt: providerSwitchDecisionReceipt,
        project: targetName,
        agent_type: tAgentType,
        task_agent_session_id: activeTaskSession?.id || "",
        native_session_id: activeTaskSession?.nativeSessionId || "",
        execution_id: taskId ? `${taskId}--${targetName}` : "",
      })
      : null;
    if (approvedSwitchAgentType && providerSwitchSessionBinding?.status !== "bound") {
      return failChildDispatch("Provider switch child session binding failed", [
        ...(Array.isArray(providerSwitchSessionBinding?.gaps) ? providerSwitchSessionBinding.gaps : ["provider switch session binding missing"]),
        "重新生成 fresh provider reliability snapshot 和 provider switch decision receipt 后再派发",
      ]);
    }
    if (providerSwitchSessionBinding && typeof mention !== "string") {
      mention.provider_switch_session_binding = providerSwitchSessionBinding;
      mention.providerSwitchSessionBinding = providerSwitchSessionBinding;
    }
    if (activeTaskSession) {
      addTaskLog(taskId, "info", `${targetName} ${activeTaskSession.turnCount > 0 ? "恢复" : "创建"}任务级原生会话（${activeTaskSession.agentType}，第 ${activeTaskSession.turnCount + 1} 轮）`);
      appendTaskTimelineEvent(taskId, {
        type: activeTaskSession.turnCount > 0 ? "native_session_resume" : "native_session_open",
        title: `${targetName} ${activeTaskSession.turnCount > 0 ? "恢复原生会话" : "创建原生会话"}`,
        detail: `${activeTaskSession.agentType} / ${activeTaskSession.resumeMode}`,
        status: "active",
        phase: "executing",
        agent: targetName,
        data: { sessionRecordId: activeTaskSession.id, nativeSessionId: activeTaskSession.nativeSessionId, turn: activeTaskSession.turnCount + 1 },
      });
      writeSse(streamRes, { type: "native_session", taskId, agent: targetName, session: { project: targetName, agentType: activeTaskSession.agentType, mode: activeTaskSession.resumeMode, turn: activeTaskSession.turnCount + 1, resumed: activeTaskSession.turnCount > 0 } });
      if (sourceTask) updateGroupTaskInlineStatus(sourceTask, "in_progress", `${targetName} ${activeTaskSession.turnCount > 0 ? "恢复原生会话" : "创建原生会话"}`);
    }
    const preparedWorkDir = nativeTestAgentDispatch
      ? { mode: "shared" as const, requestedMode: "shared" as const, workDir: tWorkDir, originalWorkDir: tWorkDir }
      : prepareChildAgentWorkDir(tWorkDir, {
          mode: getChildAgentIsolationMode(group, sourceTask),
          taskId: taskId || "",
          agentName: mention.conflictWorkspaceKey || targetName,
          sourceProject,
          reuseKey: mention.conflictWorkspaceKey ? `${taskId || planMessageId}-${mention.conflictWorkspaceKey}` : "",
          failClosed: true,
        });
    tWorkDir = preparedWorkDir.workDir;
    const laneExecutionId = taskId ? `${taskId}--${targetName}` : "";
    if (laneExecutionId) {
      ensureExecution({ task: sourceTask || { id: taskId, title: atMessage, target_project: targetName }, project: targetName, agent: targetName, workDir: tWorkDir, executionId: laneExecutionId });
      attachExecutionWorkspace(laneExecutionId, {
        ...preparedWorkDir,
        project: targetName,
        mode: preparedWorkDir.mode,
        conflictGroup: mention.conflictGroup || "",
        conflictWorkspaceKey: mention.conflictWorkspaceKey || "",
        mergeOwner: mention.mergeOwner !== false,
      });
      if (!loadExecution(laneExecutionId)?.checkpointIds?.length) {
        try { createExecutionCheckpoint({ executionId: laneExecutionId, taskId, workDir: tWorkDir, mode: preparedWorkDir.mode, label: `${targetName} 开始执行前` }); }
        catch (error: any) { addTaskLog(taskId, "warning", `无法创建 ${targetName} 文件检查点：${error.message}`); }
      }
      transitionExecution(laneExecutionId, "spawning", `${targetName} 执行通道准备中`);
    }
    const worktreeNotice = buildChildAgentWorktreeNotice(preparedWorkDir);
   if (preparedWorkDir.mode === "worktree") {
      const text = `子 Agent ${targetName} 已启用 worktree 隔离：${preparedWorkDir.worktreePath}（${preparedWorkDir.worktreeBranch || "branch unknown"}）`;
      if (taskId) addTaskLog(taskId, "info", text);
      addGroupLog(groupId, "info", "worktree", text, {
        agent: targetName,
        worktreePath: preparedWorkDir.worktreePath,
        worktreeBranch: preparedWorkDir.worktreeBranch,
      });
    } else if (preparedWorkDir.requestedMode === "worktree" && preparedWorkDir.warning) {
      const text = `子 Agent ${targetName} 请求 worktree 隔离但已降级共享目录：${preparedWorkDir.warning}`;
      if (taskId) addTaskLog(taskId, "warning", text);
      addGroupLog(groupId, "warn", "worktree", text, {
        agent: targetName,
        originalWorkDir: preparedWorkDir.originalWorkDir,
      });
    }

    const continuationStrategy = typeof mention === "string" ? "" : String(mention.continuationStrategy || mention.continuation_strategy || "").trim();
    const continuationOf = typeof mention === "string" ? "" : String(mention.continuationOf || mention.continuation_of || "").trim();
    const isContinuation = !!continuationStrategy || (typeof mention !== "string" && !!mention.rework);
    const continuationUserLabel = reworkRoute?.user_label || reworkRoute?.userLabel || (coordinatorReworkRouteRequiresStop(reworkRoute) ? "停止旧方向后继续" : "同 Worker 续跑");
    const isFreshVerifierContinuation = coordinatorReworkRouteNeedsFreshVerifier(reworkRoute);
    const isVerifierContinuation = coordinatorReworkRouteUsesVerifier(reworkRoute);

    if (taskId) claimTaskWorkItemForAgent(taskId, targetName, `${targetName} 已开始执行：${compactMemoryText(atMessage, 180)}`);
    emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "running", "执行中");
    if (taskId) addTaskLog(taskId, "info", `子 Agent 开始执行：${sourceProject} -> ${targetName}${isContinuation ? `（${continuationUserLabel}）` : ""}；工作单：${compactMemoryText(atMessage, 220)}`);
    if (taskId) {
      const startReplayRepairBindings = summarizeReplayRepairTimelineBindingsForEvent(mention, {
        targetName,
        taskId,
        taskAgentSession: activeTaskSession,
        taskAgentSessionId: activeTaskSession?.id || "",
        nativeSessionId: activeTaskSession?.nativeSessionId || "",
        executionId: laneExecutionId,
      });
      const startTimelineEvent = appendTaskTimelineEvent(taskId, {
        type: isContinuation ? "child_agent_rework" : "child_agent_start",
        title: `${targetName} 开始执行`,
        detail: compactMemoryText(atMessage, 500),
        status: "active",
        phase: isContinuation ? "rework" : "executing",
        agent: targetName,
        data: { sourceProject, continuationStrategy, continuationOf, reworkRoute, routeStopResult, replay_repair_dispatch_bindings: startReplayRepairBindings },
      });
      recordReplayRepairTimelineBindingsForMention(groupId, mention, {
        targetName,
        taskId,
        taskAgentSession: activeTaskSession,
        taskAgentSessionId: activeTaskSession?.id || "",
        nativeSessionId: activeTaskSession?.nativeSessionId || "",
        executionId: laneExecutionId,
        timelineEvent: startTimelineEvent,
        timelineEventType: isContinuation ? "child_agent_rework" : "child_agent_start",
      });
    }

    appendGroupMessage(groupId, {
      id: "m" + Date.now().toString(36) + "fwd",
      role: "assistant", agent: sourceProject,
      content: `📤 → @${targetName}\n${atMessage}`,
      timestamp: new Date().toISOString(),
      task_id: taskId || undefined,
    });
    writeSse(streamRes, { type: "status", text: `📨 ${sourceProject} 已 @${targetName}，等待 ${targetName} 回复...`, agent: targetName });
    ctx.setAgentActivity(targetName, "working", `被 ${sourceProject} @ 协作`, { tab: "groups", groupId }, 330000);
    ctx.broadcastPetSpeech(targetName, { role: "status", text: `${sourceProject} @ 我协作，正在处理...`, source: "group" });

    const requestedGroupSessionId = String(sourceTask?.group_session_id || sourceTask?.groupSessionId || "");
    let parentSessionContext = buildChildParentSessionContextPacket(groupId, { groupSessionId: requestedGroupSessionId });
    let tContext = parentSessionContext.rendered;
    const childTaskText = buildChildAgentTaskText(atMessage, sourceTask);
    const memoryDeliveryAttemptSequence = activeTaskSession ? activeTaskSession.turnCount + 1 : 0;
    const activeGroupSessionId = String(parentSessionContext.groupSessionId || "");
    let activeInvocationEdge: any = activeTaskSession && activeGroupSessionId.startsWith("gcs_") ? prepareTaskAgentInvocationEdge({
      groupId,
      groupSessionId: activeGroupSessionId,
      taskId,
      targetProject: targetName,
      taskAgentSessionId: activeTaskSession.id,
      nativeSessionId: activeTaskSession.nativeSessionId || "",
      executionId: laneExecutionId,
      attemptSequence: memoryDeliveryAttemptSequence,
      providerAttempt: 1,
      invocationKind: memoryDeliveryAttemptSequence > 1 ? "resume" : "spawn",
      branchKind: "main",
    }) : null;
    const buildCurrentGroupMemoryBundle = () => buildAgentMemoryContextBundleWithManifestSelection(groupId, targetName, childTaskText, {
      taskId,
      traceId: sourceTask?.trace_id || "",
      executionId: laneExecutionId,
      taskAgentSessionId: activeTaskSession?.id || "",
      nativeSessionId: activeTaskSession?.nativeSessionId || "",
      taskAgentSessionTurn: memoryDeliveryAttemptSequence,
      agentType: activeTaskSession?.agentType || tAgentType,
      modelContextWindow: activeTaskSession?.modelContextWindow || 0,
      groupSessionId: activeGroupSessionId,
      requireExactGroupSession: true,
      dedicatedParentSessionContext: true,
      parentRunId: sourceTask?.parent_run_id || sourceTask?.global_mission_id || "",
      task: sourceTask,
      ...taskAgentInvocationMemoryOptions(activeInvocationEdge),
    });
    const renderCurrentMemoryPacket = (bundle: any) => {
      let packet = bundle.rendered_text || buildAgentMemoryPacket(groupId, targetName, childTaskText, { groupSessionId: activeGroupSessionId });
      for (const attachment of [
        bundle.invoked_skill_attachment_text || renderGroupPostCompactInvokedSkillAttachments(bundle),
        bundle.plan_attachment_text || renderGroupPostCompactPlanAttachment(bundle),
        bundle.dynamic_context_delta_text || renderGroupPostCompactDynamicContextDelta(bundle),
      ]) {
        const text = String(attachment || "").trim();
        if (text && !packet.includes(text)) packet = `${text}\n\n${packet}`;
      }
      return packet;
    };
    let groupMemoryBundle = await buildCurrentGroupMemoryBundle();
    let memoryPacket = renderCurrentMemoryPacket(groupMemoryBundle);
    const globalMissionHandoff = sourceTask?.mission_handoff || sourceTask?.missionHandoff || null;
    const globalMissionMemory = globalMissionHandoff ? [
      "[全局任务交接摘要]",
      globalMissionHandoff.global_mission?.mission_id ? `- 全局任务 ID：${globalMissionHandoff.global_mission.mission_id}` : "",
      globalMissionHandoff.user_goal ? `- 全局目标：${compactMemoryText(globalMissionHandoff.user_goal, 500)}` : "",
      Array.isArray(globalMissionHandoff.done_criteria) && globalMissionHandoff.done_criteria.length
        ? `- 全局完成判定：${globalMissionHandoff.done_criteria.slice(0, 4).join("；")}`
        : "",
      "- 你的回执将被群聊主 Agent 汇总后交给全局 Agent；必须保留文件、验证、风险和待确认事项。",
    ].filter(Boolean).join("\n") : "";
    let workerMemoryPacket = [memoryPacket, globalMissionMemory].filter(Boolean).join("\n\n");
    let authoritativeWorkerMemoryPacket = workerMemoryPacket;
    let workerMemoryContext = globalMissionMemory
      ? { schema: "ccm-worker-memory-context-v1", group_memory: groupMemoryBundle, global_mission_memory: globalMissionMemory }
      : groupMemoryBundle;
    const dependencyOutputPacket = buildDependencyOutputPacket(mention, targetName, executionOrder, completedOutputsByAgent, compactMemoryText);
    const continuationNotice = isContinuation ? [
      isVerifierContinuation ? "独立复验提示：" : "Worker 续跑提示：",
      isVerifierContinuation
        ? `- 本次任务是主 Agent 验收后的独立复验，执行 Agent：${targetName}；复核对象：${continuationOf || targetName}。`
        : `- 本次任务是主 Agent 验收后的同 Worker 续跑/返工，目标 Worker：${continuationOf || targetName}。`,
      `- 处理方式：${continuationUserLabel}。`,
      isVerifierContinuation
        ? isFreshVerifierContinuation
          ? "- 你需要用新的验证视角核对原实现者的交付证据、实际文件变化、验证记录和剩余风险；不要只复述原实现者结论。"
          : "- 你需要沿用原复核边界，但必须重新执行并核对最新证据；不要复用上一轮通过、失败或受阻结论。"
        : coordinatorReworkRouteRequiresStop(reworkRoute)
        ? "- 主 Agent 已检查并停止可能跑偏的旧方向；本轮必须以新工作单为准，不要继续旧方案。"
        : "- 你必须优先参考上方“协作上下文 / 你自己的 Worker 通知”，承接上一轮结果补齐缺口；不要重复已完成且有证据的工作。",
      "- 如果上一轮状态是 blocked/needs_info/failed，先处理阻塞或明确 needs；不能把未解决阻塞写成 done。",
    ].join("\n") : "";

    if (targetName === coordinatorProject) {
      const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
      const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group);
      const result = await runGroupOrchestrator({
        group,
        message: atMessage,
        context: tContext,
        source: sourceProject,
        sharedFilesContext,
        groupSessionId: activeGroupSessionId,
        providerSwitchRequests: buildTaskProviderSwitchRequests(sourceTask),
      });
      const planAssignments = normalizePlanAssignments((result as any).assignments || []);
      const dispatchPolicy = (result as any).dispatchPolicy || null;
      const workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "二级协调计划");
      outputs.push(formatCollectedAgentOutput(coordinatorProject, result.content, {
        agent: coordinatorProject,
        status: "done",
        summary: "主 Agent 已完成二级协调计划",
        actions: ["生成二级协作计划"],
        filesChanged: [],
        verification: ["已返回结构化 assignments"],
        blockers: [],
        needs: [],
      }));
      appendGroupMessage(groupId, {
        id: responseMessageId,
        role: "assistant",
        agent: coordinatorProject,
        content: result.content,
        timestamp: new Date().toISOString(),
        assignments: planAssignments,
        executionOrder: (result as any).executionOrder || "parallel",
        runtime: (result as any).runtime || "",
        dispatchPolicy,
        coordinationPlan: (result as any).coordinationPlan || null,
        workflow: workflowMeta,
        task_id: taskId || undefined,
      });
      writeSse(streamRes, {
        type: "agent_done",
        agent: coordinatorProject,
        text: result.content,
        messageId: responseMessageId,
        assignments: planAssignments,
        executionOrder: (result as any).executionOrder || "parallel",
        runtime: (result as any).runtime || "",
        dispatchPolicy,
        coordinationPlan: (result as any).coordinationPlan || null,
        workflow: workflowMeta,
      });
      emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "done", "已完成");

      const nestedMentions = getCoordinatorActionMentions(result, group, coordinatorProject);
      if (nestedMentions.length > 0) {
        const nestedOutputs = await processCrossAgents(
          groupId,
          group,
          coordinatorProject,
          result.content,
          nestedMentions,
          configs,
          ctx,
          streamRes,
          depth + 1,
          seenMentions,
          (result as any).executionOrder || "parallel",
          responseMessageId,
          taskId
        , deps);
        outputs.push(...nestedOutputs);
      }
      return outputs;
    }

    const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== targetName).join(", ");
    const collaborationInstructions = targetName === coordinatorProject
      ? buildCoordinatorCollaborationInstructions(getRoutableMembers(group).map((m: any) => m.project).join(", "))
      : buildMemberCollaborationInstructions(targetName, memberList);
    const advisoryOnly = !!mention.advisoryOnly;
    const projectMemoryForMcp = buildProjectMemoryPacket(targetName, { workDir: tWorkDir, query: childTaskText });
    const buildGroupThirdPartyMemorySnapshot = () => {
      if (!activeTaskSession || advisoryOnly || nativeTestAgentDispatch) return null;
      const sessionMessages = getGroupMessages(groupId, activeGroupSessionId)
        .filter((message: any) => !String(message?.content || "").startsWith("📤"));
      const visibleIds = new Set(parentSessionContext.visibleMessageIds || []);
      const visibleMessages = parentSessionContext.canonicalSummary
        ? sessionMessages.filter((message: any) => visibleIds.has(String(message?.id || message?.uuid || message?.messageId || "")))
        : sessionMessages;
      const archiveMessages = parentSessionContext.canonicalSummary
        ? sessionMessages.filter((message: any) => !visibleIds.has(String(message?.id || message?.uuid || message?.messageId || "")))
        : [];
      const groupMemory = loadGroupMemory(groupId, activeGroupSessionId);
      const nativeCompactCapacity = groupMemoryBundle?.providerNativeCompactSessionCapacity
        || groupMemoryBundle?.provider_native_compact_session_capacity
        || groupMemoryBundle?.compaction?.providerNativeCompactSessionCapacity
        || groupMemoryBundle?.compaction?.provider_native_compact_session_capacity
        || null;
      return createThirdPartyMemorySnapshot({
        bindingKind: "task",
        role: "project-child-agent",
        project: targetName,
        groupId,
        groupSessionId: activeGroupSessionId,
        taskId,
        taskAgentSessionId: activeTaskSession.id,
        provider: activeTaskSession.agentType || tAgentType,
        model: activeTaskSession.modelId || "",
        nativeSessionId: activeTaskSession.nativeSessionId || "",
        nativeGeneration: Number(nativeCompactCapacity?.generation || activeTaskSession.providerNativeCompactGeneration || activeTaskSession.provider_native_compact_generation || 1),
        boundaryGeneration: Number(parentSessionContext.boundaryGeneration || 0),
        mode: parentSessionContext.mode,
        summary: parentSessionContext.canonicalSummary ? groupMemory.conversationSummary : null,
        summarySource: parentSessionContext.summarySource || "",
        messages: visibleMessages,
        archiveMessages,
        memoryItems: [
          { kind: "group_memory", source: `${groupId}:${activeGroupSessionId}`, required: true, content: authoritativeWorkerMemoryPacket },
          { kind: "project_memory", source: targetName, required: true, content: projectMemoryForMcp },
        ],
        modelContextWindow: activeTaskSession.modelContextWindow || 0,
        autoCompactThreshold: activeTaskSession.autoCompactThreshold || 0,
        requestText: childTaskText,
      });
    };
    let thirdPartyMemorySnapshot: any = buildGroupThirdPartyMemorySnapshot();
    let memoryConsumptionChallenge = activeTaskSession && workerMemoryContext && !advisoryOnly && !nativeTestAgentDispatch
      ? createMemoryContextConsumptionChallenge({
          groupId,
          groupSessionId: activeGroupSessionId,
          taskId,
          executionId: laneExecutionId,
          project: targetName,
          taskAgentSessionId: activeTaskSession.id,
          attempt: memoryDeliveryAttemptSequence,
        })
      : null;
    if (memoryConsumptionChallenge) workerMemoryContext = attachMemoryContextConsumptionChallenge(workerMemoryContext, memoryConsumptionChallenge);
    const projectResourcesConfig = getProjectExtraConfig(targetName);
    const toolContext = nativeTestAgentDispatch
      ? { prompt: "\n[TestAgent 原生复核]\n- 当前请求由 CCM TestAgent 原生 runner 执行，只读取工作单并运行验证，不注入第三方 Agent 工具。\n", allowedTools: { mcp: [], skill: [] }, toolAudit: null, authorizationReadiness: null }
      : advisoryOnly
      ? { prompt: "\n[Agent 问答权限隔离]\n- 当前请求仅允许提供只读建议，不注入任何额外 MCP 或 Skill。\n", allowedTools: { mcp: [], skill: [] }, toolAudit: null, authorizationReadiness: null }
      : buildAgentToolContext(ctx, group, targetName, childTaskText);
    let runtimeToolContext = nativeTestAgentDispatch
      ? buildNativeTestAgentRuntimeToolContext(targetName, tWorkDir)
      : prepareAgentRuntimeTools(groupId, targetName, tWorkDir, tAgentType, toolContext.allowedTools, streamRes, {
        taskId,
        task: sourceTask,
        toolAudit: toolContext.toolAudit,
        authorizationReadiness: toolContext.authorizationReadiness,
        disableTaskBoundInternalMcp: advisoryOnly,
        internalAgentRole: targetName === coordinatorProject ? "group-main-agent" : "project-child-agent",
        groupSessionId: activeGroupSessionId,
        taskAgentSessionId: activeTaskSession?.id || "",
        nativeSessionId: activeTaskSession?.nativeSessionId || "",
        memoryReceiptChallenge: memoryConsumptionChallenge,
        memoryReceiptFile: memoryContextConsumptionReceiptFile(memoryConsumptionChallenge?.challenge_id),
        memorySnapshotId: thirdPartyMemorySnapshot?.id || "",
        memorySnapshotChecksum: thirdPartyMemorySnapshot?.checksum || "",
        boundaryGeneration: thirdPartyMemorySnapshot?.boundaryGeneration || 0,
        nativeGeneration: thirdPartyMemorySnapshot?.nativeGeneration || 0,
        requestText: childTaskText,
        memoryReadBudgetTokens: thirdPartyMemorySnapshot?.autoCompactThreshold || 0,
      });
    let thirdPartyMemoryMcpEnabled = !!thirdPartyMemorySnapshot
      && (runtimeToolContext.audit?.internal_mcp || []).some((item: any) => item.name === "ccm__knowledge_context" && item.state === "synced");
    const buildMemoryMcpReference = () => ({
      schema: "ccm-third-party-memory-mcp-reference-v1",
      snapshot_id: thirdPartyMemorySnapshot?.id || "",
      snapshot_checksum: thirdPartyMemorySnapshot?.checksum || "",
      mode: thirdPartyMemorySnapshot?.mode || "",
      delivery_mode: thirdPartyMemorySnapshot?.deliveryMode || "",
      required_hydration_tokens: Number(thirdPartyMemorySnapshot?.requiredHydrationTokens || 0),
      group_session_memory_binding: extractGroupSessionMemoryBinding(groupMemoryBundle),
      memory_consumption_challenge: memoryConsumptionChallenge,
      rendered_text: buildThirdPartyMemoryBootstrap(thirdPartyMemorySnapshot, memoryConsumptionChallenge),
    });
    if (thirdPartyMemoryMcpEnabled) workerMemoryContext = buildMemoryMcpReference();
    if (runtimeToolContext.dispatchBlocked) {
      const blockedReceipt = runtimeToolDispatchBlockedReceipt(targetName, runtimeToolContext);
      const blockedOutput = blockedReceipt.summary;
      outputs.push(formatCollectedAgentOutput(targetName, blockedOutput, blockedReceipt));
      if (taskId) {
        addTaskLog(taskId, "warning", blockedReceipt.summary);
        appendTaskTimelineEvent(taskId, {
          type: "runtime_tool_dispatch_blocked",
          title: `${targetName} 工具授权派发被阻断`,
          detail: blockedReceipt.summary,
          status: "warn",
          phase: "dispatching",
          agent: targetName,
          data: { receipt: blockedReceipt, runtime_tool_sync: compactRuntimeToolAudit(runtimeToolContext.audit) },
        });
        updateTaskWorkItemFromReceipt(taskId, targetName, blockedReceipt, null, blockedOutput);
      }
      writeSse(streamRes, { type: "agent_done", agent: targetName, text: blockedOutput, blocked: true, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
      return outputs;
    }
    const routeContinuationFallback = buildCoordinatorReworkContinuationFallback({ reworkRoute, mention, sourceTask, targetName, stopResult: routeStopResult });
    const workerContinuation = buildWorkerContinuationHandoff(sourceTask, targetName, {
      fallback: routeContinuationFallback || (isContinuation ? { continuationStrategy, continuationOf: continuationOf || targetName } : null),
    });
    const buildCurrentWorkerHandoff = (memoryContext: any) => buildChildAgentWorkerHandoff(targetName, childTaskText, {
      source: `${sourceProject} @ 协作`,
      reason: typeof mention === "string" ? "" : String(mention.reason || "").trim(),
      acceptance: sourceTask?.acceptance_criteria || "",
      requires_code_changes: nativeTestAgentDispatch ? false : (advisoryOnly ? false : (sourceTask ? taskRequiresCodeChanges(sourceTask) : true)),
      verification_hints: buildProjectVerificationHints(targetName, tWorkDir),
      work_dir: tWorkDir,
      agent_type: tAgentType,
      model: activeTaskSession?.modelId || "",
      task_id: taskId,
      task_agent_session_id: activeTaskSession?.id || "",
      trace_id: sourceTask?.trace_id || "",
      task: sourceTask,
      group,
      dependsOn: typeof mention === "string" ? "" : String(mention.dependsOn || "").trim(),
      worker_context_packet: typeof mention === "string" ? null : mention.worker_context_packet || null,
      memory: memoryContext,
      analysis: globalMissionHandoff ? {
        constraints: Array.isArray(globalMissionHandoff.done_criteria) ? globalMissionHandoff.done_criteria : [],
        documentFindings: Array.isArray(globalMissionHandoff.references?.document_findings) ? globalMissionHandoff.references.document_findings : [],
      } : undefined,
      advisoryOnly,
      continuation: workerContinuation,
    });
    let workerHandoff = buildCurrentWorkerHandoff(workerMemoryContext);
    workerMemoryPacket = renderMemoryContextForWorker(workerHandoff?.worker_context_packet?.memory || workerMemoryContext);
    const pendingCapacityDowngradeGate = activeTaskSession?.capacityDowngradeGate || null;
    let capacityRevalidationPreparation = activeTaskSession
      ? prepareTaskAgentSessionCapacityRevalidation(activeTaskSession.id, workerHandoff.worker_context_packet)
      : null;
    if (activeTaskSession?.capacityRevalidationRequired === true && capacityRevalidationPreparation?.prepared !== true) {
      return failChildDispatch("模型容量下降后的上下文重建未通过", [
        capacityRevalidationPreparation?.reason || "packet_capacity_not_revalidated",
        "重新按当前可信模型窗口构建并压缩 WorkerContextPacket",
      ]);
    }
    if (capacityRevalidationPreparation?.session) activeTaskSession = capacityRevalidationPreparation.session;
    let capacityRevalidationCommitted = capacityRevalidationPreparation?.required !== true;
    if (typeof mention !== "string") {
      mention.worker_context_packet = workerHandoff.worker_context_packet;
    }
    let workerHandoffSummary = summarizeWorkerHandoffForUser(workerHandoff);
    const testAgentHandoffPacket = testAgentHandoffPayload ? [
      "[TestAgent 原生独立复核交接单]",
      "- 这是主 Agent 为独立验证 Agent 生成的 ccm-test-agent-handoff-v1。",
      "- TestAgent CLI 会在进程边界内把 handoff 转成自己的 work order，主 Agent 不直接依赖 TestAgent 内部 builder。",
      "- 按 handoff 的 projects、acceptanceCriteria、requiredChecks 执行，只读复核原实现 Agent 的交付证据。",
      "- 若工作目录、命令或浏览器条件不可用，必须写 blocked/needs，不能把未执行验证写成 passed。",
      "```json",
      JSON.stringify(testAgentHandoffPayload, null, 2),
      "```",
      Array.isArray(testAgentHandoffWarnings) && testAgentHandoffWarnings.length ? `交接单提示：${testAgentHandoffWarnings.join("；")}` : "",
    ].filter(Boolean).join("\n") : "";
    const buildCurrentDevelopmentContract = () => buildChildAgentDevelopmentContract(targetName, childTaskText, {
      source: `${sourceProject} @ 协作`,
      reason: typeof mention === "string" ? "" : String(mention.reason || "").trim(),
      acceptance: sourceTask?.acceptance_criteria || "",
      requires_code_changes: nativeTestAgentDispatch ? false : (advisoryOnly ? false : (sourceTask ? taskRequiresCodeChanges(sourceTask) : true)),
      verification_hints: buildProjectVerificationHints(targetName, tWorkDir),
      work_dir: tWorkDir,
      agent_type: tAgentType,
      task_id: taskId,
      trace_id: sourceTask?.trace_id || "",
      task: sourceTask,
      group,
      dependsOn: typeof mention === "string" ? "" : String(mention.dependsOn || "").trim(),
      worker_context_packet: workerHandoff.worker_context_packet,
      memory: workerMemoryContext,
      analysis: globalMissionHandoff ? {
        constraints: Array.isArray(globalMissionHandoff.done_criteria) ? globalMissionHandoff.done_criteria : [],
        documentFindings: Array.isArray(globalMissionHandoff.references?.document_findings) ? globalMissionHandoff.references.document_findings : [],
      } : undefined,
      advisoryOnly,
      continuation: workerContinuation,
      handoff: workerHandoff,
    });
    let developmentContract = buildCurrentDevelopmentContract();
    let projectExecutionBrief = buildProjectExecutionBrief(targetName, childTaskText, {
      workDir: tWorkDir,
      resources: projectResourcesConfig,
      query: childTaskText,
      verificationHints: buildProjectVerificationHints(targetName, tWorkDir),
      memoryDeliveryMode: thirdPartyMemoryMcpEnabled ? "mcp" : "prompt",
      memorySnapshotId: thirdPartyMemorySnapshot?.id || "",
    });
    const renderCrossAgentPrompt = (renderOptions: any = {}) => {
      const recentGroupContext = renderOptions.recentGroupContext ?? (thirdPartyMemoryMcpEnabled
        ? "当前精确群聊会话通过签名 ccm__knowledge_context MCP 加载，不在 bootstrap Prompt 中重复正文。"
        : tContext);
      const renderedRuntimeToolContext = renderOptions.runtimeToolContext ?? runtimeToolContext;
      const renderedDevelopmentContract = renderOptions.developmentContract ?? developmentContract;
      const renderedWorkerMemoryPacket = renderOptions.workerMemoryPacket ?? (thirdPartyMemoryMcpEnabled
        ? buildThirdPartyMemoryBootstrap(thirdPartyMemorySnapshot, memoryConsumptionChallenge)
        : workerMemoryPacket);
      const renderedTaskSession = renderOptions.activeTaskSession ?? activeTaskSession;
      return `你正在 CCM 群聊中被 @ 请求协作。${collaborationInstructions}${buildAgentQaProtocolInstructions(targetName, memberList)}${toolContext.prompt}${renderedRuntimeToolContext.prompt}

${renderedDevelopmentContract}

${advisoryOnly ? `[只读协作契约]
- 这是任务内问答，不是新的开发工作单。
- 只读取必要上下文并回答问题；不得编辑、创建、删除或格式化任何文件。
- 不得安装依赖、切换权限、调用写入型 MCP，也不得扩大原任务项目边界。
- 回答需包含结论、证据和不确定项；如需实际修改，返回 needs 交由主 Agent 另行派发。` : ""}

${worktreeNotice}

${mention.conflictWorkspaceKey ? `[跨 Agent 冲突保护]
- 本任务与同仓库其他 Agent 的修改范围可能重叠。
- 主 Agent 已将相关工作单改为串行，并让它们复用隔离工作区 ${mention.conflictWorkspaceKey}。
- 执行前先检查工作区已有修改，承接前一个 Agent 的结果；不得覆盖或回退已有正确变更。` : ""}

${renderedWorkerMemoryPacket}

${projectExecutionBrief}

${continuationNotice}

${testAgentHandoffPacket}

${dependencyOutputPacket}

${renderedTaskSession ? `[任务级原生会话]
- 会话记录：${renderedTaskSession.id}
- 当前轮次：${renderedTaskSession.turnCount + 1}
- 续跑模式：${renderedTaskSession.resumeMode === "native" ? "恢复同一个 CLI 原生会话" : "平台 scratchpad 续跑"}
- 此会话只在主 Agent 最终验收完成后关闭；返工必须承接上一轮结论，不得从零重做。` : ""}

以下是当前精确群聊会话连续性（压缩前为完整原文，压缩后为正式摘要与动态近期完整原文）：
${recentGroupContext}

${sourceProject} 刚才 @ 了你，请根据上下文回复他的请求：
${childTaskText}

请直接回复本次请求：给出结论、必要的执行/修改说明、风险、汇总意见，或需要继续 @ 的成员。`;
    };
    let tPrompt = renderCrossAgentPrompt();

    const buildParentSessionCapacityGate = () => buildFinalWorkerDispatchPayloadGate({
      renderedPrompt: tPrompt,
      workerHandoff,
      provider: activeTaskSession?.agentType || tAgentType,
      model: activeTaskSession?.modelId || "",
      providerContractId: activeTaskSession?.providerContractId || "",
      providerRuntimeVersion: activeTaskSession?.providerRuntimeVersion || "",
      groupId,
      groupSessionId: activeGroupSessionId,
      taskId,
      taskAgentSessionId: activeTaskSession?.id || "",
      requiredHydrationTokens: thirdPartyMemoryMcpEnabled ? Number(thirdPartyMemorySnapshot?.requiredHydrationTokens || 0) : 0,
    });
    let parentSessionCapacityGate = buildParentSessionCapacityGate();
    if (parentSessionCapacityGate.status === "recompact_required") {
      const circuit = activeTaskSession
        ? inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(activeTaskSession.id, {
            groupId,
            groupSessionId: activeGroupSessionId,
            taskId,
          })
        : null;
      if (circuit?.blocked === true) {
        return failChildDispatch("项目子 Agent 父会话压缩熔断已开启", [
          `scope=${groupId}::${activeGroupSessionId}`,
          `failures=${circuit.consecutive_failures || 0}`,
          "请先修复当前会话的模型压缩配置；其他群聊会话不受影响",
        ]);
      }

      const compactAttemptId = `${parentSessionCapacityGate.gate_id}:formal_parent_compact`;
      try {
        const fixedPrompt = tPrompt.includes(tContext) ? tPrompt.replace(tContext, "") : tPrompt;
        const compactResult: any = await runGroupMemoryAutoCompactionNow(groupId, {
          sessionId: activeGroupSessionId,
          force: true,
          reason: "child_agent_final_payload_capacity",
          config: {
            memoryCompactionUseModel: true,
            memoryCompactionMode: "model-required",
            modelContextWindow: parentSessionCapacityGate.model_context_window,
            modelMaxOutputTokens: parentSessionCapacityGate.reserved_output_tokens,
            modelAutoCompactTokenLimit: parentSessionCapacityGate.auto_compact_threshold,
            modelVisibleSystemContext: fixedPrompt,
          },
        });
        if (compactResult?.success !== true || compactResult?.compacted !== true) {
          throw new Error(compactResult?.error || compactResult?.reason || "formal_parent_compaction_not_committed");
        }

        parentSessionContext = buildChildParentSessionContextPacket(groupId, { groupSessionId: activeGroupSessionId });
        if (parentSessionContext.canonicalSummary !== true || parentSessionContext.mode !== "canonical_summary_recent_raw") {
          throw new Error("formal_parent_compaction_missing_canonical_summary");
        }
        tContext = parentSessionContext.rendered;
        activeInvocationEdge = activeTaskSession ? prepareTaskAgentInvocationEdge({
          groupId,
          groupSessionId: activeGroupSessionId,
          taskId,
          targetProject: targetName,
          taskAgentSessionId: activeTaskSession.id,
          nativeSessionId: activeTaskSession.nativeSessionId || "",
          executionId: laneExecutionId,
          attemptSequence: memoryDeliveryAttemptSequence,
          providerAttempt: 1,
          invocationKind: memoryDeliveryAttemptSequence > 1 ? "resume" : "spawn",
          branchKind: "main",
        }) : null;
        groupMemoryBundle = await buildCurrentGroupMemoryBundle();
        memoryPacket = renderCurrentMemoryPacket(groupMemoryBundle);
        workerMemoryContext = globalMissionMemory
          ? { schema: "ccm-worker-memory-context-v1", group_memory: groupMemoryBundle, global_mission_memory: globalMissionMemory }
          : groupMemoryBundle;
        workerHandoff = buildCurrentWorkerHandoff(workerMemoryContext);
        workerMemoryPacket = renderMemoryContextForWorker(workerHandoff?.worker_context_packet?.memory || workerMemoryContext);
        authoritativeWorkerMemoryPacket = workerMemoryPacket;
        thirdPartyMemorySnapshot = buildGroupThirdPartyMemorySnapshot();
        memoryConsumptionChallenge = thirdPartyMemorySnapshot ? createMemoryContextConsumptionChallenge({
          groupId,
          groupSessionId: activeGroupSessionId,
          taskId,
          executionId: laneExecutionId,
          project: targetName,
          taskAgentSessionId: activeTaskSession?.id || "",
          attempt: memoryDeliveryAttemptSequence,
        }) : null;
        if (memoryConsumptionChallenge) {
          workerMemoryContext = attachMemoryContextConsumptionChallenge(workerMemoryContext, memoryConsumptionChallenge);
          workerHandoff = buildCurrentWorkerHandoff(workerMemoryContext);
          workerMemoryPacket = renderMemoryContextForWorker(workerHandoff?.worker_context_packet?.memory || workerMemoryContext);
        }
        runtimeToolContext = prepareAgentRuntimeTools(groupId, targetName, tWorkDir, tAgentType, toolContext.allowedTools, streamRes, {
          taskId,
          task: sourceTask,
          toolAudit: toolContext.toolAudit,
          authorizationReadiness: toolContext.authorizationReadiness,
          internalAgentRole: "project-child-agent",
          groupSessionId: activeGroupSessionId,
          taskAgentSessionId: activeTaskSession?.id || "",
          nativeSessionId: activeTaskSession?.nativeSessionId || "",
          memoryReceiptChallenge: memoryConsumptionChallenge,
          memoryReceiptFile: memoryContextConsumptionReceiptFile(memoryConsumptionChallenge?.challenge_id),
          memorySnapshotId: thirdPartyMemorySnapshot?.id || "",
          memorySnapshotChecksum: thirdPartyMemorySnapshot?.checksum || "",
          boundaryGeneration: thirdPartyMemorySnapshot?.boundaryGeneration || 0,
          nativeGeneration: thirdPartyMemorySnapshot?.nativeGeneration || 0,
          requestText: childTaskText,
          memoryReadBudgetTokens: thirdPartyMemorySnapshot?.autoCompactThreshold || 0,
        });
        thirdPartyMemoryMcpEnabled = !!thirdPartyMemorySnapshot
          && (runtimeToolContext.audit?.internal_mcp || []).some((item: any) => item.name === "ccm__knowledge_context" && item.state === "synced");
        if (thirdPartyMemoryMcpEnabled) {
          workerMemoryContext = buildMemoryMcpReference();
          workerHandoff = buildCurrentWorkerHandoff(workerMemoryContext);
          workerMemoryPacket = renderMemoryContextForWorker(workerHandoff?.worker_context_packet?.memory || workerMemoryContext);
        }
        projectExecutionBrief = buildProjectExecutionBrief(targetName, childTaskText, {
          workDir: tWorkDir,
          resources: projectResourcesConfig,
          query: childTaskText,
          verificationHints: buildProjectVerificationHints(targetName, tWorkDir),
          memoryDeliveryMode: thirdPartyMemoryMcpEnabled ? "mcp" : "prompt",
          memorySnapshotId: thirdPartyMemorySnapshot?.id || "",
        });
        capacityRevalidationPreparation = activeTaskSession
          ? prepareTaskAgentSessionCapacityRevalidation(activeTaskSession.id, workerHandoff.worker_context_packet)
          : null;
        if (activeTaskSession?.capacityRevalidationRequired === true && capacityRevalidationPreparation?.prepared !== true) {
          throw new Error(capacityRevalidationPreparation?.reason || "packet_capacity_not_revalidated_after_compact");
        }
        if (capacityRevalidationPreparation?.session) activeTaskSession = capacityRevalidationPreparation.session;
        capacityRevalidationCommitted = capacityRevalidationPreparation?.required !== true;
        if (typeof mention !== "string") mention.worker_context_packet = workerHandoff.worker_context_packet;
        workerHandoffSummary = summarizeWorkerHandoffForUser(workerHandoff);
        developmentContract = buildCurrentDevelopmentContract();
        tPrompt = renderCrossAgentPrompt();
        parentSessionCapacityGate = buildParentSessionCapacityGate();
        if (parentSessionCapacityGate.provider_call_allowed !== true) {
          throw new Error(`post_compact_payload_over_threshold:${parentSessionCapacityGate.model_visible_input_tokens}/${parentSessionCapacityGate.auto_compact_threshold}`);
        }
        if (activeTaskSession) {
          recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
            groupId,
            groupSessionId: activeGroupSessionId,
            taskId,
            attemptId: compactAttemptId,
            outcome: "success",
            reason: "formal_parent_compaction_committed",
          });
        }
        if (taskId) {
          addTaskLog(taskId, "info", `${targetName} 父会话已按模型容量正式压缩：${parentSessionCapacityGate.model_visible_input_tokens}/${parentSessionCapacityGate.auto_compact_threshold} tokens`);
          appendTaskTimelineEvent(taskId, {
            type: "child_parent_session_formal_compact",
            title: `${targetName} 父会话已正式压缩`,
            detail: `已重建为模型摘要 + 动态近期完整原文；boundary=${parentSessionContext.boundaryGeneration || 0}`,
            status: "ok",
            phase: "dispatching",
            agent: targetName,
            data: { parent_session_context: parentSessionContext, final_dispatch_payload_gate: parentSessionCapacityGate },
          });
        }
      } catch (error: any) {
        if (activeTaskSession) {
          recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
            groupId,
            groupSessionId: activeGroupSessionId,
            taskId,
            attemptId: compactAttemptId,
            outcome: "failure",
            reason: "formal_parent_compaction_failed",
            error: error?.message || String(error),
          });
        }
        return failChildDispatch("项目子 Agent 父会话正式模型压缩失败，已阻止 Provider 调用", [
          `scope=${groupId}::${activeGroupSessionId}`,
          error?.message || String(error),
          "原始 transcript 和旧 compact head 均保留，不使用本地摘要或字符截断继续派发",
        ]);
      }
    }

    if (taskId) {
      addTaskLog(taskId, "info", `${targetName} 自包含工作单已补齐：目标、范围、验收、ACK 和回执要求已打包`);
      const handoffReplayRepairBindings = summarizeReplayRepairTimelineBindingsForEvent(mention, {
        targetName,
        taskId,
        workerContextPacket: workerHandoff.worker_context_packet,
        workerHandoff,
        taskAgentSession: activeTaskSession,
        taskAgentSessionId: activeTaskSession?.id || "",
        nativeSessionId: activeTaskSession?.nativeSessionId || "",
        executionId: laneExecutionId,
      });
      const handoffTimelineEvent = appendTaskTimelineEvent(taskId, {
        type: "worker_handoff_ready",
        title: `${targetName} 工作单已补齐`,
        detail: "目标、范围、边界、验收、ACK 和回执要求已打包给子 Agent",
        status: "ok",
        phase: "dispatching",
        agent: targetName,
        data: {
          worker_handoff: workerHandoffSummary,
          worker_context_packet: workerHandoff.worker_context_packet,
          replay_repair_dispatch_bindings: handoffReplayRepairBindings,
        },
      });
      const handoffTimelineBindings = recordReplayRepairTimelineBindingsForMention(groupId, mention, {
        targetName,
        taskId,
        workerContextPacket: workerHandoff.worker_context_packet,
        workerHandoff,
        taskAgentSession: activeTaskSession,
        taskAgentSessionId: activeTaskSession?.id || "",
        nativeSessionId: activeTaskSession?.nativeSessionId || "",
        executionId: laneExecutionId,
        timelineEvent: handoffTimelineEvent,
        timelineEventType: "worker_handoff_ready",
      });
      if (handoffTimelineBindings.length && typeof mention !== "string") mention.replay_repair_timeline_bindings = handoffTimelineBindings;
      recordAgentRuntimeLifecycle({
        scope: "group",
        traceId: sourceTask?.trace_id || "",
        taskId,
        groupId,
        agent: sourceProject,
        action: "dispatch_worker",
        phase: "handoff",
        risk: "agent",
        target: targetName,
        status: "planned",
        message: `${targetName} 自包含工作单已生成`,
        data: {
          worker_handoff: workerHandoffSummary,
          worker_context_packet: workerHandoff.worker_context_packet,
          execution_order: executionOrder,
          advisory_only: advisoryOnly,
        },
      });
      if (testAgentHandoffPayload) {
        addTaskLog(taskId, "info", `${targetName} TestAgent 原生复核交接单已生成，复核对象：${getTestAgentHandoffReviewSubject(testAgentHandoffPayload) || continuationOf || targetName}`);
        appendTaskTimelineEvent(taskId, {
          type: "test_agent_handoff_ready",
          title: `${targetName} 原生复核交接单已生成`,
          detail: `复核对象：${getTestAgentHandoffReviewSubject(testAgentHandoffPayload) || continuationOf || targetName}`,
          status: "ok",
          phase: "dispatching",
          agent: targetName,
          data: {
            test_agent_handoff: testAgentHandoffPayload,
            warnings: testAgentHandoffWarnings,
          },
        });
      }
    }

    let activeMemoryContextSnapshot: any = null;
    let activeMemoryContextDelivery: any = null;
    if (activeTaskSession) {
      const boundMemorySnapshot = bindTaskAgentMemoryContextSnapshot(activeTaskSession.id, {
        taskId,
        groupId,
        project: targetName,
        agentType: tAgentType,
        nativeSessionId: activeTaskSession.nativeSessionId || "",
        turn: activeTaskSession.turnCount + 1,
        executionId: laneExecutionId,
        traceId: sourceTask?.trace_id || "",
        workerContextPacket: workerHandoff.worker_context_packet,
        workerHandoff,
        workerHandoffSummary,
        memoryContext: workerMemoryContext,
        renderedHandoff: developmentContract,
        renderedPrompt: tPrompt,
        renderedMemoryContext: String(groupMemoryBundle?.rendered_text || ""),
        requireMemoryPromptInjectionProof: true,
        requireTrustedMemoryPromptEnvelope: true,
        requireProviderMemoryChannelAcknowledgement: true,
        requireMemoryContextConsumptionReceipt: !!memoryConsumptionChallenge,
        memoryContextConsumptionChallenge: memoryConsumptionChallenge,
        runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
        invocationLineage: activeInvocationEdge,
      });
      if (boundMemorySnapshot) {
        const memoryEvidenceBinding: any = boundMemorySnapshot.snapshot?.context?.group_session_memory_binding || {};
        if (memoryEvidenceBinding.deliveryReady === false) {
          if (memoryEvidenceBinding.sessionLifecycleFenceValid === false) {
            return failChildDispatch("所属群聊会话已归档、删除或生命周期代次已变化", [
              `scope=${memoryEvidenceBinding.scopeId || "unknown"}`,
              `status=${memoryEvidenceBinding.sessionLifecycleFenceStatus || memoryEvidenceBinding.sessionLifecycleStatus || "stale"}`,
              `generation=${memoryEvidenceBinding.sessionLifecycleGeneration || 0}`,
              "请在当前有效群聊会话中重新创建任务并生成新的记忆快照",
            ]);
          }
          return failChildDispatch("Session Memory 模型提取交付证据未通过", [
            `scope=${memoryEvidenceBinding.scopeId || "unknown"}`,
            `execution=${memoryEvidenceBinding.modelExtractionExecutionId || "missing"}`,
            `replay=${memoryEvidenceBinding.modelExtractionReplayStatus || "missing"}`,
            "重新执行所属群聊会话的 Session Memory 模型提取与 artifact replay 后再派发",
          ]);
        }
        activeTaskSession = boundMemorySnapshot.session || activeTaskSession;
        activeMemoryContextSnapshot = summarizeTaskAgentMemoryContextSnapshot(boundMemorySnapshot.snapshot);
        if (typeof mention !== "string") {
          mention.task_agent_memory_context_snapshot = activeMemoryContextSnapshot;
        }
        if (taskId) {
          addTaskLog(taskId, "info", `${targetName} 任务会话记忆快照已绑定：${activeMemoryContextSnapshot.snapshot_id} / packet=${activeMemoryContextSnapshot.worker_context_packet_id || "none"}`);
          const snapshotReplayRepairBindings = summarizeReplayRepairTimelineBindingsForEvent(mention, {
            targetName,
            taskId,
            workerContextPacket: workerHandoff.worker_context_packet,
            workerHandoff,
            memoryContextSnapshot: activeMemoryContextSnapshot,
            taskAgentSession: activeTaskSession,
            taskAgentSessionId: activeTaskSession.id,
            nativeSessionId: activeTaskSession.nativeSessionId || "",
            executionId: laneExecutionId,
          });
          const snapshotTimelineEvent = appendTaskTimelineEvent(taskId, {
            type: "task_agent_memory_context_snapshot",
            title: `${targetName} 记忆上下文快照已绑定`,
            detail: `session=${activeTaskSession.id}；snapshot=${activeMemoryContextSnapshot.snapshot_id}`,
            status: "ok",
            phase: "dispatching",
            agent: targetName,
            data: {
              task_agent_memory_context_snapshot: activeMemoryContextSnapshot,
              replay_repair_dispatch_bindings: snapshotReplayRepairBindings,
            },
          });
          recordReplayRepairTimelineBindingsForMention(groupId, mention, {
            targetName,
            taskId,
            workerContextPacket: workerHandoff.worker_context_packet,
            workerHandoff,
            memoryContextSnapshot: activeMemoryContextSnapshot,
            memoryContextSnapshotChecksum: activeMemoryContextSnapshot.checksum || "",
            taskAgentSession: activeTaskSession,
            taskAgentSessionId: activeTaskSession.id,
            nativeSessionId: activeTaskSession.nativeSessionId || "",
            executionId: laneExecutionId,
            timelineEvent: snapshotTimelineEvent,
            timelineEventType: "task_agent_memory_context_snapshot",
          });
        }
      }
    }

  (env as any)._locals = {
    outputs, targetName, coordinatorProject, failChildDispatch, tWorkDir, tAgentType, activeTaskSession,
    laneExecutionId, childTaskText, workerHandoff, developmentContract, renderCrossAgentPrompt, tPrompt,
    advisoryOnly, nativeTestAgentDispatch, testAgentHandoffPayload, toolContext, runtimeToolContext,
    activeGroupSessionId, activeInvocationEdge, groupMemoryBundle, workerMemoryContext, workerMemoryPacket,
    dependencyOutputPacket, continuationNotice, testAgentHandoffPacket, projectExecutionBrief, worktreeNotice,
    atMessage, implementationMessage, requiresAckPreflight, testAgentWorkDirPolicy, memoryDeliveryAttemptSequence,
    globalMissionHandoff, globalMissionMemory, workerContinuation, capacityRevalidationPreparation,
    capacityRevalidationCommitted, workerHandoffSummary, activeMemoryContextSnapshot, activeMemoryContextDelivery,
    memoryConsumptionChallenge, projectResourcesConfig, collaborationInstructions, memberList, isContinuation,
    continuationUserLabel, isVerifierContinuation, isFreshVerifierContinuation, continuationOf, reworkRoute,
    routeStopResult, providerSwitchDecisionReceipt, tContext, preparedWorkDir, testAgentHandoffWarnings, continuationStrategy,
    mentionStr, nativeTestAgentMention, targetMember, atRegex, atMatch, taskKey, testAgentHandoff, legacyTestAgentWorkOrder,
    runtime, testAgentProjectWorkDir, workDirState, taskRuntimeOverride, providerSwitchAttempted,
    approvedSwitchAgentType, providerSwitchSessionBinding, routeContinuationFallback, pendingCapacityDowngradeGate,
    memoryPacket, parentSessionContext,
    thirdPartyMemorySnapshot, thirdPartyMemoryMcpEnabled,
  };

  return executeMentionJobTryA(mention, env);
}
