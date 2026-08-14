// Mechanically extracted from collaboration.ts; keep orchestration behavior unchanged.
import { buildExactGroupSessionModelContextPacket } from "./group-session-model-context";
import { projectTestAgentProblems, projectTestAgentReworkProblems, runProjectTaskTestAgentReview } from "../projects/project-test-agent-gate";
import { AUTO_REWORK_MAX_ROUNDS, buildReworkExhaustedUpdate, createReviewCycleId, nextReviewRound } from "./rework-policy";
import { classifyTestAgentReview } from "./test-agent-review-policy";
import {
  closeTaskProviderCircuit,
  formatTaskProviderCircuitMessage,
  openTaskProviderCircuit,
  readTaskProviderCircuit,
} from "./provider-task-circuit-breaker";
import { runMainAgentSelfVerification } from "./main-agent-self-verification";
import { resolveTaskAcceptancePolicy } from "./task-acceptance-policy";
import { loadProjectConfigs } from "../../core/db";
import {
  heartbeatAgentCommunication,
  getAgentCommunication,
  markAgentCommunicationRunnerStarted,
  readAgentCommunicationPolicy,
  startAgentCommunicationDispatch,
  submitAgentCommunicationResult,
  transitionAgentCommunication,
} from "../../system/agent-communication-v2";
import { AGENT_COMMUNICATION_ACK_MCP_TOOL_ALIASES } from "../../integrations/agent-communication-mcp";
import { buildTaskAgentContinuityBinding } from "../../tasks/agent-sessions";
import { appendUserVisibleRequirementPlan } from "../../system/user-visible-agent-events";
import { authorizeProjectChildAgentStart } from "../tools/conversation-permission-policy";
import { assertTaskPauseBoundary } from "../../tasks/task-pause-control";

type CollabCtx = any;

function groupPlanningProjectRefs(task: any) {
  return Array.from(new Set([
    ...(Array.isArray(task?.workflow_decision?.targetRefs) ? task.workflow_decision.targetRefs : []),
    ...(Array.isArray(task?.workflow_decision?.target_refs) ? task.workflow_decision.target_refs : []),
  ].map(value => String(value || "").trim()).filter(Boolean)));
}

function isTestAgentAssignment(value: any) {
  return /^(?:test[-_ ]?agent|qa[-_ ]?agent)$/i.test(String(value?.targetName || value?.project || value?.name || "").trim())
    || String(value?.role || value?.member?.role || "").trim().toLowerCase() === "test-agent";
}

function summarizeGroupPlanningSource(source: any) {
  return {
    schema: source?.schema || "ccm-group-main-source-planning-v1",
    checksum: String(source?.checksum || ""),
    requested_projects: Array.isArray(source?.requestedProjects) ? source.requestedProjects : [],
    hydrated_projects: Array.isArray(source?.hydratedProjects) ? source.hydratedProjects : [],
    total_chars: Math.max(0, Number(source?.totalChars || 0)),
    truncated: source?.truncated === true,
    ready: source?.ready === true,
    issues: Array.isArray(source?.issues) ? source.issues : [],
    model_planning_receipt: source?.modelPlanning || null,
    projects: (Array.isArray(source?.projects) ? source.projects : []).map((project: any) => ({
      project: String(project?.project || ""),
      status: String(project?.status || ""),
      manifest_checksum: String(project?.manifestChecksum || ""),
      selected_paths: Array.isArray(project?.selectedPaths) ? project.selectedPaths : [],
      issue: String(project?.issue || ""),
    })),
  };
}

function attachGroupPlanningSourceToAssignments(assignments: any[], source: any) {
  const projects = new Map<string, any>((Array.isArray(source?.projects) ? source.projects : [])
    .map((project: any) => [String(project?.project || ""), project] as [string, any]));
  return (assignments || []).map((assignment: any) => {
    const project = projects.get(String(assignment?.project || ""));
    if (!project) return assignment;
    const evidence = {
      snapshot_checksum: String(source?.checksum || ""),
      manifest_checksum: String(project?.manifestChecksum || ""),
      selected_paths: Array.isArray(project?.selectedPaths) ? project.selectedPaths : [],
      status: String(project?.status || ""),
    };
    const evidenceText = [
      "[主 Agent 只读源码规划依据]",
      `snapshot_checksum=${evidence.snapshot_checksum}`,
      `manifest_checksum=${evidence.manifest_checksum}`,
      `selected_paths=${evidence.selected_paths.join(", ") || "<none>"}`,
      "这些路径仅是主 Agent制定计划时的只读证据。执行前必须重新读取当前源码；如实际结构与计划冲突，停止扩大修改并回报主 Agent重新规划。",
    ].join("\n");
    return {
      ...assignment,
      task: [assignment?.task || "", evidenceText].filter(Boolean).join("\n\n"),
      source_evidence: evidence,
    };
  });
}

function sourceGroundedPlanModeUpdates(task: any, architecturePlan: any, sourceEvidence: any, executionOrder: string) {
  const current = task?.workflow_meta?.plan_mode || task?.workflow_meta?.intake?.plan_mode || task?.intake_draft || {};
  const currentSteps = Array.isArray(current?.steps) ? current.steps : [];
  const retained = currentSteps.filter((step: any) => String(step?.grounding || "") !== "current_source");
  const architectureSteps = (Array.isArray(architecturePlan?.dependencySteps) ? architecturePlan.dependencySteps : [])
    .map((step: any, index: number) => ({
      id: `model_plan_${index + 1}`,
      label: String(step?.title || "").trim(),
      detail: [
        step?.project ? `项目：${step.project}` : "",
        Array.isArray(step?.dependsOn) && step.dependsOn.length ? `依赖：${step.dependsOn.join("、")}` : "",
        Array.isArray(step?.acceptance) && step.acceptance.length ? `验收：${step.acceptance.join("；")}` : "",
      ].filter(Boolean).join("；"),
      status: "pending",
      source: "model",
      grounding: "current_source",
    }))
    .filter((step: any) => step.label);
  const gateIndex = retained.findIndex((step: any) => ["dispatch_sub_agents", "verify_and_summarize", "verify_and_reply"].includes(String(step?.id || "")));
  const steps = gateIndex >= 0
    ? [...retained.slice(0, gateIndex), ...architectureSteps, ...retained.slice(gateIndex)]
    : [...retained, ...architectureSteps];
  const planMode = {
    ...current,
    source: "group-main-agent-source-grounded-plan-6.0",
    steps,
    architecture_plan: architecturePlan,
    execution_order: executionOrder,
    read_only_exploration: {
      ...(current?.read_only_exploration || {}),
      summary: `已读取 ${sourceEvidence?.hydrated_projects?.length || 0} 个相关项目的当前源码证据，并据此生成执行计划。`,
      projects: sourceEvidence?.hydrated_projects || [],
      code_snapshot_used: true,
      source_ready: sourceEvidence?.ready === true,
      source_snapshot_checksum: sourceEvidence?.checksum || "",
      source_evidence: sourceEvidence?.projects || [],
    },
  };
  const workflowMeta = task?.workflow_meta && typeof task.workflow_meta === "object" ? task.workflow_meta : {};
  return {
    intake_draft: planMode,
    workflow_meta: {
      ...workflowMeta,
      plan_mode: planMode,
      ...(workflowMeta.intake ? { intake: { ...workflowMeta.intake, plan_mode: planMode } } : {}),
    },
  };
}

export async function executeTask(task: any, ctx: CollabCtx, deps: any) {
  const {
    addTaskLog,
    admitChildTypedMemoryDelivery,
    alignRequirementEpicAssignments,
    appendGroupMessage,
    appendTaskTimelineEvent,
    assertRuntimeToolDispatchReady,
    attachExecutionWorkspace,
    attachInvokedSkillsToReceipt,
    attachMemoryContextConsumptionChallenge,
    bindTaskAgentInvocationContext,
    bindTaskAgentInvocationMemoryDelivery,
    bindTaskAgentInvocationRunnerRequest,
    bindTaskAgentMemoryContextSnapshot,
    buildAgentMemoryContextBundleWithManifestSelection,
    buildAgentToolContext,
    buildChildAgentDevelopmentContract,
    buildChildAgentTaskText,
    buildChildAgentWorkerHandoff,
    buildChildAgentWorktreeNotice,
    buildCoordinatorSharedFilesContext,
    buildGroupMainPlanningSourceContext,
    buildProjectVerificationHints,
    buildQueuedGroupTaskMessage,
    buildTaskProviderSwitchRequests,
    buildTaskSandboxRehearsal,
    buildTaskSourceDocumentsContext,
    buildUserCoordinationAcknowledgement,
    buildWorkerContinuationHandoff,
    buildWorkflowMeta,
    captureReasoningFacts,
    checkTaskFailure,
    claimTaskWorkItemForAgent,
    commitChildTypedMemoryDelivery,
    commitTaskAgentSessionCapacityRevalidation,
    compactMemoryText,
    compactRuntimeToolAudit,
    completeTaskAgentInvocationEdge,
    createChildTypedMemoryDispatchWal,
    createExecutionCheckpoint,
    createMemoryContextConsumptionChallenge,
    dispatchTaskAgentInvocationEdge,
    ensureExecution,
    evaluateGreenContract,
    explainReasoningDecision,
    extractAgentReceipt,
    extractRunnerVerificationEvidence,
    getChildAgentIsolationMode,
    getConfigInfo,
    getConfigs,
    getCoordinatorActionMentions,
    getCoordinatorMember,
    getGroupTaskExecutionStatus,
    getInitialWorkflowMeta,
    getRoutableMembers,
    getTaskAgentSessionOptions,
    getTaskExecutionFromReceipt,
    groupSessionIdForTask,
    loadExecution,
    loadGroups,
    loadTasks,
    markChildTypedMemoryDispatchCommitted,
    markChildTypedMemoryDispatchStarted,
    markChildTypedMemoryRunnerReturned,
    markGroupCoordinationDependencyStarted,
    memoryContextConsumptionReceiptFile,
    mergeCoordinatorDocumentContexts,
    normalizeAgentReasoningState,
    normalizePlanAssignments,
    openTaskAgentSession,
    prepareAgentRuntimeTools,
    prepareChildAgentWorkDir,
    prepareTaskAgentInvocationEdge,
    prepareTaskAgentSessionCapacityRevalidation,
    processCrossAgents,
    recordAgentRuntimeLifecycle,
    recordReasoningDeviation,
    recordReplayRepairTimelineBindingsForMention,
    recordTaskAgentMemoryContextDelivery,
    recordTaskAgentSessionTurn,
    requirementEpicExecutionBoundary,
    runCoordinatorReviewLoop,
    runGroupOrchestrator,
    runtimeToolDispatchBlockedReceipt,
    runtimeToolSnapshotFromAudit,
    safeAddGroupLog,
    saveTasks,
    setReasoningAssertion,
    summarizeReplayRepairTimelineBindingsForEvent,
    summarizeWorkerHandoffForUser,
    taskAgentInvocationMemoryOptions,
    taskAgentSessionLifecycleRunnerOptions,
    taskRequiresCodeChanges,
    transitionExecution,
    updateGroupMemory,
    updateReasoningPlan,
    updateTask,
    updateTaskWorkItemFromReceipt
  } = deps;
  const pauseBoundary = (phase: string, workItemId = "") => {
    const latest = loadTasks().find((item: any) => String(item?.id || "") === String(task.id || "")) || task;
    assertTaskPauseBoundary(latest, phase, workItemId);
  };
  const configs = getConfigs();
  let acceptancePolicyResult = resolveTaskAcceptancePolicy(task, { allowLegacyCapture: true });
  if (acceptancePolicyResult.legacyCaptured && acceptancePolicyResult.snapshot) {
    task = updateTask(task.id, {
      acceptance_policy_snapshot: acceptancePolicyResult.snapshot,
      acceptance_mode: acceptancePolicyResult.snapshot.mode,
      test_agent_enabled: acceptancePolicyResult.snapshot.test_agent_enabled,
    }) || task;
    acceptancePolicyResult = resolveTaskAcceptancePolicy(task);
  }
  const acceptancePolicy = acceptancePolicyResult.snapshot;

  if (task.assign_type === "group" && task.group_id) {
    const groups = loadGroups();
    const group = groups.find(g => g.id === task.group_id);
    if (!group) throw new Error("群聊不存在");
    const coordinatorProject = getCoordinatorMember(group).project;
    const appendGroupTaskPlanState = (phase: "planning" | "dispatching" | "reviewing" | "completed" | "blocked") => {
      const latestTask = loadTasks().find((item: any) => item.id === task.id) || task;
      const planMode = latestTask?.workflow_meta?.plan_mode || latestTask?.workflow_meta?.intake?.plan_mode || latestTask?.intake_draft || {};
      const explicitWorkItems = Array.isArray(latestTask?.work_items) ? latestTask.work_items : [];
      const sourceSteps = explicitWorkItems.length ? explicitWorkItems : (Array.isArray(planMode?.steps) ? planMode.steps : []);
      if (!sourceSteps.length) return null;
      const normalized = sourceSteps.map((step: any, index: number) => ({
        id: String(step?.id || `step_${index + 1}`),
        workItemId: String(step?.workItemId || step?.work_item_id || step?.id || `step_${index + 1}`),
        title: String(step?.label || step?.title || `实施步骤 ${index + 1}`),
        description: String(step?.objective || step?.detail || "按当前计划完成该步骤。"),
        outcome: String(step?.outcome || step?.acceptanceCriteria?.[0] || step?.acceptance_criteria?.[0] || "完成后进入下一阶段。"),
        project: String(step?.project || step?.target_project || ""),
        dependsOn: Array.isArray(step?.dependsOn || step?.depends_on) ? (step.dependsOn || step.depends_on) : [],
        status: String(step?.status || "pending"),
        waitingReason: String(step?.waitingReason || step?.waiting_reason || ""),
      }));
      const completedStatus = (value: string) => ["completed", "done", "success", "succeeded"].includes(value.toLowerCase());
      let activeAssigned = false;
      const steps = normalized.map((step: any) => {
        if (phase === "completed") return { ...step, status: "completed" };
        if (explicitWorkItems.length) {
          const dependencyWaiting = step.dependsOn.length > 0 && step.dependsOn.some((id: string) => {
            const dependency = normalized.find((item: any) => item.id === id || item.workItemId === id);
            return dependency && !completedStatus(dependency.status);
          });
          if (dependencyWaiting && ["pending", "queued", "waiting"].includes(step.status.toLowerCase())) {
            return { ...step, status: "waiting_dependency", waitingReason: step.waitingReason || "等待前置工作项验收" };
          }
          if (phase === "reviewing" && !completedStatus(step.status)) return { ...step, status: "reviewing" };
          if (phase === "blocked" && !activeAssigned && !completedStatus(step.status)) {
            activeAssigned = true;
            return { ...step, status: "blocked" };
          }
          return step;
        }
        if (phase === "reviewing") return { ...step, status: step.id === "verify_and_summarize" || step.id === "verify_and_reply" ? "running" : "completed" };
        if (phase === "dispatching") {
          if (step.id === "dispatch_sub_agents") return { ...step, status: "running" };
          if (["understand_goal", "read_only_explore", "confirm_boundary"].includes(step.id)) return { ...step, status: "completed" };
        }
        if (phase === "blocked" && !activeAssigned && !completedStatus(step.status)) {
          activeAssigned = true;
          return { ...step, status: "blocked" };
        }
        return step;
      });
      const revision = Math.max(1, Number(latestTask?.user_visible_plan_revision || 1) + 1);
      updateTask(task.id, { user_visible_plan_revision: revision });
      return appendUserVisibleRequirementPlan({
        eventId: `group-task:${task.id}:requirement-plan:${revision}:${phase}`,
        scope: "group",
        scopeId: String(task.group_id),
        exactSessionId: String(latestTask?.group_session_id || latestTask?.groupSessionId || ""),
        anchorMessageId: String(latestTask?.anchor_message_id || latestTask?.target_message_id || `task-message:${task.id}`),
        generation: Math.max(0, Number(latestTask?.generation || 0)),
        taskId: String(task.id),
        plan: {
          planId: String(task.id),
          revision,
          title: String(latestTask?.title || "需求实施计划"),
          goal: String(latestTask?.business_goal || latestTask?.title || "完成当前群聊任务。"),
          steps,
          scope: planMode?.impact_scope?.projects || [],
          expectedResults: planMode?.acceptance || [],
          exclusions: planMode?.permission_boundaries || [],
          status: phase === "completed" ? "completed" : phase === "blocked" ? "blocked" : "executing",
          createdAt: String(latestTask?.created_at || new Date().toISOString()),
          updatedAt: new Date().toISOString(),
        },
      });
    };

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
    const context = buildExactGroupSessionModelContextPacket(task.group_id, { groupSessionId: task.group_session_id || task.groupSessionId || "" }).rendered;
    const planningSource = await buildGroupMainPlanningSourceContext(group, message, configs, {
      targetProjects: groupPlanningProjectRefs(task),
      maxRounds: 3,
    });
    pauseBoundary("planning");
    const planningSourceSummary = summarizeGroupPlanningSource(planningSource);
    const previousSourceChecksum = String(task?.intake_draft?.read_only_exploration?.source_snapshot_checksum
      || task?.workflow_meta?.plan_mode?.read_only_exploration?.source_snapshot_checksum
      || task?.planning_source_evidence?.checksum
      || "");
    if (previousSourceChecksum && previousSourceChecksum !== planningSource.checksum) {
      appendTaskTimelineEvent(task.id, {
        type: "group_main_source_changed",
        title: "源码发生变化，主 Agent 已重新规划",
        detail: "执行前源码checksum与确认计划不一致，旧计划未直接派发；本轮使用当前源码重新生成工作项。",
        status: "warn",
        phase: "planning",
        agent: coordinatorProject,
        data: { previous_checksum: previousSourceChecksum, current_checksum: planningSource.checksum },
      });
      updateTask(task.id, { plan_revision_required: true, source_snapshot_changed_at: new Date().toISOString() });
    }
    appendTaskTimelineEvent(task.id, {
      type: "group_main_source_hydrated",
      title: planningSource.ready ? "群聊主 Agent 已读取相关项目源码" : "群聊主 Agent 源码读取存在缺口",
      detail: planningSource.projects.map((project: any) => `${project.project}：${project.selectedPaths.length} 个文件`).join("；") || "没有可读取的项目源码",
      status: planningSource.ready ? "ok" : "warn",
      phase: "planning",
      agent: coordinatorProject,
      data: { source_evidence: planningSourceSummary },
    });
    if (taskRequiresCodeChanges(task) && !planningSource.ready) {
      const detail = `群聊主 Agent 无法在规划前读取完整的目标项目源码：${planningSource.issues.join("；") || "没有可用源码证据"}`;
      updateTask(task.id, {
        status: "blocked",
        acceptance_state: "source_hydration_blocked",
        status_detail: detail,
        planning_source_evidence: planningSourceSummary,
      });
      appendTaskTimelineEvent(task.id, {
        type: "group_main_source_gate_blocked",
        title: "源码证据门禁阻止派发",
        detail,
        status: "error",
        phase: "planning",
        agent: coordinatorProject,
        data: { source_evidence: planningSourceSummary },
      });
      return {
        status: "blocked",
        detail,
        sourceEvidence: planningSourceSummary,
      };
    }
    const sharedFilesContext = mergeCoordinatorDocumentContexts(
      buildCoordinatorSharedFilesContext(ctx, group, { groupSessionId: groupSessionIdForTask(task), message }),
      buildTaskSourceDocumentsContext(task),
      planningSource.rendered,
    );
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
      workflowDecision: task.workflow_decision || task.workflowDecision || null,
      projectSourceEvidence: planningSourceSummary,
      extraInstructions: [
        requirementEpicExecutionBoundary(task),
        "本轮是源码驱动规划。必须引用注入的当前源码证据，生成明确的目标、边界、跨项目数据关系、依赖顺序和可验收工作项；不得把需求分析或跨项目架构设计转交给开发 Agent。开发 Agent只负责本项目内的当前源码复查、实现、验证和结果说明。",
      ].filter(Boolean).join("\n\n"),
    });
    pauseBoundary("planning");
    let coordinatorOutput = coordinatorResult.content;
    const coordinatorTranscript = [coordinatorOutput].filter(Boolean);
    const initialCoordinatorRuntime = String((coordinatorResult as any).runtime || "");
    const previousProviderCircuit = readTaskProviderCircuit(task);
    if (previousProviderCircuit?.state === "open" && !["llm-error", "llm-not-configured"].includes(initialCoordinatorRuntime)) {
      const closedCircuit = closeTaskProviderCircuit(task, "群聊主 Agent Provider 调用恢复");
      updateTask(task.id, { provider_circuit: closedCircuit });
      appendTaskTimelineEvent(task.id, {
        type: "provider_circuit_closed",
        title: "主 Agent Provider 已恢复",
        detail: "任务级模型冷却已关闭，本轮继续执行",
        status: "ok",
        phase: "planning",
        agent: coordinatorProject,
        data: { circuit: closedCircuit },
      });
    }
    let coordinatorMessageId = "m" + Date.now().toString(36) + "coord";
    let planAssignments = attachGroupPlanningSourceToAssignments(
      alignRequirementEpicAssignments(task, normalizePlanAssignments((coordinatorResult as any).assignments || [])),
      planningSource,
    );
    const sourceBoundProjects = new Set(planningSource.projects.map((project: any) => String(project.project || "")));
    const ungroundedAssignments = planAssignments
      .map((assignment: any) => String(assignment?.project || ""))
      .filter((project: string) => project && !sourceBoundProjects.has(project));
    if (taskRequiresCodeChanges(task) && ungroundedAssignments.length) {
      const detail = `主 Agent 计划包含尚未读取源码的项目：${ungroundedAssignments.join("、")}；本轮已停止派发，请重新生成源码范围。`;
      updateTask(task.id, {
        status: "blocked",
        acceptance_state: "source_scope_mismatch",
        status_detail: detail,
        planning_source_evidence: planningSourceSummary,
      });
      appendTaskTimelineEvent(task.id, {
        type: "group_main_source_scope_mismatch",
        title: "计划项目与源码证据不一致",
        detail,
        status: "error",
        phase: "planning",
        agent: coordinatorProject,
        data: { ungrounded_projects: ungroundedAssignments, source_evidence: planningSourceSummary },
      });
      return {
        status: "blocked",
        detail,
        sourceEvidence: planningSourceSummary,
      };
    }
    let dispatchPolicy = (coordinatorResult as any).dispatchPolicy || null;
    let workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "任务队列协调");
    appendGroupMessage(task.group_id, {
      id: coordinatorMessageId,
      role: "assistant",
      agent: coordinatorProject,
      content: buildUserCoordinationAcknowledgement(task, planAssignments, {
        dispatchPolicy,
        status: "planning",
      }),
      technical_content: coordinatorOutput,
      timestamp: new Date().toISOString(),
      task_id: task.id,
      assignments: planAssignments,
      executionOrder: (coordinatorResult as any).executionOrder || "parallel",
      runtime: (coordinatorResult as any).runtime || "",
      dispatchPolicy,
      coordinationPlan: (coordinatorResult as any).coordinationPlan || null,
      workflow: workflowMeta,
    });
    appendTaskTimelineEvent(task.id, { type: "coordinator_plan", title: "主 Agent 生成计划", detail: compactMemoryText(coordinatorOutput, 500), status: planAssignments.length ? "ok" : "warn", phase: "planning", agent: coordinatorProject, data: { assignments: planAssignments, dispatchPolicy, coordinationPlan: (coordinatorResult as any).coordinationPlan || null } });
    const semanticReasoning = (coordinatorResult as any).analysis?.reasoning || {};
    const architecturePlan = (coordinatorResult as any).analysis?.architecturePlan || (coordinatorResult as any).coordinationPlan?.architecture || null;
    const sourcePlanUpdates = sourceGroundedPlanModeUpdates(
      task,
      architecturePlan,
      planningSourceSummary,
      (coordinatorResult as any).executionOrder || "sequential",
    );
    const taskReasoning = normalizeAgentReasoningState(task.reasoning_loop, task.business_goal || task.title || "");
    updateReasoningPlan(taskReasoning, (coordinatorResult as any).coordinationPlan?.phases || [], "群聊主 Agent 基于语义拆分形成协调计划");
    captureReasoningFacts(taskReasoning, "coordinator_semantic_analysis", {
      known_facts: semanticReasoning.knownFacts || [],
      assumptions_to_verify: semanticReasoning.assumptionsToVerify || [],
      dependency_rationale: semanticReasoning.dependencyRationale || [],
      assignments: planAssignments.map((item: any) => ({ project: item.project, dependsOn: item.dependsOn || "", reason: item.reason || "" })),
      replan_triggers: semanticReasoning.replanTriggers || [],
    });
    explainReasoningDecision(taskReasoning, dispatchPolicy?.action || (planAssignments.length ? "delegate" : "hold"), dispatchPolicy?.reason || "群聊主 Agent 根据语义分析、依赖与风险形成当前安排");
    (semanticReasoning.verificationAssertions || []).forEach((label: string, index: number) => setReasoningAssertion(taskReasoning, { id: `semantic_${index + 1}`, label, kind: "semantic_acceptance", status: "pending", reason: "群聊主 Agent 在派发前定义" }));
    if ((semanticReasoning.assumptionsToVerify || []).length) recordReasoningDeviation(taskReasoning, "unverified_assumptions", `待 Worker 核验：${semanticReasoning.assumptionsToVerify.join("；")}`, "info");
    updateTask(task.id, {
      reasoning_loop: taskReasoning,
      coordination_plan: (coordinatorResult as any).coordinationPlan || null,
      planning_source_evidence: planningSourceSummary,
      architecture_plan: architecturePlan,
      ...sourcePlanUpdates,
      acceptance_evidence_plan: semanticReasoning.acceptanceEvidencePlan || [],
      test_agent_verification_profile: semanticReasoning.verificationProfile || null,
      workflow_decision: (coordinatorResult as any).analysis?.workflowDecision || task.workflow_decision || null,
    });
    appendGroupTaskPlanState("planning");
    appendTaskTimelineEvent(task.id, { type: "reasoning_plan", title: `主 Agent 推理计划 v${taskReasoning.plan_version}`, detail: `事实 ${(semanticReasoning.knownFacts || []).length} · 假设 ${(semanticReasoning.assumptionsToVerify || []).length} · 断言 ${(semanticReasoning.verificationAssertions || []).length}`, status: "ok", phase: "planning", agent: coordinatorProject, data: { plan_version: taskReasoning.plan_version, reasoning: semanticReasoning } });

    const coordinatorRuntime = String((coordinatorResult as any).runtime || "");
    if (coordinatorRuntime === "llm-error") {
      const providerFailure = (coordinatorResult as any).providerFailure || {};
      if (providerFailure.kind && providerFailure.kind !== "provider") {
        const failureKind = String(providerFailure.kind || "internal");
        const failureMessage = compactMemoryText(coordinatorOutput, 500) || "群聊主 Agent 内部处理失败";
        updateTask(task.id, { status_detail: failureMessage });
        appendTaskTimelineEvent(task.id, {
          type: "main_agent_processing_failed",
          title: failureKind === "workflow_contract" ? "主 Agent 工作流格式校验失败" : failureKind === "context" ? "主 Agent 上下文处理失败" : "主 Agent 内部处理失败",
          detail: failureMessage,
          status: "warn",
          phase: "planning",
          agent: coordinatorProject,
          data: { failure_kind: failureKind, provider_circuit_opened: false },
        });
        addTaskLog(task.id, "warning", `${failureMessage}；该错误不是 Provider 连接故障，未开启任务级 Provider 冷却`);
        return getGroupTaskExecutionStatus(null, coordinatorResult, coordinatorTranscript.join("\n\n---\n\n"), task);
      }
      const circuit = openTaskProviderCircuit(task, providerFailure, {
        reason: compactMemoryText(coordinatorOutput, 500) || "群聊主 Agent Provider 调用失败",
      });
      const circuitMessage = formatTaskProviderCircuitMessage(circuit);
      updateTask(task.id, {
        provider_circuit: circuit,
        status_detail: circuitMessage,
      });
      appendTaskTimelineEvent(task.id, {
        type: "provider_circuit_opened",
        title: "主 Agent Provider 进入任务级冷却",
        detail: circuitMessage,
        status: "warn",
        phase: "planning",
        agent: coordinatorProject,
        data: {
          circuit,
          provider_failure: providerFailure,
          dispatch_repair_skipped: true,
        },
      });
      addTaskLog(task.id, "warning", `${circuitMessage}；llm-error 已禁止进入派发修复`);
      return getGroupTaskExecutionStatus(null, coordinatorResult, coordinatorTranscript.join("\n\n---\n\n"), task);
    }
    if (coordinatorRuntime === "llm-not-configured") {
      addTaskLog(task.id, "warning", "主 Agent 模型未配置，本轮禁止进入派发修复");
      return getGroupTaskExecutionStatus(null, coordinatorResult, coordinatorTranscript.join("\n\n---\n\n"), task);
    }

    let validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
    if (task.workflow_type === "daily_dev" && validMentions.length === 0 && getRoutableMembers(group).length > 0) {
      const repairResult = await runGroupOrchestrator({
        group,
        message,
        context,
        source: "daily-dev-model-dispatch-repair",
        groupSessionId: groupSessionIdForTask(task),
        sharedFilesContext,
        providerSwitchRequests: buildTaskProviderSwitchRequests(task),
        traceId: task.trace_id || task.traceId || "",
        taskId: task.id,
        executionId: task.execution_id || task.executionId || task.id,
        workflowDecision: task.workflow_decision || task.workflowDecision || null,
        projectSourceEvidence: planningSourceSummary,
        extraInstructions: [
          requirementEpicExecutionBoundary(task),
          "上一轮模型没有生成可执行 assignments。请重新核对用户目标与群成员职责；若信息足够，必须由模型返回结构化 assignments；若不足，明确返回 clarificationQuestions，禁止规则补派。",
        ].filter(Boolean).join("\n\n"),
      }) as any;
      pauseBoundary("planning");
      const repairMentions = getCoordinatorActionMentions(repairResult, group, coordinatorProject);
      const repairAssignments = normalizePlanAssignments(repairResult.assignments || []);
      if (repairMentions.length > 0 || repairAssignments.length > 0) {
        const repairOutput = [
          "主 Agent 派发修复：上一轮缺少可执行 assignments，已由模型重新规划。",
          "",
          repairResult.content || "",
        ].join("\n").trim();
        coordinatorResult = {
          ...repairResult,
          content: repairOutput,
          runtime: repairResult.runtime || "llm-dispatch-repair",
        };
        coordinatorOutput = repairOutput;
        coordinatorTranscript.push(repairOutput);
        coordinatorMessageId = "m" + Date.now().toString(36) + "repair";
        planAssignments = attachGroupPlanningSourceToAssignments(
          alignRequirementEpicAssignments(task, normalizePlanAssignments((coordinatorResult as any).assignments || [])),
          planningSource,
        );
        dispatchPolicy = (coordinatorResult as any).dispatchPolicy || null;
        workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "daily_dev 派发修复");
        appendGroupMessage(task.group_id, {
          id: coordinatorMessageId,
          role: "assistant",
          agent: coordinatorProject,
          content: coordinatorOutput,
          timestamp: new Date().toISOString(),
          task_id: task.id,
          assignments: planAssignments,
          executionOrder: (coordinatorResult as any).executionOrder || "parallel",
          runtime: (coordinatorResult as any).runtime || "",
          dispatchPolicy,
          coordinationPlan: (coordinatorResult as any).coordinationPlan || null,
          workflow: workflowMeta,
        });
        validMentions = repairMentions.length > 0
          ? repairMentions
          : getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
        addTaskLog(task.id, "info", `daily_dev 主 Agent 空派发已由模型重新规划: ${validMentions.map(m => m.mention).join(", ") || planAssignments.map((item: any) => `@${item.project}`).join(", ")}`);
        updateGroupMemory(task.group_id, {
          groupSessionId: groupSessionIdForTask(task),
          currentPhase: "dispatching",
          decision: "daily_dev 空派发计划修复",
          reason: "主 Agent 未产生可执行派发，已启用规则协调器补充派发计划",
          nextAction: "子 Agent 按补派计划执行并返回结构化结果说明",
        });
      } else {
        addTaskLog(task.id, "warning", "daily_dev 主 Agent 空派发修复未产生可执行目标");
      }
    }

    if (!acceptancePolicyResult.valid || !acceptancePolicy) throw new Error(`群聊任务验收策略不可用：${acceptancePolicyResult.reason}`);
    const independentTestAgentEnabled = acceptancePolicy.mode === "test_agent";
    if (!independentTestAgentEnabled) {
      validMentions = validMentions.filter((item: any) => !isTestAgentAssignment(item));
      planAssignments = planAssignments.filter((item: any) => !isTestAgentAssignment(item));
    }

    const sandboxRehearsal = buildTaskSandboxRehearsal(task, group, coordinatorResult, planAssignments, validMentions, dispatchPolicy);
    const tasksForRehearsal = loadTasks();
    const rehearsalTaskIndex = tasksForRehearsal.findIndex((item: any) => item.id === task.id);
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
      content: [`任务前沙盘演练：${sandboxRehearsal.title}`, `影响范围：${sandboxRehearsal.impact_scope.areas.join("、")}`, `计划派发：${sandboxRehearsal.agent_plan.map((item: any) => item.project).join("、") || "待确认"}`, `门禁：${sandboxRehearsal.gate_requirements.join("、")}`].join("\n"),
      timestamp: new Date().toISOString(),
      task_id: task.id,
      taskRehearsal: sandboxRehearsal,
      workflow: buildWorkflowMeta("planning", "任务前沙盘演练"),
    });

    let crossOutputs: string[] = [];
    let reviewResult: any = null;
    if (validMentions.length > 0) {
      pauseBoundary("dispatching");
      addTaskLog(task.id, "info", `检测到群聊派发目标: ${validMentions.map(m => m.mention).join(", ")}`);
      const dispatchReplayRepairBindings = validMentions.flatMap((mention: any) => summarizeReplayRepairTimelineBindingsForEvent(mention, {
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
            execution_order: (coordinatorResult as any).executionOrder || "parallel",
          },
        });
      }
      appendGroupTaskPlanState("dispatching");
      crossOutputs = await processCrossAgents(
        task.group_id,
        group,
        coordinatorProject,
        coordinatorOutput,
        validMentions,
        configs,
        ctx,
        null,
        0,
        new Set<string>(),
        (coordinatorResult as any).executionOrder || "parallel",
        coordinatorMessageId,
        task.id
      );
      pauseBoundary("reviewing");
      appendGroupTaskPlanState("reviewing");
      reviewResult = await runCoordinatorReviewLoop({
        groupId: task.group_id,
        group,
        userMessage: message,
        coordinatorOutput,
        crossOutputs,
        configs,
        ctx,
        executionOrder: (coordinatorResult as any).executionOrder || "parallel",
        taskId: task.id,
        groupSessionId: task.group_session_id || task.groupSessionId || "",
        acceptancePolicy,
      });
      pauseBoundary("reviewing");
      appendTaskTimelineEvent(task.id, { type: "coordinator_review", title: "主 Agent 验收", detail: compactMemoryText(reviewResult?.content || reviewResult?.detail || "", 500), status: reviewResult?.status === "done" ? "ok" : "warn", phase: "reviewing", agent: coordinatorProject, data: { review: reviewResult?.review || reviewResult } });
    }

    const outputText = [...coordinatorTranscript, ...crossOutputs, reviewResult?.content || ""].filter(Boolean).join("\n\n---\n\n");
    const latestTask = loadTasks().find((item: any) => item.id === task.id) || task;
    const executionResult = getGroupTaskExecutionStatus(reviewResult, coordinatorResult, outputText, latestTask);
    appendGroupTaskPlanState(executionResult.status === "done" ? "completed" : "blocked");
    return executionResult;
  } else {
    const config = configs.find(c => c.name === task.target_project);
    if (!config) throw new Error("项目配置不存在");
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

    if (taskRequiresCodeChanges(task)) {
      pauseBoundary("dispatching");
      const permission = await authorizeProjectChildAgentStart({ task, project: task.target_project, workDir, agentType });
      pauseBoundary("dispatching");
      if (!permission.allowed) {
        const detail = permission.message || "当前会话权限不允许启动代码修改 Agent";
        updateTask(task.id, {
          status: "blocked",
          status_detail: detail,
          conversation_permission_snapshot: permission.snapshot,
          conversation_permission_mode: permission.mode,
          permission_policy_revision: permission.snapshot?.revision || 0,
          edit_approval_id: permission.editApprovalId || null,
        });
        appendTaskTimelineEvent(task.id, {
          type: "conversation_permission.required",
          title: permission.mode === "main_agent_only" ? "主 Agent 权限审核结果" : "等待代码修改授权",
          detail,
          status: "blocked",
          phase: "dispatching",
          agent: task.target_project,
          data: { permission_request_id: permission.permissionRequest?.id || "", permission_mode: permission.mode },
        });
        return {
          status: "blocked",
          detail,
          permissionRequest: permission.permissionRequest || null,
          conversationPermissionMode: permission.mode,
        };
      }
      task.conversation_permission_snapshot = permission.snapshot;
      task.conversation_permission_mode = permission.mode;
      task.permission_policy_revision = permission.snapshot?.revision || 0;
      task.edit_approval_id = permission.editApprovalId || null;
    }

    const toolContext = buildAgentToolContext(ctx, null, task.target_project, `${task.title || ""}\n${task.description || ""}\n${task.acceptance_criteria || ""}`, task.selected_skill_names || []);
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
      try { createExecutionCheckpoint({ executionId: task.id, taskId: task.id, workDir, mode: preparedWorkDir.mode, label: "项目 Agent 开始执行前" }); }
      catch (error: any) { addTaskLog(task.id, "warning", `无法创建任务前文件检查点：${error.message}`); }
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
    } else if (preparedWorkDir.requestedMode === "worktree" && preparedWorkDir.warning) {
      addTaskLog(task.id, "warning", `直接任务请求 worktree 隔离但已降级共享目录：${preparedWorkDir.warning}`);
    }
    const directSandboxRehearsal = buildTaskSandboxRehearsal(
      task,
      { members: [{ project: task.target_project }] },
      { content: task.description || task.title, dispatchPolicy: { action: "delegate", reason: "直接任务派发给目标项目 Agent" } },
      [{ project: task.target_project, task: task.description || task.title, reason: "直接任务" }],
      [{ targetName: task.target_project, mention: `@${task.target_project}` }],
      { action: "delegate", reason: "直接任务派发给目标项目 Agent" }
    );
    const directTasksForRehearsal = loadTasks();
    const directRehearsalTaskIndex = directTasksForRehearsal.findIndex((item: any) => item.id === task.id);
    if (directRehearsalTaskIndex >= 0) {
      directTasksForRehearsal[directRehearsalTaskIndex].workflow_meta = { ...(directTasksForRehearsal[directRehearsalTaskIndex].workflow_meta || {}), sandbox_rehearsal: directSandboxRehearsal };
      directTasksForRehearsal[directRehearsalTaskIndex].sandbox_rehearsal = directSandboxRehearsal;
      saveTasks(directTasksForRehearsal);
    }
    appendTaskTimelineEvent(task.id, { type: "sandbox_rehearsal", title: "任务前沙盘演练", detail: `${directSandboxRehearsal.impact_scope.areas.join("、")}；直接派发给 ${task.target_project}`, status: "ok", phase: "planning", agent: task.target_project, data: directSandboxRehearsal });
    const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
    const coordinationReworkInstruction = task?.workflow_type === "agent_coordination_dependency"
      ? String(task?.workflow_meta?.coordination_dependency_rework?.instruction || "").trim()
      : "";
    const reworkInstruction = coordinationReworkInstruction || String(task?.workflow_meta?.project_test_rework?.instruction || "").trim();
    const directTaskText = buildChildAgentTaskText([
      `${task.title}\n${task.description || ""}`,
      reworkInstruction ? `[${coordinationReworkInstruction ? "群聊主 Agent 验收返工要求" : "TestAgent 返工要求"}]\n${reworkInstruction}` : "",
    ].filter(Boolean).join("\n\n"), task);
    const directGroupSessionId = String(task.group_session_id || task.groupSessionId || "");
    const directProjectSessionId = String(task.project_session_id || task.projectSessionId || "");
    const directContinuity = directGroupSessionId
      ? buildTaskAgentContinuityBinding({ scope: "group", scopeId: String(task.group_id || ""), exactSessionId: directGroupSessionId, project: task.target_project, agentType })
      : directProjectSessionId
        ? buildTaskAgentContinuityBinding({ scope: "project", scopeId: task.target_project, exactSessionId: directProjectSessionId, project: task.target_project, agentType })
        : null;
    let directTaskSession = openTaskAgentSession({
      scopeId: task.id,
      taskId: task.id,
      groupId: task.group_id || "",
      project: task.target_project,
      agentType,
      continuity: directContinuity,
    });
    markGroupCoordinationDependencyStarted(task, preparedWorkDir, directTaskSession);
    const directMemoryDeliveryAttemptSequence = directTaskSession ? directTaskSession.turnCount + 1 : 0;
    const communicationScope = task.group_id ? "group" : task.global_mission_id ? "global" : "project";
    const communicationScopeId = String(task.group_id || task.global_mission_id || task.target_project);
    const communicationExactSessionId = directGroupSessionId || String(task.project_session_id || task.projectSessionId || task.id);
    const communicationAttempt = Math.max(1, directMemoryDeliveryAttemptSequence || Number(task.retry_count || 0) + 1);
    const communicationGeneration = Math.max(0, Number(task.agent_communication_generation ?? task.generation ?? directTaskSession?.generation ?? 0));
    const targetAnchorMessageId = String(task.target_message_id || task.targetMessageId || task.message_id || task.messageId || `task-message:${task.id}`);
    const originMessageId = String(task.origin_message_id || task.originMessageId || task.source_message_id || task.sourceMessageId || task.global_source_message_id || "");
    if (!task.target_message_id && !task.targetMessageId) updateTask(task.id, { target_message_id: targetAnchorMessageId });
    const communicationPolicy = readAgentCommunicationPolicy(task.contextPolicy?.effective || task.context_policy?.effective || task.context_policy_effective || {});
    const communicationDispatch: any = startAgentCommunicationDispatch({
      taskId: task.id,
      workItemId: String(task.work_item_id || task.workItemId || task.id),
      scope: communicationScope,
      scopeId: communicationScopeId,
      exactSessionId: communicationExactSessionId,
      generation: communicationGeneration,
      attempt: communicationAttempt,
      senderAgentId: task.group_id ? "ccm-group-main-agent" : task.global_mission_id ? "ccm-global-agent" : "ccm-project-main-agent",
      receiverAgentId: task.target_project,
      ownerId: `task-queue:${task.id}`,
      existingMessageId: String(task.agent_communication_message_id || "") || undefined,
      idempotencyKey: `task-dispatch-v2:${task.id}:${communicationGeneration}:${communicationAttempt}`,
      payload: {
        objectiveChecksum: task.requirement_checksum || task.goal_checksum || "",
        acceptanceChecksum: task.acceptance_checksum || "",
        authorizedProject: task.target_project,
        projectName: task.target_project,
        runtimeId: agentType,
        workItemTitle: String(task.title || task.description || "").replace(/\s+/g, " ").trim().slice(0, 300),
        workspaceMode: preparedWorkDir.mode,
        worktreeRef: preparedWorkDir.mode === "worktree" ? preparedWorkDir.worktreePath || preparedWorkDir.workDir : "",
        verificationRequired: task.requires_verification !== false,
        anchorMessageId: targetAnchorMessageId,
        originMessageId,
        strictPreExecutionAck: communicationPolicy.strictPreExecutionAckEnabled === true,
      },
      policy: task.contextPolicy?.effective || task.context_policy?.effective || task.context_policy_effective || {},
    });
    if (communicationDispatch.enabled !== false && communicationDispatch.acquired !== true) {
      if (communicationDispatch.envelope?.messageId) updateTask(task.id, {
        agent_communication_message_id: communicationDispatch.envelope.messageId,
        agent_communication_state: "queued",
        queue_state: "capacity_wait",
        queue_capacity_reason: communicationDispatch.reason || "capacity_limit",
        queue_position: communicationDispatch.position || 1,
      });
      const capacityError: any = new Error(`Agent Communication并发容量等待：${communicationDispatch.reason || "capacity_limit"}`);
      capacityError.code = "CCM_AGENT_COMMUNICATION_CAPACITY_WAIT";
      capacityError.capacity = communicationDispatch;
      throw capacityError;
    }
    const communicationEnvelope = communicationDispatch.envelope || null;
    if (communicationEnvelope?.messageId) {
      runtimeToolContext = prepareAgentRuntimeTools(task.group_id || "", task.target_project, workDir, agentType, toolContext.allowedTools, null, {
        taskId: task.id,
        task,
        toolAudit: toolContext.toolAudit,
        authorizationReadiness: toolContext.authorizationReadiness,
        groupSessionId: directGroupSessionId,
        taskAgentSessionId: directTaskSession?.id || "",
        nativeSessionId: directTaskSession?.nativeSessionId || "",
        communicationMessageId: communicationEnvelope.messageId,
        communicationGeneration: communicationEnvelope.generation,
        communicationAttempt: communicationEnvelope.attempt,
        communicationLeaseId: communicationEnvelope.leaseId,
        anchorMessageId: targetAnchorMessageId,
        originMessageId,
      });
      assertRuntimeToolDispatchReady(task.target_project, runtimeToolContext);
    }
    if (communicationEnvelope?.messageId) {
      updateTask(task.id, {
        agent_communication_message_id: communicationEnvelope.messageId,
        agent_communication_state: communicationEnvelope.state,
        agent_communication_attempt: communicationEnvelope.attempt,
        agent_communication_lease_id: communicationEnvelope.leaseId,
      });
      appendTaskTimelineEvent(task.id, {
        type: "agent_communication_dispatch",
        title: `${task.target_project} 通信信封已创建`,
        detail: `generation=${communicationEnvelope.generation} · attempt=${communicationEnvelope.attempt}`,
        status: "ok",
        phase: "dispatching",
        agent: task.target_project,
        data: { message_id: communicationEnvelope.messageId, payload_checksum: communicationEnvelope.payloadChecksum, content_stored: false },
      });
    }
    let directInvocationEdge: any = task.workflow_type !== "agent_coordination_dependency" && task.group_id && directTaskSession && directGroupSessionId.startsWith("gcs_") ? prepareTaskAgentInvocationEdge({
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
    const directMemoryReceiptGroup = task.group_id ? loadGroups().find((item: any) => item.id === task.group_id) || null : null;
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
        communicationMessageId: communicationEnvelope?.messageId || "",
        communicationGeneration: communicationEnvelope?.generation || 0,
        communicationAttempt: communicationEnvelope?.attempt || 0,
        communicationLeaseId: communicationEnvelope?.leaseId || "",
        anchorMessageId: targetAnchorMessageId,
        originMessageId,
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
      group: task.group_id ? loadGroups().find((item: any) => item.id === task.group_id) || null : null,
      worker_context_packet: task.mission_handoff?.worker_context_packet || null,
      dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
        ? task.mission_handoff.global_mission.depends_on.map((ref: any) => ({ project: ref, reason: "全局任务前置依赖" }))
        : [],
      analysis: {
        constraints: Array.isArray(task.mission_handoff?.done_criteria) ? task.mission_handoff.done_criteria : [],
      },
      memory: directGroupMemoryContext,
      continuation: directContinuation,
      communication_envelope: communicationEnvelope,
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
      group: task.group_id ? loadGroups().find((item: any) => item.id === task.group_id) || null : null,
      worker_context_packet: task.mission_handoff?.worker_context_packet || null,
      dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
        ? task.mission_handoff.global_mission.depends_on.map((ref: any) => ({ project: ref, reason: "全局任务前置依赖" }))
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
  "verification": ["仅用于展示的验证名称或命令；不能编造未运行的测试"],
  "verificationResults": [{"name":"检查名称","command":"实际执行命令；非命令检查可为空","status":"passed | failed | blocked | skipped | not_run","exitCode":0,"source":"agent | ccm_runner | browser | http","evidence":["真实证据引用"]}],
  "contractChanges": ["如涉及接口/字段/schema 变化，改为对象数组；没有填空数组"],
  "consumedInjectionIds": ["如果工作单包含 injection_id，填已消费的 injection_id；没有填空数组"],
  "memoryUsed": ["本轮实际使用的记忆/知识库/历史结论；未使用填空数组"],
  "memoryIgnored": ["没有使用或无法使用记忆的原因；没有填空数组"],
  "typedMemoryUsage": [{"relPath": "本轮 WorkerContextPacket 中 surfaced MEMORY.md 的相对路径", "usageState": "used | verified | ignored", "currentSourceVerified": false, "currentSourceEvidence": {"evidenceType": "file_read", "sourcePath": "本轮实际重读的项目内文件路径", "sourceChecksum": "该文件当前内容的完整 SHA-256；只有服务端复算匹配后 verified 才成立"}, "conflictDetected": false, "conflictKind": "removed | renamed | behavior_changed | resource_changed；没有冲突填空字符串", "recommendedMemoryAction": "update | remove；没有冲突填空字符串", "conflictReason": "当前源码与记忆冲突的具体原因；没有冲突填空字符串", "replacementMemory": "update 时填写候选新规则；否则填空字符串", "reason": "逐条说明采用、核验或忽略原因；每个 surfaced relPath 都要覆盖；没有真实当前源文件证明时不得声明 verified；子 Agent 只能提交冲突候选，不能直接修改长期记忆"}],
  "apiMicrocompactUsage": [{"planChecksum": "API microcompact edit plan checksum；没有填空字符串", "applyPlanChecksum": "native apply plan checksum；没有填空字符串", "requestPatchChecksum": "native_applied 时必须填写；没有填空字符串", "usageState": "native_applied | advisory | ignored | not_supported", "nativeApplied": false, "advisoryOnly": true, "taskAgentSessionId": "本轮 task_agent_session_id；没有填空字符串", "nativeSessionId": "本轮 native_session_id；没有填空字符串", "memoryContextSnapshotId": "本轮 memory_context_snapshot_id；没有填空字符串", "memoryContextSnapshotChecksum": "本轮 memory_context_snapshot_checksum；没有填空字符串", "reason": "说明是否原生应用 API context-management；第三方 CLI 不支持时写 advisory 或 not_supported"}],
  "apiMicrocompactNativeApplyRequestTelemetry": [{"planChecksum": "native_applied 的 API microcompact edit plan checksum；未 native_applied 时填空字符串", "applyPlanChecksum": "native apply plan checksum；未 native_applied 时填空字符串", "requestPatchChecksum": "真实合并 provider requestPatch 后的 checksum；未 native_applied 时填空字符串", "requestBodyChecksum": "发给 provider 的请求体稳定 checksum；不要粘贴完整请求体", "hasContextManagement": true, "betaHeaders": ["context-management-2025-06-27"], "provider": "anthropic | openai-compatible | other", "model": "实际请求模型；未知填空字符串", "endpoint": "provider endpoint；可脱敏", "method": "POST", "responseStatus": 200, "requestId": "provider request id / trace id；没有填空字符串", "taskAgentSessionId": "必须与 apiMicrocompactUsage 一致", "nativeSessionId": "必须与 apiMicrocompactUsage 一致", "memoryContextSnapshotId": "必须与 apiMicrocompactUsage 一致", "memoryContextSnapshotChecksum": "必须与 apiMicrocompactUsage 一致", "sentAt": "ISO 时间；真实发送 API 请求的时间", "telemetrySource": "native_request_adapter | agent_receipt；强证明必须是 fresh native_request_adapter，agent_receipt 只能作为弱证据"}],
  "postCompactCandidateUsage": [{"gateId": "压缩后重注入 gate id；没有填空字符串", "candidateId": "candidate_id", "usageState": "used | ignored | verified", "reason": "使用、忽略或核验原因"}],
  "blockers": ["阻塞点；没有填空数组"],
  "needs": ["会阻塞任务、需要用户或其他 Agent 补充的内容；没有填空数组"],
  "advisoryNeeds": ["不阻塞交付的可选建议；没有填空数组"]
}
\`\`\``;
    let directMemoryContextSnapshot: any = null;
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
    let fileChanges: any = null;
    let receipt: any = null;
    let invokedSkills: any[] = [];
    const directPendingCapacityGate = directTaskSession?.capacityDowngradeGate || null;
    const directCapacityRevalidationPreparation = directTaskSession
      ? prepareTaskAgentSessionCapacityRevalidation(directTaskSession.id, directWorkerHandoff.worker_context_packet)
      : null;
    if (directTaskSession?.capacityRevalidationRequired === true && directCapacityRevalidationPreparation?.prepared !== true) {
      throw new Error(`模型容量下降后的上下文重建未通过：${directCapacityRevalidationPreparation?.reason || "packet_capacity_not_revalidated"}`);
    }
    if (directCapacityRevalidationPreparation?.session) directTaskSession = directCapacityRevalidationPreparation.session;
    let directCapacityRevalidationCommitted = directCapacityRevalidationPreparation?.required !== true;
    let directNativeSessionId = "";
    let directNativeContinuationEvidence: any = null;
    let directNativeModelCapabilityReceipt: any = null;
    let directNativeModelCapabilityRecord: any = null;
    let directModelCapabilityRefreshOutcome: any = null;
    let directProviderMemoryChannelEvidence: any = null;
    let directMemoryContextConsumptionReceipt: any = null;
    let directMemoryContextConsumptionRecovery: any = null;
    let directProviderUsage: any = null;
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
        if (capacityCommit?.acknowledged !== true) throw new Error(`模型容量下降门禁提交失败：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
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
      let communicationHeartbeat: any = null;
      const communicationIdentity = communicationEnvelope ? {
        taskId: communicationEnvelope.taskId,
        workItemId: communicationEnvelope.workItemId,
        exactSessionId: communicationEnvelope.exactSessionId,
        generation: communicationEnvelope.generation,
        attempt: communicationEnvelope.attempt,
        leaseId: communicationEnvelope.leaseId,
        senderAgentId: communicationEnvelope.receiverAgentId,
        receiverAgentId: communicationEnvelope.senderAgentId,
      } : null;
      try {
      if (communicationEnvelope?.messageId && communicationPolicy.strictPreExecutionAckEnabled === true) {
        markAgentCommunicationRunnerStarted(communicationEnvelope.messageId, {
          runtime: agentType,
          runnerKind: "ack_preflight",
          summary: "正在进行执行前ACK预检",
        });
        const preflightSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
        const preflightPrompt = [
          "[CCM执行前ACK预检]",
          `通信message_id：${communicationEnvelope.messageId}`,
          `任务目标：${String(task.title || task.description || "").slice(0, 500)}`,
          "本次预检禁止修改文件、运行构建、测试或执行其他业务工具。",
          "你只能调用 ccm__agent_communication.acknowledge_assignment，确认目标、允许范围、禁止范围和验证计划；调用成功后立即结束。",
        ].join("\n");
        await ctx.callAgent(task.target_project, preflightPrompt, workDir, agentType, communicationPolicy.agentAckTimeoutMs, {
          groupId: task.group_id || "",
          allowedTools: toolContext.allowedTools,
          cliAllowedTools: AGENT_COMMUNICATION_ACK_MCP_TOOL_ALIASES,
          mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
          runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
          runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
          taskId: task.id,
          executionId: `${task.id}:ack-preflight`,
          taskAgentSessionId: directTaskSession?.id || "",
          skipIndependentVerification: true,
          background: true,
          durableDispatch: false,
        });
        pauseBoundary("executing");
        const preflightChanges = workDir ? ctx.getFileChanges(task.target_project, preflightSnapshot) : null;
        if (Number(preflightChanges?.count || 0) > 0) {
          transitionAgentCommunication(communicationEnvelope.messageId, "recovery_required", {
            eventType: "ack_preflight_side_effect",
            detail: { fileCount: preflightChanges.count, contentStored: false },
          });
          throw new Error("ACK预检产生了未授权文件副作用，已停止正式执行并要求重新核验");
        }
        const acknowledged = getAgentCommunication(communicationEnvelope.messageId, { includeEvents: false, includeReceipts: false });
        if (!acknowledged || !["acknowledged", "executing"].includes(String(acknowledged.state))) {
          if (acknowledged?.state === "runner_started") transitionAgentCommunication(communicationEnvelope.messageId, "ack_timeout", { eventType: "ack_timeout", detail: { timeoutMs: communicationPolicy.agentAckTimeoutMs } });
          throw new Error("第三方 Agent 未在执行前完成真实ACK，正式Runner未启动");
        }
      }
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
        runtimeProgressContext: communicationEnvelope ? {
          taskId: communicationEnvelope.taskId,
          workItemId: communicationEnvelope.workItemId,
          scope: communicationEnvelope.scope,
          scopeId: communicationEnvelope.scopeId,
          exactSessionId: communicationEnvelope.exactSessionId,
          anchorMessageId: targetAnchorMessageId,
          ...(originMessageId ? { originMessageId } : {}),
          agentRunId: communicationEnvelope.messageId,
          generation: communicationEnvelope.generation,
          attempt: communicationEnvelope.attempt,
          leaseId: communicationEnvelope.leaseId,
        } : null,
        agentRuntimeStructuredProgressEnabled: communicationPolicy.agentRuntimeStructuredProgressEnabled,
        agentProgressFallbackTimeoutMs: communicationPolicy.agentProgressFallbackTimeoutMs,
        trustedMemoryProviderChannelRequired: directMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
        trustedMemoryProviderAcknowledgementRequired: directMemoryContextSnapshot?.context?.provider_memory_channel_acknowledgement_required === true,
        memoryContextConsumptionReceiptRequired: directMemoryContextSnapshot?.context?.memory_context_consumption_receipt_required === true,
        memoryContextConsumptionChallenge: directMemoryContextSnapshot?.context?.memory_context_consumption_challenge || null,
        trustedMemoryEnvelopeChecksum: directMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_checksum || "",
        trustedMemoryEnvelopeSourceChecksum: directMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_source_checksum || "",
        ...taskAgentSessionLifecycleRunnerOptions(directMemoryContextSnapshot),
        agentSession: directTaskSession
          ? { ...getTaskAgentSessionOptions(directTaskSession), conversationPermissionMode: task.conversation_permission_mode || "full_access" }
          : { conversationPermissionMode: task.conversation_permission_mode || "full_access" },
        durableDispatch: directTypedMemoryDispatchAdmission.required === true
          || directCapacityRevalidationPreparation?.required === true
          || directMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
        onRunnerRequestCreated: (requestId: string) => {
          directRunnerRequestId = String(requestId || "");
          if (communicationEnvelope?.messageId && communicationIdentity) {
            markAgentCommunicationRunnerStarted(communicationEnvelope.messageId, {
              runnerRequestId: directRunnerRequestId,
              runtime: agentType,
              worktreeRef: preparedWorkDir.mode === "worktree" ? preparedWorkDir.worktreePath || preparedWorkDir.workDir : "",
            });
            const communicationPolicy = readAgentCommunicationPolicy();
            communicationHeartbeat = setInterval(() => {
              try {
                heartbeatAgentCommunication(communicationEnvelope.messageId, communicationIdentity, {
                  phase: "executing",
                });
              } catch (error: any) {
                addTaskLog(task.id, "warning", `Agent Communication心跳写入失败：${String(error?.message || error).slice(0, 240)}`);
              }
            }, communicationPolicy.agentHeartbeatIntervalMs);
            communicationHeartbeat.unref?.();
          }
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
        onDone: (opts: any) => {
          directNativeSessionId = String(opts?.nativeSessionId || "");
          directNativeContinuationEvidence = opts?.nativeContinuationEvidence || null;
          directNativeModelCapabilityReceipt = opts?.nativeModelCapabilityReceipt || null;
          directNativeModelCapabilityRecord = opts?.nativeModelCapabilityRecord || null;
          directModelCapabilityRefreshOutcome = opts?.modelCapabilityRefreshOutcome || null;
          if (opts?.providerMemoryChannelEvidence?.required === true) directProviderMemoryChannelEvidence = opts.providerMemoryChannelEvidence;
          if (opts?.memoryContextConsumptionReceipt) directMemoryContextConsumptionReceipt = opts.memoryContextConsumptionReceipt;
          if (opts?.memoryContextConsumptionRecovery) directMemoryContextConsumptionRecovery = opts.memoryContextConsumptionRecovery;
          directProviderUsage = opts?.usage || null;
          directSessionSucceeded = opts?.isError !== true;
          directSessionError = String(opts?.error || opts?.message || "");
          directRunnerRequestId = String(opts?.runnerRequestId || directRunnerRequestId || "");
          directRunnerStarted = opts?.runnerStarted === true;
        },
      });
      } finally {
        if (communicationHeartbeat) clearInterval(communicationHeartbeat);
      }
      pauseBoundary("reviewing");
      if (!directCapacityRevalidationCommitted && directTaskSession && directCapacityRevalidationPreparation?.proof) {
        const capacityCommit = commitTaskAgentSessionCapacityRevalidation(directTaskSession.id, directCapacityRevalidationPreparation.proof, {
          runnerRequestId: directRunnerRequestId,
          runnerStarted: directRunnerStarted,
        });
        if (capacityCommit?.acknowledged !== true) throw new Error(`模型容量下降门禁缺少 durable dispatch 证明：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
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
        const directFailed = !directSessionSucceeded;
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
      let directMemoryContextDelivery: any = null;
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
      if (communicationEnvelope?.messageId) {
        const communicationResult: any = submitAgentCommunicationResult(communicationEnvelope.messageId, {
          ...(receipt || {}),
          status: receipt?.status || (directSessionSucceeded ? "submitted" : "failed"),
          summary: receipt?.summary || (directSessionSucceeded ? "第三方 Agent 已返回执行结果" : directSessionError || "第三方 Agent 执行失败"),
          filesChanged: receipt?.filesChanged || fileChanges?.files || [],
          verificationResults: receipt?.verificationResults || [],
          sideEffectState: (receipt?.filesChanged?.length || fileChanges?.files?.length) ? "known" : "none",
        });
        updateTask(task.id, {
          agent_communication_message_id: communicationEnvelope.messageId,
          agent_communication_state: communicationResult.envelope?.state || "result_submitted",
        });
        appendTaskTimelineEvent(task.id, {
          type: "agent_communication_result",
          title: `${task.target_project} 已提交结构化结果`,
          detail: `message=${communicationEnvelope.messageId}`,
          status: communicationResult.accepted === true ? "ok" : "warn",
          phase: "reviewing",
          agent: task.target_project,
          data: { receipt_checksum: communicationResult.receiptChecksum || "", content_stored: false },
        });
      }
    if (receipt) updateTaskWorkItemFromReceipt(task.id, task.target_project, receipt, fileChanges, output, { ctx });
    const coordination = {
      coordinationPlan: {
        strategy: "direct_project_execution",
        phases: [
          { id: "implement", label: "项目执行", status: "completed" },
          { id: "project_delivery", label: "项目结果整理", status: "completed" },
        ],
        targets: [{ project: task.target_project, objective: compactMemoryText(task?.business_goal || task?.description || task?.title || "完成项目任务", 1200) }],
      },
      assignments: [{ project: task.target_project, task: task?.business_goal || task?.description || task?.title || "完成项目任务", reason: task.requires_independent_review === true ? "项目主 Agent直派开发，完成后进入 TestAgent 独立验收。" : "项目主 Agent直派开发。" }],
      executionOrder: "sequential",
    };
    const result = getTaskExecutionFromReceipt(output, receipt, {
      fileChanges,
      runtimeToolSync: compactRuntimeToolAudit(runtimeToolContext.audit),
      invokedSkills,
      ...coordination,
    });
    if (result.status === "failed") {
      const failedGreen = evaluateGreenContract({ receipt, fileChanges, requiresChanges: taskRequiresCodeChanges(task), requiresVerification: task.requires_verification !== false, reviewPassed: false, requiredLevel: "project" });
      transitionExecution(task.id, "failed", result.detail || "项目 Agent 执行失败", {
        green: failedGreen,
        receipt,
        fileChanges,
        runnerVerification: extractRunnerVerificationEvidence(output),
        outputPreview: output,
        data: { runtime_tool_sync: compactRuntimeToolAudit(runtimeToolContext.audit), invoked_skills: invokedSkills },
      });
      return { ...result, ...coordination, runtimeToolSync: compactRuntimeToolAudit(runtimeToolContext.audit), invokedSkills, executionKernel: { executionId: task.id, green: failedGreen } };
    }

    const changedFiles = Array.isArray(fileChanges?.files) ? fileChanges.files : [];
    const requiresProjectReview = task.requires_independent_review === true
      || task.requires_verification === true
      || taskRequiresCodeChanges(task)
      || changedFiles.length > 0;
    if (requiresProjectReview && (!acceptancePolicyResult.valid || !acceptancePolicy)) throw new Error(`项目任务验收策略不可用：${acceptancePolicyResult.reason}`);
    const independentTestAgentEnabled = acceptancePolicy?.mode === "test_agent";
    let projectReview: any = null;
    if (requiresProjectReview && !independentTestAgentEnabled) {
      const coordinationDependency = task.workflow_type === "agent_coordination_dependency";
      const verifierLabel = coordinationDependency ? "群聊主 Agent" : "项目主 Agent";
      updateTask(task.id, {
        status: "reviewing",
        acceptance_state: "main_agent_self_verifying",
        status_detail: coordinationDependency ? "群聊主 Agent 正在核对文件变化和项目验证" : "TestAgent 已关闭，项目主 Agent 正在执行一次自验",
      });
      appendTaskTimelineEvent(task.id, {
        type: coordinationDependency ? "group_main_dependency_verification_started" : "project_main_self_verification_started",
        title: `${verifierLabel} 开始验收`,
        detail: coordinationDependency ? "此协作依赖只由群聊主 Agent 验收，不创建 TestAgent 记录" : "TestAgent 已关闭，本轮不产生独立验收结论",
        status: "active",
        phase: "reviewing",
        agent: coordinationDependency ? "group-main-agent" : task.target_project,
      });
      projectReview = await runMainAgentSelfVerification({
        task: loadTasks().find((item: any) => item.id === task.id) || task,
        policy: acceptancePolicy!,
        acceptanceCriteria: String(task.acceptance_criteria || "").split(/\r?\n|；/).filter(Boolean),
        changedFiles,
        projects: [{
          name: task.target_project,
          workDir,
          verificationCommands: Array.isArray(loadProjectConfigs()?.[task.target_project]?.verification_commands)
            ? loadProjectConfigs()[task.target_project].verification_commands
            : [],
        }],
        workerOutputs: [output],
      });
      pauseBoundary("reviewing");
      updateTask(task.id, { test_agent_review: null, main_agent_self_verification: projectReview, acceptance_state: projectReview.canAccept ? "main_agent_self_verified" : "main_agent_self_verification_failed" });
      appendTaskTimelineEvent(task.id, {
        type: coordinationDependency ? "group_main_dependency_verification_finished" : "project_main_self_verification_finished",
        title: projectReview.canAccept ? `${verifierLabel} 验收通过` : `${verifierLabel} 验收未通过`,
        detail: projectReview.report.summary,
        status: projectReview.canAccept ? "ok" : "warn",
        phase: "reviewing",
        agent: coordinationDependency ? "group-main-agent" : task.target_project,
        data: { review: projectReview, test_agent_created: false },
      });
      if (!projectReview.canAccept) {
        return { ...result, status: "blocked", detail: projectReview.report.summary, review: projectReview, testAgent: null, mainAgentSelfVerification: projectReview, ...coordination };
      }
    }
    if (requiresProjectReview && independentTestAgentEnabled) {
      const reviewCycle = nextReviewRound(task);
      const reviewCycleId = String(task.review_cycle_id || createReviewCycleId(`project-${task.id}`));
      let reviewRound = reviewCycle.round;
      let previousReview = task.test_agent_review || null;
      while (reviewRound <= AUTO_REWORK_MAX_ROUNDS) {
        updateTask(task.id, {
          status: "reviewing",
          acceptance_state: "test_agent_running",
          review_round: reviewRound,
          review_round_total: reviewCycle.total + (reviewRound - reviewCycle.round),
          review_cycle_id: reviewCycleId,
          rework_exhausted: null,
          status_detail: `TestAgent 正在执行第 ${reviewRound}/${AUTO_REWORK_MAX_ROUNDS} 轮独立验收`,
        });
        appendTaskTimelineEvent(task.id, {
          type: "project_test_agent_started",
          title: `TestAgent 第 ${reviewRound} 轮验收`,
          detail: reviewRound === reviewCycle.round ? "独立读取当前项目源码、开发回执和真实验证目标" : "按上一轮失败范围增量复验，并保留核心回归检查",
          status: "active",
          phase: "reviewing",
          agent: "test-agent",
        });
        projectReview = await runProjectTaskTestAgentReview({
          task,
          project: task.target_project,
          workDir,
          workerResults: [{ success: true, output, fileChanges }],
          acceptanceCriteria: String(task.acceptance_criteria || "").split(/\r?\n|；/).filter(Boolean),
          workItems: task.work_items || [{ title: task.title, objective: task.business_goal || task.description }],
          fallbackVerificationCommands: Array.isArray(task.verification_commands) ? task.verification_commands : [],
          round: reviewRound,
          reviewCycleId,
          issuedBy: "project-main-agent",
          previousReview,
        });
        pauseBoundary("reviewing");
        const decision = projectReview?.decision || classifyTestAgentReview(projectReview);
        const problems = projectTestAgentProblems(projectReview);
        appendTaskTimelineEvent(task.id, {
          type: "project_test_agent_finished",
          title: projectReview.canAccept ? "TestAgent 验收通过" : "TestAgent 发现验收缺口",
          detail: projectReview.canAccept ? "独立验收证据门禁已通过" : problems.join("；"),
          status: projectReview.canAccept ? "ok" : "warn",
          phase: "reviewing",
          agent: "test-agent",
          data: { round: reviewRound, report: projectReview.report, verdict: projectReview.verdict, decision },
        });
        if (projectReview.canAccept || decision.route !== "test_agent_recheck" || reviewRound >= AUTO_REWORK_MAX_ROUNDS) break;
        previousReview = projectReview;
        appendTaskTimelineEvent(task.id, {
          type: "project_test_agent_recheck_queued",
          title: `TestAgent 第 ${reviewRound + 1} 轮增量复验已安排`,
          detail: decision.reason,
          status: "active",
          phase: "reviewing",
          agent: "test-agent",
          data: { previous_round: reviewRound, incremental_scope: projectReview.incrementalScope },
        });
        reviewRound += 1;
      }
      const reviewDecision = projectReview?.decision || classifyTestAgentReview(projectReview);
      const reworkProblems = projectTestAgentReworkProblems(projectReview);
      if (!projectReview.canAccept) {
        const detail = reworkProblems.join("；") || projectReview.error || "TestAgent 验收未通过";
        if (reviewDecision.route === "implementation_rework" && reviewRound < AUTO_REWORK_MAX_ROUNDS) {
          updateTask(task.id, {
            status: "pending",
            acceptance_state: "reworking",
            status_detail: `第 ${reviewRound} 轮验收未通过，已生成返工单并重新排队`,
            test_agent_review: projectReview,
            review_round: reviewRound,
            review_round_total: reviewCycle.total,
            workflow_meta: {
              ...(task.workflow_meta || {}),
              project_test_rework: { round: reviewRound, instruction: detail, created_at: new Date().toISOString() },
            },
          });
          appendTaskTimelineEvent(task.id, { type: "project_rework_queued", title: `第 ${reviewRound} 轮返工已入队`, detail, status: "active", phase: "reworking", agent: task.target_project });
          return {
            ...result,
            status: "waiting",
            detail: `TestAgent 第 ${reviewRound} 轮验收未通过，开发 Agent 将按失败证据自动返工`,
            requeue: true,
            review: projectReview,
            testAgent: projectReview,
            ...coordination,
            runtimeToolSync: compactRuntimeToolAudit(runtimeToolContext.audit),
            invokedSkills,
          };
        }
        const blockedState = reviewDecision.route === "environment"
          ? "environment_blocked"
          : reviewDecision.route === "needs_user"
            ? "needs_user"
            : reviewDecision.route === "test_agent_recheck"
              ? "test_agent_recheck"
              : "blocked";
        updateTask(task.id, {
          status: "blocked",
          acceptance_state: blockedState,
          test_agent_review: projectReview,
          test_agent_failure_route: reviewDecision.route,
          review_round: reviewRound,
          review_round_total: reviewCycle.total + (reviewRound - reviewCycle.round),
          status_detail: reviewDecision.reason || detail,
          ...(reviewDecision.route === "implementation_rework"
            ? buildReworkExhaustedUpdate(detail, { path: "project_direct", rounds: reviewRound })
            : {}),
        });
        return { ...result, status: "blocked", detail: `${reviewDecision.reason}：${detail}`, review: projectReview, testAgent: projectReview, ...coordination };
      }
      updateTask(task.id, {
        acceptance_state: "test_agent_passed",
        test_agent_review: projectReview,
        workflow_meta: { ...(task.workflow_meta || {}), project_test_rework: null },
      });
    }

    const green = evaluateGreenContract({ receipt, fileChanges, requiresChanges: taskRequiresCodeChanges(task), requiresVerification: task.requires_verification !== false, reviewPassed: !requiresProjectReview || projectReview?.canAccept === true, requiredLevel: "project" });
    const mainAgentFinalAcceptance = {
      schema: "ccm-main-agent-final-acceptance-v1",
      accepted: !requiresProjectReview || projectReview?.canAccept === true,
      mode: acceptancePolicy?.mode || "not_required",
      acceptance_policy_checksum: acceptancePolicy?.checksum || "",
      review_checksum: String(projectReview?.checksum || projectReview?.runner?.id || ""),
      decided_at: new Date().toISOString(),
    };
    updateTask(task.id, {
      ...(independentTestAgentEnabled ? { test_agent_review: projectReview } : { main_agent_self_verification: projectReview }),
      main_agent_final_acceptance: mainAgentFinalAcceptance,
    });
    const acceptedResult = requiresProjectReview
      ? { ...result, status: "done", detail: independentTestAgentEnabled ? "TestAgent 与项目主 Agent 验收通过" : task.workflow_type === "agent_coordination_dependency" ? "群聊主 Agent 验收通过" : "项目主 Agent 自验通过", review: projectReview, testAgent: independentTestAgentEnabled ? projectReview : null, mainAgentSelfVerification: independentTestAgentEnabled ? null : projectReview, mainAgentFinalAcceptance }
      : result;
    transitionExecution(task.id, acceptedResult.status === "done" ? "reviewing" : "failed", acceptedResult.status === "done" ? independentTestAgentEnabled ? "项目 Agent 已交付并通过独立验收" : task.workflow_type === "agent_coordination_dependency" ? "协作依赖已交付，等待群聊主 Agent 合并" : "项目 Agent 已交付并通过主 Agent 自验" : acceptedResult.detail, {
      green,
      receipt,
      fileChanges,
      runnerVerification: extractRunnerVerificationEvidence(output),
      outputPreview: output,
      data: { runtime_tool_sync: compactRuntimeToolAudit(runtimeToolContext.audit), invoked_skills: invokedSkills, test_agent: independentTestAgentEnabled ? projectReview : null, main_agent_self_verification: independentTestAgentEnabled ? null : projectReview },
    });
    return { ...acceptedResult, ...coordination, runtimeToolSync: compactRuntimeToolAudit(runtimeToolContext.audit), invokedSkills, executionKernel: { executionId: task.id, green } };
  }
}
